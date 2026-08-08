import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import UniversalPrintPipeline from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { PrintTemplate, CompanyData } from '@/pages/settings/print-settings/types';
import { exportSourceToPdf } from '@/pages/settings/print-settings/runtime/exportPdf';

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
  const [pdfBusy, setPdfBusy] = useState(false);

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

  const handlePdf = useCallback(async () => {
    if (pdfBusy) return;
    const safe = String(docNumber || 'receipt').replace(/[/\\:*?"<>|]/g, '-');
    setPdfBusy(true);
    try {
      await exportSourceToPdf({ source, template, company, filename: `${safe}.pdf` });
    } catch (err) {
      console.error('PDF export failed', err);
    } finally {
      setPdfBusy(false);
    }
  }, [source, template, company, docNumber, pdfBusy]);

  return (
    <Modal
      open
      onClose={onClose}
      title={<><i className="ti ti-receipt text-em ml-2" /> معاينة الإيصال</>}
      subtitle={docNumber ? `رقم الفاتورة: ${docNumber}` : undefined}
      size="md"
      footer={
        <>
          <button className="btn btn-p" onClick={onNewSale} type="button">
            <i className="ti ti-plus" /> بيع جديد
          </button>
          <div className="flex-1" />
          <button className="btn btn-b" onClick={handlePdf} disabled={pdfBusy} type="button">
            <i className="ti ti-file-download" /> {pdfBusy ? 'جاري التصدير…' : 'PDF'}
          </button>
          <button className="btn" onClick={onClose} type="button">إغلاق</button>
          <button className="btn btn-p" onClick={onPrint} type="button">
            <i className="ti ti-printer" /> طباعة
          </button>
        </>
      }
    >
      <div className="pr-receipt-body" id="pos-receipt-print">
        <UniversalPrintPipeline source={source} template={template} company={company} />
      </div>
    </Modal>
  );
}
