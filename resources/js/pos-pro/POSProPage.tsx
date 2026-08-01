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
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { usePOSAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { productsApi } from '@/lib/api/endpoints/products';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { apiGet } from '@/lib/api/core/client';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { useCashClient } from '@/lib/api/endpoints/parties';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';
import {
  useCurrentPosSession,
  useOpenSession,
  useIncrementSession,
  buildIncrementInput,
} from '@/lib/api/endpoints/posSession';
import { usePosPro } from '@/pos-pro/hooks/usePosPro';
import { usePosProKeyboardShortcuts } from '@/pos-pro/hooks/usePosProKeyboardShortcuts';
import { useKbOverrides } from '@/pos/hooks/useKeyboardMap';
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { nanoid } from 'nanoid';
import { productToVariant, isVariantOutOfStock, getVariantPrice, makeFakeVariant } from '@/pos/utils/posHelpers';
import { usePOSSettings, checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import { usePrintSettings } from '@/pos/hooks/usePrintSettings';
import { printReceiptDirect } from '@/pos/utils/printUtils';
import { openCashDrawerViaWebUSB, isWebUsbSupported, printThermalViaWebUSBFromTemplate } from '@/pos/utils/printService';
import { playSaleSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import { htToTtc, ttcToHt } from '@/pos/utils/calculations';
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
  Product, ProductVariant, CartItem, CartTotals, PaymentMode, ProductPackaging,
} from '@/types';
import type { PaginatedResponse, CommercialDocument } from '@/lib/api/core/types';

// ── مكوّنات POS PRO ───────────────────────────────────────────────────────────
import POSProRail from '@/pos-pro/components/POSProRail';
import POSProCart from '@/pos-pro/components/POSProCart';
import POSProProductDrawer from '@/pos-pro/components/POSProProductDrawer';
import POSProScanbar from '@/pos-pro/components/POSProScanbar';
import POSProWeightModal from '@/pos-pro/components/POSProWeightModal';
import POSProSessionDrawer from '@/pos-pro/components/POSProSessionDrawer';
import { TotalCard, CustomerCard } from '@/pos-pro/components/POSProTopCards';

// ── مودالات مشتركة (lazy — نفس النهج في POSPage) ────────────────────────────
const OpenSessionModal = React.lazy(() => import('@/pos/components/OpenSessionModal'));
const CustomerSearchModal = React.lazy(() => import('@/pos/components/CustomerSearchModal'));
const ProfessionalPaymentModal = React.lazy(() => import('@/pos/components/ProfessionalPaymentModal'));
const ProfessionalReceipt = React.lazy(() => import('@/pos/components/ProfessionalReceipt'));
const HeldCartsModal    = React.lazy(() => import('@/pos/components/HeldCartsModal'));
const ReturnsModal      = React.lazy(() => import('@/pos/components/ReturnsModal'));
const KeyboardHelpModal = React.lazy(() => import('@/pos/components/KeyboardHelpModal'));
const ManualProductModal   = React.lazy(() => import('@/pos/components/ManualProductModal'));
const SessionInvoicesModal = React.lazy(() => import('@/pos/components/SessionInvoicesModal'));
const POSSettingsModal     = React.lazy(() => import('@/pos/components/POSSettingsModal'));
const ManagerPinModal      = React.lazy(() => import('@/pos/components/ManagerPinModal'));
const BarcodeScannerModal  = React.lazy(() => import('@/components/BarcodeScannerModal'));

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
  const { settings, setSettings, resetSettings } = usePOSSettings(slug);
  const [searchParams, setSearchParams] = useSearchParams();
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Lookups مجمّعة ─────────────────────────────────────────────────────────
  const { data: posLookups } = usePOSAggregatedLookups();
  const fiscalStampVal = posLookups?.settings?.fiscal_stamp_enabled;
  const systemFiscalStampEnabled = fiscalStampVal === undefined
    ? true
    : (fiscalStampVal === true || fiscalStampVal === 1 || fiscalStampVal === '1'
      || String(fiscalStampVal).toLowerCase() === 'true');

  const negSettingVal = posLookups?.settings?.allow_negative_stock;
  const allowNegSetting = negSettingVal === undefined
    ? false
    : (negSettingVal === true || negSettingVal === 1 || negSettingVal === '1'
      || String(negSettingVal).toLowerCase() === 'true');

  const pos = usePosPro(systemFiscalStampEnabled);
  const posRef = useRef(pos);
  posRef.current = pos;

  // ── تخصيصات الاختصارات المشتركة مع POS الكلاسيكي (تُقرأ مرة واحدة) ─────────
  const kbOverrides    = useKbOverrides(slug);
  const kbOverridesRef = useRef(kbOverrides);
  kbOverridesRef.current = kbOverrides;
  const scanRef = useRef<HTMLInputElement | null>(null);
  const fiscalYear = useSelectedFiscalYear();

  const warehouses       = posLookups?.warehouses ?? [];
  const documentTypes    = posLookups?.documentTypes ?? [];
  const currencies       = posLookups?.currencies ?? [];
  const treasuryAccounts = posLookups?.treasuryAccounts ?? [];
  const fiscalYears      = posLookups?.fiscalYears ?? [];
  const paymentModes     = posLookups?.paymentModes ?? [];
  const priceLevelsList  = useMemo(() => posLookups?.priceLevels ?? [], [posLookups]);

  const dbDefaultPriceLevelId = (() => {
    const v = posLookups?.settings?.default_price_level_id;
    return v != null && v !== '' && v !== 0 ? Number(v) : null;
  })();

  const defaultWarehouse = settings.defaultWarehouseId
    ? warehouses?.find(w => w.id === settings.defaultWarehouseId)
    : (warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null);
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── المستودع النشط — قابل للتغيير من مودال الجلسة ────────────────────────
  const [activeWarehouseId, setActiveWarehouseId] = useState<number | null>(null);
  const activeWarehouse = useMemo(
    () => (activeWarehouseId ? (warehouses?.find(w => w.id === activeWarehouseId) ?? null) : defaultWarehouse),
    [activeWarehouseId, warehouses, defaultWarehouse],
  );
  // مزامنة: عند توفر المستودع الافتراضي، نعتمده افتراضياً
  useEffect(() => {
    if (!activeWarehouseId && defaultWarehouse) setActiveWarehouseId(defaultWarehouse.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultWarehouse?.id]);

  // ── الجلسة ─────────────────────────────────────────────────────────────────
  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const openSessionMut  = useOpenSession();
  const incrementMut    = useIncrementSession(currentSession?.id ?? null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // مزامنة: عند فتح جلسة جديدة نعتمد مستودعها
  useEffect(() => {
    const whId = currentSession?.warehouse?.id;
    if (whId) setActiveWarehouseId(whId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

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
    queryKey: [slug, 'pos-pro-stock', activeWarehouse?.id ?? null, fiscalYear?.id],
    queryFn: () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   activeWarehouse?.id,
        fiscal_year_id: fiscalYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!activeWarehouse?.id,
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
  const [heldOpen, setHeldOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSessionInvoices, setShowSessionInvoices] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saleBusy, setSaleBusy] = useState(false);
  const cartWrapRef = useRef<HTMLDivElement>(null);
  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);
  const [pinModal, setPinModal] = useState<{
    requestedDiscount: number;
    reason: 'max_exceeded' | 'pin_required';
    onSuccess: () => void;
  } | null>(null);

  // ── تعديل فاتورة موجودة (من فواتير الجلسة أو رابط ?edit=) ───────────────
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingDocumentDate, setEditingDocumentDate] = useState<string | null>(null);
  const [editingDocumentNumber, setEditingDocumentNumber] = useState<string | null>(null);
  const [cartNote, setCartNote] = useState('');
  const editingPrevBalanceRef = useRef<number | null>(null);
  const editingDocMetaRef = useRef<{
    dueDate: string | null; typeCode: string | null; currencyId: number | null;
  }>({ dueDate: null, typeCode: null, currencyId: null });

  const clearEditingState = useCallback(() => {
    setEditingDocumentId(null);
    setEditingDocumentDate(null);
    setEditingDocumentNumber(null);
    setCartNote('');
    editingPrevBalanceRef.current = null;
    editingDocMetaRef.current = { dueDate: null, typeCode: null, currencyId: null };
  }, []);

  // ── قائمة الأسعار ────────────────────────────────────────────────────────
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedPriceLevelId === null && dbDefaultPriceLevelId != null) {
      setSelectedPriceLevelId(dbDefaultPriceLevelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbDefaultPriceLevelId]);

  // ── رصيد الزبون (يُعرض قبل الدفع) ────────────────────────────────────────
  const clientId = pos.client?.id;
  const { data: clientBalance } = useQuery({
    queryKey: tenantKeys.partyBalances.detail(slug ?? '', clientId ?? 0),
    queryFn:  () => partyBalancesApi.getOne(clientId!),
    enabled:  !!slug && !!clientId,
    staleTime: 30_000,
  });

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

  // ── زر الطباعة على اليسار: يطبع السلة الحالية كإيصال (بدون إتمام البيع) ──
  const handlePrintCart = useCallback(() => {
    if (pos.items.length === 0) { safeToast.error('السلة فارغة'); return; }
    const snap: POSSaleSnapshot = {
      docNumber: '',
      docDate: new Date().toISOString().slice(0, 10),
      client: pos.client,
      items: pos.items.map(i => ({
        name: i.product_name,
        ref:  i.ref,
        qty:  i.quantity,
        unit_price_ht: i.unit_price_ht,
        unit: i.unit_symbol,
        tva_rate: i.tva_rate / 100,
        discount_percentage: i.discount_percentage,
        total_ht: i.total_ht,
      })),
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
  }, [pos.items, pos.client, pos.totals, adjustedTotalTtcFinal, handlePrintDirect, safeToast]);

  // ── إضافة منتج من المودال/المسح (يبقى المودال مفتوحاً لإضافة متعددة) ─────
  const handleAddItem = useCallback(async (v: ProductVariant) => {
    let effective = v;
    if (selectedPriceLevelId != null) {
      const price = getVariantPrice(v, selectedPriceLevelId, priceLevelsList);
      if (price !== v.default_selling_price_ht) {
        effective = { ...v, default_selling_price_ht: price };
      }
    }
    if (effective.is_sold_by_weight) {
      setWeightTarget({ mode: 'add', variant: effective });
      return;
    }
    if (isVariantOutOfStock(effective, allowNegSetting)) {
      safeToast.error(`${effective.product?.name ?? ''} نفد المخزون`);
      return;
    }
    if (effective.manages_stock && effective.current_stock !== undefined) {
      const existing = posRef.current.items.find(i => i.variant_id === effective.id);
      const already  = existing ? existing.quantity * (existing.pack_qty ?? 1) : 0;
      if (already + 1 > effective.current_stock) {
        const ok = await clearConfirm.confirm(
          `${effective.product?.name ?? ''} — المخزون المتبقي ${effective.current_stock} فقط. هل تريد البيع بالرغم من ذلك؟`,
          { title: 'مخزون غير كافٍ', variant: 'warning', icon: 'ti-alert-triangle' },
        );
        if (!ok) return;
      }
    }
    posRef.current.addItem(effective);
    safeToast.success(effective.product?.name ?? 'تمت الإضافة', { id: 'pos-pro-last-added', duration: 1500 });
  }, [selectedPriceLevelId, priceLevelsList, allowNegSetting, safeToast, clearConfirm]);

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
      const isEditingExistingDocument = !!editingDocumentId;

      let res;
      if (editingDocumentId) {
        res = await documentsApi.update(editingDocumentId, {
          party_id:         currentClient?.id ?? null,
          warehouse_id:     activeWarehouse.id,
          fiscal_year_id:   fiscalYear.id,
          currency_id:      params.currencyId ?? defaultCurrency?.id ?? undefined,
          document_date:    editingDocumentDate ?? today,
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
      if (currentSession?.id && !isEditingExistingDocument) {
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

      clearEditingState();
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
  }, [settings, documentTypes, activeWarehouse, fiscalYear, defaultCurrency?.id, defaultTreasury?.id, currentSession?.id, incrementMut, queryClient, slug, handlePrintDirect, paymentModes, isPrintEnabled, template, safeToast]);

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

  // ── إعدادات النظام (تُزامن مع قاعدة البيانات مثل POS الكلاسيكي) ─────────
  const toggleFiscalStamp = useCallback(async (val: boolean) => {
    await settingsApi.update({ fiscal_stamp_enabled: val });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  const toggleAllowNegative = useCallback(async (val: boolean) => {
    await settingsApi.update({ allow_negative_stock: val });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  const saveDefaultPriceLevel = useCallback(async (id: number | null) => {
    await settingsApi.update({ default_price_level_id: id });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  // ── ملء الشاشة (native API + CSS fallback) ───────────────────────────────
  const toggleFullscreen = useCallback(() => {
    setFullscreen(prev => {
      if (!prev) {
        containerRef.current?.requestFullscreen?.().catch(() => {});
        return true;
      }
      document.exitFullscreen?.().catch(() => {});
      return false;
    });
  }, []);

  // ── فتح درج النقود ───────────────────────────────────────────────────────
  const handleOpenDrawer = useCallback(async () => {
    const res = await openCashDrawerViaWebUSB();
    if (!res.ok) safeToast.error(res.message ?? 'تعذّر فتح الدرج');
  }, [safeToast]);

  // ── قائمة الأسعار ────────────────────────────────────────────────────────
  const applyPriceLevel = useCallback((plId: number | null) => {
    setSelectedPriceLevelId(plId);
    if (plId === null) {
      pos.items.forEach(item => {
        const variant   = allVariants.find(v => v.id === item.variant_id);
        const origPrice = variant?.default_selling_price_ht;
        if (origPrice && origPrice !== item.unit_price_ht) pos.updatePrice(item.id, origPrice);
      });
      return;
    }
    const pl = priceLevelsList.find(p => p.id === plId);
    if (!pl) return;
    pos.items.forEach(item => {
      const variant    = allVariants.find(v => v.id === item.variant_id);
      const priceEntry = variant?.prices?.find(pr => pr.price_level_id === plId);
      if (priceEntry?.price) {
        pos.updatePrice(item.id, priceEntry.price);
      } else if (pl.discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - pl.discount_percent / 100));
      }
    });
  }, [priceLevelsList, allVariants, pos]);

  // ── خصم الفاتورة مع بوابة المدير (PIN) ───────────────────────────────────
  const handleInvoiceDiscountChange = useCallback((pct: number) => {
    if (pct <= 0) { posRef.current.setInvoiceDiscountPct(0); return; }
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.setInvoiceDiscountPct(pct); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.setInvoiceDiscountPct(pct),
    });
  }, [settings, safeToast]);

  // ── فتح فاتورة موجودة للتعديل (نفس تحويلات POS الكلاسيكي) ───────────────
  const handleOpenInvoice = useCallback(async (docId: number) => {
    const cartState = usePosProCart.getState();
    if (cartState.items.length > 0 && cartState._isDirty) posRef.current.holdCart();
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,documentType,lines,lines.product,lines.product.quantityDiscounts,lines.product_variant,lines.packaging,payments,payments.payment_mode',
      });
      if (!doc?.lines?.length) {
        safeToast.error('لا توجد أصناف في هذه الفاتورة');
        return;
      }

      const items: CartItem[] = doc.lines.map(line => {
        const v    = line.product_variant;
        const prod = line.product;
        const pkg  = (line as any).packaging ?? null;
        const pkgSnap = (line as any).packaging_units_snapshot;
        const qty      = Number(line.quantity);
        const priceHt  = Number(line.unit_price_ht);
        const discPct  = Number(line.discount_percentage);
        const gross    = qty * priceHt;
        const frozenPerUnit = Number((line as any).discount_amount_per_unit) || 0;
        let discountAmount: number;
        let discountMode: 'percentage' | 'fixed_amount';
        if (frozenPerUnit > 0) {
          discountAmount = frozenPerUnit * qty;
          discountMode   = 'fixed_amount';
        } else {
          const apiTotalDisc = Number((line as any).total_discount_amount) || 0;
          discountAmount = apiTotalDisc > 0 ? apiTotalDisc : gross * (discPct / 100);
          discountMode   = 'percentage';
        }
        return {
          id:                  nanoid(8),
          product_id:          line.product_id ?? prod?.id ?? 0,
          variant_id:          line.product_id ?? prod?.id ?? 0,
          product_name:        line.description ?? v?.product?.name ?? prod?.name ?? '',
          variant_name:        v?.variant_name ?? null,
          ref:                 v?.ref ?? prod?.ref ?? '',
          barcode:             v?.barcode ?? null,
          unit_symbol:         pkg?.label ?? v?.unit?.abbreviation ?? 'قطعة',
          image_url:           null,
          quantity:            qty,
          unit_price_ht:       priceHt,
          selling_price_ttc:   htToTtc(priceHt, Number(line.tva_rate)),
          tva_rate:            Number(line.tva_rate),
          tva_id:              v?.tva_id ?? null,
          discount_percentage: discPct,
          discount_amount:     Math.round(discountAmount * 100) / 100,
          discount_mode:       discountMode,
          total_ht:            Number(line.total_ht),
          total_ttc:           Number(line.total_ttc),
          max_stock:           null,
          manages_stock:       false,
          is_sold_by_weight:   prod?.is_sold_by_weight ?? false,
          packaging_id:        line.packaging_id ?? null,
          pack_qty:            pkg ? Number(pkg.quantity) : (pkgSnap ? Number(pkgSnap) : 1),
          packaging_label:     pkg?.label ?? null,
          base_price_ht:       priceHt / ((pkg ? Number(pkg.quantity) : (pkgSnap ? Number(pkgSnap) : 1)) || 1),
          quantity_discounts:  (prod as any)?.quantity_discounts ?? [],
        };
      });

      const payments = (doc.payments ?? []).map(p => ({
        id:                  p.id,
        payment_mode_id:     p.payment_mode_id,
        amount:              Number(p.amount),
        payment_date:        p.payment_date,
        treasury_account_id: p.treasury_account_id ?? null,
        reference:           p.reference ?? null,
      }));

      usePosProCart.setState({ items, client: doc.party ?? null, payments, notes: doc.notes ?? '' });
      usePosProCart.getState().markClean();
      setEditingDocumentId(docId);
      setEditingDocumentDate(doc.document_date ?? null);
      setEditingDocumentNumber(doc.document_number ?? null);
      editingPrevBalanceRef.current = doc.balance_data?.previous_balance ?? null;
      editingDocMetaRef.current = {
        dueDate:    doc.due_date ?? null,
        typeCode:   doc.document_type?.code ?? null,
        currencyId: doc.currency_id ?? null,
      };
      setCartNote(doc.notes ?? '');
      setShowSessionInvoices(false);
      safeToast.success(`تم فتح الفاتورة ${doc.document_number}`);
    } catch {
      safeToast.error('فشل تحميل الفاتورة');
    }
  }, [safeToast]);

  // ── فتح فاتورة من رابط ?edit= ────────────────────────────────────────────
  const openedFromUrlRef = useRef(false);
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !openedFromUrlRef.current) {
      openedFromUrlRef.current = true;
      const id = Number(editId);
      if (id > 0) {
        handleOpenInvoice(id).then(() => setSearchParams({}, { replace: true }));
      }
    }
  }, [searchParams, handleOpenInvoice, setSearchParams]);

  // ── طباعة فاتورة محفوظة (من فواتير الجلسة) ───────────────────────────────
  const handlePrintDocument = useCallback(async (docId: number) => {
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,documentType,lines,lines.product,lines.product_variant,payments,payments.payment_mode',
      });
      if (!doc) { safeToast.error('لم يتم العثور على الفاتورة'); return; }
      const balance = doc.balance_data;
      const snap: POSSaleSnapshot = {
        docNumber: doc.document_number,
        docDate: doc.document_date?.slice(0, 10) ?? '',
        client: doc.party ? { name: doc.party.name, nif: doc.party.nif, phone: doc.party.phone, address: doc.party.address } : null,
        items: (doc.lines ?? []).map(line => ({
          name: line.description ?? line.product?.name ?? '',
          ref: line.product?.ref,
          qty: Number(line.quantity),
          unit_price_ht: Number(line.unit_price_ht),
          unit: line.product?.unit?.abbreviation ?? null,
          tva_rate: Number(line.tva_rate),
          discount_percentage: Number(line.discount_percentage),
          total_ht: Number(line.total_ht),
        })),
        totals: {
          total_ht: Number(doc.total_ht),
          total_tva: Number(doc.total_tva),
          total_ttc: Number(doc.total_ttc),
          fiscal_stamp: Number((doc as any).total_stamp ?? doc.fiscal_stamp ?? 0),
          total_discount: Number(doc.total_discount),
          paid: Number(doc.paid_amount),
          change: Math.max(0, Number(doc.paid_amount) - Number(doc.total_ttc)),
          remaining: Number(doc.remaining_amount),
        },
        payments: (doc.payments ?? []).map(p => ({
          mode: p.payment_mode?.name ?? '',
          amount: Number(p.amount),
        })),
        prevBalance: balance?.previous_balance ?? null,
        newBalance: balance?.new_balance ?? null,
      };
      await handlePrintDirect(snap);
    } catch {
      safeToast.error('فشل طباعة الفاتورة');
    }
  }, [handlePrintDirect, safeToast]);

  // ── مسح الباركود بالكاميرا ───────────────────────────────────────────────
  const handleCameraScan = useCallback((barcode: string) => {
    if (!barcode || barcode.length < 4) return;
    let variant = allVariants.find(v => v.barcode === barcode);
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      handleAddItem(variant);
      return;
    }
    for (const v of allVariants) {
      const pkgs = (v.packagings ?? (v.product as any)?.packagings) as ProductPackaging[] | undefined;
      const match = pkgs?.find(p => p.barcode === barcode);
      if (match) { variant = v; break; }
    }
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      handleAddItem(variant);
      return;
    }
    for (const v of allVariants) {
      const bcList = v.barcodes;
      if (bcList?.some((bc: { barcode: string }) => bc.barcode === barcode)) {
        variant = v; break;
      }
    }
    if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
      handleAddItem(variant);
    } else {
      safeToast.error('لم يتم العثور على المنتج');
    }
  }, [allVariants, allowNegSetting, handleAddItem, safeToast]);

  // ── اختصارات لوحة المفاتيح (نفس منظومة POS الكلاسيكي: نفس المفاتيح، نفس
  //    التخزين المخصص لكل شركة، نفس مودال إعادة التخصيص) ─────────────────────
  const anyModalOpen = drawerOpen || customerModalOpen || paymentOpen || receiptOpen ||
    sessionOpen || heldOpen || returnsOpen || helpOpen || showSettings ||
    showSessionInvoices || showScanner || manualOpen || !!pinModal;
  const closeTopModal = useCallback(() => {
    if (paymentOpen)           setPaymentOpen(false);
    else if (receiptOpen)      setReceiptOpen(false);
    else if (sessionOpen)      setSessionOpen(false);
    else if (heldOpen)         setHeldOpen(false);
    else if (returnsOpen)      setReturnsOpen(false);
    else if (helpOpen)         setHelpOpen(false);
    else if (manualOpen)       setManualOpen(false);
    else if (customerModalOpen) setCustomerModalOpen(false);
    else if (drawerOpen)       setDrawerOpen(false);
    else if (showScanner)      setShowScanner(false);
    else if (showSettings)     setShowSettings(false);
    else if (showSessionInvoices) setShowSessionInvoices(false);
    else if (pinModal)         setPinModal(null);
  }, [drawerOpen, customerModalOpen, paymentOpen, receiptOpen, sessionOpen, heldOpen,
    returnsOpen, helpOpen, showSettings, showSessionInvoices, showScanner, manualOpen, pinModal]);

  usePosProKeyboardShortcuts(
    { posRef: posRef as { readonly current: any }, overridesRef: kbOverridesRef, scanRef, cartRef: cartWrapRef },
    { isEmpty: pos.items.length === 0, hasSession: !!currentSession, anyModalOpen },
    {
      setDrawerOpen, setPaymentOpen, setHeldOpen, setReturnsOpen, setHelpOpen,
      setManualOpen, setShowSessionInvoices, setShowSettings, setSessionOpen,
      setShowScanner, setCustomerModalOpen,
    },
    {
      toggleFullscreen,
      handleClearCart: () => clearConfirm.confirm('مسح السلة بالكامل؟').then(ok => { if (ok) { clearEditingState(); pos.clearCart(); } }),
      handleOpenDrawer: () => void handleOpenDrawer(),
      handleQuickCash: () => { void handleQuickPay(cashMode); },
      handlePrintCart,
      closeTopModal,
    },
  );

  const canSell = pos.items.length > 0 && !saleBusy;

  return (
    <div className={`pos-pro${fullscreen ? ' pos-fullscreen' : ''}`} dir="rtl" ref={containerRef}>
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
          onHold={() => pos.holdCart()}
          onHeld={() => setHeldOpen(true)}
          heldCount={pos.heldCarts.length}
          onReturns={() => setReturnsOpen(true)}
          onHelp={() => setHelpOpen(true)}
          onScrollToCart={() => cartWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onManual={() => setManualOpen(true)}
          onSessionInvoices={() => setShowSessionInvoices(true)}
          onFullscreen={toggleFullscreen}
          onOpenDrawer={() => void handleOpenDrawer()}
          onSettings={() => setShowSettings(true)}
        />

        <div className="pos-pro-main">
          <div className="pos-pro-top">
            <CustomerCard client={pos.client} onOpenCustomers={() => setCustomerModalOpen(true)} />
            <TotalCard totals={pos.totals} adjustedTotal={adjustedTotalTtcFinal} invoiceDiscPct={pos.invoiceDiscountPct} />
          </div>

          <div className="pos-pro-scan-row">
            <POSProScanbar variants={allVariants} onAdd={handleAddItem} focusRef={(el) => { scanRef.current = el; }} />
            <button
              type="button"
              className="pp-print-btn pp-cam-btn"
              onClick={() => setShowScanner(true)}
              title="مسح باركود بالكاميرا"
            >
              <i className="ti ti-camera" />
              <span>كاميرا</span>
            </button>
            <button
              type="button"
              className="pp-print-btn"
              onClick={handlePrintCart}
              disabled={!canSell}
              title="طباعة إيصال السلة الحالية"
            >
              <i className="ti ti-printer" />
              <span>طباعة</span>
            </button>
          </div>

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
              onClear={() => clearConfirm.confirm('مسح السلة بالكامل؟').then(ok => { if (ok) { clearEditingState(); pos.clearCart(); } })}
              onInvoiceDiscountChange={handleInvoiceDiscountChange}
              onOpenProducts={() => setDrawerOpen(true)}
              priceLevels={priceLevelsList}
              selectedPriceLevelId={selectedPriceLevelId}
              onPriceLevelChange={applyPriceLevel}
              note={pos.notes}
              onNoteChange={(n) => pos.setNotes(n)}
            />
          </div>

          {!productsLoading && (
            <div className="pos-pro-hint">
              <i className="ti ti-keyboard" />
              F1 تخصيص الاختصارات · F2 البحث · F3 دفع سريع · F4 الدفع · F5 تعليق · F6 صنف يدوي · F7 المعلقة · F8 الجلسة · F9 الطباعة · F10 مرتجع · F11 ملء الشاشة · F12 مسح السلة · الباركود يُمسح في الشريط العلوي
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
        priceLevels={priceLevelsList}
        selectedPriceLevelId={selectedPriceLevelId}
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
            documentDate={editingDocumentDate ?? new Date().toISOString().slice(0, 10)}
            isEditing={!!editingDocumentId}
            prevBalance={editingDocumentId ? (editingPrevBalanceRef.current ?? undefined) : (clientBalance?.current_balance ?? undefined)}
            defaultPaymentCode={settings.defaultPaymentCode}
            defaultDocTypeCode={settings.defaultDocTypeCode}
            initialDueDate={editingDocMetaRef.current?.dueDate}
            initialTypeCode={editingDocMetaRef.current?.typeCode}
            initialCurrencyId={editingDocMetaRef.current?.currencyId}
            initialNote={cartNote}
            documentNumber={editingDocumentNumber}
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
          warehouses={warehouses ?? []}
          warehouseId={activeWarehouse?.id ?? null}
          onWarehouseChange={(id) => setActiveWarehouseId(id)}
          onClose={() => setSessionOpen(false)}
          onClosed={() => { pos.clearCart(); pos.setInvoiceDiscountPct(0); }}
        />
      )}

      {heldOpen && (
        <Suspense fallback={null}>
          <HeldCartsModal
            carts={pos.heldCarts}
            onClose={() => setHeldOpen(false)}
            onRestore={(id) => { pos.restoreCart(id); setHeldOpen(false); }}
            onDelete={pos.deleteHeldCart}
          />
        </Suspense>
      )}

      {returnsOpen && (
        <Suspense fallback={null}>
          <ReturnsModal
            sessionId={currentSession?.id ?? null}
            onClose={() => setReturnsOpen(false)}
            onDone={() => setReturnsOpen(false)}
          />
        </Suspense>
      )}

      {helpOpen && (
        <Suspense fallback={null}>
          <KeyboardHelpModal onClose={() => setHelpOpen(false)} />
        </Suspense>
      )}

      {manualOpen && (
        <Suspense fallback={null}>
          <ManualProductModal
            onClose={() => setManualOpen(false)}
            onAdd={(name, priceTtc, qty, tvaRate) => {
              pos.addItem(makeFakeVariant(name, ttcToHt(priceTtc, tvaRate), tvaRate), qty);
              setManualOpen(false);
            }}
          />
        </Suspense>
      )}

      {showSessionInvoices && currentSession && (
        <Suspense fallback={null}>
          <SessionInvoicesModal
            session={currentSession}
            onClose={() => setShowSessionInvoices(false)}
            onOpen={handleOpenInvoice}
            onPrint={handlePrintDocument}
          />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={null}>
          <POSSettingsModal
            settings={settings}
            onSave={setSettings}
            onReset={resetSettings}
            onClose={() => setShowSettings(false)}
            warehouses={warehouses ?? []}
            documentTypes={documentTypes ?? []}
            paymentModes={paymentModes ?? []}
            priceLevels={priceLevelsList}
            systemFiscalStampEnabled={systemFiscalStampEnabled}
            onToggleFiscalStamp={toggleFiscalStamp}
            systemAllowNegativeStock={allowNegSetting}
            onToggleAllowNegative={toggleAllowNegative}
            defaultPriceLevelId={dbDefaultPriceLevelId}
            onSaveDefaultPriceLevel={saveDefaultPriceLevel}
          />
        </Suspense>
      )}

      {pinModal && (
        <Suspense fallback={null}>
          <ManagerPinModal
            requestedDiscount={pinModal.requestedDiscount}
            threshold={pinModal.reason === 'max_exceeded' ? settings.maxDiscountPct : settings.discountPinThreshold}
            reason={pinModal.reason}
            onSuccess={() => { pinModal.onSuccess(); setPinModal(null); }}
            onCancel={() => setPinModal(null)}
            verifyPin={(pin) => pin === settings.managerPin}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <BarcodeScannerModal
          open={showScanner}
          onScan={handleCameraScan}
          onClose={() => setShowScanner(false)}
        />
      </Suspense>

      <ConfirmDialog {...clearConfirm.confirmDialogProps} />
    </div>
  );
}
