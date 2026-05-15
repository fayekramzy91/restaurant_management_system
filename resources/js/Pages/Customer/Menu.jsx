import { useState, useEffect, useRef, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import CustomerLayout from './Layout';
import { ShoppingCart, Plus, Minus, Trash2, ChefHat, CheckCircle2, Clock, X, AlertCircle, RotateCcw } from 'lucide-react';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS = {
    pending:    'في الانتظار',
    preparing:  'قيد التحضير',
    ready:      'جاهز للاستلام',
    completed:  'مكتمل',
    cancelled:  'ملغي',
};

const STATUS_COLORS = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    preparing: 'bg-blue-50 text-blue-700 border-blue-200',
    ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-slate-50 text-slate-600 border-slate-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
};

// ─── CategoryNav ──────────────────────────────────────────────────────────────

function CategoryNav({ categories, selected, onSelect }) {
    return (
        <div className="bg-white border-b border-gray-100 sticky top-[60px] z-40 overflow-x-auto scrollbar-none">
            <div className="flex gap-1 px-3 py-2 min-w-max">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id)}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                            selected === cat.id
                                ? 'bg-[#ee1d23] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── MenuItemCard ─────────────────────────────────────────────────────────────

function MenuItemCard({ item, qty, onAdd, onRemove }) {
    const { settings } = usePage().props;
    const currency = settings?.currency || 'ILS';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            {item.image ? (
                <div className="h-36 bg-gray-100 overflow-hidden">
                    <img
                        src={`/storage/${item.image}`}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                </div>
            ) : (
                <div className="h-36 bg-gradient-to-br from-[#6f272a]/10 to-[#ee1d23]/10 flex items-center justify-center">
                    <span className="text-4xl opacity-30">🍽</span>
                </div>
            )}
            <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="flex-1">
                    <p className="font-bold text-[13px] text-gray-900 leading-tight">{item.name}</p>
                    {item.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-[#ee1d23] font-black text-[15px]">
                        {Number(item.price).toFixed(2)} {currency}
                    </span>
                    {qty === 0 ? (
                        <button
                            onClick={() => onAdd(item)}
                            className="bg-[#ee1d23] text-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                        >
                            <Plus size={16} />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => onRemove(item.id)}
                                className="bg-gray-100 text-gray-700 rounded-full w-7 h-7 flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <Minus size={13} />
                            </button>
                            <span className="text-[#ee1d23] font-black text-[15px] w-5 text-center">{qty}</span>
                            <button
                                onClick={() => onAdd(item)}
                                className="bg-[#ee1d23] text-white rounded-full w-7 h-7 flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <Plus size={13} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── CartDrawer ───────────────────────────────────────────────────────────────

function CartDrawer({ cart, open, onClose, onAdd, onRemove, onRemoveAll, onSubmit, submitting, settings }) {
    const currency = settings?.currency || 'ILS';
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                    <h2 className="font-black text-[17px] text-gray-900">طلبك</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-[13px] text-gray-900 truncate">{item.name}</p>
                                <p className="text-[12px] text-[#ee1d23] font-bold">
                                    {(item.price * item.qty).toFixed(2)} {currency}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                    onClick={() => onRemove(item.id)}
                                    className="bg-gray-100 text-gray-700 rounded-full w-7 h-7 flex items-center justify-center"
                                >
                                    {item.qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                                </button>
                                <span className="text-gray-900 font-black text-[14px] w-5 text-center">{item.qty}</span>
                                <button
                                    onClick={() => onAdd(item)}
                                    className="bg-[#ee1d23] text-white rounded-full w-7 h-7 flex items-center justify-center"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-5 pb-6 pt-3 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-semibold text-[13px]">الإجمالي</span>
                        <span className="font-black text-[18px] text-gray-900">{total.toFixed(2)} {currency}</span>
                    </div>
                    <button
                        onClick={onSubmit}
                        disabled={submitting || cart.length === 0}
                        className="w-full bg-[#ee1d23] text-white font-black text-[15px] py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60"
                    >
                        {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب إلى المطبخ'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── OrderTracker ─────────────────────────────────────────────────────────────

function OrderTracker({ orderData, qrToken, onCancel, onAddMore, onNewOrder, settings }) {
    const currency = settings?.currency || 'ILS';
    const { status, can_cancel, can_add_items, items = [], total_amount } = orderData;
    const [cancelling, setCancelling] = useState(false);

    const steps = [
        { key: 'preparing', label: 'وصل للمطبخ', icon: <ChefHat size={18} /> },
        { key: 'kitchen_started', label: 'بدأ التحضير', icon: <Clock size={18} /> },
        { key: 'ready', label: 'جاهز للاستلام', icon: <CheckCircle2 size={18} /> },
    ];

    const stepIndex = status === 'ready' || status === 'completed' ? 2
        : orderData.preparing_started_at ? 1 : 0;

    const handleCancel = async () => {
        if (!window.confirm('هل تريد إلغاء الطلب؟')) return;
        setCancelling(true);
        try {
            const res = await fetch(`/menu/${qrToken}/order/${orderData.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                onCancel();
            } else {
                const data = await res.json();
                alert(data.error || 'فشل الإلغاء');
            }
        } catch {
            alert('حدث خطأ. يرجى المحاولة مجدداً.');
        } finally {
            setCancelling(false);
        }
    };

    const isDone = status === 'ready' || status === 'completed';
    const isCancelled = status === 'cancelled';

    return (
        <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">

            {/* Status banner */}
            <div className={`rounded-2xl border p-4 text-center ${STATUS_COLORS[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                <p className="font-black text-[18px]">{STATUS_LABELS[status] || status}</p>
                <p className="text-[12px] mt-1 opacity-70">طلب رقم #{orderData.id}</p>
            </div>

            {/* Progress stepper (only when not cancelled) */}
            {!isCancelled && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between gap-2">
                        {steps.map((step, i) => (
                            <div key={step.key} className="flex flex-col items-center flex-1 gap-1.5">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                    i <= stepIndex
                                        ? 'bg-[#ee1d23] border-[#ee1d23] text-white'
                                        : 'bg-gray-100 border-gray-200 text-gray-400'
                                }`}>
                                    {step.icon}
                                </div>
                                <p className={`text-[10px] font-bold text-center leading-tight ${
                                    i <= stepIndex ? 'text-[#ee1d23]' : 'text-gray-400'
                                }`}>{step.label}</p>
                                {i < steps.length - 1 && (
                                    <div className={`absolute hidden`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Connector lines between steps */}
                    <div className="relative mt-1">
                        <div className="absolute top-[-30px] right-[16.5%] left-[16.5%] h-0.5 bg-gray-200 z-0" />
                        <div
                            className="absolute top-[-30px] right-[16.5%] h-0.5 bg-[#ee1d23] z-0 transition-all duration-500"
                            style={{ width: `${(stepIndex / (steps.length - 1)) * (100 - 33)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Ready celebration */}
            {status === 'ready' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                    <p className="text-4xl mb-2">🎉</p>
                    <p className="font-black text-emerald-700 text-[16px]">طلبك جاهز!</p>
                    <p className="text-emerald-600 text-[13px] mt-1">تفضل باستلامه من الطاولة</p>
                </div>
            )}

            {/* Items list */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-black text-[14px] text-gray-900">تفاصيل الطلب</p>
                    <p className="font-black text-[14px] text-[#ee1d23]">
                        {Number(total_amount).toFixed(2)} {currency}
                    </p>
                </div>
                <div className="divide-y divide-gray-50">
                    {items.map(item => (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-[13px] text-gray-900 truncate">{item.name}</p>
                                {item.notes && (
                                    <p className="text-[11px] text-gray-400 mt-0.5">ملاحظة: {item.notes}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 text-[13px]">
                                <span className="text-gray-400 font-semibold">×{item.quantity}</span>
                                <span className="font-bold text-gray-700">
                                    {(item.price * item.quantity).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
                {can_add_items && !isDone && !isCancelled && (
                    <button
                        onClick={onAddMore}
                        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#ee1d23] text-[#ee1d23] font-black text-[14px] py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
                    >
                        <Plus size={16} />
                        إضافة المزيد
                    </button>
                )}

                {can_cancel && !isDone && !isCancelled && (
                    <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 font-bold text-[14px] py-3.5 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60"
                    >
                        <X size={16} />
                        {cancelling ? 'جارٍ الإلغاء...' : 'إلغاء الطلب'}
                    </button>
                )}

                {(isDone || isCancelled) && (
                    <button
                        onClick={onNewOrder}
                        className="w-full flex items-center justify-center gap-2 bg-[#1c0a0b] text-white font-black text-[14px] py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
                    >
                        <RotateCcw size={16} />
                        طلب جديد
                    </button>
                )}
            </div>

            {/* Preparing message */}
            {status === 'preparing' && !orderData.preparing_started_at && !isCancelled && (
                <div className="flex items-center gap-2 text-[12px] text-gray-400 justify-center">
                    <AlertCircle size={14} />
                    <span>يمكنك الإلغاء حتى يبدأ الطاهي التحضير</span>
                </div>
            )}
        </div>
    );
}

// ─── Main Menu component ──────────────────────────────────────────────────────

export default function Menu({ table, categories, activeOrder, settings }) {
    const qrToken = table.qr_token;

    const [view, setView] = useState(activeOrder ? 'tracking' : 'menu');
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id ?? null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Active order state (seeded from Inertia prop or set after submission)
    const [orderId, setOrderId] = useState(() => {
        const stored = localStorage.getItem(`order_${qrToken}`);
        return stored ? parseInt(stored, 10) : (activeOrder?.id ?? null);
    });
    const [orderData, setOrderData] = useState(activeOrder ?? null);

    // ── Polling ─────────────────────────────────────────────────────────────

    const pollActive = orderId && orderData && !['ready', 'completed', 'cancelled'].includes(orderData.status);

    const fetchStatus = useCallback(async () => {
        if (!orderId) return;
        try {
            const res = await fetch(`/menu/${qrToken}/order/${orderId}`);
            if (res.status === 404) {
                localStorage.removeItem(`order_${qrToken}`);
                setOrderId(null);
                setOrderData(null);
                setView('menu');
                return;
            }
            if (!res.ok) return;
            const data = await res.json();
            setOrderData(data);
        } catch {
            // network hiccup — keep polling
        }
    }, [orderId, qrToken]);

    useEffect(() => {
        if (!pollActive) return;
        fetchStatus(); // immediate first call
        const id = setInterval(fetchStatus, 10000);
        return () => clearInterval(id);
    }, [pollActive, fetchStatus]);

    // ── Cart helpers ─────────────────────────────────────────────────────────

    const addToCart = useCallback((item) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            return existing
                ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
                : [...prev, { id: item.id, name: item.name, price: Number(item.price), qty: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((itemId) => {
        setCart(prev => {
            const item = prev.find(c => c.id === itemId);
            if (!item) return prev;
            return item.qty > 1
                ? prev.map(c => c.id === itemId ? { ...c, qty: c.qty - 1 } : c)
                : prev.filter(c => c.id !== itemId);
        });
    }, []);

    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const currency = settings?.currency || 'ILS';

    // ── Submission ───────────────────────────────────────────────────────────

    const submitOrder = async () => {
        if (cart.length === 0 || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/menu/${qrToken}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(c => ({ id: c.id, qty: c.qty })),
                }),
            });

            if (res.status === 409) {
                // Another order already active — fetch its status
                await fetchStatus();
                setView('tracking');
                setCartOpen(false);
                return;
            }

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'فشل إرسال الطلب');
            }

            const data = await res.json();
            localStorage.setItem(`order_${qrToken}`, String(data.order_id));
            setOrderId(data.order_id);
            setOrderData({
                id: data.order_id,
                status: data.status,
                total_amount: data.total,
                preparing_started_at: null,
                can_cancel: true,
                can_add_items: false,
                items: cart.map(c => ({
                    id: c.id,
                    name: c.name,
                    quantity: c.qty,
                    price: c.price,
                    notes: null,
                })),
            });
            setCart([]);
            setCartOpen(false);
            setView('tracking');
        } catch (e) {
            setError(e.message || 'حدث خطأ. يرجى المحاولة مجدداً.');
        } finally {
            setSubmitting(false);
        }
    };

    // Add single item to existing order (post-submit)
    const addItemToOrder = async (item) => {
        if (!orderId) return;
        try {
            const res = await fetch(`/menu/${qrToken}/order/${orderId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ menu_item_id: item.id, qty: 1 }),
            });
            if (res.ok) {
                await fetchStatus();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'فشل إضافة الصنف');
            }
        } catch {
            alert('حدث خطأ أثناء الإضافة');
        }
    };

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleCancel = () => {
        localStorage.removeItem(`order_${qrToken}`);
        setOrderId(null);
        setOrderData(null);
        setView('menu');
    };

    const handleNewOrder = () => {
        localStorage.removeItem(`order_${qrToken}`);
        setOrderId(null);
        setOrderData(null);
        setCart([]);
        setView('menu');
    };

    // ── Menu items for selected category ─────────────────────────────────────

    const visibleItems = selectedCategory
        ? (categories.find(c => c.id === selectedCategory)?.menu_items ?? [])
        : [];

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <CustomerLayout title={`${table.area.name} · طاولة ${table.name}`}>

            {view === 'tracking' && orderData ? (
                <OrderTracker
                    orderData={orderData}
                    qrToken={qrToken}
                    onCancel={handleCancel}
                    onAddMore={() => setView('menu')}
                    onNewOrder={handleNewOrder}
                    settings={settings}
                />
            ) : (
                <>
                    {/* Category nav */}
                    <CategoryNav
                        categories={categories}
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                    />

                    {/* Error banner */}
                    {error && (
                        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-semibold flex items-center gap-2">
                            <AlertCircle size={15} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Items grid */}
                    <div className="p-4 pb-32 grid grid-cols-2 gap-3">
                        {visibleItems.length === 0 ? (
                            <div className="col-span-2 text-center py-16 text-gray-300">
                                <p className="text-[13px] font-semibold">لا توجد أصناف متاحة</p>
                            </div>
                        ) : (
                            visibleItems.map(item => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    qty={cart.find(c => c.id === item.id)?.qty ?? 0}
                                    onAdd={() => {
                                        if (view === 'tracking' && orderData?.can_add_items) {
                                            addItemToOrder(item);
                                        } else {
                                            addToCart(item);
                                        }
                                    }}
                                    onRemove={removeFromCart}
                                />
                            ))
                        )}
                    </div>

                    {/* Cart bar — only when not tracking */}
                    {cartCount > 0 && view !== 'tracking' && (
                        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6" dir="rtl">
                            <button
                                onClick={() => setCartOpen(true)}
                                className="w-full bg-[#ee1d23] text-white font-black text-[15px] py-4 rounded-2xl shadow-2xl flex items-center justify-between px-5 active:scale-[0.98] transition-transform max-w-lg mx-auto"
                            >
                                <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-[13px] font-black">
                                    {cartCount}
                                </span>
                                <span>عرض الطلب</span>
                                <span className="font-black">{cartTotal.toFixed(2)} {currency}</span>
                            </button>
                        </div>
                    )}

                    {/* If already has an active order but browsing — show tracking bar */}
                    {orderId && orderData && !['completed', 'cancelled'].includes(orderData.status) && view === 'menu' && (
                        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6" dir="rtl">
                            <button
                                onClick={() => setView('tracking')}
                                className="w-full bg-[#1c0a0b] text-white font-black text-[14px] py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform max-w-lg mx-auto"
                            >
                                <ChefHat size={16} />
                                عرض طلبي الحالي
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Cart drawer */}
            <CartDrawer
                cart={cart}
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onSubmit={submitOrder}
                submitting={submitting}
                settings={settings}
            />
        </CustomerLayout>
    );
}
