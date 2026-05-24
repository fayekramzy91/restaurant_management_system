import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Users, Phone, Mail, MapPin, ShoppingBag, Wallet } from 'lucide-react';
import { Card } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { cn } from '@/lib/utils';

export default function Index({ customers }) {
    const { settings } = usePage().props;
    const currency = settings?.currency ?? 'SAR';

    return (
        <AdminLayout title="العملاء">
            <Head title="العملاء" />

            <Card className="shadow-sm border-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-700 text-sm">سجل العملاء</h3>
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5 rounded-full font-sans">{customers.length}</span>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-slate-100">
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">العميل</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">الهاتف</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">العنوان</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">الطلبات</TableHead>
                            <TableHead className="text-start text-xs font-semibold text-slate-400 uppercase tracking-wide">إجمالي الإنفاق</TableHead>
                            <TableHead className="text-start text-xs font-semibold text-slate-400 uppercase tracking-wide">رصيد المحفظة</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wide">آخر طلب</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.map((customer) => (
                            <TableRow key={customer.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-bold text-sm">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700 text-sm">{customer.name}</p>
                                            {customer.email && (
                                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Mail size={10} /> {customer.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm font-sans">
                                    {customer.phone
                                        ? <span className="flex items-center gap-1"><Phone size={12} className="text-slate-300" />{customer.phone}</span>
                                        : <span className="text-slate-200">—</span>
                                    }
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs max-w-[160px] truncate">
                                    {customer.address
                                        ? <span className="flex items-center gap-1"><MapPin size={11} className="text-slate-300 shrink-0" />{customer.address}</span>
                                        : <span className="text-slate-200">—</span>
                                    }
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
                                        <ShoppingBag size={13} className="text-slate-300" />
                                        {customer.orders_count ?? 0}
                                    </span>
                                </TableCell>
                                <TableCell className="text-start font-sans font-semibold text-slate-700 text-sm">
                                    {Number(customer.total_revenue ?? 0).toFixed(2)}
                                    <span className="text-xs text-slate-400 font-normal mr-1">{currency}</span>
                                </TableCell>
                                <TableCell className="text-start">
                                    <span className={cn(
                                        'inline-flex items-center gap-1 font-sans font-semibold text-sm',
                                        Number(customer.wallet_balance) > 0 ? 'text-emerald-600' : 'text-slate-300'
                                    )}>
                                        <Wallet size={13} />
                                        {Number(customer.wallet_balance).toFixed(2)}
                                        {Number(customer.wallet_balance) > 0 && (
                                            <span className="text-xs font-normal text-emerald-500">{currency}</span>
                                        )}
                                    </span>
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs font-sans">
                                    {customer.orders_max_created_at
                                        ? new Date(customer.orders_max_created_at).toLocaleDateString('ar-SA')
                                        : <span className="text-slate-200">—</span>
                                    }
                                </TableCell>
                                <TableCell>
                                    <Link
                                        href={route('admin.customers.wallet', customer.id)}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#ee1d23] border border-slate-200 hover:border-[#ee1d23] rounded-md px-2 py-1 transition-colors"
                                        title="عرض المحفظة"
                                    >
                                        <Wallet size={11} />
                                        المحفظة
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {customers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-16 text-slate-300">
                                    <Users size={28} className="mx-auto mb-2.5 opacity-40" />
                                    <p className="font-semibold text-sm">لا يوجد عملاء مسجلون بعد</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </AdminLayout>
    );
}
