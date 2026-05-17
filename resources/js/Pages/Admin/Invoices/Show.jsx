import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowRight, ReceiptText, CreditCard,
    BadgeCheck, CircleDashed, CircleOff, Ban, RotateCcw,
    ShoppingCart, CheckCheck, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
    paid:     { label: 'مدفوع',     icon: BadgeCheck,   cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    partial:  { label: 'جزئي',      icon: CircleDashed, cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
    draft:    { label: 'غير مدفوع', icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
    void:     { label: 'ملغاة',     icon: Ban,          cls: 'bg-red-50 text-red-400 ring-1 ring-red-200/80' },
    refunded: { label: 'مسترد',     icon: RotateCcw,    cls: 'bg-blue-50 text-blue-500 ring-1 ring-blue-200/80' },
};

function Pill({ value }) {
    const def = STATUS_MAP[value] ?? { label: value, icon: null, cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' };
    const Icon = def.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', def.cls)}>
            {Icon && <Icon size={10} strokeWidth={2.2} />}
            {def.label}
        </span>
    );
}

function SectionCard({ title, icon: Icon, iconCls, children }) {
    return (
        <Card className="shadow-sm border-slate-200/80 overflow-hidden">
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

export default function Show({ invoice, payment_methods, displayTaxBreakdown }) {
    const { settings, auth } = usePage().props;
    const currency    = settings?.currency ?? 'SAR';
    const permissions = auth.user?.permissions ?? [];

    const subtotal     = Number(invoice.subtotal);
    const discount     = Number(invoice.discount);
    const taxAmount    = Number(invoice.tax_amount);
    const total        = Number(invoice.total);
    const paidAmount   = Number(invoice.paid_amount);
    const walletAmount = Number(invoice.wallet_amount);
    const refunded     = invoice.payment_entries
        ?.filter(e => e.type === 'refund')
        .reduce((s, e) => s + Number(e.amount), 0) ?? 0;
    const netPaid  = paidAmount + walletAmount - refunded;
    const balance  = Math.max(0, total - paidAmount - walletAmount);

    const [showRefund, setShowRefund] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        payment_method_id: payment_methods?.[0]?.id ?? '',
        amount: '',
        reference_number: '',
        notes: '',
        refund_to_wallet: false,
    });

    const handleRefund = (e) => {
        e.preventDefault();
        post(route('admin.invoices.refund', invoice.id), {
            preserveScroll: true,
            onSuccess: () => { setShowRefund(false); reset(); },
        });
    };

    return (
        <AdminLayout title={`فاتورة ${invoice.invoice_number}`}>
            <Head title={`فاتورة ${invoice.invoice_number}`} />

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('admin.invoices.index')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowRight size={17} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="font-bold text-slate-800 text-base font-mono">{invoice.invoice_number}</h1>
                            <Pill value={invoice.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {invoice.issued_at
                                ? new Date(invoice.issued_at).toLocaleString('ar-SA')
                                : '—'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={route('admin.orders.show', invoice.order_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <ShoppingCart size={13} /> عرض الطلب #{invoice.order_id}
                    </Link>
                    {permissions.includes('invoices.refund') && invoice.status !== 'void' && netPaid > 0 && (
                        <button
                            onClick={() => setShowRefund(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-semibold text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                            <RotateCcw size={13} /> إجراء استرداد
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">

                    {/* Invoice info */}
                    <SectionCard title="معلومات الفاتورة" icon={ReceiptText} iconCls="bg-slate-100 text-slate-500">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { label: 'رقم الطلب',  value: `#${invoice.order_id}` },
                                { label: 'العميل',     value: invoice.customer?.name ?? '—' },
                                { label: 'الفرع',      value: invoice.branch?.name ?? '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
                                    <p className="text-sm font-semibold text-slate-700">{value}</p>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Financial breakdown */}
                    <SectionCard title="الحساب" icon={CreditCard} iconCls="bg-emerald-50 text-emerald-500">
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
                            {displayTaxBreakdown && invoice.taxes?.length > 0
                                ? invoice.taxes.map(tax => (
                                    <div key={tax.id} className="flex justify-between text-slate-500 font-semibold">
                                        <span className="font-sans">+{Number(tax.tax_amount).toFixed(2)} {currency}</span>
                                        <span>{tax.tax_name} <span className="font-sans text-slate-400">({Number(tax.rate)}%)</span></span>
                                    </div>
                                ))
                                : taxAmount > 0 && (
                                    <div className="flex justify-between text-slate-500 font-semibold">
                                        <span className="font-sans">+{taxAmount.toFixed(2)} {currency}</span>
                                        <span>الضريبة</span>
                                    </div>
                                )
                            }
                            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-2">
                                <span className="font-sans">{total.toFixed(2)} {currency}</span>
                                <span>الإجمالي</span>
                            </div>
                            {walletAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-semibold pt-1">
                                    <span className="font-sans">{walletAmount.toFixed(2)} {currency}</span>
                                    <span>محفظة</span>
                                </div>
                            )}
                            {balance > 0.009 && (
                                <div className="flex justify-between text-amber-600 font-bold border-t border-slate-100 pt-2">
                                    <span className="font-sans">{balance.toFixed(2)} {currency}</span>
                                    <span>المتبقي</span>
                                </div>
                            )}
                            {refunded > 0 && (
                                <div className="flex justify-between text-blue-500 font-bold">
                                    <span className="font-sans">{refunded.toFixed(2)} {currency}</span>
                                    <span>إجمالي المسترد</span>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* Payment entries */}
                    <SectionCard title="سجل المدفوعات" icon={CreditCard} iconCls="bg-blue-50 text-blue-500">
                        {invoice.payment_entries?.length > 0 ? (
                            <div className="rounded-xl border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">النوع</TableHead>
                                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">طريقة الدفع</TableHead>
                                            <TableHead className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">المبلغ</TableHead>
                                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">المرجع</TableHead>
                                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الملاحظات</TableHead>
                                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الموظف</TableHead>
                                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">التوقيت</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoice.payment_entries.map(entry => (
                                            <TableRow key={entry.id} className="border-slate-100 hover:bg-slate-50/40">
                                                <TableCell>
                                                    {entry.type === 'refund' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">
                                                            <RotateCcw size={9} /> استرداد
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                                                            <CheckCheck size={9} /> دفع
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {entry.payment_method?.name ?? '—'}
                                                </TableCell>
                                                <TableCell className={cn('text-left font-sans font-bold text-sm', entry.type === 'refund' ? 'text-blue-500' : 'text-slate-700')}>
                                                    {entry.type === 'refund' ? '-' : '+'}{Number(entry.amount).toFixed(2)} {currency}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-slate-400">
                                                    {entry.reference_number ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 max-w-[180px]">
                                                    {entry.notes
                                                        ? <span className="block truncate" title={entry.notes}>{entry.notes}</span>
                                                        : <span className="text-slate-300">—</span>}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {entry.processed_by?.name ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-400 font-sans whitespace-nowrap">
                                                    {new Date(entry.created_at).toLocaleString('ar-SA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-6">لا توجد مدفوعات مسجلة</p>
                        )}
                    </SectionCard>
                </div>

                {/* Right: order items summary */}
                <div className="space-y-5">
                    {(() => {
                        // Prefer immutable invoice_items snapshot; fall back to live order items for legacy invoices
                        const useSnapshot = invoice.items?.length > 0;
                        const displayItems = useSnapshot
                            ? invoice.items.filter(i => !i.is_addon)
                            : (invoice.order?.items ?? []);
                        if (displayItems.length === 0) return null;
                        return (
                            <SectionCard title="الأصناف" icon={ShoppingCart} iconCls="bg-orange-50 text-orange-400">
                                <div className="space-y-2">
                                    {displayItems.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <div>
                                                <span className="font-semibold text-slate-700">
                                                    {item.quantity}× {useSnapshot
                                                        ? item.name
                                                        : (item.name ?? item.menu_item?.name ?? '[صنف محذوف]')}
                                                </span>
                                                {(useSnapshot ? item.addons : item.addons)?.map(a => (
                                                    <div key={a.id} className="text-[11px] text-violet-500">
                                                        + {useSnapshot
                                                            ? a.name
                                                            : (a.name ?? a.menu_item?.name ?? '[إضافة محذوفة]')}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="font-sans font-semibold text-slate-500">
                                                {(Number(useSnapshot ? item.unit_price : item.price) * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        );
                    })()}

                    {/* Notes */}
                    {(invoice.notes || invoice.private_notes) && (
                        <SectionCard title="الملاحظات" icon={ReceiptText} iconCls="bg-slate-100 text-slate-500">
                            {invoice.notes && (
                                <div className="mb-3">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">ملاحظات عامة</p>
                                    <p className="text-sm text-slate-600">{invoice.notes}</p>
                                </div>
                            )}
                            {invoice.private_notes && (
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">ملاحظات داخلية</p>
                                    <p className="text-sm text-slate-600 bg-amber-50/60 rounded-lg px-3 py-2">{invoice.private_notes}</p>
                                </div>
                            )}
                        </SectionCard>
                    )}
                </div>
            </div>

            {/* Refund modal */}
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

                    <form onSubmit={handleRefund}>
                        <div className="px-6 py-4 space-y-4">
                            {/* Max refundable notice */}
                            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <AlertCircle size={14} className="text-slate-400 shrink-0" />
                                <p className="text-xs text-slate-500 font-semibold">
                                    الحد الأقصى للاسترداد:
                                    <span className="font-bold text-slate-700 font-sans mr-1">{netPaid.toFixed(2)} {currency}</span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500">طريقة الاسترداد</Label>
                                <select
                                    value={data.payment_method_id}
                                    onChange={e => setData('payment_method_id', e.target.value)}
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
                                        onClick={() => setData('amount', netPaid.toFixed(2))}
                                        className="text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                                    >
                                        استرداد الكل
                                    </button>
                                </div>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={netPaid}
                                    value={data.amount}
                                    onChange={e => setData('amount', e.target.value)}
                                    placeholder="0.00"
                                    className="font-sans"
                                />
                                {errors.amount && (
                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                        <AlertCircle size={11} /> {errors.amount}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500">
                                    رقم المرجع <span className="text-slate-300 font-normal">(اختياري)</span>
                                </Label>
                                <Input
                                    value={data.reference_number}
                                    onChange={e => setData('reference_number', e.target.value)}
                                    placeholder="رقم المعاملة أو الشيك..."
                                    className="font-sans placeholder:font-sans"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500">
                                    سبب الاسترداد <span className="text-slate-300 font-normal">(اختياري)</span>
                                </Label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="أدخل سبب الاسترداد..."
                                    rows={3}
                                    className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                />
                            </div>

                            {invoice.customer_id && (
                                <label className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100/60 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={data.refund_to_wallet}
                                        onChange={e => setData('refund_to_wallet', e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-semibold text-emerald-700">إضافة المبلغ لمحفظة العميل</span>
                                </label>
                            )}
                        </div>

                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setShowRefund(false); reset(); }}>
                                إلغاء
                            </Button>
                            <Button type="submit" size="sm" disabled={processing || !data.amount} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {processing ? 'جاري المعالجة...' : 'تأكيد الاسترداد'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
