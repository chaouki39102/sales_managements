// pages/portal/orders-admin/components/OrderTotalsSection.tsx
// Totals block (live totals while editing).
import { fmt } from '../ordersAdminUtils';
import type { WithLoadedOrder } from '../hooks/useAdminOrderDetail';

export default function OrderTotalsSection(props: WithLoadedOrder) {
  const {
    editing,
    draftTotals,
    order,
  } = props;

  return (
    <div className="poa-sec">
      <div className="poa-sec-t"><i className="ti ti-calculator" /> الإجماليات</div>
      <div className="poa-totals">
        <div className="poa-total">
          <div className="lbl">الزبون</div>
          <div className="val poa-val-sm">{order.party?.name ?? '—'}</div>
        </div>
        {(editing ? draftTotals.disc : order.total_discount ?? 0) > 0.004 && (
          <div className="poa-total">
            <div className="lbl">الخصم</div>
            <div className="val poa-val-gold">− {fmt(editing ? draftTotals.disc : order.total_discount ?? 0)} دج</div>
          </div>
        )}
        <div className="poa-total"><div className="lbl">المجموع HT</div><div className="val">{fmt(editing ? draftTotals.ht : order.total_ht)}</div></div>
        <div className="poa-total"><div className="lbl">TVA</div><div className="val">{fmt(editing ? draftTotals.tva : order.total_tva)}</div></div>
        <div className="poa-total em"><div className="lbl">المجموع TTC</div><div className="val">{fmt(editing ? draftTotals.ttc : order.total_ttc)} دج</div></div>
      </div>
      {editing && (
        <div className="poa-hint poa-hint--mt6">
          <i className="ti ti-calculator" /> إجماليات حيّة أثناء التعديل — تُحدَّث عند الحفظ
        </div>
      )}
    </div>
  );
}
