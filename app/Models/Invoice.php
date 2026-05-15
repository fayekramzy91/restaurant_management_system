<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Invoice extends Model
{
    protected $fillable = [
        'order_id', 'branch_id', 'customer_id', 'invoice_number',
        'subtotal', 'discount', 'tax_rate', 'tax_amount', 'total',
        'paid_amount', 'wallet_amount', 'status',
        'notes', 'private_notes', 'issued_at', 'voided_at',
        'prices_included_tax', 'tax_breakdown_json', 'checkout_attempts',
    ];

    protected $casts = [
        'subtotal'      => 'decimal:2',
        'discount'      => 'decimal:2',
        'tax_rate'      => 'decimal:2',
        'tax_amount'    => 'decimal:2',
        'total'         => 'decimal:2',
        'paid_amount'   => 'decimal:2',
        'wallet_amount'       => 'decimal:2',
        'issued_at'           => 'datetime',
        'voided_at'           => 'datetime',
        'prices_included_tax' => 'boolean',
        'tax_breakdown_json'  => 'array',
        'checkout_attempts'   => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function mainItems()
    {
        return $this->hasMany(InvoiceItem::class)->whereNull('parent_invoice_item_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function paymentEntries()
    {
        return $this->hasMany(PaymentEntry::class);
    }

    public function payments()
    {
        return $this->hasMany(PaymentEntry::class)->where('type', 'payment');
    }

    public function refunds()
    {
        return $this->hasMany(PaymentEntry::class)->where('type', 'refund');
    }

    public function taxes()
    {
        return $this->hasMany(InvoiceTax::class);
    }

    public function remainingAmount(): float
    {
        return max(0, (float) $this->total - (float) $this->paid_amount - (float) $this->wallet_amount);
    }

    public function refundedAmount(): float
    {
        return (float) $this->refunds()->sum('amount');
    }

    public function netPaid(): float
    {
        return (float) $this->paid_amount + (float) $this->wallet_amount - $this->refundedAmount();
    }

    public function recalculatePaidAmount(): void
    {
        $paid      = (float) $this->payments()->sum('amount');
        $total     = (float) $this->total;
        $wallet    = (float) $this->wallet_amount;
        $refunded  = (float) $this->refunds()->sum('amount');

        $effective    = $paid + $wallet;
        $netEffective = $effective - $refunded;

        if ($refunded > 0 && $netEffective <= 0.001) {
            $status = 'refunded';
        } elseif ($effective >= $total && $total > 0) {
            $status = 'paid';
        } elseif ($effective > 0) {
            $status = 'partial';
        } else {
            $status = 'draft';
        }

        $this->update(['paid_amount' => $paid, 'status' => $status]);
    }

    public static function generateNumber(): string
    {
        $year   = date('Y');
        $nextId = (int) DB::table('invoices')->max('id') + 1;
        return 'INV-' . $year . '-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);
    }
}
