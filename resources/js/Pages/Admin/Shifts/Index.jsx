import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import { Clock, X } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { cn } from '@/lib/utils';

function Pagination({ links }) {
    if (!links || links.length <= 3) return null;
    return (
        <div className="flex justify-center gap-1 flex-wrap">
            {links.map((link, i) => (
                link.url ? (
                    <Link key={i} href={link.url} preserveState
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            link.active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white border border-slate-200"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            ))}
        </div>
    );
}

function DiffBadge({ value }) {
    const v = Number(value ?? 0);
    if (v === 0) return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">لا يوجد فرق</span>;
    if (v > 0)   return <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-sans">+{v.toFixed(2)} فائض</span>;
    return             <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-sans">{v.toFixed(2)} عجز</span>;
}

function StatusBadge({ status }) {
    return status === 'open'
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 ring-1 ring-amber-200/80">مفتوحة</span>
        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 ring-1 ring-slate-200">مغلقة</span>;
}

export default function Index({ shifts, filters, users }) {
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo,   setDateTo]   = useState(filters.date_to   ?? '');
    const [userId,   setUserId]   = useState(filters.user_id   ?? '');
    const [status,   setStatus]   = useState(filters.status    ?? '');

    const apply = useCallback((overrides = {}) => {
        const params = { date_from: dateFrom, date_to: dateTo, user_id: userId, status, ...overrides };
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
        router.get(route('admin.shifts.index'), params, { preserveState: true, replace: true });
    }, [dateFrom, dateTo, userId, status]);

    const reset = () => {
        setDateFrom(''); setDateTo(''); setUserId(''); setStatus('');
        router.get(route('admin.shifts.index'), {}, { preserveState: false });
    };

    const hasFilter = dateFrom || dateTo || userId || status;

    const fmt = (dt) => dt
        ? new Date(dt).toLocaleString('ar-SA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';

    return (
        <AdminLayout title="الورديات">
            <Head title="الورديات" />

            <div className="mb-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Clock size={17} className="text-amber-500" />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800 text-sm">ورديات الصندوق</h2>
                    <p className="text-xs text-slate-400 mt-0.5">سجل فتح وإقفال ورديات الكاشير</p>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الورديات</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{shifts.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                        <select value={userId} onChange={e => setUserId(e.target.value)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300">
                            <option value="">جميع الكاشيرين</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300">
                            <option value="">كل الحالات</option>
                            <option value="open">مفتوحة</option>
                            <option value="closed">مغلقة</option>
                        </select>
                        <Button size="sm" className="h-8 text-xs px-3" onClick={() => apply()}>تصفية</Button>
                        {hasFilter && (
                            <Button variant="ghost" size="sm" onClick={reset}
                                className="h-8 text-xs text-slate-400 hover:text-slate-700 gap-1 px-2.5">
                                <X size={12} /> إعادة تعيين
                            </Button>
                        )}
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            {['الكاشير','الفرع','بداية الوردية','نهايتها','الرصيد الافتتاحي','الرصيد المتوقع','الرصيد الفعلي','الفرق','الحالة'].map(h => (
                                <TableHead key={h} className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shifts.data.map(shift => (
                            <TableRow key={shift.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-semibold text-slate-700 text-sm">{shift.user?.name ?? '—'}</TableCell>
                                <TableCell className="text-sm text-slate-500">{shift.branch?.name ?? '—'}</TableCell>
                                <TableCell className="font-sans text-xs text-slate-500 whitespace-nowrap">{fmt(shift.opened_at)}</TableCell>
                                <TableCell className="font-sans text-xs text-slate-500 whitespace-nowrap">{fmt(shift.closed_at)}</TableCell>
                                <TableCell className="font-sans text-sm font-semibold text-slate-700">{Number(shift.opening_balance).toFixed(2)}</TableCell>
                                <TableCell className="font-sans text-sm text-slate-500">
                                    {shift.expected_closing_balance != null ? Number(shift.expected_closing_balance).toFixed(2) : '—'}
                                </TableCell>
                                <TableCell className="font-sans text-sm text-slate-500">
                                    {shift.actual_closing_balance != null ? Number(shift.actual_closing_balance).toFixed(2) : '—'}
                                </TableCell>
                                <TableCell>
                                    {shift.status === 'closed' ? <DiffBadge value={shift.difference} /> : <span className="text-slate-200 text-xs">—</span>}
                                </TableCell>
                                <TableCell><StatusBadge status={shift.status} /></TableCell>
                            </TableRow>
                        ))}
                        {shifts.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-16 text-slate-300">
                                    <Clock size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد ورديات</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <div className="px-5 py-4 border-t border-slate-100 space-y-3 bg-slate-50/40">
                    <Pagination links={shifts.links} />
                    <p className="text-center text-[11px] text-slate-400 font-semibold">
                        عرض {shifts.from ?? 0}–{shifts.to ?? 0} من {shifts.total} وردية
                    </p>
                </div>
            </Card>
        </AdminLayout>
    );
}
