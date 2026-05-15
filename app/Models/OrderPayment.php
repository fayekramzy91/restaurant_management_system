<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @deprecated Use Invoice + PaymentEntry instead.
 * Kept for backward compatibility during transition. Will be removed after cleanup migration.
 */
class OrderPayment extends Model
{
    protected $fillable = [
        'order_id',
        'payment_method_id',
        'amount',
    ];

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
