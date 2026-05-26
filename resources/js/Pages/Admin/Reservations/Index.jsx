import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import {
    CalendarDays, Clock, Users, Plus, AlertCircle,
    Phone, RotateCcw, Search, X, CalendarX,
} from 'lucide-react';
import { Button }       from '@/Components/ui/button';
import { Input }        from '@/Components/ui/input';
import { Label }        from '@/Components/ui/label';
import { Card }         from '@/Components/ui/card';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from '@/Components/ui/dialog';
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { cn } from '@/lib/utils';
import {
    RESERVATION_STATUSES,
    ALLOWED_TRANSITIONS,
    formatReservationTime,
} from '@/utils/reservationHelpers';

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ links }) {
    if (!links || links.length <= 3) return null;
    return (
        <div className="flex justify-center gap-1 flex-wrap">
            {links.map((link, i) =>
                link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        preserveState
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            link.active
                                ? 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50',
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white border border-slate-200"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ),
            )}
        </div>
    );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }) {
    const def = RESERVATION_STATUSES[status] ?? {
        label: status,
        color: 'bg-slate-100 text-slate-600',
    };
    return (
        <span className={cn(
            'px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap',
            def.color,
        )}>
            {def.label}
        </span>
    );
}

// ── Native select helper ──────────────────────────────────────────────────────

function NativeSelect({ value, onChange, className, children }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className={cn(
                'h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-slate-300',
                className,
            )}
        >
            {children}
        </select>
    );
}

// ── Dialog native textarea ────────────────────────────────────────────────────

function Textarea({ value, onChange, rows = 3, placeholder = '' }) {
    return (
        <textarea
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
        />
    );
}

// ── Dialog field select ───────────────────────────────────────────────────────

function FieldSelect({ value, onChange, children }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
        >
            {children}
        </select>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Index({
    reservations, filters, tables, branches,
    waitlistCount, todayCounts, settings,
}) {
    const { settings: appSettings } = usePage().props;
    const currency = appSettings?.currency ?? 'ILS';
    const today    = new Date().toISOString().split('T')[0];

    // ── Dialog state ─────────────────────────────────────────────────────────
    const [showCreate,    setShowCreate]    = useState(false);
    const [showStatus,    setShowStatus]    = useState(false);
    const [showEdit,      setShowEdit]      = useState(false);
    const [showReschedule,setShowReschedule]= useState(false);
    const [selected,      setSelected]      = useState(null);
    const [submitting,    setSubmitting]    = useState(false);

    // ── Create form ──────────────────────────────────────────────────────────
    const blankCreate = {
        customer_name: '', customer_phone: '', customer_id: '',
        party_size: 2, table_id: '', branch_id: '',
        reservation_date: today,
        reservation_time: '19:00',
        estimated_duration: settings.default_duration,
        deposit_amount: '', notes: '',
    };
    const [form, setForm] = useState(blankCreate);

    // ── Status form ──────────────────────────────────────────────────────────
    const [statusForm, setStatusForm] = useState({
        status: '', cancellation_reason: '', refund_deposit: false,
    });

    // ── Reschedule form ──────────────────────────────────────────────────────
    const [rescheduleForm, setRescheduleForm] = useState({
        reservation_date: '', reservation_time: '', table_id: '', notes: '',
    });

    // ── Edit form (reuses create form state) ─────────────────────────────────
    const openEdit = (r) => {
        setSelected(r);
        setForm({
            customer_name:      r.customer_name,
            customer_phone:     r.customer_phone ?? '',
            party_size:         r.party_size,
            reservation_date:   r.reservation_date,
            reservation_time:   r.reservation_time,
            estimated_duration: r.estimated_duration,
            notes:              r.notes ?? '',
            deposit_notes:      r.deposit_notes ?? '',
        });
        setShowEdit(true);
    };

    // ── Filters ──────────────────────────────────────────────────────────────
    const [search, setSearch] = useState(filters.search ?? '');

    const applyFilters = useCallback((newFilters) => {
        const params = { ...filters, ...newFilters };
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
        router.get(route('admin.reservations.index'), params, {
            preserveState: true,
            replace: true,
        });
    }, [filters]);

    const goToday = () => router.get(
        route('admin.reservations.index'),
        { date: today },
        { preserveState: true, replace: true },
    );

    const hasFilter = filters.search || filters.branch_id
        || filters.table_id || filters.status;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const submit = (routeName, params, onDone) => {
        setSubmitting(true);
        router.post(route(routeName, params.id ?? undefined), params.data, {
            onSuccess: () => { onDone(); setSubmitting(false); },
            onError:   () => setSubmitting(false),
        });
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AdminLayout title="الحجوزات">
            <Head title="الحجوزات" />

            {/* ── Page header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">الحجوزات</h1>
                    <p className="text-sm text-slate-500 mt-0.5">إدارة حجوزات الطاولات</p>
                </div>
                <Button onClick={() => { setForm(blankCreate); setShowCreate(true); }}>
                    <Plus size={16} className="ml-1" />
                    حجز جديد
                </Button>
            </div>

            {/* ── Summary pills ────────────────────────────────────────────── */}
            {Object.keys(todayCounts).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(RESERVATION_STATUSES).map(([key, val]) =>
                        todayCounts[key] > 0 ? (
                            <span
                                key={key}
                                className={cn(
                                    'px-3 py-1 rounded-full text-xs font-semibold',
                                    val.color,
                                )}
                            >
                                {val.label}: {todayCounts[key]}
                            </span>
                        ) : null,
                    )}
                </div>
            )}

            {/* ── Waitlist banner ───────────────────────────────────────────── */}
            {waitlistCount > 0 && (
                <div className="mb-4 flex items-center gap-3 bg-yellow-50 border
                                border-yellow-200 rounded-xl px-4 py-3
                                text-yellow-800 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>
                        يوجد <strong>{waitlistCount}</strong> حجز في قائمة الانتظار اليوم
                    </span>
                </div>
            )}

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap
                                gap-2.5 items-center bg-white">

                    {/* Date */}
                    <input
                        type="date"
                        value={filters.date ?? today}
                        onChange={e => applyFilters({ date: e.target.value })}
                        className="h-8 text-xs border border-slate-200 rounded-md px-2.5
                                   bg-white text-slate-600 focus:outline-none
                                   focus:ring-2 focus:ring-slate-300"
                    />

                    {/* Today button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={goToday}
                    >
                        <CalendarDays size={13} />
                        اليوم
                    </Button>

                    {/* Branch */}
                    <NativeSelect
                        value={filters.branch_id ?? ''}
                        onChange={e => applyFilters({ branch_id: e.target.value })}
                    >
                        <option value="">كل الفروع</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </NativeSelect>

                    {/* Table */}
                    <NativeSelect
                        value={filters.table_id ?? ''}
                        onChange={e => applyFilters({ table_id: e.target.value })}
                    >
                        <option value="">كل الطاولات</option>
                        {tables.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </NativeSelect>

                    {/* Status */}
                    <NativeSelect
                        value={filters.status ?? ''}
                        onChange={e => applyFilters({ status: e.target.value })}
                    >
                        <option value="">كل الحالات</option>
                        {Object.entries(RESERVATION_STATUSES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </NativeSelect>

                    {/* Search */}
                    <div className="relative">
                        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2
                                                     text-slate-400 pointer-events-none" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters({ search })}
                            placeholder="اسم أو هاتف..."
                            className="pr-8 w-44 h-8 text-xs border-slate-200
                                       placeholder:text-slate-400"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(''); applyFilters({ search: '' }); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2
                                           text-slate-400 hover:text-slate-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Clear */}
                    {hasFilter && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-slate-400 hover:text-slate-700
                                       hover:bg-slate-100 gap-1 px-2.5"
                            onClick={() => {
                                setSearch('');
                                router.get(
                                    route('admin.reservations.index'),
                                    { date: filters.date ?? today },
                                    { preserveState: true, replace: true },
                                );
                            }}
                        >
                            <X size={12} /> مسح
                        </Button>
                    )}
                </div>

                {/* ── Table ────────────────────────────────────────────────── */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                الوقت
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                العميل
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                الطاولة
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                الأشخاص
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                العربون
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                الحالة
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                الإجراءات
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reservations.data.map(r => (
                            <TableRow
                                key={r.id}
                                className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                            >
                                {/* الوقت */}
                                <TableCell>
                                    <div className="font-bold text-slate-700 font-sans">
                                        {formatReservationTime(r.reservation_time)}
                                    </div>
                                    <div className="text-xs text-slate-400 font-sans">
                                        {r.reservation_date}
                                    </div>
                                </TableCell>

                                {/* العميل */}
                                <TableCell>
                                    <div className="font-semibold text-slate-800 text-sm">
                                        {r.customer_name}
                                    </div>
                                    {r.customer_phone && (
                                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <Phone size={10} />
                                            {r.customer_phone}
                                        </div>
                                    )}
                                </TableCell>

                                {/* الطاولة */}
                                <TableCell className="text-sm text-slate-600">
                                    {r.table?.name ?? '—'}
                                </TableCell>

                                {/* الأشخاص */}
                                <TableCell>
                                    <div className="flex items-center gap-1 text-slate-600 text-sm">
                                        <Users size={13} />
                                        {r.party_size}
                                    </div>
                                </TableCell>

                                {/* العربون */}
                                <TableCell>
                                    {r.deposit_amount > 0 ? (
                                        <div>
                                            <div className="font-semibold font-sans text-sm text-slate-700">
                                                {Number(r.deposit_amount).toFixed(2)} ₪
                                            </div>
                                            <span className={cn(
                                                'text-xs font-bold',
                                                r.deposit_paid ? 'text-green-600' : 'text-red-500',
                                            )}>
                                                {r.deposit_paid ? 'مدفوع' : 'غير مدفوع'}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300">—</span>
                                    )}
                                </TableCell>

                                {/* الحالة */}
                                <TableCell>
                                    <StatusPill status={r.status} />
                                </TableCell>

                                {/* الإجراءات */}
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        {/* تغيير الحالة */}
                                        {(ALLOWED_TRANSITIONS[r.status]?.length ?? 0) > 0 && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs px-2.5"
                                                onClick={() => {
                                                    setSelected(r);
                                                    setStatusForm({
                                                        status: '',
                                                        cancellation_reason: '',
                                                        refund_deposit: false,
                                                    });
                                                    setShowStatus(true);
                                                }}
                                            >
                                                الحالة
                                            </Button>
                                        )}

                                        {/* تعديل */}
                                        {['confirmed', 'waitlist'].includes(r.status) && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs px-2.5"
                                                onClick={() => openEdit(r)}
                                            >
                                                تعديل
                                            </Button>
                                        )}

                                        {/* إعادة جدولة */}
                                        {['confirmed', 'waitlist'].includes(r.status) && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                title="إعادة جدولة"
                                                onClick={() => {
                                                    setSelected(r);
                                                    setRescheduleForm({
                                                        reservation_date: '',
                                                        reservation_time: '',
                                                        table_id: String(r.table_id),
                                                        notes: '',
                                                    });
                                                    setShowReschedule(true);
                                                }}
                                            >
                                                <RotateCcw size={13} />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}

                        {reservations.data.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="text-center py-20 text-slate-300"
                                >
                                    <CalendarX size={32} className="mx-auto mb-3 opacity-40" />
                                    <p className="font-semibold text-sm">
                                        لا توجد حجوزات لهذا اليوم
                                    </p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {reservations.links && reservations.links.length > 3 && (
                    <div className="px-5 py-4 border-t border-slate-100 space-y-3 bg-slate-50/40">
                        <Pagination links={reservations.links} />
                        <p className="text-center text-[11px] text-slate-400 font-semibold">
                            عرض {reservations.from ?? 0}–{reservations.to ?? 0} من{' '}
                            {reservations.total} حجز
                        </p>
                    </div>
                )}
            </Card>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* CREATE DIALOG                                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>حجز جديد</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        {/* الاسم */}
                        <div className="space-y-1.5">
                            <Label>اسم العميل *</Label>
                            <Input
                                value={form.customer_name}
                                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                                placeholder="اسم العميل"
                            />
                        </div>

                        {/* الهاتف */}
                        <div className="space-y-1.5">
                            <Label>رقم الهاتف</Label>
                            <Input
                                value={form.customer_phone}
                                onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                                placeholder="05xxxxxxxx"
                                dir="ltr"
                            />
                        </div>

                        {/* عدد الأشخاص */}
                        <div className="space-y-1.5">
                            <Label>عدد الأشخاص *</Label>
                            <Input
                                type="number"
                                min={1}
                                max={settings.max_party_size}
                                value={form.party_size}
                                onChange={e => setForm({
                                    ...form,
                                    party_size: parseInt(e.target.value) || 1,
                                })}
                            />
                        </div>

                        {/* الفرع + الطاولة */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>الفرع *</Label>
                                <FieldSelect
                                    value={form.branch_id}
                                    onChange={e => setForm({ ...form, branch_id: e.target.value })}
                                >
                                    <option value="">اختر الفرع</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </FieldSelect>
                            </div>
                            <div className="space-y-1.5">
                                <Label>الطاولة *</Label>
                                <FieldSelect
                                    value={form.table_id}
                                    onChange={e => setForm({ ...form, table_id: e.target.value })}
                                >
                                    <option value="">اختر الطاولة</option>
                                    {tables.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </FieldSelect>
                            </div>
                        </div>

                        {/* التاريخ + الوقت */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>التاريخ *</Label>
                                <Input
                                    type="date"
                                    min={today}
                                    value={form.reservation_date}
                                    onChange={e => setForm({
                                        ...form, reservation_date: e.target.value,
                                    })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>الوقت *</Label>
                                <Input
                                    type="time"
                                    value={form.reservation_time}
                                    onChange={e => setForm({
                                        ...form, reservation_time: e.target.value,
                                    })}
                                />
                            </div>
                        </div>

                        {/* المدة */}
                        <div className="space-y-1.5">
                            <Label>
                                المدة التقديرية (دقيقة)
                                <span className="text-slate-400 text-xs mr-1">
                                    افتراضي: {settings.default_duration}
                                </span>
                            </Label>
                            <Input
                                type="number"
                                min={30}
                                max={480}
                                value={form.estimated_duration}
                                onChange={e => setForm({
                                    ...form,
                                    estimated_duration: parseInt(e.target.value) || 90,
                                })}
                            />
                        </div>

                        {/* العربون */}
                        <div className="space-y-1.5">
                            <Label>
                                العربون (₪)
                                <span className="text-slate-400 text-xs mr-1">
                                    سيُضاف لمحفظة العميل — 0 = بدون عربون
                                </span>
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.deposit_amount}
                                placeholder="0.00"
                                dir="ltr"
                                onChange={e => setForm({ ...form, deposit_amount: e.target.value })}
                            />
                        </div>

                        {/* ملاحظات */}
                        <div className="space-y-1.5">
                            <Label>ملاحظات</Label>
                            <Textarea
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>
                            إلغاء
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={() => {
                                setSubmitting(true);
                                router.post(route('admin.reservations.store'), form, {
                                    onSuccess: () => { setShowCreate(false); setSubmitting(false); },
                                    onError:   () => setSubmitting(false),
                                });
                            }}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ الحجز'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* EDIT DIALOG                                                    */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent className="max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>تعديل الحجز</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        <div className="space-y-1.5">
                            <Label>اسم العميل *</Label>
                            <Input
                                value={form.customer_name}
                                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>رقم الهاتف</Label>
                            <Input
                                value={form.customer_phone}
                                onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>عدد الأشخاص *</Label>
                            <Input
                                type="number" min={1}
                                value={form.party_size}
                                onChange={e => setForm({
                                    ...form, party_size: parseInt(e.target.value) || 1,
                                })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>التاريخ *</Label>
                                <Input
                                    type="date"
                                    value={form.reservation_date}
                                    onChange={e => setForm({
                                        ...form, reservation_date: e.target.value,
                                    })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>الوقت *</Label>
                                <Input
                                    type="time"
                                    value={form.reservation_time}
                                    onChange={e => setForm({
                                        ...form, reservation_time: e.target.value,
                                    })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>المدة التقديرية (دقيقة)</Label>
                            <Input
                                type="number" min={30} max={480}
                                value={form.estimated_duration}
                                onChange={e => setForm({
                                    ...form,
                                    estimated_duration: parseInt(e.target.value) || 90,
                                })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>ملاحظات</Label>
                            <Textarea
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>ملاحظات العربون</Label>
                            <Textarea
                                value={form.deposit_notes ?? ''}
                                onChange={e => setForm({ ...form, deposit_notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEdit(false)}>
                            إلغاء
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={() => {
                                setSubmitting(true);
                                router.put(
                                    route('admin.reservations.update', selected.id),
                                    form,
                                    {
                                        onSuccess: () => { setShowEdit(false); setSubmitting(false); },
                                        onError:   () => setSubmitting(false),
                                    },
                                );
                            }}
                        >
                            {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* STATUS DIALOG                                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Dialog open={showStatus} onOpenChange={setShowStatus}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>تغيير حالة الحجز</DialogTitle>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-4 py-1">
                            {/* الحالة الحالية */}
                            <div className="bg-slate-50 rounded-xl p-3 text-sm flex items-center gap-2">
                                <span className="text-slate-500">الحالة الحالية:</span>
                                <StatusPill status={selected.status} />
                                <span className="text-slate-400 font-sans text-xs mr-auto">
                                    {selected.customer_name}
                                </span>
                            </div>

                            {/* أزرار التحويل */}
                            <div className="space-y-2">
                                <Label>تحويل إلى:</Label>
                                {(ALLOWED_TRANSITIONS[selected.status] ?? []).map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setStatusForm({ ...statusForm, status: st })}
                                        className={cn(
                                            'w-full py-2.5 rounded-xl border-2 text-sm font-bold transition-colors',
                                            statusForm.status === st
                                                ? 'border-[#ee1d23] bg-red-50 text-[#ee1d23]'
                                                : 'border-slate-200 text-slate-600 hover:border-slate-300',
                                        )}
                                    >
                                        {RESERVATION_STATUSES[st]?.label}
                                    </button>
                                ))}
                            </div>

                            {/* سبب الإلغاء */}
                            {statusForm.status === 'cancelled' && (
                                <div className="space-y-1.5">
                                    <Label>سبب الإلغاء *</Label>
                                    <Textarea
                                        value={statusForm.cancellation_reason}
                                        onChange={e => setStatusForm({
                                            ...statusForm,
                                            cancellation_reason: e.target.value,
                                        })}
                                        rows={2}
                                    />
                                </div>
                            )}

                            {/* استرداد العربون */}
                            {statusForm.status === 'cancelled' && selected.deposit_paid && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={statusForm.refund_deposit}
                                            onChange={e => setStatusForm({
                                                ...statusForm,
                                                refund_deposit: e.target.checked,
                                            })}
                                            className="w-4 h-4 accent-[#ee1d23]"
                                        />
                                        <span className="font-semibold text-yellow-800">
                                            استرداد العربون (
                                            {Number(selected.deposit_amount).toFixed(2)} ₪
                                            ) من المحفظة
                                        </span>
                                    </label>
                                    <p className="text-xs text-yellow-700 mt-1.5 pr-6">
                                        إذا لم تختر الاسترداد، يبقى العربون في المحفظة.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStatus(false)}>
                            إلغاء
                        </Button>
                        <Button
                            disabled={!statusForm.status || submitting}
                            onClick={() => {
                                setSubmitting(true);
                                router.post(
                                    route('admin.reservations.update-status', selected.id),
                                    statusForm,
                                    {
                                        onSuccess: () => {
                                            setShowStatus(false);
                                            setSubmitting(false);
                                        },
                                        onError: () => setSubmitting(false),
                                    },
                                );
                            }}
                        >
                            {submitting ? 'جاري التحديث...' : 'تأكيد التحويل'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* RESCHEDULE DIALOG                                              */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>إعادة جدولة الحجز</DialogTitle>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-4 py-1">
                            <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                                <span className="font-semibold">{selected.customer_name}</span>
                                {' — '}
                                {formatReservationTime(selected.reservation_time)}
                                {' '}
                                {selected.reservation_date}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>التاريخ الجديد *</Label>
                                    <Input
                                        type="date"
                                        min={today}
                                        value={rescheduleForm.reservation_date}
                                        onChange={e => setRescheduleForm({
                                            ...rescheduleForm,
                                            reservation_date: e.target.value,
                                        })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>الوقت الجديد *</Label>
                                    <Input
                                        type="time"
                                        value={rescheduleForm.reservation_time}
                                        onChange={e => setRescheduleForm({
                                            ...rescheduleForm,
                                            reservation_time: e.target.value,
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>الطاولة</Label>
                                <FieldSelect
                                    value={rescheduleForm.table_id}
                                    onChange={e => setRescheduleForm({
                                        ...rescheduleForm, table_id: e.target.value,
                                    })}
                                >
                                    {tables.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </FieldSelect>
                            </div>

                            <div className="space-y-1.5">
                                <Label>ملاحظات</Label>
                                <Textarea
                                    value={rescheduleForm.notes}
                                    onChange={e => setRescheduleForm({
                                        ...rescheduleForm, notes: e.target.value,
                                    })}
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReschedule(false)}>
                            إلغاء
                        </Button>
                        <Button
                            disabled={
                                !rescheduleForm.reservation_date
                                || !rescheduleForm.reservation_time
                                || submitting
                            }
                            onClick={() => {
                                setSubmitting(true);
                                router.post(
                                    route('admin.reservations.reschedule', selected.id),
                                    rescheduleForm,
                                    {
                                        onSuccess: () => {
                                            setShowReschedule(false);
                                            setSubmitting(false);
                                        },
                                        onError: () => setSubmitting(false),
                                    },
                                );
                            }}
                        >
                            {submitting ? 'جاري الحفظ...' : 'إعادة الجدولة'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
