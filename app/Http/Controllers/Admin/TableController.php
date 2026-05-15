<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

use App\Models\Table;
use App\Models\Area;
use Inertia\Inertia;

class TableController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Tables/Index', [
            'tables' => Table::with('area')->get(),
            'areas'  => Area::all(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'area_id'      => 'required|exists:areas,id',
            'status'       => 'required|string|in:available,occupied,reserved',
            'min_capacity' => 'required|integer|min:1|max:50',
            'max_capacity' => 'nullable|integer|min:1|max:50|gte:min_capacity',
            'shape'        => 'nullable|string|in:rectangle,square,round,oval',
            'location'     => 'nullable|string|max:255',
        ]);

        Table::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة الطاولة بنجاح');
    }

    public function update(Request $request, Table $table)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'area_id'      => 'required|exists:areas,id',
            'status'       => 'required|string|in:available,occupied,reserved',
            'min_capacity' => 'required|integer|min:1|max:50',
            'max_capacity' => 'nullable|integer|min:1|max:50|gte:min_capacity',
            'shape'        => 'nullable|string|in:rectangle,square,round,oval',
            'location'     => 'nullable|string|max:255',
        ]);

        $table->update($validated);

        return redirect()->back()->with('success', 'تم تحديث بيانات الطاولة');
    }

    public function destroy(Table $table)
    {
        $table->delete();
        return redirect()->back()->with('success', 'تم حذف الطاولة');
    }

    public function generateQr(Table $table)
    {
        if ($table->qr_token) {
            return back()->with('info', 'رمز QR موجود بالفعل');
        }

        $table->update(['qr_token' => (string) Str::uuid()]);

        return back()->with('success', 'تم إنشاء رمز QR بنجاح');
    }
}
