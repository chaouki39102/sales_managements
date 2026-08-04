// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProCart.tsx
//
// سلة POS PRO — قائمة افتراضية (react-virtual) لعدد صنوف كبير بدون تدهور
// الأداء (نفس تقنية ProfessionalCart: nodeMap + measureElement + overscan).
// الصف تصميم بسيط بسطر واحد: الصورة/الاسم + شارات صغيرة، عداد الكمية
// (+/-/إدخال مباشر، أو زر وزن للمنتجات بالوزن)، السعر (نقرة لتحريره)،
// زر الخصم (popover % / دج على غرار CartRow الكلاسيكي)، إجمالي السطر، والحذف.
// رأس السلة: تبويبات السلة المعلّقة + شريط خصم الفاتورة (% / دج) + ملاحظة + إفراغ.
// ════════════════════════════════════════════════════════════════════════════
import { useRef, useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDZD } from '@/pos/utils/calculations';
import { proxyImage } from '@/lib/api/imageProxy';
import type { CartItem, HeldCart, ProductPackaging, PriceLevel, CartTotals } from '@/types';

interface Props {
  items:               CartItem[];
  invoiceDiscountPct:  number;
  totals?:             CartTotals;
  onQty:               (id: string, qty: number) => void;
  onDiscount:          (id: string, pct: number) => void;
  onDiscountAmount:    (id: string, amount: number) => void;
  onPrice:             (id: string, price: number) => void;
  onPackaging:         (id: string, packaging: ProductPackaging | null, basePriceHt: number) => void;
  onWeight:            (item: CartItem) => void;
  onRemove:            (id: string) => void;
  onClear:             () => void;
  onInvoiceDiscountChange: (pct: number) => void;
  onOpenProducts:      () => void;
  priceLevels?:        PriceLevel[];
  selectedPriceLevelId?: number | null;
  onPriceLevelChange?: (plId: number | null) => void;
  note?:               string;
  onNoteChange?:       (note: string) => void;
  selectedItemId?:     string | null;
  onSelectItem?:       (id: string | null) => void;
  heldCarts?:          HeldCart[];
  saleNumber?:         number;
  onNewSale?:          () => void;
  onRestoreHeld?:      (id: string) => void;
  onCloseHeld?:        (id: string) => void;
  onCloseCurrent?:     () => void;
}

/** Handle برمجي للتمرير إلى صف محدد (يتوافق مع react-virtual) */
export interface POSProCartHandle {
  scrollToItemId: (id: string) => void;
}

/** عداد كمية مع إدخال مباشر يُثبَّت عند الخروج (Enter/blur) */
function QtyInput({
  item, onQty,
}: { item: CartItem; onQty: (id: string, qty: number) => void }) {
  const [text, setText] = useState(String(item.quantity));
  useEffect(() => setText(String(item.quantity)), [item.quantity]);

  const commit = () => {
    const n = parseFloat(text);
    if (Number.isFinite(n)) onQty(item.id, n);
    else setText(String(item.quantity));
  };

  return (
    <div className="pp-row-qty">
      <button type="button" onClick={() => onQty(item.id, item.quantity - 1)} aria-label="نقص">
        <i className="ti ti-minus" />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        inputMode="decimal"
      />
      <button type="button" onClick={() => onQty(item.id, item.quantity + 1)} aria-label="زيادة">
        <i className="ti ti-plus" />
      </button>
    </div>
  );
}

/** سعر قابل للتحرير — نقرة تحوّل النص إلى حقل إدخال */
function PriceInput({
  item, onPrice,
}: { item: CartItem; onPrice: (id: string, price: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText]       = useState(String(item.unit_price_ht));

  useEffect(() => {
    setText(String(item.unit_price_ht));
    setEditing(false);
  }, [item.unit_price_ht, item.id]);

  const commit = () => {
    const n = parseFloat(text);
    if (Number.isFinite(n) && n >= 0) onPrice(item.id, n);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="pp-row-price"
        onClick={(e) => { e.stopPropagation(); setEditing(true); setText(String(item.unit_price_ht)); }}
        title="انقر لتعديل السعر"
      >
        {formatDZD(item.unit_price_ht)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      className="pp-row-price-input"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setEditing(false);
      }}
      inputMode="decimal"
    />
  );
}

function StockBadge({ item }: { item: CartItem }) {
  if (!item.manages_stock || item.max_stock == null) return null;
  const remaining = item.max_stock - item.quantity;
  const cls = remaining < 0 ? 'pp-badge--out' : (remaining <= 5 ? 'pp-badge--low' : 'pp-badge--ok');
  return (
    <span className={`pp-badge ${cls}`}>
      {remaining < 0 ? `تجاوز: ${-remaining}` : `متبقي: ${remaining}`}
    </span>
  );
}

type DiscMode = 'pct' | 'amount';

type RowStyle = 'simple' | 'full';
const CART_ROW_KEY = 'pos-pro-cart-row';

/** صف مبسّط (سطر واحد) أو مفصّل (سطران) — يمتلك حالة popover الخصم (% / دج) الخاص به */
function PPRow({
  item, isSelected, onSelect, onQty, onDiscount, onDiscountAmount, onPrice,
  onPackaging, onWeight, onRemove, compact,
}: {
  item: CartItem;
  isSelected: boolean;
  onSelect: () => void;
  onQty: (id: string, qty: number) => void;
  onDiscount: (id: string, pct: number) => void;
  onDiscountAmount: (id: string, amount: number) => void;
  onPrice: (id: string, price: number) => void;
  onPackaging: (id: string, packaging: ProductPackaging | null, basePriceHt: number) => void;
  onWeight: (item: CartItem) => void;
  onRemove: (id: string) => void;
  compact: boolean;
}) {
  const [discOpen, setDiscOpen] = useState(false);
  const [discMode, setDiscMode] = useState<DiscMode>('amount');
  const [discVal, setDiscVal]   = useState('');
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const discBtnRef   = useRef<HTMLButtonElement>(null);
  const discInpRef   = useRef<HTMLInputElement>(null);
  const rowRef       = useRef<HTMLDivElement>(null);
  const popupRef     = useRef<HTMLDivElement>(null);

  const packagings = item.available_packagings ?? [];
  const showPack   = packagings.length > 1;
  const hasDisc    = item.discount_percentage > 0 || item.discount_amount > 0;
  const discLabel  = item.discount_amount > 0
    ? `-${formatDZD(item.discount_amount)}`
    : item.discount_percentage > 0
      ? `-${item.discount_percentage % 1 === 0 ? item.discount_percentage : item.discount_percentage.toFixed(2)}%`
      : null;

  const openDisc = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = discMode === 'pct'
      ? String(Number(item.discount_percentage || 0).toFixed(2))
      : String(Number(item.discount_amount || 0).toFixed(2));
    setDiscVal(cur);
    if (discOpen) { setDiscOpen(false); return; }
    const r = discBtnRef.current?.getBoundingClientRect();
    if (r) {
      const w = 220;
      let left = r.left;
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
      if (left < 8) left = 8;
      setPopupPos({ top: r.bottom + 8, left });
    }
    setDiscOpen(true);
  }, [discMode, item.discount_percentage, item.discount_amount, discOpen]);

  useEffect(() => {
    if (discOpen) { discInpRef.current?.focus(); discInpRef.current?.select(); }
  }, [discOpen, discMode]);

  useEffect(() => {
    if (!discOpen) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (rowRef.current?.contains(t) || popupRef.current?.contains(t)) return;
      setDiscOpen(false);
    };
    const onScroll = () => setDiscOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [discOpen]);

  const commitDisc = useCallback(() => {
    const n = parseFloat(discVal);
    if (!isNaN(n) && n >= 0) {
      if (discMode === 'pct') onDiscount(item.id, Math.min(100, n));
      else onDiscountAmount(item.id, Math.max(0, n));
    }
    setDiscOpen(false);
  }, [discVal, discMode, item.id, onDiscount, onDiscountAmount]);

  return (
    <div
      ref={rowRef}
      className={`pp-row-body${isSelected ? ' pp-row-body--selected' : ''}${compact ? '' : ' pp-row-body--full'}`}
      onClick={onSelect}
    >
      <div className="pp-row-main">
        <div className="pp-row-img">
          {item.image_url ? <img src={proxyImage(item.image_url, 96) ?? item.image_url} alt="" loading="lazy" /> : <i className="ti ti-package" />}
        </div>
        <div className="pp-row-info">
          <div className="pp-row-name" title={item.product_name}>
            {item.product_name}
            {item.variant_name && <span className="pp-row-variant"> — {item.variant_name}</span>}
          </div>
          {compact ? (
            <div className="pp-row-sub">
              {item.ref && <span>{item.ref}</span>}
              {item.unit_symbol && <span>{item.unit_symbol}</span>}
              {item.tva_rate > 0 && <span>TVA {item.tva_rate}%</span>}
              <StockBadge item={item} />
              {showPack && (
                <select
                  className="pp-row-pack"
                  value={item.packaging_id ?? ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const pkg = id ? packagings.find(p => p.id === id) ?? null : null;
                    onPackaging(item.id, pkg, item.base_price_ht ?? item.unit_price_ht);
                  }}
                  title="تغليف"
                >
                  <option value="">واحد</option>
                  {packagings.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} (×{p.quantity})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <>
              <div className="pp-row-sub">
                {item.ref && <span>{item.ref}</span>}
                {item.unit_symbol && <span>{item.unit_symbol}</span>}
                {item.tva_rate > 0 && <span>TVA {item.tva_rate}%</span>}
              </div>
              <div className="pp-row-sub2">
                <StockBadge item={item} />
                {showPack && (
                  <select
                    className="pp-row-pack"
                    value={item.packaging_id ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      const pkg = id ? packagings.find(p => p.id === id) ?? null : null;
                      onPackaging(item.id, pkg, item.base_price_ht ?? item.unit_price_ht);
                    }}
                    title="تغليف"
                  >
                    <option value="">واحد</option>
                    {packagings.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label} (×{p.quantity})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {item.is_sold_by_weight ? (
        <button
          type="button"
          className="pp-row-weight"
          onClick={(e) => { e.stopPropagation(); onWeight(item); }}
          title="تعديل الوزن"
        >
          <i className="ti ti-scale" />
          <span>{Number(item.quantity).toFixed(3)}</span>
          <em>{item.unit_symbol ?? 'كغ'}</em>
        </button>
      ) : (
        <div onClick={(e) => e.stopPropagation()}>
          <QtyInput item={item} onQty={onQty} />
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <PriceInput item={item} onPrice={onPrice} />
      </div>

      <button
        ref={discBtnRef}
        type="button"
        className={`pp-row-disc${hasDisc ? ' on' : ''}${discOpen ? ' pop' : ''}`}
        onClick={openDisc}
        title="خصم على الصنف (% أو دج)"
      >
        {discLabel ?? (<><i className="ti ti-discount" />خصم</>)}
      </button>

      <div className="pp-row-total">{formatDZD(item.total_ttc)}</div>
      <button
        type="button"
        className="pp-row-remove"
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        aria-label="حذف"
      >
        <i className="ti ti-x" />
      </button>

      {discOpen && createPortal(
        <div
          ref={popupRef}
          className="pp-disc-pop"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 10000 }}
        >
          <div className="pp-disc-pop-arrow" />
          <div className="pp-disc-pop-modes">
            <button
              className={`pp-disc-pop-mode ${discMode === 'pct' ? 'on' : ''}`}
              onClick={() => { setDiscMode('pct'); setDiscVal(String(Number(item.discount_percentage || 0).toFixed(2))); }}
              type="button"
            >
              <i className="ti ti-percentage" /> نسبة %
            </button>
            <button
              className={`pp-disc-pop-mode ${discMode === 'amount' ? 'on' : ''}`}
              onClick={() => { setDiscMode('amount'); setDiscVal(String(Number(item.discount_amount || 0).toFixed(2))); }}
              type="button"
            >
              <i className="ti ti-currency-dinar" /> مبلغ دج
            </button>
          </div>
          <div className="pp-disc-pop-inp-row">
            <input
              ref={discInpRef}
              className="pp-disc-pop-inp"
              type="number"
              value={discVal}
              onChange={(e) => setDiscVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  commitDisc();
                if (e.key === 'Escape') setDiscOpen(false);
              }}
              min={0}
              max={discMode === 'pct' ? 100 : undefined}
              step={discMode === 'pct' ? 0.01 : 1}
              placeholder="0.00"
            />
            <span className="pp-disc-pop-unit">{discMode === 'pct' ? '%' : 'دج'}</span>
          </div>
          {discVal && parseFloat(discVal) > 0 && (
            <div className="pp-disc-pop-preview">
              وفر: <strong>
                {discMode === 'pct'
                  ? formatDZD(item.unit_price_ht * item.quantity * parseFloat(discVal) / 100)
                  : formatDZD(parseFloat(discVal))}
              </strong>
            </div>
          )}
          <div className="pp-disc-pop-actions">
            {hasDisc && (
              <button
                className="pp-disc-pop-clear"
                onClick={() => { onDiscount(item.id, 0); onDiscountAmount(item.id, 0); setDiscOpen(false); }}
                type="button"
              >
                <i className="ti ti-x" /> إزالة
              </button>
            )}
            <button className="pp-disc-pop-cancel" onClick={() => setDiscOpen(false)} type="button">
              إلغاء
            </button>
            <button className="pp-disc-pop-ok" onClick={commitDisc} type="button">
              <i className="ti ti-check" /> تطبيق
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

const POSProCart = forwardRef<POSProCartHandle, Props>(function POSProCart({
  items, invoiceDiscountPct, totals, onQty, onDiscount, onDiscountAmount, onPrice,
  onPackaging, onWeight, onRemove, onClear, onInvoiceDiscountChange, onOpenProducts,
  priceLevels = [], selectedPriceLevelId = null, onPriceLevelChange, note = '', onNoteChange,
  selectedItemId, onSelectItem, heldCarts = [], saleNumber, onNewSale, onRestoreHeld,
  onCloseHeld, onCloseCurrent,
}, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [invDiscMode, setInvDiscMode] = useState<DiscMode>('amount');
  const [invDiscAmtVal, setInvDiscAmtVal] = useState('');
  const [invDiscOpen, setInvDiscOpen] = useState(false);
  const [invDiscPos, setInvDiscPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const invDiscBtnRef = useRef<HTMLButtonElement>(null);
  const invDiscPopRef = useRef<HTMLDivElement>(null);

  const [rowStyle, setRowStyle] = useState<RowStyle>(() => {
    try { return localStorage.getItem(CART_ROW_KEY) === 'full' ? 'full' : 'simple'; } catch { return 'simple'; }
  });
  const compact = rowStyle === 'simple';
  const toggleRowStyle = useCallback(() => {
    setRowStyle(prev => {
      const next: RowStyle = prev === 'simple' ? 'full' : 'simple';
      try { localStorage.setItem(CART_ROW_KEY, next); } catch {}
      return next;
    });
  }, []);

  const invoiceDiscAmount = totals?.invoice_discount_amount ?? 0;

  useEffect(() => {
    if (!invoiceDiscountPct || invoiceDiscountPct <= 0) setInvDiscAmtVal('');
  }, [invoiceDiscountPct]);

  useEffect(() => {
    if (!invDiscOpen) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (invDiscBtnRef.current?.contains(t) || invDiscPopRef.current?.contains(t)) return;
      setInvDiscOpen(false);
    };
    const onScroll = () => setInvDiscOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [invDiscOpen]);

  const handleInvDiscAmount = useCallback((raw: string) => {
    setInvDiscAmtVal(raw);
    const n = parseFloat(raw) || 0;
    if (n <= 0) { onInvoiceDiscountChange(0); return; }
    // خصم الفاتورة يُطبَّق على مستوى HT (calcTotals: invoice_discount_amount = totalHt * pct / 100).
    // نعكس الحساب لنستخرج النسبة الصحيحة من المبلغ المدخل.
    const curHt     = totals?.total_ht ?? 0;
    const curDiscHt = invoiceDiscAmount;
    const origHt    = curHt + curDiscHt;
    if (origHt <= 0) return;
    onInvoiceDiscountChange(Math.min(100, (n / origHt) * 100));
  }, [onInvoiceDiscountChange, totals?.total_ht, invoiceDiscAmount]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (compact ? 48 : 82),
    overscan: 8,
  });

  useImperativeHandle(ref, () => ({
    scrollToItemId: (id: string) => {
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'auto' });
    },
  }), [items, virtualizer]);

  // تبويبات السلة: مرتبة تصاعدياً حسب رقم السلة (سلة 1، سلة 2…) بحيث يبقى
  // موضع كل تبويب ثابتاً — النقر يفعّل التبويب في مكانه دون إعادة ترتيب.
  const tabs = useMemo(() => {
    const currentNum = typeof saleNumber === 'number' && saleNumber > 0 ? saleNumber : 1;
    const list: { key: string; kind: 'held' | 'current'; num: number; label: string; count: number }[] =
      heldCarts.map(c => {
        const m = (c.label ?? '').match(/\d+/);
        return { key: c.id, kind: 'held' as const, num: m ? Number(m[0]) : 0, label: c.label || 'سلة', count: c.items.length };
      });
    list.push({ key: '__current__', kind: 'current', num: currentNum, label: `سلة ${currentNum}`, count: items.length });
    list.sort((a, b) => a.num - b.num);
    return list;
  }, [heldCarts, saleNumber, items.length]);

  return (
    <div className={`pp-cart${items.length === 0 ? ' pp-cart--empty' : ''}`}>
      <div className="pp-cart-hd">
        <div className="pp-cart-tabs">
          {tabs.map(t => t.kind === 'held' ? (
            <span
              key={t.key}
              role="button"
              tabIndex={0}
              className="pp-cart-tab pp-cart-tab--held"
              onClick={() => onRestoreHeld?.(t.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRestoreHeld?.(t.key); } }}
              title={`استرجاع "${t.label}" — ${t.count} صنف`}
            >
              <i className="ti ti-basket-pause" />
              {t.label}
              {onCloseHeld && (
                <button
                  type="button"
                  className="pp-cart-tab-x"
                  onClick={(e) => { e.stopPropagation(); onCloseHeld(t.key); }}
                  title="إغلاق السلة"
                  aria-label={`إغلاق ${t.label}`}
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </span>
          ) : (
            <span key={t.key} className="pp-cart-tab pp-cart-tab--current" title="السلة الحالية">
              <i className="ti ti-shopping-cart" />
              {t.label}
              <em className="pp-cart-tab-count">{t.count} صنف</em>
              {onCloseCurrent && items.length > 0 && (
                <button
                  type="button"
                  className="pp-cart-tab-x"
                  onClick={onCloseCurrent}
                  title="إغلاق السلة الحالية"
                  aria-label="إغلاق السلة الحالية"
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </span>
          ))}
          {onNewSale && (
            <button
              type="button"
              className="pp-cart-new"
              onClick={onNewSale}
              title="بيع جديد"
            >
              <i className="ti ti-plus" />
            </button>
          )}
        </div>

        <div className="pp-cart-hd-actions">
          {priceLevels.length > 0 && (
            <select
              className="pp-pl-select"
              value={selectedPriceLevelId ?? ''}
              onChange={(e) => onPriceLevelChange?.(e.target.value ? Number(e.target.value) : null)}
              title="قائمة الأسعار المطبقة على السلة"
            >
              <option value="">سعر عادي</option>
              {priceLevels.map(pl => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={`pp-row-toggle${compact ? '' : ' on'}`}
            onClick={toggleRowStyle}
            title={compact ? 'تبديل لصف مفصّل (سطران)' : 'تبديل لصف مبسّط (سطر واحد)'}
          >
            <i className={`ti ${compact ? 'ti-list' : 'ti-list-details'}`} />
          </button>
          <button
            type="button"
            className={`pp-note-toggle${noteOpen || note ? ' on' : ''}`}
            onClick={() => setNoteOpen(o => !o)}
            title="ملاحظة على الفاتورة"
          >
            <i className="ti ti-notes" />
          </button>

          {/* ── خصم الفاتورة: زر مصغّر يفتح popover (% / دج) ── */}
          <button
            ref={invDiscBtnRef}
            type="button"
            className={`pp-inv-disc-btn${invoiceDiscountPct > 0 ? ' on' : ''}${invDiscOpen ? ' pop' : ''}`}
            onClick={() => {
              if (invDiscOpen) { setInvDiscOpen(false); return; }
              const r = invDiscBtnRef.current?.getBoundingClientRect();
              if (r) {
                const w = 220;
                let left = r.left;
                if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
                if (left < 8) left = 8;
                setInvDiscPos({ top: r.bottom + 8, left });
              }
              setInvDiscOpen(true);
            }}
            title="خصم على الفاتورة"
          >
            <i className="ti ti-percentage" />
            {invoiceDiscountPct > 0 ? `${invoiceDiscountPct}%` : 'خصم'}
          </button>
          {invDiscOpen && createPortal(
            <div
              ref={invDiscPopRef}
              className="pp-disc-pop pp-inv-disc-pop"
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'fixed', top: invDiscPos.top, left: invDiscPos.left, zIndex: 10000 }}
            >
              <div className="pp-disc-pop-arrow" />
              <div className="pp-disc-pop-label">خصم على الفاتورة</div>
              <div className="pp-disc-pop-modes">
                <button
                  type="button"
                  className={`pp-disc-pop-mode ${invDiscMode === 'pct' ? 'on' : ''}`}
                  onClick={() => setInvDiscMode('pct')}
                >
                  <i className="ti ti-percentage" /> نسبة %
                </button>
                <button
                  type="button"
                  className={`pp-disc-pop-mode ${invDiscMode === 'amount' ? 'on' : ''}`}
                  onClick={() => setInvDiscMode('amount')}
                >
                  <i className="ti ti-currency-dinar" /> مبلغ دج
                </button>
              </div>
              <div className="pp-disc-pop-inp-row">
                <input
                  autoFocus
                  className="pp-disc-pop-inp"
                  type="number"
                  min={0}
                  step={invDiscMode === 'pct' ? 0.01 : 1}
                  value={invDiscMode === 'pct' ? (invoiceDiscountPct || '') : invDiscAmtVal}
                  onChange={(e) => {
                    if (invDiscMode === 'pct') {
                      onInvoiceDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)));
                    } else {
                      handleInvDiscAmount(e.target.value);
                    }
                  }}
                  placeholder="0"
                />
                <span className="pp-disc-pop-unit">{invDiscMode === 'pct' ? '%' : 'دج'}</span>
              </div>
              {invoiceDiscAmount > 0 && (
                <div className="pp-disc-pop-preview">
                  الخصم: <strong>-{formatDZD(invoiceDiscAmount)}</strong>
                </div>
              )}
              <div className="pp-disc-pop-actions">
                {invoiceDiscountPct > 0 && (
                  <button
                    type="button"
                    className="pp-disc-pop-clear"
                    onClick={() => { onInvoiceDiscountChange(0); setInvDiscAmtVal(''); }}
                  >
                    <i className="ti ti-x" /> إزالة
                  </button>
                )}
                <button className="pp-disc-pop-cancel" onClick={() => setInvDiscOpen(false)} type="button">
                  إغلاق
                </button>
              </div>
            </div>,
            document.body,
          )}

          <button type="button" className="pp-clear" onClick={onClear}>
            <i className="ti ti-trash" />
            إفراغ
          </button>
        </div>
      </div>

      {noteOpen && (
        <div className="pp-cart-note">
          <i className="ti ti-notes" />
          <input
            value={note}
            onChange={(e) => onNoteChange?.(e.target.value)}
            placeholder="ملاحظة تظهر على الفاتورة…"
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="pp-cart-empty-inner">
          <i className="ti ti-basket-off" />
          <h3>السلة فارغة</h3>
          <p>اضغط زر «المنتجات» لإضافة أصناف، أو امسح باركود مباشرة</p>
          <button type="button" className="btn btn-p" onClick={onOpenProducts}>
            <i className="ti ti-plus" />
            إضافة منتجات
          </button>
        </div>
      ) : (
        <div ref={scrollRef} className="pp-cart-scroll">
        <div
          className="pp-cart-vspace"
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map(vRow => {
            const item = items[vRow.index];
            const isSelected = selectedItemId === item.id;
            return (
              <div
                key={item.id}
                ref={virtualizer.measureElement}
                data-index={vRow.index}
                className={`pp-row${isSelected ? ' pp-row--selected' : ''}`}
                title={isSelected ? 'الصنف المحدد — *رقم+Enter لضبط الكمية' : 'انقر لتحديد الصنف'}
                style={{ transform: `translateY(${vRow.start}px)` }}
              >
                <PPRow
                  item={item}
                  isSelected={isSelected}
                  onSelect={() => onSelectItem?.(item.id)}
                  onQty={onQty}
                  onDiscount={onDiscount}
                  onDiscountAmount={onDiscountAmount}
                  onPrice={onPrice}
                  onPackaging={onPackaging}
                  onWeight={onWeight}
                  onRemove={onRemove}
                  compact={compact}
                />
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
});

export default POSProCart;
