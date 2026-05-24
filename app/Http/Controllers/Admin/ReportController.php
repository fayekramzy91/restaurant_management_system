<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegisterSession;
use App\Models\Invoice;
use App\Models\InvoiceTax;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentEntry;
use App\Models\User;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $preset   = $request->get('preset', 'today');
        $dateFrom = $request->get('date_from');
        $dateTo   = $request->get('date_to');

        [$from, $to] = $this->resolveRange($preset, $dateFrom, $dateTo);

        $fromStart = $from->copy()->startOfDay();
        $toEnd     = $to->copy()->endOfDay();

        // Revenue = invoices.total for paid/partial invoices in the date window
        // (invoices.total reflects real billed amount: after tax + after discount)
        $completedOrders = Order::whereBetween('created_at', [$fromStart, $toEnd])
                               ->where('status', 'completed');

        $paidInvoices = Invoice::query()
            ->join('orders', 'invoices.order_id', '=', 'orders.id')
            ->whereBetween('invoices.issued_at', [$fromStart, $toEnd])
            ->whereIn('invoices.status', ['paid', 'partial']);

        $totalRevenue       = (float) (clone $paidInvoices)->sum('invoices.total');
        $totalTaxCollected  = (float) (clone $paidInvoices)->sum('invoices.tax_amount');
        $totalDiscount      = (float) (clone $paidInvoices)->sum('invoices.discount');

        $totalOrders    = Order::whereBetween('created_at', [$fromStart, $toEnd])->count();
        $completedCount = (clone $completedOrders)->count();
        $avgOrderValue  = $completedCount > 0 ? $totalRevenue / $completedCount : 0;
        $customersServed = Order::whereBetween('created_at', [$fromStart, $toEnd])->whereNotNull('customer_id')->distinct('customer_id')->count('customer_id');

        $revenueByDay = Invoice::query()
            ->join('orders', 'invoices.order_id', '=', 'orders.id')
            ->whereBetween('invoices.issued_at', [$fromStart, $toEnd])
            ->whereIn('invoices.status', ['paid', 'partial'])
            ->select(
                DB::raw('DATE(invoices.issued_at) as date'),
                DB::raw('SUM(invoices.total) as revenue'),
                DB::raw('SUM(invoices.tax_amount) as tax'),
                DB::raw('SUM(invoices.discount) as discount'),
                DB::raw('COUNT(*) as invoice_count')
            )
            ->groupBy(DB::raw('DATE(invoices.issued_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date'          => $r->date,
                'revenue'       => round((float) $r->revenue, 2),
                'tax'           => round((float) $r->tax, 2),
                'discount'      => round((float) $r->discount, 2),
                'invoice_count' => (int) $r->invoice_count,
            ]);

        $statusDistribution = Order::whereBetween('created_at', [$fromStart, $toEnd])
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn ($r) => ['status' => $r->status, 'count' => (int) $r->count]);

        $typeBreakdown = Order::whereBetween('created_at', [$fromStart, $toEnd])
            ->select('type', DB::raw('COUNT(*) as count'))
            ->groupBy('type')
            ->get()
            ->map(fn ($r) => ['type' => $r->type, 'count' => (int) $r->count]);

        $topItems = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->leftJoin('menu_items', 'order_items.menu_item_id', '=', 'menu_items.id')
            ->whereBetween('orders.created_at', [$fromStart, $toEnd])
            ->where('orders.status', 'completed')
            ->select(
                DB::raw("COALESCE(order_items.name, menu_items.name, '[صنف محذوف]') as name"),
                DB::raw('SUM(order_items.quantity) as qty_sold'),
                DB::raw('SUM(order_items.quantity * order_items.price) as item_revenue')
            )
            ->groupBy(DB::raw("COALESCE(order_items.name, menu_items.name, '[صنف محذوف]')"))
            ->orderByDesc('qty_sold')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'name'         => $r->name,
                'qty_sold'     => (int) $r->qty_sold,
                'item_revenue' => round((float) $r->item_revenue, 2),
            ]);

        $branchPerformance = Branch::query()
            ->withCount(['orders as order_count' => fn ($q) => $q->whereBetween('created_at', [$fromStart, $toEnd])])
            ->get()
            ->map(function ($branch) use ($fromStart, $toEnd) {
                $invoiceStats = Invoice::query()
                    ->join('orders', 'invoices.order_id', '=', 'orders.id')
                    ->where('invoices.branch_id', $branch->id)
                    ->whereBetween('invoices.issued_at', [$fromStart, $toEnd])
                    ->whereIn('invoices.status', ['paid', 'partial'])
                    ->selectRaw('
                        SUM(invoices.total) as revenue,
                        SUM(invoices.tax_amount) as tax,
                        SUM(invoices.discount) as discount,
                        COUNT(*) as invoice_count
                    ')
                    ->first();

                return [
                    'id'            => $branch->id,
                    'name'          => $branch->name,
                    'is_main'       => $branch->is_main,
                    'order_count'   => (int) ($branch->order_count ?? 0),
                    'invoice_count' => (int) ($invoiceStats->invoice_count ?? 0),
                    'revenue'       => round((float) ($invoiceStats->revenue ?? 0), 2),
                    'tax'           => round((float) ($invoiceStats->tax ?? 0), 2),
                    'discount'      => round((float) ($invoiceStats->discount ?? 0), 2),
                    'avg_value'     => ($invoiceStats->invoice_count ?? 0) > 0
                        ? round((float) $invoiceStats->revenue / $invoiceStats->invoice_count, 2)
                        : 0,
                ];
            });

        $paymentBreakdown = PaymentEntry::query()
            ->join('invoices', 'payment_entries.invoice_id', '=', 'invoices.id')
            ->join('payment_methods', 'payment_entries.payment_method_id', '=', 'payment_methods.id')
            ->whereBetween('invoices.issued_at', [$fromStart, $toEnd])
            ->where('payment_entries.type', 'payment')
            ->select(
                'payment_methods.name as method_name',
                'payment_methods.type as method_type',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(payment_entries.amount) as total_amount')
            )
            ->groupBy('payment_methods.id', 'payment_methods.name', 'payment_methods.type')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($r) => [
                'method_name'       => $r->method_name,
                'method_type'       => $r->method_type,
                'transaction_count' => (int) $r->transaction_count,
                'total_amount'      => round((float) $r->total_amount, 2),
            ]);

        return Inertia::render('Admin/Reports/Dashboard', [
            'filters'             => ['preset' => $preset, 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'kpi'                 => [
                'total_revenue'    => round((float) $totalRevenue, 2),
                'total_tax'        => round((float) $totalTaxCollected, 2),
                'total_discount'   => round((float) $totalDiscount, 2),
                'total_orders'     => $totalOrders,
                'completed_orders' => $completedCount,
                'avg_order_value'  => round($avgOrderValue, 2),
                'customers_served' => $customersServed,
            ],
            'revenue_by_day'      => $revenueByDay,
            'status_distribution' => $statusDistribution,
            'type_breakdown'      => $typeBreakdown,
            'top_items'           => $topItems,
            'branch_performance'  => $branchPerformance,
            'payment_breakdown'   => $paymentBreakdown,
        ]);
    }

    // ── Tax Report ────────────────────────────────────────────────────────────

    public function taxes(Request $request)
    {
        $preset   = $request->get('preset', 'today');
        $dateFrom = $request->get('date_from');
        $dateTo   = $request->get('date_to');

        [$from, $to] = $this->resolveRange($preset, $dateFrom, $dateTo);
        $fromStart   = $from->copy()->startOfDay();
        $toEnd       = $to->copy()->endOfDay();

        $taxReport = InvoiceTax::query()
            ->join('invoices', 'invoice_taxes.invoice_id', '=', 'invoices.id')
            ->join('orders', 'invoices.order_id', '=', 'orders.id')
            ->whereBetween('invoices.issued_at', [$fromStart, $toEnd])
            ->whereIn('invoices.status', ['paid', 'partial'])
            ->select(
                'invoice_taxes.tax_name',
                'invoice_taxes.tax_code',
                'invoice_taxes.rate',
                DB::raw('COUNT(DISTINCT invoices.id) as invoice_count'),
                DB::raw('SUM(invoice_taxes.taxable_amount) as total_taxable'),
                DB::raw('SUM(invoice_taxes.tax_amount) as total_tax')
            )
            ->groupBy('invoice_taxes.tax_name', 'invoice_taxes.tax_code', 'invoice_taxes.rate')
            ->orderByDesc('total_tax')
            ->get()
            ->map(fn ($r) => [
                'tax_name'      => $r->tax_name,
                'tax_code'      => $r->tax_code,
                'rate'          => (float) $r->rate,
                'invoice_count' => (int) $r->invoice_count,
                'total_taxable' => round((float) $r->total_taxable, 2),
                'total_tax'     => round((float) $r->total_tax, 2),
            ]);

        $taxByDay = InvoiceTax::query()
            ->join('invoices', 'invoice_taxes.invoice_id', '=', 'invoices.id')
            ->whereBetween('invoices.issued_at', [$fromStart, $toEnd])
            ->whereIn('invoices.status', ['paid', 'partial'])
            ->select(
                DB::raw('DATE(invoices.issued_at) as date'),
                'invoice_taxes.tax_name',
                DB::raw('SUM(invoice_taxes.tax_amount) as tax_amount')
            )
            ->groupBy(DB::raw('DATE(invoices.issued_at)'), 'invoice_taxes.tax_name')
            ->orderBy('date')
            ->get();

        return Inertia::render('Admin/Reports/TaxReport', [
            'filters'     => ['preset' => $preset, 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'tax_summary' => $taxReport,
            'tax_by_day'  => $taxByDay,
            'totals'      => [
                'total_taxable' => round($taxReport->sum('total_taxable'), 2),
                'total_tax'     => round($taxReport->sum('total_tax'), 2),
            ],
        ]);
    }

    // ── Shift Report ──────────────────────────────────────────────────────────

    public function shifts(Request $request)
    {
        $preset   = $request->get('preset', 'today');
        $dateFrom = $request->get('date_from');
        $dateTo   = $request->get('date_to');

        [$from, $to] = $this->resolveRange($preset, $dateFrom, $dateTo);
        $fromStart   = $from->copy()->startOfDay();
        $toEnd       = $to->copy()->endOfDay();

        $sessions = CashRegisterSession::query()
            ->with(['user:id,name', 'branch:id,name'])
            ->whereBetween('opened_at', [$fromStart, $toEnd])
            ->when($request->get('status'),  fn ($q, $s) => $q->where('status', $s))
            ->when($request->get('user_id'), fn ($q, $u) => $q->where('user_id', $u))
            ->orderByDesc('opened_at')
            ->get()
            ->map(function ($session) {
                $sales = PaymentEntry::query()
                    ->where('cash_register_session_id', $session->id)
                    ->where('type', 'payment')
                    ->sum('amount');

                $duration = $session->closed_at
                    ? $session->opened_at->diffInMinutes($session->closed_at)
                    : null;

                return [
                    'id'               => $session->id,
                    'user'             => $session->user?->name ?? '—',
                    'branch'           => $session->branch?->name ?? '—',
                    'opened_at'        => $session->opened_at,
                    'closed_at'        => $session->closed_at,
                    'duration_minutes' => $duration,
                    'opening_balance'  => (float) $session->opening_balance,
                    'expected_closing' => $session->expected_closing_balance !== null
                        ? (float) $session->expected_closing_balance : null,
                    'actual_closing'   => $session->actual_closing_balance !== null
                        ? (float) $session->actual_closing_balance : null,
                    'difference'       => $session->difference !== null
                        ? (float) $session->difference : null,
                    'cash_sales'       => round((float) $sales, 2),
                    'status'           => $session->status,
                ];
            });

        $shiftsKpi = [
            'total_sessions'         => $sessions->count(),
            'total_cash_sales'       => round($sessions->sum('cash_sales'), 2),
            'avg_difference'         => round($sessions->where('status', 'closed')->avg('difference') ?? 0, 2),
            'sessions_with_shortage' => $sessions->filter(fn ($s) => ($s['difference'] ?? 0) < 0)->count(),
        ];

        return Inertia::render('Admin/Reports/ShiftReport', [
            'filters'  => [
                'preset'    => $preset,
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
                'status'    => $request->get('status'),
                'user_id'   => $request->get('user_id'),
            ],
            'sessions' => $sessions,
            'kpi'      => $shiftsKpi,
            'users'    => User::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    // ── Wallet Report ─────────────────────────────────────────────────────────

    public function wallet(Request $request)
    {
        $preset   = $request->get('preset', 'today');
        $dateFrom = $request->get('date_from');
        $dateTo   = $request->get('date_to');

        [$from, $to] = $this->resolveRange($preset, $dateFrom, $dateTo);
        $fromStart   = $from->copy()->startOfDay();
        $toEnd       = $to->copy()->endOfDay();

        $walletStats = WalletTransaction::query()
            ->join('customers', 'wallet_transactions.customer_id', '=', 'customers.id')
            ->whereBetween('wallet_transactions.created_at', [$fromStart, $toEnd])
            ->select(
                DB::raw("SUM(CASE WHEN wallet_transactions.type = 'credit' THEN wallet_transactions.amount ELSE 0 END) as total_credited"),
                DB::raw("SUM(CASE WHEN wallet_transactions.type = 'debit'  THEN wallet_transactions.amount ELSE 0 END) as total_debited"),
                DB::raw('COUNT(DISTINCT wallet_transactions.customer_id) as customers_count'),
                DB::raw('COUNT(*) as transaction_count')
            )
            ->first();

        $topWalletCustomers = WalletTransaction::query()
            ->join('customers', 'wallet_transactions.customer_id', '=', 'customers.id')
            ->whereBetween('wallet_transactions.created_at', [$fromStart, $toEnd])
            ->select(
                'customers.id',
                'customers.name',
                'customers.phone',
                'customers.wallet_balance',
                DB::raw("SUM(CASE WHEN wallet_transactions.type = 'credit' THEN wallet_transactions.amount ELSE 0 END) as credited"),
                DB::raw("SUM(CASE WHEN wallet_transactions.type = 'debit'  THEN wallet_transactions.amount ELSE 0 END) as debited"),
                DB::raw('COUNT(*) as tx_count')
            )
            ->groupBy('customers.id', 'customers.name', 'customers.phone', 'customers.wallet_balance')
            ->orderByDesc('debited')
            ->limit(20)
            ->get();

        $transactionsByDay = WalletTransaction::query()
            ->whereBetween('created_at', [$fromStart, $toEnd])
            ->select(
                DB::raw('DATE(created_at) as date'),
                'type',
                DB::raw('SUM(amount) as total'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy(DB::raw('DATE(created_at)'), 'type')
            ->orderBy('date')
            ->get();

        return Inertia::render('Admin/Reports/WalletReport', [
            'filters'             => ['preset' => $preset, 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'stats'               => $walletStats,
            'top_customers'       => $topWalletCustomers,
            'transactions_by_day' => $transactionsByDay,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function resolveRange(string $preset, ?string $dateFrom, ?string $dateTo): array
    {
        return match ($preset) {
            'yesterday' => [Carbon::yesterday(), Carbon::yesterday()],
            'last_7'    => [Carbon::now()->subDays(6), Carbon::now()],
            'last_30'   => [Carbon::now()->subDays(29), Carbon::now()],
            'custom'    => [
                Carbon::parse($dateFrom ?? today()),
                Carbon::parse($dateTo ?? today()),
            ],
            default => [Carbon::today(), Carbon::today()],
        };
    }
}
