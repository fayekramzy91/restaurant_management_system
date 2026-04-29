<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Table;
use App\Models\Area;
use App\Models\Category;
use App\Models\MenuItem;
use Inertia\Inertia;

class WaiterController extends Controller
{
    public function index()
    {
        return Inertia::render('Waiter/Index', [
            'areas' => Area::with('tables')->get()
        ]);
    }

    public function showTable(Table $table)
    {
        // Get the active order for this table if it exists and is not completed
        $activeOrder = $table->orders()->where('status', '!=', 'completed')->latest()->first();

        return Inertia::render('Waiter/TableOrder', [
            'table' => $table->load('area'),
            'categories' => Category::with(['menuItems' => function($query) {
                $query->where('is_addon', false);
            }])->orderBy('sort_order')->get(),
            'addons' => MenuItem::where('is_addon', true)->where('status', 'available')->get(),
            'activeOrder' => $activeOrder ? $activeOrder->load('items.menuItem', 'items.addons.menuItem') : null
        ]);
    }
}
