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
import { createPortal } from 'react-dom';
import type { CartItem, ProductPackaging } from '@/types';
import { formatDZD, ttcToHt } from '../utils/calculations';

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
  onUpdatePackaging:(packaging: ProductPackaging | null, basePriceHt: number) => void;
  availablePackagings: ProductPackaging[];
  /** 'compact' يعرض السلة بصف واحد مصغّر لكل صنف (المزيد من المنتجات
   *  مرئية دفعة واحدة)، 'comfortable' هو التصميم الافتراضي الحالي. */
  density?:         'comfortable' | 'compact';
  /** يُستدعى بعنصر DOM الجذري للصف — يُستخدم من ProfessionalCart
   *  لبناء خريطة id→عنصر تُمكّن التمرير/التركيز على صف معيّن برمجياً. */
  registerNode?:    (id: string, el: HTMLDivElement | null) => void;
}

type DiscMode  = 'pct' | 'amount';
type PopupType = 'disc' | 'price' | 'pkg' | null;

export default function CartRow({
  item, idx, isSelected, onSelect,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
  onUpdatePackaging, availablePackagings = [],
  density = 'comfortable', registerNode,
}: CartRowProps) {
  const compact = density === 'compact';
  const [popup,      setPopup]      = useState<PopupType>(null);
  const [editQty,    setEditQty]    = useState(false);
  const [discMode,   setDiscMode]   = useState<DiscMode>('amount');
  const [discVal,    setDiscVal]    = useState('');
  const [priceVal,   setPriceVal]   = useState('');
  const [qtyVal,     setQtyVal]     = useState('');
  const [swipeX,     setSwipeX]     = useState(0);       // swipe-to-delete offset
  const swipeStart   = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwiping    = useRef(false);

  const discInpRef  = useRef<HTMLInputElement>(null);
  const priceInpRef = useRef<HTMLInputElement>(null);
  const qtyInpRef   = useRef<HTMLInputElement>(null);
  const rowRef      = useRef<HTMLDivElement | null>(null);
  const popupNodeRef = useRef<HTMLDivElement>(null);
  const popupAnchorRef = useRef<HTMLDivElement>(null);
  const pkgBtnRef = useRef<HTMLButtonElement>(null);
  const [popupPos, setPopupPos] = useState<{top: number; left: number; right: number}>({ top: 0, left: 0, right: 0 });

  // ── Swipe-to-delete gesture (touch only) ──────────────────────────────────
  const SWIPE_THRESHOLD = 80;
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (popup) return; // don't interfere with open popup
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    isSwiping.current = false;
  }, [popup]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const t = e.touches[0];
    const dx = swipeStart.current.x - t.clientX; // positive = swipe left (RTL)
    const dy = Math.abs(t.clientY - swipeStart.current.y);
    // Only horizontal swipe (ignore vertical scrolling)
    if (dy > 20 && !isSwiping.current) { swipeStart.current = null; return; }
    if (dx > 10) isSwiping.current = true;
    if (isSwiping.current) {
      e.preventDefault();
      setSwipeX(Math.max(0, Math.min(dx, SWIPE_THRESHOLD + 40)));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!swipeStart.current) { setSwipeX(0); return; }
    const elapsed = Date.now() - swipeStart.current.time;
    // Fast swipe or past threshold → snap open
    if ((isSwiping.current && swipeX >= SWIPE_THRESHOLD) || (isSwiping.current && elapsed < 200 && swipeX > 30)) {
      setSwipeX(SWIPE_THRESHOLD);
    } else {
      setSwipeX(0);
    }
    swipeStart.current = null;
    isSwiping.current = false;
  }, [swipeX]);

  const measurePopupAnchor = useCallback(() => {
    if (popupAnchorRef.current) {
      const r = popupAnchorRef.current.getBoundingClientRect();
      const popupW = 220;
      let left = r.left;
      if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
      if (left < 8) left = 8;
      setPopupPos({ top: r.bottom + 12, left, right: window.innerWidth - left - popupW });
    }
  }, []);

  // focus + select input عند فتح الـ popup أو تبديل الوضع
  useEffect(() => {
    if (popup === 'disc') {
      measurePopupAnchor();
      discInpRef.current?.focus();
      discInpRef.current?.select();
    }
    if (popup === 'price') {
      measurePopupAnchor();
      priceInpRef.current?.focus();
      priceInpRef.current?.select();
    }
    if (popup === 'pkg' && pkgBtnRef.current) {
      const r = pkgBtnRef.current.getBoundingClientRect();
      const popupW = 220;
      let left = r.left;
      if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
      if (left < 8) left = 8;
      setPopupPos({ top: r.bottom + 12, left, right: window.innerWidth - left - popupW });
    }
  }, [popup, discMode, measurePopupAnchor]);

  useEffect(() => {
    if (editQty && qtyInpRef.current) { qtyInpRef.current.focus(); qtyInpRef.current.select(); }
  }, [editQty]);

  // إغلاق الـ popup عند الضغط خارج الصف أو عند التمرير
  useEffect(() => {
    if (!popup) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rowRef.current?.contains(target) || popupNodeRef.current?.contains(target)) return;
      setPopup(null);
    };
    const scrollHandler = () => setPopup(null);
    document.addEventListener('mousedown', h);
    document.addEventListener('scroll', scrollHandler, true);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('scroll', scrollHandler, true);
    };
  }, [popup]);

  // ── فتح popup الخصم ──────────────────────────────────────────────────────
  const openDisc = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVal = discMode === 'pct'
      ? String(Number(item.discount_percentage || 0).toFixed(2))
      : String(Number(item.discount_amount || 0).toFixed(2));
    setDiscVal(currentVal);
    setPopup(p => p === 'disc' ? null : 'disc');
  }, [discMode, item.discount_percentage, item.discount_amount]);

  const tvaRate = item.tva_rate;

  /** Format the unit price for display in the packaging popup */
  function basePriceLabel(pkg: ProductPackaging, ci: CartItem): string {
    const baseHt = ci.base_price_ht ?? (ci.unit_price_ht / (ci.pack_qty || 1));
    const pkgQty = Math.max(1, Number(pkg.quantity) || 1);
    const priceTtc = baseHt * pkgQty * (1 + ci.tva_rate / 100);
    return priceTtc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' دج';
  }

  // ── فتح popup السعر ───────────────────────────────────────────────────────
  const openPrice = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const ttc = item.unit_price_ht * (1 + tvaRate / 100);
    setPriceVal(ttc.toFixed(2));
    setPopup(p => p === 'price' ? null : 'price');
  }, [item.unit_price_ht, tvaRate]);

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
    if (!isNaN(n) && n > 0) onPrice(ttcToHt(n, tvaRate));
    setPopup(null);
  };

  const commitQty = () => {
    const n = parseFloat(qtyVal);
    if (!isNaN(n) && n > 0) onQty(n);
    setEditQty(false);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const isWeight  = item.is_sold_by_weight;
  const qtyStep   = isWeight ? 0.001 : 1;
  const maxQty    = item.max_stock ?? Infinity;
  const stockFull = item.manages_stock && item.quantity >= maxQty;
  const hasDisc   = item.discount_percentage > 0 || item.discount_amount > 0;
  const discLabel = item.discount_amount > 0
    ? `-${formatDZD(item.discount_amount)}`
    : item.discount_percentage > 0
      ? `-${item.discount_percentage % 1 === 0 ? item.discount_percentage : item.discount_percentage.toFixed(2)}%`
      : null;

  return (
    <div className={`cr-swipe-wrap ${swipeX > 0 ? 'cr-swipe-active' : ''}`}>
      {/* Delete reveal behind the row */}
      <div className="cr-swipe-del">
        <i className="ti ti-trash" />
      </div>
      <div
        ref={el => { rowRef.current = el; registerNode?.(item.id, el); }}
        tabIndex={-1}
        className={`cr ${isSelected ? 'sel' : ''} ${hasDisc ? 'has-disc' : ''} ${popup ? 'cr--popup-open' : ''} ${compact ? 'cr--compact' : ''}`}
        onClick={onSelect}
        style={{ transform: swipeX > 0 ? `translateX(-${swipeX}px)` : undefined, transition: swipeX === 0 ? 'transform .2s ease' : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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

          {/* ── Packaging badge (clickable when multiple options exist) ── */}
          {availablePackagings.length > 1 && (
            <button
              ref={pkgBtnRef}
              className={`cr-pkg-badge cr-pkg-badge--selectable ${popup === 'pkg' ? 'cr-pkg-badge--active' : ''}`}
              onClick={e => { e.stopPropagation(); setPopup(p => p === 'pkg' ? null : 'pkg'); }}
              title="تغيير الوحدة"
              type="button"
            >
              {item.packaging_label ?? item.unit_symbol}
              {item.pack_qty && item.pack_qty > 1 && <span className="cr-pkg-multi"> ×{item.pack_qty}</span>}
              <i className="ti ti-chevron-down cr-pkg-chevron" />
            </button>
          )}
          {availablePackagings.length <= 1 && item.packaging_label && (
            <span className="cr-pkg-badge">
              {item.packaging_label}
            </span>
          )}

          {/* ── Packaging popup ── */}
          {popup === 'pkg' && createPortal(
            <div
              ref={popupNodeRef}
              className="cr-popup cr-popup--pkg cr-popup--portal"
              onClick={e => e.stopPropagation()}
              style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 10000 }}
            >
              <div className="cr-popup-arrow" />
              <div className="cr-popup-label">اختر الوحدة</div>
              {availablePackagings.map(p => {
                const isActive = item.packaging_id === p.id;
                return (
                  <button
                    key={p.id}
                    className={`cr-pkg-option ${isActive ? 'on' : ''}`}
                    onClick={() => {
                      const baseHt = item.base_price_ht ?? (item.unit_price_ht / (item.pack_qty || 1));
                      onUpdatePackaging(p, baseHt);
                      setPopup(null);
                    }}
                    type="button"
                  >
                    <span className="cr-pkg-opt-label">{p.label}</span>
                    <span className="cr-pkg-opt-detail">
                      {p.quantity > 1 ? `${p.quantity} ×` : ''}{basePriceLabel(p, item)}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body
          )}

          {/* صف السعر + الخصم */}
        <div className="cr-price-row">

          {/* ── السعر قابل للتعديل ── */}
          <button
            className={`cr-price ${popup === 'price' ? 'cr-price--active' : ''}`}
            onClick={openPrice}
            title="انقر لتعديل السعر TTC"
            type="button"
          >
            <span className="cr-price-num">
              {(item.unit_price_ht * (1 + tvaRate / 100)).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })}
            </span>
            <span className="cr-price-unit">TTC</span>
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
          <div ref={popupAnchorRef} style={{ position: 'relative', width: 0, height: 0, flex: '0 0 0' }} />

          {/* TVA badge */}
          {tvaRate > 0 && (
            <span className="cr-tva">TVA {tvaRate}%</span>
          )}
        </div>

        {/* ── Popup الخصم ── */}
        {popup === 'disc' && createPortal(
          <div ref={popupNodeRef} className="cr-popup cr-popup--disc cr-popup--portal" onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 10000 }}>
            <div className="cr-popup-arrow" />

            {/* تبديل الوضع */}
            <div className="cr-popup-modes">
              <button
                className={`cr-popup-mode ${discMode === 'pct' ? 'on' : ''}`}
                onClick={() => { setDiscMode('pct'); setDiscVal(String(Number(item.discount_percentage || 0).toFixed(2))); }}
                type="button"
              >
                <i className="ti ti-percentage" /> نسبة %
              </button>
              <button
                className={`cr-popup-mode ${discMode === 'amount' ? 'on' : ''}`}
                onClick={() => { setDiscMode('amount'); setDiscVal(String(Number(item.discount_amount || 0).toFixed(2))); }}
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
                step={discMode === 'pct' ? 0.01 : 1}
                placeholder="0.00"
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
          </div>,
          document.body
        )}

        {/* ── Popup السعر ── */}
        {popup === 'price' && createPortal(
          <div ref={popupNodeRef} className="cr-popup cr-popup--price cr-popup--portal" onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 10000 }}>
            <div className="cr-popup-arrow" />
            <div className="cr-popup-label">سعر البيع TTC</div>
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
                HT: <strong>{ttcToHt(parseFloat(priceVal), tvaRate).toLocaleString('fr-DZ', { maximumFractionDigits: 2 })} دج</strong>
              </div>
            )}
            <div className="cr-popup-actions">
              <button className="cr-popup-cancel" onClick={() => setPopup(null)} type="button">إلغاء</button>
              <button className="cr-popup-ok" onClick={commitPrice} type="button">
                <i className="ti ti-check" /> تطبيق
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* ── تحكم الكمية ── */}
      <div className="cr-qty-ctrl" onClick={e => e.stopPropagation()}>
        <button
          className="cq-btn cq-btn--minus"
          onClick={() => {
            const next = Math.round((item.quantity - qtyStep) * 1000) / 1000;
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
            step={isWeight ? 0.001 : 1}
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
            {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(isWeight ? 3 : 2)}
          </span>
        )}

        <button
          className="cq-btn cq-btn--plus"
          onClick={() => { if (!stockFull) onQty(Math.round((item.quantity + qtyStep) * 1000) / 1000); }}
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
    </div>
  );
}
