import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import { Shield, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { cn } from '@/lib/utils';

// ── Action badge colours by prefix ─────────────────────────────────────────

const ACTION_STYLES = {
    auth:      'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    menu_item: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200/80',
    settings:  'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200/80',
    user:      'bg-violet-50 text-violet-600 ring-1 ring-violet-200/80',
    order:     'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80',
};

function ActionBadge({ action }) {
    const prefix = action.split('.')[0];
    const cls    = ACTION_STYLES[prefix] ?? ACTION_STYLES.auth;
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap font-mono', cls)}>
            {action}
        </span>
    );
}

// ── Diff view helper ────────────────────────────────────────────────────────

function formatValue(v) {
    if (v === null || v === undefined) return '—';
    if (v === true  || v === 1  || v === '1')  return 'نعم';
    if (v === false || v === 0  || v === '0')  return 'لا';
    return String(v);
}

function DiffView({ oldValues, newValues }) {
    const onlyNew    = oldValues == null && newValues != null;
    const onlyOld    = newValues == null && oldValues != null;
    const hasOld     = oldValues && Object.keys(oldValues).length > 0;
    const hasNew     = newValues && Object.keys(newValues).length > 0;
    const allKeys    = [...new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])];

    if (onlyNew) {
        return (
            <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-700 mb-2 uppercase tracking-wide">البيانات المضافة</p>
                <div className="space-y-1">
                    {Object.entries(newValues).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                            <span className="font-semibold text-slate-500 min-w-[100px]">{k}</span>
                            <span className="text-emerald-700">{formatValue(v)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (onlyOld) {
        return (
            <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-[10px] font-bold text-red-600 mb-2 uppercase tracking-wide">البيانات المحذوفة</p>
                <div className="space-y-1">
                    {Object.entries(oldValues).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                            <span className="font-semibold text-slate-500 min-w-[100px]">{k}</span>
                            <span className="text-red-600">{formatValue(v)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 grid grid-cols-2 gap-3">
            {hasOld && (
                <div className="p-3 bg-red-50/60 rounded-lg border border-red-100">
                    <p className="text-[10px] font-bold text-red-500 mb-2 uppercase tracking-wide">قبل التغيير</p>
                    <div className="space-y-1">
                        {allKeys.map(k => {
                            const changed = String(oldValues?.[k] ?? '') !== String(newValues?.[k] ?? '');
                            return (
                                <div key={k} className={cn('flex gap-2 text-xs rounded px-1', changed && 'bg-yellow-100/80')}>
                                    <span className="font-semibold text-slate-500 min-w-[80px]">{k}</span>
                                    <span className="text-red-600">{formatValue(oldValues?.[k])}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {hasNew && (
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 mb-2 uppercase tracking-wide">بعد التغيير</p>
                    <div className="space-y-1">
                        {allKeys.map(k => {
                            const changed = String(oldValues?.[k] ?? '') !== String(newValues?.[k] ?? '');
                            return (
                                <div key={k} className={cn('flex gap-2 text-xs rounded px-1', changed && 'bg-yellow-100/80')}>
                                    <span className="font-semibold text-slate-500 min-w-[80px]">{k}</span>
                                    <span className="text-emerald-700">{formatValue(newValues?.[k])}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ links }) {
    if (!links || links.length <= 3) return null;
    return (
        <div className="flex justify-center gap-1 flex-wrap">
            {links.map((link, i) => (
                link.url ? (
                    <Link key={i} href={link.url} preserveState
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            link.active
                                ? 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span key={i}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white border border-slate-200"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            ))}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Index({ logs, filters, users }) {
    const [dateFrom,  setDateFrom]  = useState(filters.date_from ?? '');
    const [dateTo,    setDateTo]    = useState(filters.date_to   ?? '');
    const [userId,    setUserId]    = useState(filters.user_id   ?? '');
    const [action,    setAction]    = useState(filters.action    ?? '');
    const [expanded,  setExpanded]  = useState({});   // { [log.id]: bool }

    const toggleExpanded = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const apply = useCallback((overrides = {}) => {
        const params = { date_from: dateFrom, date_to: dateTo, user_id: userId, action, ...overrides };
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
        router.get(route('admin.audit-log.index'), params, { preserveState: true, replace: true });
    }, [dateFrom, dateTo, userId, action]);

    const reset = () => {
        setDateFrom(''); setDateTo(''); setUserId(''); setAction('');
        router.get(route('admin.audit-log.index'), {}, { preserveState: false });
    };

    const hasFilter = dateFrom || dateTo || userId || action;

    return (
        <AdminLayout title="سجل المراقبة">
            <Head title="سجل المراقبة" />

            {/* Page header */}
            <div className="mb-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <Shield size={17} className="text-violet-500" />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800 text-sm">سجل المراقبة</h2>
                    <p className="text-xs text-slate-400 mt-0.5">جميع الإجراءات الإدارية المسجّلة في النظام</p>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                {/* Filters toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الإجراءات</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">
                            {logs.total}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Date from */}
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        {/* Date to */}
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />

                        {/* User select */}
                        <select
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">جميع المستخدمين</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>

                        {/* Action search */}
                        <Input
                            value={action}
                            onChange={e => setAction(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && apply()}
                            placeholder="ابحث عن إجراء..."
                            className="h-8 text-xs w-44 border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-300"
                        />

                        {/* Apply */}
                        <Button
                            size="sm"
                            className="h-8 text-xs px-3 gap-1"
                            onClick={() => apply()}
                        >
                            تصفية
                        </Button>

                        {/* Reset */}
                        {hasFilter && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 gap-1 px-2.5"
                                onClick={reset}
                            >
                                <X size={12} /> إعادة تعيين
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الوقت</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">المستخدم</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الإجراء</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">التفاصيل</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">العنصر المتأثر</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.data.map(log => {
                            const hasDiff    = log.old_values != null || log.new_values != null;
                            const isExpanded = expanded[log.id] ?? false;
                            const auditableLabel = log.auditable_type
                                ? `${log.auditable_type.split('\\').pop()} #${log.auditable_id}`
                                : null;

                            return (
                                <>
                                    <TableRow
                                        key={log.id}
                                        className="border-slate-100 hover:bg-slate-50/50 transition-colors align-top"
                                    >
                                        {/* الوقت */}
                                        <TableCell className="text-xs text-slate-400 font-sans whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('ar-EG', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </TableCell>

                                        {/* المستخدم */}
                                        <TableCell className="text-sm">
                                            {log.user
                                                ? <span className="font-semibold text-slate-700">{log.user.name}</span>
                                                : <span className="text-slate-300 italic text-xs">النظام</span>
                                            }
                                        </TableCell>

                                        {/* الإجراء */}
                                        <TableCell>
                                            <ActionBadge action={log.action} />
                                        </TableCell>

                                        {/* التفاصيل */}
                                        <TableCell className="max-w-[260px]">
                                            {log.description && (
                                                <p className="text-xs text-slate-600 mb-1">{log.description}</p>
                                            )}
                                            {hasDiff && (
                                                <button
                                                    onClick={() => toggleExpanded(log.id)}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                                                >
                                                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                    {isExpanded ? 'إخفاء التغييرات' : 'عرض التغييرات'}
                                                </button>
                                            )}
                                        </TableCell>

                                        {/* العنصر المتأثر */}
                                        <TableCell className="text-xs font-mono text-slate-400">
                                            {auditableLabel ?? <span className="text-slate-200">—</span>}
                                        </TableCell>
                                    </TableRow>

                                    {/* Expandable diff row */}
                                    {hasDiff && isExpanded && (
                                        <TableRow key={`${log.id}-diff`} className="border-slate-100 bg-slate-50/30">
                                            <TableCell colSpan={5} className="pb-4 pt-0 px-5">
                                                <DiffView
                                                    oldValues={log.old_values}
                                                    newValues={log.new_values}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            );
                        })}

                        {logs.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-slate-300">
                                    <Shield size={32} className="mx-auto mb-3 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد إجراءات مسجّلة</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="px-5 py-4 border-t border-slate-100 space-y-3 bg-slate-50/40">
                    <Pagination links={logs.links} />
                    <p className="text-center text-[11px] text-slate-400 font-semibold">
                        عرض {logs.from ?? 0}–{logs.to ?? 0} من {logs.total} نتيجة
                    </p>
                </div>
            </Card>
        </AdminLayout>
    );
}
