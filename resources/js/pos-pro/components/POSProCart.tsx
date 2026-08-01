// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProCart.tsx
//
// سلة POS PRO — قائمة افتراضية (react-virtual) لعدد صنوف كبير بدون تدهور
// الأداء (نفس تقنية ProfessionalCart: nodeMap + measureElement + overscan).
// الصف يعرض: الصورة/الاسم، السعر (قابل للتعديل بنقرة)، عداد الكمية
// (+/-/إدخال مباشر، أو زر وزن للمنتجات بالوزن)، مبدّل التغليف، خصم النسبة،
// إجمالي السطر، شارة المخزون المتبقي، وزر الحذف.
// ════════════════════════════════════════════════════════════════════════════
import { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDZD } from '@/pos/utils/calculations';
import type { CartItem, HeldCart, ProductPackaging, PriceLevel } from '@/types';

interface Props {
  items:               CartItem[];
  invoiceDiscountPct:  number;
  onQty:               (id: string, qty: number) => void;
  onDiscount:          (id: string, pct: number) => void;
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
        onClick={() => { setEditing(true); setText(String(item.unit_price_ht)); }}
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

const POSProCart = forwardRef<POSProCartHandle, Props>(function POSProCart({
  items, invoiceDiscountPct, onQty, onDiscount, onPrice, onPackaging, onWeight,
  onRemove, onClear, onInvoiceDiscountChange, onOpenProducts,
  priceLevels = [], selectedPriceLevelId = null, onPriceLevelChange, note = '', onNoteChange,
  selectedItemId, onSelectItem, heldCarts = [], saleNumber, onNewSale, onRestoreHeld,
  onCloseHeld, onCloseCurrent,
}, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
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
              {onCloseCurrent && (
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
            className={`pp-note-toggle${noteOpen || note ? ' on' : ''}`}
            onClick={() => setNoteOpen(o => !o)}
            title="ملاحظة على الفاتورة"
          >
            <i className="ti ti-notes" />
          </button>
          <button
            type="button"
            className={`pp-disc-toggle${invoiceDiscountPct > 0 ? ' on' : ''}`}
            onClick={() => onInvoiceDiscountChange(invoiceDiscountPct > 0 ? 0 : 10)}
            title="خصم على الفاتورة"
          >
            <i className="ti ti-percentage" />
            {invoiceDiscountPct > 0 ? `${invoiceDiscountPct}%` : 'خصم'}
          </button>
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
            const packagings = item.available_packagings ?? [];
            const showPack = packagings.length > 1;
            const isSelected = selectedItemId === item.id;
            return (
              <div
                key={item.id}
                ref={virtualizer.measureElement}
                data-index={vRow.index}
                className={`pp-row${isSelected ? ' pp-row--selected' : ''}`}
                onClick={() => onSelectItem?.(item.id)}
                title={isSelected ? 'الصنف المحدد — *رقم+Enter لضبط الكمية' : 'انقر لتحديد الصنف'}
                style={{ transform: `translateY(${vRow.start}px)` }}
              >
                <div className="pp-row-main">
                  <div className="pp-row-img">
                    {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <i className="ti ti-package" />}
                  </div>
                  <div className="pp-row-info">
                    <div className="pp-row-name">{item.product_name}</div>
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
                  </div>
                </div>

                {item.is_sold_by_weight ? (
                  <button
                    type="button"
                    className="pp-row-weight"
                    onClick={() => onWeight(item)}
                    title="تعديل الوزن"
                  >
                    <i className="ti ti-scale" />
                    <span>{item.quantity}</span>
                    <em>{item.unit_symbol ?? 'كغ'}</em>
                  </button>
                ) : (
                  <QtyInput item={item} onQty={onQty} />
                )}

                <PriceInput item={item} onPrice={onPrice} />
                <div className="pp-row-disc">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={item.discount_percentage || ''}
                    placeholder="خصم%"
                    onChange={(e) => onDiscount(item.id, Number(e.target.value) || 0)}
                  />
                </div>
                <div className="pp-row-total">{formatDZD(item.total_ttc)}</div>
                <button type="button" className="pp-row-remove" onClick={() => onRemove(item.id)} aria-label="حذف">
                  <i className="ti ti-x" />
                </button>
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
