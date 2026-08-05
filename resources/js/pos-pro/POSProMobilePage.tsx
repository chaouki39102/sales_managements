// ════════════════════════════════════════════════════════════════════════════
// pos-pro/POSProMobilePage.tsx
//
// ══ POS PRO — واجهة الهاتف (معاينة الهاتف v5) ════════════════════════════════
//
// صفحة بيع كاملة بحجم الشاشة للهاتف، مُجمَّعة من نفس طبقة بيانات POS Pro:
//   • نفس السلة المستقلة (usePosProCart / pos-pro-cart) — تُشارك مع سطح المكتب.
//   • نفس الـ lookups (usePOSAggregatedLookups) + المخزون (stock-at).
//   • نفس إعدادات POS (usePOSSettings) — بما فيها بوابات الخصم / الأصوات / الطباعة.
//   • الدفع عبر ProfessionalPaymentModal (مشترك) + دفع سريع نقدي.
//   • الطباعة عبر نفس خط الأنابيب (UniversalPrintPipeline / ESCPOSRenderer).
//
// التصميم: شاشة dvh كاملة — appbar → شريط الجلسة → بطاقة الإجمالي → شريط
// إجراءات سريعة → قائمة السلة (سحب للحذف + undo) → FAB → شريط سفلي
// (جديد / دفع سريع / دفع) → Sheets (منتجات / زبائن / خصم / سلال معلقة) →
// overlay نجاح الدفع → أقفال الجلسة/الانقطاع.
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useRef, useCallback, useMemo, Suspense,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { usePOSAggregatedLookups } from '@/lib/api/endpoints/lookups';
import { productsApi } from '@/lib/api/endpoints/products';
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
import { usePosProCart } from '@/pos-pro/store/usePosProCart';
import { productToVariant, isVariantOutOfStock } from '@/pos/utils/posHelpers';
import { usePOSSettings, checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import { usePrintSettings } from '@/pos/hooks/usePrintSettings';
import { printReceiptDirect } from '@/pos/utils/printUtils';
import { openCashDrawerViaWebUSB, printThermalViaWebUSBFromTemplate } from '@/pos/utils/printService';
import { playSaleSound, playAddSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import { htToTtc } from '@/pos/utils/calculations';
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
  Product, ProductVariant, CartItem, CartTotals, PaymentMode, ProductPackaging, Party,
} from '@/types';
import type { PaginatedResponse } from '@/lib/api/core/types';

// ── مودالات مشتركة (lazy — نفس نهج POSPage / POSProPage) ───────────────────
const OpenSessionModal = React.lazy(() => import('@/pos/components/OpenSessionModal'));
const ProfessionalPaymentModal = React.lazy(() => import('@/pos/components/ProfessionalPaymentModal'));
const ProfessionalReceipt = React.lazy(() => import('@/pos/components/ProfessionalReceipt'));

// ── خصم مركّب: خط + فاتورة (نفس صيغة POSPage / POSProPage) ────────────────
function compoundDiscountPct(linePct: number, invoicePct: number): number {
  if (invoicePct <= 0) return linePct;
  const compounded = 100 - (100 - linePct) * (100 - invoicePct) / 100;
  return Math.min(100, compounded);
}

// ── أدوات التنسيق المحلية ──────────────────────────────────────────────────
function fmt(n: number | undefined | null, dec = 2): string {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(dec) : '0.00';
}

function money(n: number | undefined | null): string {
  return fmt(n, 2);
}

// لون سواتش المنتج (للبطاقات) — ثابت حسب المنتج لتجنّب الاهتزاز
const SWATCHES = ['ppm-sw-gold', 'ppm-sw-blue', 'ppm-sw-teal', 'ppm-sw-purple', 'ppm-sw-orange', 'ppm-sw-indigo'];
function swatchFor(id: number | string | undefined): string {
  const n = Number(id ?? 0) || 0;
  return SWATCHES[n % SWATCHES.length];
}

function avatarColor(name: string | undefined): string {
  const colors = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#EF4444'];
  let h = 0;
  const s = String(name ?? '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function initials(name: string | undefined): string {
  const parts = String(name ?? '').trim().split(/\s+/);
  return (parts[0]?.[0] ?? '؟') + (parts[1]?.[0] ?? '');
}

export default function POSProMobilePage() {
  const queryClient = useQueryClient();
  const slug = useActiveSlug();
  const company = useActiveCompany();
  const navigate = useNavigate();

  // ── الإعدادات المشتركة ───────────────────────────────────────────────────
  const { settings } = usePOSSettings(slug);

  // ── Lookups مجمّعة ────────────────────────────────────────────────────────
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

  const fiscalYear = useSelectedFiscalYear();
  const warehouses = posLookups?.warehouses ?? [];
  const documentTypes = posLookups?.documentTypes ?? [];
  const currencies = posLookups?.currencies ?? [];
  const treasuryAccounts = posLookups?.treasuryAccounts ?? [];
  const fiscalYears = posLookups?.fiscalYears ?? [];
  const paymentModes = posLookups?.paymentModes ?? [];

  const defaultWarehouse = settings.defaultWarehouseId
    ? warehouses?.find(w => w.id === settings.defaultWarehouseId)
    : (warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null);
  const defaultCurrency = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  const [activeWarehouseId, setActiveWarehouseId] = useState<number | null>(null);
  const activeWarehouse = useMemo(
    () => (activeWarehouseId ? (warehouses?.find(w => w.id === activeWarehouseId) ?? null) : defaultWarehouse),
    [activeWarehouseId, warehouses, defaultWarehouse],
  );
  useEffect(() => {
    if (!activeWarehouseId && defaultWarehouse) setActiveWarehouseId(defaultWarehouse.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultWarehouse?.id]);

  // ── الجلسة ────────────────────────────────────────────────────────────────
  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const openSessionMut = useOpenSession();
  const incrementMut = useIncrementSession(currentSession?.id ?? null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const whId = currentSession?.warehouse?.id;
    if (whId) setActiveWarehouseId(whId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number; opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try { await openSessionMut.mutateAsync(data); }
    catch (e: unknown) {
      setSessionError(e instanceof Error && e.message ? e.message : 'فشل فتح الجلسة');
    }
  };

  // ── توست آمن ─────────────────────────────────────────────────────────────
  const safeToast = useMemo(() => {
    if (settings.toastEnabled) return toast;
    return new Proxy(toast, {
      get: (_t, prop) => {
        if (prop === 'dismiss' || prop === 'remove') return () => {};
        return () => '';
      },
    });
  }, [settings.toastEnabled]);
  const clearConfirm = useConfirm();

  // ── المنتجات + المخزون (نفس مفاتيح سطح المكتب → كاش مشترك) ───────────────
  const { data: productsRaw } = useQuery({
    queryKey: [slug, 'pos-pro', 'products', { perPage: 2000 }],
    queryFn: () => productsApi.list({
      per_page: 2000,
      simple: 1,
      include: 'tva,unit,family,prices,quantityDiscounts,packagings,barcodes',
      filter: { active: 1 },
    }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  const rawProducts = useMemo(() => (
    Array.isArray(productsRaw)
      ? productsRaw
      : (productsRaw as PaginatedResponse<Product>)?.data ?? []
  ), [productsRaw]);

  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-pro-stock', activeWarehouse?.id ?? null, fiscalYear?.id],
    queryFn: () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id: activeWarehouse?.id,
        fiscal_year_id: fiscalYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled: !!slug && !!activeWarehouse?.id,
    staleTime: 10_000,
  });

  const allVariants: ProductVariant[] = useMemo(() =>
    rawProducts.map((p) => {
      const v = productToVariant(p);
      const stock = stockData[p.id];
      if (stock !== undefined) v.current_stock = stock;
      return v;
    }),
  [rawProducts, stockData]);

  const variantsWithStock: ProductVariant[] = useMemo(() => {
    if (!settings.hideOutOfStock || allowNegSetting) return allVariants;
    return allVariants.filter((v) =>
      !v.manages_stock || v.current_stock === undefined || v.current_stock > 0,
    );
  }, [allVariants, settings.hideOutOfStock, allowNegSetting]);

  const families = useMemo(() => Array.from(
    new Map(
      allVariants
        .filter((v) => v.product?.family)
        .map((v) => [v.product!.family!.id, v.product!.family!]),
    ).values(),
  ), [allVariants]);

  // ── الزبون الافتراضي "Client Cash" ───────────────────────────────────────
  const { data: cashClient } = useCashClient();
  useEffect(() => {
    if (cashClient && !posRef.current.client) posRef.current.setClient(cashClient);
  }, [cashClient]);

  // ── رصيد الزبون (يُعرض في chip الزبون + الزبون داخل السلة) ───────────────
  const clientId = pos.client?.id;
  const { data: clientBalance } = useQuery({
    queryKey: tenantKeys.partyBalances.detail(slug ?? '', clientId ?? 0),
    queryFn: () => partyBalancesApi.getOne(clientId!),
    enabled: !!slug && !!clientId,
    staleTime: 30_000,
  });
  const clientBalanceVal = clientBalance?.current_balance ?? 0;

  // ── إعدادات الطباعة ──────────────────────────────────────────────────────
  const { template: posTemplate, enabled: isPrintEnabled, copies, paperWidth } = usePrintSettings('POS');
  const companyData = useMemo<CompanyPreviewData | null>(() => mapCompany(company), [company]);

  // ── حالة الواجهة ─────────────────────────────────────────────────────────
  const [sheet, setSheet] = useState<'none' | 'products' | 'customer' | 'discount' | 'held'>('none');
  const [payOpen, setPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [saleBusy, setSaleBusy] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState<{ docNumber: string; amount: number } | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [removedItem, setRemovedItem] = useState<{ item: CartItem; idx: number } | null>(null);
  const [prodSearch, setProdSearch] = useState('');
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [custSearch, setCustSearch] = useState('');
  const [discMode, setDiscMode] = useState<'pct' | 'amount'>('pct');
  const [discValue, setDiscValue] = useState('');
  const [pinModal, setPinModal] = useState<{
    requestedDiscount: number;
    reason: 'max_exceeded' | 'pin_required';
    onSuccess: () => void;
  } | null>(null);

  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // إغلاق أي Sheet عند تغيير الشركة
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (prevSlugRef.current && prevSlugRef.current !== slug) {
      posRef.current.clearCart();
      setSheet('none');
      setPayOpen(false);
    }
    prevSlugRef.current = slug;
  }, [slug]);

  // ── سلة: كمية في السلة (بالوحدات الأساسية) لكل صنف ───────────────────────
  const qtyInCartByVariant = useMemo(() => {
    const m = new Map<number, number>();
    for (const i of pos.items) {
      m.set(i.variant_id, (m.get(i.variant_id) ?? 0) + i.quantity * (i.pack_qty ?? 1));
    }
    return m;
  }, [pos.items]);

  // ── إضافة منتج (نفس حِرس سطح المكتب، بلا مودال وزن في v1) ────────────────
  const handleAddItem = useCallback((v: ProductVariant, packaging: ProductPackaging | null = null) => {
    let effective = v;
    if (effective.is_sold_by_weight ?? effective.product?.is_sold_by_weight ?? false) {
      posRef.current.addItem(effective, 1, packaging);
      safeToast.info(`${effective.product?.name ?? ''} — قم بتعديل الكمية في السلة`, { id: 'ppm-weight-hint', duration: 2000 });
    } else if (isVariantOutOfStock(effective, allowNegSetting)) {
      safeToast.error(`${effective.product?.name ?? ''} نفد المخزون`);
    } else {
      if (effective.manages_stock && effective.current_stock !== undefined) {
        const packMult = packaging ? Math.max(1, Number(packaging.quantity) || 1) : 1;
        const existing = posRef.current.items.find((i) => i.variant_id === effective.id);
        const already = existing ? existing.quantity * (existing.pack_qty ?? 1) : 0;
        if (already + packMult > effective.current_stock) {
          void clearConfirm.confirm(
            `${effective.product?.name ?? ''} — المخزون المتبقي ${effective.current_stock} فقط. هل تريد البيع بالرغم من ذلك؟`,
            { title: 'مخزون غير كافٍ', variant: 'warning', icon: 'ti-alert-triangle' },
          ).then((ok) => {
            if (!ok) return;
            const id = posRef.current.addItem(effective, 1, packaging);
            if (id) setJustAddedId(id);
            if (settings.playSoundOnAdd) playAddSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
          });
          return;
        }
      }
      const addedId = posRef.current.addItem(effective, 1, packaging);
      if (addedId) setJustAddedId(addedId);
      if (settings.playSoundOnAdd) playAddSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
    }
  }, [allowNegSetting, clearConfirm, settings.playSoundOnAdd, settings.soundPreset, settings.soundVolume, safeToast]);

  // ── حذف بسحب + تراجع ─────────────────────────────────────────────────────
  const handleRemove = useCallback((id: string) => {
    const items = posRef.current.items;
    const idx = items.findIndex((i) => i.id === id);
    const item = items[idx];
    if (!item) return;
    setRemovedItem({ item, idx });
    posRef.current.removeItem(id);
  }, []);

  const undoRemove = useCallback(() => {
    if (!removedItem) return;
    const st = usePosProCart.getState();
    const items = [...st.items];
    items.splice(Math.min(removedItem.idx, items.length), 0, removedItem.item);
    usePosProCart.setState({ items });
    setRemovedItem(null);
  }, [removedItem]);

  useEffect(() => {
    if (!removedItem) return;
    const t = setTimeout(() => setRemovedItem(null), 4000);
    return () => clearTimeout(t);
  }, [removedItem]);

  // ── خصم صنف (مع بوابة المدير) ────────────────────────────────────────────
  const handleItemDiscount = useCallback((id: string, pct: number) => {
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.updateDiscount(id, pct); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.updateDiscount(id, pct),
    });
  }, [settings, safeToast]);

  const handleItemDiscountAmount = useCallback((id: string, amount: number) => {
    const item = posRef.current.items.find((i) => i.id === id);
    const gross = item ? item.unit_price_ht * item.quantity : 0;
    const pct = gross > 0 ? Math.min(100, (amount / gross) * 100) : 0;
    if (pct <= 0) { posRef.current.updateDiscountAmount(id, amount); return; }
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.updateDiscountAmount(id, amount); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct.toFixed(1)}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.updateDiscountAmount(id, amount),
    });
  }, [settings, safeToast]);

  // ── خصم الفاتورة (شيت الخصم) ────────────────────────────────────────────
  const applyInvoiceDiscount = useCallback((pct: number) => {
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

  const applyInvoiceDiscountAmount = useCallback((amount: number) => {
    const origHt = posRef.current.totals.total_ht + (posRef.current.totals.invoice_discount_amount ?? 0);
    const pct = origHt > 0 ? Math.min(100, (amount / origHt) * 100) : 0;
    if (pct <= 0) { posRef.current.setInvoiceDiscountPct(0); return; }
    const check = checkDiscountAllowed(pct, settings);
    if (check.allowed) { posRef.current.setInvoiceDiscountPct(pct); return; }
    if (check.reason === 'max_exceeded') {
      safeToast.error(`الخصم ${pct.toFixed(1)}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
      return;
    }
    setPinModal({
      requestedDiscount: pct,
      reason: 'pin_required',
      onSuccess: () => posRef.current.setInvoiceDiscountPct(pct),
    });
  }, [settings, safeToast]);

  const confirmDiscount = useCallback(() => {
    const n = Number(discValue);
    if (!Number.isFinite(n) || n <= 0) return;
    if (discMode === 'pct') applyInvoiceDiscount(Math.min(100, n));
    else applyInvoiceDiscountAmount(n);
    setSheet('none');
    setDiscValue('');
  }, [discMode, discValue, applyInvoiceDiscount, applyInvoiceDiscountAmount]);

  // ── بيع جديد ─────────────────────────────────────────────────────────────
  const handleNewSale = useCallback(() => {
    const st = usePosProCart.getState();
    if (st.items.length > 0) posRef.current.holdCart();
    usePosProCart.getState().setDocumentMeta({ id: null, number: null, date: null });
    posRef.current.clearCart();
    posRef.current.setInvoiceDiscountPct(0);
  }, []);

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
        const result = await printThermalViaWebUSBFromTemplate(posTemplate, data, resolvedDocNum);
        if (result.ok) {
          safeToast.success('تمت الطباعة الحرارية');
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
  }, [posTemplate, safeToast, companyData, settings.printMode, paperWidth, copies]);

  // ── إتمام البيع (نفس صيغة سطح المكتب — الـ backend هو مصدر الحقيقة) ──────
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
    const invType = documentTypes?.find((t) => t.code === typeCode)
      ?? documentTypes?.find((t) => t.code === 'POS')
      ?? documentTypes?.find((t) => t.code === 'FV')
      ?? documentTypes?.find((t) => t.code === 'BL')
      ?? documentTypes?.[0];

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
      const apiPayments: import('@/lib/api/endpoints/documents').DocumentPaymentInput[] = (params.payments ?? [])
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

      const linesPayload = currentItems.map((i) => {
        const compoundedDisc = compoundDiscountPct(i.discount_percentage, currentInvDisc);
        const baseQty = i.quantity * (i.pack_qty ?? 1);
        const lineDiscAmount = baseQty > 0 ? Math.round((i.discount_amount / baseQty) * 100) / 100 : 0;
        const isFixedAmount = i.discount_mode === 'fixed_amount' && lineDiscAmount > 0;
        const perUnitPrice = (i.pack_qty && i.pack_qty > 1)
          ? Math.round((i.unit_price_ht / i.pack_qty) * 10000) / 10000
          : i.unit_price_ht;
        return {
          product_id: i.product_id,
          quantity: i.quantity,
          pack_qty: i.pack_qty ?? 1,
          unit_price_ht: perUnitPrice,
          discount_percentage: isFixedAmount ? 0 : Math.min(100, compoundedDisc),
          discount_amount: lineDiscAmount,
          discount_amount_per_unit: isFixedAmount ? lineDiscAmount : null,
          tva_rate: clientIsTvaExempt ? 0 : i.tva_rate,
          packaging_id: i.packaging_id ?? null,
        };
      });

      const effectiveTotalHt = linesPayload.reduce((s: number, l: Record<string, any>) => {
        const gross = l.quantity * l.unit_price_ht * l.pack_qty;
        const bq = l.quantity * l.pack_qty;
        const disc = l.discount_amount_per_unit
          ? l.discount_amount_per_unit * bq
          : gross * (l.discount_percentage / 100);
        return s + gross - disc;
      }, 0);
      const effectiveTotalTva = linesPayload.reduce((s: number, l: Record<string, any>) => {
        const gross = l.quantity * l.unit_price_ht * l.pack_qty;
        const bq = l.quantity * l.pack_qty;
        const disc = l.discount_amount_per_unit
          ? l.discount_amount_per_unit * bq
          : gross * (l.discount_percentage / 100);
        const lineHt = gross - disc;
        return s + lineHt * l.tva_rate / 100;
      }, 0);
      const effectiveTotalTtc = effectiveTotalHt + effectiveTotalTva + (snapshot.totals.fiscal_stamp ?? 0);

      const currentSessionId = currentSession?.id ?? null;
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

      if (currentSession?.id && !isEditingExistingDocument) {
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

      const fullSnapshot: POSSaleSnapshot = {
        items: snapshot.items.map((i) => ({
          name: i.product_name,
          ref: i.ref,
          qty: i.quantity,
          unit_price_ht: i.unit_price_ht,
          unit: i.unit_symbol,
          tva_rate: i.tva_rate / 100,
          discount_percentage: i.discount_percentage,
          total_ht: i.total_ht,
        })),
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
        payments: params.payments?.filter((p) => p.amount > 0).map((p) => ({
          mode: String(p.paymentModeId), amount: p.amount,
        })) ?? [],
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
        const hasCash = apiPayments.some((p) => {
          const mode = (paymentModes ?? []).find((m) => m.id === p.payment_mode_id);
          return mode && /نقدا|نقداً|cash/i.test(mode.name);
        });
        if (hasCash) openCashDrawerViaWebUSB();
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

      safeToast.success(`تم حفظ الفاتورة ${res.document_number ?? ''}`);

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
  }, [settings, documentTypes, activeWarehouse, fiscalYear, defaultCurrency?.id, defaultTreasury?.id, currentSession?.id, incrementMut, queryClient, slug, handlePrintDirect, paymentModes, isPrintEnabled, posTemplate, safeToast]);

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
  }, [settings.defaultDocTypeCode, handleCompleteSale, safeToast]);

  const handleOpenPayment = useCallback(() => {
    if (posRef.current.items.length === 0) { safeToast.info('أضف منتجات أولاً'); return; }
    setPayOpen(true);
  }, [safeToast]);

  // ── وسيلة الدفع النقدية ──────────────────────────────────────────────────
  const cashMode = useMemo(
    () => paymentModes.find((m) => /نقدا|نقداً|cash/i.test(m.name)) ?? paymentModes[0] ?? null,
    [paymentModes],
  );

  // ── المتغيرات المالية ────────────────────────────────────────────────────
  const totals = pos.totals;
  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;
  const invDisc = totals.invoice_discount_amount ?? 0;
  const invDiscPct = pos.invoiceDiscountPct;

  // ── فلترة المنتجات في Sheet ──────────────────────────────────────────────
  const visibleVariants = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return variantsWithStock.filter((v) => {
      if (activeCat !== 'all' && v.product?.family?.id !== activeCat) return false;
      if (!q) return true;
      const name = String(v.product?.name ?? '').toLowerCase();
      const ref = String(v.ref ?? '').toLowerCase();
      const barcode = String(v.barcode ?? '').toLowerCase();
      return name.includes(q) || ref.includes(q) || barcode.includes(q);
    });
  }, [variantsWithStock, prodSearch, activeCat]);

  // ── فلترة الزبائن في Sheet ───────────────────────────────────────────────
  const customers = posLookups?.customers ?? [];
  const visibleCustomers = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      String(c.name).toLowerCase().includes(q)
      || String(c.code).toLowerCase().includes(q),
    );
  }, [customers, custSearch]);

  const selectCustomer = useCallback((c: { id: number; name: string }) => {
    posRef.current.setClient(c as unknown as Party);
    if (c.id) {
      queryClient.invalidateQueries({ queryKey: tenantKeys.partyBalances.detail(slug ?? '', c.id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.parties.detail(slug ?? '', c.id) });
    }
    setSheet('none');
  }, [queryClient, slug]);

  // ── ترتيب الإجماليات ─────────────────────────────────────────────────────
  const hasDiscount = invDisc > 0.004;
  const hasTva = totals.total_tva > 0.004;
  const hasStamp = totals.fiscal_stamp > 0.004;

  const canSell = pos.items.length > 0 && !saleBusy;

  return (
    <div className="ppm-screen" dir="rtl">
      {!sessionLoading && !currentSession && (
        <Suspense fallback={null}>
          <div className="ppm-session-lock show">
            <div className="ppm-lock-ic"><i className="ti ti-lock" /></div>
            <h3>لا توجد جلسة مفتوحة</h3>
            <p>افتح جلسة بيع لبدء العمل على هذا الجهاز.</p>
            <OpenSessionModal
              warehouses={warehouses}
              fiscalYears={fiscalYears as any}
              defaultWarehouseId={defaultWarehouse?.id}
              defaultFiscalYearId={fiscalYear?.id}
              isLoading={openSessionMut.isPending}
              error={sessionError}
              onOpen={handleOpenSession}
            />
          </div>
        </Suspense>
      )}

      {/* ── Appbar ─────────────────────────────────────────────────────── */}
      <header className="ppm-appbar">
        <button className="ppm-appbar-btn" onClick={() => navigate('/pos/pro')} aria-label="رجوع">
          <i className="ti ti-arrow-right" />
        </button>
        <div className="ppm-appbar-title">
          <strong>نقطة البيع</strong>
          <span>جلسة {currentSession ? `#${currentSession.id}` : '—'}</span>
        </div>
        <button className="ppm-appbar-btn" onClick={() => setSheet('held')} aria-label="سلال معلقة">
          <i className="ti ti-basket-pause" />
          {pos.heldCarts.length > 0 && <span className="ppm-badge">{pos.heldCarts.length}</span>}
        </button>
      </header>

      {/* ── شريط الجلسة ─────────────────────────────────────────────────── */}
      <div className="ppm-session-strip">
        <span className="ppm-dot" />
        <span>
          {currentSession?.warehouse?.name ?? 'المستودع'} — {currentSession?.opening_cash != null ? `رصيد افتتاح ${money(currentSession.opening_cash)}` : 'جلسة مفتوحة'}
        </span>
      </div>

      {/* ── بطاقة الإجمالي ──────────────────────────────────────────────── */}
      <section className="ppm-total-card">
        <div className="ppm-total-top">
          <span className="ppm-l">الإجمالي</span>
          <span className="ppm-unit">دج</span>
          <span className="ppm-val ppm-mono">{money(totalTtcFinal)}</span>
        </div>
        <div className="ppm-total-chips">
          <span className="ppm-tchip">HT {money(totals.total_ht)}</span>
          {hasDiscount && <span className="ppm-tchip ppm-disc">خصم {money(invDisc)}</span>}
          {hasTva && <span className="ppm-tchip">TVA {money(totals.total_tva)}</span>}
          {hasStamp && <span className="ppm-tchip">طابع {money(totals.fiscal_stamp)}</span>}
        </div>
      </section>

      {/* ── إجراءات سريعة ───────────────────────────────────────────────── */}
      <div className="ppm-qa-strip">
        <button className="ppm-qa-btn" onClick={() => setSheet('products')}>
          <i className="ti ti-package" /><span>منتجات</span>
        </button>
        <button className="ppm-qa-btn" onClick={() => setSheet('customer')}>
          <i className="ti ti-user" /><span>زبون</span>
        </button>
        <button className="ppm-qa-btn" onClick={() => setSheet('discount')}>
          <i className="ti ti-percentage" /><span>{invDiscPct > 0 ? `${invDiscPct}%` : 'خصم'}</span>
        </button>
        <button className="ppm-qa-btn" onClick={handleNewSale}>
          <i className="ti ti-file-plus" /><span>جديد</span>
        </button>
      </div>

      {/* ── قائمة السلة ─────────────────────────────────────────────────── */}
      <div className="ppm-cart">
        <div className="ppm-cart-hd">
          <h1>السلة</h1>
          {pos.items.length > 0 && (
            <div className="ppm-c-actions">
              <span className="ppm-count">{pos.items.length} أصناف</span>
              <button
                className="ppm-clear"
                onClick={() => {
                  const doClear = () => { posRef.current.clearCart(); setRemovedItem(null); };
                  if (settings.confirmOnClear) {
                    clearConfirm.confirm('مسح السلة بالكامل؟').then((ok) => { if (ok) doClear(); });
                  } else doClear();
                }}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          )}
        </div>

        <div className="ppm-cart-scroll">
          {pos.items.length === 0 ? (
            <div className="ppm-cart-empty">
              <i className="ti ti-basket-off" />
              <span className="ppm-t">السلة فارغة</span>
              <span className="ppm-s">اضغط «منتجات» لإضافة أصناف</span>
            </div>
          ) : (
            pos.items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                isJustAdded={item.id === justAddedId}
                stockBadge={null}
                onRemove={() => handleRemove(item.id)}
                onQtyUp={() => posRef.current.updateQty(item.id, item.quantity + 1)}
                onQtyDown={() => {
                  if (item.quantity <= 1) handleRemove(item.id);
                  else posRef.current.updateQty(item.id, item.quantity - 1);
                }}
                onDiscount={handleItemDiscount}
                onDiscountAmount={handleItemDiscountAmount}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Snackbar تراجع عن الحذف ─────────────────────────────────────── */}
      <div className={`ppm-snackbar${removedItem ? ' show' : ''}`}>
        <span>{removedItem?.item.product_name ?? ''} — حُذف</span>
        <button onClick={undoRemove}>تراجع</button>
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <button className="ppm-fab" onClick={() => setSheet('products')} aria-label="إضافة منتج">
        <i className="ti ti-plus" />
      </button>

      {/* ── الشريط السفلي ───────────────────────────────────────────────── */}
      <nav className="ppm-bottombar">
        <button className="ppm-bb-new" onClick={handleNewSale}>
          <i className="ti ti-file-plus" /><span>جديد</span>
        </button>
        <button className="ppm-bb-quick" onClick={() => handleQuickPay(cashMode)} disabled={!canSell}>
          <i className="ti ti-zap" /><span>نقدي</span>
        </button>
        <button className="ppm-bb-pay" onClick={handleOpenPayment} disabled={!canSell}>
          <i className="ti ti-credit-card" />
          <span className="ppm-amt ppm-mono">{money(totalTtcFinal)} دج</span>
        </button>
      </nav>

      {/* ── Sheet المنتجات ───────────────────────────────────────────────── */}
      <PPMSheet
        open={sheet === 'products'}
        title="المنتجات"
        onClose={() => setSheet('none')}
      >
        <div className="ppm-psearch">
          <i className="ti ti-search" />
          <input
            autoFocus
            placeholder="بحث باسم / مرجع / باركود…"
            value={prodSearch}
            onChange={(e) => setProdSearch(e.target.value)}
          />
        </div>
        <div className="ppm-cat-scroll">
          <button
            className={`ppm-cat-chip${activeCat === 'all' ? ' on' : ''}`}
            onClick={() => setActiveCat('all')}
          >
            الكل
          </button>
          {families.map((f) => (
            <button
              key={f.id}
              className={`ppm-cat-chip${activeCat === f.id ? ' on' : ''}`}
              onClick={() => setActiveCat((c) => (c === f.id ? 'all' : f.id))}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="ppm-pgrid">
          {visibleVariants.map((v) => {
            const inCartQty = qtyInCartByVariant.get(v.id) ?? 0;
            const out = isVariantOutOfStock(v, allowNegSetting);
            const priceTtc = htToTtc(v.default_selling_price_ht, v.tva?.rate ?? 0);
            return (
              <button
                key={v.id}
                className={`ppm-pcard${out ? ' ppm-is-out' : ''}`}
                onClick={() => handleAddItem(v)}
                disabled={out}
              >
                <div className={`ppm-sw ${swatchFor(v.id)}`}>
                  {v.image_url
                    ? <img src={v.image_url} alt="" loading="lazy" />
                    : <span>{initials(v.product?.name)}</span>}
                </div>
                <div className="ppm-pc-body">
                  <span className="ppm-pc-name">{v.product?.name}</span>
                  <span className="ppm-pc-price ppm-mono">{money(priceTtc)} <em>دج</em></span>
                  <div className="ppm-pc-row">
                    {inCartQty > 0 && <span className="ppm-pc-add">{inCartQty}</span>}
                    {v.manages_stock && v.current_stock !== undefined && v.current_stock <= 0 && (
                      <span className="ppm-stock-badge out">نفد</span>
                    )}
                    {v.manages_stock && v.current_stock !== undefined && v.current_stock > 0 && v.current_stock <= (v.max_stock_alert ?? 5) && (
                      <span className="ppm-stock-badge low">متبقّي {v.current_stock}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {visibleVariants.length === 0 && (
            <div className="ppm-cart-empty">
              <span className="ppm-t">لا توجد نتائج</span>
            </div>
          )}
        </div>
      </PPMSheet>

      {/* ── Sheet الزبائن ───────────────────────────────────────────────── */}
      <PPMSheet
        open={sheet === 'customer'}
        title="اختيار الزبون"
        onClose={() => setSheet('none')}
      >
        <div className="ppm-csearch">
          <i className="ti ti-search" />
          <input
            autoFocus
            placeholder="بحث بالاسم / الرمز / الهاتف…"
            value={custSearch}
            onChange={(e) => setCustSearch(e.target.value)}
          />
        </div>
        <div className="ppm-csheet-body">
          {pos.client && (
            <CustomerPreview
              name={pos.client.name}
              phone={pos.client.phone}
              balance={clientBalanceVal}
              isDebtor={clientBalanceVal < -0.004}
            />
          )}
          <div className="ppm-clist">
            {visibleCustomers.map((c) => (
              <button key={c.id} className="ppm-crow" onClick={() => selectCustomer(c)}>
                <span className="ppm-av" style={{ background: avatarColor(c.name) }}>{initials(c.name)}</span>
                <span className="ppm-info">
                  <span className="ppm-n">{c.name}</span>
                </span>
                <i className="ti ti-chevron-left" />
              </button>
            ))}
            {visibleCustomers.length === 0 && (
              <div className="ppm-cart-empty"><span className="ppm-t">لا يوجد زبائن</span></div>
            )}
          </div>
        </div>
      </PPMSheet>

      {/* ── Sheet الخصم ─────────────────────────────────────────────────── */}
      <PPMSheet
        open={sheet === 'discount'}
        title="خصم الفاتورة"
        onClose={() => setSheet('none')}
      >
        <div className="ppm-disc-body">
          <div className="ppm-disc-toggle">
            <button className={discMode === 'pct' ? 'on' : ''} onClick={() => setDiscMode('pct')}>
              <i className="ti ti-percentage" /> نسبة %
            </button>
            <button className={discMode === 'amount' ? 'on' : ''} onClick={() => setDiscMode('amount')}>
              <i className="ti ti-currency-dinar" /> مبلغ دج
            </button>
          </div>
          <div className="ppm-disc-presets">
            {[5, 10, 15, 20, 30, 50].map((p) => (
              <button key={p} className={invDiscPct === p ? 'on' : ''} onClick={() => setDiscValue(String(p))}>
                {p}%
              </button>
            ))}
          </div>
          <div className="ppm-disc-custom">
            <i className="ti ti-edit" />
            <input
              inputMode="decimal"
              placeholder={discMode === 'pct' ? 'نسبة مئوية 0-100' : 'المبلغ بالدينار'}
              value={discValue}
              onChange={(e) => setDiscValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmDiscount(); }}
            />
          </div>
          {invDiscPct > 0 && (
            <button className="ppm-disc-apply danger" onClick={() => { posRef.current.setInvoiceDiscountPct(0); setSheet('none'); setDiscValue(''); }}>
              <i className="ti ti-trash" /> إزالة الخصم الحالي ({invDiscPct}% / {money(invDisc)})
            </button>
          )}
          <button className="ppm-disc-apply" onClick={confirmDiscount}>
            تطبيق الخصم
          </button>
        </div>
      </PPMSheet>

      {/* ── Sheet السلال المعلقة ────────────────────────────────────────── */}
      <PPMSheet
        open={sheet === 'held'}
        title="سلال معلقة"
        onClose={() => setSheet('none')}
      >
        <div className="ppm-held-body">
          {pos.heldCarts.length === 0 ? (
            <div className="ppm-held-empty">
              <i className="ti ti-basket-pause" />
              <span>لا توجد سلال معلقة</span>
            </div>
          ) : (
            pos.heldCarts.map((hc) => (
              <div key={hc.id} className="ppm-held-row">
                <div className="ppm-info">
                  <span className="ppm-n">{hc.label ?? 'سلة'}</span>
                  <span className="ppm-s">
                    {hc.items?.length ?? 0} أصناف — {money(hc.totals?.total_ttc ?? 0)} دج
                  </span>
                </div>
                <button
                  onClick={() => {
                    const st = usePosProCart.getState();
                    if (st.items.length > 0) posRef.current.holdCart();
                    posRef.current.restoreCart(hc.id);
                    setSheet('none');
                  }}
                >
                  <i className="ti ti-refresh" /> استرجاع
                </button>
              </div>
            ))
          )}
        </div>
      </PPMSheet>

      {/* ── الدفع ───────────────────────────────────────────────────────── */}
      {payOpen && (
        <Suspense fallback={null}>
          <ProfessionalPaymentModal
            totals={totals}
            client={pos.client}
            paymentModes={paymentModes}
            documentTypes={documentTypes}
            currencies={currencies}
            treasuryAccounts={treasuryAccounts}
            totalTtcFinal={totalTtcFinal}
            existingPayments={pos.payments}
            documentDate={new Date().toISOString().slice(0, 10)}
            isEditing={false}
            prevBalance={undefined}
            defaultPaymentCode={settings.defaultPaymentCode}
            defaultDocTypeCode={settings.defaultDocTypeCode}
            onClose={() => setPayOpen(false)}
            onConfirm={handleCompleteSale}
          />
        </Suspense>
      )}

      {/* ── الفاتورة (الاستلام) ─────────────────────────────────────────── */}
      {receiptOpen && receiptSnapshotRef.current && posTemplate && (
        <Suspense fallback={null}>
          <ProfessionalReceipt
            template={posTemplate}
            company={companyData}
            source={{ type: 'pos-snapshot', snapshot: receiptSnapshotRef.current } as PipelineSource}
            docNumber={receiptSnapshotRef.current.docNumber}
            onClose={() => setReceiptOpen(false)}
            onPrint={() => { const snap = receiptSnapshotRef.current; if (snap) handlePrintDirect(snap); }}
            onNewSale={() => { setReceiptOpen(false); if (settings.openClientOnNewSale) setSheet('customer'); }}
          />
        </Suspense>
      )}

      {/* ── ناجح ────────────────────────────────────────────────────────── */}
      {successOverlay && (
        <div className="ppm-pay-success show" onClick={() => setSuccessOverlay(null)}>
          <div className="ppm-ps-circle">
            <i className="ti ti-check" />
          </div>
          <div className="ppm-ps-title">تمت العملية بنجاح</div>
          <div className="ppm-ps-amt ppm-mono">{money(successOverlay.amount)} دج</div>
          <div className="ppm-ps-ref">فاتورة {successOverlay.docNumber}</div>
        </div>
      )}

      <ConfirmDialog {...clearConfirm.confirmDialogProps} />

      {pinModal && (
        <div className="ppm-backdrop show" onClick={() => setPinModal(null)}>
          <div className="ppm-pin-card" onClick={(e) => e.stopPropagation()}>
            <h3>إدخال رمز المدير</h3>
            <p>هذا الخصم يحتاج إذن المدير.</p>
            <input
              autoFocus
              type="password"
              placeholder="••••"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  setPinModal(null);
                  pinModal.onSuccess();
                }
              }}
            />
            <button onClick={() => setPinModal(null)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CartLine — سطر سلة مع سحب لحذف (يتمسك بـ pointer capture)
// ════════════════════════════════════════════════════════════════════════════
function CartLine({
  item,
  isJustAdded,
  stockBadge,
  onRemove,
  onQtyUp,
  onQtyDown,
  onDiscount,
  onDiscountAmount,
}: {
  item: CartItem;
  isJustAdded: boolean;
  stockBadge: 'low' | 'out' | null;
  onRemove: () => void;
  onQtyUp: () => void;
  onQtyDown: () => void;
  onDiscount: (id: string, pct: number) => void;
  onDiscountAmount: (id: string, amount: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const gesture = useRef<{ startX: number; active: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input')) return;
    gesture.current = { startX: e.clientX, active: false };
    rootRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!gesture.current) return;
    const d = e.clientX - gesture.current.startX;
    if (!gesture.current.active && Math.abs(d) < 6) return;
    gesture.current.active = true;
    setDx(Math.max(-96, Math.min(96, d)));
  };
  const end = () => {
    if (gesture.current?.active && dx <= -56) {
      onRemove();
    }
    gesture.current = null;
    setDx(0);
  };

  const [discOpen, setDiscOpen] = useState(false);
  const [discText, setDiscText] = useState('');

  const applyDisc = () => {
    const n = Number(discText);
    if (!Number.isFinite(n) || n <= 0) return;
    if (item.discount_amount > 0 && item.discount_mode === 'fixed_amount') onDiscountAmount(item.id, n);
    else onDiscount(item.id, Math.min(100, n));
    setDiscOpen(false);
    setDiscText('');
  };

  return (
    <div
      ref={rootRef}
      className={`ppm-line${isJustAdded ? ' ppm-just-added' : ''}`}
      style={{ transform: `translateX(${dx}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="ppm-swipe-bg" onClick={onRemove} role="button" aria-label="حذف">
        <i className="ti ti-trash" />
      </div>
      <div className="ppm-line-body">
        {item.image_url ? (
          <div className="ppm-line-photo"><img src={item.image_url} alt="" loading="lazy" /></div>
        ) : (
          <div className={`ppm-sw ppm-sw-gold`}><span>{item.product_name[0] ?? '؟'}</span></div>
        )}
        <div className="ppm-line-info">
          <span className="ppm-line-name">{item.product_name}</span>
          <span className="ppm-line-sub">
            {item.ref}{item.unit_symbol ? ` — ${item.unit_symbol}` : ''}
            {item.pack_qty && item.pack_qty > 1 ? ` ×${item.pack_qty}` : ''}
            {stockBadge && <span className={`ppm-stock-badge ${stockBadge}`}>{stockBadge === 'out' ? 'نفد' : 'منخفض'}</span>}
          </span>
          <span className="ppm-line-price ppm-mono">{money(item.unit_price_ht)} دج</span>
        </div>
        <div className="ppm-line-ctrls">
          <div className="ppm-qty">
            <button onClick={onQtyDown}><i className="ti ti-minus" /></button>
            <span className="ppm-val">{item.quantity}</span>
            <button onClick={onQtyUp}><i className="ti ti-plus" /></button>
          </div>
          <button className="ppm-line-disc" onClick={() => setDiscOpen((v) => !v)}>
            <i className="ti ti-percentage" />
            {(item.discount_percentage > 0 || item.discount_amount > 0) && <span className="ppm-dot" />}
          </button>
        </div>
        <div className="ppm-line-total ppm-mono">{money(item.total_ttc)}</div>
      </div>

      {discOpen && (
        <div className="ppm-line-discpop">
          <div className="ppm-line-discpop-row">
            <input
              inputMode="decimal"
              placeholder={item.discount_mode === 'fixed_amount' ? 'مبلغ الخصم' : 'نسبة %'}
              value={discText}
              onChange={(e) => setDiscText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyDisc(); }}
            />
            <button onClick={applyDisc}>تطبيق</button>
          </div>
          {(item.discount_percentage > 0 || item.discount_amount > 0) && (
            <button
              className="danger"
              onClick={() => {
                if (item.discount_mode === 'fixed_amount') onDiscountAmount(item.id, 0);
                else onDiscount(item.id, 0);
                setDiscOpen(false);
                setDiscText('');
              }}
            >
              إزالة الخصم
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PPMSheet — لوحة سفلية عامة
// ════════════════════════════════════════════════════════════════════════════
function PPMSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={`ppm-backdrop${open ? ' show' : ''}`} onClick={onClose} />
      <div className={`ppm-sheet${open ? ' show' : ''}`}>
        <div className="ppm-sheet-handle" />
        <div className="ppm-sheet-hd">
          <h2>{title}</h2>
          <button className="ppm-sheet-close" onClick={onClose} aria-label="إغلاق">
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CustomerPreview — بطاقة الزبون المحدد حالياً
// ════════════════════════════════════════════════════════════════════════════
function CustomerPreview({
  name,
  phone,
  balance,
  isDebtor,
}: {
  name: string;
  phone?: string | null;
  balance: number;
  isDebtor: boolean;
}) {
  return (
    <div className={`ppm-c-avatar${isDebtor ? ' debtor' : ''}`}>
      <span className="ppm-c-avatar-ic"><i className="ti ti-user" /></span>
      <div className="ppm-c-info">
        <span className="ppm-c-name">{name}</span>
        {phone && <span className="ppm-c-phone">{phone}</span>}
      </div>
      <div className="ppm-c-balance">
        <span className="ppm-l">الرصيد</span>
        <span className={`ppm-v ppm-mono${isDebtor ? ' debtor' : ''}`}>{money(balance)} دج</span>
      </div>
    </div>
  );
}
