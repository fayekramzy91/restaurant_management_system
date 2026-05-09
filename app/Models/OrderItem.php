<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class OrderItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function menuItem()
    {
        return $this->belongsTo(MenuItem::class)->withTrashed();
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->name ?? $this->menuItem?->name ?? '[صنف محذوف]';
    }

    public function addons()
    {
        return $this->hasMany(OrderItemAddon::class);
    }

    /**
     * Tax rates inherited from the snapshotted menu item.
     * Uses menu_item_id as the local join key (not the PK) so the pivot
     * lookup resolves correctly: menu_item_tax_rates.menu_item_id = order_items.menu_item_id
     */
    public function taxRates()
    {
        return $this->belongsToMany(
            TaxRate::class,
            'menu_item_tax_rates',
            'menu_item_id',   // FK on pivot → this model's local key
            'tax_rate_id',    // FK on pivot → TaxRate PK
            'menu_item_id',   // local key on OrderItem (use menu_item_id, not id)
            'id',             // owner key on TaxRate
        )->orderBy('apply_order');
    }

    /**
     * Proxy is_tax_exempt from the linked MenuItem.
     * Requires 'menuItem' to be eager-loaded for N+1 safety.
     */
    public function getIsTaxExemptAttribute(): bool
    {
        return (bool) ($this->menuItem?->is_tax_exempt ?? false);
    }
}
