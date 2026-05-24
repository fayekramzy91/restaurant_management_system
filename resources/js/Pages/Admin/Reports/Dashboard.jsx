import AdminLayout from '@/Layouts/AdminLayout';
import ReportDateFilter from '@/Components/Admin/ReportDateFilter';
import { Head, usePage } from '@inertiajs/react';
import { BarChart2, TrendingUp, ShoppingCart, Users, DollarSign, Package, Receipt, Tag, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { cn } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#ee1d23', '#6f272a', '#feca0b', '#3b82f6', '#10b981'];

const STATUS_LABELS = {
    pending:   'قيد الانتظار',
    preparing: 'يُحضر',
    ready:     'جاهز',
    completed: 'مكتمل',
    cancelled: 'ملغي',
};

const TYPE_COLORS  = { dine_in: '#3b82f6', takeaway: '#feca0b', delivery: '#ee1d23' };
const TYPE_LABELS  = { dine_in: 'داخلي', takeaway: 'خارجي', delivery: 'توصيل' };

const CURRENCY_SYMBOLS = { ILS: '₪', USD: '$', SAR: 'ر.س', EUR: '€' };

function formatCurrency(value, currency = 'ILS') {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${Number(value).toFixed(2)} ${symbol}`;
}


function KpiCard({ label, value, icon: Icon, iconCls, sub }) {
    return (
        <Card className="shadow-sm border-slate-200/80">
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                        {label}
                    </p>
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconCls)}>
                        <Icon size={14} />
                    </div>
                </div>
                <p className="text-2xl font-black text-slate-800 font-sans leading-none">{value}</p>
                {sub && <p className="mt-1.5 text-[11px] text-slate-400 font-semibold">{sub}</p>}
            </CardContent>
        </Card>
    );
}

function RevenueChartTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload ?? {};
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs font-Cairo" dir="rtl">
            <p className="font-bold text-slate-600 mb-1.5">{label}</p>
            <p className="text-[#ee1d23]">الإيراد: {formatCurrency(d.revenue ?? 0, currency)}</p>
            {(d.tax ?? 0) > 0 && (
                <p className="text-amber-500">الضريبة: {formatCurrency(d.tax, currency)}</p>
            )}
            {(d.discount ?? 0) > 0 && (
                <p className="text-violet-500">الخصم: {formatCurrency(d.discount, currency)}</p>
            )}
        </div>
    );
}

function RevenueChart({ data, currency }) {
    const formatted = data.map(d => ({
        ...d,
        label: new Date(d.date + 'T00:00:00').toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit' }),
    }));

    return (
        <Card className="shadow-sm border-slate-200/80 h-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-red-50 text-[#ee1d23] rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">الإيرادات اليومية</h3>
            </div>
            <CardContent className="p-5">
                {data.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-slate-300 text-sm font-semibold">
                        لا توجد بيانات للفترة المحددة
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                reversed
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                orientation="right"
                                tickFormatter={v => v.toFixed(0)}
                                width={50}
                            />
                            <Tooltip content={<RevenueChartTooltip currency={currency} />} />
                            <Bar dataKey="revenue" fill="#ee1d23" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

function StatusPieChart({ data }) {
    const mapped = data.map((d, i) => ({
        name:  STATUS_LABELS[d.status] ?? d.status,
        value: d.count,
        color: PIE_COLORS[i % PIE_COLORS.length],
    }));

    return (
        <Card className="shadow-sm border-slate-200/80 h-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center shrink-0">
                    <ShoppingCart size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">حالات الطلبات</h3>
            </div>
            <CardContent className="p-4">
                {mapped.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-slate-300 text-sm font-semibold">
                        لا توجد بيانات
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={mapped} cx="50%" cy="40%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                                {mapped.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(v, n) => [v, n]}
                                contentStyle={{ fontSize: 12, fontFamily: 'Cairo, sans-serif', borderRadius: 8 }}
                            />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, sans-serif' }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

function TypePieChart({ data }) {
    const mapped = data.map(d => ({
        name:  TYPE_LABELS[d.type] ?? d.type,
        value: d.count,
        color: TYPE_COLORS[d.type] ?? '#94a3b8',
    }));

    return (
        <Card className="shadow-sm border-slate-200/80 h-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                    <Package size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">أنواع الطلبات</h3>
            </div>
            <CardContent className="p-4">
                {mapped.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-slate-300 text-sm font-semibold">
                        لا توجد بيانات
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={mapped} cx="50%" cy="40%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                                {mapped.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(v, n) => [v, n]}
                                contentStyle={{ fontSize: 12, fontFamily: 'Cairo, sans-serif', borderRadius: 8 }}
                            />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, sans-serif' }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

function TopItemsTable({ items, currency }) {
    return (
        <Card className="shadow-sm border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                    <BarChart2 size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">أفضل 10 أصناف مبيعاً</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                        <TableHead className="text-xs font-semibold text-slate-400 w-8 text-center">#</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-400">الصنف</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-400">الكمية</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-400 text-start">الإيرادات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-slate-300 text-sm">
                                لا توجد مبيعات في هذه الفترة
                            </TableCell>
                        </TableRow>
                    ) : items.map((item, idx) => (
                        <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="text-center font-sans text-xs text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="font-semibold text-sm text-slate-700">{item.name}</TableCell>
                            <TableCell className="text-center font-sans font-semibold text-slate-600">{item.qty_sold}</TableCell>
                            <TableCell className="text-start font-sans font-semibold text-slate-700">
                                {formatCurrency(item.item_revenue, currency)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

function BranchTable({ branches, currency }) {
    return (
        <Card className="shadow-sm border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-50 text-violet-500 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">أداء الفروع</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                        <TableHead className="text-xs font-semibold text-slate-400">الفرع</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-400">الطلبات</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-400 text-start">الإيرادات</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-400 text-start">متوسط الطلب</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {branches.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-slate-300 text-sm">
                                لا توجد فروع
                            </TableCell>
                        </TableRow>
                    ) : branches.map((branch) => (
                        <TableRow key={branch.id} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="font-semibold text-sm text-slate-700">
                                {branch.name}
                                {branch.is_main && (
                                    <span className="me-2 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                                        رئيسي
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-center font-sans font-semibold text-slate-600">
                                {branch.order_count}
                            </TableCell>
                            <TableCell className="text-start font-sans font-semibold text-slate-700">
                                {formatCurrency(branch.revenue, currency)}
                            </TableCell>
                            <TableCell className="text-start font-sans font-semibold text-slate-500">
                                {formatCurrency(branch.avg_value, currency)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

const METHOD_TYPE_LABELS = { cash: 'نقداً', card: 'بطاقة', wallet: 'محفظة', other: 'أخرى' };
const METHOD_TYPE_COLORS = { cash: '#10b981', card: '#3b82f6', wallet: '#feca0b', other: '#94a3b8' };

function PaymentBreakdown({ data, currency }) {
    const total = data.reduce((sum, r) => sum + r.total_amount, 0);

    return (
        <Card className="shadow-sm border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                    <CreditCard size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">توزيع طرق الدفع</h3>
            </div>
            {data.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-slate-300 text-sm font-semibold">
                    لا توجد مدفوعات في هذه الفترة
                </div>
            ) : (
                <>
                    {/* Progress bar */}
                    <div className="flex h-2 mx-5 mt-4 rounded-full overflow-hidden gap-0.5">
                        {data.map((row) => (
                            <div
                                key={row.method_name}
                                style={{
                                    width: `${total > 0 ? (row.total_amount / total) * 100 : 0}%`,
                                    backgroundColor: METHOD_TYPE_COLORS[row.method_type] ?? '#94a3b8',
                                }}
                                title={row.method_name}
                            />
                        ))}
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                                <TableHead className="text-xs font-semibold text-slate-400">طريقة الدفع</TableHead>
                                <TableHead className="text-center text-xs font-semibold text-slate-400">عدد العمليات</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-400 text-start">الإجمالي</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row) => (
                                <TableRow key={row.method_name} className="border-slate-100 hover:bg-slate-50/50">
                                    <TableCell className="font-semibold text-sm text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: METHOD_TYPE_COLORS[row.method_type] ?? '#94a3b8' }}
                                            />
                                            {row.method_name}
                                            <span className="text-[10px] text-slate-400 font-normal">
                                                ({METHOD_TYPE_LABELS[row.method_type] ?? row.method_type})
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-sans font-semibold text-slate-600">
                                        {row.transaction_count}
                                    </TableCell>
                                    <TableCell className="text-start font-sans font-semibold text-slate-700">
                                        {formatCurrency(row.total_amount, currency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </>
            )}
        </Card>
    );
}

export default function Dashboard({
    filters,
    kpi,
    revenue_by_day,
    status_distribution,
    type_breakdown,
    top_items,
    branch_performance,
    payment_breakdown,
}) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'ILS';

    return (
        <AdminLayout title="التقارير">
            <Head title="التقارير" />

            <ReportDateFilter filters={filters} routeName="admin.reports.dashboard" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
                <KpiCard
                    label="إجمالي الإيرادات"
                    value={formatCurrency(kpi.total_revenue, currency)}
                    icon={DollarSign}
                    iconCls="bg-red-50 text-[#ee1d23]"
                />
                <KpiCard
                    label="إجمالي الضريبة المحصّلة"
                    value={formatCurrency(kpi.total_tax, currency)}
                    icon={Receipt}
                    iconCls="bg-amber-50 text-amber-500"
                />
                <KpiCard
                    label="إجمالي الخصومات"
                    value={formatCurrency(kpi.total_discount, currency)}
                    icon={Tag}
                    iconCls="bg-violet-50 text-violet-500"
                />
                <KpiCard
                    label="إجمالي الطلبات"
                    value={kpi.total_orders}
                    icon={ShoppingCart}
                    iconCls="bg-blue-50 text-blue-500"
                    sub={`${kpi.completed_orders} مكتمل`}
                />
                <KpiCard
                    label="متوسط قيمة الطلب"
                    value={formatCurrency(kpi.avg_order_value, currency)}
                    icon={TrendingUp}
                    iconCls="bg-slate-100 text-slate-500"
                    sub="للطلبات المكتملة فقط"
                />
                <KpiCard
                    label="عملاء تمت خدمتهم"
                    value={kpi.customers_served}
                    icon={Users}
                    iconCls="bg-emerald-50 text-emerald-500"
                    sub="عملاء مسجلون فريدون"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
                <div className="lg:col-span-3">
                    <RevenueChart data={revenue_by_day} currency={currency} />
                </div>
                <div className="lg:col-span-1">
                    <StatusPieChart data={status_distribution} />
                </div>
                <div className="lg:col-span-1">
                    <TypePieChart data={type_breakdown} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <TopItemsTable items={top_items} currency={currency} />
                <BranchTable branches={branch_performance} currency={currency} />
            </div>

            <PaymentBreakdown data={payment_breakdown ?? []} currency={currency} />
        </AdminLayout>
    );
}
