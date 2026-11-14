// ════════════════════════════════════════════════════════════════════════════
// pages/pos/hooks/usePosCheckout.ts
//
// Complete a sale (create or update the document), bump the POS session
// counters, refresh caches, build the receipt snapshot and run the
// after-sale print / preview / drawer actions. Also the one-key quick cash.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/endpoints/documents';
import type { DocumentPaymentInput } from '@/lib/api/endpoints/documents';
import { buildIncrementInput } from '@/lib/api/endpoints/posSession';
import type { useIncrementSession } from '@/lib/api/endpoints/posSession';
import { tenantKeys, invalidateDashboardQueries } from '@/lib/api/core/queryKeys';
import { useCartStore } from '@/pos/utils/useCartStore';
import { openCashDrawerSmart } from '@/pos/utils/thermalPrint';
import { playSaleSound } from '@/pos/utils/posSounds';
import { beginCheckout, endCheckout, afterPrint, printOnce } from '@/pos/utils/posCheckoutFlow';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import {
  pickInvoiceType, buildSaleLinesPayload, computeEffectiveTotals,
  cartItemsToSnapshotItems, snapshotPaymentsFromParams, hasCashPayment,
} from '@/pos/utils/posSaleHelpers';
import type { ActiveModal } from '@/pos/utils/posHelpers';
import type { ProfessionalCartHandle } from '@/pos/components/ProfessionalCart';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosSafeToast } from '@/pos/hooks/usePosSafeToast';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { CartTotals, DocumentType, PaymentMode } from '@/types';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import type { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import type { CompleteSaleParams, PosState } from './posPageTypes';
import type { usePosReceiptState } from './usePosEditingState';

export function usePosCheckout(args: {
  slug: string | null;
  queryClient: QueryClient;
  settings: POSSettings;
  safeToast: PosSafeToast;
  pos: PosState;
  posRef: { readonly current: PosState };
  mountedRef: React.MutableRefObject<boolean>;
  documentTypes: DocumentType[];
  paymentModes: PaymentMode[];
  defaultWarehouse: PosAggregatedLookups['warehouses'][number] | null | undefined;
  defaultCurrency: PosAggregatedLookups['currencies'][number] | undefined;
  defaultTreasury: PosAggregatedLookups['treasuryAccounts'][number] | undefined;
  fiscalYear: ReturnType<typeof useSelectedFiscalYear>;
  sessionId: number | undefined;
  incrementMut: ReturnType<typeof useIncrementSession>;
  cartNote: string;
  setCartNote: (note: string) => void;
  editingDocumentId: number | null;
  editingDocumentDate: string | null;
  editingPrevBalanceRef: React.MutableRefObject<number | undefined>;
  clearEditingState: () => void;
  receipt: ReturnType<typeof usePosReceiptState>;
  invoiceDiscountAmount: number;
  isPrintEnabled: boolean;
  template: unknown;
  handlePrintDirect: (snap: POSSaleSnapshot, opts?: { silent?: boolean }) => Promise<void>;
  setModal: React.Dispatch<React.SetStateAction<ActiveModal>>;
  setSelectedCartItemId: (id: string | null) => void;
  cartApiRef: React.RefObject<ProfessionalCartHandle | null>;
  searchRef: React.RefObject<HTMLInputElement>;
  handleQuickCashRef: React.MutableRefObject<() => void>;
}) {
  const {
    slug, queryClient, settings, safeToast, pos, posRef, mountedRef,
    documentTypes, paymentModes, defaultWarehouse, defaultCurrency, defaultTreasury, fiscalYear,
    incrementMut, cartNote, setCartNote, editingDocumentId, editingDocumentDate,
    editingPrevBalanceRef, clearEditingState, invoiceDiscountAmount, isPrintEnabled, template,
    handlePrintDirect, setModal, setSelectedCartItemId, cartApiRef, searchRef, handleQuickCashRef,
    sessionId,
  } = args;
  const { setReceiptSnapshot, receiptSnapshotRef, lastPaymentRef } = args.receipt;

  // ── Complete Sale ──────────────────────────────────────────────────────────
  const handleCompleteSale = useCallback(async (params: CompleteSaleParams) => {
    const typeCode = params.docTypeCode ?? settings.defaultDocTypeCode;
    const invType  = pickInvoiceType(documentTypes, typeCode);

    if (!invType)          return { ok: false, message: 'لم يُعثَر على نوع مستند' };
    if (!defaultWarehouse) return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
    if (!fiscalYear)       return { ok: false, message: 'لا توجد سنة مالية نشطة' };

    // Lock the cart for the save: an edit made now would be wiped by the
    // clear below, and a second click/shortcut must not save the sale twice.
    const lock = beginCheckout(() => safeToast.info('جاري حفظ البيع — انتظر لحظة', { id: 'pos-checkout-busy' }));
    if (!lock) return { ok: false, message: 'جاري حفظ بيع سابق — انتظر لحظة' };

    const currentClient  = posRef.current.client;
    const currentItems   = posRef.current.items;
    const currentTotals  = posRef.current.totals;
    const currentInvDisc = posRef.current.invoiceDiscountPct;

    try {
      const snapshot = { items: [...currentItems], totals: { ...currentTotals } as CartTotals };

      const existingPaymentsMap = new Map(
        (pos.payments ?? []).map(p => [p.id, p.payment_date])
      );
      const today = new Date().toISOString().slice(0, 10);
      const apiPayments: DocumentPaymentInput[] = (params.payments ?? [])
        .filter(p => p.amount > 0)
        .map(p => {
          const existingPaymentDate = p.id ? existingPaymentsMap.get(p.id) : undefined;
          return {
            ...(p.id ? { id: p.id } : {}),
            payment_mode_id:     p.paymentModeId,
            amount:              p.amount,
            payment_date:        typeof existingPaymentDate === 'string' ? existingPaymentDate : today,
            treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
            reference:           p.reference?.trim() || null,
            notes:               params.note?.trim() || null,
          } as DocumentPaymentInput;
        });

      // ✅ TVA-exempt parties: frontend must match backend override
      const clientIsTvaExempt = currentClient?.is_tva_exempt ?? false;

      const linesPayload = buildSaleLinesPayload(currentItems, currentInvDisc, clientIsTvaExempt);
      const { effectiveTotalHt, effectiveTotalTva, effectiveTotalTtc }
        = computeEffectiveTotals(linesPayload, snapshot.totals.fiscal_stamp ?? 0);

      const currentSessionId = sessionId ?? null;

      // ✅ نحدّد نوع العملية قبل الإرسال لاستعمالها لاحقاً في شرط incrementMut.
      // SSOT: cart-store documentId (يعيش عبر hold/restore + reload). React
      // editingDocumentId مجرد حالة واجهة — قد يتأخر مسحها (new-sale shortcut).
      const cartDocMeta   = useCartStore.getState();
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
          party_id:       currentClient?.id ?? null,
          warehouse_id:   defaultWarehouse.id,
          fiscal_year_id: fiscalYear.id,
          currency_id:    params.currencyId ?? defaultCurrency?.id ?? undefined,
          document_date:  effEditingDate ?? new Date().toISOString().slice(0, 10),
          due_date:       params.dueDate ?? null,
          notes:          params.note ?? cartNote ?? null,
          lines:          linesPayload,
          payments:       apiPayments,
        });
      } else {
        res = await documentsApi.create({
          party_id:       currentClient?.id ?? null,
          warehouse_id:   defaultWarehouse.id,
          fiscal_year_id: fiscalYear.id,
          currency_id:    params.currencyId ?? defaultCurrency?.id ?? undefined,
          document_date:  editingDocumentDate ?? new Date().toISOString().slice(0, 10),
          due_date:       params.dueDate ?? null,
          notes:          params.note ?? cartNote ?? null,
          document_type_id: invType.id,
          lines:            linesPayload,
          payments:         apiPayments,
          pos_session_id:   currentSessionId,
        });
      }

      endCheckout(lock);
      // ── From here to the cart clear there is no await: nothing can slip in. ──

      lastPaymentRef.current = {
        paid: params.amountPaid,
        payments: params.payments?.filter(p => p.amount > 0).map(p => ({
          paymentModeId: p.paymentModeId, amount: p.amount,
        })) ?? [],
        dueDate: params.dueDate,
      };

      const totalPaid         = params.amountPaid;
      const backendNetToPay   = res?.net_to_pay ?? effectiveTotalTtc;
      const backendPaidAmount = res?.paid_amount ?? totalPaid;
      const invoiceRemaining  = Math.max(0, backendNetToPay - backendPaidAmount);
      const invoiceChange     = Math.max(0, backendPaidAmount - backendNetToPay);
      // SSOT: backend computes balance_data — no more partyBalancesApi.getOne()
      const newBalance = res?.balance_data?.new_balance ?? 0;

      const prevBalance = res?.balance_data?.previous_balance ?? editingPrevBalanceRef.current;

      const fullSnapshot: POSSaleSnapshot = {
        items: cartItemsToSnapshotItems(snapshot.items),
        totals: {
          ...snapshot.totals,
          total_ht:  res?.total_ht  ?? effectiveTotalHt,
          total_tva: res?.total_tva ?? effectiveTotalTva,
          total_ttc: res?.total_ttc ?? effectiveTotalTtc,
          paid:      backendPaidAmount,
          change:    invoiceChange,
          remaining: invoiceRemaining,
          fiscal_stamp: res.total_stamp ?? snapshot.totals.fiscal_stamp,
        },
        docNumber: res.document_number,
        docDate: new Date().toISOString().slice(0, 10),
        client: currentClient,
        payments: snapshotPaymentsFromParams(params.payments, paymentModes),
        dueDate: params.dueDate,
        prevBalance,
        newBalance,
      };
      clearEditingState();
      receiptSnapshotRef.current = fullSnapshot;
      setReceiptSnapshot(fullSnapshot);

      setCartNote('');
      posRef.current.setInvoiceDiscountPct(0);
      posRef.current.clearCart();
      setSelectedCartItemId(null);

      const st = (fn: () => void, ms: number) => {
        const t = setTimeout(() => { if (mountedRef.current) fn(); clearTimeout(t); }, ms);
      };

      // ── Print / Preview decision ─────────────────────────────────────────
      // The sale is saved and the cart already cleared: printing runs in the
      // background and never blocks the next sale (failure → retry toast).
      const action = params.skipPreview ? settings.quickCashAction : settings.afterSaleAction;
      let printOpts: { silent?: boolean } | null = null;
      if (action === 'silent' && params.skipPreview) printOpts = { silent: true };
      else if (action === 'print' && (params.skipPreview || (isPrintEnabled && template))) printOpts = {};
      setModal(action === 'preview' ? 'receipt' : 'none');
      const printJob = printOpts
        ? new Promise<void>(done => st(() => { printOnce(fullSnapshot.docNumber, () => handlePrintDirect(fullSnapshot, printOpts)).then(done, done); }, 50))
        : null;

      safeToast.success(`✅ تم حفظ الفاتورة ${res.document_number ?? ''}`);
      if (settings.playSoundOnSale) playSaleSound(settings.soundPreset as SoundPresetId, settings.soundVolume);

      try { navigator.vibrate?.(100); } catch {}

      if (settings.openClientOnNewSale) {
        st(() => cartApiRef.current?.openCustomerModal(), 300);
      }

      st(() => searchRef.current?.focus(), 200);

      if (settings.openCashDrawer) {
        const hasCash = hasCashPayment(apiPayments, paymentModes);
        if (hasCash) openCashDrawerSmart(slug);
      }

      const willShowPreview = params.skipPreview
        ? settings.quickCashAction === 'preview'
        : settings.afterSaleAction === 'preview';
      const willPrint = params.skipPreview
        ? settings.quickCashAction !== 'none'
        : settings.afterSaleAction === 'print';
      if (settings.autoClosePayment && !willShowPreview && willPrint) {
        st(() => setModal('none'), 1200);
      }

      afterPrint(printJob, async () => {
        // ✅ الإصلاح: لا نزيد إحصائيات الجلسة (gross_sales, invoices_count, ...) إلا
        // عند إنشاء فاتورة جديدة فعلاً. عند تعديل فاتورة موجودة سبق احتسابها ضمن
        // نفس الجلسة، استدعاء incrementMut مجدداً كان يُضاعف الأرقام لأن
        // PosSessionController::increment() يستعمل increment() التراكمي بلا
        // إلغاء للمساهمة القديمة أولاً.
        if (sessionId && !isEditingExistingDocument) {
          try {
            await incrementMut.mutateAsync(
              buildIncrementInput({
                items:            currentItems,
                totalHt:          effectiveTotalHt,
                totalTva:         effectiveTotalTva,
                totalFiscalStamp: snapshot.totals.fiscal_stamp ?? 0,
                totalDiscount:    (snapshot.totals.total_discount ?? 0) + invoiceDiscountAmount,
                grandTotal:       effectiveTotalTtc,
                payments:         apiPayments.map(p => ({
                  payment_mode_id: p.payment_mode_id,
                  amount:          p.amount,
                })),
              }),
            );
          } catch (e) {
            console.warn('[POS] Session increment failed', e);
          }
          if (slug) {
            queryClient.invalidateQueries({ queryKey: [slug, 'pos-sessions'] });
          }
        }
        // Invalidate client balance so cart & payment modal show updated value
        if (currentClient?.id) {
          queryClient.invalidateQueries({
            queryKey: tenantKeys.partyBalances.detail(slug ?? '', currentClient.id),
          });
        }

        // Invalidate stock so product cards show updated quantities
        queryClient.invalidateQueries({
          queryKey: [slug, 'pos-stock'],
        });
        queryClient.invalidateQueries({
          queryKey: [slug, 'inventory', 'stock-at'],
        });
        queryClient.invalidateQueries({
          queryKey: [slug, 'warehouse-stock'],
        });

        // Invalidate dashboard so KPIs, charts, recent transactions refresh
        invalidateDashboardQueries(queryClient, slug);
      });

      return { ok: true, docNumber: res.document_number };

    } catch (err: unknown) {
      const parsedErr = err as { errors?: { lines?: string[] }; message?: string };
      const msg = parsedErr.errors?.lines?.[0] ?? parsedErr.message ?? 'فشل حفظ الفاتورة';
      safeToast.error(String(msg));
      return { ok: false, message: String(msg) };
    } finally {
      endCheckout(lock);
    }
    // NOTE: `settings.openClientOnNewSale` intentionally left out exactly as before
    // this refactor. Refs / setters / clearEditingState are stable identities.
  }, [settings.defaultDocTypeCode, settings.playSoundOnSale, settings.soundPreset, settings.soundVolume, settings.openCashDrawer, settings.autoClosePayment, settings.afterSaleAction, settings.quickCashAction, settings.printCopies, paymentModes, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency?.id, cartNote, editingDocumentId, editingDocumentDate, sessionId, isPrintEnabled, template, safeToast, defaultTreasury?.id, incrementMut, invoiceDiscountAmount, queryClient, slug, handlePrintDirect, pos.payments,
    posRef, lastPaymentRef, editingPrevBalanceRef, clearEditingState, receiptSnapshotRef, setReceiptSnapshot, setCartNote, setSelectedCartItemId, mountedRef, setModal, cartApiRef, searchRef]);

  // ── Quick Cash (no modal) ────────────────────────────────────────────────
  const handleQuickCash = useCallback(async () => {
    if (pos.items.length === 0) return;
    const cashMode = paymentModes?.find(m =>
      new RegExp(settings.defaultPaymentCode, 'i').test(m.name),
    ) ?? paymentModes?.find(m => m.is_default) ?? paymentModes?.[0];
    if (!cashMode) { safeToast.error('لم يتم العثور على وسيلة الدفع النقدية'); return; }
    const totalTtc = pos.totals.total_ttc;
    await handleCompleteSale({
      amountPaid: totalTtc,
      payments: [{ paymentModeId: cashMode.id, amount: totalTtc }],
      docTypeCode: settings.defaultDocTypeCode,
      skipPreview: true,
    });
  }, [pos.items.length, pos.totals.total_ttc, paymentModes, settings.defaultPaymentCode, settings.defaultDocTypeCode, handleCompleteSale, safeToast]);
  useEffect(() => { handleQuickCashRef.current = handleQuickCash; }, [handleQuickCash, handleQuickCashRef]);

  return { handleCompleteSale, handleQuickCash };
}
