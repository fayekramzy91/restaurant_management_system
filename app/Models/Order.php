<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Auth;

class Order extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'preparing_started_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function timeline()
    {
        return $this->hasMany(OrderTimeline::class)->orderBy('created_at');
    }

    public function getPaymentStatusAttribute(): string
    {
        return $this->invoice?->status ?? 'unpaid';
    }

    /**
     * Recalculate total_amount from scratch by summing every item × qty
     * plus each addon × its own absolute qty (addons are order-level totals,
     * not per-parent-unit).  Always reloads items fresh from DB.
     */
    public function recalculateTotalAmount(): void
    {
        $total = 0;
        foreach ($this->items()->with('addons')->get() as $item) {
            $itemSubtotal   = $item->price * $item->quantity;
            $addonsSubtotal = $item->addons->sum(
                fn ($addon) => $addon->price * $addon->quantity
            );
            $total += $itemSubtotal + $addonsSubtotal;
        }
        $this->update(['total_amount' => $total]);
    }

    public function logEvent(string $event, string $description, array $metadata = []): void
    {
        $this->timeline()->create([
            'event'       => $event,
            'description' => $description,
            'user_id'     => Auth::id(),
            'metadata'    => empty($metadata) ? null : $metadata,
        ]);
    }
}
