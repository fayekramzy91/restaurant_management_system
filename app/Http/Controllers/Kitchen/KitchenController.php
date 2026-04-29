<?php

namespace App\Http\Controllers\Kitchen;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Inertia\Inertia;

class KitchenController extends Controller
{
    public function index()
    {
        return Inertia::render('Kitchen/Index', [
            'orders' => Order::with(['items.menuItem', 'items.addons.menuItem', 'table'])
                ->where('status', 'preparing')
                ->orderBy('created_at', 'asc')
                ->get()
        ]);
    }

    public function startPreparing(Order $order)
    {
        $order->update(['preparing_started_at' => now()]);

        $order->logEvent('kitchen_started', 'بدأ الشيف العمل على الطلب');

        return redirect()->back()->with('success', 'order_started');
    }

    public function markAsReady(Order $order)
    {
        $order->update(['status' => 'ready']);

        $order->logEvent('kitchen_ready', 'الطلب جاهز في المطبخ');

        return redirect()->back()->with('success', 'order_ready');
    }
}
