<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite does not support ENUM or MODIFY COLUMN — and does not enforce
        // column types, so the 'billing' value already works as plain TEXT.
        // Only run the DDL on MySQL where ENUM is enforced.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `tables` MODIFY COLUMN `status` ENUM('available','occupied','reserved','billing') NOT NULL DEFAULT 'available'");
        }
    }

    public function down(): void
    {
        DB::statement("UPDATE `tables` SET `status` = 'available' WHERE `status` = 'billing'");

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `tables` MODIFY COLUMN `status` ENUM('available','occupied','reserved') NOT NULL DEFAULT 'available'");
        }
    }
};
