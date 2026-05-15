<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_item_tax_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_item_id')->constrained()->onDelete('cascade');
            $table->foreignId('tax_rate_id')->constrained()->onDelete('restrict');
            $table->timestamps();

            $table->unique(['menu_item_id', 'tax_rate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_item_tax_rates');
    }
};
