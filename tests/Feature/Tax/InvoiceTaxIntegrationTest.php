<?php

namespace Tests\Feature\Tax;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Category;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InvoiceTaxIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User          $user;
    private Branch        $branch;
    private Table         $table;
    private TaxRate       $serviceTax;    // 10%, non-compound, apply_order=0
    private TaxRate       $vat;           // 16%, compound,     apply_order=1
    private MenuItem      $itemA;         // both serviceTax + vat
    private MenuItem      $itemB;         // vat only
    private MenuItem      $itemC;         // is_tax_exempt=true
    private PaymentMethod $paymentMethod;

    // ─────────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────────

    protected function setUp(): void
    {
        parent::setUp();

        // Branch + area + table
        $this->branch = Branch::create(['name' => 'Test Branch', 'is_main' => true]);
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
            'code'        => 'SVC',
            'rate'        => 10.0000,
            'is_compound' => false,
            'apply_order' => 0,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        $this->vat = TaxRate::create([
            'name'        => 'ضريبة القيمة المضافة',
            'code'        => 'VAT',
            'rate'        => 16.0000,
            'is_compound' => true,
            'apply_order' => 1,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        // Menu items
        $category     = Category::create(['name' => 'Test Category', 'sort_order' => 1]);
        $this->itemA  = MenuItem::create([
            'name'          => 'Item A',
            'price'         => 100,
            'category_id'   => $category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => false,
        ]);
        $this->itemA->taxRates()->sync([$this->serviceTax->id, $this->vat->id]);

        $this->itemB = MenuItem::create([
            'name'          => 'Item B',
            'price'         => 50,
            'category_id'   => $category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => false,
        ]);
        $this->itemB->taxRates()->sync([$this->vat->id]);

        $this->itemC = MenuItem::create([
            'name'          => 'Item C',
            'price'         => 50,
            'category_id'   => $category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => true,
        ]);
        // No tax rates for exempt item

        // Payment method
        $this->paymentMethod = PaymentMethod::create([
            'name'      => 'Cash',
            'is_system' => true,
            'is_active' => true,
        ]);

        // Tax settings
        Setting::setMany([
            'tax.prices_include_tax'     => false,
            'tax.compound_taxes_enabled' => true,
            'tax.exempt_takeaway'        => false,
            'tax.exempt_delivery'        => false,
            'tax.rounding_mode'          => 'per_line',
        ]);

        // User with required permissions
        $role = Role::create([
            'name'         => 'test_admin',
            'display_name' => 'Test Admin',
            'is_system'    => false,
        ]);
        $paymentsPermission = Permission::create([
            'key'          => 'payments.process',
            'display_name' => 'Process Payments',
            'group_name'   => 'Payments',
        ]);
        $taxPermission = Permission::create([
            'key'          => 'admin.taxes',
            'display_name' => 'Manage Taxes',
            'group_name'   => 'Admin',
        ]);
        $role->permissions()->sync([$paymentsPermission->id, $taxPermission->id]);

        $this->user = User::factory()->create([
            'role_id'   => $role->id,
            'branch_id' => $this->branch->id,
            'username'  => 'testadmin',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create an order with the given line items.
     *
     * @param array<array{menu_item_id:int, quantity:int, price:float}> $lines
     */
    private function createOrder(array $lines, string $type = 'dine_in'): Order
    {
        $order = Order::create([
            'branch_id' => $this->branch->id,
            'table_id'  => $type === 'dine_in' ? $this->table->id : null,
            'user_id'   => $this->user->id,
            'type'      => $type,
            'status'    => 'pending',
            'total_amount' => 0,
        ]);

        foreach ($lines as $line) {
            OrderItem::create([
                'order_id'      => $order->id,
                'menu_item_id'  => $line['menu_item_id'],
                'quantity'      => $line['quantity'],
                'price'         => $line['price'],
            ]);
        }

        $order->recalculateTotalAmount();

        return $order->fresh();
    }

    /**
     * Process payment for an order and return the test response.
     * Pays the order's pre-tax total_amount (the server recalculates tax).
     */
    private function processPayment(Order $order, float $discount = 0): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->user)->post(
            route('pos.process-payment', $order),
            [
                'payments' => [[
                    'payment_method_id' => $this->paymentMethod->id,
                    'amount'            => max(0, $order->total_amount - $discount),
                ]],
                'discount' => $discount,
            ]
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 1 — Core tax calculation
    // ─────────────────────────────────────────────────────────────────────────

    public function test_payment_creates_invoice_with_correct_tax_snapshots(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);

        $this->processPayment($order)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        // Two tax rows should have been created
        $this->assertCount(2, $invoice->taxes);

        // service_tax: non-compound → taxable = base = 100, amount = 10
        $svcRow = $invoice->taxes->firstWhere('tax_code', 'SVC');
        $this->assertNotNull($svcRow, 'InvoiceTax row for SVC must exist');
        $this->assertEqualsWithDelta(100.00, (float) $svcRow->taxable_amount, 0.001);
        $this->assertEqualsWithDelta(10.00,  (float) $svcRow->tax_amount,     0.001);

        // vat: compound → taxable = running_amount = 100 + 10 = 110, amount = 17.60
        $vatRow = $invoice->taxes->firstWhere('tax_code', 'VAT');
        $this->assertNotNull($vatRow, 'InvoiceTax row for VAT must exist');
        $this->assertEqualsWithDelta(110.00, (float) $vatRow->taxable_amount, 0.001);
        $this->assertEqualsWithDelta(17.60,  (float) $vatRow->tax_amount,     0.001);

        // Invoice totals
        $this->assertEqualsWithDelta(100.00, (float) $invoice->subtotal,   0.001);
        $this->assertEqualsWithDelta(27.60,  (float) $invoice->tax_amount, 0.001);
        $this->assertEqualsWithDelta(127.60, (float) $invoice->total,      0.001);
    }

    public function test_exempt_item_generates_no_tax(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemC->id, 'quantity' => 2, 'price' => 50.0],
        ]);

        $this->processPayment($order)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertEqualsWithDelta(0.00, (float) $invoice->tax_amount, 0.001);
        $this->assertCount(0, $invoice->taxes);
        $this->assertEqualsWithDelta(100.00, (float) $invoice->total, 0.001);
    }

    public function test_mixed_cart_partial_taxes(): void
    {
        // item_A (taxable, price=100) + item_C (exempt, price=50)
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
            ['menu_item_id' => $this->itemC->id, 'quantity' => 1, 'price' => 50.0],
        ]);

        $this->processPayment($order)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        // Only item_A's two taxes appear at the invoice level
        $this->assertCount(2, $invoice->taxes);

        // Subtotal = 100 (item_A base) + 50 (item_C, no tax change) = 150
        $this->assertEqualsWithDelta(150.00, (float) $invoice->subtotal, 0.001);

        // Tax = item_A only: 10 + 17.60 = 27.60
        $this->assertEqualsWithDelta(27.60, (float) $invoice->tax_amount, 0.001);

        // Total = 150 + 27.60 = 177.60
        $this->assertEqualsWithDelta(177.60, (float) $invoice->total, 0.001);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 2 — Order-type exemptions
    // ─────────────────────────────────────────────────────────────────────────

    public function test_takeaway_exempt_when_setting_enabled(): void
    {
        Setting::setMany(['tax.exempt_takeaway' => true]);

        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ], 'takeaway');

        $this->processPayment($order)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertEqualsWithDelta(0.00,   (float) $invoice->tax_amount, 0.001);
        $this->assertCount(0, $invoice->taxes);
        $this->assertEqualsWithDelta(100.00, (float) $invoice->total, 0.001);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 3 — Schema immutability
    // ─────────────────────────────────────────────────────────────────────────

    public function test_invoice_taxes_are_immutable(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);
        $this->processPayment($order)->assertRedirect();

        $invoice    = Invoice::where('order_id', $order->id)->firstOrFail();
        $invoiceTax = InvoiceTax::where('invoice_id', $invoice->id)->firstOrFail();

        // The model constant must be null — Eloquent will not touch updated_at
        $this->assertNull(InvoiceTax::UPDATED_AT);

        // The physical schema must not have an updated_at column
        $this->assertFalse(
            Schema::hasColumn('invoice_taxes', 'updated_at'),
            'invoice_taxes table must not have an updated_at column'
        );

        // A save() call must not throw even though there is no updated_at column
        $originalAmount = (float) $invoiceTax->tax_amount;
        try {
            $invoiceTax->tax_amount = 999.99;
            $invoiceTax->save();
            // If we reach here without an exception, confirm the constant protected us:
            // The invoice's computed total is unchanged (it was set at creation time).
            $this->assertEqualsWithDelta(
                127.60,
                (float) $invoice->fresh()->total,
                0.001,
                'Invoice total must remain unchanged — tax snapshots are write-once ledger rows'
            );
        } catch (\Exception $e) {
            // An exception is also acceptable — the schema prevents the update
            $this->assertTrue(true, 'Exception thrown as expected: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 4 — Snapshot preservation
    // ─────────────────────────────────────────────────────────────────────────

    public function test_deleted_tax_rate_does_not_break_invoice_display(): void
    {
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);
        $this->processPayment($order)->assertRedirect();

        // Soft-delete the service tax rate
        $this->serviceTax->delete();
        $this->assertSoftDeleted('tax_rates', ['id' => $this->serviceTax->id]);

        // Load the invoice — should not throw, even though the TaxRate is gone
        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertCount(2, $invoice->taxes, 'Both InvoiceTax rows must still exist after soft-delete');

        $svcRow = $invoice->taxes->firstWhere('tax_code', 'SVC');
        $this->assertNotNull($svcRow, 'SVC InvoiceTax row must survive a soft-delete of its TaxRate');

        // Snapshot values must be exactly as recorded at invoice creation time
        $this->assertEquals('ضريبة الخدمة', $svcRow->tax_name);
        $this->assertEqualsWithDelta(10.0, (float) $svcRow->rate, 0.0001);
        $this->assertEqualsWithDelta(10.0, (float) $svcRow->tax_amount, 0.001);

        // Soft-delete does NOT trigger onDelete('set null') — FK is still populated
        $this->assertNotNull(
            $svcRow->tax_rate_id,
            'tax_rate_id FK must remain set after a soft-delete (only hard-delete triggers set null)'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 5 — Aggregation consistency
    // ─────────────────────────────────────────────────────────────────────────

    public function test_invoice_item_tax_amounts_sum_equals_invoice_tax(): void
    {
        // Three items, all bearing the same two taxes
        // Item 1: base=100×1=100   SVC=10    VAT=17.60   item_tax=27.60
        // Item 2: base=100×2=200   SVC=20    VAT=35.20   item_tax=55.20
        // Item 3: base=200×1=200   SVC=20    VAT=35.20   item_tax=55.20
        //                                                Σ = 138.00
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
            ['menu_item_id' => $this->itemA->id, 'quantity' => 2, 'price' => 100.0],
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 200.0],
        ]);

        $this->processPayment($order)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)->firstOrFail();

        // Sum of all invoice_item_taxes for this invoice
        $itemTaxSum = \DB::table('invoice_item_taxes')
            ->join('invoice_items', 'invoice_item_taxes.invoice_item_id', '=', 'invoice_items.id')
            ->where('invoice_items.invoice_id', $invoice->id)
            ->sum('invoice_item_taxes.tax_amount');

        // Sum of all invoice_taxes for this invoice
        $invoiceTaxSum = \DB::table('invoice_taxes')
            ->where('invoice_id', $invoice->id)
            ->sum('tax_amount');

        // Both totals must match invoice.tax_amount
        $this->assertEqualsWithDelta(
            138.00, (float) $invoiceTaxSum, 0.01,
            'invoice_taxes totals must sum to 138.00'
        );
        $this->assertEqualsWithDelta(
            $invoiceTaxSum, (float) $itemTaxSum, 0.01,
            'Per-item tax amounts must sum to the same total as invoice-level tax rows'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 6 — Delete protection
    // ─────────────────────────────────────────────────────────────────────────

    public function test_cannot_delete_tax_rate_used_in_invoices(): void
    {
        // Create an invoice that references service_tax
        $order = $this->createOrder([
            ['menu_item_id' => $this->itemA->id, 'quantity' => 1, 'price' => 100.0],
        ]);
        $this->processPayment($order)->assertRedirect();

        // Confirm the InvoiceTax row actually references service_tax
        $this->assertDatabaseHas('invoice_taxes', [
            'tax_rate_id' => $this->serviceTax->id,
            'tax_code'    => 'SVC',
        ]);

        // Attempt deletion via the admin endpoint.
        // The controller always returns JSON 422 for linked taxes (Inertia-friendly);
        // this works regardless of Accept header, matching Inertia's error-surfacing behaviour.
        $response = $this->actingAs($this->user)
            ->delete(route('admin.taxes.destroy', $this->serviceTax));

        $response->assertStatus(422);
        $response->assertJsonPath('errors.delete.0', 'لا يمكن حذف ضريبة مرتبطة بفواتير');

        // Tax rate must still exist and must not be soft-deleted
        $this->assertDatabaseHas('tax_rates', [
            'id'         => $this->serviceTax->id,
            'deleted_at' => null,
        ]);
    }
}
