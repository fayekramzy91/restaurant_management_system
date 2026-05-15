<?php

namespace Tests\Traits;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

trait ActsAsRole
{
    protected function seedRbac(): void
    {
        $this->seed(RolePermissionSeeder::class);
    }

    protected function actAsAdmin(): User
    {
        $this->seedRbac();
        $user = User::factory()->create([
            'role_id'   => Role::where('name', 'admin')->value('id'),
            'is_active' => true,
        ]);
        $this->actingAs($user);
        return $user;
    }

    protected function actAsCashier(): User
    {
        $this->seedRbac();
        $user = User::factory()->create([
            'role_id'   => Role::where('name', 'cashier')->value('id'),
            'is_active' => true,
        ]);
        $this->actingAs($user);
        return $user;
    }

    protected function actAsWaiter(): User
    {
        $this->seedRbac();
        $user = User::factory()->create([
            'role_id'   => Role::where('name', 'waiter')->value('id'),
            'is_active' => true,
        ]);
        $this->actingAs($user);
        return $user;
    }

    protected function actAsKitchen(): User
    {
        $this->seedRbac();
        $user = User::factory()->create([
            'role_id'   => Role::where('name', 'kitchen')->value('id'),
            'is_active' => true,
        ]);
        $this->actingAs($user);
        return $user;
    }
}
