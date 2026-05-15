import { usePage } from '@inertiajs/react';

export default function CustomerLayout({ children, title }) {
    const { settings } = usePage().props;
    const restaurantName = settings?.restaurant_name || 'المطعم';

    return (
        <div className="min-h-screen bg-gray-50 font-Cairo" dir="rtl">
            <header className="bg-[#1c0a0b] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-50 shadow-lg">
                <div className="w-9 h-9 bg-[#ee1d23] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🍽</span>
                </div>
                <div className="min-w-0">
                    <h1 className="font-black text-[15px] leading-tight truncate">{restaurantName}</h1>
                    {title && (
                        <p className="text-[11px] text-white/55 font-semibold truncate">{title}</p>
                    )}
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
