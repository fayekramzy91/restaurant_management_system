<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Runs BEFORE strip_financial_columns (migration 4), so discount/paid_amount/payment_status
    // still exist on the orders table when this migration executes.
    public function up(): void
    {
        DB::transaction(function () {
            $statusMap = [
                'paid'          => 'paid',
                'partially_paid'=> 'partial',
                'pending'       => 'draft',
                'unpaid'        => 'draft',
            ];

            $orders = DB::table('orders')
                ->where('status', 'completed')
                ->orderBy('id')
                ->get();

            foreach ($orders as $order) {
                $subtotal  = $order->total_amount;
                $discount  = $order->discount ?? 0;
                $total     = max(0, $subtotal - $discount);

                $invoiceStatus = $statusMap[$order->payment_status] ?? 'draft';

                $orderPayments = DB::table('order_payments')
                    ->where('order_id', $order->id)
                    ->get();

                $totalPayments = $orderPayments->sum('amount');
                $walletAmount  = max(0, ($order->paid_amount ?? 0) - $totalPayments);

                $year          = date('Y', strtotime($order->updated_at ?? $order->created_at));
                $nextId        = (int) DB::table('invoices')->max('id') + 1;
                $invoiceNumber = 'INV-' . $year . '-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);

                $invoiceId = DB::table('invoices')->insertGetId([
                    'order_id'       => $order->id,
                    'branch_id'      => $order->branch_id,
                    'customer_id'    => $order->customer_id,
                    'invoice_number' => $invoiceNumber,
                    'subtotal'       => $subtotal,
                    'discount'       => $discount,
                    'tax_rate'       => 0,
                    'tax_amount'     => 0,
                    'total'          => $total,
                    'paid_amount'    => $totalPayments,
                    'wallet_amount'  => $walletAmount,
                    'status'         => $invoiceStatus,
                    'notes'          => $order->notes,
                    'private_notes'  => $order->private_notes,
                    'issued_at'      => $order->updated_at,
                    'voided_at'      => null,
                    'created_at'     => $order->created_at,
                    'updated_at'     => $order->updated_at,
                ]);

                foreach ($orderPayments as $op) {
                    DB::table('payment_entries')->insert([
                        'invoice_id'        => $invoiceId,
                        'payment_method_id' => $op->payment_method_id,
                        'type'              => 'payment',
                        'amount'            => $op->amount,
                        'reference_number'  => null,
                        'notes'             => null,
                        'processed_by'      => null,
                        'metadata'          => null,
                        'created_at'        => $op->created_at,
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        DB::table('payment_entries')->truncate();
        DB::table('invoices')->truncate();
    }
};
