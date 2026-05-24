import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Plus, Edit, KeyRound, UserCog, Power, Clock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

const ROLE_STYLE = {
    admin:   'bg-red-50 text-red-700 ring-1 ring-red-200/80',
    cashier: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/80',
    waiter:  'bg-green-50 text-green-700 ring-1 ring-green-200/80',
    kitchen: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/80',
};

function RoleBadge({ role }) {
    if (!role) return <span className="text-slate-300 text-xs">—</span>;
    return (
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap', ROLE_STYLE[role.name] ?? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200')}>
            {role.display_name}
        </span>
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

export default function Index({ users, roles, branches }) {
    const { auth } = usePage().props;
    const currentUserId = auth.user?.id;

    // ── Create / Edit modal ───────────────────────────────────────────────────
    const [open, setOpen]       = useState(false);
    const [editing, setEditing] = useState(null);

    const form = useForm({ name: '', username: '', password: '', role_id: '', branch_id: '', is_active: true });

    const openCreate = () => {
        setEditing(null);
        form.reset();
        form.setData('is_active', true);
        setOpen(true);
    };

    const openEdit = (u) => {
        setEditing(u);
        form.setData({
            name:      u.name,
            username:  u.username,
            password:  '',
            role_id:   u.role?.id ?? '',
            branch_id: u.branch?.id ?? '',
            is_active: u.is_active,
        });
        setOpen(true);
    };

    // True when the currently-selected role is the system admin
    const isAdminRole = roles.find(r => r.id === Number(form.data.role_id))?.name === 'admin';

    const submitMain = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { setOpen(false); form.reset(); } };
        if (editing) {
            form.put(route('admin.users.update', editing.id), opts);
        } else {
            form.post(route('admin.users.store'), opts);
        }
    };

    // ── Reset password modal ──────────────────────────────────────────────────
    const [resetTarget, setResetTarget]   = useState(null);
    const pwForm = useForm({ password: '' });

    const submitReset = (e) => {
        e.preventDefault();
        pwForm.post(route('admin.users.reset-password', resetTarget.id), {
            onSuccess: () => { setResetTarget(null); pwForm.reset(); },
        });
    };

    // ── Toggle active ─────────────────────────────────────────────────────────
    const toggleForm = useForm({});
    const handleToggle = (u) => {
        if (u.id === currentUserId) return;
        toggleForm.post(route('admin.users.toggle-active', u.id));
    };

    return (
        <AdminLayout title="إدارة المستخدمين">
            <Head title="المستخدمون" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">المستخدمون</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{users.length}</span>
                    </div>
                    <Button onClick={openCreate} size="sm" className="gap-1.5 h-8 text-xs">
                        <Plus size={13} /> إضافة مستخدم
                    </Button>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الاسم</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">اسم المستخدم</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الدور</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الفرع</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">آخر دخول</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">العمليات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => {
                            const isSelf = u.id === currentUserId;
                            return (
                                <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                    {/* Name */}
                                    <TableCell className="font-semibold text-slate-700 text-sm">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-[#ee1d23]/10 text-[#ee1d23] flex items-center justify-center shrink-0 font-black text-sm">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                {u.name}
                                                {isSelf && <span className="mr-1.5 text-[10px] font-bold text-slate-400">(أنت)</span>}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Username */}
                                    <TableCell className="text-slate-500 text-sm font-mono">{u.username}</TableCell>

                                    {/* Role */}
                                    <TableCell><RoleBadge role={u.role} /></TableCell>

                                    {/* Branch */}
                                    <TableCell className="text-slate-500 text-sm">
                                        {u.branch
                                            ? u.branch.name
                                            : u.role?.name === 'admin'
                                                ? <span className="text-slate-300 text-xs">جميع الفروع</span>
                                                : <span className="text-amber-500 text-xs font-semibold">غير مُعيَّن</span>
                                        }
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <button
                                            onClick={() => handleToggle(u)}
                                            disabled={isSelf || toggleForm.processing}
                                            title={isSelf ? 'لا يمكنك إيقاف حسابك' : (u.is_active ? 'إيقاف' : 'تفعيل')}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 transition-all',
                                                u.is_active
                                                    ? 'bg-green-50 text-green-700 ring-green-200 hover:bg-green-100'
                                                    : 'bg-red-50 text-red-600 ring-red-200 hover:bg-red-100',
                                                isSelf && 'opacity-50 cursor-not-allowed',
                                            )}
                                        >
                                            <Power size={10} />
                                            {u.is_active ? 'نشط' : 'موقوف'}
                                        </button>
                                    </TableCell>

                                    {/* Last login */}
                                    <TableCell className="text-slate-400 text-xs">
                                        {u.last_login
                                            ? <span className="inline-flex items-center gap-1"><Clock size={11} />{u.last_login}</span>
                                            : <span className="text-slate-200">لم يسجل بعد</span>}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-left">
                                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => openEdit(u)}
                                                className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50"
                                                title="تعديل"
                                            >
                                                <Edit size={13} />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => { setResetTarget(u); pwForm.reset(); }}
                                                className="h-7 w-7 text-slate-300 hover:text-amber-600 hover:bg-amber-50"
                                                title="تغيير كلمة المرور"
                                            >
                                                <KeyRound size={13} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-16 text-slate-300">
                                    <UserCog size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا يوجد مستخدمون مسجلون بعد</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* ── Create / Edit modal ─────────────────────────────────────────── */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>{editing ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitMain}>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="الاسم الكامل" error={form.errors.name}>
                                <Input value={form.data.name} onChange={e => form.setData('name', e.target.value)} placeholder="محمد عبدالله" required />
                            </Field>

                            <Field label="اسم المستخدم" error={form.errors.username}>
                                <Input value={form.data.username} onChange={e => form.setData('username', e.target.value)} placeholder="mohammed" className="font-mono" required />
                            </Field>

                            {!editing && (
                                <Field label="كلمة المرور" error={form.errors.password}>
                                    <Input type="password" value={form.data.password} onChange={e => form.setData('password', e.target.value)} placeholder="6 أحرف على الأقل" required />
                                </Field>
                            )}

                            <Field label="الدور" error={form.errors.role_id}>
                                <select
                                    value={form.data.role_id}
                                    onChange={e => {
                                        const selectedRole = roles.find(r => r.id === Number(e.target.value));
                                        form.setData('role_id', e.target.value);
                                        if (selectedRole?.name === 'admin') {
                                            form.setData('branch_id', '');
                                        }
                                    }}
                                    required
                                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">— اختر الدور —</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                                </select>
                            </Field>

                            {isAdminRole ? (
                                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-400 leading-relaxed">
                                    مدير النظام لا يحتاج إلى تعيين فرع محدد — يملك صلاحية الوصول إلى جميع البيانات.
                                </div>
                            ) : (
                                <Field label="الفرع" error={form.errors.branch_id}>
                                    <select
                                        value={form.data.branch_id}
                                        onChange={e => form.setData('branch_id', e.target.value)}
                                        required
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">— اختر الفرع —</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </Field>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={form.data.is_active}
                                    onChange={e => form.setData('is_active', e.target.checked)}
                                    className="rounded border-input text-primary"
                                />
                                <Label htmlFor="is_active" className="cursor-pointer font-bold">حساب نشط</Label>
                            </div>
                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={form.processing}>
                                {editing ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Reset password modal ────────────────────────────────────────── */}
            <Dialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
                <DialogContent className="max-w-sm" dir="rtl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>تغيير كلمة المرور</DialogTitle>
                        {resetTarget && (
                            <p className="text-sm text-muted-foreground mt-1">المستخدم: <span className="font-bold text-foreground">{resetTarget.name}</span></p>
                        )}
                    </DialogHeader>
                    <form onSubmit={submitReset}>
                        <div className="px-6 py-4">
                            <Field label="كلمة المرور الجديدة" error={pwForm.errors.password}>
                                <Input
                                    type="password"
                                    value={pwForm.data.password}
                                    onChange={e => pwForm.setData('password', e.target.value)}
                                    placeholder="6 أحرف على الأقل"
                                    required
                                    autoFocus
                                />
                            </Field>
                        </div>
                        <DialogFooter className="px-6 pb-6 border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>إلغاء</Button>
                            <Button type="submit" disabled={pwForm.processing} className="bg-amber-500 hover:bg-amber-600">
                                تغيير كلمة المرور
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
