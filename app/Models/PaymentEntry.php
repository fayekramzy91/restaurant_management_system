<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentEntry extends Model
{
    const UPDATED_AT = null; // Immutable ledger rows — no updated_at

    protected $fillable = [
        'invoice_id', 'payment_method_id', 'type', 'amount',
        'reference_number', 'notes', 'processed_by', 'metadata',
    ];

    protected $casts = [
        'amount'   => 'decimal:2',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::created(function (PaymentEntry $entry) {
            $entry->invoice->recalculatePaidAmount();
        });
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function scopePayments($query)
    {
        return $query->where('type', 'payment');
    }

    public function scopeRefunds($query)
    {
        return $query->where('type', 'refund');
    }
}
