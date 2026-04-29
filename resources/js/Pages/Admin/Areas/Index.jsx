import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';

export default function Index({ areas, branches }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '', branch_id: branches[0]?.id || '',
    });

    const openCreate = () => { setEditing(null); reset(); setOpen(true); };
    const openEdit   = (a) => { setEditing(a); setData({ name: a.name, branch_id: a.branch_id }); setOpen(true); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { setOpen(false); reset(); } };
        editing ? put(route('admin.areas.update', editing.id), opts) : post(route('admin.areas.store'), opts);
    };

    return (
        <AdminLayout title="القاعات والمناطق">
            <Head title="القاعات" />

            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                    <h3 className="font-semibold text-slate-700 text-sm">القاعات والمناطق</h3>
                    <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{areas.length}</span>
                </div>
                <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                    <Plus size={13} /> إضافة قاعة
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {areas.map((area) => (
                    <Card key={area.id} className="shadow-sm border-slate-200/80 hover:shadow-md transition-shadow group overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                                    <MapPin size={16} />
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(area)} className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50">
                                        <Edit size={13} />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => confirm('حذف المنطقة سيؤدي لحذف طاولاتها، متأكد؟') && destroy(route('admin.areas.destroy', area.id))} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50">
                                        <Trash2 size={13} />
                                    </Button>
                                </div>
                            </div>
                            <h4 className="font-semibold text-slate-700 text-sm">{area.name}</h4>
                            <p className="text-xs text-slate-400 mt-1">{area.branch?.name}</p>
                        </CardContent>
                    </Card>
                ))}
                {areas.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-300">
                        <MapPin size={28} className="mb-2.5 opacity-40" />
                        <p className="text-sm font-semibold">لا توجد قاعات مسجلة بعد</p>
                    </div>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>{editing ? 'تعديل بيانات القاعة' : 'إضافة قاعة جديدة'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="الفرع" error={errors.branch_id}>
                                <select value={data.branch_id} onChange={e => setData('branch_id', e.target.value)} required
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <option value="">اختر فرعاً...</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </Field>
                            <Field label="اسم القاعة" error={errors.name}>
                                <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="قاعة العائلات" required />
                            </Field>
                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={processing}>حفظ</Button>
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
