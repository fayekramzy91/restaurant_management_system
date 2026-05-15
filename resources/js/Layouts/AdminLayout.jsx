import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    LayoutDashboard, Store, Tag, Utensils, Map, LayoutGrid,
    ShoppingCart, Settings, LogOut, ChevronLeft, Users, UserCog, ShieldCheck,
    BarChart2, ReceiptText, Percent,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Separator } from '@/Components/ui/separator';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    { name: 'لوحة التحكم',       icon: LayoutDashboard, route: 'admin.dashboard',          active: 'admin.dashboard',      permission: 'dashboard.view' },
    { name: 'التقارير',          icon: BarChart2,       route: 'admin.reports.dashboard',  active: 'admin.reports.*',      permission: 'reports.view' },
    { name: 'الطلبات',           icon: ShoppingCart,    route: 'admin.orders.index',       active: 'admin.orders.*',       permission: 'reports.view' },
    { name: 'الفواتير',          icon: ReceiptText,     route: 'admin.invoices.index',     active: 'admin.invoices.*',     permission: 'payments.view' },
    { name: 'العملاء',           icon: Users,           route: 'admin.customers.index', active: 'admin.customers.*',    permission: 'customers.view' },
    { name: 'الأفرع',            icon: Store,           route: 'admin.branches.index',  active: 'admin.branches.*',     permission: 'admin.branches' },
    { name: 'التصنيفات',         icon: Tag,             route: 'admin.categories.index',active: 'admin.categories.*',  permission: 'admin.categories' },
    { name: 'قائمة الطعام',      icon: Utensils,        route: 'admin.menu-items.index',active: 'admin.menu-items.*',  permission: 'admin.categories' },
    { name: 'القاعات',           icon: Map,             route: 'admin.areas.index',     active: 'admin.areas.*',        permission: 'admin.areas' },
    { name: 'الطاولات',          icon: LayoutGrid,      route: 'admin.tables.index',    active: 'admin.tables.*',       permission: 'admin.tables' },
    { name: 'المستخدمون',        icon: UserCog,         route: 'admin.users.index',     active: 'admin.users.*',        permission: 'admin.users' },
    { name: 'الأدوار والصلاحيات', icon: ShieldCheck,    route: 'admin.roles.index',     active: 'admin.roles.*',        permission: 'admin.roles' },
    { name: 'الضرائب',           icon: Percent,         route: 'admin.taxes.index',     active: 'admin.taxes.*',        permission: 'admin.taxes' },
    { name: 'الإعدادات',         icon: Settings,        route: 'admin.settings.index',  active: 'admin.settings.*',     permission: 'admin.settings' },
];

export default function AdminLayout({ children, title }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const permissions = user?.permissions ?? [];

    const visibleItems = NAV_ITEMS.filter(
        item => !item.permission || permissions.includes(item.permission)
    );

    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50/60 flex font-Cairo" dir="rtl">

            {/* ── Sidebar ── */}
            <aside className={cn(
                'fixed inset-y-0 right-0 z-50 flex flex-col bg-[#1c0a0b] text-white transition-all duration-300 ease-in-out',
                collapsed ? 'w-16' : 'w-60'
            )}>
                {/* Brand */}
                <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/10', collapsed && 'justify-center px-2')}>
                    <div className="bg-[#ee1d23] rounded-lg p-2 shrink-0">
                        <Utensils size={18} className="text-white" />
                    </div>
                    {!collapsed && (
                        <span className="text-base font-black text-white/90 truncate">إدارة المطعم</span>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
                    {visibleItems.map((item) => {
                        const active = route().current(item.active);
                        return (
                            <Link
                                key={item.name}
                                href={route(item.route)}
                                title={collapsed ? item.name : undefined}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all',
                                    collapsed && 'justify-center px-2',
                                    active
                                        ? 'bg-[#ee1d23] text-white shadow-lg shadow-red-900/30'
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <item.icon size={18} className="shrink-0" />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <Separator className="bg-white/10" />

                {/* User area */}
                <div className={cn('px-3 py-4', collapsed && 'px-2')}>
                    {!collapsed && (
                        <div className="flex items-center gap-3 mb-3 px-1">
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-[#ee1d23] text-white text-xs">
                                    {user.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white/90 truncate">{user.name}</p>
                                <p className="text-[11px] text-white/40 truncate">
                                    {user.role?.display_name ?? user.username}
                                </p>
                            </div>
                        </div>
                    )}

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        title={collapsed ? 'تسجيل الخروج' : undefined}
                        className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-bold text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors',
                            collapsed && 'justify-center px-2'
                        )}
                    >
                        <LogOut size={16} />
                        {!collapsed && 'تسجيل الخروج'}
                    </Link>

                    {!collapsed && (
                        <p className="mt-3 px-1 text-[10px] font-mono text-white/20 text-center select-none">
                            v{__APP_VERSION__}
                        </p>
                    )}
                </div>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -left-3 top-20 bg-white border border-border rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <ChevronLeft size={14} className={cn('transition-transform', collapsed && 'rotate-180')} />
                </button>
            </aside>

            {/* ── Main content ── */}
            <div className={cn('flex-1 flex flex-col transition-all duration-300 ease-in-out', collapsed ? 'mr-16' : 'mr-60')}>

                {/* Header */}
                <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
                    <h1 className="text-base font-black text-gray-800">{title}</h1>
                    <div className="flex items-center gap-3">
                        {permissions.includes('orders.view') && (
                            <Link
                                href={route('pos.index')}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors"
                            >
                                <ShoppingCart size={13} />
                                POS
                            </Link>
                        )}
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-[#ee1d23] text-white text-xs font-black">
                                {user.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
