import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { Store, ShoppingCart, Utensils, Users, ArrowLeft, TrendingUp, LayoutGrid, Settings } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';

const STAT_CARDS = [
    { key: 'branches',        label: 'إجمالي الأفرع',    icon: Store,         iconCls: 'bg-blue-50 text-blue-500',    href: 'admin.branches.index' },
    { key: 'orders_today',    label: 'طلبات اليوم',       icon: ShoppingCart,  iconCls: 'bg-emerald-50 text-emerald-500', href: 'admin.orders.index' },
    { key: 'available_items', label: 'الأصناف المتوفرة',  icon: Utensils,      iconCls: 'bg-amber-50 text-amber-500',  href: 'admin.menu-items.index' },
    { key: 'customers',       label: 'إجمالي الزبائن',    icon: Users,         iconCls: 'bg-violet-50 text-violet-500', href: null },
];

const QUICK_LINKS = [
    { label: 'إدارة الطلبات', href: 'admin.orders.index',    icon: ShoppingCart },
    { label: 'قائمة الطعام',  href: 'admin.menu-items.index', icon: Utensils },
    { label: 'الطاولات',      href: 'admin.tables.index',     icon: LayoutGrid },
    { label: 'الإعدادات',     href: 'admin.settings.index',   icon: Settings },
];

export default function Dashboard({ stats }) {
    return (
        <AdminLayout title="لوحة التحكم">
            <Head title="لوحة التحكم" />

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {STAT_CARDS.map(({ key, label, icon: Icon, iconCls, href }) => (
                    <Card key={key} className="shadow-sm border-slate-200/80 hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                                    <Icon size={14} />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-slate-800 font-sans">{stats[key]}</p>
                            {href ? (
                                <Link
                                    href={route(href)}
                                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    عرض الكل <ArrowLeft size={11} />
                                </Link>
                            ) : (
                                <div className="mt-3 h-4" />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Welcome card */}
                <Card className="lg:col-span-2 shadow-sm border-slate-200/80 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/8 text-primary rounded-lg flex items-center justify-center shrink-0">
                            <Store size={14} />
                        </div>
                        <h3 className="font-semibold text-slate-700 text-sm">مرحباً بك في نظام إدارة المطعم</h3>
                    </div>
                    <CardContent className="p-5 space-y-4">
                        <p className="text-sm text-slate-500 leading-relaxed">
                            هنا يمكنك إدارة كافة العمليات الأساسية للمطعم، من إضافة الأفرع وتحديد بياناتها، مروراً بإدارة المنيو والتصنيفات، وصولاً إلى متابعة الطلبات والطاولات في الوقت الفعلي.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                <h4 className="font-semibold text-slate-700 text-sm mb-1">تجهيز البيانات</h4>
                                <p className="text-xs text-slate-400">ابدأ بإضافة الفرع الرئيسي والقاعات والطاولات لتفعيل النظام.</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                                <h4 className="font-semibold text-amber-700 text-sm mb-1">إدارة المنيو</h4>
                                <p className="text-xs text-amber-600/70">قم بتنظيم الأصناف ضمن تصنيفات واضحة لتسهيل عملية الطلب.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick links */}
                <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center shrink-0">
                            <TrendingUp size={14} />
                        </div>
                        <h3 className="font-semibold text-slate-700 text-sm">روابط سريعة</h3>
                    </div>
                    <CardContent className="p-3">
                        <div className="space-y-0.5">
                            {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={route(href)}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5 text-slate-500 group-hover:text-slate-700 transition-colors">
                                        <Icon size={14} />
                                        <span className="text-sm font-semibold">{label}</span>
                                    </div>
                                    <ArrowLeft size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </AdminLayout>
    );
}
