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
            'restaurant_name'              => 'required|string|max:255',
            'currency'                     => 'required|string|max:20',
            'working_hours'                => 'nullable|string',
            'phone'                        => 'nullable|string',
            'address'                      => 'nullable|string',
            // Tax settings (sent as nested array tax.*)
            'tax'                          => 'nullable|array',
            'tax.prices_include_tax'       => 'boolean',
            'tax.compound_taxes_enabled'   => 'boolean',
            'tax.exempt_takeaway'          => 'boolean',
            'tax.exempt_delivery'          => 'boolean',
            'tax.rounding_mode'            => 'nullable|in:per_line,per_invoice',
            'tax.display_breakdown'        => 'boolean',
        ]);

        // Save general settings
        $taxData = $data['tax'] ?? [];
        unset($data['tax']);
        Setting::setMany($data);

        // Flatten nested tax.* keys and save
        if (! empty($taxData)) {
            $flat = [];
            foreach ($taxData as $key => $value) {
                $flat["tax.{$key}"] = $value;
            }
            Setting::setMany($flat);
        }

        return back()->with('success', 'تم تحديث الإعدادات بنجاح');
    }
}
