// pages/documents/quick-sale/QuickSaleSuccessBanner.tsx
import { fmtDZD } from '@/lib/format';
import type { SuccessState } from './quickSale.types';

export default function QuickSaleSuccessBanner({ success }: { success: SuccessState }) {
  return (
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--r2)',
          background: 'var(--greenb)',
          border: '1px solid var(--green)',
          color: 'var(--green)',
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="ti ti-check-circle" />
          {success.offline
            ? <>أُضيفت الفاتورة إلى قائمة الانتظار — سيُحفظ عند توفر الاتصال ({success.document_number})</>
            : <>تم إنشاء الفاتورة {success.document_number}</>}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
          <span>
            المستحق: <b>{fmtDZD(success.net_to_pay)} دج</b>
          </span>
          {success.paid > 0 && (
            <span>
              المدفوع: <b>{fmtDZD(success.paid)} دج</b>
            </span>
          )}
          {success.remaining > 0 && (
            <span>
              المتبقي: <b style={{ color: 'var(--red)' }}>{fmtDZD(success.remaining)} دج</b>
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>سيُغلق تلقائياً...</div>
      </div>
  );
}
