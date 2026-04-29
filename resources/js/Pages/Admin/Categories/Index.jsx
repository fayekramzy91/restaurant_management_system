import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Edit, Trash2, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';

export default function Index({ categories }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '', sort_order: 0,
    });

    const openCreate = () => { setEditing(null); reset(); setOpen(true); };
    const openEdit   = (c) => { setEditing(c); setData({ name: c.name, sort_order: c.sort_order || 0 }); setOpen(true); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { setOpen(false); reset(); } };
        editing ? put(route('admin.categories.update', editing.id), opts) : post(route('admin.categories.store'), opts);
    };

    return (
        <AdminLayout title="إدارة التصنيفات">
            <Head title="التصنيفات" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">التصنيفات</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{categories.length}</span>
                    </div>
                    <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                        <Plus size={13} /> إضافة تصنيف
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">اسم التصنيف</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">الترتيب</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">العمليات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                <TableCell className="font-semibold text-slate-700 text-sm">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-primary/8 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                            {category.name.charAt(0)}
                                        </div>
                                        {category.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-sans text-slate-400 text-sm">{category.sort_order}</TableCell>
                                <TableCell className="text-left">
                                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(category)} className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50">
                                            <Edit size={13} />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => confirm('هل أنت متأكد من حذف هذا التصنيف؟') && destroy(route('admin.categories.destroy', category.id))} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50">
                                            <Trash2 size={13} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-16 text-slate-300">
                                    <LayoutGrid size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد تصنيفات بعد</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>{editing ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="اسم التصنيف" error={errors.name}>
                                <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="مثال: وجبات رئيسية" required />
                            </Field>
                            <Field label="ترتيب العرض">
                                <Input type="number" value={data.sort_order} onChange={e => setData('sort_order', e.target.value)} className="font-sans" />
                            </Field>
                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={processing}>{editing ? 'حفظ التعديلات' : 'إضافة'}</Button>
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
