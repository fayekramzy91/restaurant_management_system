export const RESERVATION_STATUSES = {
    confirmed:   { label: 'مؤكد',         color: 'bg-blue-100 text-blue-700'    },
    seated:      { label: 'جالس',         color: 'bg-green-100 text-green-700'  },
    completed:   { label: 'مكتمل',        color: 'bg-slate-100 text-slate-600'  },
    cancelled:   { label: 'ملغي',         color: 'bg-red-100 text-red-700'      },
    no_show:     { label: 'لم يحضر',      color: 'bg-orange-100 text-orange-700'},
    rescheduled: { label: 'معاد جدولة',   color: 'bg-purple-100 text-purple-700'},
    waitlist:    { label: 'قائمة انتظار', color: 'bg-yellow-100 text-yellow-700'},
};

export const ALLOWED_TRANSITIONS = {
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated:    ['completed', 'cancelled'],
    waitlist:  ['confirmed'],
};

export const ORDER_TYPE_LABELS = {
    dine_in:  'داخلي',
    takeaway: 'تيك أواي',
    delivery: 'توصيل',
};

export function formatReservationTime(time) {
    if (!time) return '—';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'م' : 'ص';
    const hour   = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
