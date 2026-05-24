<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\CashRegisterSession;
use App\Models\InvoiceTax;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CashRegisterController extends Controller
{
    /**
     * GET /pos/shift/status
     * Returns the current user's open session (if any).
     */
    public function status(): JsonResponse
    {
        $session = CashRegisterSession::where('user_id', auth()->id())
            ->where('status', 'open')
            ->with('branch', 'user')
            ->first();

        return response()->json([
            'session'          => $session,
            'opened_at'        => $session?->opened_at,
            'duration_minutes' => $session
                ? now()->diffInMinutes($session->opened_at)
                : null,
        ]);
    }

    /**
     * POST /pos/shift/open
     */
    public function open(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'opening_balance' => 'required|numeric|min:0',
        ]);

        // Rule: one open session per user
        $existing = CashRegisterSession::where('user_id', auth()->id())
            ->where('status', 'open')
            ->exists();

        if ($existing) {
            return response()->json([
                'error' => 'يوجد وردية مفتوحة بالفعل لهذا المستخدم',
            ], 422);
        }

        $user    = auth()->user();
        $session = CashRegisterSession::create([
            'user_id'         => $user->id,
            'branch_id'       => $user->branch_id,
            'opened_at'       => now(),
            'opening_balance' => $validated['opening_balance'],
            'status'          => 'open',
        ]);

        $session->load('branch', 'user');

        app(AuditLogger::class)->log(
            'shift.opened',
            $session,
            [],
            [
                'opening_balance' => $session->opening_balance,
                'branch_id'       => $session->branch_id,
            ],
            "فتح وردية صندوق: {$session->branch->name}",
        );

        return response()->json([
            'success'          => true,
            'session'          => $session,
            'duration_minutes' => 0,
        ]);
    }

    /**
     * POST /pos/shift/close/{session}
     */
    public function close(Request $request, CashRegisterSession $session): JsonResponse
    {
        if ($session->user_id !== auth()->id()) {
            return response()->json(['error' => 'غير مصرح'], 403);
        }

        if (! $session->isOpen()) {
            return response()->json(['error' => 'الوردية مغلقة بالفعل'], 422);
        }

        $validated = $request->validate([
            'actual_closing_balance' => 'required|numeric|min:0',
            'notes'                  => 'nullable|string|max:500',
        ]);

        $expected   = $session->getExpectedClosingBalance();
        $actual     = (float) $validated['actual_closing_balance'];
        $difference = $actual - $expected;

        $session->update([
            'closed_at'                => now(),
            'expected_closing_balance' => $expected,
            'actual_closing_balance'   => $actual,
            'difference'               => $difference,
            'notes'                    => $validated['notes'],
            'status'                   => 'closed',
        ]);

        app(AuditLogger::class)->log(
            'shift.closed',
            $session,
            ['status' => 'open'],
            [
                'status'     => 'closed',
                'expected'   => $expected,
                'actual'     => $actual,
                'difference' => $difference,
            ],
            'إقفال وردية صندوق' . ($difference != 0 ? " (فرق: {$difference})" : ' (لا يوجد فرق)'),
        );

        $zReport = $this->buildZReport($session->fresh());

        return response()->json([
            'success'  => true,
            'session'  => $session->fresh(),
            'z_report' => $zReport,
        ]);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function buildZReport(CashRegisterSession $session): array
    {
        $session->load('user', 'branch');

        $entries = $session->paymentEntries()
            ->with('paymentMethod', 'invoice.order')
            ->where('type', 'payment')
            ->get();

        $byMethod = $entries
            ->groupBy('payment_method_id')
            ->map(fn ($group) => [
                'method_name' => $group->first()->paymentMethod?->name ?? '—',
                'count'       => $group->count(),
                'total'       => round((float) $group->sum('amount'), 2),
            ])
            ->values();

        $orders = $entries->pluck('invoice.order')->filter()->unique('id');

        $byType = $orders
            ->groupBy('type')
            ->map(fn ($group, $type) => [
                'type'  => $type,
                'count' => $group->count(),
                'total' => round((float) $group->sum('total_amount'), 2),
            ])
            ->values();

        $invoiceIds = $entries->pluck('invoice_id')->filter()->unique();
        $taxSummary = InvoiceTax::whereIn('invoice_id', $invoiceIds)
            ->selectRaw('tax_name, tax_code, SUM(taxable_amount) as taxable_amount, SUM(tax_amount) as tax_amount')
            ->groupBy('tax_name', 'tax_code')
            ->get();

        return [
            'session' => [
                'user'             => $session->user->name,
                'branch'           => $session->branch->name,
                'opened_at'        => $session->opened_at,
                'closed_at'        => $session->closed_at,
                'duration_minutes' => $session->opened_at->diffInMinutes($session->closed_at),
            ],
            'sales_summary' => [
                'total_orders'       => $orders->count(),
                'total_revenue'      => round((float) $entries->sum('amount'), 2),
                'by_payment_method'  => $byMethod,
                'by_order_type'      => $byType,
            ],
            'cash_summary' => [
                'opening_balance'  => (float) $session->opening_balance,
                'cash_received'    => $session->cash_received,
                'expected_closing' => (float) $session->expected_closing_balance,
                'actual_closing'   => (float) $session->actual_closing_balance,
                'difference'       => (float) $session->difference,
            ],
            'tax_summary' => $taxSummary,
        ];
    }
}
