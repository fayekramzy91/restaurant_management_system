<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');

            // Nullable FK — tax rate may be deleted after invoice is created
            $table->unsignedBigInteger('tax_rate_id')->nullable();
            $table->foreign('tax_rate_id')->references('id')->on('tax_rates')->onDelete('set null');

            // Immutable snapshots of the tax rate at invoice-creation time
            $table->string('tax_name', 100);
            $table->string('tax_code', 50);
            $table->decimal('rate', 8, 4);
            $table->boolean('is_compound');

            $table->decimal('taxable_amount', 12, 2);
            $table->decimal('tax_amount', 12, 2);

            // Immutable ledger row — no updated_at
            $table->timestamp('created_at')->useCurrent();

            $table->index('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_taxes');
    }
};
