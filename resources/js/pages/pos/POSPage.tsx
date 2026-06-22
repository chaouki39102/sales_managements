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

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

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
  const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
  const [showQuickbar, setShowQuickbar] = useState(true);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');

  const [page, setPage] = useState(1);
  const productPagesRef = useRef<Product[]>([]);

  useEffect(() => {
    setPage(1);
    productPagesRef.current = [];
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

  const isSearching = pos.searchQuery.trim().length >= 2;

  const queryFamilyId = pos.selectedCategory ?? undefined;

  const { data: productsRaw, isLoading: loadingAll } = useQuery({
    queryKey:  [slug, 'products', 'pos', { search: pos.searchQuery, cat: pos.selectedCategory, page, per_page: 120 }],
    queryFn:   () => productsApi.list({
      per_page:  120,
      include:   'tva,unit,family,prices.priceLevel',
      search:    isSearching ? pos.searchQuery : undefined,
      ...(queryFamilyId ? { family_id: queryFamilyId } : {}),
      page,
      active:    true,
    }),
    enabled:   !!slug,
    staleTime: isSearching ? 2 * 60_000 : 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const productsPage = Array.isArray(productsRaw) ? productsRaw : (productsRaw as any)?.data ?? [];
  const productsMeta = !Array.isArray(productsRaw) ? (productsRaw as any)?.meta ?? null : null;

  const loadedPageRef = useRef(0);
  if (productsPage.length && page !== loadedPageRef.current) {
    loadedPageRef.current = page;
    if (page === 1) {
      productPagesRef.current = productsPage;
    } else {
      const ids = new Set(productPagesRef.current.map(p => p.id));
      const newOnes = productsPage.filter(p => !ids.has(p.id));
      if (newOnes.length) productPagesRef.current = [...productPagesRef.current, ...newOnes];
    }
  }

  const rawProducts = productPagesRef.current;
  const hasMore     = productsMeta ? !productsMeta.is_last_page : false;

  const { data: customersData   } = useClients({ per_page: 3000 });
  const { data: paymentModes    } = usePaymentModes();
  const { data: warehouses      } = useWarehouses();
  const { data: documentTypes   } = useDocumentTypes();
  const { data: priceLevels     } = usePriceLevels();
  const { data: currencies      } = useCurrencies();
  const { data: treasuryAccounts } = useTreasuryAccounts();

  const customers        = (customersData as any)?.data ?? customersData ?? [];
  const priceLevelsList  = priceLevels ?? [];
  const defaultWarehouse = warehouses?.find(w => w.is_default) ?? warehouses?.[0] ?? null;
  const defaultCurrency  = currencies?.find(c => c.is_base_currency) ?? currencies?.[0];
  const defaultTreasury  = treasuryAccounts?.find(a => a.is_default) ?? treasuryAccounts?.[0];

  // ─── Warehouse stock (same pattern as CommercialDocumentModal) ─────────────
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
  }, [allVariants, pos.selectedCategory, filterInStock, filterLowStock, filterMinPrice, filterMaxPrice, sortBy]);

  const isEmpty       = pos.items.length === 0;

  const invoiceDiscountAmount = useMemo(() => {
    if (!pos.invoiceDiscountPct || pos.invoiceDiscountPct <= 0) return 0;
    return (pos.totals.total_ht * pos.invoiceDiscountPct) / 100;
  }, [pos.totals.total_ht, pos.invoiceDiscountPct]);

  const adjustedTotalHt = pos.totals.total_ht - invoiceDiscountAmount;
  const adjustedTotalTva = pos.items.reduce((s, i) => {
    const itemHt = i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100);
    const share = pos.totals.total_ht > 0 ? itemHt / pos.totals.total_ht : 0;
    const adjItemHt = itemHt - (invoiceDiscountAmount * share);
    return s + (adjItemHt * i.tva_rate / 100);
  }, 0);
  const adjustedTotalTtcFinal = adjustedTotalHt + adjustedTotalTva + pos.totals.fiscal_stamp;

  const avgMargin = useMemo(() => {
    if (!pos.items.length) return 0;
    const m = pos.items.reduce((s, i) => s + calcMargin(i.unit_price_ht, (i as unknown as { average_cost_price?: number }).average_cost_price ?? 0), 0);
    return m / pos.items.length;
  }, [pos.items]);

  const filterActive = filterInStock || filterLowStock || !!filterMinPrice || !!filterMaxPrice;

  // ── Barcode Scanner (keyboard buffer) ──
  const barcodeRef = useRef('');
  useEffect(() => {
    barcodeRef.current = barcodeBuffer;
  }, [barcodeBuffer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const buf = barcodeRef.current;
      if (e.key === 'Enter' && buf.length >= 4) {
        const variant = allVariants.find(v => v.barcode === buf);
        if (variant) {
          pos.addItem(variant);
        }
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
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(barcodeTimer.current);
    };
  }, [allVariants, pos]);

  // ── Global Keyboard Shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag    = (e.target as HTMLElement).tagName;
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
        if (e.key === 'p') { e.preventDefault(); window.print(); }
        if (e.key === 'Delete') { e.preventDefault(); if (!isEmpty) pos.clearCart(); }
        if (!inInput) {
          if (e.key === 'ArrowUp')   { e.preventDefault(); setView('grid'); }
          if (e.key === 'ArrowDown') { e.preventDefault(); setView('list'); }
          if (e.key === '+' || e.key === '=') { e.preventDefault(); setGridSize(s => s === 'xs' ? 'sm' : s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'lg'); }
          if (e.key === '-') { e.preventDefault(); setGridSize(s => s === 'lg' ? 'md' : s === 'md' ? 'sm' : s === 'sm' ? 'xs' : 'xs'); }
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
        if (e.key === 'NumpadAdd'   && lastItem) { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity + 1); }
        if (e.key === 'NumpadSubtract' && lastItem && lastItem.quantity > 1) { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity - 1); }
        if (e.key === 'Delete' && selectedCartItemId) { e.preventDefault(); pos.removeItem(selectedCartItemId); setSelectedCartItemId(null); }
      }

      if (e.key === 'Escape') {
        if (modal !== 'none')  setModal('none');
        else if (showFilter)   setShowFilter(false);
        else if (!inInput && pos.searchQuery) pos.setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pos, isEmpty, modal, showFilter, families, selectedCartItemId]);

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── Price Level ──
  const applyPriceLevel = useCallback((plId: number | null) => {
    setSelectedPriceLevelId(plId);
    if (plId === null) {
      pos.items.forEach(item => {
        const variant = allVariants.find(v => v.id === item.variant_id);
        const origPrice = variant?.default_selling_price_ht;
        if (origPrice && origPrice !== item.unit_price_ht) {
          pos.updatePrice(item.id, origPrice);
        }
      });
      return;
    }
    const pl = priceLevelsList.find(p => p.id === plId);
    if (!pl) return;
    pos.items.forEach(item => {
      const variant  = allVariants.find(v => v.id === item.variant_id);
      const priceEntry = variant?.prices?.find(pr => pr.price_level_id === plId);
      if (priceEntry)         pos.updatePrice(item.id, priceEntry.price_ht);
      else if (pl.discount_percent) {
        const origPrice = variant?.default_selling_price_ht ?? item.unit_price_ht;
        pos.updatePrice(item.id, origPrice * (1 - pl.discount_percent / 100));
      }
    });
  }, [priceLevelsList, allVariants, pos]);

  // ── Complete Sale ──
  const handleCompleteSale = useCallback(async (params: {
    amountPaid:       number;
    dueDate?:         string;
    note?:            string;
    docTypeCode?:     string;
    payments?:        Array<{ paymentModeId: number; amount: number; treasuryAccountId?: number | null }>;
    currencyId?:      number | null;
  }) => {
    const typeCode = params.docTypeCode ?? 'FV';
    const invType  = documentTypes?.find(t => t.code === typeCode)
                  ?? documentTypes?.find(t => t.code === 'BL')
                  ?? documentTypes?.find(t => t.code === 'FAC')
                  ?? documentTypes?.[0];

    if (!invType)          return { ok: false, message: 'لم يُعثَر على نوع مستند — تحقق من إعدادات الشركة' };
    if (!defaultWarehouse) return { ok: false, message: 'لا يوجد مستودع مُفعَّل' };
    if (!fiscalYear)       return { ok: false, message: 'لا توجد سنة مالية نشطة' };

    try {
      const snapshot = { items: [...pos.items], totals: { ...pos.totals } };

      const apiPayments = (params.payments ?? [])
        .filter(p => p.amount > 0)
        .map(p => ({
          payment_mode_id:     p.paymentModeId,
          amount:              p.amount,
          payment_date:        new Date().toISOString().slice(0, 10),
          treasury_account_id: p.treasuryAccountId ?? defaultTreasury?.id ?? null,
        }));

      const lineDiscountShare = invoiceDiscountPct > 0
        ? pos.items.map(i => {
            const lineHt = i.unit_price_ht * i.quantity * (1 - i.discount_percentage / 100);
            const share = pos.totals.total_ht > 0 ? lineHt / pos.totals.total_ht : 0;
            return share * invoiceDiscountPct;
          })
        : pos.items.map(() => 0);

      const res = await documentsApi.create({
        document_type_id: invType.id,
        party_id:         pos.client?.id ?? null,
        warehouse_id:     defaultWarehouse.id,
        fiscal_year_id:   fiscalYear.id,
        currency_id:      params.currencyId ?? defaultCurrency?.id ?? null,
        document_date:    new Date().toISOString().slice(0, 10),
        due_date:         params.dueDate ?? null,
        notes:            params.note ?? cartNote ?? null,
        lines: pos.items.map((i, idx) => ({
          product_id:          i.product_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: i.discount_percentage + (lineDiscountShare[idx] || 0),
          tva_rate:            i.tva_rate,
        })),
        payments: apiPayments,
        ...(orderType !== 'dine-in' ? { delivery_type: orderType } : {}),
      });

      pos.incrementSession(snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp);
      setReceiptSnapshot({ items: snapshot.items, totals: snapshot.totals, docNum: res.document_number });
      setLastDocNum(res.document_number);
      setCartNote('');
      pos.setInvoiceDiscountPct(0);
      pos.clearCart();
      setSelectedCartItemId(null);
      setModal('receipt');
      toast.success('تم حفظ الفاتورة بنجاح');
      return { ok: true, docNumber: res.document_number };
    } catch (err: any) {
      const msg = err?.errors?.lines?.[0] ?? err?.message ?? 'فشل حفظ الفاتورة';
      toast.error(String(msg));
      return { ok: false, message: String(msg) };
    }
  }, [pos, documentTypes, defaultWarehouse, fiscalYear, defaultCurrency, defaultTreasury, cartNote, pos.invoiceDiscountPct, orderType]);

  // ── Quick Items ──
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
        onReceipt={() => { if (!isEmpty) { setReceiptSnapshot({ items: [...pos.items], totals: { ...pos.totals } }); setModal('receipt'); } }}
        onSession={() => setModal(m => m === 'session' ? 'none' : 'session')}
        onFullscreen={toggleFullscreen}
        onKbHelp={() => setModal('kbhelp')}
        showQuickbar={showQuickbar}
        onToggleQuickbar={() => setShowQuickbar(s => !s)}
        items={pos.items}
        totals={pos.totals}
        totalTtcFinal={adjustedTotalTtcFinal}
      />

      {/* Order Type Selector */}
      <div className="pos-order-type">
        {(Object.entries(orderTypeLabels) as [OrderType, { icon: string; label: string }][]).map(([key, { icon, label }]) => (
          <button
            key={key}
            className={`pot-btn ${orderType === key ? 'on' : ''}`}
            onClick={() => setOrderType(key)}
          >
            <i className={`ti ${icon}`} />
            {label}
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
        activeTab={mobTab}
        onTab={setMobTab}
        itemsCount={pos.totals.items_count}
        totalTtc={adjustedTotalTtcFinal}
        isEmpty={isEmpty}
        onSell={() => setModal('payment')}
      />

      <div className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}>

        <div className="pos-left">
          <ProductSearchBar
            query={pos.searchQuery}
            onQuery={pos.setSearch}
            view={view}
            gridSize={gridSize}
            onView={setView}
            onGridSize={setGridSize}
            onFilter={() => setShowFilter(s => !s)}
            filterActive={filterActive}
            inputRef={searchRef}
            sortBy={sortBy}
            onSort={setSortBy}
            resultsCount={filteredVariants.length}
            onEnterFirst={() => {
              const first = filteredVariants[0];
              if (first) pos.addItem(first);
            }}
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

          <CategoryTabs
            families={families}
            selected={pos.selectedCategory}
            onSelect={pos.setCategory}
          />

          <ProductGrid
            variants={filteredVariants}
            view={view}
            gridSize={gridSize}
            loading={loadingAll}
            hasMore={hasMore}
            onLoadMore={() => setPage(p => p + 1)}
            onAdd={v => { pos.addItem(v); }}
            onAddManual={() => setModal('manual')}
            onPin={toggleQuickItem}
            isPinned={isQuickItem}
            priceLevels={priceLevelsList}
            selectedPriceLevelId={selectedPriceLevelId}
            cartItems={pos.items}
          />
        </div>

        <ProfessionalCart
          items={pos.items}
          totals={pos.totals}
          client={pos.client}
          customers={customers}
          priceLevels={priceLevelsList}
          selectedPriceLevelId={selectedPriceLevelId}
          note={cartNote}
          selectedItemId={selectedCartItemId}
          onSelectItem={setSelectedCartItemId}
          onQty={pos.updateQty}
          onDiscount={pos.updateDiscount}
          onPrice={pos.updatePrice}
          onRemove={id => { pos.removeItem(id); if (selectedCartItemId === id) setSelectedCartItemId(null); }}
          onSetClient={pos.setClient}
          onPriceLevelChange={applyPriceLevel}
          onNoteChange={setCartNote}
          onHold={pos.holdCart}
          onSell={() => setModal('payment')}
          onClear={pos.clearCart}
          onHeld={() => setModal('held')}
          totalTtcFinal={adjustedTotalTtcFinal}
          invoiceDiscountPct={pos.invoiceDiscountPct}
          onInvoiceDiscountChange={pos.setInvoiceDiscountPct}
          invoiceDiscountAmount={invoiceDiscountAmount}
        />
      </div>

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals}
          client={pos.client}
          paymentModes={paymentModes ?? []}
          documentTypes={documentTypes ?? []}
          currencies={currencies ?? []}
          totalTtcFinal={adjustedTotalTtcFinal}
          onClose={() => setModal('none')}
          onConfirm={handleCompleteSale}
        />
      )}

      {modal === 'held' && (
        <HeldCartsModal
          carts={pos.heldCarts}
          onClose={() => setModal('none')}
          onRestore={id => { pos.restoreCart(id); setModal('none'); }}
          onDelete={pos.deleteHeldCart}
        />
      )}

      {modal === 'receipt' && receiptSnapshot && (
        <ProfessionalReceipt
          items={receiptSnapshot.items}
          totals={receiptSnapshot.totals}
          client={pos.client}
          docNumber={receiptSnapshot.docNum ?? lastDocNum}
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
          heldCount={pos.heldCarts.length}
          avgMargin={avgMargin}
          onClose={() => setModal('none')}
        />
      )}

      {modal === 'kbhelp' && (
        <KeyboardHelpModal onClose={() => setModal('none')} />
      )}

      <Toaster
        position="top-left"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 },
        }}
      />
    </div>
  );
}
