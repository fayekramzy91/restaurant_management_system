import { Head, Link, usePage, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import {
    CreditCard, Banknote, Printer, CheckCircle2, ArrowRight,
    ReceiptText, Percent, Info, Plus, User, Phone, MapPin,
    Wallet, Search, X, UserPlus, ChevronDown,
} from 'lucide-react';

/* ── CSRF token helper for fetch() ── */
const csrfToken = () =>
    decodeURIComponent(
        document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
    );

export default function Checkout({ order, payment_methods }) {
    const { settings } = usePage().props;
    const currency     = settings?.currency    || 'SAR';
    const restaurantName = settings?.restaurant_name || 'المطعم';

    /* ── Invoice (existing, for re-checkout) ── */
    const existingInvoice = order.invoice ?? null;

    const displayTaxBreakdown = settings?.['tax.display_breakdown'] !== '0';

    /* ── Payment state ── */
    const [shouldPrint,   setShouldPrint]   = useState(true);
    const [discount,      setDiscount]      = useState(existingInvoice?.discount ?? order.discount ?? 0);
    const [payments,      setPayments]      = useState({});
    const [notes,         setNotes]         = useState(order.notes         || '');
    const [privateNotes,  setPrivateNotes]  = useState(order.private_notes || '');
    const [processing,    setProcessing]    = useState(false);
    const [taxPreview,    setTaxPreview]    = useState(null);

    /* ── Customer state ── */
    const [customer,        setCustomer]        = useState(order.customer ?? null);
    const [search,          setSearch]          = useState('');
    const [searchResults,   setSearchResults]   = useState([]);
    const [searchLoading,   setSearchLoading]   = useState(false);
    const [showDropdown,    setShowDropdown]     = useState(false);
    const [showNewForm,     setShowNewForm]      = useState(false);
    const [newCustomer,     setNewCustomer]      = useState({ name: '', phone: '', email: '', address: '' });
    const [savingCustomer,  setSavingCustomer]   = useState(false);

    /* ── Wallet state ── */
    const [walletAmount,   setWalletAmount]   = useState(0);
    const [creditSurplus,  setCreditSurplus]  = useState(true);

    const searchRef = useRef(null);

    /* ── Initialise default payment ── */
    const totalWithDiscount = Math.max(0, order.total_amount - discount);

    const alreadyPaid = existingInvoice
        ? (existingInvoice.payment_entries ?? [])
            .filter(e => e.type === 'payment')
            .reduce((sum, e) => sum + Number(e.amount), 0)
            + Number(existingInvoice.wallet_amount || 0)
        : 0;

    const remainingToPay = Math.max(0, totalWithDiscount - alreadyPaid);

    useEffect(() => {
        if (payment_methods?.length > 0 && Object.keys(payments).length === 0) {
            const def = payment_methods.find(m => m.is_system) || payment_methods[0];
            if (def) setPayments({ [def.id]: remainingToPay });
        }
    }, []);

    useEffect(() => {
        const paid = Object.values(payments).reduce((s, v) => s + (v || 0), 0);
        if (paid > remainingToPay && Object.keys(payments).length === 1) {
            const id = Object.keys(payments)[0];
            setPayments({ [id]: remainingToPay });
        }
    }, [remainingToPay]);

    /* ── Tax preview — fetch on mount and whenever discount changes ── */
    useEffect(() => {
        const t = setTimeout(async () => {
            try {
                const res = await fetch(route('pos.tax-preview'), {
                    method:  'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': csrfToken(),
                        'Accept':       'application/json',
                    },
                    body: JSON.stringify({ order_id: order.id, discount }),
                });
                if (res.ok) setTaxPreview(await res.json());
            } catch { /* silent — receipt falls back to order totals */ }
        }, 500);
        return () => clearTimeout(t);
    }, [discount]);

    /* ── Customer search ── */
    useEffect(() => {
        if (search.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
        const t = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`/pos/customers/search?q=${encodeURIComponent(search)}`);
                const data = await res.json();
                setSearchResults(data);
                setShowDropdown(true);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const selectCustomer = (c) => {
        setCustomer(c);
        setSearch('');
        setShowDropdown(false);
        setWalletAmount(0);
    };

    const createCustomer = async () => {
        if (!newCustomer.name.trim()) return;
        setSavingCustomer(true);
        try {
            const res = await fetch('/pos/customers', {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'X-XSRF-TOKEN':  csrfToken(),
                    'Accept':        'application/json',
                },
                body: JSON.stringify(newCustomer),
            });
            const data = await res.json();
            selectCustomer(data);
            setShowNewForm(false);
            setNewCustomer({ name: '', phone: '', email: '', address: '' });
        } finally {
            setSavingCustomer(false);
        }
    };

    /* ── Payment calculations ── */
    const handlePaymentChange = (id, value) =>
        setPayments(prev => ({ ...prev, [id]: Number(value) }));

    const totalPaid      = Object.values(payments).reduce((s, v) => s + (v || 0), 0);
    const walletUsable   = Math.min(walletAmount, customer?.wallet_balance ?? 0);
    const effectivePaid  = totalPaid + walletUsable;
    const remaining      = Math.max(0, remainingToPay - effectivePaid);
    const surplus        = Math.max(0, effectivePaid - remainingToPay);

    /* ── Print ── */
    const handlePrint = () => {
        const content = document.getElementById('printable-receipt').innerHTML;
        const w = window.open('', '', 'height=600,width=400');
        w.document.write(`<html><head><title>فاتورة</title>
            <style>@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap");
            body{font-family:"Cairo",sans-serif;direction:rtl;}</style>
            <script src="https://cdn.tailwindcss.com"></script></head><body>`);
        w.document.write(content);
        w.document.write('</body></html>');
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 500);
    };

    /* ── Submit ── */
    const submit = () => {
        if (remaining > 0) {
            if (!confirm(`المبلغ المتبقي ${remaining.toFixed(2)} ${currency}. هل أنت متأكد؟`)) return;
        }
        setProcessing(true);

        const paymentArray = Object.entries(payments)
            .map(([id, amount]) => ({ payment_method_id: id, amount: amount || 0 }))
            .filter(p => p.amount > 0);

        const payload = {
            payments:       paymentArray,
            discount,
            wallet_amount:  walletUsable,
            credit_surplus: creditSurplus,
            notes,
            private_notes:  privateNotes,
        };

        if (customer?.id) {
            payload.customer_id = customer.id;
        }

        router.post(route('pos.process-payment', order.id), payload, {
            onSuccess: () => { if (shouldPrint) handlePrint(); },
            onFinish:  () => setProcessing(false),
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-Cairo" dir="rtl">
            <Head title="إتمام الدفع" />

            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href={route('pos.index')} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all">
                        <ArrowRight size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight">إتمام الدفع</h1>
                        <p className="text-gray-500 text-sm font-bold">طلب رقم #{order.id}</p>
                    </div>
                </div>
                <div className="bg-red-50 text-[#ee1d23] px-4 py-2 rounded-xl font-black flex items-center gap-2 border border-red-100 shadow-sm">
                    <ReceiptText size={20} />
                    {alreadyPaid > 0 ? (
                        <span>
                            متبقي: {remainingToPay.toFixed(2)} {currency}
                            <span className="text-xs font-bold text-red-300 mr-1">/ {totalWithDiscount.toFixed(2)}</span>
                        </span>
                    ) : (
                        <span>{totalWithDiscount.toFixed(2)} {currency}</span>
                    )}
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ── Left column ── */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Customer */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                            <User className="text-violet-500" size={20} />
                            العميل
                        </h3>

                        {/* Selected customer card */}
                        {customer ? (
                            <div className="flex items-start justify-between p-4 bg-violet-50 border border-violet-100 rounded-2xl mb-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-black shrink-0">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-800">{customer.name}</p>
                                        {customer.phone && (
                                            <p className="text-xs text-gray-500 font-bold flex items-center gap-1 mt-0.5">
                                                <Phone size={11} /> {customer.phone}
                                            </p>
                                        )}
                                        {customer.address && (
                                            <p className="text-xs text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                                                <MapPin size={11} /> {customer.address}
                                            </p>
                                        )}
                                        {Number(customer.wallet_balance) > 0 && (
                                            <p className="text-xs text-emerald-600 font-black flex items-center gap-1 mt-1">
                                                <Wallet size={11} />
                                                رصيد المحفظة: {Number(customer.wallet_balance).toFixed(2)} {currency}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => { setCustomer(null); setWalletAmount(0); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <X size={15} />
                                </button>
                            </div>
                        ) : (
                            /* Search field */
                            <div className="relative mb-3" ref={searchRef}>
                                <Search size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                                    className="w-full bg-gray-50 border-0 rounded-2xl p-4 pr-11 font-bold focus:ring-2 focus:ring-violet-400 text-sm"
                                />
                                {searchLoading && (
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">جاري البحث...</span>
                                )}

                                {/* Dropdown results */}
                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                                        {searchResults.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => selectCustomer(c)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors text-right border-b border-gray-50 last:border-0"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-gray-800 text-sm">{c.name}</p>
                                                    {c.phone && <p className="text-xs text-gray-400 font-bold">{c.phone}</p>}
                                                </div>
                                                {Number(c.wallet_balance) > 0 && (
                                                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1 shrink-0">
                                                        <Wallet size={11} /> {Number(c.wallet_balance).toFixed(2)}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {showDropdown && searchResults.length === 0 && !searchLoading && search.length >= 2 && (
                                    <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 px-4 py-3 text-sm text-gray-400 font-bold">
                                        لا توجد نتائج
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New customer form toggle */}
                        {!customer && (
                            <button
                                onClick={() => setShowNewForm(v => !v)}
                                className="flex items-center gap-2 text-sm font-black text-violet-600 hover:text-violet-800 transition-colors"
                            >
                                <UserPlus size={15} />
                                {showNewForm ? 'إلغاء' : 'إنشاء عميل جديد'}
                                <ChevronDown size={13} className={`transition-transform ${showNewForm ? 'rotate-180' : ''}`} />
                            </button>
                        )}

                        {showNewForm && !customer && (
                            <div className="mt-3 p-4 bg-gray-50 rounded-2xl space-y-3 border border-gray-100">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">الاسم *</label>
                                        <input type="text" value={newCustomer.name}
                                            onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-violet-400" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">رقم الهاتف</label>
                                        <input type="text" value={newCustomer.phone}
                                            onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold font-sans focus:ring-2 focus:ring-violet-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">العنوان</label>
                                    <input type="text" value={newCustomer.address}
                                        onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))}
                                        placeholder="للطلبات التوصيل..."
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-violet-400" />
                                </div>
                                <button
                                    onClick={createCustomer}
                                    disabled={!newCustomer.name.trim() || savingCustomer}
                                    className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-black text-sm hover:bg-violet-700 transition-colors disabled:opacity-50"
                                >
                                    {savingCustomer ? 'جاري الحفظ...' : 'حفظ العميل'}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Discount */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                            <Percent className="text-[#ee1d23]" size={20} />
                            الخصم
                        </h3>
                        <div>
                            <label className="text-xs font-bold text-gray-400 block mb-1">قيمة الخصم ({currency})</label>
                            <input type="number" min="0" max={order.total_amount}
                                value={discount}
                                onChange={e => setDiscount(Number(e.target.value))}
                                className="w-full bg-gray-50 border-0 rounded-xl p-4 font-sans font-black focus:ring-2 focus:ring-red-500" />
                        </div>
                    </section>

                    {/* Payment Methods */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">

                        {/* Already-paid entries (re-checkout) */}
                        {existingInvoice?.payment_entries?.length > 0 && (
                            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <p className="text-xs font-black text-emerald-700 mb-3">مدفوعات سابقة على هذه الفاتورة</p>
                                <div className="space-y-1.5">
                                    {existingInvoice.payment_entries.filter(e => e.type === 'payment').map(e => (
                                        <div key={e.id} className="flex justify-between text-sm font-bold text-emerald-700">
                                            <span>{e.payment_method?.name}</span>
                                            <span className="font-sans">{Number(e.amount).toFixed(2)} {currency}</span>
                                        </div>
                                    ))}
                                    {Number(existingInvoice.wallet_amount) > 0 && (
                                        <div className="flex justify-between text-sm font-bold text-emerald-700">
                                            <span>محفظة</span>
                                            <span className="font-sans">{Number(existingInvoice.wallet_amount).toFixed(2)} {currency}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                <Banknote className="text-green-600" size={20} />
                                {existingInvoice ? 'دفعة إضافية' : 'طرق الدفع'}
                            </h3>
                            <div className="text-sm font-bold text-gray-500">
                                المتبقي: <span className={`font-black ${remaining > 0 ? 'text-red-500' : 'text-green-600'}`}>{remaining.toFixed(2)} {currency}</span>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {payment_methods?.map(method => (
                                <div key={method.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${payments[method.id] > 0 ? 'border-[#ee1d23] bg-red-50' : 'border-gray-50 bg-white'}`}>
                                    <div className="flex-1 flex items-center gap-3">
                                        {method.name.includes('بطاقة') || method.name.includes('فيزا') || method.name.includes('مدى') ? (
                                            <CreditCard className={payments[method.id] > 0 ? 'text-[#ee1d23]' : 'text-gray-400'} size={24} />
                                        ) : (
                                            <Banknote className={payments[method.id] > 0 ? 'text-[#ee1d23]' : 'text-gray-400'} size={24} />
                                        )}
                                        <span className="font-black text-gray-800">{method.name}</span>
                                    </div>
                                    <div className="w-32">
                                        <input type="number" min="0"
                                            value={payments[method.id] || ''}
                                            onChange={e => handlePaymentChange(method.id, e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-white border-gray-200 rounded-xl p-3 font-sans font-black text-center focus:ring-2 focus:ring-red-500" />
                                    </div>
                                </div>
                            ))}

                            {/* Auto-fill remaining */}
                            {remaining > 0 && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => {
                                            const id = payment_methods[0]?.id;
                                            handlePaymentChange(id, (payments[id] || 0) + remaining);
                                        }}
                                        className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <Plus size={16} /> استكمال المتبقي
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Wallet payment row */}
                        {customer && Number(customer.wallet_balance) > 0 && (
                            <div className="mt-4 flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50">
                                <div className="flex-1 flex items-center gap-3">
                                    <Wallet className="text-emerald-600" size={22} />
                                    <div>
                                        <p className="font-black text-gray-800">محفظة {customer.name}</p>
                                        <p className="text-xs text-emerald-600 font-bold">
                                            الرصيد المتاح: {Number(customer.wallet_balance).toFixed(2)} {currency}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-32">
                                    <input type="number" min="0" max={customer.wallet_balance}
                                        value={walletAmount || ''}
                                        onChange={e => setWalletAmount(Math.min(Number(e.target.value), customer.wallet_balance))}
                                        placeholder="0.00"
                                        className="w-full bg-white border-emerald-200 rounded-xl p-3 font-sans font-black text-center focus:ring-2 focus:ring-emerald-400" />
                                </div>
                            </div>
                        )}

                        {/* Surplus notice */}
                        {surplus > 0 && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                                <p className="text-sm font-black text-amber-700 mb-2">
                                    فائض المبلغ المستلم: {surplus.toFixed(2)} {currency}
                                </p>
                                {customer ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={creditSurplus} onChange={e => setCreditSurplus(e.target.checked)}
                                            className="rounded border-amber-300 text-amber-500 focus:ring-amber-400 w-4 h-4" />
                                        <span className="text-sm font-bold text-amber-700">
                                            إضافة الفائض لمحفظة {customer.name}
                                        </span>
                                    </label>
                                ) : (
                                    <p className="text-xs font-bold text-amber-600">ارتبط بعميل لإضافة الفائض إلى محفظته</p>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Notes */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                            <Info className="text-blue-500" size={20} />
                            الملاحظات
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">ملاحظات الفاتورة (تطبع للزبون)</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold focus:ring-2 focus:ring-red-500 min-h-[80px]"
                                    placeholder="مثال: خصم خاص للعميل المتميز..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">ملاحظات داخلية (لا تطبع)</label>
                                <textarea value={privateNotes} onChange={e => setPrivateNotes(e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold focus:ring-2 focus:ring-red-500 min-h-[80px]"
                                    placeholder="ملاحظات تظهر فقط في النظام..." />
                            </div>
                        </div>
                    </section>

                    {/* Submit */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-6">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="printOpt" checked={shouldPrint}
                                    onChange={e => setShouldPrint(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-[#ee1d23] focus:ring-[#ee1d23]" />
                                <label htmlFor="printOpt" className="font-black text-gray-700 cursor-pointer">طباعة الفاتورة عند الإتمام</label>
                            </div>
                            <Printer size={20} className={shouldPrint ? 'text-[#ee1d23]' : 'text-gray-300'} />
                        </div>

                        <button onClick={submit} disabled={processing}
                            className={`w-full text-white py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95
                                ${remaining > 0
                                    ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100'
                                    : 'bg-[#ee1d23] hover:bg-[#6f272a] shadow-red-100'
                                }`}
                        >
                            {processing
                                ? 'جاري المعالجة...'
                                : remaining > 0
                                    ? 'تأكيد وحفظ الطلب'
                                    : `تأكيد ودفع ${effectivePaid.toFixed(2)} ${currency}`
                            }
                            <CheckCircle2 size={24} />
                        </button>
                    </section>
                </div>

                {/* ── Receipt preview ── */}
                <div className="lg:col-span-5 bg-gray-100 p-8 rounded-3xl border-4 border-dashed border-gray-200 h-fit sticky top-24">
                    <div className="mb-4 flex items-center justify-between px-2">
                        <h3 className="font-black text-gray-500 uppercase tracking-widest text-xs">معاينة الفاتورة</h3>
                        <button onClick={handlePrint} className="text-xs font-bold text-gray-900 border-b border-gray-900 flex items-center gap-1">
                            <Printer size={12} /> طباعة تجريبية
                        </button>
                    </div>

                    <div id="printable-receipt" className="bg-white shadow-2xl p-8 max-w-[350px] mx-auto min-h-[500px] text-gray-800">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black mb-1">{restaurantName}</h2>
                            <p className="text-[10px] text-gray-500 font-bold">الفرع الرئيسي</p>
                            <div className="border-b-2 border-dashed border-gray-200 py-2">
                                <h4 className="text-sm font-black underline uppercase">فاتورة مبيعات مبسطة</h4>
                            </div>
                        </div>

                        <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span>رقم الطلب:</span><span>#{order.id}</span>
                        </div>
                        {existingInvoice?.invoice_number && (
                            <div className="flex justify-between text-[11px] font-bold mb-1">
                                <span>رقم الفاتورة:</span>
                                <span className="font-mono">{existingInvoice.invoice_number}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span>التاريخ:</span>
                            <span className="font-sans">{new Date().toLocaleString('ar-SA')}</span>
                        </div>
                        {customer && (
                            <div className="flex justify-between text-[11px] font-bold mb-1">
                                <span>العميل:</span><span>{customer.name}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[11px] font-bold border-b pb-4 mb-4">
                            <span>نوع الطلب:</span>
                            <span>
                                {order.type === 'dine_in' ? `طاولة ${order.table?.name}` : order.type === 'delivery' ? 'توصيل' : 'خارجي'}
                            </span>
                        </div>

                        <table className="w-full text-[11px] mb-6">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-right py-2 font-black">الصنف</th>
                                    <th className="text-center py-2 font-black">الكمية</th>
                                    <th className="text-left py-2 font-black">المجموع</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id} className="border-b border-dashed border-gray-100 align-top">
                                        <td className="py-2">
                                            <div className="font-bold">{item.name ?? item.menu_item?.name ?? '[صنف محذوف]'}</div>
                                            {item.addons?.length > 0 && (
                                                <div className="text-[9px] text-gray-500 font-bold mt-0.5">
                                                    {item.addons.map(a => (
                                                        <div key={a.id}>+ {a.quantity}x {a.name ?? a.menu_item?.name ?? '[إضافة محذوفة]'}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2 text-center font-sans font-bold">{item.quantity}</td>
                                        <td className="py-2 text-left font-sans font-bold">
                                            {((Number(item.price) + (item.addons?.reduce((s, a) => s + Number(a.price), 0) ?? 0)) * item.quantity).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="space-y-2 border-t pt-4">
                            <div className="flex justify-between text-sm font-bold opacity-60">
                                <span>المجموع الفرعي:</span>
                                <span className="font-sans">
                                    {taxPreview
                                        ? Number(taxPreview.subtotal).toFixed(2)
                                        : Number(order.total_amount).toFixed(2)
                                    } {currency}
                                </span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm font-bold text-red-600">
                                    <span>الخصم:</span>
                                    <span className="font-sans">-{Number(discount).toFixed(2)} {currency}</span>
                                </div>
                            )}
                            {taxPreview ? (
                                displayTaxBreakdown && taxPreview.tax_breakdown?.length > 0
                                    ? taxPreview.tax_breakdown.map((tax, i) => (
                                        <div key={i} className="flex justify-between text-sm font-bold opacity-60">
                                            <span>{tax.name} <span className="font-sans">({tax.rate}%)</span>:</span>
                                            <span className="font-sans">+{Number(tax.amount).toFixed(2)} {currency}</span>
                                        </div>
                                    ))
                                    : Number(taxPreview.total_tax) > 0 && (
                                        <div className="flex justify-between text-sm font-bold opacity-60">
                                            <span>الضريبة:</span>
                                            <span className="font-sans">+{Number(taxPreview.total_tax).toFixed(2)} {currency}</span>
                                        </div>
                                    )
                            ) : null}
                            <div className="flex justify-between text-xl font-black border-t-2 border-black pt-2">
                                <span>الإجمالي:</span>
                                <span className="font-sans">
                                    {taxPreview
                                        ? Number(taxPreview.total).toFixed(2)
                                        : totalWithDiscount.toFixed(2)
                                    } {currency}
                                </span>
                            </div>

                            <div className="border-t border-dashed border-gray-200 pt-2">
                                <h5 className="text-[10px] font-black mb-2 text-gray-500">المدفوعات:</h5>
                                {payment_methods?.map(m => payments[m.id] > 0 ? (
                                    <div key={m.id} className="flex justify-between text-xs font-bold mb-1">
                                        <span>{m.name}</span><span className="font-sans">{payments[m.id]} {currency}</span>
                                    </div>
                                ) : null)}
                                {walletUsable > 0 && (
                                    <div className="flex justify-between text-xs font-bold mb-1 text-emerald-600">
                                        <span>محفظة العميل</span><span className="font-sans">{walletUsable.toFixed(2)} {currency}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black mt-2">
                                    <span>إجمالي المدفوع:</span>
                                    <span className="font-sans">{effectivePaid.toFixed(2)} {currency}</span>
                                </div>
                                {remaining > 0 && (
                                    <div className="flex justify-between text-sm font-black text-red-600 mt-1">
                                        <span>المتبقي:</span>
                                        <span className="font-sans">{remaining.toFixed(2)} {currency}</span>
                                    </div>
                                )}
                                {surplus > 0 && creditSurplus && customer && (
                                    <div className="flex justify-between text-xs font-bold text-amber-600 mt-1">
                                        <span>أُضيف للمحفظة:</span>
                                        <span className="font-sans">{surplus.toFixed(2)} {currency}</span>
                                    </div>
                                )}
                            </div>

                            {notes && (
                                <div className="border-t border-dashed pt-3 mt-3">
                                    <h5 className="text-[10px] font-black mb-1 text-gray-500">ملاحظات:</h5>
                                    <p className="text-xs font-bold italic">{notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 text-center border-t border-dashed pt-4">
                            <p className="text-[10px] font-black italic opacity-50">شكراً لزيارتكم، وبالهنأ والشفا!</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
