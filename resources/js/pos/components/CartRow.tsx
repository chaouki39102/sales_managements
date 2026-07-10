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

  const discInpRef  = useRef<HTMLInputElement>(null);
  const priceInpRef = useRef<HTMLInputElement>(null);
  const qtyInpRef   = useRef<HTMLInputElement>(null);
  const rowRef      = useRef<HTMLDivElement>(null);

  // focus input عند فتح الـ popup
  useEffect(() => {
    if (popup === 'disc'  && discInpRef.current)  { discInpRef.current.focus();  discInpRef.current.select(); }
    if (popup === 'price' && priceInpRef.current) { priceInpRef.current.focus(); priceInpRef.current.select(); }
  }, [popup]);

  useEffect(() => {
    if (editQty && qtyInpRef.current) { qtyInpRef.current.focus(); qtyInpRef.current.select(); }
  }, [editQty]);

  // إغلاق الـ popup عند الضغط خارج الصف
  useEffect(() => {
    if (!popup) return;
    const h = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
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
    <div
      ref={el => { rowRef.current = el; registerNode?.(item.id, el); }}
      tabIndex={-1}
      className={`cr ${isSelected ? 'sel' : ''} ${hasDisc ? 'has-disc' : ''} ${popup ? 'cr--popup-open' : ''} ${compact ? 'cr--compact' : ''}`}
      onClick={onSelect}
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
        {popup === 'disc' && (
          <div className="cr-popup cr-popup--disc" onClick={e => e.stopPropagation()}>
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
          </div>
        )}

        {/* ── Popup السعر ── */}
        {popup === 'price' && (
          <div className="cr-popup cr-popup--price" onClick={e => e.stopPropagation()}>
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
          </div>
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
  );
}
