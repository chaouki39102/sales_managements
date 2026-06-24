// ════════════════════════════════════════════════════════════════════════════
// pages/pos/POSPage.tsx
//
// ✅ التغييرات عن النسخة السابقة:
//   1. pos.updateDiscountAmount مُمرَّر لـ ProfessionalCart
//   2. treasuryAccounts مُمرَّرة لـ ProfessionalPaymentModal
//   3. ProfessionalCart يُظهر CustomerSearchModal داخلياً
//      (لا حاجة لإدارة modal هنا)
//   4. getQuantityDiscount مُستوردة ومُطبَّقة في pos.addItem
//      (منطقها الآن داخل useCartStore — لا تغيير هنا)
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Toaster, toast }    from 'sonner';
import { usePOS }             from '@/pos/hooks/usePOS';
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
import { useActiveSlug }      from '@/lib/store/appStore';
import {
  calcFiscalStamp, formatDZD, htToTtc, ttcToHt, calcMargin,
} from '@/pos/utils/calculations';
import {
  productToVariant, makeFakeVariant,
} from '@/pos/utils/posHelpers';
import { isVariantOutOfStock } from '@/pos/utils/posHelpers';
import type { ActiveModal, QuickItem, ViewMode, GridSize, SortMode } from '@/pos/utils/posHelpers';
import type { PaginatedResponse } from '@/lib/api/core/types';
import type {
  Product, ProductVariant, CartItem, CartTotals,
  PriceLevel, Party, PaymentMode, DocumentType,
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
import KeyboardHelpModal        from '@/pos/components/KeyboardHelpModal';
import POSSettingsModal          from '@/pos/components/POSSettingsModal';
import ManagerPinModal           from '@/pos/components/ManagerPinModal';
import { usePOSSettings, checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import { matchOverride }        from '@/pos/hooks/useKeyboardMap';

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

const QUICK_ITEMS_KEY = (slug: string) => `pos-quick-items-${slug}`;

export default function POSPage() {
  const pos         = usePOS();
  const slug        = useActiveSlug();
  const fiscalYear  = useSelectedFiscalYear();
  const navigate    = useNavigate();

  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const openSessionMut   = useOpenSession();
  const closeSessionMut  = useCloseSession(currentSession?.id ?? null);
  const incrementMut     = useIncrementSession(currentSession?.id ?? null);
  const [showCloseSession, setShowCloseSession] = useState(false);
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

  const [receiptSnapshot, setReceiptSnapshot] = useState<{
    items: CartItem[]; totals: CartTotals; docNum?: string;
  } | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');

  const [quickItems, setQuickItems] = useState<QuickItem[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(QUICK_ITEMS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showQuickbar, setShowQuickbar] = useState(settings.showQuickbarOnStart);

  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(QUICK_ITEMS_KEY(slug), JSON.stringify(quickItems)); }
    catch { /* storage full */ }
  }, [quickItems, slug]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const productPagesRef = useRef<Product[]>([]);
  const loadedPageRef   = useRef(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    productPagesRef.current = [];
    loadedPageRef.current   = 0;
  }, [pos.searchQuery, pos.selectedCategory]);

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [filterMinPrice,  setFilterMinPrice]  = useState('');
  const [filterMaxPrice,  setFilterMaxPrice]  = useState('');
  const [filterInStock,   setFilterInStock]   = useState(false);
  const [filterLowStock,  setFilterLowStock]  = useState(false);
  const [sortBy,          setSortBy]          = useState<SortMode>('name');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const searchRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  const isSearching   = pos.searchQuery.trim().length >= 2;
  const queryFamilyId = pos.selectedCategory ?? undefined;

  // ── Products query ─────────────────────────────────────────────────────────
  const { data: productsRaw, isLoading: loadingAll } = useQuery({
    queryKey: [slug, 'products', 'pos', {
      search: pos.searchQuery, cat: pos.selectedCategory, page, per_page: 120,
    }],
    queryFn: () => productsApi.list({
      per_page:  120,
      include:   'tva,unit,family,prices.priceLevel,quantityDiscounts',
      search:    isSearching ? pos.searchQuery : undefined,
      ...(queryFamilyId ? { family_id: queryFamilyId } : {}),
      page,
      active:    true,
    }),
    enabled:         !!slug,
    staleTime:       isSearching ? 2 * 60_000 : 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const productsPage = Array.isArray(productsRaw)
    ? productsRaw
    : (productsRaw as PaginatedResponse<Product>)?.data ?? [];
  const productsMeta = !Array.isArray(productsRaw)
    ? (productsRaw as PaginatedResponse<Product>)?.meta ?? null
    : null;

  if (productsPage.length && page !== loadedPageRef.current) {
    loadedPageRef.current = page;
    if (page === 1) {
      productPagesRef.current = productsPage;
    } else {
      const ids     = new Set(productPagesRef.current.map(p => p.id));
      const newOnes = productsPage.filter(p => !ids.has(p.id));
      if (newOnes.length) productPagesRef.current = [...productPagesRef.current, ...newOnes];
    }
  }

  const rawProducts = productPagesRef.current;
  const hasMore     = productsMeta ? !productsMeta.is_last_page : false;

  // ── Lookups ─────────────────────────────────────────────────────────────────
  const { data: fiscalYearsData } = useFiscalYears();
  const fiscalYears = fiscalYearsData?.years ?? [];

  const { data: customersData    } = useClients({ per_page: 200 });
  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses       } = useWarehouses();
  const { data: documentTypes    } = useDocumentTypes();
  const { data: priceLevels      } = usePriceLevels();
  const { data: currencies       } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();   // ✅ مُضاف

  const customers        = (customersData as PaginatedResponse<Party>)?.data ?? (customersData as Party[]) ?? [];
  const priceLevelsList  = priceLevels ?? [];
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
    if (settings.hideOutOfStock) list = list.filter(v => !v.manages_stock || (v.current_stock ?? 0) > 0);
    if (filterInStock)  list = list.filter(v => !v.manages_stock || (v.current_stock ?? 0) > 0);
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
  }, [allVariants, pos.selectedCategory, settings.hideOutOfStock, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice, sortBy]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredVariants.length, pos.searchQuery]);

  const isEmpty = pos.items.length === 0;

  const clearCartSafe = useCallback(() => {
    if (settings.confirmOnClear && !isEmpty && !confirm('هل تريد مسح كل الأصناف من السلة؟')) return;
    pos.clearCart();
  }, [settings.confirmOnClear, isEmpty, pos]);

  // ── Invoice discount ───────────────────────────────────────────────────────
  const invoiceDiscountPct    = pos.invoiceDiscountPct;
  const invoiceDiscountAmount = useMemo(() => {
    if (!invoiceDiscountPct || invoiceDiscountPct <= 0) return 0;
    return Math.round(pos.totals.total_ht * invoiceDiscountPct / 100 * 100) / 100;
  }, [pos.totals.total_ht, invoiceDiscountPct]);

  const adjustedTotalHt  = pos.totals.total_ht - invoiceDiscountAmount;
  const adjustedTotalTva = useMemo(() => {
    if (!pos.totals.total_ht) return pos.totals.total_tva;
    return pos.items.reduce((s, i) => {
      const itemHt = i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100);
      const share  = itemHt / pos.totals.total_ht;
      return s + (itemHt - invoiceDiscountAmount * share) * i.tva_rate / 100;
    }, 0);
  }, [pos.items, pos.totals.total_ht, invoiceDiscountAmount]);

  const adjustedTotalTtcFinal = adjustedTotalHt + adjustedTotalTva + pos.totals.fiscal_stamp;

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
      if (matchOverride(slugRef, 'payment', e))      { e.preventDefault(); if (!isEmpty) setModal('payment'); }
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
      if (matchOverride(slugRef, 'clearCart', e))    { e.preventDefault(); if (!isEmpty) pos.clearCart(); }
      if (matchOverride(slugRef, 'kbHelp', e))       { e.preventDefault(); setModal('kbhelp'); }

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
  }, [slug, pos, isEmpty, modal, showFilter, families, selectedCartItemId, toggleFullscreen]);

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

  // ── Complete Sale ──────────────────────────────────────────────────────────
  const handleCompleteSale = useCallback(async (params: {
    amountPaid:   number;
    dueDate?:     string;
    note?:        string;
    docTypeCode?: string;
    payments?:    Array<{ paymentModeId: number; amount: number; treasuryAccountId?: number | null }>;
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
          payment_mode_id:     p.paymentModeId,
          amount:              p.amount,
          payment_date:        new Date().toISOString().slice(0, 10),
          treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,  // ✅
        }));

      const lineDiscountShare = currentInvDisc > 0
        ? currentItems.map(i => {
            const lineHt = i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100);
            const share  = currentTotals.total_ht > 0 ? lineHt / currentTotals.total_ht : 0;
            return share * currentInvDisc;
          })
        : currentItems.map(() => 0);

      const res = await documentsApi.create({
        document_type_id: invType.id,
        party_id:         currentClient?.id ?? null,
        warehouse_id:     defaultWarehouse.id,
        fiscal_year_id:   fiscalYear.id,
        currency_id:      params.currencyId ?? defaultCurrency?.id ?? null,
        document_date:    new Date().toISOString().slice(0, 10),
        due_date:         params.dueDate ?? null,
        notes:            params.note ?? cartNote ?? null,
        lines: currentItems.map((i, idx) => ({
          product_id:          i.product_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: Math.min(100, i.discount_percentage + (lineDiscountShare[idx] || 0)),
          tva_rate:            i.tva_rate,
        })),
        payments: apiPayments,
      });

      if (currentSession?.id) {
        incrementMut.mutate(
          buildIncrementInput({
            items:            currentItems,
            totalHt:          snapshot.totals.total_ht,
            totalTva:         snapshot.totals.total_tva,
            totalFiscalStamp: snapshot.totals.fiscal_stamp,
            totalDiscount:    snapshot.totals.total_discount + invoiceDiscountAmount,
            grandTotal:       snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp,
            payments:         apiPayments.map(p => ({
              payment_mode_id: p.payment_mode_id,
              amount:          p.amount,
            })),
          }),
        );
      }
      setReceiptSnapshot({ items: snapshot.items, totals: snapshot.totals, docNum: res.document_number });
      setLastDocNum(res.document_number);
      setCartNote('');
      pos.setInvoiceDiscountPct(0);
      pos.clearCart();
      setSelectedCartItemId(null);
      setModal('receipt');
      toast.success(`✅ تم حفظ الفاتورة ${res.document_number ?? ''}`);
      return { ok: true, docNumber: res.document_number };

    } catch (err: any) {
      const msg = err?.errors?.lines?.[0] ?? err?.message ?? 'فشل حفظ الفاتورة';
      toast.error(String(msg));
      return { ok: false, message: String(msg) };
    }
  }, [pos, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency, defaultTreasury, cartNote, settings.defaultDocTypeCode]);

  // ── Quick Items ────────────────────────────────────────────────────────────
  const toggleQuickItem = useCallback((variant: ProductVariant) => {
    setQuickItems(prev => {
      const exists = prev.find(q => q.variantId === variant.id);
      if (exists) return prev.filter(q => q.variantId !== variant.id);
      return [...prev, {
        variantId: variant.id,
        name:      variant.product?.name ?? '',
        priceHt:   variant.default_selling_price_ht,
        tvaRate:   variant.tva?.rate ?? 19,
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
        sessionInvoices={currentSession?.invoices_count ?? 0}
        sessionSales={currentSession?.net_sales ?? 0}
        heldCount={pos.heldCarts.length}
        avgMargin={avgMargin}
        isEmpty={isEmpty}
        isFullscreen={fullscreen}
        onHeld={() => setModal('held')}
        onNewSale={() => { if (isEmpty) { pos.clearCart(); } else { pos.holdCart(); } }}
        onManual={() => setModal('manual')}
        onReceipt={() => {
          if (!isEmpty) {
            setReceiptSnapshot({ items: [...pos.items], totals: { ...pos.totals } });
            setModal('receipt');
          }
        }}
        onSession={() => setModal(m => m === 'session' ? 'none' : 'session')}
        onFullscreen={toggleFullscreen}
        onKbHelp={() => setModal('kbhelp')}
        onKioskMode={() => navigate('/pos/kiosk')}
        onSettings={() => setShowSettings(true)}
        showQuickbar={showQuickbar}
        onToggleQuickbar={() => setShowQuickbar(s => !s)}
        items={pos.items}
        totals={pos.totals}
        totalTtcFinal={adjustedTotalTtcFinal}
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
            loading={loadingAll} hasMore={hasMore} onLoadMore={() => setPage(p => p + 1)}
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
          onSell={() => setModal('payment')} onClear={clearCartSafe} onHeld={() => setModal('held')}
          totalTtcFinal={adjustedTotalTtcFinal}
          invoiceDiscountPct={pos.invoiceDiscountPct}
          onInvoiceDiscountChange={pos.setInvoiceDiscountPct}
          invoiceDiscountAmount={invoiceDiscountAmount}
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

      {modal === 'receipt' && receiptSnapshot && (
        <ProfessionalReceipt
          items={receiptSnapshot.items} totals={receiptSnapshot.totals}
          client={pos.client} docNumber={receiptSnapshot.docNum ?? lastDocNum}
          settings={settings}
          onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
          onPrint={() => window.print()}
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

      {modal === 'session' && currentSession && (
        <SessionStatsModal
          session={currentSession}
          onClose={() => setModal('none')}
          onEndSession={() => { setModal('none'); setShowCloseSession(true); }}
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