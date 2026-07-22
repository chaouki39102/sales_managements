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
