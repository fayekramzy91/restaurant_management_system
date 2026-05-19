<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        $user = $request->user();

        app(AuditLogger::class)->log(
            'auth.login',
            $user,
            [],
            ['ip' => $request->ip()],
            "تسجيل دخول: {$user->username}",
        );

        $role = $user->role?->name;

        return match ($role) {
            'kitchen' => redirect()->route('kitchen.index'),
            'waiter'  => redirect()->route('pos.index'),
            'cashier' => redirect()->route('pos.index'),
            default   => redirect()->intended(route('admin.dashboard', absolute: false)),
        };
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = auth()->user();

        if ($user) {
            app(AuditLogger::class)->log(
                'auth.logout',
                $user,
                [],
                [],
                "تسجيل خروج: {$user->username}",
            );
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
