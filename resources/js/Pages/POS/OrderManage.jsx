import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import {
    ChevronRight, ChevronUp, ShoppingCart, Utensils, Info, Plus, Minus, Send,
    X, ArrowRight, Sparkles, CreditCard, Truck, Package, MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

const TYPE_LABELS = { dine_in: 'داخلي', takeaway: 'خارجي', delivery: 'توصيل' };

function TypeIcon({ type, size = 18 }) {
    if (type === 'delivery') return <Truck size={size} className="text-blue-500" />;
    if (type === 'takeaway') return <Package size={size} className="text-orange-500" />;
    return <MapPin size={size} className="text-green-600" />;
}

export default function OrderManage({ table, activeOrder, billingOrder, categories, addons }) {
    const { settings } = usePage().props;
    const currency = settings?.currency || 'SAR';

    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id ?? null);
    const [searchTerm, setSearchTerm] = useState('');
    const [cartOpen, setCartOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = cartOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [cartOpen]);

    // Addon modal
    const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
    const [editingCartItem, setEditingCartItem] = useState(null);
    const [selectedAddonQuantities, setSelectedAddonQuantities] = useState({});

    const { post: sendToKitchen, processing: sending } = useForm();
    const [freeingTable, setFreeingTable] = useState(false);

    const orderType  = activeOrder?.type ?? 'dine_in';
    const hasItems   = (activeOrder?.items?.length ?? 0) > 0;
    const canFreeTable = activeOrder && orderType === 'dine_in'
        && !['completed', 'cancelled'].includes(activeOrder.status)
        && table?.status !== 'billing';

    const handleFreeTable = () => {
        if (!activeOrder || freeingTable) return;
        setFreeingTable(true);
        router.post(route('orders.free-table', activeOrder.id), {}, {
            onFinish: () => setFreeingTable(false),
        });
    };

    const filteredItems = useMemo(() => {
        const cat = categories.find(c => c.id === selectedCategory);
        if (!cat) return [];
        return cat.menu_items.filter(item =>
            item.name.includes(searchTerm) ||
            (item.description && item.description.includes(searchTerm))
        );
    }, [selectedCategory, categories, searchTerm]);

    const handleAddItem = (itemId) => {
        if (!activeOrder) {
            // Create a new dine-in order (first item tap)
            router.post(route('orders.store'), {
                table_id:     table.id,
                type:         'dine_in',
                menu_item_id: itemId,
                quantity:     1,
            });
        } else {
            router.post(route('orders.add-item', activeOrder.id), {
                menu_item_id: itemId,
                quantity:     1,
            });
        }
    };

    const openAddonModal = (cartItem) => {
        setEditingCartItem(cartItem);
        const init = {};
        addons.forEach(a => { init[a.id] = 0; });
        cartItem.addons.forEach(rel => { init[rel.menu_item_id] = rel.quantity; });
        setSelectedAddonQuantities(init);
        setIsAddonModalOpen(true);
    };

    const updateAddonQty = (addonId, delta) => {
        setSelectedAddonQuantities(prev => ({
            ...prev,
            [addonId]: Math.max(0, (prev[addonId] || 0) + delta),
        }));
    };

    const saveAddons = () => {
        const addonData = Object.entries(selectedAddonQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => ({ menu_item_id: id, quantity: qty }));

        router.put(
            route('orders.update-item-addons', { order: activeOrder.id, item: editingCartItem.id }),
            { addons: addonData },
            { onSuccess: () => setIsAddonModalOpen(false) }
        );
    };

    /* ─── Header info ─── */
    const headerTitle = (() => {
        if (activeOrder) {
            if (orderType === 'dine_in') return `طاولة ${table?.name ?? ''}`;
            if (orderType === 'delivery') return 'طلب توصيل';
            return 'طلب خارجي';
        }
        return `طاولة ${table?.name ?? ''}`;
    })();

    const headerSub = (() => {
        if (activeOrder) {
            if (orderType === 'dine_in') return table?.area?.name ?? '';
            return `#${activeOrder.id} · ${TYPE_LABELS[orderType]}`;
        }
        return table?.area?.name ?? '';
    })();

    return (
        <div className="h-screen bg-gray-50 flex flex-col font-Cairo overflow-hidden" dir="rtl">
            <Head title={headerTitle} />

            {/* Header */}
            <header className="bg-white border-b px-5 py-3 flex justify-between items-center shadow-sm z-30">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('pos.index')}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <ArrowRight size={22} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <TypeIcon type={orderType} />
                        <div>
                            <h1 className="text-lg font-black text-gray-800 leading-tight">{headerTitle}</h1>
                            {headerSub && (
                                <p className="text-xs text-gray-400 font-bold">{headerSub}</p>
                            )}
                        </div>
                    </div>
                </div>

                {activeOrder && (
                    <div className="flex items-center gap-2">
                        <div className="bg-green-50 px-3 py-1.5 rounded-full border border-green-100 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-black text-green-700">طلب #{activeOrder.id}</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Billing order notice */}
            {billingOrder && (
                <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
                        <CreditCard size={15} className="shrink-0 text-amber-600" />
                        <span>طلب سابق بانتظار الدفع — <span className="font-black">#{billingOrder.id}</span> ({billingOrder.total_amount} {settings?.currency || 'SAR'})</span>
                    </div>
                    <Link
                        href={route('pos.checkout', billingOrder.id)}
                        className="shrink-0 bg-amber-600 text-white text-xs font-black px-3 py-1.5 rounded-xl hover:bg-amber-700 transition-colors"
                    >
                        محاسبة
                    </Link>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* ─── Categories Sidebar ─── */}
                <aside className="w-24 md:w-32 bg-white border-l flex flex-col overflow-y-auto scrollbar-hide py-3 gap-1 z-20">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`flex flex-col items-center p-3 transition-all relative ${
                                selectedCategory === category.id
                                    ? 'text-[#ee1d23]'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <div className={`p-2.5 rounded-2xl mb-1.5 transition-all ${
                                selectedCategory === category.id ? 'bg-red-50 shadow-sm' : 'bg-gray-50'
                            }`}>
                                <Utensils size={22} />
                            </div>
                            <span className="text-[10px] font-bold text-center leading-tight">{category.name}</span>
                            {selectedCategory === category.id && (
                                <motion.div
                                    layoutId="activeCat"
                                    className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-[#ee1d23] rounded-l-full"
                                />
                            )}
                        </button>
                    ))}
                </aside>

                {/* ─── Items Grid ─── */}
                <main className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.map((item) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={item.id}
                                    onClick={() => item.status === 'available' && handleAddItem(item.id)}
                                    className={`bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between transition-shadow group relative overflow-hidden
                                        ${item.status === 'available'
                                            ? 'cursor-pointer hover:shadow-md active:scale-95'
                                            : 'opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300 overflow-hidden">
                                            {item.image
                                                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                : <Utensils size={28} />
                                            }
                                        </div>
                                        <div className="text-left font-sans font-black text-[#6f272a] text-base">
                                            {item.price} <span className="text-[10px] opacity-60">{currency}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-800 text-sm leading-tight group-hover:text-[#ee1d23] transition-colors">
                                            {item.name}
                                        </h4>
                                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 h-8 font-bold">
                                            {item.description || 'لا يوجد وصف'}
                                        </p>
                                    </div>
                                    <div className="mt-3 flex justify-between items-center">
                                        <span className={`text-[10px] font-bold ${item.status === 'available' ? 'text-green-500' : 'text-red-400'}`}>
                                            {item.status === 'available' ? 'متوفر' : 'نفذ'}
                                        </span>
                                        {item.status === 'available' && (
                                            <div className="bg-red-50 p-1.5 rounded-xl text-[#ee1d23] group-hover:bg-[#ee1d23] group-hover:text-white transition-colors">
                                                <Plus size={16} />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </main>

                {/* ─── Order Summary Sidebar ─── */}
                <aside className="hidden lg:flex w-80 xl:w-96 bg-white border-r flex-col z-30 shadow-2xl">
                    {/* Summary header */}
                    <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="text-[#6f272a]" size={18} />
                            <h3 className="font-black text-gray-800">تفاصيل الطلب</h3>
                        </div>
                        <span className="bg-[#ee1d23] text-white text-[10px] font-black px-2 py-1 rounded-full">
                            {activeOrder?.items?.length || 0} أصناف
                        </span>
                    </div>

                    {/* Items list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeOrder?.items?.map((item) => (
                            <OrderItemRow
                                key={item.id}
                                item={item}
                                order={activeOrder}
                                currency={currency}
                                onAddon={() => openAddonModal(item)}
                            />
                        ))}

                        {!activeOrder && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-16 px-8 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <ShoppingCart size={36} className="opacity-20" />
                                </div>
                                <p className="font-black text-gray-400 text-sm">السلة فارغة</p>
                                <p className="text-xs mt-1 font-bold">ابدأ بإضافة أصناف من القائمة</p>
                            </div>
                        )}

                        {activeOrder && !hasItems && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-16 px-8 text-center">
                                <ShoppingCart size={40} className="opacity-20 mb-3" />
                                <p className="text-sm font-black text-gray-400">لم يُضف أي صنف بعد</p>
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="p-5 bg-white border-t space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold text-sm">المجموع الإجمالي</span>
                            <span className="text-2xl font-black font-sans text-[#6f272a]">
                                {activeOrder?.total_amount || '0.00'} <span className="text-xs font-bold">{currency}</span>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            {/* Send to Kitchen */}
                            <button
                                onClick={() => hasItems && sendToKitchen(route('orders.complete', activeOrder.id))}
                                disabled={!hasItems || sending}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95
                                    ${hasItems
                                        ? 'bg-[#ee1d23] text-white hover:bg-[#c4181d]'
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                <Send size={16} />
                                للمطبخ
                            </button>

                            {/* Proceed to Checkout */}
                            {hasItems ? (
                                <Link
                                    href={route('pos.checkout', activeOrder.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-gray-900 text-white hover:bg-[#6f272a] transition-colors shadow-sm active:scale-95"
                                >
                                    <CreditCard size={16} />
                                    محاسبة
                                </Link>
                            ) : (
                                <span className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-gray-100 text-gray-300 cursor-not-allowed">
                                    <CreditCard size={16} />
                                    محاسبة
                                </span>
                            )}
                        </div>

                        {/* Free Table */}
                        {canFreeTable && (
                            <button
                                onClick={handleFreeTable}
                                disabled={freeingTable}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-black text-sm border-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                                <ArrowRight size={15} />
                                {freeingTable ? 'جارٍ التحرير...' : 'تحرير الطاولة — الزبون عند الكاشير'}
                            </button>
                        )}
                    </div>
                </aside>
            </div>

            {/* ─── Addon Modal ─── */}
            <Modal show={isAddonModalOpen} onClose={() => setIsAddonModalOpen(false)} maxWidth="md">
                <div className="p-6 text-right" dir="rtl">
                    <div className="flex justify-between items-center mb-5 border-b pb-4">
                        <h2 className="text-lg font-black text-gray-800">
                            إضافات: {editingCartItem?.name ?? editingCartItem?.menu_item?.name}
                        </h2>
                        <button onClick={() => setIsAddonModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-2xl mb-5 flex items-center gap-3 border border-blue-100">
                        <Info className="text-blue-500 shrink-0" size={18} />
                        <p className="text-xs text-blue-700 font-bold">
                            يمكنك تحديد عدد الإضافات بشكل منفصل (مثلاً: 1 زيادة جبنة لـ 4 بيتزا).
                        </p>
                    </div>

                    <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto px-1">
                        {addons?.map((addon) => (
                            <div
                                key={addon.id}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                    (selectedAddonQuantities[addon.id] || 0) > 0
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-100'
                                }`}
                            >
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800 text-sm">{addon.name}</div>
                                    <div className="text-xs text-purple-600 font-black font-sans">+{addon.price} {currency}</div>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border">
                                    <button onClick={() => updateAddonQty(addon.id, -1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50">
                                        <Minus size={14} />
                                    </button>
                                    <span className="font-sans font-black text-base w-5 text-center">
                                        {selectedAddonQuantities[addon.id] || 0}
                                    </span>
                                    <button onClick={() => updateAddonQty(addon.id, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-50">
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <PrimaryButton
                            className="flex-1 justify-center py-3 rounded-2xl bg-purple-600 hover:bg-purple-700"
                            onClick={saveAddons}
                        >
                            حفظ الإضافات
                        </PrimaryButton>
                        <SecondaryButton className="rounded-2xl px-5" onClick={() => setIsAddonModalOpen(false)}>
                            إلغاء
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* ─── Mobile Bottom Bar ─── */}
            <button
                onClick={() => setCartOpen(true)}
                className="lg:hidden fixed bottom-4 left-4 right-4 z-40"
            >
                <div className="bg-[#6f272a] text-white p-4 rounded-2xl shadow-xl flex justify-between items-center border border-white/20">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#ee1d23] p-2 rounded-xl">
                            <ShoppingCart size={18} />
                        </div>
                        <span className="font-black text-sm">الطلب ({activeOrder?.items?.length || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black font-sans">
                            {activeOrder?.total_amount || '0.00'} {currency}
                        </span>
                        <ChevronUp size={18} className="opacity-70" />
                    </div>
                </div>
            </button>

            {/* ─── Mobile Cart Drawer ─── */}
            <AnimatePresence>
                {cartOpen && (
                    <div className="lg:hidden">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setCartOpen(false)}
                            className="fixed inset-0 bg-black/60 z-40"
                        />

                        {/* Drawer panel */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl flex flex-col max-h-[85vh]"
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-gray-200 rounded-full" />
                            </div>

                            {/* Drawer header */}
                            <div className="px-5 py-3 border-b flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="text-[#6f272a]" size={18} />
                                    <h3 className="font-black text-gray-800">تفاصيل الطلب</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-[#ee1d23] text-white text-[10px] font-black px-2 py-1 rounded-full">
                                        {activeOrder?.items?.length || 0} أصناف
                                    </span>
                                    <button
                                        onClick={() => setCartOpen(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Items list */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {activeOrder?.items?.map((item) => (
                                    <OrderItemRow
                                        key={item.id}
                                        item={item}
                                        order={activeOrder}
                                        currency={currency}
                                        onAddon={() => { setCartOpen(false); openAddonModal(item); }}
                                    />
                                ))}

                                {(!activeOrder || !hasItems) && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <ShoppingCart size={40} className="text-gray-200 mb-3" />
                                        <p className="font-black text-gray-400 text-sm">السلة فارغة</p>
                                        <p className="text-xs mt-1 font-bold text-gray-300">ابدأ بإضافة أصناف من القائمة</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer actions */}
                            <div className="p-5 bg-white border-t space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-bold text-sm">المجموع الإجمالي</span>
                                    <span className="text-2xl font-black font-sans text-[#6f272a]">
                                        {activeOrder?.total_amount || '0.00'} <span className="text-xs font-bold">{currency}</span>
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => hasItems && sendToKitchen(route('orders.complete', activeOrder.id))}
                                        disabled={!hasItems || sending}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95
                                            ${hasItems
                                                ? 'bg-[#ee1d23] text-white hover:bg-[#c4181d]'
                                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                            }`}
                                    >
                                        <Send size={16} />
                                        للمطبخ
                                    </button>

                                    {hasItems ? (
                                        <Link
                                            href={route('pos.checkout', activeOrder.id)}
                                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-gray-900 text-white hover:bg-[#6f272a] transition-colors shadow-sm active:scale-95"
                                        >
                                            <CreditCard size={16} />
                                            محاسبة
                                        </Link>
                                    ) : (
                                        <span className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm bg-gray-100 text-gray-300 cursor-not-allowed">
                                            <CreditCard size={16} />
                                            محاسبة
                                        </span>
                                    )}
                                </div>

                                {/* Free Table */}
                                {canFreeTable && (
                                    <button
                                        onClick={handleFreeTable}
                                        disabled={freeingTable}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-black text-sm border-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                                    >
                                        <ArrowRight size={15} />
                                        {freeingTable ? 'جارٍ التحرير...' : 'تحرير الطاولة — الزبون عند الكاشير'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Order Item Row ── */
function OrderItemRow({ item, order, currency, onAddon }) {
    return (
        <div className="flex flex-col bg-white p-3 rounded-2xl border border-gray-100 shadow-sm relative group">
            <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <Utensils size={18} className="text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <h5 className="text-sm font-black text-gray-800 truncate">{item.name ?? item.menu_item?.name ?? '[صنف محذوف]'}</h5>
                            <button
                                onClick={onAddon}
                                className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors shrink-0"
                                title="إضافات"
                            >
                                <Sparkles size={14} />
                            </button>
                        </div>
                        <span className="text-xs font-sans font-bold text-[#6f272a] shrink-0 mr-1">
                            {item.price} {currency}
                        </span>
                    </div>

                    <div className="flex justify-between items-center mt-2 mb-1">
                        <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg">
                            <button
                                onClick={() => router.delete(route('orders.remove-item', { order: order.id, item: item.id }))}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-white hover:text-red-500 transition-all font-bold opacity-0 group-hover:opacity-100"
                            >
                                <X size={12} />
                            </button>
                            <button
                                onClick={() => router.put(route('orders.update-item', { order: order.id, item: item.id }), { quantity: item.quantity - 1, notes: item.notes })}
                                disabled={item.quantity <= 1}
                                className="w-6 h-6 rounded shadow-sm flex items-center justify-center text-gray-600 bg-white hover:bg-gray-100 disabled:opacity-50"
                            >
                                <Minus size={12} />
                            </button>
                            <span className="text-xs font-black font-sans px-1">{item.quantity}</span>
                            <button
                                onClick={() => router.put(route('orders.update-item', { order: order.id, item: item.id }), { quantity: item.quantity + 1, notes: item.notes })}
                                className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center text-[#ee1d23] hover:bg-red-50"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                        <span className="text-xs font-sans font-black text-gray-400">
                            {(item.price * item.quantity).toFixed(2)}
                        </span>
                    </div>

                    {/* Addons */}
                    {item.addons?.length > 0 && (
                        <div className="mb-1.5 space-y-0.5">
                            {item.addons.map((rel) => (
                                <div key={rel.id} className="flex justify-between items-center text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                                    <div className="flex items-center gap-1">
                                        <span>{rel.quantity}x</span>
                                        <span>{rel.name ?? rel.menu_item?.name ?? '[إضافة محذوفة]'}</span>
                                    </div>
                                    <span className="font-sans">{(rel.price * rel.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="relative">
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                            <Info size={11} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            defaultValue={item.notes || ''}
                            placeholder="ملاحظات (مثال: بدون طماطم)"
                            onBlur={(e) => {
                                if (e.target.value !== (item.notes || '')) {
                                    router.put(
                                        route('orders.update-item', { order: order.id, item: item.id }),
                                        { quantity: item.quantity, notes: e.target.value },
                                        { preserveScroll: true }
                                    );
                                }
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                            className="w-full text-xs bg-gray-50 border-gray-100 focus:border-red-300 focus:ring-red-100 rounded-lg pr-6 py-1 text-gray-600 placeholder-gray-400 font-bold"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
