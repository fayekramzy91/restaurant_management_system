<?php

namespace App\Observers;

use App\Models\MenuItem;
use App\Services\Audit\AuditLogger;

class MenuItemObserver
{
    public function created(MenuItem $menuItem): void
    {
        app(AuditLogger::class)->log(
            'menu_item.created',
            $menuItem,
            [],
            [
                'name'      => $menuItem->name,
                'price'     => $menuItem->price,
                'is_active' => $menuItem->is_active,
            ],
            "إضافة صنف جديد: {$menuItem->name}",
        );
    }

    public function updated(MenuItem $menuItem): void
    {
        $changed = array_intersect_key(
            $menuItem->getDirty(),
            array_flip(['name', 'price', 'is_active', 'is_addon', 'is_tax_exempt']),
        );

        if (empty($changed)) {
            return;
        }

        app(AuditLogger::class)->log(
            'menu_item.updated',
            $menuItem,
            array_intersect_key($menuItem->getOriginal(), $changed),
            $changed,
            "تعديل صنف: {$menuItem->name}",
        );
    }

    public function deleted(MenuItem $menuItem): void
    {
        app(AuditLogger::class)->log(
            'menu_item.deleted',
            $menuItem,
            ['name' => $menuItem->name, 'price' => $menuItem->price],
            [],
            "حذف صنف: {$menuItem->name}",
        );
    }

    public function restored(MenuItem $menuItem): void
    {
        app(AuditLogger::class)->log(
            'menu_item.restored',
            $menuItem,
            [],
            ['name' => $menuItem->name],
            "استعادة صنف: {$menuItem->name}",
        );
    }
}
