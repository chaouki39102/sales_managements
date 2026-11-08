// pages/documents/quick-sale/QuickSalePayment.tsx
// قسم الدفع الفوري (طريقة الدفع، الخزينة، المبلغ، التاريخ، المرجع)
import type React from 'react';
import { fmtDZD } from '@/lib/format';
import ErrMsg from './ErrMsg';
import { lblStyle, inpStyle } from './quickSale.styles';
import type { PaymentMode, TreasuryAccount, QuickSaleTotals, QuickPaymentState } from './quickSale.types';

interface QuickSalePaymentProps {
  totals: QuickSaleTotals;
  finalPayAmount: number;
  paymentLocal: QuickPaymentState;
  setPaymentLocal: React.Dispatch<React.SetStateAction<QuickPaymentState>>;
  paymentModes: PaymentMode[];
  treasuryAccounts: TreasuryAccount[];
  errors: Record<string, string>;
  isPending: boolean;
  fillFullAmount: () => void;
}

export default function QuickSalePayment({
  totals, finalPayAmount, paymentLocal, setPaymentLocal, paymentModes,
  treasuryAccounts, errors, isPending, fillFullAmount,
}: QuickSalePaymentProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--r2)',
        border: '1px solid var(--b2)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          background: 'var(--greenb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-check" style={{ fontSize: 12, color: 'white' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
            دفع فوري (نقدي)
          </span>
          {totals.netPay > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 8px',
                borderRadius: 99,
                background: 'var(--green)',
                color: 'white',
                fontWeight: 700,
              }}
            >
              {fmtDZD(finalPayAmount)} دج
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={lblStyle}>
              طريقة الدفع <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <select
              value={paymentLocal.payment_mode_id}
              onChange={e =>
                setPaymentLocal(p => ({ ...p, payment_mode_id: e.target.value }))
              }
              style={inpStyle()}
              disabled={isPending}
            >
              <option value="">— اختر —</option>
              {paymentModes.map(pm => (
                <option key={pm.id} value={String(pm.id)}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={lblStyle}>
              حساب الخزينة <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <select
              value={paymentLocal.treasury_account_id}
              onChange={e =>
                setPaymentLocal(p => ({ ...p, treasury_account_id: e.target.value }))
              }
              style={inpStyle(!!errors.treasury)}
              disabled={isPending}
            >
              <option value="">— اختر —</option>
              {treasuryAccounts.map(ta => (
                <option key={ta.id} value={String(ta.id)}>
                  {ta.name}
                  {ta.is_default ? ' ★' : ''}
                </option>
              ))}
            </select>
            {errors.treasury && <ErrMsg msg={errors.treasury} />}
          </div>
          <div>
            <div style={lblStyle}>
              المبلغ المدفوع
              <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>
                (0 = كامل المبلغ)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentLocal.amount || ''}
                placeholder={`${fmtDZD(totals.netPay)} (كامل)`}
                onChange={e =>
                  setPaymentLocal(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))
                }
                style={{ ...inpStyle(), flex: 1 }}
                disabled={isPending}
              />
              <button
                type="button"
                onClick={fillFullAmount}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--r2)',
                  border: '1px solid var(--b3)',
                  background: 'var(--bg2)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--em)',
                }}
              >
                الكل
              </button>
            </div>
          </div>
          <div>
            <div style={lblStyle}>تاريخ الدفع</div>
            <input
              type="date"
              value={paymentLocal.payment_date}
              onChange={e => setPaymentLocal(p => ({ ...p, payment_date: e.target.value }))}
              style={inpStyle()}
              disabled={isPending}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={lblStyle}>المرجع / رقم الشيك</div>
            <input
              type="text"
              value={paymentLocal.reference}
              placeholder="اختياري..."
              onChange={e => setPaymentLocal(p => ({ ...p, reference: e.target.value }))}
              style={inpStyle()}
              disabled={isPending}
            />
          </div>
        </div>

        {totals.netPay > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              padding: '8px 12px',
              borderRadius: 'var(--r2)',
              background: 'var(--bg2)',
              fontSize: 12,
            }}
          >
            <span>
              المستحق: <b>{fmtDZD(totals.netPay)} دج</b>
            </span>
            <span style={{ color: 'var(--green)' }}>
              المدفوع: <b>{fmtDZD(finalPayAmount)} دج</b>
            </span>
            {finalPayAmount < totals.netPay && (
              <span style={{ color: 'var(--red)' }}>
                المتبقي: <b>{fmtDZD(totals.netPay - finalPayAmount)} دج</b>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
