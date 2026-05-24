<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user')->latest('created_at');

        if ($userId = $request->get('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($action = $request->get('action')) {
            $query->where('action', 'like', "%{$action}%");
        }

        if ($dateFrom = $request->get('date_from')) {
            $query->where('created_at', '>=', $dateFrom . ' 00:00:00');
        }

        if ($dateTo = $request->get('date_to')) {
            $query->where('created_at', '<=', $dateTo . ' 23:59:59');
        }

        $logs = $query->paginate(50)->withQueryString();

        return Inertia::render('Admin/AuditLog/Index', [
            'logs'    => $logs,
            'filters' => $request->only(['user_id', 'action', 'date_from', 'date_to']),
            'users'   => User::select('id', 'name')->orderBy('name')->get(),
        ]);
    }
}
