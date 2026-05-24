import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';

const PRESETS = [
    { key: 'today',     label: 'اليوم' },
    { key: 'yesterday', label: 'أمس' },
    { key: 'last_7',    label: 'آخر 7 أيام' },
    { key: 'last_30',   label: 'آخر 30 يوماً' },
    { key: 'custom',    label: 'مخصص' },
];

/**
 * Shared date-range filter bar used across all report pages.
 *
 * Props:
 *   filters   — current filter object from Inertia props
 *   routeName — the named route to navigate to on filter change
 *   extra     — optional flat object of extra params to preserve (e.g. {user_id, status})
 */
export default function ReportDateFilter({ filters, routeName, extra = {} }) {
    const [preset,   setPreset]   = useState(filters.preset    ?? 'today');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo,   setDateTo]   = useState(filters.date_to   ?? '');

    const apply = (overrides = {}) => {
        const p = { ...extra, preset, date_from: dateFrom, date_to: dateTo, ...overrides };
        if (p.preset !== 'custom') {
            delete p.date_from;
            delete p.date_to;
        }
        // Drop empty extra params so URL stays clean
        Object.keys(p).forEach(k => (p[k] === '' || p[k] === null || p[k] === undefined) && delete p[k]);
        router.get(route(routeName), p, { preserveState: true, replace: true });
    };

    const handlePreset = (key) => {
        setPreset(key);
        if (key !== 'custom') apply({ preset: key });
    };

    return (
        <Card className="shadow-sm border-slate-200/80 mb-5">
            <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 items-center">
                    {PRESETS.map(({ key, label }) => (
                        <Button
                            key={key}
                            variant={preset === key ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                                'h-8 text-xs',
                                preset === key && 'bg-[#ee1d23] border-[#ee1d23] hover:bg-[#c91920] text-white'
                            )}
                            onClick={() => handlePreset(key)}
                        >
                            {label}
                        </Button>
                    ))}

                    {preset === 'custom' && (
                        <div className="flex gap-2 items-center me-2">
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="h-8 text-xs w-36 border-slate-200"
                            />
                            <span className="text-xs text-slate-400">—</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="h-8 text-xs w-36 border-slate-200"
                            />
                            <Button
                                size="sm"
                                className="h-8 text-xs bg-[#ee1d23] hover:bg-[#c91920] text-white"
                                onClick={() => apply({ preset: 'custom', date_from: dateFrom, date_to: dateTo })}
                                disabled={!dateFrom || !dateTo}
                            >
                                تطبيق
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
