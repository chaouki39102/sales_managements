

# =========================================
# 📘 pos
# =========================================

## FILE: resources/js/pages/pos/POSPage.tsx
```
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

// ✅ لا نُرسل delivery_type للباكاند — حقل غير موجود في DocumentCreateInput حتى الآن
type OrderType = 'dine-in' | 'takeaway' | 'delivery';

// ✅ Quick Items محفوظة في localStorage بـ slug منفصل لكل شركة
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

  // ✅ Quick Items: تُقرأ من localStorage عند أول render
  const [quickItems, setQuickItems] = useState<QuickItem[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(QUICK_ITEMS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showQuickbar, setShowQuickbar] = useState(true);

  // ✅ مزامنة quickItems → localStorage عند كل تغيير
  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(QUICK_ITEMS_KEY(slug), JSON.stringify(quickItems)); }
    catch { /* storage full */ }
  }, [quickItems, slug]);

  // ── Pagination ────────────────────────────────────────────────────────────
  // ✅ productPagesRef و loadedPageRef مُعرَّفان هنا قبل أي استخدام
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
  const { data: productsRaw, isLoading: loadingAll } = useQuery({
    queryKey: [slug, 'products', 'pos', {
      search: pos.searchQuery, cat: pos.selectedCategory, page, per_page: 120,
    }],
    queryFn: () => productsApi.list({
      per_page:  120,
      include:   'tva,unit,family,prices.priceLevel',
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

  // Accumulate pages
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
  // ✅ per_page: 200 — لا حاجة لـ 3000
  const { data: customersData    } = useClients({ per_page: 200 });
  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses       } = useWarehouses();
  const { data: documentTypes    } = useDocumentTypes();
  const { data: priceLevels      } = usePriceLevels();
  const { data: currencies       } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();

  const customers        = (customersData as PaginatedResponse<Party>)?.data ?? (customersData as Party[]) ?? [];
  const priceLevelsList  = priceLevels ?? [];
  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null;
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── Stock /inventory/stock-at ──────────────────────────────────────────────
  const warehouseIdNum = defaultWarehouse?.id ?? null;
  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-stock', warehouseIdNum, fiscalYear?.id],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   warehouseIdNum,
        fiscal_year_id: fiscalYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!warehouseIdNum,
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
        if (variant) pos.addItem(variant);
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
    return () => { window.removeEventListener('keydown', handler); clearTimeout(barcodeTimer.current); };
  }, [allVariants, pos]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag     = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'F1')  { e.preventDefault(); setModal(m => m === 'kbhelp' ? 'none' : 'kbhelp'); }
      if (e.key === 'F2')  { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (e.key === 'F3')  { e.preventDefault(); setShowFilter(s => !s); }
      if (e.key === 'F4')  { e.preventDefault(); if (!isEmpty) setModal('payment'); }
      if (e.key === 'F5')  { e.preventDefault(); if (!isEmpty) pos.holdCart(); }
      if (e.key === 'F6')  { e.preventDefault(); setModal('manual'); }
      if (e.key === 'F7')  { e.preventDefault(); setModal('held'); }
      if (e.key === 'F8')  { e.preventDefault(); setModal(m => m === 'session' ? 'none' : 'session'); }
      if (e.key === 'F9')  { e.preventDefault(); if (!isEmpty) { setReceiptSnapshot({ items: [...pos.items], totals: { ...pos.totals } }); setModal('receipt'); } }
      if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
      if (e.key === 'F12') { e.preventDefault(); if (!isEmpty) pos.clearCart(); }
      if (e.ctrlKey) {
        if (e.key === 'f' || e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
        if (e.key === 'p')      { e.preventDefault(); window.print(); }
        if (e.key === 'Delete') { e.preventDefault(); if (!isEmpty) pos.clearCart(); }
        if (!inInput) {
          if (e.key === 'ArrowUp')        { e.preventDefault(); setView('grid'); }
          if (e.key === 'ArrowDown')      { e.preventDefault(); setView('list'); }
          if (e.key === '+' || e.key === '=') { e.preventDefault(); setGridSize(s => s === 'xs' ? 'sm' : s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'lg'); }
          if (e.key === '-')              { e.preventDefault(); setGridSize(s => s === 'lg' ? 'md' : s === 'md' ? 'sm' : s === 'sm' ? 'xs' : 'xs'); }
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
        if (e.key === 'NumpadAdd'      && lastItem)                          { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity + 1); }
        if (e.key === 'NumpadSubtract' && lastItem && lastItem.quantity > 1) { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity - 1); }
        if (e.key === 'Delete'         && selectedCartItemId)                { e.preventDefault(); pos.removeItem(selectedCartItemId); setSelectedCartItemId(null); }
      }
      if (e.key === 'Escape') {
        if (modal !== 'none')                     setModal('none');
        else if (showFilter)                      setShowFilter(false);
        else if (!inInput && pos.searchQuery)     pos.setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pos, isEmpty, modal, showFilter, families, selectedCartItemId]);

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
      // ✅ price_ht — الحقل الصحيح (كان p.price — خطأ)
      const priceEntry = (variant?.prices as any[])?.find((pr: any) => pr.price_level_id === plId);
      if (priceEntry?.price_ht)            pos.updatePrice(item.id, priceEntry.price_ht);
      else if ((pl as any).discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - (pl as any).discount_percent / 100));
      }
    });
  }, [priceLevelsList, allVariants, pos.items, pos.updatePrice]);

  // ── Complete Sale ──────────────────────────────────────────────────────────
  // ✅ لا تكرار لـ pos.x مع pos في نفس deps array
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

    // استخراج القيم مرة واحدة قبل async
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
          treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
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
            onEnterFirst={() => { const first = filteredVariants[0]; if (first) pos.addItem(first); }}
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
            cartItems={pos.items}
          />
        </div>

        <ProfessionalCart
          items={pos.items} totals={pos.totals} client={pos.client} customers={customers}
          priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
          note={cartNote} selectedItemId={selectedCartItemId}
          onSelectItem={setSelectedCartItemId}
          onQty={pos.updateQty} onDiscount={pos.updateDiscount} onPrice={pos.updatePrice}
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

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals} client={pos.client}
          paymentModes={paymentModes ?? []} documentTypes={documentTypes ?? []}
          currencies={currencies ?? []} totalTtcFinal={adjustedTotalTtcFinal}
          onClose={() => setModal('none')} onConfirm={handleCompleteSale}
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
          sessionInvoices={pos.sessionInvoices} sessionSales={pos.sessionSales}
          heldCount={pos.heldCarts.length} avgMargin={avgMargin}
          onClose={() => setModal('none')}
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

## FILE: resources/js/pages/pos/POSPage.tsx
```
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

// ✅ لا نُرسل delivery_type للباكاند — حقل غير موجود في DocumentCreateInput حتى الآن
type OrderType = 'dine-in' | 'takeaway' | 'delivery';

// ✅ Quick Items محفوظة في localStorage بـ slug منفصل لكل شركة
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

  // ✅ Quick Items: تُقرأ من localStorage عند أول render
  const [quickItems, setQuickItems] = useState<QuickItem[]>(() => {
    if (!slug) return [];
    try {
      const stored = localStorage.getItem(QUICK_ITEMS_KEY(slug));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showQuickbar, setShowQuickbar] = useState(true);

  // ✅ مزامنة quickItems → localStorage عند كل تغيير
  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(QUICK_ITEMS_KEY(slug), JSON.stringify(quickItems)); }
    catch { /* storage full */ }
  }, [quickItems, slug]);

  // ── Pagination ────────────────────────────────────────────────────────────
  // ✅ productPagesRef و loadedPageRef مُعرَّفان هنا قبل أي استخدام
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
  const { data: productsRaw, isLoading: loadingAll } = useQuery({
    queryKey: [slug, 'products', 'pos', {
      search: pos.searchQuery, cat: pos.selectedCategory, page, per_page: 120,
    }],
    queryFn: () => productsApi.list({
      per_page:  120,
      include:   'tva,unit,family,prices.priceLevel',
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

  // Accumulate pages
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
  // ✅ per_page: 200 — لا حاجة لـ 3000
  const { data: customersData    } = useClients({ per_page: 200 });
  const { data: paymentModes     } = usePaymentModes();
  const { data: warehouses       } = useWarehouses();
  const { data: documentTypes    } = useDocumentTypes();
  const { data: priceLevels      } = usePriceLevels();
  const { data: currencies       } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();

  const customers        = (customersData as PaginatedResponse<Party>)?.data ?? (customersData as Party[]) ?? [];
  const priceLevelsList  = priceLevels ?? [];
  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null;
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ── Stock /inventory/stock-at ──────────────────────────────────────────────
  const warehouseIdNum = defaultWarehouse?.id ?? null;
  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'pos-stock', warehouseIdNum, fiscalYear?.id],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   warehouseIdNum,
        fiscal_year_id: fiscalYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!warehouseIdNum,
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
        if (variant) pos.addItem(variant);
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
    return () => { window.removeEventListener('keydown', handler); clearTimeout(barcodeTimer.current); };
  }, [allVariants, pos]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag     = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'F1')  { e.preventDefault(); setModal(m => m === 'kbhelp' ? 'none' : 'kbhelp'); }
      if (e.key === 'F2')  { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (e.key === 'F3')  { e.preventDefault(); setShowFilter(s => !s); }
      if (e.key === 'F4')  { e.preventDefault(); if (!isEmpty) setModal('payment'); }
      if (e.key === 'F5')  { e.preventDefault(); if (!isEmpty) pos.holdCart(); }
      if (e.key === 'F6')  { e.preventDefault(); setModal('manual'); }
      if (e.key === 'F7')  { e.preventDefault(); setModal('held'); }
      if (e.key === 'F8')  { e.preventDefault(); setModal(m => m === 'session' ? 'none' : 'session'); }
      if (e.key === 'F9')  { e.preventDefault(); if (!isEmpty) { setReceiptSnapshot({ items: [...pos.items], totals: { ...pos.totals } }); setModal('receipt'); } }
      if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
      if (e.key === 'F12') { e.preventDefault(); if (!isEmpty) pos.clearCart(); }
      if (e.ctrlKey) {
        if (e.key === 'f' || e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
        if (e.key === 'p')      { e.preventDefault(); window.print(); }
        if (e.key === 'Delete') { e.preventDefault(); if (!isEmpty) pos.clearCart(); }
        if (!inInput) {
          if (e.key === 'ArrowUp')        { e.preventDefault(); setView('grid'); }
          if (e.key === 'ArrowDown')      { e.preventDefault(); setView('list'); }
          if (e.key === '+' || e.key === '=') { e.preventDefault(); setGridSize(s => s === 'xs' ? 'sm' : s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'lg'); }
          if (e.key === '-')              { e.preventDefault(); setGridSize(s => s === 'lg' ? 'md' : s === 'md' ? 'sm' : s === 'sm' ? 'xs' : 'xs'); }
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
        if (e.key === 'NumpadAdd'      && lastItem)                          { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity + 1); }
        if (e.key === 'NumpadSubtract' && lastItem && lastItem.quantity > 1) { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity - 1); }
        if (e.key === 'Delete'         && selectedCartItemId)                { e.preventDefault(); pos.removeItem(selectedCartItemId); setSelectedCartItemId(null); }
      }
      if (e.key === 'Escape') {
        if (modal !== 'none')                     setModal('none');
        else if (showFilter)                      setShowFilter(false);
        else if (!inInput && pos.searchQuery)     pos.setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pos, isEmpty, modal, showFilter, families, selectedCartItemId]);

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
      // ✅ price_ht — الحقل الصحيح (كان p.price — خطأ)
      const priceEntry = (variant?.prices as any[])?.find((pr: any) => pr.price_level_id === plId);
      if (priceEntry?.price_ht)            pos.updatePrice(item.id, priceEntry.price_ht);
      else if ((pl as any).discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - (pl as any).discount_percent / 100));
      }
    });
  }, [priceLevelsList, allVariants, pos.items, pos.updatePrice]);

  // ── Complete Sale ──────────────────────────────────────────────────────────
  // ✅ لا تكرار لـ pos.x مع pos في نفس deps array
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

    // استخراج القيم مرة واحدة قبل async
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
          treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
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
            onEnterFirst={() => { const first = filteredVariants[0]; if (first) pos.addItem(first); }}
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
            cartItems={pos.items}
          />
        </div>

        <ProfessionalCart
          items={pos.items} totals={pos.totals} client={pos.client} customers={customers}
          priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
          note={cartNote} selectedItemId={selectedCartItemId}
          onSelectItem={setSelectedCartItemId}
          onQty={pos.updateQty} onDiscount={pos.updateDiscount} onPrice={pos.updatePrice}
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

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals} client={pos.client}
          paymentModes={paymentModes ?? []} documentTypes={documentTypes ?? []}
          currencies={currencies ?? []} totalTtcFinal={adjustedTotalTtcFinal}
          onClose={() => setModal('none')} onConfirm={handleCompleteSale}
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
          sessionInvoices={pos.sessionInvoices} sessionSales={pos.sessionSales}
          heldCount={pos.heldCarts.length} avgMargin={avgMargin}
          onClose={() => setModal('none')}
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
import React, { useState } from 'react';
import type { CartItem } from '@/types';
import { formatDZD } from '../utils/calculations';

interface CartRowProps {
  item: CartItem; idx: number; isSelected: boolean;
  onSelect: () => void;
  onQty: (qty: number) => void;
  onDiscount: (pct: number) => void;
  onPrice: (price: number) => void;
  onRemove: () => void;
}

export default function CartRow({
  item, idx, isSelected, onSelect, onQty, onDiscount, onPrice, onRemove,
}: CartRowProps) {
  const [editQty,  setEditQty]  = useState(false);
  const [editDisc, setEditDisc] = useState(false);
  const [editPrc,  setEditPrc]  = useState(false);
  const [qtyVal,   setQtyVal]   = useState(String(item.quantity));
  const [discVal,  setDiscVal]  = useState(String(item.discount_percentage));
  const [prcVal,   setPrcVal]   = useState(String(item.unit_price_ht));

  const commitQty  = () => { const v = parseFloat(qtyVal); if (!isNaN(v) && v > 0) onQty(v); else setQtyVal(String(item.quantity)); setEditQty(false); };
  const commitDisc = () => { const v = parseFloat(discVal); if (!isNaN(v)) onDiscount(Math.min(100, Math.max(0, v))); else setDiscVal(String(item.discount_percentage)); setEditDisc(false); };
  const commitPrc  = () => { const v = parseFloat(prcVal); if (!isNaN(v) && v >= 0) onPrice(v); else setPrcVal(String(item.unit_price_ht)); setEditPrc(false); };

  return (
    <div
      className={`cart-row ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="cr-idx">{idx + 1}</div>
      <div className="cr-info">
        <div className="cr-name">{item.product_name}</div>
        {item.variant_name && <div className="cr-variant">{item.variant_name}</div>}
        <div className="cr-meta">
          {editPrc ? (
            <input
              className="cr-edit-inp"
              type="number"
              value={prcVal}
              onChange={e => setPrcVal(e.target.value)}
              onBlur={commitPrc}
              onKeyDown={e => { if (e.key === 'Enter') commitPrc(); if (e.key === 'Escape') setEditPrc(false); }}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ width: 80 }}
            />
          ) : (
            <span className="cr-price" onClick={e => { e.stopPropagation(); setEditPrc(true); setPrcVal(String(item.unit_price_ht)); }} title="انقر لتعديل السعر">
              {formatDZD(item.unit_price_ht)}
            </span>
          )}
          <span className="cr-tva">TVA {item.tva_rate}%</span>
          {editDisc ? (
            <input
              className="cr-edit-inp"
              type="number"
              value={discVal}
              onChange={e => setDiscVal(e.target.value)}
              onBlur={commitDisc}
              onKeyDown={e => { if (e.key === 'Enter') commitDisc(); if (e.key === 'Escape') setEditDisc(false); }}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ width: 60 }}
            />
          ) : item.discount_percentage > 0 ? (
            <span className="cr-disc" onClick={e => { e.stopPropagation(); setEditDisc(true); setDiscVal(String(item.discount_percentage)); }} title="انقر لتعديل الخصم">
              -{item.discount_percentage}%
            </span>
          ) : (
            <span className="cr-disc-add" onClick={e => { e.stopPropagation(); setEditDisc(true); setDiscVal('0'); }} title="إضافة خصم">
              + خصم
            </span>
          )}
        </div>
      </div>

      <div className="cr-qty-ctrl" onClick={e => e.stopPropagation()}>
        <button className="cq-btn" onClick={() => onQty(Math.max(0.001, item.quantity - 1))} title="إنقاص (NumPad -)">
          <i className="ti ti-minus" />
        </button>
        {editQty ? (
          <input
            className="cr-edit-inp cq-inp"
            type="number"
            value={qtyVal}
            onChange={e => setQtyVal(e.target.value)}
            onBlur={commitQty}
            onKeyDown={e => { if (e.key === 'Enter') commitQty(); if (e.key === 'Escape') setEditQty(false); }}
            autoFocus
          />
        ) : (
          <span
            className="cq-val"
            onClick={() => { setEditQty(true); setQtyVal(String(item.quantity)); }}
            title="انقر لتعديل الكمية"
          >
            {item.quantity}
          </span>
        )}
        <button className="cq-btn" onClick={() => {
          if (item.max_stock !== null && item.quantity >= item.max_stock && !item.manages_stock) return;
          onQty(item.quantity + 1);
        }} title="زيادة (NumPad +)">
          <i className="ti ti-plus" />
        </button>
        <span className="cq-unit">{item.unit_symbol}</span>
      </div>

      <div className="cr-total">
        <div className="cr-ttc">{formatDZD(item.total_ttc)}</div>
        <div className="cr-ht">HT: {formatDZD(item.total_ht)}</div>
      </div>

      <button className="cr-del" onClick={e => { e.stopPropagation(); onRemove(); }} title="حذف الصنف (Del)">
        <i className="ti ti-x" />
      </button>
    </div>
  );
}
```

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
import React from 'react';

interface KeyboardHelpModalProps {
  onClose: () => void;
}

export default function KeyboardHelpModal({ onClose }: KeyboardHelpModalProps) {
  const groups = [
    {
      title: 'الوظائف الرئيسية',
      items: [
        { key: 'F2', desc: 'تركيز شريط البحث' },
        { key: 'F4', desc: 'فتح مودال الدفع' },
        { key: 'F5', desc: 'تعليق الفاتورة الحالية' },
        { key: 'F7', desc: 'الفواتير المعلقة' },
        { key: 'F9', desc: 'معاينة / طباعة' },
        { key: 'F12', desc: 'مسح السلة' },
      ],
    },
    {
      title: 'أدوات إضافية',
      items: [
        { key: 'F1', desc: 'هذه المساعدة' },
        { key: 'F3', desc: 'لوحة الفلتر' },
        { key: 'F6', desc: 'إضافة منتج يدوي' },
        { key: 'F8', desc: 'إحصاءات الجلسة' },
        { key: 'F11', desc: 'وضع الشاشة الكاملة' },
        { key: 'Ctrl+P', desc: 'طباعة مباشرة' },
      ],
    },
    {
      title: 'التنقل والعرض',
      items: [
        { key: 'Ctrl+F', desc: 'البحث السريع' },
        { key: 'Ctrl+↑', desc: 'عرض الشبكة' },
        { key: 'Ctrl+↓', desc: 'عرض القائمة' },
        { key: 'Ctrl++', desc: 'تكبير الشبكة' },
        { key: 'Ctrl+-', desc: 'تصغير الشبكة' },
        { key: 'Alt+1..9', desc: 'تصنيف سريع' },
      ],
    },
    {
      title: 'السلة والأصناف',
      items: [
        { key: 'NumPad+', desc: 'زيادة كمية آخر صنف' },
        { key: 'NumPad-', desc: 'إنقاص كمية آخر صنف' },
        { key: 'Del', desc: 'حذف الصنف المحدد' },
        { key: 'Enter (بحث)', desc: 'إضافة أول نتيجة' },
        { key: 'Escape', desc: 'إغلاق المودال / مسح البحث' },
        { key: 'Ctrl+Enter', desc: 'تأكيد الدفع (داخل المودال)' },
      ],
    },
    {
      title: 'الماسح الضوئي',
      items: [
        { key: 'Barcode', desc: 'ينشّط تلقائياً بمسح الباركود' },
        { key: 'أي حرف', desc: 'يُجمع في buffer 300ms' },
        { key: 'Enter', desc: 'تأكيد الباركود وإضافة الصنف' },
      ],
    },
  ];

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-keyboard" style={{ marginLeft: 6 }} /> دليل الاختصارات</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          <div className="kb-help-groups">
            {groups.map(g => (
              <div key={g.title} className="kb-group">
                <div className="kb-group-title">{g.title}</div>
                <div className="kb-help-grid">
                  {g.items.map(s => (
                    <div key={s.key} className="kb-help-row">
                      <kbd className="kb-key">{s.key}</kbd>
                      <span className="kb-desc">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="m-foot">
          <button className="btn btn-p" onClick={onClose}>فهمت</button>
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
  items: CartItem[]; totals: CartTotals; totalTtcFinal: number;
}

export default function POSTopBar({
  sessionInvoices, sessionSales, heldCount, avgMargin,
  isEmpty, isFullscreen, showQuickbar,
  onHeld, onNewSale, onManual, onReceipt, onSession, onFullscreen, onKbHelp,
  onToggleQuickbar, items, totals, totalTtcFinal,
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
      </div>

      <div className="pos-kb-strip">
        {[
          { key: 'F2', label: 'بحث' },
          { key: 'F4', label: 'دفع' },
          { key: 'F5', label: 'تعليق' },
          { key: 'F6', label: 'يدوي' },
          { key: 'F7', label: 'معلقة' },
          { key: 'F9', label: 'طباعة' },
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
import { getVariantPrice, familyStyleFromName } from '../utils/posHelpers';

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
  onPin, isPinned, priceLevels, selectedPriceLevelId, cartItems,
}: ProductGridProps) {
  const inCartQty = useCallback((variantId: number) => {
    return cartItems.find(i => i.variant_id === variantId)?.quantity ?? 0;
  }, [cartItems]);

  if (loading) return (
    <div className="pos-loading">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="pos-skel" style={{ animationDelay: `${i * 0.04}s` }} />
      ))}
    </div>
  );

  if (!variants.length) return (
    <div className="pos-empty">
      <div className="pos-empty-ico"><i className="ti ti-package-off" /></div>
      <div className="pos-empty-ttl">لا توجد منتجات</div>
      <div className="pos-empty-sub">جرّب البحث بكلمة أخرى أو أضف منتجاً يدوياً</div>
      <button className="btn btn-sm" onClick={onAddManual}>
        <i className="ti ti-plus" /> إضافة يدوية
      </button>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="pos-list-wrap">
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
              const lowStock  = v.manages_stock && (v.current_stock ?? 0) > 0 && (v.current_stock ?? 0) <= (v.min_stock_alert ?? 0);
              const outStock  = v.manages_stock && (v.current_stock ?? 0) <= 0;
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
                    {v.manages_stock
                      ? <span className={`stock-pill ${outStock ? 'out' : lowStock ? 'low' : 'ok'}`}>{v.current_stock ?? 0}</span>
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
                        disabled={outStock && !v.allow_negative_stock}
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
    <>
      <div className={`pgrid ${colsMap[gridSize]}`}>
        {variants.map(v => {
          const priceHt  = getVariantPrice(v, selectedPriceLevelId, priceLevels);
          const tvaRate  = v.tva?.rate ?? 19;
          const priceTtc = priceHt * (1 + tvaRate / 100);
          const inCart   = inCartQty(v.id);
          const stock    = v.current_stock ?? 0;
          const outStock = v.manages_stock && stock <= 0 && !v.allow_negative_stock;
          const lowStock = v.manages_stock && stock > 0 && stock <= (v.min_stock_alert ?? 0);

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

                {v.manages_stock && (
                  <div className={`pcard-stock ${outStock ? 'out' : lowStock ? 'low' : 'ok'}`}>
                    <i className={`ti ti-${outStock ? 'alert-circle' : lowStock ? 'alert-triangle' : 'package'}`} />
                    {outStock ? 'نفذ المخزون' : `${stock} ${v.unit?.abbreviation ?? ''}`}
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
    </>
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
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { CartItem, CartTotals, Party, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import CartRow from './CartRow';

interface ProfessionalCartProps {
  items:       CartItem[];
  totals:      CartTotals;
  client:      Party | null;
  customers:   Party[];
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  note:        string;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onQty:       (id: string, qty: number) => void;
  onDiscount:  (id: string, pct: number) => void;
  onPrice:     (id: string, price: number) => void;
  onRemove:    (id: string) => void;
  onSetClient: (c: Party | null) => void;
  onPriceLevelChange: (plId: number | null) => void;
  onNoteChange: (n: string) => void;
  onHold:      () => void;
  onSell:      () => void;
  onClear:     () => void;
  onHeld:      () => void;
  totalTtcFinal: number;
  invoiceDiscountPct?: number;
  onInvoiceDiscountChange?: (pct: number) => void;
  invoiceDiscountAmount?: number;
}

export default function ProfessionalCart({
  items, totals, client, customers, priceLevels, selectedPriceLevelId,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onPrice, onRemove, onSetClient, onPriceLevelChange,
  onNoteChange, onHold, onSell, onClear, onHeld, totalTtcFinal,
  invoiceDiscountPct = 0, onInvoiceDiscountChange, invoiceDiscountAmount = 0,
}: ProfessionalCartProps) {
  const [showNote,      setShowNote]    = useState(false);
  const [clientSearch,  setClientSearch] = useState('');
  const [openClient,    setOpenClient]  = useState(false);
  const clientRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node))
        setOpenClient(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredCustomers = useMemo(() =>
    customers.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())),
    [customers, clientSearch]
  );

  const isEmpty = !items.length;

  return (
    <div className="pos-cart" id="pos-cart">

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
                {pl.discount_percent ? <span className="cmode-disc">-{pl.discount_percent}%</span> : null}
              </button>
            ))}
          </div>
        )}

        <div className="cart-client" ref={clientRef}>
          <div
            className={`client-trigger ${openClient ? 'open' : ''} ${client ? 'has-client' : ''}`}
            onClick={() => setOpenClient(s => !s)}
          >
            <i className="ti ti-user-search" style={{ fontSize: 14, opacity: 0.6 }} />
            <span className="ct-name">
              {client ? client.name : 'زبون عابر'}
            </span>
            {client?.balance !== undefined && client.balance > 0 && (
              <span className="ct-debt" title="رصيد الدين">
                <i className="ti ti-alert-circle" style={{ fontSize: 10 }} />
                {formatDZD(client.balance)}
              </span>
            )}
            <i className="ti ti-chevron-down" style={{ fontSize: 11, opacity: 0.4, marginRight: 'auto' }} />
          </div>

          {openClient && (
            <div className="client-dropdown">
              <div className="cd-search">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="🔍 ابحث عن زبون..."
                  autoFocus
                />
              </div>
              <div className="cd-list">
                <div
                  className={`cd-opt ${!client ? 'sel' : ''}`}
                  onClick={() => { onSetClient(null); setClientSearch(''); setOpenClient(false); }}
                >
                  <span className="co-av">👤</span>
                  <span className="co-nm">زبون عابر</span>
                </div>
                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    className={`cd-opt ${client?.id === c.id ? 'sel' : ''}`}
                    onClick={() => { onSetClient(c); setClientSearch(''); setOpenClient(false); }}
                  >
                    <span className="co-av">{c.name[0]}</span>
                    <div className="co-info">
                      <span className="co-nm">{c.name}</span>
                      {c.phone && <span className="co-ph">{c.phone}</span>}
                    </div>
                    {c.balance !== undefined && c.balance > 0 && (
                      <span className="co-debt">{formatDZD(c.balance)}</span>
                    )}
                  </div>
                ))}
                {!filteredCustomers.length && clientSearch && (
                  <div className="cd-empty">لا توجد نتائج</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
              onPrice={price => onPrice(item.id, price)}
              onRemove={() => onRemove(item.id)}
            />
          ))
        )}
      </div>

      {!isEmpty && (
        <div className="cart-totals">
          <div className="ct-row">
            <span>المجموع HT</span>
            <span>{formatDZD(totals.total_ht)}</span>
          </div>
          {totals.total_discount > 0 && (
            <div className="ct-row ct-disc">
              <span>إجمالي الخصم</span>
              <span>- {formatDZD(totals.total_discount)}</span>
            </div>
          )}
          <div className="ct-row">
            <span>TVA</span>
            <span>{formatDZD(totals.total_tva)}</span>
          </div>
          {onInvoiceDiscountChange && (
            <div className="ct-row ct-disc">
              <span>خصم الفاتورة</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  className="ct-disc-inp"
                  value={invoiceDiscountPct}
                  onChange={e => onInvoiceDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  min={0}
                  max={100}
                  step={1}
                  style={{ width: 50, padding: '2px 4px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'var(--bg3)', fontFamily: 'Tajawal,sans-serif', fontSize: 12, textAlign: 'center', outline: 'none' }}
                />
                <span style={{ fontSize: 11 }}>%</span>
                {invoiceDiscountAmount > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>-{formatDZD(invoiceDiscountAmount)}</span>
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
  );
}
```

## FILE: resources/js/pos/components/ProfessionalPaymentModal.tsx
```
import React, { useState, useEffect, useCallback } from 'react';
import type { CartTotals, Party, PaymentMode, DocumentType, Currency } from '@/types';
import { formatDZD } from '../utils/calculations';

export interface PaymentLine {
  paymentModeId: number;
  amount:        number;
}

interface ProfessionalPaymentModalProps {
  totals:        CartTotals;
  client:        Party | null;
  paymentModes:  PaymentMode[];
  documentTypes: DocumentType[];
  currencies?:   Currency[];
  totalTtcFinal: number;
  onClose:       () => void;
  onConfirm:     (params: any) => Promise<{ ok: boolean; message?: string }>;
}

const DOC_CODES = ['FV', 'BL', 'BCC', 'FA'];

export default function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes, currencies, totalTtcFinal, onClose, onConfirm,
}: ProfessionalPaymentModalProps) {
  const [paymentLines, setPaymentLines] = useState<Array<{
    id: string; modeId: number; amount: string; refNote: string;
  }>>(() => {
    const defaultMode = paymentModes.find(m => m.is_default) ?? paymentModes[0];
    return defaultMode ? [{
      id:      Math.random().toString(36).slice(2),
      modeId:  defaultMode.id,
      amount:  String(totalTtcFinal.toFixed(2)),
      refNote: '',
    }] : [];
  });

  const [docTypeCode, setDocTypeCode] = useState<string>('FV');
  const [dueDate,     setDueDate]     = useState('');
  const [note,        setNote]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(
    currencies?.find(c => c.is_base_currency)?.id ?? currencies?.[0]?.id ?? null
  );

  const totalPaid = paymentLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const remaining = totalTtcFinal - totalPaid;
  const change    = totalPaid > totalTtcFinal ? totalPaid - totalTtcFinal : 0;
  const canSubmit = totalPaid > 0 && !submitting;

  const addLine = useCallback(() => {
    const firstMode = paymentModes[0];
    if (!firstMode) return;
    setPaymentLines(prev => [...prev, {
      id:      Math.random().toString(36).slice(2),
      modeId:  firstMode.id,
      amount:  String(Math.max(0, remaining).toFixed(2)),
      refNote: '',
    }]);
  }, [paymentModes, remaining]);

  const removeLine = (id: string) =>
    setPaymentLines(prev => prev.filter(l => l.id !== id));

  const updateLine = (id: string, key: 'modeId' | 'amount' | 'refNote', val: any) =>
    setPaymentLines(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l));

  const fillRemaining = (id: string) => {
    const others = paymentLines.filter(l => l.id !== id).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const rem = Math.max(0, totalTtcFinal - others);
    updateLine(id, 'amount', rem.toFixed(2));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const payments = paymentLines
      .filter(l => parseFloat(l.amount) > 0)
      .map(l => ({ paymentModeId: l.modeId, amount: parseFloat(l.amount), treasuryAccountId: null }));
    const res = await onConfirm({
      amountPaid: totalPaid,
      payments,
      docTypeCode,
      dueDate,
      note,
      currencyId: selectedCurrencyId,
    });
    setSubmitting(false);
    if (!res.ok) setError(res.message ?? 'خطأ غير معروف');
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSubmit]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-pay" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-credit-card" style={{ marginLeft: 6 }} />
            إتمام عملية الدفع
            {client && <span className="m-client-tag">{client.name}</span>}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        <div className="m-body pay-body">
          <div className="pay-summary">
            <div className="pay-sum-title">ملخص الفاتورة</div>
            <div className="pay-sum-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="pay-sum-row disc">
                <span>خصم</span>
                <span>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}
            <div className="pay-sum-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>
            {totals.fiscal_stamp > 0 && (
              <div className="pay-sum-row">
                <span>طابع مالي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}
            <div className="pay-sum-row grand">
              <span>الإجمالي</span>
              <strong>{formatDZD(totalTtcFinal)}</strong>
            </div>

            {currencies && currencies.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div className="pay-sec-ttl">العملة</div>
                <select
                  className="pay-currency-sel"
                  value={selectedCurrencyId ?? ''}
                  onChange={e => setSelectedCurrencyId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name} {c.is_base_currency ? '(الرئيسية)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div className="pay-sec-ttl">نوع الوثيقة</div>
              <div className="pay-doc-types">
                {documentTypes.filter(t => DOC_CODES.includes(t.code)).map(t => (
                  <button
                    key={t.id}
                    className={`pdt ${docTypeCode === t.code ? 'on' : ''}`}
                    onClick={() => setDocTypeCode(t.code)}
                  >
                    {t.code}
                    <span className="pdt-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="pay-sec-ttl">تاريخ الاستحقاق (اختياري)</div>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="pay-date-inp"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="pay-sec-ttl">ملاحظة</div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="pay-note-inp"
                rows={2}
                placeholder="ملاحظة على الفاتورة..."
              />
            </div>
          </div>

          <div className="pay-methods">
            <div className="pay-sec-ttl">وسائل الدفع</div>

            <div className="pay-lines">
              {paymentLines.map((line, idx) => (
                <div key={line.id} className="pay-line">
                  <div className="pl-num">{idx + 1}</div>
                  <select
                    className="pl-mode"
                    value={line.modeId}
                    onChange={e => updateLine(line.id, 'modeId', parseInt(e.target.value))}
                  >
                    {paymentModes.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="pl-amt-wrap">
                    <input
                      type="number"
                      className="pl-amount"
                      value={line.amount}
                      onChange={e => updateLine(line.id, 'amount', e.target.value)}
                      placeholder="المبلغ"
                    />
                    <button
                      className="pl-fill"
                      onClick={() => fillRemaining(line.id)}
                      title="تعبئة المتبقي"
                    >
                      ≈
                    </button>
                  </div>
                  <input
                    type="text"
                    className="pl-ref"
                    value={line.refNote}
                    onChange={e => updateLine(line.id, 'refNote', e.target.value)}
                    placeholder="رقم مرجعي..."
                  />
                  {paymentLines.length > 1 && (
                    <button className="pl-del" onClick={() => removeLine(line.id)}>
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="btn btn-xs" onClick={addLine} style={{ marginTop: 6 }}>
              <i className="ti ti-plus" /> إضافة وسيلة دفع
            </button>

            <div className="pay-nums">
              <div className="pn-row">
                <span>المبلغ المدفوع</span>
                <strong className="pn-paid">{formatDZD(totalPaid)}</strong>
              </div>
              {remaining > 0.01 && (
                <div className="pn-row pn-rem">
                  <span>المتبقي</span>
                  <strong>{formatDZD(remaining)}</strong>
                </div>
              )}
              {change > 0.01 && (
                <div className="pn-row pn-chg">
                  <span>الباقي للزبون</span>
                  <strong>{formatDZD(change)}</strong>
                </div>
              )}
            </div>

            {error && (
              <div className="al al-r" style={{ marginTop: 10 }}>
                <i className="ti ti-alert-circle" />
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title="تأكيد الدفع — Ctrl+Enter"
          >
            {submitting
              ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
              : <><i className="ti ti-circle-check" /> تأكيد الدفع — {formatDZD(totalPaid)}</>
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
import React, { useState } from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import { printThermalViaWebUSB, isWebUsbSupported } from '../utils/printService';

interface ProfessionalReceiptProps {
  items: CartItem[]; totals: CartTotals; client: Party | null;
  docNumber?: string; onClose: () => void; onPrint: () => void; onNewSale: () => void;
}

export default function ProfessionalReceipt({
  items, totals, client, docNumber, onClose, onPrint, onNewSale,
}: ProfessionalReceiptProps) {
  const [thermalStatus, setThermalStatus] = useState<string | null>(null);
  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;
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
                const res = await printThermalViaWebUSB(items, totals, client, docNumber);
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

interface QuickItemsBarProps {
  quickItems: QuickItem[];
  allVariants: ProductVariant[];
  onAdd: (v: ProductVariant) => void;
  onRemove: (variantId: number) => void;
}

export default function QuickItemsBar({
  quickItems, allVariants, onAdd, onRemove,
}: QuickItemsBarProps) {
  return (
    <div className="pos-quickbar">
      <span className="pqb-label">
        <i className="ti ti-star" /> مفضلة
      </span>
      {quickItems.map(q => {
        const variant = allVariants.find(v => v.id === q.variantId);
        return (
          <div key={q.variantId} className="pqb-item" title={q.name}>
            <button
              className="pqb-add"
              onClick={() => variant && onAdd(variant)}
              disabled={!variant}
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

## FILE: resources/js/pos/components/SessionStatsModal.tsx
```
import React from 'react';
import { formatDZD } from '../utils/calculations';

interface SessionStatsModalProps {
  sessionInvoices: number; sessionSales: number;
  heldCount: number; avgMargin: number; onClose: () => void;
}

export default function SessionStatsModal({
  sessionInvoices, sessionSales, heldCount, avgMargin, onClose,
}: SessionStatsModalProps) {
  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-chart-bar" style={{ marginLeft: 6 }} /> إحصاءات الجلسة</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          <div className="session-grid">
            {[
              { label: 'عدد الفواتير', value: sessionInvoices, icon: 'ti-receipt', cls: 'g' },
              { label: 'إجمالي المبيعات', value: formatDZD(sessionSales), icon: 'ti-cash', cls: 'o' },
              { label: 'فواتير معلقة', value: heldCount, icon: 'ti-clock-pause', cls: 'b' },
              { label: 'متوسط الهامش', value: `${avgMargin.toFixed(1)}%`, icon: 'ti-trending-up', cls: 'p' },
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
        </div>
        <div className="m-foot">
          <button className="btn btn-p" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/hooks/usePOS.ts
```
// resources/js/pos/hooks/usePOS.ts
// ════════════════════════════════════════════════════════════════════════════
// Hook موحَّد يجمع POSStore + CartStore
//
// ✅ إصلاح: calcFiscalStamp مستوردة من calculations.ts
//    (كانت مُضمَّنة inline بدون cap — الآن متطابقة مع LF 2024)
// ✅ invoiceDiscountPct من useCartStore
// ✅ holdCart يمرر items/totals/client/clearCart كمعاملات
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useCallback } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcTotals }    from '../utils/calculations';

export function usePOS() {
  const sessionStarted    = usePOSStore(s => s.sessionStarted);
  const sessionInvoices   = usePOSStore(s => s.sessionInvoices);
  const sessionSales      = usePOSStore(s => s.sessionSales);
  const heldCarts         = usePOSStore(s => s.heldCarts);
  const activeTab         = usePOSStore(s => s.activeTab);
  const searchQuery       = usePOSStore(s => s.searchQuery);
  const selectedCategory  = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen  = usePOSStore(s => s.paymentModalOpen);

  const startSession      = usePOSStore(s => s.startSession);
  const endSession        = usePOSStore(s => s.endSession);
  const incrementSession  = usePOSStore(s => s.incrementSession);
  const posHoldCart       = usePOSStore(s => s.holdCart);
  const restoreCart       = usePOSStore(s => s.restoreCart);
  const deleteHeldCart    = usePOSStore(s => s.deleteHeldCart);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // ── Derive totals from stable selectors (NOT s.totals() which creates new ref each call) ──
  const items   = useCartStore(s => s.items);
  const client  = useCartStore(s => s.client);
  const invoiceDiscountPct = useCartStore(s => s.invoiceDiscountPct);
  const totals  = useMemo(() => calcTotals(items, invoiceDiscountPct), [items, invoiceDiscountPct]);

  const addItem        = useCartStore(s => s.addItem);
  const removeItem     = useCartStore(s => s.removeItem);
  const updateQty      = useCartStore(s => s.updateQty);
  const updateDiscount = useCartStore(s => s.updateDiscount);
  const updatePrice    = useCartStore(s => s.updatePrice);
  const clearCart      = useCartStore(s => s.clearCart);
  const setClient      = useCartStore(s => s.setClient);
  const setInvoiceDiscountPct = useCartStore(s => s.setInvoiceDiscountPct);

  const holdCart = useCallback((label?: string) => {
    const state = useCartStore.getState();
    posHoldCart({
      items:     state.items,
      totals:    calcTotals(state.items, state.invoiceDiscountPct),
      client:    state.client,
      label,
      clearCart: state.clearCart,
    });
  }, [posHoldCart]);

  return {
    sessionStarted, sessionInvoices, sessionSales,
    startSession, endSession, incrementSession,

    heldCarts, holdCart, restoreCart, deleteHeldCart,

    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    items, client, invoiceDiscountPct,
    addItem, removeItem, updateQty, updateDiscount, updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  };
}
```

## FILE: resources/js/pos/hooks/usePOSStore.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePOSStore.ts
//
// حالة نقطة البيع الكاملة
//
// ✅ useUIStore مُحذف من هنا — موجود في lib/store/uiStore.ts
// ✅ holdCart تستقبل items, totals, client, clearCart كمعاملات
//    (بدلاً من الاتصال المباشر بـ useCartStore.getState())
// ════════════════════════════════════════════════════════════════════════════

import { create }        from 'zustand';
import { nanoid }        from 'nanoid';
import { useCartStore }  from '../utils/useCartStore';
import type { HeldCart, CartItem, CartTotals, Party } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface POSState {
  sessionStarted:   boolean;
  sessionInvoices:  number;
  sessionSales:     number;
  heldCarts:        HeldCart[];
  activeTab:        'products' | 'clients' | 'held';
  searchQuery:      string;
  selectedCategory: number | null;
  paymentModalOpen: boolean;

  startSession:     () => void;
  endSession:       () => void;
  incrementSession: (amount: number) => void;

  holdCart:         (params: { items: CartItem[]; totals: CartTotals; client: Party | null; label?: string; clearCart: () => void }) => void;
  restoreCart:      (id: string) => void;
  deleteHeldCart:   (id: string) => void;

  setTab:           (tab: POSState['activeTab']) => void;
  setSearch:        (q: string) => void;
  setCategory:      (id: number | null) => void;
  openPayment:      () => void;
  closePayment:     () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () =>
    set({ sessionStarted: true, sessionInvoices: 0, sessionSales: 0 }),

  endSession: () => set({ sessionStarted: false }),

  incrementSession: (amount) =>
    set((s) => ({
      sessionInvoices: s.sessionInvoices + 1,
      sessionSales:    s.sessionSales + amount,
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
import type { Product, ProductVariant, ProductVariantPrice, PriceLevel } from '@/types';

type ProductApiResponse = Product & { current_stock?: number; prices?: ProductVariantPrice[] };

export type ViewMode = 'grid' | 'list';
export type GridSize = 'xs' | 'sm' | 'md' | 'lg';
export type SortMode = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'family';
export type ActiveModal = 'none' | 'payment' | 'held' | 'receipt' | 'manual' | 'kbhelp' | 'session' | 'barcode';

export interface QuickItem { variantId: number; name: string; priceHt: number; tvaRate: number; }

export function getVariantPrice(
  v: ProductVariant,
  priceLevelId: number | null,
  priceLevels: PriceLevel[],
): number {
  if (priceLevelId) {
    const priceEntry = v.prices?.find((p: ProductVariantPrice) => p.price_level_id === priceLevelId);
    if (priceEntry) return priceEntry.price;
    const pl = priceLevels.find(p => p.id === priceLevelId);
    if (pl?.discount_percent)
      return v.default_selling_price_ht * (1 - pl.discount_percent / 100);
  }
  return v.default_selling_price_ht;
}

export function productToVariant(p: Product): ProductVariant {
  return {
    id:                         p.id,
    product_id:                 p.id,
    ref:                        p.ref ?? '',
    barcode:                    p.barcode,
    variant_name:               '',
    unit_id:                    p.unit_id,
    tva_id:                     p.tva_id,
    last_purchase_price:        p.purchase_price_ht ?? 0,
    average_cost_price:         p.current_cost_price ?? 0,
    default_selling_price_ht:   p.default_selling_price_ht ?? (p.purchase_price_ht ? p.purchase_price_ht * 1.3 : 0),
    manages_stock:              p.manages_stock,
    allow_negative_stock:       p.allow_negative_stock,
    has_lots:                   p.has_lots,
    has_expiration_date:        p.has_expiration_date,
    min_stock_alert:            p.min_stock_alert ?? 0,
    max_stock_alert:            p.max_stock_alert,
    manages_quantity_discounts: p.manages_quantity_discounts,
    valuation_method_id:        p.valuation_method_id,
    weight:                     p.weight,
    volume:                     p.volume,
    current_stock:              (p as ProductApiResponse).current_stock,
    active:                     p.active,
    company_id:                 p.company_id,
    product:                    p,
    unit:                       p.unit,
    tva:                        p.tva,
    prices:                     (p as ProductApiResponse).prices,
    created_at:                 p.created_at,
    updated_at:                 p.updated_at,
  } as ProductVariant;
}

export function makeFakeVariant(name: string, priceHt: number, tvaRate: number): ProductVariant {
  return {
    id:                         Date.now(),
    product_id:                 0,
    ref:                        '',
    barcode:                    null,
    variant_name:               null,
    unit_id:                    null,
    tva_id:                     null,
    valuation_method_id:        null,
    weight:                     null, volume: null,
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
    created_at:                 new Date().toISOString(),
    updated_at:                 new Date().toISOString(),
    product: {
      id: 0, name, slug: '', active: true, manages_stock: false,
      allow_negative_stock: true, has_lots: false, has_expiration_date: false,
      manages_quantity_discounts: false, company_id: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    tva: {
      id: 0, name: `TVA ${tvaRate}%`, rate: tvaRate, description: null,
      is_default: false, active: true, company_id: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  } as ProductVariant;
}

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
  try {
    localStorage.setItem(POS_PAGE_SIZE_KEY, String(n));
  } catch { /* localStorage not available */ }
}

export function familyIcon(name: string): string {
  const f = name.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل') || f.includes('طعام')) return 'ti-apple';
  if (f.includes('شراب') || f.includes('ماء') || f.includes('عصير')) return 'ti-droplets';
  if (f.includes('إلكترون') || f.includes('تقن')) return 'ti-device-laptop';
  if (f.includes('ملابس')) return 'ti-shirt';
  if (f.includes('صيانة') || f.includes('إصلاح')) return 'ti-tool';
  if (f.includes('دواء') || f.includes('صحة')) return 'ti-pill';
  if (f.includes('مكتب') || f.includes('قرطاسية')) return 'ti-briefcase';
  if (f.includes('سيارة') || f.includes('مركبة')) return 'ti-car';
  return 'ti-package';
}

export function familyStyleFromName(family: string): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل')) return { icon: 'ti-apple',         color: 'var(--em)',    bg: 'var(--emb)'  };
  if (f.includes('شراب') || f.includes('ماء')) return { icon: 'ti-droplets',     color: 'var(--blue)',  bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                   return { icon: 'ti-device-mobile', color: 'var(--blue)',  bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                     return { icon: 'ti-shirt',         color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                     return { icon: 'ti-tool',          color: 'var(--orange)', bg: 'var(--orb)'   };
  if (f.includes('دواء'))                      return { icon: 'ti-pill',          color: 'var(--red)',   bg: 'var(--redb)'  };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
```

## FILE: resources/js/pos/utils/printService.ts
```
import type { CartItem, CartTotals, Party } from '@/types';

/* ─── ESC/POS command constants ─── */
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

/* ─── ESC/POS builder ─── */
class EscPosBuilder {
  private buf: number[] = [];

  init()           { this.buf.push(ESC, 0x40); return this; }
  lineFeed(n = 1)  { const lf = LF; this.buf.push(...new Array(n).fill(lf)); return this; }
  setBold(on: boolean)     { this.buf.push(ESC, 0x45, on ? 1 : 0); return this; }
  setAlign(n: 0 | 1 | 2)  { this.buf.push(ESC, 0x61, n); return this; }
  setFontSize(w: number, h: number) {
    this.buf.push(GS, 0x21, (Math.max(1, Math.min(8, h)) - 1) * 16 + (Math.max(1, Math.min(8, w)) - 1));
    return this;
  }
  resetFontSize()  { this.buf.push(GS, 0x21, 0); return this; }
  text(s: string)  { this.buf.push(...new TextEncoder().encode(s)); return this; }
  center(s: string)  { return this.setAlign(1).text(s).lineFeed(); }
  right(s: string)   { return this.setAlign(2).text(s).lineFeed(); }
  divider(c = '-', len = 42) { return this.center(c.repeat(len)); }
  cut()            { this.buf.push(GS, 0x56, 0); return this; }
  feedAndCut()     { return this.lineFeed(5).cut(); }

  escposBytes(): Uint8Array { return new Uint8Array(this.buf); }
}

function fmt(n: number): string {
  return n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildReceiptBytes(
  items: CartItem[],
  totals: CartTotals,
  client: Party | null,
  docNumber?: string,
): Uint8Array {
  const b = new EscPosBuilder().init();
  const now = new Date();

  b.setFontSize(2, 2).setBold(true).center('نظام المبيعات').setBold(false).resetFontSize();
  b.center('نظام ERP المتكامل');
  b.divider();

  b.right(`التاريخ: ${now.toLocaleDateString('ar-DZ')}`);
  b.right(`الوقت: ${now.toLocaleTimeString('ar-DZ')}`);
  if (docNumber) b.setBold(true).right(`الفاتورة: ${docNumber}`).setBold(false);
  if (client) b.right(`العميل: ${client.name}`);
  b.divider();

  b.setAlign(0).setBold(true);
  b.text('المنتجات');
  b.lineFeed();
  b.setBold(false);
  b.text('─'.repeat(42));
  b.lineFeed();

  items.forEach(item => {
    const total = item.unit_price_ht * item.quantity * (1 + item.tva_rate / 100);
    const disc  = item.discount_percentage;
    b.setBold(false).text(`${item.product_name ?? ''}`);
    b.lineFeed();
    b.text(`  ${item.quantity} × ${fmt(item.unit_price_ht)}`);
    if (disc > 0) b.text(` (خصم ${disc}%)`);
    b.setAlign(2).text(`= ${fmt(total)}`);
    b.setAlign(0);
    b.lineFeed();
  });

  b.divider();
  const totalTtcFinal = totals.total_ttc + totals.fiscal_stamp;

  b.right(`المجموع HT: ${fmt(totals.total_ht)}`);
  if (totals.total_discount > 0) b.right(`الخصم: -${fmt(totals.total_discount)}`);
  b.right(`TVA: ${fmt(totals.total_tva)}`);
  if (totals.fiscal_stamp > 0) b.right(`الطابع المالي: ${fmt(totals.fiscal_stamp)}`);
  b.divider('-', 32);
  b.setFontSize(2, 2).setBold(true).right(`الإجمالي: ${fmt(totalTtcFinal)}`).setBold(false).resetFontSize();
  b.lineFeed(2);

  b.center('شكراً على تعاملكم معنا');
  b.center(`نظام ERP — ${now.getFullYear()}`);
  b.lineFeed(3);

  b.feedAndCut();
  return b.escposBytes();
}

/* ─── Thermal print service ─── */
export interface ThermalPrintResult {
  ok: boolean;
  method: 'webusb' | 'blob' | 'none';
  message: string;
}

export async function printThermalViaWebUSB(
  items: CartItem[],
  totals: CartTotals,
  client: Party | null,
  docNumber?: string,
): Promise<ThermalPrintResult> {
  const usb = (navigator as Navigator & { usb?: { requestDevice: (opts: { filters: unknown[] }) => Promise<{ claimInterface: (n: number) => Promise<void>; transferOut: (ep: number, data: ArrayBuffer) => Promise<{ status: string }> }> } }).usb;
  if (!usb) {
    return { ok: false, method: 'none', message: 'WebUSB غير مدعوم في هذا المتصفح' };
  }

  try {
    const device = await usb.requestDevice({ filters: [] });
    if (!device) {
      return { ok: false, method: 'webusb', message: 'لم يتم اختيار طابعة' };
    }

    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    await device.claimInterface(0);

    const data = buildReceiptBytes(items, totals, client, docNumber);
    await device.transferOut(1, data);

    await device.close();
    return { ok: true, method: 'webusb', message: 'تمت الطباعة بنجاح' };
  } catch (err: any) {
    return { ok: false, method: 'webusb', message: err?.message ?? 'فشلت الطباعة الحرارية' };
  }
}

export function printThermalViaBlob(
  items: CartItem[],
  totals: CartTotals,
  client: Party | null,
  docNumber?: string,
): ThermalPrintResult {
  try {
    const data = buildReceiptBytes(items, totals, client, docNumber);
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href  = url;
    a.download = `receipt-${docNumber ?? 'temp'}.bin`;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, method: 'blob', message: 'تم تحميل ملف الطباعة' };
  } catch (err: any) {
    return { ok: false, method: 'blob', message: err?.message ?? 'فشل تصدير ملف الطباعة' };
  }
}

export function isWebUsbSupported(): boolean {
  return 'usb' in navigator;
}
```

## FILE: resources/js/pos/utils/useCartStore.ts
```
// ════════════════════════════════════════════════════════════════════════════
// store/useCartStore.ts — عربة التسوق (POS)
//
// ✅ إصلاحات:
//   1. calcFiscalStamp مُستوردة من calculations.ts (cap 3000 دج — LF 2024)
//   2. unit_symbol: يقرأ unit.abbreviation مع fallback
//   3. totals() تستخدم calcFiscalStamp + خصم الفاتورة
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant } from '@/types';
import { calcTotals, calcFiscalStamp } from '../utils/calculations';

interface CartState {
  items:  CartItem[];
  client: Party | null;
  notes:  string;
  invoiceDiscountPct: number;
  // actions
  addItem:        (variant: ProductVariant, qty?: number) => void;
  removeItem:     (id: string) => void;
  updateQty:      (id: string, qty: number) => void;
  updateDiscount: (id: string, pct: number) => void;
  updatePrice:    (id: string, price: number) => void;
  setClient:      (client: Party | null) => void;
  setNotes:       (notes: string) => void;
  clearCart:      () => void;
  setInvoiceDiscountPct: (pct: number) => void;
  totals:         () => CartTotals;
}

function calcItemTotals(item: CartItem): CartItem {
  const discountedHt = item.unit_price_ht * item.quantity * (1 - item.discount_percentage / 100);
  const disc         = item.unit_price_ht * item.quantity - discountedHt;
  const totalHt      = discountedHt;
  const totalTva     = totalHt * (item.tva_rate / 100);
  return {
    ...item,
    discount_amount: Math.round(disc    * 100) / 100,
    total_ht:        Math.round(totalHt * 100) / 100,
    total_ttc:       Math.round((totalHt + totalTva) * 100) / 100,
  };
}

/** يقرأ رمز الوحدة من الفاريانت */
function getUnitSymbol(variant: ProductVariant): string {
  return variant.unit?.abbreviation ?? 'قطعة';
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:  [],
      client: null,
      notes:  '',
      invoiceDiscountPct: 0,

      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id
                  ? calcItemTotals({ ...i, quantity: i.quantity + qty })
                  : i,
              ),
            };
          }

          const priceHt  = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 19;
          const priceTtc = priceHt * (1 + tvaRate / 100);

          const newItem: CartItem = {
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
            selling_price_ttc:   priceTtc,
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: 0,
            discount_amount:     0,
            total_ht:            Math.round(priceHt * qty * 100) / 100,
            total_ttc:           Math.round(priceTtc * qty * 100) / 100,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, quantity: Math.max(0.001, qty) })
              : i,
          ),
        })),

      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, discount_percentage: Math.min(100, Math.max(0, pct)) })
              : i,
          ),
        })),

      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
        })),

      setClient: (client) => set({ client }),
      setNotes:  (notes)  => set({ notes }),
      clearCart: ()       => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0 }),
      setInvoiceDiscountPct: (pct) => set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)) }),

      totals: () => calcTotals(get().items, get().invoiceDiscountPct),
    }),
    {
      name: 'pos-cart',
      partialize: () => ({}),
    },
  ),
);
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

