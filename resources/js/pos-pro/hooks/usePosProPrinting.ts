// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProPrinting.ts
//
// Printing for POSProPage: template with POS receipt overrides, direct print
// (thermal WebUSB / spooler / browser), print of the current cart as a draft
// receipt, and re-print of a saved document.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useMemo } from 'react';
import { apiGet } from '@/lib/api/core/client';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { usePrintSettings } from '@/pos/hooks/usePrintSettings';
import { usePosReceiptTemplate } from '@/pos/hooks/usePosReceiptTemplate';
import { printReceiptDirect } from '@/pos/utils/printUtils';
import { printThermalSmart, thermalPrintSuccessMessage } from '@/pos/utils/thermalPrint';
import { cartItemsToSnapshotItems, documentToPrintSnapshot, pickInvoiceType } from '@/pos/utils/posSaleHelpers';
import { renderPreviewToHtml } from '@/pages/settings/print-settings/runtime/renderPreviewToHtml';
import { mapCompany } from '@/pages/settings/print-settings/runtime/PrintRuntimeAdapter';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { useActiveCompany } from '@/lib/store/appStore';
import type { CommercialDocument, DocumentType } from '@/lib/api/core/types';
import type { PosProState } from './usePosProDiscounts';

export function usePosProPrinting(params: {
  slug: string | null;
  company: ReturnType<typeof useActiveCompany>;
  settings: POSSettings;
  safeToast: PosSafeToast;
  pos: PosProState;
  adjustedTotalTtcFinal: number;
  documentTypes: DocumentType[];
}) {
  const { slug, company, settings, safeToast, pos, adjustedTotalTtcFinal, documentTypes } = params;

  // ── الطباعة ──────────────────────────────────────────────────────────────
  const { template, enabled: isPrintEnabled, copies: dbCopies, paperWidth } = usePrintSettings('POS');
  const copies = settings.printCopies || dbCopies;

  const posTemplate = usePosReceiptTemplate(template, settings);

  const companyData: CompanyPreviewData | null = useMemo(() => mapCompany(company), [company]);

  const handlePrintDirect = useCallback(async (snap: POSSaleSnapshot, opts?: { silent?: boolean }) => {
    if (!posTemplate) { safeToast.error('لا يوجد قالب طاعة'); return; }
    try {
      const resolvedDocNum = snap.docNumber;
      const isThermalPaper = posTemplate.paper_size === '80mm' || posTemplate.paper_size === '58mm';

      if (opts?.silent) {
        if (!resolvedDocNum) { safeToast.error('رقم الفاتورة غير متوفر للطباعة المباشرة'); return; }
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalSmart(posTemplate, data, resolvedDocNum, slug);
        if (result.ok) safeToast.success('تمت الطباعة');
        else safeToast.error(`خطأ في الطباعة: ${result.message}`);
        return;
      }

      if (settings.printMode === 'thermal' && resolvedDocNum && isThermalPaper) {
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalSmart(posTemplate, data, resolvedDocNum, slug);
        if (result.ok) {
          safeToast.success(thermalPrintSuccessMessage(result.method));
        } else {
          safeToast.error(`خطأ في الطباعة الحرارية: ${result.message}`);
          const html = await renderPreviewToHtml({
            template: posTemplate,
            company: companyData,
            source: { type: 'pos-snapshot', snapshot: snap },
          });
          await printReceiptDirect({ html, paperWidth, copies: copies ?? 1, onError: (e) => safeToast.error(`خطأ في طباعة المتصفح: ${e.message}`) });
        }
      } else {
        const html = await renderPreviewToHtml({
          template: posTemplate,
          company: companyData,
          source: { type: 'pos-snapshot', snapshot: snap },
        });
        await printReceiptDirect({ html, paperWidth, copies, onDone: () => safeToast.success('تم إرسال الطباعة'), onError: (e) => safeToast.error(`خطأ في الطباعة: ${e.message}`) });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      safeToast.error(`خطأ في تجهيز الطباعة: ${message}`);
    }
    // NOTE: `slug` intentionally left out exactly as before this refactor.
  }, [posTemplate, safeToast, companyData, settings.printMode, paperWidth, copies]);

  // ── زر الطباعة على اليسار: يطبع السلة الحالية كإيصال (بدون إتمام البيع) ──
  //    يحاول توليد رقم "مسودة" (معاينة الرقم التالي) حتى تنجح الطباعة الحرارية
  //    عبر WebUSB قبل إتمام البيع — الرقم غير مستهلَك ولا يُنشأ مستند.
  const handlePrintCart = useCallback(async () => {
    if (pos.items.length === 0) { safeToast.error('السلة فارغة'); return; }

    let draftNumber = '';
    const typeCode = settings.defaultDocTypeCode;
    const invType = pickInvoiceType(documentTypes, typeCode);

    if (invType?.id) {
      try {
        const res = await documentsApi.nextNumber(invType.id);
        draftNumber = res.next_number ?? '';
      } catch {
        draftNumber = '';
      }
    }

    const snap: POSSaleSnapshot = {
      docNumber: draftNumber,
      docDate: new Date().toISOString().slice(0, 10),
      client: pos.client,
      items: cartItemsToSnapshotItems(pos.items),
      totals: {
        total_ht:       pos.totals.total_ht,
        total_tva:      pos.totals.total_tva,
        total_ttc:      pos.totals.total_ttc,
        fiscal_stamp:   pos.totals.fiscal_stamp,
        total_discount: pos.totals.total_discount,
        paid:           0,
        change:         0,
        remaining:      adjustedTotalTtcFinal,
      },
      payments: [],
      prevBalance: null,
      newBalance: null,
    };
    void handlePrintDirect(snap);
  }, [pos.items, pos.client, pos.totals, adjustedTotalTtcFinal, handlePrintDirect, safeToast, documentTypes, settings.defaultDocTypeCode]);

  // ── طباعة فاتورة محفوظة (من فواتير الجلسة) ───────────────────────────────
  const handlePrintDocument = useCallback(async (docId: number) => {
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,documentType,lines,lines.product,lines.product_variant,payments,payments.payment_mode',
      });
      if (!doc) { safeToast.error('لم يتم العثور على الفاتورة'); return; }
      const snap: POSSaleSnapshot = documentToPrintSnapshot(doc);
      await handlePrintDirect(snap);
    } catch {
      safeToast.error('فشل طباعة الفاتورة');
    }
  }, [handlePrintDirect, safeToast]);

  return { template, isPrintEnabled, posTemplate, companyData, handlePrintDirect, handlePrintCart, handlePrintDocument };
}
