<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Setting::updateOrCreate(
            ['key' => 'customer_allow_add_after_submit'],
            ['value' => '0', 'group' => 'customer_ordering']
        );
    }

    public function down(): void
    {
        Setting::where('key', 'customer_allow_add_after_submit')->delete();
    }
};
