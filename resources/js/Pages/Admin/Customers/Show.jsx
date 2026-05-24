import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    User, Phone, Mail, MapPin, ShoppingBag, Wallet,
    TrendingUp, Receipt, Tag, Calendar, ChevronLeft,
    Plus, Minus, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n, currency) {
    return (
        <>
            <span className="font-sans">{Number(n ?? 0).toFixed(2)}</span>
            <span className="text-xs font-normal text-slate-400 mr-1">{currency}</span>
        </>
    );
}

function fmtDate(d, locale = 'ar-SA') {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(locale);
}

function orderTypeLabel(type) {
    const map = { dine_in: 'طاولة', takeaway: 'سفري', delivery: 'توصيل' };
    return map[type] ?? type;
}

function orderStatusBadge(status) {
    const map = {
        pending:    { label: 'معلق',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        preparing:  { label: 'يُحضَّر', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        ready:      { label: 'جاهز',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        completed:  { label: 'مكتمل',  cls: 'bg-slate-50 text-slate-500 border-slate-200' },
        cancelled:  { label: 'ملغي',   cls: 'bg-red-50 text-red-600 border-red-200' },
    };
    const { label, cls } = map[status] ?? { label: status, cls: '' };
    return <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', cls)}>{label}</span>;
}

function invoiceStatusBadge(status) {
    const map = {
        paid:      { label: 'مدفوع',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        partial:   { label: 'جزئي',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        draft:     { label: 'مسودة',   cls: 'bg-slate-50 text-slate-500 border-slate-200' },
        void:      { label: 'ملغي',    cls: 'bg-red-50 text-red-500 border-red-200' },
        refunded:  { label: 'مسترد',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    };
    const { label, cls } = map[status] ?? { label: status, cls: '' };
    return <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', cls)}>{label}</span>;
}

function txReasonLabel(reason) {
    const map = {
        payment_surplus:   'فائض دفع',
        payment_used:      'استخدام في دفع',
        manual_adjustment: 'تعديل يدوي',
        refund:            'استرداد',
    };
    return map[reason] ?? reason;
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconCls, label, value }) {
    return (
        <Card className="shadow-sm border-slate-200/80">
            <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconCls)}>
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="font-bold text-slate-700 text-base leading-tight truncate">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Wallet adjustment form ────────────────────────────────────────────────────

function AdjustmentForm({ customer, currency }) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        type:   'credit',
        amount: '',
        notes:  '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        setConfirmOpen(true);
    }

    function confirm() {
        post(route('admin.customers.wallet.adjust', customer.id), {
            onSuccess: () => { reset(); setConfirmOpen(false); },
            onError:   () => setConfirmOpen(false),
        });
    }

    const isDebit    = data.type === 'debit';
    const wouldOD    = isDebit && Number(data.amount) > Number(customer.wallet_balance);

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-3">
                {/* type toggle */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { v: 'credit', label: 'إضافة رصيد', icon: Plus,  cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                        { v: 'debit',  label: 'خصم رصيد',   icon: Minus, cls: 'border-red-300 bg-red-50 text-red-600' },
                    ].map(({ v, label, icon: Icon, cls }) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setData('type', v)}
                            className={cn(
                                'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all',
                                data.type === v ? cls : 'border-slate-200 text-slate-400 hover:border-slate-300',
                            )}
                        >
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>

                {/* amount */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                        المبلغ ({currency})
                    </label>
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={data.amount}
                        onChange={e => setData('amount', e.target.value)}
                        placeholder="0.00"
                        className={cn(
                            'w-full border rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#ee1d23]/30 focus:border-[#ee1d23]',
                            errors.amount || wouldOD ? 'border-red-400' : 'border-slate-200',
                        )}
                    />
                    {wouldOD && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={11} /> المبلغ يتجاوز الرصيد الحالي
                        </p>
                    )}
                    {errors.amount && !wouldOD && (
                        <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                    )}
                </div>

                {/* notes */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                        سبب التعديل
                    </label>
                    <textarea
                        rows={2}
                        value={data.notes}
                        onChange={e => setData('notes', e.target.value)}
                        placeholder="أدخل سبب التعديل..."
                        className={cn(
                            'w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ee1d23]/30 focus:border-[#ee1d23]',
                            errors.notes ? 'border-red-400' : 'border-slate-200',
                        )}
                    />
                    {errors.notes && <p className="text-xs text-red-500 mt-1">{errors.notes}</p>}
                </div>

                <Button
                    type="submit"
                    disabled={!data.amount || !data.notes || wouldOD || processing}
                    className="w-full bg-[#ee1d23] hover:bg-[#c81a1f] text-white text-sm"
                >
                    {isDebit ? 'خصم الرصيد' : 'إضافة الرصيد'}
                </Button>
            </form>

            {/* confirm dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>تأكيد التعديل</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        هل تريد {isDebit ? 'خصم' : 'إضافة'}{' '}
                        <span className="font-bold font-sans">{Number(data.amount || 0).toFixed(2)} {currency}</span>{' '}
                        {isDebit ? 'من' : 'إلى'} محفظة <span className="font-bold">{customer.name}</span>؟
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
                        <Button
                            onClick={confirm}
                            disabled={processing}
                            className={cn('text-white', isDebit ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700')}
                        >
                            {processing ? 'جارٍ التنفيذ…' : 'تأكيد'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ links }) {
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {links.map((link, i) => {
                if (!link.url) {
                    return (
                        <span key={i} className="px-2.5 py-1 text-xs text-slate-300 font-sans"
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    );
                }
                return (
                    <Link
                        key={i}
                        href={link.url}
                        preserveScroll
                        className={cn(
                            'px-2.5 py-1 text-xs rounded-md border font-sans transition-colors',
                            link.active
                                ? 'bg-[#ee1d23] text-white border-[#ee1d23]'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300',
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                );
            })}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Show({ customer, stats, recentOrders, walletTransactions }) {
    const { settings, auth } = usePage().props;
    const currency = settings?.currency ?? 'SAR';
    const canAdjust = auth.user.permissions.includes('admin.wallet_adjust');

    return (
        <AdminLayout title={`العميل: ${customer.name}`}>
            <Head title={`العميل: ${customer.name}`} />

            {/* breadcrumb */}
            <div className="flex items-center gap-2 mb-5 text-sm text-slate-400">
                <Link href={route('admin.customers.index')} className="hover:text-[#ee1d23] transition-colors">
                    العملاء
                </Link>
                <ChevronLeft size={14} />
                <span className="text-slate-600 font-semibold">{customer.name}</span>
            </div>

            {/* stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <StatCard
                    icon={ShoppingBag}
                    iconCls="bg-slate-100 text-slate-500"
                    label="إجمالي الطلبات"
                    value={stats.invoice_count}
                />
                <StatCard
                    icon={TrendingUp}
                    iconCls="bg-emerald-50 text-emerald-600"
                    label="إجمالي الإنفاق"
                    value={fmt(stats.total_spent, currency)}
                />
                <StatCard
                    icon={Receipt}
                    iconCls="bg-amber-50 text-amber-600"
                    label="الضرائب المدفوعة"
                    value={fmt(stats.total_tax, currency)}
                />
                <StatCard
                    icon={Tag}
                    iconCls="bg-violet-50 text-violet-600"
                    label="إجمالي الخصومات"
                    value={fmt(stats.total_discount, currency)}
                />
            </div>

            {/* body — two columns */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* left column: info + recent orders */}
                <div className="xl:col-span-2 space-y-4">

                    {/* customer info card */}
                    <Card className="shadow-sm border-slate-200/80">
                        <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center gap-2">
                            <User size={15} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-700 text-sm">بيانات العميل</h3>
                        </CardHeader>
                        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow icon={User}     label="الاسم"         value={customer.name} />
                            <InfoRow icon={Phone}    label="الهاتف"        value={customer.phone} />
                            <InfoRow icon={Mail}     label="البريد الإلكتروني" value={customer.email} />
                            <InfoRow icon={MapPin}   label="العنوان"       value={customer.address} />
                            <InfoRow icon={Calendar} label="أول زيارة"     value={fmtDate(stats.first_visit)} />
                            <InfoRow icon={Calendar} label="آخر زيارة"     value={fmtDate(stats.last_visit)} />
                        </CardContent>
                    </Card>

                    {/* recent orders */}
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                        <div className="px-5 py-4 flex items-center gap-2 border-b border-slate-100 bg-white">
                            <ShoppingBag size={15} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-700 text-sm">آخر الطلبات</h3>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الفاتورة</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">النوع</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الإجمالي</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">التاريخ</TableHead>
                                    <TableHead className="w-8"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-slate-300 text-sm">
                                            لا توجد طلبات
                                        </TableCell>
                                    </TableRow>
                                ) : recentOrders.map(order => (
                                    <TableRow key={order.id} className="border-slate-100 hover:bg-slate-50/50">
                                        <TableCell className="font-sans text-xs text-slate-500">
                                            {order.invoice?.invoice_number ?? <span className="text-slate-200">—</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            {orderTypeLabel(order.order_type)}
                                        </TableCell>
                                        <TableCell>
                                            {order.invoice
                                                ? invoiceStatusBadge(order.invoice.status)
                                                : orderStatusBadge(order.status)}
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold text-slate-700">
                                            {order.invoice
                                                ? fmt(order.invoice.total, currency)
                                                : <span className="text-slate-300">—</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-400 font-sans">
                                            {fmtDate(order.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={route('admin.orders.show', order.id)}
                                                className="text-[11px] text-slate-400 hover:text-[#ee1d23] transition-colors"
                                            >
                                                عرض
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {stats.invoice_count > 5 && (
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                                <Link
                                    href={route('admin.orders.index') + `?customer_id=${customer.id}`}
                                    className="text-xs text-[#ee1d23] font-semibold hover:underline"
                                >
                                    عرض جميع الطلبات ({stats.invoice_count}) ←
                                </Link>
                            </div>
                        )}
                    </Card>
                </div>

                {/* right column: wallet */}
                <div className="space-y-4">

                    {/* balance card */}
                    <div className="rounded-xl bg-gradient-to-br from-[#1e1e2e] to-[#2d1b2e] p-5 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-1 opacity-70">
                            <Wallet size={14} />
                            <span className="text-xs font-semibold">رصيد المحفظة</span>
                        </div>
                        <p className="text-3xl font-bold font-sans tracking-tight mb-0.5">
                            {Number(customer.wallet_balance ?? 0).toFixed(2)}
                            <span className="text-base font-normal opacity-60 mr-1">{currency}</span>
                        </p>
                        {customer.wallet_last_updated_at && (
                            <p className="text-[11px] opacity-50 font-sans">
                                آخر تحديث: {fmtDate(customer.wallet_last_updated_at)}
                            </p>
                        )}
                    </div>

                    {/* adjustment form */}
                    {canAdjust && (
                        <Card className="shadow-sm border-slate-200/80">
                            <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center gap-2">
                                <Wallet size={15} className="text-slate-400" />
                                <h3 className="font-semibold text-slate-700 text-sm">تعديل الرصيد</h3>
                            </CardHeader>
                            <CardContent className="p-5">
                                <AdjustmentForm customer={customer} currency={currency} />
                            </CardContent>
                        </Card>
                    )}

                    {/* wallet transaction ledger */}
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
                            <div className="flex items-center gap-2">
                                <Receipt size={15} className="text-slate-400" />
                                <h3 className="font-semibold text-slate-700 text-sm">سجل المحفظة</h3>
                            </div>
                            <Link
                                href={route('admin.customers.wallet', customer.id)}
                                className="text-[11px] text-slate-400 hover:text-[#ee1d23] font-semibold transition-colors"
                            >
                                عرض الكل
                            </Link>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {walletTransactions.data.length === 0 ? (
                                <p className="text-center py-8 text-slate-300 text-sm">لا توجد معاملات</p>
                            ) : walletTransactions.data.map(tx => (
                                <div key={tx.id} className="px-4 py-3 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={cn(
                                            'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                                            tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
                                        )}>
                                            {tx.type === 'credit' ? <Plus size={12} /> : <Minus size={12} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-600 truncate">
                                                {txReasonLabel(tx.reason)}
                                            </p>
                                            {tx.reference_label && (
                                                <p className="text-[11px] text-slate-400 font-sans truncate">{tx.reference_label}</p>
                                            )}
                                            <p className="text-[11px] text-slate-300 font-sans">
                                                {fmtDate(tx.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn(
                                            'text-sm font-bold font-sans',
                                            tx.type === 'credit' ? 'text-emerald-600' : 'text-red-500',
                                        )}>
                                            {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount).toFixed(2)}
                                        </p>
                                        <p className="text-[11px] text-slate-300 font-sans">{Number(tx.balance_after).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {walletTransactions.links?.length > 3 && (
                            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                                <Pagination links={walletTransactions.links} />
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

// ── tiny helper ───────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-2.5">
            <Icon size={13} className="text-slate-300 mt-0.5 shrink-0" />
            <div>
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="text-sm text-slate-700 font-medium">{value}</p>
            </div>
        </div>
    );
}
