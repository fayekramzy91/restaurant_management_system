<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Table;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with([
            'user',
            'table',
            'customer',
            'items.menuItem',
            'invoice',
        ]);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id', $search)
                  ->orWhereHas('user',     fn ($q) => $q->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('customer', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }

        $allowedSorts = ['id', 'created_at', 'total_amount'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'created_at';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        return Inertia::render('Admin/Orders/Index', [
            'orders'  => $query->paginate(20)->withQueryString(),
            'filters' => $request->only(['search', 'status', 'type', 'sort_by', 'sort_dir']),
        ]);
    }

    public function show(Order $order)
    {
        $order->load([
            'branch',
            'table.area',
            'user',
            'customer',
            'items.menuItem',
            'items.addons.menuItem',
            'invoice.paymentEntries.paymentMethod',
            'invoice.paymentEntries.processedBy',
            'timeline.user',
        ]);

        return Inertia::render('Admin/Orders/Show', [
            'order' => $order,
        ]);
    }

    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'notes'         => 'nullable|string|max:1000',
            'private_notes' => 'nullable|string|max:1000',
        ]);

        $order->update($validated);

        if ($order->invoice) {
            $order->invoice->update([
                'notes'         => $validated['notes'] ?? $order->invoice->notes,
                'private_notes' => $validated['private_notes'] ?? $order->invoice->private_notes,
            ]);
        }

        $order->logEvent('notes_updated', 'تم تحديث ملاحظات الطلب');

        return back()->with('success', 'notes_updated');
    }

    public function cancel(Order $order)
    {
        abort_if($order->status === 'completed', 403);

        $order->update(['status' => 'cancelled']);

        if ($order->table_id) {
            Table::find($order->table_id)->update(['status' => 'available']);
        }

        $order->logEvent('order_cancelled', 'تم إلغاء الطلب من لوحة الإدارة');

        return redirect()->route('admin.orders.index');
    }
}
