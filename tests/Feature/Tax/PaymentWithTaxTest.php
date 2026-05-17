<?php

namespace Tests\Feature\Tax;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceTax;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentMethod;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Table;
use App\Models\TaxRate;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PaymentWithTaxTest extends TestCase
{
    use RefreshDatabase;

    private User          $user;
    private Branch        $branch;
    private Table         $table;
    private TaxRate       $serviceTax;    // 10 %, non-compound, apply_order=0, is_default=true
    private TaxRate       $vat;           // 16 %, compound,     apply_order=1
    private MenuItem      $itemA;         // بيتزا  price=100  taxes=[serviceTax,vat]
    private MenuItem      $itemB;         // مشروب  price=50   taxes=[vat]
    private MenuItem      $itemC;         // خبز    price=30   is_tax_exempt=true
    private PaymentMethod $paymentMethod;

    // ─────────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────────

    protected function setUp(): void
    {
        parent::setUp();

        // Infrastructure
        $this->branch = Branch::create(['name' => 'Main Branch', 'is_main' => true]);
        $area          = Area::create(['branch_id' => $this->branch->id, 'name' => 'Main Area']);
        $this->table   = Table::create([
            'area_id'      => $area->id,
            'name'         => 'T1',
            'status'       => 'available',
            'min_capacity' => 1,
        ]);

        // Tax rates
        $this->serviceTax = TaxRate::create([
            'name'        => 'ضريبة الخدمة',
            'code'        => 'service',
            'rate'        => 10.0000,
            'is_compound' => false,
            'apply_order' => 0,
            'is_active'   => true,
            'is_default'  => true,
        ]);

        $this->vat = TaxRate::create([
            'name'        => 'ضريبة القيمة المضافة',
            'code'        => 'vat',
            'rate'        => 16.0000,
            'is_compound' => true,
            'apply_order' => 1,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        // Menu items
        $category     = Category::create(['name' => 'فئة اختبار', 'sort_order' => 1]);
        $this->itemA  = MenuItem::create([
            'name'          => 'بيتزا',
            'price'         => 100.00,
            'category_id'   => $category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => false,
        ]);
        $this->itemA->taxRates()->sync([$this->serviceTax->id, $this->vat->id]);

        $this->itemB = MenuItem::create([
            'name'          => 'مشروب',
            'price'         => 50.00,
            'category_id'   => $category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => false,
        ]);
        $this->itemB->taxRates()->sync([$this->vat->id]);

        $this->itemC = MenuItem::create([
            'name'          => 'خبز',
            'price'         => 30.00,
            'category_id'   => $category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => true,
        ]);

        // Payment method
        $this->paymentMethod = PaymentMethod::create([
            'name'      => 'نقد',
            'is_system' => true,
            'is_active' => true,
        ]);

        // Global tax settings
        Setting::setMany([
            'tax.prices_include_tax'     => false,
            'tax.compound_taxes_enabled' => true,
            'tax.exempt_takeaway'        => false,
            'tax.exempt_delivery'        => false,
            'tax.rounding_mode'          => 'per_line',
        ]);

        // User with payments.process permission
        $role = Role::create([
            'name'         => 'test_cashier',
            'display_name' => 'Test Cashier',
            'is_system'    => false,
        ]);
        $permission = Permission::firstOrCreate(
            ['key'          => 'payments.process'],
            ['display_name' => 'Process Payments', 'group_name' => 'Payments']
        );
        $role->permissions()->sync([$permission->id]);

        $this->user = User::factory()->create([
            'role_id'   => $role->id,
            'branch_id' => $this->branch->id,
            'username'  => 'cashier1',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build an order with named OrderItems.
     * The name is captured from the MenuItem so InvoiceItemSnapshotter can store it.
     *
     * @param array<array{menu_item_id:int, quantity:int, price:float}> $lines
     */
    private function createOrder(array $lines, string $type = 'dine_in'): Order
    {
        $order = Order::create([
            'branch_id'    => $this->branch->id,
            'table_id'     => $type === 'dine_in' ? $this->table->id : null,
            'user_id'      => $this->user->id,
            'type'         => $type,
            'status'       => 'pending',
            'total_amount' => 0,
        ]);

        foreach ($lines as $line) {
            $menuItem = MenuItem::withTrashed()->find($line['menu_item_id']);
            OrderItem::create([
                'order_id'     => $order->id,
                'menu_item_id' => $line['menu_item_id'],
                'name'         => $menuItem?->name,
                'quantity'     => $line['quantity'],
                'price'        => $line['price'],
            ]);
        }

        $order->recalculateTotalAmount();

        return $order->fresh();
    }

    /** Fire pos.process-payment with a fully-formed payload. */
    private function pay(Order $order, array $payload): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->user)
            ->post(route('pos.process-payment', $order), $payload);
    }

    /** Convenience wrapper: pay the full invoice total in cash. */
    private function cashPayment(Order $order, float $invoiceTotal, float $discount = 0): \Illuminate\Testing\TestResponse
    {
        return $this->pay($order, [
            'payments' => [[
                'payment_method_id' => $this->paymentMethod->id,
                'amount'            => max(0, $invoiceTotal - $discount),
            ]],
            'discount' => $discount,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 1 — Correct compound tax calculation for dine-in
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * item_A (price=100, exclusive):
     *   service_tax (non-compound, 10%): taxable=100.00, tax=10.00
     *   vat         (compound,     16%): taxable=110.00, tax=17.60  ← on running total
     *   ──────────────────────────────────────────────────────────
     *   subtotal=100 | tax=27.60 | total=127.60
     */
    public function test_dine_in_payment_creates_correct_invoice_taxes(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);

        $this->cashPayment($order, 127.60)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertCount(2, $invoice->taxes);

        $svc = $invoice->taxes->firstWhere('tax_code', 'service');
        $this->assertNotNull($svc, 'InvoiceTax row for service must exist');
        $this->assertEqualsWithDelta(100.00, (float) $svc->taxable_amount, 0.001);
        $this->assertEqualsWithDelta(10.00,  (float) $svc->tax_amount,     0.001);

        $vatRow = $invoice->taxes->firstWhere('tax_code', 'vat');
        $this->assertNotNull($vatRow, 'InvoiceTax row for vat must exist');
        $this->assertEqualsWithDelta(110.00, (float) $vatRow->taxable_amount, 0.001);
        $this->assertEqualsWithDelta(17.60,  (float) $vatRow->tax_amount,     0.001);

        $this->assertEqualsWithDelta(100.00, (float) $invoice->subtotal,   0.001);
        $this->assertEqualsWithDelta(27.60,  (float) $invoice->tax_amount, 0.001);
        $this->assertEqualsWithDelta(127.60, (float) $invoice->total,      0.001);
        $this->assertEquals('paid', $invoice->status);
    }

    /**
     * item_A (100, taxable) + item_C (30, exempt).
     * Taxes apply only to item_A.
     *   subtotal=130 | tax=27.60 | total=157.60
     */
    public function test_mixed_cart_exempt_and_taxed_items(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
            ['menu_item_id' => $this->itemC->id, 'quantity' => 1, 'price' => 30.0],
        ]);

        $this->cashPayment($order, 157.60)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        // Invoice-level tax rows: only item_A's taxes
        $this->assertCount(2, $invoice->taxes);
        $this->assertEqualsWithDelta(130.00, (float) $invoice->subtotal,   0.001);
        $this->assertEqualsWithDelta(27.60,  (float) $invoice->tax_amount, 0.001);
        $this->assertEqualsWithDelta(157.60, (float) $invoice->total,      0.001);

        // item_C's invoice_item must carry zero tax
        $itemCRow = DB::table('invoice_items')
            ->where('invoice_id', $invoice->id)
            ->where('name', 'خبز')
            ->first();
        $this->assertNotNull($itemCRow, 'InvoiceItem for خبز must exist');

        $taxOnItemC = (float) DB::table('invoice_item_taxes')
            ->where('invoice_item_id', $itemCRow->id)
            ->sum('tax_amount');
        $this->assertEqualsWithDelta(0.0, $taxOnItemC, 0.001, 'Exempt item must have zero tax in invoice_item_taxes');

        // Sanity: item-level taxes sum to item_A's portion only
        $totalItemTax = (float) DB::table('invoice_item_taxes')
            ->join('invoice_items', 'invoice_item_taxes.invoice_item_id', '=', 'invoice_items.id')
            ->where('invoice_items.invoice_id', $invoice->id)
            ->sum('invoice_item_taxes.tax_amount');
        $this->assertEqualsWithDelta(27.60, $totalItemTax, 0.01);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 2 — Order-type tax exemptions
    // ─────────────────────────────────────────────────────────────────────────

    public function test_takeaway_order_exempt_when_setting_enabled(): void
    {
        Setting::setMany(['tax.exempt_takeaway' => true]);

        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ], 'takeaway');

        $this->cashPayment($order, 100.00)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertEqualsWithDelta(0.00,   (float) $invoice->tax_amount, 0.001);
        $this->assertCount(0, $invoice->taxes);
        $this->assertEqualsWithDelta(100.00, (float) $invoice->total,      0.001);
    }

    public function test_takeaway_order_taxed_when_setting_disabled(): void
    {
        // Default: tax.exempt_takeaway = false (set in setUp)
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ], 'takeaway');

        $this->cashPayment($order, 127.60)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)->firstOrFail();
        $this->assertGreaterThan(0.0, (float) $invoice->tax_amount,
            'Takeaway orders must be taxed when tax.exempt_takeaway is false');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 3 — Immutability & snapshots
    // ─────────────────────────────────────────────────────────────────────────

    public function test_invoice_taxes_are_immutable_after_creation(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);
        $this->cashPayment($order, 127.60)->assertRedirect();

        $invoice    = Invoice::where('order_id', $order->id)->firstOrFail();
        $invoiceTax = InvoiceTax::where('invoice_id', $invoice->id)->firstOrFail();

        // Schema must not have an updated_at column (write-once ledger design)
        $this->assertFalse(
            Schema::hasColumn('invoice_taxes', 'updated_at'),
            'invoice_taxes must not have an updated_at column — it is an immutable ledger'
        );
        $this->assertNull(InvoiceTax::UPDATED_AT,
            'InvoiceTax::UPDATED_AT must be null so Eloquent does not attempt to write that column');

        // Eloquent save() must not throw even without updated_at
        $invoiceTax->tax_amount = 999.99;
        $invoiceTax->save();

        // invoice.total is a stored column set at creation time — not re-derived from tax rows
        $this->assertEqualsWithDelta(127.60, (float) $invoice->fresh()->total, 0.001,
            'invoice.total must not change when an InvoiceTax row is mutated directly');
    }

    public function test_invoice_item_tax_snapshot_preserved_after_tax_rate_deleted(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);
        $this->cashPayment($order, 127.60)->assertRedirect();

        // Soft-delete the service tax rate
        $this->serviceTax->delete();
        $this->assertSoftDeleted('tax_rates', ['id' => $this->serviceTax->id]);

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertCount(2, $invoice->taxes,
            'Both InvoiceTax rows must survive soft-deletion of their TaxRate');

        $svcRow = $invoice->taxes->firstWhere('tax_code', 'service');
        $this->assertNotNull($svcRow, 'InvoiceTax row for service must survive soft-delete');

        // Snapshot values must match what was recorded at invoice creation time
        $this->assertEquals('ضريبة الخدمة', $svcRow->tax_name);
        $this->assertEqualsWithDelta(10.0, (float) $svcRow->rate,       0.0001);
        $this->assertEqualsWithDelta(10.0, (float) $svcRow->tax_amount, 0.001);

        // Soft-delete does NOT trigger onDelete('set null') — only hard-delete does
        $this->assertNotNull($svcRow->tax_rate_id,
            'tax_rate_id FK must remain set after a soft-delete');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 4 — Partial payment
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * item_A invoice total = 127.60.
     * Paying only 50.00 leaves the invoice in 'partial' status.
     */
    public function test_partial_payment_creates_partial_invoice_status(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);

        $this->pay($order, [
            'payments' => [[
                'payment_method_id' => $this->paymentMethod->id,
                'amount'            => 50.00,
            ]],
            'discount' => 0,
        ])->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)->firstOrFail();

        $this->assertEquals('partial', $invoice->status);
        $this->assertEqualsWithDelta(50.00,  (float) $invoice->paid_amount, 0.001);
        $this->assertEqualsWithDelta(127.60, (float) $invoice->total,       0.001);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 5 — Wallet payment
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Customer wallet_balance=200, pays full invoice (127.60) via wallet.
     * Expects: WalletTransaction debit row + reduced wallet balance.
     */
    public function test_wallet_payment_recorded_in_wallet_transactions(): void
    {
        $customer = Customer::create([
            'name'           => 'عميل المحفظة',
            'wallet_balance' => 200.00,
        ]);

        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);

        // Pay entirely via wallet (127.60 = 100 subtotal + 10 service + 17.60 vat)
        $this->pay($order, [
            'payments'      => [],
            'customer_id'   => $customer->id,
            'wallet_amount' => 127.60,
            'discount'      => 0,
        ])->assertRedirect();

        // WalletTransaction debit row must exist
        $this->assertDatabaseHas('wallet_transactions', [
            'customer_id' => $customer->id,
            'type'        => 'debit',
            'reason'      => 'payment_used',
        ]);

        $txn = WalletTransaction::where('customer_id', $customer->id)
            ->where('type', 'debit')
            ->firstOrFail();

        $this->assertEqualsWithDelta(127.60, (float) $txn->amount,        0.001);
        $this->assertEqualsWithDelta(72.40,  (float) $txn->balance_after, 0.001);

        // Customer wallet balance must be decremented
        $this->assertEqualsWithDelta(72.40, (float) $customer->fresh()->wallet_balance, 0.001);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 6 — Re-payment guard
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * The controller blocks re-payment of a 'paid' invoice:
     *   return back()->withErrors(['error' => '...'])
     */
    public function test_paid_invoice_cannot_be_charged_again(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);

        // First payment — full amount → status='paid'
        $this->cashPayment($order, 127.60)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)->firstOrFail();
        $this->assertEquals('paid', $invoice->status);

        $entryCountBefore = $invoice->paymentEntries()->count();
        $paidAmountBefore = (float) $invoice->paid_amount;

        // Second attempt — must be rejected
        $response = $this->cashPayment($order, 127.60);
        $response->assertRedirect();
        $response->assertSessionHasErrors('error');

        // Nothing must have changed on the invoice
        $invoice->refresh();
        $this->assertEquals($entryCountBefore, $invoice->paymentEntries()->count(),
            'No new PaymentEntry must be created on a paid invoice');
        $this->assertEqualsWithDelta($paidAmountBefore, (float) $invoice->paid_amount, 0.001,
            'paid_amount must not change after a blocked re-payment attempt');
    }
}
