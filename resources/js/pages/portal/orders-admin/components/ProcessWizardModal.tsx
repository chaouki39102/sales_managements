// pages/portal/orders-admin/components/ProcessWizardModal.tsx
// Process wizard modal: distribute ordered quantities over available stock.
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { fmt } from '../ordersAdminUtils';
import type { AdminOrderDetailState } from '../hooks/useAdminOrderDetail';

export default function ProcessWizardModal(props: AdminOrderDetailState) {
  const {
    wizardOpen,
    setWizardOpen,
    allocs,
    setAllocs,
    fitOf,
    wizTotals,
    saveProcess,
    linesMut,
    order,
  } = props;

  return (
    <Modal
      open={wizardOpen}
      onClose={() => setWizardOpen(false)}
      title="معالجة الطلب"
      subtitle={order?.reference ? `توزيع الكميات على المخزون — ${order.reference}` : undefined}
      size="lg"
      className="poa-modal"
      footer={
        <>
          <Button variant="secondary" onClick={() => setWizardOpen(false)} disabled={linesMut.isPending}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            icon={<i className="ti ti-settings" />}
            loading={linesMut.isPending}
            onClick={saveProcess}
          >
            إكمال المعالجة وتوزيع الكميات
          </Button>
        </>
      }
    >
      <div className="poa-col">
        {/* ── مقياس الجاهزية ───────────────────────────────────────── */}
        <div className="poa-proc-hd">
          <div className="poa-proc-gauge-wrap">
            <div className={`poa-proc-gauge${wizTotals.pct >= 100 && !wizTotals.anyBad ? ' done' : wizTotals.anyBad ? ' bad' : ''}`}>
              <span style={{ width: `${wizTotals.pct}%` }} />
            </div>
            <div className="poa-proc-meta">
              <span>مطلوب <b>{fmt(wizTotals.orderedBase)}</b></span>
              <span>مُوزَّع <b>{fmt(wizTotals.allocBase)}</b></span>
              {wizTotals.anyBad && <span className="poa-proc-warn">⚠ كميات تتجاوز المخزون الكلي</span>}
              {!wizTotals.anyBad && wizTotals.anyWarn && <span className="poa-proc-info">ⓘ تُغطّى من مستودعات أخرى</span>}
            </div>
          </div>
          <div className="poa-proc-pct">{wizTotals.pct}%</div>
        </div>

        {/* ── صفوف المنتجات ────────────────────────────────────────── */}
        <div className="poa-proc-rows">
          {allocs.map((a, i) => {
            const need = Math.max(0, a.alloc || 0) * a.pack_qty;
            const orderedBase = a.ordered * a.pack_qty;
            const pct = orderedBase ? Math.min(100, Math.round((need / orderedBase) * 100)) : 0;
            const fit = fitOf(a);
            return (
              <div key={a.line_id} className="poa-proc-row">
                <div className="poa-grow">
                  <div className="poa-proc-name">{a.product_name}</div>
                  <div className="poa-proc-ref">{a.product_ref ?? ''}</div>
                </div>

                <span className="poa-chip" title="الكمية المطلوبة">
                  <i className="ti ti-basket" /> {a.ordered} {a.unit_name ?? ''}{a.pack_qty > 1 ? ` × ${a.pack_qty}` : ''}
                </span>

                <div className="poa-proc-qty">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={a.alloc}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      setAllocs((list) => list.map((x, xi) => (xi === i ? { ...x, alloc: Number.isFinite(q) ? q : 0 } : x)));
                    }}
                    className={`poa-alloc${fit === 'bad' ? ' bad' : ''}`}
                    title="الكمية الموزَّعة (0 تحذف المنتج)"
                  />
                  <span className="poa-stk-sub">{a.unit_name ?? ''}</span>
                </div>

                <div className={`poa-bar${fit === 'ok' ? ' ok' : fit === 'bad' ? ' bad' : ''}`}>
                  <span style={{ width: `${pct}%` }} />
                </div>

                <div className="poa-proc-stock">
                  {a.available === null ? (
                    <span className="na"><i className="ti ti-package-off" /> لا يدير مخزوناً</span>
                  ) : (
                    <>
                      <span className={fit === 'ok' || fit === 'part' ? 'ok' : 'bad'}>
                        <i className={`ti ${fit === 'bad' ? 'ti-alert-triangle' : 'ti-circle-check'}`} />
                        المستودع: {fmt(a.available)}
                      </span>
                      <span className={fit === 'bad' ? 'bad' : 'ok'}>
                        <i className="ti ti-box" /> إجمالاً: {fmt(a.available_all ?? 0)}
                      </span>
                    </>
                  )}
                  <span>مطلوب {fmt(a.required)}</span>
                </div>
              </div>
            );
          })}
          {allocs.length === 0 && (
            <div className="poa-hint poa-hint--pad20">لا توجد منتجات للمعالجة</div>
          )}
        </div>

        <div className="poa-hint">
          <i className="ti ti-info-circle" />
          الكمية 0 تحذف المنتج — التحقق من المخزون غير حاجز هنا، لكن التحويل إلى الفاتورة يتطلب كمية كافية.
        </div>
      </div>
    </Modal>
  );
}
