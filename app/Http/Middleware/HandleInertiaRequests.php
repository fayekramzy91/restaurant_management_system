<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        if ($user) {
            $user->load('role.permissions', 'branch');
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'          => $user->id,
                    'name'        => $user->name,
                    'username'    => $user->username,
                    'email'       => $user->email,
                    'is_active'   => $user->is_active,
                    'role'        => $user->role ? [
                        'name'         => $user->role->name,
                        'display_name' => $user->role->display_name,
                    ] : null,
                    'branch'      => $user->branch ? [
                        'id'   => $user->branch->id,
                        'name' => $user->branch->name,
                    ] : null,
                    'permissions' => $user->role
                        ? $user->role->permissions->pluck('key')->all()
                        : [],
                ] : null,
            ],
            'settings' => Setting::all()->pluck('value', 'key'),
        ];
    }
}
