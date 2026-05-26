<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private array $settings = [
        ['key' => 'reservation.default_duration',     'value' => '90'],
        ['key' => 'reservation.reminder_minutes',     'value' => '30'],
        ['key' => 'reservation.max_party_size',       'value' => '20'],
        ['key' => 'reservation.allow_waitlist',       'value' => 'true'],
        ['key' => 'reservation.deposit_required',     'value' => 'false'],
        ['key' => 'reservation.auto_no_show_minutes', 'value' => '30'],
    ];

    public function up(): void
    {
        foreach ($this->settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], ['value' => $setting['value']]);
        }
    }

    public function down(): void
    {
        Setting::whereIn('key', array_column($this->settings, 'key'))->delete();
    }
};
