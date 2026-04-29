<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Area;
use App\Models\Branch;
use Inertia\Inertia;

class AreaController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Areas/Index', [
            'areas' => Area::with('branch')->get(),
            'branches' => Branch::all()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'branch_id' => 'required|exists:branches,id',
        ]);

        Area::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة المنطقة بنجاح');
    }

    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'branch_id' => 'required|exists:branches,id',
        ]);

        $area->update($validated);

        return redirect()->back()->with('success', 'تم تحديث المنطقة');
    }

    public function destroy(Area $area)
    {
        $area->delete();
        return redirect()->back()->with('success', 'تم حذف المنطقة');
    }
}
