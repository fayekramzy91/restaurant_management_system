<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Reservation;
use App\Models\Setting;
use App\Models\Table;
use App\Models\WalletTransaction;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        $date     = $request->get('date', today()->toDateString());
        $branchId = $request->get('branch_id');
        $tableId  = $request->get('table_id');
        $status   = $request->get('status');
        $search   = $request->get('search');

        $reservations = Reservation::with([
                'customer:id,name,phone',
                'table:id,name',
                'branch:id,name',
                'reservedBy:id,name',
                'order:id,status',
            ])
            ->when($date, fn ($q) =>
                $q->whereDate('reservation_date', $date))
            ->when($branchId, fn ($q) =>
                $q->where('branch_id', $branchId))
            ->when($tableId, fn ($q) =>
                $q->where('table_id', $tableId))
            ->when($status, fn ($q) =>
                $q->where('status', $status))
            ->when($search, fn ($q) =>
                $q->where(fn ($q2) => $q2
                    ->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                ))
            ->orderBy('reservation_date')
            ->orderBy('reservation_time')
            ->paginate(20)
            ->withQueryString();

        $waitlistCount = Reservation::today()
            ->where('status', 'waitlist')->count();

        $todayCounts = Reservation::today()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return Inertia::render('Admin/Reservations/Index', [
            'reservations'  => $reservations,
            'filters'       => $request->only([
                'date', 'branch_id', 'table_id', 'status', 'search',
            ]),
            'waitlistCount' => $waitlistCount,
            'todayCounts'   => $todayCounts,
            'tables'        => Table::with('area:id,name')->orderBy('name')->get(),
            'branches'      => Branch::orderBy('name')->get(),
            'settings'      => [
                'default_duration' => Setting::getValue('reservation.default_duration', 90),
                'max_party_size'   => Setting::getValue('reservation.max_party_size', 20),
                'reminder_minutes' => Setting::getValue('reservation.reminder_minutes', 30),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name'      => 'required|string|max:255',
            'customer_phone'     => 'nullable|string|max:30',
            'customer_id'        => 'nullable|exists:customers,id',
            'party_size'         => [
                'required', 'integer', 'min:1',
                'max:' . Setting::getValue('reservation.max_party_size', 20),
            ],
            'table_id'           => 'required|exists:tables,id',
            'branch_id'          => 'required|exists:branches,id',
            'reservation_date'   => 'required|date|after_or_equal:today',
            'reservation_time'   => 'required|date_format:H:i',
            'estimated_duration' => 'nullable|integer|min:30|max:480',
            'deposit_amount'     => 'nullable|numeric|min:0',
            'notes'              => 'nullable|string|max:1000',
        ]);

        $hasActive = Reservation::where('table_id', $validated['table_id'])
            ->whereDate('reservation_date', $validated['reservation_date'])
            ->whereIn('status', ['confirmed', 'seated'])
            ->exists();

        $status = $hasActive ? 'waitlist' : 'confirmed';

        $reservation = DB::transaction(function () use ($validated, $status) {
            $reservation = Reservation::create([
                ...$validated,
                'reserved_by'        => auth()->id(),
                'status'             => $status,
                'estimated_duration' => $validated['estimated_duration']
                    ?? Setting::getValue('reservation.default_duration', 90),
                'deposit_amount'     => $validated['deposit_amount'] ?? 0,
            ]);

            if (($reservation->deposit_amount > 0) && $reservation->customer_id) {
                $customer = Customer::find($reservation->customer_id);
                $customer->increment('wallet_balance', $reservation->deposit_amount);
                $customer->update(['wallet_last_updated_at' => now()]);

                WalletTransaction::create([
                    'customer_id'    => $customer->id,
                    'type'           => 'credit',
                    'amount'         => $reservation->deposit_amount,
                    'balance_after'  => $customer->fresh()->wallet_balance,
                    'reason'         => 'reservation_deposit',
                    'reference_type' => Reservation::class,
                    'reference_id'   => $reservation->id,
                    'notes'          => "عربون حجز #{$reservation->id}",
                    'created_by'     => auth()->id(),
                ]);

                $reservation->update(['deposit_paid' => true]);
            }

            app(AuditLogger::class)->log(
                'reservation.created',
                $reservation,
                [],
                [
                    'status'   => $status,
                    'table_id' => $reservation->table_id,
                    'date'     => $reservation->reservation_date,
                ],
                "حجز جديد: {$reservation->customer_name}"
            );

            return $reservation;
        });

        $message = $status === 'waitlist'
            ? 'تمت الإضافة لقائمة الانتظار'
            : 'تم تأكيد الحجز بنجاح';

        return redirect()
            ->route('admin.reservations.index')
            ->with('success', $message);
    }

    public function update(Request $request, Reservation $reservation)
    {
        if (!$reservation->isEditable()) {
            return back()->withErrors(['error' => 'لا يمكن تعديل هذا الحجز']);
        }

        $validated = $request->validate([
            'customer_name'      => 'required|string|max:255',
            'customer_phone'     => 'nullable|string|max:30',
            'party_size'         => 'required|integer|min:1',
            'reservation_date'   => 'required|date',
            'reservation_time'   => 'required|date_format:H:i',
            'estimated_duration' => 'nullable|integer|min:30|max:480',
            'notes'              => 'nullable|string|max:1000',
            'deposit_notes'      => 'nullable|string|max:500',
        ]);

        $reservation->update($validated);

        return back()->with('success', 'تم تحديث الحجز');
    }

    public function updateStatus(Request $request, Reservation $reservation)
    {
        $validated = $request->validate([
            'status'              => 'required|in:confirmed,seated,completed,cancelled,no_show',
            'cancellation_reason' => 'required_if:status,cancelled|nullable|string|max:500',
            'refund_deposit'      => 'nullable|boolean',
        ]);

        $allowedFrom = [
            'confirmed' => ['seated', 'cancelled', 'no_show'],
            'seated'    => ['completed', 'cancelled'],
            'waitlist'  => ['confirmed'],
        ];

        $allowed = $allowedFrom[$reservation->status] ?? [];
        if (!in_array($validated['status'], $allowed)) {
            return back()->withErrors(['error' => 'هذا التحويل غير مسموح به']);
        }

        DB::transaction(function () use ($reservation, $validated) {
            $oldStatus = $reservation->status;
            $newStatus = $validated['status'];

            if ($newStatus === 'seated') {
                Table::find($reservation->table_id)?->update(['status' => 'occupied']);

                if ($reservation->order_id) {
                    $reservation->order?->update(['status' => 'pending']);
                }
            }

            if (in_array($newStatus, ['completed', 'cancelled'])) {
                if ($oldStatus === 'seated') {
                    Table::find($reservation->table_id)?->update(['status' => 'available']);
                }
            }

            if ($newStatus === 'cancelled'
                && $reservation->deposit_paid
                && ($validated['refund_deposit'] ?? false)) {

                $customer = $reservation->customer;
                if ($customer) {
                    $customer->decrement('wallet_balance', $reservation->deposit_amount);
                    $customer->update(['wallet_last_updated_at' => now()]);

                    WalletTransaction::create([
                        'customer_id'    => $customer->id,
                        'type'           => 'debit',
                        'amount'         => $reservation->deposit_amount,
                        'balance_after'  => $customer->fresh()->wallet_balance,
                        'reason'         => 'reservation_deposit_refund',
                        'reference_type' => Reservation::class,
                        'reference_id'   => $reservation->id,
                        'notes'          => "استرداد عربون حجز #{$reservation->id}",
                        'created_by'     => auth()->id(),
                    ]);
                }
            }

            $reservation->update([
                'status'              => $newStatus,
                'cancellation_reason' => $validated['cancellation_reason'] ?? null,
            ]);

            app(AuditLogger::class)->log(
                'reservation.status_changed',
                $reservation,
                ['status' => $oldStatus],
                ['status' => $newStatus],
                "تغيير حالة الحجز: {$reservation->customer_name} ({$oldStatus} → {$newStatus})"
            );
        });

        return back()->with('success', 'تم تحديث الحالة');
    }

    public function reschedule(Request $request, Reservation $reservation)
    {
        $validated = $request->validate([
            'reservation_date' => 'required|date|after_or_equal:today',
            'reservation_time' => 'required|date_format:H:i',
            'table_id'         => 'required|exists:tables,id',
            'notes'            => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($reservation, $validated) {
            $hasConflict = Reservation::where('table_id', $validated['table_id'])
                ->whereDate('reservation_date', $validated['reservation_date'])
                ->whereIn('status', ['confirmed', 'seated'])
                ->exists();

            $newStatus = $hasConflict ? 'waitlist' : 'confirmed';

            $newReservation = Reservation::create([
                'customer_id'        => $reservation->customer_id,
                'customer_name'      => $reservation->customer_name,
                'customer_phone'     => $reservation->customer_phone,
                'party_size'         => $reservation->party_size,
                'table_id'           => $validated['table_id'],
                'branch_id'          => $reservation->branch_id,
                'reserved_by'        => auth()->id(),
                'reservation_date'   => $validated['reservation_date'],
                'reservation_time'   => $validated['reservation_time'],
                'estimated_duration' => $reservation->estimated_duration,
                'deposit_amount'     => $reservation->deposit_amount,
                'deposit_paid'       => $reservation->deposit_paid,
                'notes'              => $validated['notes'],
                'rescheduled_from_id'=> $reservation->id,
                'status'             => $newStatus,
            ]);

            $reservation->update(['status' => 'rescheduled']);

            app(AuditLogger::class)->log(
                'reservation.rescheduled',
                $newReservation,
                ['reservation_id' => $reservation->id],
                [
                    'new_date'  => $validated['reservation_date'],
                    'new_time'  => $validated['reservation_time'],
                    'new_table' => $validated['table_id'],
                ],
                "إعادة جدولة: {$reservation->customer_name}"
            );
        });

        return redirect()
            ->route('admin.reservations.index')
            ->with('success', 'تمت إعادة الجدولة بنجاح');
    }

    public function markReminded(Reservation $reservation)
    {
        $reservation->update(['reminded_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function upcoming()
    {
        $minutes = (int) Setting::getValue('reservation.reminder_minutes', 30);

        $upcoming = Reservation::with('table:id,name', 'branch:id,name')
            ->where('status', 'confirmed')
            ->whereDate('reservation_date', today())
            ->whereTime('reservation_time', '<=', now()->addMinutes($minutes)->format('H:i'))
            ->whereTime('reservation_time', '>=', now()->format('H:i'))
            ->whereNull('reminded_at')
            ->get()
            ->map(fn ($r) => [
                'id'               => $r->id,
                'customer_name'    => $r->customer_name,
                'reservation_time' => $r->reservation_time,
                'table'            => $r->table?->name,
                'branch'           => $r->branch?->name,
                'party_size'       => $r->party_size,
                'minutes_until'    => $r->minutesUntil(),
            ]);

        return response()->json(['reservations' => $upcoming]);
    }
}
