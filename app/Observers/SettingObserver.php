<?php

namespace App\Observers;

use App\Models\Setting;
use App\Services\Audit\AuditLogger;

class SettingObserver
{
    public function updated(Setting $setting): void
    {
        // Skip internal / cache keys
        if (str_starts_with($setting->key, 'cache.') || str_starts_with($setting->key, '_')) {
            return;
        }

        app(AuditLogger::class)->log(
            'settings.updated',
            $setting,
            ['key' => $setting->key, 'value' => $setting->getOriginal('value')],
            ['key' => $setting->key, 'value' => $setting->value],
            "تغيير إعداد: {$setting->key}",
        );
    }
}
