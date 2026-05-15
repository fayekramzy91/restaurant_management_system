<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolePermissionSeeder extends Seeder
{
    // ─── Permission definitions ───────────────────────────────────────────────

    private array $permissions = [
        'لوحة التحكم' => [
            ['key' => 'dashboard.view', 'display_name' => 'عرض لوحة التحكم'],
        ],
        'الطلبات' => [
            ['key' => 'orders.view',   'display_name' => 'عرض الطلبات'],
            ['key' => 'orders.create', 'display_name' => 'إنشاء الطلبات'],
            ['key' => 'orders.update', 'display_name' => 'تعديل الطلبات'],
            ['key' => 'orders.cancel', 'display_name' => 'إلغاء الطلبات'],
        ],
        'المدفوعات' => [
            ['key' => 'payments.process',  'display_name' => 'معالجة المدفوعات'],
            ['key' => 'payments.view',     'display_name' => 'عرض المدفوعات'],
            ['key' => 'invoices.refund',   'display_name' => 'إجراء الاستردادات'],
        ],
        'قائمة الطعام' => [
            ['key' => 'menu.view',   'display_name' => 'عرض قائمة الطعام'],
            ['key' => 'menu.create', 'display_name' => 'إضافة عناصر القائمة'],
            ['key' => 'menu.update', 'display_name' => 'تعديل عناصر القائمة'],
            ['key' => 'menu.delete', 'display_name' => 'حذف عناصر القائمة'],
        ],
        'العملاء' => [
            ['key' => 'customers.view',   'display_name' => 'عرض العملاء'],
            ['key' => 'customers.create', 'display_name' => 'إضافة العملاء'],
        ],
        'المطبخ' => [
            ['key' => 'kitchen.view',   'display_name' => 'عرض شاشة المطبخ'],
            ['key' => 'kitchen.update', 'display_name' => 'تحديث حالة الطلبات في المطبخ'],
        ],
        'التقارير' => [
            ['key' => 'reports.view', 'display_name' => 'عرض التقارير'],
        ],
        'الإدارة' => [
            ['key' => 'admin.branches',   'display_name' => 'إدارة الفروع'],
            ['key' => 'admin.areas',      'display_name' => 'إدارة القاعات'],
            ['key' => 'admin.tables',     'display_name' => 'إدارة الطاولات'],
            ['key' => 'admin.categories', 'display_name' => 'إدارة التصنيفات'],
            ['key' => 'admin.taxes',      'display_name' => 'إدارة الضرائب'],
            ['key' => 'admin.settings',   'display_name' => 'إدارة الإعدادات'],
            ['key' => 'admin.users',      'display_name' => 'إدارة المستخدمين'],
            ['key' => 'admin.roles',      'display_name' => 'إدارة الأدوار والصلاحيات'],
        ],
    ];

    // ─── Role definitions ─────────────────────────────────────────────────────

    private array $roles = [
        [
            'name'         => 'admin',
            'display_name' => 'مدير النظام',
            'description'  => 'صلاحيات كاملة على جميع أجزاء النظام',
            'is_system'    => true,
            'permissions'  => '*', // all
        ],
        [
            'name'         => 'cashier',
            'display_name' => 'كاشير',
            'description'  => 'إدارة الطلبات والمدفوعات وخدمة العملاء',
            'is_system'    => true,
            'permissions'  => [
                'dashboard.view',
                'orders.view', 'orders.create', 'orders.update', 'orders.cancel',
                'payments.process', 'payments.view', 'invoices.refund',
                'customers.view', 'customers.create',
                'menu.view',
            ],
        ],
        [
            'name'         => 'waiter',
            'display_name' => 'نادل',
            'description'  => 'تسجيل الطلبات وخدمة الطاولات',
            'is_system'    => true,
            'permissions'  => [
                'dashboard.view',
                'orders.view', 'orders.create', 'orders.update',
                'menu.view',
                'customers.view', 'customers.create',
            ],
        ],
        [
            'name'         => 'kitchen',
            'display_name' => 'موظف مطبخ',
            'description'  => 'متابعة الطلبات وتحديث حالة التحضير',
            'is_system'    => true,
            'permissions'  => [
                'kitchen.view', 'kitchen.update',
            ],
        ],
    ];

    // ─────────────────────────────────────────────────────────────────────────

    public function run(): void
    {
        // 1. Seed permissions
        $permissionMap = []; // key => Permission model

        foreach ($this->permissions as $group => $items) {
            foreach ($items as $item) {
                $permission = Permission::firstOrCreate(
                    ['key' => $item['key']],
                    ['display_name' => $item['display_name'], 'group_name' => $group]
                );
                $permissionMap[$item['key']] = $permission;
            }
        }

        // 2. Seed roles and sync permissions
        foreach ($this->roles as $roleDef) {
            $role = Role::firstOrCreate(
                ['name' => $roleDef['name']],
                [
                    'display_name' => $roleDef['display_name'],
                    'description'  => $roleDef['description'],
                    'is_system'    => $roleDef['is_system'],
                ]
            );

            if ($roleDef['permissions'] === '*') {
                $role->permissions()->sync(collect($permissionMap)->pluck('id'));
            } else {
                $ids = collect($roleDef['permissions'])
                    ->map(fn ($key) => $permissionMap[$key]->id)
                    ->all();
                $role->permissions()->sync($ids);
            }
        }

        // 3. Create default admin user
        $adminRole = Role::where('name', 'admin')->first();

        User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name'      => 'مدير النظام',
                'password'  => Hash::make('admin123'),
                'role_id'   => $adminRole->id,
                'is_active' => true,
            ]
        );
    }
}
