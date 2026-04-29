<?php


namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        $paymentMethods = \App\Models\PaymentMethod::all();
        
        return Inertia::render('Admin/Settings/Index', [
            'settings' => $settings,
            'payment_methods' => $paymentMethods
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'restaurant_name' => 'required|string|max:255',
            'currency' => 'required|string|max:20',
            'working_hours' => 'nullable|string',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        Setting::setMany($data);

        return back()->with('success', 'تم تحديث الإعدادات بنجاح');
    }
}
