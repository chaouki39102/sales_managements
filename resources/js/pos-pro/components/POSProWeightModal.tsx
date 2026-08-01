// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProWeightModal.tsx
//
// مودال الوزن للمنتجات المباعة بالوزن (is_sold_by_weight):
// يدخل الكاشير الكمية بالكيلوغرام (إدخال عشري + أزرار سريعة)، ونعرض له
// السعر المحسوب (HT/TTC) فورياً قبل التأكيد. يُستخدَم للإضافة من المودال/
// المسح، ولتعديل كمية صنف موجود في السلة.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { formatDZD } from '@/pos/utils/calculations';

interface Props {
  open:          boolean;
  name:          string;
  priceHtPerKg:  number;
  tvaRate:       number;
  initialKg?:    number;
  confirmLabel?: string;
  onConfirm:     (kg: number) => void;
  onClose:       () => void;
}

const QUICK_KGS = [0.5, 1, 2, 5, 10];

export default function POSProWeightModal({
  open, name, priceHtPerKg, tvaRate, initialKg, confirmLabel, onConfirm, onClose,
}: Props) {
  const [kgText, setKgText] = useState(initialKg ? String(initialKg) : '1');
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setKgText(initialKg ? String(initialKg) : '1');
      const t = setTimeout(() => inputRef.current?.select(), 60);
      return () => clearTimeout(t);
    }
  }, [open, initialKg]);

  const kg = parseFloat(kgText);

  const commit = () => {
    if (!Number.isFinite(kg) || kg <= 0) return;
    onConfirm(kg);
    onClose();
  };

  const ttcPerKg = priceHtPerKg * (1 + tvaRate / 100);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تحديد الوزن"
      subtitle={name}
      size="sm"
      resizable={false}
      footer={
        <button
          type="button"
          className="btn btn-p"
          onClick={commit}
          disabled={!Number.isFinite(kg) || kg <= 0}
        >
          <i className="ti ti-scale" />
          {confirmLabel ?? 'إضافة بالسلة'}
        </button>
      }
    >
      <div className="pp-weight">
        <div className="pp-weight-input">
          <input
            ref={inputRef}
            value={kgText}
            onChange={(e) => setKgText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
            inputMode="decimal"
          />
          <span>كغ</span>
        </div>

        <div className="pp-weight-chips">
          {QUICK_KGS.map(k => (
            <button
              key={k}
              type="button"
              className={`pp-weight-chip${kg === k ? ' on' : ''}`}
              onClick={() => setKgText(String(k))}
            >
              {k} كغ
            </button>
          ))}
        </div>

        {Number.isFinite(kg) && kg > 0 && (
          <div className="pp-weight-preview">
            <div>
              <span>السعر (HT)</span>
              <strong dir="ltr">{formatDZD(kg * priceHtPerKg)}</strong>
            </div>
            <div>
              <span>السعر (TTC)</span>
              <strong dir="ltr">{formatDZD(kg * ttcPerKg)}</strong>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
