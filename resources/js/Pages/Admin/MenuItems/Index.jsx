import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { Plus, Edit, Trash2, Utensils, CheckCircle2, CircleOff, Sparkles, Clock, ImageIcon, X, RotateCcw, Archive } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

function Pill({ icon: Icon, label, cls }) {
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', cls)}>
            {Icon && <Icon size={10} strokeWidth={2.2} />}
            {label}
        </span>
    );
}

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function Index({ menuItems, archived, categories }) {
    const { settings } = usePage().props;
    const currency = settings?.currency || 'SAR';

    const [activeTab, setActiveTab] = useState('active');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const { data, setData, post, delete: destroy, reset, errors, processing } = useForm({
        _method: '',
        name: '', category_id: categories[0]?.id || '', price: '',
        description: '', status: 'available', is_addon: false,
        preparing_duration: '', image: null,
    });

    const openCreate = () => {
        setEditing(null);
        setPreview(null);
        reset();
        setOpen(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setPreview(null);
        setData({
            _method: 'put',
            name: item.name,
            category_id: item.category_id,
            price: item.price,
            description: item.description || '',
            status: item.status,
            is_addon: Boolean(item.is_addon),
            preparing_duration: item.preparing_duration || '',
            image: null,
        });
        setOpen(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('image', file);
        setPreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setData('image', null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submit = (e) => {
        e.preventDefault();
        const opts = { forceFormData: true, onSuccess: () => { setOpen(false); setPreview(null); } };
        const url = editing
            ? route('admin.menu-items.update', editing.id)
            : route('admin.menu-items.store');
        post(url, opts);
    };

    const currentImage = preview || (editing?.image ?? null);

    const handleRestore = (item) => {
        router.post(route('admin.menu-items.restore', item.id));
    };

    const handleForceDelete = (item) => {
        if (confirm(`هل أنت متأكد من الحذف النهائي لـ "${item.name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
            router.delete(route('admin.menu-items.force-destroy', item.id));
        }
    };

    return (
        <AdminLayout title="قائمة الطعام">
            <Head title="المنيو" />

            {/* Tab switcher */}
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('active')}
                    className={cn(
                        'pb-3 px-1 text-sm font-semibold border-b-2 transition-colors',
                        activeTab === 'active'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    )}
                >
                    الأصناف النشطة
                    <span className={cn('mr-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full font-sans', activeTab === 'active' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400')}>
                        {menuItems.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('archived')}
                    className={cn(
                        'pb-3 px-1 text-sm font-semibold border-b-2 transition-colors',
                        activeTab === 'archived'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    )}
                >
                    الأصناف المؤرشفة
                    {archived.length > 0 && (
                        <span className={cn('mr-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full font-sans', activeTab === 'archived' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400')}>
                            {archived.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'active' && (
            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">أصناف المنيو</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{menuItems.length}</span>
                    </div>
                    <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                        <Plus size={13} /> إضافة صنف
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الصنف</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">التصنيف</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">السعر</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">وقت التحضير</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">العمليات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {menuItems.map((item) => (
                            <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                            {item.image
                                                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                : <Utensils size={14} className="text-slate-400" />
                                            }
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                                                {item.name}
                                                {Boolean(item.is_addon) && (
                                                    <Pill icon={Sparkles} label="إضافة" cls="bg-violet-50 text-violet-500 ring-1 ring-violet-200/80" />
                                                )}
                                            </div>
                                            {item.description && (
                                                <p className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5">{item.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {item.category?.name}
                                    </span>
                                </TableCell>
                                <TableCell className="font-semibold font-sans text-slate-700 text-sm">
                                    {item.price} <span className="text-xs text-slate-400 font-normal">{currency}</span>
                                </TableCell>
                                <TableCell>
                                    {item.preparing_duration
                                        ? <Pill icon={Clock} label={`${item.preparing_duration} د`} cls="bg-blue-50 text-blue-500 ring-1 ring-blue-200/80" />
                                        : <span className="text-slate-200 text-xs">—</span>
                                    }
                                </TableCell>
                                <TableCell>
                                    {item.status === 'available'
                                        ? <Pill icon={CheckCircle2} label="متوفر"     cls="bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80" />
                                        : <Pill icon={CircleOff}    label="غير متوفر" cls="bg-slate-100 text-slate-400 ring-1 ring-slate-200" />
                                    }
                                </TableCell>
                                <TableCell className="text-left">
                                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50">
                                            <Edit size={13} />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => confirm('هل أنت متأكد؟ سيتم أرشفة الصنف ويمكن استعادته لاحقاً.') && destroy(route('admin.menu-items.destroy', item.id))} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50">
                                            <Archive size={13} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {menuItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-16 text-slate-300">
                                    <Utensils size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد أصناف بعد</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
            )}

            {activeTab === 'archived' && (
            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الأصناف المؤرشفة</h3>
                        <span className="bg-amber-100 text-amber-600 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{archived.length}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">هذه الأصناف مخفية من الطلبات الجديدة ولكن بياناتها محفوظة في السجلات التاريخية</p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الصنف</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">التصنيف</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">السعر</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">تاريخ الأرشفة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">العمليات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {archived.map((item) => (
                            <TableRow key={item.id} className="border-slate-100 hover:bg-amber-50/30 transition-colors group">
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden opacity-50">
                                            {item.image
                                                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                : <Utensils size={14} className="text-slate-400" />
                                            }
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-500 text-sm">{item.name}</div>
                                            {item.description && (
                                                <p className="text-[11px] text-slate-300 truncate max-w-[180px] mt-0.5">{item.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {item.category?.name}
                                    </span>
                                </TableCell>
                                <TableCell className="font-semibold font-sans text-slate-400 text-sm">
                                    {item.price} <span className="text-xs text-slate-300 font-normal">{currency}</span>
                                </TableCell>
                                <TableCell className="text-xs text-slate-400 font-sans">
                                    {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString('ar-SA') : '—'}
                                </TableCell>
                                <TableCell className="text-left">
                                    <div className="flex items-center gap-1 justify-end">
                                        <Button variant="ghost" size="sm" onClick={() => handleRestore(item)} className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1">
                                            <RotateCcw size={11} /> استعادة
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleForceDelete(item)} className="h-7 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 gap-1">
                                            <Trash2 size={11} /> حذف نهائي
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {archived.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-16 text-slate-300">
                                    <Archive size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد أصناف مؤرشفة</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>{editing ? 'تعديل الصنف' : 'إضافة صنف جديد'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="px-6 py-4 space-y-4">

                            {/* Name + Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="اسم الصنف" error={errors.name}>
                                    <Input value={data.name} onChange={e => setData('name', e.target.value)} required />
                                </Field>
                                <Field label="التصنيف" error={errors.category_id}>
                                    <select value={data.category_id} onChange={e => setData('category_id', e.target.value)} required className={selectCls}>
                                        <option value="">اختر تصنيفاً...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {/* Price + Preparing duration */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="السعر" error={errors.price}>
                                    <Input type="number" step="0.01" value={data.price} onChange={e => setData('price', e.target.value)} className="font-sans" required />
                                </Field>
                                <Field label="وقت التحضير (بالدقائق)" error={errors.preparing_duration}>
                                    <div className="relative">
                                        <Clock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <Input
                                            type="number" min="1" max="300"
                                            value={data.preparing_duration}
                                            onChange={e => setData('preparing_duration', e.target.value)}
                                            placeholder="15"
                                            className="font-sans pr-8"
                                        />
                                    </div>
                                </Field>
                            </div>

                            {/* Description */}
                            <Field label="الوصف">
                                <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                    className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </Field>

                            {/* Status */}
                            <Field label="الحالة">
                                <select value={data.status} onChange={e => setData('status', e.target.value)} className={selectCls}>
                                    <option value="available">متوفر</option>
                                    <option value="out_of_stock">غير متوفر</option>
                                </select>
                            </Field>

                            {/* Featured image */}
                            <Field label="الصورة التعريفية" error={errors.image}>
                                <div className="space-y-3">
                                    {currentImage ? (
                                        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 group">
                                            <img src={currentImage} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={clearImage}
                                                className="absolute top-2 left-2 p-1 rounded-full bg-white/90 text-slate-500 hover:text-red-500 shadow transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                            {preview && (
                                                <span className="absolute bottom-2 right-2 text-[10px] bg-white/90 text-slate-500 px-2 py-0.5 rounded-full font-semibold">صورة جديدة</span>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
                                        >
                                            <ImageIcon size={22} />
                                            <span className="text-xs font-semibold">انقر لرفع صورة</span>
                                            <span className="text-[10px]">PNG, JPG حتى 3MB</span>
                                        </button>
                                    )}
                                    {currentImage && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                                        >
                                            تغيير الصورة
                                        </button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </Field>

                            {/* Add-on toggle */}
                            <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 p-4 rounded-xl">
                                <input type="checkbox" id="is_addon" checked={data.is_addon} onChange={e => setData('is_addon', e.target.checked)}
                                    className="rounded border-input text-violet-600 mt-0.5" />
                                <div>
                                    <Label htmlFor="is_addon" className="cursor-pointer text-violet-800">هذا الصنف إضافة (Add-on)</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">لن يظهر كصنف رئيسي، بل سيُطلب كإضافة للأصناف الأخرى.</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={processing}>حفظ الصنف</Button>
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
