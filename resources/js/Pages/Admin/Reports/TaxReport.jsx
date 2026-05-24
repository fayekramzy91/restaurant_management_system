import AdminLayout from '@/Layouts/AdminLayout';
import ReportDateFilter from '@/Components/Admin/ReportDateFilter';
import { Head, usePage } from '@inertiajs/react';
import { Receipt, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';

const CURRENCY_SYMBOLS = { ILS: '₪', USD: '$', SAR: 'ر.س', EUR: '€' };
const CHART_COLORS     = ['#ee1d23', '#3b82f6', '#feca0b', '#10b981', '#8b5cf6'];

function fmt(value, currency = 'ILS') {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${Number(value).toFixed(2)} ${symbol}`;
}

function formatRate(rate) {
    return `${Number(rate).toFixed(2)}%`;
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

// ── Daily Stacked Bar Chart ───────────────────────────────────────────────────
function TaxByDayChart({ data, currency }) {
    // Pivot: [{ date, tax_name, tax_amount }] → [{ date, label, TaxA, TaxB, … }]
    const taxNames = [...new Set(data.map(r => r.tax_name))];
    const byDate   = {};
    data.forEach(r => {
        if (!byDate[r.date]) {
            byDate[r.date] = {
                date:  r.date,
                label: new Date(r.date + 'T00:00:00').toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit' }),
            };
        }
        byDate[r.date][r.tax_name] = parseFloat(r.tax_amount);
    });
    const chartData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

    return (
        <Card className="shadow-sm border-slate-200/80">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-red-50 text-[#ee1d23] rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">الضريبة اليومية حسب النوع</h3>
            </div>
            <CardContent className="p-5">
                {chartData.length === 0 ? (
                    <div className="h-52 flex items-center justify-center text-slate-300 text-sm font-semibold">
                        لا توجد بيانات للفترة المحددة
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} reversed />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} orientation="right" width={50} tickFormatter={v => v.toFixed(0)} />
                            <Tooltip
                                formatter={(v, n) => [fmt(v, currency), n]}
                                contentStyle={{ fontSize: 12, fontFamily: 'Cairo, sans-serif', borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, sans-serif' }} />
                            {taxNames.map((name, i) => (
                                <Bar key={name} dataKey={name} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === taxNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={48} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// ── Tax Summary Table ─────────────────────────────────────────────────────────
function TaxSummaryTable({ rows, totals, currency }) {
    return (
        <Card className="shadow-sm border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center shrink-0">
                    <Receipt size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">تفاصيل الضرائب حسب النوع</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                        <TableHead className="text-xs font-semibold text-slate-400">نوع الضريبة</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-400">الكود</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-400">النسبة</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-400">عدد الفواتير</TableHead>
                        <TableHead className="text-start text-xs font-semibold text-slate-400">الوعاء الضريبي</TableHead>
                        <TableHead className="text-start text-xs font-semibold text-slate-400">قيمة الضريبة</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-slate-300 text-sm">
                                لا توجد ضرائب في هذه الفترة
                            </TableCell>
                        </TableRow>
                    ) : (
                        <>
                            {rows.map((row, idx) => (
                                <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50">
                                    <TableCell className="font-semibold text-sm text-slate-700">{row.tax_name}</TableCell>
                                    <TableCell className="font-mono text-xs text-slate-500">{row.tax_code}</TableCell>
                                    <TableCell className="text-center font-sans font-semibold text-slate-600">{formatRate(row.rate)}</TableCell>
                                    <TableCell className="text-center font-sans font-semibold text-slate-600">{row.invoice_count}</TableCell>
                                    <TableCell className="text-start font-sans font-semibold text-slate-600">{fmt(row.total_taxable, currency)}</TableCell>
                                    <TableCell className="text-start font-sans font-bold text-[#ee1d23]">{fmt(row.total_tax, currency)}</TableCell>
                                </TableRow>
                            ))}
                            {/* Totals row */}
                            <TableRow className="bg-slate-50 border-slate-200 font-black">
                                <TableCell colSpan={4} className="text-sm font-black text-slate-700 py-3">
                                    الإجمالي
                                </TableCell>
                                <TableCell className="text-start font-sans font-black text-slate-700">
                                    {fmt(totals.total_taxable, currency)}
                                </TableCell>
                                <TableCell className="text-start font-sans font-black text-[#ee1d23]">
                                    {fmt(totals.total_tax, currency)}
                                </TableCell>
                            </TableRow>
                        </>
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TaxReport({ filters, tax_summary, tax_by_day, totals }) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'ILS';

    return (
        <AdminLayout title="تقرير الضرائب">
            <Head title="تقرير الضرائب" />

            <ReportDateFilter filters={filters} routeName="admin.reports.taxes" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <KpiCard
                    label="إجمالي الوعاء الضريبي"
                    value={fmt(totals.total_taxable, currency)}
                    icon={TrendingUp}
                    iconCls="bg-amber-50 text-amber-500"
                />
                <KpiCard
                    label="إجمالي الضريبة المحصّلة"
                    value={fmt(totals.total_tax, currency)}
                    icon={Receipt}
                    iconCls="bg-red-50 text-[#ee1d23]"
                />
            </div>

            <div className="mb-5">
                <TaxByDayChart data={tax_by_day} currency={currency} />
            </div>

            <TaxSummaryTable rows={tax_summary} totals={totals} currency={currency} />
        </AdminLayout>
    );
}
