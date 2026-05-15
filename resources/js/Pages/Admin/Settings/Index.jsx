import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Store, Phone, MapPin, Clock, DollarSign, CreditCard, Plus, Trash2, Edit2, X, Check, Shield, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent } from '@/Components/ui/card';

const CURRENCIES = [
    { code: 'ILS', label: 'شيكل إسرائيلي (₪)' },
    { code: 'USD', label: 'دولار أمريكي ($)' },
];

function Field({ label, error, children, className = '' }) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
}

function SectionCard({ icon: Icon, iconCls, title, children }) {
    return (
        <Card className="shadow-sm border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                    <Icon size={15} />
                </div>
                <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
            </div>
            <CardContent className="p-5">
                {children}
            </CardContent>
        </Card>
    );
}

export default function Index({ settings, payment_methods }) {
    const { data, setData, post, processing, errors } = useForm({
        restaurant_name:               settings?.restaurant_name || '',
        currency:                      settings?.currency || 'ILS',
        working_hours:                 settings?.working_hours || '',
        phone:                         settings?.phone || '',
        address:                       settings?.address || '',
        customer_allow_add_after_submit: settings?.customer_allow_add_after_submit || '0',
    });

    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    const showToast = (type, message) => {
        clearTimeout(toastTimer.current);
        setToast({ type, message });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.settings.update'), {
            onSuccess: () => showToast('success', 'تم حفظ الإعدادات بنجاح'),
            onError:   () => showToast('error',   'حدث خطأ أثناء الحفظ، تحقق من البيانات'),
        });
    };

    const [newMethodName, setNewMethodName] = useState('');
    const [editingMethod, setEditingMethod] = useState(null);
    const [editName, setEditName] = useState('');

    const addPaymentMethod = () => {
        if (!newMethodName.trim()) return;
        router.post(route('admin.payment-methods.store'), { name: newMethodName, is_active: true }, { onSuccess: () => setNewMethodName('') });
    };

    const selectCls = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <AdminLayout title="الإعدادات العامة">
            <Head title="الإعدادات" />

            <form onSubmit={submit} className="space-y-4 max-w-3xl mx-auto">
                {/* Restaurant Info */}
                <SectionCard icon={Store} iconCls="bg-blue-50 text-blue-500" title="معلومات المطعم">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="اسم المطعم" error={errors.restaurant_name}>
                            <Input value={data.restaurant_name} onChange={e => setData('restaurant_name', e.target.value)} placeholder="مطعم الوصفة الذهبية" required />
                        </Field>
                        <Field label="رقم الهاتف">
                            <Input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+966 5x xxx xxxx" className="font-sans" />
                        </Field>
                        <Field label="العنوان" className="md:col-span-2">
                            <Input value={data.address} onChange={e => setData('address', e.target.value)} placeholder="المدينة، الحي، الشارع" />
                        </Field>
                    </div>
                </SectionCard>

                {/* Currency */}
                <SectionCard icon={DollarSign} iconCls="bg-emerald-50 text-emerald-500" title="العملة">
                    <Field label="عملة المطعم" className="max-w-xs">
                        <select value={data.currency} onChange={e => setData('currency', e.target.value)} className={selectCls}>
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                    </Field>
                </SectionCard>

                {/* Working Hours */}
                <SectionCard icon={Clock} iconCls="bg-amber-50 text-amber-500" title="أوقات العمل">
                    <Field label="أوقات العمل">
                        <textarea
                            value={data.working_hours}
                            onChange={e => setData('working_hours', e.target.value)}
                            className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="السبت - الخميس: 8:00 ص - 12:00 م"
                        />
                    </Field>
                </SectionCard>

                {/* Customer Ordering */}
                <SectionCard icon={QrCode} iconCls="bg-emerald-50 text-emerald-500" title="الطلب الذاتي عبر QR">
                    <div className="flex items-center justify-between gap-4 py-1">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">السماح بإضافة أصناف بعد إرسال الطلب</p>
                            <p className="text-xs text-slate-400 mt-0.5">عند التفعيل يمكن للعملاء إضافة أصناف إلى طلبهم حتى أثناء التحضير</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setData('customer_allow_add_after_submit', data.customer_allow_add_after_submit === '1' ? '0' : '1')}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                                data.customer_allow_add_after_submit === '1' ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                                data.customer_allow_add_after_submit === '1' ? 'right-0.5' : 'left-0.5'
                            }`} />
                        </button>
                    </div>
                </SectionCard>

                <div className="flex justify-end">
                    <Button type="submit" disabled={processing} className="px-8 h-9 text-sm">
                        {processing ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </Button>
                </div>
            </form>

            {/* Payment Methods */}
            <div className="mt-4 max-w-3xl mx-auto">
                <SectionCard icon={CreditCard} iconCls="bg-violet-50 text-violet-500" title="طرق الدفع">
                    <div className="space-y-4">
                        {/* Add new */}
                        <div className="flex gap-2">
                            <Input
                                value={newMethodName}
                                onChange={e => setNewMethodName(e.target.value)}
                                placeholder="إضافة طريقة دفع (مثال: مدى، فيزا)"
                                className="text-sm"
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPaymentMethod())}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addPaymentMethod}
                                disabled={!newMethodName.trim()}
                                className="gap-1.5 shrink-0 h-9 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                <Plus size={13} /> إضافة
                            </Button>
                        </div>

                        {/* List */}
                        <div className="space-y-1.5">
                            {payment_methods?.map(method => (
                                <div
                                    key={method.id}
                                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors group"
                                >
                                    {editingMethod === method.id ? (
                                        <div className="flex items-center gap-2 flex-1 ml-3">
                                            <Input
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="h-8 text-sm"
                                                autoFocus
                                            />
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 shrink-0"
                                                onClick={() => router.put(route('admin.payment-methods.update', method.id), { name: editName }, { onSuccess: () => setEditingMethod(null) })}
                                            >
                                                <Check size={13} />
                                            </Button>
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="h-7 w-7 text-slate-300 hover:bg-slate-100 shrink-0"
                                                onClick={() => setEditingMethod(null)}
                                            >
                                                <X size={13} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-slate-700">{method.name}</span>
                                            {Boolean(method.is_system) && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                                                    <Shield size={9} strokeWidth={2.5} />
                                                    أساسي
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {!method.is_system && editingMethod !== method.id && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => { setEditingMethod(method.id); setEditName(method.name); }}
                                            >
                                                <Edit2 size={13} />
                                            </Button>
                                            <Button
                                                type="button" variant="ghost" size="icon"
                                                className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => confirm('هل أنت متأكد من حذف طريقة الدفع هذه؟') && router.delete(route('admin.payment-methods.destroy', method.id))}
                                            >
                                                <Trash2 size={13} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {(!payment_methods || payment_methods.length === 0) && (
                                <div className="text-center py-8 text-slate-300">
                                    <CreditCard size={24} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-semibold">لا توجد طرق دفع مضافة</p>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Toast notification */}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all animate-in fade-in slide-in-from-bottom-4 ${
                    toast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {toast.type === 'success'
                        ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        : <AlertCircle  size={18} className="text-red-500 shrink-0" />
                    }
                    {toast.message}
                    <button onClick={() => setToast(null)} className="mr-2 opacity-50 hover:opacity-100 transition-opacity">
                        <X size={14} />
                    </button>
                </div>
            )}
        </AdminLayout>
    );
}
