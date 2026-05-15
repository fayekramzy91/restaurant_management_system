import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Plus, Edit, Trash2, Percent, CheckCircle2, CircleOff, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function Field({ label, error, children }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

function Toggle({ checked, onChange, label }) {
    return (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative w-9 h-5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring shrink-0',
                    checked ? 'bg-primary' : 'bg-slate-200'
                )}
            >
                <span className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                    checked ? 'translate-x-[-1.25rem]' : 'translate-x-[-0.25rem]'
                )} />
            </button>
            <span className="text-sm text-slate-600">{label}</span>
        </label>
    );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function Index({ taxRates }) {
    const { errors: pageErrors } = usePage().props;

    const [open, setOpen]           = useState(false);
    const [editing, setEditing]     = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name:        '',
        code:        '',
        rate:        '',
        is_compound: false,
        apply_order: 0,
        is_active:   true,
        is_default:  false,
    });

    const openCreate = () => {
        setEditing(null);
        reset();
        setOpen(true);
    };

    const openEdit = (tax) => {
        setEditing(tax);
        setData({
            name:        tax.name,
            code:        tax.code,
            rate:        tax.rate,
            is_compound: tax.is_compound,
            apply_order: tax.apply_order,
            is_active:   tax.is_active,
            is_default:  tax.is_default,
        });
        setOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { setOpen(false); reset(); } };
        editing
            ? put(route('admin.taxes.update', editing.id), opts)
            : post(route('admin.taxes.store'), opts);
    };

    const confirmDelete = (tax) => setDeleteTarget(tax);

    const handleDelete = () => {
        destroy(route('admin.taxes.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
            onError:   () => setDeleteTarget(null),
        });
    };

    return (
        <AdminLayout title="إدارة الضرائب">
            <Head title="الضرائب" />

            {/* ── Delete error banner ── */}
            {pageErrors?.delete && (
                <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={15} className="shrink-0" />
                    {pageErrors.delete}
                </div>
            )}

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                {/* ── Header ── */}
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">معدلات الضريبة</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">
                            {taxRates.filter(t => !t.deleted_at).length}
                        </span>
                    </div>
                    <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                        <Plus size={13} /> إضافة ضريبة
                    </Button>
                </div>

                {/* ── Table ── */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الاسم</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الكود</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">النسبة %</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">الترتيب</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">مركبة؟</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">افتراضية؟</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {taxRates.map((tax) => (
                            <TableRow
                                key={tax.id}
                                className={cn(
                                    'border-slate-100 hover:bg-slate-50/50 transition-colors group',
                                    tax.deleted_at && 'opacity-40'
                                )}
                            >
                                {/* Name */}
                                <TableCell className="font-semibold text-slate-700 text-sm">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">
                                            <Percent size={14} />
                                        </div>
                                        <div>
                                            <p>{tax.name}</p>
                                            {tax.deleted_at && (
                                                <span className="text-[10px] text-red-400 font-normal">محذوفة</span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Code */}
                                <TableCell>
                                    <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                        {tax.code}
                                    </span>
                                </TableCell>

                                {/* Rate */}
                                <TableCell className="text-center font-sans font-semibold text-slate-700">
                                    {parseFloat(tax.rate).toFixed(2)}%
                                </TableCell>

                                {/* Apply order */}
                                <TableCell className="text-center font-sans text-slate-400 text-sm">
                                    {tax.apply_order}
                                </TableCell>

                                {/* Compound */}
                                <TableCell className="text-center">
                                    {tax.is_compound
                                        ? <Badge variant="warning">مركبة</Badge>
                                        : <span className="text-slate-200">—</span>
                                    }
                                </TableCell>

                                {/* Default */}
                                <TableCell className="text-center">
                                    {tax.is_default
                                        ? <Badge variant="info">افتراضية</Badge>
                                        : <span className="text-slate-200">—</span>
                                    }
                                </TableCell>

                                {/* Active */}
                                <TableCell className="text-center">
                                    {tax.is_active
                                        ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80">
                                                <CheckCircle2 size={10} strokeWidth={2.2} /> فعّالة
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                                                <CircleOff size={10} strokeWidth={2.2} /> معطّلة
                                            </span>
                                        )
                                    }
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="text-left">
                                    {!tax.deleted_at && (
                                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => openEdit(tax)}
                                                className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50"
                                            >
                                                <Edit size={13} />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => confirmDelete(tax)}
                                                className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 size={13} />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}

                        {taxRates.filter(t => !t.deleted_at).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-16 text-slate-300">
                                    <Percent size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد معدلات ضريبة بعد</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* ── Create / Edit Dialog ── */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>
                            {editing ? 'تعديل الضريبة' : 'إضافة ضريبة جديدة'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="px-6 py-4 space-y-4">
                            {/* Name */}
                            <Field label="الاسم" error={errors.name}>
                                <Input
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="مثال: ضريبة القيمة المضافة"
                                    required
                                />
                            </Field>

                            {/* Code + Rate side by side */}
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="الكود" error={errors.code}>
                                    <Input
                                        value={data.code}
                                        onChange={e => setData('code', e.target.value.toUpperCase())}
                                        placeholder="مثال: VAT"
                                        className="font-mono"
                                        required
                                    />
                                </Field>
                                <Field label="النسبة %" error={errors.rate}>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={data.rate}
                                        onChange={e => setData('rate', e.target.value)}
                                        placeholder="15.00"
                                        className="font-sans"
                                        required
                                    />
                                </Field>
                            </div>

                            {/* Apply order */}
                            <Field label="ترتيب التطبيق" error={errors.apply_order}>
                                <Input
                                    type="number"
                                    min="0"
                                    value={data.apply_order}
                                    onChange={e => setData('apply_order', parseInt(e.target.value) || 0)}
                                    className="font-sans"
                                />
                            </Field>

                            {/* Toggles */}
                            <div className="space-y-3 pt-1">
                                <Toggle
                                    checked={data.is_compound}
                                    onChange={v => setData('is_compound', v)}
                                    label="ضريبة مركبة (تُطبَّق على المبلغ المتراكم)"
                                />
                                <Toggle
                                    checked={data.is_active}
                                    onChange={v => setData('is_active', v)}
                                    label="فعّالة"
                                />
                                <Toggle
                                    checked={data.is_default}
                                    onChange={v => setData('is_default', v)}
                                    label="افتراضية (تُطبَّق تلقائياً على الأصناف الجديدة)"
                                />
                            </div>
                        </div>

                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {editing ? 'حفظ التعديلات' : 'إضافة'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirm Dialog ── */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="max-w-sm" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle size={18} />
                            تأكيد الحذف
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-4 text-sm text-slate-600">
                        هل أنت متأكد من حذف ضريبة{' '}
                        <span className="font-bold text-slate-800">{deleteTarget?.name}</span>؟
                        <br />
                        <span className="text-xs text-slate-400 mt-1 block">
                            لا يمكن حذفها إذا كانت مرتبطة بفواتير سابقة.
                        </span>
                    </div>
                    <DialogFooter className="px-6 pb-6 border-t pt-4">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            حذف
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
