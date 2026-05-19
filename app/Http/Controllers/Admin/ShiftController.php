<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CashRegisterSession;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShiftController extends Controller
{
    public function index(Request $request)
    {
        $query = CashRegisterSession::with('user', 'branch')
            ->latest('opened_at');

        if ($userId = $request->get('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($dateFrom = $request->get('date_from')) {
            $query->whereDate('opened_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->get('date_to')) {
            $query->whereDate('opened_at', '<=', $dateTo);
        }

        return Inertia::render('Admin/Shifts/Index', [
            'shifts'  => $query->paginate(25)->withQueryString(),
            'filters' => $request->only(['user_id', 'status', 'date_from', 'date_to']),
            'users'   => User::select('id', 'name')->orderBy('name')->get(),
        ]);
    }
}
