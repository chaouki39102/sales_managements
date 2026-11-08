// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/CartLine.tsx
// CartLine — سطر سلة مع سحب لحذف (يتمسك بـ pointer capture)
// ════════════════════════════════════════════════════════════════════════════
import React, { useRef, useState } from 'react';
import type { CartItem } from '@/types';
import { money } from '../mobileFormat';

export default function CartLine({
  item,
  isJustAdded,
  stockBadge,
  onRemove,
  onQtyUp,
  onQtyDown,
  onDiscount,
  onDiscountAmount,
}: {
  item: CartItem;
  isJustAdded: boolean;
  stockBadge: 'low' | 'out' | null;
  onRemove: () => void;
  onQtyUp: () => void;
  onQtyDown: () => void;
  onDiscount: (id: string, pct: number) => void;
  onDiscountAmount: (id: string, amount: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const gesture = useRef<{ startX: number; active: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input')) return;
    gesture.current = { startX: e.clientX, active: false };
    rootRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!gesture.current) return;
    const d = e.clientX - gesture.current.startX;
    if (!gesture.current.active && Math.abs(d) < 6) return;
    gesture.current.active = true;
    setDx(Math.max(-96, Math.min(96, d)));
  };
  const end = () => {
    if (gesture.current?.active && dx <= -56) {
      onRemove();
    }
    gesture.current = null;
    setDx(0);
  };

  const [discOpen, setDiscOpen] = useState(false);
  const [discText, setDiscText] = useState('');

  const applyDisc = () => {
    const n = Number(discText);
    if (!Number.isFinite(n) || n <= 0) return;
    if (item.discount_amount > 0 && item.discount_mode === 'fixed_amount') onDiscountAmount(item.id, n);
    else onDiscount(item.id, Math.min(100, n));
    setDiscOpen(false);
    setDiscText('');
  };

  return (
    <div
      ref={rootRef}
      className={`ppm-line${isJustAdded ? ' ppm-just-added' : ''}`}
      style={{ transform: `translateX(${dx}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="ppm-swipe-bg" onClick={onRemove} role="button" aria-label="حذف">
        <i className="ti ti-trash" />
      </div>
      <div className="ppm-line-body">
        {item.image_url ? (
          <div className="ppm-line-photo"><img src={item.image_url} alt="" loading="lazy" /></div>
        ) : (
          <div className={`ppm-sw ppm-sw-gold`}><span>{item.product_name[0] ?? '؟'}</span></div>
        )}
        <div className="ppm-line-info">
          <span className="ppm-line-name">{item.product_name}</span>
          <span className="ppm-line-sub">
            {item.ref}{item.unit_symbol ? ` — ${item.unit_symbol}` : ''}
            {item.pack_qty && item.pack_qty > 1 ? ` ×${item.pack_qty}` : ''}
            {stockBadge && <span className={`ppm-stock-badge ${stockBadge}`}>{stockBadge === 'out' ? 'نفد' : 'منخفض'}</span>}
          </span>
          <span className="ppm-line-price ppm-mono">{money(item.unit_price_ht)} دج</span>
        </div>
        <div className="ppm-line-ctrls">
          <div className="ppm-qty">
            <button onClick={onQtyDown}><i className="ti ti-minus" /></button>
            <span className="ppm-val">{item.quantity}</span>
            <button onClick={onQtyUp}><i className="ti ti-plus" /></button>
          </div>
          <button className="ppm-line-disc" onClick={() => setDiscOpen((v) => !v)}>
            <i className="ti ti-percentage" />
            {(item.discount_percentage > 0 || item.discount_amount > 0) && <span className="ppm-dot" />}
          </button>
        </div>
        <div className="ppm-line-total ppm-mono">{money(item.total_ttc)}</div>
      </div>

      {discOpen && (
        <div className="ppm-line-discpop">
          <div className="ppm-line-discpop-row">
            <input
              inputMode="decimal"
              placeholder={item.discount_mode === 'fixed_amount' ? 'مبلغ الخصم' : 'نسبة %'}
              value={discText}
              onChange={(e) => setDiscText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyDisc(); }}
            />
            <button onClick={applyDisc}>تطبيق</button>
          </div>
          {(item.discount_percentage > 0 || item.discount_amount > 0) && (
            <button
              className="danger"
              onClick={() => {
                if (item.discount_mode === 'fixed_amount') onDiscountAmount(item.id, 0);
                else onDiscount(item.id, 0);
                setDiscOpen(false);
                setDiscText('');
              }}
            >
              إزالة الخصم
            </button>
          )}
        </div>
      )}
    </div>
  );
}
