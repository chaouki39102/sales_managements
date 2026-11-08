// pages/documents/quick-sale/QuickSaleTotalsBox.tsx
import { fmtDZD } from '@/lib/format';
import TotRow from './TotRow';
import type { QuickSaleTotals } from './quickSale.types';

export default function QuickSaleTotalsBox({ totals }: { totals: QuickSaleTotals }) {
  return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            padding: '12px 14px',
            borderRadius: 'var(--r2)',
            background: 'var(--bg2)',
            border: '1px solid var(--b1)',
          }}
        >
          <TotRow label="إجمالي HT" value={fmtDZD(totals.ht)} />
          <TotRow label="TVA" value={fmtDZD(totals.tva)} />
          {totals.stamp > 0 && (
            <TotRow label="الطابع الجبائي" value={fmtDZD(totals.stamp)} color="var(--gold)" />
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
              marginTop: 4,
              borderTop: '2px solid var(--b2)',
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            <span style={{ color: 'var(--t1)' }}>المستحق</span>
            <span
              style={{
                color: 'var(--em)',
                direction: 'ltr',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmtDZD(totals.netPay)} دج
            </span>
          </div>
        </div>
      </div>
  );
}
