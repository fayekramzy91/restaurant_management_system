<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaxRate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'name_en',
        'code',
        'rate',
        'is_compound',
        'apply_order',
        'is_active',
        'is_default',
        'description',
    ];

    protected $casts = [
        'rate'        => 'decimal:4',
        'is_compound' => 'boolean',
        'is_active'   => 'boolean',
        'is_default'  => 'boolean',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function menuItems()
    {
        return $this->belongsToMany(MenuItem::class, 'menu_item_tax_rates');
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('apply_order', 'ASC');
    }
}
