<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItemAddon extends Model
{
    protected $fillable = [
        'order_item_id',
        'menu_item_id',
        'name',
        'price',
        'quantity',
    ];

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function menuItem()
    {
        return $this->belongsTo(MenuItem::class)->withTrashed();
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->name ?? $this->menuItem?->name ?? '[إضافة محذوفة]';
    }
}
