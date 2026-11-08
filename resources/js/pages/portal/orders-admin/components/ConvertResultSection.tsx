// pages/portal/orders-admin/components/ConvertResultSection.tsx
// Result card shown after converting the order into a sale document.
import Button from '@/components/ui/Button';
import { buildWhatsAppLink, waDocMessage } from '@/lib/wa';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { fmt, fmtDate } from '../ordersAdminUtils';
import type { WithLoadedOrder } from '../hooks/useAdminOrderDetail';

export default function ConvertResultSection(props: Omit<WithLoadedOrder, 'convertResult'> & { convertResult: NonNullable<WithLoadedOrder['convertResult']> }) {
  const {
    convertResult,
    order,
  } = props;

  return (
    <div className="poa-sec poa-sec--embg">
      <div className="poa-conv-title">
        <i className="ti ti-circle-check" />
        تم التحويل بنجاح — أمر الزبون أصبح مستند بيع
      </div>
      <div className="poa-conv-meta">
        <b className="poa-mono">{convertResult.document_number}</b>
        <span className="poa-chip"><i className="ti ti-file-invoice" /> {convertResult.document_type === 'POS' ? 'فاتورة POS' : 'فاتورة بيع (FV)'}</span>
        <span className="poa-hint"><i className="ti ti-calendar" /> {fmtDate(convertResult.document_date)}</span>
        <span className="poa-hint"><i className="ti ti-coins" /> الصافي للدفع <b>{fmt(convertResult.net_to_pay)} DZD</b></span>
        {convertResult.paid_amount > 0 && (
          <span className="poa-hint poa-hint--ok"><i className="ti ti-wallet" /> مدفوع <b>{fmt(convertResult.paid_amount)} DZD</b></span>
        )}
        {convertResult.remaining_amount > 0 && (
          <span className="poa-hint poa-hint--gold"><i className="ti ti-alert-triangle" /> باقي <b>{fmt(convertResult.remaining_amount)} DZD</b></span>
        )}
      </div>
      {(() => {
        const phone = String(order?.party?.phone ?? order?.customer_phone ?? '');
        if (!phone) return null;
        const handleClick = async () => {
          let shareUrl: string | null = null;
          try {
            const res = await documentsApi.share(convertResult.id);
            shareUrl = res.share_url;
          } catch { /* share not critical */ }
          const msg = waDocMessage({
            document_number: convertResult.document_number,
            document_date: convertResult.document_date,
            document_type_name: convertResult.document_type === 'POS' ? 'فاتورة POS' : 'فاتورة بيع',
            document_type_code: convertResult.document_type,
            party_name: order?.party?.name ?? order?.customer_name ?? null,
            total_ttc: convertResult.total_ttc,
            net_to_pay: convertResult.net_to_pay,
            paid_amount: convertResult.paid_amount,
            remaining_amount: convertResult.remaining_amount,
          }, shareUrl);
          const waLink = buildWhatsAppLink(phone, msg);
          if (waLink) window.open(waLink, '_blank', 'noopener,noreferrer');
        };
        return (
          <div className="mt-8">
            <Button size="sm" icon={<i className="ti ti-brand-whatsapp" />} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }} onClick={handleClick}>
              إرسال الفاتورة على واتساب
            </Button>
          </div>
        );
      })()}
    </div>
  );
}
