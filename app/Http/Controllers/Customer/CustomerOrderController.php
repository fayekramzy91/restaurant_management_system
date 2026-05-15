<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CustomerOrderController extends Controller
{
    public function placeOrder(Request $request, string $token): JsonResponse
    {
        $table = Table::where('qr_token', $token)->with('area.branch')->firstOrFail();

        $validated = $request->validate([
            'items'         => 'required|array|min:1',
            'items.*.id'    => [
                'required', 'integer',
                Rule::exists('menu_items', 'id')
                    ->where('status', 'available')
                    ->whereNull('deleted_at'),
            ],
            'items.*.qty'   => 'required|integer|min:1|max:50',
            'items.*.notes' => 'nullable|string|max:500',
            'notes'         => 'nullable|string|max:1000',
        ]);

        $alreadyActive = Order::where('table_id', $table->id)
            ->where('source', 'customer')
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->exists();

        if ($alreadyActive) {
            return response()->json(['error' => 'يوجد طلب نشط بالفعل لهذه الطاولة'], 409);
        }

        $order = DB::transaction(function () use ($table, $validated) {
            $order = Order::create([
                'branch_id'   => $table->area->branch->id,
                'table_id'    => $table->id,
                'user_id'     => null,
                'source'      => 'customer',
                'type'        => 'dine_in',
                'status'      => 'preparing',
                'total_amount' => 0,
                'notes'       => $validated['notes'] ?? null,
            ]);

            $table->update(['status' => 'occupied']);

            $total = 0;
            foreach ($validated['items'] as $itemData) {
                $menuItem = MenuItem::findOrFail($itemData['id']);
                $qty      = $itemData['qty'];

                $order->items()->create([
                    'menu_item_id' => $menuItem->id,
                    'name'         => $menuItem->name,
                    'quantity'     => $qty,
                    'price'        => $menuItem->price,
                    'notes'        => $itemData['notes'] ?? null,
                ]);

                $total += $menuItem->price * $qty;
            }

            $order->update(['total_amount' => $total]);

            $order->logEvent('order_created', "طلب عميل من الطاولة {$table->name}", [
                'source'     => 'customer',
                'table_name' => $table->name,
            ]);
            $order->logEvent('sent_to_kitchen', 'تم إرسال الطلب إلى المطبخ تلقائياً (عميل)');

            return $order;
        });

        return response()->json([
            'order_id' => $order->id,
            'status'   => $order->status,
            'total'    => (float) $order->total_amount,
        ], 201);
    }

    public function status(string $token, int $orderId): JsonResponse
    {
        $table = Table::where('qr_token', $token)->firstOrFail();

        $order = Order::where('id', $orderId)
            ->where('table_id', $table->id)
            ->where('source', 'customer')
            ->with('items')
            ->firstOrFail();

        $allowAddAfterSubmit = Setting::getValue('customer_allow_add_after_submit', '0') === '1';

        $canCancel    = $order->status === 'pending'
            || ($order->status === 'preparing' && is_null($order->preparing_started_at));

        $canAddItems  = $order->status === 'pending'
            || ($order->status === 'preparing' && $allowAddAfterSubmit);

        return response()->json([
            'id'                   => $order->id,
            'status'               => $order->status,
            'total_amount'         => (float) $order->total_amount,
            'preparing_started_at' => $order->preparing_started_at?->toIso8601String(),
            'can_cancel'           => $canCancel,
            'can_add_items'        => $canAddItems,
            'items'                => $order->items->map(fn($i) => [
                'id'       => $i->id,
                'name'     => $i->name ?? '[صنف محذوف]',
                'quantity' => $i->quantity,
                'price'    => (float) $i->price,
                'notes'    => $i->notes,
            ])->values()->all(),
        ]);
    }

    public function addItem(Request $request, string $token, int $orderId): JsonResponse
    {
        $table = Table::where('qr_token', $token)->firstOrFail();

        $order = Order::where('id', $orderId)
            ->where('table_id', $table->id)
            ->where('source', 'customer')
            ->whereNotIn('status', ['completed', 'cancelled', 'ready'])
            ->firstOrFail();

        $allowAddAfterSubmit = Setting::getValue('customer_allow_add_after_submit', '0') === '1';
        $canAddItems = $order->status === 'pending'
            || ($order->status === 'preparing' && $allowAddAfterSubmit);

        if (! $canAddItems) {
            return response()->json(['error' => 'لا يمكن إضافة أصناف في هذه المرحلة'], 403);
        }

        $validated = $request->validate([
            'menu_item_id' => [
                'required', 'integer',
                Rule::exists('menu_items', 'id')
                    ->where('status', 'available')
                    ->whereNull('deleted_at'),
            ],
            'qty'   => 'required|integer|min:1|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        $menuItem = MenuItem::findOrFail($validated['menu_item_id']);

        DB::transaction(function () use ($order, $menuItem, $validated) {
            $order->items()->create([
                'menu_item_id' => $menuItem->id,
                'name'         => $menuItem->name,
                'quantity'     => $validated['qty'],
                'price'        => $menuItem->price,
                'notes'        => $validated['notes'] ?? null,
            ]);

            $order->increment('total_amount', $menuItem->price * $validated['qty']);
            $order->logEvent('item_added', "تمت إضافة {$menuItem->name} من قبل العميل");
        });

        return response()->json(['success' => true, 'total' => (float) $order->fresh()->total_amount]);
    }

    public function cancel(string $token, int $orderId): JsonResponse
    {
        $table = Table::where('qr_token', $token)->firstOrFail();

        $order = Order::where('id', $orderId)
            ->where('table_id', $table->id)
            ->where('source', 'customer')
            ->whereNotIn('status', ['completed', 'cancelled', 'ready'])
            ->firstOrFail();

        $canCancel = $order->status === 'pending'
            || ($order->status === 'preparing' && is_null($order->preparing_started_at));

        if (! $canCancel) {
            return response()->json(['error' => 'لا يمكن إلغاء الطلب بعد بدء التحضير'], 403);
        }

        DB::transaction(function () use ($order, $table) {
            $order->update(['status' => 'cancelled']);
            $order->logEvent('order_cancelled', 'تم إلغاء الطلب من قِبل العميل', ['source' => 'customer']);

            $hasOtherActive = Order::where('table_id', $table->id)
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->where('id', '!=', $order->id)
                ->exists();

            if (! $hasOtherActive) {
                $table->update(['status' => 'available']);
            }
        });

        return response()->json(['cancelled' => true]);
    }
}
