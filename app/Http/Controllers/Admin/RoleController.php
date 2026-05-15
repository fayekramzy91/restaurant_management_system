<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Roles/Index', [
            'roles' => Role::withCount('users')->with('permissions')->get()->map(fn ($r) => [
                'id'              => $r->id,
                'name'            => $r->name,
                'display_name'    => $r->display_name,
                'description'     => $r->description,
                'is_system'       => $r->is_system,
                'users_count'     => $r->users_count,
                'permission_ids'  => $r->permissions->pluck('id')->all(),
                'permissions_count' => $r->permissions->count(),
            ]),
            'permission_groups' => Permission::all()
                ->groupBy('group_name')
                ->map(fn ($perms, $group) => [
                    'group'       => $group,
                    'permissions' => $perms->map(fn ($p) => [
                        'id'           => $p->id,
                        'key'          => $p->key,
                        'display_name' => $p->display_name,
                    ])->values()->all(),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'display_name' => 'required|string|max:255',
            'description'  => 'nullable|string|max:500',
        ]);

        $base = Str::slug($request->display_name, '_');
        $name = $base;
        $i    = 2;
        while (Role::where('name', $name)->exists()) {
            $name = $base . '_' . $i++;
        }

        Role::create([
            'name'         => $name,
            'display_name' => $request->display_name,
            'description'  => $request->description,
            'is_system'    => false,
        ]);

        return redirect()->back()->with('success', 'تمت إضافة الدور بنجاح.');
    }

    public function update(Request $request, Role $role)
    {
        $request->validate([
            'display_name' => 'required|string|max:255',
            'description'  => 'nullable|string|max:500',
        ]);

        $role->update([
            'display_name' => $request->display_name,
            'description'  => $request->description,
        ]);

        return redirect()->back()->with('success', 'تم تحديث بيانات الدور.');
    }

    public function destroy(Role $role)
    {
        if ($role->is_system) {
            return redirect()->back()->withErrors(['delete' => 'لا يمكن حذف الأدوار الافتراضية للنظام.']);
        }

        if ($role->users()->exists()) {
            return redirect()->back()->withErrors(['delete' => 'لا يمكن حذف دور مرتبط بمستخدمين. أعد تعيين المستخدمين أولاً.']);
        }

        $role->delete();

        return redirect()->back()->with('success', 'تم حذف الدور.');
    }

    public function syncPermissions(Request $request, Role $role)
    {
        $request->validate([
            'permissions'   => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->permissions()->sync($request->permissions ?? []);

        return redirect()->back()->with('success', 'تم تحديث صلاحيات الدور بنجاح.');
    }
}
