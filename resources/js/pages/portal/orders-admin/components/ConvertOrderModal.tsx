// pages/portal/orders-admin/components/ConvertOrderModal.tsx
// Convert-to-invoice modal (FV/POS + optional payment).
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { fmt } from '../ordersAdminUtils';
import type { AdminOrderDetailState } from '../hooks/useAdminOrderDetail';

export default function ConvertOrderModal(props: AdminOrderDetailState) {
  const {
    convertOpen,
    setConvertOpen,
    convertTarget,
    setConvertTarget,
    payEnabled,
    setPayEnabled,
    payModeId,
    setPayModeId,
    payAmount,
    setPayAmount,
    payDate,
    setPayDate,
    payReference,
    setPayReference,
    convert,
    paymentModes,
    doConvert,
    order,
  } = props;

  return (
    <Modal
      open={convertOpen}
      onClose={() => {
        if (!convert.isPending) setConvertOpen(false);
      }}
      title="تحويل الطلب إلى فاتورة"
      subtitle={order?.reference ? `إنشاء مستند البيع — ${order.reference}` : undefined}
      size="sm"
      className="poa-modal"
      footer={
        <>
          <Button variant="secondary" onClick={() => setConvertOpen(false)} disabled={convert.isPending}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            icon={<i className="ti ti-file-invoice" />}
            loading={convert.isPending}
            onClick={doConvert}
            className="poa-btn-gold"
          >
            تحويل الآن
          </Button>
        </>
      }
    >
      <div className="poa-col">
        {/* ── ملخص إجماليات الطلب قبل التحويل ─────────────────────── */}
        {order && (
          <div className="poa-cv-sum">
            <div><i className="ti ti-box" /> المنتجات <b>{order.items_count}</b></div>
            <div><i className="ti ti-percentage" /> الخصم <b>{fmt(order.total_discount ?? 0)}</b></div>
            <div><i className="ti ti-coin" /> إجمالي HT <b>{fmt(order.total_ht ?? 0)}</b></div>
            <div><i className="ti ti-cash" /> TVA <b>{fmt(order.total_tva ?? 0)}</b></div>
            <div className="poa-cv-total"><i className="ti ti-wallet" /> الصافي للدفع <b>{fmt(order.total_ttc ?? 0)} دج</b></div>
          </div>
        )}

        {/* ── اختيار نوع مستند البيع ───────────────────────────────── */}
        <div className="poa-grid2">
          <button type="button" className={`poa-cv-t${convertTarget === 'FV' ? ' on' : ''}`} onClick={() => setConvertTarget('FV')}>
            <i className="ti ti-file-invoice" />
            <b>فاتورة بيع (FV)</b>
            <span>مستند بيع محاسبي كامل</span>
          </button>
          <button type="button" className={`poa-cv-t${convertTarget === 'POS' ? ' on' : ''}`} onClick={() => setConvertTarget('POS')}>
            <i className="ti ti-device-mobile" />
            <b>فاتورة POS</b>
            <span>مستند نقطة البيع</span>
          </button>
        </div>

        <div className="poa-hint">
          <i className="ti ti-info-circle" />
          التحويل يُنشئ مستند بيع يُفعِّل حركة المخزون والطابع الجبائي وقيود الرصيد — مرة واحدة فقط ولا يمكن التراجع.
          {order && order.status !== 'delivered' ? ' الوضع يقفز إلى «تم التسليم».' : ''}
        </div>

        {/* ── دفعة اختيارية ─────────────────────────────────────────── */}
        <label className="poa-check-lbl">
          <input type="checkbox" checked={payEnabled} onChange={(e) => {
            const on = e.target.checked;
            setPayEnabled(on);
            if (on && !payAmount && order) setPayAmount(String(Math.round(order.total_ttc * 100) / 100));
          }} />
          تسجيل دفعة الآن (اختياري)
        </label>

        {payEnabled && order && (() => {
          const net = Number(order.total_ttc) || 0;
          const amt = Number(payAmount) || 0;
          const rem = net - amt;
          const overpay = amt > 0 && rem < 0;
          return (
            <div className="poa-col10">
              <div className="poa-select">
                <i className="ti ti-credit-card" />
                <select value={payModeId} onChange={(e) => setPayModeId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">— اختر طريقة الدفع —</option>
                  {(paymentModes.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="poa-row-end">
                <div className="poa-field">
                  <label className="poa-field-lbl">المبلغ (دج)</label>
                  <input
                    type="number" min={0.01} step="any"
                    className="poa-alloc poa-alloc--full"
                    value={payAmount}
                    placeholder="مبلغ الدفعة"
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <div className="poa-date">
                  <i className="ti ti-calendar" />
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <div className="poa-row-center">
                <button
                  type="button"
                  className="poa-cv-full"
                  onClick={() => setPayAmount(String(Math.round(net * 100) / 100))}
                >
                  <i className="ti ti-coins" /> المبلغ كاملاً
                </button>
                <span className={`poa-cv-rem${overpay ? ' over' : amt > 0 ? ' ok' : ''}`}>
                  <i className={`ti ${overpay ? 'ti-alert-triangle' : 'ti-scale'}`} />
                  {amt > 0
                    ? (overpay
                        ? `تنبيه: المبلغ أكبر من الصافي — الزيادة ${fmt(Math.abs(rem))} دج`
                        : `المتبقي بعد الدفعة: ${fmt(rem)} دج`)
                    : 'المتبقي بعد الدفعة: كامل الصافي (أدخل المبلغ)'}
                </span>
              </div>
              <input
                type="text"
                className="poa-alloc poa-alloc--full"
                placeholder="مرجع الدفعة (اختياري)"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
              />
            </div>
          );
        })()}
      </div>
    </Modal>
  );
}
