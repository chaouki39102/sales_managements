// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProCheckout.ts
//
// Complete a sale in POSProPage (create or update the document, session
// counters, cache refresh, receipt snapshot, after-sale print / preview /
// drawer), one-click quick pay and opening the payment modal.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/endpoints/documents';
import type { DocumentPaymentInput } from '@/lib/api/endpoints/documents';
import { buildIncrementInput } from '@/lib/api/endpoints/posSession';
import type { useIncrementSession } from '@/lib/api/endpoints/posSession';
import type { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { tenantKeys, invalidateDashboardQueries } from '@/lib/api/core/queryKeys';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { openCashDrawerSmart } from '@/pos/utils/thermalPrint';
import { playSaleSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import {
  pickInvoiceType, buildSaleLinesPayload, computeEffectiveTotals,
  cartItemsToSnapshotItems, snapshotPaymentsFromParams, hasCashPayment,
} from '@/pos/utils/posSaleHelpers';
import type { CompleteSaleParams } from '@/pos/utils/posSaleHelpers';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { CartTotals, PaymentMode } from '@/types';
import type { PosProState } from './usePosProDiscounts';

export function usePosProCheckout(args: {
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
  editingDocumentId: number | null;
  editingDocumentDate: string | null;
  clearEditingState: () => void;
  receiptSnapshotRef: React.MutableRefObject<POSSaleSnapshot | null>;
  isPrintEnabled: boolean;
  template: unknown;
  handlePrintDirect: (snap: POSSaleSnapshot, opts?: { silent?: boolean }) => Promise<void>;
  setSaleBusy: (busy: boolean) => void;
  setPaymentOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setReceiptOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    slug, queryClient, settings, safeToast, posRef, mountedRef, documentTypes, paymentModes,
    activeWarehouse, defaultCurrency, defaultTreasury, fiscalYear, sessionId, incrementMut,
    editingDocumentId, editingDocumentDate, clearEditingState, receiptSnapshotRef,
    isPrintEnabled, template, handlePrintDirect, setSaleBusy, setPaymentOpen, setReceiptOpen,
  } = args;

  // ── إتمام البيع ───────────────────────────────────────────────────────────
  const handleCompleteSale = useCallback(async (params: CompleteSaleParams) => {
    const typeCode = params.docTypeCode ?? settings.defaultDocTypeCode;
    const invType = pickInvoiceType(documentTypes, typeCode);

    if (!invType)            return { ok: false, message: 'لم يُعثَر على نوع مستند' };
    if (!activeWarehouse)    return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
    if (!fiscalYear)         return { ok: false, message: 'لا توجد سنة مالية نشطة' };

    const currentClient  = posRef.current.client;
    const currentItems   = posRef.current.items;
    const currentTotals  = posRef.current.totals;
    const currentInvDisc = posRef.current.invoiceDiscountPct;

    setSaleBusy(true);
    try {
      const snapshot = { items: [...currentItems], totals: { ...currentTotals } as CartTotals };
      const today = new Date().toISOString().slice(0, 10);
      const apiPayments: DocumentPaymentInput[] = (params.payments ?? [])
        .filter(p => p.amount > 0)
        .map(p => ({
          ...(p.id ? { id: p.id } : {}),
          payment_mode_id:     p.paymentModeId,
          amount:              p.amount,
          payment_date:        today,
          treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
          reference:           p.reference?.trim() || null,
          notes:               params.note?.trim() || null,
        }));

      const clientIsTvaExempt = currentClient?.is_tva_exempt ?? false;

      const linesPayload = buildSaleLinesPayload(currentItems, currentInvDisc, clientIsTvaExempt);
      const { effectiveTotalHt, effectiveTotalTva, effectiveTotalTtc }
        = computeEffectiveTotals(linesPayload, snapshot.totals.fiscal_stamp ?? 0);

      const currentSessionId = sessionId ?? null;
      // SSOT: cart-store documentId (lives through hold/restore + reload). React
      // editingDocumentId is UI-only and can lag behind (new-sale shortcut).
      const cartDocMeta   = usePosProCart.getState();
      const isEditingExistingDocument = !!cartDocMeta.documentId;
      const effEditingDocId = isEditingExistingDocument
        ? (editingDocumentId ?? cartDocMeta.documentId ?? null)
        : null;
      const effEditingDate = isEditingExistingDocument
        ? (editingDocumentDate ?? cartDocMeta.documentDate ?? null)
        : null;

      let res;
      if (isEditingExistingDocument) {
        res = await documentsApi.update(effEditingDocId as number, {
          party_id:         currentClient?.id ?? null,
          warehouse_id:     activeWarehouse.id,
          fiscal_year_id:   fiscalYear.id,
          currency_id:      params.currencyId ?? defaultCurrency?.id ?? undefined,
          document_date:    effEditingDate ?? today,
          due_date:         params.dueDate ?? null,
          notes:            params.note ?? posRef.current.notes ?? null,
          lines:            linesPayload,
          payments:         apiPayments,
        });
      } else {
        res = await documentsApi.create({
          party_id:         currentClient?.id ?? null,
          warehouse_id:     activeWarehouse.id,
          fiscal_year_id:   fiscalYear.id,
          currency_id:      params.currencyId ?? defaultCurrency?.id ?? undefined,
          document_date:    editingDocumentDate ?? today,
          due_date:         params.dueDate ?? null,
          notes:            params.note ?? posRef.current.notes ?? null,
          document_type_id: invType.id,
          lines:            linesPayload,
          payments:         apiPayments,
          pos_session_id:   currentSessionId,
        });
      }

      // لا نُضاعف إحصائيات الجلسة عند تعديل فاتورة سبق احتسابها في نفس الجلسة
      if (sessionId && !isEditingExistingDocument) {
        incrementMut.mutate(buildIncrementInput({
          items:            currentItems,
          totalHt:          effectiveTotalHt,
          totalTva:         effectiveTotalTva,
          totalFiscalStamp: snapshot.totals.fiscal_stamp ?? 0,
          totalDiscount:    (snapshot.totals.total_discount ?? 0) + (snapshot.totals.invoice_discount_amount ?? 0),
          grandTotal:       effectiveTotalTtc,
          payments:         apiPayments.map(p => ({ payment_mode_id: p.payment_mode_id, amount: p.amount })),
        }));
      }

      const totalPaid         = params.amountPaid;
      const backendNetToPay   = res?.net_to_pay ?? effectiveTotalTtc;
      const backendPaidAmount = res?.paid_amount ?? totalPaid;
      const invoiceRemaining  = Math.max(0, backendNetToPay - backendPaidAmount);
      const invoiceChange     = Math.max(0, backendPaidAmount - backendNetToPay);
      const newBalance        = res?.balance_data?.new_balance ?? 0;

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
          total_ht:     res?.total_ht  ?? effectiveTotalHt,
          total_tva:    res?.total_tva ?? effectiveTotalTva,
          total_ttc:    res?.total_ttc ?? effectiveTotalTtc,
          paid:         backendPaidAmount,
          change:       invoiceChange,
          remaining:    invoiceRemaining,
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

      clearEditingState();
      posRef.current.clearCart();
      posRef.current.setInvoiceDiscountPct(0);
      posRef.current.setPayments([]);
      posRef.current.bumpSaleNumber();
      setPaymentOpen(false);

      const st = (fn: () => void, ms: number) => {
        const t = setTimeout(() => { if (mountedRef.current) fn(); clearTimeout(t); }, ms);
      };

      if (params.skipPreview) {
        const action = settings.quickCashAction;
        if (action === 'preview') setReceiptOpen(true);
        else if (action === 'print') st(() => { const snap = receiptSnapshotRef.current; if (snap) handlePrintDirect(snap); }, 300);
        else if (action === 'silent') st(() => { const snap = receiptSnapshotRef.current; if (snap) handlePrintDirect(snap, { silent: true }); }, 300);
      } else {
        const action = settings.afterSaleAction;
        if (action === 'preview') setReceiptOpen(true);
        else if (action === 'print' && isPrintEnabled && template) st(() => { const snap = receiptSnapshotRef.current; if (snap) handlePrintDirect(snap); }, 300);
      }

      const willShowPreview = params.skipPreview
        ? settings.quickCashAction === 'preview'
        : settings.afterSaleAction === 'preview';
      if (settings.autoClosePayment && !willShowPreview) {
        st(() => setReceiptOpen(false), 1200);
      }

      safeToast.success(`تم حفظ الفاتورة ${res.document_number ?? ''}`);
      if (settings.playSoundOnSale) playSaleSound(settings.soundPreset as SoundPresetId, settings.soundVolume);

      if (settings.openCashDrawer) {
        const hasCash = hasCashPayment(apiPayments, paymentModes);
        if (hasCash) openCashDrawerSmart(slug);
      }

      return { ok: true, docNumber: res.document_number };
    } catch (err: unknown) {
      const parsedErr = err as { errors?: { lines?: string[] }; message?: string };
      const msg = parsedErr.errors?.lines?.[0] ?? parsedErr.message ?? 'فشل حفظ الفاتورة';
      safeToast.error(String(msg));
      return { ok: false, message: String(msg) };
    } finally {
      setSaleBusy(false);
    }
    // Refs / setters / clearEditingState are stable identities — listed for lint only.
  }, [settings, documentTypes, activeWarehouse, fiscalYear, defaultCurrency?.id, defaultTreasury?.id, sessionId, incrementMut, queryClient, slug, handlePrintDirect, paymentModes, isPrintEnabled, template, safeToast, editingDocumentId, editingDocumentDate,
    posRef, setSaleBusy, receiptSnapshotRef, clearEditingState, setPaymentOpen, mountedRef, setReceiptOpen]);

  // ── الدفع السريع (نقدي/بطاقة بضغطة واحدة) ───────────────────────────────
  const handleQuickPay = useCallback(async (mode: PaymentMode | null) => {
    if (posRef.current.items.length === 0) return;
    if (!mode) { safeToast.error('لم يتم العثور على وسيلة الدفع'); return; }
    const totalTtcFinal = posRef.current.totals.total_ttc + posRef.current.totals.fiscal_stamp;
    await handleCompleteSale({
      amountPaid: totalTtcFinal,
      payments: [{ paymentModeId: mode.id, amount: totalTtcFinal }],
      docTypeCode: settings.defaultDocTypeCode,
      skipPreview: true,
    });
  }, [settings.defaultDocTypeCode, handleCompleteSale, safeToast, posRef]);

  // ── فتح الدفع / المنتجات ─────────────────────────────────────────────────
  const handleOpenPayment = useCallback(() => {
    if (posRef.current.items.length === 0) { safeToast.info('أضف منتجات أولاً'); return; }
    setPaymentOpen(true);
  }, [safeToast, posRef, setPaymentOpen]);

  return { handleCompleteSale, handleQuickPay, handleOpenPayment };
}
