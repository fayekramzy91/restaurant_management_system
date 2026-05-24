import AdminLayout from '@/Layouts/AdminLayout';
import ReportDateFilter from '@/Components/Admin/ReportDateFilter';
import { Head, router, usePage } from '@inertiajs/react';
import { AlarmClock, Banknote, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { cn } from '@/lib/utils';

const CURRENCY_SYMBOLS = { ILS: '₪', USD: '$', SAR: 'ر.س', EUR: '€' };

function fmt(value, currency = 'ILS') {
    if (value === null || value === undefined) return '—';
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${Number(value).toFixed(2)} ${symbol}`;
}

function fmtDuration(minutes) {
    if (minutes === null || minutes === undefined) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}س ${m}د` : `${m}د`;
}

function fmtDatetime(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('ar-SA', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, iconCls, alert }) {
    return (
        <Card className={cn('shadow-sm border-slate-200/80', alert && 'border-red-200')}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                        <Icon size={14} />
                    </div>
                </div>
                <p className={cn('text-2xl font-black font-sans leading-none', alert ? 'text-red-600' : 'text-slate-800')}>
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}

// ── Difference cell ───────────────────────────────────────────────────────────
function DifferenceCell({ diff, currency }) {
    if (diff === null || diff === undefined) return <TableCell className="text-slate-300 text-center">—</TableCell>;
    if (diff === 0) return <TableCell className="text-center"><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">مطابق</span></TableCell>;
    if (diff > 0)   return <TableCell className="text-start font-sans font-bold text-blue-600">+{fmt(diff, currency)}</TableCell>;
    return              <TableCell className="text-start font-sans font-bold text-red-600">{fmt(diff, currency)}</TableCell>;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    return status === 'open'
        ? <Badge className="bg-amber-100 text-amber-700 border-0 text-xs font-bold">مفتوحة</Badge>
        : <Badge className="bg-slate-100 text-slate-500 border-0 text-xs font-bold">مغلقة</Badge>;
}

// ── Secondary filters (user + status) ────────────────────────────────────────
function ShiftFilters({ filters, users }) {
    const navigate = (overrides) => {
        const p = {
            preset:    filters.preset,
            date_from: filters.date_from,
            date_to:   filters.date_to,
            user_id:   filters.user_id,
            status:    filters.status,
            ...overrides,
        };
        Object.keys(p).forEach(k => (p[k] === '' || p[k] === null || p[k] === undefined) && delete p[k]);
        router.get(route('admin.reports.shifts'), p, { preserveState: true, replace: true });
    };

    return (
        <Card className="shadow-sm border-slate-200/80 mb-5">
            <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* User filter */}
                    <select
                        value={filters.user_id ?? ''}
                        onChange={e => navigate({ user_id: e.target.value })}
                        className="h-8 text-xs border border-slate-200 rounded-md px-2 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#ee1d23]"
                    >
                        <option value="">جميع الكاشيرين</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>

                    {/* Status filter */}
                    <select
                        value={filters.status ?? ''}
                        onChange={e => navigate({ status: e.target.value })}
                        className="h-8 text-xs border border-slate-200 rounded-md px-2 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#ee1d23]"
                    >
                        <option value="">جميع الحالات</option>
                        <option value="open">مفتوحة</option>
                        <option value="closed">مغلقة</option>
                    </select>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ShiftReport({ filters, sessions, kpi, users }) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'ILS';

    return (
        <AdminLayout title="تقرير الورديات">
            <Head title="تقرير الورديات" />

            <ReportDateFilter
                filters={filters}
                routeName="admin.reports.shifts"
                extra={{ user_id: filters.user_id, status: filters.status }}
            />

            <ShiftFilters filters={filters} users={users} />

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <KpiCard
                    label="عدد الورديات"
                    value={kpi.total_sessions}
                    icon={AlarmClock}
                    iconCls="bg-blue-50 text-blue-500"
                />
                <KpiCard
                    label="إجمالي المبيعات النقدية"
                    value={fmt(kpi.total_cash_sales, currency)}
                    icon={Banknote}
                    iconCls="bg-emerald-50 text-emerald-500"
                />
                <KpiCard
                    label="ورديات بعجز"
                    value={kpi.sessions_with_shortage}
                    icon={AlertTriangle}
                    iconCls={kpi.sessions_with_shortage > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}
                    alert={kpi.sessions_with_shortage > 0}
                />
            </div>

            {/* Sessions table */}
            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-700 text-sm">سجل الورديات</h3>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                                <TableHead className="text-xs font-semibold text-slate-400">الكاشير</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-400">الفرع</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-400">بداية الوردية</TableHead>
                                <TableHead className="text-center text-xs font-semibold text-slate-400">المدة</TableHead>
                                <TableHead className="text-start text-xs font-semibold text-slate-400">المبيعات النقدية</TableHead>
                                <TableHead className="text-start text-xs font-semibold text-slate-400">الرصيد المتوقع</TableHead>
                                <TableHead className="text-start text-xs font-semibold text-slate-400">الرصيد الفعلي</TableHead>
                                <TableHead className="text-center text-xs font-semibold text-slate-400">الفرق</TableHead>
                                <TableHead className="text-center text-xs font-semibold text-slate-400">الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-10 text-slate-300 text-sm">
                                        لا توجد ورديات في هذه الفترة
                                    </TableCell>
                                </TableRow>
                            ) : sessions.map(s => (
                                <TableRow key={s.id} className="border-slate-100 hover:bg-slate-50/50">
                                    <TableCell className="font-semibold text-sm text-slate-700">{s.user}</TableCell>
                                    <TableCell className="text-sm text-slate-600">{s.branch}</TableCell>
                                    <TableCell className="text-xs text-slate-500 font-mono">{fmtDatetime(s.opened_at)}</TableCell>
                                    <TableCell className="text-center text-xs font-sans text-slate-600">{fmtDuration(s.duration_minutes)}</TableCell>
                                    <TableCell className="text-start font-sans font-semibold text-slate-700">{fmt(s.cash_sales, currency)}</TableCell>
                                    <TableCell className="text-start font-sans text-slate-500">{fmt(s.expected_closing, currency)}</TableCell>
                                    <TableCell className="text-start font-sans text-slate-500">{fmt(s.actual_closing, currency)}</TableCell>
                                    <DifferenceCell diff={s.difference} currency={currency} />
                                    <TableCell className="text-center"><StatusBadge status={s.status} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </AdminLayout>
    );
}
