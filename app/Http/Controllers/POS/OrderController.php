<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Table;
use App\Models\MenuItem;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'table_id'    => 'required_if:type,dine_in|exists:tables,id',
            'type'        => 'required|string',
            'notes'       => 'nullable|string',
            'menu_item_id'=> 'nullable|exists:menu_items,id',
            'quantity'    => 'nullable|integer|min:1',
        ]);

        $order = Order::create([
            'branch_id'    => Auth::user()->branch_id ?? 1,
            'table_id'     => $validated['table_id'] ?? null,
            'user_id'      => Auth::id(),
            'type'         => $validated['type'],
            'notes'        => $validated['notes'] ?? null,
            'status'       => 'pending',
            'total_amount' => 0,
        ]);

        if (isset($validated['table_id'])) {
            Table::find($validated['table_id'])->update(['status' => 'occupied']);
        }

        $typeLabels = ['dine_in' => 'داخلي', 'takeaway' => 'خارجي', 'delivery' => 'توصيل'];
        $table      = isset($validated['table_id']) ? Table::find($validated['table_id']) : null;

        $order->logEvent('order_created',
            'تم إنشاء الطلب' . ($table ? " – طاولة {$table->name}" : ' – ' . ($typeLabels[$validated['type']] ?? $validated['type'])),
            ['type' => $validated['type'], 'table_name' => $table?->name]
        );

        if (isset($validated['menu_item_id'])) {
            $menuItem = MenuItem::find($validated['menu_item_id']);
            $quantity = $validated['quantity'] ?? 1;

            $order->items()->create([
                'menu_item_id' => $menuItem->id,
                'quantity'     => $quantity,
                'price'        => $menuItem->price,
            ]);

            $order->increment('total_amount', $menuItem->price * $quantity);

            $order->logEvent('item_added',
                "تمت إضافة {$quantity}× {$menuItem->name}",
                ['menu_item_id' => $menuItem->id, 'name' => $menuItem->name, 'quantity' => $quantity, 'price' => $menuItem->price]
            );
        }

        return redirect()->back()->with('success', 'order_created');
    }

    public function addItem(Request $request, Order $order)
    {
        $validated = $request->validate([
            'menu_item_id' => 'required|exists:menu_items,id',
            'quantity'     => 'required|integer|min:1',
            'notes'        => 'nullable|string',
        ]);

        $menuItem = MenuItem::find($validated['menu_item_id']);

        $existingItem = $order->items()
            ->where('menu_item_id', $menuItem->id)
            ->where('notes', $validated['notes'] ?? null)
            ->first();

        if ($existingItem) {
            $existingItem->increment('quantity', $validated['quantity']);
        } else {
            $order->items()->create([
                'menu_item_id' => $menuItem->id,
                'quantity'     => $validated['quantity'],
                'price'        => $menuItem->price,
                'notes'        => $validated['notes'] ?? null,
            ]);
        }

        $order->increment('total_amount', $menuItem->price * $validated['quantity']);

        $order->logEvent('item_added',
            "تمت إضافة {$validated['quantity']}× {$menuItem->name}",
            ['menu_item_id' => $menuItem->id, 'name' => $menuItem->name, 'quantity' => $validated['quantity'], 'price' => $menuItem->price]
        );

        return redirect()->back()->with('success', 'item_added');
    }

    public function updateItemAddons(Request $request, Order $order, OrderItem $item)
    {
        $validated = $request->validate([
            'addons'                  => 'nullable|array',
            'addons.*.menu_item_id'  => 'required|exists:menu_items,id',
            'addons.*.quantity'      => 'required|integer|min:0',
        ]);

        $oldAddonsTotal = 0;
        foreach ($item->addons as $addon) {
            $oldAddonsTotal += $addon->price * $addon->quantity;
        }

        $item->addons()->delete();

        $newAddonsTotal = 0;
        $addonNames     = [];

        if (isset($validated['addons'])) {
            foreach ($validated['addons'] as $addonData) {
                if ($addonData['quantity'] > 0) {
                    $menuItem = MenuItem::find($addonData['menu_item_id']);
                    $item->addons()->create([
                        'menu_item_id' => $menuItem->id,
                        'price'        => $menuItem->price,
                        'quantity'     => $addonData['quantity'],
                    ]);
                    $newAddonsTotal += $menuItem->price * $addonData['quantity'];
                    $addonNames[]    = "{$addonData['quantity']}× {$menuItem->name}";
                }
            }
        }

        $diff = $newAddonsTotal - $oldAddonsTotal;
        if ($diff > 0) {
            $order->increment('total_amount', $diff);
        } elseif ($diff < 0) {
            $order->decrement('total_amount', abs($diff));
        }

        $itemName = $item->menuItem?->name ?? 'صنف';
        $order->logEvent('addons_updated',
            "تم تحديث إضافات {$itemName}" . (count($addonNames) ? ': ' . implode('، ', $addonNames) : ' (لا إضافات)'),
            ['item_name' => $itemName, 'addons' => $addonNames]
        );

        return redirect()->back()->with('success', 'addons_updated');
    }

    public function updateItem(Request $request, Order $order, OrderItem $item)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'notes'    => 'nullable|string|max:500',
        ]);

        $oldQuantity = $item->quantity;
        $newQuantity = $validated['quantity'];
        $diff        = $newQuantity - $oldQuantity;
        $itemName    = $item->menuItem?->name ?? 'صنف';

        $updateData = ['quantity' => $newQuantity];
        if (array_key_exists('notes', $validated)) {
            $updateData['notes'] = $validated['notes'];
        }

        $item->update($updateData);

        $addonsPrice = $item->addons->sum('price');
        if ($diff > 0) {
            $order->increment('total_amount', ($item->price + $addonsPrice) * $diff);
        } elseif ($diff < 0) {
            $order->decrement('total_amount', ($item->price + $addonsPrice) * abs($diff));
        }

        if ($diff !== 0) {
            $order->logEvent('item_updated',
                "تم تعديل كمية {$itemName}: {$oldQuantity} ← {$newQuantity}",
                ['item_name' => $itemName, 'old_quantity' => $oldQuantity, 'new_quantity' => $newQuantity]
            );
        } elseif (isset($validated['notes'])) {
            $order->logEvent('item_updated',
                "تم تحديث ملاحظات {$itemName}",
                ['item_name' => $itemName, 'notes' => $validated['notes']]
            );
        }

        return redirect()->back()->with('success', 'item_updated');
    }

    public function removeItem(Order $order, OrderItem $item)
    {
        $itemName    = $item->menuItem?->name ?? 'صنف';
        $addonsPrice = $item->addons->sum('price');

        $order->decrement('total_amount', ($item->price + $addonsPrice) * $item->quantity);
        $item->delete();

        $order->logEvent('item_removed',
            "تم حذف {$item->quantity}× {$itemName} من الطلب",
            ['item_name' => $itemName, 'quantity' => $item->quantity, 'price' => $item->price]
        );

        return redirect()->back()->with('success', 'item_removed');
    }

    public function complete(Order $order)
    {
        $order->update(['status' => 'preparing', 'preparing_started_at' => null]);

        $order->logEvent('sent_to_kitchen', 'تم إرسال الطلب إلى المطبخ');

        return redirect()->route('pos.index')->with('success', 'sent_to_kitchen');
    }
}
