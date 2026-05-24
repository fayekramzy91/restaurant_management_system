import { Head, Link, usePage, router } from '@inertiajs/react';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
    ShoppingBag, Clock, User, RefreshCw, MapPin, Users,
    Plus, LayoutDashboard, ChevronDown, Truck, ShoppingCart,
    Package, Edit3, CreditCard, X, LogOut, Search, SlidersHorizontal,
} from 'lucide-react';
import Modal from '@/Components/Modal';

const ORDER_TYPE_LABELS   = { dine_in: 'داخلي', takeaway: 'خارجي', delivery: 'توصيل' };
const ORDER_STATUS_LABELS = { pending: 'قيد الانتظار', preparing: 'يُحضر', ready: 'جاهز', completed: 'مكتمل' };
const SHAPE_LABELS        = { rectangle: 'مستطيلة', square: 'مربعة', round: 'دائرية', oval: 'بيضاوية' };

const STATUS_FILTERS = [
    { key: 'all',       label: 'الكل',              dot: 'bg-gray-400' },
    { key: 'available', label: 'متاحة',             dot: 'bg-green-500' },
    { key: 'occupied',  label: 'مشغولة',            dot: 'bg-red-500' },
    { key: 'reserved',  label: 'محجوزة',            dot: 'bg-yellow-400' },
    { key: 'billing',   label: 'بانتظار الدفع',     dot: 'bg-amber-500' },
];

function statusColors(status) {
    if (status === 'ready')     return 'text-green-700 bg-green-50 border-green-200';
    if (status === 'preparing') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-gray-500 bg-gray-50 border-gray-200';
}

export default function Index({ areas, orders }) {
    const { settings, auth } = usePage().props;
    const currency = settings?.currency || 'SAR';
    const permissions = auth.user?.permissions ?? [];

    const [activeTab, setActiveTab] = useState('tables');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showNewOrderModal, setShowNewOrderModal] = useState(false);

    // Orders tab filters
    const [orderSearch, setOrderSearch]           = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState('all');
    const [orderTypeFilter, setOrderTypeFilter]   = useState('all');
    const [creating, setCreating] = useState(false);

    /* ── Shift / cash register ───────────────────── */
    const [shiftSession, setShiftSession]       = useState(null);
    const [shiftLoading, setShiftLoading]       = useState(true);
    const [showOpenModal, setShowOpenModal]     = useState(false);
    const [showCloseModal, setShowCloseModal]   = useState(false);
    const [openingBalance, setOpeningBalance]   = useState('');
    const [actualBalance, setActualBalance]     = useState('');
    const [shiftNotes, setShiftNotes]           = useState('');
    const [zReport, setZReport]                 = useState(null);
    const [shiftSubmitting, setShiftSubmitting] = useState(false);
    const [shiftError, setShiftError]           = useState('');

    /* ── Ready-order notifications ───────────────── */
    const [readyNotices, setReadyNotices] = useState([]);
    const prevOrdersRef = useRef(orders);

    // Request browser notification permission once
    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Detect newly-ready orders whenever `orders` prop updates
    useEffect(() => {
        const prevReadyIds = new Set(
            prevOrdersRef.current.filter(o => o.status === 'ready').map(o => o.id)
        );
        const newReady = orders.filter(o => o.status === 'ready' && !prevReadyIds.has(o.id));

        if (newReady.length > 0) {
            // Play a short beep
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                [0, 150].forEach(delay => {
                    const osc  = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.value = 880; osc.type = 'sine';
                    gain.gain.setValueAtTime(0.25, ctx.currentTime + delay / 1000);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.3);
                    osc.start(ctx.currentTime + delay / 1000);
                    osc.stop(ctx.currentTime + delay / 1000 + 0.3);
                });
            } catch (_) { /* AudioContext unavailable */ }

            // Browser notification
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                newReady.forEach(o => {
                    new Notification(`الطلب #${o.id} جاهز!`, {
                        body: 'توجه لاستلامه من بار المطبخ',
                        icon: '/favicon.ico',
                    });
                });
            }

            // In-app toast banners (auto-dismiss after 8s)
            const notices = newReady.map(o => ({ id: o.id, table: o.table?.name }));
            setReadyNotices(prev => [...prev, ...notices]);
            notices.forEach(n => {
                setTimeout(() => {
                    setReadyNotices(prev => prev.filter(x => x.id !== n.id));
                }, 8000);
            });
        }

        prevOrdersRef.current = orders;
    }, [orders]);

    // Poll every 30 seconds to refresh orders and table statuses
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['orders', 'areas'] });
        }, 30000);
        return () => clearInterval(id);
    }, []);

    // Fetch shift status on mount
    useEffect(() => {
        fetch('/pos/shift/status', { headers: { 'Accept': 'application/json' } })
            .then(r => r.json())
            .then(data => { setShiftSession(data.session); setShiftLoading(false); })
            .catch(() => setShiftLoading(false));
    }, []);

    const tableCounts = useMemo(() => {
        const all = areas.flatMap(a => a.tables);
        return {
            all:       all.length,
            available: all.filter(t => t.status === 'available').length,
            occupied:  all.filter(t => t.status === 'occupied').length,
            reserved:  all.filter(t => t.status === 'reserved').length,
            billing:   all.filter(t => t.status === 'billing').length,
        };
    }, [areas]);

    const filteredOrders = useMemo(() => {
        const q = orderSearch.trim().toLowerCase();
        return orders.filter(order => {
            if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) return false;
            if (orderTypeFilter   !== 'all' && order.type   !== orderTypeFilter)   return false;
            if (q) {
                const tableMatch = (order.table?.name ?? '').toLowerCase().includes(q);
                const idMatch    = String(order.id).includes(q);
                if (!tableMatch && !idMatch) return false;
            }
            return true;
        });
    }, [orders, orderSearch, orderStatusFilter, orderTypeFilter]);

    const hasOrderFilters = orderSearch || orderStatusFilter !== 'all' || orderTypeFilter !== 'all';

    const createOrder = (type) => {
        setCreating(true);
        router.post(route('pos.new-order'), { type }, {
            onFinish: () => { setCreating(false); setShowNewOrderModal(false); },
        });
    };

    /* ── Shift handlers ──────────────────────────── */
    const csrfToken = () =>
        document.querySelector('meta[name="csrf-token"]')?.content ?? '';

    const handleOpenShift = async () => {
        if (openingBalance === '' && openingBalance !== '0') return;
        setShiftSubmitting(true);
        setShiftError('');
        try {
            const res  = await fetch('/pos/shift/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ opening_balance: parseFloat(openingBalance) || 0 }),
            });
            const data = await res.json();
            if (data.success) {
                setShiftSession(data.session);
                setShowOpenModal(false);
                setOpeningBalance('');
                setShiftError('');
            } else {
                setShiftError(data.error ?? 'حدث خطأ غير متوقع');
            }
        } catch {
            setShiftError('تعذّر الاتصال بالخادم');
        } finally {
            setShiftSubmitting(false);
        }
    };

    const handleCloseShift = async () => {
        if (!actualBalance) return;
        setShiftSubmitting(true);
        try {
            const res  = await fetch(`/pos/shift/close/${shiftSession.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ actual_closing_balance: parseFloat(actualBalance), notes: shiftNotes }),
            });
            const data = await res.json();
            if (data.success) {
                setZReport(data.z_report);
                setShiftSession(null);
                setShowCloseModal(false);
                setActualBalance('');
                setShiftNotes('');
            }
        } finally {
            setShiftSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-Cairo" dir="rtl">
            <Head title="نقطة البيع" />

            {/* Header */}
            <header className="bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="bg-[#6f272a] p-2 rounded-xl text-white shrink-0">
                        <ShoppingBag size={20} />
                    </div>
                    <h1 className="text-base sm:text-xl font-black text-gray-800 truncate">نقطة البيع</h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <button
                        onClick={() => setShowNewOrderModal(true)}
                        className="flex items-center gap-1 sm:gap-2 bg-[#ee1d23] text-white px-2.5 sm:px-4 py-2 rounded-xl font-black text-sm hover:bg-[#6f272a] transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">طلب جديد</span>
                        <ChevronDown size={14} />
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="تحديث"
                    >
                        <RefreshCw size={18} />
                    </button>

                    {permissions.includes('dashboard.view') && (
                        <Link
                            href={route('dashboard')}
                            className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline"
                            title="الإدارة"
                        >
                            <LayoutDashboard size={16} />
                            <span className="hidden sm:inline">الإدارة</span>
                        </Link>
                    )}

                    <button
                        onClick={() => router.post(route('logout'))}
                        className="flex items-center gap-1 sm:gap-2 border border-gray-200 hover:bg-gray-100 px-2 sm:px-3 py-2 rounded-xl text-gray-500 hover:text-gray-700 text-sm font-bold transition-colors"
                        title="تسجيل الخروج"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">خروج</span>
                    </button>
                </div>
            </header>

            {/* ── Shift Status Bar ── */}
            {!shiftLoading && (
                <div className={`mx-4 mt-3 mb-1 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm ${
                    shiftSession
                        ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                        : 'bg-red-900/30 border border-red-700/50 text-red-800'
                }`}>
                    {shiftSession ? (
                        <>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                                وردية مفتوحة &nbsp;|&nbsp; منذ {Math.round((Date.now() - new Date(shiftSession.opened_at)) / 60000)} دقيقة
                            </span>
                            <button
                                onClick={() => setShowCloseModal(true)}
                                className="bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors shrink-0"
                            >
                                إقفال الوردية
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                                لا توجد وردية مفتوحة &nbsp;—&nbsp; المدفوعات النقدية غير متاحة
                            </span>
                            <button
                                onClick={() => setShowOpenModal(true)}
                                className="bg-[#ee1d23] hover:bg-[#6f272a] text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors shrink-0"
                            >
                                فتح وردية
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white border-b px-4 sm:px-6 sticky top-[57px] sm:top-[73px] z-40">
                <div className="flex">
                    <TabBtn
                        active={activeTab === 'tables'}
                        onClick={() => setActiveTab('tables')}
                        icon={<MapPin size={15} />}
                        label="الطاولات"
                    />
                    <TabBtn
                        active={activeTab === 'queue'}
                        onClick={() => setActiveTab('queue')}
                        icon={<ShoppingCart size={15} />}
                        label="قائمة الطلبات"
                        badge={orders.length > 0 ? orders.length : null}
                    />
                </div>
            </div>

            <main className="flex-1 p-6 max-w-screen-2xl mx-auto w-full">

                {/* ───── Tables Tab ───── */}
                {activeTab === 'tables' && (
                    <div>
                        {/* Status filter bar */}
                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all border-2 ${
                                        statusFilter === f.key
                                            ? 'border-[#ee1d23] bg-red-50 text-[#ee1d23]'
                                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${f.dot}`} />
                                    {f.label}
                                    <span className="font-sans text-[11px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500">
                                        {tableCounts[f.key]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {areas.map((area) => {
                            const visibleTables = area.tables.filter(t =>
                                statusFilter === 'all' || t.status === statusFilter
                            );
                            if (visibleTables.length === 0) return null;

                            return (
                                <section key={area.id} className="mb-10">
                                    <div className="flex items-center gap-2 mb-5 pb-2 border-b border-gray-200">
                                        <MapPin className="text-[#ee1d23]" size={18} />
                                        <h2 className="text-lg font-bold text-gray-800">{area.name}</h2>
                                        <span className="text-xs font-bold text-gray-400 font-sans">
                                            {visibleTables.length}
                                            {statusFilter !== 'all' && (
                                                <span className="text-gray-300"> / {area.tables.length}</span>
                                            )}
                                            {' '}طاولة
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                        {visibleTables.map((table) => {
                                            const activeOrder = table.orders?.[0] ?? null;
                                            const isBilling = table.status === 'billing';
                                            const tableHref = route('pos.table', table.id);

                                            const cardClass = {
                                                available: 'bg-white border-green-100 hover:border-green-400 hover:shadow-md',
                                                occupied:  'bg-red-50 border-red-200 hover:shadow-md',
                                                reserved:  'bg-yellow-50 border-yellow-200 hover:shadow-md',
                                                billing:   'bg-amber-50 border-amber-300 hover:shadow-md',
                                            }[table.status] ?? 'bg-white border-gray-100';

                                            const dotClass = {
                                                available: 'bg-green-500',
                                                occupied:  'bg-red-500 animate-pulse',
                                                reserved:  'bg-yellow-400',
                                                billing:   'bg-amber-500 animate-pulse',
                                            }[table.status] ?? 'bg-gray-400';

                                            const statusLabel = {
                                                available: 'متاحة',
                                                occupied:  'مشغولة',
                                                reserved:  'محجوزة',
                                                billing:   'بانتظار الدفع',
                                            }[table.status] ?? table.status;

                                            const statusTextClass = {
                                                available: 'text-green-600',
                                                occupied:  'text-red-600',
                                                reserved:  'text-yellow-600',
                                                billing:   'text-amber-600',
                                            }[table.status] ?? 'text-gray-400';

                                            return (
                                                <Link
                                                    key={table.id}
                                                    href={tableHref}
                                                    className={`relative p-4 rounded-2xl border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 shadow-sm cursor-pointer ${cardClass}`}
                                                >
                                                    {/* Icon */}
                                                    <div className={`p-2.5 rounded-full ${
                                                        table.status === 'available' ? 'bg-green-50 text-green-600' :
                                                        table.status === 'billing'   ? 'bg-amber-50 text-amber-600' : 'bg-white/60'
                                                    }`}>
                                                        {isBilling ? <CreditCard size={20} /> : <Users size={20} />}
                                                    </div>

                                                    {/* Table name */}
                                                    <span className="font-black text-base font-sans">{table.name}</span>

                                                    {/* Status label */}
                                                    <span className={`text-[10px] font-bold tracking-wide ${statusTextClass}`}>
                                                        {statusLabel}
                                                    </span>

                                                    {/* Capacity */}
                                                    {(table.min_capacity || table.max_capacity) && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                                            <Users size={10} />
                                                            {table.max_capacity
                                                                ? `${table.min_capacity}–${table.max_capacity}`
                                                                : `${table.min_capacity}+`
                                                            }
                                                        </span>
                                                    )}

                                                    {/* Shape */}
                                                    {table.shape && (
                                                        <span className="text-[9px] font-bold text-gray-300 tracking-wide">
                                                            {SHAPE_LABELS[table.shape]}
                                                        </span>
                                                    )}

                                                    {/* Active order */}
                                                    {activeOrder && (
                                                        <span className={`text-[10px] font-black font-sans mt-0.5 ${isBilling ? 'text-amber-600' : 'text-[#ee1d23]'}`}>
                                                            #{activeOrder.id} · {activeOrder.total_amount} {currency}
                                                        </span>
                                                    )}

                                                    {/* Status dot */}
                                                    <div className={`absolute top-2 left-2 w-2.5 h-2.5 rounded-full shadow-sm ${dotClass}`} />
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}

                        {areas.length === 0 && (
                            <EmptyState
                                icon={<MapPin size={56} className="opacity-20" />}
                                title="لم يتم تعريف قاعات أو طاولات بعد"
                                subtitle="يرجى مراجعة لوحة تحكم المدير"
                            />
                        )}

                        {areas.length > 0 && tableCounts[statusFilter] === 0 && (
                            <EmptyState
                                icon={<Users size={56} className="opacity-20" />}
                                title="لا توجد طاولات بهذه الحالة"
                                subtitle="جرّب فلتراً مختلفاً"
                            />
                        )}
                    </div>
                )}

                {/* ───── Orders Queue Tab ───── */}
                {activeTab === 'queue' && (
                    <div>
                        {/* Filter bar */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 space-y-3 shadow-sm">
                            {/* Search */}
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={orderSearch}
                                        onChange={e => setOrderSearch(e.target.value)}
                                        placeholder="بحث برقم الطاولة أو رقم الطلب..."
                                        className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#ee1d23] transition-colors"
                                    />
                                </div>
                                {hasOrderFilters && (
                                    <button
                                        onClick={() => { setOrderSearch(''); setOrderStatusFilter('all'); setOrderTypeFilter('all'); }}
                                        className="shrink-0 text-xs font-black text-[#ee1d23] border border-[#ee1d23]/30 bg-red-50 px-3 py-2.5 rounded-xl hover:bg-red-100 transition-colors"
                                    >
                                        مسح الفلاتر
                                    </button>
                                )}
                            </div>

                            {/* Status + type pills */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="flex items-center gap-1 text-[11px] font-black text-gray-400 ml-1 shrink-0">
                                    <SlidersHorizontal size={12} />
                                    الحالة:
                                </span>
                                {[
                                    { key: 'all',       label: 'الكل',           dot: 'bg-gray-400' },
                                    { key: 'pending',   label: 'انتظار',         dot: 'bg-gray-400' },
                                    { key: 'preparing', label: 'يُحضر',          dot: 'bg-yellow-400' },
                                    { key: 'ready',     label: 'جاهز',           dot: 'bg-green-500' },
                                    { key: 'completed', label: 'مكتمل',          dot: 'bg-blue-400' },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setOrderStatusFilter(f.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all border ${
                                            orderStatusFilter === f.key
                                                ? 'border-[#ee1d23] bg-red-50 text-[#ee1d23]'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                                        {f.label}
                                    </button>
                                ))}

                                <span className="w-px h-4 bg-gray-200 mx-1 shrink-0" />

                                <span className="text-[11px] font-black text-gray-400 shrink-0">النوع:</span>
                                {[
                                    { key: 'all',      label: 'الكل',   icon: null },
                                    { key: 'dine_in',  label: 'داخلي',  icon: <Users size={11} /> },
                                    { key: 'takeaway', label: 'خارجي',  icon: <Package size={11} /> },
                                    { key: 'delivery', label: 'توصيل',  icon: <Truck size={11} /> },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setOrderTypeFilter(f.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all border ${
                                            orderTypeFilter === f.key
                                                ? 'border-[#ee1d23] bg-red-50 text-[#ee1d23]'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                                        }`}
                                    >
                                        {f.icon}
                                        {f.label}
                                    </button>
                                ))}

                                {hasOrderFilters && (
                                    <span className="mr-auto text-[11px] font-black text-gray-400 font-sans">
                                        {filteredOrders.length} / {orders.length}
                                    </span>
                                )}
                            </div>
                        </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-xl transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-1.5 h-full bg-[#ee1d23] scale-y-0 group-hover:scale-y-100 transition-transform origin-top rounded-l-full" />

                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="bg-gray-50 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 border border-gray-100 font-sans">
                                            #{order.id}
                                        </span>
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusColors(order.status)}`}>
                                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-black text-gray-800 mb-0.5">
                                        {order.type === 'dine_in'
                                            ? `طاولة ${order.table?.name ?? 'غ/م'}`
                                            : order.type === 'delivery'
                                                ? 'طلب توصيل'
                                                : 'طلب خارجي'}
                                    </h3>

                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold mb-0.5">
                                        <User size={11} />
                                        <span>{order.user?.name ?? '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                                        <Clock size={11} />
                                        <span className="font-sans">
                                            {new Date(order.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-400 font-bold text-sm">الإجمالي</span>
                                        <span className="text-xl font-black font-sans text-gray-900">
                                            {order.total_amount} <span className="text-xs font-bold">{currency}</span>
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Link
                                            href={route('pos.order', order.id)}
                                            className="bg-gray-100 text-gray-700 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors"
                                        >
                                            <Edit3 size={14} />
                                            تعديل
                                        </Link>
                                        <Link
                                            href={route('pos.checkout', order.id)}
                                            className="bg-gray-900 text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 hover:bg-[#6f272a] transition-colors"
                                        >
                                            <CreditCard size={14} />
                                            محاسبة
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {orders.length === 0 && (
                            <div className="col-span-full">
                                <EmptyState
                                    icon={<ShoppingCart size={56} className="opacity-20" />}
                                    title="لا توجد طلبات نشطة حالياً"
                                    subtitle="تظهر هنا الطلبات التي تنتظر المحاسبة أو المعالجة"
                                />
                            </div>
                        )}
                        {orders.length > 0 && filteredOrders.length === 0 && (
                            <div className="col-span-full">
                                <EmptyState
                                    icon={<Search size={56} className="opacity-20" />}
                                    title="لا توجد نتائج مطابقة"
                                    subtitle="جرّب تعديل الفلاتر أو مسحها"
                                />
                            </div>
                        )}
                    </div>
                    </div>
                )}
            </main>

            {/* ───── Ready-order toast notifications ───── */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
                {readyNotices.map(notice => (
                    <div
                        key={notice.id}
                        className="pointer-events-auto flex items-center gap-3 bg-green-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-green-500/50 animate-bounce-in font-Cairo"
                    >
                        <span className="text-2xl">🔔</span>
                        <div>
                            <p className="font-black text-sm">
                                الطلب #{notice.id} جاهز!
                                {notice.table && <span className="font-bold"> — طاولة {notice.table}</span>}
                            </p>
                            <p className="text-xs font-bold text-green-200">توجه لاستلامه من بار المطبخ</p>
                        </div>
                        <button
                            onClick={() => setReadyNotices(prev => prev.filter(x => x.id !== notice.id))}
                            className="mr-2 text-green-200 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* ───── Open Shift Modal ───── */}
            {showOpenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-80 text-white">
                        <h3 className="text-lg font-bold mb-4 text-center">فتح وردية صندوق</h3>
                        <label className="block text-sm text-white/60 mb-1">رصيد الصندوق الافتتاحي (₪)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={openingBalance}
                            onChange={e => setOpeningBalance(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-lg font-bold text-center mb-4 focus:outline-none focus:border-[#ee1d23]"
                            placeholder="0.00"
                            autoFocus
                        />
                        {shiftError && (
                            <div className="bg-red-900/50 border border-red-500/50 rounded-xl px-3 py-2 mb-4 text-red-300 text-xs leading-relaxed">
                                {shiftError}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowOpenModal(false); setShiftError(''); }}
                                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 hover:bg-white/5 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleOpenShift}
                                disabled={shiftSubmitting}
                                className="flex-1 py-2.5 rounded-xl bg-[#ee1d23] hover:bg-[#6f272a] text-white font-bold transition-colors disabled:opacity-50"
                            >
                                {shiftSubmitting ? '...' : 'فتح الوردية'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── Close Shift Modal ───── */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-96 text-white">
                        <h3 className="text-lg font-bold mb-4 text-center">إقفال الوردية</h3>
                        <div className="bg-white/5 rounded-xl p-3 mb-4 text-sm">
                            <div className="flex justify-between mb-1">
                                <span className="text-white/60">الرصيد الافتتاحي</span>
                                <span className="font-sans">{Number(shiftSession?.opening_balance ?? 0).toFixed(2)} ₪</span>
                            </div>
                            <div className="text-white/40 text-xs">الرصيد المتوقع يحتسب عند الإقفال</div>
                        </div>
                        <label className="block text-sm text-white/60 mb-1">الرصيد الفعلي في الصندوق (₪)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={actualBalance}
                            onChange={e => setActualBalance(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-lg font-bold text-center mb-3 focus:outline-none focus:border-[#ee1d23]"
                            placeholder="0.00"
                            autoFocus
                        />
                        <label className="block text-sm text-white/60 mb-1">ملاحظات (اختياري)</label>
                        <textarea
                            value={shiftNotes}
                            onChange={e => setShiftNotes(e.target.value)}
                            rows={2}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm mb-4 resize-none focus:outline-none focus:border-white/40"
                            placeholder="أي ملاحظات..."
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 hover:bg-white/5 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleCloseShift}
                                disabled={shiftSubmitting || !actualBalance}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
                            >
                                {shiftSubmitting ? '...' : 'إقفال وطباعة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── Z-Report Modal ───── */}
            {zReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="bg-white rounded-2xl p-6 w-[480px] max-h-[80vh] overflow-y-auto text-slate-800" dir="rtl">
                        <h3 className="text-xl font-black text-center mb-1">تقرير إقفال الوردية</h3>
                        <p className="text-center text-slate-400 text-sm mb-4">Z-Report</p>

                        {/* Session info */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-3 text-sm">
                            {[
                                ['الكاشير', zReport.session.user],
                                ['الفرع',   zReport.session.branch],
                                ['المدة',   `${zReport.session.duration_minutes} دقيقة`],
                            ].map(([label, val]) => (
                                <div key={label} className="flex justify-between mb-1 last:mb-0">
                                    <span className="text-slate-500">{label}</span>
                                    <span className="font-bold">{val}</span>
                                </div>
                            ))}
                        </div>

                        {/* Cash summary */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-3 text-sm">
                            <h4 className="font-bold mb-2">ملخص الصندوق</h4>
                            {[
                                ['الرصيد الافتتاحي',  zReport.cash_summary.opening_balance],
                                ['المقبوضات النقدية', zReport.cash_summary.cash_received],
                                ['الرصيد المتوقع',    zReport.cash_summary.expected_closing],
                                ['الرصيد الفعلي',     zReport.cash_summary.actual_closing],
                            ].map(([label, val]) => (
                                <div key={label} className="flex justify-between mb-1">
                                    <span className="text-slate-500">{label}</span>
                                    <span className="font-bold font-sans">{Number(val).toFixed(2)} ₪</span>
                                </div>
                            ))}
                            <div className="flex justify-between pt-2 border-t border-slate-200 mt-1">
                                <span className="font-bold">الفرق</span>
                                <span className={`font-black font-sans ${
                                    zReport.cash_summary.difference < 0 ? 'text-red-600'
                                    : zReport.cash_summary.difference > 0 ? 'text-blue-600'
                                    : 'text-green-600'
                                }`}>
                                    {zReport.cash_summary.difference >= 0 ? '+' : ''}
                                    {Number(zReport.cash_summary.difference).toFixed(2)} ₪
                                </span>
                            </div>
                        </div>

                        {/* Sales by payment method */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-3 text-sm">
                            <h4 className="font-bold mb-2">المبيعات بطريقة الدفع</h4>
                            {zReport.sales_summary.by_payment_method.map(m => (
                                <div key={m.method_name} className="flex justify-between mb-1">
                                    <span className="text-slate-500">{m.method_name} ({m.count})</span>
                                    <span className="font-bold font-sans">{Number(m.total).toFixed(2)} ₪</span>
                                </div>
                            ))}
                        </div>

                        {/* Tax summary */}
                        {zReport.tax_summary?.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
                                <h4 className="font-bold mb-2">الضرائب</h4>
                                {zReport.tax_summary.map(t => (
                                    <div key={t.tax_code} className="flex justify-between mb-1">
                                        <span className="text-slate-500">{t.tax_name}</span>
                                        <span className="font-bold font-sans">{Number(t.tax_amount).toFixed(2)} ₪</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-bold"
                            >
                                طباعة
                            </button>
                            <button
                                onClick={() => setZReport(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── New Order Modal ───── */}
            <Modal show={showNewOrderModal} onClose={() => setShowNewOrderModal(false)} maxWidth="sm">
                <div className="p-6 text-right" dir="rtl">
                    <div className="flex justify-between items-center mb-1">
                        <button
                            onClick={() => setShowNewOrderModal(false)}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
                        >
                            <X size={18} />
                        </button>
                        <h2 className="text-lg font-black text-gray-800">إنشاء طلب جديد</h2>
                    </div>
                    <p className="text-xs text-gray-400 font-bold mb-5 text-left">
                        للطلبات الداخلية اختر طاولة من تبويب الطاولات
                    </p>

                    <div className="space-y-3">
                        <NewOrderBtn
                            onClick={() => createOrder('takeaway')}
                            disabled={creating}
                            icon={<Package className="text-orange-500" size={22} />}
                            iconBg="bg-orange-50"
                            title="طلب خارجي (Takeaway)"
                            subtitle="الزبون يستلم من المطعم مباشرة"
                        />
                        <NewOrderBtn
                            onClick={() => createOrder('delivery')}
                            disabled={creating}
                            icon={<Truck className="text-blue-500" size={22} />}
                            iconBg="bg-blue-50"
                            title="طلب توصيل (Delivery)"
                            subtitle="يُوصَّل إلى عنوان الزبون"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}

/* ── Small presentational helpers ── */

function TabBtn({ active, onClick, icon, label, badge }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-4 font-black text-sm border-b-2 transition-all ${
                active
                    ? 'border-[#ee1d23] text-[#ee1d23]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
        >
            {icon}
            {label}
            {badge != null && (
                <span className="bg-[#ee1d23] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full font-sans">
                    {badge}
                </span>
            )}
        </button>
    );
}

function NewOrderBtn({ onClick, disabled, icon, iconBg, title, subtitle }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-[#ee1d23] hover:bg-red-50 transition-all text-right disabled:opacity-50"
        >
            <div className={`${iconBg} p-3 rounded-xl shrink-0`}>{icon}</div>
            <div>
                <div className="font-black text-gray-800 text-sm">{title}</div>
                <div className="text-xs text-gray-400 font-bold">{subtitle}</div>
            </div>
        </button>
    );
}

function EmptyState({ icon, title, subtitle }) {
    return (
        <div className="h-80 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-300">
            {icon}
            <h4 className="text-lg font-black text-gray-400 mt-4">{title}</h4>
            {subtitle && <p className="text-sm font-bold opacity-60 mt-1">{subtitle}</p>}
        </div>
    );
}
