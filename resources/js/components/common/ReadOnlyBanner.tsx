// ════════════════════════════════════════════════
// resources/js/components/common/ReadOnlyBanner.tsx
// ════════════════════════════════════════════════
import { useFiscalYear } from '@/context/FiscalYearContext';

export default function ReadOnlyBanner() {
    const { selected, isReadOnly } = useFiscalYear();
    if (!isReadOnly || !selected) return null;

    const toDateString = (d?: string | null) => {
        if (!d) return '—';
        const match = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return '—';
        return new Date(+match[1], +match[2] - 1, +match[3]).toLocaleDateString('ar-DZ', {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    };

    return (
        <div style={{
            background: 'var(--redb)',
            border: '1px solid var(--redbo)',
            borderRadius: 'var(--r3)',
            padding: '12px 18px',
            marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'var(--red)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <i className="ti ti-lock" style={{ fontSize: 18 }} />
            </div>
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>
                    سنة مالية مقفلة — وضع القراءة فقط
                </div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 3 }}>
                    السنة المالية <strong>{selected.name}</strong> مقفلة بتاريخ{' '}
                    {toDateString(selected.closed_at)}.
                    لا يمكن إضافة أو تعديل أو حذف أي بيانات.
                    {selected.closing_notes && (
                        <span style={{ color: 'var(--t3)', display: 'block', marginTop: 2 }}>
                            📝 {selected.closing_notes}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
