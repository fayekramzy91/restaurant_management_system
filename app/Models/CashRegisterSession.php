<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashRegisterSession extends Model
{
    protected $fillable = [
        'user_id',
        'branch_id',
        'opened_at',
        'closed_at',
        'opening_balance',
        'expected_closing_balance',
        'actual_closing_balance',
        'difference',
        'notes',
        'status',
    ];

    protected $casts = [
        'opening_balance'          => 'decimal:2',
        'expected_closing_balance' => 'decimal:2',
        'actual_closing_balance'   => 'decimal:2',
        'difference'               => 'decimal:2',
        'opened_at'                => 'datetime',
        'closed_at'                => 'datetime',
        'status'                   => 'string',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function paymentEntries(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PaymentEntry::class);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    /**
     * Total cash received (payments only) during this session.
     */
    public function getCashReceivedAttribute(): float
    {
        return (float) $this->paymentEntries()
            ->whereHas('paymentMethod', fn ($q) => $q->where('type', 'cash'))
            ->where('type', 'payment')
            ->sum('amount');
    }

    /**
     * What the closing balance should be, given cash received.
     */
    public function getExpectedClosingBalance(): float
    {
        return (float) $this->opening_balance + $this->cash_received;
    }
}
