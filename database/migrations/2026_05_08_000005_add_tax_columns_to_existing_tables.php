<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── invoices ──────────────────────────────────────────────────────────
        // NOTE: existing tax_rate and tax_amount columns are intentionally kept.
        // @deprecated — use invoice_taxes table. Kept for pre-tax-engine invoices.
        Schema::table('invoices', function (Blueprint $table) {
            $table->boolean('prices_included_tax')->default(false)->after('tax_amount');
            $table->json('tax_breakdown_json')->nullable()->after('prices_included_tax');
        });

        // ── invoice_items ─────────────────────────────────────────────────────
        // invoice_items has NO updated_at by design (immutable ledger) — do not add it.
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('subtotal_before_tax', 12, 2)->default(0)->after('subtotal');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('subtotal_before_tax');
            $table->decimal('subtotal_after_tax', 12, 2)->default(0)->after('tax_amount');
        });

        // ── menu_items ────────────────────────────────────────────────────────
        Schema::table('menu_items', function (Blueprint $table) {
            $table->boolean('is_tax_exempt')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['prices_included_tax', 'tax_breakdown_json']);
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn(['subtotal_before_tax', 'tax_amount', 'subtotal_after_tax']);
        });

        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropColumn('is_tax_exempt');
        });
    }
};
