<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // checkout_attempts is a diagnostic/guard column.
        // Incremented each time processPayment() is called for this invoice.
        // The re-checkout wallet double-count fix is in the controller (Phase 1, Part C).
        Schema::table('invoices', function (Blueprint $table) {
            $table->integer('checkout_attempts')->default(0)->after('wallet_amount');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('checkout_attempts');
        });
    }
};
