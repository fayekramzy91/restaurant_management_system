<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PaymentMethod;

class PaymentMethodController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:payment_methods,name',
            'is_active' => 'boolean'
        ]);

        PaymentMethod::create($validated);

        return redirect()->back()->with('success', 'تمت إضافة طريقة الدفع بنجاح');
    }

    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:payment_methods,name,' . $paymentMethod->id,
            'is_active' => 'boolean'
        ]);

        // Protect system methods from name changes
        if ($paymentMethod->is_system && $request->has('name') && $request->name !== $paymentMethod->name) {
            unset($validated['name']);
        }

        $paymentMethod->update($validated);

        return redirect()->back()->with('success', 'تم تحديث طريقة الدفع');
    }

    public function destroy(PaymentMethod $paymentMethod)
    {
        if ($paymentMethod->is_system) {
            return redirect()->back()->with('error', 'لا يمكن حذف طرق الدفع الأساسية للنظام');
        }

        $paymentMethod->delete();

        return redirect()->back()->with('success', 'تم حذف طريقة الدفع');
    }
}
