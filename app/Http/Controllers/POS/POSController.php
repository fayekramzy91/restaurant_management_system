<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

use App\Models\Area;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceTax;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Setting;
use App\Models\Table;
use App\Models\WalletTransaction;
use App\Services\InvoiceItemSnapshotter;
use App\Services\Tax\TaxCalculator;
use Inertia\Inertia;

class POSController extends Controller
{
    public function index()
    {
        return Inertia::render('POS/Index', [
            'areas' => Area::with(['tables' => function ($q) {
                $q->with(['orders' => function ($oq) {
                    $oq->where('status', '!=', 'completed');
                }]);
            }])->get(),
            'orders' => Order::with(['table', 'user'])
                ->where('status', '!=', 'completed')
                ->latest()
                ->get(),
        ]);
    }

    public function newTableOrder(Table $table)
    {
        $pendingOrder = $table->orders()->where('status', '!=', 'completed')->latest()->first();

        // Billing table: treat as empty so waiter can create a new order for new guests.
        // The billing order stays accessible via the orders queue.
        $isBilling    = $table->status === 'billing';
        $activeOrder  = $isBilling ? null : $pendingOrder;
        $billingOrder = $isBilling && $pendingOrder
            ? ['id' => $pendingOrder->id, 'total_amount' => $pendingOrder->total_amount]
            : null;

        return Inertia::render('POS/OrderManage', [
            'table'        => $table->load('area'),
            'activeOrder'  => $activeOrder
                ? $activeOrder->load('items.menuItem', 'items.addons.menuItem')
                : null,
            'billingOrder' => $billingOrder,
            'categories'   => Category::with(['menuItems' => function ($query) {
                $query->where('is_addon', false);
            }])->orderBy('sort_order')->get(),
            'addons' => MenuItem::where('is_addon', true)->where('status', 'available')->get(),
        ]);
    }

    public function manageOrder(Order $order)
    {
        return Inertia::render('POS/OrderManage', [
            'table'       => $order->table ? $order->table->load('area') : null,
            'activeOrder' => $order->load('items.menuItem', 'items.addons.menuItem'),
            'categories'  => Category::with(['menuItems' => function ($query) {
                $query->where('is_addon', false);
            }])->orderBy('sort_order')->get(),
            'addons' => MenuItem::where('is_addon', true)->where('status', 'available')->get(),
        ]);
    }

    public function createOrder(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:takeaway,delivery',
        ]);

        $order = Order::create([
            'branch_id'    => Auth::user()->branch_id ?? 1,
            'user_id'      => Auth::id(),
            'type'         => $validated['type'],
            'status'       => 'pending',
            'total_amount' => 0,
        ]);

        $typeLabels = ['takeaway' => 'خارجي', 'delivery' => 'توصيل'];
        $order->logEvent('order_created',
            'تم إنشاء ' . ($typeLabels[$validated['type']] ?? $validated['type']),
            ['type' => $validated['type']]
        );

        return redirect()->route('pos.order', $order);
    }

    public function checkout(Order $order)
    {
        return Inertia::render('POS/Checkout', [
            'order' => $order->load([
                'items.menuItem', 'items.addons.menuItem', 'table', 'customer',
                'invoice.paymentEntries.paymentMethod',
            ]),
            'payment_methods' => PaymentMethod::where('is_active', true)->get(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    public function processPayment(Request $request, Order $order)
    {
        // ── C1: Guard — block re-payment of a fully paid invoice ──────────
        $existingInvoice = Invoice::where('order_id', $order->id)->first();
        if ($existingInvoice && $existingInvoice->status === 'paid') {
            return back()->withErrors([
                'error' => 'هذا الطلب مدفوع بالفعل ولا يمكن معالجته مرة أخرى',
            ]);
        }

        $validated = $request->validate([
            'payments'                     => 'array',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount'            => 'required|numeric|min:0',
            'discount'                     => 'nullable|numeric|min:0',
            'wallet_amount'                => 'nullable|numeric|min:0',
            'credit_surplus'               => 'nullable|boolean',
            'customer_id'                  => 'nullable|exists:customers,id',
            'new_customer'                 => 'nullable|array',
            'new_customer.name'            => 'required_with:new_customer|string|max:255',
            'new_customer.phone'           => 'nullable|string|max:30',
            'new_customer.email'           => 'nullable|email|max:255',
            'new_customer.address'         => 'nullable|string|max:500',
            'notes'                        => 'nullable|string',
            'private_notes'                => 'nullable|string',
        ]);

        $discount          = (float) ($validated['discount'] ?? 0);
        $totalWithDiscount = max(0, $order->total_amount - $discount);
        $totalPaid         = 0;

        DB::transaction(function () use ($order, $validated, $discount, $totalWithDiscount, &$totalPaid) {
            // ── Resolve / create customer ──────────────────────────────────
            $customer = null;

            if (!empty($validated['new_customer']['name'])) {
                $customer = Customer::create($validated['new_customer']);
                $order->logEvent('customer_linked',
                    "تم ربط عميل جديد: {$customer->name}",
                    ['customer_id' => $customer->id, 'name' => $customer->name]
                );
            } elseif (!empty($validated['customer_id'])) {
                $customer = Customer::find($validated['customer_id']);
            }

            if ($customer) {
                $order->update(['customer_id' => $customer->id]);
            }

            // ── Wallet deduction ───────────────────────────────────────────
            $walletUsed = 0;
            if ($customer && ($validated['wallet_amount'] ?? 0) > 0) {
                $walletUsed = min($validated['wallet_amount'], $customer->wallet_balance);
                if ($walletUsed > 0) {
                    $customer->decrement('wallet_balance', $walletUsed);
                    $order->logEvent('wallet_used',
                        "تم استخدام {$walletUsed} من رصيد محفظة {$customer->name}",
                        ['amount' => $walletUsed, 'customer' => $customer->name]
                    );
                }
            }

            // ── C2: Capture whether invoice existed before this call ───────
            $invoiceAlreadyExisted = Invoice::where('order_id', $order->id)->exists();

            // ── Invoice: get-or-create (append on partial re-checkout) ─────
            $order->loadMissing('invoice');
            $invoice = $order->invoice;

            if (!$invoice) {
                // ── 1. Load items with tax configuration ───────────────────
                $order->load(['items.taxRates', 'items.menuItem', 'items.addons.taxRates']);

                // ── 2. Calculate taxes (pure, no DB writes) ────────────────
                $settings  = Setting::getAllAsArray();
                $taxResult = app(TaxCalculator::class)->calculateForCart(
                    $order->items,
                    $order->type,
                    $settings,
                );

                // ── 3. Effective total after tax and discount ──────────────
                $invoiceTotal = max(0.0, $taxResult->totalAfterTax - $discount);

                // ── 4. Create the invoice using tax-aware totals ───────────
                $invoice = Invoice::create([
                    'order_id'            => $order->id,
                    'branch_id'           => $order->branch_id,
                    'customer_id'         => $customer?->id ?? $order->customer_id,
                    'invoice_number'      => Invoice::generateNumber(),
                    'subtotal'            => $taxResult->subtotalBeforeTax,
                    'discount'            => $discount,
                    'tax_rate'            => 0,
                    'tax_amount'          => $taxResult->totalTax,
                    'total'               => $invoiceTotal,
                    'prices_included_tax' => $taxResult->pricesIncludedTax,
                    'tax_breakdown_json'  => $taxResult->toArray(),
                    'wallet_amount'       => 0,
                    'status'              => 'draft',
                    'notes'               => $validated['notes'] ?? $order->notes,
                    'private_notes'       => $validated['private_notes'] ?? $order->private_notes,
                    'issued_at'           => now(),
                ]);
                $order->logEvent('invoice_created',
                    "تم إنشاء الفاتورة {$invoice->invoice_number}",
                    ['invoice_id' => $invoice->id]
                );

                // ── 5. Snapshot items with tax breakdown data ──────────────
                app(InvoiceItemSnapshotter::class)->snapshot($invoice, $taxResult);

                // ── 6. Invoice-level tax summary rows ─────────────────────
                foreach ($taxResult->toInvoiceTaxesData() as $taxData) {
                    InvoiceTax::create(array_merge($taxData, ['invoice_id' => $invoice->id]));
                }

                if ($taxResult->totalTax > 0) {
                    $order->logEvent('invoice_tax_applied',
                        "تم احتساب ضريبة بقيمة {$taxResult->totalTax}",
                        [
                            'total_tax' => $taxResult->totalTax,
                            'breakdown' => $taxResult->invoiceTaxes->values()
                                ->map(fn ($t) => [
                                    'name'   => $t['tax_name'],
                                    'rate'   => $t['rate'],
                                    'amount' => $t['tax_amount'],
                                ])->toArray(),
                        ]
                    );
                }
            } else {
                // Re-checkout: update discount/total only (no tax recalculation)
                $invoice->update([
                    'discount'       => $discount,
                    'total'          => max(0, (float) $invoice->subtotal + (float) $invoice->tax_amount - $discount),
                    'notes'          => $validated['notes'] ?? $invoice->notes,
                    'private_notes'  => $validated['private_notes'] ?? $invoice->private_notes,
                    'customer_id'    => $customer?->id ?? $invoice->customer_id,
                ]);
            }

            // ── Increment checkout attempt counter ─────────────────────────
            $invoice->increment('checkout_attempts');

            // ── WalletTransaction debit (needs invoice_id as reference) ────
            if ($walletUsed > 0 && $customer) {
                WalletTransaction::create([
                    'customer_id'    => $customer->id,
                    'type'           => 'debit',
                    'amount'         => $walletUsed,
                    'balance_after'  => $customer->fresh()->wallet_balance,
                    'reason'         => 'payment_used',
                    'reference_type' => Invoice::class,
                    'reference_id'   => $invoice->id,
                    'created_by'     => Auth::id(),
                ]);
                $customer->update(['wallet_last_updated_at' => now()]);
            }

            // ── Payment entries (append — never delete) ────────────────────
            if (!empty($validated['payments'])) {
                foreach ($validated['payments'] as $payment) {
                    if ($payment['amount'] > 0) {
                        $invoice->paymentEntries()->create([
                            'payment_method_id' => $payment['payment_method_id'],
                            'type'              => 'payment',
                            'amount'            => $payment['amount'],
                            'processed_by'      => Auth::id(),
                        ]);
                        $totalPaid  += (float) $payment['amount'];
                        $methodName  = PaymentMethod::find($payment['payment_method_id'])?->name ?? '—';
                        $order->logEvent('payment_processed',
                            "تم استلام {$payment['amount']} عبر {$methodName}",
                            [
                                'method'            => $methodName,
                                'payment_method_id' => $payment['payment_method_id'],
                                'amount'            => $payment['amount'],
                                'invoice_id'        => $invoice->id,
                                'invoice_number'    => $invoice->invoice_number,
                            ]
                        );
                    }
                }
            }

            // ── Wallet amount on invoice ───────────────────────────────────
            // C2: Only increment on first checkout — prevents double-count on re-checkout.
            if ($walletUsed > 0 && ! $invoiceAlreadyExisted) {
                $invoice->increment('wallet_amount', $walletUsed);
                if ($totalPaid === 0) {
                    $invoice->refresh()->recalculatePaidAmount();
                }
            }

            // ── Discount log ───────────────────────────────────────────────
            if ($discount > 0) {
                $order->logEvent('discount_applied',
                    "تم تطبيق خصم بقيمة {$discount}",
                    ['discount' => $discount]
                );
            }

            // ── Surplus → wallet ───────────────────────────────────────────
            $invoiceTotal  = (float) $invoice->fresh()->total;
            $effectivePaid = $totalPaid + $walletUsed;
            $surplus       = max(0.0, $effectivePaid - $invoiceTotal);

            if ($surplus > 0 && $customer && ($validated['credit_surplus'] ?? false)) {
                $customer->increment('wallet_balance', $surplus);
                WalletTransaction::create([
                    'customer_id'    => $customer->id,
                    'type'           => 'credit',
                    'amount'         => $surplus,
                    'balance_after'  => $customer->fresh()->wallet_balance,
                    'reason'         => 'payment_surplus',
                    'reference_type' => Invoice::class,
                    'reference_id'   => $invoice->id,
                    'created_by'     => Auth::id(),
                ]);
                $customer->update(['wallet_last_updated_at' => now()]);
                $order->logEvent('wallet_credited',
                    "تمت إضافة {$surplus} لمحفظة {$customer->name}",
                    ['amount' => $surplus, 'customer' => $customer->name]
                );
            }

            // ── Update order (operational fields only — NOT financial) ─────
            $order->update([
                'status'        => 'completed',
                'notes'         => $validated['notes'] ?? $order->notes,
                'private_notes' => $validated['private_notes'] ?? $order->private_notes,
            ]);

            $invoice->refresh();
            $order->logEvent('order_completed',
                'تم إغلاق الطلب',
                [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'invoice_status' => $invoice->status,
                    'subtotal'       => $invoice->subtotal,
                    'tax_amount'     => $invoice->tax_amount,
                    'discount'       => $invoice->discount,
                    'total'          => $invoice->total,
                    'total_paid'     => $effectivePaid,
                    'wallet_used'    => $walletUsed,
                ]
            );

            if ($order->table_id) {
                Table::find($order->table_id)->update(['status' => 'available']);
            }
        });

        $invoiceNumber = $order->fresh()->invoice?->invoice_number;

        return redirect()->route('pos.index')->with([
            'success'        => 'payment_processed',
            'invoice_number' => $invoiceNumber,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Live tax preview for the Checkout screen — read-only, no DB writes.
     *
     * POST /pos/calculate-tax-preview
     * Body: { order_id: int, discount: float }
     * Returns JSON: { subtotal, tax_breakdown, total_tax, total }
     */
    public function calculateTaxPreview(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
            'discount' => 'nullable|numeric|min:0',
        ]);

        $order    = Order::with(['items.taxRates', 'items.menuItem'])->findOrFail($validated['order_id']);
        $discount = (float) ($validated['discount'] ?? 0);
        $settings = Setting::getAllAsArray();

        $taxResult = app(TaxCalculator::class)->calculateForCart(
            $order->items,
            $order->type,
            $settings,
        );

        $taxBreakdown = $taxResult->invoiceTaxes->values()->map(fn (array $t) => [
            'name'   => $t['tax_name'],
            'rate'   => $t['rate'],
            'amount' => $t['tax_amount'],
        ])->all();

        return response()->json([
            'subtotal'      => $taxResult->subtotalBeforeTax,
            'tax_breakdown' => $taxBreakdown,
            'total_tax'     => $taxResult->totalTax,
            'total'         => max(0.0, $taxResult->totalAfterTax - $discount),
        ]);
    }
}
