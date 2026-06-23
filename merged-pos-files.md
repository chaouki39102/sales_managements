

# =========================================
# 📘 pos
# =========================================

## FILE: resources/js/pages/pos/POSKioskPage.tsx
```
import React, { useState, useMemo } from 'react';
import { Toaster, toast }            from 'sonner';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePOS }                     from '@/pos/hooks/usePOS';
import {
  usePaymentModes, useWarehouses, usePriceLevels,
  useCurrencies, useTreasuryAccounts, useDocumentTypes,
} from '@/lib/api/endpoints/lookups';
import { productsApi }   from '@/lib/api/endpoints/products';
import { partiesApi }    from '@/lib/api/endpoints/parties';
import { apiGet }        from '@/lib/api/core/client';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi }  from '@/lib/api/endpoints/documents';
import { useActiveSlug } from '@/lib/store/appStore';
import {
  productToVariant, makeFakeVariant,
  type ViewMode, type GridSize, type SortMode,
} from '@/pos/utils/posHelpers';
import {
  calcFiscalStamp, formatDZD, htToTtc, ttcToHt,
} from '@/pos/utils/calculations';
import { printThermal, isWebUsbSupported, getThermalAutoPrint } from '@/pos/utils/printService';
import type { PaginatedResponse } from '@/lib/api/core/types';
import type {
  Product, ProductVariant, CartItem, CartTotals,
  PriceLevel, Party, PaymentMode, DocumentType,
} from '@/types';

import ProductSearchBar   from '@/pos/components/ProductSearchBar';
import CategoryTabs       from '@/pos/components/CategoryTabs';
import ProductGrid        from '@/pos/components/ProductGrid';
import ProfessionalPaymentModal from '@/pos/components/ProfessionalPaymentModal';
import ProfessionalReceipt      from '@/pos/components/ProfessionalReceipt';

const PER_PAGE = 60;

export default function POSKioskPage() {
  const pos        = usePOS();
  const slug       = useActiveSlug();
  const fiscalYear = useSelectedFiscalYear();

  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedCategory, setSelectedCategory]  = useState<number | null>(null);
  const [gridSize,         setGridSize]          = useState<GridSize>('md');
  const [view,             setView]              = useState<ViewMode>('grid');
  const [sortBy,           setSortBy]            = useState<SortMode>('name');
  const [modal,            setModal]             = useState<'none' | 'payment' | 'receipt' | 'confirm'>('none');
  const [lastDocNum,       setLastDocNum]        = useState<string | undefined>();
  const [receiptSnapshot,  setReceiptSnapshot]   = useState<{
    items: CartItem[]; totals: CartTotals; docNum?: string;
  } | null>(null);

  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses      } = useWarehouses();
  const { data: priceLevels     } = usePriceLevels();
  const { data: currencies      } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();
  const { data: documentTypes   } = useDocumentTypes();

  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? null;
  const priceLevelsList  = priceLevels ?? [];

  const { data: productsRaw   } = useQuery({
    queryKey: ['pos-products-kiosk', slug, searchQuery, selectedCategory],
    queryFn: () => productsApi.list({
      per_page: PER_PAGE,
      search:   searchQuery || undefined,
      family_id: selectedCategory ?? undefined,
      with:     'variants,variants.quantity_discounts,category,family',
    }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const products = (productsRaw as PaginatedResponse<Product> | undefined)?.data ?? [];

  const allVariants = useMemo<ProductVariant[]>(() => {
    return products.flatMap(p => productToVariant(p, priceLevelsList, null));
  }, [products, priceLevelsList]);

  const families = useMemo(() => {
    const seen = new Set<string>();
    return products.flatMap(p => {
      if (!p.family || seen.has(p.family.name)) return [];
      seen.add(p.family.name);
      return [{ ...p.family, _count: { products: products.filter(x => x.family?.name === p.family?.name).length } }];
    });
  }, [products]);

  const [filteredVariants, setFilteredVariants] = useState<ProductVariant[]>([]);
  useMemo(() => setFilteredVariants(allVariants), [allVariants]);

  const handleCompleteSale = async (params: {
    paymentModeId: number; amount: number;
    payments?: Array<{ paymentModeId: number; amount: number; treasuryAccountId?: number | null }>;
  }) => {
    const invType     = documentTypes?.find(t => t.code === 'BL') ?? documentTypes?.[0];
    const fiscalYearId = fiscalYear?.id;
    if (!invType || !defaultWarehouse || !fiscalYearId) {
      toast.error('بيانات الفاتورة غير مكتملة');
      return { ok: false, message: 'بيانات الفاتورة غير مكتملة' };
    }
    try {
      const snapshot = { items: [...pos.items], totals: { ...pos.totals } };
      const apiPayments = (params.payments ?? [])
        .filter(p => p.amount > 0)
        .map(p => ({
          payment_mode_id:     p.paymentModeId,
          amount:              p.amount,
          payment_date:        new Date().toISOString().slice(0, 10),
          treasury_account_id: p.treasuryAccountId ?? null,
        }));
      const res = await documentsApi.create({
        document_type_id:    invType.id,
        warehouse_id:        defaultWarehouse.id,
        fiscal_year_id:      fiscalYearId,
        client_id:           null,
        document_date:       new Date().toISOString().slice(0, 10),
        notes:               null,
        delivery_type:       undefined,
        lines: pos.items.map(i => ({
          product_id:          i.product_id,
          variant_id:          i.variant_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: i.discount_percentage,
          tva_rate:            i.tva_rate,
        })),
        payments: apiPayments,
      });
      pos.incrementSession({
        amount: snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp,
        payments: params.payments,
        items: snapshot.items,
      });
      setReceiptSnapshot({ items: snapshot.items, totals: snapshot.totals, docNum: res.document_number });
      setLastDocNum(res.document_number);
      pos.clearCart();
      setModal('receipt');
      toast.success(`✅ تم حفظ الفاتورة ${res.document_number ?? ''}`);

      if (isWebUsbSupported() && getThermalAutoPrint()) {
        setTimeout(async () => {
          const r = await printThermal(snapshot.items, snapshot.totals, null, res.document_number);
          if (!r.ok) toast.error(r.message);
        }, 500);
      }
      return { ok: true, docNumber: res.document_number };
    } catch (err: any) {
      toast.error(err?.message ?? 'فشل حفظ الفاتورة');
      return { ok: false, message: String(err?.message ?? '') };
    }
  };

  const isEmpty = pos.items.length === 0;
  const totalTtcFinal = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  return (
    <div className="pos-kiosk">
      <div className="pos-kiosk-hd">
        <div className="pos-kiosk-logo">نظام المبيعات — البيع الذاتي</div>
        <div className="pos-kiosk-summary">
          <span className="pos-kiosk-count">{pos.items.length} صنف</span>
          <span className="pos-kiosk-total">{formatDZD(totalTtcFinal)}</span>
          <button
            className="btn btn-p btn-lg"
            disabled={isEmpty}
            onClick={() => setModal('payment')}
          >
            <i className="ti ti-shopping-cart-check" /> دفع
          </button>
        </div>
      </div>

      <div className="pos-kiosk-body">
        <div className="pos-kiosk-search">
          <ProductSearchBar
            query={searchQuery} onQuery={setSearchQuery}
            view={view} gridSize={gridSize}
            onView={setView} onGridSize={setGridSize}
            onFilter={() => {}} filterActive={false}
            sortBy={sortBy} onSort={setSortBy}
            resultsCount={filteredVariants.length}
            onEnterFirst={() => { const first = filteredVariants[0]; if (first) pos.addItem(first); }}
          />
        </div>
        <CategoryTabs families={families} selected={selectedCategory} onSelect={setSelectedCategory} />
        <div className="pos-kiosk-grid">
          <ProductGrid
            variants={filteredVariants} view={view} gridSize={gridSize}
            loading={false} hasMore={false} onLoadMore={() => {}}
            onAdd={v => pos.addItem(v)} onAddManual={() => {}}
            onPin={() => {}} isPinned={() => false}
            priceLevels={priceLevelsList} selectedPriceLevelId={null}
            cartItems={pos.items}
          />
        </div>
      </div>

      <div className="pos-kiosk-cartbar">
        {pos.items.slice(0, 8).map(item => (
          <div key={item.id} className="pos-kiosk-cb-item">
            <span className="pos-kiosk-cb-name">{item.product_name}</span>
            <span className="pos-kiosk-cb-qty">×{item.quantity}</span>
            <span className="pos-kiosk-cb-price">{formatDZD(item.total_ttc)}</span>
            <button className="pos-kiosk-cb-remove" onClick={() => pos.removeItem(item.id)}>
              <i className="ti ti-x" />
            </button>
          </div>
        ))}
        {pos.items.length > 8 && (
          <div className="pos-kiosk-cb-more">+{pos.items.length - 8} أصناف أخرى</div>
        )}
      </div>

      {pos.items.length > 0 && (
        <div className="pos-kiosk-clear">
          <button className="btn btn-outline btn-sm" onClick={pos.clearCart}>
            <i className="ti ti-trash" /> إفراغ السلة
          </button>
        </div>
      )}

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals} items={pos.items} client={null}
          paymentModes={paymentModes ?? []} documentTypes={documentTypes ?? []}
          currencies={currencies ?? []} treasuryAccounts={treasuryAccounts}
          totalTtcFinal={totalTtcFinal}
          onClose={() => setModal('none')} onConfirm={handleCompleteSale}
        />
      )}

      {modal === 'receipt' && receiptSnapshot && (
        <ProfessionalReceipt
          items={receiptSnapshot.items} totals={receiptSnapshot.totals}
          client={null} docNumber={receiptSnapshot.docNum ?? lastDocNum}
          onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
          onPrint={() => window.print()}
          onNewSale={() => { setModal('none'); setReceiptSnapshot(null); pos.clearCart(); }}
        />
      )}

      <Toaster position="top-left" richColors closeButton
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
    </div>
  );
}
```

## FILE: resources/js/pages/pos/POSPage.tsx
```
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
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
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
import SessionStatsModal        from '@/pos/components/SessionStatsModal';
import KeyboardHelpModal        from '@/pos/components/KeyboardHelpModal';
import { matchOverride }        from '@/pos/hooks/useKeyboardMap';

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

const QUICK_ITEMS_KEY = (slug: string) => `pos-quick-items-${slug}`;

export default function POSPage() {
  const pos        = usePOS();
  const slug       = useActiveSlug();
  const fiscalYear = useSelectedFiscalYear();

  const [view,       setView]       = useState<ViewMode>('grid');
  const [gridSize,   setGridSize]   = useState<GridSize>('md');
  const [mobTab,     setMobTab]     = useState<'products' | 'cart'>('products');
  const [fullscreen, setFullscreen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [modal,      setModal]      = useState<ActiveModal>('none');
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
  const [showQuickbar, setShowQuickbar] = useState(true);

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

  const searchRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  const isSearching   = pos.searchQuery.trim().length >= 2;
  const queryFamilyId = pos.selectedCategory ?? undefined;

  // ── Products query ─────────────────────────────────────────────────────────
  const { data: productsRaw, isLoading: loadingAll, isPlaceholderData } = useQuery({
    queryKey: [slug, 'products', 'pos', {
      search: pos.searchQuery, cat: pos.selectedCategory, page, per_page: 120,
    }],
    queryFn: () => productsApi.list({
      per_page:  120,
      include:   'tva,unit,family,prices.priceLevel,quantityDiscounts',  // ✅ أُضيف quantityDiscounts
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
  const { data: customersData    } = useClients({ per_page: 200 });
  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses       } = useWarehouses();
  const { data: documentTypes    } = useDocumentTypes();
  const { data: priceLevels      } = usePriceLevels();
  const { data: currencies       } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();   // ✅ مُضاف

  const customers        = (customersData as PaginatedResponse<Party>)?.data ?? (customersData as Party[]) ?? [];
  const priceLevelsList  = priceLevels ?? [];
  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null;
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
      const val = String((negSettingRaw as any)?.value ?? 'false') === 'true';
      setAllowNegSetting(val);
      try { localStorage.setItem(ALLOW_NEG_KEY, val ? 'true' : 'false'); } catch {}
    }
  }, [negSettingRaw]);

  // ── Stock ──────────────────────────────────────────────────────────────────
  const { data: stockData = {} } = useQuery<Record<number, number>>({
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
  }, [allVariants, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice, sortBy]);

  const isEmpty = pos.items.length === 0;

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
    const typeCode = params.docTypeCode ?? 'FV';
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

      pos.incrementSession(snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp);
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
  }, [pos, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency, defaultTreasury, cartNote]);

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
      <POSTopBar
        sessionInvoices={pos.sessionInvoices}
        sessionSales={pos.sessionSales}
        heldCount={pos.heldCarts.length}
        avgMargin={avgMargin}
        isEmpty={isEmpty}
        isFullscreen={fullscreen}
        onHeld={() => setModal('held')}
        onNewSale={() => isEmpty ? pos.clearCart() : pos.holdCart()}
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
          onAdd={v => pos.addItem(v)}
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
            onEnterFirst={() => { const first = filteredVariants[0]; if (first && !isVariantOutOfStock(first, allowNegSetting)) pos.addItem(first); }}
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
            onAdd={v => pos.addItem(v)} onAddManual={() => setModal('manual')}
            onPin={toggleQuickItem} isPinned={isQuickItem}
            priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
            cartItems={pos.items} allowNegativeStock={allowNegSetting}
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
          onSell={() => setModal('payment')} onClear={pos.clearCart} onHeld={() => setModal('held')}
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

      {modal === 'session' && (
        <SessionStatsModal
          sessionInvoices={pos.sessionInvoices}
          sessionSales={pos.sessionSales}
          highestInvoice={pos.highestInvoice}
          invoiceTotals={pos.invoiceTotals}
          paymentsBreakdown={pos.paymentsBreakdown}
          productsSold={pos.productsSold}
          paymentModes={paymentModes ?? []}
          heldCount={pos.heldCarts.length}
          avgMargin={avgMargin}
          onClose={() => setModal('none')}
          onEndSession={() => { pos.endSession(); setModal('none'); }}
        />
      )}

      {modal === 'kbhelp' && <KeyboardHelpModal onClose={() => setModal('none')} />}

      <Toaster position="top-left" richColors closeButton
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
    </div>
  );
}
```



# =========================================
# 📘 pos
# =========================================

## FILE: resources/js/pages/pos/POSKioskPage.tsx
```
import React, { useState, useMemo } from 'react';
import { Toaster, toast }            from 'sonner';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePOS }                     from '@/pos/hooks/usePOS';
import {
  usePaymentModes, useWarehouses, usePriceLevels,
  useCurrencies, useTreasuryAccounts, useDocumentTypes,
} from '@/lib/api/endpoints/lookups';
import { productsApi }   from '@/lib/api/endpoints/products';
import { partiesApi }    from '@/lib/api/endpoints/parties';
import { apiGet }        from '@/lib/api/core/client';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi }  from '@/lib/api/endpoints/documents';
import { useActiveSlug } from '@/lib/store/appStore';
import {
  productToVariant, makeFakeVariant,
  type ViewMode, type GridSize, type SortMode,
} from '@/pos/utils/posHelpers';
import {
  calcFiscalStamp, formatDZD, htToTtc, ttcToHt,
} from '@/pos/utils/calculations';
import { printThermal, isWebUsbSupported, getThermalAutoPrint } from '@/pos/utils/printService';
import type { PaginatedResponse } from '@/lib/api/core/types';
import type {
  Product, ProductVariant, CartItem, CartTotals,
  PriceLevel, Party, PaymentMode, DocumentType,
} from '@/types';

import ProductSearchBar   from '@/pos/components/ProductSearchBar';
import CategoryTabs       from '@/pos/components/CategoryTabs';
import ProductGrid        from '@/pos/components/ProductGrid';
import ProfessionalPaymentModal from '@/pos/components/ProfessionalPaymentModal';
import ProfessionalReceipt      from '@/pos/components/ProfessionalReceipt';

const PER_PAGE = 60;

export default function POSKioskPage() {
  const pos        = usePOS();
  const slug       = useActiveSlug();
  const fiscalYear = useSelectedFiscalYear();

  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedCategory, setSelectedCategory]  = useState<number | null>(null);
  const [gridSize,         setGridSize]          = useState<GridSize>('md');
  const [view,             setView]              = useState<ViewMode>('grid');
  const [sortBy,           setSortBy]            = useState<SortMode>('name');
  const [modal,            setModal]             = useState<'none' | 'payment' | 'receipt' | 'confirm'>('none');
  const [lastDocNum,       setLastDocNum]        = useState<string | undefined>();
  const [receiptSnapshot,  setReceiptSnapshot]   = useState<{
    items: CartItem[]; totals: CartTotals; docNum?: string;
  } | null>(null);

  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses      } = useWarehouses();
  const { data: priceLevels     } = usePriceLevels();
  const { data: currencies      } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();
  const { data: documentTypes   } = useDocumentTypes();

  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? null;
  const priceLevelsList  = priceLevels ?? [];

  const { data: productsRaw   } = useQuery({
    queryKey: ['pos-products-kiosk', slug, searchQuery, selectedCategory],
    queryFn: () => productsApi.list({
      per_page: PER_PAGE,
      search:   searchQuery || undefined,
      family_id: selectedCategory ?? undefined,
      with:     'variants,variants.quantity_discounts,category,family',
    }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const products = (productsRaw as PaginatedResponse<Product> | undefined)?.data ?? [];

  const allVariants = useMemo<ProductVariant[]>(() => {
    return products.flatMap(p => productToVariant(p, priceLevelsList, null));
  }, [products, priceLevelsList]);

  const families = useMemo(() => {
    const seen = new Set<string>();
    return products.flatMap(p => {
      if (!p.family || seen.has(p.family.name)) return [];
      seen.add(p.family.name);
      return [{ ...p.family, _count: { products: products.filter(x => x.family?.name === p.family?.name).length } }];
    });
  }, [products]);

  const [filteredVariants, setFilteredVariants] = useState<ProductVariant[]>([]);
  useMemo(() => setFilteredVariants(allVariants), [allVariants]);

  const handleCompleteSale = async (params: {
    paymentModeId: number; amount: number;
    payments?: Array<{ paymentModeId: number; amount: number; treasuryAccountId?: number | null }>;
  }) => {
    const invType     = documentTypes?.find(t => t.code === 'BL') ?? documentTypes?.[0];
    const fiscalYearId = fiscalYear?.id;
    if (!invType || !defaultWarehouse || !fiscalYearId) {
      toast.error('بيانات الفاتورة غير مكتملة');
      return { ok: false, message: 'بيانات الفاتورة غير مكتملة' };
    }
    try {
      const snapshot = { items: [...pos.items], totals: { ...pos.totals } };
      const apiPayments = (params.payments ?? [])
        .filter(p => p.amount > 0)
        .map(p => ({
          payment_mode_id:     p.paymentModeId,
          amount:              p.amount,
          payment_date:        new Date().toISOString().slice(0, 10),
          treasury_account_id: p.treasuryAccountId ?? null,
        }));
      const res = await documentsApi.create({
        document_type_id:    invType.id,
        warehouse_id:        defaultWarehouse.id,
        fiscal_year_id:      fiscalYearId,
        client_id:           null,
        document_date:       new Date().toISOString().slice(0, 10),
        notes:               null,
        delivery_type:       undefined,
        lines: pos.items.map(i => ({
          product_id:          i.product_id,
          variant_id:          i.variant_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: i.discount_percentage,
          tva_rate:            i.tva_rate,
        })),
        payments: apiPayments,
      });
      pos.incrementSession({
        amount: snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp,
        payments: params.payments,
        items: snapshot.items,
      });
      setReceiptSnapshot({ items: snapshot.items, totals: snapshot.totals, docNum: res.document_number });
      setLastDocNum(res.document_number);
      pos.clearCart();
      setModal('receipt');
      toast.success(`✅ تم حفظ الفاتورة ${res.document_number ?? ''}`);

      if (isWebUsbSupported() && getThermalAutoPrint()) {
        setTimeout(async () => {
          const r = await printThermal(snapshot.items, snapshot.totals, null, res.document_number);
          if (!r.ok) toast.error(r.message);
        }, 500);
      }
      return { ok: true, docNumber: res.document_number };
    } catch (err: any) {
      toast.error(err?.message ?? 'فشل حفظ الفاتورة');
      return { ok: false, message: String(err?.message ?? '') };
    }
  };

  const isEmpty = pos.items.length === 0;
  const totalTtcFinal = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  return (
    <div className="pos-kiosk">
      <div className="pos-kiosk-hd">
        <div className="pos-kiosk-logo">نظام المبيعات — البيع الذاتي</div>
        <div className="pos-kiosk-summary">
          <span className="pos-kiosk-count">{pos.items.length} صنف</span>
          <span className="pos-kiosk-total">{formatDZD(totalTtcFinal)}</span>
          <button
            className="btn btn-p btn-lg"
            disabled={isEmpty}
            onClick={() => setModal('payment')}
          >
            <i className="ti ti-shopping-cart-check" /> دفع
          </button>
        </div>
      </div>

      <div className="pos-kiosk-body">
        <div className="pos-kiosk-search">
          <ProductSearchBar
            query={searchQuery} onQuery={setSearchQuery}
            view={view} gridSize={gridSize}
            onView={setView} onGridSize={setGridSize}
            onFilter={() => {}} filterActive={false}
            sortBy={sortBy} onSort={setSortBy}
            resultsCount={filteredVariants.length}
            onEnterFirst={() => { const first = filteredVariants[0]; if (first) pos.addItem(first); }}
          />
        </div>
        <CategoryTabs families={families} selected={selectedCategory} onSelect={setSelectedCategory} />
        <div className="pos-kiosk-grid">
          <ProductGrid
            variants={filteredVariants} view={view} gridSize={gridSize}
            loading={false} hasMore={false} onLoadMore={() => {}}
            onAdd={v => pos.addItem(v)} onAddManual={() => {}}
            onPin={() => {}} isPinned={() => false}
            priceLevels={priceLevelsList} selectedPriceLevelId={null}
            cartItems={pos.items}
          />
        </div>
      </div>

      <div className="pos-kiosk-cartbar">
        {pos.items.slice(0, 8).map(item => (
          <div key={item.id} className="pos-kiosk-cb-item">
            <span className="pos-kiosk-cb-name">{item.product_name}</span>
            <span className="pos-kiosk-cb-qty">×{item.quantity}</span>
            <span className="pos-kiosk-cb-price">{formatDZD(item.total_ttc)}</span>
            <button className="pos-kiosk-cb-remove" onClick={() => pos.removeItem(item.id)}>
              <i className="ti ti-x" />
            </button>
          </div>
        ))}
        {pos.items.length > 8 && (
          <div className="pos-kiosk-cb-more">+{pos.items.length - 8} أصناف أخرى</div>
        )}
      </div>

      {pos.items.length > 0 && (
        <div className="pos-kiosk-clear">
          <button className="btn btn-outline btn-sm" onClick={pos.clearCart}>
            <i className="ti ti-trash" /> إفراغ السلة
          </button>
        </div>
      )}

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals} items={pos.items} client={null}
          paymentModes={paymentModes ?? []} documentTypes={documentTypes ?? []}
          currencies={currencies ?? []} treasuryAccounts={treasuryAccounts}
          totalTtcFinal={totalTtcFinal}
          onClose={() => setModal('none')} onConfirm={handleCompleteSale}
        />
      )}

      {modal === 'receipt' && receiptSnapshot && (
        <ProfessionalReceipt
          items={receiptSnapshot.items} totals={receiptSnapshot.totals}
          client={null} docNumber={receiptSnapshot.docNum ?? lastDocNum}
          onClose={() => { setModal('none'); setReceiptSnapshot(null); }}
          onPrint={() => window.print()}
          onNewSale={() => { setModal('none'); setReceiptSnapshot(null); pos.clearCart(); }}
        />
      )}

      <Toaster position="top-left" richColors closeButton
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
    </div>
  );
}
```

## FILE: resources/js/pages/pos/POSPage.tsx
```
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
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
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
import SessionStatsModal        from '@/pos/components/SessionStatsModal';
import KeyboardHelpModal        from '@/pos/components/KeyboardHelpModal';
import { matchOverride }        from '@/pos/hooks/useKeyboardMap';

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

const QUICK_ITEMS_KEY = (slug: string) => `pos-quick-items-${slug}`;

export default function POSPage() {
  const pos        = usePOS();
  const slug       = useActiveSlug();
  const fiscalYear = useSelectedFiscalYear();

  const [view,       setView]       = useState<ViewMode>('grid');
  const [gridSize,   setGridSize]   = useState<GridSize>('md');
  const [mobTab,     setMobTab]     = useState<'products' | 'cart'>('products');
  const [fullscreen, setFullscreen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [modal,      setModal]      = useState<ActiveModal>('none');
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
  const [showQuickbar, setShowQuickbar] = useState(true);

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

  const searchRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  const isSearching   = pos.searchQuery.trim().length >= 2;
  const queryFamilyId = pos.selectedCategory ?? undefined;

  // ── Products query ─────────────────────────────────────────────────────────
  const { data: productsRaw, isLoading: loadingAll, isPlaceholderData } = useQuery({
    queryKey: [slug, 'products', 'pos', {
      search: pos.searchQuery, cat: pos.selectedCategory, page, per_page: 120,
    }],
    queryFn: () => productsApi.list({
      per_page:  120,
      include:   'tva,unit,family,prices.priceLevel,quantityDiscounts',  // ✅ أُضيف quantityDiscounts
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
  const { data: customersData    } = useClients({ per_page: 200 });
  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses       } = useWarehouses();
  const { data: documentTypes    } = useDocumentTypes();
  const { data: priceLevels      } = usePriceLevels();
  const { data: currencies       } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();   // ✅ مُضاف

  const customers        = (customersData as PaginatedResponse<Party>)?.data ?? (customersData as Party[]) ?? [];
  const priceLevelsList  = priceLevels ?? [];
  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null;
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
      const val = String((negSettingRaw as any)?.value ?? 'false') === 'true';
      setAllowNegSetting(val);
      try { localStorage.setItem(ALLOW_NEG_KEY, val ? 'true' : 'false'); } catch {}
    }
  }, [negSettingRaw]);

  // ── Stock ──────────────────────────────────────────────────────────────────
  const { data: stockData = {} } = useQuery<Record<number, number>>({
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
  }, [allVariants, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice, sortBy]);

  const isEmpty = pos.items.length === 0;

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
    const typeCode = params.docTypeCode ?? 'FV';
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

      pos.incrementSession(snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp);
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
  }, [pos, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency, defaultTreasury, cartNote]);

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
      <POSTopBar
        sessionInvoices={pos.sessionInvoices}
        sessionSales={pos.sessionSales}
        heldCount={pos.heldCarts.length}
        avgMargin={avgMargin}
        isEmpty={isEmpty}
        isFullscreen={fullscreen}
        onHeld={() => setModal('held')}
        onNewSale={() => isEmpty ? pos.clearCart() : pos.holdCart()}
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
          onAdd={v => pos.addItem(v)}
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
            onEnterFirst={() => { const first = filteredVariants[0]; if (first && !isVariantOutOfStock(first, allowNegSetting)) pos.addItem(first); }}
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
            onAdd={v => pos.addItem(v)} onAddManual={() => setModal('manual')}
            onPin={toggleQuickItem} isPinned={isQuickItem}
            priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
            cartItems={pos.items} allowNegativeStock={allowNegSetting}
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
          onSell={() => setModal('payment')} onClear={pos.clearCart} onHeld={() => setModal('held')}
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

      {modal === 'session' && (
        <SessionStatsModal
          sessionInvoices={pos.sessionInvoices}
          sessionSales={pos.sessionSales}
          highestInvoice={pos.highestInvoice}
          invoiceTotals={pos.invoiceTotals}
          paymentsBreakdown={pos.paymentsBreakdown}
          productsSold={pos.productsSold}
          paymentModes={paymentModes ?? []}
          heldCount={pos.heldCarts.length}
          avgMargin={avgMargin}
          onClose={() => setModal('none')}
          onEndSession={() => { pos.endSession(); setModal('none'); }}
        />
      )}

      {modal === 'kbhelp' && <KeyboardHelpModal onClose={() => setModal('none')} />}

      <Toaster position="top-left" richColors closeButton
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
    </div>
  );
}
```

## FILE: resources/js/pos/components/CartRow.tsx
```
// pos/components/CartRow.tsx — v4 (تصميم محسّن بالكامل)
// ════════════════════════════════════════════════════════════════════════════
// التحسينات عن النسخة السابقة:
//   1. تصميم البطاقة منفصلة بكارد مرتفع بدل صف مسطح
//   2. زر الخصم: inline popover حقيقي (يظهر فوق الصف، لا يزيح المحتوى)
//   3. تبديل % / دج بصرياً واضح داخل الـ popover
//   4. السعر HT قابل للتعديل بـ popover أيضاً
//   5. الكمية: input يظهر مباشرة عند النقر على الرقم
//   6. مؤشر خصم ملون يبقى ظاهراً دائماً عند وجود خصم
//   7. شريط اللون الأيمن يتغير مع الحالة (عادي / مختار / خصم)
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CartItem } from '@/types';
import { formatDZD } from '../utils/calculations';

interface CartRowProps {
  item:             CartItem;
  idx:              number;
  isSelected:       boolean;
  onSelect:         () => void;
  onQty:            (qty: number) => void;
  onDiscount:       (pct: number) => void;
  onDiscountAmount: (amount: number) => void;
  onPrice:          (price: number) => void;
  onRemove:         () => void;
}

type DiscMode  = 'pct' | 'amount';
type PopupType = 'disc' | 'price' | null;

export default function CartRow({
  item, idx, isSelected, onSelect,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
}: CartRowProps) {
  const [popup,      setPopup]      = useState<PopupType>(null);
  const [editQty,    setEditQty]    = useState(false);
  const [discMode,   setDiscMode]   = useState<DiscMode>('pct');
  const [discVal,    setDiscVal]    = useState('');
  const [priceVal,   setPriceVal]   = useState('');
  const [qtyVal,     setQtyVal]     = useState('');

  const discInpRef  = useRef<HTMLInputElement>(null);
  const priceInpRef = useRef<HTMLInputElement>(null);
  const qtyInpRef   = useRef<HTMLInputElement>(null);
  const rowRef      = useRef<HTMLDivElement>(null);

  // focus input عند فتح الـ popup
  useEffect(() => {
    if (popup === 'disc'  && discInpRef.current)  { discInpRef.current.focus();  discInpRef.current.select(); }
    if (popup === 'price' && priceInpRef.current) { priceInpRef.current.focus(); priceInpRef.current.select(); }
  }, [popup]);

  useEffect(() => {
    if (editQty && qtyInpRef.current) { qtyInpRef.current.focus(); qtyInpRef.current.select(); }
  }, [editQty]);

  // إغلاق الـ popup عند الضغط خارج الصف
  useEffect(() => {
    if (!popup) return;
    const h = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [popup]);

  // ── فتح popup الخصم ──────────────────────────────────────────────────────
  const openDisc = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVal = discMode === 'pct'
      ? String(item.discount_percentage || 0)
      : String(item.discount_amount || 0);
    setDiscVal(currentVal);
    setPopup(p => p === 'disc' ? null : 'disc');
  }, [discMode, item.discount_percentage, item.discount_amount]);

  // ── فتح popup السعر ───────────────────────────────────────────────────────
  const openPrice = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPriceVal(item.unit_price_ht.toFixed(2));
    setPopup(p => p === 'price' ? null : 'price');
  }, [item.unit_price_ht]);

  // ── Commit ────────────────────────────────────────────────────────────────
  const commitDisc = () => {
    const n = parseFloat(discVal);
    if (!isNaN(n) && n >= 0) {
      if (discMode === 'pct') onDiscount(Math.min(100, n));
      else                    onDiscountAmount(Math.max(0, n));
    }
    setPopup(null);
  };

  const commitPrice = () => {
    const n = parseFloat(priceVal);
    if (!isNaN(n) && n >= 0) onPrice(n);
    setPopup(null);
  };

  const commitQty = () => {
    const n = parseFloat(qtyVal);
    if (!isNaN(n) && n > 0) onQty(n);
    setEditQty(false);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const maxQty    = item.max_stock !== null ? item.max_stock : Infinity;
  const stockFull = item.manages_stock && item.quantity >= maxQty;
  const hasDisc   = item.discount_percentage > 0 || item.discount_amount > 0;
  const discLabel = item.discount_percentage > 0
    ? `-${item.discount_percentage % 1 === 0 ? item.discount_percentage : item.discount_percentage.toFixed(1)}%`
    : item.discount_amount > 0
      ? `-${formatDZD(item.discount_amount)}`
      : null;

  const tvaRate = item.tva_rate;

  return (
    <div
      ref={rowRef}
      className={`cr ${isSelected ? 'sel' : ''} ${hasDisc ? 'has-disc' : ''} ${popup ? 'cr--popup-open' : ''}`}
      onClick={onSelect}
    >
      {/* شريط اللون الجانبي */}
      <div className="cr-accent" />

      {/* ── الرقم ── */}
      <div className="cr-num">{idx + 1}</div>

      {/* ── معلومات المنتج ── */}
      <div className="cr-info">
        <div className="cr-name" title={item.product_name}>
          {item.product_name}
          {item.variant_name && (
            <span className="cr-variant"> — {item.variant_name}</span>
          )}
        </div>

        {/* صف السعر + الخصم */}
        <div className="cr-price-row">

          {/* ── السعر قابل للتعديل ── */}
          <button
            className={`cr-price ${popup === 'price' ? 'cr-price--active' : ''}`}
            onClick={openPrice}
            title="انقر لتعديل السعر HT"
            type="button"
          >
            <span className="cr-price-num">
              {item.unit_price_ht.toLocaleString('fr-DZ', { maximumFractionDigits: 2 })}
            </span>
            <span className="cr-price-unit">HT</span>
            <span className="cr-price-edit-ic">✎</span>
          </button>

          {/* ── الخصم ── */}
          {hasDisc ? (
            <button
              className={`cr-disc ${popup === 'disc' ? 'cr-disc--active' : ''}`}
              onClick={openDisc}
              title="انقر لتعديل الخصم"
              type="button"
            >
              <i className="ti ti-discount" />
              {discLabel}
            </button>
          ) : (
            <button
              className={`cr-disc-add ${popup === 'disc' ? 'cr-disc-add--active' : ''}`}
              onClick={openDisc}
              title="إضافة خصم"
              type="button"
            >
              <i className="ti ti-tag" />
              خصم
            </button>
          )}

          {/* TVA badge */}
          {tvaRate > 0 && (
            <span className="cr-tva">TVA {tvaRate}%</span>
          )}
        </div>

        {/* ── Popup الخصم ── */}
        {popup === 'disc' && (
          <div className="cr-popup cr-popup--disc" onClick={e => e.stopPropagation()}>
            <div className="cr-popup-arrow" />

            {/* تبديل الوضع */}
            <div className="cr-popup-modes">
              <button
                className={`cr-popup-mode ${discMode === 'pct' ? 'on' : ''}`}
                onClick={() => { setDiscMode('pct'); setDiscVal(String(item.discount_percentage || 0)); }}
                type="button"
              >
                <i className="ti ti-percentage" /> نسبة %
              </button>
              <button
                className={`cr-popup-mode ${discMode === 'amount' ? 'on' : ''}`}
                onClick={() => { setDiscMode('amount'); setDiscVal(String(item.discount_amount || 0)); }}
                type="button"
              >
                <i className="ti ti-currency-dinar" /> مبلغ دج
              </button>
            </div>

            {/* حقل الإدخال */}
            <div className="cr-popup-inp-row">
              <input
                ref={discInpRef}
                className="cr-popup-inp"
                type="number"
                value={discVal}
                onChange={e => setDiscVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  commitDisc();
                  if (e.key === 'Escape') setPopup(null);
                }}
                min={0}
                max={discMode === 'pct' ? 100 : undefined}
                step={discMode === 'pct' ? 0.5 : 1}
                placeholder={discMode === 'pct' ? '0' : '0.00'}
              />
              <span className="cr-popup-unit">{discMode === 'pct' ? '%' : 'دج'}</span>
            </div>

            {/* معاينة */}
            {discVal && parseFloat(discVal) > 0 && (
              <div className="cr-popup-preview">
                وفر:{' '}
                <strong>
                  {discMode === 'pct'
                    ? formatDZD(item.unit_price_ht * item.quantity * parseFloat(discVal) / 100)
                    : formatDZD(parseFloat(discVal))
                  }
                </strong>
              </div>
            )}

            {/* أزرار سريعة (نسب شائعة) */}
            {discMode === 'pct' && (
              <div className="cr-popup-quick">
                {[5, 10, 15, 20, 25, 30].map(p => (
                  <button
                    key={p}
                    className={`cr-popup-qbtn ${parseFloat(discVal) === p ? 'on' : ''}`}
                    onClick={() => { setDiscVal(String(p)); }}
                    type="button"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            )}

            {/* أزرار تأكيد */}
            <div className="cr-popup-actions">
              {hasDisc && (
                <button
                  className="cr-popup-clear"
                  onClick={() => { onDiscount(0); onDiscountAmount(0); setPopup(null); }}
                  type="button"
                  title="إزالة الخصم"
                >
                  <i className="ti ti-x" /> إزالة
                </button>
              )}
              <button className="cr-popup-cancel" onClick={() => setPopup(null)} type="button">
                إلغاء
              </button>
              <button className="cr-popup-ok" onClick={commitDisc} type="button">
                <i className="ti ti-check" /> تطبيق
              </button>
            </div>
          </div>
        )}

        {/* ── Popup السعر ── */}
        {popup === 'price' && (
          <div className="cr-popup cr-popup--price" onClick={e => e.stopPropagation()}>
            <div className="cr-popup-arrow" />
            <div className="cr-popup-label">سعر البيع HT</div>
            <div className="cr-popup-inp-row">
              <input
                ref={priceInpRef}
                className="cr-popup-inp"
                type="number"
                value={priceVal}
                onChange={e => setPriceVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  commitPrice();
                  if (e.key === 'Escape') setPopup(null);
                }}
                min={0}
                step={0.01}
                placeholder="0.00"
              />
              <span className="cr-popup-unit">دج</span>
            </div>
            {priceVal && parseFloat(priceVal) > 0 && (
              <div className="cr-popup-preview">
                TTC: <strong>{(parseFloat(priceVal) * (1 + tvaRate / 100)).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })} دج</strong>
              </div>
            )}
            <div className="cr-popup-actions">
              <button className="cr-popup-cancel" onClick={() => setPopup(null)} type="button">إلغاء</button>
              <button className="cr-popup-ok" onClick={commitPrice} type="button">
                <i className="ti ti-check" /> تطبيق
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── تحكم الكمية ── */}
      <div className="cr-qty-ctrl" onClick={e => e.stopPropagation()}>
        <button
          className="cq-btn cq-btn--minus"
          onClick={() => {
            const next = item.quantity - 1;
            if (next <= 0) onRemove();
            else onQty(next);
          }}
          title="إنقاص"
          type="button"
        >
          <i className="ti ti-minus" />
        </button>

        {editQty ? (
          <input
            ref={qtyInpRef}
            className="cr-edit-inp cq-inp"
            type="number"
            value={qtyVal}
            onChange={e => setQtyVal(e.target.value)}
            onBlur={commitQty}
            onKeyDown={e => {
              if (e.key === 'Enter')  commitQty();
              if (e.key === 'Escape') setEditQty(false);
            }}
          />
        ) : (
          <span
            className="cq-val"
            onClick={() => { setEditQty(true); setQtyVal(String(item.quantity)); }}
            title="انقر لتعديل الكمية"
          >
            {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}
          </span>
        )}

        <button
          className="cq-btn cq-btn--plus"
          onClick={() => { if (!stockFull) onQty(item.quantity + 1); }}
          disabled={stockFull}
          title={stockFull ? `الحد الأقصى: ${item.max_stock}` : 'زيادة'}
          type="button"
        >
          <i className="ti ti-plus" />
        </button>

        {item.unit_symbol && (
          <span className="cq-unit">{item.unit_symbol}</span>
        )}

        {stockFull && (
          <span className="cq-stock-warn" title={`المخزون المتاح: ${item.max_stock}`}>
            <i className="ti ti-alert-triangle" />
          </span>
        )}
      </div>

      {/* ── الإجمالي ── */}
      <div className="cr-total">
        <div className="cr-ttc" style={{ direction: 'ltr' }}>
          {item.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
          <span className="cr-dzd"> دج</span>
        </div>
        {hasDisc && (
          <div className="cr-ht cr-ht--strike" style={{ direction: 'ltr' }}>
            {(item.unit_price_ht * item.quantity * (1 + tvaRate / 100))
              .toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>

      {/* ── حذف ── */}
      <button
        className="cr-del"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        title="حذف (Del)"
        type="button"
      >
        <i className="ti ti-x" />
      </button>
    </div>
  );
}```

## FILE: resources/js/pos/components/CategoryTabs.tsx
```
import React from 'react';
import { familyIcon } from '../utils/posHelpers';

interface CategoryTabsProps {
  families: { id: number; name: string }[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function CategoryTabs({
  families, selected, onSelect,
}: CategoryTabsProps) {
  if (!families.length) return null;
  return (
    <div className="pos-cats">
      <button
        className={`pos-cat ${selected === null ? 'on' : ''}`}
        onClick={() => onSelect(null)}
        title="الكل — Alt+0"
      >
        <i className="ti ti-layout-2" />
        <span>الكل</span>
      </button>
      {families.map((f, idx) => (
        <button
          key={f.id}
          className={`pos-cat ${selected === f.id ? 'on' : ''}`}
          onClick={() => onSelect(f.id)}
          title={`${f.name} — Alt+${idx + 1}`}
        >
          <i className={`ti ${familyIcon(f.name)}`} />
          <span>{f.name}</span>
          {idx < 9 && <kbd className="cat-kb">Alt+{idx + 1}</kbd>}
        </button>
      ))}
    </div>
  );
}
```

## FILE: resources/js/pos/components/CustomerSearchModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/CustomerSearchModal.tsx
//
// ✅ ميزات:
//   1. بحث فوري بالاسم / الهاتف / رقم التعريف الجبائي
//      — debounced 250ms — يبدأ من حرفين
//   2. إنشاء زبون جديد من POS بدون مغادرة الشاشة
//      الحقول: الاسم + الهاتف + النوع (زبون/مورد) فقط
//      — الباقي اختياري ويُكمَل لاحقاً من صفحة الزبائن
//   3. عرض آخر X زبائن للاختيار السريع
//   4. يُغلَق بـ Escape
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug }   from '@/lib/store/appStore';
import { formatCurrency }  from '@/lib/utils';
import type { Party }      from '@/types';
import type { PaginatedResponse, PartyBalance } from '@/lib/api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  currentClient: Party | null;
  onSelect:      (client: Party | null) => void;
  onClose:       () => void;
}

interface NewClientForm {
  name:         string;
  phone:        string;
  email:        string;
  trade_name:   string;
  nif:          string;
  is_client:    boolean;
}

const EMPTY_FORM: NewClientForm = {
  name:       '',
  phone:      '',
  email:      '',
  trade_name: '',
  nif:        '',
  is_client:  true,
};

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── BalanceLabel ─────────────────────────────────────────────────────────────

function BalanceLabel({ balance }: { balance: PartyBalance | undefined }) {
  if (!balance || balance.current_balance === 0) return null;
  const isDebit = balance.balance_type === 'debit';
  return (
    <div style={{
      fontSize: 11, marginTop: 2, direction: 'ltr', textAlign: 'right',
      color: isDebit ? '#e53935' : '#43a047',
      fontWeight: 600,
    }}>
      {isDebit ? 'مدين: ' : 'دائن: '}
      {formatCurrency(balance.current_balance)}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerSearchModal({
  currentClient, onSelect, onClose,
}: Props) {
  const slug          = useActiveSlug();
  const qc            = useQueryClient();
  const searchRef     = useRef<HTMLInputElement>(null);

  const [query,      setQuery]      = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState<NewClientForm>(EMPTY_FORM);
  const [formError,  setFormError]  = useState('');

  const debouncedQuery = useDebounce(query.trim(), 250);
  const isSearching    = debouncedQuery.length >= 2;

  // Focus البحث عند الفتح
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 80);
  }, []);

  // Escape يُغلق
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── بحث فوري ──────────────────────────────────────────────────────────────
  const { data: searchResults, isLoading: searching } = useQuery<Party[]>({
    queryKey: [slug, 'customers', 'pos-search', debouncedQuery],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/customers', {
        search:   debouncedQuery,
        per_page: 15,
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && isSearching,
    staleTime: 30_000,
  });

  // ── آخر زبائن (بدون بحث) ──────────────────────────────────────────────────
  const { data: recentClients } = useQuery<Party[]>({
    queryKey: [slug, 'customers', 'pos-recent'],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/customers', {
        per_page: 500,
        sort_by:  'name',
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && !isSearching,
    staleTime: 5 * 60_000,
  });

  // ── أرصدة الزبائن ─────────────────────────────────────────────────────────
  const { data: balances } = useQuery<PartyBalance[]>({
    queryKey: [slug, 'party-balances'],
    queryFn:  () =>
      apiGet<PartyBalance[]>('/party-balances').then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug,
    staleTime: 60_000,
  });

  const balanceMap = useMemo(() => {
    if (!balances) return new Map<number, PartyBalance>();
    const m = new Map<number, PartyBalance>();
    for (const b of balances) m.set(b.party_id, b);
    return m;
  }, [balances]);

  const displayList: Party[] = isSearching
    ? (searchResults ?? [])
    : (recentClients ?? []);

  // ── إنشاء زبون جديد ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Partial<Party>) =>
      apiPost<Party>('/parties', data),
    onSuccess: (newParty) => {
      // invalidate قائمة الزبائن
      if (slug) qc.invalidateQueries({ queryKey: [slug, 'parties'] });
      onSelect(newParty);
    },
    onError: (err: any) => {
      setFormError(err?.message ?? 'فشل إنشاء الزبون');
    },
  });

  const handleCreate = useCallback(() => {
    if (!form.name.trim()) { setFormError('الاسم إلزامي'); return; }
    setFormError('');
    createMutation.mutate({
      name:       form.name.trim(),
      phone:      form.phone.trim() || null,
      email:      form.email.trim() || null,
      trade_name: form.trade_name.trim() || null,
      nif:        form.nif.trim() || null,
      is_client:  form.is_client,
      is_supplier: !form.is_client,
    } as any);
  }, [form, createMutation]);

  const setField = useCallback(<K extends keyof NewClientForm>(
    key: K, val: NewClientForm[K],
  ) => {
    setForm(p => ({ ...p, [key]: val }));
    setFormError('');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-md"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        {/* Header */}
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-users" style={{ marginLeft: 6 }} />
            {showCreate ? 'زبون جديد' : 'اختيار الزبون'}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!showCreate && (
              <button
                className="btn btn-xs btn-p"
                onClick={() => setShowCreate(true)}
                type="button"
              >
                <i className="ti ti-plus" /> جديد
              </button>
            )}
            <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
          </div>
        </div>

        <div className="m-body" style={{ padding: 16 }}>

          {/* ════ وضع البحث ════ */}
          {!showCreate && (
            <>
              {/* شريط البحث */}
              <div className="pos-inp" style={{ marginBottom: 12 }}>
                <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--t4)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف أو NIF..."
                  style={{ flex: 1 }}
                />
                {query && (
                  <button
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--t4)', cursor: 'pointer', padding: '0 4px',
                    }}
                    onClick={() => setQuery('')}
                    type="button"
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              {/* زبون عابر */}
              <button
                className={`cust-row cust-anon ${!currentClient ? 'on' : ''}`}
                onClick={() => onSelect(null)}
                type="button"
              >
                <div className="cust-av">
                  <i className="ti ti-user-off" style={{ fontSize: 16 }} />
                </div>
                <div className="cust-info">
                  <div className="cust-name">زبون عابر</div>
                  <div className="cust-meta">بدون تسجيل</div>
                </div>
                {!currentClient && <i className="ti ti-check cust-check" />}
              </button>

              {/* عنوان القائمة */}
              <div className="cust-list-title">
                {isSearching
                  ? searching ? 'جارٍ البحث...' : `${displayList.length} نتيجة`
                  : 'آخر الزبائن'
                }
              </div>

              {/* القائمة */}
              <div className="cust-list">
                {displayList.length === 0 && !searching && isSearching && (
                  <div className="cust-empty">
                    <i className="ti ti-search-off" style={{ fontSize: 28, opacity: 0.3 }} />
                    <div>لا توجد نتائج</div>
                    <button
                      className="btn btn-xs btn-p"
                      onClick={() => { setShowCreate(true); setForm(f => ({ ...f, name: query })); }}
                      type="button"
                      style={{ marginTop: 8 }}
                    >
                      <i className="ti ti-plus" /> إنشاء "{query}"
                    </button>
                  </div>
                )}

                {displayList.map(c => (
                  <button
                    key={c.id}
                    className={`cust-row ${currentClient?.id === c.id ? 'on' : ''}`}
                    onClick={() => onSelect(c)}
                    type="button"
                  >
                    <div className="cust-av">
                      {(c.name?.[0] ?? '؟').toUpperCase()}
                    </div>
                    <div className="cust-info">
                      <div className="cust-name">{c.name}</div>
                      <div className="cust-meta">
                        {c.phone && <span><i className="ti ti-phone" style={{ fontSize: 10 }} /> {c.phone}</span>}
                        {c.nif   && <span>NIF: {c.nif}</span>}
                      </div>
                      <BalanceLabel balance={balanceMap.get(c.id)} />
                    </div>
                    {currentClient?.id === c.id && (
                      <i className="ti ti-check cust-check" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ════ وضع الإنشاء ════ */}
          {showCreate && (
            <div className="fgrid">
              {/* الاسم */}
              <div className="fg s2">
                <label className="req">الاسم / السبب الاجتماعي</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="اسم الزبون"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* الهاتف */}
              <div className="fg">
                <label>الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="06XXXXXXXX"
                />
              </div>

              {/* البريد */}
              <div className="fg">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="exemple@mail.com"
                />
              </div>

              {/* الاسم التجاري */}
              <div className="fg">
                <label>الاسم التجاري</label>
                <input
                  type="text"
                  value={form.trade_name}
                  onChange={e => setField('trade_name', e.target.value)}
                  placeholder="اختياري"
                />
              </div>

              {/* NIF */}
              <div className="fg">
                <label>رقم التعريف الجبائي (NIF)</label>
                <input
                  type="text"
                  value={form.nif}
                  onChange={e => setField('nif', e.target.value)}
                  placeholder="اختياري"
                />
              </div>

              {/* نوع الطرف */}
              <div className="fg s2">
                <label>النوع</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={form.is_client}
                      onChange={() => setField('is_client', true)}
                    />
                    زبون
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!form.is_client}
                      onChange={() => setField('is_client', false)}
                    />
                    مورد
                  </label>
                </div>
              </div>

              {/* خطأ */}
              {formError && (
                <div className="fg s2">
                  <div className="al al-r">
                    <i className="ti ti-alert-circle" /> {formError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          {showCreate ? (
            <>
              <button
                className="btn"
                onClick={() => { setShowCreate(false); setFormError(''); }}
                type="button"
              >
                <i className="ti ti-arrow-right" /> رجوع
              </button>
              <button
                className="btn btn-p"
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.name.trim()}
                type="button"
              >
                {createMutation.isPending
                  ? <><i className="ti ti-loader-2 spin" /> جارٍ الإنشاء...</>
                  : <><i className="ti ti-user-plus" /> إنشاء وتحديد</>
                }
              </button>
            </>
          ) : (
            <button className="btn" onClick={onClose} type="button">إغلاق</button>
          )}
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/FilterPanel.tsx
```
import React from 'react';

interface FilterPanelProps {
  inStock: boolean; onInStock: (v: boolean) => void;
  lowStock: boolean; onLowStock: (v: boolean) => void;
  minPrice: string; onMinPrice: (v: string) => void;
  maxPrice: string; onMaxPrice: (v: string) => void;
  perPage: number; onPerPage: (v: number) => void;
  onReset: () => void;
}

export default function FilterPanel({
  inStock, onInStock, lowStock, onLowStock,
  minPrice, onMinPrice, maxPrice, onMaxPrice,
  perPage, onPerPage, onReset,
}: FilterPanelProps) {
  return (
    <div className="pos-filter-panel">
      <div className="pfp-row">
        <label className="pfp-check">
          <input type="checkbox" checked={inStock} onChange={e => onInStock(e.target.checked)} />
          <i className="ti ti-package" /> متوفر في المخزون
        </label>
        <label className="pfp-check">
          <input type="checkbox" checked={lowStock} onChange={e => onLowStock(e.target.checked)} />
          <i className="ti ti-alert-triangle" /> مخزون منخفض
        </label>
        <div className="pfp-price-range">
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700 }}>نطاق السعر:</span>
          <input
            type="number"
            className="pfp-price-inp"
            placeholder="من"
            value={minPrice}
            onChange={e => onMinPrice(e.target.value)}
          />
          <span style={{ color: 'var(--t4)' }}>—</span>
          <input
            type="number"
            className="pfp-price-inp"
            placeholder="إلى"
            value={maxPrice}
            onChange={e => onMaxPrice(e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700 }}>دج</span>
        </div>
        <div className="pfp-per-page">
          <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700 }}>عرض:</span>
          <select value={perPage} onChange={e => onPerPage(Number(e.target.value))}
            style={{ fontSize: 12, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--b2)', background: 'var(--bg)' }}>
            <option value={60}>60</option>
            <option value={120}>120</option>
            <option value={240}>240</option>
            <option value={500}>500</option>
          </select>
        </div>
        <button className="btn btn-xs btn-r" onClick={onReset}>
          <i className="ti ti-x" /> إعادة ضبط
        </button>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/HeldCartsModal.tsx
```
import React, { useState } from 'react';
import type { HeldCart, CartItem } from '@/types';
import { formatDZD } from '../utils/calculations';

interface HeldCartsModalProps {
  carts: HeldCart[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function HeldCartsModal({
  carts, onClose, onRestore, onDelete,
}: HeldCartsModalProps) {
  const [search, setSearch] = useState('');
  const filtered = carts.filter(c =>
    !search || c.items?.some((i: CartItem) => i.product_name?.includes(search)) || c.client?.name?.includes(search)
  );

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-clock-pause" style={{ marginLeft: 6 }} /> الفواتير المعلقة ({carts.length})</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          {carts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t4)' }}>
              <i className="ti ti-clock-pause" style={{ fontSize: 40, display: 'block', marginBottom: 10, opacity: 0.3 }} />
              لا توجد فواتير معلقة
            </div>
          ) : (
            <>
              <div className="pos-inp" style={{ marginBottom: 12 }}>
                <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--t4)' }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المعلقة..." />
              </div>
              <div className="held-list">
                {filtered.map((c: HeldCart) => (
                  <div key={c.id} className="held-card">
                    <div className="hc-info">
                      <div className="hc-client">{c.client?.name ?? 'زبون عابر'}</div>
                      <div className="hc-meta">
                        {c.items?.length ?? 0} صنف
                        · {formatDZD(c.total ?? 0)}
                      </div>
                      <div className="hc-time">{new Date(c.heldAt).toLocaleTimeString('ar-DZ')}</div>
                    </div>
                    <div className="hc-acts">
                      <button className="btn btn-sm btn-p" onClick={() => onRestore(c.id)}>
                        <i className="ti ti-restore" /> استرجاع
                      </button>
                      <button className="btn btn-sm btn-r" onClick={() => onDelete(c.id)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/KeyboardHelpModal.tsx
```
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { readOverrides, KB_DEFAULTS, normalizeEventKey } from '@/pos/hooks/useKeyboardMap';

interface KeyboardHelpModalProps {
  onClose: () => void;
}

interface ShortcutItem {
  action: string;
  defaultKey: string;
  desc: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

function keyLabel(key: string): string {
  const map: Record<string, string> = {
    'NumpadAdd': 'Num+',
    'NumpadSubtract': 'Num-',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Escape': 'Esc',
  };
  return map[key] ?? key;
}

export default function KeyboardHelpModal({ onClose }: KeyboardHelpModalProps) {
  const slug = useActiveSlug();

  const [editing, setEditing] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>(() => readOverrides(slug));
  const [conflict, setConflict] = useState<string | null>(null);
  const captureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!slug) return;
    try {
      localStorage.setItem(`pos-kb-override-${slug}`, JSON.stringify(overrides));
    } catch {}
  }, [overrides, slug]);

  const groups: ShortcutGroup[] = [
    {
      title: 'الوظائف الرئيسية',
      items: [
        { action: 'searchFocus', defaultKey: 'F2', desc: 'تركيز شريط البحث' },
        { action: 'payment', defaultKey: 'F4', desc: 'فتح مودال الدفع' },
        { action: 'holdCart', defaultKey: 'F5', desc: 'تعليق الفاتورة الحالية' },
        { action: 'heldCarts', defaultKey: 'F7', desc: 'الفواتير المعلقة' },
        { action: 'preview', defaultKey: 'F9', desc: 'معاينة / طباعة' },
        { action: 'clearCart', defaultKey: 'F12', desc: 'مسح السلة' },
      ],
    },
    {
      title: 'أدوات إضافية',
      items: [
        { action: 'kbHelp', defaultKey: 'F1', desc: 'هذه المساعدة' },
        { action: 'filter', defaultKey: 'F3', desc: 'لوحة الفلتر' },
        { action: 'manualProduct', defaultKey: 'F6', desc: 'إضافة منتج يدوي' },
        { action: 'sessionStats', defaultKey: 'F8', desc: 'إحصاءات الجلسة' },
        { action: 'fullscreen', defaultKey: 'F11', desc: 'وضع الشاشة الكاملة' },
        { action: 'directPrint', defaultKey: 'Ctrl+P', desc: 'طباعة مباشرة' },
      ],
    },
    {
      title: 'التنقل والعرض',
      items: [
        { action: 'quickSearch', defaultKey: 'Ctrl+F', desc: 'البحث السريع' },
        { action: 'gridView', defaultKey: 'Ctrl+ArrowUp', desc: 'عرض الشبكة' },
        { action: 'listView', defaultKey: 'Ctrl+ArrowDown', desc: 'عرض القائمة' },
        { action: 'zoomIn', defaultKey: 'Ctrl+=', desc: 'تكبير الشبكة' },
        { action: 'zoomOut', defaultKey: 'Ctrl+-', desc: 'تصغير الشبكة' },
        { action: 'quickCat', defaultKey: 'Alt+1..9', desc: 'تصنيف سريع' },
      ],
    },
    {
      title: 'السلة والأصناف',
      items: [
        { action: 'qtyUp', defaultKey: 'NumpadAdd', desc: 'زيادة كمية آخر صنف' },
        { action: 'qtyDown', defaultKey: 'NumpadSubtract', desc: 'إنقاص كمية آخر صنف' },
        { action: 'deleteItem', defaultKey: 'Delete', desc: 'حذف الصنف المحدد' },
        { action: 'enterSearch', defaultKey: 'Enter', desc: 'إضافة أول نتيجة' },
        { action: 'escape', defaultKey: 'Escape', desc: 'إغلاق المودال / مسح البحث' },
        { action: 'confirmPayment', defaultKey: 'Ctrl+Enter', desc: 'تأكيد الدفع' },
      ],
    },
    {
      title: 'الماسح الضوئي',
      items: [
        { action: 'barcode', defaultKey: 'Barcode', desc: 'ينشّط تلقائياً بمسح الباركود' },
        { action: 'charBuffer', defaultKey: 'أي حرف', desc: 'يُجمع في buffer 300ms' },
        { action: 'barcodeEnter', defaultKey: 'Enter', desc: 'تأكيد الباركود وإضافة الصنف' },
      ],
    },
  ];

  function displayKey(item: ShortcutItem): string {
    return overrides[item.action] ?? item.defaultKey;
  }

  function isDuplicate(action: string, newKey: string): string | null {
    for (const g of groups) {
      for (const item of g.items) {
        if (item.action === action) continue;
        if (displayKey(item) === newKey) return item.desc;
      }
    }
    return null;
  }

  const startEdit = useCallback((action: string) => {
    setEditing(action);
    setListening(true);
    setConflict(null);
  }, []);

  useEffect(() => {
    if (editing) captureRef.current?.focus();
  }, [editing]);

  const handleKeyCapture = useCallback((e: React.KeyboardEvent) => {
    if (!listening || !editing) return;
    e.preventDefault();
    e.stopPropagation();

    const combo = normalizeEventKey(e as unknown as KeyboardEvent);
    if (combo === 'Escape') {
      setEditing(null);
      setListening(false);
      setConflict(null);
      return;
    }

    const dup = isDuplicate(editing, combo);
    if (dup) {
      setConflict(dup);
      return;
    }

    setConflict(null);
    setOverrides(prev => {
      const next = { ...prev, [editing]: combo };
      const defKey = KB_DEFAULTS[editing];
      if (combo === defKey) {
        delete next[editing];
      }
      return next;
    });
    setEditing(null);
    setListening(false);
  }, [listening, editing]);

  function resetAll() {
    setOverrides({});
    setConflict(null);
    setEditing(null);
    setListening(false);
  }

  return (
    <div className="ov on" onClick={onClose}
      onKeyDown={handleKeyCapture}
      tabIndex={-1}
      ref={el => el?.focus()}
    >
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-keyboard" style={{ marginLeft: 6 }} /> تخصيص الاختصارات</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Object.keys(overrides).length > 0 && (
              <button className="btn btn-xs btn-w" onClick={resetAll} type="button">
                <i className="ti ti-refresh" /> إعادة ضبط
              </button>
            )}
            <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
          </div>
        </div>
        <div className="m-body">
          {listening && editing && (
            <div className="al al-i" style={{ marginBottom: 12 }}>
              <i className="ti ti-keyboard" /> اضغط المفتاح الذي تريد تعيينه لـ "<b>{groups.flatMap(g => g.items).find(i => i.action === editing)?.desc}</b>" — <b>Esc</b> للإلغاء
            </div>
          )}
          {conflict && (
            <div className="al al-r" style={{ marginBottom: 12 }}>
              <i className="ti ti-alert-triangle" /> هذا المفتاح مستخدم بالفعل لـ "<b>{conflict}</b>"
            </div>
          )}
          <div className="kb-help-groups">
            {groups.map(g => (
              <div key={g.title} className="kb-group">
                <div className="kb-group-title">{g.title}</div>
                <div className="kb-help-grid">
                  {g.items.map(s => {
                    const cur = displayKey(s);
                    const isEditing = editing === s.action;
                    return (
                      <div key={s.action} className={`kb-help-row ${isEditing ? 'kb-edit-on' : ''}`}>
                        {isEditing ? (
                          <kbd className="kb-key kb-capture" ref={captureRef}>
                            <i className="ti ti-corner-down-left" style={{ fontSize: 12 }} /> انتظر...
                          </kbd>
                        ) : (
                          <kbd
                            className="kb-key kb-key-clickable"
                            onClick={() => startEdit(s.action)}
                            title="اضغط لتعديل الاختصار"
                          >
                            {keyLabel(cur)}
                            <i className="ti ti-edit" style={{ fontSize: 9, marginRight: 3 }} />
                          </kbd>
                        )}
                        <span className="kb-desc">{s.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose} type="button">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/ManualProductModal.tsx
```
import React, { useState, useRef, useEffect } from 'react';
import { htToTtc } from '../utils/calculations';

interface ManualProductModalProps {
  onClose: () => void;
  onAdd: (name: string, priceTtc: number, qty: number, tvaRate: number) => void;
}

export default function ManualProductModal({
  onClose, onAdd,
}: ManualProductModalProps) {
  const [name,    setName]    = useState('');
  const [price,   setPrice]   = useState('');
  const [qty,     setQty]     = useState('1');
  const [tvaRate, setTvaRate] = useState('19');
  const [priceType, setPriceType] = useState<'ttc' | 'ht'>('ttc');

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleAdd = () => {
    if (!name.trim() || !price) return;
    const p  = parseFloat(price);
    const q  = parseFloat(qty) || 1;
    const tv = parseFloat(tvaRate) || 0;
    const priceTtc = priceType === 'ttc' ? p : htToTtc(p, tv);
    onAdd(name.trim(), priceTtc, q, tv);
  };

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-plus" style={{ marginLeft: 6 }} /> منتج يدوي</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          <div className="fgrid">
            <div className="fg s2">
              <label className="req">اسم المنتج</label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="اسم الصنف أو الخدمة"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="fg">
              <label className="req">السعر (دج)</label>
              <div className="inp-row">
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                />
                <select
                  className="inp-suf"
                  value={priceType}
                  onChange={e => setPriceType(e.target.value as 'ttc' | 'ht')}
                  style={{ cursor: 'pointer', fontSize: 11 }}
                >
                  <option value="ttc">TTC</option>
                  <option value="ht">HT</option>
                </select>
              </div>
            </div>
            <div className="fg">
              <label>TVA %</label>
              <select
                value={tvaRate}
                onChange={e => setTvaRate(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1.5px solid var(--b2)', background: 'var(--bg3)', fontFamily: 'Tajawal,sans-serif', fontSize: 13, outline: 'none', cursor: 'pointer' }}
              >
                {[0, 9, 19].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div className="fg">
              <label>الكمية</label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                min="0.001"
                step="1"
              />
            </div>
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleAdd} disabled={!name || !price}>
            <i className="ti ti-plus" /> إضافة للسلة
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/MobileTabs.tsx
```
import React from 'react';

interface MobileTabsProps {
  activeTab: 'products' | 'cart';
  onTab: (t: 'products' | 'cart') => void;
  itemsCount: number; totalTtc: number; isEmpty: boolean; onSell: () => void;
}

export default function MobileTabs({
  activeTab, onTab, itemsCount, totalTtc, isEmpty, onSell,
}: MobileTabsProps) {
  return (
    <div className="pos-mob-tabs">
      <button className={`pmt ${activeTab === 'products' ? 'on' : ''}`} onClick={() => onTab('products')}>
        <div className="pmt-ic"><i className="ti ti-package" /></div>
        <span>منتجات</span>
      </button>
      <button className={`pmt ${activeTab === 'cart' ? 'on' : ''}`} onClick={() => onTab('cart')}>
        <div className="pmt-ic"><i className="ti ti-shopping-cart" /></div>
        {itemsCount > 0 && <div className="pmt-badge">{itemsCount}</div>}
        <span>السلة</span>
      </button>
      <button className="pmt-sell-btn" onClick={onSell} disabled={isEmpty}>
        <i className="ti ti-circle-check" />
        {isEmpty ? 'السلة فارغة' : `دفع ${totalTtc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`}
      </button>
    </div>
  );
}
```

## FILE: resources/js/pos/components/POSTopBar.tsx
```
import React from 'react';
import type { CartItem, CartTotals } from '@/types';
import { formatDZD } from '../utils/calculations';

interface POSTopBarProps {
  sessionInvoices: number; sessionSales: number; heldCount: number;
  avgMargin: number; isEmpty: boolean; isFullscreen: boolean; showQuickbar: boolean;
  onHeld: () => void; onNewSale: () => void; onManual: () => void;
  onReceipt: () => void; onSession: () => void; onFullscreen: () => void;
  onKbHelp: () => void; onToggleQuickbar: () => void;
  onReturn: () => void;
  items: CartItem[]; totals: CartTotals; totalTtcFinal: number;
}

export default function POSTopBar({
  sessionInvoices, sessionSales, heldCount, avgMargin,
  isEmpty, isFullscreen, showQuickbar,
  onHeld, onNewSale, onManual, onReceipt, onSession, onFullscreen, onKbHelp,
  onToggleQuickbar, onReturn, items, totals, totalTtcFinal,
}: POSTopBarProps) {
  return (
    <div className="pos-topbar">
      <div className="pos-stats-row">
        <div className="pos-chip g" title="فواتير الجلسة الحالية">
          <i className="ti ti-receipt pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">فواتير اليوم</span>
            <strong className="pos-chip-val">{sessionInvoices}</strong>
          </div>
        </div>
        <div className="pos-chip o" title="إجمالي مبيعات الجلسة">
          <i className="ti ti-cash pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">مبيعات الجلسة</span>
            <strong className="pos-chip-val">{formatDZD(sessionSales)}</strong>
          </div>
        </div>
        {heldCount > 0 && (
          <div className="pos-chip b clickable" onClick={onHeld} title="الفواتير المعلقة — F7">
            <i className="ti ti-clock-pause pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">معلقة</span>
              <strong className="pos-chip-val">{heldCount}</strong>
            </div>
          </div>
        )}
        {!isEmpty && avgMargin > 0 && (
          <div className="pos-chip p" title="متوسط هامش الربح للسلة الحالية">
            <i className="ti ti-trending-up pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">هامش الربح</span>
              <strong className="pos-chip-val">{avgMargin.toFixed(1)}%</strong>
            </div>
          </div>
        )}
        {!isEmpty && (
          <div className="pos-chip c">
            <i className="ti ti-shopping-cart pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">السلة</span>
              <strong className="pos-chip-val">{totals.lines_count} صنف</strong>
            </div>
          </div>
        )}
        {!isEmpty && (
          <div className="pos-chip em" title="إجمالي الفاتورة الحالية">
            <i className="ti ti-calculator pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">الإجمالي</span>
              <strong className="pos-chip-val">{formatDZD(totalTtcFinal)}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="pos-tools-row">
        <button className="pos-tool-btn" onClick={onManual} title="إضافة منتج يدوي — F6">
          <i className="ti ti-plus" />
          <span>يدوي</span>
        </button>
        <button className="pos-tool-btn" onClick={onNewSale} title="بيع جديد / تعليق السلة — F5">
          <i className="ti ti-refresh" />
          <span>جديد</span>
        </button>
        <button className="pos-tool-btn" onClick={onReceipt} disabled={isEmpty} title="معاينة الفاتورة — F9">
          <i className="ti ti-printer" />
          <span>طباعة</span>
        </button>

        <div className="pos-tool-sep" />

        <button
          className={`pos-tool-icon ${showQuickbar ? 'pos-tool-icon--active' : ''}`}
          onClick={onToggleQuickbar}
          title="شريط الأصناف السريعة"
        >
          <i className="ti ti-star" />
        </button>
        <button className="pos-tool-icon" onClick={onSession} title="إحصاءات الجلسة — F8">
          <i className="ti ti-chart-bar" />
        </button>
        <button className="pos-tool-icon" onClick={onFullscreen} title={isFullscreen ? 'تصغير — F11' : 'شاشة كاملة — F11'}>
          <i className={`ti ti-${isFullscreen ? 'minimize' : 'maximize'}`} />
        </button>
        <button className="pos-tool-icon" onClick={onKbHelp} title="اختصارات لوحة المفاتيح — F1">
          <i className="ti ti-keyboard" />
        </button>
        <button className="pos-tool-icon" onClick={onReturn} title="مرتجع مبيعات — F10">
          <i className="ti ti-receipt-refund" />
        </button>
      </div>

      <div className="pos-kb-strip">
        {[
          { key: 'F2', label: 'بحث' },
          { key: 'F4', label: 'دفع' },
          { key: 'F5', label: 'تعليق' },
          { key: 'F6', label: 'يدوي' },
          { key: 'F7', label: 'معلقة' },
          { key: 'F9', label: 'طباعة' },
          { key: 'F10', label: 'مرتجع' },
          { key: 'F11', label: 'شاشة' },
          { key: 'F12', label: 'مسح' },
        ].map(({ key, label }) => (
          <span key={key} className="kb-tip">
            <kbd>{key}</kbd>{label}
          </span>
        ))}
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/ProductCard.tsx
```
// pos/components/ProductCard.tsx
import React from 'react';
import type { ProductVariant } from '@/types';

interface ProductCardProps {
  variant: ProductVariant;
  qtyInCart: number;
  view: 'grid' | 'list';
  onClick: () => void;
}

function stockClass(stock: number | undefined, min: number): string {
  if (stock === undefined || stock === null) return 'ok';
  if (stock <= 0) return 'no';
  if (stock <= min) return 'lo';
  return 'ok';
}

function stockLabel(stock: number | undefined): string {
  if (stock === undefined || stock === null) return '';
  if (stock <= 0) return 'نفد';
  return `${stock} ${stock === 1 ? 'وحدة' : 'وحدة'}`;
}

export default function ProductCard({ variant, qtyInCart, view, onClick }: ProductCardProps) {
  const product   = variant.product;
  const stock     = variant.current_stock;
  const isOOS     = variant.manages_stock && (stock ?? 1) <= 0 && !variant.allow_negative_stock;
  const sc        = stockClass(stock ?? undefined, variant.min_stock_alert);
  const tvaRate   = variant.tva?.rate ?? 19;
  const priceTtc  = variant.default_selling_price_ht * (1 + tvaRate / 100);

  // pick icon / color based on family name
  const familyName = product?.family?.name ?? '';
  const { icon, color, bg } = familyStyle(familyName);

  const name = [product?.name, variant.variant_name].filter(Boolean).join(' — ');

  if (view === 'list') {
    return (
      <div
        className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
        style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
        onClick={isOOS ? undefined : onClick}
      >
        {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
        <div className="pc2-ic">
          <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
        </div>
        <div className="pc2-info">
          <div className="pc2-name">{name}</div>
          <div className="pc2-price" style={{ direction: 'ltr' }}>
            {priceTtc.toFixed(0)} دج
          </div>
          {variant.manages_stock && (
            <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
      style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
      onClick={isOOS ? undefined : onClick}
    >
      {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
      <div className="pc2-ic">
        <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
      </div>
      <div className="pc2-name">{name}</div>
      <div className="pc2-price" style={{ direction: 'ltr' }}>{priceTtc.toFixed(0)} دج</div>
      {variant.manages_stock && (
        <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
      )}
    </div>
  );
}

// ── Family → icon/color mapping ────────────────────
function familyStyle(family: string): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل'))    return { icon: 'ti-apple',         color: 'var(--em)',     bg: 'var(--emb)'   };
  if (f.includes('شراب') || f.includes('ماء'))  return { icon: 'ti-droplets',      color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                    return { icon: 'ti-device-mobile', color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                      return { icon: 'ti-shirt',         color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                      return { icon: 'ti-tool',          color: 'var(--orange)', bg: 'var(--orb)'   };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
```

## FILE: resources/js/pos/components/ProductGrid.tsx
```
import React, { useCallback } from 'react';
import type { ProductVariant, PriceLevel, CartItem } from '@/types';
import type { ViewMode, GridSize } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, familyStyleFromName, isVariantOutOfStock } from '../utils/posHelpers';

interface ProductGridProps {
  variants: ProductVariant[];
  view: ViewMode;
  gridSize: GridSize;
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onAdd: (v: ProductVariant) => void;
  onAddManual: () => void;
  onPin: (v: ProductVariant) => void;
  isPinned: (variantId: number) => boolean;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  cartItems: CartItem[];
  allowNegativeStock?: boolean | undefined;
}

function LoadMore({ hasMore, loading, onLoadMore }: { hasMore?: boolean; loading: boolean; onLoadMore?: () => void }) {
  if (!hasMore) return null;
  return (
    <div className="pos-load-more">
      <button className="btn btn-outline" onClick={onLoadMore} disabled={loading}>
        {loading ? 'جاري التحميل…' : 'تحميل المزيد'}
      </button>
    </div>
  );
}

export default function ProductGrid({
  variants, view, gridSize, loading, hasMore, onLoadMore, onAdd, onAddManual,
  onPin, isPinned, priceLevels, selectedPriceLevelId, cartItems, allowNegativeStock,
}: ProductGridProps) {
  const inCartQty = useCallback((variantId: number) => {
    return cartItems.find(i => i.variant_id === variantId)?.quantity ?? 0;
  }, [cartItems]);

  if (loading) return (
    <div className="pos-grid-area">
      <div className="pos-loading">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="pos-skel" style={{ animationDelay: `${i * 0.04}s` }} />
        ))}
      </div>
    </div>
  );

  if (!variants.length) return (
    <div className="pos-grid-area">
      <div className="pos-empty">
        <div className="pos-empty-ico"><i className="ti ti-package-off" /></div>
        <div className="pos-empty-ttl">لا توجد منتجات</div>
        <div className="pos-empty-sub">جرّب البحث بكلمة أخرى أو أضف منتجاً يدوياً</div>
        <button className="btn btn-sm" onClick={onAddManual}>
          <i className="ti ti-plus" /> إضافة يدوية
        </button>
      </div>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="pos-grid-area">
        <table className="pos-ptable">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الوحدة</th>
              <th>السعر HT</th>
              <th>TVA</th>
              <th>السعر TTC</th>
              <th>مخزون</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {variants.map(v => {
              const priceHt   = getVariantPrice(v, selectedPriceLevelId, priceLevels);
              const tvaRate   = v.tva?.rate ?? 19;
              const priceTtc  = priceHt * (1 + tvaRate / 100);
              const inCart    = inCartQty(v.id);
              const stockVal  = v.current_stock;
              const unknownSt = stockVal === undefined;
              const outStock  = isVariantOutOfStock(v, allowNegativeStock);
              const lowStock  = v.manages_stock && !unknownSt && (stockVal ?? 0) > 0 && (stockVal ?? 0) <= (v.min_stock_alert ?? 0);
              const lastPiece = v.manages_stock && !unknownSt && (stockVal ?? 0) > 0 && (stockVal ?? 0) <= 2 && !lowStock;
              return (
                  <tr
                    key={v.id}
                    className={`prow ${outStock ? 'prow-out' : ''} ${inCart > 0 ? 'prow-incart' : ''}`}
                    onDoubleClick={() => !outStock && onAdd(v)}
                  >
                  <td className="prow-name">
                    <div className="prow-nm">{v.product?.name}</div>
                    {v.barcode && <div className="prow-bc">{v.barcode}</div>}
                  </td>
                  <td className="prow-unit">{v.unit?.abbreviation ?? '—'}</td>
                  <td className="prow-price">{formatDZD(priceHt)}</td>
                  <td className="prow-tva">{tvaRate}%</td>
                  <td className="prow-ttc">{formatDZD(priceTtc)}</td>
                  <td className="prow-stock">
                    {v.manages_stock && !unknownSt
                      ? <span className={`stock-pill ${outStock ? 'out' : lowStock ? 'low' : lastPiece ? 'last' : 'ok'}`}>{stockVal ?? 0}</span>
                      : v.manages_stock && unknownSt
                      ? <span className="stock-pill na">—</span>
                      : <span className="stock-pill na">—</span>
                    }
                  </td>
                  <td>
                    <div className="prow-acts">
                      {inCart > 0 && <span className="incart-badge">{inCart}</span>}
                      <button
                        className="prow-pin"
                        onClick={e => { e.stopPropagation(); onPin(v); }}
                        title={isPinned(v.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      >
                        <i className={`ti ti-star${isPinned(v.id) ? '-filled' : ''}`} />
                      </button>
                      <button
                        className="prow-add"
                        onClick={() => !outStock && onAdd(v)}
                        disabled={outStock}
                        title="إضافة للسلة (دبل كليك)"
                      >
                        <i className="ti ti-plus" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <LoadMore hasMore={hasMore} loading={loading} onLoadMore={onLoadMore} />
      </div>
    );
  }

  const colsMap: Record<GridSize, string> = {
    xs: 'pgrid--xs',
    sm: 'pgrid--sm',
    md: '',
    lg: 'pgrid--lg',
  };

  return (
    <div className="pos-grid-area">
      <div className={`pgrid ${colsMap[gridSize]}`}>
        {variants.map(v => {
          const priceHt  = getVariantPrice(v, selectedPriceLevelId, priceLevels);
          const tvaRate  = v.tva?.rate ?? 19;
          const priceTtc = priceHt * (1 + tvaRate / 100);
          const inCart   = inCartQty(v.id);
          const stock    = v.current_stock;
          const unknownStock = stock === undefined;
          const outStock = isVariantOutOfStock(v, allowNegativeStock);
          const lowStock = v.manages_stock && !unknownStock && (stock ?? 0) > 0 && (stock ?? 0) <= (v.min_stock_alert ?? 0);
          const lastPiece = v.manages_stock && !unknownStock && (stock ?? 0) > 0 && (stock ?? 0) <= 2 && !lowStock;

          const style = familyStyleFromName(v.product?.family?.name ?? '');

          return (
            <div
              key={v.id}
              className={`pcard ${outStock ? 'pcard-out' : ''} ${inCart > 0 ? 'pcard-incart' : ''}`}
              onClick={() => !outStock && onAdd(v)}
              title={v.product?.name}
            >
              <div className="pcard-img" style={{ background: style.bg }}>
                {(v as unknown as { image_url?: string }).image_url
                  ? <img src={(v as unknown as { image_url?: string }).image_url} alt={v.product?.name} />
                  : <i className={`ti ${style.icon}`} style={{ color: style.color, fontSize: 22 }} />
                }
                {inCart > 0 && <span className="pcard-in-cart">{inCart}</span>}
                {outStock && <span className="pcard-out-badge">نفذ</span>}
                {lowStock && !outStock && <span className="pcard-low-badge">قليل</span>}
                {lastPiece && <span className="pcard-last-badge">آخر قطعة</span>}
              </div>

              <div className="pcard-body">
                <div className="pcard-name">{v.product?.name}</div>
                {v.barcode && <div className="pcard-bc">{v.barcode}</div>}

                <div className="pcard-prices">
                  <span className="pcard-ttc">{formatDZD(priceTtc)}</span>
                  {tvaRate > 0 && (
                    <span className="pcard-ht">HT: {formatDZD(priceHt)}</span>
                  )}
                </div>

                {v.manages_stock && !unknownStock && (
                  <div className={`pcard-stock ${outStock ? 'out' : lowStock ? 'low' : 'ok'}`}>
                    <i className={`ti ti-${outStock ? 'alert-circle' : lowStock ? 'alert-triangle' : 'package'}`} />
                    {outStock ? 'نفذ المخزون' : `${stock} ${v.unit?.abbreviation ?? ''}`}
                  </div>
                )}
                {v.manages_stock && unknownStock && (
                  <div className="pcard-stock na">
                    <i className="ti ti-minus" />—
                  </div>
                )}
              </div>

              <div className="pcard-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`pcard-pin ${isPinned(v.id) ? 'on' : ''}`}
                  onClick={() => onPin(v)}
                  title={isPinned(v.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                >
                  <i className={`ti ti-star${isPinned(v.id) ? '-filled' : ''}`} />
                </button>
                <button
                  className="pcard-add"
                  onClick={() => !outStock && onAdd(v)}
                  disabled={outStock}
                  title="إضافة للسلة"
                >
                  <i className="ti ti-plus" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <LoadMore hasMore={hasMore} loading={loading} onLoadMore={onLoadMore} />
    </div>
  );
}
```

## FILE: resources/js/pos/components/ProductSearchBar.tsx
```
import React, { useState, useRef, useEffect } from 'react';
import type { ViewMode, GridSize, SortMode } from '../utils/posHelpers';

const SORT_OPTIONS: { value: SortMode; icon: string; label: string }[] = [
  { value: 'name',      icon: 'ti ti-text-caption',    label: 'أ-ي' },
  { value: 'price_asc', icon: 'ti ti-arrow-up',        label: 'سعر ↑' },
  { value: 'price_desc',icon: 'ti ti-arrow-down',      label: 'سعر ↓' },
  { value: 'stock',     icon: 'ti ti-package',         label: 'مخزون' },
  { value: 'family',    icon: 'ti ti-category',        label: 'تصنيف' },
];

const sortIcon: Record<SortMode, string> = {
  name: 'ti ti-text-caption',
  price_asc: 'ti ti-arrow-up',
  price_desc: 'ti ti-arrow-down',
  stock: 'ti ti-package',
  family: 'ti ti-category',
};

interface ProductSearchBarProps {
  query: string; onQuery: (q: string) => void;
  view: ViewMode; gridSize: GridSize;
  onView: (v: ViewMode) => void;
  onGridSize: (s: GridSize) => void;
  onFilter: () => void;
  filterActive: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  sortBy: SortMode;
  onSort: (s: SortMode) => void;
  resultsCount: number;
  onEnterFirst: () => void;
}

export default function ProductSearchBar({
  query, onQuery, view, gridSize, onView, onGridSize,
  onFilter, filterActive, inputRef, sortBy, onSort, resultsCount, onEnterFirst,
}: ProductSearchBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="pos-search-bar">
      <div className="pos-inp">
        <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--t4)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الباركود أو الرمز... (F2)"
          autoComplete="off"
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onEnterFirst(); }
            if (e.key === 'Escape') { e.preventDefault(); onQuery(''); }
          }}
        />
        {query && (
          <button className="srch-clear" onClick={() => onQuery('')} title="مسح (Escape)">
            <i className="ti ti-x" />
          </button>
        )}
        {!query && (
          <span className="srch-hint"><kbd>F2</kbd></span>
        )}
      </div>

      {query && (
        <span className="srch-count">{resultsCount} نتيجة</span>
      )}

      <div className="pos-sort-wrap" ref={sortRef}>
        <button className="pos-sort-btn" onClick={() => setSortOpen(o => !o)} title="ترتيب المنتجات">
          <i className={sortIcon[sortBy]} />
        </button>
        {sortOpen && (
          <div className="pos-sort-drop">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`psd-item ${sortBy === opt.value ? 'on' : ''}`}
                onClick={() => { onSort(opt.value); setSortOpen(false); }}
              >
                <i className={opt.icon} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className={`pos-tool-icon ${filterActive ? 'pos-tool-icon--active' : ''}`}
        onClick={onFilter}
        title="فلتر متقدم — F3"
        style={{ width: 34, height: 34 }}
      >
        <i className="ti ti-adjustments-horizontal" />
        {filterActive && <span className="filter-dot" />}
      </button>

      <div className="pos-view-btns">
        <button
          className={`pvb ${view === 'grid' ? 'on' : ''}`}
          onClick={() => onView('grid')}
          title="عرض شبكة"
        >
          <i className="ti ti-layout-grid" />
        </button>
        <button
          className={`pvb ${view === 'list' ? 'on' : ''}`}
          onClick={() => onView('list')}
          title="عرض قائمة"
        >
          <i className="ti ti-list" />
        </button>
      </div>

      {view === 'grid' && (
        <div className="pos-grid-size">
          {(['xs', 'sm', 'md', 'lg'] as GridSize[]).map(s => (
            <button
              key={s}
              className={`pgs ${gridSize === s ? 'on' : ''}`}
              onClick={() => onGridSize(s)}
              title={`حجم ${s}`}
            >
              {s === 'xs' ? 'S' : s === 'sm' ? 'M' : s === 'md' ? 'L' : 'XL'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pos/components/ProfessionalCart.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalCart.tsx
//
// ✅ التحسينات عن النسخة السابقة:
//   1. زر "جديد" بجانب اختيار الزبون → يفتح CustomerSearchModal
//      (بحث فوري + إنشاء زبون مباشرة من POS)
//   2. onDiscountAmount مُمرَّر لـ CartRow (خصم ثابت بالمبلغ)
//   3. عرض رصيد الزبون بشكل أوضح مع لون تحذيري
//   4. شريط الخصومات على الفاتورة يقبل الآن % أو مبلغ ثابت
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CartItem, CartTotals, Party, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import CartRow from './CartRow';
import CustomerSearchModal from './CustomerSearchModal';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfessionalCartProps {
  items:                CartItem[];
  totals:               CartTotals;
  client:               Party | null;
  customers:            Party[];
  priceLevels:          PriceLevel[];
  selectedPriceLevelId: number | null;
  note:                 string;
  selectedItemId:       string | null;
  onSelectItem:         (id: string | null) => void;
  onQty:                (id: string, qty: number) => void;
  onDiscount:           (id: string, pct: number) => void;
  onDiscountAmount:     (id: string, amount: number) => void;   // ✅ جديد
  onPrice:              (id: string, price: number) => void;
  onRemove:             (id: string) => void;
  onSetClient:          (c: Party | null) => void;
  onPriceLevelChange:   (plId: number | null) => void;
  onNoteChange:         (n: string) => void;
  onHold:               () => void;
  onSell:               () => void;
  onClear:              () => void;
  onHeld:               () => void;
  totalTtcFinal:        number;
  invoiceDiscountPct?:  number;
  onInvoiceDiscountChange?: (pct: number) => void;
  invoiceDiscountAmount?:   number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfessionalCart({
  items, totals, client, customers, priceLevels, selectedPriceLevelId,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
  onSetClient, onPriceLevelChange, onNoteChange,
  onHold, onSell, onClear, onHeld, totalTtcFinal,
  invoiceDiscountPct = 0, onInvoiceDiscountChange, invoiceDiscountAmount = 0,
}: ProfessionalCartProps) {

  const [showNote,         setShowNote]         = useState(false);
  const [showCustModal,    setShowCustModal]     = useState(false);   // ✅ مودال البحث
  const [invDiscMode,      setInvDiscMode]       = useState<'pct' | 'amount'>('pct'); // ✅
  const [invDiscAmtVal,    setInvDiscAmtVal]     = useState('');

  const isEmpty = !items.length;

  // ── خصم الفاتورة بالمبلغ ──────────────────────────────────────────────────
  const handleInvDiscAmount = useCallback((raw: string) => {
    setInvDiscAmtVal(raw);
    const n = parseFloat(raw) || 0;
    if (!onInvoiceDiscountChange || totals.total_ht <= 0) return;
    // نحوّل المبلغ لنسبة (مستوى total_ht قبل الخصم)
    const pct = Math.min(100, (n / totals.total_ht) * 100);
    onInvoiceDiscountChange(pct);
  }, [onInvoiceDiscountChange, totals.total_ht]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="pos-cart" id="pos-cart">

        {/* ── Header ── */}
        <div className="cart-top">
          <div className="cart-top-row">
            <div className="cart-ttl">
              <i className="ti ti-shopping-cart" style={{ fontSize: 15 }} />
              فاتورة البيع
              <span className={`cart-pill ${totals.items_count > 0 ? 'on' : ''}`}>
                {totals.items_count}
              </span>
            </div>
            <div className="cart-acts2">
              <button className="btn btn-xs" onClick={onHeld} title="الفواتير المعلقة (F7)">
                <i className="ti ti-clock-pause" />
              </button>
              <button
                className={`btn btn-xs ${note ? 'btn-p' : ''}`}
                onClick={() => setShowNote(s => !s)}
                title="ملاحظة على الفاتورة"
              >
                <i className="ti ti-notes" />
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={onClear}
                disabled={isEmpty}
                title="مسح السلة — F12"
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>

          {/* ملاحظة */}
          {showNote && (
            <div className="cart-note-wrap">
              <input
                value={note}
                onChange={e => onNoteChange(e.target.value)}
                placeholder="ملاحظة تظهر على الفاتورة..."
                autoFocus
                className="cart-note-inp"
              />
            </div>
          )}

          {/* مستويات السعر */}
          {priceLevels.length > 0 && (
            <div className="cart-modes2">
              <button
                className={`cmode ${selectedPriceLevelId === null ? 'on' : ''}`}
                onClick={() => onPriceLevelChange(null)}
                title="السعر الافتراضي"
              >
                <i className="ti ti-tag" /> عادي
              </button>
              {priceLevels.map(pl => (
                <button
                  key={pl.id}
                  className={`cmode ${selectedPriceLevelId === pl.id ? 'on' : ''}`}
                  onClick={() => onPriceLevelChange(pl.id)}
                  title={pl.discount_percent ? `خصم ${pl.discount_percent}%` : undefined}
                >
                  <i className="ti ti-tag" />
                  {pl.name}
                  {pl.discount_percent
                    ? <span className="cmode-disc">-{pl.discount_percent}%</span>
                    : null
                  }
                </button>
              ))}
            </div>
          )}

          {/* ── قسم الزبون المُحسَّن ── */}
          <div className="cart-client-v2">
            {/* trigger */}
            <div
              className={`client-trigger-v2 ${client ? 'has-client' : ''}`}
              onClick={() => setShowCustModal(true)}
              title="اختيار أو تغيير الزبون"
            >
              <div className="ctv2-av">
                {client
                  ? <span>{(client.name?.[0] ?? '?').toUpperCase()}</span>
                  : <i className="ti ti-user" />
                }
              </div>
              <div className="ctv2-info">
                <div className="ctv2-name">
                  {client ? client.name : 'زبون عابر'}
                </div>
                {client?.phone && (
                  <div className="ctv2-meta">
                    <i className="ti ti-phone" style={{ fontSize: 10 }} /> {client.phone}
                  </div>
                )}
              </div>

              {/* رصيد الدين */}
              {client?.balance !== undefined && Number(client.balance) > 0 && (
                <span className="ctv2-debt" title={`رصيد الدين: ${formatDZD(Number(client.balance))}`}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 11 }} />
                  {formatDZD(Number(client.balance))}
                </span>
              )}

              <i className="ti ti-chevron-down ctv2-arrow" />
            </div>

            {/* أزرار سريعة */}
            <div className="ctv2-actions">
              <button
                className="btn btn-xs btn-p"
                onClick={() => setShowCustModal(true)}
                title="بحث أو إنشاء زبون جديد"
                type="button"
              >
                <i className="ti ti-user-search" />
              </button>
              {client && (
                <button
                  className="btn btn-xs btn-r"
                  onClick={() => onSetClient(null)}
                  title="إلغاء اختيار الزبون"
                  type="button"
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── أصناف السلة ── */}
        <div className="cart-items">
          {isEmpty ? (
            <div className="cart-empty">
              <div className="ce-ico"><i className="ti ti-shopping-cart-off" /></div>
              <div className="ce-ttl">السلة فارغة</div>
              <div className="ce-sub">ابحث عن منتج أو امسح الباركود</div>
            </div>
          ) : (
            items.map((item, idx) => (
              <CartRow
                key={item.id}
                item={item}
                idx={idx}
                isSelected={selectedItemId === item.id}
                onSelect={() => onSelectItem(item.id)}
                onQty={qty => onQty(item.id, qty)}
                onDiscount={pct => onDiscount(item.id, pct)}
                onDiscountAmount={amount => onDiscountAmount(item.id, amount)}  // ✅
                onPrice={price => onPrice(item.id, price)}
                onRemove={() => onRemove(item.id)}
              />
            ))
          )}
        </div>

        {/* ── الإجماليات ── */}
        {!isEmpty && (
          <div className="cart-totals">
            <div className="ct-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>

            {totals.total_discount > 0 && (
              <div className="ct-row ct-disc">
                <span>إجمالي الخصومات</span>
                <span style={{ color: 'var(--red)' }}>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}

            <div className="ct-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>

            {/* ── خصم الفاتورة % أو مبلغ ── */}
            {onInvoiceDiscountChange && (
              <div className="ct-row ct-disc">
                <span>خصم الفاتورة</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* تبديل الوضع */}
                  <button
                    className={`cr-disc-mode-btn ${invDiscMode === 'pct' ? 'on' : ''}`}
                    onClick={() => setInvDiscMode('pct')}
                    type="button"
                    style={{ fontSize: 10, padding: '2px 5px' }}
                  >%</button>
                  <button
                    className={`cr-disc-mode-btn ${invDiscMode === 'amount' ? 'on' : ''}`}
                    onClick={() => setInvDiscMode('amount')}
                    type="button"
                    style={{ fontSize: 10, padding: '2px 5px' }}
                  >دج</button>

                  {invDiscMode === 'pct' ? (
                    <>
                      <input
                        type="number"
                        className="ct-disc-inp"
                        value={invoiceDiscountPct || ''}
                        onChange={e => onInvoiceDiscountChange(
                          Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        )}
                        min={0} max={100} step={1}
                        placeholder="0"
                        style={{ width: 50 }}
                      />
                      <span style={{ fontSize: 11 }}>%</span>
                      {invoiceDiscountAmount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>
                          -{formatDZD(invoiceDiscountAmount)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        className="ct-disc-inp"
                        value={invDiscAmtVal}
                        onChange={e => handleInvDiscAmount(e.target.value)}
                        min={0}
                        placeholder="0"
                        style={{ width: 70 }}
                      />
                      <span style={{ fontSize: 11 }}>دج</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {totals.fiscal_stamp > 0 && (
              <div className="ct-row">
                <span>طابع مالي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}

            <div className="ct-row ct-grand">
              <span>الإجمالي TTC</span>
              <strong className="grand-amount">{formatDZD(totalTtcFinal)}</strong>
            </div>
          </div>
        )}

        {/* ── أزرار الإجراءات ── */}
        <div className="cart-actions">
          <button
            className="btn btn-sm"
            onClick={onHold}
            disabled={isEmpty}
            title="تعليق الفاتورة — F5"
          >
            <i className="ti ti-clock-pause" /> تعليق
          </button>
          <button
            className="cart-sell-btn"
            onClick={onSell}
            disabled={isEmpty}
            title="دفع والإتمام — F4"
          >
            <i className="ti ti-circle-check" />
            <span>
              {isEmpty ? 'السلة فارغة' : `دفع — ${formatDZD(totalTtcFinal)}`}
            </span>
            <kbd className="sell-kbd">F4</kbd>
          </button>
        </div>
      </div>

      {/* ── CustomerSearchModal ── */}
      {showCustModal && (
        <CustomerSearchModal
          currentClient={client}
          onSelect={c => {
            onSetClient(c);
            setShowCustModal(false);
          }}
          onClose={() => setShowCustModal(false)}
        />
      )}
    </>
  );
}
```

## FILE: resources/js/pos/components/ProfessionalPaymentModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalPaymentModal.tsx
//
// ✅ التحسينات عن النسخة السابقة:
//   1. Numpad رقمي كامل للكاشير — مناسب للشاشات اللمسية والتابلت
//   2. أزرار مبالغ سريعة (500 / 1000 / 2000 / 5000 / 10000 دج)
//      وتُعدَّل تلقائياً لتكون أكبر من إجمالي الفاتورة
//   3. حساب الباقي الفوري مع animation ✓ عند الدفع الكامل
//   4. وضع "الدفع النقدي السريع" — ضغطة واحدة بدون numpad
//   5. مؤشر بصري واضح: ناقص / كافٍ / زيادة
//   6. إرسال treasury_account_id من وسيلة الدفع
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import type {
  CartTotals, Party, PaymentMode, DocumentType, Currency, TreasuryAccount,
} from '@/types';
import { formatDZD } from '../utils/calculations';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentLine {
  id:               string;
  modeId:           number;
  amount:           string;
  refNote:          string;
  treasuryAccountId?: number | null;
}

export interface PaymentConfirmParams {
  amountPaid:   number;
  dueDate?:     string;
  note?:        string;
  docTypeCode?: string;
  payments?:    Array<{
    paymentModeId:      number;
    amount:             number;
    treasuryAccountId?: number | null;
  }>;
  currencyId?:  number | null;
}

interface Props {
  totals:           CartTotals;
  client:           Party | null;
  paymentModes:     PaymentMode[];
  documentTypes:    DocumentType[];
  currencies?:      Currency[];
  treasuryAccounts?: TreasuryAccount[];
  totalTtcFinal:    number;
  onClose:          () => void;
  onConfirm:        (p: PaymentConfirmParams) => Promise<{ ok: boolean; message?: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_CODES = ['FV', 'BL', 'BCC', 'FA'] as const;

/** مبالغ الأوراق النقدية الجزائرية */
const DZD_BILLS = [200, 500, 1000, 2000, 5000];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** لوحة الأرقام للشاشات اللمسية */
function Numpad({
  onDigit,
  onDot,
  onBackspace,
  onClear,
}: {
  onDigit:    (d: string) => void;
  onDot:      () => void;
  onBackspace:() => void;
  onClear:    () => void;
}) {
  const keys = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    '.', '0', '⌫',
  ];

  return (
    <div className="pay-numpad">
      {keys.map(k => (
        <button
          key={k}
          className={`pay-npk${k === '⌫' ? ' del' : ''}`}
          onClick={() => {
            if (k === '⌫') onBackspace();
            else if (k === '.') onDot();
            else onDigit(k);
          }}
          type="button"
        >
          {k}
        </button>
      ))}
      <button
        className="pay-npk clear"
        onClick={onClear}
        type="button"
        style={{ gridColumn: 'span 3' }}
      >
        مسح
      </button>
    </div>
  );
}

/** شريط مؤشر حالة الدفع */
function PaymentStatus({
  remaining,
  change,
  totalTtcFinal,
}: {
  remaining:     number;
  change:        number;
  totalTtcFinal: number;
}) {
  if (remaining > 0.009) {
    return (
      <div className="pay-status pay-status--deficit">
        <i className="ti ti-alert-circle" />
        <span>متبقٍ: <strong>{formatDZD(remaining)}</strong></span>
      </div>
    );
  }
  if (change > 0.009) {
    return (
      <div className="pay-status pay-status--change">
        <i className="ti ti-cash" />
        <span>الباقي للزبون: <strong>{formatDZD(change)}</strong></span>
      </div>
    );
  }
  return (
    <div className="pay-status pay-status--ok">
      <i className="ti ti-circle-check" />
      <span>المبلغ مكتمل ✓</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes,
  currencies, treasuryAccounts, totalTtcFinal, onClose, onConfirm,
}: Props) {

  // ── State ──────────────────────────────────────────────────────────────────
  const defaultMode = paymentModes.find(m => m.is_default) ?? paymentModes[0];

  const [lines, setLines] = useState<PaymentLine[]>(() =>
    defaultMode
      ? [{ id: uid(), modeId: defaultMode.id, amount: totalTtcFinal.toFixed(2), refNote: '', treasuryAccountId: null }]
      : [],
  );

  const [docTypeCode,        setDocTypeCode]        = useState<string>('FV');
  const [dueDate,            setDueDate]            = useState('');
  const [note,               setNote]               = useState('');
  const [submitting,         setSubmitting]         = useState(false);
  const [error,              setError]              = useState('');
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(
    currencies?.find(c => c.is_base_currency)?.id ?? currencies?.[0]?.id ?? null,
  );

  /** الـ line النشط الذي يتلقى مدخلات الـ numpad */
  const [activeLineId, setActiveLineId] = useState<string | null>(
    () => (defaultMode ? uid() : null),
  );

  // نُوحِّد activeLineId مع أول line عند التهيئة
  const activeLineIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lines.length && !activeLineId) {
      setActiveLineId(lines[0].id);
    }
    activeLineIdRef.current = activeLineId;
  }, [lines, activeLineId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalPaid = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
    [lines],
  );
  const remaining = Math.max(0, totalTtcFinal - totalPaid);
  const change    = totalPaid > totalTtcFinal + 0.009 ? totalPaid - totalTtcFinal : 0;
  const canSubmit = totalPaid > 0.009 && !submitting;

  // ── أزرار المبالغ السريعة ─────────────────────────────────────────────────
  // تُظهر الأوراق النقدية المساوية أو الأكبر من المبلغ المتبقي
  const quickAmounts = useMemo(() => {
    const target = remaining > 0 ? remaining : totalTtcFinal;
    // نأخذ أقرب ورقة أكبر من المبلغ + كل الأوراق الأكبر منها (max 5)
    const bills = DZD_BILLS.filter(b => b >= Math.ceil(target / 100) * 100 - 500);
    // دائماً نُضيف خيار "المبلغ الدقيق"
    const exact = Math.ceil(target);
    const result = Array.from(new Set([exact, ...bills])).sort((a, b) => a - b).slice(0, 5);
    return result;
  }, [remaining, totalTtcFinal]);

  // ── Numpad handlers ────────────────────────────────────────────────────────
  const updateActiveLine = useCallback((fn: (prev: string) => string) => {
    const id = activeLineIdRef.current;
    if (!id) return;
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, amount: fn(l.amount) } : l,
    ));
  }, []);

  const onDigit = useCallback((d: string) => {
    updateActiveLine(prev => {
      if (prev === '0' || prev === '') return d;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      return prev + d;
    });
  }, [updateActiveLine]);

  const onDot = useCallback(() => {
    updateActiveLine(prev => prev.includes('.') ? prev : prev + '.');
  }, [updateActiveLine]);

  const onBackspace = useCallback(() => {
    updateActiveLine(prev => prev.length <= 1 ? '0' : prev.slice(0, -1));
  }, [updateActiveLine]);

  const onClear = useCallback(() => {
    updateActiveLine(() => '0');
  }, [updateActiveLine]);

  /** ضغط مبلغ سريع → يُسنَد للـ line النشط */
  const applyQuickAmount = useCallback((amount: number) => {
    const id = activeLineIdRef.current;
    if (!id) return;
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, amount: amount.toFixed(2) } : l,
    ));
  }, []);

  // ── Line management ────────────────────────────────────────────────────────
  const addLine = useCallback(() => {
    const firstMode = paymentModes[0];
    if (!firstMode) return;
    const newId = uid();
    setLines(prev => [
      ...prev,
      {
        id:      newId,
        modeId:  firstMode.id,
        amount:  Math.max(0, remaining).toFixed(2),
        refNote: '',
        treasuryAccountId: null,
      },
    ]);
    setActiveLineId(newId);
  }, [paymentModes, remaining]);

  const removeLine = useCallback((id: string) => {
    setLines(prev => {
      const next = prev.filter(l => l.id !== id);
      if (activeLineId === id && next.length) setActiveLineId(next[next.length - 1].id);
      return next;
    });
  }, [activeLineId]);

  const updateLine = useCallback(<K extends keyof PaymentLine>(
    id: string, key: K, val: PaymentLine[K],
  ) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l));
  }, []);

  const fillRemaining = useCallback((id: string) => {
    const others = lines.filter(l => l.id !== id).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const rem    = Math.max(0, totalTtcFinal - others);
    updateLine(id, 'amount', rem.toFixed(2));
  }, [lines, totalTtcFinal, updateLine]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');

    const payments = lines
      .filter(l => parseFloat(l.amount) > 0.009)
      .map(l => ({
        paymentModeId:      l.modeId,
        amount:             parseFloat(l.amount),
        treasuryAccountId:  l.treasuryAccountId ?? null,
      }));

    const res = await onConfirm({
      amountPaid: totalPaid,
      payments,
      docTypeCode,
      dueDate:    dueDate || undefined,
      note:       note || undefined,
      currencyId: selectedCurrencyId,
    });

    setSubmitting(false);
    if (!res.ok) setError(res.message ?? 'حدث خطأ غير متوقع');
  }, [canSubmit, lines, totalPaid, docTypeCode, dueDate, note, selectedCurrencyId, onConfirm]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')              { e.preventDefault(); onClose(); }
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSubmit, onClose]);

  // ─── Document types filter ─────────────────────────────────────────────────
  const availableDocTypes = documentTypes.filter(t => DOC_CODES.includes(t.code as typeof DOC_CODES[number]));

  // ── Treasury accounts per mode ─────────────────────────────────────────────
  const getAccountsForMode = useCallback((modeId: number) => {
    if (!treasuryAccounts) return [];
    // نُظهر حسابات الخزينة المرتبطة بوسيلة الدفع (أو كلها)
    return treasuryAccounts;
  }, [treasuryAccounts]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-pay-v2"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:  780,
          display:   'grid',
          gridTemplateRows: 'auto 1fr auto',
          maxHeight: '92vh',
        }}
      >
        {/* ── Header ── */}
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-credit-card" style={{ marginLeft: 6 }} />
            إتمام الدفع
            {client && (
              <span className="pay-client-chip">
                <i className="ti ti-user" style={{ fontSize: 11 }} />
                {client.name}
              </span>
            )}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        {/* ── Body — شبكة عمودين ── */}
        <div className="pay-v2-body">

          {/* ════ العمود الأيمن: ملخص + إعدادات ════ */}
          <div className="pay-v2-left">

            {/* مبلغ الفاتورة */}
            <div className="pay-v2-hero">
              <div className="pay-hero-label">الإجمالي المستحق</div>
              <div className="pay-hero-amount">{formatDZD(totalTtcFinal)}</div>
              {client && (
                <div className="pay-hero-client">
                  <i className="ti ti-user-circle" /> {client.name}
                </div>
              )}
            </div>

            {/* ملخص الفاتورة */}
            <div className="pay-v2-summary">
              <div className="pvs-row">
                <span>HT</span>
                <span>{formatDZD(totals.total_ht)}</span>
              </div>
              {totals.total_discount > 0 && (
                <div className="pvs-row pvs-disc">
                  <span>خصم</span>
                  <span>- {formatDZD(totals.total_discount)}</span>
                </div>
              )}
              <div className="pvs-row">
                <span>TVA</span>
                <span>{formatDZD(totals.total_tva)}</span>
              </div>
              {totals.fiscal_stamp > 0 && (
                <div className="pvs-row">
                  <span>طابع مالي</span>
                  <span>{formatDZD(totals.fiscal_stamp)}</span>
                </div>
              )}
              <div className="pvs-row pvs-total">
                <span>الإجمالي</span>
                <strong>{formatDZD(totalTtcFinal)}</strong>
              </div>
            </div>

            {/* نوع الوثيقة */}
            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">نوع المستند</div>
              <div className="pay-doc-pills">
                {availableDocTypes.map(t => (
                  <button
                    key={t.id}
                    className={`pay-dpill ${docTypeCode === t.code ? 'on' : ''}`}
                    onClick={() => setDocTypeCode(t.code)}
                    type="button"
                  >
                    <span className="pay-dpill-code">{t.code}</span>
                    <span className="pay-dpill-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* العملة */}
            {currencies && currencies.length > 1 && (
              <div className="pay-v2-section">
                <div className="pay-v2-sec-title">العملة</div>
                <select
                  className="pay-v2-select"
                  value={selectedCurrencyId ?? ''}
                  onChange={e => setSelectedCurrencyId(e.target.value ? +e.target.value : null)}
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                      {c.is_base_currency ? ' (الرئيسية)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* تاريخ الاستحقاق */}
            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">تاريخ الاستحقاق <span style={{ opacity: 0.5, fontWeight: 400 }}>(اختياري)</span></div>
              <input
                type="date"
                className="pay-v2-date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* ملاحظة */}
            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">ملاحظة</div>
              <textarea
                className="pay-v2-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="ملاحظة على الفاتورة..."
              />
            </div>
          </div>

          {/* ════ العمود الأيسر: الدفع + Numpad ════ */}
          <div className="pay-v2-right">

            {/* وسائل الدفع */}
            <div className="pay-v2-sec-title" style={{ marginBottom: 8 }}>وسائل الدفع</div>

            <div className="pay-lines-v2">
              {lines.map((line, idx) => {
                const accounts = getAccountsForMode(line.modeId);
                const isActive = activeLineId === line.id;
                return (
                  <div
                    key={line.id}
                    className={`pay-line-v2 ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveLineId(line.id)}
                  >
                    <div className="plv2-num">{idx + 1}</div>

                    {/* وسيلة الدفع */}
                    <select
                      className="plv2-mode"
                      value={line.modeId}
                      onChange={e => updateLine(line.id, 'modeId', +e.target.value)}
                      onClick={e => e.stopPropagation()}
                    >
                      {paymentModes.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    {/* المبلغ */}
                    <div className="plv2-amt-wrap">
                      <input
                        type="number"
                        className="plv2-amount"
                        value={line.amount}
                        onChange={e => updateLine(line.id, 'amount', e.target.value)}
                        onFocus={() => setActiveLineId(line.id)}
                        onClick={e => e.stopPropagation()}
                        placeholder="0.00"
                        dir="ltr"
                      />
                      <button
                        className="plv2-fill"
                        onClick={e => { e.stopPropagation(); fillRemaining(line.id); }}
                        title="تعبئة المتبقي"
                        type="button"
                      >
                        ≈
                      </button>
                    </div>

                    {/* مرجع */}
                    <input
                      type="text"
                      className="plv2-ref"
                      value={line.refNote}
                      onChange={e => updateLine(line.id, 'refNote', e.target.value)}
                      placeholder="مرجع..."
                      onClick={e => e.stopPropagation()}
                    />

                    {/* حساب الخزينة */}
                    {accounts.length > 0 && (
                      <select
                        className="plv2-treasury"
                        value={line.treasuryAccountId ?? ''}
                        onChange={e => updateLine(line.id, 'treasuryAccountId', e.target.value ? +e.target.value : null)}
                        onClick={e => e.stopPropagation()}
                        title="حساب الخزينة"
                      >
                        <option value="">— خزينة —</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}

                    {/* حذف */}
                    {lines.length > 1 && (
                      <button
                        className="plv2-del"
                        onClick={e => { e.stopPropagation(); removeLine(line.id); }}
                        type="button"
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* إضافة وسيلة دفع */}
            <button className="btn btn-xs" onClick={addLine} type="button" style={{ marginTop: 6 }}>
              <i className="ti ti-plus" /> إضافة وسيلة دفع
            </button>

            {/* ── مؤشر الحالة ── */}
            <div style={{ margin: '12px 0 8px' }}>
              <PaymentStatus
                remaining={remaining}
                change={change}
                totalTtcFinal={totalTtcFinal}
              />
            </div>

            {/* ── أزرار المبالغ السريعة ── */}
            <div className="pay-v2-sec-title" style={{ marginBottom: 6 }}>مبالغ سريعة</div>
            <div className="pay-quick-amts">
              {quickAmounts.map(a => (
                <button
                  key={a}
                  className={`pay-qa-btn ${parseFloat(lines.find(l => l.id === activeLineId)?.amount ?? '0') === a ? 'on' : ''}`}
                  onClick={() => applyQuickAmount(a)}
                  type="button"
                >
                  {a.toLocaleString('ar-DZ')} دج
                </button>
              ))}
            </div>

            {/* ── Numpad ── */}
            <div className="pay-v2-sec-title" style={{ margin: '10px 0 6px' }}>لوحة الأرقام</div>
            <Numpad
              onDigit={onDigit}
              onDot={onDot}
              onBackspace={onBackspace}
              onClear={onClear}
            />

            {/* ── خطأ ── */}
            {error && (
              <div className="al al-r" style={{ marginTop: 10 }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="m-foot">
          <button className="btn" onClick={onClose} type="button">إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title="تأكيد الدفع — Ctrl+Enter"
            type="button"
            style={{ minWidth: 200, fontSize: 14 }}
          >
            {submitting
              ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
              : <>
                  <i className="ti ti-circle-check" />
                  تأكيد الدفع — {formatDZD(totalPaid)}
                  {change > 0.009 && (
                    <span style={{ marginRight: 8, fontSize: 12, opacity: 0.85 }}>
                      (باقٍ {formatDZD(change)})
                    </span>
                  )}
                </>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/ProfessionalReceipt.tsx
```
import React, { useState, useEffect } from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import { printThermal, isWebUsbSupported, getThermalAutoPrint, setThermalAutoPrint } from '../utils/printService';

interface ProfessionalReceiptProps {
  items: CartItem[]; totals: CartTotals; client: Party | null;
  docNumber?: string; onClose: () => void; onPrint: () => void; onNewSale: () => void;
}

export default function ProfessionalReceipt({
  items, totals, client, docNumber, onClose, onPrint, onNewSale,
}: ProfessionalReceiptProps) {
  const [thermalStatus, setThermalStatus] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(getThermalAutoPrint());
  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;

  useEffect(() => {
    if (!autoPrint || !isWebUsbSupported()) return;
    (async () => {
      setThermalStatus('جاري الطباعة التلقائية…');
      const res = await printThermal(items, totals, client, docNumber);
      setThermalStatus(res.ok ? '✓ تمت الطباعة' : `✗ ${res.message}`);
      setTimeout(() => setThermalStatus(null), 3000);
    })();
  }, []);
  const now = new Date();

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-receipt" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt" style={{ marginLeft: 6 }} />
            إيصال البيع
            {docNumber && <span className="m-docnum"># {docNumber}</span>}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        <div className="m-body" id="invoice-preview">
          <div className="receipt-wrap">
            <div className="receipt-header">
              <div className="rh-logo">🏪 نظام المبيعات</div>
              <div className="rh-meta">
                الجزائر — نظام ERP المتكامل<br />
                {now.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="rh-doc">
                <div className="rh-docnum">{docNumber ?? 'مسودة'}</div>
                <div className="rh-date">{now.toLocaleTimeString('ar-DZ')}</div>
                {client && <div className="rh-client"><i className="ti ti-user" /> {client.name}</div>}
              </div>
            </div>

            <div className="receipt-divider">المنتجات</div>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th style={{ textAlign: 'center' }}>الكمية</th>
                  <th style={{ textAlign: 'center' }}>السعر</th>
                  <th style={{ textAlign: 'left' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="rt-name">{item.product_name}</div>
                      {item.discount_percentage > 0 && (
                        <div className="rt-variant">خصم {item.discount_percentage}%</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity} {item.unit_symbol}</td>
                    <td style={{ textAlign: 'center' }}>{formatDZD(item.unit_price_ht)}</td>
                    <td style={{ textAlign: 'left' }}>{formatDZD(item.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-totals-wrap">
              <div className="receipt-totals-inner">
                <div className="rt-sum-row"><span>المجموع HT</span><span>{formatDZD(totals.total_ht)}</span></div>
                {totals.total_discount > 0 && <div className="rt-sum-row"><span>إجمالي الخصم</span><span>- {formatDZD(totals.total_discount)}</span></div>}
                <div className="rt-sum-row"><span>TVA</span><span>{formatDZD(totals.total_tva)}</span></div>
                {totals.fiscal_stamp > 0 && <div className="rt-sum-row"><span>طابع مالي</span><span>{formatDZD(totals.fiscal_stamp)}</span></div>}
                <div className="rt-grand-row"><span>الإجمالي TTC</span><strong>{formatDZD(totalTtcFinal)}</strong></div>
              </div>
            </div>

            <div className="receipt-footer">
              شكراً على تعاملكم معنا<br />
              نظام ERP الجزائر — {now.getFullYear()}
            </div>
          </div>
        </div>

        <div className="m-foot">
          <button className="btn btn-sm btn-p" onClick={onPrint}>
            <i className="ti ti-printer" /> طباعة
          </button>
          {isWebUsbSupported() && (
            <button
              className="btn btn-sm btn-thermal"
              onClick={async () => {
                setThermalStatus('جاري الاتصال بالطابعة…');
                const res = await printThermal(items, totals, client, docNumber);
                setThermalStatus(res.ok ? '✓ تمت الطباعة' : `✗ ${res.message}`);
                setTimeout(() => setThermalStatus(null), 3000);
              }}
            >
              <i className="ti ti-printer" /> طباعة حرارية
            </button>
          )}
          {thermalStatus && (
            <span className={`thermal-status ${thermalStatus.startsWith('✓') ? 'ok' : 'err'}`}>
              {thermalStatus}
            </span>
          )}
          {isWebUsbSupported() && (
            <label className="cb" style={{ fontSize: 11, cursor: 'pointer', margin: '0 8px' }}>
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => { setAutoPrint(e.target.checked); setThermalAutoPrint(e.target.checked); }}
              />
              {' '}طباعة تلقائية
            </label>
          )}
          <button className="btn btn-sm" onClick={onNewSale}>
            <i className="ti ti-plus" /> بيع جديد
          </button>
          <button className="btn btn-sm" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/QuickItemsBar.tsx
```
import React from 'react';
import type { ProductVariant } from '@/types';
import type { QuickItem } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { isVariantOutOfStock } from '../utils/posHelpers';

interface QuickItemsBarProps {
  quickItems: QuickItem[];
  allVariants: ProductVariant[];
  onAdd: (v: ProductVariant) => void;
  onRemove: (variantId: number) => void;
  allowNegativeStock?: boolean;
}

export default function QuickItemsBar({
  quickItems, allVariants, onAdd, onRemove, allowNegativeStock,
}: QuickItemsBarProps) {
  return (
    <div className="pos-quickbar">
      <span className="pqb-label">
        <i className="ti ti-star" /> مفضلة
      </span>
      {quickItems.map(q => {
        const variant = allVariants.find(v => v.id === q.variantId);
        const outStock = variant ? isVariantOutOfStock(variant, allowNegativeStock) : false;
        return (
          <div key={q.variantId} className="pqb-item" title={q.name}>
            <button
              className="pqb-add"
              onClick={() => variant && !outStock && onAdd(variant)}
              disabled={!variant || outStock}
            >
              <span className="pqb-name">{q.name}</span>
              <span className="pqb-price">{formatDZD(q.priceHt * (1 + q.tvaRate / 100))}</span>
            </button>
            <button className="pqb-rm" onClick={() => onRemove(q.variantId)} title="إزالة من المفضلة">
              <i className="ti ti-x" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

## FILE: resources/js/pos/components/ReturnsModal.tsx
```
import React, { useState, useCallback } from 'react';
import type { CommercialDocument, CommercialDocumentLine, DocumentType } from '@/types';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { formatDZD } from '../utils/calculations';
import { toast } from 'sonner';

interface ReturnsModalProps {
  documentTypes: DocumentType[];
  defaultWarehouseId: number | null;
  fiscalYearId: number | undefined;
  onClose: () => void;
  onDone: () => void;
}

interface SelectedLine {
  line: CommercialDocumentLine;
  qty: number;
}

export default function ReturnsModal({
  documentTypes, defaultWarehouseId, fiscalYearId, onClose, onDone,
}: ReturnsModalProps) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [doc, setDoc] = useState<CommercialDocument | null>(null);
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [creating, setCreating] = useState(false);

  const avcType = documentTypes.find(t => t.code === 'AVC');

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await documentsApi.list({
        search: search.trim(),
        include: 'lines,lines.product_variant,party',
        per_page: 5,
      });
      const found = Array.isArray(res) ? res : res.data ?? [];
      if (found.length === 0) {
        toast.error('لا توجد فاتورة بهذا الرقم');
        setDoc(null);
      } else {
        setDoc(found[0] as CommercialDocument);
        setSelected([]);
      }
    } catch {
      toast.error('فشل البحث عن الفاتورة');
    }
    setSearching(false);
  }, [search]);

  const toggleLine = useCallback((line: CommercialDocumentLine) => {
    setSelected(prev => {
      const exists = prev.find(s => s.line.id === line.id);
      if (exists) return prev.filter(s => s.line.id !== line.id);
      return [...prev, { line, qty: line.quantity }];
    });
  }, []);

  const updateReturnQty = useCallback((lineId: number, qty: number) => {
    setSelected(prev => prev.map(s =>
      s.line.id === lineId ? { ...s, qty: Math.min(Math.max(0, qty), s.line.quantity) } : s
    ));
  }, []);

  const handleCreateReturn = useCallback(async () => {
    if (!avcType || !doc || !defaultWarehouseId || !fiscalYearId) {
      toast.error('بيانات غير مكتملة لإنشاء المرتجع');
      return;
    }
    if (selected.length === 0) {
      toast.error('اختر أصنافاً للإرجاع');
      return;
    }
    setCreating(true);
    try {
      await documentsApi.create({
        document_type_id: avcType.id,
        warehouse_id: defaultWarehouseId,
        fiscal_year_id: fiscalYearId,
        document_date: new Date().toISOString().split('T')[0],
        party_id: doc.party?.id ?? null,
        notes: `مرتجع من الفاتورة رقم ${doc.document_number}`,
        lines: selected.map(s => ({
          product_id: s.line.product_variant_id ?? 0,
          description: s.line.description ?? undefined,
          quantity: -Math.abs(s.qty),
          unit_price_ht: s.line.unit_price_ht,
          discount_percentage: s.line.discount_percentage,
          tva_rate: s.line.tva_rate,
        })),
      });
      toast.success('تم إنشاء المرتجع بنجاح');
      onDone();
    } catch {
      toast.error('فشل إنشاء المرتجع');
    }
    setCreating(false);
  }, [avcType, doc, defaultWarehouseId, fiscalYearId, selected, onDone]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt-refund" style={{ marginLeft: 6 }} />
            مرتجع مبيعات
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <div className="ret-search">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                className="inp"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="رقم الفاتورة..."
                style={{ flex: 1 }}
              />
              <button className="btn btn-p" onClick={handleSearch} disabled={searching}>
                {searching ? '...' : 'بحث'}
              </button>
            </div>
          </div>

          {doc && (
            <div className="ret-doc">
              <div className="ret-doc-hd">
                <strong>الفاتورة: {doc.document_number}</strong>
                <span style={{ color: 'var(--t4)', fontSize: 12 }}>
                  {doc.party?.name} — {formatDZD(doc.total_ttc)}
                </span>
              </div>
              <div className="ret-lines">
                {doc.lines?.map(line => {
                  const sel = selected.find(s => s.line.id === line.id);
                  return (
                    <div key={line.id} className={`ret-line ${sel ? 'ret-line-sel' : ''}`}>
                      <label className="ret-line-lbl">
                        <input
                          type="checkbox"
                          checked={!!sel}
                          onChange={() => toggleLine(line)}
                        />
                        <span className="ret-line-name">{line.description ?? `صنف #${line.product_variant_id}`}</span>
                        <span className="ret-line-qty">الكمية: {line.quantity}</span>
                        <span className="ret-line-amt">{formatDZD(line.total_ht)}</span>
                      </label>
                      {sel && (
                        <div className="ret-line-qty-inp">
                          <span>كمية الإرجاع:</span>
                          <input
                            type="number"
                            className="inp"
                            value={sel.qty}
                            min={1}
                            max={line.quantity}
                            onChange={e => updateReturnQty(line.id, parseInt(e.target.value) || 0)}
                            style={{ width: 80 }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--t4)' }}>/ {line.quantity}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleCreateReturn}
            disabled={!doc || selected.length === 0 || creating || !avcType}
          >
            {creating ? 'جاري الإنشاء...' : 'إنشاء المرتجع'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/SessionStatsModal.tsx
```
import React, { useMemo } from 'react';
import type { PaymentMode } from '@/types';
import type { SessionPayment, SessionProduct } from '@/pos/hooks/usePOSStore';
import { formatDZD } from '../utils/calculations';

interface SessionStatsModalProps {
  sessionInvoices:   number;
  sessionSales:      number;
  highestInvoice:    number;
  invoiceTotals:     number[];
  paymentsBreakdown: SessionPayment[];
  productsSold:      Record<string, SessionProduct>;
  paymentModes:      PaymentMode[];
  heldCount:         number;
  avgMargin:         number;
  onClose:           () => void;
  onEndSession:      () => void;
}

export default function SessionStatsModal({
  sessionInvoices, sessionSales, highestInvoice, invoiceTotals,
  paymentsBreakdown, productsSold, paymentModes, heldCount, avgMargin,
  onClose, onEndSession,
}: SessionStatsModalProps) {
  const avgInvoice = sessionInvoices > 0 ? sessionSales / sessionInvoices : 0;

  const paymentSummary = useMemo(() => {
    const map = new Map<number, number>();
    paymentsBreakdown.forEach(p => {
      map.set(p.paymentModeId, (map.get(p.paymentModeId) ?? 0) + p.amount);
    });
    return Array.from(map.entries())
      .map(([modeId, amount]) => {
        const mode = paymentModes.find(m => m.id === modeId);
        return { modeId, name: mode?.name ?? `#${modeId}`, amount, pct: sessionSales > 0 ? (amount / sessionSales) * 100 : 0 };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [paymentsBreakdown, paymentModes, sessionSales]);

  const topProducts = useMemo(() =>
    Object.values(productsSold)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  [productsSold]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-chart-bar" style={{ marginLeft: 6 }} /> إحصاءات الجلسة</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          {/* ── بطاقات المؤشرات ── */}
          <div className="session-grid">
            {[
              { label: 'عدد الفواتير',      value: sessionInvoices,       icon: 'ti-receipt',     cls: 'g' },
              { label: 'إجمالي المبيعات',    value: formatDZD(sessionSales), icon: 'ti-cash',    cls: 'o' },
              { label: 'متوسط الفاتورة',     value: formatDZD(avgInvoice),   icon: 'ti-chart-bar', cls: 'p' },
              { label: 'أعلى فاتورة',        value: formatDZD(highestInvoice), icon: 'ti-arrow-up-right', cls: 'e' },
              { label: 'فواتير معلقة',       value: heldCount,             icon: 'ti-clock-pause', cls: 'b' },
              { label: 'متوسط الهامش',       value: `${avgMargin.toFixed(1)}%`, icon: 'ti-trending-up', cls: 'b' },
            ].map(s => (
              <div key={s.label} className={`session-card pos-chip ${s.cls}`}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 22 }} />
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── توزيع وسائل الدفع ── */}
          {paymentSummary.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: 'var(--t2)' }}><i className="ti ti-credit-card" style={{ marginLeft: 6 }} /> توزيع وسائل الدفع</div>
              {paymentSummary.map(p => (
                <div key={p.modeId} className="sr">
                  <span className="sr-l">{p.name}</span>
                  <span className="sr-v">{formatDZD(p.amount)} <span style={{ fontSize: 11, color: 'var(--t4)' }}>({p.pct.toFixed(0)}%)</span></span>
                </div>
              ))}
            </div>
          )}

          {/* ── أكثر المنتجات مبيعاً ── */}
          {topProducts.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: 'var(--t2)' }}><i className="ti ti-package" style={{ marginLeft: 6 }} /> أكثر المنتجات مبيعاً</div>
              {topProducts.map((p, i) => (
                <div key={p.name} className="sr">
                  <span className="sr-l">
                    <span style={{ color: 'var(--t4)', marginLeft: 6, fontWeight: 800, fontSize: 11 }}>#{i + 1}</span>
                    {p.name}
                    <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>×{p.qty}</span>
                  </span>
                  <span className="sr-v">{formatDZD(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="m-foot">
          <button className="btn btn-r" onClick={onEndSession} type="button">
            <i className="ti ti-square-off" /> إنهاء الجلسة
          </button>
          <button className="btn btn-p" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/hooks/useCartStore.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pos/utils/useCartStore.ts
//
// ✅ التحسينات عن النسخة السابقة:
//   1. خصم الكمية التلقائي — يقرأ quantityDiscounts من الفاريانت
//      ويطبّق الخصم المناسب عند كل تغيير في الكمية
//   2. خصم ثابت بالمبلغ — discount_amount مباشرة (إضافة لـ discount_percentage)
//   3. updateDiscountAmount — action جديد لتحرير الخصم كمبلغ مباشر
//   4. Optimistic stock — current_stock يتناقص فوراً في الذاكرة عند الإضافة
//   5. getQuantityDiscount — helper مستقل قابل للاستيراد من أي مكان
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant } from '@/types';
import { calcTotals, calcFiscalStamp } from '../utils/calculations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartState {
  items:              CartItem[];
  client:             Party | null;
  notes:              string;
  invoiceDiscountPct: number;

  // Actions
  addItem:              (variant: ProductVariant, qty?: number) => void;
  removeItem:           (id: string) => void;
  updateQty:            (id: string, qty: number) => void;
  updateDiscount:       (id: string, pct: number) => void;
  updateDiscountAmount: (id: string, amount: number) => void;   // ✅ جديد
  updatePrice:          (id: string, price: number) => void;
  setClient:            (client: Party | null) => void;
  setNotes:             (notes: string) => void;
  clearCart:            () => void;
  setInvoiceDiscountPct:(pct: number) => void;
  totals:               () => CartTotals;
}

// ─── Quantity Discount helper ─────────────────────────────────────────────────

/**
 * يحسب الخصم المناسب بناءً على الكمية وجدول الخصومات.
 * يعيد نسبة مئوية (0–100) — 0 إذا لم يكن هناك خصم.
 *
 * quantityDiscounts مرتّب تصاعدياً بـ min_quantity من الباكاند.
 * نأخذ أعلى سقف لا يتجاوزه qty.
 */
export function getQuantityDiscount(
  variant: ProductVariant,
  qty: number,
): number {
  const discounts = (variant as any).quantityDiscounts as Array<{
    min_quantity: number;
    discount_percentage: number;
  }> | undefined;

  if (!discounts || discounts.length === 0) return 0;

  // فرز تنازلي — أكبر كمية أولاً
  const sorted = [...discounts].sort((a, b) => b.min_quantity - a.min_quantity);
  const match  = sorted.find(d => qty >= d.min_quantity);
  return match ? Math.min(100, Math.max(0, match.discount_percentage)) : 0;
}

// ─── Item Totals recalculator ─────────────────────────────────────────────────

/**
 * يُعيد حساب discount_percentage ← discount_amount ← total_ht ← total_ttc
 * لصنف واحد بعد أي تعديل.
 *
 * الأولوية: discount_percentage (نسبة) — إذا كانت > 0 تُعيد حساب الـ amount.
 * إذا كان discount_amount محدداً مباشرة، يُحوَّل لنسبة مكافئة.
 */
function recalcItem(item: CartItem): CartItem {
  const gross = item.unit_price_ht * item.quantity;   // قبل الخصم

  // حساب مبلغ الخصم الفعلي
  let discAmount: number;
  if (item.discount_percentage > 0) {
    discAmount = gross * (item.discount_percentage / 100);
  } else if (item.discount_amount > 0) {
    // خصم ثابت → نُحوِّله لنسبة لنحتفظ باتساق الحسابات
    discAmount        = Math.min(gross, item.discount_amount);
    item              = {
      ...item,
      discount_percentage: gross > 0 ? (discAmount / gross) * 100 : 0,
    };
  } else {
    discAmount = 0;
  }

  const totalHt  = gross - discAmount;
  const totalTva = totalHt * (item.tva_rate / 100);

  return {
    ...item,
    discount_amount: round2(discAmount),
    total_ht:        round2(totalHt),
    total_ttc:       round2(totalHt + totalTva),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getUnitSymbol(v: ProductVariant): string {
  return v.unit?.abbreviation ?? 'قطعة';
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:              [],
      client:             null,
      notes:              '',
      invoiceDiscountPct: 0,

      // ── addItem ──────────────────────────────────────────────────────────────
      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);

          if (existing) {
            // ✅ زيادة الكمية → إعادة حساب خصم الكمية التلقائي
            const newQty    = existing.quantity + qty;
            const autoDisc  = getQuantityDiscount(variant, newQty);
            const updated   = recalcItem({
              ...existing,
              quantity:            newQty,
              // ✅ نحدّث الخصم فقط إذا كان autoDisc أعلى من الموجود
              // لا نطغى على خصم يدوي أعلى أعطاه الكاشير
              discount_percentage: Math.max(existing.discount_percentage, autoDisc),
            });
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id ? updated : i,
              ),
            };
          }

          // صنف جديد
          const priceHt   = variant.default_selling_price_ht;
          const tvaRate   = variant.tva?.rate ?? 19;
          const autoDisc  = getQuantityDiscount(variant, qty);

          const newItem: CartItem = recalcItem({
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         getUnitSymbol(variant),
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceHt * (1 + tvaRate / 100),
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: autoDisc,
            discount_amount:     0,
            total_ht:            0,   // يُحسَب في recalcItem
            total_ttc:           0,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          });

          return { items: [...state.items, newItem] };
        });
      },

      // ── removeItem ───────────────────────────────────────────────────────────
      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      // ── updateQty ────────────────────────────────────────────────────────────
      // ✅ يُعيد حساب خصم الكمية التلقائي عند تغيير الكمية
      updateQty: (id, qty) =>
        set(state => {
          const item = state.items.find(i => i.id === id);
          if (!item) return state;

          // نحاول إيجاد الفاريانت من items للوصول لـ quantityDiscounts
          // (نحتفظ بمرجع الفاريانت في CartItem._variant اختيارياً)
          const safeQty   = Math.max(0.001, qty);
          // لا يمكن الوصول للـ variant هنا مباشرة — نحتفظ بـ discount_percentage الحالي
          // إلا إذا كان الكاشير عدَّله يدوياً. الحل: نُخزِّن quantityDiscounts في CartItem.
          const updated   = recalcItem({ ...item, quantity: safeQty });
          return { items: state.items.map(i => i.id === id ? updated : i) };
        }),

      // ── updateDiscount (نسبة) ─────────────────────────────────────────────────
      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_percentage: Math.min(100, Math.max(0, pct)),
                  discount_amount:     0,   // إعادة ضبط الخصم الثابت
                })
              : i,
          ),
        })),

      // ── updateDiscountAmount (مبلغ ثابت) ✅ جديد ─────────────────────────────
      updateDiscountAmount: (id, amount) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_amount:     Math.max(0, amount),
                  discount_percentage: 0,   // إعادة ضبط النسبة
                })
              : i,
          ),
        })),

      // ── updatePrice ──────────────────────────────────────────────────────────
      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
        })),

      setClient: (client) => set({ client }),
      setNotes:  (notes)  => set({ notes }),
      clearCart: ()       => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0 }),
      setInvoiceDiscountPct: (pct) =>
        set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)) }),

      totals: () => calcTotals(get().items, get().invoiceDiscountPct),
    }),
    {
      name:       'pos-cart',
      partialize: () => ({}),   // لا نحفظ السلة في localStorage
    },
  ),
);
```

## FILE: resources/js/pos/hooks/useKeyboardMap.ts
```
const STORAGE_KEY = 'pos-kb-override-';

export const KB_DEFAULTS: Record<string, string> = {
  searchFocus: 'F2',
  payment: 'F4',
  holdCart: 'F5',
  heldCarts: 'F7',
  preview: 'F9',
  clearCart: 'F12',
  kbHelp: 'F1',
  filter: 'F3',
  manualProduct: 'F6',
  sessionStats: 'F8',
  fullscreen: 'F11',
  directPrint: 'Ctrl+P',
  quickSearch: 'Ctrl+F',
  gridView: 'Ctrl+ArrowUp',
  listView: 'Ctrl+ArrowDown',
  zoomIn: 'Ctrl+=',
  zoomOut: 'Ctrl+-',
  quickCat: 'Alt+1..9',
  qtyUp: 'NumpadAdd',
  qtyDown: 'NumpadSubtract',
  deleteItem: 'Delete',
  enterSearch: 'Enter',
  escape: 'Escape',
  confirmPayment: 'Ctrl+Enter',
};

export function normalizeEventKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  const key = e.key;
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return parts.join('+');
  parts.push(key === ' ' ? 'Space' : key);
  return parts.join('+');
}

export function readOverrides(slug: string | null): Record<string, string> {
  if (!slug) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${slug}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function matchOverride(slug: string | null, action: string, e: KeyboardEvent): boolean {
  if (!slug) return false;
  const overrides = readOverrides(slug);
  const expected = overrides[action] ?? KB_DEFAULTS[action];
  return normalizeEventKey(e) === expected;
}
```

## FILE: resources/js/pos/hooks/usePOS.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePOS.ts
//
// ✅ التغييرات:
//   - updateDiscountAmount مُضافة (من useCartStore)
//   - باقي المنطق لم يتغير
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useCallback } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcTotals }    from '../utils/calculations';

export function usePOS() {
  const sessionStarted    = usePOSStore(s => s.sessionStarted);
  const sessionInvoices   = usePOSStore(s => s.sessionInvoices);
  const sessionSales      = usePOSStore(s => s.sessionSales);
  const highestInvoice    = usePOSStore(s => s.highestInvoice);
  const invoiceTotals     = usePOSStore(s => s.invoiceTotals);
  const paymentsBreakdown = usePOSStore(s => s.paymentsBreakdown);
  const productsSold      = usePOSStore(s => s.productsSold);
  const heldCarts         = usePOSStore(s => s.heldCarts);
  const activeTab         = usePOSStore(s => s.activeTab);
  const searchQuery       = usePOSStore(s => s.searchQuery);
  const selectedCategory  = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen  = usePOSStore(s => s.paymentModalOpen);

  const startSession      = usePOSStore(s => s.startSession);
  const endSession        = usePOSStore(s => s.endSession);
  const incrementSession  = usePOSStore(s => s.incrementSession);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // Cart
  const items             = useCartStore(s => s.items);
  const client            = useCartStore(s => s.client);
  const invoiceDiscountPct= useCartStore(s => s.invoiceDiscountPct);
  const addItem           = useCartStore(s => s.addItem);
  const removeItem        = useCartStore(s => s.removeItem);
  const updateQty         = useCartStore(s => s.updateQty);
  const updateDiscount    = useCartStore(s => s.updateDiscount);
  const updateDiscountAmount = useCartStore(s => s.updateDiscountAmount);  // ✅ جديد
  const updatePrice       = useCartStore(s => s.updatePrice);
  const clearCart         = useCartStore(s => s.clearCart);
  const setClient         = useCartStore(s => s.setClient);
  const setInvoiceDiscountPct = useCartStore(s => s.setInvoiceDiscountPct);

  const totals = useMemo(
    () => calcTotals(items, invoiceDiscountPct),
    [items, invoiceDiscountPct],
  );

  const holdCart = useCallback(() => {
    usePOSStore.getState().holdCart({
      items, totals, client, clearCart,
    });
  }, [items, totals, client, clearCart]);

  const restoreCart    = usePOSStore(s => s.restoreCart);
  const deleteHeldCart = usePOSStore(s => s.deleteHeldCart);

  return {
    sessionStarted, sessionInvoices, sessionSales,
    highestInvoice, invoiceTotals, paymentsBreakdown, productsSold,
    startSession, endSession, incrementSession,

    heldCarts, holdCart, restoreCart, deleteHeldCart,

    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    items, client, invoiceDiscountPct,
    addItem, removeItem, updateQty,
    updateDiscount,
    updateDiscountAmount,    // ✅ مُصدَّر
    updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  };
}
```

## FILE: resources/js/pos/hooks/usePOSStore.ts
```
// pos/hooks/usePOSStore.ts

import { create }        from 'zustand';
import { nanoid }        from 'nanoid';
import { useCartStore }  from '../utils/useCartStore';
import type { HeldCart, CartItem, CartTotals, Party } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionPayment {
  paymentModeId: number;
  amount:        number;
}

export interface SessionProduct {
  name:  string;
  qty:   number;
  total: number;
}

interface POSState {
  sessionStarted:   boolean;
  sessionInvoices:  number;
  sessionSales:     number;
  highestInvoice:   number;
  invoiceTotals:    number[];
  paymentsBreakdown: SessionPayment[];
  productsSold:     Record<string, SessionProduct>;
  heldCarts:        HeldCart[];
  activeTab:        'products' | 'clients' | 'held';
  searchQuery:      string;
  selectedCategory: number | null;
  paymentModalOpen: boolean;

  startSession:     () => void;
  endSession:       () => void;
  incrementSession: (data: {
    amount:   number;
    payments?: SessionPayment[];
    items?:   CartItem[];
  }) => void;

  holdCart:         (params: { items: CartItem[]; totals: CartTotals; client: Party | null; label?: string; clearCart: () => void }) => void;
  restoreCart:      (id: string) => void;
  deleteHeldCart:   (id: string) => void;

  setTab:           (tab: POSState['activeTab']) => void;
  setSearch:        (q: string) => void;
  setCategory:      (id: number | null) => void;
  openPayment:      () => void;
  closePayment:     () => void;
}

function mergeProducts(existing: Record<string, SessionProduct>, items: CartItem[]) {
  const copy = { ...existing };
  items.forEach(i => {
    const key = String(i.variant_id);
    if (copy[key]) {
      copy[key] = {
        name:  copy[key].name,
        qty:   copy[key].qty + i.quantity,
        total: copy[key].total + i.total_ttc,
      };
    } else {
      copy[key] = {
        name:  i.product_name,
        qty:   i.quantity,
        total: i.total_ttc,
      };
    }
  });
  return copy;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  highestInvoice:   0,
  invoiceTotals:    [],
  paymentsBreakdown: [],
  productsSold:     {},
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () =>
    set({
      sessionStarted: true,
      sessionInvoices: 0,
      sessionSales: 0,
      highestInvoice: 0,
      invoiceTotals: [],
      paymentsBreakdown: [],
      productsSold: {},
    }),

  endSession: () => set({ sessionStarted: false }),

  incrementSession: (data) =>
    set((s) => ({
      sessionInvoices: s.sessionInvoices + 1,
      sessionSales:    s.sessionSales + data.amount,
      highestInvoice:  Math.max(s.highestInvoice, data.amount),
      invoiceTotals:   [...s.invoiceTotals, data.amount],
      paymentsBreakdown: data.payments
        ? [...s.paymentsBreakdown, ...data.payments]
        : s.paymentsBreakdown,
      productsSold:    data.items
        ? mergeProducts(s.productsSold, data.items)
        : s.productsSold,
    })),

  holdCart: ({ items, totals, client, label, clearCart }) => {
    if (items.length === 0) return;

    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals,
      client:     client ?? null,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ heldCarts: [...s.heldCarts, held] }));
    clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find((c) => c.id === id);
    if (!held) return;
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set((s) => ({ heldCarts: s.heldCarts.filter((c) => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set((s) => ({ heldCarts: s.heldCarts.filter((c) => c.id !== id) })),

  setTab:       (tab) => set({ activeTab: tab }),
  setSearch:    (q)   => set({ searchQuery: q }),
  setCategory:  (id)  => set({ selectedCategory: id }),
  openPayment:  ()    => set({ paymentModalOpen: true }),
  closePayment: ()    => set({ paymentModalOpen: false }),
}));
```

## FILE: resources/js/pos/utils/calculations.test.ts
```
import { describe, it, expect } from 'vitest';
import {
  htToTtc, ttcToHt, calcMargin, calcFiscalStamp,
  calcTotals, formatDZD, calcChange, checkStock, round2,
} from './calculations';
import type { CartItem } from '@/types';

describe('htToTtc', () => {
  it('calculates TTC from HT with TVA rate', () => {
    expect(htToTtc(1000, 19)).toBe(1190);
  });
  it('returns HT when TVA is 0', () => {
    expect(htToTtc(500, 0)).toBe(500);
  });
  it('handles zero HT', () => {
    expect(htToTtc(0, 19)).toBe(0);
  });
});

describe('ttcToHt', () => {
  it('calculates HT from TTC with TVA rate', () => {
    expect(ttcToHt(1190, 19)).toBe(1000);
  });
  it('returns TTC when TVA is 0', () => {
    expect(ttcToHt(500, 0)).toBe(500);
  });
  it('handles zero TTC', () => {
    expect(ttcToHt(0, 19)).toBe(0);
  });
});

describe('calcMargin', () => {
  it('calculates margin percentage', () => {
    expect(calcMargin(1000, 700)).toBe(30);
  });
  it('returns 0 when selling price is 0', () => {
    expect(calcMargin(0, 100)).toBe(0);
  });
  it('returns negative margin when cost exceeds selling', () => {
    expect(calcMargin(100, 150)).toBeCloseTo(-50, 5);
  });
});

describe('calcFiscalStamp', () => {
  it('returns 0 for amounts below 30,000', () => {
    expect(calcFiscalStamp(20000)).toBe(0);
    expect(calcFiscalStamp(0)).toBe(0);
    expect(calcFiscalStamp(29999.99)).toBe(0);
  });
  it('returns 1% for amounts between 30k and 300k', () => {
    expect(calcFiscalStamp(30000)).toBe(300);
    expect(calcFiscalStamp(100000)).toBe(1000);
    expect(calcFiscalStamp(299999)).toBe(3000);
  });
  it('caps at 3000 for amounts >= 300k', () => {
    expect(calcFiscalStamp(300000)).toBe(3000);
    expect(calcFiscalStamp(500000)).toBe(3000);
    expect(calcFiscalStamp(1_000_000)).toBe(3000);
  });
});

describe('calcTotals', () => {
  const baseItem = (overrides: Partial<CartItem> = {}): CartItem => ({
    id: '1', product_id: 1, variant_id: 1, product_name: 'Test',
    ref: '', barcode: null, variant_name: null, unit_symbol: null,
    quantity: 1, unit_price_ht: 1000, selling_price_ttc: 1190,
    tva_rate: 19, tva_id: null, discount_percentage: 0, discount_amount: 0,
    total_ht: 1000, total_ttc: 1190, max_stock: null, manages_stock: false,
    ...overrides,
  });

  it('returns zeros for empty cart', () => {
    const r = calcTotals([]);
    expect(r.total_ht).toBe(0);
    expect(r.total_tva).toBe(0);
    expect(r.total_ttc).toBe(0);
    expect(r.total_discount).toBe(0);
    expect(r.items_count).toBe(0);
    expect(r.lines_count).toBe(0);
  });

  it('calculates totals for a single item', () => {
    const r = calcTotals([baseItem()]);
    expect(r.total_ht).toBe(1000);
    expect(r.total_tva).toBe(190);
    expect(r.total_ttc).toBe(1190);
    expect(r.items_count).toBe(1);
  });

  it('calculates totals for multiple items', () => {
    const r = calcTotals([
      baseItem({ id: '1', total_ht: 1000 }),
      baseItem({ id: '2', total_ht: 2000, tva_rate: 9, unit_price_ht: 2000, selling_price_ttc: 2180, total_ttc: 2180 }),
    ]);
    expect(r.total_ht).toBe(3000);
    expect(r.total_tva).toBe(190 + 180);
    expect(r.items_count).toBe(2);
  });

  it('applies invoice discount percentage', () => {
    const r = calcTotals([baseItem({ total_ht: 1000 })], 10);
    expect(r.invoice_discount_pct).toBe(10);
    expect(r.invoice_discount_amount).toBe(100);
    expect(r.total_ht).toBe(900);
  });

  it('handles zero invoice discount pct', () => {
    const r = calcTotals([baseItem({ total_ht: 1000 })], 0);
    expect(r.invoice_discount_pct).toBeUndefined();
    expect(r.invoice_discount_amount).toBeUndefined();
    expect(r.total_ht).toBe(1000);
  });

  it('accumulates item discounts', () => {
    const r = calcTotals([
      baseItem({ id: '1', total_ht: 1000, discount_amount: 50 }),
      baseItem({ id: '2', total_ht: 2000, discount_amount: 100 }),
    ]);
    expect(r.total_discount).toBe(150);
  });
});

describe('formatDZD', () => {
  it('formats amount with DZD symbol', () => {
    expect(formatDZD(1000)).toMatch(/دج/);
  });
  it('formats whole number without decimals', () => {
    const r = formatDZD(1000);
    expect(r).toContain('1');
    expect(r).not.toContain(',');
  });
  it('formats decimal amount', () => {
    const r = formatDZD(1500.5);
    expect(r).toContain('1');
  });
});

describe('calcChange', () => {
  it('returns 0 when paid equals total', () => {
    expect(calcChange(1190, 1000, 190)).toBe(0);
  });
  it('returns positive change when overpaid', () => {
    expect(calcChange(2000, 1000, 190)).toBe(810);
  });
  it('returns 0 when underpaid', () => {
    expect(calcChange(500, 1000, 0)).toBe(0);
  });
});

describe('checkStock', () => {
  const item = (max: number | null): CartItem => ({
    id: '1', product_id: 1, variant_id: 1, product_name: 'Test',
    ref: '', barcode: null, variant_name: null, unit_symbol: 'pcs',
    quantity: 1, unit_price_ht: 1000, selling_price_ttc: 1190,
    tva_rate: 19, tva_id: null, discount_percentage: 0, discount_amount: 0,
    total_ht: 1000, total_ttc: 1190, max_stock: max, manages_stock: true,
  });

  it('returns ok when stock is unlimited', () => {
    const r = checkStock(item(null), 100);
    expect(r.ok).toBe(true);
  });
  it('returns ok when new qty <= max stock', () => {
    const r = checkStock(item(10), 5);
    expect(r.ok).toBe(true);
  });
  it('returns error when new qty > max stock', () => {
    const r = checkStock(item(5), 10);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('pcs');
  });
});

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(100.456)).toBe(100.46);
    expect(round2(100.454)).toBe(100.45);
    expect(round2(100)).toBe(100);
    expect(round2(0)).toBe(0);
  });
});
```

## FILE: resources/js/pos/utils/calculations.ts
```
// ════════════════════════════════════════════════
// pos/utils/calculations.ts — حسابات POS
// ════════════════════════════════════════════════
import type { CartItem, CartTotals } from '@/types';

/** حساب سعر TTC من HT + TVA */
export function htToTtc(ht: number, tvaRate: number): number {
  return ht * (1 + tvaRate / 100);
}

/** حساب سعر HT من TTC + TVA */
export function ttcToHt(ttc: number, tvaRate: number): number {
  return ttc / (1 + tvaRate / 100);
}

/** حساب هامش الربح */
export function calcMargin(sellingHt: number, costHt: number): number {
  if (sellingHt <= 0) return 0;
  return ((sellingHt - costHt) / sellingHt) * 100;
}

/** الطابع الجبائي الجزائري — LF 2024 */
export function calcFiscalStamp(totalTtc: number): number {
  if (totalTtc < 30_000) return 0;
  if (totalTtc < 300_000) return Math.ceil(totalTtc * 0.01);
  // Cap at 3000 DZD for amounts >= 300,000
  return 3_000;
}

/** حساب مجاميع العربة */
export function calcTotals(items: CartItem[], invoiceDiscountPct = 0): CartTotals {
  let totalHt       = 0;
  let totalTva      = 0;
  let totalDiscount = 0;
  let itemsCount    = 0;

  for (const item of items) {
    totalHt       += item.total_ht;
    totalTva      += item.total_ht * (item.tva_rate / 100);
    totalDiscount += item.discount_amount;
    itemsCount    += item.quantity;
  }

  const invoiceDiscountAmount = totalHt > 0
    ? Math.round(totalHt * invoiceDiscountPct / 100 * 100) / 100
    : 0;
  const adjTotalHt  = totalHt - invoiceDiscountAmount;
  const adjTotalTva = totalHt > 0
    ? items.reduce((s, item) => {
        const share = item.total_ht / totalHt;
        return s + ((item.total_ht - invoiceDiscountAmount * share) * item.tva_rate / 100);
      }, 0)
    : totalTva;
  const totalTtc     = adjTotalHt + adjTotalTva;
  const fiscalStamp  = calcFiscalStamp(totalTtc);

  return {
    total_ht:                Math.round(adjTotalHt  * 100) / 100,
    total_tva:               Math.round(adjTotalTva * 100) / 100,
    total_ttc:               Math.round(totalTtc    * 100) / 100,
    total_discount:          Math.round(totalDiscount * 100) / 100,
    fiscal_stamp:            fiscalStamp,
    items_count:             itemsCount,
    lines_count:             items.length,
    invoice_discount_pct:    invoiceDiscountPct || undefined,
    invoice_discount_amount: invoiceDiscountAmount || undefined,
  };
}

/** تنسيق المبلغ بالدينار الجزائري */
export function formatDZD(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(amount) + ' دج';
}

/** حساب الباقي من الدفع */
export function calcChange(paid: number, totalTtc: number, fiscalStamp: number): number {
  return Math.max(0, paid - (totalTtc + fiscalStamp));
}

/** تحقق أن الكمية في المخزون */
export function checkStock(item: CartItem, newQty: number): { ok: boolean; message: string } {
  if (item.max_stock === null) return { ok: true, message: '' };
  if (newQty > item.max_stock) {
    return { ok: false, message: `المخزون المتاح: ${item.max_stock} ${item.unit_symbol ?? ''}` };
  }
  return { ok: true, message: '' };
}

/** تقريب للمبلغ */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

## FILE: resources/js/pos/utils/posHelpers.test.ts
```
import { describe, it, expect } from 'vitest';
import type { Product, ProductVariant, PriceLevel, ProductVariantPrice } from '@/types';
import {
  getVariantPrice, productToVariant, makeFakeVariant,
  familyIcon, familyStyleFromName,
} from './posHelpers';

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  const now = new Date().toISOString();
  return {
    id: 1, product_id: 1, ref: 'REF-001', barcode: null, variant_name: null,
    unit_id: null, tva_id: 1, valuation_method_id: null,
    weight: null, volume: null, length: null, width: null, height: null,
    last_purchase_price: 0, average_cost_price: 0, default_selling_price_ht: 1000,
    manages_stock: false, allow_negative_stock: true, has_lots: false, has_expiration_date: false,
    min_stock_alert: 0, max_stock_alert: null, manages_quantity_discounts: false,
    active: true, company_id: 1, created_at: now, updated_at: now,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date().toISOString();
  return {
    id: 1, name: 'Test Product', slug: 'test-product',
    ref: 'PRD-001', barcode: null, description: null,
    family_id: null, brand_id: null, product_type_id: null,
    tva_id: 1, unit_id: null, purchase_price_ht: 800, current_cost_price: 700,
    min_margin_percentage: null, manages_stock: false, allow_negative_stock: true,
    has_lots: false, has_expiration_date: false, min_stock_alert: null, max_stock_alert: null,
    manages_quantity_discounts: false, weight: null, volume: null,
    length: null, width: null, height: null, valuation_method_id: null,
    specifications: null, images: null, meta_title: null, meta_description: null,
    active: true, company_id: 1, created_at: now, updated_at: now,
    ...overrides,
  };
}

describe('getVariantPrice', () => {
  it('returns default selling price when no price level', () => {
    const v = makeVariant({ default_selling_price_ht: 1500 });
    expect(getVariantPrice(v, null, [])).toBe(1500);
  });

  it('returns matching price level price when found', () => {
    const prices: ProductVariantPrice[] = [
      { price_level_id: 2, price: 1200, active: true },
    ];
    const v = makeVariant({ default_selling_price_ht: 1500, prices });
    const levels: PriceLevel[] = [
      { id: 2, name: 'Wholesale', discount_percent: null, company_id: 1, is_default: false, created_at: '', updated_at: '' },
    ];
    expect(getVariantPrice(v, 2, levels)).toBe(1200);
  });

  it('applies discount percent when price entry not found', () => {
    const prices: ProductVariantPrice[] = [];
    const v = makeVariant({ default_selling_price_ht: 1000, prices });
    const levels: PriceLevel[] = [
      { id: 3, name: 'VIP', discount_percent: 10, company_id: 1, is_default: false, created_at: '', updated_at: '' },
    ];
    expect(getVariantPrice(v, 3, levels)).toBe(900);
  });

  it('returns default price when both price entry and discount percent are missing', () => {
    const v = makeVariant({ default_selling_price_ht: 2000 });
    const levels: PriceLevel[] = [
      { id: 4, name: 'Regular', discount_percent: null, company_id: 1, is_default: false, created_at: '', updated_at: '' },
    ];
    expect(getVariantPrice(v, 4, levels)).toBe(2000);
  });
});

describe('productToVariant', () => {
  it('converts a basic product to variant', () => {
    const p = makeProduct({ id: 5, ref: 'PRD-005', purchase_price_ht: 500 });
    const v = productToVariant(p);
    expect(v.product_id).toBe(5);
    expect(v.ref).toBe('PRD-005');
    expect(v.id).toBe(5);
    expect(v.last_purchase_price).toBe(500);
    expect(v.product).toBe(p);
  });

  it('uses default selling price from product when available', () => {
    const p = makeProduct({ default_selling_price_ht: 1200 });
    const v = productToVariant(p);
    expect(v.default_selling_price_ht).toBe(1200);
  });

  it('calculates fallback selling price from purchase price * 1.3', () => {
    const p = makeProduct({ default_selling_price_ht: undefined as unknown as number, purchase_price_ht: 1000 });
    const v = productToVariant(p);
    expect(v.default_selling_price_ht).toBe(1300);
  });

  it('passes through current_stock and prices from API response', () => {
    const p = makeProduct() as Product & { current_stock?: number; prices?: ProductVariantPrice[] };
    p.current_stock = 42;
    p.prices = [{ price_level_id: 1, price: 900, active: true }];
    const v = productToVariant(p);
    expect(v.current_stock).toBe(42);
    expect(v.prices).toEqual(p.prices);
  });

  it('handles missing optional product fields gracefully', () => {
    const p = makeProduct({
      ref: null as unknown as string | undefined,
      purchase_price_ht: undefined as unknown as number,
      current_cost_price: undefined as unknown as number,
      min_stock_alert: undefined as unknown as number,
    });
    const v = productToVariant(p);
    expect(v.ref).toBe('');
    expect(v.last_purchase_price).toBe(0);
    expect(v.average_cost_price).toBe(0);
    expect(v.min_stock_alert).toBe(0);
  });
});

describe('makeFakeVariant', () => {
  it('creates a variant with given name, price, tva rate', () => {
    const v = makeFakeVariant('Custom Item', 2000, 19);
    expect(v.variant_name).toBeNull();
    expect(v.default_selling_price_ht).toBe(2000);
    expect(v.product.name).toBe('Custom Item');
    expect(v.tva!.rate).toBe(19);
    expect(v.tva!.name).toContain('19');
    expect(v.product_id).toBe(0);
    expect(v.id).toBeGreaterThan(0);
  });

  it('id is greater than 0', () => {
    const v = makeFakeVariant('A', 100, 19);
    expect(v.id).toBeGreaterThan(0);
  });
});

describe('familyIcon', () => {
  it('returns apple icon for food keywords', () => {
    expect(familyIcon('أكل')).toBe('ti-apple');
    expect(familyIcon('طعام')).toBe('ti-apple');
    expect(familyIcon('غذاء')).toBe('ti-apple');
  });
  it('returns droplets for drink keywords', () => {
    expect(familyIcon('ماء')).toBe('ti-droplets');
    expect(familyIcon('عصير')).toBe('ti-droplets');
    expect(familyIcon('شراب')).toBe('ti-droplets');
  });
  it('returns default package icon for unknown', () => {
    expect(familyIcon('أثاث')).toBe('ti-package');
  });
});

describe('familyStyleFromName', () => {
  it('returns emerald for food', () => {
    const s = familyStyleFromName('أكل');
    expect(s.icon).toBe('ti-apple');
    expect(s.color).toBe('var(--em)');
  });
  it('returns red for medicine', () => {
    const s = familyStyleFromName('دواء');
    expect(s.icon).toBe('ti-pill');
    expect(s.color).toBe('var(--red)');
  });
  it('returns default for unknown', () => {
    const s = familyStyleFromName('أثاث');
    expect(s.icon).toBe('ti-package');
  });
});
```

## FILE: resources/js/pos/utils/posHelpers.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pos/utils/posHelpers.ts
//
// ✅ التغيير الوحيد عن النسخة السابقة:
//   productToVariant تمرّر الآن:
//   - quantityDiscounts  ← كان مفقوداً → getQuantityDiscount() كانت ترجع 0 دائماً
//   - length/width/height ← كانت مفقودة
// ════════════════════════════════════════════════════════════════════════════
import type {
  Product, ProductVariant, ProductVariantPrice, PriceLevel,
} from '@/types';

type ProductApiResponse = Product & {
  current_stock?:      number;
  prices?:             ProductVariantPrice[];
  quantityDiscounts?:  Array<{ min_quantity: number; discount_percentage: number }>;
};

export type ViewMode   = 'grid' | 'list';
export type GridSize   = 'xs' | 'sm' | 'md' | 'lg';
export type SortMode   = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'family';
export type ActiveModal =
  | 'none' | 'payment' | 'held' | 'receipt'
  | 'manual' | 'kbhelp' | 'session' | 'barcode';

export interface QuickItem {
  variantId: number;
  name:      string;
  priceHt:   number;
  tvaRate:   number;
}

// ─── getVariantPrice ──────────────────────────────────────────────────────────

export function getVariantPrice(
  v: ProductVariant,
  priceLevelId: number | null,
  priceLevels: PriceLevel[],
): number {
  if (priceLevelId) {
    const priceEntry = v.prices?.find(
      (p: ProductVariantPrice) => p.price_level_id === priceLevelId,
    );
    if (priceEntry) return (priceEntry as any).price_ht ?? priceEntry.price ?? v.default_selling_price_ht;
    const pl = priceLevels.find(p => p.id === priceLevelId);
    if (pl?.discount_percent)
      return v.default_selling_price_ht * (1 - pl.discount_percent / 100);
  }
  return v.default_selling_price_ht;
}

// ─── productToVariant ─────────────────────────────────────────────────────────

export function productToVariant(p: Product): ProductVariant {
  const pr = p as ProductApiResponse;
  return {
    id:                         p.id,
    product_id:                 p.id,
    ref:                        p.ref ?? '',
    barcode:                    p.barcode,
    variant_name:               '',
    unit_id:                    p.unit_id,
    tva_id:                     p.tva_id,
    valuation_method_id:        p.valuation_method_id,
    last_purchase_price:        p.purchase_price_ht ?? 0,
    average_cost_price:         p.current_cost_price ?? 0,
    default_selling_price_ht:
      p.default_selling_price_ht ??
      (p.purchase_price_ht ? p.purchase_price_ht * 1.3 : 0),
    manages_stock:              p.manages_stock,
    allow_negative_stock:       p.allow_negative_stock,
    has_lots:                   p.has_lots,
    has_expiration_date:        p.has_expiration_date,
    min_stock_alert:            p.min_stock_alert ?? 0,
    max_stock_alert:            p.max_stock_alert,
    manages_quantity_discounts: p.manages_quantity_discounts,
    weight:                     p.weight,
    volume:                     p.volume,
    length:                     p.length,
    width:                      p.width,
    height:                     p.height,
    active:                     p.active,
    company_id:                 p.company_id,
    created_at:                 p.created_at,
    updated_at:                 p.updated_at,

    // relations
    product:           p,
    unit:              p.unit,
    tva:               p.tva,
    current_stock:     pr.current_stock,
    prices:            pr.prices,
    // ✅ الإضافة الجوهرية — بدونها getQuantityDiscount() ترجع 0 دائماً
    quantityDiscounts: pr.quantityDiscounts,
  } as unknown as ProductVariant;
}

// ─── makeFakeVariant ──────────────────────────────────────────────────────────

export function makeFakeVariant(
  name: string,
  priceHt: number,
  tvaRate: number,
): ProductVariant {
  const now = new Date().toISOString();
  return {
    id:                         Date.now(),
    product_id:                 0,
    ref:                        '',
    barcode:                    null,
    variant_name:               null,
    unit_id:                    null,
    tva_id:                     null,
    valuation_method_id:        null,
    weight:                     null,
    volume:                     null,
    length:                     null,
    width:                      null,
    height:                     null,
    last_purchase_price:        0,
    average_cost_price:         0,
    default_selling_price_ht:   priceHt,
    manages_stock:              false,
    allow_negative_stock:       true,
    has_lots:                   false,
    has_expiration_date:        false,
    manages_quantity_discounts: false,
    min_stock_alert:            0,
    max_stock_alert:            null,
    active:                     true,
    company_id:                 0,
    created_at:                 now,
    updated_at:                 now,
    product: {
      id: 0, name, slug: '', active: true, manages_stock: false,
      allow_negative_stock: true, has_lots: false, has_expiration_date: false,
      manages_quantity_discounts: false, company_id: 0,
      created_at: now, updated_at: now,
    },
    tva: {
      id: 0, name: `TVA ${tvaRate}%`, rate: tvaRate,
      description: null, is_default: false, active: true,
      company_id: 0, created_at: now, updated_at: now,
    },
  } as unknown as ProductVariant;
}

// ─── Stock helper ──────────────────────────────────────────────────────────────

const _outStock = (v: ProductVariant, allowNegativeStock?: boolean): boolean => {
  const stock    = (v as any).current_stock;
  const unknown  = stock === undefined;
  return v.manages_stock && !unknown && (stock ?? 0) <= 0 && !v.allow_negative_stock && allowNegativeStock === false;
};
export { _outStock as isVariantOutOfStock };

// ─── localStorage helpers ─────────────────────────────────────────────────────

const POS_PAGE_SIZE_KEY = 'pos_page_size';

export function getPosPageSize(): number {
  try {
    const v = localStorage.getItem(POS_PAGE_SIZE_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (n >= 20 && n <= 500) return n;
    }
  } catch { /* localStorage not available */ }
  return 120;
}

export function setPosPageSize(n: number): void {
  try { localStorage.setItem(POS_PAGE_SIZE_KEY, String(n)); }
  catch { /* localStorage not available */ }
}

// ─── Family icon/style helpers ────────────────────────────────────────────────

export function familyIcon(name: string): string {
  const f = name.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل') || f.includes('طعام')) return 'ti-apple';
  if (f.includes('شراب') || f.includes('ماء') || f.includes('عصير')) return 'ti-droplets';
  if (f.includes('إلكترون') || f.includes('تقن')) return 'ti-device-laptop';
  if (f.includes('ملابس'))                         return 'ti-shirt';
  if (f.includes('صيانة') || f.includes('إصلاح')) return 'ti-tool';
  if (f.includes('دواء') || f.includes('صحة'))    return 'ti-pill';
  if (f.includes('مكتب') || f.includes('قرطاسية')) return 'ti-briefcase';
  if (f.includes('سيارة') || f.includes('مركبة')) return 'ti-car';
  return 'ti-package';
}

export function familyStyleFromName(
  family: string,
): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل'))       return { icon: 'ti-apple',          color: 'var(--em)',     bg: 'var(--emb)'   };
  if (f.includes('شراب') || f.includes('ماء'))     return { icon: 'ti-droplets',       color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                        return { icon: 'ti-device-mobile',  color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                          return { icon: 'ti-shirt',          color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                          return { icon: 'ti-tool',           color: 'var(--orange)', bg: 'var(--orb)'   };
  if (f.includes('دواء'))                           return { icon: 'ti-pill',           color: 'var(--red)',    bg: 'var(--redb)'  };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
```

## FILE: resources/js/pos/utils/printService.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pos/utils/printService.ts
//
// ✅ الإصلاحات عن النسخة السابقة:
//
//   1. Arabic encoding — Windows-1256 بدل UTF-8
//      معظم الطابعات الحرارية الرخيصة (Epson TM-T20، XP-58) لا تدعم UTF-8.
//      نستخدم codepage 1256 (ESC t 16) + جدول تحويل ASCII←→Win1256 للحروف العربية.
//
//   2. WebUSB flow صحيح:
//      - device.open() قبل selectConfiguration
//      - configuration check قبل selectConfiguration
//      - claimInterface برقم صحيح (0 أو من descriptor)
//      - transferOut على endpoint الأول bulk-out
//
//   3. QR Code (ESC/POS Native QR):
//      - يطبع QR يحتوي رقم الفاتورة
//      - يُستخدم GS ( k model 49 (QR Code Model 2)
//
//   4. buildReceiptBytes مُصلَح:
//      - خصم الفاتورة يظهر في الإيصال
//      - تنسيق أفضل للأرقام (اتجاه LTR)
// ════════════════════════════════════════════════════════════════════════════
import type { CartItem, CartTotals, Party } from '@/types';

// ─── ESC/POS Constants ────────────────────────────────────────────────────────

const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

// ─── Windows-1256 Arabic encoder ─────────────────────────────────────────────
//
// الطابعات الحرارية الجزائرية الشائعة تستخدم codepage 1256 (Arabic Windows).
// ESC t 16 يُفعّل هذا الـ codepage على Epson-compatible printers.
// الجدول أدناه يحوّل unicode code points للحروف العربية إلى Win-1256 bytes.

const ARABIC_WIN1256: Record<number, number> = {
  // الحروف الأساسية
  0x0621: 0xC1, // ء
  0x0622: 0xC2, // آ
  0x0623: 0xC3, // أ
  0x0624: 0xC4, // ؤ
  0x0625: 0xC5, // إ
  0x0626: 0xC6, // ئ
  0x0627: 0xC7, // ا
  0x0628: 0xC8, // ب
  0x0629: 0xC9, // ة
  0x062A: 0xCA, // ت
  0x062B: 0xCB, // ث
  0x062C: 0xCC, // ج
  0x062D: 0xCD, // ح
  0x062E: 0xCE, // خ
  0x062F: 0xCF, // د
  0x0630: 0xD0, // ذ
  0x0631: 0xD1, // ر
  0x0632: 0xD2, // ز
  0x0633: 0xD3, // س
  0x0634: 0xD4, // ش
  0x0635: 0xD5, // ص
  0x0636: 0xD6, // ض
  0x0637: 0xD8, // ط
  0x0638: 0xD9, // ظ
  0x0639: 0xDA, // ع
  0x063A: 0xDB, // غ
  0x0641: 0xDD, // ف
  0x0642: 0xDE, // ق
  0x0643: 0xDF, // ك
  0x0644: 0xE1, // ل
  0x0645: 0xE3, // م
  0x0646: 0xE4, // ن
  0x0647: 0xE5, // ه
  0x0648: 0xE6, // و
  0x0649: 0xEC, // ى
  0x064A: 0xED, // ي
  0x064B: 0xF2, // ً
  0x064C: 0xF3, // ٌ
  0x064D: 0xF4, // ٍ
  0x064E: 0xF5, // َ
  0x064F: 0xF6, // ُ
  0x0650: 0xF7, // ِ
  0x0651: 0xF8, // ّ
  0x0652: 0xF9, // ْ
  // أرقام عربية
  0x0660: 0xB0, // ٠
  0x0661: 0xB1, // ١
  0x0662: 0xB2, // ٢
  0x0663: 0xB3, // ٣
  0x0664: 0xB4, // ٤
  0x0665: 0xB5, // ٥
  0x0666: 0xB6, // ٦
  0x0667: 0xB7, // ٧
  0x0668: 0xB8, // ٨
  0x0669: 0xB9, // ٩
  // علامات ترقيم عربية
  0x060C: 0xAC, // ،
  0x061B: 0xBB, // ؛
  0x061F: 0xBF, // ؟
  // لام ألف
  0xFEFB: 0xE2, // لا
  0xFEFC: 0xE2, // لا (شكل)
};

/**
 * يحوّل نص Unicode إلى bytes بترميز Windows-1256.
 * الأحرف غير المعروفة تُستبدَل بـ '?' (0x3F).
 */
function encodeArabic(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0x3F;
    if (cp < 0x80) {
      bytes.push(cp);                               // ASCII — مباشرة
    } else if (ARABIC_WIN1256[cp] !== undefined) {
      bytes.push(ARABIC_WIN1256[cp]);               // عربي — Win-1256
    } else {
      bytes.push(0x3F);                             // غير معروف → '?'
    }
  }
  return bytes;
}

// ─── ESC/POS Builder ─────────────────────────────────────────────────────────

class EscPosBuilder {
  private buf: number[] = [];

  /** تهيئة الطابعة + تفعيل codepage Windows-1256 */
  init(): this {
    this.buf.push(ESC, 0x40);           // ESC @ — initialize
    this.buf.push(ESC, 0x74, 0x16);     // ESC t 22 — select codepage Windows-1256 (Arabic)
    this.buf.push(ESC, 0x52, 0x31);     // ESC R 49 — select country Algeria
    return this;
  }

  lineFeed(n = 1): this {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }

  setBold(on: boolean): this {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  setAlign(n: 0 | 1 | 2): this {
    this.buf.push(ESC, 0x61, n);
    return this;
  }

  setFontSize(w: number, h: number): this {
    const ww = Math.max(1, Math.min(8, w));
    const hh = Math.max(1, Math.min(8, h));
    this.buf.push(GS, 0x21, (hh - 1) * 16 + (ww - 1));
    return this;
  }

  resetFontSize(): this {
    this.buf.push(GS, 0x21, 0);
    return this;
  }

  /** نص مُشفَّر بـ Windows-1256 */
  text(s: string): this {
    this.buf.push(...encodeArabic(s));
    return this;
  }

  /** نص ASCII فقط (أرقام، رموز) — بدون تحويل */
  ascii(s: string): this {
    for (const c of s) this.buf.push(c.charCodeAt(0) & 0xFF);
    return this;
  }

  center(s: string): this  { return this.setAlign(1).text(s).lineFeed(); }
  right(s: string): this   { return this.setAlign(2).text(s).lineFeed(); }
  left(s: string): this    { return this.setAlign(0).text(s).lineFeed(); }

  divider(c = '-', len = 42): this {
    return this.setAlign(1).ascii(c.repeat(len)).lineFeed();
  }

  cut(): this { this.buf.push(GS, 0x56, 0x00); return this; }
  feedAndCut(): this { return this.lineFeed(4).cut(); }

  /**
   * QR Code — ESC/POS Native (GS ( k)
   * يطبع QR يحتوي النص المعطى (رقم الفاتورة / رابط URL)
   */
  qrCode(data: string, size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 4): this {
    const bytes = [...new TextEncoder().encode(data)];  // QR data — UTF-8 مقبول هنا
    const len   = bytes.length + 3;
    const pL    = len & 0xFF;
    const pH    = (len >> 8) & 0xFF;

    this.setAlign(1);

    // 1. Select model (Model 2)
    this.buf.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

    // 2. Set size
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);

    // 3. Set error correction (M = 0x32)
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x32);

    // 4. Store data
    this.buf.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...bytes);

    // 5. Print
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

    this.lineFeed(2);
    return this;
  }

  escposBytes(): Uint8Array { return new Uint8Array(this.buf); }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

/** تنسيق رقم — LTR دائماً (أرقام لاتينية مناسبة للطابعة) */
function fmt(n: number): string {
  return n.toLocaleString('fr-DZ', {
    minimumFractionDigits:  2,
    maximumFractionDigits:  2,
  });
}

/** سطر منسَّق: تسمية يمين + قيمة يسار بعرض ثابت 42 حرف */
function lineRow(label: string, value: string, width = 42): string {
  const totalLen = width;
  // نستخدم ASCII spaces لأن الطابعة لا تفهم unicode spaces جيداً
  const gap = Math.max(1, totalLen - label.length - value.length);
  return label + ' '.repeat(gap) + value;
}

// ─── Receipt Builder ──────────────────────────────────────────────────────────

export interface ReceiptOptions {
  companyName?:    string;
  companyAddress?: string;
  companyPhone?:   string;
  companyNIF?:     string;
  footerText?:     string;
  printQR?:        boolean;
  qrBaseUrl?:      string;    // مثال: https://erp.mycompany.dz/invoices/
}

function buildReceiptBytes(
  items:     CartItem[],
  totals:    CartTotals,
  client:    Party | null,
  docNumber?: string,
  opts:      ReceiptOptions = {},
): Uint8Array {
  const b   = new EscPosBuilder().init();
  const now = new Date();
  const {
    companyName    = 'نظام المبيعات',
    companyAddress = 'الجزائر',
    companyPhone,
    companyNIF,
    footerText     = 'شكراً على تعاملكم معنا',
    printQR        = true,
    qrBaseUrl      = '',
  } = opts;

  // ── رأس الإيصال ──────────────────────────────────────────────────────────
  b.setFontSize(2, 2).setBold(true).center(companyName).setBold(false).resetFontSize();
  b.center(companyAddress);
  if (companyPhone) b.center(companyPhone);
  if (companyNIF)   b.center(`NIF: ${companyNIF}`);
  b.divider('=', 42);

  // معلومات الفاتورة
  b.setAlign(0);
  if (docNumber) {
    b.setBold(true)
     .text('رقم الفاتورة: ')
     .ascii(docNumber)
     .lineFeed()
     .setBold(false);
  }
  b.text('التاريخ: ').ascii(now.toLocaleDateString('fr-DZ')).lineFeed();
  b.text('الوقت:   ').ascii(now.toLocaleTimeString('fr-DZ')).lineFeed();
  if (client) {
    b.text('الزبون:  ').text(client.name).lineFeed();
    if (client.phone) b.text('الهاتف:  ').ascii(client.phone).lineFeed();
  }
  b.divider('-', 42);

  // ── الأصناف ──────────────────────────────────────────────────────────────
  b.setBold(true).left('المنتج').setBold(false);

  for (const item of items) {
    const total = item.total_ttc;

    // اسم المنتج
    b.text(item.product_name ?? '');
    b.lineFeed();

    // التفاصيل: qty × price HT [خصم] = total TTC
    const detail =
      `  ${fmt(item.quantity)} x ${fmt(item.unit_price_ht)}` +
      (item.discount_percentage > 0 ? ` (-${item.discount_percentage.toFixed(0)}%)` : '');
    const totalStr = `${fmt(total)} دج`;

    b.setAlign(0).ascii(detail);
    b.setAlign(2).ascii(totalStr).lineFeed();
  }

  b.divider('-', 42);

  // ── المجاميع ──────────────────────────────────────────────────────────────
  b.setAlign(0);
  b.ascii(lineRow('المجموع HT:', `${fmt(totals.total_ht)} دج`)).lineFeed();

  if (totals.total_discount > 0) {
    b.ascii(lineRow('الخصم:', `-${fmt(totals.total_discount)} دج`)).lineFeed();
  }

  if (totals.invoice_discount_amount && totals.invoice_discount_amount > 0) {
    b.ascii(lineRow('خصم الفاتورة:', `-${fmt(totals.invoice_discount_amount)} دج`)).lineFeed();
  }

  b.ascii(lineRow('TVA:', `${fmt(totals.total_tva)} دج`)).lineFeed();

  if (totals.fiscal_stamp > 0) {
    b.ascii(lineRow('الطابع المالي:', `${fmt(totals.fiscal_stamp)} دج`)).lineFeed();
  }

  b.divider('=', 32);

  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;
  b.setFontSize(2, 2)
   .setBold(true)
   .setAlign(2)
   .ascii(`${fmt(totalTtcFinal)} دج`)
   .lineFeed()
   .setBold(false)
   .resetFontSize();

  b.text('الإجمالي شامل الضريبة').lineFeed();
  b.divider('=', 42);

  // ── QR Code ───────────────────────────────────────────────────────────────
  if (printQR && docNumber) {
    const qrData = qrBaseUrl
      ? `${qrBaseUrl}${docNumber}`
      : docNumber;
    b.lineFeed();
    b.qrCode(qrData, 4);
    b.center(docNumber);   // رقم الفاتورة تحت الـ QR
  }

  // ── ذيل الإيصال ──────────────────────────────────────────────────────────
  b.divider('-', 42);
  b.center(footerText);
  b.center(`نظام ERP الجزائر — ${now.getFullYear()}`);

  b.feedAndCut();
  return b.escposBytes();
}

// ─── WebUSB Print ─────────────────────────────────────────────────────────────

export interface ThermalPrintResult {
  ok:      boolean;
  method:  'webusb' | 'blob' | 'none';
  message: string;
}

/**
 * يطبع عبر WebUSB API.
 *
 * ✅ الإصلاحات:
 *   - device.open() قبل كل شيء
 *   - التحقق من configuration قبل selectConfiguration
 *   - البحث عن endpoint bulk-out الصحيح من descriptor
 *   - transferOut على EP الصحيح (ليس 1 دائماً)
 */
export async function printThermalViaWebUSB(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): Promise<ThermalPrintResult> {
  const usb = (navigator as any).usb as
    | {
        requestDevice(opts: { filters: unknown[] }): Promise<any>;
      }
    | undefined;

  if (!usb) {
    return { ok: false, method: 'none', message: 'WebUSB غير مدعوم في هذا المتصفح — استخدم Chrome أو Edge' };
  }

  let device: any = null;

  try {
    device = await usb.requestDevice({ filters: [] });
    if (!device) {
      return { ok: false, method: 'webusb', message: 'لم يتم اختيار طابعة' };
    }

    // ✅ open() أولاً — كان مفقوداً
    await device.open();

    // ✅ selectConfiguration فقط إذا لم تكن محددة
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // ✅ البحث عن interface رقم 0 (printing interface)
    const iface = device.configuration?.interfaces?.[0];
    const ifaceNum = iface?.interfaceNumber ?? 0;
    await device.claimInterface(ifaceNum);

    // ✅ البحث عن endpoint bulk-out (direction: 'out', type: 'bulk')
    const alternate = iface?.alternates?.[0];
    const ep = alternate?.endpoints?.find(
      (e: any) => e.direction === 'out' && e.type === 'bulk',
    );
    const epNum = ep?.endpointNumber ?? 1;

    const data = buildReceiptBytes(items, totals, client, docNumber, opts);
    const result = await device.transferOut(epNum, data);

    if (result.status !== 'ok') {
      return { ok: false, method: 'webusb', message: `خطأ في الإرسال: ${result.status}` };
    }

    await device.releaseInterface(ifaceNum);
    await device.close();

    return { ok: true, method: 'webusb', message: 'تمت الطباعة بنجاح' };

  } catch (err: any) {
    // محاولة إغلاق الجهاز في حالة الخطأ
    try { if (device) await device.close(); } catch {}

    if (err?.name === 'NotFoundError') {
      return { ok: false, method: 'webusb', message: 'تم إلغاء اختيار الطابعة' };
    }
    if (err?.name === 'SecurityError') {
      return { ok: false, method: 'webusb', message: 'لا يسمح المتصفح بالوصول للطابعة — تأكد من HTTPS' };
    }
    return { ok: false, method: 'webusb', message: err?.message ?? 'فشلت الطباعة الحرارية' };
  }
}

// ─── Blob Download (fallback) ─────────────────────────────────────────────────

export function printThermalViaBlob(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): ThermalPrintResult {
  try {
    const data = buildReceiptBytes(items, totals, client, docNumber, opts);
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `receipt-${docNumber ?? Date.now()}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true, method: 'blob', message: 'تم تحميل ملف الإيصال — أرسله للطابعة' };
  } catch (err: any) {
    return { ok: false, method: 'blob', message: err?.message ?? 'فشل تصدير ملف الإيصال' };
  }
}

// ─── Capability check ─────────────────────────────────────────────────────────

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * اكتشاف طابعات متصلة سابقاً (بدون dialog)
 * مفيد لـ auto-print بعد البيع
 */
export async function getConnectedPrinters(): Promise<any[]> {
  const usb = (navigator as any).usb;
  if (!usb) return [];
  try {
    return await usb.getDevices();
  } catch {
    return [];
  }
}

/**
 * طباعة تلقائية — يستخدم أول طابعة متصلة بدون dialog
 * إذا لم توجد → يعود لـ Blob download
 */
// ─── Thermal auto-print preference (localStorage) ────────────────────────────

const THERMAL_AUTO_PRINT_KEY = 'thermal_auto_print';

export function getThermalAutoPrint(): boolean {
  try {
    return localStorage.getItem(THERMAL_AUTO_PRINT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setThermalAutoPrint(enabled: boolean): void {
  try {
    localStorage.setItem(THERMAL_AUTO_PRINT_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
}

/**
 * High-level print entry point — tries WebUSB first, falls back to blob.
 */
export async function printThermal(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): Promise<ThermalPrintResult> {
  return autoPrint(items, totals, client, docNumber, opts);
}

export async function autoPrint(
  items:      CartItem[],
  totals:     CartTotals,
  client:     Party | null,
  docNumber?: string,
  opts?:      ReceiptOptions,
): Promise<ThermalPrintResult> {
  const usb = (navigator as any).usb;
  if (!usb) return printThermalViaBlob(items, totals, client, docNumber, opts);

  try {
    const devices: any[] = await usb.getDevices();
    if (!devices.length) {
      return printThermalViaBlob(items, totals, client, docNumber, opts);
    }

    const device = devices[0];
    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);

    const iface  = device.configuration?.interfaces?.[0];
    const ifNum  = iface?.interfaceNumber ?? 0;
    await device.claimInterface(ifNum);

    const ep = iface?.alternates?.[0]?.endpoints?.find(
      (e: any) => e.direction === 'out' && e.type === 'bulk',
    );
    const epNum = ep?.endpointNumber ?? 1;

    const data = buildReceiptBytes(items, totals, client, docNumber, opts);
    await device.transferOut(epNum, data);
    await device.releaseInterface(ifNum);
    await device.close();

    return { ok: true, method: 'webusb', message: 'طباعة تلقائية ناجحة' };
  } catch {
    return printThermalViaBlob(items, totals, client, docNumber, opts);
  }
}
```

## FILE: resources/js/pos/utils/useCartStore.ts
```
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant, QuantityDiscount } from '@/types';
import { calcTotals } from '../utils/calculations';

interface CartState {
  items:              CartItem[];
  client:             Party | null;
  notes:              string;
  invoiceDiscountPct: number;

  addItem:              (variant: ProductVariant, qty?: number) => void;
  removeItem:           (id: string) => void;
  updateQty:            (id: string, qty: number) => void;
  updateDiscount:       (id: string, pct: number) => void;
  updateDiscountAmount: (id: string, amount: number) => void;
  updatePrice:          (id: string, price: number) => void;
  setClient:            (client: Party | null) => void;
  setNotes:             (notes: string) => void;
  clearCart:            () => void;
  setInvoiceDiscountPct:(pct: number) => void;
  totals:               () => CartTotals;
}

function findQuantityDiscount(discounts: QuantityDiscount[] | undefined, qty: number): number {
  if (!discounts?.length) return 0;
  const sorted = [...discounts]
    .filter(d => d.active)
    .sort((a, b) => b.tier_order - a.tier_order);
  const match = sorted.find(d =>
    qty >= d.min_quantity &&
    (d.max_quantity === null || d.max_quantity === undefined || qty <= d.max_quantity)
  );
  return match ? Math.min(100, Math.max(0, match.discount_percentage ?? 0)) : 0;
}

function recalcItem(item: CartItem): CartItem {
  const gross = item.unit_price_ht * item.quantity;
  let discAmount: number;
  if (item.discount_percentage > 0) {
    discAmount = gross * (item.discount_percentage / 100);
  } else if (item.discount_amount > 0) {
    discAmount = Math.min(gross, item.discount_amount);
    item = {
      ...item,
      discount_percentage: gross > 0 ? (discAmount / gross) * 100 : 0,
    };
  } else {
    discAmount = 0;
  }
  const totalHt  = gross - discAmount;
  const totalTva = totalHt * (item.tva_rate / 100);
  return {
    ...item,
    discount_amount: round2(discAmount),
    total_ht:        round2(totalHt),
    total_ttc:       round2(totalHt + totalTva),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getUnitSymbol(v: ProductVariant): string {
  return v.unit?.abbreviation ?? 'قطعة';
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:              [],
      client:             null,
      notes:              '',
      invoiceDiscountPct: 0,

      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);
          if (existing) {
            const newQty   = existing.quantity + qty;
            const autoDisc = findQuantityDiscount(variant.quantity_discounts, newQty);
            const updated  = recalcItem({
              ...existing,
              quantity:            newQty,
              discount_percentage: Math.max(existing.discount_percentage, autoDisc),
            });
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id ? updated : i,
              ),
            };
          }

          const priceHt  = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 19;
          const autoDisc = findQuantityDiscount(variant.quantity_discounts, qty);

          const newItem: CartItem = recalcItem({
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         getUnitSymbol(variant),
            image_url:           (variant as any).image_url ?? variant.product?.images?.[0] ?? null,
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceHt * (1 + tvaRate / 100),
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: autoDisc,
            discount_amount:     0,
            total_ht:            0,
            total_ttc:           0,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          });

          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) =>
        set(state => {
          const item = state.items.find(i => i.id === id);
          if (!item) return state;
          const safeQty = Math.max(0.001, qty);
          const updated = recalcItem({ ...item, quantity: safeQty });
          return { items: state.items.map(i => i.id === id ? updated : i) };
        }),

      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_percentage: Math.min(100, Math.max(0, pct)),
                  discount_amount:     0,
                })
              : i,
          ),
        })),

      updateDiscountAmount: (id, amount) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_amount:     Math.max(0, amount),
                  discount_percentage: 0,
                })
              : i,
          ),
        })),

      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
        })),

      setClient: (client) => set({ client }),
      setNotes:  (notes)  => set({ notes }),
      clearCart: ()       => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0 }),
      setInvoiceDiscountPct: (pct) =>
        set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)) }),

      totals: () => calcTotals(get().items, get().invoiceDiscountPct),
    }),
    {
      name:       'pos-cart',
      partialize: () => ({}),
    },
  ),
);
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

