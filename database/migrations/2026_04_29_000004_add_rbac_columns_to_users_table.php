<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->nullable()->after('name');
            $table->foreignId('role_id')->nullable()->constrained('roles')->nullOnDelete()->after('password');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete()->after('role_id');
            $table->boolean('is_active')->default(true)->after('branch_id');
            $table->timestamp('last_login')->nullable()->after('is_active');
            // Make email optional — username is now the primary login identifier
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['username', 'role_id', 'branch_id', 'is_active', 'last_login']);
            $table->string('email')->nullable(false)->change();
        });
    }
};
