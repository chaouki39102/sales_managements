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
import { partiesApi }         from '@/lib/api/endpoints/parties';
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
import ReturnsModal             from '@/pos/components/ReturnsModal';
import CustomerSearchModal      from '@/pos/components/CustomerSearchModal';

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
  const [showReturns, setShowReturns] = useState(false);
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
      const deduction = stockDeductions[p.id] ?? 0;
      const stock = stockData[p.id];
      if (stock !== undefined) v.current_stock = Math.max(0, stock - deduction);
      return v;
    }),
    [rawProducts, stockData, stockDeductions],
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

  // ── Optimistic stock deductions ──────────────────────────────────────────
  // يُحتسب من السلة مباشرة — يتناقص المخزون فوراً عند إضافة صنف
  const stockDeductions = useMemo(() => {
    const d: Record<number, number> = {};
    pos.items.forEach(i => {
      d[i.product_id] = (d[i.product_id] ?? 0) + i.quantity;
    });
    return d;
  }, [pos.items]);

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
      if (e.key === 'F10') { e.preventDefault(); setShowReturns(s => !s); }
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

      pos.incrementSession({
        amount:   snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp,
        payments: params.payments,
        items:    snapshot.items,
      });
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
        onReturn={() => setShowReturns(true)}
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
          onQty={pos.updateQty} onDiscount={pos.updateDiscount} onDiscountAmount={pos.updateDiscountAmount} onPrice={pos.updatePrice}
          onRemove={id => { pos.removeItem(id); if (selectedCartItemId === id) setSelectedCartItemId(null); }}
          onSetClient={pos.setClient} onPriceLevelChange={applyPriceLevel}
          onNoteChange={setCartNote} onHold={pos.holdCart}
          onSell={() => setModal('payment')} onClear={pos.clearCart} onHeld={() => setModal('held')}
          onCreateClient={async (data) => {
            try {
              const created = await partiesApi.create({
                name: data.name, phone: data.phone || null, mobile: data.mobile || null,
                address: data.address || null, party_type_id: 1, active: true,
              });
              toast.success('تم إنشاء الزبون بنجاح');
              return created;
            } catch {
              toast.error('فشل إنشاء الزبون');
              return null;
            }
          }}
          onOpenCustomerSearch={() => setModal('customer')}
          totalTtcFinal={adjustedTotalTtcFinal}
          invoiceDiscountPct={pos.invoiceDiscountPct}
          onInvoiceDiscountChange={pos.setInvoiceDiscountPct}
          invoiceDiscountAmount={invoiceDiscountAmount}
        />
      </div>

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals} items={pos.items} client={pos.client}
          paymentModes={paymentModes ?? []} documentTypes={documentTypes ?? []}
          currencies={currencies ?? []} treasuryAccounts={treasuryAccounts}
          totalTtcFinal={adjustedTotalTtcFinal}
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
          onEndSession={() => {
            pos.endSession();
            setModal('none');
            toast.success('✅ تم إنهاء الجلسة');
          }}
        />
      )}
      {modal === 'kbhelp' && <KeyboardHelpModal onClose={() => setModal('none')} />}

      {modal === 'customer' && (
        <CustomerSearchModal
          currentClient={pos.client}
          onSelect={(c) => { pos.setClient(c); setModal('none'); }}
          onClose={() => setModal('none')}
        />
      )}

      {showReturns && (
        <ReturnsModal
          documentTypes={documentTypes ?? []}
          defaultWarehouseId={defaultWarehouse?.id ?? null}
          fiscalYearId={fiscalYear?.id}
          onClose={() => setShowReturns(false)}
          onDone={() => { setShowReturns(false); toast.success('تم إنشاء المرتجع'); }}
        />
      )}

      <Toaster position="top-left" richColors closeButton
        toastOptions={{ style: { fontFamily: 'Tajawal, sans-serif', fontSize: 14 } }}
      />
    </div>
  );
}
