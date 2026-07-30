import { fmtDZD } from '../utils/document.utils';
import type { DocumentTotals } from '../types/document.types';

interface DocumentStickyTotalsBarProps {
  totals: DocumentTotals;
  payments: Array<unknown>;
  linesCount: number;
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DocumentStickyTotalsBar
 * ─────────────────────────────────────────────────────────────────────────
 * ✅ يحل مشكلة هيكلية حقيقية: DocumentTotalsSection الكاملة تجلس في آخر
 * عمود تمرير طويل (بعد الأسطر والدفعات) — أثناء إضافة أصناف كثيرة، المستخدم
 * لا يرى الإجمالي إطلاقاً بدون نزول للأسفل في كل مرة. هذا الشريط يبقى
 * ظاهراً دائماً (خارج منطقة التمرير، مثل .grand-bar في سلة الـPOS تماماً)
 * ويعرض فقط الرقم الأهم، مع رابط "التفاصيل ▲" ينزلق لأسفل الصفحة لعرض
 * DocumentTotalsSection الكاملة (HT/TVA/الطابع...) عند الحاجة الفعلية له.
 * ═══════════════════════════════════════════════════════════════════════
 */
export default function DocumentStickyTotalsBar({
  totals, payments, linesCount,
}: DocumentStickyTotalsBarProps) {
  if (linesCount === 0) return null;

  const hasPayments = payments.length > 0;
  const remaining   = totals.remaining;

  const scrollToDetails = () => {
    document.getElementById('doc-totals-anchor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '9px 20px',
      background: 'color-mix(in srgb, var(--em) 6%, var(--bg2))',
      borderTop: '1px solid color-mix(in srgb, var(--em) 20%, transparent)',
    }}>
      <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>{linesCount} سطر</span>

      <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--b2)' }} />

      <span style={{ fontSize: 12, color: 'var(--t3)' }}>الإجمالي TTC</span>
      <strong style={{ fontSize: 18, fontWeight: 900, color: 'var(--em)', fontVariantNumeric: 'tabular-nums' }}>
        {fmtDZD(totals.netToPay)} دج
      </strong>

      {hasPayments && (
        <>
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--b2)' }} />
          <span style={{ fontSize: 12, color: 'var(--t3)' }}>المتبقي</span>
          <strong style={{
            fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            color: remaining > 0.01 ? 'var(--red)' : 'var(--green)',
          }}>
            {fmtDZD(remaining)} دج
          </strong>
        </>
      )}

      <button
        onClick={scrollToDetails}
        style={{
          marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--t4)', fontSize: 11, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        التفاصيل <i className="ti ti-chevron-up" style={{ fontSize: 11 }} />
      </button>
    </div>
  );
}
