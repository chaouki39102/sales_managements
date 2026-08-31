import type { DocumentTotals } from '../types/document.types';
import { fmtDZD } from '../utils/document.utils';

interface DocTotalsCardProps {
  totals: DocumentTotals;
  isEdit: boolean;
}

/**
 * بطاقة الإجماليات — مطابقة تماماً لبطاقة POS Pro (`.pp-total-card`):
 * صافي المستحق كرقم ضخم، شرائح الدفع، وتفصيل HT / الخصم / TVA / الطابع الجبائي.
 */
export default function DocTotalsCard({ totals, isEdit }: DocTotalsCardProps) {
  const net = totals.netToPay ?? totals.ttc + totals.stamp;
  const hasPayments = totals.totalPaid > 0.004;

  return (
    <div className="pp-total-card">
      <div className="pp-total-label">
        <i className="ti ti-cash" />
        صافي المستحق
      </div>
      <div className="pp-total-value" dir="ltr">{fmtDZD(net)}</div>
      <div className="pp-total-meta">
        {hasPayments ? (
          <>
            <span><i className="ti ti-wallet" /> المدفوع {fmtDZD(totals.totalPaid)}</span>
            <span className="pp-total-disc"><i className="ti ti-alert-circle" /> متبقّي {fmtDZD(totals.remaining)}</span>
          </>
        ) : (
          <span>{isEdit ? 'لا توجد دفعات مسجلة' : 'لم تُسجَّل أي دفعة بعد'}</span>
        )}
      </div>
      <div className="pp-total-breakdown">
        <div><span>المجموع HT</span><strong dir="ltr">{fmtDZD(totals.ht)}</strong></div>
        <div><span>الخصم</span><strong dir="ltr">-{fmtDZD(totals.discount)}</strong></div>
        <div><span>TVA</span><strong dir="ltr">{fmtDZD(totals.tva)}</strong></div>
        <div><span>الطابع الجبائي</span><strong dir="ltr">{fmtDZD(totals.stamp)}</strong></div>
      </div>
    </div>
  );
}
