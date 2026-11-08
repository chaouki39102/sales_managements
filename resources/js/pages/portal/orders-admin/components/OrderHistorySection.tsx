// pages/portal/orders-admin/components/OrderHistorySection.tsx
// Status history timeline, always shown in pipeline order.
import Badge from '@/components/ui/Badge';
import { fmtDateTime, stMeta, sortByPipeline } from '../ordersAdminUtils';
import type { WithLoadedOrder } from '../hooks/useAdminOrderDetail';

export default function OrderHistorySection(props: WithLoadedOrder) {
  const {
    order,
  } = props;

  return (
    <div className="poa-sec">
      <div className="poa-sec-t"><i className="ti ti-history" /> سجل الحالات</div>
      <div className="poa-tl">
        {[...(order.histories ?? [])].sort(sortByPipeline).map((h) => (
          <div
            key={h.id}
            className={`poa-tl-item ${h.status === 'cancelled' || h.status === 'returned' ? 'bad' : h.status === 'delivered' ? 'done' : ''}`}
          >
            <div className="poa-tl-who">
              <Badge variant={stMeta(h.status).badge} noDot>{stMeta(h.status).label}</Badge>
              <span className="poa-tl-by">
                بواسطة {h.changed_by_name ?? (h.changed_by === 'customer' ? 'الزبون' : 'المسؤول')}
              </span>
            </div>
            {h.note && <div className="poa-tl-note">{h.note}</div>}
            <div className="poa-tl-time">{fmtDateTime(h.created_at)}</div>
          </div>
        ))}
        {(order.histories?.length ?? 0) === 0 && (
          <div className="poa-hint">لا يوجد سجل بعد</div>
        )}
      </div>
    </div>
  );
}
