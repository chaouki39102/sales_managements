import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { QuantityDiscount } from '@/types/product';
import { FloatingTooltip } from '@/components/ui/FloatingTooltip';
import { resolveQuantityTier, calcWeightTotal, calcWeightDiscounted, calcWeightFromPrice } from '../utils/calculations';

interface WeightEntryModalProps {
  productName: string;
  unitSymbol?: string | null;
  unitPrice: number;
  initialWeight?: number;
  quantityDiscounts?: QuantityDiscount[];
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

const QUICK_WEIGHTS = [
  { g: 50,  label: '50',  sub: 'غ' },
  { g: 100, label: '100', sub: 'غ' },
  { g: 250, label: '250', sub: 'غ' },
  { g: 500, label: '500', sub: 'غ' },
  { g: 750, label: '750', sub: 'غ' },
  { g: 1000, label: '1',   sub: 'كغ' },
  { g: 2000, label: '2',   sub: 'كغ' },
  { g: 3000, label: '3',   sub: 'كغ' },
  { g: 5000, label: '5',   sub: 'كغ' },
];

const fmt = (n: number) => n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WeightEntryModal({
  productName,
  unitSymbol = 'كغ',
  unitPrice,
  initialWeight,
  quantityDiscounts,
  onClose,
  onConfirm,
}: WeightEntryModalProps) {
  const [weightStr, setWeightStr] = useState(
    () => initialWeight && initialWeight > 0 ? Number(initialWeight).toFixed(3) : '',
  );
  const [priceStr, setPriceStr] = useState(() => {
    if (initialWeight && initialWeight > 0 && unitPrice > 0)
      return String(Math.round(initialWeight * unitPrice));
    return '';
  });
  const [lastEdited, setLastEdited] = useState<'weight' | 'price' | null>(null);
  const [gramNotice, setGramNotice] = useState('');
  const [submitPulse, setSubmitPulse] = useState(false);

  const weightRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const exactWeightRef = useRef<number | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = cardRef.current;
    if (!el) return;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startW: el.offsetWidth, startH: el.offsetHeight,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setCardStyle({
        width: Math.max(360, dragRef.current.startW + dx),
        height: Math.max(300, dragRef.current.startH + dy),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => { weightRef.current?.focus(); }, []);

  const weight = useMemo(() => {
    const v = parseFloat(weightStr);
    return isNaN(v) || v < 0 ? 0 : v;
  }, [weightStr]);

  const price = useMemo(() => {
    const v = parseFloat(priceStr);
    return isNaN(v) || v < 0 ? 0 : v;
  }, [priceStr]);

  const activeTier = useMemo(() => resolveQuantityTier(quantityDiscounts, weight, 1), [quantityDiscounts, weight]);

  const originalTotal = useMemo(() => {
    if (lastEdited === 'price' && price > 0) return price;
    return calcWeightTotal(weight, unitPrice);
  }, [lastEdited, price, weight, unitPrice]);

  const discountedTotal = useMemo(
    () => calcWeightDiscounted(originalTotal, activeTier, weight),
    [activeTier, originalTotal, weight],
  );

  const savings = useMemo(
    () => discountedTotal != null ? originalTotal - discountedTotal : 0,
    [discountedTotal, originalTotal],
  );

  const handleWeightChange = useCallback((raw: string) => {
    setLastEdited('weight');
    exactWeightRef.current = null;
    const v = parseFloat(raw);
    if (isNaN(v) || v < 0 || raw === '') {
      setWeightStr(raw);
      setPriceStr('');
      setGramNotice('');
      return;
    }
    setWeightStr(raw);
    setPriceStr(unitPrice > 0 ? String(calcWeightTotal(v, unitPrice)) : '');
    setGramNotice('');
  }, [unitPrice]);

  const handlePriceChange = useCallback((raw: string) => {
    setLastEdited('price');
    const p = parseFloat(raw);
    if (isNaN(p) || p < 0 || raw === '') {
      setPriceStr(raw);
      setWeightStr('');
      setGramNotice('');
      exactWeightRef.current = null;
      return;
    }
    const w = calcWeightFromPrice(p, unitPrice);
    exactWeightRef.current = w;
    setWeightStr(w > 0 ? w.toFixed(6) : '');
    setPriceStr(raw);
    setGramNotice('');
  }, [unitPrice]);

  const quickSet = useCallback((kg: number) => {
    setWeightStr(kg.toFixed(3));
    setLastEdited('weight');
    if (unitPrice > 0) setPriceStr(String(calcWeightTotal(kg, unitPrice)));
    setGramNotice('');
    weightRef.current?.focus();
  }, [unitPrice]);

  const adjust = useCallback((delta: number) => {
    setWeightStr(prev => {
      const cur = parseFloat(prev) || 0;
      const next = Math.max(0.001, Math.round((cur + delta) * 1000) / 1000);
      if (unitPrice > 0) setPriceStr(String(calcWeightTotal(next, unitPrice)));
      setLastEdited('weight');
      return next.toFixed(3);
    });
  }, [unitPrice]);

  const handleOk = useCallback(() => {
    if (weight > 0) {
      setSubmitPulse(true);
      setTimeout(() => onConfirm(exactWeightRef.current ?? weight), 120);
    }
  }, [weight, onConfirm]);

  const finalTotal = discountedTotal ?? originalTotal;
  const hasDiscount = discountedTotal != null && savings > 0;

  const effectiveDiscountPct = activeTier
    ? activeTier.discount_percentage > 0
      ? activeTier.discount_percentage
      : activeTier.discount_amount > 0 && originalTotal > 0
        ? Math.round((activeTier.discount_amount / originalTotal) * 1000) / 10
        : 0
    : 0;

  return (
    <div className="wem-overlay" onClick={onClose}>
      <div
        ref={cardRef}
        className="wem-card"
        onClick={e => e.stopPropagation()}
        style={cardStyle}
      >
        {/* ── Header ── */}
        <div className="wem-header">
          <button className="wem-close" onClick={onClose} type="button" aria-label="إغلاق">
            <i className="ti ti-x" />
          </button>
          <div className="wem-header-content">
            <h2 className="wem-header-title">{productName}</h2>
            <div className="wem-header-meta">
              <span className="wem-tag">{unitSymbol}</span>
              {unitPrice > 0 && (
                <span className="wem-tag wem-tag--price">{fmt(unitPrice)} دج/{unitSymbol}</span>
              )}
            </div>
          </div>
        </div>

        <div className="wem-body">

          {/* ── Discount tier badges ── */}
          {quantityDiscounts?.filter(d => d.active && !d.is_blocked).length ? (
            <div className="wem-tiers">
              {quantityDiscounts
                .filter(d => d.active && !d.is_blocked)
                .sort((a, b) => a.min_qty - b.min_qty)
                .map(d => {
                  const isActive = activeTier?.quantity_discount_id === d.id;
                  const tierPct = d.discount_percentage != null && Number(d.discount_percentage) > 0
                    ? Number(d.discount_percentage)
                    : Number(d.discount_amount) > 0 && unitPrice > 0
                      ? (Number(d.discount_amount) / unitPrice) * 100
                      : 0;
                  const displayPct = Math.round(tierPct * 10) / 10;
                  const fmtQty = (v: number | string) => {
                    const n = Number(v);
                    return Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(3)).toString();
                  };
                  const label = d.max_qty
                    ? `${fmtQty(d.min_qty)}–${fmtQty(d.max_qty)}`
                    : `${fmtQty(d.min_qty)}+`;
                  return (
                    <div key={d.id} className={`wem-tier-badge ${isActive ? 'active' : ''}`}>
                      <span className="wem-tier-qty">{label}</span>
                      <span className="wem-tier-pct">-{displayPct}%</span>
                    </div>
                  );
                })}
            </div>
          ) : null}

          {/* ── Active discount banner ── */}
          {hasDiscount && (
            <div className="wem-discount-banner">
              <div className="wem-discount-icon"><i className="ti ti-discount" /></div>
              <div className="wem-discount-text">
                <span className="wem-discount-title">
                  خصم {effectiveDiscountPct > 0
                    ? `${effectiveDiscountPct}%`
                    : `${Number(activeTier?.discount_amount).toFixed(2)} دج/${unitSymbol}`}
                </span>
                <span className="wem-discount-detail">
                  توفير {fmt(savings)} دج
                </span>
              </div>
              <div className="wem-discount-amount">-{fmt(savings)}</div>
            </div>
          )}

          {/* ── Gram notice ── */}
          {gramNotice && (
            <div className="wem-gram-notice">
              <i className="ti ti-info-circle" /> {gramNotice}
            </div>
          )}

          {/* ── Weight Input (Hero) ── */}
          <div className="wem-hero">
            <label className="wem-field-label">
              <i className="ti ti-scale-outline" /> الوزن
            </label>
            <div className={`wem-hero-input ${lastEdited === 'weight' ? 'focused' : ''}`}>
              <FloatingTooltip content="-100 غ">
                <button className="wem-adj wem-adj--lg" onClick={() => adjust(-0.100)} type="button">
                  <i className="ti ti-minus" /><span>100</span>
                </button>
              </FloatingTooltip>
              <FloatingTooltip content="-10 غ">
                <button className="wem-adj" onClick={() => adjust(-0.010)} type="button">
                  <i className="ti ti-minus" /><span>10</span>
                </button>
              </FloatingTooltip>
              <div className="wem-hero-field">
                <input
                  ref={weightRef}
                  type="number" inputMode="decimal" step="0.001" min="0"
                  className="wem-inp"
                  value={weightStr}
                  onChange={e => handleWeightChange(e.target.value)}
                  placeholder="0.000"
                  onFocus={e => e.target.select()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleOk();
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'Tab') { e.preventDefault(); priceRef.current?.focus(); }
                    if (e.key === 'ArrowDown') {
                      const cur = parseFloat(weightStr) || 0;
                      if (cur <= 0.001) { e.preventDefault(); priceRef.current?.focus(); }
                    }
                  }}
                />
                <span className="wem-hero-unit">{unitSymbol}</span>
              </div>
              <FloatingTooltip content="+10 غ">
                <button className="wem-adj" onClick={() => adjust(0.010)} type="button">
                  <span>10</span><i className="ti ti-plus" />
                </button>
              </FloatingTooltip>
              <FloatingTooltip content="+100 غ">
                <button className="wem-adj wem-adj--lg" onClick={() => adjust(0.100)} type="button">
                  <span>100</span><i className="ti ti-plus" />
                </button>
              </FloatingTooltip>
            </div>
          </div>

          {/* ── Quick weights ── */}
          <div className="wem-quick">
            {QUICK_WEIGHTS.map(({ g, label, sub }) => {
              const kg = g / 1000;
              const isActive = Math.abs(weight - kg) < 0.0001;
              return (
                <button
                  key={g}
                  className={`wem-quick-btn ${isActive ? 'active' : ''}`}
                  onClick={() => quickSet(kg)}
                  type="button"
                >
                  <span className="wem-quick-val">{label}</span>
                  <span className="wem-quick-sub">{sub}</span>
                </button>
              );
            })}
          </div>

          {/* ── Price Input ── */}
          {unitPrice > 0 && (
            <div className="wem-price-section">
              <label className="wem-field-label wem-field-label--price">
                <i className="ti ti-coins" /> السعر الإجمالي
              </label>
              <div className={`wem-hero-input wem-hero-input--price ${lastEdited === 'price' ? 'focused' : ''}`}>
                <FloatingTooltip content="-100 دج">
                <button className="wem-adj wem-adj--lg" onClick={() => handlePriceChange(String(Math.max(0, price - 100)))} type="button">
                  <i className="ti ti-minus" /><span>100</span>
                </button>
              </FloatingTooltip>
              <FloatingTooltip content="-10 دج">
                <button className="wem-adj" onClick={() => handlePriceChange(String(Math.max(0, price - 10)))} type="button">
                  <i className="ti ti-minus" /><span>10</span>
                </button>
              </FloatingTooltip>
                <div className="wem-hero-field">
                  <input
                    ref={priceRef}
                    type="number" inputMode="decimal" step="1" min="0"
                    className="wem-inp wem-inp--price-hero"
                    value={priceStr}
                    onChange={e => handlePriceChange(e.target.value)}
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleOk();
                      if (e.key === 'Escape') onClose();
                      if (e.key === 'Tab') { e.preventDefault(); weightRef.current?.focus(); }
                      if (e.key === 'ArrowUp') {
                        const cur = parseFloat(priceStr) || 0;
                        if (cur <= 0) { e.preventDefault(); weightRef.current?.focus(); }
                      }
                    }}
                  />
                  <span className="wem-hero-unit wem-hero-unit--price">دج</span>
                </div>
                <FloatingTooltip content="+10 دج">
                  <button className="wem-adj" onClick={() => handlePriceChange(String(price + 10))} type="button">
                    <span>10</span><i className="ti ti-plus" />
                  </button>
                </FloatingTooltip>
                <FloatingTooltip content="+100 دج">
                  <button className="wem-adj wem-adj--lg" onClick={() => handlePriceChange(String(price + 100))} type="button">
                    <span>100</span><i className="ti ti-plus" />
                  </button>
                </FloatingTooltip>
              </div>
            </div>
          )}

          {/* ── Total summary ── */}
          {weight > 0 && unitPrice > 0 && (
            <div className={`wem-total ${hasDiscount ? 'wem-total--discount' : ''}`}>
              <div className="wem-total-line">
                <span className="wem-total-label">الإجمالي</span>
                <span className="wem-total-value">
                  {hasDiscount && (
                    <span className="wem-total-old">{fmt(originalTotal)}</span>
                  )}
                  <span className="wem-total-final">{fmt(finalTotal)} دج</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="wem-footer">
          <button
            className={`wem-submit ${submitPulse ? 'pulse' : ''} ${weight <= 0 ? '' : 'wem-submit--ready'}`}
            onClick={handleOk}
            disabled={weight <= 0}
            type="button"
          >
            <div className="wem-submit-left">
              <i className="ti ti-check" />
              <span>تأكيد الإضافة</span>
            </div>
            <div className="wem-submit-right">
              <span className="wem-submit-weight">
                {weight > 0 ? `${weightStr} ${unitSymbol}` : ''}
              </span>
              <span className="wem-submit-price">
                {weight > 0 ? `${fmt(finalTotal)} دج` : ''}
              </span>
            </div>
          </button>
          <div className="wem-hints">
            <kbd>Tab</kbd> تبديل
            <span className="wem-hint-dot" />
            <kbd>Enter</kbd> تأكيد
            <span className="wem-hint-dot" />
            <kbd>Esc</kbd> إلغاء
          </div>
        </div>

        {/* ── Resize handle ── */}
        <FloatingTooltip content="سحب لتغيير الحجم">
          <div className="wem-resize" onMouseDown={onResizeDown}>
            <i className="ti ti-grip-vertical" />
          </div>
        </FloatingTooltip>
      </div>
    </div>
  );
}
