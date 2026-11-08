// pages/documents/quick-sale/QuickSaleFooter.tsx
import { fmtDZD } from '@/lib/format';
import type { QuickLine, QuickSaleTotals, SuccessState } from './quickSale.types';

interface QuickSaleFooterProps {
  lines: QuickLine[];
  totals: QuickSaleTotals;
  isPending: boolean;
  success: SuccessState | null;
  onClose: () => void;
  handleSave: () => void;
}

export default function QuickSaleFooter({ lines, totals, isPending, success, onClose, handleSave }: QuickSaleFooterProps) {
  return (
    <div
      style={{
        padding: '12px 18px',
        borderTop: '1px solid var(--b1)',
        background: 'var(--bg2)',
        display: 'flex',
        gap: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '0 0 var(--r3) var(--r3)',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--t4)' }}>
        {lines.length > 0 && (
          <span>
            {lines.length} منتج ·{' '}
            <span style={{ fontWeight: 700, color: 'var(--em)' }}>
              {fmtDZD(totals.netPay)} دج
            </span>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onClose}
          disabled={isPending}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)',
            background: 'var(--bg1)',
            color: 'var(--t2)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          إلغاء
        </button>
        <button
          onClick={handleSave}
          disabled={isPending || !!success}
          style={{
            padding: '8px 22px',
            borderRadius: 'var(--r2)',
            border: 'none',
            background: success
              ? 'var(--green)'
              : 'linear-gradient(135deg, var(--em), color-mix(in srgb, var(--em) 70%, var(--blue)))',
            color: 'white',
            cursor: isPending || !!success ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? (
            <>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
              الحفظ...
            </>
          ) : success ? (
            <>
              <i className="ti ti-check" /> تم الحفظ
            </>
          ) : (
            <>
              <i className="ti ti-bolt" /> تأكيد البيع (F8)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
