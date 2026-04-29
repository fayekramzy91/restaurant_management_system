import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import {
    Search, Eye, X, ChevronUp, ChevronDown, ChevronsUpDown,
    ShoppingCart, Clock, ChefHat, CheckCircle2,
    CheckCheck, Ban, BadgeCheck, CircleDashed, CircleOff,
    Package, Truck,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { cn } from '@/lib/utils';

/* ── Status / type definitions ──────────────────── */
const STATUS_MAP = {
    pending:   { label: 'قيد الانتظار', icon: Clock,         cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
    preparing: { label: 'يُحضر',        icon: ChefHat,       cls: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200/80' },
    ready:     { label: 'جاهز',         icon: CheckCircle2,  cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    completed: { label: 'مكتمل',        icon: CheckCheck,    cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
    cancelled: { label: 'ملغي',         icon: Ban,           cls: 'bg-red-50 text-red-400 ring-1 ring-red-200/80' },
};
const TYPE_MAP = {
    dine_in:  { label: 'داخلي',  icon: Package,  cls: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200/80' },
    takeaway: { label: 'خارجي',  icon: Package,  cls: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200/80' },
    delivery: { label: 'توصيل', icon: Truck,    cls: 'bg-sky-50 text-sky-600 ring-1 ring-sky-200/80' },
};
const PAYMENT_MAP = {
    paid:           { label: 'مدفوع',     icon: BadgeCheck,   cls: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80' },
    partially_paid: { label: 'جزئي',      icon: CircleDashed, cls: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80' },
    pending:        { label: 'غير مدفوع', icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
    unpaid:         { label: 'غير مدفوع', icon: CircleOff,    cls: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200' },
};

/* ── Pill badge ─────────────────────────────────── */
function Pill({ map, value }) {
    const def = map[value] ?? { label: value, icon: null, cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' };
    const Icon = def.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', def.cls)}>
            {Icon && <Icon size={10} strokeWidth={2.2} />}
            {def.label}
        </span>
    );
}

/* ── Sort column header ─────────────────────────── */
function SortHead({ column, label, current, dir, onSort, className }) {
    const active = current === column;
    return (
        <TableHead
            className={cn('cursor-pointer select-none text-xs font-semibold text-slate-400 uppercase tracking-wide', className)}
            onClick={() => onSort(column)}
        >
            <div className="flex items-center gap-1 justify-end">
                {label}
                {active
                    ? (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                    : <ChevronsUpDown size={12} className="opacity-30" />}
            </div>
        </TableHead>
    );
}

/* ── Pagination ─────────────────────────────────── */
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

/* ── Main page ──────────────────────────────────── */
export default function Index({ orders, filters }) {
    const { settings } = usePage().props;

    const [search,  setSearch]  = useState(filters.search   ?? '');
    const [status,  setStatus]  = useState(filters.status   ?? '');
    const [type,    setType]    = useState(filters.type     ?? '');
    const [sortBy,  setSortBy]  = useState(filters.sort_by  ?? 'created_at');
    const [sortDir, setSortDir] = useState(filters.sort_dir ?? 'desc');

    const apply = useCallback((overrides = {}) => {
        const params = { search, status, type, sort_by: sortBy, sort_dir: sortDir, ...overrides };
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
        router.get(route('admin.orders.index'), params, { preserveState: true, replace: true });
    }, [search, status, type, sortBy, sortDir]);

    useEffect(() => {
        const t = setTimeout(() => apply({ search }), 350);
        return () => clearTimeout(t);
    }, [search]);

    const handleFilter = (key, value, setter) => { setter(value); apply({ [key]: value }); };

    const handleSort = (col) => {
        const dir = sortBy === col && sortDir === 'desc' ? 'asc' : 'desc';
        setSortBy(col); setSortDir(dir);
        apply({ sort_by: col, sort_dir: dir });
    };

    const hasFilter = search || status || type;

    return (
        <AdminLayout title="الطلبات">
            <Head title="الطلبات" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">الطلبات</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{orders.total}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Search */}
                        <div className="relative">
                            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="رقم الطلب، موظف، عميل..."
                                className="pr-8 w-52 h-8 text-xs border-slate-200 placeholder:text-slate-400 focus-visible:ring-slate-300"
                            />
                            {search && (
                                <button onClick={() => { setSearch(''); apply({ search: '' }); }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Status filter */}
                        <select
                            value={status}
                            onChange={e => handleFilter('status', e.target.value, setStatus)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">كل الحالات</option>
                            <option value="pending">قيد الانتظار</option>
                            <option value="preparing">يُحضر</option>
                            <option value="ready">جاهز</option>
                            <option value="completed">مكتمل</option>
                            <option value="cancelled">ملغي</option>
                        </select>

                        {/* Type filter */}
                        <select
                            value={type}
                            onChange={e => handleFilter('type', e.target.value, setType)}
                            className="h-8 text-xs border border-slate-200 rounded-md px-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">كل الأنواع</option>
                            <option value="dine_in">داخلي</option>
                            <option value="takeaway">خارجي</option>
                            <option value="delivery">توصيل</option>
                        </select>

                        {hasFilter && (
                            <Button variant="ghost" size="sm"
                                className="h-8 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 gap-1 px-2.5"
                                onClick={() => {
                                    setSearch(''); setStatus(''); setType('');
                                    setSortBy('created_at'); setSortDir('desc');
                                    router.get(route('admin.orders.index'), {}, { preserveState: true, replace: true });
                                }}>
                                <X size={12} /> مسح
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <SortHead column="id"           label="#"        current={sortBy} dir={sortDir} onSort={handleSort} />
                            <SortHead column="created_at"   label="التاريخ"  current={sortBy} dir={sortDir} onSort={handleSort} />
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">النوع</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الطاولة / العميل</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الموظف</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">الأصناف</TableHead>
                            <SortHead column="total_amount" label="الإجمالي" current={sortBy} dir={sortDir} onSort={handleSort} className="text-left" />
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الدفع</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">عرض</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.data.map(order => (
                            <TableRow
                                key={order.id}
                                className="border-slate-100 hover:bg-slate-50/50 transition-colors group"
                            >
                                <TableCell className="font-semibold font-sans text-slate-400 text-xs">
                                    #{order.id}
                                </TableCell>
                                <TableCell className="text-slate-400 font-sans text-xs whitespace-nowrap">
                                    {new Date(order.created_at).toLocaleString('ar-SA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </TableCell>
                                <TableCell>
                                    <Pill map={TYPE_MAP} value={order.type} />
                                </TableCell>
                                <TableCell className="font-semibold text-sm text-slate-700">
                                    {order.type === 'dine_in'
                                        ? (order.table?.name ? `طاولة ${order.table.name}` : <span className="text-slate-300">—</span>)
                                        : (order.customer?.name ?? <span className="text-slate-300">—</span>)
                                    }
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">
                                    {order.user?.name ?? <span className="text-slate-300">—</span>}
                                </TableCell>
                                <TableCell className="text-center font-sans font-semibold text-slate-500 text-sm">
                                    {order.items?.length ?? 0}
                                </TableCell>
                                <TableCell className="text-left font-sans font-semibold text-slate-700 text-sm">
                                    {Number(order.total_amount).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <Pill map={STATUS_MAP} value={order.status} />
                                </TableCell>
                                <TableCell>
                                    <Pill map={PAYMENT_MAP} value={order.payment_status ?? 'pending'} />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Link
                                        href={route('admin.orders.show', order.id)}
                                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-300 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Eye size={14} />
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-20 text-slate-300">
                                    <ShoppingCart size={32} className="mx-auto mb-3 opacity-40" />
                                    <p className="font-semibold text-sm">لا توجد طلبات تطابق معايير البحث</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="px-5 py-4 border-t border-slate-100 space-y-3 bg-slate-50/40">
                    <Pagination links={orders.links} />
                    <p className="text-center text-[11px] text-slate-400 font-semibold">
                        عرض {orders.from ?? 0}–{orders.to ?? 0} من {orders.total} طلب
                    </p>
                </div>
            </Card>
        </AdminLayout>
    );
}
