import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Edit, Trash2, LayoutGrid, CheckCircle2, Users, Clock, MapPin, Circle, Square, RectangleHorizontal, QrCode, Download, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

/* ── Status pills ───────────────────────────────── */
const TABLE_STATUS = {
    available: { label: 'متاحة',  icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    occupied:  { label: 'مشغولة', icon: Users,        cls: 'bg-red-50 text-red-400 ring-1 ring-red-200/80' },
    reserved:  { label: 'محجوزة', icon: Clock,        cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
};

/* ── Shape definitions ──────────────────────────── */
const SHAPES = {
    rectangle: { label: 'مستطيلة',  icon: RectangleHorizontal },
    square:    { label: 'مربعة',    icon: Square },
    round:     { label: 'دائرية',   icon: Circle },
    oval:      { label: 'بيضاوية',  icon: Circle },
};

function Pill({ icon: Icon, label, cls }) {
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', cls)}>
            {Icon && <Icon size={10} strokeWidth={2.2} />}
            {label}
        </span>
    );
}

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function QrModal({ table, open, onClose }) {
    const canvasRef = useRef(null);
    const [generating, setGenerating] = useState(false);

    const qrUrl = table?.qr_token
        ? `${window.location.origin}/menu/${table.qr_token}`
        : null;

    useEffect(() => {
        if (!open || !qrUrl) return;
        // Wait for canvas to be mounted
        const timer = setTimeout(() => {
            if (!canvasRef.current) return;
            QRCode.toCanvas(canvasRef.current, qrUrl, {
                width: 260,
                margin: 2,
                color: { dark: '#1c0a0b', light: '#ffffff' },
            });
        }, 50);
        return () => clearTimeout(timer);
    }, [open, qrUrl]);

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `table-${table?.name ?? 'qr'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const generateToken = () => {
        setGenerating(true);
        router.post(route('admin.tables.generate-qr', table.id), {}, {
            onFinish: () => { setGenerating(false); onClose(); },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm" dir="rtl">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>رمز QR — طاولة {table?.name}</DialogTitle>
                </DialogHeader>
                <div className="px-6 pb-6 flex flex-col items-center gap-4">
                    {qrUrl ? (
                        <>
                            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <canvas ref={canvasRef} />
                            </div>
                            <p className="text-[10px] text-slate-400 text-center break-all font-sans leading-relaxed">
                                {qrUrl}
                            </p>
                            <Button onClick={download} className="gap-2 w-full">
                                <Download size={14} /> تحميل رمز QR (PNG)
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="py-10 flex flex-col items-center gap-3 text-slate-300">
                                <QrCode size={52} strokeWidth={1} />
                                <p className="text-sm font-semibold text-slate-400">لم يتم إنشاء رمز QR بعد</p>
                                <p className="text-[12px] text-slate-300 text-center">
                                    بعد الإنشاء يمكن للعملاء مسح الرمز لعرض القائمة والطلب
                                </p>
                            </div>
                            <Button onClick={generateToken} disabled={generating} className="gap-2 w-full">
                                <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                                إنشاء رمز QR
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Index({ tables, areas }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [qrTable, setQrTable] = useState(null);

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '', area_id: areas[0]?.id || '', status: 'available',
        min_capacity: 1, max_capacity: '', shape: '', location: '',
    });

    const openCreate = () => { setEditing(null); reset(); setOpen(true); };
    const openEdit   = (t) => {
        setEditing(t);
        setData({
            name:         t.name,
            area_id:      t.area_id,
            status:       t.status,
            min_capacity: t.min_capacity ?? 1,
            max_capacity: t.max_capacity ?? '',
            shape:        t.shape ?? '',
            location:     t.location ?? '',
        });
        setOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { setOpen(false); reset(); } };
        editing ? put(route('admin.tables.update', editing.id), opts) : post(route('admin.tables.store'), opts);
    };

    return (
        <AdminLayout title="إدارة الطاولات">
            <Head title="الطاولات" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الطاولات</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{tables.length}</span>
                    </div>
                    <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                        <Plus size={13} /> إضافة طاولة
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الطاولة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">القاعة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الشكل</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">السعة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الموقع</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">العمليات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tables.map((table) => {
                            const s     = TABLE_STATUS[table.status] ?? { label: table.status, icon: null, cls: 'bg-slate-100 text-slate-400 ring-1 ring-slate-200' };
                            const shape = table.shape ? SHAPES[table.shape] : null;
                            return (
                                <TableRow key={table.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                    <TableCell className="font-semibold text-slate-700 text-sm">{table.name}</TableCell>
                                    <TableCell className="text-slate-400 text-sm">{table.area?.name ?? <span className="text-slate-200">—</span>}</TableCell>
                                    <TableCell>
                                        {shape
                                            ? <Pill icon={shape.icon} label={shape.label} cls="bg-slate-100 text-slate-500 ring-1 ring-slate-200" />
                                            : <span className="text-slate-200 text-xs">—</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {table.max_capacity ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                                                <Users size={12} className="text-slate-300" />
                                                {table.min_capacity}–{table.max_capacity}
                                            </span>
                                        ) : table.min_capacity ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                                                <Users size={12} className="text-slate-300" />
                                                {table.min_capacity}+
                                            </span>
                                        ) : (
                                            <span className="text-slate-200 text-xs">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {table.location
                                            ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                                                    <MapPin size={11} className="text-slate-300 shrink-0" />
                                                    {table.location}
                                                </span>
                                            )
                                            : <span className="text-slate-200 text-xs">—</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Pill icon={s.icon} label={s.label} cls={s.cls} />
                                    </TableCell>
                                    <TableCell className="text-left">
                                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => setQrTable(table)}
                                                className={cn(
                                                    'h-7 w-7 hover:bg-emerald-50',
                                                    table.qr_token ? 'text-emerald-500 hover:text-emerald-700' : 'text-slate-300 hover:text-emerald-600'
                                                )}
                                                title={table.qr_token ? 'عرض رمز QR' : 'إنشاء رمز QR'}
                                            >
                                                <QrCode size={13} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(table)} className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50">
                                                <Edit size={13} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => confirm('هل أنت متأكد؟') && destroy(route('admin.tables.destroy', table.id))} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50">
                                                <Trash2 size={13} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {tables.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-16 text-slate-300">
                                    <LayoutGrid size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد طاولات بعد</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <QrModal table={qrTable} open={!!qrTable} onClose={() => setQrTable(null)} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>{editing ? 'تعديل بيانات الطاولة' : 'إضافة طاولة جديدة'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="px-6 py-4 space-y-4">

                            {/* Area + Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="القاعة / المنطقة" error={errors.area_id}>
                                    <select value={data.area_id} onChange={e => setData('area_id', e.target.value)} required className={selectCls}>
                                        <option value="">اختر منطقة...</option>
                                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="رقم / اسم الطاولة" error={errors.name}>
                                    <Input value={data.name} onChange={e => setData('name', e.target.value)} className="font-sans" required />
                                </Field>
                            </div>

                            {/* Min + Max capacity */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="الحد الأدنى للمقاعد" error={errors.min_capacity}>
                                    <div className="relative">
                                        <Users size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <Input
                                            type="number" min="1" max="50"
                                            value={data.min_capacity}
                                            onChange={e => setData('min_capacity', e.target.value)}
                                            className="font-sans pr-8"
                                            required
                                        />
                                    </div>
                                </Field>
                                <Field label="الحد الأقصى للمقاعد" error={errors.max_capacity}>
                                    <div className="relative">
                                        <Users size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <Input
                                            type="number" min="1" max="50"
                                            value={data.max_capacity}
                                            onChange={e => setData('max_capacity', e.target.value)}
                                            placeholder="اختياري"
                                            className="font-sans pr-8"
                                        />
                                    </div>
                                </Field>
                            </div>

                            {/* Shape + Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="شكل الطاولة" error={errors.shape}>
                                    <select value={data.shape} onChange={e => setData('shape', e.target.value)} className={selectCls}>
                                        <option value="">غير محدد</option>
                                        <option value="rectangle">مستطيلة</option>
                                        <option value="square">مربعة</option>
                                        <option value="round">دائرية</option>
                                        <option value="oval">بيضاوية</option>
                                    </select>
                                </Field>
                                <Field label="الحالة" error={errors.status}>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className={selectCls}>
                                        <option value="available">متاحة</option>
                                        <option value="occupied">مشغولة</option>
                                        <option value="reserved">محجوزة</option>
                                    </select>
                                </Field>
                            </div>

                            {/* Location */}
                            <Field label="الموقع" error={errors.location}>
                                <div className="relative">
                                    <MapPin size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <Input
                                        value={data.location}
                                        onChange={e => setData('location', e.target.value)}
                                        placeholder="مثال: بجانب النافذة، الركن الجنوبي..."
                                        className="pr-8"
                                    />
                                </div>
                            </Field>

                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={processing}>حفظ البيانات</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

function Field({ label, error, children }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500">{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
}
