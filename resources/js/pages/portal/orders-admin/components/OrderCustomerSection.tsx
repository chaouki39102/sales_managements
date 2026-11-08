// pages/portal/orders-admin/components/OrderCustomerSection.tsx
// Customer card (registered party or guest) in the order detail modal.
import Badge from '@/components/ui/Badge';
import { buildWhatsAppLink } from '@/lib/wa';
import { fmtDate, stMeta, initialsOf } from '../ordersAdminUtils';
import type { WithLoadedOrder } from '../hooks/useAdminOrderDetail';

export default function OrderCustomerSection(props: WithLoadedOrder) {
  const {
    order,
  } = props;

  return (
    <div className="poa-sec">
      <div className="poa-cust-card">
        <span className="poa-avatar">{initialsOf(order.customer_name || order.party?.name)}</span>
        <span className="poa-cust-card-info">
          <span className="poa-cust-card-name">
            {order.customer_name || order.party?.name || '—'}
          </span>
          <span className="poa-cust-card-sub">
            أمر زبون {order.document?.document_number ?? ''} · أُرسل في {fmtDate(order.requested_at)}
          </span>
        </span>
        <Badge variant={stMeta(order.status).badge} className="poa-badge-auto">
          {order.status_label}
        </Badge>
      </div>

      {!!order.customer_name && (
        <div className="poa-guest-banner">
          <i className="ti ti-user-off" />
          <div>
            <b>زائر — غير مسجّل في البوابة</b>
            <span>أرسل الطلب بدون حساب وبدون تسجيل دخول — لا يظهر في لائحة زبائنك ولا يملك كشف حساب.</span>
          </div>
        </div>
      )}

      {!!order.customer_name ? (
        <div className="poa-cust-details">
          <div className="poa-cust-detail">
            <i className="ti ti-user" />
            <div>
              <span>الاسم الكامل</span>
              <b>{order.customer_name}</b>
            </div>
          </div>
          <div className="poa-cust-detail">
            <i className="ti ti-phone" />
            <div>
              <span>رقم الهاتف</span>
              {(() => {
                const wa = buildWhatsAppLink(order.customer_phone || '', '');
                return wa
                  ? <a href={wa} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366' }} title="واتساب"><b>{order.customer_phone || 'غير متوفر'}</b> <i className="ti ti-brand-whatsapp" style={{ fontSize: 10 }}/></a>
                  : <b>{order.customer_phone || 'غير متوفر'}</b>;
              })()}
            </div>
          </div>
          <div className="poa-cust-detail">
            <i className="ti ti-map-pin" />
            <div>
              <span>العنوان</span>
              <b>{order.customer_address || 'غير متوفر'}</b>
            </div>
          </div>
        </div>
      ) : (
        <div className="poa-chip-row">
          {order.party?.code && (
            <span className="poa-chip"><i className="ti ti-barcode" /> {order.party.code}</span>
          )}
          {order.party?.phone && (() => {
            const wa = buildWhatsAppLink(order.party.phone, '');
            return wa
              ? <a href={wa} target="_blank" rel="noopener noreferrer" className="poa-chip" style={{ color: '#25D366', textDecoration: 'none' }} title="واتساب"><i className="ti ti-brand-whatsapp" /> {order.party.phone}</a>
              : <span className="poa-chip"><i className="ti ti-phone" /> {order.party.phone}</span>;
          })()}
          {order.document?.document_date && (
            <span className="poa-chip"><i className="ti ti-calendar" /> بتاريخ {order.document.document_date}</span>
          )}
        </div>
      )}
    </div>
  );
}
