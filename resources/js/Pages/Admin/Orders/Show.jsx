import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowRight, ShoppingCart, Plus, Pencil, Trash2, Sparkles,
    Send, ChefHat, CreditCard, Tag, CheckCheck, Ban, FileText,
    Utensils, Clock, CheckCircle2, CircleOff, BadgeCheck,
    CircleDashed, Truck, Package, Users, Star, GitBranch,
} from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
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
    paid:           { label: 'مدفوع',     icon: BadgeCheck,   cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    partially_paid: { label: 'جزئي',      icon: CircleDashed, cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
    pending:        { label: 'غير مدفوع', icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
    unpaid:         { label: 'غير مدفوع', icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
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
export default function Show({ order }) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'SAR';

    const isDone = order.status === 'completed' || order.status === 'cancelled';
    const isPaid = order.payment_status === 'paid';

    const { data, setData, patch, processing: saving } = useForm({
        notes:         order.notes         || '',
        private_notes: order.private_notes || '',
    });
    const [noteSaved, setNoteSaved] = useState(false);

    const { post: submitCancel, processing: cancelling } = useForm();

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

    const discount           = Number(order.discount ?? 0);
    const totalAfterDiscount = Math.max(0, Number(order.total_amount) - discount);
    const totalPaid          = order.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const balance            = totalAfterDiscount - totalPaid;

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
                            <Pill map={TYPE_MAP}    value={order.type} />
                            <Pill map={STATUS_MAP}  value={order.status} />
                            <Pill map={PAYMENT_MAP} value={order.payment_status ?? 'unpaid'} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {new Date(order.created_at).toLocaleString('ar-SA')}
                        </p>
                    </div>
                </div>

                {!isDone && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href={route('pos.order', order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <Pencil size={13} /> تعديل الطلب
                        </Link>
                        {!isPaid && (
                            <Link
                                href={route('pos.checkout', order.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                            >
                                <CreditCard size={13} /> إجراء الدفع
                            </Link>
                        )}
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            <Ban size={13} /> إلغاء الطلب
                        </button>
                    </div>
                )}
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
                                                <div className="font-semibold text-sm text-slate-700">{item.menu_item?.name}</div>
                                                {item.addons?.length > 0 && item.addons.map(a => (
                                                    <div key={a.id} className="text-[11px] text-violet-500 mt-0.5">
                                                        + {a.quantity}× {a.menu_item?.name}
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
                    <SectionCard title="الحساب" icon={CreditCard} iconCls="bg-emerald-50 text-emerald-500">
                        <div className="space-y-2 text-sm max-w-xs mr-auto">
                            <div className="flex justify-between text-slate-500 font-semibold">
                                <span className="font-sans">{Number(order.total_amount).toFixed(2)} {currency}</span>
                                <span>المجموع الفرعي</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-red-400 font-semibold">
                                    <span className="font-sans">-{discount.toFixed(2)} {currency}</span>
                                    <span>الخصم</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-2">
                                <span className="font-sans">{totalAfterDiscount.toFixed(2)} {currency}</span>
                                <span>الإجمالي</span>
                            </div>
                            {order.payments?.length > 0 && (
                                <>
                                    <div className="pt-2 space-y-1.5">
                                        {order.payments.map(p => (
                                            <div key={p.id} className="flex justify-between text-slate-400 font-semibold text-xs">
                                                <span className="font-sans">{Number(p.amount).toFixed(2)} {currency}</span>
                                                <span>{p.payment_method?.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {balance > 0.009 && (
                                        <div className="flex justify-between text-amber-600 font-bold border-t border-slate-100 pt-2">
                                            <span className="font-sans">{balance.toFixed(2)} {currency}</span>
                                            <span>المتبقي</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
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
        </AdminLayout>
    );
}
