<?php

namespace App\Observers;

use App\Models\User;
use App\Services\Audit\AuditLogger;

class UserObserver
{
    public function created(User $user): void
    {
        app(AuditLogger::class)->log(
            'user.created',
            $user,
            [],
            [
                'name'      => $user->name,
                'username'  => $user->username,
                'role_id'   => $user->role_id,
                'branch_id' => $user->branch_id,
            ],
            "إضافة مستخدم: {$user->name}",
        );
    }

    public function updated(User $user): void
    {
        $significant = ['role_id', 'is_active', 'branch_id'];

        $changed = array_intersect_key(
            $user->getDirty(),
            array_flip($significant),
        );

        if (empty($changed)) {
            return;
        }

        app(AuditLogger::class)->log(
            'user.updated',
            $user,
            array_intersect_key($user->getOriginal(), $changed),
            $changed,
            "تعديل مستخدم: {$user->name}",
        );
    }

    public function deleted(User $user): void
    {
        app(AuditLogger::class)->log(
            'user.deleted',
            $user,
            [
                'name'     => $user->name,
                'username' => $user->username,
                'role_id'  => $user->role_id,
            ],
            [],
            "حذف مستخدم: {$user->name}",
        );
    }
}
