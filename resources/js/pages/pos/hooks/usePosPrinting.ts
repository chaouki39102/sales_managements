// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosPrinting.ts
//
// Receipt printing for POSPage: template (with POS receipt overrides),
// direct print (thermal WebUSB / spooler / browser) and re-print of a saved
// document from the session invoices.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useMemo } from 'react';
import { apiGet } from '@/lib/api/core/client';
import { usePrintSettings } from '@/pos/hooks/usePrintSettings';
import { usePosReceiptTemplate } from '@/pos/hooks/usePosReceiptTemplate';
import { printReceiptDirect } from '@/pos/utils/printUtils';
import { printThermalSmart, thermalPrintSuccessMessage } from '@/pos/utils/thermalPrint';
import { documentToPrintSnapshot } from '@/pos/utils/posSaleHelpers';
import { renderPreviewToHtml } from '@/pages/settings/print-settings/runtime/renderPreviewToHtml';
import { mapCompany } from '@/pages/settings/print-settings/runtime/PrintRuntimeAdapter';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { useActiveCompany } from '@/lib/store/appStore';
import type { CommercialDocument } from '@/types';

export function usePosPrinting(params: {
  slug: string | null;
  company: ReturnType<typeof useActiveCompany>;
  settings: POSSettings;
  safeToast: PosSafeToast;
}) {
  const { slug, company, settings, safeToast } = params;

  const { template, enabled: isPrintEnabled, copies: dbCopies, paperWidth }
    = usePrintSettings('POS');

  const copies = settings.printCopies || dbCopies;

  // Template with POS receipt overrides applied
  const posTemplate = usePosReceiptTemplate(template, settings);

  const companyData: CompanyPreviewData | null = useMemo(() => mapCompany(company), [company]);

  const handlePrintDirect = useCallback(async (
    snap: POSSaleSnapshot,
    opts?: { silent?: boolean },
  ) => {
    if (!posTemplate) { safeToast.error('لا يوجد قالب طاعة'); return; }
    try {
      const resolvedDocNum = snap.docNumber;
      const isThermalPaper = posTemplate.paper_size === '80mm' || posTemplate.paper_size === '58mm';

      // Silent mode (quick cash): thermal via WebUSB, fallback Windows spooler
      if (opts?.silent) {
        if (!resolvedDocNum) {
          safeToast.error('رقم الفاتورة غير متوفر للطباعة المباشرة');
          return;
        }
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalSmart(posTemplate, data, resolvedDocNum, slug);
        if (result.ok) {
          safeToast.success('✅ تمت الطباعة');
        } else {
          safeToast.error(`خطأ في الطباعة: ${result.message}`);
        }
        return;
      }

      if (settings.printMode === 'thermal' && resolvedDocNum && isThermalPaper) {
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalSmart(posTemplate, data, resolvedDocNum, slug);
        if (result.ok) {
          safeToast.success(`✅ ${thermalPrintSuccessMessage(result.method)}`);
        } else {
          safeToast.error(`خطأ في الطباعة الحرارية: ${result.message}`);
          const html = await renderPreviewToHtml({
            template: posTemplate,
            company: companyData,
            source: { type: 'pos-snapshot', snapshot: snap },
          });
          await printReceiptDirect({
            html, paperWidth, copies: copies ?? 1,
            onError: (e) => safeToast.error(`خطأ في طباعة المتصفح: ${e.message}`),
          });
        }
      } else {
        const html = await renderPreviewToHtml({
          template: posTemplate,
          company: companyData,
          source: { type: 'pos-snapshot', snapshot: snap },
        });
        await printReceiptDirect({
          html, paperWidth, copies,
          onDone:  () => safeToast.success('✅ تم إرسال الطباعة'),
          onError: (e) => safeToast.error(`خطأ في الطباعة: ${e.message}`),
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      safeToast.error(`خطأ في تجهيز الطباعة: ${message}`);
    }
    // NOTE: `slug` intentionally left out exactly as before this refactor.
  }, [posTemplate, safeToast, companyData, settings.printMode, paperWidth, copies]);

  const handlePrintDocument = useCallback(async (docId: number) => {
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,documentType,lines,lines.product,lines.product_variant,payments,payments.payment_mode',
      });
      if (!doc) { safeToast.error('لم يتم العثور على الفاتورة'); return; }
      const snap: POSSaleSnapshot = { ...documentToPrintSnapshot(doc), cashierName: undefined };
      await handlePrintDirect(snap);
    } catch (_e: unknown) {
      safeToast.error('فشل طباعة الفاتورة');
    }
  }, [handlePrintDirect, safeToast]);

  return { template, isPrintEnabled, posTemplate, companyData, handlePrintDirect, handlePrintDocument };
}
