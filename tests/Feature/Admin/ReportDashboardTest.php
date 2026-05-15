<?php

namespace Tests\Feature\Admin;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;
use Tests\Traits\ActsAsRole;

class ReportDashboardTest extends TestCase
{
    use RefreshDatabase, ActsAsRole;

    // ── Access control ────────────────────────────────────────────────────────

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('admin.reports.dashboard'))
            ->assertRedirect(route('login'));
    }

    public function test_kitchen_user_is_forbidden(): void
    {
        $this->actAsKitchen();

        $this->get(route('admin.reports.dashboard'))
            ->assertForbidden();
    }

    public function test_waiter_is_forbidden(): void
    {
        $this->actAsWaiter();

        $this->get(route('admin.reports.dashboard'))
            ->assertForbidden();
    }

    public function test_cashier_is_forbidden(): void
    {
        // Cashier role does not include reports.view permission
        $this->actAsCashier();

        $this->get(route('admin.reports.dashboard'))
            ->assertForbidden();
    }

    public function test_admin_can_access_report_dashboard(): void
    {
        $this->actAsAdmin();

        $this->get(route('admin.reports.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Reports/Dashboard')
                ->has('kpi.total_revenue')
                ->has('kpi.total_orders')
                ->has('kpi.avg_order_value')
                ->has('kpi.customers_served')
                ->has('revenue_by_day')
                ->has('status_distribution')
                ->has('type_breakdown')
                ->has('top_items')
                ->has('branch_performance')
                ->has('filters')
            );
    }

    // ── KPI accuracy ──────────────────────────────────────────────────────────

    public function test_revenue_sums_only_completed_orders(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'completed',
            'total_amount' => 100,
        ]);

        // Pending — must NOT count in revenue
        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'pending',
            'total_amount' => 50,
        ]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.total_revenue', 100)
                ->where('kpi.total_orders', 2)
            );
    }

    public function test_avg_order_value_is_based_on_completed_orders(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'completed', 'total_amount' => 100]);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'completed', 'total_amount' => 200]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.avg_order_value', 150)
            );
    }

    public function test_avg_order_value_is_zero_when_no_completed_orders(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'pending', 'total_amount' => 100]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.avg_order_value', 0)
            );
    }

    public function test_customers_served_counts_distinct_registered_customers(): void
    {
        $user     = $this->actAsAdmin();
        $branch   = Branch::factory()->create();
        $customer = Customer::factory()->create();

        // Same customer, two orders — counts as 1
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'customer_id' => $customer->id]);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'customer_id' => $customer->id]);

        // Walk-in with no customer — must NOT count
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'customer_id' => null]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.customers_served', 1)
            );
    }

    // ── Date range filtering ──────────────────────────────────────────────────

    public function test_default_filter_scopes_to_today(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        // Yesterday — must NOT appear in default (today) view
        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'completed',
            'total_amount' => 999,
            'created_at'   => now()->subDay(),
        ]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.total_revenue', 0)
                ->where('kpi.total_orders', 0)
            );
    }

    public function test_preset_yesterday_scopes_correctly(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'completed',
            'total_amount' => 80,
            'created_at'   => now()->subDay(),
        ]);

        $this->get(route('admin.reports.dashboard', ['preset' => 'yesterday']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.total_revenue', 80)
                ->where('kpi.total_orders', 1)
            );
    }

    public function test_preset_last_7_includes_orders_within_past_week(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'completed',
            'total_amount' => 150,
            'created_at'   => now()->subDays(5),
        ]);

        // 8 days ago — outside last_7 window
        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'completed',
            'total_amount' => 999,
            'created_at'   => now()->subDays(8),
        ]);

        $this->get(route('admin.reports.dashboard', ['preset' => 'last_7']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.total_revenue', 150)
                ->where('kpi.total_orders', 1)
            );
    }

    public function test_custom_date_range_includes_only_matching_orders(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'completed',
            'total_amount' => 75,
            'created_at'   => '2026-04-10 12:00:00',
        ]);

        // Outside the custom range
        Order::factory()->create([
            'branch_id'    => $branch->id,
            'user_id'      => $user->id,
            'status'       => 'completed',
            'total_amount' => 999,
            'created_at'   => '2026-04-20 12:00:00',
        ]);

        $this->get(route('admin.reports.dashboard', [
            'preset'    => 'custom',
            'date_from' => '2026-04-08',
            'date_to'   => '2026-04-12',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('kpi.total_revenue', 75)
            ->where('kpi.total_orders', 1)
        );
    }

    public function test_filters_are_echoed_back_to_frontend(): void
    {
        $this->actAsAdmin();

        $this->get(route('admin.reports.dashboard', ['preset' => 'last_30']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.preset', 'last_30')
            );
    }

    // ── Chart data ────────────────────────────────────────────────────────────

    public function test_revenue_by_day_groups_completed_orders_by_date(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'completed', 'total_amount' => 50]);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'completed', 'total_amount' => 30]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('revenue_by_day', 1)  // both on same day → one entry
                ->has('revenue_by_day.0', fn (Assert $entry) => $entry
                    ->has('date')
                    ->where('revenue', 80)
                )
            );
    }

    public function test_status_distribution_groups_all_statuses(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'completed']);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'pending']);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'cancelled']);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('status_distribution', 3)
            );
    }

    public function test_type_breakdown_groups_all_types(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'type' => 'dine_in']);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'type' => 'takeaway']);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'type' => 'delivery']);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('type_breakdown', 3)
            );
    }

    // ── Top items table ───────────────────────────────────────────────────────

    public function test_top_items_sums_quantity_and_revenue(): void
    {
        $user     = $this->actAsAdmin();
        $branch   = Branch::factory()->create();
        $category = Category::factory()->create();
        $item     = MenuItem::factory()->create(['category_id' => $category->id]);

        $order = Order::factory()->create([
            'branch_id' => $branch->id,
            'user_id'   => $user->id,
            'status'    => 'completed',
        ]);

        OrderItem::factory()->create([
            'order_id'     => $order->id,
            'menu_item_id' => $item->id,
            'quantity'     => 4,
            'price'        => 25,
        ]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('top_items', 1, fn (Assert $row) => $row
                    ->where('name', $item->name)
                    ->where('qty_sold', 4)
                    ->where('item_revenue', 100)
                )
            );
    }

    public function test_top_items_excludes_non_completed_orders(): void
    {
        $user     = $this->actAsAdmin();
        $branch   = Branch::factory()->create();
        $category = Category::factory()->create();
        $item     = MenuItem::factory()->create(['category_id' => $category->id]);

        $order = Order::factory()->create([
            'branch_id' => $branch->id,
            'user_id'   => $user->id,
            'status'    => 'pending',
        ]);

        OrderItem::factory()->create([
            'order_id'     => $order->id,
            'menu_item_id' => $item->id,
            'quantity'     => 5,
            'price'        => 10,
        ]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('top_items', 0)
            );
    }

    // ── Branch performance ────────────────────────────────────────────────────

    public function test_branch_performance_lists_all_branches(): void
    {
        $this->actAsAdmin();
        Branch::factory()->count(3)->create();

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('branch_performance', 3)
            );
    }

    public function test_branch_performance_shows_correct_revenue_per_branch(): void
    {
        $user   = $this->actAsAdmin();
        $branch = Branch::factory()->create();

        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'completed', 'total_amount' => 200]);
        Order::factory()->create(['branch_id' => $branch->id, 'user_id' => $user->id, 'status' => 'completed', 'total_amount' => 100]);

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('branch_performance', 1, fn (Assert $row) => $row
                    ->where('id', $branch->id)
                    ->where('order_count', 2)
                    ->where('revenue', 300)
                    ->where('avg_value', 150)
                    ->has('name')
                    ->has('is_main')
                )
            );
    }

    // ── Empty state ───────────────────────────────────────────────────────────

    public function test_all_kpis_are_zero_when_no_orders_exist(): void
    {
        $this->actAsAdmin();

        $this->get(route('admin.reports.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('kpi.total_revenue', 0)
                ->where('kpi.total_orders', 0)
                ->where('kpi.avg_order_value', 0)
                ->where('kpi.customers_served', 0)
                ->has('revenue_by_day', 0)
                ->has('status_distribution', 0)
                ->has('type_breakdown', 0)
                ->has('top_items', 0)
            );
    }
}
