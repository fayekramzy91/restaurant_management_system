import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { ChevronRight, ShoppingCart, Utensils, Info, Plus, Minus, Send, X, ArrowRight, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function TableOrder({ table, categories, activeOrder, addons }) {
    const { settings } = usePage().props;
    const currency = settings?.currency || 'SAR';
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Addon Modal States
    const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
    const [editingCartItem, setEditingCartItem] = useState(null); // The OrderItem being edited
    const [selectedAddonQuantities, setSelectedAddonQuantities] = useState({}); // { addon_id: quantity }

    const { post: completeOrder, processing: completing } = useForm();

    const filteredItems = useMemo(() => {
        const category = categories.find(c => c.id === selectedCategory);
        if (!category) return [];
        return category.menu_items.filter(item => 
            item.name.includes(searchTerm) || (item.description && item.description.includes(searchTerm))
        );
    }, [selectedCategory, categories, searchTerm]);

    const handleAddItem = (itemId) => {
        if (!activeOrder) {
            router.post(route('orders.store'), {
                table_id: table.id,
                type: 'dine_in',
                menu_item_id: itemId,
                quantity: 1
            });
        } else {
            router.post(route('orders.add-item', activeOrder.id), {
                menu_item_id: itemId,
                quantity: 1
            });
        }
    };

    const openAddonModal = (cartItem) => {
        setEditingCartItem(cartItem);
        
        // Initialize quantities from existing addons
        const initialQuantities = {};
        addons.forEach(a => initialQuantities[a.id] = 0);
        cartItem.addons.forEach(addonRelation => {
            initialQuantities[addonRelation.menu_item_id] = addonRelation.quantity;
        });
        
        setSelectedAddonQuantities(initialQuantities);
        setIsAddonModalOpen(true);
    };

    const updateAddonQuantity = (addonId, delta) => {
        setSelectedAddonQuantities(prev => ({
            ...prev,
            [addonId]: Math.max(0, (prev[addonId] || 0) + delta)
        }));
    };

    const saveAddons = () => {
        const addonData = Object.entries(selectedAddonQuantities)
            .filter(([id, qty]) => qty > 0)
            .map(([id, qty]) => ({
                menu_item_id: id,
                quantity: qty
            }));

        router.put(route('orders.update-item-addons', { order: activeOrder.id, item: editingCartItem.id }), {
            addons: addonData
        }, {
            onSuccess: () => setIsAddonModalOpen(false)
        });
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col font- Cairo overflow-hidden" dir="rtl">
            <Head title={`طاولة ${table.name} - طلب جديد`} />

            {/* Header */}
            <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <Link href={route('waiter.index')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ArrowRight size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-800">طاولة {table.name}</h1>
                        <p className="text-xs text-gray-400 font-bold">{table.area?.name}</p>
                    </div>
                </div>

                {activeOrder && (
                    <div className="bg-green-50 px-4 py-2 rounded-full border border-green-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-green-700">طلب نشط #{activeOrder.id}</span>
                    </div>
                )}
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Categories Sidebar */}
                <aside className="w-24 md:w-32 bg-white border-l flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide py-4 gap-2 z-20">
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
                            <div className={`p-3 rounded-2xl mb-2 transition-all ${
                                selectedCategory === category.id ? 'bg-red-50 shadow-sm' : 'bg-gray-50'
                            }`}>
                                <Utensils size={24} />
                            </div>
                            <span className="text-[11px] font-bold text-center leading-tight">{category.name}</span>
                            {selectedCategory === category.id && (
                                <motion.div layoutId="activeCat" className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-[#ee1d23] rounded-l-full" />
                            )}
                        </button>
                    ))}
                </aside>

                {/* Items Grid */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.map((item) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={item.id}
                                    onClick={() => handleAddItem(item.id)}
                                    className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden active:scale-95"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300">
                                            {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-2xl" /> : <Utensils size={32} />}
                                        </div>
                                        <div className="text-left font-sans font-black text-[#6f272a] text-lg">
                                            {item.price} <span className="text-[10px] opacity-60">{currency}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-800 text-base leading-tight group-hover:text-[#ee1d23] transition-colors">{item.name}</h4>
                                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 h-8 font-bold">{item.description || 'لا يوجد وصف متاح لهذا الصنف'}</p>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="text-[10px] font-bold text-gray-400">
                                            {item.status === 'available' ? (
                                                <span className="text-green-500">متوفر</span>
                                            ) : (
                                                <span className="text-red-400">نفذ</span>
                                            )}
                                        </div>
                                        <div className="bg-red-50 p-2 rounded-xl text-[#ee1d23] group-hover:bg-[#ee1d23] group-hover:text-white transition-colors">
                                            <Plus size={18} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </main>

                {/* Sidebar Order Summary */}
                <aside className="hidden lg:flex w-80 md:w-96 bg-white border-r flex-col z-30 shadow-2xl">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="text-[#6f272a]" size={20} />
                            <h3 className="font-black text-gray-800">تفاصيل الطلب</h3>
                        </div>
                        <span className="bg-[#ee1d23] text-white text-[10px] font-black px-2 py-1 rounded-full">
                            {activeOrder?.items?.length || 0} أصناف
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeOrder?.items?.map((item) => (
                            <div key={item.id} className="flex flex-col bg-white p-3 rounded-2xl border border-gray-100 shadow-sm relative group">
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                        <Utensils size={20} className="text-gray-300" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <h5 className="text-sm font-black text-gray-800">{item.name ?? item.menu_item?.name ?? '[صنف محذوف]'}</h5>
                                                {/* Addons Button */}
                                                <button 
                                                    onClick={() => openAddonModal(item)}
                                                    className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                    title="إضافة إضافات"
                                                >
                                                    <Sparkles size={16} />
                                                </button>
                                            </div>
                                            <span className="text-xs font-sans font-bold text-[#6f272a]">{item.price} {currency}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 mb-2">
                                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
                                                <button onClick={() => router.delete(route('orders.remove-item', {order: activeOrder.id, item: item.id}))} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-white hover:text-red-500 transition-all font-bold opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                                <button onClick={() => router.put(route('orders.update-item', {order: activeOrder.id, item: item.id}), {quantity: item.quantity - 1, notes: item.notes})} disabled={item.quantity <= 1} className="w-6 h-6 rounded shadow-sm flex items-center justify-center text-gray-600 font-bold bg-white hover:bg-gray-100 disabled:opacity-50"><Minus size={14} /></button>
                                                <span className="text-xs font-black font-sans px-1">{item.quantity}</span>
                                                <button onClick={() => router.put(route('orders.update-item', {order: activeOrder.id, item: item.id}), {quantity: item.quantity + 1, notes: item.notes})} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center text-[#ee1d23] font-bold hover:bg-red-50"><Plus size={14} /></button>
                                            </div>
                                            <div className="text-xs font-sans font-black text-gray-400">
                                                {(item.price * item.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                        
                                        {/* Display Selected Addons */}
                                        {item.addons && item.addons.length > 0 && (
                                            <div className="mb-2 space-y-1">
                                                {item.addons.map((addonRelation) => (
                                                    <div key={addonRelation.id} className="flex justify-between items-center text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                                                        <div className="flex items-center gap-1">
                                                            <span>{addonRelation.quantity}x</span>
                                                            <span>{addonRelation.name ?? addonRelation.menu_item?.name ?? '[إضافة محذوفة]'}</span>
                                                        </div>
                                                        <span className="font-sans">{(addonRelation.price * addonRelation.quantity).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                                <Info size={12} className="text-gray-400" />
                                            </div>
                                            <input 
                                                type="text" 
                                                defaultValue={item.notes || ''}
                                                placeholder="ملاحظات (مثال: بدون طماطم)"
                                                onBlur={(e) => {
                                                    if (e.target.value !== (item.notes || '')) {
                                                        router.put(route('orders.update-item', {order: activeOrder.id, item: item.id}), {
                                                            quantity: item.quantity, 
                                                            notes: e.target.value
                                                        }, { preserveScroll: true });
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.target.blur();
                                                    }
                                                }}
                                                className="w-full text-xs bg-gray-50 border-gray-100 focus:border-red-300 focus:ring-red-100 rounded-lg pr-7 py-1 text-gray-600 placeholder-gray-400 font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!activeOrder && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20 px-8 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <ShoppingCart size={40} className="opacity-20" />
                                </div>
                                <p className="font-black text-gray-400">السلة فارغة</p>
                                <p className="text-[11px] mt-1 font-bold">ابدأ بإضافة الأصناف من القائمة لبدء الطلب</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-white border-t space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold">المجموع الإجمالي</span>
                            <span className="text-2xl font-black font-sans text-[#6f272a]">{activeOrder?.total_amount || '0.00'} <span className="text-xs font-bold">{currency}</span></span>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => activeOrder && completeOrder(route('orders.complete', activeOrder.id))}
                                disabled={!activeOrder || completing}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95
                                    ${activeOrder ? 'bg-[#ee1d23] text-white hover:bg-[#c4181d]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
                                `}
                            >
                                <Send size={20} />
                                إرسال للمطبخ
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
            
            {/* Addon Modal */}
            <Modal show={isAddonModalOpen} onClose={() => setIsAddonModalOpen(false)} maxWidth="md">
                <div className="p-6 text-right">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-black text-gray-800">إضافات: {editingCartItem?.name ?? editingCartItem?.menu_item?.name}</h2>
                        <button onClick={() => setIsAddonModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex items-center gap-3 border border-blue-100">
                        <Info className="text-blue-500" size={20} />
                        <p className="text-xs text-blue-700 font-bold">يمكنك تحديد عدد الإضافات بشكل منفصل (مثلاً: 1 زيادة جبنة لـ 4 بيتزا).</p>
                    </div>

                    <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto px-1">
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
                                    <div className="font-bold text-gray-800">{addon.name}</div>
                                    <div className="text-xs text-purple-600 font-black font-sans">+{addon.price} {currency}</div>
                                </div>
                                
                                <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border">
                                    <button 
                                        onClick={() => updateAddonQuantity(addon.id, -1)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="font-sans font-black text-lg w-6 text-center">
                                        {selectedAddonQuantities[addon.id] || 0}
                                    </span>
                                    <button 
                                        onClick={() => updateAddonQuantity(addon.id, 1)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-50"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <PrimaryButton 
                            className="flex-1 justify-center py-4 rounded-2xl bg-purple-600 hover:bg-purple-700" 
                            onClick={saveAddons}
                        >
                            حفظ الإضافات
                        </PrimaryButton>
                        <SecondaryButton 
                            className="rounded-2xl px-6" 
                            onClick={() => setIsAddonModalOpen(false)}
                        >
                            إلغاء
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Mobile Order Bar Button */}
            <div className="lg:hidden absolute bottom-4 left-4 right-4 z-40">
                <button className="w-full bg-[#6f272a] text-white p-4 rounded-2xl shadow-xl flex justify-between items-center border border-white/20">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#ee1d23] p-2 rounded-xl">
                            <ShoppingCart size={20} />
                        </div>
                        <span className="font-black">عرض الطلب ({activeOrder?.items?.length || 0})</span>
                    </div>
                    <span className="text-xl font-black font-sans">{activeOrder?.total_amount || '0.00'} {currency}</span>
                </button>
            </div>
        </div>
    );
}
