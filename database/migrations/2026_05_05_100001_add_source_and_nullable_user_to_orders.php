<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        // Make user_id nullable. MySQL: raw ALTER preserves the FK constraint.
        // SQLite: column constraints aren't strictly enforced; skip MODIFY COLUMN.
        if (! $isSqlite) {
            DB::statement('ALTER TABLE `orders` MODIFY COLUMN `user_id` BIGINT UNSIGNED NULL');
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->enum('source', ['staff', 'customer'])->default('staff')->after('type');
        });
    }

    public function down(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        if (! $isSqlite) {
            // Backfill nulls before restoring NOT NULL
            DB::statement('UPDATE `orders` SET `user_id` = 1 WHERE `user_id` IS NULL');
            DB::statement('ALTER TABLE `orders` MODIFY COLUMN `user_id` BIGINT UNSIGNED NOT NULL');
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
