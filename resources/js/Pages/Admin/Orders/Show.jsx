import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowRight, ShoppingCart, Plus, Pencil, Trash2, Sparkles,
    Send, ChefHat, CreditCard, Tag, CheckCheck, Ban, FileText,
    Utensils, Clock, CheckCircle2, CircleOff, BadgeCheck,
    CircleDashed, Truck, Package, Users, Star, GitBranch,
    ReceiptText, RotateCcw, Minus, AlertCircle,
    UserCheck, Wallet, Receipt, XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';

/* ── Status / type maps (mirrors Index.jsx) ─────── */
const STATUS_MAP = {
    pending:   { label: 'قيد الانتظار', icon: Clock,         cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
    preparing: { label: 'يُحضر',        icon: ChefHat,       cls: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200/80' },
    ready:     { label: 'جاهز',         icon: CheckCircle2,  cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    completed: { label: 'مكتمل',        icon: CheckCheck,    cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
    cancelled: { label: 'ملغي',         icon: Ban,           cls: 'bg-red-50 text-red-400 ring-1 ring-red-200/80' },
};
const TYPE_MAP = {
    dine_in:  { label: 'داخلي',  icon: Utensils, cls: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200/80' },
    takeaway: { label: 'خارجي',  icon: Package,  cls: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200/80' },
    delivery: { label: 'توصيل', icon: Truck,    cls: 'bg-sky-50 text-sky-600 ring-1 ring-sky-200/80' },
};
const PAYMENT_MAP = {
    paid:       { label: 'مدفوع',       icon: BadgeCheck,   cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    partial:    { label: 'جزئي',        icon: CircleDashed, cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
    draft:      { label: 'غير مدفوع',   icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
    void:       { label: 'ملغاة',       icon: Ban,          cls: 'bg-red-50 text-red-400 ring-1 ring-red-200/80' },
    refunded:   { label: 'مسترد',       icon: RotateCcw,    cls: 'bg-blue-50 text-blue-500 ring-1 ring-blue-200/80' },
    unpaid:     { label: 'غير مدفوع',   icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
};

/* ── Timeline event definitions ─────────────────── */
const TIMELINE_MAP = {
    order_created:     { icon: ShoppingCart, color: 'bg-slate-400' },
    item_added:        { icon: Plus,         color: 'bg-slate-400' },
    item_updated:      { icon: Pencil,       color: 'bg-slate-400' },
    item_removed:      { icon: Trash2,       color: 'bg-slate-400' },
    addons_updated:    { icon: Sparkles,     color: 'bg-slate-400' },
    sent_to_kitchen:   { icon: Send,         color: 'bg-blue-400' },
    kitchen_ready:     { icon: ChefHat,      color: 'bg-blue-400' },
    payment_processed: { icon: CreditCard,   color: 'bg-emerald-400' },
    discount_applied:  { icon: Tag,          color: 'bg-emerald-400' },
    order_completed:   { icon: CheckCheck,   color: 'bg-emerald-400' },
    order_cancelled:   { icon: Ban,          color: 'bg-red-400' },
    notes_updated:     { icon: FileText,     color: 'bg-slate-400' },
    invoice_created:   { icon: ReceiptText,  color: 'bg-emerald-400' },
    refund_processed:  { icon: RotateCcw,    color: 'bg-blue-400' },
    customer_linked:   { icon: UserCheck,    color: 'bg-blue-400' },
    wallet_used:       { icon: Wallet,       color: 'bg-purple-400' },
    wallet_credited:   { icon: Wallet,       color: 'bg-green-400' },
    kitchen_started:   { icon: ChefHat,      color: 'bg-orange-400' },
    payment_entry_added: { icon: CreditCard, color: 'bg-emerald-400' },
    invoice_tax_applied: { icon: Receipt,    color: 'bg-yellow-400' },
    invoice_voided:    { icon: XCircle,      color: 'bg-red-400' },
};

/* ── Pill badge ─────────────────────────────────── */
function Pill({ map, value }) {
    const def = map[value] ?? { label: value, icon: null, cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' };
    const Icon = def.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', def.cls)}>
            {Icon && <Icon size={10} strokeWidth={2.2} />}
            {def.label}
        </span>
    );
}

/* ── Section card wrapper ────────────────────────── */
function SectionCard({ title, icon: Icon, iconCls, children, className }) {
    return (
        <Card className={cn('shadow-sm border-slate-200/80 overflow-hidden', className)}>
            <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center gap-2.5">
                {Icon && (
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconCls)}>
                        <Icon size={13} />
                    </div>
                )}
                <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
            </div>
            <CardContent className="p-5">{children}</CardContent>
        </Card>
    );
}

/* ── Main page ──────────────────────────────────── */
export default function Show({ order, payment_methods }) {
    const { settings, auth } = usePage().props;
    const currency = settings?.currency ?? 'SAR';
    const permissions = auth.user?.permissions ?? [];

    const isDone = order.status === 'completed' || order.status === 'cancelled';
    const invoice = order.invoice;
    const invoiceStatus = invoice?.status ?? 'unpaid';
    const isPaid = invoiceStatus === 'paid';

    const { data, setData, patch, processing: saving } = useForm({
        notes:         order.notes         || '',
        private_notes: order.private_notes || '',
    });
    const [noteSaved, setNoteSaved] = useState(false);

    const { post: submitCancel, processing: cancelling } = useForm();

    const [showRefund, setShowRefund] = useState(false);
    const { data: refundData, setData: setRefundData, post: submitRefund, processing: refunding, reset: resetRefund, errors: refundErrors } = useForm({
        payment_method_id: payment_methods?.[0]?.id ?? '',
        amount: '',
        reference_number: '',
        notes: '',
        refund_to_wallet: false,
    });

    const saveNotes = (e) => {
        e.preventDefault();
        patch(route('admin.orders.update', order.id), {
            preserveScroll: true,
            onSuccess: () => { setNoteSaved(true); setTimeout(() => setNoteSaved(false), 3000); },
        });
    };

    const handleCancel = () => {
        if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع.')) {
            submitCancel(route('admin.orders.cancel', order.id));
        }
    };

    const handleRefundSubmit = (e) => {
        e.preventDefault();
        submitRefund(route('admin.invoices.refund', invoice.id), {
            preserveScroll: true,
            onSuccess: () => { setShowRefund(false); resetRefund(); },
        });
    };

    // Financial figures from invoice
    const subtotal      = Number(invoice?.subtotal   ?? order.total_amount);
    const discount      = Number(invoice?.discount   ?? 0);
    const taxAmount     = Number(invoice?.tax_amount ?? 0);
    const total         = Number(invoice?.total      ?? subtotal);
    const paidAmount    = Number(invoice?.paid_amount  ?? 0);
    const walletAmount  = Number(invoice?.wallet_amount ?? 0);
    const refundedTotal = invoice?.payment_entries
        ?.filter(e => e.type === 'refund')
        .reduce((s, e) => s + Number(e.amount), 0) ?? 0;
    const balance       = Math.max(0, total - paidAmount - walletAmount);

    return (
        <AdminLayout title={`طلب #${order.id}`}>
            <Head title={`طلب #${order.id}`} />

            {/* ── Page header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('admin.orders.index')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowRight size={17} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="font-bold text-slate-800 text-base">طلب #{order.id}</h1>
                            {invoice && (
                                <span className="text-xs text-slate-400 font-mono">{invoice.invoice_number}</span>
                            )}
                            <Pill map={TYPE_MAP}    value={order.type} />
                            <Pill map={STATUS_MAP}  value={order.status} />
                            <Pill map={PAYMENT_MAP} value={invoiceStatus} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {new Date(order.created_at).toLocaleString('ar-SA')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {!isDone && (
                        <>
                            <Link
                                href={route('pos.order', order.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <Pencil size={13} /> تعديل الطلب
                            </Link>
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                <Ban size={13} /> إلغاء الطلب
                            </button>
                        </>
                    )}
                    {!isPaid && order.status !== 'cancelled' && (
                        <Link
                            href={route('pos.checkout', order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                        >
                            <CreditCard size={13} /> {invoiceStatus === 'partial' ? 'استكمال الدفع' : 'إجراء الدفع'}
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Body grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Left: main content ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Meta grid */}
                    <SectionCard title="معلومات الطلب" icon={ShoppingCart} iconCls="bg-slate-100 text-slate-500">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                {
                                    label: 'الطاولة / العميل',
                                    value: order.type === 'dine_in'
                                        ? (order.table?.name ? `طاولة ${order.table.name}` + (order.table.area?.name ? ` · ${order.table.area.name}` : '') : '—')
                                        : (order.customer?.name ?? '—'),
                                },
                                { label: 'الموظف',  value: order.user?.name   ?? '—' },
                                { label: 'الفرع',   value: order.branch?.name ?? '—' },
                                { label: 'عدد الأصناف', value: order.items?.length ?? 0 },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
                                    <p className="text-sm font-semibold text-slate-700">{value}</p>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Items table */}
                    <SectionCard title="الأصناف" icon={Utensils} iconCls="bg-orange-50 text-orange-400">
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                                        <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الصنف</TableHead>
                                        <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">الكمية</TableHead>
                                        <TableHead className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">الإجمالي</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items?.map(item => (
                                        <TableRow key={item.id} className="align-top border-slate-100 hover:bg-slate-50/40">
                                            <TableCell>
                                                <div className="font-semibold text-sm text-slate-700">{item.name ?? item.menu_item?.name ?? '[صنف محذوف]'}</div>
                                                {item.addons?.length > 0 && item.addons.map(a => (
                                                    <div key={a.id} className="text-[11px] text-violet-500 mt-0.5">
                                                        + {a.quantity}× {a.name ?? a.menu_item?.name ?? '[إضافة محذوفة]'}
                                                    </div>
                                                ))}
                                                {item.notes && (
                                                    <div className="text-[11px] text-amber-500 mt-1 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                                                        {item.notes}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-sans font-semibold text-slate-600">{item.quantity}</TableCell>
                                            <TableCell className="text-left font-sans font-semibold text-slate-600">
                                                {(Number(item.price) * item.quantity).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!order.items || order.items.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-slate-300 text-sm font-semibold">
                                                لا توجد أصناف
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </SectionCard>

                    {/* Totals */}
                    <SectionCard
                        title="الحساب"
                        icon={CreditCard}
                        iconCls="bg-emerald-50 text-emerald-500"
                        className={!invoice ? 'opacity-60' : ''}
                    >
                        {!invoice ? (
                            <p className="text-sm text-slate-400 text-center py-4">لا توجد فاتورة بعد</p>
                        ) : (
                            <div className="space-y-4">
                                {/* Financial breakdown */}
                                <div className="space-y-2 text-sm max-w-xs mr-auto">
                                    <div className="flex justify-between text-slate-500 font-semibold">
                                        <span className="font-sans">{subtotal.toFixed(2)} {currency}</span>
                                        <span>المجموع الفرعي</span>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-red-400 font-semibold">
                                            <span className="font-sans">-{discount.toFixed(2)} {currency}</span>
                                            <span>الخصم</span>
                                        </div>
                                    )}
                                    {taxAmount > 0 && (
                                        <div className="flex justify-between text-slate-500 font-semibold">
                                            <span className="font-sans">+{taxAmount.toFixed(2)} {currency}</span>
                                            <span>الضريبة</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-2">
                                        <span className="font-sans">{total.toFixed(2)} {currency}</span>
                                        <span>الإجمالي</span>
                                    </div>
                                </div>

                                {/* Payment entries */}
                                {invoice.payment_entries?.length > 0 && (
                                    <div className="border-t border-slate-100 pt-3 space-y-1.5">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">المدفوعات</p>
                                        {walletAmount > 0 && (
                                            <div className="flex justify-between items-center text-emerald-600 font-semibold text-xs">
                                                <span className="font-sans">{walletAmount.toFixed(2)} {currency}</span>
                                                <span>محفظة</span>
                                            </div>
                                        )}
                                        {invoice.payment_entries.map(entry => (
                                            <div
                                                key={entry.id}
                                                className={cn(
                                                    'flex justify-between items-center font-semibold text-xs',
                                                    entry.type === 'refund' ? 'text-blue-500' : 'text-slate-500'
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {entry.type === 'refund'
                                                        ? <><Minus size={10} /><span className="font-sans">{Number(entry.amount).toFixed(2)} {currency}</span></>
                                                        : <span className="font-sans">{Number(entry.amount).toFixed(2)} {currency}</span>
                                                    }
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {entry.type === 'refund' && (
                                                        <span className="text-[10px] bg-blue-50 text-blue-400 rounded px-1">استرداد</span>
                                                    )}
                                                    <span>{entry.payment_method?.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Remaining / refunded summary */}
                                {balance > 0.009 && (
                                    <div className="flex justify-between text-amber-600 font-bold border-t border-slate-100 pt-2 text-sm">
                                        <span className="font-sans">{balance.toFixed(2)} {currency}</span>
                                        <span>المتبقي</span>
                                    </div>
                                )}
                                {refundedTotal > 0 && (
                                    <div className="flex justify-between text-blue-500 font-bold text-sm">
                                        <span className="font-sans">{refundedTotal.toFixed(2)} {currency}</span>
                                        <span>إجمالي المسترد</span>
                                    </div>
                                )}

                                {/* Refund button */}
                                {permissions.includes('invoices.refund') && invoice.status !== 'void' && invoice.netPaid > 0 && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => setShowRefund(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-semibold text-blue-500 hover:bg-blue-50 transition-colors"
                                        >
                                            <RotateCcw size={12} /> إجراء استرداد
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </SectionCard>

                    {/* Notes form */}
                    <SectionCard title="الملاحظات" icon={FileText} iconCls="bg-slate-100 text-slate-500">
                        <form onSubmit={saveNotes} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    ملاحظات عامة
                                </Label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    rows={3}
                                    placeholder="ملاحظات تظهر على الفاتورة..."
                                    className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition-shadow"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    ملاحظات داخلية
                                </Label>
                                <textarea
                                    value={data.private_notes}
                                    onChange={e => setData('private_notes', e.target.value)}
                                    rows={3}
                                    placeholder="ملاحظات داخلية لا تظهر للعميل..."
                                    className="flex w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 transition-shadow"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={saving} className="h-8 text-xs px-5">
                                    {saving ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
                                </Button>
                                {noteSaved && (
                                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                                        <CheckCircle2 size={13} /> تم الحفظ
                                    </span>
                                )}
                            </div>
                        </form>
                    </SectionCard>
                </div>

                {/* ── Right: timeline ── */}
                <div className="space-y-5">
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                <Clock size={13} />
                            </div>
                            <h3 className="font-semibold text-slate-700 text-sm">سجل الأحداث</h3>
                            <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-1.5 py-0.5 rounded-full font-sans mr-auto">
                                {order.timeline?.length ?? 0}
                            </span>
                        </div>
                        <CardContent className="p-5">
                            {order.timeline?.length > 0 ? (
                                <ol className="relative space-y-0">
                                    {order.timeline.map((entry, i) => {
                                        const def = TIMELINE_MAP[entry.event] ?? { icon: Clock, color: 'bg-slate-300' };
                                        const Icon = def.icon;
                                        const isLast = i === order.timeline.length - 1;
                                        return (
                                            <li key={entry.id} className="flex gap-3 relative">
                                                {/* Vertical line */}
                                                {!isLast && (
                                                    <div className="absolute right-[13px] top-7 bottom-0 w-px bg-slate-100" />
                                                )}
                                                {/* Dot */}
                                                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10', def.color)}>
                                                    <Icon size={12} className="text-white" strokeWidth={2.5} />
                                                </div>
                                                {/* Content */}
                                                <div className={cn('flex-1 pb-5', isLast && 'pb-0')}>
                                                    <p className="text-sm font-semibold text-slate-700 leading-snug">{entry.description}</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {entry.user && (
                                                            <span className="text-[11px] text-slate-400 font-semibold">{entry.user.name}</span>
                                                        )}
                                                        <span className="text-[11px] text-slate-300 font-sans">
                                                            {new Date(entry.created_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            ) : (
                                <div className="text-center py-8 text-slate-300">
                                    <Clock size={24} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-semibold">لا توجد أحداث مسجلة</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* ── Refund modal ── */}
            {invoice && (
                <Dialog open={showRefund} onOpenChange={setShowRefund}>
                    <DialogContent className="max-w-md" dir="rtl">
                        <DialogHeader className="px-6 pt-6">
                            <DialogTitle className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                    <RotateCcw size={13} />
                                </div>
                                إجراء استرداد
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleRefundSubmit}>
                            <div className="px-6 py-4 space-y-4">
                                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                    <AlertCircle size={14} className="text-slate-400 shrink-0" />
                                    <p className="text-xs text-slate-500 font-semibold">
                                        الحد الأقصى للاسترداد:
                                        <span className="font-bold text-slate-700 font-sans mr-1">{(paidAmount + walletAmount - refundedTotal).toFixed(2)} {currency}</span>
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-500">طريقة الاسترداد</Label>
                                    <select
                                        value={refundData.payment_method_id}
                                        onChange={e => setRefundData('payment_method_id', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-slate-700"
                                    >
                                        {payment_methods?.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-500">المبلغ</Label>
                                        <button
                                            type="button"
                                            onClick={() => setRefundData('amount', (paidAmount + walletAmount - refundedTotal).toFixed(2))}
                                            className="text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                                        >
                                            استرداد الكل
                                        </button>
                                    </div>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={refundData.amount}
                                        onChange={e => setRefundData('amount', e.target.value)}
                                        placeholder="0.00"
                                        className="font-sans"
                                    />
                                    {refundErrors.amount && (
                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                            <AlertCircle size={11} /> {refundErrors.amount}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-500">
                                        رقم المرجع <span className="text-slate-300 font-normal">(اختياري)</span>
                                    </Label>
                                    <Input
                                        value={refundData.reference_number}
                                        onChange={e => setRefundData('reference_number', e.target.value)}
                                        placeholder="رقم المعاملة أو الشيك..."
                                        className="font-sans placeholder:font-sans"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-500">
                                        سبب الاسترداد <span className="text-slate-300 font-normal">(اختياري)</span>
                                    </Label>
                                    <textarea
                                        value={refundData.notes}
                                        onChange={e => setRefundData('notes', e.target.value)}
                                        placeholder="أدخل سبب الاسترداد..."
                                        rows={3}
                                        className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                    />
                                </div>

                                {invoice.customer_id && (
                                    <label className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100/60 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={refundData.refund_to_wallet}
                                            onChange={e => setRefundData('refund_to_wallet', e.target.checked)}
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-semibold text-emerald-700">إضافة المبلغ لمحفظة العميل</span>
                                    </label>
                                )}
                            </div>

                            <DialogFooter className="px-6 pb-6 border-t pt-4">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowRefund(false)}>
                                    إلغاء
                                </Button>
                                <Button type="submit" size="sm" disabled={refunding || !refundData.amount} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {refunding ? 'جاري المعالجة...' : 'تأكيد الاسترداد'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </AdminLayout>
    );
}
