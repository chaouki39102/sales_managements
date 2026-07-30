import { fmtDZD } from '../utils/document.utils';
import type { CreditCheckResult } from '../hooks/useCreditCheck';

interface CreditCheckBarProps {
  creditCheck:  CreditCheckResult | null | undefined;
  isLoading:    boolean;
  partyName?:   string;
}

export function CreditCheckBar({ creditCheck, isLoading, partyName }: CreditCheckBarProps) {
  if (isLoading) return null;
  if (!creditCheck) return null;

  if (!creditCheck.credit_limit) {
    if (creditCheck.overdue_invoices.count === 0) return null;
  }

  const usagePercent = creditCheck.credit_limit > 0
    ? Math.min(100, (creditCheck.used_credit / creditCheck.credit_limit) * 100)
    : 0;

  const barColor = creditCheck.will_exceed
    ? 'var(--red)'
    : usagePercent > 80
      ? 'var(--orange)'
      : 'var(--green)';

  return (
    <div style={{
      marginTop: 8, padding: '8px 12px',
      borderRadius: 'var(--r2)',
      background: creditCheck.will_exceed
        ? 'color-mix(in srgb, var(--red) 8%, transparent)'
        : 'var(--bg3)',
      border: creditCheck.will_exceed
        ? '1px solid color-mix(in srgb, var(--red) 30%, transparent)'
        : '1px solid var(--b2)',
    }}>
      {creditCheck.credit_limit > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-credit-card" style={{ fontSize: 12 }} />
              حد الائتمان: <b style={{ color: 'var(--t1)' }}>{fmtDZD(creditCheck.credit_limit)} دج</b>
            </span>
            <span style={{
              color: barColor, fontWeight: 700, fontSize: 11,
            }}>
              {creditCheck.will_exceed
                ? `تجاوز بـ ${fmtDZD(creditCheck.exceed_by)} دج`
                : `متاح: ${fmtDZD(creditCheck.available_credit ?? 0)} دج`}
            </span>
          </div>

          <div style={{
            height: 5, borderRadius: 99, background: 'var(--b2)',
            overflow: 'hidden', marginBottom: 6,
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, usagePercent)}%`,
              background: barColor,
              borderRadius: 99,
              transition: 'width .3s',
            }} />
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--t4)' }}>
            <span>مستخدم: {fmtDZD(creditCheck.used_credit)} دج</span>
            {creditCheck.credit_days > 0 && (
              <span>مدة الائتمان: {creditCheck.credit_days} يوم</span>
            )}
            {creditCheck.suggested_due_date && (
              <span>الاستحقاق المقترح: {creditCheck.suggested_due_date}</span>
            )}
          </div>
        </>
      )}

      {creditCheck.overdue_invoices.count > 0 && (
        <div style={{
          marginTop: creditCheck.credit_limit > 0 ? 8 : 0,
          padding: '5px 8px', borderRadius: 'var(--r1)',
          background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
          border: '1px solid var(--orange)',
          fontSize: 11, color: 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 12, flexShrink: 0 }} />
          {partyName ?? 'الزبون'} لديه{' '}
          <b>{creditCheck.overdue_invoices.count}</b> فاتورة متأخرة
          بقيمة <b>{fmtDZD(creditCheck.overdue_invoices.total_amount)} دج</b>
        </div>
      )}

      {creditCheck.will_exceed && (
        <div style={{
          marginTop: 6, fontSize: 11, color: 'var(--red)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-ban" style={{ fontSize: 12 }} />
          هذا المستند سيتجاوز حد الائتمان — يتطلب موافقة المدير
        </div>
      )}
    </div>
  );
}
