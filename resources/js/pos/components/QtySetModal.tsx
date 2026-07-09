import { useState, useRef, useEffect } from 'react';
import type { CartItem } from '@/lib/api/core/types';

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
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleOk}><i className="ti ti-check" /> موافق</button>
        </div>
      </div>
    </div>
  );
}
