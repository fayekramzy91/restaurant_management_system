<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add type column to payment_methods
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->string('type', 20)->default('other')->after('name');
            // type: cash | card | wallet | other
        });

        // Seed the existing cash method (is_system = true → it's نقداً)
        DB::table('payment_methods')
            ->where('is_system', true)
            ->update(['type' => 'cash']);

        // 2. Create cash register sessions
        Schema::create('cash_register_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('restrict');

            $table->foreignId('branch_id')
                  ->constrained('branches')
                  ->onDelete('restrict');

            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();

            $table->decimal('opening_balance',          10, 2)->default(0);
            $table->decimal('expected_closing_balance', 10, 2)->nullable();
            $table->decimal('actual_closing_balance',   10, 2)->nullable();
            $table->decimal('difference',               10, 2)->nullable();

            $table->text('notes')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');

            $table->timestamps();

            $table->index(['user_id',   'status']);
            $table->index(['branch_id', 'status']);
        });

        // 3. Link payment_entries to cash register sessions
        // Add column first (SQLite ALTER TABLE does not support inline FK constraints)
        Schema::table('payment_entries', function (Blueprint $table) {
            $table->unsignedBigInteger('cash_register_session_id')->nullable()->after('processed_by');
            $table->index('cash_register_session_id');
        });

        // Add FK separately — MySQL/PostgreSQL enforce it; SQLite records it structurally
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('payment_entries', function (Blueprint $table) {
                $table->foreign('cash_register_session_id')
                      ->references('id')
                      ->on('cash_register_sessions')
                      ->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::table('payment_entries', function (Blueprint $table) {
            $driver = Schema::getConnection()->getDriverName();
            if ($driver !== 'sqlite') {
                // Drop FK constraint if it exists (covers both migration variants)
                try { $table->dropForeign(['cash_register_session_id']); } catch (\Throwable $e) {}
                // Drop standalone index if it exists (new migration variant)
                try { $table->dropIndex(['cash_register_session_id']); } catch (\Throwable $e) {}
            }
            $table->dropColumn('cash_register_session_id');
        });

        Schema::dropIfExists('cash_register_sessions');

        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
