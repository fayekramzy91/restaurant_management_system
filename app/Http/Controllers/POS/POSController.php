<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use App\Models\Order;
use App\Models\Table;
use App\Models\Area;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Customer;
use App\Models\PaymentMethod;
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
        $activeOrder = $table->orders()->where('status', '!=', 'completed')->latest()->first();

        return Inertia::render('POS/OrderManage', [
            'table'       => $table->load('area'),
            'activeOrder' => $activeOrder
                ? $activeOrder->load('items.menuItem', 'items.addons.menuItem')
                : null,
            'categories' => Category::with(['menuItems' => function ($query) {
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
            'order'           => $order->load(['items.menuItem', 'items.addons.menuItem', 'table', 'customer', 'payments.paymentMethod']),
            'payment_methods' => PaymentMethod::where('is_active', true)->get(),
        ]);
    }



    public function processPayment(Request $request, Order $order)
    {
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

        $discount          = $validated['discount'] ?? 0;
        $totalWithDiscount = max(0, $order->total_amount - $discount);
        $totalPaid         = 0;

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

        // ── Regular payments ───────────────────────────────────────────
        $order->payments()->delete();

        if (!empty($validated['payments'])) {
            foreach ($validated['payments'] as $payment) {
                if ($payment['amount'] > 0) {
                    $order->payments()->create([
                        'payment_method_id' => $payment['payment_method_id'],
                        'amount'            => $payment['amount'],
                    ]);
                    $totalPaid  += $payment['amount'];
                    $methodName  = PaymentMethod::find($payment['payment_method_id'])?->name ?? '—';
                    $order->logEvent('payment_processed',
                        "تم استلام {$payment['amount']} عبر {$methodName}",
                        ['method' => $methodName, 'amount' => $payment['amount']]
                    );
                }
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
        $effectivePaid = $totalPaid + $walletUsed;
        $surplus       = max(0, $effectivePaid - $totalWithDiscount);

        if ($surplus > 0 && $customer && ($validated['credit_surplus'] ?? false)) {
            $customer->increment('wallet_balance', $surplus);
            $order->logEvent('wallet_credited',
                "تمت إضافة {$surplus} لمحفظة {$customer->name}",
                ['amount' => $surplus, 'customer' => $customer->name]
            );
        }

        // ── Payment status ─────────────────────────────────────────────
        $paymentStatus = 'unpaid';
        if ($effectivePaid >= $totalWithDiscount && $totalWithDiscount > 0) {
            $paymentStatus = 'paid';
        } elseif ($effectivePaid > 0) {
            $paymentStatus = 'partially_paid';
        }

        $order->update([
            'status'         => 'completed',
            'payment_status' => $paymentStatus,
            'paid_amount'    => $effectivePaid,
            'discount'       => $discount,
            'notes'          => $validated['notes'] ?? $order->notes,
            'private_notes'  => $validated['private_notes'] ?? $order->private_notes,
        ]);

        $order->logEvent('order_completed',
            'تم إغلاق الطلب',
            ['payment_status' => $paymentStatus, 'total_paid' => $effectivePaid]
        );

        if ($order->table_id) {
            Table::find($order->table_id)->update(['status' => 'available']);
        }

        return redirect()->route('pos.index')->with('success', 'payment_processed');
    }
}
