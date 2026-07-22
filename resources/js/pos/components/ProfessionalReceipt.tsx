// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalReceipt.tsx
//
// معاينة الإيصال قبل الطباعة — تستخدم UniversalPrintPipeline
// لتطابق تام بين المعاينة والطباعة الفعلية
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import UniversalPrintPipeline from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { PrintTemplate, CompanyData } from '@/pages/settings/print-settings/types';

interface Props {
  template: PrintTemplate;
  company:  CompanyData | null;
  source:   PipelineSource;
  docNumber?: string;
  onClose:   () => void;
  onPrint:   () => void;
  onNewSale: () => void;
}

export default function ProfessionalReceipt({
  template, company, source, docNumber, onClose, onPrint, onNewSale,
}: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault();
        onPrint();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPrint, onClose]);

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
            {docNumber && (
              <div className="m-sub">رقم الفاتورة: {docNumber}</div>
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
          <UniversalPrintPipeline source={source} template={template} company={company} />
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
