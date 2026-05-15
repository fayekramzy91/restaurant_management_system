<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class TaxSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'tax.prices_include_tax'     => 'false',
            'tax.compound_taxes_enabled' => 'false',
            'tax.exempt_takeaway'        => 'false',
            'tax.exempt_delivery'        => 'false',
            'tax.rounding_mode'          => 'per_line',
            'tax.display_breakdown'      => 'true',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
