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

        Schema::table('order_items', function (Blueprint $table) use ($isSqlite) {
            $table->string('name')->nullable()->after('menu_item_id');
            // SQLite does not support dropping or modifying FK constraints
            if (! $isSqlite) {
                $table->dropForeign(['menu_item_id']);
            }
        });

        // MODIFY COLUMN is MySQL-only; SQLite does not enforce NOT NULL / unsigned
        // at the DDL level, so the column already accepts NULL values there.
        if (! $isSqlite) {
            DB::statement('ALTER TABLE `order_items` MODIFY `menu_item_id` BIGINT UNSIGNED NULL');

            Schema::table('order_items', function (Blueprint $table) {
                $table->foreign('menu_item_id')
                      ->references('id')->on('menu_items')
                      ->onDelete('set null');
            });
        }

        // Backfill name. MySQL supports UPDATE … JOIN; SQLite needs a subquery.
        if ($isSqlite) {
            DB::statement("
                UPDATE order_items
                SET name = COALESCE(
                    (SELECT name FROM menu_items WHERE menu_items.id = order_items.menu_item_id),
                    '[صنف محذوف]'
                )
                WHERE name IS NULL OR name = ''
            ");
        } else {
            DB::statement("
                UPDATE order_items oi
                LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
                SET oi.name = COALESCE(mi.name, '[صنف محذوف]')
                WHERE oi.name IS NULL OR oi.name = ''
            ");
        }
    }

    public function down(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        if (! $isSqlite) {
            // Remove rows where menu_item_id is null before restoring NOT NULL + CASCADE
            DB::statement('UPDATE `order_items` SET `menu_item_id` = 0 WHERE `menu_item_id` IS NULL');
        }

        Schema::table('order_items', function (Blueprint $table) use ($isSqlite) {
            if (! $isSqlite) {
                $table->dropForeign(['menu_item_id']);
            }
            $table->dropColumn('name');
        });

        if (! $isSqlite) {
            DB::statement('ALTER TABLE `order_items` MODIFY `menu_item_id` BIGINT UNSIGNED NOT NULL');

            Schema::table('order_items', function (Blueprint $table) {
                $table->foreign('menu_item_id')
                      ->references('id')->on('menu_items')
                      ->onDelete('cascade');
            });
        }
    }
};
