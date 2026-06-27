// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalReceipt.tsx
//
// معاينة الإيصال قبل الطباعة — تستخدم ReceiptPreview من نظام تصميم القوالب
// لتطابق تام بين المعاينة والطباعة الفعلية
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ReceiptPreview } from '@/pages/settings/print-settings';
import type { ReceiptTemplate80mm, CompanyPreviewData, ReceiptLiveData } from '@/pages/settings/print-settings/types';

interface ProfessionalReceiptProps {
  template:  ReceiptTemplate80mm;
  company:   CompanyPreviewData | null;
  liveData:  ReceiptLiveData;
  onClose:   () => void;
  onPrint:   () => void;
  onNewSale: () => void;
}

export default function ProfessionalReceipt({
  template, company, liveData, onClose, onPrint, onNewSale,
}: ProfessionalReceiptProps) {
  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-md"
        style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="m-hd">
          <div>
            <div className="m-title">
              <i className="ti ti-receipt" style={{ color: 'var(--em)', marginLeft: 7 }} />
              معاينة الإيصال
            </div>
            {liveData.docNumber && (
              <div className="m-sub">رقم الفاتورة: {liveData.docNumber}</div>
            )}
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        <div
          className="m-body"
          style={{ flex: 1, overflowY: 'auto', padding: 16 }}
          id="pos-receipt-print"
        >
          <ReceiptPreview tpl={template} company={company} liveData={liveData} />
        </div>

        <div className="m-foot">
          <button className="btn btn-p" onClick={onNewSale} type="button">
            <i className="ti ti-plus" /> بيع جديد
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose} type="button">إغلاق</button>
          <button className="btn btn-p" onClick={onPrint} type="button">
            <i className="ti ti-printer" /> طباعة
          </button>
        </div>
      </div>
    </div>
  );
}
