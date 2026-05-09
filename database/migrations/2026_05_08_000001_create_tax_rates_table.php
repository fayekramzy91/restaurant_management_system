<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);           // Arabic: "ضريبة قيمة مضافة"
            $table->string('name_en', 100)->nullable();
            $table->string('code', 50)->unique();  // e.g. "vat", "service"
            $table->decimal('rate', 8, 4);         // e.g. 16.0000
            $table->boolean('is_compound')->default(false);
            $table->integer('apply_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false); // auto-assign to new menu items
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rates');
    }
};
