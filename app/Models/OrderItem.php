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
}
