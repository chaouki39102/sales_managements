// ════════════════════════════════════════════════════════════════════════════
// pos-pro/POSProPage.tsx
//
// ══ POS PRO — نقطة بيع جديدة موازية لـ POS الكلاسيكي ════════════════════════
//
// الهدف: نسخة "برو" كاشير عالية السرعة دون أي تعديل على POS الموجود:
//   • السلة مستقلة تماماً (pos-pro-cart) — لا تشارك الحالة مع POS.
//   • اختيار المنتجات عبر Modal ببحث فوري + مسح باركود (يبقى مفتوحاً
//     لتعدد الإضافة السريعة).
//   • أعلى الشاشة: بطاقة زبون + بطاقة إجمالي بارزة.
//   • شريط إجراءات رأسي يمين الشاشة: منتجات / الدفع / دفع سريع (ذهبي).
//   • الدفع: مودال ProfessionalPaymentModal (مشترك) + دفع سريع نقدي
//     بضغطة واحدة.
//   • الطباعة: نفس خط الأنابيب الموحد (UniversalPrintPipeline /
//     ESCPOSRenderer للحراري / printReceiptDirect للمتصفح).
//
// البيانات تُقرأ بنفس hooks المشتركة (usePOSAggregatedLookups،
// useCurrentPosSession...) دون كتابة أي ملف خاص بـ POS الكلاسيكي.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePOSAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { productsApi } from '@/lib/api/endpoints/products';
import { apiGet } from '@/lib/api/core/client';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { useCashClient } from '@/lib/api/endpoints/parties';
import {
  useCurrentPosSession,
  useOpenSession,
  useIncrementSession,
  buildIncrementInput,
} from '@/lib/api/endpoints/posSession';
import { usePosPro } from '@/pos-pro/hooks/usePosPro';
import { productToVariant, isVariantOutOfStock } from '@/pos/utils/posHelpers';
import { usePOSSettings } from '@/pos/hooks/usePOSSettings';
import { usePrintSettings } from '@/pos/hooks/usePrintSettings';
import { printReceiptDirect } from '@/pos/utils/printUtils';
import { openCashDrawerViaWebUSB, isWebUsbSupported, printThermalViaWebUSBFromTemplate } from '@/pos/utils/printService';
import { playSaleSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import { renderPreviewToHtml } from '@/pages/settings/print-settings/runtime/renderPreviewToHtml';
import { mapCompany } from '@/pages/settings/print-settings/runtime/PrintRuntimeAdapter';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';
import type {
  Product, ProductVariant, CartItem, CartTotals, PaymentMode,
} from '@/types';
import type { PaginatedResponse } from '@/lib/api/core/types';

// ── مكوّنات POS PRO ───────────────────────────────────────────────────────────
import POSProRail from '@/pos-pro/components/POSProRail';
import POSProCart from '@/pos-pro/components/POSProCart';
import POSProProductDrawer from '@/pos-pro/components/POSProProductDrawer';
import POSProScanbar from '@/pos-pro/components/POSProScanbar';
import POSProQuickPay from '@/pos-pro/components/POSProQuickPay';
import POSProWeightModal from '@/pos-pro/components/POSProWeightModal';
import POSProSessionDrawer from '@/pos-pro/components/POSProSessionDrawer';
import POSProRecentBar from '@/pos-pro/components/POSProRecentBar';
import { TotalCard, CustomerCard } from '@/pos-pro/components/POSProTopCards';

// ── مودالات مشتركة (lazy — نفس النهج في POSPage) ────────────────────────────
const OpenSessionModal = React.lazy(() => import('@/pos/components/OpenSessionModal'));
const CustomerSearchModal = React.lazy(() => import('@/pos/components/CustomerSearchModal'));
const ProfessionalPaymentModal = React.lazy(() => import('@/pos/components/ProfessionalPaymentModal'));
const ProfessionalReceipt = React.lazy(() => import('@/pos/components/ProfessionalReceipt'));

/** خصم تراكمي مطابق لـ POSPage — يجب أن يتطابق مع حساب الباكاند بالضبط */
function compoundDiscountPct(linePct: number, invoicePct: number): number {
  if (invoicePct <= 0) return linePct;
  const compounded = 100 - (100 - linePct) * (100 - invoicePct) / 100;
  return Math.min(100, compounded);
}

export default function POSProPage() {
  const queryClient = useQueryClient();
  const slug = useActiveSlug();
  const company = useActiveCompany();

  // ── الإعدادات المشتركة (قراءة فقط — نفس قيم POS للاتساق) ────────────────
  const { settings } = usePOSSettings(slug);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Lookups مجمّعة ─────────────────────────────────────────────────────────
  const { data: posLookups } = usePOSAggregatedLookups();
  const fiscalStampVal = posLookups?.settings?.fiscal_stamp_enabled;
  const systemFiscalStampEnabled = fiscalStampVal === undefined
    ? true
    : (fiscalStampVal === true || fiscalStampVal === 1 || fiscalStampVal === '1'
      || String(fiscalStampVal).toLowerCase() === 'true');

  const pos = usePosPro(systemFiscalStampEnabled);
  const posRef = useRef(pos);
  posRef.current = pos;
  const fiscalYear = useSelectedFiscalYear();

  const warehouses       = posLookups?.warehouses ?? [];
  const documentTypes    = posLookups?.documentTypes ?? [];
  const currencies       = posLookups?.currencies ?? [];
  const treasuryAccounts = posLookups?.treasuryAccounts ?? [];
  const fiscalYears      = posLookups?.fiscalYears ?? [];
  const paymentModes     = posLookups?.paymentModes ?? [];

  const defaultWarehouse = settings.defaultWarehouseId
    ? warehouses?.find(w => w.id === settings.defaultWarehouseId)
    : (warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null);
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── الجلسة ─────────────────────────────────────────────────────────────────
  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const openSessionMut  = useOpenSession();
  const incrementMut    = useIncrementSession(currentSession?.id ?? null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.length > 0) return error;
    return fallback;
  };

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number; opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try { await openSessionMut.mutateAsync(data); }
    catch (e: unknown) { setSessionError(getErrorMessage(e, 'فشل فتح الجلسة')); }
  };

  // ── توست: no-op عند تعطيل الإشعارات ──────────────────────────────────────
  const safeToast = useMemo(() => {
    if (settings.toastEnabled) return toast;
    return new Proxy(toast, {
      get: (_target, prop) => {
        if (prop === 'dismiss' || prop === 'remove') return () => {};
        return () => '';
      },
    });
  }, [settings.toastEnabled]);
  const clearConfirm = useConfirm();

  // ── مسح السلة عند تبديل الشركة (حماية من stale product_id) ──────────────
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (prevSlugRef.current && prevSlugRef.current !== slug) {
      posRef.current.clearCart();
    }
    prevSlugRef.current = slug;
  }, [slug]);

  // ── الزبون الافتراضي "زبون نقدي" ─────────────────────────────────────────
  const { data: cashClient } = useCashClient();
  useEffect(() => {
    if (cashClient && !posRef.current.client) {
      posRef.current.setClient(cashClient);
    }
  }, [cashClient]);

  // ── المنتجات (كلها دفعة واحدة — الفلترة محلية داخل المودال) ──────────────
  const { data: productsRaw, isLoading: productsLoading } = useQuery({
    queryKey: [slug, 'pos-pro', 'products', { perPage: 2000 }],
    queryFn: () => productsApi.list({
      per_page: 2000,
      include: 'tva,unit,family,prices,quantityDiscounts,packagings,barcodes',
      filter: { active: 1 },
    }),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });

  const rawProducts = useMemo(() => (
    Array.isArray(productsRaw)
      ? productsRaw
      : (productsRaw as PaginatedResponse<Product>)?.data ?? []
  ), [productsRaw]);

  // ── المخزون (عبر stock-at) ────────────────────────────────────────────────
  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-pro-stock', defaultWarehouse?.id ?? null, fiscalYear?.id],
    queryFn: () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   defaultWarehouse?.id,
        fiscal_year_id: fiscalYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!defaultWarehouse?.id,
    staleTime: 10_000,
  });

  const allVariants: ProductVariant[] = useMemo(() =>
    rawProducts.map(p => {
      const v = productToVariant(p);
      const stock = stockData[p.id];
      if (stock !== undefined) v.current_stock = stock;
      return v;
    }),
    [rawProducts, stockData],
  );

  const families = useMemo(() => Array.from(
    new Map(
      allVariants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!]),
    ).values(),
  ), [allVariants]);

  // ── حالة الواجهة ──────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [saleBusy, setSaleBusy] = useState(false);
  const cartWrapRef = useRef<HTMLDivElement>(null);
  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);

  type WeightTarget =
    | { mode: 'add';  variant: ProductVariant }
    | { mode: 'edit'; item: CartItem };
  const [weightTarget, setWeightTarget] = useState<WeightTarget | null>(null);

  // ── وسائل الدفع السريع: نقدي + بطاقة ─────────────────────────────────────
  const cashMode = useMemo(() => {
    const list = paymentModes ?? [];
    const code = settings.defaultPaymentCode;
    const byCode = code
      ? list.find(m =>
          new RegExp(code, 'i').test(m.name) ||
          new RegExp(code, 'i').test(m.code),
        )
      : undefined;
    return byCode ?? list.find(m => m.is_cash === true) ?? list.find(m => m.is_default) ?? list[0] ?? null;
  }, [paymentModes, settings.defaultPaymentCode]);

  const cardMode = useMemo(() => {
    const list = paymentModes ?? [];
    const re = /بطاقة|كارت|card|cie|cb|بنك|bank|الدفع الإلكتروني|شبكة/i;
    const byName = list.find(m => re.test(m.name) && m.id !== cashMode?.id);
    return byName
      ?? list.find(m => m.is_cash === false && m.id !== cashMode?.id)
      ?? list.find(m => m.id !== cashMode?.id)
      ?? null;
  }, [paymentModes, cashMode]);

  // ── الإجمالي النهائي (TTC + طابع جبائي) ─────────────────────────────────
  const adjustedTotalTtcFinal = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  // ── الطباعة ──────────────────────────────────────────────────────────────
  const { template, enabled: isPrintEnabled, copies: dbCopies, paperWidth } = usePrintSettings('POS');
  const copies = settings.printCopies || dbCopies;

  const posTemplate = useMemo(() => {
    if (!template) return null;
    const overrides: Partial<typeof template> = {};
    let changed = false;
    if (settings.receiptCompanyName) {
      const name = settings.receiptHeader2
        ? `${settings.receiptCompanyName}\n${settings.receiptHeader2}`
        : settings.receiptCompanyName;
      overrides.company_name_text = name;
      changed = true;
    } else if (settings.receiptHeader2) {
      overrides.company_name_text = settings.receiptHeader2;
      changed = true;
    }
    if (settings.receiptFooter) {
      overrides.footer_line1 = settings.receiptFooter;
      changed = true;
    }
    if (settings.receiptShowQr !== undefined) {
      overrides.show_qr = settings.receiptShowQr;
      changed = true;
    }
    if (!changed) return template;
    return { ...template, ...overrides };
  }, [template, settings.receiptCompanyName, settings.receiptHeader2, settings.receiptFooter, settings.receiptShowQr]);

  const companyData: CompanyPreviewData | null = useMemo(() => mapCompany(company), [company]);

  const handlePrintDirect = useCallback(async (snap: POSSaleSnapshot, opts?: { silent?: boolean }) => {
    if (!posTemplate) { safeToast.error('لا يوجد قالب طاعة'); return; }
    try {
      const resolvedDocNum = snap.docNumber;
      const isThermalPaper = posTemplate.paper_size === '80mm' || posTemplate.paper_size === '58mm';

      if (opts?.silent) {
        if (!isWebUsbSupported()) { safeToast.error('الطباعة المباشرة تتطلب متصفح يدعم WebUSB'); return; }
        if (!resolvedDocNum) { safeToast.error('رقم الفاتورة غير متوفر للطباعة المباشرة'); return; }
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalViaWebUSBFromTemplate(posTemplate, data, resolvedDocNum);
        if (result.ok) safeToast.success('تمت الطباعة');
        else safeToast.error(`خطأ في الطباعة: ${result.message}`);
        return;
      }

      const html = await renderPreviewToHtml({
        template: posTemplate,
        company: companyData,
        source: { type: 'pos-snapshot', snapshot: snap },
      });

      if (settings.printMode === 'thermal' && resolvedDocNum && isThermalPaper) {
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalViaWebUSBFromTemplate(posTemplate, data, resolvedDocNum);
        if (result.ok) {
          safeToast.success('تمت الطباعة الحرارية');
        } else {
          safeToast.error(`خطأ في الطباعة الحرارية: ${result.message}`);
          await printReceiptDirect({ html, paperWidth, copies: copies ?? 1, onError: (e) => safeToast.error(`خطأ في طباعة المتصفح: ${e.message}`) });
        }
      } else {
        await printReceiptDirect({ html, paperWidth, copies, onDone: () => safeToast.success('تم إرسال الطباعة'), onError: (e) => safeToast.error(`خطأ في الطباعة: ${e.message}`) });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      safeToast.error(`خطأ في تجهيز الطباعة: ${message}`);
    }
  }, [posTemplate, safeToast, companyData, settings.printMode, paperWidth, copies]);

  // ── إضافة منتج من المودال/المسح (يبقى المودال مفتوحاً لإضافة متعددة) ─────
  const handleAddItem = useCallback(async (v: ProductVariant) => {
    if (v.is_sold_by_weight) {
      setWeightTarget({ mode: 'add', variant: v });
      return;
    }
    if (isVariantOutOfStock(v)) {
      safeToast.error(`${v.product?.name ?? ''} نفد المخزون`);
      return;
    }
    if (v.manages_stock && v.current_stock !== undefined) {
      const existing = posRef.current.items.find(i => i.variant_id === v.id);
      const already  = existing ? existing.quantity * (existing.pack_qty ?? 1) : 0;
      if (already + 1 > v.current_stock) {
        const ok = await clearConfirm.confirm(
          `${v.product?.name ?? ''} — المخزون المتبقي ${v.current_stock} فقط. هل تريد البيع بالرغم من ذلك؟`,
          { title: 'مخزون غير كافٍ', variant: 'warning', icon: 'ti-alert-triangle' },
        );
        if (!ok) return;
      }
    }
    posRef.current.addItem(v);
    safeToast.success(v.product?.name ?? 'تمت الإضافة', { id: 'pos-pro-last-added', duration: 1500 });
  }, [safeToast, clearConfirm]);

  // ── مسح الباركود من الشريط العلوي: تطابق دقيق ثم إضافة فورية ─────────────
  const handleScan = useCallback((code: string): boolean => {
    const hit = allVariants.find(v =>
      v.barcode === code ||
      v.ref === code ||
      (v as any).barcodes?.some((bc: { barcode: string }) => bc.barcode === code),
    );
    if (!hit) {
      safeToast.error(`لا يوجد منتج بالباركود «${code}»`);
      return false;
    }
    void handleAddItem(hit);
    return true;
  }, [allVariants, safeToast, handleAddItem]);

  // ── إتمام البيع ───────────────────────────────────────────────────────────
  const handleCompleteSale = useCallback(async (params: {
    amountPaid: number;
    dueDate?: string;
    note?: string;
    docTypeCode?: string;
    payments?: Array<{ id?: number; paymentModeId: number; amount: number; treasuryAccountId?: number | null; reference?: string | null }>;
    currencyId?: number | null;
    skipPreview?: boolean;
  }) => {
    const typeCode = params.docTypeCode ?? settings.defaultDocTypeCode;
    const invType = documentTypes?.find(t => t.code === typeCode)
      ?? documentTypes?.find(t => t.code === 'POS')
      ?? documentTypes?.find(t => t.code === 'FV')
      ?? documentTypes?.find(t => t.code === 'BL')
      ?? documentTypes?.[0];

    if (!invType)           return { ok: false, message: 'لم يُعثَر على نوع مستند' };
    if (!defaultWarehouse)  return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
    if (!fiscalYear)        return { ok: false, message: 'لا توجد سنة مالية نشطة' };

    const currentClient  = posRef.current.client;
    const currentItems   = posRef.current.items;
    const currentTotals  = posRef.current.totals;
    const currentInvDisc = posRef.current.invoiceDiscountPct;

    setSaleBusy(true);
    try {
      const snapshot = { items: [...currentItems], totals: { ...currentTotals } as CartTotals };
      const today = new Date().toISOString().slice(0, 10);
      const apiPayments: import('@/lib/api/endpoints/documents').DocumentPaymentInput[] = (params.payments ?? [])
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

      const linesPayload = currentItems.map(i => {
        const compoundedDisc = compoundDiscountPct(i.discount_percentage, currentInvDisc);
        const baseQty = i.quantity * (i.pack_qty ?? 1);
        const lineDiscAmount = baseQty > 0 ? Math.round((i.discount_amount / baseQty) * 100) / 100 : 0;
        const isFixedAmount  = i.discount_mode === 'fixed_amount' && lineDiscAmount > 0;
        return {
          product_id:               i.product_id,
          quantity:                 i.quantity,
          pack_qty:                 i.pack_qty ?? 1,
          unit_price_ht:            i.unit_price_ht,
          discount_percentage:      isFixedAmount ? 0 : Math.min(100, compoundedDisc),
          discount_amount:          lineDiscAmount,
          discount_amount_per_unit: isFixedAmount ? lineDiscAmount : null,
          tva_rate:                 clientIsTvaExempt ? 0 : i.tva_rate,
          packaging_id:             i.packaging_id ?? null,
        };
      });

      const effectiveTotalHt = linesPayload.reduce((s: number, l: Record<string, any>) => {
        const gross = l.quantity * l.unit_price_ht;
        const bq = l.quantity * l.pack_qty;
        const disc = l.discount_amount_per_unit
          ? l.discount_amount_per_unit * bq
          : gross * (l.discount_percentage / 100);
        return s + gross - disc;
      }, 0);
      const effectiveTotalTva = linesPayload.reduce((s: number, l: Record<string, any>) => {
        const gross = l.quantity * l.unit_price_ht;
        const bq = l.quantity * l.pack_qty;
        const disc = l.discount_amount_per_unit
          ? l.discount_amount_per_unit * bq
          : gross * (l.discount_percentage / 100);
        const lineHt = gross - disc;
        return s + lineHt * l.tva_rate / 100;
      }, 0);
      const effectiveTotalTtc = effectiveTotalHt + effectiveTotalTva + (snapshot.totals.fiscal_stamp ?? 0);

      const currentSessionId = currentSession?.id ?? null;

      const res = await documentsApi.create({
        party_id:         currentClient?.id ?? null,
        warehouse_id:     defaultWarehouse.id,
        fiscal_year_id:   fiscalYear.id,
        currency_id:      params.currencyId ?? defaultCurrency?.id ?? undefined,
        document_date:    today,
        due_date:         params.dueDate ?? null,
        notes:            params.note ?? posRef.current.notes ?? null,
        document_type_id: invType.id,
        lines:            linesPayload,
        payments:         apiPayments,
        pos_session_id:   currentSessionId,
      });

      if (currentSession?.id) {
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

      const fullSnapshot: POSSaleSnapshot = {
        items: snapshot.items.map(i => ({
          name: i.product_name,
          ref:  i.ref,
          qty:  i.quantity,
          unit_price_ht:      i.unit_price_ht,
          unit:               i.unit_symbol,
          tva_rate:           i.tva_rate / 100,
          discount_percentage: i.discount_percentage,
          total_ht:           i.total_ht,
        })),
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
        payments: params.payments?.filter(p => p.amount > 0).map(p => ({
          mode: String(p.paymentModeId), amount: p.amount,
        })) ?? [],
        dueDate: params.dueDate,
        prevBalance: res?.balance_data?.previous_balance ?? null,
        newBalance,
      };
      receiptSnapshotRef.current = fullSnapshot;

      posRef.current.clearCart();
      posRef.current.setInvoiceDiscountPct(0);
      posRef.current.setPayments([]);
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

      safeToast.success(`تم حفظ الفاتورة ${res.document_number ?? ''}`);
      if (settings.playSoundOnSale) playSaleSound(settings.soundPreset as SoundPresetId, settings.soundVolume);

      if (settings.openCashDrawer) {
        const hasCash = apiPayments.some(p => {
          const mode = (paymentModes ?? []).find(m => m.id === p.payment_mode_id);
          return mode && /نقدا|نقداً|cash/i.test(mode.name);
        });
        if (hasCash) openCashDrawerViaWebUSB();
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
  }, [settings, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency?.id, defaultTreasury?.id, currentSession?.id, incrementMut, queryClient, slug, handlePrintDirect, paymentModes, isPrintEnabled, template, safeToast]);

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
  }, [settings.defaultDocTypeCode, handleCompleteSale, safeToast]);

  // ── فتح الدفع / المنتجات ─────────────────────────────────────────────────
  const handleOpenPayment = useCallback(() => {
    if (posRef.current.items.length === 0) { safeToast.info('أضف منتجات أولاً'); return; }
    setPaymentOpen(true);
  }, [safeToast]);

  // ── اختصار لوحة المفاتيح: F2 = فتح المنتجات ─────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !e.repeat && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setDrawerOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const canSell = pos.items.length > 0 && !saleBusy;

  return (
    <div className="pos-pro" dir="rtl">
      {!sessionLoading && !currentSession && (
        <Suspense fallback={null}>
          <OpenSessionModal
            warehouses={warehouses ?? []}
            fiscalYears={fiscalYears as any}
            defaultWarehouseId={defaultWarehouse?.id}
            defaultFiscalYearId={fiscalYear?.id}
            isLoading={openSessionMut.isPending}
            error={sessionError}
            onOpen={handleOpenSession}
          />
        </Suspense>
      )}

      <div className="pos-pro-body">
        <POSProRail
          canSell={canSell}
          isBusy={saleBusy}
          onOpenProducts={() => setDrawerOpen(true)}
          onPay={handleOpenPayment}
          onQuickPay={() => handleQuickPay(cashMode)}
          onSession={() => setSessionOpen(true)}
          sessionAvailable={!!currentSession}
          onScrollToCart={() => cartWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />

        <div className="pos-pro-main">
          <div className="pos-pro-top">
            <CustomerCard client={pos.client} onOpenCustomers={() => setCustomerModalOpen(true)} />
            <TotalCard totals={pos.totals} adjustedTotal={adjustedTotalTtcFinal} invoiceDiscPct={pos.invoiceDiscountPct} />
          </div>

          <POSProScanbar onScan={handleScan} />

          <POSProQuickPay
            cashMode={cashMode}
            cardMode={cardMode}
            disabled={!canSell}
            onCash={() => handleQuickPay(cashMode)}
            onCard={() => handleQuickPay(cardMode)}
          />

          {!productsLoading && currentSession && (
            <POSProRecentBar
              top={currentSession.top_products ?? []}
              variants={allVariants}
              onAdd={handleAddItem}
            />
          )}

          <div className="pos-pro-cart-wrap" ref={cartWrapRef}>
            <POSProCart
              items={pos.items}
              invoiceDiscountPct={pos.invoiceDiscountPct}
              onQty={pos.updateQty}
              onDiscount={pos.updateDiscount}
              onPrice={pos.updatePrice}
              onPackaging={pos.updatePackaging}
              onWeight={(item) => setWeightTarget({ mode: 'edit', item })}
              onRemove={pos.removeItem}
              onClear={() => clearConfirm.confirm('مسح السلة بالكامل؟').then(ok => { if (ok) pos.clearCart(); })}
              onInvoiceDiscountChange={pos.setInvoiceDiscountPct}
              onOpenProducts={() => setDrawerOpen(true)}
            />
          </div>

          {!productsLoading && (
            <div className="pos-pro-hint">
              <i className="ti ti-keyboard" />
              F2 لفتح المنتجات · الباركود يُمسح مباشرة في الشريط العلوي
            </div>
          )}
        </div>
      </div>

      {/* مودال المنتجات — يبقى مفتوحاً أثناء الإضافة */}
      <POSProProductDrawer
        open={drawerOpen}
        variants={allVariants}
        families={families}
        cartCount={pos.items.length}
        onAdd={handleAddItem}
        onClose={() => setDrawerOpen(false)}
      />

      {customerModalOpen && (
        <Suspense fallback={null}>
          <CustomerSearchModal
            currentClient={pos.client}
            onSelect={(c) => { pos.setClient(c); setCustomerModalOpen(false); }}
            onClose={() => setCustomerModalOpen(false)}
          />
        </Suspense>
      )}

      {paymentOpen && (
        <Suspense fallback={null}>
          <ProfessionalPaymentModal
            totals={pos.totals}
            client={pos.client}
            paymentModes={paymentModes}
            documentTypes={documentTypes}
            currencies={currencies}
            treasuryAccounts={treasuryAccounts}
            totalTtcFinal={adjustedTotalTtcFinal}
            existingPayments={pos.payments}
            documentDate={new Date().toISOString().slice(0, 10)}
            defaultPaymentCode={settings.defaultPaymentCode}
            defaultDocTypeCode={settings.defaultDocTypeCode}
            onClose={() => setPaymentOpen(false)}
            onConfirm={handleCompleteSale}
          />
        </Suspense>
      )}

      {receiptOpen && receiptSnapshotRef.current && posTemplate && (
        <Suspense fallback={null}>
          <ProfessionalReceipt
            template={posTemplate}
            company={companyData}
            source={{ type: 'pos-snapshot', snapshot: receiptSnapshotRef.current } as PipelineSource}
            docNumber={receiptSnapshotRef.current.docNumber}
            onClose={() => setReceiptOpen(false)}
            onPrint={() => { const snap = receiptSnapshotRef.current; if (snap) handlePrintDirect(snap); }}
            onNewSale={() => { setReceiptOpen(false); if (settings.openClientOnNewSale) setCustomerModalOpen(true); }}
          />
        </Suspense>
      )}

      {weightTarget && (
        <POSProWeightModal
          open
          name={weightTarget.mode === 'add'
            ? weightTarget.variant.product?.name ?? ''
            : weightTarget.item.product_name}
          priceHtPerKg={weightTarget.mode === 'add'
            ? weightTarget.variant.default_selling_price_ht
            : weightTarget.item.unit_price_ht / (weightTarget.item.pack_qty ?? 1)}
          tvaRate={weightTarget.mode === 'add'
            ? weightTarget.variant.tva?.rate ?? 0
            : weightTarget.item.tva_rate}
          initialKg={weightTarget.mode === 'edit' ? weightTarget.item.quantity : undefined}
          confirmLabel={weightTarget.mode === 'edit' ? 'تحديث الوزن' : 'إضافة بالسلة'}
          onConfirm={(kg) => {
            if (weightTarget.mode === 'add') {
              pos.addItem(weightTarget.variant, kg);
              safeToast.success(weightTarget.variant.product?.name ?? 'تمت الإضافة', { id: 'pos-pro-last-added', duration: 1500 });
            } else {
              pos.updateQty(weightTarget.item.id, kg);
            }
          }}
          onClose={() => setWeightTarget(null)}
        />
      )}

      {sessionOpen && (
        <POSProSessionDrawer
          session={currentSession ?? null}
          onClose={() => setSessionOpen(false)}
          onClosed={() => { pos.clearCart(); pos.setInvoiceDiscountPct(0); }}
        />
      )}

      <ConfirmDialog {...clearConfirm.confirmDialogProps} />
    </div>
  );
}
