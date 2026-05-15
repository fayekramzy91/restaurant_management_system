<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;

class InvoiceItemSnapshotter
{
    /**
     * Snapshot all order_items (and their addons) into invoice_items.
     * Idempotent — safe to call multiple times on the same invoice.
     */
    public function snapshot(Invoice $invoice): void
    {
        if ($invoice->items()->exists()) {
            return;
        }

        $invoice->loadMissing('order.items.addons');
        $order = $invoice->order;

        if (! $order) {
            return;
        }

        foreach ($order->items as $orderItem) {
            $name = $orderItem->name
                ?? $orderItem->menuItem?->name
                ?? '[صنف محذوف]';

            $invoiceItem = InvoiceItem::create([
                'invoice_id'    => $invoice->id,
                'order_item_id' => $orderItem->id,
                'menu_item_id'  => $orderItem->menu_item_id,
                'name'          => $name,
                'unit_price'    => $orderItem->price,
                'quantity'      => $orderItem->quantity,
                'subtotal'      => $orderItem->price * $orderItem->quantity,
                'is_addon'      => false,
                'notes'         => $orderItem->notes,
            ]);

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
        }
    }
}
