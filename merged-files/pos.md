# pos Components

## FILE: ./resources/js/pos/components/CartRow.tsx

```
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
import type { CartItem } from '@/types';
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
  /** 'compact' يعرض السلة بصف واحد مصغّر لكل صنف (المزيد من المنتجات
   *  مرئية دفعة واحدة)، 'comfortable' هو التصميم الافتراضي الحالي. */
  density?:         'comfortable' | 'compact';
  /** يُستدعى بعنصر DOM الجذري للصف — يُستخدم من ProfessionalCart
   *  لبناء خريطة id→عنصر تُمكّن التمرير/التركيز على صف معيّن برمجياً. */
  registerNode?:    (id: string, el: HTMLDivElement | null) => void;
}

type DiscMode  = 'pct' | 'amount';
type PopupType = 'disc' | 'price' | null;

export default function CartRow({
  item, idx, isSelected, onSelect,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
  density = 'comfortable', registerNode,
}: CartRowProps) {
  const compact = density === 'compact';
  const [popup,      setPopup]      = useState<PopupType>(null);
  const [editQty,    setEditQty]    = useState(false);
  const [discMode,   setDiscMode]   = useState<DiscMode>('pct');
  const [discVal,    setDiscVal]    = useState('');
  const [priceVal,   setPriceVal]   = useState('');
  const [qtyVal,     setQtyVal]     = useState('');
  const [swipeX,     setSwipeX]     = useState(0);       // swipe-to-delete offset
  const swipeStart   = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwiping    = useRef(false);

  const discInpRef  = useRef<HTMLInputElement>(null);
  const priceInpRef = useRef<HTMLInputElement>(null);
  const qtyInpRef   = useRef<HTMLInputElement>(null);
  const rowRef      = useRef<HTMLDivElement>(null);
  const popupNodeRef = useRef<HTMLDivElement>(null);
  const popupAnchorRef = useRef<HTMLDivElement>(null);
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
      setPopupPos({ top: r.bottom + 4, left: r.left, right: window.innerWidth - r.right });
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
      ? String(item.discount_percentage || 0)
      : String(item.discount_amount || 0);
    setDiscVal(currentVal);
    setPopup(p => p === 'disc' ? null : 'disc');
  }, [discMode, item.discount_percentage, item.discount_amount]);

  const tvaRate = item.tva_rate;

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
  const maxQty    = item.max_stock !== null ? item.max_stock : Infinity;
  const stockFull = item.manages_stock && item.quantity >= maxQty;
  const hasDisc   = item.discount_percentage > 0 || item.discount_amount > 0;
  const discLabel = item.discount_percentage > 0
    ? `-${item.discount_percentage % 1 === 0 ? item.discount_percentage : item.discount_percentage.toFixed(1)}%`
    : item.discount_amount > 0
      ? `-${formatDZD(item.discount_amount)}`
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

          {/* TVA badge */}
          {tvaRate > 0 && (
            <span className="cr-tva">TVA {tvaRate}%</span>
          )}
        </div>

        {/* ── Popup الخصم ── */}
        <div ref={popupAnchorRef} style={{ position: 'absolute', width: 0, height: 0 }} />
        {popup === 'disc' && createPortal(
          <div ref={popupNodeRef} className="cr-popup cr-popup--disc cr-popup--portal" onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: popupPos.top, right: popupPos.right, zIndex: 10000 }}>
            <div className="cr-popup-arrow" />

            {/* تبديل الوضع */}
            <div className="cr-popup-modes">
              <button
                className={`cr-popup-mode ${discMode === 'pct' ? 'on' : ''}`}
                onClick={() => { setDiscMode('pct'); setDiscVal(String(item.discount_percentage || 0)); }}
                type="button"
              >
                <i className="ti ti-percentage" /> نسبة %
              </button>
              <button
                className={`cr-popup-mode ${discMode === 'amount' ? 'on' : ''}`}
                onClick={() => { setDiscMode('amount'); setDiscVal(String(item.discount_amount || 0)); }}
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
                step={discMode === 'pct' ? 0.5 : 1}
                placeholder={discMode === 'pct' ? '0' : '0.00'}
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

            {/* أزرار سريعة (نسب شائعة) */}
            {discMode === 'pct' && (
              <div className="cr-popup-quick">
                {[5, 10, 15, 20, 25, 30].map(p => (
                  <button
                    key={p}
                    className={`cr-popup-qbtn ${parseFloat(discVal) === p ? 'on' : ''}`}
                    onClick={() => { setDiscVal(String(p)); }}
                    type="button"
                  >
                    {p}%
                  </button>
                ))}
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
            style={{ position: 'fixed', top: popupPos.top, right: popupPos.right, zIndex: 10000 }}>
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
            const next = item.quantity - 1;
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
            {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}
          </span>
        )}

        <button
          className="cq-btn cq-btn--plus"
          onClick={() => { if (!stockFull) onQty(item.quantity + 1); }}
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

```

## FILE: ./resources/js/pos/components/CategoryTabs.tsx

```
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { familyIcon } from '../utils/posHelpers';

interface CategoryTabsProps {
  families: { id: number; name: string }[];
  counts?: Map<number, number>;
  totalCount?: number;
  selected: number | null;
  onSelect: (id: number | null) => void;
}

const SCROLL_AMOUNT = 200;

export default function CategoryTabs({
  families, counts, totalCount = 0, selected, onSelect,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    if (maxScroll === 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    if (scrollLeft < 0) {
      setCanScrollLeft(scrollLeft < -1);
      setCanScrollRight(scrollLeft > -maxScroll + 1);
    } else {
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(scrollLeft < maxScroll - 1);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, families.length]);

  useEffect(() => {
    if (selected === null || !scrollRef.current) return;
    const btn = scrollRef.current.querySelector<HTMLButtonElement>(`[data-cat-id="${selected}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [selected]);

  const scrollByAmount = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? SCROLL_AMOUNT : -SCROLL_AMOUNT, behavior: 'smooth' });
  }, []);

  if (!families.length) return null;

  return (
    <div className="pos-cats-wrapper">
      <button
        className={`pos-cats-btn pos-cats-btn-left ${canScrollLeft ? 'show' : ''}`}
        onClick={() => scrollByAmount('left')}
        aria-label="التصنيفات السابقة"
      >
        <i className="ti ti-chevron-right" />
      </button>
      <div className="pos-cats" ref={scrollRef}>
        <button
          className={`pos-cat ${selected === null ? 'on' : ''}`}
          onClick={() => onSelect(null)}
          title="الكل — Alt+0"
        >
          <i className="ti ti-layout-2" />
          <span>الكل</span>
          <span className="cat-count">{totalCount}</span>
        </button>
        {families.map((f, idx) => (
          <button
            key={f.id}
            data-cat-id={f.id}
            className={`pos-cat ${selected === f.id ? 'on' : ''}`}
            onClick={() => onSelect(f.id)}
            title={`${f.name} — Alt+${idx + 1}`}
          >
            <i className={`ti ${familyIcon(f.name)}`} />
            <span>{f.name}</span>
            {counts?.has(f.id) && <span className="cat-count">{counts.get(f.id)}</span>}
            {idx < 9 && <kbd className="cat-kb">Alt+{idx + 1}</kbd>}
          </button>
        ))}
      </div>
      <button
        className={`pos-cats-btn pos-cats-btn-right ${canScrollRight ? 'show' : ''}`}
        onClick={() => scrollByAmount('right')}
        aria-label="التصنيفات التالية"
      >
        <i className="ti ti-chevron-left" />
      </button>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/CloseSessionModal.tsx

```
// resources/js/pos/components/CloseSessionModal.tsx — v2 احترافي
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';

interface Props {
  session:   PosSession;
  isLoading: boolean;
  error?:    string | null;
  onClose:   () => void;
  onConfirm: (data: { closing_cash_counted: number; closing_note?: string }) => Promise<void>;
}

type Step = 'recap' | 'cash' | 'confirm';

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: 'recap',   label: 'ملخص الجلسة',  icon: 'ti-chart-bar'  },
  { key: 'cash',    label: 'جرد الصندوق',  icon: 'ti-wallet'     },
  { key: 'confirm', label: 'تأكيد الإغلاق', icon: 'ti-door-exit'  },
];

export default function CloseSessionModal({
  session, isLoading, error, onClose, onConfirm,
}: Props) {
  const [step,    setStep]    = useState<Step>('recap');
  const [counted, setCounted] = useState('');
  const [note,    setNote]    = useState('');
  const cashRef               = useRef<HTMLInputElement>(null);

  const countedNum = parseFloat(counted) || 0;
  const expected   = (session.opening_cash ?? 0) + (session.cash_collected ?? 0);
  const difference = countedNum - expected;
  const hasCounted = counted !== '';

  const diffState: 'ok' | 'short' | 'over' =
    !hasCounted || Math.abs(difference) < 0.01 ? 'ok'
    : difference < 0 ? 'short' : 'over';

  const diffColors = {
    ok:    { color: 'var(--green)',  bg: 'var(--greenb)',  border: 'var(--greenbo)', label: 'الصندوق متطابق ✓' },
    short: { color: 'var(--red)',    bg: 'var(--redb)',    border: 'var(--redbo)',   label: 'الصندوق ناقص ⚠️' },
    over:  { color: 'var(--gold)',   bg: 'var(--goldb)',   border: 'var(--goldbo)',  label: 'الصندوق زائد ⚠️'  },
  }[diffState];

  const currentIdx = STEPS.findIndex(s => s.key === step);
  const isLast     = currentIdx === STEPS.length - 1;

  useEffect(() => {
    if (step === 'cash') setTimeout(() => cashRef.current?.focus(), 100);
  }, [step]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isLast && !isLoading) handleConfirm();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, isLast, isLoading, countedNum, note]);

  const goNext = () => { if (!isLast) setStep(STEPS[currentIdx + 1].key); };
  const goBack = () => { if (currentIdx > 0) setStep(STEPS[currentIdx - 1].key); };

  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm({ closing_cash_counted: countedNum, closing_note: note.trim() || undefined });
  };

  // numpad cash
  const np = (key: string) => {
    setCounted(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '000') return prev + '000';
      return prev + key;
    });
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const paymentRows = useMemo(() =>
    (session.payments ?? []).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount),
    [session.payments],
  );
  const topProducts = useMemo(() =>
    (session.top_products ?? []).sort((a, b) => b.total_ttc - a.total_ttc).slice(0, 8),
    [session.top_products],
  );
  const totalCollected = (session.cash_collected ?? 0)
    + (session.cib_collected ?? 0)
    + (session.ccp_collected ?? 0)
    + (session.bank_collected ?? 0);
  const maxPayAmt = Math.max(...paymentRows.map(p => p.amount), 1);

  const kpis = [
    { label: 'الفواتير',         val: String(session.invoices_count),          ic: 'ti-receipt',        c: 'var(--em)',     bg: 'var(--emb)'   },
    { label: 'المبيعات الصافية', val: formatDZD(session.net_sales),            ic: 'ti-cash',           c: 'var(--gold)',   bg: 'var(--goldb)' },
    { label: 'متوسط الفاتورة',  val: formatDZD(session.avg_invoice ?? 0),      ic: 'ti-chart-bar',      c: 'var(--blue)',   bg: 'var(--blueb)' },
    { label: 'أعلى فاتورة',     val: formatDZD(session.highest_invoice ?? 0),  ic: 'ti-trending-up',    c: 'var(--purple)', bg: 'var(--purb)'  },
    { label: 'الخصومات',        val: formatDZD(session.total_discount ?? 0),   ic: 'ti-discount',       c: 'var(--orange)', bg: 'var(--orb)'   },
    { label: 'TVA المحصَّل',     val: formatDZD(session.total_tva ?? 0),        ic: 'ti-percentage',     c: 'var(--teal)',   bg: 'var(--tealb)' },
    { label: 'مدة الجلسة',      val: session.duration ?? '—',                  ic: 'ti-clock',          c: 'var(--t2)',     bg: 'var(--bg4)'   },
    { label: 'المرتجعات',       val: `${session.returns_count ?? 0} (${formatDZD(session.returns_total ?? 0)})`, ic: 'ti-receipt-refund', c: 'var(--red)', bg: 'var(--redb)' },
    { label: 'رأس المال الأولي', val: formatDZD(session.opening_cash ?? 0),     ic: 'ti-wallet',         c: 'var(--em)',     bg: 'var(--emb)'   },
  ];

  return (
    <div className="ov on" onClick={e => e.stopPropagation()} style={{ zIndex: 9998 }}>
      <div className="csm-wrap">

        {/* ════ Header ════ */}
        <div className="csm-header">
          <div className="csm-header-left">
            <div className="csm-header-icon">
              <i className="ti ti-door-exit" />
            </div>
            <div>
              <div className="csm-header-title">إغلاق الجلسة</div>
              <div className="csm-header-meta">
                <span><i className="ti ti-user" />{session.user?.name}</span>
                <span>·</span>
                <span><i className="ti ti-building-warehouse" />{session.warehouse?.name}</span>
                <span>·</span>
                <span><i className="ti ti-clock" />{session.duration}</span>
              </div>
            </div>
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* ════ Step Tabs ════ */}
        <div className="csm-steps">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`csm-step ${step === s.key ? 'active' : ''} ${i < currentIdx ? 'done' : ''}`}
              onClick={() => setStep(s.key)}
            >
              <div className="csm-step-num">
                {i < currentIdx ? <i className="ti ti-check" /> : i + 1}
              </div>
              <i className={`ti ${s.icon} csm-step-ic`} />
              <span>{s.label}</span>
            </button>
          ))}
          {/* progress bar */}
          <div className="csm-steps-progress">
            <div
              className="csm-steps-progress-fill"
              style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* ════ Body ════ */}
        <div className="csm-body">

          {/* ══ ملخص الجلسة ══ */}
          {step === 'recap' && (
            <div className="csm-recap">

              {/* شريط الإجمالي البارز */}
              <div className="csm-total-banner">
                <div className="csm-tb-left">
                  <div className="csm-tb-label">إجمالي المبيعات الصافية</div>
                  <div className="csm-tb-amount" style={{ direction: 'ltr' }}>
                    {session.net_sales.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    <span className="csm-tb-dzd"> دج</span>
                  </div>
                </div>
                <div className="csm-tb-right">
                  <div className="csm-tb-stat">
                    <span>{session.invoices_count}</span>
                    <small>فاتورة</small>
                  </div>
                  <div className="csm-tb-stat">
                    <span>{session.duration}</span>
                    <small>مدة</small>
                  </div>
                </div>
              </div>

              {/* KPIs 3x3 */}
              <div className="csm-kpi-grid">
                {kpis.map(k => (
                  <div
                    key={k.label}
                    className="csm-kpi"
                    style={{ '--kc': k.c, '--kb': k.bg } as any}
                  >
                    <div className="csm-kpi-ic">
                      <i className={`ti ${k.ic}`} />
                    </div>
                    <div className="csm-kpi-label">{k.label}</div>
                    <div className="csm-kpi-val" style={{ direction: 'ltr' }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* وسائل الدفع */}
              {paymentRows.length > 0 && (
                <div className="csm-section">
                  <div className="csm-section-title">
                    <i className="ti ti-credit-card" /> توزيع وسائل الدفع
                    <span className="csm-section-total">{formatDZD(totalCollected)}</span>
                  </div>
                  <div className="csm-pay-bars">
                    {paymentRows.map(p => {
                      const pct = session.net_sales > 0
                        ? (p.amount / session.net_sales) * 100 : 0;
                      const widthPct = (p.amount / maxPayAmt) * 100;
                      return (
                        <div key={p.payment_mode_id} className="csm-pay-row">
                          <div className="csm-pay-info">
                            <span className="csm-pay-name">
                              {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                            </span>
                            <span className="csm-pay-count">{p.count} عملية</span>
                          </div>
                          <div className="csm-pay-bar-wrap">
                            <div className="csm-pay-bar">
                              <div
                                className="csm-pay-bar-fill"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                          <div className="csm-pay-amount">
                            <span style={{ direction: 'ltr' }}>{formatDZD(p.amount)}</span>
                            <span className="csm-pay-pct">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* أكثر المنتجات */}
              {topProducts.length > 0 && (
                <div className="csm-section">
                  <div className="csm-section-title">
                    <i className="ti ti-package" /> أكثر المنتجات مبيعاً
                  </div>
                  <div className="csm-products">
                    {topProducts.map((p, i) => (
                      <div key={p.product_id} className="csm-product-row">
                        <div className={`csm-prod-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
                        <div className="csm-prod-name">{p.product_name}</div>
                        <div className="csm-prod-qty">×{p.quantity_sold}</div>
                        <div className="csm-prod-amount" style={{ direction: 'ltr' }}>
                          {formatDZD(p.total_ttc)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ جرد الصندوق ══ */}
          {step === 'cash' && (
            <div className="csm-cash">

              {/* المبلغ المتوقع */}
              <div className="csm-expected-box">
                <div className="csm-exp-label">المبلغ المتوقع في الدرج</div>
                <div className="csm-exp-amount" style={{ direction: 'ltr' }}>
                  {formatDZD(expected)}
                </div>
                <div className="csm-exp-breakdown">
                  <span>رأس مال أولي: <strong>{formatDZD(session.opening_cash ?? 0)}</strong></span>
                  <span>+</span>
                  <span>نقداً محصَّل: <strong>{formatDZD(session.cash_collected ?? 0)}</strong></span>
                </div>
              </div>

              {/* عرض المبلغ المُدخَل */}
              <div className="csm-counted-display">
                <div className="csm-counted-label">المبلغ الفعلي في الدرج</div>
                <div className="csm-counted-amount" style={{ direction: 'ltr' }}>
                  {counted || <span className="csm-counted-placeholder">0</span>}
                  <span className="csm-counted-dzd">دج</span>
                </div>

                {/* نتيجة فورية */}
                {hasCounted && (
                  <div
                    className="csm-diff-badge"
                    style={{
                      background: diffColors.bg,
                      borderColor: diffColors.border,
                      color:       diffColors.color,
                    }}
                  >
                    <span style={{ direction: 'ltr', fontWeight: 900 }}>
                      {difference >= 0 ? '+' : ''}{formatDZD(difference)}
                    </span>
                    <span>{diffColors.label}</span>
                  </div>
                )}
              </div>

              {/* Numpad */}
              <div className="csm-numpad">
                {['7','8','9','4','5','6','1','2','3','000','0','del'].map(k => (
                  <button
                    key={k}
                    type="button"
                    className={`csm-npk ${k === 'del' ? 'del' : ''}`}
                    onClick={() => np(k)}
                  >
                    {k === 'del' ? <i className="ti ti-backspace" /> : k}
                  </button>
                ))}
              </div>

              {/* مبالغ سريعة */}
              <div className="csm-quick-amounts">
                <button
                  type="button"
                  className={`csm-qa-btn ${countedNum === expected ? 'on' : ''}`}
                  onClick={() => setCounted(expected.toFixed(0))}
                >
                  مطابق ({formatDZD(expected)})
                </button>
              </div>

              {/* ملاحظة */}
              <div className="osm-field" style={{ marginTop: 10 }}>
                <label className="osm-label">
                  <i className="ti ti-notes" />
                  ملاحظة على الجرد (اختياري)
                </label>
                <textarea
                  className="osm-inp csm-textarea"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="أي ملاحظة على الصندوق..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* ══ تأكيد الإغلاق ══ */}
          {step === 'confirm' && (
            <div className="csm-confirm">

              {/* ملخص نهائي واضح */}
              <div className="csm-confirm-header">
                <i className="ti ti-alert-triangle" style={{ color: 'var(--red)', fontSize: 32 }} />
                <div className="csm-confirm-title">مراجعة نهائية قبل الإغلاق</div>
                <div className="csm-confirm-hint">
                  بعد الإغلاق لا يمكن البيع حتى تفتح جلسة جديدة
                </div>
              </div>

              {/* جدول المراجعة */}
              <div className="csm-review-table">
                {[
                  { label: 'المبيعات الصافية',    val: formatDZD(session.net_sales),   type: 'highlight' },
                  { label: 'عدد الفواتير',         val: String(session.invoices_count), type: 'normal'    },
                  { label: 'نقداً محصَّل',          val: formatDZD(session.cash_collected ?? 0), type: 'normal' },
                  { label: 'بطاقات وتحويل',        val: formatDZD((session.cib_collected ?? 0) + (session.ccp_collected ?? 0) + (session.bank_collected ?? 0)), type: 'normal' },
                  { label: 'آجل / دين',            val: formatDZD(session.credit_total ?? 0), type: 'normal' },
                  { label: 'TVA',                  val: formatDZD(session.total_tva ?? 0), type: 'normal' },
                  null, // separator
                  { label: 'المبلغ المتوقع بالدرج', val: formatDZD(expected),           type: 'normal'    },
                  { label: 'المبلغ الفعلي بالدرج',  val: counted ? formatDZD(countedNum) : 'لم يُحدَّد', type: 'normal' },
                  {
                    label: 'الفرق',
                    val: counted ? `${difference >= 0 ? '+' : ''}${formatDZD(difference)}` : '—',
                    type: diffState === 'ok' ? 'success' : 'danger',
                  },
                ].map((row, i) =>
                  row === null ? (
                    <div key={`sep-${i}`} className="csm-review-sep" />
                  ) : (
                    <div
                      key={i}
                      className={`csm-review-row csm-review-row--${row.type}`}
                    >
                      <span className="csm-review-label">{row.label}</span>
                      <span className="csm-review-val" style={{ direction: 'ltr' }}>{row.val}</span>
                    </div>
                  )
                )}
              </div>

              {/* ملاحظة */}
              {note && (
                <div className="csm-note-preview">
                  <i className="ti ti-notes" />
                  {note}
                </div>
              )}

              {error && (
                <div className="csm-error-box">
                  <i className="ti ti-alert-circle" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════ Footer ════ */}
        <div className="csm-footer">
          <button type="button" className="csm-btn-cancel" onClick={onClose}>
            <i className="ti ti-x" /> إلغاء
          </button>
          <div style={{ flex: 1 }} />
          {currentIdx > 0 && (
            <button type="button" className="csm-btn-back" onClick={goBack}>
              <i className="ti ti-arrow-right" /> رجوع
            </button>
          )}
          {!isLast ? (
            <button type="button" className="csm-btn-next" onClick={goNext}>
              التالي <i className="ti ti-arrow-left" />
            </button>
          ) : (
            <button
              type="button"
              className="csm-btn-close-session"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <><i className="ti ti-loader-2 spin" /> جاري الإغلاق...</>
              ) : (
                <><i className="ti ti-door-exit" /> تأكيد الإغلاق</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/CustomerSearchModal.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/CustomerSearchModal.tsx
//
// ✅ ميزات:
//   1. بحث فوري بالاسم / الهاتف / رقم التعريف الجبائي
//      — debounced 250ms — يبدأ من حرفين
//   2. إنشاء زبون جديد من POS بدون مغادرة الشاشة
//      الحقول: الاسم + الهاتف + النوع (زبون/مورد) فقط
//      — الباقي اختياري ويُكمَل لاحقاً من صفحة الزبائن
//   3. عرض آخر X زبائن للاختيار السريع
//   4. يُغلَق بـ Escape
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug }   from '@/lib/store/appStore';
import { formatCurrency }  from '@/lib/utils';
import type { Party }      from '@/types';
import type { PaginatedResponse, PartyBalance } from '@/lib/api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  currentClient: Party | null;
  onSelect:      (client: Party | null) => void;
  onClose:       () => void;
}

interface NewClientForm {
  name:         string;
  phone:        string;
  email:        string;
  trade_name:   string;
  nif:          string;
  is_client:    boolean;
}

const EMPTY_FORM: NewClientForm = {
  name:       '',
  phone:      '',
  email:      '',
  trade_name: '',
  nif:        '',
  is_client:  true,
};

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── BalanceLabel ─────────────────────────────────────────────────────────────

function BalanceLabel({ balance }: { balance: PartyBalance | undefined }) {
  if (!balance || balance.current_balance === 0) return null;
  return (
    <div style={{
      fontSize: 11, marginTop: 2, direction: 'ltr', textAlign: 'right',
      color: balance.current_balance >= 0 ? '#ef4444' : '#22c55e',
      fontWeight: 600,
    }}>
      {formatCurrency(balance.current_balance)}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerSearchModal({
  currentClient, onSelect, onClose,
}: Props) {
  const slug          = useActiveSlug();
  const qc            = useQueryClient();
  const searchRef     = useRef<HTMLInputElement>(null);

  const [query,      setQuery]      = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState<NewClientForm>(EMPTY_FORM);
  const [formError,  setFormError]  = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query.trim(), 250);
  const isSearching    = debouncedQuery.length >= 2;

  // Focus البحث عند الفتح أو عند الرجوع من وضع الإنشاء
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    if (!showCreate) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showCreate]);

  // ── بحث فوري ──────────────────────────────────────────────────────────────
  const { data: searchResults, isLoading: searching } = useQuery<Party[]>({
    queryKey: [slug, 'customers', 'pos-search', debouncedQuery],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/customers', {
        search:   debouncedQuery,
        per_page: 15,
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && isSearching,
    staleTime: 30_000,
  });

  // ── آخر زبائن (بدون بحث) ──────────────────────────────────────────────────
  const { data: recentClients } = useQuery<Party[]>({
    queryKey: [slug, 'customers', 'pos-recent'],
    queryFn:  () =>
      apiGet<PaginatedResponse<Party>>('/customers', {
        per_page: 500,
        sort_by:  'name',
      }).then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:   !!slug && !isSearching,
    staleTime: 5 * 60_000,
  });

  // ── أرصدة الزبائن ─────────────────────────────────────────────────────────
  const { data: balances } = useQuery<PartyBalance[]>({
    queryKey: [slug, 'party-balance'],
    queryFn:  () =>
      apiGet<PartyBalance[]>('/party-balances').then(r => {
        const data = (r as any)?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    enabled:           !!slug,
    staleTime:         60_000,
    refetchOnMount:    'always',
  });

  const balanceMap = useMemo(() => {
    if (!balances) return new Map<number, PartyBalance>();
    const m = new Map<number, PartyBalance>();
    for (const b of balances) m.set(b.party_id, b);
    return m;
  }, [balances]);

  const displayList: Party[] = isSearching
    ? (searchResults ?? [])
    : (recentClients ?? []);

  // Escape يُغلق + Arrow navigation + Enter to select
  useEffect(() => {
    if (showCreate) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const total = 1 + displayList.length;
      if (total <= 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx(prev => (prev + 1) % total);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx(prev => prev <= 0 ? total - 1 : prev - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIdx === 0) onSelect(null);
        else if (highlightedIdx > 0 && highlightedIdx <= displayList.length) onSelect(displayList[highlightedIdx - 1]);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, showCreate, displayList, highlightedIdx, onSelect]);

  // Reset highlight on query change
  useEffect(() => { setHighlightedIdx(-1); }, [debouncedQuery]);

  // ── إنشاء زبون جديد ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: Partial<Party>) =>
      apiPost<Party>('/parties', data),
    onSuccess: (newParty) => {
      // invalidate قائمة الزبائن
      if (slug) qc.invalidateQueries({ queryKey: [slug, 'parties'] });
      onSelect(newParty);
    },
    onError: (err: any) => {
      setFormError(err?.message ?? 'فشل إنشاء الزبون');
    },
  });

  const handleCreate = useCallback(() => {
    if (!form.name.trim()) { setFormError('الاسم إلزامي'); return; }
    setFormError('');
    createMutation.mutate({
      name:       form.name.trim(),
      phone:      form.phone.trim() || null,
      email:      form.email.trim() || null,
      trade_name: form.trade_name.trim() || null,
      nif:        form.nif.trim() || null,
      is_client:  form.is_client,
      is_supplier: !form.is_client,
    } as any);
  }, [form, createMutation]);

  const setField = useCallback(<K extends keyof NewClientForm>(
    key: K, val: NewClientForm[K],
  ) => {
    setForm(p => ({ ...p, [key]: val }));
    setFormError('');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-md"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        {/* Header */}
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-users" style={{ marginLeft: 6 }} />
            {showCreate ? 'زبون جديد' : 'اختيار الزبون'}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!showCreate && (
              <button
                className="btn btn-xs btn-p"
                onClick={() => setShowCreate(true)}
                type="button"
              >
                <i className="ti ti-plus" /> جديد
              </button>
            )}
            <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
          </div>
        </div>

        <div className="m-body" style={{ padding: 16, minHeight: 420 }}>

          {/* ════ وضع البحث ════ */}
          {!showCreate && (
            <>
              {/* شريط البحث */}
              <div className="pos-inp" style={{ marginBottom: 12 }}>
                <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--t4)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف أو NIF..."
                  style={{ flex: 1 }}
                />
                {query && (
                  <button
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--t4)', cursor: 'pointer', padding: '0 4px',
                    }}
                    onClick={() => setQuery('')}
                    type="button"
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              {/* زبون عابر */}
              <button
                className={`cust-row cust-anon ${!currentClient ? 'on' : ''} ${highlightedIdx === 0 ? 'hl' : ''}`}
                onClick={() => onSelect(null)}
                type="button"
              >
                <div className="cust-av">
                  <i className="ti ti-user-off" style={{ fontSize: 16 }} />
                </div>
                <div className="cust-info">
                  <div className="cust-name">زبون عابر</div>
                  <div className="cust-meta">بدون تسجيل</div>
                </div>
                {!currentClient && <i className="ti ti-check cust-check" />}
              </button>

              {/* عنوان القائمة */}
              <div className="cust-list-title">
                {isSearching
                  ? searching ? 'جارٍ البحث...' : `${displayList.length} نتيجة`
                  : 'آخر الزبائن'
                }
              </div>

              {/* القائمة */}
              <div className="cust-list" ref={listRef}>
                {displayList.length === 0 && !searching && isSearching && (
                  <div className="cust-empty">
                    <i className="ti ti-search-off" style={{ fontSize: 28, opacity: 0.3 }} />
                    <div>لا توجد نتائج</div>
                    <button
                      className="btn btn-xs btn-p"
                      onClick={() => { setShowCreate(true); setForm(f => ({ ...f, name: query })); }}
                      type="button"
                      style={{ marginTop: 8 }}
                    >
                      <i className="ti ti-plus" /> إنشاء &ldquo;{query}&rdquo;
                    </button>
                  </div>
                )}

                {displayList.map((c, i) => (
                  <button
                    key={c.id}
                    ref={highlightedIdx === i + 1 ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                    className={`cust-row ${currentClient?.id === c.id ? 'on' : ''} ${highlightedIdx === i + 1 ? 'hl' : ''}`}
                    onClick={() => onSelect(c)}
                    type="button"
                  >
                    <div className="cust-av">
                      {(c.name?.[0] ?? '؟').toUpperCase()}
                    </div>
                    <div className="cust-info">
                      <div className="cust-name">{c.name}</div>
                      <div className="cust-meta">
                        {c.phone && <span><i className="ti ti-phone" style={{ fontSize: 10 }} /> {c.phone}</span>}
                        {c.nif   && <span>NIF: {c.nif}</span>}
                      </div>
                      <BalanceLabel balance={balanceMap.get(c.id)} />
                    </div>
                    {currentClient?.id === c.id && (
                      <i className="ti ti-check cust-check" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ════ وضع الإنشاء ════ */}
          {showCreate && (
            <div className="fgrid">
              {/* الاسم */}
              <div className="fg s2">
                <label className="req">الاسم / السبب الاجتماعي</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="اسم الزبون"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* الهاتف */}
              <div className="fg">
                <label>الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="06XXXXXXXX"
                />
              </div>

              {/* البريد */}
              <div className="fg">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="exemple@mail.com"
                />
              </div>

              {/* الاسم التجاري */}
              <div className="fg">
                <label>الاسم التجاري</label>
                <input
                  type="text"
                  value={form.trade_name}
                  onChange={e => setField('trade_name', e.target.value)}
                  placeholder="اختياري"
                />
              </div>

              {/* NIF */}
              <div className="fg">
                <label>رقم التعريف الجبائي (NIF)</label>
                <input
                  type="text"
                  value={form.nif}
                  onChange={e => setField('nif', e.target.value)}
                  placeholder="اختياري"
                />
              </div>

              {/* نوع الطرف */}
              <div className="fg s2">
                <label>النوع</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={form.is_client}
                      onChange={() => setField('is_client', true)}
                    />
                    زبون
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!form.is_client}
                      onChange={() => setField('is_client', false)}
                    />
                    مورد
                  </label>
                </div>
              </div>

              {/* خطأ */}
              {formError && (
                <div className="fg s2">
                  <div className="al al-r">
                    <i className="ti ti-alert-circle" /> {formError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          {showCreate ? (
            <>
              <button
                className="btn"
                onClick={() => { setShowCreate(false); setFormError(''); }}
                type="button"
              >
                <i className="ti ti-arrow-right" /> رجوع
              </button>
              <button
                className="btn btn-p"
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.name.trim()}
                type="button"
              >
                {createMutation.isPending
                  ? <><i className="ti ti-loader-2 spin" /> جارٍ الإنشاء...</>
                  : <><i className="ti ti-user-plus" /> إنشاء وتحديد</>
                }
              </button>
            </>
          ) : (
            <button className="btn" onClick={onClose} type="button">إغلاق</button>
          )}
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/FilterPanel.tsx

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

## FILE: ./resources/js/pos/components/HeldCartsModal.tsx

```
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HeldCart, CartItem } from '@/types';
import { formatDZD } from '../utils/calculations';

interface HeldCartsModalProps {
  carts: HeldCart[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onRestoreAndPay?: (id: string) => void;
}

export default function HeldCartsModal({
  carts, onClose, onRestore, onDelete, onRestoreAndPay,
}: HeldCartsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = carts.filter(c =>
    !search || c.items?.some((i: CartItem) => i.product_name?.includes(search)) || c.client?.name?.includes(search)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, carts.length]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (filtered.length === 0) return;
      const selected = filtered[selectedIndex];
      if (!selected) return;
      e.preventDefault();
      onRestore(selected.id);
      return;
    }
    if (e.key === 'Delete' && !inInput) {
      if (filtered.length === 0) return;
      const selected = filtered[selectedIndex];
      if (!selected) return;
      e.preventDefault();
      onDelete(selected.id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, selectedIndex, onRestore, onRestoreAndPay, onDelete, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown]);

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
              <div className="held-list" ref={listRef}>
                {filtered.map((c: HeldCart, i: number) => (
                  <div
                    key={c.id}
                    className={`held-card${i === selectedIndex ? ' held-sel' : ''}`}
                    onClick={() => onRestore(c.id)}
                    onDoubleClick={() => { if (onRestoreAndPay) onRestoreAndPay(c.id); else onRestore(c.id); }}
                  >
                    <div className="hc-info">
                      <div className="hc-client">{c.client?.name ?? 'زبون عابر'}</div>
                      <div className="hc-meta">
                        {c.items?.length ?? 0} صنف
                        · {formatDZD(c.total ?? 0)}
                      </div>
                      <div className="hc-time">{new Date(c.heldAt).toLocaleTimeString('ar-DZ')}</div>
                    </div>
                    <div className="hc-acts">
                      <button className="btn btn-sm btn-p" onClick={e => { e.stopPropagation(); onRestore(c.id); }}>
                        <i className="ti ti-restore" /> استرجاع
                      </button>
                      <button className="btn btn-sm btn-r" onClick={e => { e.stopPropagation(); onDelete(c.id); }}>
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

## FILE: ./resources/js/pos/components/KeyboardHelpModal.tsx

```
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { readOverrides, saveOverrides, KB_DEFAULTS, normalizeEventKey } from '@/pos/hooks/useKeyboardMap';

interface KeyboardHelpModalProps {
  onClose: () => void;
}

interface ShortcutItem {
  action: string;
  defaultKey: string;
  desc: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

function keyLabel(key: string): string {
  const map: Record<string, string> = {
    'NumpadAdd': 'Num+',
    'NumpadSubtract': 'Num-',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Escape': 'Esc',
  };
  return map[key] ?? key;
}

export default function KeyboardHelpModal({ onClose }: KeyboardHelpModalProps) {
  const slug = useActiveSlug();

  const [editing, setEditing] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>(() => readOverrides(slug));
  const [conflict, setConflict] = useState<string | null>(null);
  const captureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    saveOverrides(slug, overrides);
  }, [overrides, slug]);

  const groups: ShortcutGroup[] = [
    {
      title: 'الوظائف الرئيسية',
      items: [
        { action: 'searchFocus', defaultKey: 'F2', desc: 'تركيز شريط البحث' },
        { action: 'payment', defaultKey: 'F4', desc: 'فتح مودال الدفع' },
        { action: 'holdCart', defaultKey: 'F5', desc: 'تعليق الفاتورة الحالية' },
        { action: 'heldCarts', defaultKey: 'F7', desc: 'الفواتير المعلقة' },
        { action: 'preview', defaultKey: 'F9', desc: 'معاينة / طباعة' },
        { action: 'clearCart', defaultKey: 'F12', desc: 'مسح السلة' },
        { action: 'newSale', defaultKey: '—', desc: 'فاتورة جديدة' },
      ],
    },
    {
      title: 'أدوات إضافية',
      items: [
        { action: 'kbHelp', defaultKey: 'F1', desc: 'هذه المساعدة' },
        { action: 'filter', defaultKey: 'F3', desc: 'لوحة الفلتر' },
        { action: 'manualProduct', defaultKey: 'F6', desc: 'إضافة منتج يدوي' },
        { action: 'sessionStats', defaultKey: 'F8', desc: 'إحصاءات الجلسة' },
        { action: 'fullscreen', defaultKey: 'F11', desc: 'وضع الشاشة الكاملة' },
        { action: 'directPrint', defaultKey: 'Ctrl+P', desc: 'طباعة مباشرة' },
        { action: 'sessionInvoices', defaultKey: 'Ctrl+Shift+I', desc: 'فواتير الجلسة' },
        { action: 'settings', defaultKey: '—', desc: 'إعدادات نقاط البيع' },
        { action: 'toggleQuickbar', defaultKey: '—', desc: 'إظهار/إخفاء الشريط السريع' },
        { action: 'kioskMode', defaultKey: '—', desc: 'وضع الكشك' },
        { action: 'closeSession', defaultKey: '—', desc: 'إغلاق الجلسة' },
      ],
    },
    {
      title: 'التنقل والعرض',
      items: [
        { action: 'toggleHeld', defaultKey: 'Ctrl+ArrowRight', desc: 'التنقل بين السلة والمعلقة' },
        { action: 'quickSearch', defaultKey: 'Ctrl+F', desc: 'البحث السريع' },
        { action: 'gridView', defaultKey: 'Ctrl+ArrowUp', desc: 'عرض الشبكة' },
        { action: 'listView', defaultKey: 'Ctrl+ArrowDown', desc: 'عرض القائمة' },
        { action: 'zoomIn', defaultKey: 'Ctrl+]', desc: 'تكبير الشبكة' },
        { action: 'zoomOut', defaultKey: 'Ctrl+[', desc: 'تصغير الشبكة' },
        { action: 'quickCat', defaultKey: 'Alt+1..9', desc: 'تصنيف سريع' },
      ],
    },
    {
      title: 'السلة',
      items: [
        { action: 'focusCart', defaultKey: 'Ctrl+Space', desc: 'التركيز على السلة والتنقل بينها وبين البحث' },
        { action: 'focusClient', defaultKey: 'Ctrl+K', desc: 'اختيار / إضافة زبون' },
        { action: 'qtyUp', defaultKey: 'NumpadAdd', desc: 'زيادة كمية آخر صنف' },
        { action: 'qtyDown', defaultKey: 'NumpadSubtract', desc: 'إنقاص كمية آخر صنف' },
        { action: 'deleteItem', defaultKey: 'Delete', desc: 'حذف الصنف المحدد من السلة' },
        { action: 'confirmPayment', defaultKey: 'Ctrl+Enter', desc: 'تأكيد الدفع وإتمام الفاتورة' },
        { action: 'undoClear', defaultKey: 'Ctrl+Z', desc: 'تراجع عن مسح السلة' },
        { action: 'qtyModal', defaultKey: 'Ctrl+*', desc: 'فتح مودال تعديل الكمية للصنف المحدد' },
        { action: 'cartNavigate', defaultKey: '↑↓', desc: 'التنقل بين أصناف السلة' },
      ],
    },
    {
      title: 'إجراءات سريعة',
      items: [
        { action: 'enterSearch', defaultKey: 'Enter', desc: 'إضافة أول نتيجة بحث' },
        { action: 'escape', defaultKey: 'Escape', desc: 'إغلاق المودال / مسح البحث' },
        { action: 'quickCash', defaultKey: '—', desc: 'دفع سريع نقدي (Full Cash)' },
        { action: 'searchQtyCmd', defaultKey: '*15', desc: 'ضبط كمية الصنف المحدد في السلة (اكتب * متبوعاً بالرقم)' },
      ],
    },
    {
      title: 'الماسح الضوئي',
      items: [
        { action: 'barcode', defaultKey: 'Barcode', desc: 'ينشّط تلقائياً بمسح الباركود' },
        { action: 'charBuffer', defaultKey: 'أي حرف', desc: 'يُجمع في buffer 300ms' },
        { action: 'barcodeEnter', defaultKey: 'Enter', desc: 'تأكيد الباركود وإضافة الصنف' },
      ],
    },
  ];

  function displayKey(item: ShortcutItem): string {
    const val = overrides[item.action];
    if (val === '') return '—';
    return val ?? item.defaultKey;
  }

  function isDuplicate(action: string, newKey: string): string | null {
    for (const g of groups) {
      for (const item of g.items) {
        if (item.action === action) continue;
        if (displayKey(item) === newKey) return item.desc;
      }
    }
    return null;
  }

  const startEdit = useCallback((action: string) => {
    setEditing(action);
    setListening(true);
    setConflict(null);
  }, []);

  useEffect(() => {
    if (editing) captureRef.current?.focus();
  }, [editing]);

  const handleKeyCapture = useCallback((e: React.KeyboardEvent) => {
    if (!listening || !editing) return;
    e.preventDefault();
    e.stopPropagation();

    const combo = normalizeEventKey(e as unknown as KeyboardEvent);

    // تجاهل مفاتيح التعديل وحدها (Ctrl, Alt, Shift, Meta) — ننتظر المفتاح التالي
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }

    // مفتاح الحذف ← إلغاء تعيين الاختصار
    if (combo === 'Delete' || combo === 'Backspace') {
      setOverrides(prev => {
        const next = { ...prev, [editing]: '' };
        return next;
      });
      setEditing(null);
      setListening(false);
      setConflict(null);
      return;
    }

    if (combo === 'Escape') {
      setEditing(null);
      setListening(false);
      setConflict(null);
      return;
    }

    const dup = isDuplicate(editing, combo);
    if (dup) {
      setConflict(dup);
      return;
    }

    setConflict(null);
    setOverrides(prev => {
      const next = { ...prev, [editing]: combo };
      const defKey = KB_DEFAULTS[editing];
      if (combo === defKey) {
        delete next[editing];
      }
      return next;
    });
    setEditing(null);
    setListening(false);
  }, [listening, editing]);

  function resetAll() {
    setOverrides({});
    setConflict(null);
    setEditing(null);
    setListening(false);
  }

  return (
    <div className="ov on" onClick={onClose}
      onKeyDown={handleKeyCapture}
      tabIndex={-1}
      ref={el => el?.focus()}
    >
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-keyboard" style={{ marginLeft: 6 }} /> تخصيص الاختصارات</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Object.keys(overrides).length > 0 && (
              <button className="btn btn-xs btn-w" onClick={resetAll} type="button">
                <i className="ti ti-refresh" /> إعادة ضبط
              </button>
            )}
            <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
          </div>
        </div>
        <div className="m-body">
          {listening && editing && (
            <div className="al al-i" style={{ marginBottom: 12 }}>
              <i className="ti ti-keyboard" /> اضغط المفتاح الذي تريد تعيينه لـ &ldquo;<b>{groups.flatMap(g => g.items).find(i => i.action === editing)?.desc}</b>&rdquo; — <b>Esc</b> للإلغاء — يمكنك استخدام تركيبة مثل <kbd style={{background:'var(--bg4)',padding:'1px 5px',borderRadius:3}}>Ctrl+K</kbd>
            </div>
          )}
          {conflict && (
            <div className="al al-r" style={{ marginBottom: 12 }}>
              <i className="ti ti-alert-triangle" /> هذا المفتاح مستخدم بالفعل لـ &ldquo;<b>{conflict}</b>&rdquo;
            </div>
          )}
          <div className="kb-help-groups">
            {groups.map(g => (
              <div key={g.title} className="kb-group">
                <div className="kb-group-title">{g.title}</div>
                <div className="kb-help-grid">
                  {g.items.map(s => {
                    const cur = displayKey(s);
                    const isEditing = editing === s.action;
                    return (
                      <div key={s.action} className={`kb-help-row ${isEditing ? 'kb-edit-on' : ''}`}>
                        {isEditing ? (
                          <kbd className="kb-key kb-capture" ref={captureRef}>
                            <i className="ti ti-corner-down-left" style={{ fontSize: 12 }} /> انتظر...
                          </kbd>
                        ) : (
                          <kbd
                            className="kb-key kb-key-clickable"
                            onClick={() => startEdit(s.action)}
                            title="اضغط لتعديل الاختصار"
                          >
                            {keyLabel(cur)}
                            <i className="ti ti-edit" style={{ fontSize: 9, marginRight: 3 }} />
                          </kbd>
                        )}
                        <span className="kb-desc">{s.desc}</span>
                        {!isEditing && cur !== '—' && (
                          <button
                            className="kb-clear-btn"
                            onClick={() => {
                              setOverrides(prev => {
                                const next = { ...prev, [s.action]: '' };
                                return next;
                              });
                            }}
                            title="إلغاء تعيين الاختصار"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose} type="button">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/LiveSessionBanner.tsx

```
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export default function LiveSessionBanner({
  session,
  onStats,
  onClose,
}: {
  session: PosSession;
  onStats: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <div className="pss-live-banner">
      <div className="pss-live-left">
        <div className="pss-live-pulse">
          <i className="ti ti-device-desktop-analytics" />
        </div>
        <div>
          <div className="pss-live-title">
            جلسة نشطة — {session.warehouse?.name}
          </div>
          <div className="pss-live-sub">
            <i className="ti ti-user" /> {session.user?.name}
            <span>·</span>
            <i className="ti ti-clock" /> {session.duration}
            <span>·</span>
            <i className="ti ti-receipt" /> {session.invoices_count} فاتورة
          </div>
        </div>
      </div>
      <div className="pss-live-stats">
        <div className="pss-live-stat">
          <span className="pss-live-stat-val" style={{ direction: 'ltr' }}>
            {formatDZD(Number(session.net_sales))}
          </span>
          <span className="pss-live-stat-lbl">المبيعات الصافية</span>
        </div>
        <div className="pss-live-stat">
          <span className="pss-live-stat-val">{session.invoices_count}</span>
          <span className="pss-live-stat-lbl">الفواتير</span>
        </div>
        <div className="pss-live-stat">
          <span className="pss-live-stat-val" style={{ direction: 'ltr' }}>
            {formatDZD(Number(session.avg_invoice ?? 0))}
          </span>
          <span className="pss-live-stat-lbl">متوسط الفاتورة</span>
        </div>
      </div>
      <div className="pss-live-actions">
        <button
          className="pss-live-btn pss-live-btn--stats"
          onClick={() => onStats(session.id)}
        >
          <i className="ti ti-chart-bar" /> الإحصائيات
        </button>
        <button
          className="pss-live-btn pss-live-btn--close"
          onClick={() => onClose(session.id)}
        >
          <i className="ti ti-door-exit" /> إغلاق
        </button>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/ManagerPinModal.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/ManagerPinModal.tsx
//
// نافذة PIN المدير — تظهر عندما يحاول الكاشير تطبيق خصم فوق الحد المسموح
// تُستخدَم مع checkDiscountAllowed() من usePOSSettings
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';

interface ManagerPinModalProps {
  /** النسبة التي طلبها الكاشير */
  requestedDiscount: number;
  /** الحد المضبوط في الإعدادات */
  threshold:         number;
  /** هل السبب تجاوز الحد الكلي أم تجاوز عتبة الـ PIN */
  reason:            'max_exceeded' | 'pin_required';
  /** يُستدعى بعد التحقق الناجح */
  onSuccess: () => void;
  /** يُستدعى عند الإلغاء */
  onCancel:  () => void;
  /** دالة التحقق من الـ PIN */
  verifyPin: (pin: string) => boolean;
}

export default function ManagerPinModal({
  requestedDiscount, threshold, reason, onSuccess, onCancel, verifyPin,
}: ManagerPinModalProps) {
  const [pin,     setPin]     = useState('');
  const [error,   setError]   = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // focus تلقائي عند فتح الـ modal
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleSubmit = () => {
    if (pin.length !== 4) {
      triggerError('يجب إدخال 4 أرقام');
      return;
    }
    if (!verifyPin(pin)) {
      triggerError('PIN غير صحيح');
      setPin('');
      return;
    }
    onSuccess();
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  const dots = [0, 1, 2, 3].map(i => (
    <div
      key={i}
      style={{
        width: 14, height: 14, borderRadius: '50%',
        background: i < pin.length ? 'var(--em)' : 'var(--b3)',
        transition: 'background .15s',
      }}
    />
  ));

  return (
    <div className="ov on" style={{ zIndex: 9999 }} onClick={e => e.stopPropagation()}>
      <div
        className={`modal modal-sm ${shaking ? 'shake' : ''}`}
        style={{ maxWidth: 340, textAlign: 'center' }}
        onKeyDown={handleKey}
      >
        {/* Icon */}
        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: 'var(--goldb)', border: '2px solid var(--goldbo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'var(--gold)',
          }}>
            <i className="ti ti-lock" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>
            تأكيد صلاحية المدير
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
            {reason === 'max_exceeded'
              ? `الخصم المطلوب (${requestedDiscount}%) يتجاوز الحد الأقصى المسموح (${threshold}%)`
              : `الخصم المطلوب (${requestedDiscount}%) يتجاوز العتبة المحددة (${threshold}%)`
            }
            <br />أدخل PIN المدير للمتابعة
          </div>
        </div>

        {/* PIN display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '20px 0 8px' }}>
          {dots}
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={e => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            setError('');
            if (val.length === 4) {
              // تحقق تلقائي عند إدخال 4 أرقام
              setTimeout(() => {
                if (!verifyPin(val)) {
                  triggerError('PIN غير صحيح');
                  setPin('');
                } else {
                  onSuccess();
                }
              }, 120);
            }
          }}
          style={{
            position: 'absolute', opacity: 0, width: 1, height: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 20px 8px' }}>
          {['1','2','3','4','5','6','7','8','9'].map(k => (
            <button
              key={k}
              type="button"
              className="npk"
              style={{ padding: 14, fontSize: 18 }}
              onClick={() => {
                if (pin.length < 4) {
                  const next = pin + k;
                  setPin(next);
                  setError('');
                  if (next.length === 4) {
                    setTimeout(() => {
                      if (!verifyPin(next)) {
                        triggerError('PIN غير صحيح');
                        setPin('');
                      } else {
                        onSuccess();
                      }
                    }, 120);
                  }
                }
              }}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            className="npk del"
            onClick={() => { setPin(p => p.slice(0, -1)); setError(''); }}
          >
            <i className="ti ti-backspace" />
          </button>
          <button
            type="button"
            className="npk zero"
            style={{ gridColumn: 'span 2', padding: 14, fontSize: 18 }}
            onClick={() => {
              if (pin.length < 4) {
                const next = pin + '0';
                setPin(next);
                setError('');
                if (next.length === 4) {
                  setTimeout(() => {
                    if (!verifyPin(next)) {
                      triggerError('PIN غير صحيح');
                      setPin('');
                    } else {
                      onSuccess();
                    }
                  }, 120);
                }
              }
            }}
          >
            0
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="al al-r" style={{ margin: '0 16px 8px', justifyContent: 'center', fontSize: 12 }}>
            <i className="ti ti-alert-circle" />
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="m-foot" style={{ justifyContent: 'center', gap: 10 }}>
          <button className="btn" onClick={onCancel} type="button">إلغاء</button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60%  { transform: translateX(-8px); }
          40%, 80%  { transform: translateX(8px); }
        }
        .shake { animation: shake .4s ease; }
      `}</style>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/ManualProductModal.tsx

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

## FILE: ./resources/js/pos/components/MobileTabs.tsx

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

## FILE: ./resources/js/pos/components/OpenSessionModal.tsx

```
// resources/js/pos/components/OpenSessionModal.tsx — v2 احترافي
import React, { useState, useEffect } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { Warehouse, FiscalYear } from '@/types';

interface Props {
  warehouses:           Warehouse[];
  fiscalYears:          FiscalYear[];
  defaultWarehouseId?:  number | null;
  defaultFiscalYearId?: number | null;
  isLoading:            boolean;
  error?:               string | null;
  onClose?:             () => void;
  onOpen: (data: {
    warehouse_id:   number;
    fiscal_year_id: number;
    opening_cash:   number;
    opening_note?:  string;
  }) => Promise<void>;
}

// لوحة أرقام سريعة
const QUICK_CASH = [0, 5000, 10000, 20000, 50000, 100000];

export default function OpenSessionModal({
  warehouses, fiscalYears,
  defaultWarehouseId, defaultFiscalYearId,
  isLoading, error, onOpen, onClose,
}: Props) {
  const initWh = defaultWarehouseId
    ?? warehouses.find(w => w.is_default)?.id
    ?? warehouses[0]?.id ?? 0;
  const initFy = defaultFiscalYearId
    ?? fiscalYears.find(y => y.is_current && !y.is_closed)?.id
    ?? fiscalYears[0]?.id ?? 0;

  const [step,         setStep]         = useState<1 | 2>(1);
  const [warehouseId,  setWarehouseId]  = useState<number>(initWh);
  const [fiscalYearId, _setFiscalYearId] = useState<number>(initFy);
  const [openingCash,  setOpeningCash]  = useState('');
  const [confirmCash,  setConfirmCash]  = useState('');
  const [note,         setNote]         = useState('');
  const [cashMode,     setCashMode]     = useState<'quick' | 'manual'>('quick');

  const cashNum    = parseFloat(openingCash)  || 0;
  const confirmNum = parseFloat(confirmCash)  || 0;
  const cashOk     = confirmCash === '' || cashNum === confirmNum;
  const canNext    = !!warehouseId && !!fiscalYearId;
  const canOpen    = cashOk && !isLoading;

  const selectedWh = warehouses.find(w => w.id === warehouseId);
  const selectedFy = fiscalYears.find(y => y.id === fiscalYearId);
  const now        = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr    = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const dateStr    = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()}`;
  const fmtDate = (d: string) => d.split('.')[0];

  // numpad
  const np = (key: string) => {
    setCashMode('manual');
    setOpeningCash(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '000') return prev + '000';
      if (prev === '0')  return key;
      return prev + key;
    });
    setConfirmCash('');
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && step === 2 && canOpen) handleOpen();
      if (e.key === 'ArrowRight' && step === 2) setStep(1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, canOpen, cashNum]);

  const handleOpen = async () => {
    if (!canOpen) return;
    await onOpen({
      warehouse_id:   warehouseId,
      fiscal_year_id: fiscalYearId,
      opening_cash:   cashNum,
      opening_note:   note.trim() || undefined,
    });
  };

  return (
    <div className="ov on" style={{ zIndex: 9998, alignItems: 'center' }}>
      <div className="osm-wrap">

        {/* ════ Header شعار + وقت ════ */}
        <div className="osm-hero">
          <div className="osm-hero-icon">
            <i className="ti ti-door-enter" />
          </div>
          <div className="osm-hero-text">
            <div className="osm-hero-title">فتح جلسة بيع</div>
            <div className="osm-hero-time">{dateStr} · {timeStr}</div>
          </div>
          {/* مؤشر الخطوات */}
          <div className="osm-steps-mini">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`osm-step-dot ${step >= s ? 'on' : ''}`}
              />
            ))}
          </div>
          {/* زر الإغلاق */}
          {onClose && (
            <button
              type="button"
              className="m-x"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff' }}
            >
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {/* ════ Step 1: الإعداد ════ */}
        {step === 1 && (
          <div className="osm-body">
            <div className="osm-section-title">
              <i className="ti ti-settings" />
              إعداد الجلسة
            </div>

            {/* المستودع */}
            <div className="osm-field">
              <label className="osm-label">
                <i className="ti ti-building-warehouse" />
                المستودع
              </label>
              <div className="osm-warehouse-grid">
                {warehouses.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    className={`osm-wh-card ${warehouseId === w.id ? 'on' : ''}`}
                    onClick={() => setWarehouseId(w.id)}
                  >
                    <i className="ti ti-building-warehouse" />
                    <span>{w.name}</span>
                    {w.is_default && <span className="osm-default-tag">افتراضي</span>}
                    {warehouseId === w.id && (
                      <i className="ti ti-check osm-wh-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* السنة المالية */}
            <div className="osm-field">
              <label className="osm-label">
                <i className="ti ti-calendar" />
                السنة المالية
              </label>
              {(() => {
                const currentFy = fiscalYears.find(y => y.id === fiscalYearId);
                return currentFy ? (
                  <div className="osm-fy-badge">
                    <span className="osm-fy-badge-name">{currentFy.name}</span>
                    <span className="osm-fy-badge-dates">
                      {fmtDate(currentFy.start_date)} — {fmtDate(currentFy.end_date)}
                    </span>
                    <span className="osm-current-tag">الحالية</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* ملاحظة وردية */}
            <div className="osm-field">
              <label className="osm-label">
                <i className="ti ti-notes" />
                ملاحظة الوردية (اختياري)
              </label>
              <input
                className="osm-inp"
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="مثال: وردية صباح، صندوق 1..."
              />
            </div>

            {/* ملخص الاختيار */}
            {selectedWh && selectedFy && (
              <div className="osm-summary-bar">
                <span className="ic ic-xs"><i className="ti ti-check" /></span>
                <strong>{selectedWh.name}</strong>
                <span className="osm-summary-sep">·</span>
                <strong>{selectedFy.name}</strong>
              </div>
            )}
          </div>
        )}

        {/* ════ Step 2: رأس مال الدرج ════ */}
        {step === 2 && (
          <div className="osm-body">
            <div className="osm-section-title">
              <i className="ti ti-wallet" />
              رأس مال الدرج
            </div>

            {/* المبلغ المُدخَل */}
            <div className="osm-cash-display">
              <div className="osm-cash-label">مبلغ الدرج</div>
              <div className="osm-cash-big" style={{ direction: 'ltr' }}>
                {cashNum > 0
                  ? cashNum.toLocaleString('fr-DZ')
                  : <span className="osm-cash-placeholder">0</span>
                }
                <span className="osm-cash-dzd">دج</span>
              </div>
              {cashNum > 0 && (
                <div className="osm-cash-words">
                  {formatDZD(cashNum)}
                </div>
              )}
            </div>

            {/* مبالغ سريعة */}
            <div className="osm-quick-grid">
              {QUICK_CASH.map(v => (
                <button
                  key={v}
                  type="button"
                  className={`osm-quick-btn ${cashNum === v ? 'on' : ''}`}
                  onClick={() => {
                    setCashMode('quick');
                    setOpeningCash(String(v));
                    setConfirmCash('');
                  }}
                >
                  {v === 0 ? 'بدون' : v.toLocaleString('fr-DZ')}
                </button>
              ))}
            </div>

            {/* Numpad */}
            <div className="osm-numpad">
              {['7','8','9','4','5','6','1','2','3','000','0','del'].map(k => (
                <button
                  key={k}
                  type="button"
                  className={`osm-npk ${k === 'del' ? 'del' : ''}`}
                  onClick={() => np(k)}
                >
                  {k === 'del' ? <i className="ti ti-backspace" /> : k}
                </button>
              ))}
            </div>

            {/* تأكيد المبلغ — يظهر فقط عند إدخال يدوي */}
            {cashNum > 0 && cashMode === 'manual' && (
              <div className="osm-field">
                <label className="osm-label">
                  <i className="ti ti-refresh" />
                  تأكيد المبلغ
                </label>
                <div className={`osm-confirm-inp-wrap ${!cashOk && confirmCash ? 'err' : ''}`}>
                  <input
                    className="osm-inp"
                    type="number"
                    value={confirmCash}
                    onChange={e => setConfirmCash(e.target.value)}
                    placeholder={String(cashNum)}
                    inputMode="numeric"
                  />
                  {cashOk && confirmCash && (
                    <i className="ti ti-check osm-confirm-ok" />
                  )}
                </div>
                {!cashOk && confirmCash && (
                  <div className="osm-field-err">
                    <i className="ti ti-alert-circle" /> المبلغان غير متطابقان
                  </div>
                )}
              </div>
            )}

            {/* ملخص الجلسة */}
            <div className="osm-session-preview">
              <div className="osm-preview-row">
                <i className="ti ti-building-warehouse" />
                <span>{selectedWh?.name}</span>
              </div>
              <div className="osm-preview-row">
                <i className="ti ti-calendar" />
                <span>{selectedFy?.name}</span>
              </div>
              <div className="osm-preview-row">
                <i className="ti ti-clock" />
                <span>{timeStr}</span>
              </div>
              {note && (
                <div className="osm-preview-row">
                  <i className="ti ti-notes" />
                  <span>{note}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="osm-error">
                <i className="ti ti-alert-circle" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ════ Footer ════ */}
        <div className="osm-footer">
          {step === 2 && (
            <button
              type="button"
              className="osm-btn-back"
              onClick={() => setStep(1)}
            >
              <i className="ti ti-arrow-right" /> رجوع
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 1 ? (
            <button
              type="button"
              className="osm-btn-next"
              onClick={() => setStep(2)}
              disabled={!canNext}
            >
              التالي <i className="ti ti-arrow-left" />
            </button>
          ) : (
            <button
              type="button"
              className="osm-btn-open"
              onClick={handleOpen}
              disabled={!canOpen}
            >
              {isLoading ? (
                <><i className="ti ti-loader-2 spin" /> جاري الفتح...</>
              ) : (
                <><i className="ti ti-door-enter" /> فتح الجلسة</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/PanelResizer.tsx

```
import React from 'react';

interface PanelResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export default function PanelResizer({ onMouseDown }: PanelResizerProps) {
  return (
    <div
      className="pos-resizer"
      onMouseDown={onMouseDown}
    >
      <div className="pos-resizer-line" />
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/PosSessionsCards.tsx

```
import Badge      from '@/components/ui/Badge';
import { STATUS_VARIANT, STATUS_LABEL } from '@/pos/hooks/usePosSessions';
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export default function PosSessionsCards({
  sessions,
  isFetching,
  _selectedId,
  onStats,
  onClose,
}: {
  sessions: PosSession[];
  isFetching: boolean;
  _selectedId: number | null;
  onStats: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <div className="pss-cards-grid" style={{ opacity: isFetching ? 0.65 : 1 }}>
      {sessions.map(sess => (
        <div
          key={sess.id}
          className={`pss-card ${sess.status === 'open' ? 'pss-card--live' : ''}`}
          onClick={() => onStats(sess.id)}
        >
          <div className="pss-card-header">
            <div className="pss-card-av">
              {(sess.user?.name ?? '?').charAt(0)}
            </div>
            <div className="pss-card-info">
              <div className="pss-card-name">{sess.user?.name ?? '—'}</div>
              <div className="pss-card-wh">
                <i className="ti ti-building-warehouse" />
                {sess.warehouse?.name ?? '—'}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[sess.status] ?? 'gray'}>{STATUS_LABEL[sess.status] ?? sess.status}</Badge>
          </div>

          <div className="pss-card-sales">
            <div className="pss-card-sales-val" style={{ direction: 'ltr' }}>
              {formatDZD(Number(sess.net_sales))}
            </div>
            <div className="pss-card-sales-lbl">المبيعات الصافية</div>
          </div>

          <div className="pss-card-stats">
            <div className="pss-card-stat">
              <span className="pss-card-stat-val">{sess.invoices_count}</span>
              <span className="pss-card-stat-lbl">فاتورة</span>
            </div>
            <div className="pss-card-stat-sep" />
            <div className="pss-card-stat">
              <span className="pss-card-stat-val">{sess.duration ?? '—'}</span>
              <span className="pss-card-stat-lbl">المدة</span>
            </div>
            <div className="pss-card-stat-sep" />
            <div className="pss-card-stat">
              <span className="pss-card-stat-val" style={{ direction: 'ltr' }}>
                {formatDZD(Number(sess.avg_invoice ?? 0))}
              </span>
              <span className="pss-card-stat-lbl">المتوسط</span>
            </div>
          </div>

          <div className="pss-card-footer">
            <span className="pss-card-date">
              <i className="ti ti-calendar" />
              {new Date(sess.opened_at).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'long' })}
            </span>
            <div className="pss-card-actions" onClick={e => e.stopPropagation()}>
              <button className="pss-action-btn" onClick={() => onStats(sess.id)}>
                <i className="ti ti-chart-bar" />
              </button>
              {sess.status === 'open' && (
                <button
                  className="pss-action-btn pss-action-btn--danger"
                  onClick={() => onClose(sess.id)}
                >
                  <i className="ti ti-door-exit" />
                </button>
              )}
            </div>
          </div>

          {sess.status === 'open' && <div className="pss-card-live-bar" />}
        </div>
      ))}
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/PosSessionsFilters.tsx

```
import type { StatusFilter } from '@/pos/hooks/usePosSessions';

export default function PosSessionsFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  hasFilters, onReset,
  isSyncing,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  hasFilters: boolean;
  onReset: () => void;
  isSyncing: boolean;
}) {
  return (
    <div className="pss-filters">
      <div className="pss-search">
        <i className="ti ti-search pss-search-ic" />
        <input
          className="pss-search-inp"
          type="text"
          placeholder="بحث باسم الكاشير أو المستودع..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        {search && (
          <button className="pss-search-clear" onClick={() => onSearchChange('')}>
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      <div className="pss-filter-pills">
        {(['', 'open', 'closed', 'suspended'] as const).map(s => (
          <button
            key={s || 'all'}
            className={`pss-pill ${statusFilter === s ? 'on' : ''}`}
            onClick={() => onStatusChange(s)}
          >
            {s === ''          && 'الكل'}
            {s === 'open'      && <><i className="ti ti-circle-check" /> مفتوحة</>}
            {s === 'closed'    && <><i className="ti ti-circle-x" /> مغلقة</>}
            {s === 'suspended' && <><i className="ti ti-circle-pause" /> معلقة</>}
          </button>
        ))}
      </div>

      <div className="pss-date-range">
        <div className="pss-date-inp-wrap">
          <i className="ti ti-calendar pss-date-ic" />
          <input
            type="date"
            className="pss-date-inp"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
          />
        </div>
        <span className="pss-date-sep">—</span>
        <div className="pss-date-inp-wrap">
          <i className="ti ti-calendar pss-date-ic" />
          <input
            type="date"
            className="pss-date-inp"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
          />
        </div>
      </div>

      {hasFilters && (
        <button className="pss-reset-btn" onClick={onReset}>
          <i className="ti ti-refresh" /> إعادة ضبط
        </button>
      )}

      <div className="pss-filter-spacer" />

      {isSyncing && (
        <span className="pss-sync-badge">
          <i className="ti ti-loader-2 spin" /> تحديث...
        </span>
      )}
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/PosSessionsPagination.tsx

```
interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export default function PosSessionsPagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PaginationMeta;
  page: number;
  onPageChange: (p: number) => void;
}) {
  if (meta.last_page <= 1) return null;

  return (
    <div className="pss-pagination">
      <span className="pss-pagination-info">
        {meta.from}–{meta.to} من {meta.total}
      </span>
      <div className="pss-pagination-btns">
        <button
          className="pss-page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <i className="ti ti-chevron-right" />
        </button>

        {Array.from({ length: Math.min(7, meta.last_page) }, (_, i) => {
          const p = Math.max(1, Math.min(meta.last_page - 6, page - 3)) + i;
          return (
            <button
              key={p}
              className={`pss-page-btn ${p === page ? 'on' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          );
        })}

        <button
          className="pss-page-btn"
          disabled={page >= meta.last_page}
          onClick={() => onPageChange(Math.min(meta.last_page, page + 1))}
        >
          <i className="ti ti-chevron-left" />
        </button>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/PosSessionsTable.tsx

```
import Badge      from '@/components/ui/Badge';
import { STATUS_VARIANT, STATUS_LABEL } from '@/pos/hooks/usePosSessions';
import { formatDZD } from '@/pos/utils/calculations';
import Sparkline     from './Sparkline';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export default function PosSessionsTable({
  sessions,
  isFetching,
  selectedId,
  maxSale,
  onStats,
  onClose,
}: {
  sessions: PosSession[];
  isFetching: boolean;
  selectedId: number | null;
  maxSale: number;
  onStats: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <div className="pss-table-wrap" style={{ opacity: isFetching ? 0.65 : 1 }}>
      <table className="pss-table">
        <thead>
          <tr>
            <th>الحالة</th>
            <th>الكاشير</th>
            <th>المستودع</th>
            <th>الفتح</th>
            <th>الإغلاق</th>
            <th className="pss-th-num">الفواتير</th>
            <th className="pss-th-num">المبيعات</th>
            <th className="pss-th-num">المدة</th>
            <th className="pss-th-actions" />
          </tr>
        </thead>
        <tbody>
          {sessions.map(sess => (
            <tr
              key={sess.id}
              className={[
                'pss-tr',
                sess.status === 'open'   ? 'pss-tr--live'     : '',
                selectedId  === sess.id  ? 'pss-tr--selected' : '',
              ].join(' ')}
              onClick={() => onStats(sess.id)}
            >
              <td><Badge variant={STATUS_VARIANT[sess.status] ?? 'gray'}>{STATUS_LABEL[sess.status] ?? sess.status}</Badge></td>

              <td>
                <div className="pss-user-cell">
                  <div className="pss-user-av">
                    {(sess.user?.name ?? '?').charAt(0)}
                  </div>
                  <span className="pss-user-name">{sess.user?.name ?? '—'}</span>
                </div>
              </td>

              <td>
                <div className="pss-wh-cell">
                  <i className="ti ti-building-warehouse" />
                  {sess.warehouse?.name ?? '—'}
                </div>
              </td>

              <td className="pss-date-cell">
                {new Date(sess.opened_at).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' })}
                <span className="pss-time">
                  {new Date(sess.opened_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </td>

              <td className="pss-date-cell">
                {sess.closed_at ? (
                  <>
                    {new Date(sess.closed_at).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' })}
                    <span className="pss-time">
                      {new Date(sess.closed_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <span className="pss-live-indicator">
                    <span className="pss-live-dot pss-live-dot--sm" />
                    نشطة
                  </span>
                )}
              </td>

              <td className="pss-num-cell">
                <span className="pss-num">{sess.invoices_count}</span>
              </td>

              <td className="pss-num-cell">
                <div className="pss-sales-cell">
                  <span className="pss-sales-val" style={{ direction: 'ltr' }}>
                    {formatDZD(Number(sess.net_sales))}
                  </span>
                  <Sparkline value={Number(sess.net_sales)} max={maxSale} color="var(--em)" />
                </div>
              </td>

              <td className="pss-num-cell">
                <span className="pss-duration">{sess.duration ?? '—'}</span>
              </td>

              <td onClick={e => e.stopPropagation()}>
                <div className="pss-row-actions">
                  <button className="pss-action-btn" title="عرض التفاصيل" onClick={() => onStats(sess.id)}>
                    <i className="ti ti-chart-bar" />
                  </button>
                  {sess.status === 'open' && (
                    <button className="pss-action-btn pss-action-btn--danger" title="إغلاق الجلسة" onClick={() => onClose(sess.id)}>
                      <i className="ti ti-door-exit" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/POSSettingsModal.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/POSSettingsModal.tsx
//
// واجهة إعدادات POS — يُعدِّل usePOSSettings مباشرة (يُحفظ في localStorage)
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import type { POSSettings, PriceDisplayMode, GridDefaultSize, QuickCashAction, AfterSaleAction } from '@/pos/hooks/usePOSSettings';
import { isWebUsbSupported } from '@/pos/utils/printService';
import { SOUND_PRESETS, previewSound } from '@/pos/utils/posSounds';
import type { Warehouse, DocumentType, PaymentMode } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { ConfirmDialog } from '@/components/ui';

interface POSSettingsModalProps {
  settings:      POSSettings;
  onSave:        (patch: Partial<POSSettings>) => void;
  onReset:       () => void;
  onClose:       () => void;
  warehouses:    Warehouse[];
  documentTypes: DocumentType[];
  paymentModes:  PaymentMode[];
  /** System-level fiscal stamp setting (from DB) */
  systemFiscalStampEnabled: boolean;
  /** Toggle fiscal stamp in system settings DB */
  onToggleFiscalStamp: (val: boolean) => Promise<void>;
  /** System-level allow negative stock setting (from DB) */
  systemAllowNegativeStock: boolean;
  /** Toggle allow negative stock in system settings DB */
  onToggleAllowNegative: (val: boolean) => Promise<void>;
}

type Tab = 'general' | 'pricing' | 'print' | 'receipt' | 'security';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'general',  label: 'عام',       icon: 'ti-settings' },
  { key: 'pricing',  label: 'الأسعار',   icon: 'ti-tag' },
  { key: 'print',    label: 'الطباعة',   icon: 'ti-printer' },
  { key: 'receipt',  label: 'الإيصال',   icon: 'ti-receipt' },
  { key: 'security', label: 'الأمان',    icon: 'ti-lock' },
];

const DEFAULT_PAYMENT_OPTIONS = [
  { value: 'cash',   label: 'نقداً' },
  { value: 'cib',    label: 'CIB' },
  { value: 'ccp',    label: 'CCP' },
  { value: 'credit', label: 'آجل' },
];

const GRID_OPTIONS: { value: GridDefaultSize; label: string }[] = [
  { value: 'xs', label: 'XS — كثيف جداً' },
  { value: 'sm', label: 'SM — كثيف' },
  { value: 'md', label: 'MD — متوسط' },
  { value: 'lg', label: 'LG — كبير' },
];

const PRINT_COPIES: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'نسخة واحدة' },
  { value: 2, label: 'نسختان' },
  { value: 3, label: '3 نسخ' },
];

const TOAST_DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 1500, label: 'سريع (1.5 ثانية)' },
  { value: 3000, label: 'عادي (3 ثواني)' },
  { value: 5000, label: 'بطيء (5 ثواني)' },
  { value: 8000, label: 'بطيء جداً (8 ثواني)' },
  { value: 0,    label: 'حتى يُضغط عليها' },
];

const TOAST_POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'top-left',     label: 'أعلى يسار' },
  { value: 'top-center',   label: 'أعلى وسط' },
  { value: 'top-right',    label: 'أعلى يمين' },
  { value: 'bottom-left',  label: 'أسفل يسار' },
  { value: 'bottom-center',label: 'أسفل وسط' },
  { value: 'bottom-right', label: 'أسفل يمين' },
];

const toggleSettings: { key: keyof POSSettings; label: string; triState?: boolean }[] = [
  { key: 'showQuickbarOnStart', label: 'إظهار شريط المنتجات السريعة عند الفتح' },
  { key: 'confirmOnClear',      label: 'طلب تأكيد قبل مسح السلة' },
  { key: 'autoClosePayment',    label: 'إغلاق نافذة الدفع تلقائياً بعد النجاح' },
  { key: 'playSoundOnAdd',      label: 'صوت عند إضافة منتج' },
  { key: 'playSoundOnSale',     label: 'صوت عند إتمام البيع' },
  { key: 'showStockOnCard',     label: 'إظهار الرصيد في بطاقة المنتج' },
  { key: 'hideOutOfStock',      label: 'إخفاء المنتجات النافذة من الشبكة' },
  { key: 'clearSearchOnAdd',    label: 'تفريغ البحث بعد إضافة منتج' },
  { key: 'keyboardNav',         label: 'التنقل عبر النتائج بلوحة المفاتيح (↑↓)' },
  { key: 'advanceOnAdd',        label: 'الانتقال للمنتج التالي بعد الإضافة' },
];

export default function POSSettingsModal({
  settings, onSave, onReset, onClose, warehouses, documentTypes, paymentModes,
  systemFiscalStampEnabled, onToggleFiscalStamp,
  systemAllowNegativeStock, onToggleAllowNegative,
}: POSSettingsModalProps) {
  const [local,     setLocal]     = useState<POSSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [dirty,     setDirty]     = useState(false);
  const [showPin,   setShowPin]   = useState(false);
  const [stampSaving, setStampSaving]   = useState(false);
  const [negSaving,   setNegSaving]     = useState(false);
  const deleteConfirm = useConfirm();
  const notify = useNotification();

  const patch = (p: Partial<POSSettings>) => {
    setLocal(prev => ({ ...prev, ...p }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(local);
    setDirty(false);
    onClose();
  };

  const handleReset = async () => {
    if (!await deleteConfirm.confirm('هل تريد إعادة ضبط كل الإعدادات للقيم الافتراضية؟')) return;
    onReset();
    onClose();
    notify.success('تم إعادة الضبط');
  };

  const invoiceTypes = documentTypes.filter(t =>
    ['POS', 'FV', 'BL', 'FAC', 'PRO', 'DEV'].includes(t.code),
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>المستودع الافتراضي</label>
              <select
                value={local.defaultWarehouseId ?? ''}
                onChange={e => patch({ defaultWarehouseId: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">— تلقائي —</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>نوع الفاتورة الافتراضي</label>
              <select
                value={local.defaultDocTypeCode}
                onChange={e => patch({ defaultDocTypeCode: e.target.value })}
              >
                {invoiceTypes.map(t => (
                  <option key={t.id} value={t.code}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>طريقة الدفع الافتراضية</label>
              <select
                value={local.defaultPaymentCode}
                onChange={e => patch({ defaultPaymentCode: e.target.value })}
              >
                {(paymentModes?.length ? paymentModes : DEFAULT_PAYMENT_OPTIONS.map(o => ({ id: 0, code: o.value, name: o.label } as any))).map((m: any) => (
                  <option key={m.code} value={m.code?.toLowerCase()}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>حجم شبكة المنتجات الافتراضي</label>
              <select
                value={local.defaultGridSize}
                onChange={e => patch({ defaultGridSize: e.target.value as GridDefaultSize })}
              >
                {GRID_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {toggleSettings.map(({ key, label }) => (
              <div className="fg s2" key={key}>
                <Switch
                  checked={local[key] as boolean}
                  onChange={v => patch({ [key]: v } as Partial<POSSettings>)}
                  label={label}
                />
              </div>
            ))}

            {/* ── السماح بالمخزون السالب — يكتب مباشرة في إعدادات النظام ── */}
            <div className="fg s2">
              <Switch
                checked={systemAllowNegativeStock}
                onChange={async (v) => {
                  setNegSaving(true);
                  try { await onToggleAllowNegative(v); }
                  finally { setNegSaving(false); }
                }}
                label={negSaving ? 'جاري الحفظ...' : 'السماح بالمخزون السالب'}
              />
              <div className="fg-hint">نفس إعداد "السماح بالمخزون السالب" في إعدادات النظام</div>
            </div>

            {/* ── الطابع المالي — يكتب مباشرة في إعدادات النظام ── */}
            <div className="fg s2">
              <Switch
                checked={systemFiscalStampEnabled}
                onChange={async (v) => {
                  setStampSaving(true);
                  try { await onToggleFiscalStamp(v); }
                  finally { setStampSaving(false); }
                }}
                label={stampSaving ? 'جاري الحفظ...' : 'الطابع المالي (Timbre Fiscal)'}
              />
              <div className="fg-hint">نفس إعداد "الطابع المالي" في إعدادات النظام — تغييره هنا يُحدّث النظام بالكامل</div>
            </div>

            {(local.playSoundOnAdd || local.playSoundOnSale) && (
              <>
                <div className="fg s2">
                  <label>مستوى الصوت — {local.soundVolume}%</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <i className="ti ti-volume" style={{ color: 'var(--t4)', fontSize: 16 }} />
                    <input
                      type="range" min={0} max={100} step={5}
                      value={local.soundVolume}
                      onChange={e => patch({ soundVolume: parseInt(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--em)' }}
                    />
                    <i className="ti ti-volume-2" style={{ color: 'var(--t4)', fontSize: 16 }} />
                  </div>
                </div>

                <div className="fg s2">
                  <label>النغمة</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginTop: 6 }}>
                    {SOUND_PRESETS.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '10px 6px', borderRadius: 8, cursor: 'pointer',
                          background: local.soundPreset === p.id ? 'var(--emb)' : 'var(--bg2)',
                          border: `1.5px solid ${local.soundPreset === p.id ? 'var(--embo)' : 'var(--b2)'}`,
                          color: local.soundPreset === p.id ? 'var(--em)' : 'var(--t2)',
                          fontWeight: local.soundPreset === p.id ? 700 : 400,
                          transition: 'all .15s',
                        }}
                        onClick={() => patch({ soundPreset: p.id })}
                      >
                        <i className={`ti ${p.icon}`} style={{ fontSize: 18 }} />
                        <span style={{ fontSize: 12 }}>{p.label}</span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); previewSound(p.id, local.soundVolume); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--t4)', fontSize: 14, padding: 2,
                          }}
                          title="استمع"
                        >
                          <i className="ti ti-player-play" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="fg s2">
              <Switch
                checked={local.toastEnabled}
                onChange={v => patch({ toastEnabled: v })}
                label="إشعارات toast"
              />
            </div>

            {local.toastEnabled && (
              <>
                <div className="fg s2">
                  <label>مدة عرض الإشعارات</label>
                  <select
                    value={local.toastDuration}
                    onChange={e => patch({ toastDuration: parseInt(e.target.value) })}
                  >
                    {TOAST_DURATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="fg-hint">مدة ظهور إشعارات النجاح والخطأ أعلى الشاشة</div>
                </div>

                <div className="fg s2">
                  <label>مكان ظهور الإشعارات</label>
                  <select
                    value={local.toastPosition}
                    onChange={e => patch({ toastPosition: e.target.value as POSSettings['toastPosition'] })}
                  >
                    {TOAST_POSITION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        );

      case 'pricing':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>طريقة عرض الأسعار</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {([
                  { value: 'ttc', label: 'TTC شامل الضريبة' },
                  { value: 'ht',  label: 'HT قبل الضريبة' },
                ] as { value: PriceDisplayMode; label: string }[]).map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: local.priceDisplayMode === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.priceDisplayMode === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      color: local.priceDisplayMode === opt.value ? 'var(--em)' : 'var(--t2)',
                      fontWeight: local.priceDisplayMode === opt.value ? 700 : 400,
                      fontSize: 13, transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="priceDisplayMode"
                      value={opt.value} style={{ display: 'none' }}
                      checked={local.priceDisplayMode === opt.value}
                      onChange={() => patch({ priceDisplayMode: opt.value })}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="fg">
              <label>الحد الأقصى للخصم (%)</label>
              <div className="inp-row">
                <input
                  type="number" min={0} max={100} step={1}
                  value={local.maxDiscountPct}
                  onChange={e => patch({ maxDiscountPct: parseInt(e.target.value) || 0 })}
                />
                <div className="inp-suf">%</div>
              </div>
              <div className="fg-hint">0 = بدون حد أقصى</div>
            </div>

            <div className="fg">
              <label>عتبة طلب PIN الخصم (%)</label>
              <div className="inp-row">
                <input
                  type="number" min={0} max={100} step={1}
                  value={local.discountPinThreshold}
                  onChange={e => patch({ discountPinThreshold: parseInt(e.target.value) || 0 })}
                />
                <div className="inp-suf">%</div>
              </div>
              <div className="fg-hint">فوق هذه النسبة يُطلب PIN المدير</div>
            </div>
          </div>
        );

      case 'print':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>طريقة الطباعة</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[
                  { value: 'browser', label: 'المتصفح', desc: 'يفتح dialog الطباعة العادي' },
                  { value: 'thermal', label: 'حرارية ESC/POS', desc: `WebUSB — ${isWebUsbSupported() ? 'مدعوم' : 'يحتاج Chrome/Edge'}` },
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      flex: 1, padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      background: local.printMode === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.printMode === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="printMode" value={opt.value}
                      style={{ display: 'none' }}
                      checked={local.printMode === opt.value}
                      onChange={() => patch({ printMode: opt.value as POSSettings['printMode'] })}
                    />
                    <div style={{ fontWeight: local.printMode === opt.value ? 700 : 400, fontSize: 13, color: local.printMode === opt.value ? 'var(--em)' : 'var(--t2)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fg">
              <label>عدد النسخ</label>
              <select
                value={local.printCopies}
                onChange={e => patch({ printCopies: parseInt(e.target.value) as 1 | 2 | 3 })}
              >
                {PRINT_COPIES.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="fg s2">
              <label>بعد إتمام البيع</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                {[
                  { value: 'preview', label: 'معاينة الإيصال', desc: 'فتح نافذة المعاينة' },
                  { value: 'print', label: 'طباعة مباشرة', desc: 'إرسال للطابعة فوراً' },
                  { value: 'none', label: 'إغلاق فقط', desc: 'بدون معاينة أو طباعة' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: local.afterSaleAction === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.afterSaleAction === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="afterSaleAction" value={opt.value}
                      style={{ display: 'none' }}
                      checked={local.afterSaleAction === opt.value}
                      onChange={() => patch({ afterSaleAction: opt.value as AfterSaleAction })}
                    />
                    <div style={{ fontWeight: local.afterSaleAction === opt.value ? 700 : 400, fontSize: 12, color: local.afterSaleAction === opt.value ? 'var(--em)' : 'var(--t2)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fg s2">
              <label>سلوك الدفع السريع (نقدي كامل)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                {[
                  { value: 'silent', label: 'طباعة مباشرة', desc: 'حرارية فقط — بدون أي نافذة' },
                  { value: 'preview', label: 'معاينة الإيصال', desc: 'فتح نافذة المعاينة أولاً' },
                  { value: 'print', label: 'طباعة المتصفح', desc: 'فتح نافذة الطباعة العادية' },
                  { value: 'none', label: 'بدون طباعة', desc: 'إتمام البيع فقط' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: local.quickCashAction === opt.value ? 'var(--emb)' : 'var(--bg2)',
                      border: `1px solid ${local.quickCashAction === opt.value ? 'var(--embo)' : 'var(--b2)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input
                      type="radio" name="quickCashAction" value={opt.value}
                      style={{ display: 'none' }}
                      checked={local.quickCashAction === opt.value}
                      onChange={() => patch({ quickCashAction: opt.value as QuickCashAction })}
                    />
                    <div style={{ fontWeight: local.quickCashAction === opt.value ? 700 : 400, fontSize: 12, color: local.quickCashAction === opt.value ? 'var(--em)' : 'var(--t2)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="fg s2">
              <Switch
                checked={local.openCashDrawer}
                onChange={v => patch({ openCashDrawer: v })}
                label="فتح درج النقود تلقائياً عند الدفع نقداً"
              />
              <div className="fg-hint">يعمل مع طابعات ESC/POS المتصلة بالدرج</div>
            </div>
          </div>
        );

      case 'receipt':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <label>اسم الشركة في رأس الإيصال</label>
              <input
                type="text"
                value={local.receiptCompanyName ?? ''}
                onChange={e => patch({ receiptCompanyName: e.target.value || null })}
                placeholder="اتركه فارغاً لقراءته من بيانات الشركة"
              />
              <div className="fg-hint">اتركه فارغاً ليُقرأ من activeCompany.name</div>
            </div>

            <div className="fg s2">
              <label>سطر رأس إضافي</label>
              <input
                type="text"
                value={local.receiptHeader2}
                onChange={e => patch({ receiptHeader2: e.target.value })}
                placeholder="العنوان، الهاتف..."
              />
            </div>

            <div className="fg s2">
              <label>رسالة التذييل</label>
              <input
                type="text"
                value={local.receiptFooter}
                onChange={e => patch({ receiptFooter: e.target.value })}
                placeholder="شكراً لتعاملكم معنا"
              />
            </div>

            <div className="fg s2">
              <Switch
                checked={local.receiptShowQr}
                onChange={v => patch({ receiptShowQr: v })}
                label="إظهار QR Code في الإيصال"
              />
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="fgrid">
            <div className="fg s2">
              <div className="al al-b" style={{ marginBottom: 0 }}>
                <i className="ti ti-info-circle" />
                <div>
                  يمكن تعيين PIN للمدير لتقييد صلاحيات الكاشير على الخصومات الكبيرة.
                  PIN يُخزَّن محلياً — لا يُرسَل للسيرفر.
                </div>
              </div>
            </div>

            <div className="fg s2">
              <Switch
                checked={local.discountRequirePin}
                onChange={v => patch({ discountRequirePin: v })}
                label="طلب PIN المدير عند تجاوز حد الخصم"
              />
            </div>

            {local.discountRequirePin && (
              <>
                <div className="fg">
                  <label>عتبة طلب الـ PIN</label>
                  <div className="inp-row">
                    <input
                      type="number" min={1} max={100}
                      value={local.discountPinThreshold}
                      onChange={e => patch({ discountPinThreshold: parseInt(e.target.value) || 20 })}
                    />
                    <div className="inp-suf">%</div>
                  </div>
                </div>

                <div className="fg">
                  <label>PIN المدير (4 أرقام)</label>
                  <div className="inp-row">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={4} pattern="[0-9]{4}" inputMode="numeric"
                      value={local.managerPin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        patch({ managerPin: val });
                      }}
                      placeholder="••••"
                      style={{ fontFamily: 'monospace', letterSpacing: 6, textAlign: 'center' }}
                    />
                    <button
                      type="button"
                      className="inp-suf"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowPin(p => !p)}
                    >
                      <i className={`ti ${showPin ? 'ti-eye-off' : 'ti-eye'}`} />
                    </button>
                  </div>
                  {local.managerPin && local.managerPin.length !== 4 && (
                    <div className="fg-hint" style={{ color: 'var(--red)' }}>
                      PIN يجب أن يكون 4 أرقام بالضبط
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="إعدادات نقطة البيع"
      subtitle="تُحفَظ محلياً لهذا الجهاز"
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="default" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" onClick={handleSave} disabled={!dirty}>
            حفظ الإعدادات
          </Button>
        </div>
      }
      footerLeft={
        <Button variant="danger" onClick={handleReset}>
          إعادة ضبط
        </Button>
      }
    >
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16,
        background: 'var(--bg2)', borderRadius: 10, padding: 3,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500,
              background: activeTab === t.key ? 'var(--bg1)' : 'transparent',
              color: activeTab === t.key ? 'var(--em)' : 'var(--t3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .15s', boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}
          >
            <i className={`ti ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ height: '55vh', overflowY: 'auto' }}>
        {renderTab()}
      </div>
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </Modal>
  );
}

```

## FILE: ./resources/js/pos/components/POSTopBar.tsx

```
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { CartTotals, PriceLevel } from '@/types';
import type { PosSession }           from '@/lib/api/endpoints/posSession';
import { formatDZD }                 from '../utils/calculations';
import { getEffectiveShortcut } from '../hooks/useKeyboardMap';

const MARGIN_VIS_KEY = 'pos-margin-visible';

interface POSTopBarProps {
  session:         PosSession | null | undefined;
  heldCount:       number;
  avgMargin:       number;
  isEmpty:         boolean;
  isFullscreen:    boolean;
  showQuickbar:    boolean;
  totals:          CartTotals;
  totalTtcFinal:   number;
  slug:            string | null;
  editingDocumentNumber?: string | null;
  priceLevels:          PriceLevel[];
  selectedPriceLevelId: number | null;
  onPriceLevelChange:   (plId: number | null) => void;
  onHeld:          () => void;
  onNewSale:       () => void;
  onManual:        () => void;
  onReceipt:       () => void;
  onSession:          () => void;
  onSessionInvoices:  () => void;
  onFullscreen:       () => void;
  onKbHelp:           () => void;
  onToggleQuickbar:   () => void;
  onReturn:           () => void;
  onSettings:         () => void;
  onKioskMode:        () => void;
  onOpenDrawer:       () => void;
  toastEnabled:       boolean;
  onToggleToast:      () => void;
  clearSearchOnAdd:   boolean;
  onToggleClearSearch:() => void;
}

export default function POSTopBar({
  session, heldCount, avgMargin,
  isEmpty, isFullscreen, showQuickbar,
  totals, totalTtcFinal, slug, editingDocumentNumber,
  priceLevels, selectedPriceLevelId, onPriceLevelChange,
  onHeld, onNewSale, onManual, onReceipt,
  onSession, onSessionInvoices, onFullscreen, onKbHelp,
  onToggleQuickbar, onReturn, onSettings, onKioskMode,
  onOpenDrawer, toastEnabled, onToggleToast,
  clearSearchOnAdd, onToggleClearSearch,
}: POSTopBarProps) {

  const invoicesCount = session?.invoices_count ?? 0;
  const netSales      = session?.net_sales      ?? 0;
  const kb            = (action: string) => getEffectiveShortcut(slug, action) ?? '';

  const [showTarifDrop, setShowTarifDrop] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const tarifRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const [showMargin, setShowMargin] = useState(() => {
    try { return localStorage.getItem(MARGIN_VIS_KEY) !== '0'; } catch { return true; }
  });
  const toggleMargin = useCallback(() => {
    setShowMargin(prev => {
      const next = !prev;
      try { localStorage.setItem(MARGIN_VIS_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);
  const selectedTarifLabel = selectedPriceLevelId === null
    ? 'عادي'
    : (priceLevels.find(pl => pl.id === selectedPriceLevelId)?.name ?? 'عادي');

  const openDrop = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setShowTarifDrop(true);
  }, []);

  useEffect(() => {
    if (!showTarifDrop) return;
    const h = (e: MouseEvent) => {
      if (tarifRef.current && !tarifRef.current.contains(e.target as Node)) setShowTarifDrop(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowTarifDrop(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', esc); };
  }, [showTarifDrop]);

  return (
    <div className="pos-topbar">
      <div className="pos-stats-row">

        <div
          className="pos-chip g clickable"
          onClick={onSessionInvoices}
          title={`فواتير الجلسة — ${kb('sessionInvoices')}`}
        >
          <i className="ti ti-receipt pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">فواتير الجلسة</span>
            <strong className="pos-chip-val">{invoicesCount}</strong>
          </div>
        </div>

        <div
          className="pos-chip o clickable"
          onClick={onSession}
          title={`إحصاءات الجلسة — ${kb('sessionStats')}`}
        >
          <i className="ti ti-cash pic-ic" />
          <div className="pos-chip-inner">
            <span className="pos-chip-label">مبيعات الجلسة</span>
            <strong className="pos-chip-val">{formatDZD(netSales)}</strong>
          </div>
        </div>

        {heldCount > 0 && (
          <div
            className="pos-chip b clickable"
            onClick={onHeld}
            title={`الفواتير المعلقة — ${kb('heldCarts')}`}
          >
            <i className="ti ti-clock-pause pic-ic" />
            <div className="pos-chip-inner">
              <span className="pos-chip-label">معلقة</span>
              <strong className="pos-chip-val">{heldCount}</strong>
            </div>
          </div>
        )}

        {!isEmpty && (
          <div className="pos-chip p" title="متوسط هامش الربح — السلة الحالية">
            <button
              onClick={e => { e.stopPropagation(); toggleMargin(); }}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', fontSize: 13, opacity: 0.6 }}
              title={showMargin ? 'إخفاء هامش الربح' : 'إظهار هامش الربح'}
              type="button"
            >
              <i className={`ti ti-eye${showMargin ? '' : '-off'}`} />
            </button>
            {showMargin && (
              <>
                <i className="ti ti-trending-up pic-ic" />
                <span className="pos-chip-label">هامش الربح</span>
                <strong className="pos-chip-val">{avgMargin.toFixed(1)}%</strong>
              </>
            )}
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

        {editingDocumentNumber && (
          <div className="pos-chip editing" title="جاري تعديل فاتورة" style={{ background: 'var(--y)', color: '#000', fontWeight: 700 }}>
            <i className="ti ti-edit pic-ic" style={{ color: '#000' }} />
            <div className="pos-chip-inner">
              <span className="pos-chip-label" style={{ color: '#000', opacity: 0.8 }}>تعديل فاتورة</span>
              <strong className="pos-chip-val" style={{ color: '#000' }}>{editingDocumentNumber}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="pos-actions-row">

        {priceLevels.length > 0 && (
          <div className="tarif-wrap" ref={tarifRef}>
            <button
              ref={btnRef}
              className={`btn btn-xs ${selectedPriceLevelId !== null ? 'btn-p' : ''}`}
              onClick={() => { if (showTarifDrop) { setShowTarifDrop(false); } else { openDrop(); } }}
              type="button"
              title="تغيير تعريفة السعر (تجزئة / نصف جملة / جملة)"
            >
              <i className="ti ti-tag" />
              <span className="tb-txt"> {selectedTarifLabel}</span>
              <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.6 }} />
            </button>

            {showTarifDrop && createPortal(
              <div className="tarif-drop" style={{ position: 'fixed', top: dropPos.top, left: dropPos.left }}>
                {priceLevels.map(pl => (
                  <button
                    key={pl.id}
                    className={`cmode ${selectedPriceLevelId === pl.id ? 'on' : ''}`}
                    onClick={() => { onPriceLevelChange(pl.id); setShowTarifDrop(false); }}
                    title={pl.discount_percent ? `خصم ${pl.discount_percent}%` : undefined}
                  >
                    {pl.name}
                    {pl.discount_percent
                      ? <span className="cmode-disc">-{pl.discount_percent}%</span>
                      : null
                    }
                  </button>
                ))}
                <button
                  className={`cmode ${selectedPriceLevelId === null ? 'on' : ''}`}
                  onClick={() => { onPriceLevelChange(null); setShowTarifDrop(false); }}
                  title="السعر الافتراضي"
                >
                  عادي
                </button>
              </div>,
              document.body
            )}
          </div>
        )}

        <span className="tb-sep" aria-hidden="true" />

        <button className="btn btn-xs" onClick={onNewSale} title="بيع جديد / تعليق">
          <i className="ti ti-plus" />
          <span className="tb-txt"> جديد</span>
          {kb('holdCart') && <span className="tb-txt"> {kb('holdCart')}</span>}
        </button>
        <button className="btn btn-xs" onClick={onReturn} title="مرتجع">
          <i className="ti ti-receipt-refund" />
          <span className="tb-txt"> مرتجع</span>
          {kb('returns') && <span className="tb-txt"> {kb('returns')}</span>}
        </button>
        <button className="btn btn-xs" onClick={onManual} title="إضافة يدوي">
          <i className="ti ti-keyboard" />
          <span className="tb-txt"> يدوي</span>
          {kb('manualProduct') && <span className="tb-txt"> {kb('manualProduct')}</span>}
        </button>
        <button
          className="btn btn-xs"
          onClick={onReceipt}
          disabled={isEmpty}
          title="معاينة الإيصال"
        >
          <i className="ti ti-printer" />
          {kb('preview') && <span className="tb-txt"> {kb('preview')}</span>}
        </button>

        <span className="tb-sep" aria-hidden="true" />

        <button
          className={`btn btn-xs ${showQuickbar ? 'btn-p' : ''}`}
          onClick={onToggleQuickbar}
          title="شريط المنتجات السريعة"
        >
          <i className="ti ti-pin" />
        </button>
        <button
          className="btn btn-xs"
          onClick={onOpenDrawer}
          title="فتح درج النقود"
        >
          <i className="ti ti-cash-banknote" />
          {kb('openDrawer') && <span className="tb-txt"> {kb('openDrawer')}</span>}
        </button>

        <span className="tb-sep" aria-hidden="true" />

        <button
          className={`btn btn-xs ${toastEnabled ? 'btn-p' : ''}`}
          onClick={onToggleToast}
          title={toastEnabled ? 'تعطيل الإشعارات' : 'تفعيل الإشعارات'}
        >
          <i className={`ti ${toastEnabled ? 'ti-bell' : 'ti-bell-off'}`} />
        </button>
        <button
          className={`btn btn-xs ${clearSearchOnAdd ? 'btn-p' : ''}`}
          onClick={onToggleClearSearch}
          title={clearSearchOnAdd ? 'إيقاف تفريغ البحث تلقائياً' : 'تفريغ البحث بعد كل إضافة'}
        >
          <i className={`ti ${clearSearchOnAdd ? 'ti-letter-case-toggle' : 'ti-letter-case'}`} />
        </button>

        <button
          className="btn btn-xs"
          onClick={onSettings}
          title="إعدادات POS"
        >
          <i className="ti ti-settings-2" />
        </button>
        <button
          className="btn btn-xs"
          onClick={onFullscreen}
          title={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
        >
          <i className={`ti ${isFullscreen ? 'ti-minimize' : 'ti-maximize'}`} />
          {kb('fullscreen') && <span className="tb-txt"> {kb('fullscreen')}</span>}
        </button>
        <button className="btn btn-xs" onClick={onKbHelp} title="اختصارات لوحة المفاتيح">
          <i className="ti ti-keyboard" />
          <span className="tb-txt"> {kb('kbHelp') || 'F1'}</span>
        </button>
        <button className="btn btn-xs" onClick={onKioskMode} title="وضع الكاشير">
          <i className="ti ti-device-ipad-horizontal" />
          <span className="tb-txt"> كاشير</span>
        </button>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/ProductCard.tsx

```
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ProductVariant, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, familyStyleFromName, isVariantOutOfStock } from '../utils/posHelpers';

interface ProductCardProps {
  variant:               ProductVariant;
  idx:                   number;
  qtyInCart:             number;
  highlighted:           boolean;
  isPinned:              boolean;
  priceLevels:           PriceLevel[];
  selectedPriceLevelId:  number | null;
  allowNegativeStock?:   boolean;
  showStock?:            boolean;
  priceDisplayMode?:     'ttc' | 'ht';
  onAdd:                 (v: ProductVariant, qty?: number) => void;
  onPin:                 (v: ProductVariant) => void;
  onHighlight?:          (idx: number) => void;
  onQty?:                (variantId: number, newQty: number) => void;
  searchQuery?:          string;
  scannedId?:            number | null;
  variantCount?:         number;
  lastSale?:             boolean;
}

const TAP_THRESHOLD = 300;

function highlightText(text: string, query: string): React.ReactNode[] {
  if (!query || query.length < 2) return [text];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let idx = lower.indexOf(q, lastIdx);
  let key = 0;
  while (idx !== -1) {
    if (idx > lastIdx) parts.push(text.slice(lastIdx, idx));
    parts.push(<mark key={key++} className="pcard-hl-text">{text.slice(idx, idx + query.length)}</mark>);
    lastIdx = idx + query.length;
    idx = lower.indexOf(q, lastIdx);
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length ? parts : [text];
}

function ProductCardInner({
  variant: v,
  idx,
  qtyInCart,
  highlighted,
  isPinned,
  priceLevels,
  selectedPriceLevelId,
  allowNegativeStock,
  showStock = true,
  priceDisplayMode = 'ttc',
  onAdd,
  onPin,
  onHighlight,
  onQty,
  searchQuery = '',
  scannedId,
  variantCount,
  lastSale,
}: ProductCardProps) {
  const priceHt  = getVariantPrice(v, selectedPriceLevelId, priceLevels);
  const tvaRate  = v.tva?.rate ?? 0;
  const priceTtc = priceHt * (1 + tvaRate / 100);

  const rawStock      = v.current_stock;
  const stock         = rawStock !== undefined ? Math.max(0, rawStock) : rawStock;
  const unknownStock  = rawStock === undefined;
  const outStock      = isVariantOutOfStock(v, allowNegativeStock);
  const negStock      = v.manages_stock && !unknownStock && (rawStock ?? 0) < 0;
  const lowStock      = v.manages_stock && !unknownStock && !negStock && (stock ?? 0) > 0 && (stock ?? 0) <= (v.min_stock_alert ?? 0);
  const lastPiece     = v.manages_stock && !unknownStock && !negStock && (stock ?? 0) > 0 && (stock ?? 0) <= 2 && !lowStock;

  const bestDiscount = useMemo(() => {
    const d = v.quantity_discounts?.filter(d => d.active !== false)
      .sort((a, b) => b.discount_percentage - a.discount_percentage)[0];
    return d && d.discount_percentage > 0 ? d : null;
  }, [v.quantity_discounts]);

  const isWholesalePrice = selectedPriceLevelId !== null &&
    priceLevels.length > 0 &&
    selectedPriceLevelId !== priceLevels[0]?.id;

  const style = familyStyleFromName(v.product?.family?.name ?? '');
  const imageUrl = v.image_url;

  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const showImage = Boolean(imageUrl) && !imgFailed;

  const [justAdded, setJustAdded] = useState(false);
  const addTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [flashing, setFlashing] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (scannedId && scannedId === v.id) {
      setFlashing(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashing(false), 1200);
    }
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); };
  }, [scannedId, v.id]);

  const [showInfo, setShowInfo] = useState(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStarted = useRef(false);
  const handlePointerDown = useCallback(() => {
    pressStarted.current = true;
    pressTimerRef.current = setTimeout(() => {
      if (pressStarted.current) setShowInfo(true);
    }, 500);
  }, []);
  const handlePointerUp = useCallback(() => {
    pressStarted.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  }, []);
  useEffect(() => {
    if (showInfo) {
      const close = () => setShowInfo(false);
      window.addEventListener('pointerdown', close);
      return () => window.removeEventListener('pointerdown', close);
    }
  }, [showInfo]);

  useEffect(() => {
    return () => {
      if (addTimerRef.current) clearTimeout(addTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  const lastTapRef = useRef(0);
  const handleAdd = useCallback((qty?: number) => {
    if (outStock) return;
    onAdd(v, qty);
    setJustAdded(true);
    if (addTimerRef.current) clearTimeout(addTimerRef.current);
    addTimerRef.current = setTimeout(() => setJustAdded(false), 450);
  }, [outStock, onAdd, v]);

  const handleClick = useCallback(() => {
    if (outStock) { onHighlight?.(idx); return; }
    const now = Date.now();
    if (now - lastTapRef.current < TAP_THRESHOLD) {
      handleAdd(2);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      handleAdd(1);
    }
  }, [outStock, handleAdd, onHighlight, idx]);

  const handleInc = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQty?.(v.id, qtyInCart + 1);
  }, [onQty, v.id, qtyInCart]);

  const handleDec = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (qtyInCart > 1) onQty?.(v.id, qtyInCart - 1);
    else onQty?.(v.id, 0);
  }, [onQty, v.id, qtyInCart]);

  const handleAddBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleAdd(1);
  }, [handleAdd]);

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPin(v);
  }, [onPin, v]);

  const inCart = qtyInCart > 0;

  return (
    <div
      data-hl-idx={idx}
      className={[
        'pcard',
        outStock && 'pcard-out',
        inCart && 'pcard-incart',
        highlighted && 'pcard-hl',
        isPinned && 'pcard-pinned',
        flashing && 'pcard-flash',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title={v.product?.name}
    >
      <div className={`pcard-img ${showImage && !imgLoaded ? 'pcard-img-loading' : ''}`} style={!showImage ? { background: style.bg } : undefined}>
        {showImage
          ? <img src={imageUrl} alt={v.product?.name} loading="lazy" onLoad={() => setImgLoaded(true)} onError={() => setImgFailed(true)} />
          : <i className={`ti ${style.icon}`} style={{ color: style.color, fontSize: 22 }} />
        }

        <div className="pcard-family-bar" style={{ background: style.color }} />

        {bestDiscount && <span className="pcard-discount-badge">-{bestDiscount.discount_percentage}%</span>}
        {isWholesalePrice && <span className="pcard-price-level-badge">جملة</span>}
        {inCart && <span className="pcard-in-cart" key={qtyInCart}>{qtyInCart}</span>}
        {outStock && <span className="pcard-out-badge">نفذ</span>}
        {negStock && !outStock && <span className="pcard-neg-badge">سالب</span>}
        {lowStock && !outStock && <span className="pcard-low-badge">قليل</span>}
        {lastPiece && <span className="pcard-last-badge">آخر قطعة</span>}
        {lastSale && !outStock && <span className="pcard-sale-badge"><i className="ti ti-bolt" /> تم البيع</span>}
        {variantCount != null && variantCount > 1 && (
          <span className="pcard-variant-badge">{variantCount} خيارات</span>
        )}
        {showStock && v.manages_stock && !unknownStock && (
          <span className={`pcard-stock-badge ${outStock ? 'out' : lowStock ? 'low' : negStock ? 'neg' : 'ok'}`}>
            {outStock ? '0' : stock}{v.unit?.abbreviation ? ` ${v.unit.abbreviation}` : ''}
          </span>
        )}
        {showStock && v.manages_stock && unknownStock && (
          <span className="pcard-stock-badge na">—</span>
        )}
      </div>

      <div className="pcard-body">
        <div className="pcard-name">
          {searchQuery ? highlightText(v.product?.name ?? '', searchQuery) : v.product?.name}
        </div>
        {v.barcode && <div className="pcard-bc">{v.barcode}</div>}

        <div className="pcard-prices">
          {priceDisplayMode === 'ht' ? (
            <span className="pcard-ttc">{formatDZD(priceHt)}</span>
          ) : (
            <>
              <span className="pcard-ttc">{formatDZD(priceTtc)}</span>
              {tvaRate > 0 && <span className="pcard-ht">HT: {formatDZD(priceHt)}</span>}
            </>
          )}
        </div>
      </div>

      <div className="pcard-actions">
        <button
          className={`pcard-pin ${isPinned ? 'on' : ''}`}
          onClick={handlePin}
          title={isPinned ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <i className={`ti ti-star${isPinned ? '-filled' : ''}`} />
        </button>

        {inCart && onQty ? (
          <div className="pcard-qty-ctrl">
            <button className="pcard-qty-btn" onClick={handleDec} title="تقليل">
              <i className="ti ti-minus" />
            </button>
            <span className="pcard-qty-val" key={qtyInCart}>{qtyInCart}</span>
            <button className="pcard-qty-btn pcard-qty-inc" onClick={handleInc} title="زيادة" disabled={outStock}>
              <i className="ti ti-plus" />
            </button>
          </div>
        ) : (
          <button
            className="pcard-add"
            onClick={handleAddBtn}
            disabled={outStock}
            title="إضافة للسلة"
          >
            <i className={`ti ${justAdded ? 'ti-check' : 'ti-plus'}`} />
          </button>
        )}
      </div>

      {showInfo && (
        <div className="pcard-info-popover">
          <div className="pcard-info-row"><span className="pcard-info-label">المراجع:</span> {v.ref}</div>
          {v.barcode && <div className="pcard-info-row"><span className="pcard-info-label">الباركود:</span> {v.barcode}</div>}
          {v.product?.family?.name && <div className="pcard-info-row"><span className="pcard-info-label">العائلة:</span> {v.product.family.name}</div>}
          {bestDiscount && <div className="pcard-info-row"><span className="pcard-info-label">الخصم:</span> <span style={{color:'var(--red)'}}>{bestDiscount.discount_percentage}%</span></div>}
          {v.product?.description && <div className="pcard-info-row pcard-info-desc">{v.product.description}</div>}
        </div>
      )}
    </div>
  );
}

const ProductCard = React.memo(ProductCardInner, (prev, next) => {
  return prev.variant.id === next.variant.id
    && prev.idx === next.idx
    && prev.qtyInCart === next.qtyInCart
    && prev.highlighted === next.highlighted
    && prev.isPinned === next.isPinned
    && prev.selectedPriceLevelId === next.selectedPriceLevelId
    && prev.allowNegativeStock === next.allowNegativeStock
    && prev.showStock === next.showStock
    && prev.priceDisplayMode === next.priceDisplayMode
    && prev.searchQuery === next.searchQuery
    && prev.scannedId === next.scannedId
    && prev.variantCount === next.variantCount
    && prev.lastSale === next.lastSale
    && prev.priceLevels === next.priceLevels
    && prev.onAdd === next.onAdd
    && prev.onPin === next.onPin
    && prev.onHighlight === next.onHighlight
    && prev.onQty === next.onQty;
});

export default ProductCard;

```

## FILE: ./resources/js/pos/components/ProductGrid.tsx

```
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProductVariant, PriceLevel, CartItem } from '@/types';
import type { ViewMode, GridSize } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { getVariantPrice, isVariantOutOfStock } from '../utils/posHelpers';
import ProductCard from './ProductCard';

interface ProductGridProps {
  variants: ProductVariant[];
  view: ViewMode;
  gridSize: GridSize;
  loading: boolean;
  onAdd: (v: ProductVariant, qty?: number) => void;
  onAddManual: () => void;
  onPin: (v: ProductVariant) => void;
  isPinned: (variantId: number) => boolean;
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  cartItems: CartItem[];
  allowNegativeStock?: boolean | undefined;
  showStock?: boolean;
  priceDisplayMode?: 'ttc' | 'ht';
  highlightedIndex?: number;
  onHighlightIndexChange?: (idx: number) => void;
  onQty?: (variantId: number, newQty: number) => void;
  searchQuery?: string;
  scannedId?: number | null;
  lastSaleIds?: Set<number>;
}

type RowItem = { variant: ProductVariant; idx: number };

const MIN_CARD_WIDTH: Record<GridSize, number> = { xs: 100, sm: 130, md: 165, lg: 200 };
const ROW_ESTIMATE: Record<GridSize, number> = { xs: 150, sm: 195, md: 255, lg: 300 };
const MAX_COLS: Record<GridSize, number> = { xs: 8, sm: 6, md: 5, lg: 4 };
const GRID_GAP: Record<GridSize, number> = { xs: 6, sm: 8, md: 10, lg: 12 };

export default function ProductGrid({
  variants, view, gridSize, loading, onAdd, onAddManual,
  onPin, isPinned, priceLevels, selectedPriceLevelId, cartItems, allowNegativeStock,
  showStock = true, priceDisplayMode = 'ttc',
  highlightedIndex, onHighlightIndexChange, onQty,
  searchQuery = '', scannedId, lastSaleIds,
}: ProductGridProps) {
  const inCartQty = useCallback((variantId: number) => {
    return cartItems.find(i => i.variant_id === variantId)?.quantity ?? 0;
  }, [cartItems]);

  const variantCountByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of variants) {
      const pid = v.product_id;
      map.set(pid, (map.get(pid) ?? 0) + 1);
    }
    return map;
  }, [variants]);

  // ── Grid view (virtualised) ──────────────────────────────────────────────
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  useLayoutEffect(() => {
  if (view !== 'grid') return;
  const el = gridWrapRef.current;
  if (!el) return;
  const minW = MIN_CARD_WIDTH[gridSize];
  const calc = () => {
    const w = el.clientWidth;
    if (w <= 0) return;
    setColumns(Math.min(MAX_COLS[gridSize], Math.max(1, Math.floor(w / minW))));
  };
  calc();
  const obs = new ResizeObserver(calc);
  obs.observe(el);
  return () => obs.disconnect();
  }, [view, gridSize, loading]);

  const rows = useMemo(() => {
    if (view !== 'grid' || columns < 1) return [] as RowItem[][];
    const r: RowItem[][] = [];
    for (let i = 0; i < variants.length; i += columns) {
      const row: RowItem[] = [];
      for (let j = 0; j < columns && i + j < variants.length; j++) {
        row.push({ variant: variants[i + j], idx: i + j });
      }
      r.push(row);
    }
    return r;
  }, [variants, columns, view]);

  const rowCount = rows.length;
  const rowH = ROW_ESTIMATE[gridSize];

  // Virtualizer — estimateSize is only the *initial* guess; measureElement
  // (passed as a ref on each row below) makes react-virtual re-measure the
  // real rendered height of every row, so rows never overlap and never
  // leave oversized gaps, regardless of gridSize or content changes.
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowH,
    overscan: 3,
  });

  // Re-measure rows on size preset change (useLayoutEffect to avoid paint flash)
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [gridSize, columns, rowVirtualizer]);

  const prevHl = useRef<number | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlightedIndex === undefined || highlightedIndex === prevHl.current) return;
    prevHl.current = highlightedIndex;
    if (view === 'grid') {
      const rowIdx = Math.floor(highlightedIndex / columns);
      rowVirtualizer.scrollToIndex(rowIdx, { align: 'nearest' });
    } else if (view === 'list') {
      listRef.current?.querySelector<HTMLElement>(`[data-hl-idx="${highlightedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, columns, view, rowVirtualizer]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="pos-grid-area">
      <div className="pos-loading">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="pos-skel" style={{ animationDelay: `${i * 0.04}s` }} />
        ))}
      </div>
    </div>
  );

  // ── Empty ────────────────────────────────────────────────────────────────
  if (!variants.length) return (
    <div className="pos-grid-area">
      <div className="pos-empty">
        <div className="pos-empty-ico">
          <i className={`ti ${searchQuery ? 'ti-search' : 'ti-package-off'}`} />
        </div>
        <div className="pos-empty-ttl">{searchQuery ? 'لا توجد نتائج' : 'لا توجد منتجات'}</div>
        <div className="pos-empty-sub">
          {searchQuery
            ? <>لا توجد منتجات تطابق "<strong>{searchQuery}</strong>"</>
            : 'جرّب البحث بكلمة أخرى أو أضف منتجاً يدوياً'
          }
        </div>
        {!searchQuery && (
          <button className="btn btn-sm" onClick={onAddManual}>
            <i className="ti ti-plus" /> إضافة يدوية
          </button>
        )}
      </div>
    </div>
  );

  // ── List view (not virtualised — ~3 500 DOM nodes, acceptable) ──────────
  if (view === 'list') {
    return (
      <div className="pos-grid-area" ref={listRef}>
        <table className="pos-ptable">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الوحدة</th>
              {priceDisplayMode !== 'ht' && <th>السعر HT</th>}
              <th>TVA</th>
              <th>{priceDisplayMode === 'ht' ? 'السعر HT' : 'السعر TTC'}</th>
              {showStock && <th>مخزون</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v, idx) => {
              const priceHt   = getVariantPrice(v, selectedPriceLevelId, priceLevels);
              const tvaRate   = v.tva?.rate ?? 19;
              const priceTtc  = priceHt * (1 + tvaRate / 100);
              const inCart    = inCartQty(v.id);
              const stockVal  = v.current_stock;
              const unknownSt = stockVal === undefined;
              const outStock  = isVariantOutOfStock(v, allowNegativeStock);
              const lowStock  = v.manages_stock && !unknownSt && (stockVal ?? 0) > 0 && (stockVal ?? 0) <= (v.min_stock_alert ?? 0);
              const lastPiece = v.manages_stock && !unknownSt && (stockVal ?? 0) > 0 && (stockVal ?? 0) <= 2 && !lowStock;
              return (
                <tr
                  key={v.id}
                  data-hl-idx={idx}
                  className={`prow ${outStock ? 'prow-out' : ''} ${inCart > 0 ? 'prow-incart' : ''} ${highlightedIndex === idx ? 'prow-hl' : ''}`}
                  onClick={() => onHighlightIndexChange?.(idx)}
                  onDoubleClick={() => !outStock && onAdd(v)}
                >
                  <td className="prow-name">
                    <div className="prow-name-inner">
                      {inCart > 0 && <span className="prow-incart-qty">{inCart}</span>}
                      <div className="prow-nm">{v.product?.name}</div>
                    </div>
                    {v.barcode && <div className="prow-bc">{v.barcode}</div>}
                  </td>
                  <td className="prow-unit">{v.unit?.abbreviation ?? '—'}</td>
                  {priceDisplayMode !== 'ht' && <td className="prow-price">{formatDZD(priceHt)}</td>}
                  <td className="prow-tva">{tvaRate}%</td>
                  <td className="prow-ttc">{formatDZD(priceDisplayMode === 'ht' ? priceHt : priceTtc)}</td>
                  {showStock && (
                    <td className="prow-stock">
                      {v.manages_stock && !unknownSt
                        ? <span className={`stock-pill ${outStock ? 'out' : lowStock ? 'low' : lastPiece ? 'last' : 'ok'}`}>{stockVal ?? 0}</span>
                        : <span className="stock-pill na">—</span>
                      }
                    </td>
                  )}
                  <td>
                    <div className="prow-acts">
                      {inCart > 0 && <span className="incart-badge">{inCart}</span>}
                      <button className={`prow-pin${isPinned(v.id) ? ' on' : ''}`} onClick={e => { e.stopPropagation(); onPin(v); }}
                        title={isPinned(v.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}>
                        <i className={`ti ti-star${isPinned(v.id) ? '-filled' : ''}`} />
                      </button>
                      <button className="prow-add" onClick={() => !outStock && onAdd(v)}
                        disabled={outStock} title="إضافة للسلة (دبل كليك)">
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

  // ── Grid view (virtualised) ──────────────────────────────────────────────
  const gridMod = gridSize === 'xs' ? 'pgrid--xs' : gridSize === 'sm' ? 'pgrid--sm' : gridSize === 'lg' ? 'pgrid--lg' : '';
  const gap = GRID_GAP[gridSize];
  const colBasis = `calc((100% - ${(columns - 1) * gap}px) / ${columns})`;

  return (
    <div
      key={gridSize}
      className={`pos-grid-area pgrid ${gridMod}`}
      ref={scrollRef}
      style={{ overflow: 'auto', display: 'block' }}
    >
      <div ref={gridWrapRef} style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowData = rows[virtualRow.index];
          if (!rowData) return null;
          return (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'flex',
                gap,
                padding: gap,
                direction: 'rtl',
              }}
            >
              {rowData.map(item => (
                <div
                  key={item.variant.id}
                  style={{ flex: `0 0 ${colBasis}`, maxWidth: colBasis, minWidth: 0 }}
                >
                  <ProductCard
                    variant={item.variant}
                    idx={item.idx}
                    qtyInCart={inCartQty(item.variant.id)}
                    highlighted={highlightedIndex === item.idx}
                    isPinned={isPinned(item.variant.id)}
                    priceLevels={priceLevels}
                    selectedPriceLevelId={selectedPriceLevelId}
                    allowNegativeStock={allowNegativeStock}
                    showStock={showStock}
                    priceDisplayMode={priceDisplayMode}
                    onAdd={onAdd}
                    onPin={onPin}
                    onHighlight={onHighlightIndexChange}
                    onQty={onQty}
                    searchQuery={searchQuery}
                    scannedId={scannedId}
                    variantCount={variantCountByProduct.get(item.variant.product_id)}
                    lastSale={lastSaleIds?.has(item.variant.id)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/ProductSearchBar.tsx

```
import React, { useState, useRef, useEffect } from 'react';
import type { ViewMode, GridSize, SortMode } from '../utils/posHelpers';
import { getEffectiveShortcut, useKbOverrides } from '../hooks/useKeyboardMap';

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
  highlightedIndex?: number;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onEscape?: () => void;
  keyboardNavEnabled?: boolean;
  slug?: string | null;
}

export default function ProductSearchBar({
  query, onQuery, view, gridSize, onView, onGridSize,
  onFilter, filterActive, inputRef, sortBy, onSort, resultsCount, onEnterFirst,
  highlightedIndex, onArrowUp, onArrowDown, onEscape, keyboardNavEnabled, slug,
}: ProductSearchBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const _overrides = useKbOverrides(slug ?? null);
  const kb = (action: string) => getEffectiveShortcut(slug ?? null, action) ?? '';

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
          placeholder={`ابحث بالاسم أو الباركود أو الرمز... (${kb('searchFocus')})`}
          autoComplete="off"
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onEnterFirst(); }
            if (e.key === 'Escape') { e.preventDefault(); if (onEscape) onEscape(); else onQuery(''); }
            if (keyboardNavEnabled && onArrowUp && e.key === 'ArrowUp') { e.preventDefault(); onArrowUp(); }
            if (keyboardNavEnabled && onArrowDown && e.key === 'ArrowDown') { e.preventDefault(); onArrowDown(); }
          }}
        />
        {query && (
          <button className="srch-clear" onClick={() => onQuery('')} title="مسح (Escape)">
            <i className="ti ti-x" />
          </button>
        )}
        {!query && (
          <span className="srch-hint"><kbd>{kb('searchFocus')}</kbd></span>
        )}
      </div>

      {query && (
        <span className="srch-count">{resultsCount} نتيجة</span>
      )}
      {query && keyboardNavEnabled && highlightedIndex !== undefined && resultsCount > 0 && (
        <span className="srch-pos" style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700, direction: 'ltr' }}>
          {highlightedIndex + 1}/{resultsCount}
        </span>
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
        title={`فلتر متقدم — ${kb('filter')}`}
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

## FILE: ./resources/js/pos/components/ProfessionalCart.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalCart.tsx
//
// ✅ التحسينات عن النسخة السابقة:
//   1. زر "جديد" بجانب اختيار الزبون → يفتح CustomerSearchModal
//      (بحث فوري + إنشاء زبون مباشرة من POS)
//   2. onDiscountAmount مُمرَّر لـ CartRow (خصم ثابت بالمبلغ)
//   3. عرض رصيد الزبون بشكل أوضح مع لون تحذيري
//   4. شريط الخصومات على الفاتورة يقبل الآن % أو مبلغ ثابت
//
// ✅ تصحيحات هذه النسخة (تدقيق الأزرار):
//   5. حُذف زر 🔍 "بحث أو إنشاء زبون جديد" المكرر — كان يفتح نفس المودال
//      بالضبط الذي يفتحه النقر على صندوق الزبون نفسه (client-trigger-v2).
//      الآن يوجد مدخل واحد فقط لفتح CustomerSearchModal.
//   6. أُضيف زر "تراجع" (undo) بجانب زر المسح مباشرة — يعالج فجوة أمان
//      حقيقية: مسح السلة (بالزر أو بـ F12) كان عملية نهائية بدون أي طريقة
//      للاسترجاع. الآن onClear يحفظ نسخة تلقائياً (من POSPage) ويمكن
//      استرجاعها بضغطة واحدة، أو Ctrl+Z.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import { getEffectiveShortcut } from '../hooks/useKeyboardMap';
import CartRow from './CartRow';
import CustomerSearchModal from './CustomerSearchModal';

interface ProfessionalCartProps {
  items:                CartItem[];
  totals:               CartTotals;
  client:               Party | null;
  note:                 string;
  selectedItemId:       string | null;
  onSelectItem:         (id: string | null) => void;
  onQty:                (id: string, qty: number) => void;
  onDiscount:           (id: string, pct: number) => void;
  onDiscountAmount:     (id: string, amount: number) => void;
  onPrice:              (id: string, price: number) => void;
  onRemove:             (id: string) => void;
  onSetClient:          (c: Party | null) => void;
  onNoteChange:         (n: string) => void;
  onHold:               () => void;
  onSell:               () => void;
  onClear:              () => void;
  onHeld:               () => void;
  totalTtcFinal:        number;
  remainingToPay:       number;
  invoiceDiscountPct?:  number;
  onInvoiceDiscountChange?: (pct: number) => void;
  invoiceDiscountAmount?:   number;
  onUndoClear:          () => void;
  canUndoClear:         boolean;
  undoClearSecondsLeft?: number;
  clientBalance?:       number;
  slug?:                string | null;
  cartRef?:             React.RefObject<HTMLDivElement>;
  onClientModalClose?:  () => void;
}

/** واجهة برمجية للتحكم بالسلة من المكوّن الأب (POSPage) — بديل عن querySelectorAll */
export interface ProfessionalCartHandle {
  /** تمرير السلة إلى موقع صنف معيّن وتركيزه */
  scrollToItemId: (itemId: string) => void;
  /** فتح مودال اختيار الزبون */
  openCustomerModal: () => void;
}

// كثافة عرض صفوف السلة — مفتاح حفظ محلي مستقل عن الشركة (تفضيل جهاز/كاشير)
const CART_DENSITY_KEY = 'pos-cart-density';
type CartDensity = 'comfortable' | 'compact';

const CART_ZOOM_KEY = 'pos-cart-zoom';
type CartZoom = 0.75 | 0.875 | 1 | 1.125 | 1.25;

const ProfessionalCart = forwardRef<ProfessionalCartHandle, ProfessionalCartProps>(function ProfessionalCart({
  items, totals, client,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
  onSetClient, onNoteChange,
  onHold, onSell, onClear, onHeld, totalTtcFinal, remainingToPay,
  invoiceDiscountPct = 0, onInvoiceDiscountChange, invoiceDiscountAmount = 0,
  onUndoClear, canUndoClear, undoClearSecondsLeft = 0, clientBalance, slug, cartRef, onClientModalClose,
}, ref) {

  const [showNote,         setShowNote]         = useState(false);
  const [showCustModal,    setShowCustModal]     = useState(false);
  const [invDiscMode,      setInvDiscMode]       = useState<'pct' | 'amount'>('pct');
  const [invDiscAmtVal,    setInvDiscAmtVal]     = useState('');

  useEffect(() => {
    if (!invoiceDiscountPct || invoiceDiscountPct <= 0) setInvDiscAmtVal('');
  }, [invoiceDiscountPct]);

  // ── طيّ تفاصيل الحساب ─────────────────────────────────────────────────────
  // افتراضياً مطوي (يظهر فقط سطر الإجمالي TTC) لتحرير مساحة رأسية دائمة
  // لصالح قائمة الأصناف — التفاصيل (HT/TVA/الخصومات/رصيد الزبون) تظهر
  // فقط عند الحاجة الفعلية (تعديل خصم الفاتورة، أو مراجعة قبل الدفع).
  // الحالة محفوظة في localStorage لاستمرار التفضيل بين الجلسات.
  const [showTotalsDetails, setShowTotalsDetails] = useState(() => {
    try { return localStorage.getItem('pos-cart-totals-open') === '1'; }
    catch { return false; }
  });
  const toggleTotals = useCallback(() => {
    setShowTotalsDetails(prev => {
      const next = !prev;
      try { localStorage.setItem('pos-cart-totals-open', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // ── كثافة عرض السلة (مريح / مضغوط) ────────────────────────────────────────
  // مضغوط: صف واحد بارتفاع ~34px لكل صنف بدل ~70-90px، فيظهر عدد أكبر
  // بكثير من المنتجات دفعة واحدة دون تمرير — مفيد جداً للفواتير الكبيرة.
  //
  // سلوك تلقائي ذكي: إذا لم يسبق للمستخدم اختيار الكثافة يدوياً (لا يوجد
  // تفضيل محفوظ في localStorage)، تتحوّل الكثافة تلقائياً إلى "مضغوط"
  // بمجرد أن يتجاوز عدد أصناف السلة 7، وترجع "مريح" عندما يقل العدد عن
  // ذلك مجدداً. أما بمجرد أن يضغط المستخدم الزر مرة واحدة يدوياً، يُحفَظ
  // اختياره ويُحترَم نهائياً (لا يُبدَّل تلقائياً بعد ذلك أبداً).
  const manualDensityRef = useRef(false);
  const [density, setDensityState] = useState<CartDensity>('comfortable');

  useEffect(() => {
    try {
      const v = localStorage.getItem(CART_DENSITY_KEY);
      if (v === 'compact' || v === 'comfortable') {
        manualDensityRef.current = true;
        setDensityState(v);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (manualDensityRef.current) return;
    setDensityState(items.length >= 7 ? 'compact' : 'comfortable');
  }, [items.length]);

  const toggleDensity = useCallback(() => {
    manualDensityRef.current = true;
    setDensityState(prev => {
      const next: CartDensity = prev === 'compact' ? 'comfortable' : 'compact';
      try { localStorage.setItem(CART_DENSITY_KEY, next); } catch {}
      return next;
    });
  }, []);

  // ── تكبير/تصغير حجم النص وعرض الأسطر في السلة ────────────────────────────
  // النطاق: 0.75 (صغير جداً) → 1.25 (كبير). القيمة الافتراضية 1 (عادي).
  // يُطبق كـ CSS variable `--cart-zoom` على عنصر .pos-cart ويؤثر على
  // font-size, padding, gap لكل العناصر الداخلية بنسبة الضرب.
  const ZOOM_STEPS: CartZoom[] = [0.75, 0.875, 1, 1.125, 1.25];
  const [cartZoom, setCartZoom] = useState<CartZoom>(() => {
    try {
      const v = parseFloat(localStorage.getItem(CART_ZOOM_KEY) ?? '');
      return ZOOM_STEPS.includes(v as CartZoom) ? v as CartZoom : 1;
    } catch { return 1; }
  });
  const saveZoom = useCallback((z: CartZoom) => {
    setCartZoom(z);
    try { localStorage.setItem(CART_ZOOM_KEY, String(z)); } catch {}
  }, []);
  const zoomIn = useCallback(() => {
    const i = ZOOM_STEPS.indexOf(cartZoom);
    if (i < ZOOM_STEPS.length - 1) saveZoom(ZOOM_STEPS[i + 1]);
  }, [cartZoom, saveZoom]);
  const zoomOut = useCallback(() => {
    const i = ZOOM_STEPS.indexOf(cartZoom);
    if (i > 0) saveZoom(ZOOM_STEPS[i - 1]);
  }, [cartZoom, saveZoom]);

  const kb = (action: string) => getEffectiveShortcut(slug ?? null, action) ?? '';

  // ── افتراضية قائمة الأصناف (virtualization) ──────────────────────────────
  // نفس نمط ProductGrid: حاوية تمرير ثابتة + قياس ديناميكي لكل صف
  // (measureElement) لأن ارتفاع CartRow يختلف حسب الكثافة ووجود خصم.
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const nodeMap       = useRef(new Map<string, HTMLDivElement>());

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => cartScrollRef.current,
    estimateSize: () => (density === 'compact' ? 38 : 82),
    overscan: 8,
  });

  // إعادة قياس الكل عند تبدّل الكثافة
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [density, rowVirtualizer]);

  const registerRowNode = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeMap.current.set(id, el);
    else nodeMap.current.delete(id);
  }, []);

  const isEmpty = !items.length;

  const totalQty = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    [items]
  );

  useImperativeHandle(ref, () => ({
    scrollToItemId: (id: string) => {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return;
      rowVirtualizer.scrollToIndex(idx, { align: 'auto' });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          nodeMap.current.get(id)?.focus();
        });
      });
    },
    openCustomerModal: () => setShowCustModal(true),
  }), [items, rowVirtualizer]);

  const handleInvDiscAmount = useCallback((raw: string) => {
    setInvDiscAmtVal(raw);
    const n = parseFloat(raw) || 0;
    if (!onInvoiceDiscountChange) return;

    // Invoice discount is applied at HT level (calcTotals: invoiceDiscountAmount = totalHt * pct / 100).
    // Reverse-engineer original HT before discount to compute the correct percentage.
    const curHt       = totals.total_ht ?? 0;
    const curDiscHt   = totals.invoice_discount_amount ?? 0;
    const origHt      = curHt + curDiscHt;

    if (origHt <= 0) return;
    const pct = Math.min(100, (n / origHt) * 100);
    onInvoiceDiscountChange(pct);
  }, [onInvoiceDiscountChange, totals.total_ht, totals.invoice_discount_amount]);

  return (
    <>
      <div className="pos-cart" id="pos-cart" ref={cartRef} tabIndex={-1} style={{ '--cart-zoom': cartZoom } as React.CSSProperties}>

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
              <button
                className="btn btn-xs"
                onClick={zoomOut}
                disabled={cartZoom <= 0.75}
                title={`تصغير النص — ${kb('zoomOut')}`}
              >
                <i className="ti ti-minus" />
              </button>
              <button
                className="btn btn-xs"
                onClick={zoomIn}
                disabled={cartZoom >= 1.25}
                title={`تكبير النص — ${kb('zoomIn')}`}
              >
                <i className="ti ti-plus" />
              </button>
              <button
                className={`btn btn-xs density-toggle-btn ${density === 'compact' ? 'on' : ''}`}
                onClick={toggleDensity}
                title={density === 'compact' ? 'التبديل لعرض مريح (بطاقات أكبر)' : 'التبديل لعرض مضغوط (منتجات أكثر بدون تمرير)'}
                type="button"
              >
                <i className={`ti ${density === 'compact' ? 'ti-list-details' : 'ti-list'}`} />
              </button>
              <button className="btn btn-xs" onClick={onHeld} title="الفواتير المعلقة">
                <i className="ti ti-clock-pause" />
                {kb('heldCarts') && <span className="tb-txt"> {kb('heldCarts')}</span>}
              </button>
              <button
                className={`btn btn-xs ${note ? 'btn-p' : ''}`}
                onClick={() => setShowNote(s => !s)}
                title="ملاحظة على الفاتورة"
              >
                <i className="ti ti-notes" />
              </button>
              <button
                className={`btn btn-xs btn-warn ${undoClearSecondsLeft > 0 ? 'btn-pulse' : ''}`}
                onClick={onUndoClear}
                disabled={!canUndoClear}
                title={`تراجع عن آخر مسح — ${kb('undoClear')}${undoClearSecondsLeft > 0 ? ` (${undoClearSecondsLeft}s)` : ''}`}
              >
                <i className="ti ti-arrow-back-up" />
                {undoClearSecondsLeft > 0 && <span className="undo-ct">{undoClearSecondsLeft}</span>}
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={onClear}
                disabled={isEmpty}
                title="مسح السلة"
              >
                <i className="ti ti-trash" />
                {kb('clearCart') && <span className="tb-txt"> {kb('clearCart')}</span>}
              </button>
            </div>
          </div>

          <div className={`cart-hero ${isEmpty ? '' : 'has-items'}`}>
            <div className="ch-top">
              <span className="ch-label"><i className="ti ti-wallet" /> الإجمالي المستحق</span>
              <span className="ch-badge">{totalQty % 1 === 0 ? totalQty : totalQty.toFixed(2)} قطعة</span>
            </div>
            <div className="ch-amount">{formatDZD(totalTtcFinal)}</div>
            {/* <div className="ch-stats">
              <div className="ch-stat">
                <span className="ch-stat-v">{items.length}</span>
                <span className="ch-stat-l">صنف</span>
              </div>
              <div className="ch-stat">
                <span className="ch-stat-v">{formatDZD(totals.total_ht)}</span>
                <span className="ch-stat-l">HT</span>
              </div>
              <div className="ch-stat">
                <span className="ch-stat-v">{formatDZD(totals.total_tva)}</span>
                <span className="ch-stat-l">TVA</span>
              </div>
            </div> */}
            {/* <div className={`pay-status ${
              isEmpty ? 'pay-status--empty' : (remainingToPay <= 0 ? 'pay-status--ok' : 'pay-status--change')
            }`}>
              <i className={`ti ${isEmpty ? 'ti-shopping-cart-off' : (remainingToPay <= 0 ? 'ti-circle-check' : 'ti-clock')}`} />
              {isEmpty ? 'السلة فارغة' : (remainingToPay <= 0 ? 'جاهز للدفع' : 'بانتظار الإتمام')}
            </div> */}
            {!isEmpty && !showTotalsDetails && (
              <button type="button" className="ch-more-btn" onClick={toggleTotals}>
                تفاصيل إضافية
                <i className="ti ti-chevron-up" style={{ fontSize: 13 }} />
              </button>
            )}

            {!isEmpty && showTotalsDetails && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4, fontSize: 11 }}>
                {/* يمين: الرصيد */}
                {client !== null && clientBalance !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 500 }}>الرصيد السابق</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: clientBalance >= 0 ? '#fca5a5' : '#86efac' }}>
                      {formatDZD(clientBalance)}
                    </span>
                    <i className="ti ti-arrow-left" style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }} />
                    <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 500 }}>الرصيد الجديد</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>
                      {formatDZD(clientBalance + totalTtcFinal)}
                    </span>
                  </div>
                )}

                {/* وسط: مرونة */}
                <div style={{ flex: 1 }} />

                {/* يسار: خصم الفاتورة */}
                {onInvoiceDiscountChange && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 500 }}>خصم</span>
                    <button
                      onClick={() => setInvDiscMode('pct')}
                      type="button"
                      style={{
                        fontSize: 10, padding: '2px 5px', borderRadius: 3, border: '1px solid rgba(255,255,255,.2)',
                        background: invDiscMode === 'pct' ? 'rgba(255,255,255,.2)' : 'transparent',
                        color: '#fff', cursor: 'pointer', fontWeight: 600,
                      }}
                    >%</button>
                    <button
                      onClick={() => setInvDiscMode('amount')}
                      type="button"
                      style={{
                        fontSize: 10, padding: '2px 5px', borderRadius: 3, border: '1px solid rgba(255,255,255,.2)',
                        background: invDiscMode === 'amount' ? 'rgba(255,255,255,.2)' : 'transparent',
                        color: '#fff', cursor: 'pointer', fontWeight: 600,
                      }}
                    >دج</button>
                    <input
                      type="number"
                      value={invDiscMode === 'pct' ? (invoiceDiscountPct || '') : invDiscAmtVal}
                      onChange={e => {
                        if (invDiscMode === 'pct') {
                          onInvoiceDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)));
                        } else {
                          handleInvDiscAmount(e.target.value);
                        }
                      }}
                      min={0}
                      placeholder="0"
                      style={{
                        width: 48, textAlign: 'center', fontSize: 12, fontWeight: 700,
                        background: 'rgba(255,255,255,.12)', color: '#fff',
                        border: '1px solid rgba(255,255,255,.2)', borderRadius: 3,
                      }}
                    />
                    <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>
                      {invDiscMode === 'pct' ? '%' : 'دج'}
                    </span>
                    {((invDiscMode === 'pct' && invoiceDiscountAmount > 0) || (invDiscMode === 'amount' && parseFloat(invDiscAmtVal) > 0)) && (
                      <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 700 }}>
                        -{formatDZD(invoiceDiscountAmount)}
                      </span>
                    )}
                    <button
                      onClick={toggleTotals}
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', padding: '0 2px', fontSize: 13, display: 'flex' }}
                      title="إخفاء التفاصيل"
                    >
                      <i className="ti ti-eye-off" />
                    </button>
                  </div>
                )}
              </div>
            )}
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

          <div className="cart-client-v2">
            <div
              className={`client-trigger-v2 ${client ? 'has-client' : ''}`}
              onClick={() => setShowCustModal(true)}
              title="اختيار أو تغيير الزبون — بحث أو إنشاء زبون جديد"
            >
              <div className="ctv2-av">
                {client
                  ? <span>{(client.name?.[0] ?? '?').toUpperCase()}</span>
                  : <i className="ti ti-user" />
                }
              </div>
              <div className="ctv2-info">
                <div className="ctv2-name">
                  {client ? client.name : 'زبون عابر'}
                </div>
                {client?.phone && (
                  <div className="ctv2-meta">
                    <i className="ti ti-phone" style={{ fontSize: 10 }} /> {client.phone}
                  </div>
                )}
              </div>

              {client?.balance !== undefined && Number(client.balance) > 0 && (
                <span className="ctv2-debt" title={`رصيد الدين: ${formatDZD(Number(client.balance))}`}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 11 }} />
                  {formatDZD(Number(client.balance))}
                </span>
              )}

              <i className="ti ti-chevron-down ctv2-arrow" />
            </div>

            {client && (
              <div className="ctv2-actions">
                <button
                  className="btn btn-xs btn-r"
                  onClick={() => onSetClient(null)}
                  title="إلغاء اختيار الزبون"
                  type="button"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="cart-items"
          ref={cartScrollRef}
          style={{ overflow: 'auto', flexShrink: 0 }}
        >
          {isEmpty ? (
            <div className="cart-empty">
              <div className="ce-ico"><i className="ti ti-shopping-cart-off" /></div>
              <div className="ce-ttl">السلة فارغة</div>
              <div className="ce-sub">ابحث عن منتج أو امسح الباركود</div>
            </div>
          ) : (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', flexShrink: 0, width: '100%' }}>
              {rowVirtualizer.getVirtualItems().map(vRow => {
                const item = items[vRow.index];
                if (!item) return null;
                return (
                  <div
                    key={item.id}
                    data-index={vRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%',
                      transform: `translateY(${vRow.start}px)`,
                    }}
                  >
                    <CartRow
                      item={item}
                      idx={vRow.index}
                      isSelected={selectedItemId === item.id}
                      onSelect={() => onSelectItem(item.id)}
                      onQty={qty => onQty(item.id, qty)}
                      onDiscount={pct => onDiscount(item.id, pct)}
                      onDiscountAmount={amount => onDiscountAmount(item.id, amount)}
                      onPrice={price => onPrice(item.id, price)}
                      onRemove={() => onRemove(item.id)}
                      density={density}
                      registerNode={registerRowNode}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cart-actions">
          <button
            className="btn btn-sm"
            onClick={onHold}
            disabled={isEmpty}
            title="تعليق الفاتورة"
          >
            <i className="ti ti-clock-pause" /> تعليق
            {kb('holdCart') && <span className="tb-txt"> {kb('holdCart')}</span>}
          </button>
          <button
            className="cart-sell-btn"
            onClick={onSell}
            disabled={isEmpty}
            title={`دفع والإتمام — ${kb('payment')}`}
          >
            <i className="ti ti-circle-check" />
            <span>
              {isEmpty ? 'السلة فارغة' : (
                remainingToPay <= 0
                  ? 'مدفوعة ✓'
                  : `دفع — ${formatDZD(remainingToPay)}`
              )}
            </span>
            {kb('payment') && <span className="tb-txt" style={{ fontSize: 13 }}> {kb('payment')}</span>}
          </button>
        </div>
      </div>

      {showCustModal && (
        <CustomerSearchModal
          currentClient={client}
          onSelect={c => {
            onSetClient(c);
            setShowCustModal(false);
            onClientModalClose?.();
          }}
          onClose={() => {
            setShowCustModal(false);
            onClientModalClose?.();
          }}
        />
      )}
    </>
  );
});

export default ProfessionalCart;
```

## FILE: ./resources/js/pos/components/ProfessionalPaymentModal.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalPaymentModal.tsx
//
// ✅ التحسينات عن النسخة السابقة:
//   1. Numpad رقمي كامل للكاشير — مناسب للشاشات اللمسية والتابلت
//   2. أزرار مبالغ سريعة (500 / 1000 / 2000 / 5000 / 10000 دج)
//      وتُعدَّل تلقائياً لتكون أكبر من إجمالي الفاتورة
//   3. حساب الباقي الفوري مع animation ✓ عند الدفع الكامل
//   4. وضع "الدفع النقدي السريع" — ضغطة واحدة بدون numpad
//   5. مؤشر بصري واضح: ناقص / كافٍ / زيادة
//   6. إرسال treasury_account_id من وسيلة الدفع
// ════════════════════════════════════════════════════════════════════════════
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import type {
  CartTotals, Party, PaymentMode, DocumentType, Currency, TreasuryAccount,
} from '@/types';
import type { DocumentPayment } from '@/pos/utils/useCartStore';
import { formatDZD } from '../utils/calculations';
import { partyBalancesApi } from '@/lib/api/endpoints/partyBalances';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentLine {
  id:               string;
  dbId?:            number;
  modeId:           number;
  amount:           string;
  refNote:          string;
  treasuryAccountId?: number | null;
}

export interface PaymentConfirmParams {
  amountPaid:   number;
  dueDate?:     string;
  note?:        string;
  docTypeCode?: string;
  payments?:    Array<{
    id?:                 number;
    paymentModeId:      number;
    amount:             number;
    treasuryAccountId?: number | null;
    reference?:         string | null;
  }>;
  currencyId?:  number | null;
}

interface Props {
  totals:            CartTotals;
  client:            Party | null;
  paymentModes:      PaymentMode[];
  documentTypes:     DocumentType[];
  currencies?:       Currency[];
  treasuryAccounts?: TreasuryAccount[];
  totalTtcFinal:     number;
  existingPayments?: DocumentPayment[];
  documentDate?:     string;   // ISO date — تاريخ الفاتورة الحقيقي لجلب الرصيد التاريخي الصحيح
  isEditing?:        boolean;  // true when reopening an existing invoice
  /** SSOT balance: pass from document.balance_data.previous_balance when editing */
  prevBalance?:      number;
  defaultPaymentCode?: string;
  defaultDocTypeCode?: string;
  /** Fields restored from document when editing */
  initialDueDate?:   string | null;
  initialTypeCode?:  string | null;
  initialCurrencyId?: number | null;
  initialNote?:      string | null;
  onClose:           () => void;
  onConfirm:         (p: PaymentConfirmParams) => Promise<{ ok: boolean; message?: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_CODES = ['POS', 'FV', 'BL', 'BCC', 'FA'] as const;

/** مبالغ الأوراق النقدية الجزائرية */
const DZD_BILLS = [0, 200, 500, 1000, 2000, 5000];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** لوحة الأرقام للشاشات اللمسية */
function Numpad({
  onDigit,
  onDot,
  onBackspace,
  onClear,
}: {
  onDigit:    (d: string) => void;
  onDot:      () => void;
  onBackspace:() => void;
  onClear:    () => void;
}) {
  const keys = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    '.', '0', '⌫',
  ];

  return (
    <div className="pay-numpad">
      {keys.map(k => (
        <button
          key={k}
          className={`pay-npk${k === '⌫' ? ' del' : ''}`}
          onClick={() => {
            if (k === '⌫') onBackspace();
            else if (k === '.') onDot();
            else onDigit(k);
          }}
          type="button"
        >
          {k}
        </button>
      ))}
      <button
        className="pay-npk clear"
        onClick={onClear}
        type="button"
        style={{ gridColumn: 'span 3' }}
      >
        مسح
      </button>
    </div>
  );
}

/** شريط مؤشر حالة الدفع */
function PaymentStatus({
  remaining,
  change,
  _totalTtcFinal,
}: {
  remaining:     number;
  change:        number;
  _totalTtcFinal: number;
}) {
  if (remaining > 0.009) {
    return (
      <div className="pay-status pay-status--deficit">
        <i className="ti ti-alert-circle" />
        <span>متبقٍ: <strong>{formatDZD(remaining)}</strong></span>
      </div>
    );
  }
  if (change > 0.009) {
    return (
      <div className="pay-status pay-status--change">
        <i className="ti ti-cash" />
        <span>الباقي للزبون: <strong>{formatDZD(change)}</strong></span>
      </div>
    );
  }
  return (
    <div className="pay-status pay-status--ok">
      <i className="ti ti-circle-check" />
      <span>المبلغ مكتمل ✓</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfessionalPaymentModal({
  totals, client, paymentModes, documentTypes,
  currencies, treasuryAccounts, totalTtcFinal,
  existingPayments, documentDate, onClose, onConfirm, isEditing,
  prevBalance: propPrevBalance,
  defaultPaymentCode = 'cash',
  defaultDocTypeCode = 'POS',
  initialDueDate,
  initialTypeCode,
  initialCurrencyId,
  initialNote,
}: Props) {

  const firstAmountRef = useRef<HTMLInputElement>(null);

  // ── Focus first amount field on open ────────────────────────────────────────
  useEffect(() => { const t = setTimeout(() => { const el = firstAmountRef.current; if (el) { el.focus(); el.select(); } }, 60); return () => clearTimeout(t); }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const defaultMode = paymentModes.find(m =>
    new RegExp(defaultPaymentCode, 'i').test(m.name),
  ) ?? paymentModes.find(m => m.is_default) ?? paymentModes[0];

  const [lines, setLines] = useState<PaymentLine[]>(() => {
    if (existingPayments?.length) {
      return existingPayments.map(ep => ({
        id:                 uid(),
        dbId:               ep.id,
        modeId:             ep.payment_mode_id,
        amount:             Number(ep.amount || 0).toFixed(4),
        refNote:            ep.reference ?? '',
        treasuryAccountId:  ep.treasury_account_id ?? null,
      }));
    }
    const initAmount = totalTtcFinal.toFixed(4);
    return defaultMode
      ? [{ id: uid(), modeId: defaultMode.id, amount: initAmount, refNote: '', treasuryAccountId: null }]
      : [];
  });

  const [docTypeCode,        setDocTypeCode]        = useState<string>(
    isEditing && initialTypeCode ? initialTypeCode : defaultDocTypeCode,
  );
  const [dueDate,            setDueDate]            = useState(
    isEditing && initialDueDate ? initialDueDate : '',
  );
  const [note,               setNote]               = useState(
    isEditing && initialNote ? initialNote : '',
  );
  const [submitting,         setSubmitting]         = useState(false);
  const [error,              setError]              = useState('');
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(() => {
    if (isEditing && initialCurrencyId) return initialCurrencyId;
    return currencies?.find(c => c.is_base_currency)?.id ?? currencies?.[0]?.id ?? null;
  });

  // ── Balance: SSOT from prop (when editing) or fetch from API (new doc) ──
  const [internalPrevBalance, setInternalPrevBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    // SSOT: parent passes prevBalance from document.balance_data when editing
    if (propPrevBalance !== undefined) {
      setInternalPrevBalance(propPrevBalance);
      return;
    }
    if (!client?.id) {
      setInternalPrevBalance(0);
      return;
    }
    setBalanceLoading(true);
    const balanceDate = isEditing ? documentDate : undefined;
    partyBalancesApi.getOne(client.id, balanceDate)
      .then(res => {
        const data = (res as any)?.data ?? res;
        const currentBalance = Number(data?.current_balance ?? 0);
        setInternalPrevBalance(currentBalance);
      })
      .catch(() => setInternalPrevBalance(0))
      .finally(() => setBalanceLoading(false));
  }, [client?.id, documentDate, isEditing, propPrevBalance]);

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const activeLineIdRef = useRef<string | null>(null);
  useEffect(() => {
    const stillValid = lines.some(l => l.id === activeLineId);
    if (lines.length && !stillValid) {
      setActiveLineId(lines[0].id);
    }
    activeLineIdRef.current = activeLineId;
  }, [lines, activeLineId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalPaid = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
    [lines],
  );
  const existingTotal = useMemo(
    () => (existingPayments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0),
    [existingPayments],
  );
  const newPaid = useMemo(
    () => lines.reduce((s, l) => s + (l.dbId ? 0 : (parseFloat(l.amount) || 0)), 0),
    [lines],
  );
  const totalDue = totalTtcFinal + (client ? internalPrevBalance : 0);
  const remaining = Math.max(0, totalDue - totalPaid);
  const change    = totalPaid > totalDue + 0.009 ? totalPaid - totalDue : 0;
  const canSubmit = !submitting;

  // ── أزرار المبالغ السريعة ─────────────────────────────────────────────────
  // المبلغ الأول دائماً = المبلغ المستحق كاملاً (سابق + مستحق)
  // ثم الأوراق النقدية الأقرب فالأكبر
  const quickAmounts = useMemo(() => {
    const target = remaining > 0 ? remaining : totalTtcFinal;
    const totalDueAmt = totalDue;
    return Array.from(new Set([totalDueAmt, target, ...DZD_BILLS]));
  }, [remaining, totalTtcFinal, totalDue]);

  // ── Numpad handlers ────────────────────────────────────────────────────────
  const updateActiveLine = useCallback((fn: (prev: string) => string) => {
    const id = activeLineIdRef.current;
    if (!id) return;
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, amount: fn(l.amount) } : l,
    ));
  }, []);

  const onDigit = useCallback((d: string) => {
    updateActiveLine(prev => {
      if (prev === '0' || prev === '') return d;
      if (prev.includes('.') && prev.split('.')[1].length >= 4) return prev;
      return prev + d;
    });
  }, [updateActiveLine]);

  const onDot = useCallback(() => {
    updateActiveLine(prev => prev.includes('.') ? prev : prev + '.');
  }, [updateActiveLine]);

  const onBackspace = useCallback(() => {
    updateActiveLine(prev => prev.length <= 1 ? '0' : prev.slice(0, -1));
  }, [updateActiveLine]);

  const onClear = useCallback(() => {
    updateActiveLine(() => '0');
  }, [updateActiveLine]);

  /** ضغط مبلغ سريع → يُسنَد للـ line النشط */
  const applyQuickAmount = useCallback((amount: number) => {
    const id = activeLineIdRef.current;
    if (!id) return;
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, amount: amount.toFixed(4) } : l,
    ));
  }, []);

  // ── Line management ────────────────────────────────────────────────────────
  const addLine = useCallback(() => {
    const firstMode = paymentModes[0];
    if (!firstMode) return;
    const newId = uid();
    setLines(prev => [
      ...prev,
      {
        id:      newId,
        modeId:  firstMode.id,
        amount:  Math.max(0, remaining).toFixed(4),
        refNote: '',
        treasuryAccountId: null,
      },
    ]);
    setActiveLineId(newId);
  }, [paymentModes, remaining]);

  const removeLine = useCallback((id: string) => {
    setLines(prev => {
      const next = prev.filter(l => l.id !== id);
      if (activeLineId === id && next.length) setActiveLineId(next[next.length - 1].id);
      return next;
    });
  }, [activeLineId]);

  const updateLine = useCallback(<K extends keyof PaymentLine>(
    id: string, key: K, val: PaymentLine[K],
  ) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l));
  }, []);

  const fillRemaining = useCallback((id: string) => {
    const others = lines.filter(l => l.id !== id).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const rem    = Math.max(0, totalTtcFinal - others);
    updateLine(id, 'amount', rem.toFixed(4));
  }, [lines, totalTtcFinal, updateLine]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');

    const payments = lines
      .filter(l => parseFloat(l.amount) > 0.00009)
      .map(l => ({
        ...(l.dbId ? { id: l.dbId } : {}),
        paymentModeId:      l.modeId,
        amount:             parseFloat(l.amount),
        treasuryAccountId:  l.treasuryAccountId ?? null,
        reference:          l.refNote?.trim() || null,
      }));

    const res = await onConfirm({
      amountPaid: totalPaid,
      payments,
      docTypeCode,
      dueDate:    dueDate || undefined,
      note:       note || undefined,
      currencyId: selectedCurrencyId,
    });

    setSubmitting(false);
    if (!res.ok) setError(res.message ?? 'حدث خطأ غير متوقع');
  }, [canSubmit, lines, totalPaid, docTypeCode, dueDate, note, selectedCurrencyId, onConfirm]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')              { e.preventDefault(); onClose(); }
      if (e.key === 'Enter')               { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleSubmit, onClose]);

  // ─── Document types filter ─────────────────────────────────────────────────
  const availableDocTypes = documentTypes.filter(t => DOC_CODES.includes(t.code as typeof DOC_CODES[number]));

  // ── Treasury accounts per mode ─────────────────────────────────────────────
  const getAccountsForMode = useCallback((_modeId: number) => {
    if (!treasuryAccounts) return [];
    // نُظهر حسابات الخزينة المرتبطة بوسيلة الدفع (أو كلها)
    return treasuryAccounts;
  }, [treasuryAccounts]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-pay-v2"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth:  780,
          display:   'grid',
          gridTemplateRows: 'auto 1fr auto',
          maxHeight: 'calc(100vh - 40px)',
          overflow:  'hidden',
        }}
      >
        {/* ── Header ── */}
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-credit-card" style={{ marginLeft: 6 }} />
            إتمام الدفع
            {client && (
              <span className="pay-client-chip">
                <i className="ti ti-user" style={{ fontSize: 11 }} />
                {client.name}
              </span>
            )}
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>

        {/* ── Body — شبكة عمودين ── */}
        <div className="pay-v2-body">

          {/* ════ العمود الأيمن: ملخص + إعدادات ════ */}
          <div className="pay-v2-left">

            {/* مبلغ الفاتورة */}
            <div className="pay-v2-hero">
              <div className="pay-hero-label">الإجمالي المستحق</div>
              <div className="pay-hero-amount">{formatDZD(totalTtcFinal)}</div>
              {client && (
                <div className="pay-hero-client">
                  <i className="ti ti-user-circle" /> {client.name}
                </div>
              )}
            </div>

            {/* ملخص الفاتورة */}
            <div className="pay-v2-summary">
              {(() => {
                const grossHt = totals.total_ht + totals.total_discount + (totals.invoice_discount_amount ?? 0);
                return (
                  <>
                    <div className="pvs-row">
                      <span>HT</span>
                      <span>{formatDZD(grossHt)}</span>
                    </div>
                    {totals.total_discount > 0 && (
                      <div className="pvs-row pvs-disc">
                        <span>خصم</span>
                        <span>- {formatDZD(totals.total_discount)}</span>
                      </div>
                    )}
                    {totals.invoice_discount_amount != null && totals.invoice_discount_amount > 0 && (
                      <div className="pvs-row pvs-disc">
                        <span>Remise {totals.invoice_discount_pct ?? 0}%</span>
                        <span>- {formatDZD(totals.invoice_discount_amount)}</span>
                      </div>
                    )}
                    <div className="pvs-row">
                      <span>TVA</span>
                      <span>{formatDZD(totals.total_tva)}</span>
                    </div>
                    {totals.fiscal_stamp > 0 && (
                      <div className="pvs-row">
                        <span>طابع مالي</span>
                        <span>{formatDZD(totals.fiscal_stamp)}</span>
                      </div>
                    )}
                    <div className="pvs-row pvs-total">
                      <span>الإجمالي</span>
                      <strong>{formatDZD(totalTtcFinal)}</strong>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* ملخص الرصيد */}
            {client && (
              <div className="pay-v2-balance">
                <div className="pvs-row">
                  <span>الرصيد السابق</span>
                  <span>{balanceLoading ? '...' : formatDZD(internalPrevBalance)}</span>
                </div>
                <div className="pvs-row" style={{ borderTop: '1px dashed #ccc', paddingTop: 6, marginTop: 2 }}>
                  <span>المجموع <span style={{ fontSize: 11, opacity: 0.6 }}>(سابق + مستحق)</span></span>
                  <strong>{formatDZD(internalPrevBalance + totalTtcFinal)}</strong>
                </div>
                {isEditing && existingTotal > 0 && (
                  <div className="pvs-row">
                    <span style={{ color: '#888' }}>مدفوع سابقاً</span>
                    <span style={{ color: '#888' }}>{formatDZD(existingTotal)}</span>
                  </div>
                )}
                {isEditing && newPaid > 0 && (
                  <div className="pvs-row">
                    <span style={{ color: '#2563eb' }}>المدفوع الآن</span>
                    <span style={{ color: '#2563eb' }}>{formatDZD(newPaid)}</span>
                  </div>
                )}
                <div className="pvs-row" style={{ borderTop: '1px solid #ddd', paddingTop: 6, marginTop: 2 }}>
                  <span>{isEditing ? 'إجمالي المدفوع' : 'المدفوع'}</span>
                  <span>{formatDZD(totalPaid)}</span>
                </div>
                <div className="pvs-row pvs-total" style={{ marginTop: 4 }}>
                  <span>
                    الرصيد الجديد
                    <span style={{ fontSize: 11, opacity: 0.6 }}> (سابق + إجمالي - المدفوع)</span>
                  </span>
                  <strong>{formatDZD(internalPrevBalance + totalTtcFinal - totalPaid)}</strong>
                </div>
              </div>
            )}

            {/* نوع الوثيقة */}
            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">نوع المستند</div>
              <div className="pay-doc-pills">
                {availableDocTypes.map(t => (
                  <button
                    key={t.id}
                    data-code={t.code}
                    className={`pay-dpill ${docTypeCode === t.code ? 'on' : ''}`}
                    onClick={() => setDocTypeCode(t.code)}
                    type="button"
                  >
                    <span className="pay-dpill-code">{t.code}</span>
                    <span className="pay-dpill-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* العملة */}
            {currencies && currencies.length > 1 && (
              <div className="pay-v2-section">
                <div className="pay-v2-sec-title">العملة</div>
                <select
                  className="pay-v2-select"
                  value={selectedCurrencyId ?? ''}
                  onChange={e => setSelectedCurrencyId(e.target.value ? +e.target.value : null)}
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                      {c.is_base_currency ? ' (الرئيسية)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* تاريخ الاستحقاق */}
            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">تاريخ الاستحقاق <span style={{ opacity: 0.5, fontWeight: 400 }}>(اختياري)</span></div>
              <input
                type="date"
                className="pay-v2-date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* ملاحظة */}
            <div className="pay-v2-section">
              <div className="pay-v2-sec-title">ملاحظة</div>
              <textarea
                className="pay-v2-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="ملاحظة على الفاتورة..."
              />
            </div>
          </div>

          {/* ════ العمود الأيسر: الدفع + Numpad ════ */}
          <div className="pay-v2-right">

            {/* وسائل الدفع */}
            <div className="pay-v2-sec-title" style={{ marginBottom: 8 }}>وسائل الدفع</div>

            <div className="pay-lines-v2">
              {lines.map((line, idx) => {
                const accounts = getAccountsForMode(line.modeId);
                const isActive = activeLineId === line.id;
                return (
                  <div
                    key={line.id}
                    className={`pay-line-v2 ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveLineId(line.id)}
                  >
                    <div className="plv2-num">{idx + 1}</div>

                    {/* وسيلة الدفع */}
                    <select
                      className="plv2-mode"
                      value={line.modeId}
                      onChange={e => updateLine(line.id, 'modeId', +e.target.value)}
                      onClick={e => e.stopPropagation()}
                    >
                      {paymentModes.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    {/* المبلغ */}
                    <div className="plv2-amt-wrap">
                      <input
                        ref={idx === 0 ? firstAmountRef : undefined}
                        type="number"
                        className="plv2-amount"
                        value={line.amount}
                        onChange={e => updateLine(line.id, 'amount', e.target.value)}
                        onFocus={() => setActiveLineId(line.id)}
                        onClick={e => e.stopPropagation()}
                        placeholder="0.00"
                        dir="ltr"
                      />
                      <button
                        className="plv2-fill"
                        onClick={e => { e.stopPropagation(); fillRemaining(line.id); }}
                        title="تعبئة المتبقي"
                        type="button"
                      >
                        ≈
                      </button>
                    </div>

                    {/* مرجع */}
                    <input
                      type="text"
                      className="plv2-ref"
                      value={line.refNote}
                      onChange={e => updateLine(line.id, 'refNote', e.target.value)}
                      placeholder="مرجع..."
                      onClick={e => e.stopPropagation()}
                    />

                    {/* حساب الخزينة */}
                    {accounts.length > 0 && (
                      <select
                        className="plv2-treasury"
                        value={line.treasuryAccountId ?? ''}
                        onChange={e => updateLine(line.id, 'treasuryAccountId', e.target.value ? +e.target.value : null)}
                        onClick={e => e.stopPropagation()}
                        title="حساب الخزينة"
                      >
                        <option value="">— خزينة —</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}

                    {/* حذف */}
                    {lines.length > 1 && (
                      <button
                        className="plv2-del"
                        onClick={e => { e.stopPropagation(); removeLine(line.id); }}
                        type="button"
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* إضافة وسيلة دفع */}
            <button className="btn btn-xs" onClick={addLine} type="button" style={{ marginTop: 6 }}>
              <i className="ti ti-plus" /> إضافة وسيلة دفع
            </button>

            {/* ── مؤشر الحالة ── */}
            <div style={{ margin: '12px 0 8px' }}>
              <PaymentStatus
                remaining={remaining}
                change={change}
                totalTtcFinal={totalTtcFinal}
              />
            </div>

            {/* ── أزرار المبالغ السريعة ── */}
            <div className="pay-v2-sec-title" style={{ marginBottom: 6 }}>مبالغ سريعة</div>
            <div className="pay-quick-amts">
              {quickAmounts.map(a => (
                <button
                  key={a}
                  className={`pay-qa-btn ${parseFloat(lines.find(l => l.id === activeLineId)?.amount ?? '0') === a ? 'on' : ''}`}
                  onClick={() => applyQuickAmount(a)}
                  type="button"
                >
                  {a.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} دج
                </button>
              ))}
            </div>

            {/* ── Numpad ── */}
            <div className="pay-v2-sec-title" style={{ margin: '10px 0 6px' }}>لوحة الأرقام</div>
            <Numpad
              onDigit={onDigit}
              onDot={onDot}
              onBackspace={onBackspace}
              onClear={onClear}
            />

            {/* ── خطأ ── */}
            {error && (
              <div className="al al-r" style={{ marginTop: 10 }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="m-foot">
          <button className="btn" onClick={onClose} type="button">إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title="تأكيد الدفع — Ctrl+Enter"
            type="button"
            style={{ minWidth: 200, fontSize: 14 }}
          >
            {submitting
              ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
              : <>
                  <i className="ti ti-circle-check" />
                  تأكيد الدفع — {formatDZD(totalPaid)}
                  {change > 0.009 && (
                    <span style={{ marginRight: 8, fontSize: 12, opacity: 0.85 }}>
                      (باقٍ {formatDZD(change)})
                    </span>
                  )}
                </>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./resources/js/pos/components/ProfessionalReceipt.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalReceipt.tsx
//
// معاينة الإيصال قبل الطباعة — تستخدم UniversalPrintPipeline
// لتطابق تام بين المعاينة والطباعة الفعلية
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import UniversalPrintPipeline from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { PipelineSource } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';
import type { PrintTemplate, CompanyData } from '@/pages/settings/print-settings/types';

interface Props {
  template: PrintTemplate;
  company:  CompanyData | null;
  source:   PipelineSource;
  docNumber?: string;
  onClose:   () => void;
  onPrint:   () => void;
  onNewSale: () => void;
}

export default function ProfessionalReceipt({
  template, company, source, docNumber, onClose, onPrint, onNewSale,
}: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault();
        onPrint();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onPrint, onClose]);

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="modal modal-md"
        style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="m-hd">
          <div>
            <div className="m-title">
              <i className="ti ti-receipt" style={{ color: 'var(--em)', marginLeft: 7 }} />
              معاينة الإيصال
            </div>
            {docNumber && (
              <div className="m-sub">رقم الفاتورة: {docNumber}</div>
            )}
          </div>
          <button className="m-x" onClick={onClose} type="button">
            <i className="ti ti-x" />
          </button>
        </div>

        <div
          className="m-body"
          style={{ flex: 1, overflowY: 'auto', padding: 16 }}
          id="pos-receipt-print"
        >
          <UniversalPrintPipeline source={source} template={template} company={company} />
        </div>

        <div className="m-foot">
          <button className="btn btn-p" onClick={onNewSale} type="button">
            <i className="ti ti-plus" /> بيع جديد
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose} type="button">إغلاق</button>
          <button className="btn btn-p" onClick={onPrint} type="button">
            <i className="ti ti-printer" /> طباعة
          </button>
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/QtySetModal.tsx

```
import { useState, useRef, useEffect } from 'react';
import type { CartItem } from '@/types';

interface QtySetModalProps {
  item: CartItem;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

export default function QtySetModal({ item, onClose, onConfirm }: QtySetModalProps) {
  const [val, setVal] = useState(String(item.quantity));
  const inpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inpRef.current?.focus(); inpRef.current?.select(); }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleOk();
    if (e.key === 'Escape') onClose();
  };

  const handleOk = () => {
    const qty = parseFloat(val);
    if (qty > 0) onConfirm(qty);
  };

  const kbdStyle: React.CSSProperties = {
    display: 'inline-block', padding: '1px 5px', borderRadius: 3,
    background: 'var(--b2)', color: 'var(--t1)', fontSize: 10,
    fontWeight: 600, fontFamily: 'monospace', lineHeight: '1.4',
    border: '1px solid var(--b3)', margin: '0 1px',
  };

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-edit" style={{ marginLeft: 6 }} /> تعديل الكمية</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 15, color: 'var(--t1)' }}>
            {item.product_name}
          </div>
          <div className="fg">
            <label>الكمية</label>
            <input
              ref={inpRef}
              type="number"
              className="form-control"
              value={val}
              onChange={e => setVal(e.target.value)}
              min="0.001"
              step="1"
              style={{ fontSize: 18, padding: '10px 12px', textAlign: 'center' }}
            />
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t3)', lineHeight: 1.7 }}>
            <div><kbd style={kbdStyle}>Enter</kbd> تأكيد · <kbd style={kbdStyle}>Esc</kbd> إلغاء</div>
            <div style={{ marginTop: 4 }}><kbd style={kbdStyle}>Ctrl++</kbd> زيادة · <kbd style={kbdStyle}>Ctrl+-</kbd> نقصان · <kbd style={kbdStyle}>↑↓</kbd> تنقل · <kbd style={kbdStyle}>Del</kbd> حذف</div>
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleOk}><i className="ti ti-check" /> موافق</button>
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/QuickItemsBar.tsx

```
import React, { useRef, useState, useEffect } from 'react';
import type { ProductVariant } from '@/types';
import type { QuickItem } from '../utils/posHelpers';
import { formatDZD } from '../utils/calculations';
import { isVariantOutOfStock } from '../utils/posHelpers';

interface QuickItemsBarProps {
  quickItems: QuickItem[];
  allVariants: ProductVariant[];
  onAdd: (v: ProductVariant) => void;
  onRemove: (variantId: number) => void;
  allowNegativeStock?: boolean;
}

export default function QuickItemsBar({
  quickItems, allVariants, onAdd, onRemove, allowNegativeStock,
}: QuickItemsBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [quickItems.length]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const itemW =
      (el.querySelector<HTMLElement>('.pqb-item')?.offsetWidth ?? 120) + 6;
    el.scrollBy({ left: dir === 'left' ? -itemW : itemW, behavior: 'smooth' });
  };

  return (
    <div className="pos-quickbar-wrapper">
      {canScrollLeft && (
        <button className="pqb-scroll pqb-scroll-l" onClick={() => scroll('left')} aria-label="السابق">
          <i className="ti ti-chevron-right" />
        </button>
      )}
      <div className="pos-quickbar" ref={scrollRef}>
        <span className="pqb-label">
          <i className="ti ti-star" /> مفضلة
        </span>
        {quickItems.map(q => {
          const variant = allVariants.find(v => v.id === q.variantId);
          const outStock = variant ? isVariantOutOfStock(variant, allowNegativeStock) : false;
          return (
            <div key={q.variantId} className="pqb-item" title={q.name}>
              <button
                className="pqb-add"
                onClick={() => variant && !outStock && onAdd(variant)}
                disabled={!variant || outStock}
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
      {canScrollRight && (
        <button className="pqb-scroll pqb-scroll-r" onClick={() => scroll('right')} aria-label="التالي">
          <i className="ti ti-chevron-left" />
        </button>
      )}
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/ReturnsModal.tsx

```
import React, { useState, useCallback } from 'react';
import type { CommercialDocument, CommercialDocumentLine, DocumentType } from '@/types';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { formatDZD } from '../utils/calculations';
import { toast } from 'sonner';

interface ReturnsModalProps {
  documentTypes: DocumentType[];
  defaultWarehouseId: number | null;
  fiscalYearId: number | undefined;
  onClose: () => void;
  onDone: () => void;
}

interface SelectedLine {
  line: CommercialDocumentLine;
  qty: number;
}

export default function ReturnsModal({
  documentTypes, defaultWarehouseId, fiscalYearId, onClose, onDone,
}: ReturnsModalProps) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [doc, setDoc] = useState<CommercialDocument | null>(null);
  const [selected, setSelected] = useState<SelectedLine[]>([]);
  const [creating, setCreating] = useState(false);

  const avcType = documentTypes.find(t => t.code === 'AVC');

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await documentsApi.list({
        search: search.trim(),
        include: 'lines,lines.product_variant,party',
        per_page: 5,
        'filter[fiscal_year_id]': fiscalYearId,
      } as any);
      const found = Array.isArray(res) ? res : res.data ?? [];
      if (found.length === 0) {
        toast.error('لا توجد فاتورة بهذا الرقم');
        setDoc(null);
      } else {
        setDoc(found[0] as CommercialDocument);
        setSelected([]);
      }
    } catch {
      toast.error('فشل البحث عن الفاتورة');
    }
    setSearching(false);
  }, [search]);

  const toggleLine = useCallback((line: CommercialDocumentLine) => {
    setSelected(prev => {
      const exists = prev.find(s => s.line.id === line.id);
      if (exists) return prev.filter(s => s.line.id !== line.id);
      return [...prev, { line, qty: line.quantity }];
    });
  }, []);

  const updateReturnQty = useCallback((lineId: number, qty: number) => {
    setSelected(prev => prev.map(s =>
      s.line.id === lineId ? { ...s, qty: Math.min(Math.max(0, qty), s.line.quantity) } : s
    ));
  }, []);

  const handleCreateReturn = useCallback(async () => {
    if (!avcType || !doc || !defaultWarehouseId || !fiscalYearId) {
      toast.error('بيانات غير مكتملة لإنشاء المرتجع');
      return;
    }
    if (selected.length === 0) {
      toast.error('اختر أصنافاً للإرجاع');
      return;
    }
    setCreating(true);
    try {
      await documentsApi.create({
        document_type_id: avcType.id,
        warehouse_id: defaultWarehouseId,
        fiscal_year_id: fiscalYearId,
        document_date: new Date().toISOString().split('T')[0],
        party_id: doc.party?.id ?? null,
        notes: `مرتجع من الفاتورة رقم ${doc.document_number}`,
        lines: selected.map(s => ({
          product_id: s.line.product_id ?? 0,
          description: s.line.description ?? undefined,
          quantity: -Math.abs(s.qty),
          unit_price_ht: s.line.unit_price_ht,
          discount_percentage: s.line.discount_percentage,
          tva_rate: s.line.tva_rate,
        })),
      });
      toast.success('تم إنشاء المرتجع بنجاح');
      onDone();
    } catch {
      toast.error('فشل إنشاء المرتجع');
    }
    setCreating(false);
  }, [avcType, doc, defaultWarehouseId, fiscalYearId, selected, onDone]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt-refund" style={{ marginLeft: 6 }} />
            مرتجع مبيعات
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <div className="ret-search">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                className="inp"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="رقم الفاتورة..."
                style={{ flex: 1 }}
              />
              <button className="btn btn-p" onClick={handleSearch} disabled={searching}>
                {searching ? '...' : 'بحث'}
              </button>
            </div>
          </div>

          {doc && (
            <div className="ret-doc">
              <div className="ret-doc-hd">
                <strong>الفاتورة: {doc.document_number}</strong>
                <span style={{ color: 'var(--t4)', fontSize: 12 }}>
                  {doc.party?.name} — {formatDZD(doc.total_ttc)}
                </span>
              </div>
              <div className="ret-lines">
                {doc.lines?.map(line => {
                  const sel = selected.find(s => s.line.id === line.id);
                  return (
                    <div key={line.id} className={`ret-line ${sel ? 'ret-line-sel' : ''}`}>
                      <label className="ret-line-lbl">
                        <input
                          type="checkbox"
                          checked={!!sel}
                          onChange={() => toggleLine(line)}
                        />
                        <span className="ret-line-name">{line.description ?? `صنف #${line.product_variant_id}`}</span>
                        <span className="ret-line-qty">الكمية: {line.quantity}</span>
                        <span className="ret-line-amt">{formatDZD(line.total_ht)}</span>
                      </label>
                      {sel && (
                        <div className="ret-line-qty-inp">
                          <span>كمية الإرجاع:</span>
                          <input
                            type="number"
                            className="inp"
                            value={sel.qty}
                            min={1}
                            max={line.quantity}
                            onChange={e => updateReturnQty(line.id, parseInt(e.target.value) || 0)}
                            style={{ width: 80 }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--t4)' }}>/ {line.quantity}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleCreateReturn}
            disabled={!doc || selected.length === 0 || creating || !avcType}
          >
            {creating ? 'جاري الإنشاء...' : 'إنشاء المرتجع'}
          </button>
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/SessionInvoicesModal.tsx

```
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CommercialDocument } from '@/lib/api/core/types';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { documentsApi } from '@/lib/api/endpoints/documents';
import { formatDZD } from '@/pos/utils/calculations';

interface Props {
  session:    PosSession;
  onClose:    () => void;
  onOpen:     (docId: number) => void;
}

export default function SessionInvoicesModal({ session, onClose, onOpen }: Props) {
  const [docs, setDocs] = useState<CommercialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortField, setSortField] = useState<string>('document_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const listRef = useRef<HTMLTableSectionElement>(null);

  const openedDate = session.opened_at?.slice(0, 10);
  const today      = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    documentsApi.list({
      include: 'party',
      per_page: 200,
      sort: '-created_at',
      'filter[created_at]': `${openedDate},${today}`,
      'filter[warehouse_id]': session.warehouse?.id,
      'filter[user_id]': session.user?.id,
    }).then((res: any) => {
      if (cancelled) return;
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setDocs(list as CommercialDocument[]);
    }).catch(() => {
      if (!cancelled) setDocs([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [session.opened_at, session.warehouse?.id, session.user?.id, openedDate, today]);

  const sorted = useMemo(() => {
    const list = [...docs];
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'document_number': va = a.document_number; vb = b.document_number; break;
        case 'client':          va = a.party?.name ?? ''; vb = b.party?.name ?? ''; break;
        case 'document_date':   va = a.document_date ?? ''; vb = b.document_date ?? ''; break;
        case 'total_ttc':       va = Number(a.total_ttc ?? 0); vb = Number(b.total_ttc ?? 0); break;
        case 'paid_amount':     va = Number(a.paid_amount ?? 0); vb = Number(b.paid_amount ?? 0); break;
        case 'remaining_amount':va = Number(a.remaining_amount ?? 0); vb = Number(b.remaining_amount ?? 0); break;
        default:                va = a.document_date ?? ''; vb = b.document_date ?? '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [docs, sortField, sortDir]);

  // أعد تعيين التحديد بعد الترتيب
  useEffect(() => {
    setSelectedIndex(0);
  }, [sorted.length]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  const toggleSort = useCallback((field: string) => {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  }, []);

  function sortIcon(field: string): string {
    if (sortField !== field) return 'ti ti-arrows-sort';
    return sortDir === 'asc' ? 'ti ti-sort-ascending' : 'ti ti-sort-descending';
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, docs.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (sorted.length === 0) return;
      const selected = sorted[selectedIndex];
      if (!selected) return;
      e.preventDefault();
      onOpen(selected.id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [sorted, selectedIndex, onOpen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown]);

  const handleRowClick = useCallback((doc: CommercialDocument) => {
    onOpen(doc.id);
  }, [onOpen]);

  const totals = useMemo(() => {
    let ttc = 0, paid = 0, remaining = 0;
    for (const doc of sorted) {
      ttc       += Number(doc.total_ttc ?? 0);
      paid      += Number(doc.paid_amount ?? 0);
      remaining += Number(doc.remaining_amount ?? 0);
    }
    return { ttc, paid, remaining };
  }, [sorted]);

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <i className="ti ti-receipt" style={{ marginLeft: 6 }} />
            فواتير الجلسة
          </div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
              <i className="ti ti-loader" style={{ fontSize: 24 }} />
              <div style={{ marginTop: 8 }}>جاري تحميل الفواتير...</div>
            </div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>
              <i className="ti ti-receipt-off" style={{ fontSize: 32 }} />
              <div style={{ marginTop: 8 }}>لا توجد فواتير في هذه الجلسة</div>
            </div>
          ) : (
            <table className="tbl tbl-sm si-modal-tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="si-th-sort" onClick={() => toggleSort('document_number')}>
                    <i className={sortIcon('document_number')} style={{ fontSize: 11, marginLeft: 3 }} /> رقم الفاتورة
                  </th>
                  <th className="si-col-client">العميل</th>
                  <th className="si-th-sort" onClick={() => toggleSort('document_date')}>
                    <i className={sortIcon('document_date')} style={{ fontSize: 11, marginLeft: 3 }} /> التاريخ
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('total_ttc')}>
                    <i className={sortIcon('total_ttc')} style={{ fontSize: 11, marginLeft: 3 }} /> الإجمالي
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('paid_amount')}>
                    <i className={sortIcon('paid_amount')} style={{ fontSize: 11, marginLeft: 3 }} /> المدفوع
                  </th>
                  <th className="si-th-sort" onClick={() => toggleSort('remaining_amount')}>
                    <i className={sortIcon('remaining_amount')} style={{ fontSize: 11, marginLeft: 3 }} /> المتبقي
                  </th>
                </tr>
              </thead>
              <tbody ref={listRef}>
                {sorted.map((doc, i) => (
                  <tr
                    key={doc.id}
                    onClick={() => handleRowClick(doc)}
                    style={{ cursor: 'pointer' }}
                    className={`si-row${i === selectedIndex ? ' si-row-sel' : ''}`}
                  >
                    <td>{i + 1}</td>
                    <td><strong>{doc.document_number}</strong></td>
                    <td className="si-col-client">{doc.party?.name ?? <span style={{ color: 'var(--t4)' }}>—</span>}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{doc.created_at?.slice(0, 16).replace('T', ' ') ?? doc.document_date?.slice(0, 16).replace('T', ' ')}</td>
                    <td style={{ fontWeight: 600, color: 'var(--p)' }}>{formatDZD(doc.total_ttc)}</td>
                    <td style={{ color: 'var(--g)' }}>{formatDZD(doc.paid_amount ?? 0)}</td>
                    <td style={{ fontWeight: 600, color: Number(doc.remaining_amount ?? 0) > 0 ? 'var(--r)' : 'var(--t4)' }}>
                      {formatDZD(doc.remaining_amount ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--b3)' }}>
                  <td colSpan={4} style={{ textAlign: 'left' }}>المجموع</td>
                  <td style={{ color: 'var(--p)' }}>{formatDZD(totals.ttc)}</td>
                  <td style={{ color: 'var(--g)' }}>{formatDZD(totals.paid)}</td>
                  <td style={{ color: totals.remaining > 0 ? 'var(--r)' : 'var(--t4)' }}>{formatDZD(totals.remaining)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="m-foot">
          <span style={{ fontSize: 12, color: 'var(--t4)' }}>
            ↑↓ للتنقل · Enter لفتح الفاتورة · Esc للإغلاق
          </span>
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/SessionStatsModal.tsx

```
// resources/js/pos/components/SessionStatsModal.tsx — v2 احترافي
import React, { useState, useMemo } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { useActiveCompany } from '@/lib/store/appStore';
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import TemplatePrintModal from '@/pages/settings/print-settings/components/shared/TemplatePrintModal';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';

interface Props {
  session:      PosSession;
  onClose:      () => void;
  onEndSession: () => void;
}

type Tab = 'overview' | 'payments' | 'products' | 'timeline';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview',  label: 'لوحة البيانات',  icon: 'ti-layout-dashboard' },
  { key: 'payments',  label: 'وسائل الدفع',   icon: 'ti-credit-card'       },
  { key: 'products',  label: 'المنتجات',       icon: 'ti-package'            },
];

export default function SessionStatsModal({ session, onClose, onEndSession }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const companyInfo = mapCompany(useActiveCompany());

  const { data: reportTemplates = [] } = usePrintTemplatesList('RPT');

  const reportData = useMemo(
    () => companyInfo ? DocumentDataBuilder.fromSessionReport(session as unknown as Record<string, unknown>, companyInfo) : null,
    [session, companyInfo],
  );

  const paymentRows = useMemo(() =>
    (session.payments ?? []).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount),
    [session.payments],
  );
  const topProducts = useMemo(() =>
    (session.top_products ?? []).sort((a, b) => b.total_ttc - a.total_ttc).slice(0, 10),
    [session.top_products],
  );

  const totalCollected = Number(session.cash_collected ?? 0)
    + Number(session.cib_collected ?? 0)
    + Number(session.ccp_collected ?? 0)
    + Number(session.bank_collected ?? 0);
  const maxPayAmt   = Math.max(...paymentRows.map(p => p.amount), 1);
  const maxProdTtc  = Math.max(...topProducts.map(p => p.total_ttc), 1);
  const netSalesPct = session.gross_sales > 0
    ? (session.net_sales / session.gross_sales) * 100 : 100;

  // KPI cards
  const kpiBlocks = [
    {
      title: 'المبيعات الصافية',
      value: formatDZD(session.net_sales),
      sub: `إجمالي: ${formatDZD(session.gross_sales)}`,
      icon: 'ti-cash', color: 'var(--em)', bg: 'var(--emb)', size: 'lg',
    },
    {
      title: 'الفواتير',
      value: String(session.invoices_count),
      sub: `متوسط: ${formatDZD(session.avg_invoice ?? 0)}`,
      icon: 'ti-receipt', color: 'var(--blue)', bg: 'var(--blueb)', size: 'md',
    },
    {
      title: 'أعلى فاتورة',
      value: formatDZD(session.highest_invoice ?? 0),
      sub: `مدة الجلسة: ${session.duration}`,
      icon: 'ti-trending-up', color: 'var(--purple)', bg: 'var(--purb)', size: 'md',
    },
    {
      title: 'الخصومات',
      value: formatDZD(session.total_discount ?? 0),
      sub: 'إجمالي الخصومات المُمنوحة',
      icon: 'ti-discount', color: 'var(--orange)', bg: 'var(--orb)', size: 'sm',
    },
    {
      title: 'TVA',
      value: formatDZD(session.total_tva ?? 0),
      sub: 'ضريبة القيمة المضافة',
      icon: 'ti-percentage', color: 'var(--teal)', bg: 'var(--tealb)', size: 'sm',
    },
    {
      title: 'المرتجعات',
      value: formatDZD(session.returns_total ?? 0),
      sub: `${session.returns_count ?? 0} مرتجع`,
      icon: 'ti-receipt-refund', color: 'var(--red)', bg: 'var(--redb)', size: 'sm',
    },
  ];

  return (
    <div className="ov on" onClick={onClose}>
      <div
        className="ssm-wrap"
        onClick={e => e.stopPropagation()}
      >
        {/* ════ Header ════ */}
        <div className="ssm-header">
          {/* شريط الجلسة */}
          <div className="ssm-session-bar">
            <div className="ssm-session-avatar">
              {session.user?.name?.charAt(0) ?? '?'}
            </div>
            <div className="ssm-session-info">
              <div className="ssm-session-name">{session.user?.name}</div>
              <div className="ssm-session-meta">
                <i className="ti ti-building-warehouse" />
                {session.warehouse?.name}
                <span>·</span>
                <i className="ti ti-clock" />
                فُتحت {new Date(session.opened_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                <span>·</span>
                <i className="ti ti-hourglass" />
                {session.duration}
              </div>
            </div>
            <div className={`ssm-status-pill ${session.status !== 'open' ? 'ssm-status-pill--closed' : ''}`}>
              <span className={`ssm-status-dot ${session.status !== 'open' ? 'ssm-status-dot--closed' : ''}`} />
              {session.status === 'open' ? 'جلسة مفتوحة' : session.status === 'closed' ? 'جلسة مغلقة' : 'جلسة معلقة'}
            </div>
          </div>

          {/* tabs */}
          <div className="ssm-tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                className={`ssm-tab ${tab === t.key ? 'on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <i className={`ti ${t.icon}`} />
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button className="m-x" onClick={onClose} type="button">
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* ════ Body ════ */}
        <div className="ssm-body">

          {/* ══ لوحة البيانات ══ */}
          {tab === 'overview' && (
            <>
              {/* KPI Grid */}
              <div className="ssm-kpi-grid">
                {kpiBlocks.map(k => (
                  <div
                    key={k.title}
                    className={`ssm-kpi ssm-kpi--${k.size}`}
                    style={{ '--kc': k.color, '--kb': k.bg } as any}
                  >
                    <div className="ssm-kpi-header">
                      <div className="ssm-kpi-icon">
                        <i className={`ti ${k.icon}`} />
                      </div>
                      <div className="ssm-kpi-title">{k.title}</div>
                    </div>
                    <div className="ssm-kpi-value" style={{ direction: 'ltr' }}>{k.value}</div>
                    <div className="ssm-kpi-sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* شريط صافي المبيعات */}
              <div className="ssm-progress-section">
                <div className="ssm-ps-row">
                  <span className="ssm-ps-label">الصافي من الإجمالي (بعد المرتجعات)</span>
                  <span className="ssm-ps-pct">{netSalesPct.toFixed(1)}%</span>
                </div>
                <div className="ssm-progress-bar">
                  <div className="ssm-pb-fill" style={{ width: `${netSalesPct}%` }} />
                </div>
              </div>

              {/* ملخص سريع وسائل الدفع */}
              {paymentRows.length > 0 && (
                <div className="ssm-quick-pay">
                  <div className="ssm-section-title">
                    <i className="ti ti-credit-card" /> ملخص الدفع
                  </div>
                  <div className="ssm-quick-pay-grid">
                    {paymentRows.map(p => (
                      <div key={p.payment_mode_id} className="ssm-qp-item">
                        <div className="ssm-qp-name">
                          {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                        </div>
                        <div className="ssm-qp-amount" style={{ direction: 'ltr' }}>
                          {formatDZD(p.amount)}
                        </div>
                        <div className="ssm-qp-count">{p.count} عملية</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ملاحظة الفتح */}
              {session.opening_note && (
                <div className="ssm-note-row">
                  <i className="ti ti-notes" />
                  <span>{session.opening_note}</span>
                </div>
              )}
            </>
          )}

          {/* ══ وسائل الدفع ══ */}
          {tab === 'payments' && (
            <div className="ssm-payments">
              {/* إجمالي بارز */}
              <div className="ssm-pay-total-banner">
                <div className="ssm-ptb-label">إجمالي المحصَّل (نقد + بطاقات + تحويل)</div>
                <div className="ssm-ptb-amount" style={{ direction: 'ltr' }}>
                  {formatDZD(totalCollected)}
                </div>
                {(session.credit_total ?? 0) > 0 && (
                  <div className="ssm-ptb-credit">
                    + {formatDZD(session.credit_total ?? 0)} آجل غير مقبوض
                  </div>
                )}
              </div>

              {paymentRows.length === 0 ? (
                <div className="ssm-empty">
                  <i className="ti ti-credit-card" />
                  <span>لا توجد مدفوعات مسجَّلة بعد</span>
                </div>
              ) : (
                <div className="ssm-pay-list">
                  {paymentRows.map((p, i) => {
                    const pct = session.net_sales > 0
                      ? (p.amount / session.net_sales) * 100 : 0;
                    const barW = (p.amount / maxPayAmt) * 100;
                    const colors = [
                      ['var(--em)',     'var(--emb)'],
                      ['var(--blue)',   'var(--blueb)'],
                      ['var(--purple)', 'var(--purb)'],
                      ['var(--teal)',   'var(--tealb)'],
                      ['var(--orange)', 'var(--orb)'],
                      ['var(--gold)',   'var(--goldb)'],
                    ][i % 6];

                    return (
                      <div key={p.payment_mode_id} className="ssm-pay-card">
                        <div className="ssm-pay-card-header">
                          <div
                            className="ssm-pay-icon"
                            style={{ background: colors[1], color: colors[0] }}
                          >
                            <i className="ti ti-credit-card" />
                          </div>
                          <div className="ssm-pay-card-info">
                            <div className="ssm-pay-card-name">
                              {p.payment_mode?.name ?? `#${p.payment_mode_id}`}
                            </div>
                            <div className="ssm-pay-card-meta">
                              {p.count} عملية · {pct.toFixed(1)}% من الإجمالي
                            </div>
                          </div>
                          <div
                            className="ssm-pay-card-amount"
                            style={{ color: colors[0], direction: 'ltr' }}
                          >
                            {formatDZD(p.amount)}
                          </div>
                        </div>
                        <div className="ssm-pay-card-bar">
                          <div
                            className="ssm-pay-card-bar-fill"
                            style={{ width: `${barW}%`, background: colors[0] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ المنتجات ══ */}
          {tab === 'products' && (
            <div className="ssm-products">
              {topProducts.length === 0 ? (
                <div className="ssm-empty">
                  <i className="ti ti-package" />
                  <span>لا توجد منتجات مسجَّلة بعد</span>
                </div>
              ) : (
                <>
                  <div className="ssm-prod-header-row">
                    <span>#</span>
                    <span>المنتج</span>
                    <span style={{ textAlign: 'center' }}>الكمية</span>
                    <span style={{ textAlign: 'left' }}>الإجمالي</span>
                    <span style={{ textAlign: 'left', minWidth: 80 }}>النسبة</span>
                  </div>
                  {topProducts.map((p, i) => {
                    const barW = (p.total_ttc / maxProdTtc) * 100;
                    return (
                      <div key={p.product_id} className="ssm-prod-row">
                        <div className={`ssm-prod-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
                        <div className="ssm-prod-info">
                          <div className="ssm-prod-name">{p.product_name}</div>
                          <div className="ssm-prod-bar">
                            <div
                              className="ssm-prod-bar-fill"
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                        </div>
                        <div className="ssm-prod-qty">
                          <span>×{p.quantity_sold % 1 === 0 ? p.quantity_sold : p.quantity_sold.toFixed(2)}</span>
                        </div>
                        <div className="ssm-prod-ttc" style={{ direction: 'ltr' }}>
                          {formatDZD(p.total_ttc)}
                        </div>
                        <div className="ssm-prod-pct">
                          {session.net_sales > 0
                            ? ((p.total_ttc / session.net_sales) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* ════ Footer ════ */}
        <div className="ssm-footer">
          {session.status === 'open' && (
            <button
              type="button"
              className="ssm-btn-end"
              onClick={onEndSession}
            >
              <i className="ti ti-door-exit" /> إغلاق الجلسة
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="ssm-btn-print"
            onClick={() => setPrintModalOpen(true)}
          >
            <i className="ti ti-printer" /> طباعة التقرير
          </button>
          <button type="button" className="ssm-btn-close" onClick={onClose}>
            <i className="ti ti-x" /> إغلاق
          </button>
        </div>
      </div>

      {/* ════ Template Print Modal ════ */}
      {reportData && companyInfo && (
        <TemplatePrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          data={reportData}
          company={companyInfo}
          templates={reportTemplates}
          docTypeCode="RPT"
        />
      )}
    </div>
  );
}

```

## FILE: ./resources/js/pos/components/Sparkline.tsx

```
export default function Sparkline({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="pss-spark">
      <div className="pss-spark-bar" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

```

## FILE: ./resources/js/pos/hooks/useKeyboardMap.ts

```
import React from 'react';

const STORAGE_KEY = 'pos-kb-override-';
const KB_CHANGE_EVENT = 'pos-kb-changed';

export const KB_DEFAULTS: Record<string, string> = {
  newSale: '',
  settings: '',
  toggleQuickbar: '',
  kioskMode: '',
  focusClient: 'Ctrl+K',
  closeSession: '',
  searchFocus: 'F2',
  payment: 'F4',
  holdCart: 'F5',
  heldCarts: 'F7',
  preview: 'F9',
  clearCart: 'F12',
  kbHelp: 'F1',
  filter: 'F3',
  manualProduct: 'F6',
  sessionStats: 'F8',
  returns: 'F10',
  fullscreen: 'F11',
  directPrint: 'Ctrl+P',
  quickSearch: 'Ctrl+F',
  gridView: 'Ctrl+ArrowUp',
  listView: 'Ctrl+ArrowDown',
  zoomIn: 'Ctrl+]',
  zoomOut: 'Ctrl+[',
  quickCat: 'Alt+1..9',
  qtyUp: 'NumpadAdd',
  qtyDown: 'NumpadSubtract',
  deleteItem: 'Delete',
  enterSearch: 'Enter',
  escape: 'Escape',
  confirmPayment: 'Ctrl+Enter',
  openDrawer: 'Ctrl+D',
  undoClear: 'Ctrl+Z',
  toggleHeld: 'Ctrl+ArrowRight',
  sessionInvoices: 'Ctrl+Shift+I',
  focusCart: 'Ctrl+Space',
  quickCash: '',
};

export function normalizeEventKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  const key = e.key;
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return parts.join('+');
  parts.push(key === ' ' ? 'Space' : key);
  return parts.join('+');
}

export function readOverrides(slug: string | null): Record<string, string> {
  if (!slug) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${slug}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Persist overrides and notify all components */
export function saveOverrides(slug: string | null, overrides: Record<string, string>): void {
  if (!slug) return;
  localStorage.setItem(`${STORAGE_KEY}${slug}`, JSON.stringify(overrides));
  window.dispatchEvent(new CustomEvent(KB_CHANGE_EVENT, { detail: { slug } }));
}

/** Like matchOverride but takes pre-read overrides — avoids 25× localStorage reads per keypress */
export function matchOverrideFrom(
  overrides: Record<string, string>,
  action: string,
  e: KeyboardEvent
): boolean {
  const expected = overrides[action] ?? KB_DEFAULTS[action];
  if (!expected) return false;
  return normalizeEventKey(e) === expected;
}

/** Get effective shortcut for an action (override or default, null if disabled) */
export function getEffectiveShortcut(slug: string | null, action: string): string | null {
  if (!slug) return null;
  const overrides = readOverrides(slug);
  const val = overrides[action];
  if (val === '') return null;
  return val ?? KB_DEFAULTS[action] ?? null;
}

/** React hook — returns current overrides, updates on saveOverrides() */
export function useKbOverrides(slug: string | null): Record<string, string> {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setV(x => x + 1);
    window.addEventListener(KB_CHANGE_EVENT, handler);
    return () => window.removeEventListener(KB_CHANGE_EVENT, handler);
  }, []);
  return React.useMemo(() => readOverrides(slug), [slug, v]);
}

```

## FILE: ./resources/js/pos/hooks/useKeyboardShortcuts.ts

```
// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/useKeyboardShortcuts.ts
//
// معالج اختصارات لوحة المفاتيح الرئيسي لشاشة POS — مستخرج من POSPage
// ليقلل حجم الملف ويجعل إعادة تركيب المعالج أسرع (يعتمد على refs فقط
// للبيانات المتغيرة بكثرة مثل pos.items).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchOverrideFrom } from './useKeyboardMap';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';
import type { CartItem } from '@/types';
import type { ActiveModal } from '../utils/posHelpers';

/** Subset of the usePOS() return used by keyboard shortcuts */
export interface POSApi {
  items:          CartItem[];
  searchQuery:    string;
  holdCart:       () => void;
  clearCart:      () => void;
  setCategory:    (id: number | null) => void;
  updateQty:      (id: string, qty: number) => void;
  removeItem:     (id: string) => void;
}

export interface KeyboardShortcutsRefs {
  posRef:         RefObject<POSApi>;
  overridesRef:   RefObject<Record<string, string>>;
  searchRef:      RefObject<HTMLInputElement | null>;
  cartRef:        RefObject<HTMLDivElement | null>;
  cartApiRef:     RefObject<{ scrollToItemId: (id: string) => void; openCustomerModal: () => void } | null>;
}

export interface KeyboardShortcutsState {
  isEmpty:               boolean;
  modal:                 ActiveModal;
  showFilter:            boolean;
  showSessionInvoices:   boolean;
  showSettings:          boolean;
  showCloseSession:      boolean;
  pinModal:              { requestedDiscount: number; reason: string; onSuccess: () => void } | null;
  selectedCartItemId:    string | null;
  families:              Array<{ id: number }>;
}

export interface KeyboardShortcutsSetters {
  setModal:              React.Dispatch<React.SetStateAction<ActiveModal>>;
  setFilter:             React.Dispatch<React.SetStateAction<boolean>>;
  setShowSessionInvoices:React.Dispatch<React.SetStateAction<boolean>>;
  setShowSettings:       React.Dispatch<React.SetStateAction<boolean>>;
  setShowCloseSession:   React.Dispatch<React.SetStateAction<boolean>>;
  setPinModal:           React.Dispatch<React.SetStateAction<{ requestedDiscount: number; reason: 'max_exceeded' | 'pin_required'; onSuccess: () => void } | null>>;
  setSelectedCartItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setView:               React.Dispatch<React.SetStateAction<'grid' | 'list'>>;
  setGridSize:           React.Dispatch<React.SetStateAction<'xs' | 'sm' | 'md' | 'lg'>>;
  setReceiptSnapshot:    React.Dispatch<React.SetStateAction<POSSaleSnapshot | null>>;
}

export interface KeyboardShortcutsActions {
  toggleFullscreen:      () => void;
  handleClearCart:       () => void;
  handleOpenDrawer:      () => void;
  handleUndoClear:       () => void;
  handleToggleQuickbar:  () => void;
  handleSearchEscape:    () => void;
  handleQuickCash:       () => void;
  deleteConfirm:         { confirm: (msg: string, opts?: { title?: string; confirmText?: string; cancelText?: string; variant?: 'danger' | 'warning' | 'info' }) => Promise<boolean> };
}

export function useKeyboardShortcuts(
  refs:       KeyboardShortcutsRefs,
  state:      KeyboardShortcutsState,
  setters:    KeyboardShortcutsSetters,
  actions:    KeyboardShortcutsActions,
) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const overrides = refs.overridesRef.current ?? {};
      const tag     = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      const anyModalOpen = state.modal !== 'none' || state.showSessionInvoices || state.showSettings || state.showCloseSession || !!state.pinModal;
      if (anyModalOpen) {
        if (matchOverrideFrom(overrides, 'escape', e)) {
          e.preventDefault();
          if (state.modal !== 'none')                    setters.setModal('none');
          else if (state.showSessionInvoices)            setters.setShowSessionInvoices(false);
          else if (state.showSettings)                   setters.setShowSettings(false);
          else if (state.showCloseSession)               setters.setShowCloseSession(false);
          else if (state.pinModal)                       setters.setPinModal(null);
        }
        return;
      }

      if (matchOverrideFrom(overrides, 'searchFocus', e))  { e.preventDefault(); refs.searchRef.current?.focus(); }
      if (matchOverrideFrom(overrides, 'focusCart', e))    { e.preventDefault(); if (document.activeElement === refs.searchRef.current) { const lastItem = refs.posRef.current.items[refs.posRef.current.items.length - 1]; if (lastItem) { setters.setSelectedCartItemId(lastItem.id); refs.cartApiRef.current?.scrollToItemId(lastItem.id); } else { refs.cartRef.current?.focus(); } } else { refs.searchRef.current?.focus(); } }
      if (matchOverrideFrom(overrides, 'payment', e))      { e.preventDefault(); if (!state.isEmpty) { setters.setModal('payment'); } }
      if (matchOverrideFrom(overrides, 'quickCash', e))   { e.preventDefault(); if (!state.isEmpty) { actions.handleQuickCash(); } }
      if (matchOverrideFrom(overrides, 'holdCart', e))     { e.preventDefault(); if (!state.isEmpty) refs.posRef.current.holdCart(); }
      if (matchOverrideFrom(overrides, 'manualProduct', e)){ e.preventDefault(); setters.setModal('manual'); }
      if (matchOverrideFrom(overrides, 'heldCarts', e))    { e.preventDefault(); setters.setModal('held'); }
      if (matchOverrideFrom(overrides, 'toggleHeld', e))   { e.preventDefault(); setters.setModal('held'); }
      if (matchOverrideFrom(overrides, 'sessionInvoices', e)) { e.preventDefault(); setters.setShowSessionInvoices(true); }
      if (matchOverrideFrom(overrides, 'sessionStats', e)) { e.preventDefault(); setters.setModal(m => m === 'session' ? 'none' : 'session'); }
      if (matchOverrideFrom(overrides, 'preview', e)) {
        e.preventDefault();
        if (!state.isEmpty) {
          const pos = refs.posRef.current;
          setters.setReceiptSnapshot({
            items: pos.items.map(i => ({
              name: i.product_name, ref: i.ref, qty: i.quantity,
              unit_price_ht: i.unit_price_ht, unit: i.unit_symbol,
              tva_rate: i.tva_rate / 100, discount_percentage: i.discount_percentage, total_ht: i.total_ht,
            })),
            totals: { ...pos.totals },
          } as POSSaleSnapshot);
          setters.setModal('receipt');
        }
      }
      if (matchOverrideFrom(overrides, 'fullscreen', e))  { e.preventDefault(); actions.toggleFullscreen(); }
      if (matchOverrideFrom(overrides, 'clearCart', e))    { e.preventDefault(); actions.handleClearCart(); }
      if (matchOverrideFrom(overrides, 'kbHelp', e))       { e.preventDefault(); setters.setModal('kbhelp'); }
      if (matchOverrideFrom(overrides, 'returns', e))      { e.preventDefault(); setters.setModal('returns'); }
      if (matchOverrideFrom(overrides, 'openDrawer', e))   { e.preventDefault(); actions.handleOpenDrawer(); }
      if (matchOverrideFrom(overrides, 'undoClear', e))    { e.preventDefault(); actions.handleUndoClear(); }
      if (matchOverrideFrom(overrides, 'newSale', e))      { e.preventDefault(); if (state.isEmpty) { refs.posRef.current.clearCart(); } else { refs.posRef.current.holdCart(); } }
      if (matchOverrideFrom(overrides, 'settings', e))     { e.preventDefault(); setters.setShowSettings(true); }
      if (matchOverrideFrom(overrides, 'toggleQuickbar', e)) { e.preventDefault(); actions.handleToggleQuickbar(); }
      if (matchOverrideFrom(overrides, 'kioskMode', e))    { e.preventDefault(); navigate('/pos/kiosk'); }
      if (matchOverrideFrom(overrides, 'closeSession', e)) { e.preventDefault(); setters.setShowCloseSession(true); }
      if (matchOverrideFrom(overrides, 'focusClient', e))   { e.preventDefault(); refs.cartApiRef.current?.openCustomerModal(); }

      if (!inInput) {
        if (matchOverrideFrom(overrides, 'gridView', e))   { e.preventDefault(); setters.setView('grid'); }
        if (matchOverrideFrom(overrides, 'listView', e))   { e.preventDefault(); setters.setView('list'); }
        if (matchOverrideFrom(overrides, 'zoomIn', e)) {
          e.preventDefault();
          setters.setGridSize(s => s === 'xs' ? 'sm' : s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'lg');
        }
        if (matchOverrideFrom(overrides, 'zoomOut', e)) {
          e.preventDefault();
          setters.setGridSize(s => s === 'lg' ? 'md' : s === 'md' ? 'sm' : s === 'sm' ? 'xs' : 'xs');
        }
      }
      if (e.altKey && !isNaN(parseInt(e.key)) && !inInput) {
        const idx = parseInt(e.key) - 1;
        if (idx === -1) refs.posRef.current.setCategory(null);
        else if (idx < state.families.length) refs.posRef.current.setCategory(state.families[idx].id);
        e.preventDefault();
      }
      if (!inInput) {
        const inCart = refs.cartRef.current?.contains(document.activeElement);
        const lastItem = refs.posRef.current.items[refs.posRef.current.items.length - 1];
        if (matchOverrideFrom(overrides, 'qtyUp', e)   && lastItem && !inCart)                          { e.preventDefault(); refs.posRef.current.updateQty(lastItem.id, lastItem.quantity + 1); }
        if (matchOverrideFrom(overrides, 'qtyDown', e) && lastItem && lastItem.quantity > 1 && !inCart) { e.preventDefault(); refs.posRef.current.updateQty(lastItem.id, lastItem.quantity - 1); }
        if (matchOverrideFrom(overrides, 'deleteItem', e) && state.selectedCartItemId) {
          e.preventDefault();
          const id = state.selectedCartItemId;
          const name = refs.posRef.current.items.find(i => i.id === id)?.product_name ?? '';
          actions.deleteConfirm.confirm(`هل تريد حذف "${name}" من السلة؟`, {
            title: 'حذف صنف',
            variant: 'danger',
            confirmText: 'حذف',
            cancelText: 'إلغاء',
          }).then(ok => { if (ok) { refs.posRef.current.removeItem(id); setters.setSelectedCartItemId(null); } });
        }
      }
      if (matchOverrideFrom(overrides, 'escape', e)) {
        if (state.modal !== 'none')                 setters.setModal('none');
        else if (state.showFilter)                  setters.setFilter(false);
        else if (!inInput && refs.posRef.current.searchQuery) actions.handleSearchEscape();
      }

      // ── Cart row keyboard controls ─────────────────────────────────────
      if (!inInput && state.selectedCartItemId) {
        if (e.ctrlKey && e.key === '*') {
          e.preventDefault();
          setters.setModal('qty');
          return;
        }
        const isPlus  = e.key === 'Enter' || (e.ctrlKey && (e.key === '+' || e.code === 'Equal')) || e.code === 'NumpadAdd';
        const isMinus = (e.ctrlKey && e.key === '-') || e.code === 'NumpadSubtract';
        if (isPlus) {
          e.preventDefault();
          const item = refs.posRef.current.items.find(i => i.id === state.selectedCartItemId);
          if (item) refs.posRef.current.updateQty(item.id, item.quantity + 1);
        } else if (isMinus) {
          e.preventDefault();
          const item = refs.posRef.current.items.find(i => i.id === state.selectedCartItemId);
          if (item && item.quantity > 1) refs.posRef.current.updateQty(item.id, item.quantity - 1);
        }
      }

      // ── Arrow keys navigate cart rows (via cartApiRef) ─────────────────
      if (!inInput && refs.cartApiRef.current && state.selectedCartItemId && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const curIdx = refs.posRef.current.items.findIndex(i => i.id === state.selectedCartItemId);
        if (curIdx >= 0) {
          e.preventDefault();
          const nextIdx = e.key === 'ArrowDown' ? curIdx + 1 : curIdx - 1;
          if (nextIdx >= 0 && nextIdx < refs.posRef.current.items.length) {
            const nextItem = refs.posRef.current.items[nextIdx];
            setters.setSelectedCartItemId(nextItem.id);
            refs.cartApiRef.current.scrollToItemId(nextItem.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    state.isEmpty, state.modal, state.showFilter, state.showSessionInvoices,
    state.showSettings, state.showCloseSession, state.pinModal,
    state.families, state.selectedCartItemId,
    actions.toggleFullscreen, actions.handleClearCart, actions.handleOpenDrawer,
    actions.handleUndoClear, actions.handleToggleQuickbar, actions.handleSearchEscape,
    navigate,
  ]);
}

```

## FILE: ./resources/js/pos/hooks/usePOS.ts

```
import { useMemo, useCallback } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcTotals }    from '../utils/calculations';

export function usePOS(fiscalStampEnabled = true) {
  const heldCarts        = usePOSStore(s => s.heldCarts);
  const searchQuery      = usePOSStore(s => s.searchQuery);
  const selectedCategory = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen = usePOSStore(s => s.paymentModalOpen);

  const setSearch              = usePOSStore(s => s.setSearch);
  const setCategory            = usePOSStore(s => s.setCategory);
  const openPayment            = usePOSStore(s => s.openPayment);
  const closePayment           = usePOSStore(s => s.closePayment);
  const restoreCart            = usePOSStore(s => s.restoreCart);
  const deleteHeldCart         = usePOSStore(s => s.deleteHeldCart);

  const items              = useCartStore(s => s.items);
  const client             = useCartStore(s => s.client);
  const invoiceDiscountPct = useCartStore(s => s.invoiceDiscountPct);
  const payments           = useCartStore(s => s.payments);

  const addItem              = useCartStore(s => s.addItem);
  const removeItem           = useCartStore(s => s.removeItem);
  const updateQty            = useCartStore(s => s.updateQty);
  const updateDiscount       = useCartStore(s => s.updateDiscount);
  const updateDiscountAmount = useCartStore(s => s.updateDiscountAmount);
  const updatePrice          = useCartStore(s => s.updatePrice);
  const clearCart            = useCartStore(s => s.clearCart);
  const setClient            = useCartStore(s => s.setClient);
  const setInvoiceDiscountPct = useCartStore(s => s.setInvoiceDiscountPct);

  const totals = useMemo(
    () => calcTotals(items, invoiceDiscountPct, fiscalStampEnabled, client?.is_tva_exempt ?? false),
    [items, invoiceDiscountPct, fiscalStampEnabled, client?.is_tva_exempt],
  );

  const holdCart = useCallback((label?: string) => {
    usePOSStore.getState().holdCart({
      items, totals, client, label, clearCart,
    });
  }, [items, totals, client, clearCart]);

  return useMemo(() => ({
    heldCarts, holdCart, restoreCart, deleteHeldCart,

    searchQuery, selectedCategory, paymentModalOpen,
    setSearch, setCategory, openPayment, closePayment,

    items, client, invoiceDiscountPct, payments,
    addItem, removeItem, updateQty,
    updateDiscount, updateDiscountAmount, updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  }), [
    heldCarts, holdCart, restoreCart, deleteHeldCart,
    searchQuery, selectedCategory, paymentModalOpen,
    setSearch, setCategory, openPayment, closePayment,
    items, client, invoiceDiscountPct, payments,
    addItem, removeItem, updateQty,
    updateDiscount, updateDiscountAmount, updatePrice,
    clearCart, setClient, setInvoiceDiscountPct,
    totals,
  ]);
}

```

## FILE: ./resources/js/pos/hooks/usePosSessions.ts

```
import { useState, useMemo, useCallback } from 'react';
import {
  useCurrentPosSession,
  usePosSessionList,
  usePosSession,
  useOpenSession,
  useCloseSession,
} from '@/lib/api/endpoints/posSession';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import { useFiscalYears } from '@/lib/api/endpoints/fiscalYears';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export type StatusFilter = '' | 'open' | 'closed' | 'suspended';
export type ViewMode = 'table' | 'cards';

export const STATUS_VARIANT: Record<string, 'success' | 'gray' | 'warning'> = {
  open:      'success',
  closed:    'gray',
  suspended: 'warning',
};

export const STATUS_LABEL: Record<string, string> = {
  open:      'مفتوحة',
  closed:    'مغلقة',
  suspended: 'معلقة',
};

export function usePosSessions() {

  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [viewMode,     setViewMode]     = useState<ViewMode>('table');
  const [search,       setSearch]       = useState('');

  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [showOpenModal,  setShowOpenModal]   = useState(false);
  const [showCloseModal, setShowCloseModal]  = useState(false);
  const [showStatsModal, setShowStatsModal]  = useState(false);
  const [openError,      setOpenError]       = useState<string | null>(null);
  const [closeError,     setCloseError]      = useState<string | null>(null);

  const { data: paginated, isLoading, isFetching } = usePosSessionList({
    per_page: 25,
    page,
    ...(statusFilter && { status: statusFilter }),
    ...(dateFrom     && { date_from: dateFrom }),
    ...(dateTo       && { date_to:   dateTo   }),
  });

  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();

  const { data: selectedSession, isLoading: selectedLoading } = usePosSession(selectedId);

  const { data: warehouses = [] } = useWarehouses();
  const { data: fyData } = useFiscalYears();
  const fiscalYears = fyData?.open ?? fyData?.years ?? [];
  const defaultFiscalYearId = fyData?.current?.id ?? null;
  const defaultWarehouseId = (warehouses[0] as any)?.id ?? null;

  const openMut = useOpenSession();
  const closeSessionId = selectedId ?? currentSession?.id ?? null;
  const closeMut = useCloseSession(closeSessionId);

  const sessions: PosSession[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s =>
      s.user?.name?.toLowerCase().includes(q) ||
      s.warehouse?.name?.toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const totalSales    = useMemo(() => sessions.reduce((acc, x) => acc + Number(x.net_sales   ?? 0), 0), [sessions]);
  const totalInvoices = useMemo(() => sessions.reduce((acc, x) => acc + Number(x.invoices_count ?? 0), 0), [sessions]);
  const openCount     = useMemo(() => sessions.filter(x => x.status === 'open').length,   [sessions]);
  const closedCount   = useMemo(() => sessions.filter(x => x.status === 'closed').length, [sessions]);
  const avgSale       = totalInvoices > 0 ? totalSales / totalInvoices : 0;
  const maxSale       = useMemo(() => Math.max(...sessions.map(s => Number(s.net_sales ?? 0)), 0), [sessions]);

  const hasFilters = !!(statusFilter || dateFrom || dateTo || search);

  const handleOpenSession = async (data: {
    warehouse_id:   number;
    fiscal_year_id: number;
    opening_cash:   number;
    opening_note?:  string;
  }) => {
    setOpenError(null);
    try {
      await openMut.mutateAsync(data);
      setShowOpenModal(false);
    } catch (e: any) {
      setOpenError(
        e?.response?.data?.message ??
        e?.message ??
        'فشل فتح الجلسة',
      );
    }
  };

  const handleCloseSession = async (data: {
    closing_cash_counted: number;
    closing_note?:        string;
  }) => {
    setCloseError(null);
    try {
      await closeMut.mutateAsync(data);
      setShowCloseModal(false);
      setSelectedId(null);
    } catch (e: any) {
      setCloseError(
        e?.response?.data?.message ??
        e?.message ??
        'فشل إغلاق الجلسة',
      );
    }
  };

  const openStats = useCallback((id: number) => {
    setSelectedId(id);
    setShowStatsModal(true);
  }, []);

  const openClose = useCallback((id: number) => {
    setSelectedId(id);
    setShowCloseModal(true);
  }, []);

  const resetFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  return {
    page, setPage,
    statusFilter, setStatusFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    viewMode, setViewMode,
    search, setSearch,
    selectedId, setSelectedId,
    showOpenModal, setShowOpenModal,
    showCloseModal, setShowCloseModal,
    showStatsModal, setShowStatsModal,
    openError, setOpenError,
    closeError, setCloseError,

    paginated, isLoading, isFetching,
    currentSession, sessionLoading,
    selectedSession, selectedLoading,
    warehouses,
    fiscalYears, defaultFiscalYearId, defaultWarehouseId,
    openMut, closeMut,

    sessions, meta,
    filtered,
    totalSales, totalInvoices, openCount, closedCount, avgSale, maxSale,
    hasFilters,

    handleOpenSession, handleCloseSession,
    openStats, openClose,
    resetFilters,
  };
}

```

## FILE: ./resources/js/pos/hooks/usePOSSettings.ts

```
// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePOSSettings.ts
//
// إعدادات POS الكاملة — محفوظة في localStorage بـ slug منفصل لكل شركة
//
// يُستخدَم في:
//   - POSPage:    قراءة defaultWarehouseId, defaultDocTypeCode, priceMode...
//   - CartStore:  maxDiscountPct لمنع تجاوز الكاشير حد الخصم
//   - Receipt:    companyHeader, footerMessage
//   - PaymentModal: defaultPaymentModeCode, openCashDrawer
//   - ProductCard:  priceDisplayMode (ht | ttc)
//
// للتعديل: <POSSettingsModal /> يستدعي setSettings()
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PriceDisplayMode = 'ttc' | 'ht';
export type GridDefaultSize  = 'xs' | 'sm' | 'md' | 'lg';
export type QuickCashAction  = 'silent' | 'preview' | 'print' | 'none';
export type AfterSaleAction  = 'preview' | 'print' | 'none';

export interface POSSettings {
  // ── مستودع وفاتورة ──────────────────────────────────────────────────────
  /** ID المستودع الافتراضي — null يعني يُقرأ من warehouses[is_default] */
  defaultWarehouseId:   number | null;
  /** كود نوع الفاتورة الافتراضي عند الإنهاء — FV, BL, FAC */
  defaultDocTypeCode:   string;

  // ── أسعار وخصومات ───────────────────────────────────────────────────────
  /** عرض الأسعار في بطاقات المنتجات — HT أو TTC */
  priceDisplayMode:     PriceDisplayMode;
  /** الحد الأقصى للخصم الذي يستطيع الكاشير تطبيقه — 0 = لا حد */
  maxDiscountPct:       number;
  /** هل يحتاج الخصم فوق X% تأكيد مدير (PIN) */
  discountRequirePin:   boolean;
  /** النسبة التي فوقها يُطلب PIN */
  discountPinThreshold: number;
  /** PIN رقمي 4 أرقام للمدير */
  managerPin:           string;

  // ── طباعة ───────────────────────────────────────────────────────────────
  /** فتح درج النقود تلقائياً عند الدفع نقداً */
  openCashDrawer:       boolean;
  /** ماذا يحدث بعد إتمام البيع العادي */
  afterSaleAction:      AfterSaleAction;
  /** عدد نسخ الطباعة */
  printCopies:          1 | 2 | 3;
  /** طريقة الطباعة */
  printMode:            'thermal' | 'browser';
  /** سلوك الدفع السريع (نقدي كامل) */
  quickCashAction:      QuickCashAction;

  // ── رأس وتذييل الإيصال ─────────────────────────────────────────────────
  /** اسم المؤسسة في رأس الإيصال — null يعني يُقرأ من activeCompany */
  receiptCompanyName:   string | null;
  /** سطر إضافي في رأس الإيصال (العنوان، الهاتف...) */
  receiptHeader2:       string;
  /** رسالة في تذييل الإيصال */
  receiptFooter:        string;
  /** إظهار QR code في الإيصال */
  receiptShowQr:        boolean;

  // ── واجهة المستخدم ───────────────────────────────────────────────────────
  /** حجم شبكة المنتجات الافتراضي */
  defaultGridSize:      GridDefaultSize;
  /** عرض الشبكة أو القائمة الافتراضي */
  defaultView:          'grid' | 'list';
  /** إظهار شريط Quick Items عند فتح الصفحة */
  showQuickbarOnStart:  boolean;
  /** تشغيل صوت عند إضافة منتج */
  playSoundOnAdd:       boolean;
  /** تشغيل صوت عند إتمام البيع */
  playSoundOnSale:      boolean;
  /** النغمة المختارة للصوت */
  soundPreset:          string;
  /** مستوى الصوت 0-100 */
  soundVolume:          number;
  /** إغلاق نافذة الدفع تلقائياً بعد النجاح (بدلاً من الانتظار للطباعة) */
  autoClosePayment:     boolean;
  /** طلب تأكيد قبل مسح السلة */
  confirmOnClear:       boolean;
  /** الوضع الافتراضي لطريقة الدفع */
  defaultPaymentCode:   string;

  // ── بطاقة المنتج ────────────────────────────────────────────────────────
  /** إظهار المخزون في بطاقة المنتج */
  showStockOnCard:      boolean;
  /** إخفاء المنتجات النافذة من الشبكة */
  hideOutOfStock:       boolean;
  /** تفريغ حقل البحث بعد إضافة منتج */
  clearSearchOnAdd:     boolean;
  /** التنقل عبر نتائج البحث بلوحة المفاتيح */
  keyboardNav:          boolean;
  /** التقدم تلقائياً للمنتج التالي بعد الإضافة (true) أو البقاء على نفس المنتج (false) */
  advanceOnAdd:         boolean;

  // ── تخطيط الشاشة ──────────────────────────────────────────────────────
  /** عرض السلة (بالـ px) — قابل للسحب */
  cartWidth:            number;

  // ── الإشعارات ─────────────────────────────────────────────────────────
  /** تفعيل/تعطيل الإشعارات (toast) */
  toastEnabled:         boolean;
  /** مدة عرض الإشعارات (toast) بالميللي ثانية — 0 = حتى يُضغط عليها */
  toastDuration:        number;
  /** مكان ظهور الإشعارات (toast) */
  toastPosition:        'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

// ─── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_POS_SETTINGS: POSSettings = {
  defaultWarehouseId:   null,
  defaultDocTypeCode:   'POS',
  priceDisplayMode:     'ttc',
  maxDiscountPct:       0,
  discountRequirePin:   false,
  discountPinThreshold: 20,
  managerPin:           '',
  openCashDrawer:       false,
  afterSaleAction:      'preview',
  printCopies:          1,
  printMode:            'browser',
  quickCashAction:      'silent',
  receiptCompanyName:   null,
  receiptHeader2:       '',
  receiptFooter:        'شكراً لتعاملكم معنا',
  receiptShowQr:        false,
  defaultGridSize:      'md',
  defaultView:          'grid',
  showQuickbarOnStart:  true,
  playSoundOnAdd:       false,
  playSoundOnSale:      false,
  soundPreset:          'classic',
  soundVolume:          60,
  autoClosePayment:     false,
  confirmOnClear:       true,
  defaultPaymentCode:   'cash',
  showStockOnCard:      true,
  hideOutOfStock:       false,
  clearSearchOnAdd:     false,
  keyboardNav:          true,
  advanceOnAdd:         true,
  cartWidth:            390,
  toastEnabled:         true,
  toastDuration:        3000,
  toastPosition:        'top-left',
};

// ─── Storage key ──────────────────────────────────────────────────────────────

const settingsKey = (slug: string | null) =>
  slug ? `pos-settings-${slug}` : 'pos-settings-global';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePOSSettings(slug: string | null) {
  const [settings, setSettingsState] = useState<POSSettings>(() => {
    try {
      const stored = localStorage.getItem(settingsKey(slug));
      if (!stored) return DEFAULT_POS_SETTINGS;
      // merge: القيم الجديدة المضافة في DEFAULT تُرث قيمتها الافتراضية
      return { ...DEFAULT_POS_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_POS_SETTINGS;
    }
  });

  // تحديث عند تغيير الـ slug (تبديل الشركة)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(settingsKey(slug));
      if (stored) {
        setSettingsState({ ...DEFAULT_POS_SETTINGS, ...JSON.parse(stored) });
      } else {
        setSettingsState(DEFAULT_POS_SETTINGS);
      }
    } catch {
      setSettingsState(DEFAULT_POS_SETTINGS);
    }
  }, [slug]);

  const setSettings = useCallback((patch: Partial<POSSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(settingsKey(slug), JSON.stringify(next)); }
      catch { /* storage full */ }
      return next;
    });
  }, [slug]);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_POS_SETTINGS);
    try { localStorage.removeItem(settingsKey(slug)); } catch {}
  }, [slug]);

  return { settings, setSettings, resetSettings };
}

// ─── Discount gate ────────────────────────────────────────────────────────────

/**
 * يتحقق هل يستطيع الكاشير تطبيق الخصم المطلوب
 * Returns: { allowed: true } | { allowed: false, reason: 'max_exceeded' | 'pin_required' }
 */
export function checkDiscountAllowed(
  discountPct: number,
  settings:    POSSettings,
): { allowed: boolean; reason?: 'max_exceeded' | 'pin_required' } {
  const max = settings.maxDiscountPct;
  if (max > 0 && discountPct > max) {
    return { allowed: false, reason: 'max_exceeded' };
  }
  if (
    settings.discountRequirePin &&
    settings.managerPin &&
    discountPct > settings.discountPinThreshold
  ) {
    return { allowed: false, reason: 'pin_required' };
  }
  return { allowed: true };
}

```

## FILE: ./resources/js/pos/hooks/usePOSStore.ts

```
// resources/js/pos/hooks/usePOSStore.ts
import { create }       from 'zustand';
import { nanoid }       from 'nanoid';
import { useCartStore } from '../utils/useCartStore';
import type { HeldCart, CartItem, CartTotals, Party } from '@/types';

interface POSState {
  heldCarts:          HeldCart[];
  searchQuery:        string;
  selectedCategory:   number | null;
  paymentModalOpen:   boolean;
  invoiceDiscountPct: number;

  holdCart:   (params: {
    items:     CartItem[];
    totals:    CartTotals;
    client:    Party | null;
    label?:    string;
    clearCart: () => void;
  }) => void;
  restoreCart:           (id: string) => void;
  deleteHeldCart:        (id: string) => void;
  setSearch:             (q: string) => void;
  setCategory:           (id: number | null) => void;
  openPayment:           () => void;
  closePayment:          () => void;
  setInvoiceDiscountPct: (pct: number) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  heldCarts:          [],
  searchQuery:        '',
  selectedCategory:   null,
  paymentModalOpen:   false,
  invoiceDiscountPct: 0,

  holdCart: ({ items, totals, client, label, clearCart }) => {
    if (!items.length) return;

    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals,
      client:     client ?? null,
      created_at: new Date().toISOString(),
    };

    set(s => ({ heldCarts: [...s.heldCarts, held] }));
    clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find(c => c.id === id);
    if (!held) return;
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) })),

  setSearch:   (q)   => set({ searchQuery: q }),
  setCategory: (id)  => set({ selectedCategory: id }),
  openPayment: ()    => set({ paymentModalOpen: true }),
  closePayment: ()   => set({ paymentModalOpen: false }),

  setInvoiceDiscountPct: (pct) =>
    set({ invoiceDiscountPct: Math.max(0, Math.min(100, pct)) }),
}));

```

## FILE: ./resources/js/pos/hooks/usePrintSettings.ts

```
// resources/js/pos/hooks/usePrintSettings.ts
// ════════════════════════════════════════════════════════════════════════════
//  Hook موحَّد لإعدادات الطباعة
//  — Template loading via Print Runtime (API) instead of legacy settings API
//  — Document config still uses settings API for printing behavior
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveSlug }    from '@/lib/store/appStore';
import {
  dbFetchDocConfigs, dbSaveDocConfigs,
  deviceGetPrinters, deviceSavePrinters,
} from '../store/printStore';
import { usePrintTemplatesList, resolveTemplate } from '@/pages/settings/print-settings/runtime';
import type { DocTypeCode } from '@/pages/settings/print-settings/types';
import type {
  DocumentPrintConfig,
  DetectedPrinter, PaperSize,
} from '@/pages/settings/print-settings/types';

// ─── Query Keys ──────────────────────────────────────────────────────────────

const K = {
  docConfigs: (slug: string) => [slug, 'print', 'doc-configs'] as const,
  printers:   (slug: string) => [slug, 'print', 'printers']    as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** تكوين المستندات من DB (طباعة: نسخ، auto-print، طابعة، إلخ) */
export function useDocPrintConfigs() {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey:  K.docConfigs(slug),
    queryFn:   dbFetchDocConfigs,
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

/** الطابعات من localStorage (device-specific) */
export function usePrintersList() {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey: K.printers(slug),
    queryFn:  () => deviceGetPrinters(slug),
    enabled:  !!slug,
    staleTime: Infinity, // لا تُعاد الجلب — localStorage لا يتغير من تلقاء نفسه
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** حفظ تكوين المستندات */
export function useSaveDocConfigs() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: (configs: DocumentPrintConfig[]) => dbSaveDocConfigs(configs),

    onMutate: async (configs) => {
      await qc.cancelQueries({ queryKey: K.docConfigs(slug) });
      const prev = qc.getQueryData(K.docConfigs(slug));
      qc.setQueryData(K.docConfigs(slug), configs);
      return { prev };
    },

    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(K.docConfigs(slug), ctx.prev);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: K.docConfigs(slug) }),
  });
}

/** حفظ الطابعات في localStorage */
export function useSavePrinters() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: (printers: DetectedPrinter[]) => {
      deviceSavePrinters(slug, printers);
      return Promise.resolve(printers);
    },
    onSuccess: (printers) => {
      qc.setQueryData(K.printers(slug), printers);
    },
  });
}

// ─── للاستخدام في POS (بسيط) ─────────────────────────────────────────────────

const PAPER_WIDTH_MAP: Record<string, number> = {
  '80mm': 80,
  '58mm': 58,
  'A4': 210,
  'A5': 148,
};

interface PrintSettingsResult {
  config:    DocumentPrintConfig | null;
  template:  import('@/pages/settings/print-settings/types/domain').PrintTemplate | null;
  enabled:   boolean;
  autoPrint: boolean;
  showPreview: boolean;
  copies:    number;
  paperSize: PaperSize;
  paperWidth: number;
  printerId: string | null;
}

/** hook للاستخدام في POSPage — يُرجع القالب والإعدادات لنوع مستند */
export function usePrintSettings(docTypeCode: string): PrintSettingsResult {
  const { data: configs = [] } = useDocPrintConfigs();
  const config = configs.find(c => c.docTypeCode === docTypeCode) ?? null;
  const size   = (config?.paperSize ?? 'none') as PaperSize;

  const { data: templates = [] } = usePrintTemplatesList(docTypeCode as DocTypeCode);
  const template = resolveTemplate(templates, docTypeCode, size !== 'none' ? size : '80mm') ?? null;

  return {
    config,
    template,
    enabled:     !!(config?.enabled && size !== 'none'),
    autoPrint:   config?.autoPrint   ?? false,
    showPreview: config?.showPreview ?? true,
    copies:      config?.copies      ?? 1,
    paperSize:   size,
    paperWidth:  PAPER_WIDTH_MAP[size] ?? 80,
    printerId:   config?.printerId ?? null,
  };
}

```

## FILE: ./resources/js/pos/store/printStore.ts

```
// resources/js/pos/store/printStore.ts
// ════════════════════════════════════════════════════════════════════════════
//  POS Print Store — Device layer only (localStorage printer selection)
//  and document print config (settings API).
//
//  Template loading has been migrated to the Print Runtime
//  (usePrintTemplatesList + TemplateResolver via /print-templates API).
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPatch } from '@/lib/api/core/client';
import {
  dbSaveDocConfigs  as _dbSaveDocConfigs,
  dbFetchDocConfigs as _dbFetchDocConfigs,
} from '@/pages/settings/print-settings/services/printStoreService';

// Minimal ApiClient adapter — only the methods printStoreService uses
const hostApi = { get: apiGet, patch: apiPatch } as any;


export const dbSaveDocConfigs = (configs: any[]) => _dbSaveDocConfigs(hostApi, configs);
export const dbFetchDocConfigs = ()         => _dbFetchDocConfigs(hostApi);

import type { DetectedPrinter } from '@/pages/settings/print-settings/types';

// ─── Device Keys (localStorage) ──────────────────────────────────────────────

const DEV_KEY_PRINTERS   = (slug: string) => `print:printers:${slug}`;
const DEV_KEY_DOC_DEVICE = (slug: string) => `print:device_doc:${slug}`;

// ════════════════════════════════════════════════════════════════════════════
//  Device Layer — الطابعات واختيار الطابعة per-doc (localStorage)
// ════════════════════════════════════════════════════════════════════════════

export function deviceGetPrinters(slug: string): DetectedPrinter[] {
  try {
    const raw = localStorage.getItem(DEV_KEY_PRINTERS(slug));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function deviceSavePrinters(slug: string, printers: DetectedPrinter[]): void {
  try { localStorage.setItem(DEV_KEY_PRINTERS(slug), JSON.stringify(printers)); }
  catch { /* storage full */ }
}

/** الطابعة المختارة لمستند بعينه على هذا الجهاز */
export function deviceGetPrinterForDoc(slug: string, docCode: string): string | null {
  try {
    const raw = localStorage.getItem(DEV_KEY_DOC_DEVICE(slug));
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    return map[docCode] ?? null;
  } catch { return null; }
}

export function deviceSetPrinterForDoc(slug: string, docCode: string, printerId: string | null): void {
  try {
    const raw = localStorage.getItem(DEV_KEY_DOC_DEVICE(slug));
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (printerId === null) delete map[docCode];
    else map[docCode] = printerId;
    localStorage.setItem(DEV_KEY_DOC_DEVICE(slug), JSON.stringify(map));
  } catch { /* ignore */ }
}

```

## FILE: ./resources/js/pos/utils/__tests__/thermal-print.baseline.spec.ts

```
// ════════════════════════════════════════════════════════════════════════════
// pos/utils/__tests__/thermal-print.baseline.spec.ts
//
// Baseline vitest suite for the thermal ESC/POS print path.
//
// Captures current behavior of buildReceiptBytesFromTemplate() BEFORE the
// Stage 1 (Section Visibility Gates) refactor.
//
// Design:
//   - Tests marked "BASELINE — no change expected" must pass identically
//     before and after Stage 1.
//   - Tests under "Current behavior (pre-fix)" deliberately document the
//     BROKEN state (sections appearing when their show_*_section flag is
//     OFF). After Stage 1, these assertions will be inverted.
//
// Encoding note:
//   ESC/POS output uses Windows-1256 for Arabic text. We assert on:
//     (a) ESC/POS command bytes (always ASCII-safe)
//     (b) ASCII content embedded in the receipt (doc numbers, NIFs, QR data,
//         numeric values, company names written in Latin chars)
//     (c) Byte length as a proxy for structural presence
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { buildReceiptBytesFromTemplate } from '@/pos/utils/printService';
import { emptyDocumentData } from '@/pages/settings/print-settings/types/data';
import { createMockTemplate } from '@/pages/settings/print-settings/__tests__/fixtures/templates';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a Uint8Array to a hex string for readable test output */
function _toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

/** Check if a Uint8Array contains a byte subsequence */
function containsBytes(haystack: Uint8Array, needle: number[]): boolean {
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

/** Check if a Uint8Array contains an ASCII string */
function containsAscii(haystack: Uint8Array, text: string): boolean {
  return containsBytes(haystack, [...text].map(c => c.charCodeAt(0) & 0xFF));
}

// ─── Factories ──────────────────────────────────────────────────────────────

function makeData(overrides: Partial<UniversalDocumentData> = {}): UniversalDocumentData {
  return {
    ...emptyDocumentData(),
    ...overrides,
  } as UniversalDocumentData;
}

function makeTemplate(overrides: Partial<PrintTemplate> = {}): PrintTemplate {
  return createMockTemplate({
    show_header_section: true,
    show_doc_info_section: true,
    show_items_section: true,
    show_totals_section: true,
    show_payments_section: true,
    show_footer_section: true,
    ...overrides,
  }) as PrintTemplate;
}

// ─── Baseline structural tests (must pass before AND after Stage 1) ─────────

describe('ThermalPrintPath — baseline structural', () => {

  it('starts with ESC/POS init sequence (ESC @, ESC t 16)', () => {
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), makeData());
    expect(bytes[0]).toBe(0x1B);   // ESC
    expect(bytes[1]).toBe(0x40);   // @
    expect(bytes.slice(2, 5)).toEqual(new Uint8Array([0x1B, 0x74, 0x10])); // ESC t 16
  });

  it('ends with GS V NUL (cut command)', () => {
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), makeData());
    const len = bytes.length;
    expect(bytes[len - 3]).toBe(0x1D);  // GS
    expect(bytes[len - 2]).toBe(0x56);  // V
    expect(bytes[len - 1]).toBe(0x00);  // NUL
  });

  it('contains company name in output', () => {
    const tpl = makeTemplate({ company_name_text: 'MaSocieteTest' });
    const data = makeData({
      company: { name: 'MaSocieteTest', address: null, phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, 'MaSocieteTest')).toBe(true);
  });

  it('contains doc number in output', () => {
    const docNumber = 'FV-2026-12345';
    const data = makeData({
      doc: { number: docNumber, date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, docNumber);
    expect(containsAscii(bytes, docNumber)).toBe(true);
  });

  it('contains product names in output', () => {
    const data = makeData({
      lines: [{
        rowNumber: 1, ref: 'REF001', barcode: null,
        name: 'ProduitAlpha', unit: 'pcs', quantity: 2,
        unitPriceHt: 100, unitPriceTtc: 119,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 200, totalTva: 38, totalTtc: 238,
        lot: null, notes: null,
      }],
      totals: { totalHt: 200, totalTva: 38, totalTtc: 238, fiscalStamp: 0, totalDiscount: 0, paid: 238, change: 0, remaining: 0 },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(containsAscii(bytes, 'ProduitAlpha')).toBe(true);
  });

  it('contains company NIF when provided', () => {
    const data = makeData({
      company: { name: 'Co', address: null, phone: null, nif: '123456789012345', rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: true }), data);
    expect(containsAscii(bytes, '123456789012345')).toBe(true);
  });

  it('contains footer thank-you text when show_thank_you is true', () => {
    const tpl = makeTemplate({ show_thank_you: true, thank_you_text: 'MerciInfini' });
    const bytes = buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'MerciInfini')).toBe(true);
  });

  it('omits footer thank-you text when show_thank_you is false', () => {
    const tpl = makeTemplate({ show_thank_you: false, thank_you_text: 'MerciInfini' });
    const bytes = buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'MerciInfini')).toBe(false);
  });

  it('contains QR ESC/POS sequence when show_qr is true', () => {
    const tpl = makeTemplate({ show_qr: true });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    // QR Model 2 select: GS ( k 04 00 31 41 32 00
    expect(containsBytes(bytes, [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])).toBe(true);
  });

  it('omits QR sequence when show_qr is false', () => {
    const tpl = makeTemplate({ show_qr: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsBytes(bytes, [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])).toBe(false);
  });

  it('uses override_address when provided (resolver override)', () => {
    const tpl = makeTemplate({ show_address: true, override_address: '15 Rue Didouche Mourad' });
    const data = makeData({
      company: { name: 'Co', address: 'Old Address', phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, '15 Rue Didouche Mourad')).toBe(true);
  });

  it('includes party name when party is provided', () => {
    const data = makeData({
      party: { name: 'ClientX', phone: null, address: null },
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(containsAscii(bytes, 'ClientX')).toBe(true);
  });

  it('produces deterministic output (same input → same bytes)', () => {
    const tpl = makeTemplate();
    const data = makeData();
    const a = buildReceiptBytesFromTemplate(tpl, data);
    const b = buildReceiptBytesFromTemplate(tpl, data);
    expect(a).toEqual(b);
  });

  it('has reasonable length (> 200 bytes for minimal receipt)', () => {
    const data = makeData({
      company: { name: 'A', address: 'B', phone: 'C', nif: 'D', rc: null, nis: null, article: null, logoUrl: null },
      doc: { number: 'FV-1', date: '2026-07-01', dueDate: null, time: '12:00', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-1');
    expect(bytes.length).toBeGreaterThan(200);
  });

  it('has reasonable length for receipt with items (> 400 bytes)', () => {
    const data = makeData({
      company: { name: 'Co', address: 'Addr', phone: '0550000000', nif: 'NIF123', rc: null, nis: null, article: null, logoUrl: null },
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      lines: [{
        rowNumber: 1, ref: 'R1', barcode: null,
        name: 'Item1', unit: 'pcs', quantity: 2,
        unitPriceHt: 500, unitPriceTtc: 595,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 1000, totalTva: 190, totalTtc: 1190,
        lot: null, notes: null,
      }],
      totals: { totalHt: 1000, totalTva: 190, totalTtc: 1190, fiscalStamp: 0, totalDiscount: 0, paid: 1190, change: 0, remaining: 0 },
    });
    const bytes = buildReceiptBytesFromTemplate(makeTemplate(), data, 'FV-001');
    expect(bytes.length).toBeGreaterThan(400);
  });
});

// ─── Section visibility gates (Stage 1 behavior) ──────────────────────────
// Each section is correctly gated by its show_*_section flag.
// When a section is OFF, its content does NOT appear in thermal output.

describe('ThermalPrintPath — section visibility gates (Stage 1)', () => {

  it('header is omitted when show_header_section is OFF', () => {
    const tpl = makeTemplate({
      show_header_section: false,
      company_name_text: 'HiddenHeaderSectionCo',
    });
    const data = makeData({
      company: { name: 'HiddenHeaderSectionCo', address: null, phone: null, nif: null, rc: null, nis: null, article: null, logoUrl: null },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data);
    expect(containsAscii(bytes, 'HiddenHeaderSectionCo')).toBe(false);
  });

  it('doc info is omitted when show_doc_info_section is OFF', () => {
    const tpl = makeTemplate({ show_doc_info_section: false });
    const docNumber = 'SECRET-DOC-999';
    const data = makeData({
      party: { name: 'PartyZ', phone: null, address: null },
      doc: { number: docNumber, date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, docNumber);
    expect(containsAscii(bytes, docNumber)).toBe(false);
  });

  it('items are omitted when show_items_section is OFF', () => {
    const tpl = makeTemplate({ show_items_section: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      lines: [{
        rowNumber: 1, ref: 'R1', barcode: null,
        name: 'HiddenItem', unit: 'pcs', quantity: 1,
        unitPriceHt: 100, unitPriceTtc: 119,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 100, totalTva: 19, totalTtc: 119,
        lot: null, notes: null,
      }],
      totals: { totalHt: 100, totalTva: 19, totalTtc: 119, fiscalStamp: 0, totalDiscount: 0, paid: 119, change: 0, remaining: 0 },
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(containsAscii(bytes, 'HiddenItem')).toBe(false);
  });

  it('totals are omitted when show_totals_section is OFF', () => {
    const tpl = makeTemplate({ show_totals_section: false });
    const data = makeData({
      doc: { number: 'FV-001', date: '2026-07-01', dueDate: null, time: '14:30', typeCode: 'FV', typeName: 'فاتورة', status: 'validated' },
      lines: [{
        rowNumber: 1, ref: 'R1', barcode: null,
        name: 'Item', unit: 'pcs', quantity: 1,
        unitPriceHt: 100, unitPriceTtc: 119,
        tvaRate: 0.19, tvaPct: 19,
        discountPct: 0, discountAmt: 0,
        totalHt: 100, totalTva: 19, totalTtc: 119,
        lot: null, notes: null,
      }],
      totals: { totalHt: 100, totalTva: 19, totalTtc: 119, fiscalStamp: 0, totalDiscount: 0, paid: 119, change: 0, remaining: 0 },
    });
    const bytes1 = buildReceiptBytesFromTemplate(makeTemplate({ show_totals_section: true }), data, 'FV-001');
    const bytes2 = buildReceiptBytesFromTemplate(tpl, data, 'FV-001');
    expect(bytes2.length).toBeLessThan(bytes1.length);
  });

  it('footer is omitted when show_footer_section is OFF', () => {
    const tpl = makeTemplate({
      show_footer_section: false,
      show_thank_you: true,
      thank_you_text: 'FooterShouldNotAppear',
    });
    const bytes = buildReceiptBytesFromTemplate(tpl, makeData());
    expect(containsAscii(bytes, 'FooterShouldNotAppear')).toBe(false);
  });
});

// ─── Stage 2: Header / Company Info Settings ────────────────────────────────

const HEADER_CO = {
  name: 'Stage2Co', address: '15 Rue Test', phone: '0550123456',
  nif: 'NIF123456789', rc: 'RC00123', nis: 'NIS00999',
  article: '12-34', logoUrl: null,
};

function headerData(overrides = {}): UniversalDocumentData {
  return makeData({ company: { ...HEADER_CO, ...overrides } });
}

describe('ThermalPrintPath — company info visibility gates (Stage 2)', () => {

  it('shows company name by default, hides when show_company_name is OFF', () => {
    const base = { show_company_name: true, company_name_text: 'Stage2Co' };
    const on   = buildReceiptBytesFromTemplate(makeTemplate({ ...base }), headerData());
    const off  = buildReceiptBytesFromTemplate(makeTemplate({ ...base, show_company_name: false }), headerData());
    expect(containsAscii(on, 'Stage2Co')).toBe(true);
    expect(containsAscii(off, 'Stage2Co')).toBe(false);
  });

  it('shows address by default, hides when show_address is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_address: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_address: false }), headerData());
    expect(containsAscii(on, '15 Rue Test')).toBe(true);
    expect(containsAscii(off, '15 Rue Test')).toBe(false);
  });

  it('shows phone by default, hides when show_phone is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_phone: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_phone: false }), headerData());
    expect(containsAscii(on, '0550123456')).toBe(true);
    expect(containsAscii(off, '0550123456')).toBe(false);
  });

  it('shows tax ID (NIF) by default, hides when show_tax_id is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_tax_id: false }), headerData());
    expect(containsAscii(on, HEADER_CO.nif)).toBe(true);
    expect(containsAscii(off, HEADER_CO.nif)).toBe(false);
  });

  it('shows RC by default, hides when show_rc is OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_rc: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_rc: false }), headerData());
    expect(containsAscii(on, HEADER_CO.rc)).toBe(true);
    expect(containsAscii(off, HEADER_CO.rc)).toBe(false);
  });

  it('shows NIS when show_nis is ON, hides when OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_nis: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_nis: false }), headerData());
    expect(containsAscii(on, HEADER_CO.nis)).toBe(true);
    expect(containsAscii(off, HEADER_CO.nis)).toBe(false);
  });

  it('shows article when show_article is ON, hides when OFF', () => {
    const on  = buildReceiptBytesFromTemplate(makeTemplate({ show_article: true  }), headerData());
    const off = buildReceiptBytesFromTemplate(makeTemplate({ show_article: false }), headerData());
    expect(containsAscii(on, HEADER_CO.article)).toBe(true);
    expect(containsAscii(off, HEADER_CO.article)).toBe(false);
  });
});

describe('ThermalPrintPath — company name formatting (Stage 2)', () => {

  it('respects company_name_bold: ON emits ESC E 1, OFF emits ESC E 0', () => {
    const boldOn  = buildReceiptBytesFromTemplate(makeTemplate({ company_name_bold: true  }), headerData());
    const boldOff = buildReceiptBytesFromTemplate(makeTemplate({ company_name_bold: false }), headerData());
    expect(containsBytes(boldOn,  [0x1B, 0x45, 0x01])).toBe(true);
    expect(containsBytes(boldOff, [0x1B, 0x45, 0x00])).toBe(true);
  });

  it('different company_name_size values produce different byte output', () => {
    const small = buildReceiptBytesFromTemplate(makeTemplate({ company_name_size: 8  }), headerData());
    const large = buildReceiptBytesFromTemplate(makeTemplate({ company_name_size: 30 }), headerData());
    expect(small).not.toEqual(large);
  });

  it('respects company_name_align: left→ESC a 0, center→ESC a 1, right→ESC a 2', () => {
    const left  = buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'left'   }), headerData());
    const center= buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'center' }), headerData());
    const right = buildReceiptBytesFromTemplate(makeTemplate({ company_name_align: 'right'  }), headerData());
    expect(containsBytes(left,   [0x1B, 0x61, 0x00])).toBe(true);
    expect(containsBytes(center, [0x1B, 0x61, 0x01])).toBe(true);
    expect(containsBytes(right,  [0x1B, 0x61, 0x02])).toBe(true);
  });
});

describe('ThermalPrintPath — company info formatting (Stage 2)', () => {

  it('different company_info_size values produce different byte output', () => {
    const small = buildReceiptBytesFromTemplate(makeTemplate({ show_address: true, company_info_size: 6  }), headerData());
    const large = buildReceiptBytesFromTemplate(makeTemplate({ show_address: true, company_info_size: 16 }), headerData());
    expect(small).not.toEqual(large);
  });

  it('respects company_info_align on info fields', () => {
    const left  = buildReceiptBytesFromTemplate(makeTemplate({ company_info_align: 'left'   }), headerData());
    const right = buildReceiptBytesFromTemplate(makeTemplate({ company_info_align: 'right'  }), headerData());
    // Info fields use ESC a n before each info line
    expect(containsBytes(left,  [0x1B, 0x61, 0x00])).toBe(true);
    expect(containsBytes(right, [0x1B, 0x61, 0x02])).toBe(true);
  });
});

```

## FILE: ./resources/js/pos/utils/calculations.test.ts

```
import { describe, it, expect } from 'vitest';
import {
  htToTtc, ttcToHt, calcMargin, calcWeightedAverageMargin, calcFiscalStamp,
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

describe('calcWeightedAverageMargin', () => {
  it('weights margin by selling amount rather than averaging percentages', () => {
    const items = [
      { sellingHt: 1000, costHt: 900 },
      { sellingHt: 100, costHt: 50 },
    ];
    expect(calcWeightedAverageMargin(items)).toBeCloseTo(13.63636, 5);
  });

  it('returns 0 for empty input', () => {
    expect(calcWeightedAverageMargin([])).toBe(0);
  });
});

describe('calcFiscalStamp', () => {
  it('returns 0 for zero and negative amounts', () => {
    expect(calcFiscalStamp(0)).toBe(0);
    expect(calcFiscalStamp(-100)).toBe(0);
  });
  it('applies 1% floor at MIN_STAMP=5', () => {
    expect(calcFiscalStamp(200)).toBe(5);
    expect(calcFiscalStamp(499.99)).toBe(5);
  });
  it('applies 1% for medium amounts', () => {
    expect(calcFiscalStamp(30000)).toBe(300);
    expect(calcFiscalStamp(100000)).toBe(1000);
    expect(calcFiscalStamp(200000)).toBe(2000);
  });
  it('caps at MAX_STAMP=2500', () => {
    expect(calcFiscalStamp(250000)).toBe(2500);
    expect(calcFiscalStamp(300000)).toBe(2500);
    expect(calcFiscalStamp(500000)).toBe(2500);
    expect(calcFiscalStamp(1_000_000)).toBe(2500);
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
  it('formats whole number with 2 decimals', () => {
    const r = formatDZD(1000);
    expect(r).toMatch(/1 000,00 دج/);
  });
  it('formats decimal amount', () => {
    expect(formatDZD(1500.5)).toMatch(/1 500,50 دج/);
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

## FILE: ./resources/js/pos/utils/calculations.ts

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

/** متوسط هامش الربح موزون حسب قيمة البيع */
export function calcWeightedAverageMargin(items: Array<{ sellingHt: number; costHt: number }>): number {
  if (!items.length) return 0;
  const totalSellingHt = items.reduce((sum, item) => sum + (item.sellingHt ?? 0), 0);
  if (totalSellingHt <= 0) return 0;
  const totalCostHt = items.reduce((sum, item) => sum + (item.costHt ?? 0), 0);
  return ((totalSellingHt - totalCostHt) / totalSellingHt) * 100;
}

/** الطابع الجبائي الجزائري — متوافق مع App\Services\Tax\FiscalStampCalculator */
const FISCAL_STAMP_MIN = 5.0;
const FISCAL_STAMP_MAX = 2500.0;
const FISCAL_STAMP_RATE = 0.01;

export function calcFiscalStamp(totalTtc: number): number {
  if (totalTtc <= 0) return 0;
  const calculated = totalTtc * FISCAL_STAMP_RATE;
  return Math.round(Math.max(FISCAL_STAMP_MIN, Math.min(calculated, FISCAL_STAMP_MAX)) * 100) / 100;
}

/**
 * Calc compounded discount percentage (item discount + invoice discount stacked multiplicatively).
 * Used by both calcTotals (display) and handleCompleteSale (save) to guarantee identical totals.
 * Formula: 1 - (1 - itemDisc%) × (1 - invDisc%)
 */
export function calcCompoundedDiscount(itemDiscPct: number, invDiscPct: number): number {
  return invDiscPct > 0
    ? 100 - (100 - itemDiscPct) * (100 - invDiscPct) / 100
    : itemDiscPct;
}

/** حساب مجاميع العربة */
export function calcTotals(items: CartItem[], invoiceDiscountPct = 0, fiscalStampEnabled = true, isTvaExempt = false): CartTotals {
  let totalHt       = 0;
  let totalTva      = 0;
  let totalDiscount = 0;
  let itemsCount    = 0;

  for (const item of items) {
    totalHt       += item.total_ht;
    totalDiscount += item.discount_amount;
    itemsCount    += item.quantity;
  }

  // No intermediate rounding — must match handleCompleteSale's compounded-discount math
  // exactly so the displayed total always equals the saved total (no 1-cent gaps).
  const invoiceDiscountAmount = totalHt > 0
    ? totalHt * invoiceDiscountPct / 100
    : 0;
  const adjTotalHt  = totalHt - invoiceDiscountAmount;
  // ✅ TVA-exempt parties: backend forces tva_rate=0, so frontend must match
  const adjTotalTva = isTvaExempt ? 0
    : totalHt > 0
      ? items.reduce((s, item) => {
          const share = item.total_ht / totalHt;
          return s + ((item.total_ht - invoiceDiscountAmount * share) * item.tva_rate / 100);
        }, 0)
      : totalTva;
  const totalTtc     = adjTotalHt + adjTotalTva;
  const fiscalStamp  = fiscalStampEnabled ? calcFiscalStamp(totalTtc) : 0;

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
export function formatDZD(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0 دج';
  const formatted = new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(n);
  return (formatted.startsWith('-') ? '\u200E' : '') + formatted + ' دج';
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

## FILE: ./resources/js/pos/utils/posHelpers.test.ts

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

## FILE: ./resources/js/pos/utils/posHelpers.ts

```
// ════════════════════════════════════════════════════════════════════════════
// pos/utils/posHelpers.ts
//
// ✅ التغيير الوحيد عن النسخة السابقة:
//   productToVariant تمرّر الآن:
//   - quantityDiscounts  ← كان مفقوداً → getQuantityDiscount() كانت ترجع 0 دائماً
//   - length/width/height ← كانت مفقودة
// ════════════════════════════════════════════════════════════════════════════
import type {
  Product, ProductVariant, ProductVariantPrice, PriceLevel,
} from '@/types';

type ProductApiResponse = Product & {
  current_stock?:      number;
  prices?:             ProductVariantPrice[];
  quantityDiscounts?:  Array<{ min_quantity: number; discount_percentage: number }>;
};

export type ViewMode   = 'grid' | 'list';
export type GridSize   = 'xs' | 'sm' | 'md' | 'lg';
export type SortMode   = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'family';
export type ActiveModal =
  | 'none' | 'payment' | 'held' | 'receipt'
  | 'manual' | 'qty' | 'kbhelp' | 'session' | 'barcode' | 'returns' | 'client';

export interface QuickItem {
  variantId: number;
  name:      string;
  priceHt:   number;
  tvaRate:   number;
}

// ─── getVariantPrice ──────────────────────────────────────────────────────────

export function getVariantPrice(
  v: ProductVariant,
  priceLevelId: number | null,
  priceLevels: PriceLevel[],
): number {
  const defaultPrice = v.default_selling_price_ht ?? 0;
  if (priceLevelId) {
    const priceEntry = v.prices?.find(
      (p: ProductVariantPrice) => p.price_level_id === priceLevelId,
    );
    if (priceEntry) return priceEntry.price ?? defaultPrice;
    const level = priceLevels.find((pl) => pl.id === priceLevelId);
    if (level?.discount_percent) {
      return Math.round(defaultPrice * (1 - level.discount_percent / 100) * 100) / 100;
    }
    return defaultPrice;
  }
  return defaultPrice;
}

// ─── productToVariant ─────────────────────────────────────────────────────────

export function productToVariant(p: Product): ProductVariant {
  const pr = p as ProductApiResponse;
  return {
    id:                         p.id,
    product_id:                 p.id,
    ref:                        p.ref ?? '',
    barcode:                    p.barcode,
    variant_name:               '',
    unit_id:                    p.unit_id,
    tva_id:                     p.tva_id,
    valuation_method_id:        p.valuation_method_id,
    last_purchase_price:        p.purchase_price_ht ?? 0,
    average_cost_price:         Number(p.current_cost_price) || Number(p.purchase_price_ht) || 0,
    default_selling_price_ht:
      p.default_selling_price_ht ??
      (p.purchase_price_ht ? p.purchase_price_ht * 1.3 : 0),
    manages_stock:              p.manages_stock,
    allow_negative_stock:       p.allow_negative_stock,
    has_lots:                   p.has_lots,
    has_expiration_date:        p.has_expiration_date,
    min_stock_alert:            p.min_stock_alert ?? 0,
    max_stock_alert:            p.max_stock_alert,
    manages_quantity_discounts: p.manages_quantity_discounts,
    weight:                     p.weight,
    volume:                     p.volume,
    length:                     p.length,
    width:                      p.width,
    height:                     p.height,
    active:                     p.active,
    company_id:                 p.company_id,
    created_at:                 p.created_at,
    updated_at:                 p.updated_at,

    // relations
    product:           p,
    image_url:         p.images?.[0] ?? null,
    unit:              p.unit,
    tva:               p.tva,
    current_stock:     pr.current_stock,
    prices:            pr.prices,
    // ✅ الإضافة الجوهرية — بدونها getQuantityDiscount() ترجع 0 دائماً
    quantityDiscounts: pr.quantityDiscounts,
  } as unknown as ProductVariant;
}

// ─── makeFakeVariant ──────────────────────────────────────────────────────────

export function makeFakeVariant(
  name: string,
  priceHt: number,
  tvaRate: number,
): ProductVariant {
  const now = new Date().toISOString();
  return {
    id:                         Date.now(),
    product_id:                 0,
    ref:                        '',
    barcode:                    null,
    variant_name:               null,
    unit_id:                    null,
    tva_id:                     null,
    valuation_method_id:        null,
    weight:                     null,
    volume:                     null,
    length:                     null,
    width:                      null,
    height:                     null,
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
    created_at:                 now,
    updated_at:                 now,
    product: {
      id: 0, name, slug: '', active: true, manages_stock: false,
      allow_negative_stock: true, has_lots: false, has_expiration_date: false,
      manages_quantity_discounts: false, company_id: 0,
      created_at: now, updated_at: now,
    },
    tva: {
      id: 0, name: `TVA ${tvaRate}%`, rate: tvaRate,
      description: null, is_default: false, active: true,
      company_id: 0, created_at: now, updated_at: now,
    },
  } as unknown as ProductVariant;
}

// ─── Stock helper ──────────────────────────────────────────────────────────────

const _outStock = (v: ProductVariant, allowNegativeStock: boolean = false): boolean => {
  const stock    = v.current_stock;
  const unknown  = stock === undefined;
  return v.manages_stock && !unknown && (stock ?? 0) <= 0 && !v.allow_negative_stock && !allowNegativeStock;
};
export { _outStock as isVariantOutOfStock };

// ─── localStorage helpers ─────────────────────────────────────────────────────

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
  try { localStorage.setItem(POS_PAGE_SIZE_KEY, String(n)); }
  catch { /* localStorage not available */ }
}

// ─── Family icon/style helpers ────────────────────────────────────────────────

export function familyIcon(name: string): string {
  const f = name.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل') || f.includes('طعام')) return 'ti-apple';
  if (f.includes('شراب') || f.includes('ماء') || f.includes('عصير')) return 'ti-droplets';
  if (f.includes('إلكترون') || f.includes('تقن')) return 'ti-device-laptop';
  if (f.includes('ملابس'))                         return 'ti-shirt';
  if (f.includes('صيانة') || f.includes('إصلاح')) return 'ti-tool';
  if (f.includes('دواء') || f.includes('صحة'))    return 'ti-pill';
  if (f.includes('مكتب') || f.includes('قرطاسية')) return 'ti-briefcase';
  if (f.includes('سيارة') || f.includes('مركبة')) return 'ti-car';
  return 'ti-package';
}

export function familyStyleFromName(
  family: string,
): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل'))       return { icon: 'ti-apple',          color: 'var(--em)',     bg: 'var(--emb)'   };
  if (f.includes('شراب') || f.includes('ماء'))     return { icon: 'ti-droplets',       color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                        return { icon: 'ti-device-mobile',  color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                          return { icon: 'ti-shirt',          color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                          return { icon: 'ti-tool',           color: 'var(--orange)', bg: 'var(--orb)'   };
  if (f.includes('دواء'))                           return { icon: 'ti-pill',           color: 'var(--red)',    bg: 'var(--redb)'  };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}

```

## FILE: ./resources/js/pos/utils/posSounds.ts

```
// ════════════════════════════════════════════════════════════════════════════
// pos/utils/posSounds.ts
//
// أصوات POS — مُولَّدة بـ Web Audio API بدون ملفات خارجية
// كل preset يحتوي على نغمتين: واحدة عند إضافة منتج، وأخرى عند إتمام البيع
// volume: 0-100 → يُحوَّل داخلياً إلى 0.0-1.0
// ════════════════════════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function note(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.12,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  gain.gain.setValueAtTime(vol, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur);
}

function noise(ac: AudioContext, start: number, dur: number, vol = 0.06) {
  const bufSize = ac.sampleRate * dur;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * vol;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  src.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(vol, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  src.start(ac.currentTime + start);
  src.stop(ac.currentTime + start + dur);
}

// ─── Volume scaling ──────────────────────────────────────────────────────────

/** Convert 0-100 volume to a 0-1 multiplier */
function volScale(v: number): number {
  return Math.max(0, Math.min(1, v / 100));
}

// ─── Preset definitions ─────────────────────────────────────────────────────

type SoundFn = (volume: number) => void;

const presets: Record<string, {
  label: string;
  icon: string;
  add: SoundFn;
  sale: SoundFn;
}> = {
  classic: {
    label: 'كلاسيك',
    icon: 'ti-music',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 600, 0, 0.08, 'sine', 0.12 * s);
      note(ac, 900, 0.08, 0.1, 'sine', 0.10 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 523, 0, 0.1, 'sine', 0.12 * s);
      note(ac, 659, 0.1, 0.1, 'sine', 0.10 * s);
      note(ac, 784, 0.2, 0.15, 'sine', 0.10 * s);
    },
  },
  pop: {
    label: 'بوب',
    icon: 'ti-bubble',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 800, 0, 0.04, 'sine', 0.18 * s);
      note(ac, 1200, 0.02, 0.06, 'sine', 0.10 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 600, 0, 0.06, 'sine', 0.15 * s);
      note(ac, 900, 0.06, 0.06, 'sine', 0.12 * s);
      note(ac, 1200, 0.12, 0.1, 'sine', 0.10 * s);
    },
  },
  digital: {
    label: 'رقمي',
    icon: 'ti-device-desktop',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1047, 0, 0.05, 'square', 0.08 * s);
      note(ac, 1319, 0.04, 0.07, 'square', 0.06 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 880, 0, 0.08, 'square', 0.07 * s);
      note(ac, 1109, 0.07, 0.08, 'square', 0.06 * s);
      note(ac, 1397, 0.14, 0.12, 'square', 0.05 * s);
    },
  },
  bell: {
    label: 'جرس',
    icon: 'ti-bell',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1568, 0, 0.2, 'sine', 0.10 * s);
      note(ac, 2093, 0, 0.15, 'sine', 0.06 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1047, 0, 0.25, 'sine', 0.12 * s);
      note(ac, 1319, 0, 0.2, 'sine', 0.08 * s);
      note(ac, 1568, 0.15, 0.3, 'sine', 0.08 * s);
    },
  },
  soft: {
    label: 'ناعم',
    icon: 'ti-feather',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 440, 0, 0.12, 'sine', 0.08 * s);
      note(ac, 554, 0.06, 0.1, 'sine', 0.06 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 392, 0, 0.15, 'sine', 0.10 * s);
      note(ac, 494, 0.1, 0.15, 'sine', 0.08 * s);
      note(ac, 587, 0.2, 0.2, 'sine', 0.08 * s);
    },
  },
  click: {
    label: 'نقرة',
    icon: 'ti-mouse',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      noise(ac, 0, 0.03, 0.15 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      noise(ac, 0, 0.03, 0.12 * s);
      noise(ac, 0.06, 0.03, 0.12 * s);
      note(ac, 800, 0.1, 0.08, 'sine', 0.10 * s);
    },
  },
  cash: {
    label: 'صندوق',
    icon: 'ti-cash',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1200, 0, 0.03, 'square', 0.10 * s);
      note(ac, 1600, 0.02, 0.05, 'square', 0.08 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 800, 0, 0.06, 'triangle', 0.15 * s);
      note(ac, 1000, 0.05, 0.06, 'triangle', 0.12 * s);
      note(ac, 1400, 0.1, 0.06, 'triangle', 0.10 * s);
      note(ac, 1800, 0.15, 0.1, 'triangle', 0.08 * s);
    },
  },
  bios: {
    label: 'بيوس',
    icon: 'ti-cpu',
    add(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 1000, 0, 0.15, 'square', 0.35 * s);
    },
    sale(v) {
      const ac = getCtx(); const s = volScale(v);
      note(ac, 800, 0, 0.1, 'square', 0.30 * s);
      note(ac, 1200, 0.12, 0.2, 'square', 0.35 * s);
    },
  },
  none: {
    label: 'صامت',
    icon: 'ti-volume-off',
    add() {},
    sale() {},
  },
};

export type SoundPresetId = keyof typeof presets;

/** قائمة النغمات المتاحة لعرضها في الإعدادات */
export const SOUND_PRESETS = Object.entries(presets).map(([id, p]) => ({
  id: id as SoundPresetId,
  label: p.label,
  icon: p.icon,
}));

/** تشغيل صوت إضافة منتج حسب الـ preset والصوت المختار */
export function playAddSound(presetId: SoundPresetId = 'classic', volume = 60) {
  try { presets[presetId]?.add(volume); } catch { /* noop */ }
}

/** تشغيل صوت إتمام البيع حسب الـ preset والصوت المختار */
export function playSaleSound(presetId: SoundPresetId = 'classic', volume = 60) {
  try { presets[presetId]?.sale(volume); } catch { /* noop */ }
}

/** معاينة صوت (للعرض في الإعدادات) — يشغل add ثم sale بتأخير بسيط */
export function previewSound(presetId: SoundPresetId, volume = 60) {
  try {
    presets[presetId]?.add(volume);
    setTimeout(() => presets[presetId]?.sale(volume), 350);
  } catch { /* noop */ }
}

```

## FILE: ./resources/js/pos/utils/printService.ts

```
// ════════════════════════════════════════════════════════════════════════════
// pos/utils/printService.ts
//
// Canonical ESC/POS thermal print pipeline.
// All section builders consume UniversalDocumentData directly — no bridge
// types, no CartItem/CartTotals/Party dependencies.
// ════════════════════════════════════════════════════════════════════════════

import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data';
import { printFieldResolver } from '@/pages/settings/print-settings/services/PrintFieldResolver';

// ─── ESC/POS Constants ────────────────────────────────────────────────────────

const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

// ─── Windows-1256 Arabic encoder ─────────────────────────────────────────────
//
// الطابعات الحرارية الجزائرية الشائعة تستخدم codepage 1256 (Arabic Windows).
// ESC t 16 يُفعّل هذا الـ codepage على Epson-compatible printers.
// الجدول أدناه يحوّل unicode code points للحروف العربية إلى Win-1256 bytes.

const ARABIC_WIN1256: Record<number, number> = {
  // الحروف الأساسية
  0x0621: 0xC1, // ء
  0x0622: 0xC2, // آ
  0x0623: 0xC3, // أ
  0x0624: 0xC4, // ؤ
  0x0625: 0xC5, // إ
  0x0626: 0xC6, // ئ
  0x0627: 0xC7, // ا
  0x0628: 0xC8, // ب
  0x0629: 0xC9, // ة
  0x062A: 0xCA, // ت
  0x062B: 0xCB, // ث
  0x062C: 0xCC, // ج
  0x062D: 0xCD, // ح
  0x062E: 0xCE, // خ
  0x062F: 0xCF, // د
  0x0630: 0xD0, // ذ
  0x0631: 0xD1, // ر
  0x0632: 0xD2, // ز
  0x0633: 0xD3, // س
  0x0634: 0xD4, // ش
  0x0635: 0xD5, // ص
  0x0636: 0xD6, // ض
  0x0637: 0xD8, // ط
  0x0638: 0xD9, // ظ
  0x0639: 0xDA, // ع
  0x063A: 0xDB, // غ
  0x0641: 0xDD, // ف
  0x0642: 0xDE, // ق
  0x0643: 0xDF, // ك
  0x0644: 0xE1, // ل
  0x0645: 0xE3, // م
  0x0646: 0xE4, // ن
  0x0647: 0xE5, // ه
  0x0648: 0xE6, // و
  0x0649: 0xEC, // ى
  0x064A: 0xED, // ي
  0x064B: 0xF2, // ً
  0x064C: 0xF3, // ٌ
  0x064D: 0xF4, // ٍ
  0x064E: 0xF5, // َ
  0x064F: 0xF6, // ُ
  0x0650: 0xF7, // ِ
  0x0651: 0xF8, // ّ
  0x0652: 0xF9, // ْ
  // أرقام عربية
  0x0660: 0xB0, // ٠
  0x0661: 0xB1, // ١
  0x0662: 0xB2, // ٢
  0x0663: 0xB3, // ٣
  0x0664: 0xB4, // ٤
  0x0665: 0xB5, // ٥
  0x0666: 0xB6, // ٦
  0x0667: 0xB7, // ٧
  0x0668: 0xB8, // ٨
  0x0669: 0xB9, // ٩
  // علامات ترقيم عربية
  0x060C: 0xAC, // ،
  0x061B: 0xBB, // ؛
  0x061F: 0xBF, // ؟
  // لام ألف
  0xFEFB: 0xE2, // لا
  0xFEFC: 0xE2, // لا (شكل)
};

/**
 * يحوّل نص Unicode إلى bytes بترميز Windows-1256.
 * الأحرف غير المعروفة تُستبدَل بـ '?' (0x3F).
 */
function encodeArabic(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0x3F;
    if (cp < 0x80) {
      bytes.push(cp);                               // ASCII — مباشرة
    } else if (ARABIC_WIN1256[cp] !== undefined) {
      bytes.push(ARABIC_WIN1256[cp]);               // عربي — Win-1256
    } else {
      bytes.push(0x3F);                             // غير معروف → '?'
    }
  }
  return bytes;
}

// ─── ESC/POS Builder ─────────────────────────────────────────────────────────

class EscPosBuilder {
  private buf: number[] = [];

  /** تهيئة الطابعة + تفعيل codepage Windows-1256 */
  init(): this {
    this.buf.push(ESC, 0x40);           // ESC @ — initialize
    this.buf.push(ESC, 0x74, 0x10);     // ESC t 16 — select codepage Windows-1256 (Arabic)
    return this;
  }

  lineFeed(n = 1): this {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }

  setBold(on: boolean): this {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  setAlign(n: 0 | 1 | 2): this {
    this.buf.push(ESC, 0x61, n);
    return this;
  }

  setFontSize(w: number, h: number): this {
    const ww = Math.max(1, Math.min(8, w));
    const hh = Math.max(1, Math.min(8, h));
    this.buf.push(GS, 0x21, (hh - 1) * 16 + (ww - 1));
    return this;
  }

  resetFontSize(): this {
    this.buf.push(GS, 0x21, 0);
    return this;
  }

  /** نص مُشفَّر بـ Windows-1256 */
  text(s: string): this {
    this.buf.push(...encodeArabic(s));
    return this;
  }

  /** نص ASCII فقط (أرقام، رموز) — بدون تحويل */
  ascii(s: string): this {
    for (const c of s) this.buf.push(c.charCodeAt(0) & 0xFF);
    return this;
  }

  center(s: string): this  { return this.setAlign(1).text(s).lineFeed(); }
  right(s: string): this   { return this.setAlign(2).text(s).lineFeed(); }
  left(s: string): this    { return this.setAlign(0).text(s).lineFeed(); }

  divider(c = '-', len = 42): this {
    return this.setAlign(1).ascii(c.repeat(len)).lineFeed();
  }

  cut(): this { this.buf.push(GS, 0x56, 0x00); return this; }
  feedAndCut(): this { return this.lineFeed(4).cut(); }

  /**
   * QR Code — ESC/POS Native (GS ( k)
   * يطبع QR يحتوي النص المعطى (رقم الفاتورة / رابط URL)
   */
  qrCode(data: string, size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 4): this {
    const bytes = [...new TextEncoder().encode(data)];  // QR data — UTF-8 مقبول هنا
    const len   = bytes.length + 3;
    const pL    = len & 0xFF;
    const pH    = (len >> 8) & 0xFF;

    this.setAlign(1);

    // 1. Select model (Model 2)
    this.buf.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

    // 2. Set size
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);

    // 3. Set error correction (M = 0x32)
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x32);

    // 4. Store data
    this.buf.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...bytes);

    // 5. Print
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

    this.lineFeed(2);
    return this;
  }

  escposBytes(): Uint8Array { return new Uint8Array(this.buf); }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

/** تنسيق رقم — LTR دائماً (أرقام لاتينية مناسبة للطابعة) */
function fmt(n: number): string {
  return n.toLocaleString('fr-DZ', {
    minimumFractionDigits:  2,
    maximumFractionDigits:  2,
  });
}

/** سطر منسَّق: تسمية يمين + قيمة يسار بعرض ثابت 42 حرف */
function lineRow(label: string, value: string, width = 42): string {
  const totalLen = width;
  // نستخدم ASCII spaces لأن الطابعة لا تفهم unicode spaces جيداً
  const gap = Math.max(1, totalLen - label.length - value.length);
  return label + ' '.repeat(gap) + value;
}

/** Map company_name_size (8-30 pts) to ESC/POS font multiplier */
function mapFontSizeToEscPos(points: number): [number, number] {
  if (points <= 10) return [1, 1];
  if (points <= 15) return [2, 2];
  if (points <= 22) return [3, 3];
  return [4, 4];
}

/** Map company_info_size (6-16 pts) to ESC/POS font multiplier (info text stays small) */
function mapInfoFontSizeToEscPos(points: number): [number, number] {
  if (points <= 10) return [1, 1];
  if (points <= 13) return [2, 1];
  return [2, 2];
}

/** Map RTL-aware align string ('left'|'center'|'right') to ESC/POS n (0|1|2) */
function mapAlignToEscPos(align: string | undefined | null): 0 | 1 | 2 {
  if (align === 'left')   return 0;
  if (align === 'center') return 1;
  if (align === 'right')  return 2;
  return 1; // default center
}

export interface ThermalPrintResult {
  ok:      boolean;
  method:  'webusb' | 'blob' | 'none';
  message: string;
}

// ─── Capability check ─────────────────────────────────────────────────────────

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * اكتشاف طابعات متصلة سابقاً (بدون dialog)
 * مفيد لـ auto-print بعد البيع
 */
export async function getConnectedPrinters(): Promise<any[]> {
  const usb = (navigator as any).usb;
  if (!usb) return [];
  try {
    return await usb.getDevices();
  } catch {
    return [];
  }
}

// ─── Thermal auto-print preference (localStorage) ────────────────────────────

const THERMAL_AUTO_PRINT_KEY = 'thermal_auto_print';

export function getThermalAutoPrint(): boolean {
  try {
    return localStorage.getItem(THERMAL_AUTO_PRINT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setThermalAutoPrint(enabled: boolean): void {
  try {
    localStorage.setItem(THERMAL_AUTO_PRINT_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
}



// ── Section sub-functions (Stage 1: Section Visibility Gates) ────────────────

function buildThermalHeader(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_header_section) return;

  const co = data.company ?? {};
  const resolve = (fieldId: string, fallback: string) =>
    String(printFieldResolver.resolve(fieldId, data, template) ?? fallback);

  const companyName    = resolve('company.name', co.name ?? 'نظام المبيعات');
  const companyAddress = resolve('company.address', co.address ?? '');
  const companyPhone   = resolve('company.phone', co.phone ?? '');
  const companyNIF     = resolve('company.nif', co.nif ?? '');
  const companyRC      = resolve('company.rc', co.rc ?? '');
  const companyNIS     = resolve('company.nis', co.nis ?? '');
  const companyArticle = resolve('company.article', co.article ?? '');

  // ── Company name (gated, with size/bold/align) ──────────────────────────
  if (template.show_company_name !== false) {
    const nameAlign = mapAlignToEscPos(template.company_name_align);
    const nameBold  = template.company_name_bold !== false;
    const [nw, nh]  = mapFontSizeToEscPos(template.company_name_size ?? 15);
    b.setFontSize(nw, nh);
    if (nameBold) b.setBold(true);
    b.setAlign(nameAlign).text(companyName).lineFeed();
    if (nameBold) b.setBold(false);
    b.resetFontSize();
  }

  // ── Company info fields (each gated, with shared align/size) ────────────
  const infoAlign = mapAlignToEscPos(template.company_info_align);
  const [iw, ih]  = mapInfoFontSizeToEscPos(template.company_info_size ?? 9);

  const infoField = (show: boolean | undefined, val: string, prefix = '') => {
    if (show !== false && val) {
      b.setFontSize(iw, ih).setAlign(infoAlign).text(prefix + val).lineFeed().resetFontSize();
    }
  };

  infoField(template.show_address,  companyAddress);
  infoField(template.show_phone,    companyPhone);
  infoField(template.show_tax_id,   companyNIF,   'NIF: ');
  infoField(template.show_rc,       companyRC,    'RC: ');
  infoField(template.show_nis,      companyNIS,   'NIS: ');
  infoField(template.show_article,  companyArticle, 'Article: ');

  b.divider('=', 42);
}

function buildThermalDocInfo(
  b:          EscPosBuilder,
  docNumber:  string | undefined,
  data:       UniversalDocumentData,
  template:   PrintTemplate,
): void {
  if (!template.show_doc_info_section) return;
  const now = new Date();
  b.setAlign(0);
  if (docNumber) {
    b.setBold(true)
     .text('رقم الفاتورة: ')
     .ascii(docNumber)
     .lineFeed()
     .setBold(false);
  }
  b.text('التاريخ: ').ascii(now.toLocaleDateString('fr-DZ')).lineFeed();
  b.text('الوقت:   ').ascii(now.toLocaleTimeString('fr-DZ')).lineFeed();
  if (data.party) {
    b.text('الزبون:  ').text(data.party.name).lineFeed();
    if (data.party.phone) b.text('الهاتف:  ').ascii(data.party.phone).lineFeed();
  }
  b.divider('-', 42);
}

function buildThermalItems(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_items_section) return;
  const lines = data.lines ?? [];
  b.setBold(true).left('المنتج').setBold(false);
  for (const line of lines) {
    const total = line.totalTtc;
    b.text(line.name ?? '');
    b.lineFeed();
    const detail =
      `  ${fmt(line.quantity)} x ${fmt(line.unitPriceHt)}` +
      (line.discountPct > 0 ? ` (-${line.discountPct.toFixed(0)}%)` : '');
    const totalStr = `${fmt(total)} دج`;
    b.setAlign(0).ascii(detail);
    b.setAlign(2).ascii(totalStr).lineFeed();
  }
  b.divider('-', 42);
}

function buildThermalTotals(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_totals_section) return;
  const t = data.totals;
  if (!t) return;
  b.setAlign(0);
  b.ascii(lineRow('المجموع HT:', `${fmt(t.totalHt)} دج`)).lineFeed();
  if (t.totalDiscount > 0) {
    b.ascii(lineRow('الخصم:', `-${fmt(t.totalDiscount)} دج`)).lineFeed();
  }
  b.ascii(lineRow('TVA:', `${fmt(t.totalTva)} دج`)).lineFeed();
  if (t.fiscalStamp > 0) {
    b.ascii(lineRow('الطابع المالي:', `${fmt(t.fiscalStamp)} دج`)).lineFeed();
  }
  b.divider('=', 32);
  const totalTtcFinal = t.totalTtc + t.fiscalStamp;
  b.setFontSize(2, 2)
   .setBold(true)
   .setAlign(2)
   .ascii(`${fmt(totalTtcFinal)} دج`)
   .lineFeed()
   .setBold(false)
   .resetFontSize();
  b.text('الإجمالي شامل الضريبة').lineFeed();
  b.divider('=', 42);

  if (template.show_paid_amount) {
    b.ascii(lineRow('المدفوع:', `${fmt(t.paid)} دج`)).lineFeed();
  }

  if (template.show_change && t.change > 0) {
    b.ascii(lineRow('الباقي:', `${fmt(t.change)} دج`)).lineFeed();
  }

  if (template.show_remaining && t.remaining > 0) {
    b.setBold(true);
    b.ascii(lineRow('المتبقي:', `${fmt(t.remaining)} دج`)).lineFeed();
    b.setBold(false);
  }
}

function buildThermalBalance(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!data.balance) return;
  if (!template.show_prev_balance && !template.show_new_balance) return;
  b.divider('-', 42);
  if (template.show_prev_balance) {
    b.ascii(lineRow('الرصيد السابق:', `${fmt(data.balance.previous)} دج`)).lineFeed();
  }
  if (template.show_new_balance) {
    b.setBold(true)
     .ascii(lineRow('الرصيد الجديد:', `${fmt(data.balance.current)} دج`))
     .lineFeed()
     .setBold(false);
  }
}

function buildThermalFooter(
  b:        EscPosBuilder,
  data:     UniversalDocumentData,
  template: PrintTemplate,
): void {
  if (!template.show_footer_section) return;
  const now = new Date();
  const footerText = template.show_thank_you ? template.thank_you_text : '';
  b.divider('-', 42);
  b.center(footerText);
  b.center(`نظام ERP الجزائر — ${now.getFullYear()}`);
}

/**
 * Build ESC/POS bytes from the universal data contract + template.
 * Respects template visibility flags so thermal output matches the
 * visual preview rendered by UniversalPreview.
 */
export function buildReceiptBytesFromTemplate(
  template:  PrintTemplate,
  data:      UniversalDocumentData,
  docNumber?: string,
): Uint8Array {
  const b = new EscPosBuilder().init();

  buildThermalHeader(b, data, template);
  buildThermalDocInfo(b, docNumber, data, template);
  buildThermalItems(b, data, template);
  buildThermalTotals(b, data, template);
  buildThermalBalance(b, data, template);

  if (template.show_qr && docNumber) {
    b.lineFeed();
    b.qrCode(docNumber, 4);
    b.center(docNumber);
  }

  buildThermalFooter(b, data, template);

  b.feedAndCut();
  return b.escposBytes();
}

/**
 * Print thermal receipt from the universal data contract + template.
 * This is the canonical entry point for thermal printing — same data and
 * visibility controls as the visual preview (UniversalPreview).
 */
export async function printThermalViaWebUSBFromTemplate(
  template:  PrintTemplate,
  data:      UniversalDocumentData,
  docNumber?: string,
): Promise<ThermalPrintResult> {
  const bytes = buildReceiptBytesFromTemplate(template, data, docNumber);
  return sendBytesToReceiptPrinter(bytes);
}

export async function sendBytesToReceiptPrinter(bytes: Uint8Array): Promise<ThermalPrintResult> {
  const usb = (navigator as any).usb;
  if (!usb) {
    return { ok: false, method: 'none', message: 'WebUSB غير مدعوم في هذا المتصفح' };
  }
  try {
    const devices: any[] = await usb.getDevices();
    if (!devices.length) {
      return { ok: false, method: 'none', message: 'لم يتم العثور على طابعة حرارية' };
    }

    const device = devices[0];
    await device.open();

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    const config = device.configuration;
    let ifaceNum = 0;
    let epNum = 2;
    for (let i = 0; i < (config?.interfaces?.length ?? 0); i++) {
      const iface = config.interfaces[i];
      const alt = iface.alternates?.[0];
      if (!alt || alt.interfaceClass === 0x02) continue;
      const ep = alt.endpoints?.find(
        (e: any) => e.direction === 'out' && (e.type === 'bulk' || e.type === 'interrupt'),
      );
      if (ep) { ifaceNum = iface.interfaceNumber; epNum = ep.endpointNumber; break; }
    }

    await device.claimInterface(ifaceNum);
    const result = await device.transferOut(epNum, bytes);
    await device.releaseInterface(ifaceNum);
    try { await device.close(); } catch {}

    if (result.status !== 'ok') {
      return { ok: false, method: 'webusb', message: `فشل الإرسال: ${result.status}` };
    }
    return { ok: true, method: 'webusb', message: 'تمت الطباعة بنجاح' };
  } catch (err: any) {
    return { ok: false, method: 'webusb', message: err?.message ?? 'فشلت الطباعة' };
  }
}

export async function openCashDrawerViaWebUSB(): Promise<ThermalPrintResult> {
  const KICK_DRAWER_PIN2 = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
  return sendBytesToReceiptPrinter(KICK_DRAWER_PIN2);
}

```

## FILE: ./resources/js/pos/utils/printUtils.ts

```
// resources/js/pos/utils/printUtils.ts
// طباعة مباشرة بدون معاينة — يفتح نافذة مؤقتة ويُرسلها للطابعة

export interface PrintDirectOptions {
  html: string;
  paperWidth: number;
  copies?: number;
  printerName?: string | null;
  onDone?: () => void;
  onError?: (e: Error) => void;
}

export async function printReceiptDirect(opts: PrintDirectOptions): Promise<void> {
  const { html, paperWidth, copies = 1, onDone, onError } = opts;

  try {
    for (let i = 0; i < copies; i++) {
      await openPrintWindow(html, paperWidth);
      if (i < copies - 1) await sleep(400);
    }
    onDone?.();
  } catch (e) {
    onError?.(e as Error);
  }
}

function openPrintWindow(html: string, _paperWidthMm: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) {
      reject(new Error('فشل فتح نافذة الطباعة — تأكد من السماح بالنوافذ المنبثقة'));
      return;
    }

    let resolved = false;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>إيصال</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    body { margin: 0; padding: 10px; display: flex; justify-content: center; background: #fff; font-family: 'Tajawal', sans-serif; }
    @page { margin: 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${html}
  <script>
    function doPrint() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() { setTimeout(doPrint, 200); });
    } else {
      setTimeout(doPrint, 600);
    }
  </script>
</body>
</html>`);

    win.document.close();

    win.addEventListener('unload', () => {
      if (!resolved) { resolved = true; resolve(); }
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(); }
    }, 5000);
  });
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

```

## FILE: ./resources/js/pos/utils/useCartStore.ts

```
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, Party, ProductVariant, QuantityDiscount } from '@/types';

export interface DocumentPayment {
  id:                  number;
  payment_mode_id:     number;
  amount:              number;
  payment_date:        string;
  treasury_account_id?: number | null;
  reference?:          string | null;
  notes?:              string | null;
  client_ref?:         string | null;
}

interface CartState {
  items:              CartItem[];
  client:             Party | null;
  notes:              string;
  invoiceDiscountPct: number;
  payments:           DocumentPayment[];
  _isDirty:           boolean;

  addItem:              (variant: ProductVariant, qty?: number) => void;
  removeItem:           (id: string) => void;
  updateQty:            (id: string, qty: number) => void;
  updateDiscount:       (id: string, pct: number) => void;
  updateDiscountAmount: (id: string, amount: number) => void;
  updatePrice:          (id: string, price: number) => void;
  setClient:            (client: Party | null) => void;
  setNotes:             (notes: string) => void;
  setPayments:          (payments: DocumentPayment[]) => void;
  clearCart:            () => void;
  setInvoiceDiscountPct:(pct: number) => void;
  markClean:            () => void;
}

function findQuantityDiscount(discounts: QuantityDiscount[] | undefined, qty: number): number {
  if (!discounts?.length) return 0;
  const sorted = [...discounts]
    .filter(d => d.active)
    .sort((a, b) => b.tier_order - a.tier_order);
  const match = sorted.find(d =>
    qty >= d.min_quantity &&
    (d.max_quantity === null || d.max_quantity === undefined || qty <= d.max_quantity)
  );
  return match ? Math.min(100, Math.max(0, match.discount_percentage ?? 0)) : 0;
}

function recalcItem(item: CartItem): CartItem {
  const gross = item.unit_price_ht * item.quantity;
  let discAmount: number;
  if (item.discount_percentage > 0) {
    discAmount = gross * (item.discount_percentage / 100);
  } else if (item.discount_amount > 0) {
    discAmount = Math.min(gross, item.discount_amount);
    item = {
      ...item,
      discount_percentage: gross > 0 ? (discAmount / gross) * 100 : 0,
    };
  } else {
    discAmount = 0;
  }
  const totalHt  = gross - discAmount;
  const totalTva = totalHt * (item.tva_rate / 100);
  return {
    ...item,
    discount_amount: round2(discAmount),
    total_ht:        round2(totalHt),
    total_ttc:       round2(totalHt + totalTva),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getUnitSymbol(v: ProductVariant): string {
  return v.unit?.abbreviation ?? 'قطعة';
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items:              [],
      client:             null,
      notes:              '',
      invoiceDiscountPct: 0,
      payments:           [],
      _isDirty:           false,

      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);
          if (existing) {
            const newQty   = existing.quantity + qty;
            const autoDisc = findQuantityDiscount(variant.quantity_discounts, newQty);
            const updated  = recalcItem({
              ...existing,
              quantity:            newQty,
              discount_percentage: Math.max(existing.discount_percentage, autoDisc),
            });
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id ? updated : i,
              ),
              _isDirty: true,
            };
          }

          const priceHt  = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 0;
          const autoDisc = findQuantityDiscount(variant.quantity_discounts, qty);

          const newItem: CartItem = recalcItem({
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         getUnitSymbol(variant),
            image_url:           (variant as any).image_url ?? variant.product?.images?.[0] ?? null,
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceHt * (1 + tvaRate / 100),
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: autoDisc,
            discount_amount:     0,
            total_ht:            0,
            total_ttc:           0,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          });

          return { items: [...state.items, newItem], _isDirty: true };
        });
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id), _isDirty: true })),

      updateQty: (id, qty) =>
        set(state => {
          const item = state.items.find(i => i.id === id);
          if (!item) return state;
          const safeQty = Math.max(0.001, qty);
          const updated = recalcItem({ ...item, quantity: safeQty });
          return { items: state.items.map(i => i.id === id ? updated : i), _isDirty: true };
        }),

      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_percentage: Math.min(100, Math.max(0, pct)),
                  discount_amount:     0,
                })
              : i,
          ),
          _isDirty: true,
        })),

      updateDiscountAmount: (id, amount) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_amount:     Math.max(0, amount),
                  discount_percentage: 0,
                })
              : i,
          ),
          _isDirty: true,
        })),

      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
          _isDirty: true,
        })),

      setClient: (client) => set({ client, _isDirty: true }),
      setNotes:  (notes)  => set({ notes, _isDirty: true }),
      setPayments: (payments) => set({ payments, _isDirty: true }),
      clearCart: () => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0, payments: [], _isDirty: false }),
      setInvoiceDiscountPct: (pct) =>
        set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)), _isDirty: true }),

      markClean: () => set({ _isDirty: false }),
    }),
    {
      name:       'pos-cart',
      partialize: (state) => ({
        items:              state.items,
        client:             state.client,
        notes:              state.notes,
        invoiceDiscountPct: state.invoiceDiscountPct,
        payments:           state.payments,
        _isDirty:           true,
      }),
    },
  ),
);

```
