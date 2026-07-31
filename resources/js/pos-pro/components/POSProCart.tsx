// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProCart.tsx
//
// سلة POS PRO — قائمة افتراضية (react-virtual) لعدد صنوف كبير بدون تدهور
// الأداء (نفس تقنية ProfessionalCart: nodeMap + measureElement + overscan).
// الصف يعرض: الصورة/الاسم، السعر، عداد الكمية (+/-/إدخال مباشر)، خصم النسبة،
// إجمالي السطر، وزر الحذف.
// ════════════════════════════════════════════════════════════════════════════
import { useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDZD } from '@/pos/utils/calculations';
import type { CartItem } from '@/types';

interface Props {
  items:               CartItem[];
  invoiceDiscountPct:  number;
  onQty:               (id: string, qty: number) => void;
  onDiscount:          (id: string, pct: number) => void;
  onRemove:            (id: string) => void;
  onClear:             () => void;
  onInvoiceDiscountChange: (pct: number) => void;
  onOpenProducts:      () => void;
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

export default function POSProCart({
  items, invoiceDiscountPct, onQty, onDiscount, onRemove, onClear,
  onInvoiceDiscountChange, onOpenProducts,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 66,
    overscan: 8,
  });

  if (items.length === 0) {
    return (
      <div className="pp-cart pp-cart--empty">
        <div className="pp-cart-empty-inner">
          <i className="ti ti-basket-off" />
          <h3>السلة فارغة</h3>
          <p>اضغط زر «المنتجات» لإضافة أصناف، أو امسح باركود مباشرة</p>
          <button type="button" className="btn btn-p" onClick={onOpenProducts}>
            <i className="ti ti-plus" />
            إضافة منتجات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-cart">
      <div className="pp-cart-hd">
        <span>
          <i className="ti ti-shopping-cart" />
          السلة <strong>{items.length}</strong> صنف
        </span>
        <div className="pp-cart-hd-actions">
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

      <div ref={scrollRef} className="pp-cart-scroll">
        <div
          className="pp-cart-vspace"
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map(vRow => {
            const item = items[vRow.index];
            return (
              <div
                key={item.id}
                ref={virtualizer.measureElement}
                data-index={vRow.index}
                className="pp-row"
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
                    <div className="pp-row-price">{formatDZD(item.unit_price_ht)}</div>
                  </div>
                </div>
                <QtyInput item={item} onQty={onQty} />
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
    </div>
  );
}
