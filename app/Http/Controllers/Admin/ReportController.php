<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
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

        // Revenue = sum of total_amount for completed orders in the date window
        $completedOrders = Order::whereBetween('created_at', [$fromStart, $toEnd])
                               ->where('status', 'completed');
        $totalRevenue    = (float) (clone $completedOrders)->sum('total_amount');

        $totalOrders     = Order::whereBetween('created_at', [$fromStart, $toEnd])->count();
        $completedCount  = (clone $completedOrders)->count();
        $avgOrderValue   = $completedCount > 0 ? $totalRevenue / $completedCount : 0;
        $customersServed = Order::whereBetween('created_at', [$fromStart, $toEnd])->whereNotNull('customer_id')->distinct('customer_id')->count('customer_id');

        $revenueByDay = Order::whereBetween('created_at', [$fromStart, $toEnd])
            ->where('status', 'completed')
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount) as revenue'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => ['date' => $r->date, 'revenue' => round((float) $r->revenue, 2)]);

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
            ->withSum(['orders as revenue' => fn ($q) => $q->whereBetween('created_at', [$fromStart, $toEnd])->where('status', 'completed')], 'total_amount')
            ->get()
            ->map(fn ($b) => [
                'id'          => $b->id,
                'name'        => $b->name,
                'is_main'     => $b->is_main,
                'order_count' => (int) ($b->order_count ?? 0),
                'revenue'     => round((float) ($b->revenue ?? 0), 2),
                'avg_value'   => ($b->order_count ?? 0) > 0
                    ? round((float) ($b->revenue ?? 0) / $b->order_count, 2)
                    : 0,
            ]);

        return Inertia::render('Admin/Reports/Dashboard', [
            'filters'             => ['preset' => $preset, 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'kpi'                 => [
                'total_revenue'    => round((float) $totalRevenue, 2),
                'total_orders'     => $totalOrders,
                'avg_order_value'  => round($avgOrderValue, 2),
                'customers_served' => $customersServed,
            ],
            'revenue_by_day'      => $revenueByDay,
            'status_distribution' => $statusDistribution,
            'type_breakdown'      => $typeBreakdown,
            'top_items'           => $topItems,
            'branch_performance'  => $branchPerformance,
        ]);
    }

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
