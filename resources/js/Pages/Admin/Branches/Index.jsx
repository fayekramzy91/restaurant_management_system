import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Edit, Trash2, Store, Star, GitBranch } from 'lucide-react';
import { useState } from 'react';
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

export default function Index({ branches }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '', address: '', phone: '', is_main: false,
    });

    const openCreate = () => { setEditing(null); reset(); setOpen(true); };
    const openEdit   = (b)  => { setEditing(b); setData({ name: b.name, address: b.address || '', phone: b.phone || '', is_main: !!b.is_main }); setOpen(true); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { setOpen(false); reset(); } };
        editing ? put(route('admin.branches.update', editing.id), opts) : post(route('admin.branches.store'), opts);
    };

    return (
        <AdminLayout title="إدارة الأفرع">
            <Head title="الأفرع" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الأفرع</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{branches.length}</span>
                    </div>
                    <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                        <Plus size={13} /> إضافة فرع
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الاسم</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">العنوان</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الجوال</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">النوع</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">العمليات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {branches.map((branch) => (
                            <TableRow key={branch.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                <TableCell className="font-semibold text-slate-700 text-sm">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                            <Store size={14} />
                                        </div>
                                        {branch.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-400 text-sm">{branch.address || <span className="text-slate-200">—</span>}</TableCell>
                                <TableCell className="text-slate-400 text-sm font-sans">{branch.phone || <span className="text-slate-200">—</span>}</TableCell>
                                <TableCell>
                                    {branch.is_main
                                        ? <Pill icon={Star}      label="رئيسي" cls="bg-violet-50 text-violet-600 ring-1 ring-violet-200/80" />
                                        : <Pill icon={GitBranch} label="فرعي"  cls="bg-slate-100 text-slate-400 ring-1 ring-slate-200" />
                                    }
                                </TableCell>
                                <TableCell className="text-left">
                                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(branch)} className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50">
                                            <Edit size={13} />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => confirm('هل أنت متأكد من حذف هذا الفرع؟') && destroy(route('admin.branches.destroy', branch.id))} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50">
                                            <Trash2 size={13} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {branches.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-16 text-slate-300">
                                    <Store size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد أفرع مسجلة بعد</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>{editing ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="اسم الفرع" error={errors.name}>
                                <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="مطعم الرياض" required />
                            </Field>
                            <Field label="العنوان">
                                <Input value={data.address} onChange={e => setData('address', e.target.value)} placeholder="المدينة، الحي، الشارع" />
                            </Field>
                            <Field label="رقم الجوال">
                                <Input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+966 5x xxx xxxx" className="font-sans" />
                            </Field>
                            <div className="flex items-center gap-2 pt-1">
                                <input type="checkbox" id="is_main" checked={data.is_main} onChange={e => setData('is_main', e.target.checked)} className="rounded border-input text-primary" />
                                <Label htmlFor="is_main" className="cursor-pointer font-bold">تعيين كفرع رئيسي</Label>
                            </div>
                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={processing}>{editing ? 'حفظ التعديلات' : 'إضافة الفرع'}</Button>
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
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
