<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoiceItemTax;
use App\Services\Tax\TaxCalculationResult;

class InvoiceItemSnapshotter
{
    /**
     * Snapshot all order_items (and their addons) into invoice_items.
     * Idempotent — safe to call multiple times on the same invoice.
     *
     * When $taxResult is provided the snapshot also:
     *   - writes subtotal_before_tax / tax_amount / subtotal_after_tax on each invoice_item
     *   - inserts invoice_item_taxes rows for the per-item tax breakdown
     *
     * When $taxResult is null the method behaves exactly as before (backward compatible).
     */
    public function snapshot(Invoice $invoice, ?TaxCalculationResult $taxResult = null): void
    {
        if ($invoice->items()->exists()) {
            return;
        }

        $invoice->loadMissing('order.items.addons');
        $order = $invoice->order;

        if (! $order) {
            return;
        }

        // $itemIndex mirrors the 0-based positional key used by TaxCalculationResult::$itemBreakdowns,
        // which was built by iterating $order->items in the same order.
        $itemIndex = 0;

        foreach ($order->items as $orderItem) {
            $name      = $orderItem->name
                ?? $orderItem->menuItem?->name
                ?? '[صنف محذوف]';
            $lineTotal = $orderItem->price * $orderItem->quantity;

            // ── Base invoice-item row ─────────────────────────────────────────
            $invoiceItemData = [
                'invoice_id'    => $invoice->id,
                'order_item_id' => $orderItem->id,
                'menu_item_id'  => $orderItem->menu_item_id,
                'name'          => $name,
                'unit_price'    => $orderItem->price,
                'quantity'      => $orderItem->quantity,
                'subtotal'      => $lineTotal,
                'is_addon'      => false,
                'notes'         => $orderItem->notes,
            ];

            // ── Tax fields (only when a result is available) ──────────────────
            $bd = $taxResult?->itemBreakdowns->get($itemIndex);

            if ($bd !== null) {
                $invoiceItemData['subtotal_before_tax'] = $bd['subtotal_before_tax'];
                $invoiceItemData['tax_amount']          = $bd['tax_amount'];
                $invoiceItemData['subtotal_after_tax']  = $bd['subtotal_after_tax'];
            }

            $invoiceItem = InvoiceItem::create($invoiceItemData);

            // ── Per-item tax breakdown rows ───────────────────────────────────
            if ($bd !== null) {
                foreach ($bd['item_taxes'] as $taxRow) {
                    InvoiceItemTax::create(array_merge(
                        $taxRow,
                        ['invoice_item_id' => $invoiceItem->id],
                    ));
                }
            }

            // ── Addons (child rows — no separate tax treatment) ───────────────
            foreach ($orderItem->addons as $addon) {
                $addonName = $addon->name
                    ?? $addon->menuItem?->name
                    ?? '[إضافة محذوفة]';

                InvoiceItem::create([
                    'invoice_id'             => $invoice->id,
                    'order_item_id'          => $orderItem->id,
                    'menu_item_id'           => $addon->menu_item_id,
                    'parent_invoice_item_id' => $invoiceItem->id,
                    'name'                   => $addonName,
                    'unit_price'             => $addon->price,
                    'quantity'               => $addon->quantity,
                    'subtotal'               => $addon->price * $addon->quantity,
                    'is_addon'               => true,
                    'notes'                  => null,
                ]);
            }

            $itemIndex++;
        }
    }
}
