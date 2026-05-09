<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    // Immutable ledger rows — no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'invoice_id',
        'order_item_id',
        'menu_item_id',
        'parent_invoice_item_id',
        'name',
        'unit_price',
        'quantity',
        'subtotal',
        'subtotal_before_tax',
        'tax_amount',
        'subtotal_after_tax',
        'is_addon',
        'notes',
    ];

    protected $casts = [
        'unit_price'          => 'decimal:2',
        'subtotal'            => 'decimal:2',
        'subtotal_before_tax' => 'decimal:2',
        'tax_amount'          => 'decimal:2',
        'subtotal_after_tax'  => 'decimal:2',
        'is_addon'            => 'boolean',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class)->withTrashed();
    }

    public function menuItem()
    {
        return $this->belongsTo(MenuItem::class)->withTrashed();
    }

    public function parent()
    {
        return $this->belongsTo(InvoiceItem::class, 'parent_invoice_item_id');
    }

    public function addons()
    {
        return $this->hasMany(InvoiceItem::class, 'parent_invoice_item_id');
    }

    public function taxes()
    {
        return $this->hasMany(InvoiceItemTax::class);
    }
}
