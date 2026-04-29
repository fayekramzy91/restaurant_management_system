<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Branch;
use Inertia\Inertia;

class BranchController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Branches/Index', [
            'branches' => Branch::all()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'is_main' => 'boolean',
        ]);

        Branch::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة الفرع بنجاح');
    }

    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'is_main' => 'boolean',
        ]);

        $branch->update($validated);

        return redirect()->back()->with('success', 'تم تحديث بيانات الفرع');
    }

    public function destroy(Branch $branch)
    {
        $branch->delete();
        return redirect()->back()->with('success', 'تم حذف الفرع');
    }
}
