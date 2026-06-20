import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { AdvancePayment } from '../hooks/useAdvancePayments';

interface AdvancePaymentsPanelProps {
  advances:    AdvancePayment[] | undefined;
  isLoading:   boolean;
  onApply:     (advance: AdvancePayment) => void;
  disabled?:   boolean;
}

export function AdvancePaymentsPanel({
  advances, isLoading, onApply, disabled,
}: AdvancePaymentsPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  if (isLoading) {
    return (
      <div style={{
        marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل الدفعات المتاحة...
      </div>
    );
  }

  if (!advances || advances.length === 0) return null;

  const totalUnapplied = advances.reduce((s, a) => s + a.unapplied_amount, 0);

  return (
    <div style={{
      marginTop: 10, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className="ti ti-coin" style={{ fontSize: 12, color: 'var(--green)' }} />
        <span style={{ flex: 1 }}>دفعات متاحة للتطبيق</span>
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--greenb)', color: 'var(--green)', fontWeight: 700,
        }}>
          {fmtDZD(totalUnapplied)} دج
        </span>
        <i className={`ti ti-chevron-${collapsed ? 'down' : 'up'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {!collapsed && (
        <div style={{ padding: '6px 8px', background: 'var(--bg1)' }}>
          {advances.map((adv) => (
            <div key={adv.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 'var(--r1)',
              opacity: disabled ? 0.6 : 1,
            }}>
              <i className="ti ti-currency-dollar" style={{ fontSize: 11, color: 'var(--green)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <span>{adv.payment_number ?? `دفعة #${adv.id}`}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t4)' }}>
                    {adv.payment_mode_name}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{adv.payment_date}</span>
                  {adv.reference && <span>مرجع: {adv.reference}</span>}
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    المبلغ الأصلي: {fmtDZD(adv.amount)} دج
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDZD(adv.unapplied_amount)} دج
                </div>
                <button
                  onClick={() => { if (!disabled) onApply(adv); }}
                  disabled={disabled}
                  style={{
                    marginTop: 2, padding: '2px 8px', borderRadius: 'var(--r1)',
                    border: '1px solid var(--green)', background: 'transparent',
                    color: 'var(--green)', cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                    whiteSpace: 'nowrap', transition: 'all .12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = 'var(--green)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--green)';
                    }
                  }}
                >
                  <i className="ti ti-arrow-left" style={{ marginLeft: 3, fontSize: 9 }} />
                  تطبيق
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
