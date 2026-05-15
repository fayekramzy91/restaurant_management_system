import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Store, Phone, MapPin, Clock, DollarSign, CreditCard, Plus, Trash2, Edit2, X, Check, Shield, Percent, AlertTriangle } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent } from '@/Components/ui/card';

const CURRENCIES = [
    { code: 'SAR', label: 'ريال سعودي (ر.س)' },
    { code: 'USD', label: 'دولار أمريكي ($)' },
    { code: 'EUR', label: 'يورو (€)' },
    { code: 'GBP', label: 'جنيه إسترليني (£)' },
    { code: 'AED', label: 'درهم إماراتي (د.إ)' },
    { code: 'KWD', label: 'دينار كويتي (د.ك)' },
    { code: 'QAR', label: 'ريال قطري (ر.ق)' },
    { code: 'BHD', label: 'دينار بحريني (د.ب)' },
    { code: 'OMR', label: 'ريال عُماني (ر.ع)' },
    { code: 'EGP', label: 'جنيه مصري (ج.م)' },
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

/** Reusable toggle row for the tax settings card */
function TaxToggleRow({ checked, onChange, label, helper }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                {helper && (
                    typeof helper === 'string'
                        ? <p className="text-xs text-slate-400 mt-0.5">{helper}</p>
                        : <p className="text-xs mt-0.5">{helper}</p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-ring ${checked ? 'bg-primary' : 'bg-slate-200'}`}
            >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[-1.25rem]' : 'translate-x-[-0.25rem]'}`} />
            </button>
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
    // Helper: setting values come back as strings ("1"/"0") — convert to boolean
    const taxBool = (key) => {
        const v = settings?.['tax.' + key];
        return v === '1' || v === 'true' || v === true || v === 1;
    };

    const { data, setData, post, processing, errors } = useForm({
        restaurant_name: settings?.restaurant_name || '',
        currency:        settings?.currency || 'SAR',
        working_hours:   settings?.working_hours || '',
        phone:           settings?.phone || '',
        address:         settings?.address || '',
        tax: {
            prices_include_tax:     taxBool('prices_include_tax'),
            compound_taxes_enabled: taxBool('compound_taxes_enabled'),
            exempt_takeaway:        taxBool('exempt_takeaway'),
            exempt_delivery:        taxBool('exempt_delivery'),
            rounding_mode:          settings?.['tax.rounding_mode'] || 'per_line',
            display_breakdown:      taxBool('display_breakdown'),
        },
    });

    const submit = (e) => { e.preventDefault(); post(route('admin.settings.update')); };

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

            <form onSubmit={submit} className="space-y-4 max-w-3xl">
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

                {/* ── Tax Settings ───────────────────────────────────── */}
                <SectionCard icon={Percent} iconCls="bg-red-50 text-red-500" title="إعدادات الضرائب">
                    <div className="space-y-5">

                        {/* Prices include tax */}
                        <TaxToggleRow
                            checked={data.tax.prices_include_tax}
                            onChange={v => setData('tax', { ...data.tax, prices_include_tax: v })}
                            label="الأسعار شاملة الضريبة"
                            helper={
                                <span className="flex items-center gap-1 text-amber-600">
                                    <AlertTriangle size={11} className="shrink-0" />
                                    تغيير هذا الإعداد يؤثر على حساب الفواتير الجديدة فقط
                                </span>
                            }
                        />

                        {/* Compound taxes */}
                        <TaxToggleRow
                            checked={data.tax.compound_taxes_enabled}
                            onChange={v => setData('tax', { ...data.tax, compound_taxes_enabled: v })}
                            label="تفعيل الضرائب المركبة"
                            helper="الضريبة المركبة تُحسب فوق الضرائب الأخرى"
                        />

                        {/* Exempt takeaway */}
                        <TaxToggleRow
                            checked={data.tax.exempt_takeaway}
                            onChange={v => setData('tax', { ...data.tax, exempt_takeaway: v })}
                            label="إعفاء طلبات تيك أواي من الضرائب"
                        />

                        {/* Exempt delivery */}
                        <TaxToggleRow
                            checked={data.tax.exempt_delivery}
                            onChange={v => setData('tax', { ...data.tax, exempt_delivery: v })}
                            label="إعفاء طلبات التوصيل من الضرائب"
                        />

                        {/* Rounding mode */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                أسلوب التقريب
                            </Label>
                            <div className="flex items-center gap-4">
                                {[
                                    { value: 'per_line',    label: 'لكل بند' },
                                    { value: 'per_invoice', label: 'للفاتورة الكاملة' },
                                ].map(opt => (
                                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="rounding_mode"
                                            value={opt.value}
                                            checked={data.tax.rounding_mode === opt.value}
                                            onChange={() => setData('tax', { ...data.tax, rounding_mode: opt.value })}
                                            className="text-primary border-input"
                                        />
                                        <span className="text-sm text-slate-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Display breakdown on invoices */}
                        <TaxToggleRow
                            checked={data.tax.display_breakdown}
                            onChange={v => setData('tax', { ...data.tax, display_breakdown: v })}
                            label="إظهار تفاصيل الضريبة في الفواتير"
                        />
                    </div>
                </SectionCard>

                <div className="flex justify-end">
                    <Button type="submit" disabled={processing} className="px-8 h-9 text-sm">
                        {processing ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    </Button>
                </div>
            </form>

            {/* Payment Methods */}
            <div className="mt-4 max-w-3xl">
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
        </AdminLayout>
    );
}
