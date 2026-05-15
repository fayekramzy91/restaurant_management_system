<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

use App\Models\MenuItem;
use App\Models\Category;
use Inertia\Inertia;

class MenuItemController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/MenuItems/Index', [
            'menuItems'  => MenuItem::with('category')->get(),
            'archived'   => MenuItem::with('category')->onlyTrashed()->get(),
            'categories' => Category::all(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'category_id'         => 'required|exists:categories,id',
            'price'               => 'required|numeric|min:0',
            'description'         => 'nullable|string',
            'status'              => 'required|string',
            'is_addon'            => 'boolean',
            'preparing_duration'  => 'nullable|integer|min:1|max:300',
            'image'               => 'nullable|image|max:3072',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('menu-items', 'public');
            $validated['image'] = Storage::url($path);
        }

        MenuItem::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة الصنف بنجاح');
    }

    public function update(Request $request, MenuItem $menuItem)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'category_id'         => 'required|exists:categories,id',
            'price'               => 'required|numeric|min:0',
            'description'         => 'nullable|string',
            'status'              => 'required|string',
            'is_addon'            => 'boolean',
            'preparing_duration'  => 'nullable|integer|min:1|max:300',
            'image'               => 'nullable|image|max:3072',
        ]);

        if ($request->hasFile('image')) {
            // Delete old image from storage
            if ($menuItem->image) {
                $oldPath = str_replace('/storage/', '', $menuItem->image);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('menu-items', 'public');
            $validated['image'] = Storage::url($path);
        } else {
            unset($validated['image']); // keep existing
        }

        $menuItem->update($validated);

        return redirect()->back()->with('success', 'تم تحديث الصنف');
    }

    public function destroy(MenuItem $menuItem)
    {
        // Soft delete — image preserved so it can be restored later
        $menuItem->delete();
        return redirect()->back()->with('success', 'تم أرشفة الصنف');
    }

    public function restore(int $id)
    {
        $menuItem = MenuItem::withTrashed()->findOrFail($id);
        $menuItem->restore();

        $conflict = MenuItem::where('name', $menuItem->name)->where('id', '!=', $menuItem->id)->exists();

        if ($conflict) {
            return redirect()->back()
                ->with('success', 'تم استعادة الصنف')
                ->with('warning', 'يوجد صنف نشط بنفس الاسم — تأكد من عدم التكرار');
        }

        return redirect()->back()->with('success', 'تم استعادة الصنف');
    }

    public function forceDestroy(int $id)
    {
        $menuItem = MenuItem::withTrashed()->findOrFail($id);

        if ($menuItem->image) {
            $oldPath = str_replace('/storage/', '', $menuItem->image);
            Storage::disk('public')->delete($oldPath);
        }

        $menuItem->forceDelete();
        return redirect()->back()->with('success', 'تم الحذف النهائي للصنف');
    }
}
