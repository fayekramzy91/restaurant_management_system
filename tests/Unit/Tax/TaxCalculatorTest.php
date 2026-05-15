<?php

namespace Tests\Unit\Tax;

use App\Services\Tax\TaxCalculationResult;
use App\Services\Tax\TaxCalculator;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class TaxCalculatorTest extends TestCase
{
    private TaxCalculator $calc;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calc = new TaxCalculator();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper factories
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build a mock order item as a stdClass.
     *
     * @param  float  $price
     * @param  float  $quantity
     * @param  array  $taxes     Array of tax stdClass objects (use makeTax())
     * @param  bool   $isExempt
     */
    private function makeItem(
        float $price,
        float $quantity,
        array $taxes = [],
        bool $isExempt = false,
    ): object {
        $item               = new \stdClass();
        $item->price        = $price;
        $item->quantity     = $quantity;
        $item->is_tax_exempt = $isExempt;
        $item->taxRates     = collect($taxes);
        return $item;
    }

    /**
     * Build a mock TaxRate as a stdClass.
     *
     * @param  int    $id
     * @param  float  $rate        Percentage, e.g. 10 for 10%
     * @param  bool   $isCompound
     * @param  int    $applyOrder  Lower = applied first
     * @param  string $code
     * @param  string $name
     */
    private function makeTax(
        int $id,
        float $rate,
        bool $isCompound = false,
        int $applyOrder  = 0,
        string $code     = '',
        string $name     = '',
    ): object {
        $tax              = new \stdClass();
        $tax->id          = $id;
        $tax->rate        = $rate;
        $tax->is_compound = $isCompound;
        $tax->apply_order = $applyOrder;
        $tax->code        = $code ?: "TAX{$id}";
        $tax->name        = $name ?: "Tax {$id}";
        return $tax;
    }

    /** Default settings — exclusive pricing, no exemptions, per-line rounding */
    private function defaultSettings(array $overrides = []): array
    {
        return array_merge([
            'tax.prices_include_tax'     => false,
            'tax.compound_taxes_enabled' => false,
            'tax.exempt_takeaway'        => false,
            'tax.exempt_delivery'        => false,
            'tax.rounding_mode'          => 'per_line',
        ], $overrides);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 1 — Basic single tax, exclusive pricing
    // ─────────────────────────────────────────────────────────────────────────

    public function test_single_tax_exclusive(): void
    {
        $items = collect([
            $this->makeItem(100, 1, [$this->makeTax(1, 10)]),
        ]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(100.00, $bd['subtotal_before_tax']);
        $this->assertEquals(10.00,  $bd['tax_amount']);
        $this->assertEquals(110.00, $bd['subtotal_after_tax']);

        $this->assertCount(1, $result->invoiceTaxes);
        $this->assertEquals(10.00,  $result->invoiceTaxes->first()['tax_amount']);
        $this->assertEquals(10.00,  $result->totalTax);
        $this->assertEquals(110.00, $result->totalAfterTax);
    }

    public function test_single_tax_exclusive_multi_qty(): void
    {
        $items = collect([
            $this->makeItem(50, 3, [$this->makeTax(1, 10)]),
        ]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(150.00, $bd['subtotal_before_tax']);
        $this->assertEquals(15.00,  $bd['tax_amount']);
        $this->assertEquals(165.00, $bd['subtotal_after_tax']);

        $this->assertEquals(15.00,  $result->totalTax);
        $this->assertEquals(165.00, $result->totalAfterTax);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 2 — Inclusive pricing
    // ─────────────────────────────────────────────────────────────────────────

    public function test_single_tax_inclusive(): void
    {
        $items    = collect([$this->makeItem(110, 1, [$this->makeTax(1, 10)])]);
        $settings = $this->defaultSettings(['tax.prices_include_tax' => true]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $settings);

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(100.00, $bd['subtotal_before_tax']);
        $this->assertEquals(10.00,  $bd['tax_amount']);
        $this->assertEquals(110.00, $bd['subtotal_after_tax']);

        $this->assertEquals(10.00,  $result->totalTax);
        $this->assertEquals(110.00, $result->totalAfterTax);
    }

    public function test_two_taxes_inclusive_non_compound(): void
    {
        // 100 base + 10% + 16% = 126 total.  Reverse: 126 / 1.26 = 100
        $taxes = [
            $this->makeTax(1, 10, false, 0),
            $this->makeTax(2, 16, false, 1),
        ];
        $items    = collect([$this->makeItem(126, 1, $taxes)]);
        $settings = $this->defaultSettings(['tax.prices_include_tax' => true]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $settings);

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(100.00, $bd['subtotal_before_tax']);
        $this->assertEquals(26.00,  $bd['tax_amount']);
        $this->assertEquals(126.00, $bd['subtotal_after_tax']);

        // Verify per-tax breakdown amounts
        $itemTaxes = $bd['item_taxes'];
        $this->assertCount(2, $itemTaxes);

        $taxById = collect($itemTaxes)->keyBy('tax_rate_id');
        $this->assertEquals(10.00, $taxById[1]['tax_amount']);
        $this->assertEquals(16.00, $taxById[2]['tax_amount']);

        $this->assertEquals(26.00,  $result->totalTax);
        $this->assertEquals(126.00, $result->totalAfterTax);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 3 — Compound taxes
    // ─────────────────────────────────────────────────────────────────────────

    public function test_compound_exclusive(): void
    {
        // tax_A = 10%, non-compound, order 0
        // tax_B = 10%, compound,     order 1
        // base=100 → tax_A taxable=100, amount=10
        //           → tax_B taxable=110 (running), amount=11
        //           → total=121
        $taxes = [
            $this->makeTax(1, 10, false, 0),
            $this->makeTax(2, 10, true,  1),
        ];
        $items    = collect([$this->makeItem(100, 1, $taxes)]);
        $settings = $this->defaultSettings(['tax.compound_taxes_enabled' => true]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $settings);

        $bd       = $result->itemBreakdowns->get(0);
        $itemTaxes = collect($bd['item_taxes'])->keyBy('tax_rate_id');

        $this->assertEquals(100.00, $bd['subtotal_before_tax']);

        // tax_A: taxable=100, amount=10
        $this->assertEquals(100.00, $itemTaxes[1]['taxable_amount']);
        $this->assertEquals(10.00,  $itemTaxes[1]['tax_amount']);

        // tax_B: compound → taxable=110 (base + tax_A), amount=11
        $this->assertEquals(110.00, $itemTaxes[2]['taxable_amount']);
        $this->assertEquals(11.00,  $itemTaxes[2]['tax_amount']);

        $this->assertEquals(21.00,  $bd['tax_amount']);
        $this->assertEquals(121.00, $bd['subtotal_after_tax']);
        $this->assertEquals(21.00,  $result->totalTax);
        $this->assertEquals(121.00, $result->totalAfterTax);
    }

    public function test_compound_inclusive(): void
    {
        // price=121, same compound taxes → reverse base must equal 100
        // compound_factor = 1.10 * 1.10 = 1.21
        // base = 121 / 1.21 = 100
        $taxes = [
            $this->makeTax(1, 10, false, 0),
            $this->makeTax(2, 10, true,  1),
        ];
        $items    = collect([$this->makeItem(121, 1, $taxes)]);
        $settings = $this->defaultSettings([
            'tax.prices_include_tax'     => true,
            'tax.compound_taxes_enabled' => true,
        ]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $settings);

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(100.00, $bd['subtotal_before_tax']);
        $this->assertEquals(21.00,  $bd['tax_amount']);
        $this->assertEquals(121.00, $bd['subtotal_after_tax']);
        $this->assertEquals(21.00,  $result->totalTax);
        $this->assertEquals(121.00, $result->totalAfterTax);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 4 — Exemptions
    // ─────────────────────────────────────────────────────────────────────────

    public function test_item_level_exempt(): void
    {
        $items = collect([
            $this->makeItem(100, 1, [$this->makeTax(1, 10)], isExempt: true),
        ]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(100.00, $bd['subtotal_before_tax']);
        $this->assertEquals(0.00,   $bd['tax_amount']);
        $this->assertEquals(100.00, $bd['subtotal_after_tax']);
        $this->assertEmpty($bd['item_taxes']);
        $this->assertEquals(0.00,   $result->totalTax);
        $this->assertEquals(100.00, $result->totalAfterTax);
    }

    public function test_dine_in_never_exempt(): void
    {
        // exempt_takeaway=true should NOT affect dine_in
        $items    = collect([$this->makeItem(100, 1, [$this->makeTax(1, 10)])]);
        $settings = $this->defaultSettings(['tax.exempt_takeaway' => true]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $settings);

        $this->assertEquals(10.00,  $result->totalTax);
        $this->assertEquals(110.00, $result->totalAfterTax);
    }

    public function test_takeaway_exempt_when_setting_true(): void
    {
        $items    = collect([$this->makeItem(100, 1, [$this->makeTax(1, 10)])]);
        $settings = $this->defaultSettings(['tax.exempt_takeaway' => true]);

        $result = $this->calc->calculateForCart($items, 'takeaway', $settings);

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(0.00,   $bd['tax_amount']);
        $this->assertEquals(100.00, $bd['subtotal_after_tax']);
        $this->assertEquals(0.00,   $result->totalTax);
    }

    public function test_takeaway_not_exempt_when_setting_false(): void
    {
        $items    = collect([$this->makeItem(100, 1, [$this->makeTax(1, 10)])]);
        $settings = $this->defaultSettings(['tax.exempt_takeaway' => false]);

        $result = $this->calc->calculateForCart($items, 'takeaway', $settings);

        $this->assertEquals(10.00,  $result->totalTax);
        $this->assertEquals(110.00, $result->totalAfterTax);
    }

    public function test_delivery_exempt_when_setting_true(): void
    {
        $items    = collect([$this->makeItem(200, 2, [$this->makeTax(1, 15)])]);
        $settings = $this->defaultSettings(['tax.exempt_delivery' => true]);

        $result = $this->calc->calculateForCart($items, 'delivery', $settings);

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(0.00,   $bd['tax_amount']);
        $this->assertEquals(400.00, $bd['subtotal_after_tax']);
        $this->assertEquals(0.00,   $result->totalTax);
    }

    public function test_mixed_cart(): void
    {
        // item 0: taxable, item 1: exempt
        $items = collect([
            $this->makeItem(100, 1, [$this->makeTax(1, 10)], isExempt: false),
            $this->makeItem(50,  2, [$this->makeTax(1, 10)], isExempt: true),
        ]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());

        $bd0 = $result->itemBreakdowns->get(0);
        $bd1 = $result->itemBreakdowns->get(1);

        $this->assertEquals(10.00,  $bd0['tax_amount']);
        $this->assertEquals(0.00,   $bd1['tax_amount']);
        $this->assertEquals(10.00,  $result->totalTax);
        $this->assertEquals(210.00, $result->totalAfterTax);  // 110 + 100
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 5 — Edge cases
    // ─────────────────────────────────────────────────────────────────────────

    public function test_no_taxes_assigned(): void
    {
        $items = collect([$this->makeItem(100, 2, [])]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(200.00, $bd['subtotal_before_tax']);
        $this->assertEquals(0.00,   $bd['tax_amount']);
        $this->assertEquals(200.00, $bd['subtotal_after_tax']);
        $this->assertCount(0, $result->invoiceTaxes);
        $this->assertEquals(0.00,   $result->totalTax);
        $this->assertEquals(200.00, $result->totalAfterTax);
    }

    public function test_zero_price(): void
    {
        $items = collect([$this->makeItem(0, 1, [$this->makeTax(1, 10)])]);

        // Must not throw — division by zero guard must hold for inclusive pricing too
        $settings = $this->defaultSettings(['tax.prices_include_tax' => true]);
        $result   = $this->calc->calculateForCart($items, 'dine_in', $settings);

        $bd = $result->itemBreakdowns->get(0);
        $this->assertEquals(0.00, $bd['subtotal_before_tax']);
        $this->assertEquals(0.00, $bd['tax_amount']);
        $this->assertEquals(0.00, $bd['subtotal_after_tax']);
        $this->assertEquals(0.00, $result->totalTax);
        $this->assertEquals(0.00, $result->totalAfterTax);
    }

    public function test_negative_quantity_throws(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $items = collect([$this->makeItem(100, -1, [$this->makeTax(1, 10)])]);
        $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());
    }

    public function test_negative_price_throws(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $items = collect([$this->makeItem(-10, 1, [$this->makeTax(1, 10)])]);
        $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group 6 — Invoice-level aggregation
    // ─────────────────────────────────────────────────────────────────────────

    public function test_invoice_level_tax_totals(): void
    {
        // 3 items, all taxed by the same single tax (id=1, 10%)
        // item totals: 100, 200, 50  → taxable sums: 350, tax sums: 35
        $tax   = $this->makeTax(1, 10);
        $items = collect([
            $this->makeItem(100, 1, [$tax]),
            $this->makeItem(100, 2, [$tax]),
            $this->makeItem(50,  1, [$tax]),
        ]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());

        // Only ONE invoice-level tax row (same tax_id collapsed)
        $this->assertCount(1, $result->invoiceTaxes);

        $row = $result->invoiceTaxes->first();
        $this->assertEquals(350.00, $row['taxable_amount']);
        $this->assertEquals(35.00,  $row['tax_amount']);

        $this->assertEquals(35.00,  $result->totalTax);
        $this->assertEquals(385.00, $result->totalAfterTax);
    }

    public function test_invoice_level_multiple_taxes(): void
    {
        // item 0: only tax A (10%)  → taxable=100, tax=10
        // item 1: only tax B (5%)   → taxable=200, tax=10
        // invoice_taxes: 2 rows
        $taxA  = $this->makeTax(1, 10, false, 0, 'VAT', 'VAT');
        $taxB  = $this->makeTax(2, 5,  false, 0, 'SVC', 'Service');
        $items = collect([
            $this->makeItem(100, 1, [$taxA]),
            $this->makeItem(100, 2, [$taxB]),
        ]);

        $result = $this->calc->calculateForCart($items, 'dine_in', $this->defaultSettings());

        $this->assertCount(2, $result->invoiceTaxes);

        $byId = $result->invoiceTaxes->keyBy('tax_rate_id');
        $this->assertEquals(100.00, $byId[1]['taxable_amount']);
        $this->assertEquals(10.00,  $byId[1]['tax_amount']);
        $this->assertEquals(200.00, $byId[2]['taxable_amount']);
        $this->assertEquals(10.00,  $byId[2]['tax_amount']);

        $this->assertEquals(20.00,  $result->totalTax);
        $this->assertEquals(320.00, $result->totalAfterTax);
    }
}
