<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['discount', 'paid_amount', 'payment_status']);
        });
    }

    // WARNING: down() restores the schema shape only — data is NOT restored.
    // Take a database backup before running this migration.
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('discount', 10, 2)->default(0)->after('total_amount');
            $table->decimal('paid_amount', 10, 2)->default(0)->after('total_amount');
            $table->string('payment_status')->default('pending')->after('status');
        });
    }
};
