<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->onDelete('cascade');

            $table->enum('type', ['credit', 'debit']);
            $table->decimal('amount', 10, 2);       // always positive
            $table->decimal('balance_after', 10, 2); // snapshot of balance after this tx

            $table->enum('reason', [
                'payment_surplus',
                'payment_used',
                'manual_adjustment',
                'refund',
            ]);

            // Polymorphic reference — e.g. "App\Models\Invoice" / invoice_id
            $table->string('reference_type', 100)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();

            $table->text('notes')->nullable();

            // Who triggered this transaction
            $table->unsignedBigInteger('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');

            // Immutable ledger row — no updated_at
            $table->timestamp('created_at')->useCurrent();

            $table->index('customer_id');
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
