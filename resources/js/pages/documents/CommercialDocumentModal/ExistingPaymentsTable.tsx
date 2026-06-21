import React from 'react';
import { fmtDZD, fmtDate } from '../utils/document.utils';
import type { PaymentEntry } from '../types/document.types';

export default function ExistingPaymentsTable({
  payments,
  paymentModes,
  treasuryAccountMap,
}: {
  payments: PaymentEntry[];
  paymentModes: Array<{ id: number; name: string }>;
  treasuryAccountMap: Map<number, { id: number; name: string; type: string }>;
}) {
  if (payments.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        padding: '6px 10px', fontSize: 10.5, fontWeight: 800,
        color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: 0.4,
        borderBottom: '1px solid var(--b1)', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-lock" style={{ fontSize: 11 }} />
        دفعات مُسجَّلة (للقراءة)
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--bg3)', color: 'var(--t4)',
        }}>
          {payments.length}
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
            {['طريقة الدفع', 'المبلغ', 'المرجع', 'التاريخ', 'الحساب'].map((h) => (
              <th key={h} style={{
                padding: '5px 8px', textAlign: 'right', fontSize: 10.5,
                fontWeight: 700, color: 'var(--t4)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((pay, idx) => {
            const mode = paymentModes.find((pm) => String(pm.id) === pay.payment_mode_id);
            const taId = pay.treasury_account_id ? parseInt(String(pay.treasury_account_id)) : null;
            const ta = taId ? treasuryAccountMap.get(taId) : null;
            return (
              <tr key={idx} style={{ borderBottom: '1px solid var(--b1)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--t2)' }}>
                  {mode?.name ?? `#${pay.payment_mode_id}`}
                </td>
                <td style={{
                  padding: '6px 8px', fontWeight: 700, color: 'var(--green)',
                  direction: 'ltr', textAlign: 'right',
                }}>
                  {fmtDZD(pay.amount)} دج
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--t4)', fontSize: 11 }}>
                  {pay.reference || '—'}
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--t3)', fontSize: 11 }}>
                  {fmtDate(pay.payment_date)}
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--t4)', fontSize: 11 }}>
                  {ta ? `${ta.name}` : pay.treasury_account_id ? `#${pay.treasury_account_id}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
