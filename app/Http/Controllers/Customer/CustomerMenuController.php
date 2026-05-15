<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Table;
use Inertia\Inertia;

class CustomerMenuController extends Controller
{
    public function show(string $token)
    {
        $table = Table::where('qr_token', $token)
            ->with('area.branch')
            ->firstOrFail();

        $categories = Category::with(['menuItems' => function ($q) {
            $q->where('is_addon', false)
              ->where('status', 'available')
              ->whereNull('deleted_at')
              ->orderBy('name');
        }])->get();

        $activeOrder = Order::where('table_id', $table->id)
            ->where('source', 'customer')
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->with('items')
            ->latest()
            ->first();

        $allowAddAfterSubmit = Setting::getValue('customer_allow_add_after_submit', '0') === '1';
        $canAddItems = $activeOrder
            ? ($activeOrder->status === 'pending'
                || ($activeOrder->status === 'preparing' && $allowAddAfterSubmit))
            : false;

        return Inertia::render('Customer/Menu', [
            'table'       => [
                'id'       => $table->id,
                'name'     => $table->name,
                'qr_token' => $table->qr_token,
                'area'     => ['name' => $table->area->name],
                'branch'   => ['name' => $table->area->branch->name],
            ],
            'categories'  => $categories,
            'activeOrder' => $activeOrder ? $this->serializeOrder($activeOrder, $canAddItems) : null,
            'settings'    => Setting::all()->pluck('value', 'key'),
        ]);
    }

    private function serializeOrder(Order $order, bool $canAddItems): array
    {
        $canCancel = $order->status === 'pending'
            || ($order->status === 'preparing' && is_null($order->preparing_started_at));

        return [
            'id'                   => $order->id,
            'status'               => $order->status,
            'total_amount'         => $order->total_amount,
            'preparing_started_at' => $order->preparing_started_at?->toIso8601String(),
            'can_cancel'           => $canCancel,
            'can_add_items'        => $canAddItems,
            'items'                => $order->items->map(fn($i) => [
                'id'       => $i->id,
                'name'     => $i->name ?? $i->menuItem?->name ?? '[صنف محذوف]',
                'quantity' => $i->quantity,
                'price'    => (float) $i->price,
                'notes'    => $i->notes,
            ])->values()->all(),
        ];
    }
}
