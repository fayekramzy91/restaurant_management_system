import { Head, Link } from '@inertiajs/react';
import { LayoutDashboard, Users, Clock, MapPin, LogOut } from 'lucide-react';

export default function Index({ areas }) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
            <Head title="شاشة النادل - الطاولات" />

            {/* Header */}
            <header className="bg-[#6f272a] text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-[#ee1d23] p-2 rounded-lg">
                        <LayoutDashboard size={24} />
                    </div>
                    <h1 className="text-xl font-bold">نظام الطاولات</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Link href={route('logout')} method="post" as="button" className="p-2 hover:bg-red-800 rounded-full transition-colors text-red-200">
                        <LogOut size={24} />
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-4 md:p-8">
                {areas.map((area) => (
                    <section key={area.id} className="mb-10">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-2">
                            <MapPin className="text-[#ee1d23]" size={20} />
                            <h2 className="text-xl font-bold text-gray-800">{area.name}</h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {area.tables.map((table) => (
                                <Link
                                    key={table.id}
                                    href={route('waiter.table', table.id)}
                                    className={`relative p-6 rounded-2xl border-2 transition-all transform active:scale-95 flex flex-col items-center justify-center gap-2 shadow-sm
                                        ${table.status === 'available' 
                                            ? 'bg-white border-green-100 hover:border-green-500 hover:shadow-md' 
                                            : table.status === 'occupied' 
                                                ? 'bg-red-50 border-red-200 text-red-700' 
                                                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                        }`}
                                >
                                    <div className={`p-3 rounded-full mb-1 ${
                                        table.status === 'available' ? 'bg-green-50 text-green-600' : 'bg-white/50'
                                    }`}>
                                        <Users size={24} />
                                    </div>
                                    <span className="font-bold text-lg font-sans">{table.name}</span>
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                                        {table.status === 'available' ? 'متاحة' : table.status === 'occupied' ? 'مشغولة' : 'محجوزة'}
                                    </div>

                                    {/* Status Indicator */}
                                    <div className={`absolute top-3 left-3 w-3 h-3 rounded-full shadow-sm ${
                                        table.status === 'available' ? 'bg-green-500' : table.status === 'occupied' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
                                    }`}></div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}

                {areas.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                        <MapPin size={48} className="mb-4 opacity-20" />
                        <p className="font-medium text-lg">لم يتم تعريف قاعات أو طاولات بعد.</p>
                        <p className="text-sm">يرجى مراجعة لوحة تحكم المدير.</p>
                    </div>
                )}
            </main>

            {/* Bottom Nav for Mobile */}
            <nav className="fixed bottom-0 inset-x-0 bg-white border-t p-2 flex justify-around md:hidden z-50">
                 <Link href={route('waiter.index')} className="flex flex-col items-center text-[#ee1d23]">
                    <LayoutDashboard size={20} />
                    <span className="text-[10px] font-bold mt-1">الطاولات</span>
                 </Link>
                 <Link href="#" className="flex flex-col items-center text-gray-400">
                    <Clock size={20} />
                    <span className="text-[10px] font-bold mt-1">الطلبات</span>
                 </Link>
            </nav>
        </div>
    );
}
