// pages/pos/POSPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePOS }           from '@/pos/hooks/usePOS';
import { useClients }                              from '@/lib/api/endpoints/parties';
import { usePaymentModes, useWarehouses }          from '@/lib/api/endpoints/lookups';
import { useDocumentTypes }                        from '@/lib/api/endpoints/lookups';
import { useVariantSearch }                        from '@/lib/api/endpoints/products';
import { useSelectedFiscalYear }                   from '@/lib/api/endpoints/fiscalYears';
import ProductCard          from '@/pos/components/ProductCard';
import Cart                 from '@/pos/components/Cart';
import PaymentModal         from '@/pos/components/PaymentModal';
import HeldCartsModal       from '@/pos/components/HeldCartsModal';
import Receipt              from '@/pos/components/Receipt';
import type { ProductVariant } from '@/types';
import { formatDZD } from '@/pos/utils/calculations';

export default function POSPage() {
  const pos             = usePOS();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showHeld,    setShowHeld]    = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showManual,  setShowManual]  = useState(false);
  const [mobTab,      setMobTab]      = useState<'products' | 'cart'>('products');
  const [lastDocNum,  setLastDocNum]  = useState<string | undefined>();

  const searchRef = useRef<HTMLInputElement>(null);

  // API data
  // ✅ useVariantSearch بدلاً من useVariants
  const { data: variantsData, isLoading: loadingVariants } = useVariantSearch(
    pos.searchQuery.length >= 2 ? pos.searchQuery : ' ',
    { per_page: 100 }
  );
  // ✅ useClients بدلاً من useCustomers
  const { data: customersData } = useClients({ active: true, per_page: 100 });
  const { data: paymentModes  } = usePaymentModes();
  const { data: warehouses    } = useWarehouses();
  // ✅ useSelectedFiscalYear يعيد FiscalYear | null مباشرة (بدون { data })
  const fiscalYear               = useSelectedFiscalYear();
  const { data: documentTypes } = useDocumentTypes();

  const variants  = variantsData?.data ?? [];
  const customers = customersData?.data ?? [];

  // Filter by category
  const filteredVariants: ProductVariant[] = pos.selectedCategory
    ? variants.filter(v => v.product?.family_id === pos.selectedCategory)
    : variants;

  // Get unique families for category bar
  const families = Array.from(
    new Map(
      variants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!])
    ).values()
  );

  // ── Keyboard shortcuts ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (e.key === 'F4') { e.preventDefault(); if (!pos.isEmpty) pos.openPayment(); }
      if (e.key === 'F5') { e.preventDefault(); if (!pos.isEmpty) pos.holdCart(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pos]);

  // ── Complete sale handler ─────────────────────
  const handleCompleteSale = useCallback(async (params: {
    paymentModeId: number;
    amountPaid: number;
    dueDate?: string;
    note?: string;
  }) => {
    // Find invoice document type
    const invType = documentTypes?.find(t => t.code === 'FAC' || t.code === 'INV');
    const wh = warehouses?.[0];
    if (!invType || !wh || !fiscalYear) {
      return { ok: false, message: 'إعدادات غير مكتملة (نوع المستند / المستودع / السنة المالية)' };
    }
    const res = await pos.completeSale({
      paymentModeId:   params.paymentModeId,
      documentTypeId:  invType.id,
      warehouseId:     wh.id,
      fiscalYearId:    fiscalYear.id,
      amountPaid:      params.amountPaid,
    });
    if (res.ok && res.document) {
      setLastDocNum(res.document.document_number);
      setShowReceipt(true);
    }
    return res;
  }, [pos, documentTypes, warehouses, fiscalYear]);

  const totalTtc = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  return (
    <div className="page on" id="p-pos">

      {/* ── Stats bar ── */}
      <div className="pos-stats">
        <div className="pos-chip g" title="فواتير اليوم">
          <span className="ic ic-xs"><i className="ti ti-receipt" /></span>
          <span>فواتير:</span><strong>{pos.sessionInvoices}</strong>
        </div>
        <div className="pos-chip o" title="مبيعات اليوم">
          <span className="ic ic-xs"><i className="ti ti-cash" /></span>
          <span>مبيعات:</span><strong>{formatDZD(pos.sessionSales)}</strong>
        </div>
        <div
          className="pos-chip b clickable"
          onClick={() => setShowHeld(true)}
          title="الفواتير المعلقة"
        >
          <span className="ic ic-xs"><i className="ti ti-clock-pause" /></span>
          <span>معلقة:</span><strong>{pos.heldCarts.length}</strong>
          <span style={{ opacity: 0.6, fontSize: 10 }}>←</span>
        </div>

        <div className="pos-tools">
          <button className="btn btn-xs" onClick={() => setShowManual(true)} title="إضافة يدوي (F7)">
            <span className="ic ic-xs"><i className="ti ti-plus" /></span>
            <span className="tb-txt"> يدوي</span>
          </button>
          <button className="btn btn-xs" onClick={() => setShowReceipt(true)} title="معاينة وطباعة" disabled={pos.isEmpty}>
            <span className="ic ic-xs"><i className="ti ti-printer" /></span>
          </button>
        </div>

        <div className="pos-kb-hint">
          <kbd>F2</kbd> بحث &nbsp;
          <kbd>F4</kbd> بيع &nbsp;
          <kbd>F5</kbd> تعليق
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="pos-mob-tabs">
        <div
          className={`pmt ${mobTab === 'products' ? 'on' : ''}`}
          onClick={() => setMobTab('products')}
        >
          <div className="pmt-ic"><i className="ti ti-package" /></div>
          <span>المنتجات</span>
        </div>
        <div
          className={`pmt ${mobTab === 'cart' ? 'on' : ''}`}
          onClick={() => setMobTab('cart')}
        >
          <div className="pmt-ic"><i className="ti ti-shopping-cart" /></div>
          {pos.itemsCount > 0 && (
            <div className="pmt-badge">{pos.itemsCount}</div>
          )}
          <span>السلة</span>
        </div>
        <button
          className="pmt-sell-btn"
          onClick={pos.openPayment}
          disabled={pos.isEmpty}
        >
          <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
          تأكيد البيع
        </button>
      </div>

      {/* ── Mobile total bar ── */}
      {!pos.isEmpty && (
        <div className="mob-total-bar" style={{ display: 'flex' }}>
          <div className="mob-total-left">
            <span className="ic ic-xs"><i className="ti ti-shopping-cart" /></span>
            <span>{pos.itemsCount} وحدة</span>
          </div>
          <div className="mob-total-right">
            <span className="mob-total-label">الإجمالي</span>
            <span className="mob-total-val">{formatDZD(totalTtc)}</span>
            <button className="mob-total-pay-btn" onClick={pos.openPayment}>
              <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
              دفع
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div
        className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}
        id="pos-layout"
      >

        {/* ═══ LEFT: Products ═══ */}
        <div className="pos-left" id="pos-left">

          {/* Search bar */}
          <div className="pos-search-bar">
            <div className="pos-inp">
              <span className="ic ic-xs" style={{ color: 'var(--t4)' }}><i className="ti ti-search" /></span>
              <input
                ref={searchRef}
                type="text"
                id="pos-search"
                placeholder="ابحث بالاسم أو الباركود... (F2)"
                value={pos.searchQuery}
                onChange={e => pos.setSearch(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {pos.searchQuery && (
                <button
                  onClick={() => pos.setSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', padding: 0, fontSize: 12 }}
                >
                  <span className="ic ic-xs"><i className="ti ti-x" /></span>
                </button>
              )}
            </div>
            <div className="view-tog">
              <button
                className={`vtb ${view === 'grid' ? 'on' : ''}`}
                onClick={() => setView('grid')}
                title="شبكي"
              >
                <span className="ic ic-xs"><i className="ti ti-grid-dots" /></span>
              </button>
              <button
                className={`vtb ${view === 'list' ? 'on' : ''}`}
                onClick={() => setView('list')}
                title="قائمة"
              >
                <span className="ic ic-xs"><i className="ti ti-list" /></span>
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="pos-cats">
            <button
              className={`cat-btn ${!pos.selectedCategory ? 'on' : ''}`}
              onClick={() => pos.setCategory(null)}
            >
              <span className="ic ic-xs"><i className="ti ti-apps" /></span>
              الكل
              <span className="cat-cnt">{variants.length}</span>
            </button>
            {families.map(f => {
              const count = variants.filter(v => v.product?.family_id === f.id).length;
              return (
                <button
                  key={f.id}
                  className={`cat-btn ${pos.selectedCategory === f.id ? 'on' : ''}`}
                  onClick={() => pos.setCategory(f.id)}
                >
                  {f.name}
                  <span className="cat-cnt">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Products grid */}
          <div className="pos-grid-area">
            {loadingVariants ? (
              <div className="no-res">
                <span style={{ fontSize: 36, opacity: 0.3 }}><i className="ti ti-loader" /></span>
                <div>جاري التحميل...</div>
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="no-res">
                <span style={{ fontSize: 36, opacity: 0.2 }}><i className="ti ti-search" /></span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>لا توجد نتائج</div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>جرّب بحثاً مختلفاً</div>
                <button className="btn btn-p btn-sm" onClick={() => setShowManual(true)}>
                  <span className="ic ic-xs"><i className="ti ti-plus" /></span> إضافة يدوي
                </button>
              </div>
            ) : (
              <div className={`pgrid ${view === 'list' ? 'lv' : ''}`}>
                {filteredVariants.map(variant => {
                  const inCart = pos.items.find(i => i.product_id === variant.id);
                  return (
                    <ProductCard
                      key={variant.id}
                      variant={variant}
                      qtyInCart={inCart?.quantity ?? 0}
                      view={view}
                      onClick={() => pos.addToCart(variant)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Cart ═══ */}
        <Cart
          items={pos.items}
          totals={pos.totals}
          client={pos.client}
          customers={customers}
          onQty={pos.updateQty}
          onDiscount={pos.updateDiscount}
          onRemove={pos.removeItem}
          onSetClient={pos.setClient}
          onHold={() => pos.holdCart()}
          onSell={pos.openPayment}
          onNote={() => {}}
          onClear={pos.clearCart}
          onHeld={() => setShowHeld(true)}
        />
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Payment */}
      <PaymentModal
        open={pos.paymentModalOpen}
        totals={pos.totals}
        client={pos.client}
        paymentModes={paymentModes ?? []}
        onClose={pos.closePayment}
        onConfirm={handleCompleteSale}
      />

      {/* Held carts */}
      <HeldCartsModal
        open={showHeld}
        carts={pos.heldCarts}
        onClose={() => setShowHeld(false)}
        onRestore={pos.restoreCart}
        onDelete={pos.deleteHeldCart}
      />

      {/* Receipt / print preview */}
      <Receipt
        open={showReceipt}
        items={pos.items}
        totals={pos.totals}
        client={pos.client}
        docNumber={lastDocNum}
        onClose={() => setShowReceipt(false)}
        onPrint={() => window.print()}
      />

      {/* Manual product modal */}
      <ManualProductModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onAdd={(name, priceTtc, qty, tvaRate) => {
          const htPrice = priceTtc / (1 + tvaRate / 100);
          const fakeVariant: ProductVariant = {
            id: Date.now(),
            product_id: 0,
            ref: null,
            barcode: null,
            variant_name: null,
            unit_id: null,
            tva_id: null,
            last_purchase_price: 0,
            average_cost_price: 0,
            default_selling_price_ht: htPrice,
            manages_stock: false,
            allow_negative_stock: true,
            has_lots: false,
            has_expiration_date: false,
            min_stock_alert: 0,
            max_stock_alert: 0,
            active: true,
            product: { id: 0, name, slug: '', description: null, family_id: null, brand_id: null, product_type_id: 1, images: null, active: true, created_at: '', updated_at: '' },
            tva: { id: 0, name: `${tvaRate}%`, rate: tvaRate, description: null, active: true, is_default: false, display_order: 0 },
          };
          pos.addToCart(fakeVariant, qty);
          setShowManual(false);
        }}
      />
    </div>
  );
}

// ── Manual product add modal ──────────────────────
function ManualProductModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, priceTtc: number, qty: number, tvaRate: number) => void;
}) {
  const [name,  setName]  = useState('');
  const [price, setPrice] = useState('');
  const [qty,   setQty]   = useState('1');
  const [tva,   setTva]   = useState('19');

  const handleAdd = () => {
    if (!name.trim() || !price) return;
    onAdd(name.trim(), parseFloat(price), parseInt(qty) || 1, parseInt(tva));
    setName(''); setPrice(''); setQty('1');
  };

  if (!open) return null;

  return (
    <div className="ov on">
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-plus" /></span>
            منتج / خدمة يدوية
          </div>
          <div className="m-x" onClick={onClose}><span className="ic ic-xs"><i className="ti ti-x" /></span></div>
        </div>
        <div className="m-body">
          <div className="fgrid">
            <div className="fg s2">
              <label className="req">الوصف</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="اسم المنتج أو الخدمة..."
                autoFocus
              />
            </div>
            <div className="fg">
              <label className="req">السعر TTC</label>
              <div className="inp-row">
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                  inputMode="decimal"
                />
                <div className="inp-suf">دج</div>
              </div>
            </div>
            <div className="fg">
              <label>الكمية</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} min={1} inputMode="numeric" />
            </div>
            <div className="fg">
              <label>TVA</label>
              <select value={tva} onChange={e => setTva(e.target.value)}>
                <option value="19">19%</option>
                <option value="9">9%</option>
                <option value="0">0% معفى</option>
              </select>
            </div>
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleAdd} disabled={!name.trim() || !price}>
            <span className="ic ic-xs"><i className="ti ti-shopping-cart-plus" /></span> إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
