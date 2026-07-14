// ════════════════════════════════════════════════
// resources/js/components/common/FiscalYearSelector.tsx
// ════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react';
import { useFiscalYear } from '@/context/FiscalYearContext';


export default function FiscalYearSelector() {
    const { years, selected, loading, isReadOnly, selectYear } = useFiscalYear();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // إغلاق عند النقر خارجاً
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (loading) return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg3)',
            fontSize: 12, color: 'var(--t4)',
        }}>
            <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
            تحميل...
        </div>
    );

    if (!selected) return null;

    // دالة مساعدة لتنسيق التاريخ
    const toDateInputValue = (date: any): string => {
        if (!date) return '';
        const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* الزر الرئيسي */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '5px 12px', borderRadius: 'var(--r2)',
                    border: `1px solid ${isReadOnly ? 'var(--redbo)' : 'var(--b3)'}`,
                    background: isReadOnly
                        ? 'var(--redb)'
                        : 'var(--bg3)',
                    cursor: 'pointer', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif',
                    color: 'var(--t1)', transition: 'all .15s',
                }}
            >
                {/* أيقونة الحالة */}
                <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: selected.is_current
                        ? 'var(--emb)'
                        : isReadOnly
                            ? 'var(--redb)'
                            : 'var(--blueb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <i className={`ti ${isReadOnly ? 'ti-lock' : selected.is_current ? 'ti-calendar-check' : 'ti-calendar'}`}
                        style={{
                            fontSize: 10,
                            color: selected.is_current ? 'var(--em)' : isReadOnly ? 'var(--red)' : 'var(--blue)',
                        }}
                    />
                </span>

                <span style={{ fontWeight: 700 }}>س.م {selected.name}</span>

                {/* badge الحالة */}
                {isReadOnly && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px',
                        borderRadius: 10, background: 'var(--red)', color: '#fff',
                    }}>
                        للقراءة فقط
                    </span>
                )}
                {selected.is_current && !isReadOnly && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px',
                        borderRadius: 10, background: 'var(--em)', color: '#fff',
                    }}>
                        جارية
                    </span>
                )}

                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
                    style={{ fontSize: 11, color: 'var(--t4)', marginRight: 2 }} />
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)',
                    left: 0, minWidth: 280, zIndex: 9999,
                    background: 'var(--bg2)', border: '1px solid var(--b2)',
                    borderRadius: 'var(--r3)', boxShadow: 'var(--shadow2)',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '10px 14px', borderBottom: '1px solid var(--b1)',
                        fontSize: 11, fontWeight: 700, color: 'var(--t4)',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <i className="ti ti-calendar-stats" />
                        اختيار السنة المالية
                    </div>

                    {/* القائمة */}
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {years.map(year => (
                            <button
                                key={year.id}
                                onClick={() => { selectYear(year); setOpen(false); }}
                                style={{
                                    width: '100%', textAlign: 'right', padding: '10px 14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    gap: 8, cursor: 'pointer', border: 'none', fontFamily: 'Tajawal, sans-serif',
                                    background: selected.id === year.id
                                        ? 'var(--emb)'
                                        : 'transparent',
                                    borderRight: selected.id === year.id
                                        ? '3px solid var(--em)' : '3px solid transparent',
                                    transition: 'background .1s',
                                    fontSize: 13,
                                }}
                                onMouseEnter={e => {
                                    if (selected.id !== year.id)
                                        (e.currentTarget as HTMLElement).style.background = 'var(--bg3)';
                                }}
                                onMouseLeave={e => {
                                    if (selected.id !== year.id)
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {selected.id === year.id && (
                                            <i className="ti ti-check" style={{ fontSize: 12, color: 'var(--em)' }} />
                                        )}
                                        سنة {year.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                                        {toDateInputValue(year.start_date)} — {toDateInputValue(year.end_date)}
                                    </div>
                                </div>

                                {/* Badges */}
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    {year.is_current && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                            borderRadius: 10,
                                            background: 'var(--emb)', color: 'var(--em)',
                                        }}>جارية</span>
                                    )}
                                    {year.is_closed && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                            borderRadius: 10,
                                            background: 'var(--redb)', color: 'var(--red)',
                                            display: 'flex', alignItems: 'center', gap: 3,
                                        }}>
                                            <i className="ti ti-lock" style={{ fontSize: 9 }} /> مقفلة
                                        </span>
                                    )}
                                    {!year.is_closed && !year.is_current && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                            borderRadius: 10,
                                            background: 'var(--blueb)', color: 'var(--blue)',
                                        }}>مفتوحة</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '8px 14px', borderTop: '1px solid var(--b1)',
                        fontSize: 11, color: 'var(--t4)',
                    }}>
                        <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
                        السنة المقفلة: للعرض فقط — لا يمكن التعديل
                    </div>
                </div>
            )}
        </div>
    );
}
