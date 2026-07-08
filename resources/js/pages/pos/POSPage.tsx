// ════════════════════════════════════════════════════════════════════════════
// pages/pos/POSPage.tsx
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Toaster, toast }    from 'sonner';
import { usePOS }             from '@/pos/hooks/usePOS';
import { useCartStore }       from '@/pos/utils/useCartStore';
import { useClients }         from '@/lib/api/endpoints/parties';
import {
  usePaymentModes, useWarehouses, usePriceLevels,
  useCurrencies, useTreasuryAccounts, useDocumentTypes,
} from '@/lib/api/endpoints/lookups';
import { productsApi }        from '@/lib/api/endpoints/products';
import { settingsApi }        from '@/lib/api/endpoints/settings';
import { apiGet }             from '@/lib/api/core/client';
import { useSelectedFiscalYear, useFiscalYears } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi }       from '@/lib/api/endpoints/documents';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { useAuthUser } from '@/context/AuthContext';
import {
  calcFiscalStamp, formatDZD, htToTtc, ttcToHt, calcMargin,
} from '@/pos/utils/calculations';
import {
  productToVariant, makeFakeVariant,
} from '@/pos/utils/posHelpers';
import { isVariantOutOfStock } from '@/pos/utils/posHelpers';
import type { ActiveModal, QuickItem, ViewMode, GridSize, SortMode } from '@/pos/utils/posHelpers';
import type { PaginatedResponse } from '@/lib/api/core/types';
import { nanoid }   from 'nanoid';
import type {
  Product, ProductVariant, CartItem, CartTotals,
  PriceLevel, Party, PaymentMode, DocumentType,
  CommercialDocument,
} from '@/types';

import POSTopBar                from '@/pos/components/POSTopBar';
import QuickItemsBar            from '@/pos/components/QuickItemsBar';
import MobileTabs               from '@/pos/components/MobileTabs';
import ProductSearchBar         from '@/pos/components/ProductSearchBar';
import FilterPanel              from '@/pos/components/FilterPanel';
import CategoryTabs             from '@/pos/components/CategoryTabs';
import ProductGrid              from '@/pos/components/ProductGrid';
import ProfessionalCart         from '@/pos/components/ProfessionalCart';
import ProfessionalPaymentModal from '@/pos/components/ProfessionalPaymentModal';
import HeldCartsModal           from '@/pos/components/HeldCartsModal';
import ProfessionalReceipt      from '@/pos/components/ProfessionalReceipt';
import ManualProductModal       from '@/pos/components/ManualProductModal';
import OpenSessionModal         from '@/pos/components/OpenSessionModal';
import CloseSessionModal        from '@/pos/components/CloseSessionModal';
import SessionStatsModal        from '@/pos/components/SessionStatsModal';
import {
  useCurrentPosSession,
  useOpenSession,
  useCloseSession,
  useIncrementSession,
  buildIncrementInput,
} from '@/lib/api/endpoints/posSession';
import ReturnsModal             from '@/pos/components/ReturnsModal';
import SessionInvoicesModal     from '@/pos/components/SessionInvoicesModal';
import KeyboardHelpModal        from '@/pos/components/KeyboardHelpModal';
import POSSettingsModal          from '@/pos/components/POSSettingsModal';
import ManagerPinModal           from '@/pos/components/ManagerPinModal';
import { usePOSSettings, checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import { matchOverride }        from '@/pos/hooks/useKeyboardMap';
import { usePrintSettings }     from '@/pos/hooks/usePrintSettings';
import { printReceiptDirect }   from '@/pos/utils/printUtils';
import { openCashDrawerViaWebUSB } from '@/pos/utils/printService';
import { renderPreviewToHtml, mapCompany }  from '@/pages/settings/print-settings/runtime';
import { printThermalViaWebUSBFromTemplate } from '@/pos/utils/printService';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

const QUICK_ITEMS_KEY = (slug: string) => `pos-quick-items-${slug}`;

export default function POSPage() {
  const slug        = useActiveSlug();
  const { data: fiscalStampRaw } = useQuery({
    queryKey: [slug, 'settings', 'fiscal_stamp_enabled'],
    queryFn:  () => settingsApi.getValue('fiscal_stamp_enabled'),
    enabled:  !!slug,
    staleTime: 60_000,
  });
  const fiscalStampVal = (fiscalStampRaw as any)?.value;
  const fiscalStampEnabled = fiscalStampVal === undefined
    ? true
    : (fiscalStampVal === true || fiscalStampVal === 1 || fiscalStampVal === '1'
      || String(fiscalStampVal).toLowerCase() === 'true');
  const pos         = usePOS(fiscalStampEnabled);
  const fiscalYear  = useSelectedFiscalYear();
  const company     = useActiveCompany();
  const navigate    = useNavigate();

  const user = useAuthUser();
  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const openSessionMut   = useOpenSession();
  const closeSessionMut  = useCloseSession(currentSession?.id ?? null);
  const incrementMut     = useIncrementSession(currentSession?.id ?? null);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [showSessionInvoices, setShowSessionInvoices] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number; opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try { await openSessionMut.mutateAsync(data); }
    catch (e: any) { setSessionError(e?.message ?? 'فشل فتح الجلسة'); }
  };

  const handleCloseSession = async (data: {
    closing_cash_counted: number; closing_note?: string;
  }) => {
    try {
      await closeSessionMut.mutateAsync(data);
      setShowCloseSession(false);
      toast.success('تم إغلاق الجلسة بنجاح');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل إغلاق الجلسة');
    }
  };

  const { settings, setSettings, resetSettings } = usePOSSettings(slug);

  // ═════════════════════════════════════════════════════════════════════
  // Clear cart on company switch — prevents stale product_id values from
  // a different company being submitted to the new company's API scope.
  // (Backend validateTenantRelationsMany in CommercialDocumentService
  //  rejects cross-company product IDs with 422.)
  // ═════════════════════════════════════════════════════════════════════
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (prevSlugRef.current && prevSlugRef.current !== slug) {
      pos.clearCart();
    }
    prevSlugRef.current = slug;
  }, [slug, pos]);

  const [view,       setView]       = useState<ViewMode>('grid');
  const [gridSize,   setGridSize]   = useState<GridSize>(settings.defaultGridSize);
  const [mobTab,     setMobTab]     = useState<'products' | 'cart'>('products');
  const [fullscreen, setFullscreen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [modal,      setModal]      = useState<ActiveModal>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [pinModal, setPinModal] = useState<{
    requestedDiscount: number;
    reason: 'max_exceeded' | 'pin_required';
    onSuccess: () => void;
  } | null>(null);
  const [cartNote,   setCartNote]   = useState('');
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<number | null>(null);
  const [lastDocNum,  setLastDocNum]  = useState<string | undefined>();
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);

  const [receiptSnapshot, setReceiptSnapshot] = useState<POSSaleSnapshot | null>(null);
  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingDocStatus, setEditingDocStatus] = useState<string | null>(null);
  const [editingDocumentDate, setEditingDocumentDate] = useState<string | null>(null);
  const editingPrevBalanceRef = useRef<number | undefined>(undefined);

  const receiptSource = useMemo((): PipelineSource | null => {
    if (!receiptSnapshot) return null;
    return { type: 'pos-snapshot', snapshot: receiptSnapshot };
  }, [receiptSnapshot]);

  const lastPaymentRef = useRef<{
    paid: number;
    payments: Array<{ paymentModeId: number; amount: number }>;
    dueDate?: string;
  }>();
  const [orderType, setOrderType] = useState<OrderType>('dine-in');

  const [quickItems, setQuickItems] = useState<QuickItem[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(QUICK_ITEMS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showQuickbar, setShowQuickbar] = useState(settings.showQuickbarOnStart);

  const handleToggleQuickbar = useCallback(() => {
    setShowQuickbar(prev => {
      const next = !prev;
      setSettings({ showQuickbarOnStart: next });
      return next;
    });
  }, [setSettings]);

  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(QUICK_ITEMS_KEY(slug), JSON.stringify(quickItems)); }
    catch { /* storage full */ }
  }, [quickItems, slug]);

  // ── Search & Filters ──────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const searchRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  const isSearching   = pos.searchQuery.trim().length >= 2;
  const queryFamilyId = pos.selectedCategory ?? undefined;

  // ── Products query (all products) ───────────────────────────────────────
  const { data: productsRaw, isLoading: loadingAll } = useQuery({
    queryKey: [slug, 'products', 'pos', {
      search: pos.searchQuery, cat: pos.selectedCategory,
    }],
    queryFn: () => productsApi.list({
      per_page:  99999,
      include:   'tva,unit,family,prices.priceLevel,quantityDiscounts',
      search:    isSearching ? pos.searchQuery : undefined,
      ...(queryFamilyId ? { family_id: queryFamilyId } : {}),
      filter:    { active: 1 },
    }),
    enabled:         !!slug,
    staleTime:       isSearching ? 2 * 60_000 : 5 * 60_000,
  });

  const rawProducts = Array.isArray(productsRaw)
    ? productsRaw
    : (productsRaw as PaginatedResponse<Product>)?.data ?? [];

  // ── Lookups ─────────────────────────────────────────────────────────────────
  const { data: fiscalYearsData } = useFiscalYears();
  const fiscalYears = fiscalYearsData?.years ?? [];

  const { data: customersData    } = useClients({ per_page: 200 });
  const { data: warehouses       } = useWarehouses();
  const { data: documentTypes    } = useDocumentTypes();
  const { data: priceLevels      } = usePriceLevels();
  const { data: currencies       } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();   // ✅ مُضاف
  const { data: paymentModes     } = usePaymentModes();

  const customers        = (customersData as PaginatedResponse<Party>)?.data ?? (customersData as Party[]) ?? [];
  const priceLevelsList  = priceLevels ?? [];

  // ── Client balance ──────────────────────────────────────────────────────────
  const clientId = pos.client?.id;
  const { data: clientBalance } = useQuery({
    queryKey: tenantKeys.partyBalances.detail(slug ?? '', clientId!),
    queryFn:  () => partyBalancesApi.getOne(clientId!),
    enabled:  !!slug && !!clientId,
    staleTime: 30_000,
  });

  const defaultWarehouse = settings.defaultWarehouseId
    ? warehouses?.find(w => w.id === settings.defaultWarehouseId)
    : (warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null);
  const realWarehouseId  = defaultWarehouse?.id ?? null;
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── Cached warehouse ID (avoid cascading delay for stock query) ────────────
  const WAREHOUSE_CACHE_KEY = 'pos-warehouse-id';
  const [cachedWarehouseId, setCachedWarehouseId] = useState<number | null>(() => {
    try {
      const c = localStorage.getItem(WAREHOUSE_CACHE_KEY);
      if (c) { const n = parseInt(c, 10); if (!isNaN(n)) return n; }
    } catch {}
    return null;
  });
  // Use cached ID as fallback until the real warehouse query resolves
  const effectiveWarehouseId = realWarehouseId ?? cachedWarehouseId;
  // Sync cache when real warehouse becomes known
  useEffect(() => {
    if (realWarehouseId !== null && realWarehouseId !== cachedWarehouseId) {
      setCachedWarehouseId(realWarehouseId);
      try { localStorage.setItem(WAREHOUSE_CACHE_KEY, String(realWarehouseId)); } catch {}
    }
  }, [realWarehouseId]);

  // ── Company-level allow_negative_stock ─────────────────────────────────────
  const ALLOW_NEG_KEY = 'pos-neg-stock';
  const [allowNegSetting, setAllowNegSetting] = useState<boolean | undefined>(undefined);

  // Restore cached value from localStorage when slug is available
  useEffect(() => {
    if (!slug) return;
    try {
      // Migration from old slug-based key → new fixed key, prefer old value
      const old = localStorage.getItem(`pos-neg-stock-${slug}`);
      if (old === 'true') {
        localStorage.setItem(ALLOW_NEG_KEY, 'true');
        setAllowNegSetting(true);
        return;
      }
      if (old === 'false') {
        localStorage.setItem(ALLOW_NEG_KEY, 'false');
        setAllowNegSetting(false);
        return;
      }
      // No old key — read the new key as cache
      const v = localStorage.getItem(ALLOW_NEG_KEY);
      if (v === 'true') { setAllowNegSetting(true); return; }
      if (v === 'false') { setAllowNegSetting(false); return; }
    } catch {}
  }, [slug]);

  const { data: negSettingRaw } = useQuery({
    queryKey: [slug, 'settings', 'allow_negative_stock'],
    queryFn:  () => settingsApi.getValue('allow_negative_stock'),
    enabled:  !!slug,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (negSettingRaw !== undefined) {
      // ✅ Defensive parsing: backend may return true/false, "true"/"false",
      // 1/0, or "1"/"0" depending on how the boolean setting was cast.
      // Also unwrap a possible { data: {...} } envelope just in case.
      const raw = (negSettingRaw as any)?.value ?? (negSettingRaw as any)?.data?.value;
      const val = raw === true || raw === 1 || raw === '1'
        || String(raw).toLowerCase() === 'true';
      setAllowNegSetting(val);
      try { localStorage.setItem(ALLOW_NEG_KEY, val ? 'true' : 'false'); } catch {}
      if (typeof window !== 'undefined' && (window as any).__POS_DEBUG__) {
        // eslint-disable-next-line no-console
        console.debug('[POS] allow_negative_stock raw=', negSettingRaw, '→ resolved=', val);
      }
    }
  }, [negSettingRaw]);

  // ── Stock ──────────────────────────────────────────────────────────────────
  const { data: stockData = {}, isLoading: stockLoading } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-stock', effectiveWarehouseId, fiscalYear?.id],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   effectiveWarehouseId,
        fiscal_year_id: fiscalYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!effectiveWarehouseId,
    staleTime: 2 * 60_000,
  });
  // True while stock is still unresolved for the first time — used by ProductGrid
  // to avoid flashing products as "available" before we actually know their stock.
  const stockPending = !!effectiveWarehouseId && stockLoading;

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

  const filteredVariants = useMemo(() => {
    let list = allVariants;
    if (pos.selectedCategory !== null) list = list.filter(v => v.product?.family?.id === pos.selectedCategory);
    if (settings.hideOutOfStock && !allowNegSetting) list = list.filter(v => !v.manages_stock || v.current_stock === undefined || v.current_stock > 0);
    if (filterInStock)  list = list.filter(v => !v.manages_stock || v.current_stock === undefined || v.current_stock > 0);
    if (filterLowStock) list = list.filter(v => v.manages_stock && (v.current_stock ?? 0) <= (v.min_stock_alert ?? 0) && (v.current_stock ?? 0) > 0);
    if (filterMinPrice) list = list.filter(v => v.default_selling_price_ht >= parseFloat(filterMinPrice));
    if (filterMaxPrice) list = list.filter(v => v.default_selling_price_ht <= parseFloat(filterMaxPrice));
    return list.sort((a, b) => {
      if (sortBy === 'price_asc')  return a.default_selling_price_ht - b.default_selling_price_ht;
      if (sortBy === 'price_desc') return b.default_selling_price_ht - a.default_selling_price_ht;
      if (sortBy === 'stock')      return (b.current_stock ?? 0) - (a.current_stock ?? 0);
      if (sortBy === 'family')     return (a.product?.family?.name ?? '').localeCompare(b.product?.family?.name ?? '', 'ar');
      return (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ar');
    });
  }, [allVariants, pos.selectedCategory, settings.hideOutOfStock, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice, sortBy, allowNegSetting]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredVariants.length, pos.searchQuery]);

  const isEmpty = pos.items.length === 0;

  const lastClearedSnapshotRef = useRef<{
    items: CartItem[];
    client: Party | null;
    note: string;
    invoiceDiscountPct: number;
  } | null>(null);
  const [canUndoClear, setCanUndoClear] = useState(false);
  const undoClearTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleClearCart = useCallback((opts?: { skipConfirm?: boolean }) => {
    if (isEmpty) return;
    if (settings.confirmOnClear && !opts?.skipConfirm
        && !confirm('هل تريد مسح كل الأصناف من السلة؟')) return;

    lastClearedSnapshotRef.current = {
      items:               [...pos.items],
      client:              pos.client,
      note:                cartNote,
      invoiceDiscountPct:  pos.invoiceDiscountPct,
    };
    setCanUndoClear(true);
    clearTimeout(undoClearTimerRef.current);
    undoClearTimerRef.current = setTimeout(() => {
      lastClearedSnapshotRef.current = null;
      setCanUndoClear(false);
    }, 20_000);

    pos.clearCart();
    pos.setInvoiceDiscountPct(0);
    setCartNote('');
    setEditingDocumentId(null);
    setEditingDocStatus(null);
    setEditingDocumentDate(null);
  }, [settings.confirmOnClear, isEmpty, pos, cartNote]);

  const clearCartSafe = handleClearCart;

  const handleUndoClear = useCallback(() => {
    const snap = lastClearedSnapshotRef.current;
    if (!snap) return;
    useCartStore.setState({
      items:              snap.items,
      client:             snap.client,
      invoiceDiscountPct: snap.invoiceDiscountPct,
    });
    setCartNote(snap.note);
    lastClearedSnapshotRef.current = null;
    setCanUndoClear(false);
    clearTimeout(undoClearTimerRef.current);
    toast.success('تم استرجاع السلة');
  }, []);

  const handleOpenDrawer = useCallback(async () => {
    const res = await openCashDrawerViaWebUSB();
    if (!res.ok) toast.error(res.message ?? 'تعذّر فتح الدرج');
  }, []);

  const handleOpenInvoice = useCallback(async (docId: number) => {
    const cartState = useCartStore.getState();
    if (!isEmpty && cartState._isDirty) pos.holdCart();
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,lines,lines.product,lines.product_variant,payments,payments.payment_mode',
      });
      if (!doc?.lines?.length) {
        toast.error('لا توجد أصناف في هذه الفاتورة');
        return;
      }

      // الرصيد يُحسب داخل ProfessionalPaymentModal تلقائياً
      const items: CartItem[] = doc.lines.map(line => {
        const v    = line.product_variant;
        const prod = line.product;
        return {
          id:                  nanoid(8),
          product_id:          line.product_id ?? prod?.id ?? 0,
          variant_id:          line.product_variant_id ?? 0,
          product_name:        line.description ?? v?.product?.name ?? prod?.name ?? '',
          variant_name:        v?.variant_name ?? null,
          ref:                 v?.ref ?? prod?.ref ?? '',
          barcode:             v?.barcode ?? null,
          unit_symbol:         v?.unit?.abbreviation ?? 'قطعة',
          image_url:           null,
          quantity:            Number(line.quantity),
          unit_price_ht:       Number(line.unit_price_ht),
          selling_price_ttc:   Number(line.unit_price_ht) * (1 + Number(line.tva_rate) / 100),
          tva_rate:            Number(line.tva_rate),
          tva_id:              v?.tva_id ?? null,
          discount_percentage: Number(line.discount_percentage),
          discount_amount:     Number(line.discount_amount),
          total_ht:            Number(line.total_ht),
          total_ttc:           Number(line.total_ttc),
          max_stock:           null,
          manages_stock:       false,
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
      useCartStore.setState({ items, client: doc.party ?? null, payments });
      useCartStore.getState().markClean();
      setEditingDocumentId(docId);
      setEditingDocStatus(doc.status);
      setEditingDocumentDate(doc.document_date ?? null);
      editingPrevBalanceRef.current = (doc as any)?.balance_data?.previous_balance;
      setShowSessionInvoices(false);
      toast.success(`تم فتح الفاتورة ${doc.document_number}`);
    } catch {
      toast.error('فشل تحميل الفاتورة');
    }
  }, [isEmpty, pos]);

  // ── Invoice discount ───────────────────────────────────────────────────────
  // ✅ pos.totals (من calcTotals) تُطبِّق الخصم بالفعل ومرة واحدة فقط
  const invoiceDiscountPct    = pos.invoiceDiscountPct;
  const invoiceDiscountAmount = pos.totals.invoice_discount_amount ?? 0;

  const adjustedTotalHt       = pos.totals.total_ht;
  const adjustedTotalTva      = pos.totals.total_tva;
  const adjustedTotalTtcFinal = pos.totals.total_ht + pos.totals.total_tva + pos.totals.fiscal_stamp;

  const existingPaymentsSum = useMemo(
    () => pos.payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [pos.payments],
  );
  const remainingToPay = Math.max(0, adjustedTotalTtcFinal - existingPaymentsSum);

  const avgMargin = useMemo(() => {
    if (!pos.items.length) return 0;
    return pos.items.reduce((s, i) =>
      s + calcMargin(i.unit_price_ht, (i as any).average_cost_price ?? 0), 0) / pos.items.length;
  }, [pos.items]);

  const filterActive = filterInStock || filterLowStock || !!filterMinPrice || !!filterMaxPrice;

  // ── Barcode Scanner ────────────────────────────────────────────────────────
  const barcodeRef = useRef('');
  useEffect(() => { barcodeRef.current = barcodeBuffer; }, [barcodeBuffer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const buf = barcodeRef.current;
      if (e.key === 'Enter' && buf.length >= 4) {
        const variant = allVariants.find(v => v.barcode === buf);
        if (variant && !isVariantOutOfStock(variant, allowNegSetting)) pos.addItem(variant);
        setBarcodeBuffer('');
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setBarcodeBuffer(b => b + e.key);
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(''), 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [allVariants, pos]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const slugRef = slug;
    const handler = (e: KeyboardEvent) => {
      const tag     = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (matchOverride(slugRef, 'searchFocus', e))  { e.preventDefault(); searchRef.current?.focus(); }
      if (matchOverride(slugRef, 'payment', e))      { e.preventDefault(); if (!isEmpty) { setModal('payment'); } }
      if (matchOverride(slugRef, 'holdCart', e))     { e.preventDefault(); if (!isEmpty) pos.holdCart(); }
      if (matchOverride(slugRef, 'manualProduct', e)){ e.preventDefault(); setModal('manual'); }
      if (matchOverride(slugRef, 'heldCarts', e))    { e.preventDefault(); setModal('held'); }
      if (matchOverride(slugRef, 'sessionStats', e)) { e.preventDefault(); setModal(m => m === 'session' ? 'none' : 'session'); }
      if (matchOverride(slugRef, 'preview', e)) {
        e.preventDefault();
        if (!isEmpty) {
          setReceiptSnapshot({ items: [...pos.items], totals: { ...pos.totals } });
          setModal('receipt');
        }
      }
      if (matchOverride(slugRef, 'fullscreen', e))  { e.preventDefault(); toggleFullscreen(); }
      if (matchOverride(slugRef, 'clearCart', e))    { e.preventDefault(); handleClearCart(); }
      if (matchOverride(slugRef, 'kbHelp', e))       { e.preventDefault(); setModal('kbhelp'); }
      if (matchOverride(slugRef, 'returns', e))      { e.preventDefault(); setModal('returns'); }
      if (matchOverride(slugRef, 'openDrawer', e))   { e.preventDefault(); handleOpenDrawer(); }
      if (matchOverride(slugRef, 'undoClear', e))    { e.preventDefault(); handleUndoClear(); }

      if (!inInput) {
        if (matchOverride(slugRef, 'gridView', e))   { e.preventDefault(); setView('grid'); }
        if (matchOverride(slugRef, 'listView', e))   { e.preventDefault(); setView('list'); }
        if (matchOverride(slugRef, 'zoomIn', e)) {
          e.preventDefault();
          setGridSize(s => s === 'xs' ? 'sm' : s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'lg');
        }
        if (matchOverride(slugRef, 'zoomOut', e)) {
          e.preventDefault();
          setGridSize(s => s === 'lg' ? 'md' : s === 'md' ? 'sm' : s === 'sm' ? 'xs' : 'xs');
        }
      }
      if (e.altKey && !isNaN(parseInt(e.key)) && !inInput) {
        const idx = parseInt(e.key) - 1;
        if (idx === -1) pos.setCategory(null);
        else if (idx < families.length) pos.setCategory(families[idx].id);
        e.preventDefault();
      }
      if (!inInput) {
        const lastItem = pos.items[pos.items.length - 1];
        if (matchOverride(slugRef, 'qtyUp', e)   && lastItem)                          { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity + 1); }
        if (matchOverride(slugRef, 'qtyDown', e) && lastItem && lastItem.quantity > 1) { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity - 1); }
        if (matchOverride(slugRef, 'deleteItem', e) && selectedCartItemId)             { e.preventDefault(); pos.removeItem(selectedCartItemId); setSelectedCartItemId(null); }
      }
      if (matchOverride(slugRef, 'escape', e)) {
        if (modal !== 'none')                 setModal('none');
        else if (showFilter)                  setShowFilter(false);
        else if (!inInput && pos.searchQuery) pos.setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slug, pos, isEmpty, modal, showFilter, families, selectedCartItemId, toggleFullscreen,
      handleClearCart, handleOpenDrawer, handleUndoClear]);

  // ── Price Level ────────────────────────────────────────────────────────────
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
      const priceEntry = (variant?.prices as any[])?.find((pr: any) => pr.price_level_id === plId);
      if (priceEntry?.price_ht)            pos.updatePrice(item.id, priceEntry.price_ht);
      else if ((pl as any).discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - (pl as any).discount_percent / 100));
      }
    });
  }, [priceLevelsList, allVariants, pos.items, pos.updatePrice]);

  // ── Print Settings ──────────────────────────────────────────────────────────
  const { template, enabled: isPrintEnabled, copies, paperWidth, autoPrint, showPreview }
    = usePrintSettings('POS');

  const companyData: CompanyPreviewData | null = useMemo(() => mapCompany(company), [company]);

  const handlePrintDirect = useCallback(async (
    snap: POSSaleSnapshot,
  ) => {
    try {
      const resolvedDocNum = snap.docNumber;

      const html = renderPreviewToHtml({
        template,
        company: companyData,
        source: { type: 'pos-snapshot', snapshot: snap },
      });

      const isThermalPaper = template.paper_size === '80mm' || template.paper_size === '58mm';
      if (settings.printMode === 'thermal' && resolvedDocNum && isThermalPaper) {
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? {} as any);
        const result = await printThermalViaWebUSBFromTemplate(template, data, resolvedDocNum);
        if (result.ok) {
          toast.success('✅ تمت الطباعة الحرارية');
        } else {
          toast.error(`خطأ في الطباعة الحرارية: ${result.message}`);
          await printReceiptDirect({
            html, paperWidth, copies,
            onError: (e) => toast.error(`خطأ في طباعة المتصفح: ${e.message}`),
          });
        }
      } else {
        await printReceiptDirect({
          html, paperWidth, copies,
          onDone:  () => toast.success('✅ تم إرسال الطباعة'),
          onError: (e) => toast.error(`خطأ في الطباعة: ${e.message}`),
        });
      }
    } catch (e: any) {
      toast.error(`خطأ في تجهيز الطباعة: ${e.message}`);
    }
  }, [template, companyData, paperWidth, copies, settings.printMode]);

  // ── Complete Sale ──────────────────────────────────────────────────────────
  const handleCompleteSale = useCallback(async (params: {
    amountPaid:   number;
    dueDate?:     string;
    note?:        string;
    docTypeCode?: string;
    payments?:    Array<{ id?: number; paymentModeId: number; amount: number; treasuryAccountId?: number | null; reference?: string | null }>;
    currencyId?:  number | null;
  }) => {
    const typeCode = params.docTypeCode ?? settings.defaultDocTypeCode;
    const invType  = documentTypes?.find(t => t.code === typeCode)
                  ?? documentTypes?.find(t => t.code === 'BL')
                  ?? documentTypes?.find(t => t.code === 'FAC')
                  ?? documentTypes?.[0];

    if (!invType)          return { ok: false, message: 'لم يُعثَر على نوع مستند' };
    if (!defaultWarehouse) return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
    if (!fiscalYear)       return { ok: false, message: 'لا توجد سنة مالية نشطة' };

    const currentItems   = pos.items;
    const currentTotals  = pos.totals;
    const currentClient  = pos.client;
    const currentInvDisc = pos.invoiceDiscountPct;

    try {
      const snapshot = { items: [...currentItems], totals: { ...currentTotals } };

      const apiPayments = (params.payments ?? [])
        .filter(p => p.amount > 0)
        .map(p => ({
          ...(p.id ? { id: p.id } : {}),
          payment_mode_id:     p.paymentModeId,
          amount:              p.amount,
          payment_date:        new Date().toISOString().slice(0, 10),
          treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
          reference:           p.reference?.trim() || null,
          notes:               params.note?.trim() || null,
        }));

      const linesPayload = currentItems.map(i => {
        const compoundedDisc = currentInvDisc > 0
          ? 100 - (100 - i.discount_percentage) * (100 - currentInvDisc) / 100
          : i.discount_percentage;
        return {
          product_id:          i.product_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: Math.min(100, compoundedDisc),
          tva_rate:            i.tva_rate,
        };
      });

      const effectiveTotalHt = linesPayload.reduce((s, l) =>
        s + l.quantity * l.unit_price_ht * (1 - l.discount_percentage / 100), 0);
      const effectiveTotalTva = linesPayload.reduce((s, l) => {
        const lineHt = l.quantity * l.unit_price_ht * (1 - l.discount_percentage / 100);
        return s + lineHt * l.tva_rate / 100;
      }, 0);
      const effectiveTotalTtc = effectiveTotalHt + effectiveTotalTva + snapshot.totals.fiscal_stamp;

      const commonPayload = {
        party_id:       currentClient?.id ?? null,
        warehouse_id:   defaultWarehouse.id,
        fiscal_year_id: fiscalYear.id,
        currency_id:    params.currencyId ?? defaultCurrency?.id ?? null,
        document_date:  new Date().toISOString().slice(0, 10),
        due_date:       params.dueDate ?? null,
        notes:          params.note ?? cartNote ?? null,
      };

      let res;
      if (editingDocumentId) {
        const isDraft = editingDocStatus === 'draft';
        res = await documentsApi.update(editingDocumentId, {
          ...commonPayload,
          ...(isDraft ? { lines: linesPayload } : {}),
          payments: apiPayments,
        });
      } else {
        res = await documentsApi.create({
          ...commonPayload,
          document_type_id: invType.id,
          lines:            linesPayload,
          payments:         apiPayments,
        });
      }

      if (currentSession?.id) {
        incrementMut.mutate(
          buildIncrementInput({
            items:            currentItems,
            totalHt:          effectiveTotalHt,
            totalTva:         effectiveTotalTva,
            totalFiscalStamp: snapshot.totals.fiscal_stamp,
            totalDiscount:    snapshot.totals.total_discount + invoiceDiscountAmount,
            grandTotal:       effectiveTotalTtc,
            payments:         apiPayments.map(p => ({
              payment_mode_id: p.payment_mode_id,
              amount:          p.amount,
            })),
          }),
        );
      }
      lastPaymentRef.current = {
        paid: params.amountPaid,
        payments: params.payments?.filter(p => p.amount > 0).map(p => ({
          paymentModeId: p.paymentModeId, amount: p.amount,
        })) ?? [],
        dueDate: params.dueDate,
      };

      const totalPaid         = params.amountPaid;
      const invoiceRemaining  = Math.max(0, effectiveTotalTtc - totalPaid);
      const invoiceChange     = Math.max(0, totalPaid - effectiveTotalTtc);
      // SSOT: backend computes balance_data — no more partyBalancesApi.getOne()
      const bd = (res as any)?.balance_data;
      const prevBalance = bd?.previous_balance ?? 0;
      const newBalance  = bd?.new_balance ?? 0;

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
          total_ht:  effectiveTotalHt,
          total_tva: effectiveTotalTva,
          total_ttc: effectiveTotalTtc,
          paid:      totalPaid,
          change:    invoiceChange,
          remaining: invoiceRemaining,
        },
        docNum: res.document_number,
        client: currentClient,
        payments: params.payments?.filter(p => p.amount > 0).map(p => ({
          paymentModeId: p.paymentModeId, amount: p.amount,
        })) ?? [],
        dueDate: params.dueDate,
        prevBalance,
        newBalance,
      };
      setEditingDocumentId(null);
      setEditingDocStatus(null);
      setEditingDocumentDate(null);
      editingPrevBalanceRef.current = undefined;
      receiptSnapshotRef.current = fullSnapshot;
      setReceiptSnapshot(fullSnapshot);
      setLastDocNum(res.document_number);
      setCartNote('');
      pos.setInvoiceDiscountPct(0);
      pos.clearCart();
      setSelectedCartItemId(null);

      if (autoPrint && isPrintEnabled && template) {
        setTimeout(() => {
          const snap = receiptSnapshotRef.current;
          if (snap) handlePrintDirect(snap);
        }, 300);
        if (!showPreview) {
          setModal('none');
        } else {
          setModal('receipt');
        }
      } else if (showPreview) {
        setModal('receipt');
      } else {
        setModal('none');
      }

      toast.success(`✅ تم حفظ الفاتورة ${res.document_number ?? ''}`);
      return { ok: true, docNumber: res.document_number };

    } catch (err: any) {
      const msg = err?.errors?.lines?.[0] ?? err?.message ?? 'فشل حفظ الفاتورة';
      toast.error(String(msg));
      return { ok: false, message: String(msg) };
    }
  }, [pos, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency, defaultTreasury, cartNote, settings.defaultDocTypeCode, autoPrint, isPrintEnabled, template, handlePrintDirect, showPreview, invoiceDiscountAmount, buildIncrementInput, editingDocumentId]);

  // ── Quick Items ────────────────────────────────────────────────────────────
  const toggleQuickItem = useCallback((variant: ProductVariant) => {
    setQuickItems(prev => {
      const exists = prev.find(q => q.variantId === variant.id);
      if (exists) return prev.filter(q => q.variantId !== variant.id);
      return [...prev, {
        variantId: variant.id,
        name:      variant.product?.name ?? '',
        priceHt:   variant.default_selling_price_ht,
        tvaRate:   variant.tva?.rate ?? 0,
      }];
    });
  }, []);

  const isQuickItem = useCallback((variantId: number) =>
    quickItems.some(q => q.variantId === variantId), [quickItems]);

  const handleAddItem = useCallback((v: ProductVariant) => {
    pos.addItem(v);
    if (settings.clearSearchOnAdd) {
      pos.setSearch('');
      searchRef.current?.focus();
    }
  }, [pos, settings.clearSearchOnAdd]);

  const handleArrowUp = useCallback(() => {
    setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredVariants.length - 1);
  }, [filteredVariants.length]);

  const handleArrowDown = useCallback(() => {
    setHighlightedIndex(prev => prev < filteredVariants.length - 1 ? prev + 1 : 0);
  }, [filteredVariants.length]);

  const handleEnterHighlighted = useCallback(() => {
    const v = filteredVariants[highlightedIndex];
    if (v && !isVariantOutOfStock(v, allowNegSetting) && !(v.manages_stock && v.current_stock === undefined && stockPending)) {
      handleAddItem(v);
    }
  }, [filteredVariants, highlightedIndex, allowNegSetting, stockPending, handleAddItem]);

  const orderTypeLabels: Record<OrderType, { icon: string; label: string }> = {
    'dine-in':  { icon: 'ti-building-store', label: 'طاولة' },
    'takeaway': { icon: 'ti-shopping-bag',   label: 'استلام' },
    'delivery': { icon: 'ti-truck-delivery', label: 'توصيل' },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`pos-wrap on ${fullscreen ? 'pos-fullscreen' : ''}`}
      id="p-pos"
      dir="rtl"
    >
      {/* جلسة مطلوبة — تظهر إذا لم تكن هناك جلسة مفتوحة */}
      {!sessionLoading && !currentSession && (
        <OpenSessionModal
          warehouses={warehouses ?? []}
          fiscalYears={fiscalYears ?? []}
          defaultWarehouseId={defaultWarehouse?.id}
          defaultFiscalYearId={fiscalYear?.id}
          isLoading={openSessionMut.isPending}
          error={sessionError}
          onOpen={handleOpenSession}
        />
      )}

      {/* نافذة إغلاق الجلسة */}
      {showCloseSession && currentSession && (
        <CloseSessionModal
          session={currentSession}
          isLoading={closeSessionMut.isPending}
          error={closeSessionMut.error?.message ?? null}
          onClose={() => setShowCloseSession(false)}
          onConfirm={handleCloseSession}
        />
      )}

      <POSTopBar
        session={currentSession}
        heldCount={pos.heldCarts.length}
        avgMargin={avgMargin}
        isEmpty={isEmpty}
        isFullscreen={fullscreen}
        showQuickbar={showQuickbar}
        items={pos.items}
        totals={pos.totals}
        totalTtcFinal={adjustedTotalTtcFinal}
        onHeld={() => setModal('held')}
        onNewSale={() => isEmpty ? pos.clearCart() : pos.holdCart()}
        onManual={() => setModal('manual')}
        onReturn={() => setModal('returns')}
        onReceipt={() => {
          if (!isEmpty) {
            setReceiptSnapshot({ items: [...pos.items], totals: { ...pos.totals } });
            setModal('receipt');
          }
        }}
        onSession={() => setModal(m => m === 'session' ? 'none' : 'session')}
        onSessionInvoices={() => setShowSessionInvoices(true)}
        onFullscreen={toggleFullscreen}
        onKbHelp={() => setModal('kbhelp')}
        onSettings={() => setShowSettings(true)}
        onToggleQuickbar={handleToggleQuickbar}
        onKioskMode={() => navigate('/pos/kiosk')}
        onOpenDrawer={handleOpenDrawer}
      />

      <div className="pos-order-type">
        {(Object.entries(orderTypeLabels) as [OrderType, { icon: string; label: string }][]).map(([key, { icon, label }]) => (
          <button key={key} className={`pot-btn ${orderType === key ? 'on' : ''}`} onClick={() => setOrderType(key)}>
            <i className={`ti ${icon}`} />{label}
          </button>
        ))}
      </div>

      {showQuickbar && quickItems.length > 0 && (
        <QuickItemsBar
          quickItems={quickItems}
          allVariants={allVariants}
          onAdd={handleAddItem}
          onRemove={variantId => setQuickItems(p => p.filter(q => q.variantId !== variantId))}
          allowNegativeStock={allowNegSetting}
        />
      )}

      <MobileTabs
        activeTab={mobTab} onTab={setMobTab}
        itemsCount={pos.totals.items_count}
        totalTtc={adjustedTotalTtcFinal}
        isEmpty={isEmpty} onSell={() => setModal('payment')}
      />

      <div className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}>
        <div className="pos-left">
          <ProductSearchBar
            query={pos.searchQuery} onQuery={pos.setSearch}
            view={view} gridSize={gridSize}
            onView={setView} onGridSize={setGridSize}
            onFilter={() => setShowFilter(s => !s)} filterActive={filterActive}
            inputRef={searchRef} sortBy={sortBy} onSort={setSortBy}
            resultsCount={filteredVariants.length}
            onEnterFirst={settings.keyboardNav ? handleEnterHighlighted : () => { const first = filteredVariants[0]; if (first && !isVariantOutOfStock(first, allowNegSetting) && !(first.manages_stock && first.current_stock === undefined && stockPending)) handleAddItem(first); }}
            highlightedIndex={highlightedIndex}
            onArrowUp={handleArrowUp}
            onArrowDown={handleArrowDown}
            keyboardNavEnabled={settings.keyboardNav}
          />
          {showFilter && (
            <FilterPanel
              inStock={filterInStock}   onInStock={setFilterInStock}
              lowStock={filterLowStock} onLowStock={setFilterLowStock}
              minPrice={filterMinPrice} onMinPrice={setFilterMinPrice}
              maxPrice={filterMaxPrice} onMaxPrice={setFilterMaxPrice}
              onReset={() => { setFilterInStock(false); setFilterLowStock(false); setFilterMinPrice(''); setFilterMaxPrice(''); }}
            />
          )}
          <CategoryTabs families={families} selected={pos.selectedCategory} onSelect={pos.setCategory} />
          <ProductGrid
            variants={filteredVariants} view={view} gridSize={gridSize}
            loading={loadingAll}
            onAdd={handleAddItem} onAddManual={() => setModal('manual')}
            highlightedIndex={highlightedIndex}
            onHighlightIndexChange={setHighlightedIndex}
            onPin={toggleQuickItem} isPinned={isQuickItem}
            priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
            cartItems={pos.items} allowNegativeStock={allowNegSetting}
            stockPending={stockPending}
          />
        </div>

        {/* ✅ ProfessionalCart مع onDiscountAmount */}
        <ProfessionalCart
          items={pos.items} totals={pos.totals} client={pos.client} customers={customers}
          priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
          note={cartNote} selectedItemId={selectedCartItemId}
          onSelectItem={setSelectedCartItemId}
          onQty={pos.updateQty}
          onDiscount={pos.updateDiscount}
          onDiscountAmount={pos.updateDiscountAmount}          // ✅ جديد
          onPrice={pos.updatePrice}
          onRemove={id => { pos.removeItem(id); if (selectedCartItemId === id) setSelectedCartItemId(null); }}
          onSetClient={pos.setClient} onPriceLevelChange={applyPriceLevel}
          onNoteChange={setCartNote} onHold={pos.holdCart}
          onSell={() => setModal('payment')} onClear={handleClearCart} onHeld={() => setModal('held')}
          totalTtcFinal={adjustedTotalTtcFinal}
          remainingToPay={remainingToPay}
          invoiceDiscountPct={pos.invoiceDiscountPct}
          onInvoiceDiscountChange={pos.setInvoiceDiscountPct}
          invoiceDiscountAmount={invoiceDiscountAmount}
          onUndoClear={handleUndoClear}
          canUndoClear={canUndoClear}
          clientBalance={clientBalance?.current_balance}
        />
      </div>

      {/* ── Modals ── */}

      {modal === 'payment' && (
        /* ✅ ProfessionalPaymentModal v2 — مع treasuryAccounts + numpad */
        <ProfessionalPaymentModal
          totals={pos.totals} client={pos.client}
          paymentModes={paymentModes ?? []}
          documentTypes={documentTypes ?? []}
          currencies={currencies ?? []}
          treasuryAccounts={treasuryAccounts ?? []}           // ✅ جديد
          totalTtcFinal={adjustedTotalTtcFinal}
          existingPayments={pos.payments}
          isEditing={editingDocumentId !== null}
          documentDate={editingDocumentDate ?? new Date().toISOString().slice(0, 10)}
          prevBalance={editingPrevBalanceRef.current}
          onClose={() => setModal('none')}
          onConfirm={handleCompleteSale}
        />
      )}

      {modal === 'held' && (
        <HeldCartsModal
          carts={pos.heldCarts} onClose={() => setModal('none')}
          onRestore={id => { pos.restoreCart(id); setModal('none'); }}
          onDelete={pos.deleteHeldCart}
        />
      )}

      {modal === 'receipt' && receiptSnapshot && receiptSource && template && (
        <ProfessionalReceipt
          template={template}
          company={companyData}
          source={receiptSource}
          docNumber={receiptSnapshot.docNum}
          onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
          onPrint={() => {
            handlePrintDirect(receiptSnapshot);
          }}
          onNewSale={() => { setModal('none'); setReceiptSnapshot(null); pos.clearCart(); }}
        />
      )}

      {modal === 'manual' && (
        <ManualProductModal
          onClose={() => setModal('none')}
          onAdd={(name, priceTtc, qty, tvaRate) => {
            pos.addItem(makeFakeVariant(name, ttcToHt(priceTtc, tvaRate), tvaRate), qty);
            setModal('none');
          }}
        />
      )}

      {showSessionInvoices && currentSession && (
        <SessionInvoicesModal
          session={currentSession}
          onClose={() => setShowSessionInvoices(false)}
          onOpen={handleOpenInvoice}
        />
      )}

      {modal === 'session' && currentSession && (
        <SessionStatsModal
          session={currentSession}
          onClose={() => setModal('none')}
          onEndSession={() => { setModal('none'); setShowCloseSession(true); }}
        />
      )}

      {modal === 'returns' && (
        <ReturnsModal
          documentTypes={documentTypes ?? []}
          defaultWarehouseId={defaultWarehouse?.id}
          fiscalYearId={fiscalYear?.id}
          onClose={() => setModal('none')}
          onDone={() => setModal('none')}
        />
      )}

      {modal === 'kbhelp' && <KeyboardHelpModal onClose={() => setModal('none')} />}

      {showSettings && (
        <POSSettingsModal
          settings={settings}
          onSave={setSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
          warehouses={warehouses ?? []}
          documentTypes={documentTypes ?? []}
        />
      )}

      {pinModal && (
        <ManagerPinModal
          requestedDiscount={pinModal.requestedDiscount}
          threshold={pinModal.reason === 'max_exceeded' ? settings.maxDiscountPct : settings.discountPinThreshold}
          reason={pinModal.reason}
          onSuccess={() => { pinModal.onSuccess(); setPinModal(null); }}
          onCancel={() => setPinModal(null)}
          verifyPin={pin => pin === settings.managerPin}
        />
      )}

      <Toaster position="top-left" richColors closeButton
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
    </div>
  );
}