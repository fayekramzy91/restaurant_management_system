<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderItemUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function makeUserWithPermission(string $permissionKey): User
    {
        $branch     = Branch::factory()->create();
        $role       = Role::create(['name' => 'tester', 'display_name' => 'Tester', 'is_system' => false]);
        $permission = Permission::create(['display_name' => 'Test Permission', 'key' => $permissionKey, 'group_name' => 'test']);
        $role->permissions()->attach($permission->id);

        return User::factory()->create([
            'role_id'   => $role->id,
            'branch_id' => $branch->id,
        ]);
    }

    public function test_updating_parent_quantity_recalculates_total_with_addon_quantities(): void
    {
        $user = $this->makeUserWithPermission('orders.update');

        // Build order: 1× Burger (50₪) + 2× Extra Cheese (5₪ each) = 60₪ total
        $order = Order::create([
            'branch_id'    => $user->branch_id,
            'user_id'      => $user->id,
            'type'         => 'takeaway',
            'status'       => 'pending',
            'total_amount' => 60,
        ]);

        $burger = MenuItem::factory()->create(['price' => 50, 'is_addon' => false]);
        $cheese = MenuItem::factory()->create(['price' => 5,  'is_addon' => true]);

        $item = $order->items()->create([
            'menu_item_id' => $burger->id,
            'name'         => $burger->name,
            'quantity'     => 1,
            'price'        => 50,
        ]);

        // addon quantity = 2 (absolute total, not per-parent-unit)
        $item->addons()->create([
            'menu_item_id' => $cheese->id,
            'name'         => $cheese->name,
            'price'        => 5,
            'quantity'     => 2,
        ]);

        // Update burger quantity 1 → 2
        // Addon quantities are ABSOLUTE totals (not per-parent-unit):
        //   item subtotal  = 2 × 50 = 100
        //   addon subtotal = 2 × 5  = 10   (unchanged — still 2 cheeses total)
        //   new total      = 100 + 10 = 110
        $response = $this->actingAs($user)->put(route('orders.update-item', [
            'order' => $order->id,
            'item'  => $item->id,
        ]), [
            'quantity' => 2,
        ]);

        $response->assertRedirect();
        $this->assertEquals(110, (float) $order->fresh()->total_amount);
    }
}
