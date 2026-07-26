import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Modal from '@/components/ui/Modal';

interface WeightEntryModalProps {
  productName: string;
  unitSymbol?: string | null;
  unitPrice: number;
  /** الكمية الأولية عند فتح المودال للتعديل */
  initialWeight?: number;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

const QUICK_WEIGHTS = [0.050, 0.100, 0.200, 0.500, 1, 2];

export default function WeightEntryModal({
  productName,
  unitSymbol = 'كغ',
  unitPrice,
  initialWeight,
  onClose,
  onConfirm,
}: WeightEntryModalProps) {
  const [weightStr, setWeightStr] = useState(() => initialWeight && initialWeight > 0 ? String(initialWeight) : '0.001');
  const [priceStr, setPriceStr] = useState(() => {
    if (initialWeight && initialWeight > 0 && unitPrice > 0) return String(Math.round(initialWeight * unitPrice));
    if (unitPrice > 0) return String(Math.round(0.001 * unitPrice));
    return '';
  });
  const [customMode, setCustomMode] = useState(false);
  const weightRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const lockRef = useRef<'weight' | 'price' | null>(null);

  useEffect(() => { weightRef.current?.focus(); }, []);

  const weight = useMemo(() => {
    const v = parseFloat(weightStr);
    return isNaN(v) || v < 0 ? 0 : v;
  }, [weightStr]);

  const price = useMemo(() => {
    const v = parseFloat(priceStr);
    return isNaN(v) || v < 0 ? 0 : v;
  }, [priceStr]);

  const computedPrice = unitPrice > 0 ? Math.round(weight * unitPrice) : 0;
  const computedWeight = unitPrice > 0 ? Math.round((price / unitPrice) * 1000) / 1000 : 0;

  const handleWeightChange = useCallback((raw: string) => {
    setWeightStr(raw);
    lockRef.current = 'weight';
    const v = parseFloat(raw);
    if (!isNaN(v) && v > 0 && unitPrice > 0) {
      setPriceStr(String(Math.round(v * unitPrice)));
    }
  }, [unitPrice]);

  const handlePriceChange = useCallback((raw: string) => {
    setPriceStr(raw);
    lockRef.current = 'price';
    const v = parseFloat(raw);
    if (!isNaN(v) && v > 0 && unitPrice > 0) {
      setWeightStr(String(Math.round((v / unitPrice) * 1000) / 1000));
    }
  }, [unitPrice]);

  const quickSet = useCallback((w: number) => {
    setWeightStr(String(w));
    lockRef.current = 'weight';
    if (unitPrice > 0) setPriceStr(String(Math.round(w * unitPrice)));
    weightRef.current?.focus();
  }, [unitPrice]);

  const adjust = useCallback((delta: number) => {
    setWeightStr(prev => {
      const cur = parseFloat(prev) || 0;
      const next = Math.max(0.001, Math.round((cur + delta) * 1000) / 1000);
      lockRef.current = 'weight';
      if (unitPrice > 0) setPriceStr(String(Math.round(next * unitPrice)));
      return String(next);
    });
  }, [unitPrice]);

  const handleOk = useCallback(() => {
    if (weight > 0) onConfirm(weight);
  }, [weight, onConfirm]);

  return (
    <Modal
      open
      onClose={onClose}
      title={<><i className="ti ti-scale" style={{ marginLeft: 6 }} /> إدخال الوزن</>}
      size="sm"
      footer={
        <>
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleOk} disabled={weight <= 0}>
            <i className="ti ti-check" /> تأكيد
          </button>
        </>
      }
    >
      {/* ── Product name + unit price ── */}
      <div className="wem-product">{productName}</div>
      {unitPrice > 0 && (
        <div className="wem-unit-price">
          <i className="ti ti-tag" /> سعر الوحدة: <strong>{unitPrice.toLocaleString('ar-DZ')} دج</strong>
          <span className="wem-unit-price-per">/ {unitSymbol}</span>
        </div>
      )}

      {/* ── Quick weight buttons ── */}
      <div className="wem-quick-btns">
        {QUICK_WEIGHTS.map(w => (
          <button
            key={w}
            className={`wem-quick-btn ${weight === w ? 'active' : ''}`}
            onClick={() => quickSet(w)}
            type="button"
          >
            {w >= 1 ? w : `${w * 1000} ج`}
          </button>
        ))}
        <button
          className={`wem-quick-btn ${customMode ? 'active' : ''}`}
          onClick={() => { setCustomMode(true); setWeightStr(''); setPriceStr(''); weightRef.current?.focus(); }}
          type="button"
        >
          <i className="ti ti-pencil" /> حجم آخر
        </button>
      </div>

      {/* ── Weight input row ── */}
      <div className="wem-field-group">
        <label className="wem-field-label">
          <i className="ti ti-scale-outline" /> الوزن
        </label>
        <div className="wem-input-row">
          <button className="wem-adj-btn" onClick={() => adjust(-0.100)} type="button" title="-100 ج">
            <i className="ti ti-minus" />
            <span className="wem-adj-label">100ج</span>
          </button>
          <button className="wem-adj-btn" onClick={() => adjust(-0.010)} type="button" title="-10 ج">
            <i className="ti ti-minus" />
            <span className="wem-adj-label">10ج</span>
          </button>

          <input
            ref={weightRef}
            type="number"
            className="form-control wem-inp"
            value={weightStr}
            onChange={e => handleWeightChange(e.target.value)}
            min="0.001"
            step="0.001"
            placeholder="0.000"
            onKeyDown={e => {
              if (e.key === 'Enter') handleOk();
              if (e.key === 'Escape') onClose();
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); priceRef.current?.focus(); }
            }}
          />
          <span className="wem-unit">{unitSymbol}</span>

          <button className="wem-adj-btn" onClick={() => adjust(0.010)} type="button" title="+10 ج">
            <span className="wem-adj-label">10ج</span>
            <i className="ti ti-plus" />
          </button>
          <button className="wem-adj-btn" onClick={() => adjust(0.100)} type="button" title="+100 ج">
            <span className="wem-adj-label">100ج</span>
            <i className="ti ti-plus" />
          </button>
        </div>
      </div>

      {/* ── Price input row (bidirectional) ── */}
      {unitPrice > 0 && (
        <div className="wem-field-group">
          <label className="wem-field-label">
            <i className="ti ti-currency-dollar" /> السعر (الإجمالي)
          </label>
          <div className="wem-input-row">
            <button
              className="wem-adj-btn"
              onClick={() => {
                const newPrice = Math.max(1, price - 10);
                handlePriceChange(String(newPrice));
              }}
              type="button" title="-10 دج"
            >
              <i className="ti ti-minus" />
              <span className="wem-adj-label">10دج</span>
            </button>
            <button
              className="wem-adj-btn"
              onClick={() => {
                const newPrice = Math.max(1, price - 1);
                handlePriceChange(String(newPrice));
              }}
              type="button" title="-1 دج"
            >
              <i className="ti ti-minus" />
              <span className="wem-adj-label">1دج</span>
            </button>

            <input
              ref={priceRef}
              type="number"
              className="form-control wem-inp wem-inp-price"
              value={priceStr}
              onChange={e => handlePriceChange(e.target.value)}
              min="0"
              step="1"
              placeholder="0"
              onKeyDown={e => {
                if (e.key === 'Enter') handleOk();
                if (e.key === 'Escape') onClose();
                if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); weightRef.current?.focus(); }
              }}
            />
            <span className="wem-unit">دج</span>

            <button
              className="wem-adj-btn"
              onClick={() => handlePriceChange(String(price + 1))}
              type="button" title="+1 دج"
            >
              <span className="wem-adj-label">1دج</span>
              <i className="ti ti-plus" />
            </button>
            <button
              className="wem-adj-btn"
              onClick={() => handlePriceChange(String(price + 10))}
              type="button" title="+10 دج"
            >
              <span className="wem-adj-label">10دج</span>
              <i className="ti ti-plus" />
            </button>
          </div>
        </div>
      )}

      {/* ── Summary ── */}
      {weight > 0 && unitPrice > 0 && (
        <div className="wem-summary">
          <span className="wem-summary-qty">{weight.toFixed(3)} {unitSymbol}</span>
          <i className="ti ti-arrow-left" />
          <span className="wem-summary-price">{computedPrice.toLocaleString('ar-DZ')} دج</span>
        </div>
      )}

      {/* ── Keyboard hints ── */}
      <div className="wem-hint">
        <kbd className="qsm-kbd">Enter</kbd> تأكيد · <kbd className="qsm-kbd">Esc</kbd> إلغاء · <kbd className="qsm-kbd">Tab</kbd> التبديل
      </div>
    </Modal>
  );
}
