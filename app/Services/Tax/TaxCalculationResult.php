<?php

namespace App\Services\Tax;

use Illuminate\Support\Collection;

final class TaxCalculationResult
{
    public function __construct(
        /** @var Collection<int, array> Keyed by order_item index (0-based) */
        public readonly Collection $itemBreakdowns,
        /** @var Collection<int|string, array> Grouped invoice-level tax totals, keyed by tax_id */
        public readonly Collection $invoiceTaxes,
        public readonly float $subtotalBeforeTax,
        public readonly float $totalTax,
        public readonly float $totalAfterTax,
        public readonly bool $pricesIncludedTax,
        public readonly string $orderType,
    ) {}

    public function toArray(): array
    {
        return [
            'order_type'          => $this->orderType,
            'prices_included_tax' => $this->pricesIncludedTax,
            'subtotal_before_tax' => $this->subtotalBeforeTax,
            'total_tax'           => $this->totalTax,
            'total_after_tax'     => $this->totalAfterTax,
            'invoice_taxes'       => $this->invoiceTaxes->values()->all(),
            'item_breakdowns'     => $this->itemBreakdowns->all(),
        ];
    }

    /**
     * Returns rows ready for invoice_taxes table (caller must append invoice_id).
     *
     * @return array<int, array{
     *   tax_rate_id: int|null,
     *   tax_name: string,
     *   tax_code: string,
     *   rate: float,
     *   is_compound: bool,
     *   taxable_amount: float,
     *   tax_amount: float,
     * }>
     */
    public function toInvoiceTaxesData(): array
    {
        return $this->invoiceTaxes->values()->map(fn (array $tax) => [
            'tax_rate_id'    => $tax['tax_rate_id'],
            'tax_name'       => $tax['tax_name'],
            'tax_code'       => $tax['tax_code'],
            'rate'           => $tax['rate'],
            'is_compound'    => $tax['is_compound'],
            'taxable_amount' => $tax['taxable_amount'],
            'tax_amount'     => $tax['tax_amount'],
        ])->all();
    }

    /**
     * Returns per-item arrays for updating invoice_items and inserting invoice_item_taxes.
     * Keyed by the same order_item index used during calculation.
     *
     * @return array<int, array{
     *   subtotal_before_tax: float,
     *   tax_amount: float,
     *   subtotal_after_tax: float,
     *   item_taxes: array<int, array{
     *     tax_rate_id: int|null,
     *     tax_name: string,
     *     tax_code: string,
     *     rate: float,
     *     is_compound: bool,
     *     taxable_amount: float,
     *     tax_amount: float,
     *   }>,
     * }>
     */
    public function toItemBreakdownsData(): array
    {
        return $this->itemBreakdowns->map(fn (array $item) => [
            'subtotal_before_tax' => $item['subtotal_before_tax'],
            'tax_amount'          => $item['tax_amount'],
            'subtotal_after_tax'  => $item['subtotal_after_tax'],
            'item_taxes'          => array_map(fn (array $t) => [
                'tax_rate_id'    => $t['tax_rate_id'],
                'tax_name'       => $t['tax_name'],
                'tax_code'       => $t['tax_code'],
                'rate'           => $t['rate'],
                'is_compound'    => $t['is_compound'],
                'taxable_amount' => $t['taxable_amount'],
                'tax_amount'     => $t['tax_amount'],
            ], $item['item_taxes']),
        ])->all();
    }
}
