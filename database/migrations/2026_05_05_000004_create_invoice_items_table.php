<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');

            $table->unsignedBigInteger('order_item_id')->nullable();
            $table->foreign('order_item_id')->references('id')->on('order_items')->onDelete('set null');

            $table->unsignedBigInteger('menu_item_id')->nullable();
            $table->foreign('menu_item_id')->references('id')->on('menu_items')->onDelete('set null');

            // Self-referencing parent for addon lines grouped under their main item
            $table->unsignedBigInteger('parent_invoice_item_id')->nullable();
            $table->foreign('parent_invoice_item_id')->references('id')->on('invoice_items')->onDelete('cascade');

            // Immutable snapshot columns — never change after insert
            $table->string('name');
            $table->decimal('unit_price', 10, 2);
            $table->integer('quantity');
            $table->decimal('subtotal', 10, 2);
            $table->boolean('is_addon')->default(false);
            $table->text('notes')->nullable();

            // No updated_at — these rows are immutable ledger entries
            $table->timestamp('created_at')->useCurrent();

            $table->index('invoice_id');
            $table->index('order_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
