<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // NOTE: wallet_balance is intentionally kept as a performance cache.
        // wallet_transactions is the source of truth for history.
        // wallet_balance must always equal SUM(credits) - SUM(debits) for that customer.
        Schema::table('customers', function (Blueprint $table) {
            $table->timestamp('wallet_last_updated_at')
                  ->nullable()
                  ->after('wallet_balance');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('wallet_last_updated_at');
        });
    }
};
