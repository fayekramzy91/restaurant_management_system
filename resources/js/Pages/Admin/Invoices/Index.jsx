import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import {
    Search, Eye, X, ReceiptText,
    BadgeCheck, CircleDashed, CircleOff, Ban, RotateCcw,
    ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
    paid:     { label: 'مدفوع',     icon: BadgeCheck,   cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    partial:  { label: 'جزئي',      icon: CircleDashed, cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
    draft:    { label: 'غير مدفوع', icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
    void:     { label: 'ملغاة',     icon: Ban,          cls: 'bg-red-50 text-red-400 ring-1 ring-red-200/80' },
    refunded: { label: 'مسترد',     icon: RotateCcw,    cls: 'bg-blue-50 text-blue-500 ring-1 ring-blue-200/80' },
};

function Pill({ value }) {
    const def = STATUS_MAP[value] ?? { label: value, icon: null, cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' };
    const Icon = def.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', def.cls)}>
            {Icon && <Icon size={10} strokeWidth={2.2} />}
            {def.label}
        </span>
    );
}

function Pagination({ links }) {
    if (!links || links.length <= 3) return null;
    return (
        <div className="flex justify-center gap-1 flex-wrap">
            {links.map((link, i) => (
                link.url ? (
                    <Link key={i} href={link.url} preserveState
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            link.active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                        )}
                        dangerouslySetInnerHTML={{ __html: link.label }} />
                ) : (
                    <span key={i}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white border border-slate-200"
                        dangerouslySetInnerHTML={{ __html: link.label }} />
                )
            ))}
        </div>
    );
}

function SortHead({ col, label, sortBy, sortDir, onSort, className }) {
    const active = sortBy === col;
    const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <TableHead
            className={cn('cursor-pointer select-none group', className)}
            onClick={() => onSort(col)}
        >
            <span className="inline-flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide group-hover:text-slate-600 transition-colors">
                    {label}
                </span>
                <Icon
                    size={12}
                    className={cn(
                        'transition-colors shrink-0',
                        active ? 'text-slate-700' : 'text-slate-300 group-hover:text-slate-400'
                    )}
                />
            </span>
        </TableHead>
    );
}

export default function Index({ invoices, filters }) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'SAR';

    const [search,   setSearch]   = useState(filters.search    ?? '');
    const [status,   setStatus]   = useState(filters.status    ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo,   setDateTo]   = useState(filters.date_to   ?? '');
    const [sortBy,   setSortBy]   = useState(filters.sort_by   ?? 'issued_at');
    const [sortDir,  setSortDir]  = useState(filters.sort_dir  ?? 'desc');

    const apply = useCallback((overrides = {}) => {
        const params = { search, status, date_from: dateFrom, date_to: dateTo, sort_by: sortBy, sort_dir: sortDir, ...overrides };
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
        router.get(route('admin.invoices.index'), params, { preserveState: true, replace: true });
    }, [search, status, dateFrom, dateTo, sortBy, sortDir]);

    const handleSort = (col) => {
        const newDir = sortBy === col && sortDir === 'desc' ? 'asc' : 'desc';
        setSortBy(col);
        setSortDir(newDir);
        apply({ sort_by: col, sort_dir: newDir });
    };

    useEffect(() => {
        const t = setTimeout(() => apply({ search }), 350);
        return () => clearTimeout(t);
    }, [search]);

    const hasFilter = search || status || dateFrom || dateTo;

    return (
        <AdminLayout title="الفواتير">
            <Head title="الفواتير" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الفواتير</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{invoices.total}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative">
                            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="رقم الفاتورة، عميل..."
                                className="pr-8 w-52 h-8 text-xs border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-300"
                            />
                            {search && (
                                <button onClick={() => { setSearch(''); apply({ search: '' }); }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <select
                            value={status}
                            onChange={e => { setStatus(e.target.value); apply({ status: e.target.value }); }}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">كل الحالات</option>
                            <option value="paid">مدفوع</option>
                            <option value="partial">جزئي</option>
                            <option value="draft">غير مدفوع</option>
                            <option value="void">ملغاة</option>
                            <option value="refunded">مسترد</option>
                        </select>

                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); apply({ date_from: e.target.value }); }}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); apply({ date_to: e.target.value }); }}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />

                        {hasFilter && (
                            <Button variant="ghost" size="sm"
                                className="h-8 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 gap-1 px-2.5"
                                onClick={() => {
                                    setSearch(''); setStatus(''); setDateFrom(''); setDateTo('');
                                    router.get(route('admin.invoices.index'), {}, { preserveState: true, replace: true });
                                }}>
                                <X size={12} /> مسح
                            </Button>
                        )}
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <SortHead col="invoice_number" label="رقم الفاتورة" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                            <SortHead col="order_id"       label="الطلب"        sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">العميل</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الفرع</TableHead>
                            <SortHead col="total"       label="الإجمالي" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-left" />
                            <SortHead col="paid_amount" label="المدفوع"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-left" />
                            <SortHead col="status"      label="الحالة"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                            <SortHead col="issued_at"   label="التاريخ"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">عرض</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.data.map(invoice => {
                            const effectivePaid = Number(invoice.paid_amount) + Number(invoice.wallet_amount);
                            return (
                                <TableRow key={invoice.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                    <TableCell className="font-mono text-xs font-semibold text-slate-600">
                                        {invoice.invoice_number}
                                    </TableCell>
                                    <TableCell className="font-semibold font-sans text-slate-400 text-xs">
                                        #{invoice.order_id}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {invoice.customer?.name ?? <span className="text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {invoice.branch?.name ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-left font-sans font-semibold text-slate-700 text-sm">
                                        {Number(invoice.total).toFixed(2)} {currency}
                                    </TableCell>
                                    <TableCell className="text-left font-sans font-semibold text-slate-500 text-sm">
                                        {effectivePaid.toFixed(2)} {currency}
                                    </TableCell>
                                    <TableCell>
                                        <Pill value={invoice.status} />
                                    </TableCell>
                                    <TableCell className="text-slate-400 font-sans text-xs whitespace-nowrap">
                                        {invoice.issued_at
                                            ? new Date(invoice.issued_at).toLocaleString('ar-SA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                            : '—'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Link
                                            href={route('admin.invoices.show', invoice.id)}
                                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-300 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Eye size={14} />
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {invoices.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-20 text-slate-300">
                                    <ReceiptText size={32} className="mx-auto mb-3 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد فواتير تطابق معايير البحث</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <div className="px-5 py-4 border-t border-slate-100 space-y-3 bg-slate-50/40">
                    <Pagination links={invoices.links} />
                    <p className="text-center text-[11px] text-slate-400 font-semibold">
                        عرض {invoices.from ?? 0}–{invoices.to ?? 0} من {invoices.total} فاتورة
                    </p>
                </div>
            </Card>
        </AdminLayout>
    );
}
