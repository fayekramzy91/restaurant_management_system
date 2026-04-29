import { Head, useForm } from '@inertiajs/react';
import { Utensils } from 'lucide-react';
import InputError from '@/Components/InputError';

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <div className="min-h-screen bg-[#1c0a0b] flex items-center justify-center p-4 font-Cairo" dir="rtl">
            <Head title="تسجيل الدخول" />

            <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ee1d23] rounded-2xl mb-4 shadow-lg shadow-red-900/50">
                        <Utensils size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white">إدارة المطعم</h1>
                    <p className="text-white/40 text-sm mt-1.5">سجّل دخولك للمتابعة</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl p-8 shadow-2xl">
                    {status && (
                        <div className="mb-5 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                اسم المستخدم
                            </label>
                            <input
                                type="text"
                                value={data.username}
                                onChange={e => setData('username', e.target.value)}
                                autoFocus
                                autoComplete="username"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ee1d23]/20 focus:border-[#ee1d23] transition-all"
                                placeholder="أدخل اسم المستخدم"
                            />
                            <InputError message={errors.username} className="mt-1.5" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                كلمة المرور
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                autoComplete="current-password"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ee1d23]/20 focus:border-[#ee1d23] transition-all"
                                placeholder="أدخل كلمة المرور"
                            />
                            <InputError message={errors.password} className="mt-1.5" />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full bg-[#ee1d23] hover:bg-[#d01920] disabled:opacity-60 text-white font-black rounded-xl py-3 text-sm transition-colors mt-2"
                        >
                            {processing ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-white/20 text-xs mt-8">
                    Powered by Antigravity AI
                </p>
            </div>
        </div>
    );
}
