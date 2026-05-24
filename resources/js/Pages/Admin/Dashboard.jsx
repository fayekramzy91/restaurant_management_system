import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    TrendingUp, ShoppingCart, Clock, Users, AlertTriangle,
    XCircle, Store, Utensils, Settings, BarChart2, ArrowLeft,
    CheckCircle2, Timer, Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n, currency) {
    return `${Number(n ?? 0).toFixed(2)} ${currency}`;
}

/** Format 0-23 hour integer as Arabic AM/PM label */
function hourLabel(h) {
    const period = h < 12 ? 'ص' : 'م';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}${period}`;
}

// ── Alert bar ────────────────────────────────────────────────────────────────

function AlertBar({ alerts }) {
    if (!alerts.length) return null;
    return (
        <div className="space-y-2 mb-5">
            {alerts.map((alert, i) => (
                <div
                    key={i}
                    className={cn(
                        'flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold border',
                        alert.type === 'danger'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700',
                    )}
                >
                    <div className="flex items-center gap-2">
                        {alert.type === 'danger'
                            ? <XCircle size={15} className="shrink-0" />
                            : <AlertTriangle size={15} className="shrink-0" />}
                        <span>{alert.message}</span>
                    </div>
                    <Link
                        href={alert.href}
                        className={cn(
                            'shrink-0 text-xs font-bold flex items-center gap-1 hover:underline',
                            alert.type === 'danger' ? 'text-red-700' : 'text-amber-700',
                        )}
                    >
                        عرض <ArrowLeft size={11} />
                    </Link>
                </div>
            ))}
        </div>
    );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconCls, label, value, sub, href }) {
    return (
        <Card className="shadow-sm border-slate-200/80 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                        {label}
                    </p>
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconCls)}>
                        <Icon size={16} />
                    </div>
                </div>
                <p className="text-2xl font-black text-slate-800 font-sans leading-tight mb-1">{value}</p>
                {sub && <p className="text-[11px] text-slate-400 leading-snug">{sub}</p>}
                {href && (
                    <Link
                        href={href}
                        className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-[#ee1d23] transition-colors"
                    >
                        عرض التفاصيل <ArrowLeft size={10} />
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}

// ── Order type badge ──────────────────────────────────────────────────────────

function TypeBadge({ type }) {
    const map = {
        dine_in:  { label: 'داخلي',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        takeaway: { label: 'تيك أواي', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        delivery: { label: 'توصيل',    cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    };
    const { label, cls } = map[type] ?? { label: type, cls: 'bg-slate-50 text-slate-500 border-slate-200' };
    return (
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', cls)}>
            {label}
        </span>
    );
}

// ── Order status badge ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const map = {
        pending:   { label: 'معلق',         cls: 'bg-slate-100 text-slate-500 border-slate-200' },
        preparing: { label: 'قيد التحضير',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        ready:     { label: 'جاهز',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    };
    const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-400 border-slate-200' };
    return (
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', cls)}>
            {label}
        </span>
    );
}

// ── Age chip ─────────────────────────────────────────────────────────────────

function AgeBadge({ minutes }) {
    const m = Number(minutes ?? 0);
    const cls = m < 15
        ? 'text-emerald-600'
        : m <= 30
        ? 'text-amber-600'
        : 'text-red-600 font-bold';
    return (
        <span className={cn('font-sans text-xs', cls)}>
            {m} د{m > 30 ? ' ⚠' : ''}
        </span>
    );
}

// ── Hourly sparkline tooltip ──────────────────────────────────────────────────

function SparkTooltip({ active, payload, currency }) {
    if (!active || !payload?.length) return null;
    const { hour, revenue } = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md text-xs">
            <p className="font-semibold text-slate-600">{hourLabel(hour)}</p>
            <p className="font-black text-slate-800 font-sans">{formatCurrency(revenue, currency)}</p>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard({ kpi, active_orders, open_shifts, hourly_revenue, alerts }) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'ILS';

    const QUICK_LINKS = [
        { label: 'إدارة الطلبات', href: route('admin.orders.index'),      icon: ShoppingCart },
        { label: 'قائمة الطعام',  href: route('admin.menu-items.index'),  icon: Utensils },
        { label: 'التقارير',      href: route('admin.reports.dashboard'), icon: BarChart2 },
        { label: 'الورديات',      href: route('admin.reports.shifts'),    icon: Timer },
        { label: 'الإعدادات',     href: route('admin.settings.index'),    icon: Settings },
    ];

    return (
        <AdminLayout title="لوحة التحكم">
            <Head title="لوحة التحكم" />

            {/* ── Alerts ── */}
            <AlertBar alerts={alerts} />

            {/* ── Financial KPI row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <KpiCard
                    icon={TrendingUp}
                    iconCls="bg-emerald-50 text-emerald-600"
                    label="إيراد اليوم"
                    value={formatCurrency(kpi.today_revenue, currency)}
                    sub={`ضريبة: ${Number(kpi.today_tax).toFixed(2)} | خصم: ${Number(kpi.today_discount).toFixed(2)}`}
                    href={route('admin.reports.dashboard')}
                />
                <KpiCard
                    icon={ShoppingCart}
                    iconCls="bg-blue-50 text-blue-600"
                    label="طلبات اليوم"
                    value={kpi.orders_today}
                    sub={`${kpi.completed_today} مكتمل`}
                    href={route('admin.orders.index')}
                />
                <KpiCard
                    icon={Clock}
                    iconCls={kpi.pending_orders > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}
                    label="قيد التنفيذ الآن"
                    value={kpi.pending_orders}
                    sub="طلبات نشطة"
                    href={route('admin.orders.index')}
                />
                <KpiCard
                    icon={Users}
                    iconCls="bg-violet-50 text-violet-600"
                    label="إجمالي الزبائن"
                    value={kpi.customers}
                    sub={`${kpi.available_items} صنف متاح`}
                    href={route('admin.customers.index')}
                />
            </div>

            {/* ── Two-column body ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* ── LEFT: Active orders (65%) ── */}
                <div className="xl:col-span-2">
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden h-full">
                        <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-2.5">
                            <ShoppingCart size={15} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-700 text-sm">الطلبات النشطة</h3>
                            <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">
                                {active_orders.length}
                            </span>
                        </div>

                        {active_orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <CheckCircle2 size={28} className="text-emerald-400 mb-2.5" />
                                <p className="text-sm font-semibold text-slate-400">لا توجد طلبات نشطة حالياً</p>
                                <p className="text-xs text-slate-300 mt-0.5">جميع الطلبات مكتملة ✓</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/60">
                                            {['#', 'النوع', 'الطاولة', 'الفرع', 'المدة', 'الحالة', 'الإجمالي'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {active_orders.map(order => (
                                            <tr
                                                key={order.id}
                                                className="hover:bg-slate-50/60 transition-colors group"
                                            >
                                                <td className="px-4 py-2.5 font-sans text-xs text-slate-400">
                                                    <Link
                                                        href={route('admin.orders.show', order.id)}
                                                        className="hover:text-[#ee1d23] transition-colors font-semibold"
                                                    >
                                                        #{order.id}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <TypeBadge type={order.type} />
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-500 text-xs">
                                                    {order.table ?? <span className="text-slate-200">—</span>}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[120px] truncate">
                                                    {order.branch ?? <span className="text-slate-200">—</span>}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <AgeBadge minutes={order.age_minutes} />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <StatusBadge status={order.status} />
                                                </td>
                                                <td className="px-4 py-2.5 font-sans font-semibold text-slate-700 text-xs whitespace-nowrap">
                                                    {Number(order.total ?? 0).toFixed(2)}
                                                    <span className="text-slate-300 font-normal mr-0.5">{currency}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* ── RIGHT column (35%) ── */}
                <div className="space-y-4">

                    {/* Open shifts */}
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-2.5">
                            <Timer size={15} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-700 text-sm">الورديات المفتوحة</h3>
                            {open_shifts.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-600 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">
                                    {open_shifts.length}
                                </span>
                            )}
                        </div>
                        <div className="p-4 space-y-2">
                            {open_shifts.length === 0 ? (
                                <p className="text-xs text-slate-300 text-center py-4">لا توجد ورديات مفتوحة</p>
                            ) : open_shifts.map(shift => (
                                <div
                                    key={shift.id}
                                    className="border border-slate-100 rounded-lg p-3 border-r-4 border-r-emerald-400 bg-emerald-50/30"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                            <Users size={12} className="text-slate-400" />
                                            {shift.user}
                                        </span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Store size={11} className="text-slate-300" />
                                            {shift.branch}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-sans">
                                        منذ {shift.duration_minutes} دقيقة
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Hourly revenue sparkline */}
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-2.5">
                            <TrendingUp size={15} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-700 text-sm">الإيراد بالساعة اليوم</h3>
                        </div>
                        <div className="p-4">
                            {hourly_revenue.length === 0 ? (
                                <p className="text-xs text-slate-300 text-center py-6">لا توجد مبيعات بعد اليوم</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={120}>
                                    <AreaChart data={hourly_revenue} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#ee1d23" stopOpacity={0.18} />
                                                <stop offset="95%" stopColor="#ee1d23" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="hour"
                                            tickFormatter={hourLabel}
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickCount={3}
                                        />
                                        <Tooltip content={<SparkTooltip currency={currency} />} />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#ee1d23"
                                            strokeWidth={2}
                                            fill="url(#revenueGrad)"
                                            dot={false}
                                            activeDot={{ r: 4, fill: '#ee1d23' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>

                    {/* Quick links */}
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-2.5">
                            <BarChart2 size={15} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-700 text-sm">روابط سريعة</h3>
                        </div>
                        <CardContent className="p-3">
                            <div className="space-y-0.5">
                                {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2.5 text-slate-500 group-hover:text-slate-700 transition-colors">
                                            <Icon size={14} />
                                            <span className="text-sm font-semibold">{label}</span>
                                        </div>
                                        <ArrowLeft size={13} className="text-slate-300 group-hover:text-[#ee1d23] transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </AdminLayout>
    );
}
