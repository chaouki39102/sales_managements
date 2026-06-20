import React from 'react';
import { inputStyle, labelStyle } from './DocumentUIPrimitives';
import { fmtDZD, toNum } from '../utils/document.utils';
import type { PaymentTerm } from '../types/document.types';

interface PaymentTermsTableProps {
  terms:    PaymentTerm[];
  netToPay: number;
  disabled?: boolean;
  onChange: (terms: PaymentTerm[]) => void;
}

export function PaymentTermsTable({
  terms,
  netToPay,
  disabled = false,
  onChange,
}: PaymentTermsTableProps) {
  const update = (idx: number, patch: Partial<PaymentTerm>) => {
    const next = terms.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    const entry = next[idx];
    if (patch.percentage !== undefined && netToPay > 0) {
      entry.amount = Math.round((patch.percentage / 100) * netToPay * 100) / 100;
    } else if (patch.amount !== undefined && netToPay > 0) {
      entry.percentage = Math.round((patch.amount / netToPay) * 10000) / 100;
    }
    onChange(next);
  };

  const add = () => {
    onChange([...terms, { due_date: '', percentage: 0, amount: 0, notes: '' }]);
  };

  const remove = (idx: number) => {
    onChange(terms.filter((_, i) => i !== idx));
  };

  const totalPct = terms.reduce((s, t) => s + t.percentage, 0);
  const totalAmt = terms.reduce((s, t) => s + t.amount, 0);
  const isValid  = Math.abs(totalPct - 100) < 0.01;

  return (
    <div>
      {terms.length === 0 ? (
        <div style={{
          padding: 12, fontSize: 12, color: 'var(--t4)',
          background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 8,
        }}>
          لا توجد شروط دفع محددة.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                تاريخ الاستحقاق
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                النسبة %
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                المبلغ
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                ملاحظات
              </th>
              {!disabled && <th style={{ width: 32 }} />}
            </tr>
          </thead>
          <tbody>
            {terms.map((t, i) => {
              const isLast = i === terms.length - 1;
              const remainingPct = Math.max(0, Math.round((100 - totalPct) * 100) / 100);
              return (
              <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="date"
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px' }}
                    value={t.due_date}
                    disabled={disabled}
                    onChange={(e) => update(i, { due_date: e.target.value })}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="number" min={0} max={100} step={0.01}
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px', textAlign: 'center' }}
                    value={t.percentage || ''}
                    disabled={disabled}
                    onChange={(e) => update(i, { percentage: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td style={{ padding: '4px 6px', direction: 'ltr', textAlign: 'right' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min={0} step={0.01}
                      style={{ ...inputStyle(), fontSize: 11, padding: '4px 20px 4px 6px', textAlign: 'center' }}
                      value={t.amount || ''}
                      disabled={disabled}
                      onChange={(e) => update(i, { amount: parseFloat(e.target.value) || 0 })}
                    />
                    <span style={{
                      position: 'absolute', left: 6, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 9, color: 'var(--t4)', fontWeight: 600,
                      pointerEvents: 'none',
                    }}>دج</span>
                  </div>
                  {isLast && !disabled && remainingPct > 0.01 && (
                    <button
                      onClick={() => update(i, { percentage: remainingPct })}
                      style={{
                        display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--em)',
                        marginTop: 2, padding: 0, background: 'none',
                        border: 'none', cursor: 'pointer', textDecoration: 'underline',
                      }}
                    >
                      المبلغ المتبقي {fmtDZD(Math.round((remainingPct / 100) * netToPay * 100) / 100)}
                    </button>
                  )}
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="text"
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px' }}
                    value={t.notes ?? ''}
                    disabled={disabled}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    placeholder="ملاحظة..."
                  />
                </td>
                {!disabled && (
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <button
                      onClick={() => remove(i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--red)', padding: 2, fontSize: 14,
                      }}
                      title="حذف"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </td>
                )}
              </tr>
            );
            })}
            {/* صف الإجمالي */}
            <tr style={{ background: 'var(--bg3)', borderTop: '2px solid var(--b2)' }}>
              <td style={{ padding: '5px 8px', fontWeight: 700, color: 'var(--t3)' }}>الإجمالي</td>
              <td style={{
                padding: '5px 8px', fontWeight: 700, textAlign: 'center',
                color: isValid ? 'var(--green)' : 'var(--red)',
              }}>
                {totalPct.toFixed(2)}%
              </td>
              <td style={{
                padding: '5px 8px', fontWeight: 700, direction: 'ltr', textAlign: 'right',
                color: isValid ? 'var(--green)' : 'var(--red)',
              }}>
                {fmtDZD(totalAmt)} دج
              </td>
              <td colSpan={disabled ? 1 : 2} style={{ padding: '5px 8px' }}>
                {!isValid && (
                  <span style={{ color: 'var(--red)', fontSize: 11 }}>
                    <i className="ti ti-alert-triangle" style={{ marginLeft: 4, fontSize: 10 }} />
                    المجموع يجب أن يساوي 100% (حالياً {totalPct.toFixed(2)}%)
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {!disabled && (
        <button
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--r2)',
            border: '1px dashed var(--b3)', background: 'transparent',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget).style.borderColor = 'var(--em)';
            (e.currentTarget).style.color = 'var(--em)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget).style.borderColor = 'var(--b3)';
            (e.currentTarget).style.color = 'var(--t3)';
          }}
        >
          <i className="ti ti-plus" />
          إضافة قسط
        </button>
      )}
    </div>
  );
}
