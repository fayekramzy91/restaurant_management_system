import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Edit, Trash2, ShieldCheck, ShieldAlert, Users, Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

function Field({ label, error, children }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

// ── Permission Matrix ─────────────────────────────────────────────────────────

function PermissionMatrix({ role, permissionGroups, onClose }) {
    const [checkedIds, setCheckedIds] = useState(role.permission_ids ?? []);
    const [processing, setProcessing]  = useState(false);

    const toggle = (id) =>
        setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const groupAllChecked = (group) => group.permissions.every(p => checkedIds.includes(p.id));
    const groupSomeChecked = (group) => group.permissions.some(p => checkedIds.includes(p.id));

    const toggleGroup = (group) => {
        const ids = group.permissions.map(p => p.id);
        if (groupAllChecked(group)) {
            setCheckedIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setCheckedIds(prev => [...new Set([...prev, ...ids])]);
        }
    };

    const selectAll = () =>
        setCheckedIds(permissionGroups.flatMap(g => g.permissions.map(p => p.id)));
    const clearAll = () => setCheckedIds([]);

    const save = () => {
        setProcessing(true);
        router.post(
            route('admin.roles.permissions', role.id),
            { permissions: checkedIds },
            {
                onSuccess: () => { setProcessing(false); onClose(); },
                onError:   () => setProcessing(false),
            }
        );
    };

    const totalPerms = permissionGroups.reduce((n, g) => n + g.permissions.length, 0);

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" dir="rtl">
                <DialogHeader className="px-6 pt-6 shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-[#ee1d23]" />
                        صلاحيات: {role.display_name}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                            {checkedIds.length} من {totalPerms} صلاحية محددة
                        </span>
                        <div className="flex gap-2 mr-auto">
                            <button onClick={selectAll} className="text-xs text-[#ee1d23] hover:underline font-bold">تحديد الكل</button>
                            <span className="text-slate-200">|</span>
                            <button onClick={clearAll} className="text-xs text-slate-400 hover:underline font-bold">إلغاء الكل</button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Scrollable matrix */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {permissionGroups.map((group) => {
                        const allChecked  = groupAllChecked(group);
                        const someChecked = groupSomeChecked(group);

                        return (
                            <div key={group.group} className="border border-slate-100 rounded-xl overflow-hidden">
                                {/* Group header */}
                                <div
                                    onClick={() => toggleGroup(group)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors',
                                        allChecked ? 'bg-[#ee1d23]/8' : someChecked ? 'bg-slate-50' : 'bg-slate-50/60',
                                    )}
                                >
                                    <div className={cn(
                                        'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                                        allChecked  ? 'bg-[#ee1d23] border-[#ee1d23]' :
                                        someChecked ? 'border-[#ee1d23] bg-white' :
                                                      'border-slate-300 bg-white',
                                    )}>
                                        {allChecked && (
                                            <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                                                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                        {!allChecked && someChecked && (
                                            <div className="w-2 h-0.5 bg-[#ee1d23] rounded" />
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{group.group}</span>
                                    <span className="text-xs text-slate-400 font-sans mr-auto">
                                        {group.permissions.filter(p => checkedIds.includes(p.id)).length}/{group.permissions.length}
                                    </span>
                                </div>

                                {/* Permissions grid */}
                                <div className="grid grid-cols-2 gap-0 divide-y divide-slate-50">
                                    {group.permissions.map((perm) => {
                                        const checked = checkedIds.includes(perm.id);
                                        return (
                                            <label
                                                key={perm.id}
                                                className={cn(
                                                    'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors',
                                                    checked && 'bg-green-50/50',
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggle(perm.id)}
                                                    className="rounded border-slate-300 text-[#ee1d23] focus:ring-[#ee1d23]/30 shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm text-slate-700 font-medium leading-tight">{perm.display_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{perm.key}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="px-6 pb-6 border-t pt-4 shrink-0">
                    <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
                    <Button onClick={save} disabled={processing}>
                        {processing ? 'جارٍ الحفظ...' : 'حفظ الصلاحيات'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Index({ roles, permission_groups }) {
    // Create / Edit modal
    const [open, setOpen]       = useState(false);
    const [editing, setEditing] = useState(null);

    const form = useForm({ display_name: '', description: '' });

    const openCreate = () => { setEditing(null); form.reset(); setOpen(true); };
    const openEdit   = (r)  => {
        setEditing(r);
        form.setData({ display_name: r.display_name, description: r.description ?? '' });
        setOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { setOpen(false); form.reset(); } };
        editing
            ? form.put(route('admin.roles.update', editing.id), opts)
            : form.post(route('admin.roles.store'), opts);
    };

    // Permission matrix
    const [matrixRole, setMatrixRole] = useState(null);

    // Delete
    const handleDelete = (role) => {
        if (!confirm(`هل أنت متأكد من حذف دور "${role.display_name}"؟`)) return;
        router.delete(route('admin.roles.destroy', role.id));
    };

    return (
        <AdminLayout title="الأدوار والصلاحيات">
            <Head title="الأدوار والصلاحيات" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الأدوار</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{roles.length}</span>
                    </div>
                    <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                        <Plus size={13} /> إضافة دور
                    </Button>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الدور</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">المعرّف</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">النوع</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">المستخدمون</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الصلاحيات</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">العمليات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map((role) => (
                            <TableRow key={role.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                {/* Display name + description */}
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn(
                                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                            role.is_system ? 'bg-[#ee1d23]/10 text-[#ee1d23]' : 'bg-slate-100 text-slate-400',
                                        )}>
                                            {role.is_system ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700 text-sm">{role.display_name}</p>
                                            {role.description && (
                                                <p className="text-xs text-slate-400 mt-0.5 max-w-[220px] truncate">{role.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Slug */}
                                <TableCell className="text-slate-400 text-xs font-mono">{role.name}</TableCell>

                                {/* System badge */}
                                <TableCell>
                                    {role.is_system ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-600 ring-1 ring-violet-200/80 whitespace-nowrap">
                                            <Lock size={9} /> نظامي
                                        </span>
                                    ) : (
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-400 ring-1 ring-slate-200 whitespace-nowrap">
                                            مخصص
                                        </span>
                                    )}
                                </TableCell>

                                {/* Users count */}
                                <TableCell>
                                    <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                                        <Users size={13} className="text-slate-300" />
                                        {role.users_count}
                                    </span>
                                </TableCell>

                                {/* Permissions count */}
                                <TableCell>
                                    <button
                                        onClick={() => setMatrixRole(role)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-[#ee1d23]/10 hover:text-[#ee1d23] transition-colors"
                                    >
                                        <ShieldCheck size={12} />
                                        {role.permissions_count} صلاحية
                                    </button>
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="text-left">
                                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                        <Button
                                            variant="ghost" size="icon"
                                            onClick={() => openEdit(role)}
                                            className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50"
                                            title="تعديل"
                                        >
                                            <Edit size={13} />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            onClick={() => !role.is_system && handleDelete(role)}
                                            disabled={role.is_system}
                                            className={cn(
                                                'h-7 w-7 transition-colors',
                                                role.is_system
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : 'text-slate-300 hover:text-red-500 hover:bg-red-50',
                                            )}
                                            title={role.is_system ? 'لا يمكن حذف الأدوار النظامية' : 'حذف'}
                                        >
                                            <Trash2 size={13} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}

                        {roles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-16 text-slate-300">
                                    <ShieldCheck size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد أدوار مسجلة</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* ── Create / Edit modal ──────────────────────────────────────────── */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>{editing ? 'تعديل بيانات الدور' : 'إضافة دور جديد'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="اسم الدور (للعرض)" error={form.errors.display_name}>
                                <Input
                                    value={form.data.display_name}
                                    onChange={e => form.setData('display_name', e.target.value)}
                                    placeholder="مثال: مشرف الفرع"
                                    required
                                />
                            </Field>
                            <Field label="الوصف" error={form.errors.description}>
                                <textarea
                                    value={form.data.description}
                                    onChange={e => form.setData('description', e.target.value)}
                                    rows={3}
                                    placeholder="وصف مختصر لمهام هذا الدور..."
                                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </Field>
                            {!editing && (
                                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                    بعد الإنشاء يمكنك تعيين الصلاحيات من زر "صلاحية" في جدول الأدوار.
                                </p>
                            )}
                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={form.processing}>
                                {editing ? 'حفظ التعديلات' : 'إضافة الدور'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Permission matrix ────────────────────────────────────────────── */}
            {matrixRole && (
                <PermissionMatrix
                    role={matrixRole}
                    permissionGroups={permission_groups}
                    onClose={() => setMatrixRole(null)}
                />
            )}
        </AdminLayout>
    );
}
