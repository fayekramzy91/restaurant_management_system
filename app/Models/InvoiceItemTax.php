<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItemTax extends Model
{
    // Immutable ledger row — no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'invoice_item_id',
        'tax_rate_id',
        'tax_name',
        'tax_code',
        'rate',
        'is_compound',
        'taxable_amount',
        'tax_amount',
    ];

    protected $casts = [
        'rate'           => 'decimal:4',
        'taxable_amount' => 'decimal:2',
        'tax_amount'     => 'decimal:2',
        'is_compound'    => 'boolean',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function invoiceItem()
    {
        return $this->belongsTo(InvoiceItem::class);
    }

    public function taxRate()
    {
        return $this->belongsTo(TaxRate::class)->withTrashed();
    }
}
