<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvoiceTax;
use App\Models\TaxRate;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaxRateController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Taxes/Index', [
            'taxRates' => TaxRate::withTrashed()->orderBy('apply_order')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'code'        => 'required|string|max:50|unique:tax_rates,code',
            'rate'        => 'required|numeric|min:0|max:100',
            'is_compound' => 'boolean',
            'apply_order' => 'integer|min:0',
            'is_active'   => 'boolean',
            'is_default'  => 'boolean',
        ]);

        TaxRate::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة الضريبة بنجاح');
    }

    public function update(Request $request, TaxRate $tax)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'code'        => 'required|string|max:50|unique:tax_rates,code,' . $tax->id,
            'rate'        => 'required|numeric|min:0|max:100',
            'is_compound' => 'boolean',
            'apply_order' => 'integer|min:0',
            'is_active'   => 'boolean',
            'is_default'  => 'boolean',
        ]);

        $tax->update($validated);

        return redirect()->back()->with('success', 'تم تحديث الضريبة');
    }

    public function destroy(TaxRate $tax)
    {
        if (InvoiceTax::where('tax_rate_id', $tax->id)->exists()) {
            // Always return JSON 422 — Inertia handles it natively by surfacing the errors
            // object in usePage().props.errors; the UI reads pageErrors?.delete.
            return response()->json([
                'message' => 'لا يمكن حذف ضريبة مرتبطة بفواتير',
                'errors'  => ['delete' => ['لا يمكن حذف ضريبة مرتبطة بفواتير']],
            ], 422);
        }

        $tax->delete();

        return redirect()->back()->with('success', 'تم حذف الضريبة');
    }
}
