// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/hooks/usePosProMobileCheckout.ts
//
// Printing + sale completion for the mobile POS PRO screen (same formula as
// the desktop — the backend is the source of truth), offline-queue aware
// success toast, one-tap cash payment and opening the payment modal.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/endpoints/documents';
import type { DocumentPaymentInput } from '@/lib/api/endpoints/documents';
import { buildIncrementInput } from '@/lib/api/endpoints/posSession';
import type { useIncrementSession } from '@/lib/api/endpoints/posSession';
import type { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { isOfflineQueuedResponse } from '@/lib/offline/queueMath';
import { tenantKeys, invalidateDashboardQueries } from '@/lib/api/core/queryKeys';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import type { PosProState } from '@/pos-pro/hooks/usePosProDiscounts';
import { printReceiptDirect } from '@/pos/utils/printUtils';
import { printThermalSmart, openCashDrawerSmart, thermalPrintSuccessMessage } from '@/pos/utils/thermalPrint';
import { playSaleSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import {
  pickInvoiceType, buildSaleLinesPayload, computeEffectiveTotals,
  cartItemsToSnapshotItems, snapshotPaymentsFromParams, hasCashPayment,
} from '@/pos/utils/posSaleHelpers';
import type { CompleteSaleParams } from '@/pos/utils/posSaleHelpers';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import { renderPreviewToHtml } from '@/pages/settings/print-settings/runtime/renderPreviewToHtml';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';
import type { CartTotals, PaymentMode } from '@/types';

export function usePosProMobileCheckout(args: {
  slug: string | null;
  queryClient: QueryClient;
  settings: POSSettings;
  safeToast: PosSafeToast;
  posRef: { readonly current: PosProState };
  mountedRef: React.MutableRefObject<boolean>;
  documentTypes: PosAggregatedLookups['documentTypes'];
  paymentModes: PosAggregatedLookups['paymentModes'];
  activeWarehouse: PosAggregatedLookups['warehouses'][number] | null | undefined;
  defaultCurrency: PosAggregatedLookups['currencies'][number] | undefined;
  defaultTreasury: PosAggregatedLookups['treasuryAccounts'][number] | undefined;
  fiscalYear: ReturnType<typeof useSelectedFiscalYear>;
  sessionId: number | undefined;
  incrementMut: ReturnType<typeof useIncrementSession>;
  posTemplate: PrintTemplate | null;
  companyData: CompanyPreviewData | null;
  isPrintEnabled: boolean;
  copies: number;
  paperWidth: number;
  receiptSnapshotRef: React.MutableRefObject<POSSaleSnapshot | null>;
  setSaleBusy: (busy: boolean) => void;
  setPayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setReceiptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSuccessOverlay: (o: { docNumber: string; amount: number } | null) => void;
}) {
  const {
    slug, queryClient, settings, safeToast, posRef, mountedRef, documentTypes, paymentModes,
    activeWarehouse, defaultCurrency, defaultTreasury, fiscalYear, sessionId, incrementMut,
    posTemplate, companyData, isPrintEnabled, copies, paperWidth, receiptSnapshotRef,
    setSaleBusy, setPayOpen, setReceiptOpen, setSuccessOverlay,
  } = args;

  // ── الطباعة المباشرة (حرارية عبر WebUSB إن توفرت، وإلا نافذة المتصفح) ────
  const handlePrintDirect = useCallback(async (snap: POSSaleSnapshot) => {
    if (!posTemplate) { safeToast.error('لا يوجد قالب طباعة'); return; }
    try {
      const resolvedDocNum = snap.docNumber;
      const isThermalPaper = posTemplate.paper_size === '80mm' || posTemplate.paper_size === '58mm';

      const html = await renderPreviewToHtml({
        template: posTemplate,
        company: companyData,
        source: { type: 'pos-snapshot', snapshot: snap },
      });

      if (settings.printMode === 'thermal' && resolvedDocNum && isThermalPaper) {
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalSmart(posTemplate, data, resolvedDocNum, slug, html);
        if (result.ok) {
          safeToast.success(thermalPrintSuccessMessage(result.method));
        } else {
          safeToast.error(`خطأ في الطباعة الحرارية: ${result.message}`);
          await printReceiptDirect({
            html, paperWidth, copies: copies ?? 1,
            onError: (e) => safeToast.error(`خطأ في طباعة المتصفح: ${e.message}`),
          });
        }
      } else {
        await printReceiptDirect({
          html, paperWidth, copies, onDone: () => safeToast.success('تم إرسال الطباعة'),
          onError: (e) => safeToast.error(`خطأ في الطباعة: ${e.message}`),
        });
      }
    } catch (error: unknown) {
      safeToast.error(`خطأ في تجهيز الطباعة: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [posTemplate, safeToast, companyData, settings.printMode, paperWidth, copies, slug]);

  // ── إتمام البيع (نفس صيغة سطح المكتب — الـ backend هو مصدر الحقيقة) ──────
  const handleCompleteSale = useCallback(async (params: CompleteSaleParams) => {
    const typeCode = params.docTypeCode ?? settings.defaultDocTypeCode;
    const invType = pickInvoiceType(documentTypes, typeCode);

    if (!invType) return { ok: false, message: 'لم يُعثَر على نوع مستند' };
    if (!activeWarehouse) return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
    if (!fiscalYear) return { ok: false, message: 'لا توجد سنة مالية نشطة' };

    const currentClient = posRef.current.client;
    const currentItems = posRef.current.items;
    const currentTotals = posRef.current.totals;
    const currentInvDisc = posRef.current.invoiceDiscountPct;

    setSaleBusy(true);
    try {
      const snapshot = { items: [...currentItems], totals: { ...currentTotals } as CartTotals };
      const today = new Date().toISOString().slice(0, 10);
      const apiPayments: DocumentPaymentInput[] = (params.payments ?? [])
        .filter((p) => p.amount > 0)
        .map((p) => ({
          ...(p.id ? { id: p.id } : {}),
          payment_mode_id: p.paymentModeId,
          amount: p.amount,
          payment_date: today,
          treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
          reference: p.reference?.trim() || null,
          notes: params.note?.trim() || null,
        }));

      const clientIsTvaExempt = currentClient?.is_tva_exempt ?? false;

      const linesPayload = buildSaleLinesPayload(currentItems, currentInvDisc, clientIsTvaExempt);
      const { effectiveTotalHt, effectiveTotalTva, effectiveTotalTtc }
        = computeEffectiveTotals(linesPayload, snapshot.totals.fiscal_stamp ?? 0);

      const currentSessionId = sessionId ?? null;
      const cartDocMeta = usePosProCart.getState();
      const isEditingExistingDocument = !!cartDocMeta.documentId;
      const effEditingDocId = isEditingExistingDocument ? cartDocMeta.documentId : null;

      let res;
      if (isEditingExistingDocument) {
        res = await documentsApi.update(effEditingDocId as number, {
          party_id: currentClient?.id ?? null,
          warehouse_id: activeWarehouse.id,
          fiscal_year_id: fiscalYear.id,
          currency_id: params.currencyId ?? defaultCurrency?.id ?? undefined,
          document_date: cartDocMeta.documentDate ?? today,
          due_date: params.dueDate ?? null,
          notes: params.note ?? posRef.current.notes ?? null,
          lines: linesPayload,
          payments: apiPayments,
        });
      } else {
        res = await documentsApi.create({
          party_id: currentClient?.id ?? null,
          warehouse_id: activeWarehouse.id,
          fiscal_year_id: fiscalYear.id,
          currency_id: params.currencyId ?? defaultCurrency?.id ?? undefined,
          document_date: today,
          due_date: params.dueDate ?? null,
          notes: params.note ?? posRef.current.notes ?? null,
          document_type_id: invType.id,
          lines: linesPayload,
          payments: apiPayments,
          pos_session_id: currentSessionId,
        });
      }

      if (sessionId && !isEditingExistingDocument) {
        incrementMut.mutate(buildIncrementInput({
          items: currentItems,
          totalHt: effectiveTotalHt,
          totalTva: effectiveTotalTva,
          totalFiscalStamp: snapshot.totals.fiscal_stamp ?? 0,
          totalDiscount: (snapshot.totals.total_discount ?? 0) + (snapshot.totals.invoice_discount_amount ?? 0),
          grandTotal: effectiveTotalTtc,
          payments: apiPayments.map((p) => ({ payment_mode_id: p.payment_mode_id, amount: p.amount })),
        }));
      }

      const totalPaid = params.amountPaid;
      const backendNetToPay = res?.net_to_pay ?? effectiveTotalTtc;
      const backendPaidAmount = res?.paid_amount ?? totalPaid;
      const invoiceRemaining = Math.max(0, backendNetToPay - backendPaidAmount);
      const invoiceChange = Math.max(0, backendPaidAmount - backendNetToPay);
      const newBalance = res?.balance_data?.new_balance ?? 0;

      if (currentClient?.id) {
        queryClient.invalidateQueries({ queryKey: tenantKeys.partyBalances.detail(slug ?? '', currentClient.id) });
      }
      for (const qk of [
        [slug, 'pos-stock'],
        [slug, 'pos-pro-stock'],
        [slug, 'inventory', 'stock-at'],
        [slug, 'warehouse-stock'],
      ]) {
        queryClient.invalidateQueries({ queryKey: qk });
      }
      queryClient.invalidateQueries({ queryKey: [slug, 'documents'] });

      // Invalidate dashboard so KPIs, charts, recent transactions refresh
      invalidateDashboardQueries(queryClient, slug);

      const fullSnapshot: POSSaleSnapshot = {
        items: cartItemsToSnapshotItems(snapshot.items),
        totals: {
          ...snapshot.totals,
          total_ht: res?.total_ht ?? effectiveTotalHt,
          total_tva: res?.total_tva ?? effectiveTotalTva,
          total_ttc: res?.total_ttc ?? effectiveTotalTtc,
          paid: backendPaidAmount,
          change: invoiceChange,
          remaining: invoiceRemaining,
          fiscal_stamp: (res as any).total_stamp ?? snapshot.totals.fiscal_stamp,
        },
        docNumber: res.document_number,
        docDate: today,
        client: currentClient,
        payments: snapshotPaymentsFromParams(params.payments, paymentModes),
        dueDate: params.dueDate,
        prevBalance: res?.balance_data?.previous_balance ?? null,
        newBalance,
      };
      receiptSnapshotRef.current = fullSnapshot;

      usePosProCart.getState().setDocumentMeta({ id: null, number: null, date: null });
      posRef.current.clearCart();
      posRef.current.setInvoiceDiscountPct(0);
      posRef.current.setPayments([]);
      posRef.current.bumpSaleNumber();
      setPayOpen(false);
      setSuccessOverlay({ docNumber: res.document_number, amount: backendNetToPay });

      if (settings.playSoundOnSale) playSaleSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
      if (settings.openCashDrawer) {
        const hasCash = hasCashPayment(apiPayments, paymentModes);
        if (hasCash) openCashDrawerSmart(slug);
      }

      const st = (fn: () => void, ms: number) => {
        const t = setTimeout(() => { if (mountedRef.current) fn(); clearTimeout(t); }, ms);
      };

      if (!params.skipPreview && settings.afterSaleAction === 'preview' && posTemplate) {
        st(() => { if (mountedRef.current) setReceiptOpen(true); }, 900);
      } else if (params.skipPreview && settings.quickCashAction === 'preview' && posTemplate) {
        st(() => { if (mountedRef.current) setReceiptOpen(true); }, 900);
      } else if ((params.skipPreview ? settings.quickCashAction : settings.afterSaleAction) === 'print' && isPrintEnabled && posTemplate) {
        st(() => { const snap = receiptSnapshotRef.current; if (snap && mountedRef.current) handlePrintDirect(snap); }, 900);
      }

      if (isOfflineQueuedResponse(res)) {
        safeToast.success(`أُضيفت الفاتورة إلى قائمة الانتظار — سيُحفظ عند توفر الاتصال (${res.document_number ?? ''})`);
      } else {
        safeToast.success(`تم حفظ الفاتورة ${res.document_number ?? ''}`);
      }

      return { ok: true, docNumber: res.document_number };
    } catch (err: unknown) {
      const parsedErr = err as { errors?: { lines?: string[] }; message?: string };
      const msg = parsedErr.errors?.lines?.[0] ?? parsedErr.message ?? 'فشل حفظ الفاتورة';
      safeToast.error(String(msg));
      setSuccessOverlay(null);
      return { ok: false, message: String(msg) };
    } finally {
      setSaleBusy(false);
    }
    // Refs / setters are stable identities — listed for lint only.
  }, [settings, documentTypes, activeWarehouse, fiscalYear, defaultCurrency?.id, defaultTreasury?.id, sessionId, incrementMut, queryClient, slug, handlePrintDirect, paymentModes, isPrintEnabled, posTemplate, safeToast,
    posRef, setSaleBusy, receiptSnapshotRef, setPayOpen, setSuccessOverlay, mountedRef, setReceiptOpen]);

  // ── الدفع السريع (نقدي بضغطة واحدة) ─────────────────────────────────────
  const handleQuickPay = useCallback(async (mode: PaymentMode | null) => {
    if (posRef.current.items.length === 0) { safeToast.info('أضف منتجات أولاً'); return; }
    if (!mode) { safeToast.error('لم يتم العثور على وسيلة الدفع'); return; }
    const totalTtcFinal = posRef.current.totals.total_ttc + posRef.current.totals.fiscal_stamp;
    await handleCompleteSale({
      amountPaid: totalTtcFinal,
      payments: [{ paymentModeId: mode.id, amount: totalTtcFinal }],
      docTypeCode: settings.defaultDocTypeCode,
      skipPreview: true,
    });
  }, [settings.defaultDocTypeCode, handleCompleteSale, safeToast, posRef]);

  const handleOpenPayment = useCallback(() => {
    if (posRef.current.items.length === 0) { safeToast.info('أضف منتجات أولاً'); return; }
    setPayOpen(true);
  }, [safeToast, posRef, setPayOpen]);

  return { handlePrintDirect, handleCompleteSale, handleQuickPay, handleOpenPayment };
}
