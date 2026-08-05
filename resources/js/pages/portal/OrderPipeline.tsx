// ════════════════════════════════════════════════════════════════════════════
// pages/portal/OrderPipeline.tsx — خط أنابيب طلبات البوابة (عرض إبداعي)
//
// المسار الرئيسي: قيد الاعداد → مؤكد → تم المعالجة → الشحن → تم التسليم
// + فرع جانبي: مرتجع (بعد التسليم) / ملغى (قبل التأكيد).
//
// يُستخدم في 3 أماكن:
//   - بوابة الزبائن: داخل تفاصيل الطلب المفتوح (حالة طلب واحد)
//   - لوحة الإدارة: داخل نافذة تفاصيل الطلب (حالة طلب واحد + الخطوة التالية)
//   - لوحة الإحصائيات: ملخص الأعداد لكل مرحلة (counts + summary)
// ════════════════════════════════════════════════════════════════════════════
import { Fragment } from 'react';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';
import { PORTAL_ORDER_PIPELINE } from '@/lib/api/endpoints/portalOrders';

export { PORTAL_ORDER_PIPELINE };

interface OrderPipelineProps {
  status: PortalOrderStatus;
  /** أعداد لكل مرحلة — تعرض شارة عدّاد تحت كل خطوة (لوحة الإحصائيات). */
  counts?: Partial<Record<PortalOrderStatus, number>>;
  /** وضع الملخص: لا توجد خطوة "حالية" — كل المراحل محايدة بأعدادها. */
  summary?: boolean;
  /** عند النقر على خطوة (لوحة الإحصائيات). */
  onStepClick?: (status: PortalOrderStatus) => void;
}

export default function OrderPipeline({ status, counts, summary = false, onStepClick }: OrderPipelineProps) {
  const isReturned   = status === 'returned';
  const isCancelled  = status === 'cancelled';
  const isCompleted  = status === 'completed';
  const idx = PORTAL_ORDER_PIPELINE.findIndex((s) => s.value === status);

  // الخطوة الرئيسية الحالية: مرتجع = استوفى كامل المسار، ملغى = توقف عند قيد الاعداد،
  // مكتمل (قيمة قديمة من التحويل) = استوفى كامل المسار بدون فرع.
  const mainIdx = isCompleted ? PORTAL_ORDER_PIPELINE.length : isReturned ? PORTAL_ORDER_PIPELINE.length - 1 : isCancelled ? 0 : idx;
  const branch = isReturned || isCancelled ? status : null;

  const stateOf = (i: number): string => {
    if (summary) return 'sum';
    if (i < mainIdx || isReturned) return 'done';
    if (i === mainIdx) return 'now';
    return 'next';
  };

  return (
    <div className={`opipe${branch ? ` opipe--${branch}` : ''}${summary ? ' opipe--summary' : ''}`}>
      {PORTAL_ORDER_PIPELINE.map((step, i) => {
        const count = counts?.[step.value] ?? 0;
        return (
          <Fragment key={step.value}>
            <div
              className={`opipe-step ${stateOf(i)}`}
              onClick={onStepClick ? () => onStepClick(step.value) : undefined}
              role={onStepClick ? 'button' : undefined}
              tabIndex={onStepClick ? 0 : undefined}
              title={onStepClick ? step.label : undefined}
            >
              <div className="opipe-node">
                <i className={`ti ${step.icon}`} />
              </div>
              <div className="opipe-label">{step.label}</div>
              {counts && <div className={`opipe-count${count > 0 ? ' has' : ''}`}>{count}</div>}
            </div>
            {i < PORTAL_ORDER_PIPELINE.length - 1 && (
              <div className={`opipe-link ${!summary && (i < mainIdx || isReturned) ? 'done' : ''}`} />
            )}
          </Fragment>
        );
      })}

      {branch ? (
        <div className={`opipe-branch ${branch}`}>
          <i className={`ti ${branch === 'cancelled' ? 'ti-x' : 'ti-rotate-clockwise'}`} />
          {branch === 'cancelled' ? 'ملغى' : 'مرتجع'}
          {counts ? <b className="opipe-branch-count">{counts[branch] ?? 0}</b> : null}
        </div>
      ) : null}

      {!branch && counts ? (
        <>
          <div className="opipe-branch opipe-branch--passive">
            <i className="ti ti-rotate-clockwise" />
            مرتجع
            <b className="opipe-branch-count">{counts.returned ?? 0}</b>
          </div>
          <div className="opipe-branch opipe-branch--passive">
            <i className="ti ti-x" />
            ملغى
            <b className="opipe-branch-count">{counts.cancelled ?? 0}</b>
          </div>
        </>
      ) : null}
    </div>
  );
}
