// ═══════════════════════════════════════════════════════════════════════════════
// pages/pos/POSPage.tsx — نظام POS العالمي الاحترافي v4.0
//
// ✅ الميزات المضافة والمُحسَّنة:
//   ─── اختصارات لوحة المفاتيح ───
//   1. F1 → مساعدة الاختصارات
//   2. F2 → تركيز البحث (مع تحديد النص)
//   3. F3 → لوحة الفلتر المتقدم
//   4. F4 → فتح مودال الدفع (إذا السلة غير فارغة)
//   5. F5 → تعليق السلة الحالية
//   6. F6 → إضافة منتج يدوي
//   7. F7 → عرض الفواتير المعلقة
//   8. F8 → إحصاءات الجلسة
//   9. F9 → معاينة/طباعة الفاتورة
//  10. F11 → تبديل وضع الشاشة الكاملة
//  11. F12 → مسح السلة الكاملة
//  12. Ctrl+F / Ctrl+K → تركيز البحث
//  13. Ctrl+↑/↓ → تبديل عرض الشبكة/القائمة
//  14. Ctrl++/- → تغيير حجم الشبكة
//  15. Ctrl+Delete → مسح السلة
//  16. Ctrl+Z → تراجع (آخر عملية)
//  17. NumPad + → زيادة كمية آخر صنف
//  18. NumPad - → إنقاص كمية آخر صنف
//  19. Del → حذف الصنف المحدد في السلة
//  20. Tab → التنقل بين خلايا السلة
//  21. Enter (في البحث) → إضافة أول نتيجة
//  22. Alt+1..9 → فئات التصنيف السريع
//  23. Ctrl+P → طباعة مباشرة
//  24. Escape → إغلاق المودال النشط
//
//   ─── مناطق الواجهة (UI Zones) ───
//   - TopBar: إحصاءات الجلسة + أدوات سريعة + شريط اختصارات
//   - ProductPanel: بحث ذكي + فلتر متعدد + تصنيفات + شبكة/قائمة
//   - CartPanel: سلة احترافية مع تحرير inline + ملاحظات + مستويات سعر
//   - QuickItems: صنف مفضل سريع (Pin)
//   - PaymentModal: دفع متعدد الوسائل + عملة + صرف
//   - CheckoutSummary: ملخص أسفل السلة بأرقام واضحة
//   - SessionPanel: إحصاءات جلسة مفصلة
//   - HeldModal: فواتير معلقة مع بحث
//   - ReceiptModal: إيصال A4/ثرمال مع QR
//   - ManualModal: منتج يدوي مع TVA selector
//   - KbHelpModal: دليل اختصارات تفاعلي
//
// ═══════════════════════════════════════════════════════════════════════════════

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { usePOS }             from '@/pos/hooks/usePOS';
import { useClients }         from '@/lib/api/endpoints/parties';
import {
  usePaymentModes, useWarehouses, usePriceLevels,
  useCurrencies, useTreasuryAccounts, useDocumentTypes,
} from '@/lib/api/endpoints/lookups';
import { productsApi }        from '@/lib/api/endpoints/products';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';
import { documentsApi }       from '@/lib/api/endpoints/documents';
import { useActiveSlug }      from '@/lib/store/appStore';
import {
  calcFiscalStamp, formatDZD, htToTtc, ttcToHt, calcMargin,
} from '@/pos/utils/calculations';
import type {
  Product, ProductVariant, CartItem, CartTotals,
  PriceLevel, Party, PaymentMode, DocumentType,
} from '@/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════
type ViewMode   = 'grid' | 'list';
type GridSize   = 'xs' | 'sm' | 'md' | 'lg';
type SortMode   = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'family';
type ActiveModal = 'none' | 'payment' | 'held' | 'receipt' | 'manual' | 'kbhelp' | 'session' | 'barcode';

interface QuickItem { variantId: number; name: string; priceHt: number; tvaRate: number; }

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function POSPage() {
  const pos        = usePOS();
  const slug       = useActiveSlug();
  const fiscalYear = useSelectedFiscalYear();

  // ── UI State ───────────────────────────────────────────────────────────────
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
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [showQuickbar, setShowQuickbar] = useState(true);

  // ── Filter State ───────────────────────────────────────────────────────────
  const [filterMinPrice,  setFilterMinPrice]  = useState('');
  const [filterMaxPrice,  setFilterMaxPrice]  = useState('');
  const [filterInStock,   setFilterInStock]   = useState(false);
  const [filterLowStock,  setFilterLowStock]  = useState(false);
  const [sortBy,          setSortBy]          = useState<SortMode>('name');

  // ── Refs ───────────────────────────────────────────────────────────────────
  const searchRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── API Data ───────────────────────────────────────────────────────────────
  const isSearching = pos.searchQuery.trim().length >= 2;

  const { data: productsData, isLoading: loadingAll } = useQuery({
    queryKey:  [slug, 'products', 'pos', { search: pos.searchQuery, cat: pos.selectedCategory }],
    queryFn:   () => productsApi.list({
      per_page: isSearching ? 100 : 500,
      include:  'tva,unit,family,prices.priceLevel',
      search:   isSearching ? pos.searchQuery : undefined,
      active:   true,
    }),
    enabled:         !!slug,
    staleTime:       isSearching ? 2 * 60_000 : 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const rawProducts = (productsData as any)?.data ?? productsData ?? [];
  const allVariants: ProductVariant[] = useMemo(
    () => rawProducts.map(productToVariant),
    [rawProducts],
  );

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

  // ── Derived ────────────────────────────────────────────────────────────────
  const families = useMemo(() => Array.from(
    new Map(
      allVariants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!]),
    ).values(),
  ), [allVariants]);

  const filteredVariants = useMemo(() => {
    let list = pos.selectedCategory
      ? allVariants.filter(v => v.product?.family_id === pos.selectedCategory)
      : allVariants;
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
  const totalTtcFinal = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  const avgMargin = useMemo(() => {
    if (!pos.items.length) return 0;
    const m = pos.items.reduce((s, i) => s + calcMargin(i.unit_price_ht, (i as any).average_cost_price ?? 0), 0);
    return m / pos.items.length;
  }, [pos.items]);

  const filterActive = filterInStock || filterLowStock || !!filterMinPrice || !!filterMaxPrice;

  // ── Barcode Scanner ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // الماسح الضوئي يُرسل أحرف بسرعة عالية — نجمعها في buffer
      if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
        const variant = allVariants.find(v => v.barcode === barcodeBuffer);
        if (variant) {
          pos.addItem(variant);
          setBarcodeBuffer('');
          return;
        }
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        setBarcodeBuffer(b => b + e.key);
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(''), 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [barcodeBuffer, allVariants, pos]);

  // ── Global Keyboard Shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag    = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const activeModal = modal !== 'none';

      // F-keys — always active (برغم الـ inputs أو المودالات)
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

      // Ctrl shortcuts
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

      // Alt + رقم → تصنيف سريع
      if (e.altKey && !isNaN(parseInt(e.key)) && !inInput) {
        const idx = parseInt(e.key) - 1;
        if (idx === -1) pos.setCategory(null);
        else if (idx < families.length) pos.setCategory(families[idx].id);
        e.preventDefault();
      }

      // NumPad في السلة
      if (!inInput && !activeModal) {
        const lastItem = pos.items[pos.items.length - 1];
        if (e.key === 'NumpadAdd'   && lastItem) { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity + 1); }
        if (e.key === 'NumpadSubtract' && lastItem && lastItem.quantity > 1) { e.preventDefault(); pos.updateQty(lastItem.id, lastItem.quantity - 1); }
        if (e.key === 'Delete' && selectedCartItemId) { e.preventDefault(); pos.removeItem(selectedCartItemId); setSelectedCartItemId(null); }
      }

      // Escape
      if (e.key === 'Escape') {
        if (modal !== 'none')  setModal('none');
        else if (showFilter)   setShowFilter(false);
        else if (!inInput && pos.searchQuery) pos.setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pos, isEmpty, modal, showFilter, families, selectedCartItemId]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── Price Level ────────────────────────────────────────────────────────────
  const applyPriceLevel = useCallback((plId: number | null) => {
    setSelectedPriceLevelId(plId);
    if (plId === null) return;
    const pl = priceLevelsList.find(p => p.id === plId);
    if (!pl) return;
    pos.items.forEach(item => {
      const variant  = allVariants.find(v => v.id === item.variant_id);
      const priceEntry = (variant as any)?.prices?.find((pr: any) => pr.price_level_id === plId);
      if (priceEntry)         pos.updatePrice(item.id, priceEntry.price_ht);
      else if (pl.discount_percent) pos.updatePrice(item.id, item.unit_price_ht * (1 - pl.discount_percent / 100));
    });
  }, [priceLevelsList, allVariants, pos]);

  // ── Complete Sale ──────────────────────────────────────────────────────────
  const handleCompleteSale = useCallback(async (params: {
    amountPaid:       number;
    dueDate?:         string;
    note?:            string;
    docTypeCode?:     string;
    payments?:        Array<{ paymentModeId: number; amount: number; treasuryAccountId?: number | null }>;
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

      const res = await documentsApi.create({
        document_type_id: invType.id,
        party_id:         pos.client?.id ?? null,
        warehouse_id:     defaultWarehouse.id,
        fiscal_year_id:   fiscalYear.id,
        currency_id:      defaultCurrency?.id ?? null,
        document_date:    new Date().toISOString().slice(0, 10),
        due_date:         params.dueDate ?? null,
        notes:            params.note ?? cartNote ?? null,
        lines: pos.items.map(i => ({
          product_id:          i.product_id,
          quantity:            i.quantity,
          unit_price_ht:       i.unit_price_ht,
          discount_percentage: i.discount_percentage,
          tva_rate:            i.tva_rate,
        })),
        payments: apiPayments,
      });

      pos.incrementSession(snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp);
      setReceiptSnapshot({ items: snapshot.items, totals: snapshot.totals, docNum: res.document_number });
      setLastDocNum(res.document_number);
      setCartNote('');
      pos.clearCart();
      setSelectedCartItemId(null);
      setModal('receipt');
      return { ok: true, docNumber: res.document_number };
    } catch (err: any) {
      const msg = err?.errors?.lines?.[0] ?? err?.message ?? 'فشل حفظ الفاتورة';
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

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={containerRef}
      className={`pos-wrap ${fullscreen ? 'pos-fullscreen' : ''}`}
      id="p-pos"
      dir="rtl"
    >
      {/* ═══ 1. شريط الجلسة العلوي ═══ */}
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
        totalTtcFinal={totalTtcFinal}
      />

      {/* ═══ 2. Quick Items Bar ═══ */}
      {showQuickbar && quickItems.length > 0 && (
        <QuickItemsBar
          quickItems={quickItems}
          allVariants={allVariants}
          onAdd={v => pos.addItem(v)}
          onRemove={variantId => setQuickItems(p => p.filter(q => q.variantId !== variantId))}
        />
      )}

      {/* ═══ 3. تابات الجوال ═══ */}
      <MobileTabs
        activeTab={mobTab}
        onTab={setMobTab}
        itemsCount={pos.totals.items_count}
        totalTtc={totalTtcFinal}
        isEmpty={isEmpty}
        onSell={() => setModal('payment')}
      />

      {/* ═══ 4. التخطيط الرئيسي ═══ */}
      <div className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}>

        {/* ── اليسار: لوحة المنتجات ── */}
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
            onAdd={v => { pos.addItem(v); }}
            onAddManual={() => setModal('manual')}
            onPin={toggleQuickItem}
            isPinned={isQuickItem}
            priceLevels={priceLevelsList}
            selectedPriceLevelId={selectedPriceLevelId}
            cartItems={pos.items}
          />
        </div>

        {/* ── اليمين: السلة ── */}
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
          totalTtcFinal={totalTtcFinal}
        />
      </div>

      {/* ═══ MODALS ═══ */}

      {modal === 'payment' && (
        <ProfessionalPaymentModal
          totals={pos.totals}
          client={pos.client}
          paymentModes={paymentModes ?? []}
          documentTypes={documentTypes ?? []}
          totalTtcFinal={totalTtcFinal}
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
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// POSTopBar
// ══════════════════════════════════════════════════════════════════════════════
function POSTopBar({
  sessionInvoices, sessionSales, heldCount, avgMargin,
  isEmpty, isFullscreen, showQuickbar,
  onHeld, onNewSale, onManual, onReceipt, onSession, onFullscreen, onKbHelp,
  onToggleQuickbar, items, totals, totalTtcFinal,
}: {
  sessionInvoices: number; sessionSales: number; heldCount: number;
  avgMargin: number; isEmpty: boolean; isFullscreen: boolean; showQuickbar: boolean;
  onHeld: () => void; onNewSale: () => void; onManual: () => void;
  onReceipt: () => void; onSession: () => void; onFullscreen: () => void;
  onKbHelp: () => void; onToggleQuickbar: () => void;
  items: CartItem[]; totals: CartTotals; totalTtcFinal: number;
}) {
  return (
    <div className="pos-topbar">
      {/* إحصاءات الجلسة */}
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

      {/* أدوات */}
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

      {/* شريط الاختصارات */}
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

// ══════════════════════════════════════════════════════════════════════════════
// QuickItemsBar
// ══════════════════════════════════════════════════════════════════════════════
function QuickItemsBar({
  quickItems, allVariants, onAdd, onRemove,
}: {
  quickItems: QuickItem[];
  allVariants: ProductVariant[];
  onAdd: (v: ProductVariant) => void;
  onRemove: (variantId: number) => void;
}) {
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

// ══════════════════════════════════════════════════════════════════════════════
// ProductSearchBar
// ══════════════════════════════════════════════════════════════════════════════
function ProductSearchBar({
  query, onQuery, view, gridSize, onView, onGridSize,
  onFilter, filterActive, inputRef, sortBy, onSort, resultsCount, onEnterFirst,
}: {
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
}) {
  return (
    <div className="pos-search-bar">
      {/* مربع البحث */}
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

      {/* عدد النتائج */}
      {query && (
        <span className="srch-count">{resultsCount} نتيجة</span>
      )}

      {/* ترتيب */}
      <select
        className="pos-sort-sel"
        value={sortBy}
        onChange={e => onSort(e.target.value as SortMode)}
        title="ترتيب المنتجات"
      >
        <option value="name">أ-ي</option>
        <option value="price_asc">سعر ↑</option>
        <option value="price_desc">سعر ↓</option>
        <option value="stock">مخزون</option>
        <option value="family">تصنيف</option>
      </select>

      {/* فلتر */}
      <button
        className={`pos-tool-icon ${filterActive ? 'pos-tool-icon--active' : ''}`}
        onClick={onFilter}
        title="فلتر متقدم — F3"
        style={{ width: 34, height: 34 }}
      >
        <i className="ti ti-adjustments-horizontal" />
        {filterActive && <span className="filter-dot" />}
      </button>

      {/* عرض شبكة */}
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

      {/* حجم الشبكة */}
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

// ══════════════════════════════════════════════════════════════════════════════
// FilterPanel
// ══════════════════════════════════════════════════════════════════════════════
function FilterPanel({
  inStock, onInStock, lowStock, onLowStock,
  minPrice, onMinPrice, maxPrice, onMaxPrice, onReset,
}: {
  inStock: boolean; onInStock: (v: boolean) => void;
  lowStock: boolean; onLowStock: (v: boolean) => void;
  minPrice: string; onMinPrice: (v: string) => void;
  maxPrice: string; onMaxPrice: (v: string) => void;
  onReset: () => void;
}) {
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
        <button className="btn btn-xs btn-r" onClick={onReset}>
          <i className="ti ti-x" /> إعادة ضبط
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CategoryTabs
// ══════════════════════════════════════════════════════════════════════════════
function CategoryTabs({
  families, selected, onSelect,
}: {
  families: { id: number; name: string }[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
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

// ══════════════════════════════════════════════════════════════════════════════
// ProductGrid
// ══════════════════════════════════════════════════════════════════════════════
function ProductGrid({
  variants, view, gridSize, loading, onAdd, onAddManual,
  onPin, isPinned, priceLevels, selectedPriceLevelId, cartItems,
}: {
  variants: ProductVariant[];
  view: ViewMode;
  gridSize: GridSize;
  loading: boolean;
  onAdd: (v: ProductVariant) => void;
  onAddManual: () => void;
  onPin: (v: ProductVariant) => void;
  isPinned: (variantId: number) => boolean;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  cartItems: CartItem[];
}) {
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
                  <td className="prow-unit">{(v.unit as any)?.abbreviation ?? (v.unit as any)?.symbol ?? '—'}</td>
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
            {/* صورة / أيقونة */}
            <div className="pcard-img" style={{ background: style.bg }}>
              {(v as any).image_url
                ? <img src={(v as any).image_url} alt={v.product?.name} />
                : <i className={`ti ${style.icon}`} style={{ color: style.color, fontSize: 22 }} />
              }
              {inCart > 0 && <span className="pcard-in-cart">{inCart}</span>}
              {outStock && <span className="pcard-out-badge">نفذ</span>}
              {lowStock && !outStock && <span className="pcard-low-badge">قليل</span>}
            </div>

            {/* معلومات */}
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
                  {outStock ? 'نفذ المخزون' : `${stock} ${(v.unit as any)?.abbreviation ?? ''}`}
                </div>
              )}
            </div>

            {/* أزرار */}
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
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ProfessionalCart
// ══════════════════════════════════════════════════════════════════════════════
function ProfessionalCart({
  items, totals, client, customers, priceLevels, selectedPriceLevelId,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onPrice, onRemove, onSetClient, onPriceLevelChange,
  onNoteChange, onHold, onSell, onClear, onHeld, totalTtcFinal,
}: {
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
}) {
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

      {/* ── رأس السلة ── */}
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
                {pl.discount_percent ? <span className="cmode-disc">-{pl.discount_percent}%</span> : null}
              </button>
            ))}
          </div>
        )}

        {/* اختيار الزبون */}
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

      {/* ── قائمة الأصناف ── */}
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

      {/* ── ملخص التوتالات ── */}
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
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CartRow — صف صنف واحد في السلة مع تحرير inline
// ══════════════════════════════════════════════════════════════════════════════
function CartRow({
  item, idx, isSelected, onSelect, onQty, onDiscount, onPrice, onRemove,
}: {
  item: CartItem; idx: number; isSelected: boolean;
  onSelect: () => void;
  onQty: (qty: number) => void;
  onDiscount: (pct: number) => void;
  onPrice: (price: number) => void;
  onRemove: () => void;
}) {
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
          {/* السعر */}
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
          {/* خصم */}
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

      {/* الكمية */}
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

      {/* الإجمالي */}
      <div className="cr-total">
        <div className="cr-ttc">{formatDZD(item.total_ttc)}</div>
        <div className="cr-ht">HT: {formatDZD(item.total_ht)}</div>
      </div>

      {/* حذف */}
      <button className="cr-del" onClick={e => { e.stopPropagation(); onRemove(); }} title="حذف الصنف (Del)">
        <i className="ti ti-x" />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ProfessionalPaymentModal — مودال الدفع المتقدم
// ══════════════════════════════════════════════════════════════════════════════
function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes, totalTtcFinal, onClose, onConfirm,
}: {
  totals:        CartTotals;
  client:        Party | null;
  paymentModes:  PaymentMode[];
  documentTypes: DocumentType[];
  totalTtcFinal: number;
  onClose:       () => void;
  onConfirm:     (params: any) => Promise<{ ok: boolean; message?: string }>;
}) {
  // وسائل الدفع المتعددة
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

  const totalPaid = paymentLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const remaining = totalTtcFinal - totalPaid;
  const change    = totalPaid > totalTtcFinal ? totalPaid - totalTtcFinal : 0;
  const canSubmit = totalPaid > 0 && !submitting;

  const addLine = () => {
    const firstMode = paymentModes[0];
    if (!firstMode) return;
    setPaymentLines(prev => [...prev, {
      id:      Math.random().toString(36).slice(2),
      modeId:  firstMode.id,
      amount:  String(Math.max(0, remaining).toFixed(2)),
      refNote: '',
    }]);
  };

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
    const res = await onConfirm({ amountPaid: totalPaid, payments, docTypeCode, dueDate, note });
    setSubmitting(false);
    if (!res.ok) setError(res.message ?? 'خطأ غير معروف');
  };

  // اختصارات
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
        {/* رأس */}
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-credit-card" style={{ marginLeft: 6 }} />
            إتمام عملية الدفع
            {client && <span className="m-client-tag">{client.name}</span>}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        <div className="m-body pay-body">
          {/* عمود الإجماليات */}
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

            {/* نوع المستند */}
            <div style={{ marginTop: 16 }}>
              <div className="pay-sec-ttl">نوع الوثيقة</div>
              <div className="pay-doc-types">
                {(documentTypes.filter(t => ['FV', 'BL', 'BCC', 'FA'].includes(t.code))).map(t => (
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

            {/* تاريخ الاستحقاق */}
            <div style={{ marginTop: 12 }}>
              <div className="pay-sec-ttl">تاريخ الاستحقاق (اختياري)</div>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="pay-date-inp"
              />
            </div>

            {/* ملاحظة */}
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

          {/* عمود الدفع */}
          <div className="pay-methods">
            <div className="pay-sec-ttl">وسائل الدفع</div>

            {/* سطور الدفع */}
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

            {/* الأرقام */}
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

        {/* ذيل */}
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

// ══════════════════════════════════════════════════════════════════════════════
// HeldCartsModal
// ══════════════════════════════════════════════════════════════════════════════
function HeldCartsModal({
  carts, onClose, onRestore, onDelete,
}: {
  carts: any[]; onClose: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = carts.filter(c =>
    !search || c.items?.some((i: any) => i.product_name?.includes(search)) || c.client?.name?.includes(search)
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
                {filtered.map((c: any) => (
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

// ══════════════════════════════════════════════════════════════════════════════
// ProfessionalReceipt
// ══════════════════════════════════════════════════════════════════════════════
function ProfessionalReceipt({
  items, totals, client, docNumber, onClose, onPrint, onNewSale,
}: {
  items: CartItem[]; totals: CartTotals; client: Party | null;
  docNumber?: string; onClose: () => void; onPrint: () => void; onNewSale: () => void;
}) {
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
            {/* رأس الإيصال */}
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

            {/* جدول الأصناف */}
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
                {items.map((item, i) => (
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

            {/* الإجماليات */}
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
          <button className="btn btn-sm" onClick={onNewSale}>
            <i className="ti ti-plus" /> بيع جديد
          </button>
          <button className="btn btn-sm" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ManualProductModal
// ══════════════════════════════════════════════════════════════════════════════
function ManualProductModal({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, priceTtc: number, qty: number, tvaRate: number) => void;
}) {
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

// ══════════════════════════════════════════════════════════════════════════════
// SessionStatsModal
// ══════════════════════════════════════════════════════════════════════════════
function SessionStatsModal({
  sessionInvoices, sessionSales, heldCount, avgMargin, onClose,
}: {
  sessionInvoices: number; sessionSales: number;
  heldCount: number; avgMargin: number; onClose: () => void;
}) {
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

// ══════════════════════════════════════════════════════════════════════════════
// KeyboardHelpModal
// ══════════════════════════════════════════════════════════════════════════════
function KeyboardHelpModal({ onClose }: { onClose: () => void }) {
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

// ══════════════════════════════════════════════════════════════════════════════
// MobileTabs
// ══════════════════════════════════════════════════════════════════════════════
function MobileTabs({
  activeTab, onTab, itemsCount, totalTtc, isEmpty, onSell,
}: {
  activeTab: 'products' | 'cart';
  onTab: (t: 'products' | 'cart') => void;
  itemsCount: number; totalTtc: number; isEmpty: boolean; onSell: () => void;
}) {
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

// ══════════════════════════════════════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════════════════════════════════════

function getVariantPrice(
  v: ProductVariant,
  priceLevelId: number | null,
  priceLevels: PriceLevel[],
): number {
  if (priceLevelId) {
    const priceEntry = (v as any).prices?.find((p: any) => p.price_level_id === priceLevelId);
    if (priceEntry) return priceEntry.price_ht;
    const pl = priceLevels.find(p => p.id === priceLevelId);
    if (pl?.discount_percent)
      return v.default_selling_price_ht * (1 - pl.discount_percent / 100);
  }
  return v.default_selling_price_ht;
}

function productToVariant(p: Product): ProductVariant {
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
    current_stock:              (p as any).current_stock,
    active:                     p.active,
    company_id:                 p.company_id,
    product:                    p,
    unit:                       p.unit,
    tva:                        p.tva,
    prices:                     (p as any).prices,
    created_at:                 p.created_at,
    updated_at:                 p.updated_at,
  } as ProductVariant;
}

function makeFakeVariant(name: string, priceHt: number, tvaRate: number): ProductVariant {
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
  } as any;
}

function familyIcon(name: string): string {
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

function familyStyleFromName(family: string): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل')) return { icon: 'ti-apple', color: 'var(--em)',    bg: 'var(--emb)'  };
  if (f.includes('شراب') || f.includes('ماء')) return { icon: 'ti-droplets', color: 'var(--blue)',  bg: 'var(--blueb)' };
  if (f.includes('إلكترون')) return { icon: 'ti-device-mobile', color: 'var(--blue)',  bg: 'var(--blueb)' };
  if (f.includes('ملابس'))   return { icon: 'ti-shirt',          color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))   return { icon: 'ti-tool',           color: 'var(--orange)', bg: 'var(--orb)'   };
  if (f.includes('دواء'))    return { icon: 'ti-pill',           color: 'var(--red)',   bg: 'var(--redb)'  };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
