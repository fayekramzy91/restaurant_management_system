<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('customer_id')
                  ->nullable()
                  ->constrained('customers')
                  ->nullOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone', 30)->nullable();

            $table->unsignedInteger('party_size');

            $table->foreignId('table_id')
                  ->constrained('tables')
                  ->restrictOnDelete();
            $table->foreignId('branch_id')
                  ->constrained('branches')
                  ->restrictOnDelete();
            $table->foreignId('reserved_by')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->date('reservation_date');
            $table->time('reservation_time');
            $table->unsignedInteger('estimated_duration')->default(90);

            $table->enum('status', [
                'confirmed',
                'seated',
                'completed',
                'cancelled',
                'no_show',
                'rescheduled',
                'waitlist',
            ])->default('confirmed');

            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->boolean('deposit_paid')->default(false);
            $table->text('deposit_notes')->nullable();

            $table->foreignId('order_id')
                  ->nullable()
                  ->constrained('orders')
                  ->nullOnDelete();

            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('reminded_at')->nullable();

            $table->foreignId('rescheduled_from_id')
                  ->nullable()
                  ->constrained('reservations')
                  ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['table_id', 'reservation_date', 'status']);
            $table->index(['branch_id', 'reservation_date']);
            $table->index('customer_id');
            $table->index('reserved_by');
            $table->index(['reservation_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
