// ════════════════════════════════════════════════════════════════════════════
// pages/pos/POSPage.tsx
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Toaster, toast }    from 'sonner';
import { usePOS }             from '@/pos/hooks/usePOS';
import { useCartStore }       from '@/pos/utils/useCartStore';
import { useCashClient }  from '@/lib/api/endpoints/parties';
import {
  usePOSAggregatedLookups,
  useFamilies,
} from '@/lib/api/endpoints/lookups';
import { productsApi }        from '@/lib/api/endpoints/products';
import { settingsApi }        from '@/lib/api/endpoints/settings';
import { apiGet }             from '@/lib/api/core/client';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi }       from '@/lib/api/endpoints/documents';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';

import {
  calcFiscalStamp, htToTtc, ttcToHt, calcMargin, calcWeightedAverageMargin,
} from '@/pos/utils/calculations';
import {
  productToVariant, makeFakeVariant,
} from '@/pos/utils/posHelpers';
import { isVariantOutOfStock } from '@/pos/utils/posHelpers';
import type { ActiveModal, QuickItem, ViewMode, GridSize, SortMode } from '@/pos/utils/posHelpers';
import type { PaginatedResponse } from '@/lib/api/core/types';
import { nanoid }   from 'nanoid';
import type {
  Product, ProductVariant, CartItem,
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
import ProfessionalCart, { type ProfessionalCartHandle } from '@/pos/components/ProfessionalCart';
import PanelResizer             from '@/pos/components/PanelResizer';
import {
  useCurrentPosSession,
  useOpenSession,
  useCloseSession,
  useIncrementSession,
  buildIncrementInput,
} from '@/lib/api/endpoints/posSession';

const ProfessionalPaymentModal = React.lazy(() => import('@/pos/components/ProfessionalPaymentModal'));
const HeldCartsModal           = React.lazy(() => import('@/pos/components/HeldCartsModal'));
const ProfessionalReceipt      = React.lazy(() => import('@/pos/components/ProfessionalReceipt'));
const ManualProductModal       = React.lazy(() => import('@/pos/components/ManualProductModal'));
const QtySetModal              = React.lazy(() => import('@/pos/components/QtySetModal'));
const OpenSessionModal         = React.lazy(() => import('@/pos/components/OpenSessionModal'));
const CloseSessionModal        = React.lazy(() => import('@/pos/components/CloseSessionModal'));
const SessionStatsModal        = React.lazy(() => import('@/pos/components/SessionStatsModal'));
const ReturnsModal             = React.lazy(() => import('@/pos/components/ReturnsModal'));
const SessionInvoicesModal     = React.lazy(() => import('@/pos/components/SessionInvoicesModal'));
const KeyboardHelpModal        = React.lazy(() => import('@/pos/components/KeyboardHelpModal'));
const POSSettingsModal          = React.lazy(() => import('@/pos/components/POSSettingsModal'));
const ManagerPinModal           = React.lazy(() => import('@/pos/components/ManagerPinModal'));
import { usePOSSettings, checkDiscountAllowed } from '@/pos/hooks/usePOSSettings';
import { useKbOverrides } from '@/pos/hooks/useKeyboardMap';
import { useKeyboardShortcuts } from '@/pos/hooks/useKeyboardShortcuts';
import { usePrintSettings }     from '@/pos/hooks/usePrintSettings';
import { printReceiptDirect }   from '@/pos/utils/printUtils';
import { openCashDrawerViaWebUSB } from '@/pos/utils/printService';
import { playAddSound, playSaleSound } from '@/pos/utils/posSounds';
import type { SoundPresetId } from '@/pos/utils/posSounds';
import { renderPreviewToHtml }  from '@/pages/settings/print-settings/runtime/renderPreviewToHtml';
import { mapCompany }           from '@/pages/settings/print-settings/runtime/PrintRuntimeAdapter';
import { isWebUsbSupported, printThermalViaWebUSBFromTemplate } from '@/pos/utils/printService';
import { useQueryClient }       from '@tanstack/react-query';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { CompanyPreviewData } from '@/pages/settings/print-settings/types';

const QUICK_ITEMS_KEY = (slug: string) => `pos-quick-items-${slug}`;
const RECENT_PRODUCTS_KEY = (slug: string) => `pos-recent-products-${slug}`;

function compoundDiscountPct(linePct: number, invoicePct: number): number {
  if (invoicePct <= 0) return linePct;
  const compounded = 100 - (100 - linePct) * (100 - invoicePct) / 100;
  return Math.min(100, compounded);
}

function POSPage() {
  const queryClient = useQueryClient();
  const slug        = useActiveSlug();
  const { settings, setSettings, resetSettings } = usePOSSettings(slug);

  // ── Aggregated lookups — single HTTP for all lookup tables + settings ──
  const { data: posLookups } = usePOSAggregatedLookups();
  const fiscalStampVal = posLookups?.settings?.fiscal_stamp_enabled;
  const systemFiscalStampEnabled = fiscalStampVal === undefined
    ? true
    : (fiscalStampVal === true || fiscalStampVal === 1 || fiscalStampVal === '1'
      || String(fiscalStampVal).toLowerCase() === 'true');
  const pos         = usePOS(systemFiscalStampEnabled);
  const posRef      = useRef(pos);
  posRef.current    = pos;
  const fiscalYear  = useSelectedFiscalYear();
  const company     = useActiveCompany();
  const navigate    = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const openSessionMut   = useOpenSession();
  const closeSessionMut  = useCloseSession(currentSession?.id ?? null);
  const incrementMut     = useIncrementSession(currentSession?.id ?? null);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [showSessionInvoices, setShowSessionInvoices] = useState(false);
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

  const handleCloseSession = async (data: {
    closing_cash_counted: number; closing_note?: string;
  }) => {
    try {
      await closeSessionMut.mutateAsync(data);
      setShowCloseSession(false);
      safeToast.success('تم إغلاق الجلسة بنجاح');
    } catch (e: unknown) {
      safeToast.error(getErrorMessage(e, 'فشل إغلاق الجلسة'));
    }
  };

  // ── Toast proxy: no-op when disabled ──────────────────────────────────
  const safeToast = useMemo(() => {
    if (settings.toastEnabled) return toast;
    return new Proxy(toast, {
      get: (_target, prop) => {
        if (prop === 'dismiss' || prop === 'remove') return () => {};
        return () => '';
      },
    });
  }, [settings.toastEnabled]);
  const clearCartConfirm = useConfirm();
  const deleteConfirm    = useConfirm();

  // Read keyboard overrides ONCE (via useKbOverrides which caches + re-reads only on change),
  // then pass to useKeyboardShortcuts hook to avoid 25× localStorage.read per keypress.
  const kbOverrides    = useKbOverrides(slug);
  const kbOverridesRef = useRef(kbOverrides);
  kbOverridesRef.current = kbOverrides;

  // ═════════════════════════════════════════════════════════════════════
  // Clear cart on company switch — prevents stale product_id values from
  // a different company being submitted to the new company's API scope.
  // (Backend validateTenantRelationsMany in CommercialDocumentService
  //  rejects cross-company product IDs with 422.)
  // ═════════════════════════════════════════════════════════════════════
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (prevSlugRef.current && prevSlugRef.current !== slug) {
      posRef.current.clearCart();
    }
    prevSlugRef.current = slug;
  }, [slug]);

  // ── Default client: "Client Cash" on mount / after clearCart ──────
  const { data: cashClient } = useCashClient();
  useEffect(() => {
    if (cashClient && !posRef.current.client) {
      pos.setClient(cashClient);
    }
  }, [cashClient, pos.client, pos.setClient]);

  const [view,       setView]       = useState<ViewMode>(settings.defaultView);
  const [gridSize,   setGridSize]   = useState<GridSize>(settings.defaultGridSize);
  useEffect(() => { setSettings({ defaultView: view }); }, [view, setSettings]);
  useEffect(() => { setSettings({ defaultGridSize: gridSize }); }, [gridSize, setSettings]);
  const [mobTab,     setMobTab]     = useState<'products' | 'cart'>('products');
  const [fullscreen, setFullscreen] = useState(false);
  const [cartWidth, setCartWidth]   = useState(settings.cartWidth);
  const cartWidthRef = useRef(cartWidth);
  cartWidthRef.current = cartWidth;
  const isDragging   = useRef(false);
  const posLayoutRef = useRef<HTMLDivElement>(null);

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (posLayoutRef.current) {
      const max = posLayoutRef.current.getBoundingClientRect().width * 0.88;
      const clamped = Math.max(280, Math.min(cartWidth, max));
      if (clamped !== cartWidth) setCartWidth(clamped);
      posLayoutRef.current.style.setProperty('--cart-width', `${clamped}px`);
    }
  }, [cartWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !posLayoutRef.current) return;
      const rect = posLayoutRef.current.getBoundingClientRect();
      const dir = getComputedStyle(posLayoutRef.current).direction;
      const width = dir === 'rtl' ? e.clientX - rect.left : rect.right - e.clientX;
      const max = rect.width * 0.88;
      const clamped = Math.max(280, Math.min(max, width));
      setCartWidth(clamped);
    };
    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSettings({ cartWidth: cartWidthRef.current });
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSettings]);
  const [showFilter, setShowFilter] = useState(false);
  const [modal, setModal] = useState<ActiveModal>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [pinModal, setPinModal] = useState<{
    requestedDiscount: number;
    reason: 'max_exceeded' | 'pin_required';
    onSuccess: () => void;
  } | null>(null);
  const [cartNote,   setCartNote]   = useState('');
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<number | null>(null);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);

  const [receiptSnapshot, setReceiptSnapshot] = useState<POSSaleSnapshot | null>(null);
  const receiptSnapshotRef = useRef<POSSaleSnapshot | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingDocStatus, setEditingDocStatus] = useState<string | null>(null);
  const [editingDocumentDate, setEditingDocumentDate] = useState<string | null>(null);
  const [editingDocumentNumber, setEditingDocumentNumber] = useState<string | null>(null);
  const editingPrevBalanceRef = useRef<number | undefined>(undefined);
  const editingDocMetaRef = useRef<{
    dueDate?:   string | null;
    typeCode?:  string | null;
    currencyId?: number | null;
  }>(null);


  const receiptSource = useMemo((): PipelineSource | null => {
    if (!receiptSnapshot) return null;
    return { type: 'pos-snapshot', snapshot: receiptSnapshot };
  }, [receiptSnapshot]);

  const lastPaymentRef = useRef<{
    paid: number;
    payments: Array<{ paymentModeId: number; amount: number }>;
    dueDate?: string;
  }>();
  const [quickItems, setQuickItems] = useState<QuickItem[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(QUICK_ITEMS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showQuickbar, setShowQuickbar] = useState(settings.showQuickbarOnStart);

  const [recentProducts, setRecentProducts] = useState<ProductVariant[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(RECENT_PRODUCTS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

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

  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(RECENT_PRODUCTS_KEY(slug), JSON.stringify(recentProducts)); }
    catch { /* storage full */ }
  }, [recentProducts, slug]);

  // ── Last sale badge: track variant IDs from the most recent completed sale ──
  const [lastSaleIds, setLastSaleIds] = useState<Set<number>>(() => {
    if (!slug) return new Set();
    try {
      const stored = localStorage.getItem(`pos:lastSale:${slug}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const lastSaleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!slug || lastSaleIds.size === 0) return;
    try { localStorage.setItem(`pos:lastSale:${slug}`, JSON.stringify([...lastSaleIds])); } catch {}
  }, [lastSaleIds, slug]);

  // ── Search & Filters ──────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortMode>('name');
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterPerPage, setFilterPerPage] = useState(2000);

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [scannedId, setScannedId] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const searchRef    = useRef<HTMLInputElement>(null);
  const cartRef      = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cartApiRef   = useRef<ProfessionalCartHandle>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();
  // ── Auto-focus search + select last cart row on page mount / invoice reopen ──
  useEffect(() => {
    if (!currentSession?.id) return;
    const t = setTimeout(() => {
      searchRef.current?.focus();
      const items = useCartStore.getState().items;
      const last = items[items.length - 1];
      if (last) setSelectedCartItemId(last.id);
    }, 100);
    return () => clearTimeout(t);
  }, [currentSession?.id]);

  const isQtyCmd = /^\*\d*$/.test(pos.searchQuery.trim());
  const queryFamilyId   = pos.selectedCategory ?? undefined;

  // ── Focus search whenever any modal closes ──
  const prevModalRef = useRef(modal);
  useEffect(() => {
    if (prevModalRef.current !== 'none' && modal === 'none') {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
    prevModalRef.current = modal;
  }, [modal]);

  // ═══════════════════════════════════════════════════════════════════════
  // البحث الفوري (client-side) — بدون debounce وبدون رحلة شبكة لكل ضغطة مفتاح
  // ═══════════════════════════════════════════════════════════════════════
  // سابقاً: كان نص البحث يُرسل للسيرفر (بعد تأخير 300ms) وكل استعلام
  // منتجات جديد يعيد جلب البيانات، فيصير "وميض" (فراغ/تحميل ثم نتائج)
  // مع كل كلمة تُكتب. بما أننا أصلاً نجيب الكتالوج كامل (per_page 99999)
  // حسب التصنيف، ما فيه داعي إطلاقاً لإعادة الطلب من السيرفر عند الكتابة:
  // نجيب بيانات التصنيف الحالي مرة وحدة (تبقى بالكاش)، والفلترة بالاسم/
  // الباركود تصير محلياً بالكامل بـ filteredVariants — فورية 100% (فلترة
  // مصفوفة بالمتصفح أسرع بمراحل من أي طلب شبكة، حتى لو كان أسرع طلب ممكن).
  const rawQuery = pos.searchQuery.trim();

  // نُجمّد نص البحث المستخدم بالفلترة أثناء وضع أمر الكمية (*NNN) حتى تبقى
  // نتائج البحث كما هي بدون أي تغيير أثناء كتابة الكمية (نفس فكرة القفل
  // القديمة، لكن مطبَّقة على الفلترة المحلية مباشرة بدل مفتاح استعلام السيرفر).
  const prevSearchRef = useRef('');
  if (!isQtyCmd) prevSearchRef.current = rawQuery;
  const displaySearch = isQtyCmd ? prevSearchRef.current : rawQuery;

  // عند اكتمال أمر الكمية (*NN + Enter)، نرجّع نص البحث لنفس ما كان قبل
  // "*" (مو نمسحه لفراغ) — عشان القائمة تضل نفس نتائج البحث. لكن هذا
  // "تغيير" بمربع البحث لازم ما يُعامَل كبحث جديد (اللي أصلاً يصفّر
  // highlightedIndex) — هذا العلم يخلي الـ effect يعرف يتخطى التصفير
  // مرة وحدة بس بعد هالاسترجاع تحديداً.
  const skipNextSearchResetRef = useRef(false);

  // سلوك Escape موحّد بمكان وحيد: أثناء وضع أمر الكمية (*NN) نرجّع نص
  // البحث السابق (بدل مسحه بالكامل) — وإلا لو ضغط المستخدم Escape بالغلط
  // وهو يكتب *56 بنية إلغاء الرقم بس، كان يفقد نتائج بحثه "علبة" كمان.
  // خارج وضع أمر الكمية، السلوك زي ما كان (مسح كامل). مُعرَّفة هنا (مبكراً
  // بالمكوّن) عمداً لأنها تُستخدم لاحقاً داخل معالج اختصارات لوحة
  // المفاتيح (useEffect أدناه) وداخل ProductSearchBar.
  const handleSearchEscape = useCallback(() => {
    if (isQtyCmd) {
      skipNextSearchResetRef.current = true;
      posRef.current.setSearch(prevSearchRef.current);
    } else {
      posRef.current.setSearch('');
    }
  }, [isQtyCmd]);

  // ── Products query (كل منتجات التصنيف الحالي — بدون نص البحث إطلاقاً) ───
  const { data: productsRaw, isLoading: loadingAll } = useQuery({
    queryKey: [slug, 'products', 'pos', { cat: pos.selectedCategory, perPage: filterPerPage }],
    queryFn: () => productsApi.list({
      per_page:  filterPerPage,
      include:   'tva,unit,family,prices.priceLevel,quantityDiscounts',
      filter:    { active: 1, ...(queryFamilyId ? { family_id: queryFamilyId } : {}) },
    }),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
  });

  const rawProducts = useMemo(() => (
    Array.isArray(productsRaw)
      ? productsRaw
      : (productsRaw as PaginatedResponse<Product>)?.data ?? []
  ), [productsRaw]);

  // ── Lookups from aggregated hook (called at top) ────────────────────────
  const warehouses       = posLookups?.warehouses ?? [];
  const documentTypes    = posLookups?.documentTypes ?? [];
  const priceLevelsList  = posLookups?.priceLevels ?? [];
  const currencies       = posLookups?.currencies ?? [];
  const treasuryAccounts = posLookups?.treasuryAccounts ?? [];
  const fiscalYears      = posLookups?.fiscalYears ?? [];
  const customers        = posLookups?.customers ?? [];
  const paymentModes     = posLookups?.paymentModes ?? [];

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
  const WAREHOUSE_CACHE_KEY = `pos-warehouse-id-${slug}`;
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
  }, [cachedWarehouseId, realWarehouseId]);

  // ── Company-level allow_negative_stock (from aggregated lookup) ──────────────
  const negSettingVal = posLookups?.settings?.allow_negative_stock;
  const systemAllowNeg = negSettingVal === undefined
    ? false
    : (negSettingVal === true || negSettingVal === 1 || negSettingVal === '1'
      || String(negSettingVal).toLowerCase() === 'true');
  const allowNegSetting = systemAllowNeg;

  // ── Toggle handlers for POS Settings modal (sync with system settings DB) ──
  const toggleFiscalStamp = useCallback(async (val: boolean) => {
    await settingsApi.update({ fiscal_stamp_enabled: val });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  const toggleAllowNegative = useCallback(async (val: boolean) => {
    await settingsApi.update({ allow_negative_stock: val });
    queryClient.invalidateQueries({ queryKey: tenantKeys.lookups.posAggregated(slug ?? '') });
  }, [slug, queryClient]);

  // ── Stock (حسب التصنيف فقط — بدون نص البحث، لنفس سبب استعلام المنتجات) ──
  const { data: stockData = {}, isLoading: stockLoading } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-stock', effectiveWarehouseId, fiscalYear?.id, { family_id: queryFamilyId }],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   effectiveWarehouseId,
        fiscal_year_id: fiscalYear?.id,
        ...(queryFamilyId ? { family_id: queryFamilyId } : {}),
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!effectiveWarehouseId,
    staleTime: 10_000,
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

  const familyCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of allVariants) {
      const fid = v.product?.family?.id;
      if (fid != null) map.set(fid, (map.get(fid) ?? 0) + 1);
    }
    return map;
  }, [allVariants]);

  // مفصولة عن الفرز عمداً: تغيير sortBy لحاله (بدون تغيير أي فلتر) كان
  // يعيد تنفيذ كل سلسلة الفلترة (تصنيف + بحث + مخزون + سعر) من الصفر رغم
  // إنها ما تغيّرت أصلاً — الآن فقط الفرز يُعاد حسابه بهذي الحالة.
  const filteredOnly = useMemo(() => {
    let list = allVariants;
    if (pos.selectedCategory !== null) list = list.filter(v => v.product?.family?.id === pos.selectedCategory);
    // فلترة البحث النصي محلياً — فورية، بدون أي انتظار شبكة (راجع التعليق
    // فوق استعلام المنتجات لسبب نقل البحث بالكامل للعميل). نطابق الاسم
    // والباركود والرمز (ref)، وهو نفس نطاق الحقول اللي كان السيرفر يبحث
    // فيها سابقاً — يستاهل تأكيد إن هذا يطابق منطق البحث الخلفي بالضبط.
    if (!isQtyCmd && displaySearch.length >= 1) {
      const q = displaySearch.toLowerCase();
      list = list.filter(v =>
        (v.product?.name ?? '').toLowerCase().includes(q) ||
        (v.barcode ?? '').toLowerCase().includes(q) ||
        (v.ref ?? '').toLowerCase().includes(q) ||
        (v.product?.ref ?? '').toLowerCase().includes(q),
      );
    }
    if (settings.hideOutOfStock && !allowNegSetting) list = list.filter(v => !v.manages_stock || v.current_stock === undefined || v.current_stock > 0);
    if (filterInStock)  list = list.filter(v => !v.manages_stock || v.current_stock === undefined || v.current_stock > 0);
    if (filterLowStock) list = list.filter(v => v.manages_stock && (v.current_stock ?? 0) <= (v.min_stock_alert ?? 0) && (v.current_stock ?? 0) > 0);
    if (filterMinPrice) list = list.filter(v => v.default_selling_price_ht >= parseFloat(filterMinPrice));
    if (filterMaxPrice) list = list.filter(v => v.default_selling_price_ht <= parseFloat(filterMaxPrice));
    return list;
  }, [allVariants, pos.selectedCategory, displaySearch, isQtyCmd, settings.hideOutOfStock, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice, allowNegSetting]);

  const filteredVariants = useMemo(() => {
    return [...filteredOnly].sort((a, b) => {
      if (sortBy === 'price_asc')  return a.default_selling_price_ht - b.default_selling_price_ht;
      if (sortBy === 'price_desc') return b.default_selling_price_ht - a.default_selling_price_ht;
      if (sortBy === 'stock')      return (b.current_stock ?? 0) - (a.current_stock ?? 0);
      if (sortBy === 'family')     return (a.product?.family?.name ?? '').localeCompare(b.product?.family?.name ?? '', 'ar');
      return (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ar');
    });
  }, [filteredOnly, sortBy]);

  useEffect(() => {
    if (isQtyCmd) return;
    if (skipNextSearchResetRef.current) {
      // هذا التغيير بـ pos.searchQuery جا من استرجاع النص بعد أمر كمية
      // (*NN)، مو من كتابة بحث جديد — نحافظ على موضع التحديد الحالي
      // (clamp فقط)، ما نصفّره لـ 0.
      skipNextSearchResetRef.current = false;
      setHighlightedIndex(prev => Math.min(prev, filteredVariants.length - 1));
      return;
    }
    if (pos.searchQuery) { setHighlightedIndex(0); return; }
    setHighlightedIndex(prev => Math.min(prev, filteredVariants.length - 1));
  }, [filteredVariants.length, pos.searchQuery, sortBy, isQtyCmd]);

  const isEmpty = pos.items.length === 0;

  const lastClearedSnapshotRef = useRef<{
    items: CartItem[];
    client: Party | null;
    note: string;
    invoiceDiscountPct: number;
  } | null>(null);
  const [canUndoClear, setCanUndoClear] = useState(false);
  const [undoClearSecondsLeft, setUndoClearSecondsLeft] = useState(0);
  const undoClearTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const undoClearIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const handleClearCart = useCallback(async (opts?: { skipConfirm?: boolean }) => {
    if (isEmpty) return;
    if (settings.confirmOnClear && !opts?.skipConfirm) {
      if (!await clearCartConfirm.confirm('هل تريد مسح كل الأصناف من السلة؟')) return;
    }

    lastClearedSnapshotRef.current = {
      items:               [...posRef.current.items],
      client:              posRef.current.client,
      note:                cartNote,
      invoiceDiscountPct:  posRef.current.invoiceDiscountPct,
    };
    setCanUndoClear(true);
    const UNDO_SECONDS = 20;
    setUndoClearSecondsLeft(UNDO_SECONDS);
    clearTimeout(undoClearTimerRef.current);
    clearInterval(undoClearIntervalRef.current);
    undoClearIntervalRef.current = setInterval(() => {
      setUndoClearSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    undoClearTimerRef.current = setTimeout(() => {
      lastClearedSnapshotRef.current = null;
      setCanUndoClear(false);
      setUndoClearSecondsLeft(0);
      clearInterval(undoClearIntervalRef.current);
    }, UNDO_SECONDS * 1000);

    posRef.current.clearCart();
    posRef.current.setInvoiceDiscountPct(0);
    setCartNote('');
    setEditingDocumentId(null);
    setEditingDocStatus(null);
    setEditingDocumentDate(null);
    setEditingDocumentNumber(null);
    editingPrevBalanceRef.current = undefined;
    editingDocMetaRef.current = null;
  }, [settings.confirmOnClear, isEmpty, cartNote, clearCartConfirm]);

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
    setUndoClearSecondsLeft(0);
    clearTimeout(undoClearTimerRef.current);
    clearInterval(undoClearIntervalRef.current);
    safeToast.success('تم استرجاع السلة');
  }, [safeToast]);

  const handleOpenDrawer = useCallback(async () => {
    const res = await openCashDrawerViaWebUSB();
    if (!res.ok) safeToast.error(res.message ?? 'تعذّر فتح الدرج');
  }, [safeToast]);

  const handleOpenInvoice = useCallback(async (docId: number) => {
    const cartState = useCartStore.getState();
    if (!isEmpty && cartState._isDirty) posRef.current.holdCart();
    try {
      const doc = await apiGet<CommercialDocument>(`/documents/${docId}`, {
        include: 'party,documentType,lines,lines.product,lines.product_variant,payments,payments.payment_mode',
      });
      if (!doc?.lines?.length) {
        safeToast.error('لا توجد أصناف في هذه الفاتورة');
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
          selling_price_ttc:   htToTtc(Number(line.unit_price_ht), Number(line.tva_rate)),
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
      useCartStore.setState({
        items,
        client: doc.party ?? null,
        payments,
        notes: doc.notes ?? '',
      });
      useCartStore.getState().markClean();
      setEditingDocumentId(docId);
      setEditingDocStatus(doc.status);
      setEditingDocumentDate(doc.document_date ?? null);
      setEditingDocumentNumber(doc.document_number ?? null);
      editingPrevBalanceRef.current = doc.balance_data?.previous_balance;
      editingDocMetaRef.current = {
        dueDate:   doc.due_date ?? null,
        typeCode:  doc.documentType?.code ?? null,
        currencyId: doc.currency_id ?? null,
      };
      setCartNote(doc.notes ?? '');
      setShowSessionInvoices(false);
      safeToast.success(`تم فتح الفاتورة ${doc.document_number}`);
      // Select last cart row + focus search so user can immediately type *<digits> Enter
      requestAnimationFrame(() => {
        searchRef.current?.focus();
        const loaded = useCartStore.getState().items;
        const last = loaded[loaded.length - 1];
        if (last) setSelectedCartItemId(last.id);
      });
    } catch {
      safeToast.error('فشل تحميل الفاتورة');
    }
  }, [isEmpty, safeToast]);

  // ── Auto-open document from URL param ?edit=docId ──────────────────────────
  const openedFromUrlRef = useRef(false);
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !openedFromUrlRef.current) {
      openedFromUrlRef.current = true;
      const id = Number(editId);
      if (id > 0) {
        handleOpenInvoice(id).then(() => {
          setSearchParams({}, { replace: true });
        });
      }
    }
  }, [searchParams, handleOpenInvoice, setSearchParams]);

  // ── Invoice discount ───────────────────────────────────────────────────────
  // ✅ pos.totals (من calcTotals) تُطبِّق الخصم بالفعل ومرة واحدة فقط
  const invoiceDiscountAmount = pos.totals.invoice_discount_amount ?? 0;

  const fiscalStampAmount = systemFiscalStampEnabled ? calcFiscalStamp(pos.totals.total_ttc) : 0;
  const adjustedTotalTtcFinal = pos.totals.total_ttc + fiscalStampAmount;

  const existingPaymentsSum = useMemo(
    () => pos.payments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [pos.payments],
  );
  const remainingToPay = Math.max(0, adjustedTotalTtcFinal - existingPaymentsSum);

  const avgMargin = useMemo(() => {
    if (!pos.items.length) return 0;
    const costMap = new Map(allVariants.map(v => [v.id, v.average_cost_price ?? 0]));
    const marginItems = pos.items.flatMap(i => {
      const cost = costMap.get(i.variant_id) ?? 0;
      if (cost <= 0) return [];
      return [{
        sellingHt: i.unit_price_ht * i.quantity,
        costHt: cost * i.quantity,
      }];
    });
    return calcWeightedAverageMargin(marginItems);
  }, [pos.items, allVariants]);

  const filterActive = filterInStock || filterLowStock || !!filterMinPrice || !!filterMaxPrice;

  // ── Barcode Scanner ────────────────────────────────────────────────────────
  const barcodeRef = useRef('');
  useEffect(() => { barcodeRef.current = barcodeBuffer; }, [barcodeBuffer]);

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
  const handleQuickCashRef = useRef<() => void>(() => {});
  useKeyboardShortcuts(
    { posRef, overridesRef: kbOverridesRef, searchRef, cartRef, cartApiRef },
    { isEmpty, modal, showFilter, showSessionInvoices, showSettings, showCloseSession, pinModal, selectedCartItemId, families },
    { setModal, setFilter: setShowFilter, setShowSessionInvoices, setShowSettings, setShowCloseSession, setPinModal, setSelectedCartItemId, setView, setGridSize, setReceiptSnapshot },
    { toggleFullscreen, handleClearCart, handleOpenDrawer, handleUndoClear, handleToggleQuickbar, handleSearchEscape, deleteConfirm, handleQuickCash: () => handleQuickCashRef.current() },
  );

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
      const priceEntry = variant?.prices?.find(pr => pr.price_level_id === plId);
      if (priceEntry?.price)               pos.updatePrice(item.id, priceEntry.price);
      else if (pl.discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - pl.discount_percent / 100));
      }
    });
  }, [priceLevelsList, allVariants, pos]);

  // ── Print Settings ──────────────────────────────────────────────────────────
  const { template, enabled: isPrintEnabled, copies: dbCopies, paperWidth }
    = usePrintSettings('POS');

  const copies = settings.printCopies || dbCopies;

  // Template with POS receipt overrides applied
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

  const handlePrintDirect = useCallback(async (
    snap: POSSaleSnapshot,
    opts?: { silent?: boolean },
  ) => {
    if (!posTemplate) { safeToast.error('لا يوجد قالب طاعة'); return; }
    try {
      const resolvedDocNum = snap.docNumber;
      const isThermalPaper = posTemplate.paper_size === '80mm' || posTemplate.paper_size === '58mm';

      // Silent mode (quick cash): try WebUSB thermal only, no browser fallback
      if (opts?.silent) {
        if (!isWebUsbSupported()) {
          safeToast.error('الطباعة المباشرة تتطلب متصفح يدعم WebUSB');
          return;
        }
        if (!resolvedDocNum) {
          safeToast.error('رقم الفاتورة غير متوفر للطباعة المباشرة');
          return;
        }
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalViaWebUSBFromTemplate(posTemplate, data, resolvedDocNum);
        if (result.ok) {
          safeToast.success('✅ تمت الطباعة');
        } else {
          safeToast.error(`خطأ في الطباعة: ${result.message}`);
        }
        return;
      }

      const html = renderPreviewToHtml({
        template: posTemplate,
        company: companyData,
        source: { type: 'pos-snapshot', snapshot: snap },
      });

      if (settings.printMode === 'thermal' && resolvedDocNum && isThermalPaper) {
        const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
        const result = await printThermalViaWebUSBFromTemplate(posTemplate, data, resolvedDocNum);
        if (result.ok) {
          safeToast.success('✅ تمت الطباعة الحرارية');
        } else {
          safeToast.error(`خطأ في الطباعة الحرارية: ${result.message}`);
          await printReceiptDirect({
            html, paperWidth, copies: copies ?? 1,
            onError: (e) => safeToast.error(`خطأ في طباعة المتصفح: ${e.message}`),
          });
        }
      } else {
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
  }, [posTemplate, safeToast, companyData, settings.printMode, paperWidth, copies]);

  // ── Complete Sale ──────────────────────────────────────────────────────────
const handleCompleteSale = useCallback(async (params: {
    amountPaid:   number;
    dueDate?:     string;
    note?:        string;
    docTypeCode?: string;
    payments?:    Array<{ id?: number; paymentModeId: number; amount: number; treasuryAccountId?: number | null; reference?: string | null }>;
    currencyId?:  number | null;
    skipPreview?: boolean;
  }) => {
    const typeCode = params.docTypeCode ?? settings.defaultDocTypeCode;
    const invType  = documentTypes?.find(t => t.code === typeCode)
                  ?? documentTypes?.find(t => t.code === 'POS')
                  ?? documentTypes?.find(t => t.code === 'FV')
                  ?? documentTypes?.find(t => t.code === 'BL')
                  ?? documentTypes?.[0];

    if (!invType)          return { ok: false, message: 'لم يُعثَر على نوع مستند' };
    if (!defaultWarehouse) return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
    if (!fiscalYear)       return { ok: false, message: 'لا توجد سنة مالية نشطة' };

    const currentClient  = posRef.current.client;
    const currentItems   = posRef.current.items;
    const currentTotals  = posRef.current.totals;
    const currentInvDisc = posRef.current.invoiceDiscountPct;

    try {
      const snapshot = { items: [...currentItems], totals: { ...currentTotals } };

      const existingPaymentsMap = new Map(
        (pos.payments ?? []).map(p => [p.id, p.payment_date])
      );
      const today = new Date().toISOString().slice(0, 10);
      const apiPayments = (params.payments ?? [])
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
          };
        });

      // ✅ TVA-exempt parties: frontend must match backend override
      const clientIsTvaExempt = currentClient?.is_tva_exempt ?? false;

      const linesPayload = currentItems.map(i => {
        const compoundedDisc = compoundDiscountPct(i.discount_percentage, currentInvDisc);
        return {
          product_id:          i.product_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: Math.min(100, compoundedDisc),
          tva_rate:            clientIsTvaExempt ? 0 : i.tva_rate,
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
        currency_id:    params.currencyId ?? defaultCurrency?.id ?? undefined,
        document_date:  editingDocumentDate ?? new Date().toISOString().slice(0, 10),
        due_date:       params.dueDate ?? null,
        notes:          params.note ?? cartNote ?? null,
      };

      // ✅ نحدّد نوع العملية قبل الإرسال لاستعمالها لاحقاً في شرط incrementMut
      const isEditingExistingDocument = !!editingDocumentId;

      let res;
      if (editingDocumentId) {
        res = await documentsApi.update(editingDocumentId, {
          ...commonPayload,
          lines:    linesPayload,
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

      // ✅ الإصلاح: لا نزيد إحصائيات الجلسة (gross_sales, invoices_count, ...) إلا
      // عند إنشاء فاتورة جديدة فعلاً. عند تعديل فاتورة موجودة سبق احتسابها ضمن
      // نفس الجلسة، استدعاء incrementMut مجدداً كان يُضاعف الأرقام لأن
      // PosSessionController::increment() يستعمل increment() التراكمي بلا
      // إلغاء للمساهمة القديمة أولاً.
      if (currentSession?.id && !isEditingExistingDocument) {
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
      const backendNetToPay   = res?.net_to_pay ?? effectiveTotalTtc;
      const backendPaidAmount = res?.paid_amount ?? totalPaid;
      const invoiceRemaining  = Math.max(0, backendNetToPay - backendPaidAmount);
      const invoiceChange     = Math.max(0, backendPaidAmount - backendNetToPay);
      // SSOT: backend computes balance_data — no more partyBalancesApi.getOne()
      const newBalance = res?.balance_data?.new_balance ?? 0;

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

      const prevBalance = res?.balance_data?.previous_balance ?? editingPrevBalanceRef.current;

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
          total_ht:  res.total_ht  ?? effectiveTotalHt,
          total_tva: res.total_tva ?? effectiveTotalTva,
          total_ttc: res.total_ttc ?? effectiveTotalTtc,
          paid:      backendPaidAmount,
          change:    invoiceChange,
          remaining: invoiceRemaining,
          fiscal_stamp: res.total_stamp ?? snapshot.totals.fiscal_stamp,
        },
        docNumber: res.document_number,
        docDate: new Date().toISOString().slice(0, 10),
        client: currentClient,
        payments: params.payments?.filter(p => p.amount > 0).map(p => ({
          mode: String(p.paymentModeId), amount: p.amount,
        })) ?? [],
        dueDate: params.dueDate,
        prevBalance,
        newBalance,
      };
      setEditingDocumentId(null);
      setEditingDocStatus(null);
      setEditingDocumentDate(null);
      setEditingDocumentNumber(null);
      editingPrevBalanceRef.current = undefined;
      editingDocMetaRef.current = null;
      receiptSnapshotRef.current = fullSnapshot;
      setReceiptSnapshot(fullSnapshot);

      // Track last sold variant IDs for badge display (clear after 5 minutes)
      const soldIds = new Set(pos.items.map(i => i.variant_id));
      if (soldIds.size > 0) {
        setLastSaleIds(soldIds);
        if (lastSaleTimerRef.current) clearTimeout(lastSaleTimerRef.current);
        lastSaleTimerRef.current = setTimeout(() => setLastSaleIds(new Set()), 5 * 60 * 1000);
      }

      setCartNote('');
      posRef.current.setInvoiceDiscountPct(0);
      posRef.current.clearCart();
      setSelectedCartItemId(null);

      // ── Print / Preview decision ─────────────────────────────────────────
      if (params.skipPreview) {
        // Quick cash — use quickCashAction setting
        const action = settings.quickCashAction;
        if (action === 'preview') {
          setModal('receipt');
        } else if (action === 'print') {
          setTimeout(() => {
            const snap = receiptSnapshotRef.current;
            if (snap) handlePrintDirect(snap);
          }, 300);
          setModal('none');
        } else if (action === 'silent') {
          setTimeout(() => {
            const snap = receiptSnapshotRef.current;
            if (snap) handlePrintDirect(snap, { silent: true });
          }, 300);
          setModal('none');
        } else {
          setModal('none');
        }
      } else {
        // Normal sale — use afterSaleAction setting
        const action = settings.afterSaleAction;
        if (action === 'preview') {
          setModal('receipt');
        } else if (action === 'print' && isPrintEnabled && template) {
          setTimeout(() => {
            const snap = receiptSnapshotRef.current;
            if (snap) handlePrintDirect(snap);
          }, 300);
          setModal('none');
        } else {
          setModal('none');
        }
      }

      safeToast.success(`✅ تم حفظ الفاتورة ${res.document_number ?? ''}`);
      if (settings.playSoundOnSale) playSaleSound(settings.soundPreset as SoundPresetId, settings.soundVolume);

      // Haptic feedback on successful sale
      try { navigator.vibrate?.(100); } catch {}

      // Auto-focus search after sale
      setTimeout(() => searchRef.current?.focus(), 200);

      // Auto-open cash drawer if payment includes cash and setting is enabled
      if (settings.openCashDrawer) {
        const hasCash = apiPayments.some(p => {
          const mode = (paymentModes ?? []).find(m => m.id === p.payment_mode_id);
          return mode && /نقدا|نقداً|cash/i.test(mode.name);
        });
        if (hasCash) openCashDrawerViaWebUSB();
      }

      // Auto-close only when no preview is shown (user sees nothing anyway)
      const willShowPreview = params.skipPreview
        ? settings.quickCashAction === 'preview'
        : settings.afterSaleAction === 'preview';
      const willPrint = params.skipPreview
        ? settings.quickCashAction !== 'none'
        : settings.afterSaleAction === 'print';
      if (settings.autoClosePayment && !willShowPreview && willPrint) {
        setTimeout(() => setModal('none'), 1200);
      }

      return { ok: true, docNumber: res.document_number };

    } catch (err: unknown) {
      const parsedErr = err as { errors?: { lines?: string[] }; message?: string };
      const msg = parsedErr.errors?.lines?.[0] ?? parsedErr.message ?? 'فشل حفظ الفاتورة';
      safeToast.error(String(msg));
      return { ok: false, message: String(msg) };
    }
  }, [settings.defaultDocTypeCode, settings.playSoundOnSale, settings.soundPreset, settings.soundVolume, settings.openCashDrawer, settings.autoClosePayment, settings.afterSaleAction, settings.quickCashAction, settings.printCopies, paymentModes, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency?.id, cartNote, editingDocumentId, editingDocumentDate, currentSession?.id, isPrintEnabled, template, safeToast, defaultTreasury?.id, incrementMut, invoiceDiscountAmount, queryClient, slug, handlePrintDirect, pos.payments]);

  // ── Quick Cash (no modal) ────────────────────────────────────────────────
  const handleQuickCash = useCallback(async () => {
    if (pos.isEmpty) return;
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
  }, [pos.isEmpty, pos.totals.total_ttc, paymentModes, settings.defaultPaymentCode, settings.defaultDocTypeCode, handleCompleteSale, safeToast]);
  useEffect(() => { handleQuickCashRef.current = handleQuickCash; }, [handleQuickCash]);

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

  const handleAddItem = useCallback((v: ProductVariant, qty?: number) => {
    posRef.current.addItem(v, qty);
    setRecentProducts(prev => {
      const filtered = prev.filter(p => p.id !== v.id);
      return [v, ...filtered].slice(0, 5);
    });
    // Auto-select + scroll to added item so user can immediately set qty via *<digits> Enter
    const items = useCartStore.getState().items;
    const added = items.find(i => i.variant_id === v.id);
    if (added) setSelectedCartItemId(added.id);
    // Highlight position: always computed against filteredVariants — the array
    // actually rendered on screen at click time (using allVariants here was wrong:
    // its order/membership differs from filteredVariants during search/category
    // filtering, so the highlighted index pointed at an unrelated card, several
    // rows away). This is also the single place that decides stay-vs-advance,
    // so settings.advanceOnAdd applies identically for every add path (click,
    // double-click, Enter) instead of only being handled inside handleEnter.
    const idx = filteredVariants.findIndex(fv => fv.id === v.id);
    if (settings.advanceOnAdd) {
      setHighlightedIndex(idx >= 0 ? (idx + 1 < filteredVariants.length ? idx + 1 : 0) : 0);
    } else if (idx >= 0) {
      setHighlightedIndex(idx);
    }
    safeToast.success(v.product?.name ?? v.variant_name ?? 'تمت الإضافة', {
      id: 'pos-last-added',
      duration: 1500,
    });
    if (settings.playSoundOnAdd) playAddSound(settings.soundPreset as SoundPresetId, settings.soundVolume);
    if (settings.clearSearchOnAdd) posRef.current.setSearch('');
    // Focus search AFTER scrollToItemId's double-RAF cart-row focus finishes
    requestAnimationFrame(() => {
      if (added) cartApiRef.current?.scrollToItemId(added.id);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { searchRef.current?.focus(); searchRef.current?.select(); });
        });
      });
    });
  }, [settings.clearSearchOnAdd, settings.advanceOnAdd, settings.playSoundOnAdd, settings.soundPreset, settings.soundVolume, filteredVariants, safeToast]);

  // ── Barcode scanner — unified with handleAddItem ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag     = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const buf = barcodeRef.current;
      if (e.key === 'Enter' && buf.length >= 4) {
        const variant = allVariants.find(v => v.barcode === buf);
        if (variant && !isVariantOutOfStock(variant, allowNegSetting)) {
          setScannedId(variant.id);
          handleAddItem(variant);
        }
        setBarcodeBuffer('');
        return;
      }
      // Don't accumulate barcode buffer when typing in an input field
      // (e.g. search, modal fields) — avoids swallowing Enter from ProductSearchBar
      if (!inInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setBarcodeBuffer(b => b + e.key);
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(''), 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [allVariants, allowNegSetting, safeToast, handleAddItem]);

  const handleQtyChange = useCallback((variantId: number, qty: number) => {
    const item = pos.items.find(i => i.variant_id === variantId);
    if (item) {
      if (qty <= 0) pos.removeItem(item.id);
      else pos.updateQty(item.id, qty);
    }
  }, [pos.items, pos.removeItem, pos.updateQty]);

  const handleArrowUp = useCallback(() => {
    setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredVariants.length - 1);
  }, [filteredVariants.length]);

  const handleArrowDown = useCallback(() => {
    setHighlightedIndex(prev => prev < filteredVariants.length - 1 ? prev + 1 : 0);
  }, [filteredVariants.length]);

  const handleEnter = useCallback(() => {
    // Qty command: *<digits> on Enter sets qty of selected cart row
    if (selectedCartItemId) {
      const qtyMatch = pos.searchQuery.trim().match(/^\*(\d+)$/);
        if (qtyMatch) {
        const qty = parseInt(qtyMatch[1], 10);
        if (qty > 0) {
          posRef.current.updateQty(selectedCartItemId, qty);
          const itemName = posRef.current.items.find(i => i.id === selectedCartItemId)?.product_name ?? '';
          safeToast.success(`${itemName} — الكمية ${qty}`, { id: 'pos-qty-cmd', duration: 1200 });
          skipNextSearchResetRef.current = true;
          posRef.current.setSearch(prevSearchRef.current);
        } else {
          safeToast.error('الكمية يجب أن تكون أكبر من صفر', { id: 'pos-qty-cmd-err', duration: 1500 });
        }
        return;
      }
    }
    // *<digits> mode but no selected item → nothing
    if (/^\*\d*$/.test(pos.searchQuery.trim())) return;
    // Normal: add highlighted (keyboardNav) or first result
    if (settings.keyboardNav) {
      const v = filteredVariants[highlightedIndex];
      if (v && !isVariantOutOfStock(v, allowNegSetting) && !(v.manages_stock && v.current_stock === undefined && stockPending)) {
        // Stay-vs-advance is now decided entirely inside handleAddItem
        // (based on settings.advanceOnAdd), so it isn't duplicated/raced here.
        handleAddItem(v);
      }
    } else {
      const first = filteredVariants[0];
      if (first && !isVariantOutOfStock(first, allowNegSetting) && !(first.manages_stock && first.current_stock === undefined && stockPending)) {
        handleAddItem(first);
      }
    }
  }, [selectedCartItemId, pos.searchQuery, settings.keyboardNav, safeToast, filteredVariants, highlightedIndex, allowNegSetting, stockPending, handleAddItem]);


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`pos-wrap on ${fullscreen ? 'pos-fullscreen' : ''}`}
      id="p-pos"
      dir="rtl"
    >
      {!sessionLoading && !currentSession && (
        <Suspense fallback={null}>
          <OpenSessionModal
            warehouses={warehouses ?? []}
            fiscalYears={fiscalYears ?? []}
            defaultWarehouseId={defaultWarehouse?.id}
            defaultFiscalYearId={fiscalYear?.id}
            isLoading={openSessionMut.isPending}
            error={sessionError}
            onOpen={handleOpenSession}
          />
        </Suspense>
      )}

      {showCloseSession && currentSession && (
        <Suspense fallback={null}>
          <CloseSessionModal
            session={currentSession}
            isLoading={closeSessionMut.isPending}
            error={closeSessionMut.error?.message ?? null}
            onClose={() => setShowCloseSession(false)}
            onConfirm={handleCloseSession}
          />
        </Suspense>
      )}

      <POSTopBar
        session={currentSession}
        heldCount={pos.heldCarts.length}
        avgMargin={avgMargin}
        isEmpty={isEmpty}
        isFullscreen={fullscreen}
        showQuickbar={showQuickbar}
        totals={pos.totals}
        totalTtcFinal={adjustedTotalTtcFinal}
        slug={slug}
        editingDocumentNumber={editingDocumentId ? editingDocumentNumber : null}
        priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
        onPriceLevelChange={applyPriceLevel}
        onHeld={() => setModal('held')}
        onNewSale={() => isEmpty ? pos.clearCart() : pos.holdCart()}
        onManual={() => setModal('manual')}
        onReturn={() => setModal('returns')}
        onReceipt={() => {
          if (!isEmpty) {
            const snapItems = pos.items.map(i => ({
              name: i.product_name, ref: i.ref, qty: i.quantity,
              unit_price_ht: i.unit_price_ht, unit: i.unit_symbol,
              tva_rate: i.tva_rate / 100, discount_percentage: i.discount_percentage, total_ht: i.total_ht,
            }));
            setReceiptSnapshot({
              items: snapItems,
              totals: { ...pos.totals, paid: 0, change: 0, remaining: pos.totals.total_ttc },
              docNumber: '', docDate: new Date().toISOString().slice(0, 10),
              payments: [],
            });
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
        toastEnabled={settings.toastEnabled}
        onToggleToast={() => setSettings({ toastEnabled: !settings.toastEnabled })}
        clearSearchOnAdd={settings.clearSearchOnAdd}
        onToggleClearSearch={() => setSettings({ clearSearchOnAdd: !settings.clearSearchOnAdd })}
      />


      {showQuickbar && quickItems.length > 0 && (
        <QuickItemsBar
          quickItems={quickItems}
          allVariants={allVariants}
          onAdd={handleAddItem}
          onRemove={variantId => setQuickItems(p => p.filter(q => q.variantId !== variantId))}
          allowNegativeStock={allowNegSetting}
        />
      )}

      {/* {recentProducts.length > 0 && (
        // <div className="pos-recent-bar">
        //   <span className="pos-recent-label"><i className="ti ti-clock-hour-4" /> الأحدث:</span>
        //   {recentProducts.map(v => (
        //     <button
        //       key={v.id}
        //       className="pos-recent-item"
        //       onClick={() => handleAddItem(v)}
        //       title={v.product?.name}
        //     >
        //       {v.product?.name}
        //     </button>
        //   ))}
        // </div>
      )} */}

      <MobileTabs
        activeTab={mobTab} onTab={setMobTab}
        itemsCount={pos.totals.items_count}
        totalTtc={adjustedTotalTtcFinal}
        isEmpty={isEmpty} onSell={() => setModal('payment')}
      />

      <div
        ref={posLayoutRef}
        className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}
      >
        <div className="pos-left">
          <ProductSearchBar
            query={pos.searchQuery} onQuery={pos.setSearch}
            view={view} gridSize={gridSize}
            onView={setView} onGridSize={setGridSize}
            onFilter={() => setShowFilter(s => !s)} filterActive={filterActive}
            inputRef={searchRef} sortBy={sortBy} onSort={setSortBy}
            resultsCount={filteredVariants.length}
            onEnterFirst={handleEnter}
            highlightedIndex={highlightedIndex}
            onArrowUp={handleArrowUp}
            onArrowDown={handleArrowDown}
            onEscape={handleSearchEscape}
            keyboardNavEnabled={settings.keyboardNav}
            slug={slug}
          />
          {showFilter && (
            <FilterPanel
              inStock={filterInStock}   onInStock={setFilterInStock}
              lowStock={filterLowStock} onLowStock={setFilterLowStock}
              minPrice={filterMinPrice} onMinPrice={setFilterMinPrice}
              maxPrice={filterMaxPrice} onMaxPrice={setFilterMaxPrice}
              perPage={filterPerPage} onPerPage={setFilterPerPage}
              onReset={() => { setFilterInStock(false); setFilterLowStock(false); setFilterMinPrice(''); setFilterMaxPrice(''); }}
            />
          )}
          <CategoryTabs families={families} selected={pos.selectedCategory} onSelect={pos.setCategory}
            counts={familyCounts} totalCount={allVariants.length}
          />
          <ProductGrid
            variants={filteredVariants} view={view} gridSize={gridSize}
            loading={loadingAll}
            onAdd={handleAddItem} onAddManual={() => setModal('manual')}
            highlightedIndex={highlightedIndex}
            onHighlightIndexChange={setHighlightedIndex}
            onPin={toggleQuickItem} isPinned={isQuickItem}
            priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
            cartItems={pos.items} allowNegativeStock={allowNegSetting}
            showStock={settings.showStockOnCard}
            priceDisplayMode={settings.priceDisplayMode}
            onQty={handleQtyChange}
            searchQuery={rawQuery}
            scannedId={scannedId}
            lastSaleIds={lastSaleIds}
          />
          <PanelResizer onMouseDown={handleResizerMouseDown} />
        </div>

        {/* ✅ ProfessionalCart مع onDiscountAmount */}
        <ProfessionalCart
          ref={cartApiRef}
          items={pos.items} totals={pos.totals} client={pos.client}
          note={cartNote} selectedItemId={selectedCartItemId}
          onSelectItem={setSelectedCartItemId}
          onQty={pos.updateQty}
          onDiscount={pos.updateDiscount}
          onDiscountAmount={pos.updateDiscountAmount}          // ✅ جديد
          onPrice={pos.updatePrice}
          onRemove={id => { pos.removeItem(id); if (selectedCartItemId === id) setSelectedCartItemId(null); }}
          onSetClient={pos.setClient}
          onNoteChange={setCartNote} onHold={pos.holdCart}
          onSell={() => setModal('payment')} onClear={handleClearCart} onHeld={() => setModal('held')}
          totalTtcFinal={adjustedTotalTtcFinal}
          remainingToPay={remainingToPay}
          invoiceDiscountPct={pos.invoiceDiscountPct}
          onInvoiceDiscountChange={pct => {
            const check = checkDiscountAllowed(pct, settings);
            if (!check.allowed && check.reason === 'max_exceeded') {
              safeToast.error(`الخصم ${pct}% تجاوز الحد الأقصى (${settings.maxDiscountPct}%)`);
              return;
            }
            if (!check.allowed && check.reason === 'pin_required') {
              setPinModal({ requestedDiscount: pct, reason: 'pin_required', onSuccess: () => pos.setInvoiceDiscountPct(pct) });
              return;
            }
            pos.setInvoiceDiscountPct(pct);
          }}
          invoiceDiscountAmount={invoiceDiscountAmount}
          onUndoClear={handleUndoClear}
          canUndoClear={canUndoClear}
          undoClearSecondsLeft={undoClearSecondsLeft}
          clientBalance={clientBalance?.current_balance}
          slug={slug}
          cartRef={cartRef}
          onClientModalClose={() => { setTimeout(() => searchRef.current?.focus(), 100); }}
        />
      </div>

      {/* ── Modals ── */}

      {modal === 'payment' && (
        <Suspense fallback={null}>
          <ProfessionalPaymentModal
            totals={pos.totals} client={pos.client}
            paymentModes={paymentModes ?? []}
            documentTypes={documentTypes ?? []}
            currencies={currencies ?? []}
            treasuryAccounts={treasuryAccounts ?? []}
            totalTtcFinal={adjustedTotalTtcFinal}
            existingPayments={pos.payments}
            isEditing={editingDocumentId !== null}
            documentDate={editingDocumentDate ?? new Date().toISOString().slice(0, 10)}
            prevBalance={editingDocumentId ? editingPrevBalanceRef.current : clientBalance?.current_balance}
            defaultPaymentCode={settings.defaultPaymentCode}
            defaultDocTypeCode={settings.defaultDocTypeCode}
            initialDueDate={editingDocMetaRef.current?.dueDate}
            initialTypeCode={editingDocMetaRef.current?.typeCode}
            initialCurrencyId={editingDocMetaRef.current?.currencyId}
            initialNote={cartNote}
            onClose={() => setModal('none')}
            onConfirm={handleCompleteSale}
          />
        </Suspense>
      )}

      {modal === 'held' && (
        <Suspense fallback={null}>
          <HeldCartsModal
            carts={pos.heldCarts} onClose={() => setModal('none')}
            onRestore={id => { pos.restoreCart(id); setModal('none'); }}
            onDelete={pos.deleteHeldCart}
            onRestoreAndPay={id => { pos.restoreCart(id); setModal('payment'); }}
          />
        </Suspense>
      )}

      {modal === 'receipt' && receiptSnapshot && receiptSource && posTemplate && (
        <Suspense fallback={null}>
          <ProfessionalReceipt
            template={posTemplate}
            company={companyData}
            source={receiptSource}
            docNumber={receiptSnapshot.docNumber}
            onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
            onPrint={() => { handlePrintDirect(receiptSnapshot); }}
            onNewSale={() => { setModal('none'); setReceiptSnapshot(null); pos.clearCart(); }}
          />
        </Suspense>
      )}

      {modal === 'manual' && (
        <Suspense fallback={null}>
          <ManualProductModal
            onClose={() => setModal('none')}
            onAdd={(name, priceTtc, qty, tvaRate) => {
              pos.addItem(makeFakeVariant(name, ttcToHt(priceTtc, tvaRate), tvaRate), qty);
              setModal('none');
            }}
          />
        </Suspense>
      )}

      {modal === 'qty' && selectedCartItemId && (
        <Suspense fallback={null}>
          <QtySetModal
            item={pos.items.find(i => i.id === selectedCartItemId)!}
            onClose={() => {
              setModal('none');
              if (selectedCartItemId) {
                requestAnimationFrame(() => cartApiRef.current?.scrollToItemId(selectedCartItemId));
              }
            }}
            onConfirm={qty => {
              if (selectedCartItemId) pos.updateQty(selectedCartItemId, qty);
              setModal('none');
              if (selectedCartItemId) {
                requestAnimationFrame(() => cartApiRef.current?.scrollToItemId(selectedCartItemId));
              }
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
          />
        </Suspense>
      )}

      {modal === 'session' && currentSession && (
        <Suspense fallback={null}>
          <SessionStatsModal
            session={currentSession}
            onClose={() => setModal('none')}
            onEndSession={() => { setModal('none'); setShowCloseSession(true); }}
          />
        </Suspense>
      )}

      {modal === 'returns' && (
        <Suspense fallback={null}>
          <ReturnsModal
            documentTypes={documentTypes ?? []}
            defaultWarehouseId={defaultWarehouse?.id ?? null}
            fiscalYearId={fiscalYear?.id ?? undefined}
            onClose={() => setModal('none')}
            onDone={() => setModal('none')}
          />
        </Suspense>
      )}

      {modal === 'kbhelp' && (
        <Suspense fallback={null}>
          <KeyboardHelpModal onClose={() => setModal('none')} />
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
            systemFiscalStampEnabled={systemFiscalStampEnabled}
            onToggleFiscalStamp={toggleFiscalStamp}
            systemAllowNegativeStock={allowNegSetting}
            onToggleAllowNegative={toggleAllowNegative}
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
            verifyPin={pin => pin === settings.managerPin}
          />
        </Suspense>
      )}

      <Toaster key={settings.toastPosition} position={settings.toastPosition} richColors closeButton
        duration={settings.toastDuration || undefined}
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
      <ConfirmDialog {...clearCartConfirm.confirmDialogProps} />
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

export default React.memo(POSPage);
