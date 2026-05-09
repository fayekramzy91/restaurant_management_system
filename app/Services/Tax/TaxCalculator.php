<?php

namespace App\Services\Tax;

use Illuminate\Support\Collection;
use InvalidArgumentException;

class TaxCalculator
{
    public function calculateForCart(
        Collection $orderItems,
        string $orderType,
        array $settings,
    ): TaxCalculationResult {
        // Step 1 — Read settings
        $pricesIncludeTax = (bool) ($settings['tax.prices_include_tax'] ?? false);
        $compoundEnabled  = (bool) ($settings['tax.compound_taxes_enabled'] ?? false);
        $exemptTakeaway   = (bool) ($settings['tax.exempt_takeaway'] ?? false);
        $exemptDelivery   = (bool) ($settings['tax.exempt_delivery'] ?? false);
        $roundingMode     = $settings['tax.rounding_mode'] ?? 'per_line';

        // Step 2 — Order-type full exemption
        $orderExempt = ($orderType === 'takeaway' && $exemptTakeaway)
                    || ($orderType === 'delivery' && $exemptDelivery);

        $itemBreakdowns     = collect();
        $invoiceTaxAccum    = [];   // keyed by tax_id → running totals
        $grandSubtotal      = 0.0;
        $grandTax           = 0.0;

        // Step 3 — Per-item calculation
        foreach ($orderItems as $index => $item) {
            $price    = (float) $item->price;
            $quantity = (float) $item->quantity;

            if ($price < 0) {
                throw new InvalidArgumentException("Item at index {$index} has a negative price.");
            }
            if ($quantity < 0) {
                throw new InvalidArgumentException("Item at index {$index} has a negative quantity.");
            }

            $lineTotal  = $price * $quantity;
            $itemExempt = $orderExempt || (bool) $item->is_tax_exempt;

            if ($itemExempt) {
                $itemBreakdowns->put($index, [
                    'subtotal_before_tax' => round($lineTotal, 2),
                    'tax_amount'          => 0.0,
                    'subtotal_after_tax'  => round($lineTotal, 2),
                    'item_taxes'          => [],
                ]);
                $grandSubtotal += $lineTotal;
                continue;
            }

            // Sort tax rates by apply_order ASC (defensive re-sort)
            $sortedTaxes = $item->taxRates
                ->sortBy('apply_order')
                ->values()
                ->all();

            $baseAmount    = $this->extractBaseAmount($lineTotal, $sortedTaxes, $pricesIncludeTax, $compoundEnabled);
            $runningAmount = $baseAmount;
            $itemTaxes     = [];
            $totalItemTax  = 0.0;

            foreach ($sortedTaxes as $tax) {
                $rate       = (float) $tax->rate;
                $taxable    = ($compoundEnabled && $tax->is_compound)
                    ? $runningAmount
                    : $baseAmount;

                $taxAmount = $taxable * ($rate / 100.0);

                if ($roundingMode === 'per_line') {
                    $taxAmount = round($taxAmount, 2);
                }

                $runningAmount += $taxAmount;
                $totalItemTax  += $taxAmount;

                $itemTaxEntry = [
                    'tax_rate_id'    => $tax->id ?? null,
                    'tax_name'       => (string) $tax->name,
                    'tax_code'       => (string) $tax->code,
                    'rate'           => $rate,
                    'is_compound'    => (bool) $tax->is_compound,
                    'taxable_amount' => round($taxable, 2),
                    'tax_amount'     => round($taxAmount, 2),
                ];

                $itemTaxes[] = $itemTaxEntry;

                // Step 4 — Accumulate invoice-level totals by tax_id
                $taxId = $tax->id ?? ('code:' . $tax->code);
                if (! isset($invoiceTaxAccum[$taxId])) {
                    $invoiceTaxAccum[$taxId] = [
                        'tax_rate_id'    => $tax->id ?? null,
                        'tax_name'       => (string) $tax->name,
                        'tax_code'       => (string) $tax->code,
                        'rate'           => $rate,
                        'is_compound'    => (bool) $tax->is_compound,
                        'taxable_amount' => 0.0,
                        'tax_amount'     => 0.0,
                    ];
                }
                $invoiceTaxAccum[$taxId]['taxable_amount'] += $taxable;
                $invoiceTaxAccum[$taxId]['tax_amount']     += $taxAmount;
            }

            $subtotalBeforeTax = round($baseAmount, 2);
            $subtotalAfterTax  = round($baseAmount + $totalItemTax, 2);
            $totalItemTaxRnd   = round($totalItemTax, 2);

            $itemBreakdowns->put($index, [
                'subtotal_before_tax' => $subtotalBeforeTax,
                'tax_amount'          => $totalItemTaxRnd,
                'subtotal_after_tax'  => $subtotalAfterTax,
                'item_taxes'          => $itemTaxes,
            ]);

            $grandSubtotal += $baseAmount;
            $grandTax      += $totalItemTax;
        }

        // Round invoice-level tax accumulations
        $invoiceTaxes = collect($invoiceTaxAccum)->map(function (array $row) {
            $row['taxable_amount'] = round($row['taxable_amount'], 2);
            $row['tax_amount']     = round($row['tax_amount'], 2);
            return $row;
        });

        // Step 5 — Build result
        return new TaxCalculationResult(
            itemBreakdowns:    $itemBreakdowns,
            invoiceTaxes:      $invoiceTaxes,
            subtotalBeforeTax: round($grandSubtotal, 2),
            totalTax:          round($grandTax, 2),
            totalAfterTax:     round($grandSubtotal + $grandTax, 2),
            pricesIncludedTax: $pricesIncludeTax,
            orderType:         $orderType,
        );
    }

    private function extractBaseAmount(
        float $lineTotal,
        array $sortedTaxes,
        bool $pricesInclude,
        bool $compound,
    ): float {
        if (! $pricesInclude) {
            return $lineTotal;
        }

        if (! $compound) {
            $totalRate = array_sum(array_map(fn ($t) => (float) $t->rate, $sortedTaxes));
            $divisor   = 1.0 + ($totalRate / 100.0);
            return $divisor > 0.0 ? $lineTotal / $divisor : $lineTotal;
        }

        // Compound: price = base × ∏(1 + rateN/100)
        $compoundFactor = 1.0;
        foreach ($sortedTaxes as $tax) {
            $compoundFactor *= (1.0 + ((float) $tax->rate / 100.0));
        }
        return $compoundFactor > 0.0 ? $lineTotal / $compoundFactor : $lineTotal;
    }
}
