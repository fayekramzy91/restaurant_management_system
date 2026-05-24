<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\WalletTransaction;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::withCount('orders')
            ->withMax('orders', 'created_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($customer) {
                $revenue = Invoice::where('customer_id', $customer->id)
                    ->whereIn('status', ['paid', 'partial'])
                    ->sum('total');

                return array_merge($customer->toArray(), [
                    'total_revenue' => round((float) $revenue, 2),
                ]);
            });

        return Inertia::render('Admin/Customers/Index', [
            'customers' => $customers,
        ]);
    }

    /**
     * Wallet transaction history for a customer.
     * GET /admin/customers/{customer}/wallet
     */
    public function wallet(Customer $customer): \Inertia\Response
    {
        $transactions = $customer->walletTransactions()
            ->with('createdBy:id,name')
            ->latest('created_at')
            ->paginate(20)
            ->withQueryString();

        // Resolve reference labels for display
        $transactions->getCollection()->transform(function ($tx) {
            $tx->reference_label = null;
            if ($tx->reference_type === Invoice::class) {
                $invoice = Invoice::find($tx->reference_id);
                $tx->reference_label = $invoice?->invoice_number;
            }
            return $tx;
        });

        return Inertia::render('Admin/Customers/Wallet', [
            'customer'     => $customer->only([
                'id', 'name', 'phone', 'email',
                'wallet_balance', 'wallet_last_updated_at',
            ]),
            'transactions' => $transactions,
        ]);
    }

    /**
     * Manual wallet credit / debit adjustment.
     * POST /admin/customers/{customer}/wallet/adjust
     */
    public function walletAdjust(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'type'   => 'required|in:credit,debit',
            'amount' => 'required|numeric|min:0.01',
            'notes'  => 'required|string|max:500',
        ]);

        if ($validated['type'] === 'debit') {
            if ($customer->wallet_balance < $validated['amount']) {
                return back()->withErrors([
                    'amount' => 'الرصيد غير كافٍ. الرصيد الحالي: ' . $customer->wallet_balance,
                ]);
            }
        }

        $oldBalance = (float) $customer->wallet_balance;

        DB::transaction(function () use ($customer, $validated, $oldBalance) {
            if ($validated['type'] === 'credit') {
                $customer->increment('wallet_balance', $validated['amount']);
            } else {
                $customer->decrement('wallet_balance', $validated['amount']);
            }

            WalletTransaction::create([
                'customer_id'   => $customer->id,
                'type'          => $validated['type'],
                'amount'        => $validated['amount'],
                'balance_after' => $customer->fresh()->wallet_balance,
                'reason'        => 'manual_adjustment',
                'notes'         => $validated['notes'],
                'created_by'    => auth()->id(),
            ]);

            $customer->update(['wallet_last_updated_at' => now()]);

            app(AuditLogger::class)->log(
                'wallet.manual_adjustment',
                $customer,
                ['wallet_balance' => $oldBalance],
                [
                    'wallet_balance' => (float) $customer->fresh()->wallet_balance,
                    'type'           => $validated['type'],
                    'amount'         => $validated['amount'],
                ],
                "تعديل يدوي للمحفظة: {$customer->name}"
            );
        });

        return back()->with(
            'success',
            $validated['type'] === 'credit' ? 'تم إضافة الرصيد بنجاح' : 'تم خصم الرصيد بنجاح'
        );
    }
}
