// pages/portal/orders-admin/components/OrderDetailFooter.tsx
// Footer actions of the order detail modal (save edits / WhatsApp / convert / next status).
import Button from '@/components/ui/Button';
import { buildWhatsAppLink } from '@/lib/wa';
import { fmt, fmtDate, STATUS_META, NEXT_ACTION_LABEL, NEXT_ACTION_VARIANT } from '../ordersAdminUtils';
import type { AdminOrderDetailState } from '../hooks/useAdminOrderDetail';

export default function OrderDetailFooter(props: AdminOrderDetailState) {
  const {
    editing,
    setEditing,
    setDraft,
    saveLines,
    openWizard,
    openConvert,
    busyTarget,
    linesMut,
    order,
    convertable,
    handleGuardedStatus,
  } = props;

  return (
    editing ? (
      <>
        <Button variant="secondary" onClick={() => { setEditing(false); setDraft([]); }} disabled={linesMut.isPending}>
          إلغاء
        </Button>
        <Button variant="primary" icon={<i className="ti ti-device-floppy" />} loading={linesMut.isPending} onClick={saveLines}>
          حفظ المنتجات
        </Button>
      </>
    ) : (
      <>
        {(() => {
          const phone = String(order?.party?.phone ?? order?.customer_phone ?? '');
          const msg = order ? [
            'السلام عليكم،',
            `طلبك رقم ${order.reference} — ${order.status_label}`,
            `التاريخ: ${fmtDate(order.requested_at)}`,
            `عدد الأصناف: ${order.items_count}`,
            `المجموع: ${fmt(order.total_ttc)} دج`,
          ].join('\n') : '';
          const waLink = buildWhatsAppLink(phone, msg);
          return waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" icon={<i className="ti ti-brand-whatsapp" />} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}>
                إرسال على واتساب
              </Button>
            </a>
          ) : null;
        })()}
        {convertable && (
          <Button
            variant="primary"
            icon={<i className="ti ti-file-invoice" />}
            onClick={openConvert}
            className="poa-btn-gold"
          >
            تحويل إلى فاتورة
          </Button>
        )}
        {(order?.allowed_next ?? []).map((target) => {
          const meta = STATUS_META[target];
          const onClick = target === 'processed' ? openWizard : () => handleGuardedStatus(target);
          return (
            <Button
              key={target}
              variant={NEXT_ACTION_VARIANT[target]}
              icon={<i className={`ti ${meta.icon}`} />}
              loading={busyTarget === target}
              onClick={onClick}
            >
              {NEXT_ACTION_LABEL[target] ?? meta.label}
            </Button>
          );
        })}
      </>
    )
  );
}
