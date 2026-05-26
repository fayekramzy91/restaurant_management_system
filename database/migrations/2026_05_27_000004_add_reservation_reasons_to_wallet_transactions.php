<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE wallet_transactions
            MODIFY COLUMN reason
            ENUM(
                'payment_surplus',
                'payment_used',
                'manual_adjustment',
                'refund',
                'reservation_deposit',
                'reservation_deposit_refund'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE wallet_transactions
            MODIFY COLUMN reason
            ENUM(
                'payment_surplus',
                'payment_used',
                'manual_adjustment',
                'refund'
            ) NOT NULL
        ");
    }
};
