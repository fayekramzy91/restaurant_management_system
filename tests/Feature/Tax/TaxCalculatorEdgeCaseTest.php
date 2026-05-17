<?php

namespace Tests\Feature\Tax;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Invoice;
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
use Tests\TestCase;

/**
 * Feature-level edge-case tests for the TaxCalculator.
 *
 * Unlike the unit tests in TaxCalculatorTest (which call the service directly),
 * these tests drive the full HTTP stack — they exercise processPayment() and assert
 * the resulting Invoice and InvoiceTax rows persisted to the DB.
 *
 * Key implementation detail documented here:
 *   Discount is applied AFTER tax calculation.
 *   The controller computes: invoiceTotal = taxResult->totalAfterTax - discount.
 *   Tax is therefore always calculated on the full pre-discount item price.
 */
class TaxCalculatorEdgeCaseTest extends TestCase
{
    use RefreshDatabase;

    private User          $user;
    private Branch        $branch;
    private Table         $table;
    private Category      $category;
    private PaymentMethod $paymentMethod;

    // ─────────────────────────────────────────────────────────────────────────
    // Setup — minimal shared infrastructure; tax rates created per test
    // ─────────────────────────────────────────────────────────────────────────

    protected function setUp(): void
    {
        parent::setUp();

        $this->branch = Branch::create(['name' => 'Edge Branch', 'is_main' => true]);
        $area          = Area::create(['branch_id' => $this->branch->id, 'name' => 'Main Area']);
        $this->table   = Table::create([
            'area_id'      => $area->id,
            'name'         => 'T1',
            'status'       => 'available',
            'min_capacity' => 1,
        ]);

        $this->category = Category::create(['name' => 'Edge Category', 'sort_order' => 1]);

        $this->paymentMethod = PaymentMethod::create([
            'name'      => 'نقد',
            'is_system' => true,
            'is_active' => true,
        ]);

        // Cashier with payments.process permission
        $role = Role::create([
            'name'         => 'edge_cashier',
            'display_name' => 'Edge Cashier',
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
            'username'  => 'edge_cashier',
        ]);

        // Default settings — overridden inside specific tests
        Setting::setMany([
            'tax.prices_include_tax'     => false,
            'tax.compound_taxes_enabled' => true,
            'tax.exempt_takeaway'        => false,
            'tax.exempt_delivery'        => false,
            'tax.rounding_mode'          => 'per_line',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function makeItem(string $name, float $price, array $taxRateIds = [], bool $exempt = false): MenuItem
    {
        $item = MenuItem::create([
            'name'          => $name,
            'price'         => $price,
            'category_id'   => $this->category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => $exempt,
        ]);
        if ($taxRateIds) {
            $item->taxRates()->sync($taxRateIds);
        }
        return $item;
    }

    private function createOrder(MenuItem $item, int $quantity = 1, float $price = null, string $type = 'dine_in'): Order
    {
        $order = Order::create([
            'branch_id'    => $this->branch->id,
            'table_id'     => $type === 'dine_in' ? $this->table->id : null,
            'user_id'      => $this->user->id,
            'type'         => $type,
            'status'       => 'pending',
            'total_amount' => 0,
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'menu_item_id' => $item->id,
            'name'         => $item->name,
            'quantity'     => $quantity,
            'price'        => $price ?? $item->price,
        ]);

        $order->recalculateTotalAmount();
        return $order->fresh();
    }

    private function pay(Order $order, float $amount, float $discount = 0): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->user)
            ->post(route('pos.process-payment', $order), [
                'payments' => [[
                    'payment_method_id' => $this->paymentMethod->id,
                    'amount'            => $amount,
                ]],
                'discount' => $discount,
            ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tests
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * When prices_include_tax = true, the TaxCalculator back-computes the
     * exclusive subtotal from the inclusive price.
     *
     * Compound effective multiplier with service (10%, non-compound) + vat (16%, compound):
     *   price_incl = subtotal × (1 + 0.10) × (1 + 0.16)
     *              = subtotal × 1.276
     *   subtotal   = 127.60 / 1.276 ≈ 100.00
     *   total_tax  ≈ 27.60
     */
    public function test_prices_inclusive_tax_setting_reverses_correctly(): void
    {
        Setting::setMany([
            'tax.prices_include_tax'     => true,
            'tax.compound_taxes_enabled' => true,
        ]);

        $serviceTax = TaxRate::create([
            'name'        => 'ضريبة الخدمة',
            'code'        => 'service',
            'rate'        => 10.0000,
            'is_compound' => false,
            'apply_order' => 0,
            'is_active'   => true,
            'is_default'  => false,
        ]);
        $vat = TaxRate::create([
            'name'        => 'ضريبة القيمة المضافة',
            'code'        => 'vat',
            'rate'        => 16.0000,
            'is_compound' => true,
            'apply_order' => 1,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        // Price 127.60 already includes both taxes
        $item  = $this->makeItem('صنف شامل الضريبة', 127.60, [$serviceTax->id, $vat->id]);
        $order = $this->createOrder($item, 1, 127.60);

        // Pay the inclusive price (no extra charge since price already has tax)
        $this->pay($order, 127.60)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)->firstOrFail();

        $this->assertEqualsWithDelta(100.00, (float) $invoice->subtotal,   0.01,
            'Back-calculation must recover the exclusive subtotal from the inclusive price');
        $this->assertEqualsWithDelta(27.60,  (float) $invoice->tax_amount, 0.01);
        $this->assertEqualsWithDelta(127.60, (float) $invoice->total,      0.01);
    }

    /**
     * When both tax rates have is_compound=false, each applies to the base price only.
     *   tax_A = 10% of 100 = 10.00
     *   tax_B = 16% of 100 = 16.00  (NOT 16% of 110)
     *   total_tax = 26.00
     */
    public function test_non_compound_taxes_both_apply_to_base(): void
    {
        Setting::setMany(['tax.compound_taxes_enabled' => false]);

        $taxA = TaxRate::create([
            'name'        => 'ضريبة أ',
            'code'        => 'tax_a',
            'rate'        => 10.0000,
            'is_compound' => false,
            'apply_order' => 0,
            'is_active'   => true,
            'is_default'  => false,
        ]);
        $taxB = TaxRate::create([
            'name'        => 'ضريبة ب',
            'code'        => 'tax_b',
            'rate'        => 16.0000,
            'is_compound' => false,
            'apply_order' => 1,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        $item  = $this->makeItem('صنف بضريبتين', 100.00, [$taxA->id, $taxB->id]);
        $order = $this->createOrder($item, 1, 100.00);

        $this->pay($order, 126.00)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertCount(2, $invoice->taxes);

        $rowA = $invoice->taxes->firstWhere('tax_code', 'tax_a');
        $this->assertNotNull($rowA);
        $this->assertEqualsWithDelta(100.00, (float) $rowA->taxable_amount, 0.001,
            'Non-compound tax must apply to the base price (100)');
        $this->assertEqualsWithDelta(10.00,  (float) $rowA->tax_amount,     0.001);

        $rowB = $invoice->taxes->firstWhere('tax_code', 'tax_b');
        $this->assertNotNull($rowB);
        $this->assertEqualsWithDelta(100.00, (float) $rowB->taxable_amount, 0.001,
            'Non-compound tax must apply to the base price (100), NOT to 110');
        $this->assertEqualsWithDelta(16.00,  (float) $rowB->tax_amount,     0.001);

        $this->assertEqualsWithDelta(26.00, (float) $invoice->tax_amount, 0.001);
        $this->assertEqualsWithDelta(126.00, (float) $invoice->total,     0.001);
    }

    /**
     * An item with no tax rates assigned produces no invoice_taxes rows and zero tax.
     */
    public function test_zero_tax_rate_produces_no_tax_rows(): void
    {
        // No tax rates synced to the item
        $item  = $this->makeItem('صنف بلا ضريبة', 80.00, []);
        $order = $this->createOrder($item, 1, 80.00);

        $this->pay($order, 80.00)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        $this->assertCount(0, $invoice->taxes,    'No invoice_taxes rows must be created when the item has no tax rates');
        $this->assertEqualsWithDelta(0.00,  (float) $invoice->tax_amount, 0.001);
        $this->assertEqualsWithDelta(80.00, (float) $invoice->subtotal,   0.001);
        $this->assertEqualsWithDelta(80.00, (float) $invoice->total,      0.001);
    }

    /**
     * ACTUAL BEHAVIOR: Tax is calculated on the full pre-discount item price.
     * The discount is subtracted from the post-tax total.
     *
     * From POSController::processPayment():
     *   $taxResult    = TaxCalculator::calculateForCart($order->items, ...)
     *   $invoiceTotal = $taxResult->totalAfterTax - $discount
     *
     * So for item=100, discount=20, service_tax=10%:
     *   tax       = 10%  × 100 = 10.00   (calculated on FULL price)
     *   after_tax = 100 + 10   = 110.00
     *   total     = 110 - 20   = 90.00   (discount from post-tax total)
     *
     * This means the tax base is NEVER reduced by the discount.
     */
    public function test_discount_applied_after_tax_on_full_price(): void
    {
        $serviceTax = TaxRate::create([
            'name'        => 'ضريبة الخدمة',
            'code'        => 'service',
            'rate'        => 10.0000,
            'is_compound' => false,
            'apply_order' => 0,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        $item  = $this->makeItem('صنف بخصم', 100.00, [$serviceTax->id]);
        $order = $this->createOrder($item, 1, 100.00);

        // Pay: after-tax total (110) minus discount (20) = 90
        $this->pay($order, 90.00, 20.00)->assertRedirect();

        $invoice = Invoice::where('order_id', $order->id)
            ->with('taxes')
            ->firstOrFail();

        // Tax is on full price (100), NOT on discounted price (80)
        $this->assertEqualsWithDelta(100.00, (float) $invoice->subtotal,  0.001,
            'subtotal must reflect the full pre-discount item price');
        $this->assertEqualsWithDelta(10.00,  (float) $invoice->tax_amount, 0.001,
            'tax must be calculated on the full price (100), not the discounted price (80)');
        $this->assertEqualsWithDelta(20.00,  (float) $invoice->discount,  0.001);
        $this->assertEqualsWithDelta(90.00,  (float) $invoice->total,     0.001,
            'total = after-tax (110) minus discount (20) = 90');

        $taxRow = $invoice->taxes->firstWhere('tax_code', 'service');
        $this->assertNotNull($taxRow);
        $this->assertEqualsWithDelta(100.00, (float) $taxRow->taxable_amount, 0.001);
        $this->assertEqualsWithDelta(10.00,  (float) $taxRow->tax_amount,     0.001);
    }
}
