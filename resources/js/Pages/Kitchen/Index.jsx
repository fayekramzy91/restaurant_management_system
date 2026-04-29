import { Head, useForm } from '@inertiajs/react';
import { ChefHat, Clock, CheckCircle2, AlertCircle, Utensils, Plus, ClipboardList, Timer, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';

/* ── Live countdown timer ───────────────────────── */
function OrderTimer({ preparingStartedAt, maxDurationMinutes }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!preparingStartedAt || !maxDurationMinutes) return;
        const tick = () => {
            const diff = Math.floor((Date.now() - new Date(preparingStartedAt).getTime()) / 1000);
            setElapsed(diff);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [preparingStartedAt, maxDurationMinutes]);

    if (!maxDurationMinutes) return null;

    const total    = maxDurationMinutes * 60;
    const remaining = total - elapsed;
    const overtime  = remaining < 0;
    const pct       = Math.min(100, (elapsed / total) * 100);
    const abs       = Math.abs(remaining);
    const mm        = String(Math.floor(abs / 60)).padStart(2, '0');
    const ss        = String(abs % 60).padStart(2, '0');
    const label     = `${overtime ? '+' : ''}${mm}:${ss}`;

    const color = overtime || pct >= 100
        ? 'text-red-400 border-red-500/40 bg-red-900/20'
        : pct >= 75
            ? 'text-orange-400 border-orange-500/40 bg-orange-900/20'
            : 'text-emerald-400 border-emerald-500/40 bg-emerald-900/20';

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-sm font-black font-sans ${color}`}>
            <Timer size={13} />
            {overtime && <span className="text-[10px] font-black uppercase">تأخر</span>}
            {label}
        </div>
    );
}

/* ── Live wall clock ────────────────────────────── */
function WallClock() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const date = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="flex flex-col items-end bg-gray-800/50 px-6 py-3 rounded-2xl border border-gray-700">
            <span className="text-3xl font-black font-sans tracking-widest text-white tabular-nums">{time}</span>
            <span className="text-[11px] font-bold text-gray-500 mt-0.5">{date}</span>
        </div>
    );
}

export default function Index({ orders }) {
    const { post, processing } = useForm();

    const startPreparing = (orderId) => post(route('kitchen.start', orderId));
    const markReady      = (orderId) => post(route('kitchen.ready', orderId));

    /* ── New vs active counts for header ── */
    const newCount    = orders.filter(o => !o.preparing_started_at).length;
    const activeCount = orders.filter(o =>  o.preparing_started_at).length;

    const summary = useMemo(() => {
        const itemTotals  = {};
        const addonTotals = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const n = item.menu_item?.name;
                if (n) itemTotals[n] = (itemTotals[n] || 0) + item.quantity;
                item.addons?.forEach(addon => {
                    const an = addon.menu_item?.name;
                    if (an) addonTotals[an] = (addonTotals[an] || 0) + addon.quantity;
                });
            });
        });
        return { items: itemTotals, addons: addonTotals };
    }, [orders]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-Cairo flex flex-col" dir="rtl">
            <Head title="شاشة المطبخ (KDS)" />

            {/* ── Header ── */}
            <header className="bg-gray-900 border-b border-gray-800 px-8 py-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-[#ee1d23] p-3 rounded-2xl shadow-lg shadow-red-900/20">
                        <ChefHat size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black">شاشة المطبخ</h1>
                        <p className="text-gray-500 font-bold">متابعة تحضير الطلبات في الوقت الفعلي</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* New orders badge */}
                    {newCount > 0 && (
                        <div className="flex items-center gap-3 bg-red-900/30 px-6 py-3 rounded-2xl border border-red-700/50 animate-pulse">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-red-400 uppercase">طلبات جديدة</span>
                                <span className="text-2xl font-black text-white font-sans">{newCount}</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-red-600/30 flex items-center justify-center">
                                <PlayCircle size={20} className="text-red-400" />
                            </div>
                        </div>
                    )}

                    {/* Active (preparing) counter */}
                    <div className="flex items-center gap-3 bg-gray-800/50 px-6 py-3 rounded-2xl border border-gray-700">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-500 uppercase">قيد التحضير</span>
                            <span className="text-2xl font-black text-white font-sans">{activeCount}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 flex items-center justify-center animate-spin-slow">
                            <Clock size={18} className="text-blue-400" />
                        </div>
                    </div>

                    <WallClock />
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* ── Right sidebar: summary ── */}
                <aside className="w-72 md:w-80 bg-gray-800/30 border-l border-gray-800 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex items-center gap-2 bg-gray-800/50">
                        <ClipboardList className="text-[#ee1d23]" size={20} />
                        <h3 className="font-black text-lg">ملخص التجهيز</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        <div>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <div className="w-1 h-3 bg-red-500 rounded-full" />
                                الأصناف الرئيسية
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(summary.items).length > 0 ? (
                                    Object.entries(summary.items).map(([name, qty]) => (
                                        <div key={name} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                                            <span className="font-bold text-gray-200">{name}</span>
                                            <span className="bg-white text-gray-900 font-black font-sans px-3 py-1 rounded-lg text-lg">{qty}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-600 italic">لا توجد أصناف حالياً</p>
                                )}
                            </div>
                        </div>

                        {Object.entries(summary.addons).length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                    الإضافات المطلوبة
                                </h4>
                                <div className="space-y-2">
                                    {Object.entries(summary.addons).map(([name, qty]) => (
                                        <div key={name} className="flex justify-between items-center p-3 bg-blue-900/10 rounded-xl border border-blue-900/20 text-blue-400">
                                            <span className="font-bold text-sm">{name}</span>
                                            <span className="bg-blue-500 text-white font-black font-sans px-2 py-0.5 rounded text-base">{qty}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-900/50 border-t border-gray-800 text-center">
                        <p className="text-[10px] font-bold text-gray-600">يتم التحديث تلقائياً عند إضافة طلبات جديدة</p>
                    </div>
                </aside>

                {/* ── Orders grid ── */}
                <main className="flex-1 bg-gray-950 p-8 overflow-y-auto custom-scrollbar grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 content-start">
                    <AnimatePresence mode="popLayout">
                        {orders.map((order, index) => {
                            const isNew    = !order.preparing_started_at;
                            const maxDur   = Math.max(0, ...order.items.map(i => i.menu_item?.preparing_duration || 0));

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`w-full rounded-[2.5rem] flex flex-col shadow-2xl relative overflow-hidden h-fit border-2 bg-gray-900 ${
                                        isNew ? 'border-red-800/60' : 'border-blue-900/40'
                                    }`}
                                >
                                    {/* Status banner */}
                                    <div className={`py-3 px-6 text-center font-black text-xs uppercase tracking-widest ${
                                        isNew ? 'bg-[#ee1d23]' : 'bg-blue-700'
                                    }`}>
                                        {isNew ? '🔔 طلب جديد' : '👨‍🍳 قيد التحضير'}
                                    </div>

                                    <div className="p-6 flex flex-col">
                                        {/* Order meta */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-2xl font-black text-white mb-1">
                                                    {order.type === 'dine_in' ? `طاولة ${order.table?.name}` : 'طلب خارجي'}
                                                </h3>
                                                <div className="flex items-center gap-2 text-gray-500 font-bold text-xs">
                                                    <Clock size={14} />
                                                    <span>{new Date(order.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-4xl font-black text-gray-800 font-sans leading-none">#{order.id}</div>
                                                {/* Timer only when actively preparing */}
                                                {!isNew && maxDur > 0 && (
                                                    <OrderTimer
                                                        preparingStartedAt={order.preparing_started_at}
                                                        maxDurationMinutes={maxDur}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Items list */}
                                        <div className="space-y-3 mb-6 overflow-y-auto max-h-[50vh] pr-1 custom-scrollbar">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="bg-gray-800/50 p-4 rounded-3xl border border-gray-700/50">
                                                    <div className="flex gap-3">
                                                        <span className="w-10 h-10 rounded-xl bg-[#feca0b] flex items-center justify-center font-black text-xl text-gray-900 font-sans shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className="text-lg font-black text-gray-100">{item.menu_item?.name}</h4>
                                                                {item.menu_item?.preparing_duration && (
                                                                    <span className="flex items-center gap-1 text-[11px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg border border-blue-400/20 shrink-0">
                                                                        <Clock size={10} />
                                                                        {item.menu_item.preparing_duration} د
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {item.addons?.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {item.addons.map((addon) => (
                                                                        <div key={addon.id} className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-blue-400/20">
                                                                            <Plus size={10} />
                                                                            <span>{addon.quantity}x {addon.menu_item?.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {item.notes && (
                                                                <div className="mt-3 flex items-start gap-1 text-yellow-500 bg-yellow-500/10 p-2 rounded-xl text-[11px] font-bold border border-yellow-500/20">
                                                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                                    <p className="leading-relaxed">{item.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action button — changes based on state */}
                                        {isNew ? (
                                            <button
                                                onClick={() => startPreparing(order.id)}
                                                disabled={processing}
                                                className="w-full py-5 rounded-3xl bg-[#ee1d23] text-white font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-red-900/20 transition-all hover:bg-[#c4181d] active:scale-95 disabled:opacity-50"
                                            >
                                                <PlayCircle size={24} />
                                                بدء التحضير
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => markReady(order.id)}
                                                disabled={processing}
                                                className="w-full py-5 rounded-3xl bg-white text-gray-900 font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-white/5 transition-all hover:bg-green-500 hover:text-white active:scale-95 disabled:opacity-50"
                                            >
                                                <CheckCircle2 size={24} />
                                                تم التجهيز
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {orders.length === 0 && (
                        <div className="col-span-full min-h-[60vh] flex flex-col items-center justify-center text-gray-800 border-4 border-dashed border-gray-900 rounded-[3rem]">
                            <ChefHat size={96} className="mb-6 opacity-5" />
                            <h2 className="text-3xl font-black opacity-10">لا توجد طلبات نشطة</h2>
                            <p className="font-bold opacity-5 mt-2">المطبخ هادئ الآن...</p>
                        </div>
                    )}
                </main>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .animate-spin-slow { animation: spin 3s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d2d2d; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3d3d3d; }
            `}} />
        </div>
    );
}
