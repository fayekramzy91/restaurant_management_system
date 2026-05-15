<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['order', 'customer', 'branch'])
            ->withCount('paymentEntries');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($branch = $request->get('branch_id')) {
            $query->where('branch_id', $branch);
        }

        if ($from = $request->get('date_from')) {
            $query->whereDate('issued_at', '>=', $from);
        }

        if ($to = $request->get('date_to')) {
            $query->whereDate('issued_at', '<=', $to);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            });
        }

        $allowed = ['invoice_number', 'order_id', 'total', 'paid_amount', 'status', 'issued_at'];
        $sortBy  = in_array($request->get('sort_by'), $allowed) ? $request->get('sort_by') : 'issued_at';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortBy, $sortDir);

        return Inertia::render('Admin/Invoices/Index', [
            'invoices'        => $query->paginate(20)->withQueryString(),
            'filters'         => $request->only(['search', 'status', 'branch_id', 'date_from', 'date_to', 'sort_by', 'sort_dir']),
            'payment_methods' => PaymentMethod::where('is_active', true)->get(),
        ]);
    }

    public function show(Invoice $invoice)
    {
        $invoice->load([
            'items.addons',
            'order.items.menuItem',
            'order.items.addons.menuItem',
            'order.table.area',
            'order.user',
            'order.timeline.user',
            'customer',
            'branch',
            'paymentEntries.paymentMethod',
            'paymentEntries.processedBy',
        ]);

        return Inertia::render('Admin/Invoices/Show', [
            'invoice'         => $invoice,
            'payment_methods' => PaymentMethod::where('is_active', true)->get(),
        ]);
    }

    public function refund(Request $request, Invoice $invoice)
    {
        abort_if($invoice->status === 'void', 403, 'لا يمكن استرداد فاتورة ملغاة');

        $maxRefund = $invoice->netPaid();

        $validated = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount'            => "required|numeric|min:0.01|max:{$maxRefund}",
            'reference_number'  => 'nullable|string|max:100',
            'notes'             => 'nullable|string|max:500',
            'refund_to_wallet'  => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($invoice, $validated) {
            $invoice->paymentEntries()->create([
                'payment_method_id' => $validated['payment_method_id'],
                'type'              => 'refund',
                'amount'            => $validated['amount'],
                'reference_number'  => $validated['reference_number'] ?? null,
                'notes'             => $validated['notes'] ?? null,
                'processed_by'      => auth()->id(),
                'metadata'          => ['refund_to_wallet' => $validated['refund_to_wallet'] ?? false],
            ]);

            if (($validated['refund_to_wallet'] ?? false) && $invoice->customer) {
                $invoice->customer->increment('wallet_balance', $validated['amount']);
            }

            $noteText = !empty($validated['notes']) ? " — {$validated['notes']}" : '';
            $invoice->order->logEvent('refund_processed',
                "تم استرداد {$validated['amount']} للفاتورة {$invoice->invoice_number}{$noteText}",
                ['amount' => $validated['amount'], 'invoice_id' => $invoice->id, 'notes' => $validated['notes'] ?? null]
            );
        });

        return back()->with('success', 'refund_processed');
    }
}
