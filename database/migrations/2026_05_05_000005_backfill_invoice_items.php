<?php

use App\Models\Invoice;
use App\Services\InvoiceItemSnapshotter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $snapshotter = new InvoiceItemSnapshotter();

        Invoice::with('order.items.addons')->chunk(100, function ($invoices) use ($snapshotter) {
            foreach ($invoices as $invoice) {
                $snapshotter->snapshot($invoice);
            }
        });
    }

    public function down(): void
    {
        DB::table('invoice_items')->truncate();
    }
};
