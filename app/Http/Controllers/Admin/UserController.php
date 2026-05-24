<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Users/Index', [
            'users' => User::with(['role', 'branch'])->latest()->get()->map(fn ($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'username'   => $u->username,
                'is_active'  => $u->is_active,
                'last_login' => $u->last_login?->diffForHumans(),
                'role'       => $u->role
                    ? ['id' => $u->role->id, 'name' => $u->role->name, 'display_name' => $u->role->display_name]
                    : null,
                'branch'     => $u->branch
                    ? ['id' => $u->branch->id, 'name' => $u->branch->name]
                    : null,
            ]),
            'roles'    => Role::all(['id', 'name', 'display_name']),
            'branches' => Branch::all(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $isAdmin = Role::find($request->role_id)?->name === 'admin';

        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'username'  => 'required|string|max:50|unique:users,username',
            'password'  => 'required|string|min:6',
            'role_id'   => 'required|exists:roles,id',
            'branch_id' => $isAdmin ? 'nullable|exists:branches,id' : 'required|exists:branches,id',
            'is_active' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        if ($isAdmin) {
            $validated['branch_id'] = null;
        }

        User::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة المستخدم بنجاح.');
    }

    public function update(Request $request, User $user)
    {
        $isAdmin = Role::find($request->role_id)?->name === 'admin';

        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'username'  => 'required|string|max:50|unique:users,username,' . $user->id,
            'role_id'   => 'required|exists:roles,id',
            'branch_id' => $isAdmin ? 'nullable|exists:branches,id' : 'required|exists:branches,id',
            'is_active' => 'boolean',
        ]);

        if ($isAdmin) {
            $validated['branch_id'] = null;
        }

        $user->update($validated);

        return redirect()->back()->with('success', 'تم تحديث بيانات المستخدم.');
    }

    public function toggleActive(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return redirect()->back()->withErrors(['toggle' => 'لا يمكنك إيقاف حسابك الخاص.']);
        }

        $user->update(['is_active' => ! $user->is_active]);

        $msg = $user->is_active ? 'تم تفعيل الحساب.' : 'تم إيقاف الحساب.';

        return redirect()->back()->with('success', $msg);
    }

    public function resetPassword(Request $request, User $user)
    {
        $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $user->update(['password' => Hash::make($request->password)]);

        return redirect()->back()->with('success', 'تم تغيير كلمة المرور بنجاح.');
    }
}
