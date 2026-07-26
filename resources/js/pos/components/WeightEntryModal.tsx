import { useState, useRef, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

interface WeightEntryModalProps {
  productName: string;
  unitSymbol?: string | null;
  defaultPrice?: number;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

export default function WeightEntryModal({
  productName,
  unitSymbol = 'كغ',
  onClose,
  onConfirm,
}: WeightEntryModalProps) {
  const [val, setVal] = useState('');
  const inpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inpRef.current?.focus(); }, []);

  const handleOk = useCallback(() => {
    const qty = parseFloat(val);
    if (qty > 0) onConfirm(qty);
  }, [val, onConfirm]);

  const adjust = useCallback((delta: number) => {
    setVal(prev => {
      const cur = parseFloat(prev) || 0;
      const next = Math.max(0.001, Math.round((cur + delta) * 1000) / 1000);
      return String(next);
    });
  }, []);

  const quickSet = useCallback((qty: number) => {
    setVal(String(qty));
    inpRef.current?.focus();
  }, []);

  return (
    <Modal
      open
      onClose={onClose}
      title={<><i className="ti ti-scale ml-2" /> إدخال الوزن</>}
      size="sm"
      footer={
        <>
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleOk} disabled={!val || parseFloat(val) <= 0}>
            <i className="ti ti-check" /> موافق
          </button>
        </>
      }
    >
      <div className="wem-product">{productName}</div>

      <div className="wem-quick-btns">
        {[0.250, 0.500, 0.750, 1, 2, 3, 5].map(q => (
          <button
            key={q}
            className={`wem-quick-btn ${parseFloat(val) === q ? 'active' : ''}`}
            onClick={() => quickSet(q)}
            type="button"
          >
            {q} {unitSymbol}
          </button>
        ))}
      </div>

      <div className="wem-input-row">
        <button className="wem-adj-btn" onClick={() => adjust(-0.001)} type="button" title="-0.001">
          <i className="ti ti-minus" />
          <span className="wem-adj-label">0.001</span>
        </button>
        <button className="wem-adj-btn" onClick={() => adjust(-0.01)} type="button" title="-0.01">
          <i className="ti ti-minus" />
          <span className="wem-adj-label">0.01</span>
        </button>

        <input
          ref={inpRef}
          type="number"
          className="form-control wem-inp"
          value={val}
          onChange={e => setVal(e.target.value)}
          min="0.001"
          step="0.001"
          placeholder="0.000"
          onKeyDown={e => {
            if (e.key === 'Enter') handleOk();
            if (e.key === 'Escape') onClose();
          }}
        />
        <span className="wem-unit">{unitSymbol}</span>

        <button className="wem-adj-btn" onClick={() => adjust(0.01)} type="button" title="+0.01">
          <span className="wem-adj-label">0.01</span>
          <i className="ti ti-plus" />
        </button>
        <button className="wem-adj-btn" onClick={() => adjust(0.001)} type="button" title="+0.001">
          <span className="wem-adj-label">0.001</span>
          <i className="ti ti-plus" />
        </button>
      </div>

      <div className="wem-hint">
        <kbd className="qsm-kbd">Enter</kbd> تأكيد · <kbd className="qsm-kbd">Esc</kbd> إلغاء
      </div>
    </Modal>
  );
}
