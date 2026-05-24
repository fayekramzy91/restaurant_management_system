import AdminLayout from '@/Layouts/AdminLayout';
import ReportDateFilter from '@/Components/Admin/ReportDateFilter';
import { Head, usePage } from '@inertiajs/react';
import { Wallet, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';

const CURRENCY_SYMBOLS = { ILS: '₪', USD: '$', SAR: 'ر.س', EUR: '€' };

function fmt(value, currency = 'ILS') {
    if (value === null || value === undefined) return '—';
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${Number(value).toFixed(2)} ${symbol}`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, iconCls }) {
    return (
        <Card className="shadow-sm border-slate-200/80">
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                        <Icon size={14} />
                    </div>
                </div>
                <p className="text-2xl font-black text-slate-800 font-sans leading-none">{value}</p>
            </CardContent>
        </Card>
    );
}

// ── Daily credit vs debit line chart ──────────────────────────────────────────
function WalletLineChart({ data, currency }) {
    // Pivot: [{ date, type, total }] → [{ date, label, credit, debit }]
    const byDate = {};
    data.forEach(r => {
        if (!byDate[r.date]) {
            byDate[r.date] = {
                date:   r.date,
                label:  new Date(r.date + 'T00:00:00').toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit' }),
                credit: 0,
                debit:  0,
            };
        }
        byDate[r.date][r.type] = parseFloat(r.total);
    });
    const chartData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

    return (
        <Card className="shadow-sm border-slate-200/80">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">حركة المحفظة اليومية</h3>
            </div>
            <CardContent className="p-5">
                {chartData.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-slate-300 text-sm font-semibold">
                        لا توجد بيانات للفترة المحددة
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                                width={50}
                                tickFormatter={v => v.toFixed(0)}
                            />
                            <Tooltip
                                formatter={(v, n) => [fmt(v, currency), n === 'credit' ? 'مُضاف' : 'مُستخدم']}
                                contentStyle={{ fontSize: 12, fontFamily: 'Cairo, sans-serif', borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                            <Legend
                                formatter={n => n === 'credit' ? 'مُضاف' : 'مُستخدم'}
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, sans-serif' }}
                            />
                            <Line type="monotone" dataKey="credit" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="debit"  stroke="#ee1d23" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// ── Top customers table ───────────────────────────────────────────────────────
function TopCustomersTable({ customers, currency }) {
    return (
        <Card className="shadow-sm border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-50 text-violet-500 rounded-lg flex items-center justify-center shrink-0">
                    <Users size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">أكثر العملاء استخداماً للمحفظة</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                        <TableHead className="text-xs font-semibold text-slate-400 w-8 text-center">#</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-400">العميل</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-400">الهاتف</TableHead>
                        <TableHead className="text-start text-xs font-semibold text-slate-400">الرصيد الحالي</TableHead>
                        <TableHead className="text-start text-xs font-semibold text-slate-400">مُضاف</TableHead>
                        <TableHead className="text-start text-xs font-semibold text-slate-400">مُستخدم</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-400">عمليات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-slate-300 text-sm">
                                لا توجد عمليات محفظة في هذه الفترة
                            </TableCell>
                        </TableRow>
                    ) : customers.map((c, idx) => (
                        <TableRow key={c.id} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="text-center font-sans text-xs text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="font-semibold text-sm text-slate-700">{c.name}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-500">{c.phone ?? '—'}</TableCell>
                            <TableCell className="text-start font-sans font-semibold text-slate-700">
                                {fmt(c.wallet_balance, currency)}
                            </TableCell>
                            <TableCell className="text-start font-sans font-semibold text-emerald-600">
                                {fmt(c.credited, currency)}
                            </TableCell>
                            <TableCell className="text-start font-sans font-semibold text-[#ee1d23]">
                                {fmt(c.debited, currency)}
                            </TableCell>
                            <TableCell className="text-center font-sans font-semibold text-slate-600">
                                {c.tx_count}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WalletReport({ filters, stats, top_customers, transactions_by_day }) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'ILS';

    const totalCredited = parseFloat(stats?.total_credited ?? 0);
    const totalDebited  = parseFloat(stats?.total_debited  ?? 0);
    const custCount     = parseInt(stats?.customers_count  ?? 0, 10);

    return (
        <AdminLayout title="تقرير المحافظ">
            <Head title="تقرير المحافظ" />

            <ReportDateFilter filters={filters} routeName="admin.reports.wallet" />

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <KpiCard
                    label="إجمالي الرصيد المُضاف"
                    value={fmt(totalCredited, currency)}
                    icon={Wallet}
                    iconCls="bg-emerald-50 text-emerald-500"
                />
                <KpiCard
                    label="إجمالي الرصيد المُستخدم"
                    value={fmt(totalDebited, currency)}
                    icon={TrendingUp}
                    iconCls="bg-red-50 text-[#ee1d23]"
                />
                <KpiCard
                    label="عملاء نشطو المحفظة"
                    value={custCount}
                    icon={Users}
                    iconCls="bg-blue-50 text-blue-500"
                />
            </div>

            <div className="mb-5">
                <WalletLineChart data={transactions_by_day} currency={currency} />
            </div>

            <TopCustomersTable customers={top_customers} currency={currency} />
        </AdminLayout>
    );
}
