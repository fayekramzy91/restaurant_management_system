<?php

namespace App\Providers;

use App\Models\MenuItem;
use App\Models\Setting;
use App\Models\User;
use App\Observers\MenuItemObserver;
use App\Observers\SettingObserver;
use App\Observers\UserObserver;
use App\Services\Audit\AuditLogger;
use App\Services\Tax\TaxCalculator;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TaxCalculator::class);
        $this->app->singleton(AuditLogger::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        MenuItem::observe(MenuItemObserver::class);
        Setting::observe(SettingObserver::class);
        User::observe(UserObserver::class);
    }
}
