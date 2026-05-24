import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { Wallet, ArrowRight, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

const CURRENCY_SYMBOLS = { ILS: '₪', USD: '$', SAR: 'ر.س', EUR: '€' };

const REASON_LABELS = {
    payment_surplus:   'فائض دفع',
    payment_used:      'استخدام في دفع',
    manual_adjustment: 'تعديل يدوي',
    refund:            'استرداد',
};

function fmt(value, currency = 'ILS') {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${Number(value ?? 0).toFixed(2)} ${symbol}`;
}

function fmtDatetime(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('ar-SA', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Adjustment Form ───────────────────────────────────────────────────────────
function AdjustmentForm({ customer, currency }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        type:   'credit',
        amount: '',
        notes:  '',
    });

    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmitClick = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const handleConfirm = () => {
        setShowConfirm(false);
        post(route('admin.customers.wallet.adjust', customer.id), {
            onSuccess: () => reset('amount', 'notes'),
        });
    };

    const isDebit  = data.type === 'debit';
    const balance  = parseFloat(customer.wallet_balance ?? 0);
    const amount   = parseFloat(data.amount) || 0;
    const overDraw = isDebit && amount > balance;

    return (
        <>
            <Card className="shadow-sm border-slate-200/80">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                        <Wallet size={15} />
                    </div>
                    <h3 className="font-semibold text-slate-700 text-sm">تعديل الرصيد</h3>
                </div>
                <CardContent className="p-5">
                    <form onSubmit={handleSubmitClick} className="space-y-4">

                        {/* Type toggle */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setData('type', 'credit')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-bold transition-all',
                                    !isDebit
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                )}
                            >
                                <Plus size={15} />
                                إضافة رصيد
                            </button>
                            <button
                                type="button"
                                onClick={() => setData('type', 'debit')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-bold transition-all',
                                    isDebit
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                )}
                            >
                                <Minus size={15} />
                                خصم رصيد
                            </button>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">
                                المبلغ ({CURRENCY_SYMBOLS[currency] ?? currency})
                            </Label>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.amount}
                                onChange={e => setData('amount', e.target.value)}
                                placeholder="0.00"
                                className={cn(
                                    'font-sans text-base',
                                    (errors.amount || overDraw) && 'border-red-400 focus-visible:ring-red-400'
                                )}
                            />
                            {isDebit && (
                                <p className="text-[11px] text-slate-400 font-sans">
                                    الرصيد المتاح: <span className="font-bold text-emerald-600">{fmt(balance, currency)}</span>
                                </p>
                            )}
                            {overDraw && (
                                <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle size={11} /> الرصيد غير كافٍ
                                </p>
                            )}
                            {errors.amount && (
                                <p className="text-[11px] text-red-500 font-semibold">{errors.amount}</p>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">
                                سبب التعديل <span className="text-red-400">*</span>
                            </Label>
                            <textarea
                                value={data.notes}
                                onChange={e => setData('notes', e.target.value)}
                                rows={2}
                                placeholder="سبب التعديل..."
                                className={cn(
                                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-Cairo',
                                    errors.notes && 'border-red-400 focus-visible:ring-red-400'
                                )}
                            />
                            {errors.notes && (
                                <p className="text-[11px] text-red-500 font-semibold">{errors.notes}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={processing || overDraw || !data.amount || !data.notes}
                            className={cn(
                                'w-full font-bold',
                                isDebit
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            )}
                        >
                            {isDebit ? 'خصم الرصيد' : 'إضافة الرصيد'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Confirmation dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent dir="rtl" className="font-Cairo sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base">
                            {isDebit ? 'تأكيد خصم الرصيد' : 'تأكيد إضافة الرصيد'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-slate-600 space-y-2">
                        <p>
                            هل أنت متأكد من{' '}
                            <span className={cn('font-bold', isDebit ? 'text-red-600' : 'text-emerald-600')}>
                                {isDebit ? 'خصم' : 'إضافة'}
                            </span>
                            {' '}
                            <span className="font-bold font-sans">{fmt(data.amount, currency)}</span>
                            {' '}
                            {isDebit ? 'من' : 'إلى'} محفظة {customer.name}؟
                        </p>
                        {data.notes && (
                            <p className="text-xs text-slate-400 bg-slate-50 rounded p-2">
                                السبب: {data.notes}
                            </p>
                        )}
                    </div>
                    <DialogFooter className="gap-2 flex-row-reverse">
                        <Button
                            onClick={handleConfirm}
                            disabled={processing}
                            className={cn(
                                'font-bold',
                                isDebit ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            )}
                        >
                            {processing ? 'جارٍ التنفيذ...' : 'تأكيد'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowConfirm(false)}>
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ── Pagination bar ────────────────────────────────────────────────────────────
function Pagination({ meta }) {
    if (!meta || meta.last_page <= 1) return null;
    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-500">
            <span className="font-sans">
                صفحة {meta.current_page} من {meta.last_page}
            </span>
            <div className="flex gap-1">
                {meta.links?.map((link, i) => {
                    const isActive  = link.active;
                    const isDisabled = !link.url;
                    return (
                        <button
                            key={i}
                            disabled={isDisabled}
                            onClick={() => !isDisabled && router.get(link.url, {}, { preserveState: true })}
                            className={cn(
                                'min-w-[28px] h-7 px-2 rounded text-xs font-sans font-semibold transition-colors',
                                isActive
                                    ? 'bg-[#ee1d23] text-white'
                                    : isDisabled
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-600 hover:bg-slate-200'
                            )}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WalletPage({ customer, transactions }) {
    const { settings, auth } = usePage().props;
    const currency    = settings?.currency ?? 'ILS';
    const permissions = auth.user?.permissions ?? [];
    const canAdjust   = permissions.includes('admin.wallet_adjust');

    // Flash success from walletAdjust
    const { flash } = usePage().props;

    return (
        <AdminLayout title={`محفظة ${customer.name}`}>
            <Head title={`محفظة ${customer.name}`} />

            {/* Back link */}
            <Link
                href={route('admin.customers.index')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition-colors"
            >
                <ArrowRight size={13} />
                العودة لقائمة العملاء
            </Link>

            {/* Flash message */}
            {flash?.success && (
                <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg px-4 py-3">
                    <CheckCircle size={15} />
                    {flash.success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left column: balance card + adjustment form */}
                <div className="space-y-4">

                    {/* Balance card */}
                    <Card className="shadow-sm border-slate-200/80">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-lg font-black shrink-0">
                                    {customer.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-slate-800 text-base truncate">{customer.name}</p>
                                    {customer.phone && (
                                        <p className="text-xs text-slate-400 font-sans">{customer.phone}</p>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white">
                                <p className="text-[11px] text-white/50 uppercase tracking-wide font-semibold mb-1">
                                    الرصيد الحالي
                                </p>
                                <p className="text-3xl font-black font-sans leading-none">
                                    {fmt(customer.wallet_balance, currency)}
                                </p>
                                {customer.wallet_last_updated_at && (
                                    <p className="text-[10px] text-white/40 mt-2 font-sans">
                                        آخر تحديث: {fmtDatetime(customer.wallet_last_updated_at)}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manual adjustment form — admin only */}
                    {canAdjust && (
                        <AdjustmentForm customer={customer} currency={currency} />
                    )}
                </div>

                {/* Right column: transactions table */}
                <div className="lg:col-span-2">
                    <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 text-sm">سجل الحركات</h3>
                            <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">
                                {transactions.total}
                            </span>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                                    <TableHead className="text-xs font-semibold text-slate-400">التاريخ</TableHead>
                                    <TableHead className="text-center text-xs font-semibold text-slate-400">النوع</TableHead>
                                    <TableHead className="text-start text-xs font-semibold text-slate-400">المبلغ</TableHead>
                                    <TableHead className="text-start text-xs font-semibold text-slate-400">الرصيد بعد</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-400">السبب</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-400">المرجع</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-400">بواسطة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-slate-300">
                                            <Wallet size={28} className="mx-auto mb-2.5 opacity-40" />
                                            <p className="font-semibold text-sm">لا توجد حركات بعد</p>
                                        </TableCell>
                                    </TableRow>
                                ) : transactions.data.map(tx => (
                                    <TableRow key={tx.id} className="border-slate-100 hover:bg-slate-50/50">
                                        <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">
                                            {fmtDatetime(tx.created_at)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {tx.type === 'credit' ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-bold">إضافة</Badge>
                                            ) : (
                                                <Badge className="bg-red-100 text-red-700 border-0 text-xs font-bold">خصم</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={cn(
                                            'text-start font-sans font-bold text-sm',
                                            tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                                        )}>
                                            {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount, currency)}
                                        </TableCell>
                                        <TableCell className="text-start font-sans font-semibold text-slate-700 text-sm">
                                            {fmt(tx.balance_after, currency)}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            {REASON_LABELS[tx.reason] ?? tx.reason}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {tx.reference_label && tx.reference_id ? (
                                                <Link
                                                    href={route('admin.invoices.show', tx.reference_id)}
                                                    className="text-[#ee1d23] hover:underline font-mono font-semibold"
                                                >
                                                    {tx.reference_label}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            {tx.created_by?.name ?? 'النظام'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Pagination meta={transactions} />
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
