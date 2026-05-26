import AdminLayout from '@/Layouts/AdminLayout';
import ReportDateFilter from '@/Components/Admin/ReportDateFilter';
import { Head, usePage } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
    Legend, CartesianGrid,
} from 'recharts';
import { RESERVATION_STATUSES } from '@/utils/reservationHelpers';

const STATUS_COLORS = {
    confirmed:   '#3b82f6',
    seated:      '#22c55e',
    completed:   '#94a3b8',
    cancelled:   '#ef4444',
    no_show:     '#f97316',
    rescheduled: '#a855f7',
    waitlist:    '#eab308',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, iconCls }) {
    return (
        <Card className="shadow-sm border-slate-200/80">
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        {label}
                    </p>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                        <Icon size={14} />
                    </div>
                </div>
                <p className="text-2xl font-black text-slate-800 font-sans leading-none">{value}</p>
                {sub && (
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>
                )}
            </CardContent>
        </Card>
    );
}

// ── Custom Pie Tooltip ────────────────────────────────────────────────────────
function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div className="bg-white border border-slate-200 shadow-md rounded-lg px-3 py-2 text-xs font-bold">
            <span className="text-slate-700">{name}: </span>
            <span className="text-slate-900 font-black font-sans">{value}</span>
        </div>
    );
}

// ── Custom Bar Tooltip ────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 shadow-md rounded-lg px-3 py-2 text-xs space-y-0.5">
            <p className="font-black text-slate-700 mb-1">{label}</p>
            {payload.map(p => (
                <div key={p.dataKey} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
                    <span className="text-slate-600">{p.name}:</span>
                    <span className="font-black font-sans text-slate-800">{p.value}</span>
                </div>
            ))}
        </div>
    );
}

// ── Completion Rate Badge ─────────────────────────────────────────────────────
function RateBadge({ rate }) {
    const cls = rate >= 80
        ? 'text-green-700 bg-green-100'
        : rate >= 50
            ? 'text-amber-700 bg-amber-100'
            : 'text-red-700 bg-red-100';
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black font-sans ${cls}`}>
            {rate}%
        </span>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReservationsReport({ filters, kpi, by_status, by_day, by_hour, by_table }) {
    const { settings } = usePage().props;
    const currency     = settings?.currency ?? 'ILS';

    // Status pie data
    const pieData = Object.entries(by_status ?? {}).map(([status, count]) => ({
        name:  RESERVATION_STATUSES[status]?.label ?? status,
        value: Number(count),
        color: STATUS_COLORS[status] ?? '#94a3b8',
    }));

    // Daily bar data — format dates
    const barDayData = (by_day ?? []).map(r => ({
        ...r,
        label: new Date(r.date + 'T00:00:00').toLocaleDateString('ar-SA', {
            day: '2-digit', month: '2-digit',
        }),
    }));

    // Peak-hours — highlight top 3
    const top3Hours = [...(by_hour ?? [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(h => h.hour);

    const isEmpty = kpi.total === 0;

    return (
        <AdminLayout title="تقرير الحجوزات">
            <Head title="تقرير الحجوزات" />

            {/* Date filter */}
            <ReportDateFilter filters={filters} routeName="admin.reports.reservations" />

            {/* Empty state */}
            {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <CalendarDays size={56} className="opacity-20 mb-4" />
                    <p className="text-base font-bold">لا توجد بيانات حجوزات للفترة المحددة</p>
                </div>
            ) : (
                <div className="space-y-6 mt-5">

                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <KpiCard
                            label="إجمالي الحجوزات"
                            value={kpi.total}
                            icon={CalendarDays}
                            iconCls="bg-blue-100 text-blue-600"
                        />
                        <KpiCard
                            label="معدل الإتمام"
                            value={`${kpi.completion_rate}%`}
                            sub={`${kpi.completed} مكتمل`}
                            icon={CheckCircle2}
                            iconCls="bg-green-100 text-green-600"
                        />
                        <KpiCard
                            label="معدل عدم الحضور"
                            value={`${kpi.no_show_rate}%`}
                            sub={`${kpi.no_show} حالة`}
                            icon={XCircle}
                            iconCls={kpi.no_show_rate > 10
                                ? 'bg-red-100 text-red-600'
                                : 'bg-slate-100 text-slate-500'}
                        />
                        <KpiCard
                            label="العربونات المحصّلة"
                            value={`${kpi.total_deposits} ₪`}
                            sub={`${kpi.deposits_count} حجز بعربون`}
                            icon={Wallet}
                            iconCls="bg-emerald-100 text-emerald-600"
                        />
                    </div>

                    {/* ── Status Distribution + Daily Trend ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Status Pie */}
                        <Card className="shadow-sm border-slate-200/80">
                            <CardContent className="p-5">
                                <h3 className="text-sm font-black text-slate-700 mb-4">
                                    توزيع الحالات
                                </h3>
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="45%"
                                                outerRadius={75}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={entry.color}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PieTooltip />} />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={v => (
                                                    <span className="text-xs font-bold text-slate-600">{v}</span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-slate-400 text-sm py-10">لا توجد بيانات</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Daily Trend */}
                        <Card className="shadow-sm border-slate-200/80">
                            <CardContent className="p-5">
                                <h3 className="text-sm font-black text-slate-700 mb-4">
                                    الحجوزات اليومية
                                </h3>
                                {barDayData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart
                                            data={barDayData}
                                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                axisLine={false}
                                                tickLine={false}
                                                allowDecimals={false}
                                            />
                                            <Tooltip content={<BarTooltip />} />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={v => (
                                                    <span className="text-xs font-bold text-slate-600">{v}</span>
                                                )}
                                            />
                                            <Bar dataKey="completed" name="مكتمل"  stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
                                            <Bar dataKey="no_shows"  name="لم يحضر" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                                            <Bar dataKey="other"     name="أخرى"   stackId="a" fill="#94a3b8" radius={[4,4,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-slate-400 text-sm py-10">لا توجد بيانات</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Peak Hours ── */}
                    <Card className="shadow-sm border-slate-200/80">
                        <CardContent className="p-5">
                            <div className="flex items-baseline gap-3 mb-4">
                                <h3 className="text-sm font-black text-slate-700">أوقات الذروة</h3>
                                {kpi.peak_hour && (
                                    <span className="text-xs text-slate-400 font-medium">
                                        الأكثر ازدحاماً: <span className="font-black text-slate-600 font-sans">{kpi.peak_hour}</span>
                                    </span>
                                )}
                            </div>
                            {(by_hour ?? []).length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart
                                        data={by_hour}
                                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            formatter={(v) => [v, 'الحجوزات']}
                                            labelFormatter={(l) => `الساعة ${l}`}
                                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                        />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {(by_hour ?? []).map((entry) => (
                                                <Cell
                                                    key={entry.hour}
                                                    fill={top3Hours.includes(entry.hour) ? '#ee1d23' : '#94a3b8'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-slate-400 text-sm py-8">لا توجد بيانات</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── By Table ── */}
                    {(by_table ?? []).length > 0 && (
                        <Card className="shadow-sm border-slate-200/80">
                            <CardContent className="p-5">
                                <h3 className="text-sm font-black text-slate-700 mb-4">أداء الطاولات</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-right">الطاولة</TableHead>
                                            <TableHead className="text-center font-sans">الإجمالي</TableHead>
                                            <TableHead className="text-center font-sans">مكتمل</TableHead>
                                            <TableHead className="text-center font-sans">لم يحضر</TableHead>
                                            <TableHead className="text-center font-sans">ملغي</TableHead>
                                            <TableHead className="text-center">معدل الإتمام</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(by_table ?? []).slice(0, 10).map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-bold text-slate-700">
                                                    {row.table_name}
                                                </TableCell>
                                                <TableCell className="text-center font-sans font-black text-slate-800">
                                                    {row.total}
                                                </TableCell>
                                                <TableCell className="text-center font-sans text-green-600 font-bold">
                                                    {row.completed}
                                                </TableCell>
                                                <TableCell className="text-center font-sans text-orange-500 font-bold">
                                                    {row.no_shows}
                                                </TableCell>
                                                <TableCell className="text-center font-sans text-red-500 font-bold">
                                                    {row.cancelled}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <RateBadge rate={row.completion_rate} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {(by_table ?? []).length > 10 && (
                                    <p className="text-center text-xs text-slate-400 mt-3 font-medium">
                                        يُعرض أول 10 طاولات من أصل {by_table.length}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            )}
        </AdminLayout>
    );
}
