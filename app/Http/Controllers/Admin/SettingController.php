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
            'restaurant_name'                => 'required|string|max:255',
            'currency'                       => 'required|string|max:20',
            'working_hours'                  => 'nullable|string',
            'phone'                          => 'nullable|string',
            'address'                        => 'nullable|string',
            'customer_allow_add_after_submit' => 'nullable|in:0,1',
            'tax'                            => 'nullable|array',
            'tax.prices_include_tax'         => 'nullable|in:0,1',
            'tax.compound_taxes_enabled'     => 'nullable|in:0,1',
            'tax.exempt_takeaway'            => 'nullable|in:0,1',
            'tax.exempt_delivery'            => 'nullable|in:0,1',
            'tax.rounding_mode'              => 'nullable|in:per_line,per_invoice',
            'tax.display_breakdown'          => 'nullable|in:0,1',
        ]);

        // Flatten nested tax array to dot-notation keys for storage
        $taxSettings = $data['tax'] ?? [];
        unset($data['tax']);
        foreach ($taxSettings as $subKey => $value) {
            $data["tax.$subKey"] = $value;
        }

        Setting::setMany($data);

        return back()->with('success', 'تم تحديث الإعدادات بنجاح');
    }
}
