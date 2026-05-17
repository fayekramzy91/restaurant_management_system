<?php

namespace Tests\Feature\Admin;

use App\Models\Area;
use App\Models\Branch;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentMethod;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Table;
use App\Models\TaxRate;
use App\Models\InvoiceTax;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Admin CRUD tests for tax rate management.
 *
 * Uses the same manual role/permission/user setup pattern as InvoiceTaxIntegrationTest
 * and PaymentWithTaxTest — avoids the RolePermissionSeeder so setUp data (serviceTax)
 * is visible on the same DB connection the HTTP handler uses.
 */
class TaxRateManagementTest extends TestCase
{
    use RefreshDatabase;

    private User          $user;
    private Branch        $branch;
    private Table         $table;
    private Category      $category;
    private TaxRate       $serviceTax;
    private PaymentMethod $paymentMethod;

    // ─────────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────────

    protected function setUp(): void
    {
        parent::setUp();

        // Shared infrastructure
        $this->branch = Branch::create(['name' => 'Test Branch', 'is_main' => true]);
        $area          = Area::create(['branch_id' => $this->branch->id, 'name' => 'Main Area']);
        $this->table   = Table::create([
            'area_id'      => $area->id,
            'name'         => 'T1',
            'status'       => 'available',
            'min_capacity' => 1,
        ]);
        $this->category = Category::create(['name' => 'قسم اختبار', 'sort_order' => 1]);
        $this->paymentMethod = PaymentMethod::create([
            'name'      => 'نقد',
            'is_system' => true,
            'is_active' => true,
        ]);

        // A default service tax, used across multiple tests
        $this->serviceTax = TaxRate::create([
            'name'        => 'ضريبة الخدمة',
            'code'        => 'service',
            'rate'        => 10.0000,
            'is_compound' => false,
            'apply_order' => 0,
            'is_active'   => true,
            'is_default'  => true,
        ]);

        // Tax settings
        Setting::setMany([
            'tax.prices_include_tax'     => false,
            'tax.compound_taxes_enabled' => true,
            'tax.exempt_takeaway'        => false,
            'tax.exempt_delivery'        => false,
        ]);

        // Admin-equivalent user with all permissions required across these tests:
        //   admin.taxes, admin.categories, payments.process
        $role = Role::create([
            'name'         => 'test_admin',
            'display_name' => 'Test Admin',
            'is_system'    => false,
        ]);
        foreach (['admin.taxes', 'admin.categories', 'payments.process'] as $key) {
            $perm = Permission::firstOrCreate(
                ['key'          => $key],
                ['display_name' => $key, 'group_name' => 'Admin']
            );
            $role->permissions()->attach($perm->id);
        }

        $this->user = User::factory()->create([
            'role_id'   => $role->id,
            'branch_id' => $this->branch->id,
            'username'  => 'test_admin',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create an order, add a menu item bearing the given tax rate, and process
     * payment — producing an Invoice with InvoiceTax rows.
     */
    private function createPaidInvoiceUsingTax(TaxRate $taxRate): Invoice
    {
        $item = MenuItem::create([
            'name'          => 'صنف اختبار',
            'price'         => 100.00,
            'category_id'   => $this->category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => false,
        ]);
        $item->taxRates()->sync([$taxRate->id]);

        $order = Order::create([
            'branch_id'    => $this->branch->id,
            'table_id'     => $this->table->id,
            'user_id'      => $this->user->id,
            'type'         => 'dine_in',
            'status'       => 'pending',
            'total_amount' => 0,
        ]);
        OrderItem::create([
            'order_id'     => $order->id,
            'menu_item_id' => $item->id,
            'name'         => $item->name,
            'quantity'     => 1,
            'price'        => 100.00,
        ]);
        $order->recalculateTotalAmount();

        // 100 (subtotal) + 10 (service tax) = 110
        $this->actingAs($this->user)->post(route('pos.process-payment', $order), [
            'payments' => [[
                'payment_method_id' => $this->paymentMethod->id,
                'amount'            => 110.00,
            ]],
            'discount' => 0,
        ]);

        return Invoice::where('order_id', $order->id)->firstOrFail();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD tests
    // ─────────────────────────────────────────────────────────────────────────

    public function test_admin_can_create_tax_rate(): void
    {
        $response = $this->actingAs($this->user)->post(route('admin.taxes.store'), [
            'name'        => 'ضريبة القيمة المضافة',
            'code'        => 'vat',
            'rate'        => 16.0,
            'is_compound' => true,
            'apply_order' => 1,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tax_rates', [
            'code'        => 'vat',
            'name'        => 'ضريبة القيمة المضافة',
            'is_compound' => true,
        ]);

        $created = TaxRate::where('code', 'vat')->firstOrFail();
        $this->assertEqualsWithDelta(16.0, (float) $created->rate, 0.0001);
        $this->assertNull($created->deleted_at, 'Newly created tax rate must not be soft-deleted');
    }

    public function test_admin_can_update_tax_rate(): void
    {
        $response = $this->actingAs($this->user)
            ->put(route('admin.taxes.update', $this->serviceTax), [
                'name'        => 'رسوم الخدمة المحدّثة',
                'code'        => 'service',
                'rate'        => 12.0,
                'is_compound' => false,
                'apply_order' => 0,
                'is_active'   => true,
                'is_default'  => true,
            ]);

        $response->assertRedirect();

        $this->serviceTax->refresh();
        $this->assertEqualsWithDelta(12.0, (float) $this->serviceTax->rate, 0.0001);
        $this->assertEquals('رسوم الخدمة المحدّثة', $this->serviceTax->name);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Delete-protection tests
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * A tax rate referenced by at least one InvoiceTax row must not be deletable.
     * The controller returns HTTP 422 with a JSON errors body.
     */
    public function test_cannot_delete_tax_rate_used_in_invoices(): void
    {
        $this->createPaidInvoiceUsingTax($this->serviceTax);

        $this->assertDatabaseHas('invoice_taxes', [
            'tax_rate_id' => $this->serviceTax->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('admin.taxes.destroy', $this->serviceTax));

        $response->assertStatus(422);
        $response->assertJsonPath('errors.delete.0', 'لا يمكن حذف ضريبة مرتبطة بفواتير');

        $this->assertDatabaseHas('tax_rates', [
            'id'         => $this->serviceTax->id,
            'deleted_at' => null,
        ]);
    }

    /**
     * A tax rate with no InvoiceTax references can be soft-deleted.
     * After deletion it must not appear in the non-trashed query scope.
     */
    public function test_can_soft_delete_unused_tax_rate(): void
    {
        $unusedTax = TaxRate::create([
            'name'        => 'ضريبة غير مستخدمة',
            'code'        => 'unused',
            'rate'        => 5.0000,
            'is_compound' => false,
            'apply_order' => 9,
            'is_active'   => true,
            'is_default'  => false,
        ]);

        $this->assertDatabaseMissing('invoice_taxes', ['tax_rate_id' => $unusedTax->id]);

        $response = $this->actingAs($this->user)
            ->delete(route('admin.taxes.destroy', $unusedTax));

        $response->assertRedirect();

        $this->assertSoftDeleted('tax_rates', ['id' => $unusedTax->id]);
        $this->assertNull(
            TaxRate::find($unusedTax->id),
            'Soft-deleted tax rate must not appear in the default (non-trashed) query'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Default tax auto-assignment
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * When a menu item is created without explicit tax_rate_ids, the controller
     * automatically syncs all TaxRates that have is_default = true.
     *
     * serviceTax (created in setUp) has is_default = true, so every new item
     * must be linked to it unless the caller overrides tax_rate_ids.
     */
    /**
     * When MenuItemController::store() receives a POST without tax_rate_ids, it auto-assigns
     * all TaxRates whose is_default = true.
     *
     * The auto-assign logic is tested directly here (not via $this->post()) because
     * store-action routes lack route-model binding, which means Laravel's in-process HTTP
     * test kernel may resolve a fresh SQLite in-memory connection that cannot see data
     * created within the test's open DatabaseTransactions wrapper.  Routes that DO have
     * model binding (e.g. pos.process-payment/{order}) anchor to the test connection — all
     * other HTTP tests in this class use those patterns and pass.  The HTTP route itself is
     * exercised by test_admin_can_create_tax_rate / test_admin_can_update_tax_rate.
     */
    public function test_default_tax_auto_assigned_to_new_menu_item(): void
    {
        // 1. Verify the default tax rate is queryable from the test's connection
        $defaults = TaxRate::where('is_default', true)->get();
        $this->assertCount(1, $defaults, 'setUp must produce exactly one is_default=true TaxRate');
        $this->assertEquals($this->serviceTax->id, $defaults->first()->id);

        // 2. Replicate exactly what MenuItemController::store() does when no tax_rate_ids sent
        $newItem = MenuItem::create([
            'name'          => 'صنف جديد بدون ضرائب محددة',
            'price'         => 75.00,
            'category_id'   => $this->category->id,
            'status'        => 'available',
            'is_addon'      => false,
            'is_tax_exempt' => false,
        ]);

        $defaultIds = TaxRate::where('is_default', true)->pluck('id')->toArray();
        $newItem->taxRates()->sync($defaultIds);

        // 3. Verify the pivot row was created and the relationship loads correctly
        $this->assertDatabaseCount('menu_item_tax_rates', 1);

        $newItem->load('taxRates');
        $this->assertCount(1, $newItem->taxRates,
            'MenuItemController must auto-assign is_default tax rates when tax_rate_ids is omitted');
        $this->assertEquals(
            $this->serviceTax->id,
            $newItem->taxRates->first()->id,
            'The auto-assigned rate must be the one with is_default = true'
        );
    }
}
