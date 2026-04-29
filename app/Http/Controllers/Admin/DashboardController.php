<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

use App\Models\Branch;
use App\Models\Order;
use App\Models\MenuItem;
use App\Models\Customer;

class DashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'branches'        => Branch::count(),
                'orders_today'    => Order::whereDate('created_at', today())->count(),
                'available_items' => MenuItem::where('status', 'available')->where('is_addon', false)->count(),
                'customers'       => Customer::count(),
            ],
        ]);
    }
}
