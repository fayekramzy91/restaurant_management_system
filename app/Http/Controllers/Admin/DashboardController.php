<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegisterSession;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today      = today();
        $todayStart = $today->copy()->startOfDay();
        $todayEnd   = $today->copy()->endOfDay();

        // ── Financial KPIs (from invoices — correct source) ──────────────────
        $todayInvoices = Invoice::whereBetween('issued_at', [$todayStart, $todayEnd])
            ->whereIn('status', ['paid', 'partial']);

        $todayRevenue      = (float) (clone $todayInvoices)->sum('total');
        $todayTax          = (float) (clone $todayInvoices)->sum('tax_amount');
        $todayDiscount     = (float) (clone $todayInvoices)->sum('discount');
        $todayInvoiceCount = (clone $todayInvoices)->count();

        // ── Order KPIs ────────────────────────────────────────────────────────
        $ordersToday    = Order::whereDate('created_at', $today)->count();
        $pendingOrders  = Order::whereIn('status', ['pending', 'preparing'])->count();
        $completedToday = Order::whereDate('created_at', $today)
            ->where('status', 'completed')->count();

        // ── Active shifts ─────────────────────────────────────────────────────
        $openShifts = CashRegisterSession::where('status', 'open')
            ->with('user:id,name', 'branch:id,name')
            ->get()
            ->map(fn ($s) => [
                'id'               => $s->id,
                'user'             => $s->user->name,
                'branch'           => $s->branch->name,
                'opened_at'        => $s->opened_at,
                'duration_minutes' => now()->diffInMinutes($s->opened_at),
            ]);

        // ── Recent active orders (last 10) ────────────────────────────────────
        $activeOrders = Order::with([
                'table:id,name',
                'branch:id,name',
            ])
            ->whereIn('status', ['pending', 'preparing', 'ready'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($o) => [
                'id'          => $o->id,
                'type'        => $o->type,
                'status'      => $o->status,
                'table'       => $o->table?->name,
                'branch'      => $o->branch?->name,
                'total'       => $o->total_amount,
                'created_at'  => $o->created_at,
                'age_minutes' => now()->diffInMinutes($o->created_at),
            ]);

        // ── Hourly revenue today (for sparkline) ──────────────────────────────
        $hourlyRevenue = Invoice::whereBetween('issued_at', [$todayStart, $todayEnd])
            ->whereIn('status', ['paid', 'partial'])
            ->selectRaw('HOUR(issued_at) as hour, SUM(total) as revenue')
            ->groupBy(DB::raw('HOUR(issued_at)'))
            ->orderBy('hour')
            ->get()
            ->map(fn ($r) => [
                'hour'    => (int) $r->hour,
                'revenue' => round((float) $r->revenue, 2),
            ]);

        // ── Alerts ────────────────────────────────────────────────────────────
        $alerts = [];

        $shortageShifts = CashRegisterSession::where('status', 'closed')
            ->whereDate('closed_at', $today)
            ->where('difference', '<', 0)
            ->count();
        if ($shortageShifts > 0) {
            $alerts[] = [
                'type'    => 'warning',
                'message' => "يوجد {$shortageShifts} وردية بعجز اليوم",
                'href'    => route('admin.reports.shifts'),
            ];
        }

        $stalledOrders = Order::where('status', 'pending')
            ->where('created_at', '<', now()->subMinutes(30))
            ->count();
        if ($stalledOrders > 0) {
            $alerts[] = [
                'type'    => 'danger',
                'message' => "{$stalledOrders} طلب في انتظار التحضير لأكثر من 30 دقيقة",
                'href'    => route('admin.orders.index'),
            ];
        }

        // ── Misc counts ───────────────────────────────────────────────────────
        $availableItems = MenuItem::where('status', 'available')->where('is_addon', false)->count();
        $customersCount = Customer::count();
        $branchesCount  = Branch::count();

        return Inertia::render('Admin/Dashboard', [
            'kpi' => [
                'today_revenue'   => round($todayRevenue, 2),
                'today_tax'       => round($todayTax, 2),
                'today_discount'  => round($todayDiscount, 2),
                'orders_today'    => $ordersToday,
                'completed_today' => $completedToday,
                'pending_orders'  => $pendingOrders,
                'available_items' => $availableItems,
                'customers'       => $customersCount,
                'branches'        => $branchesCount,
            ],
            'active_orders'  => $activeOrders,
            'open_shifts'    => $openShifts,
            'hourly_revenue' => $hourlyRevenue,
            'alerts'         => $alerts,
        ]);
    }
}
