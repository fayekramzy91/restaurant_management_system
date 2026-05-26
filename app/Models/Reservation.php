<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Reservation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'customer_name',
        'customer_phone',
        'party_size',
        'table_id',
        'branch_id',
        'reserved_by',
        'reservation_date',
        'reservation_time',
        'estimated_duration',
        'status',
        'deposit_amount',
        'deposit_paid',
        'deposit_notes',
        'order_id',
        'notes',
        'cancellation_reason',
        'reminded_at',
        'rescheduled_from_id',
    ];

    protected $casts = [
        'reservation_date'   => 'date',
        'reservation_time'   => 'string',
        'deposit_amount'     => 'decimal:2',
        'deposit_paid'       => 'boolean',
        'reminded_at'        => 'datetime',
        'estimated_duration' => 'integer',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function reservedBy()
    {
        return $this->belongsTo(User::class, 'reserved_by');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function rescheduledFrom()
    {
        return $this->belongsTo(Reservation::class, 'rescheduled_from_id');
    }

    public function rescheduledTo()
    {
        return $this->hasOne(Reservation::class, 'rescheduled_from_id');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['confirmed', 'seated']);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('reservation_date', today());
    }

    public function scopeUpcoming($query)
    {
        return $query->where('reservation_date', '>=', today());
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'confirmed' || $this->status === 'seated';
    }

    public function isEditable(): bool
    {
        return in_array($this->status, ['confirmed', 'waitlist']);
    }

    public function getStartsAtAttribute(): Carbon
    {
        return Carbon::parse($this->reservation_date->toDateString() . ' ' . $this->reservation_time);
    }

    public function getEndsAtAttribute(): Carbon
    {
        return $this->starts_at->addMinutes($this->estimated_duration);
    }

    public function isUpcoming(): bool
    {
        return $this->starts_at->isFuture();
    }

    public function minutesUntil(): int
    {
        return max(0, (int) now()->diffInMinutes($this->starts_at, false));
    }
}
