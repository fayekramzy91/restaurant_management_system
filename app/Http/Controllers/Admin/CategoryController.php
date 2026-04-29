<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Category;
use App\Models\Area;
use App\Models\Branch;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Categories/Index', [
            'categories' => Category::orderBy('sort_order')->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string',
            'sort_order' => 'nullable|integer',
        ]);

        Category::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة التصنيف بنجاح');
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string',
            'sort_order' => 'nullable|integer',
        ]);

        $category->update($validated);

        return redirect()->back()->with('success', 'تم تحديث التصنيف');
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return redirect()->back()->with('success', 'تم حذف التصنيف');
    }
}
