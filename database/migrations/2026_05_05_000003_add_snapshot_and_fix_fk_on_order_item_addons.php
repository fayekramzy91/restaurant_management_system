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

        Schema::table('order_item_addons', function (Blueprint $table) use ($isSqlite) {
            $table->string('name')->nullable()->after('menu_item_id');
            if (! $isSqlite) {
                $table->dropForeign(['menu_item_id']);
            }
        });

        if (! $isSqlite) {
            DB::statement('ALTER TABLE `order_item_addons` MODIFY `menu_item_id` BIGINT UNSIGNED NULL');

            Schema::table('order_item_addons', function (Blueprint $table) {
                $table->foreign('menu_item_id')
                      ->references('id')->on('menu_items')
                      ->onDelete('set null');
            });
        }

        if ($isSqlite) {
            DB::statement("
                UPDATE order_item_addons
                SET name = COALESCE(
                    (SELECT name FROM menu_items WHERE menu_items.id = order_item_addons.menu_item_id),
                    '[إضافة محذوفة]'
                )
                WHERE name IS NULL OR name = ''
            ");
        } else {
            DB::statement("
                UPDATE order_item_addons oia
                LEFT JOIN menu_items mi ON mi.id = oia.menu_item_id
                SET oia.name = COALESCE(mi.name, '[إضافة محذوفة]')
                WHERE oia.name IS NULL OR oia.name = ''
            ");
        }
    }

    public function down(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        if (! $isSqlite) {
            DB::statement('UPDATE `order_item_addons` SET `menu_item_id` = 0 WHERE `menu_item_id` IS NULL');
        }

        Schema::table('order_item_addons', function (Blueprint $table) use ($isSqlite) {
            if (! $isSqlite) {
                $table->dropForeign(['menu_item_id']);
            }
            $table->dropColumn('name');
        });

        if (! $isSqlite) {
            DB::statement('ALTER TABLE `order_item_addons` MODIFY `menu_item_id` BIGINT UNSIGNED NOT NULL');

            Schema::table('order_item_addons', function (Blueprint $table) {
                $table->foreign('menu_item_id')
                      ->references('id')->on('menu_items')
                      ->onDelete('cascade');
            });
        }
    }
};
