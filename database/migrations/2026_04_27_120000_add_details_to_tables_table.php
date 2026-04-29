<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->unsignedTinyInteger('min_capacity')->default(1)->after('status');
            $table->unsignedTinyInteger('max_capacity')->nullable()->after('min_capacity');
            $table->string('shape')->nullable()->after('max_capacity'); // rectangle, square, round, oval
            $table->string('location')->nullable()->after('shape');     // descriptive: "near window", etc.
            $table->decimal('position_x', 6, 2)->nullable()->after('location'); // % for future floor plan
            $table->decimal('position_y', 6, 2)->nullable()->after('position_x');
        });
    }

    public function down(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->dropColumn(['min_capacity', 'max_capacity', 'shape', 'location', 'position_x', 'position_y']);
        });
    }
};
