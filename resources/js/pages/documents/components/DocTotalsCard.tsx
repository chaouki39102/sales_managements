import type { DocumentTotals } from '../types/document.types';
import { fmtDZD } from '../utils/document.utils';

interface DocTotalsCardProps {
  totals: DocumentTotals;
  isPurchase: boolean;
  isEdit: boolean;
  payments: Array<unknown>;
}

/**
 * بطاقة الإجماليات المدمجة (نمط POS Pro) — تعرض الأرقام الرئيسية في بطاقة واحدة
 * ضيقة أعلى الصفحة بجانب بطاقة المتعامل، بدل القسم الكامل السابق.
 */
export default function DocTotalsCard({ totals, isPurchase, isEdit, payments }: DocTotalsCardProps) {
  const showPaymentsBlock = payments.length > 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '10px 12px',
      background: 'var(--bg2)', border: '1px solid var(--b1)',
      borderRadius: 'var(--r3)', height: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: 0.2,
        }}>
          <i className="ti ti-calculator" style={{ fontSize: 12 }} />
          {isPurchase ? 'الإجماليات' : 'الإجماليات'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--t4)' }}>{isPurchase ? 'مشتريات' : 'مبيعات'}</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        background: 'var(--em)', color: '#fff', borderRadius: 'var(--r2)',
        padding: '10px 12px', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.92 }}>
          صافي المستحق
        </span>
        <span style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', direction: 'ltr' as const }}>
          {fmtDZD(totals.netToPay)} دج
        </span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--t3)',
      }}>
        <span>إجمالي HT</span>
        <span style={{ fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' as const }}>
          {fmtDZD(totals.ht)} دج
        </span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--t3)',
      }}>
        <span>الخصم</span>
        <span style={{ fontWeight: 700, color: totals.discount > 0.004 ? 'var(--red)' : 'var(--t1)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' as const }}>
          {fmtDZD(totals.discount)} دج
        </span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--t3)',
      }}>
        <span>TVA</span>
        <span style={{ fontWeight: 700, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' as const }}>
          {fmtDZD(totals.tva)} دج
        </span>
      </div>
      {totals.stamp > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--t3)',
        }}>
          <span>الطابع الجبائي</span>
          <span style={{ fontWeight: 700, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' as const }}>
            {fmtDZD(totals.stamp)} دج
          </span>
        </div>
      )}
      <div style={{ flex: 1 }} />
      {showPaymentsBlock ? (
        <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', justifyContent: 'space-between' }}>
          <span>المدفوع</span>
          <b style={{ color: 'var(--green)', direction: 'ltr' as const }}>{fmtDZD(totals.totalPaid)} دج</b>
        </div>
      ) : (
        <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>
          {isEdit ? '' : 'لم تُسجَّل أي دفعة بعد'}
        </div>
      )}
    </div>
  );
}
