<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('table_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Waiter or Cashier
            $table->foreignId('customer_id')->nullable()->constrained()->onDelete('set null');
            $table->string('type')->default('dine_in'); // dine_in, takeaway, delivery
            $table->string('status')->default('pending'); // pending, preparing, ready, completed, cancelled
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->string('payment_status')->default('pending'); // pending, paid
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
