// pages/portal/orders-admin/components/OrderDetailModal.tsx
// Order detail modal: customer, pipeline, lines (read-only or editor), totals, notes, history, convert result.
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import OrderPipeline from '../../OrderPipeline';
import type { AdminOrderDetailState } from '../hooks/useAdminOrderDetail';
import OrderDetailFooter from './OrderDetailFooter';
import OrderCustomerSection from './OrderCustomerSection';
import OrderItemsTable from './OrderItemsTable';
import OrderLinesEditorSection from './OrderLinesEditorSection';
import OrderTotalsSection from './OrderTotalsSection';
import OrderHistorySection from './OrderHistorySection';
import ConvertResultSection from './ConvertResultSection';

export default function OrderDetailModal(props: AdminOrderDetailState) {
  const {
    editing,
    startEditing,
    detailId,
    convertResult,
    detail,
    order,
    canEdit,
    closeDetail,
  } = props;

  return (
    <Modal
      open={!!detailId}
      onClose={closeDetail}
      title="تفاصيل طلب"
      subtitle={order?.reference}
      size="lg"
      className="poa-modal"
      footerLeft={!editing && canEdit && (
        <Button variant="outline" size="sm" icon={<i className="ti ti-edit" />} onClick={startEditing}>
          تحرير الطلب
        </Button>
      )}
      footer={<OrderDetailFooter {...props} />}
    >
      {detail.isLoading ? (
        <div className="poa-hint poa-hint--pad">جاري التحميل...</div>
      ) : order ? (
        <div className="poa-col">
          {/* ── الزبون ─────────────────────────────────────────────── */}
          <OrderCustomerSection {...props} order={order} />

          {/* ── المسار ──────────────────────────────────────────────── */}
          <div className="poa-sec poa-sec--tight">
            <OrderPipeline status={order.status} />
          </div>

          {/* ── المنتجات ─────────────────────────────────────────────── */}
          {!editing && (
            <OrderItemsTable {...props} order={order} />
          )}

          {/* ── محرر المنتجات ───────────────────────────────────────── */}
          {editing && (
            <OrderLinesEditorSection {...props} order={order} />
          )}

          {/* ── الإجماليات ──────────────────────────────────────────── */}
          <OrderTotalsSection {...props} order={order} />

          {/* ── ملاحظات الزبون ──────────────────────────────────────── */}
          {order.notes && (
            <div className="poa-sec poa-sec--goldbg">
              <div className="poa-sec-t poa-sec-t--gold"><i className="ti ti-message" /> ملاحظات الزبون</div>
              <div className="poa-notes-txt">{order.notes}</div>
            </div>
          )}

          {/* ── سجل الحالات ─────────────────────────────────────────── */}
          <OrderHistorySection {...props} order={order} />

          {/* ── نتيجة التحويل ───────────────────────────────────────── */}
          {convertResult && (
            <ConvertResultSection {...props} order={order} convertResult={convertResult} />
          )}
        </div>
      ) : (
        <div className="poa-hint poa-hint--pad">الطلب غير موجود</div>
      )}
    </Modal>
  );
}
