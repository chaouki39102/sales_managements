import { useState, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
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

  const handleOk = () => {
    const qty = parseFloat(val);
    if (qty > 0) onConfirm(qty);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={<><i className="ti ti-edit ml-2" /> تعديل الكمية</>}
      size="sm"
      footer={
        <>
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleOk}><i className="ti ti-check" /> موافق</button>
        </>
      }
    >
      <div className="qsm-product">
        {item.product_name}
      </div>
      <div className="fg">
        <label>الكمية</label>
        <input
          ref={inpRef}
          type="number"
          className="form-control qsm-inp"
          value={val}
          onChange={e => setVal(e.target.value)}
          min="0.001"
          step="1"
          onKeyDown={e => e.key === 'Enter' && handleOk()}
        />
      </div>
      <div className="qsm-hint">
        <div><kbd className="qsm-kbd">Enter</kbd> تأكيد · <kbd className="qsm-kbd">Esc</kbd> إلغاء</div>
        <div className="qsm-hint-row"><kbd className="qsm-kbd">Ctrl++</kbd> زيادة · <kbd className="qsm-kbd">Ctrl+-</kbd> نقصان · <kbd className="qsm-kbd">↑↓</kbd> تنقل · <kbd className="qsm-kbd">Del</kbd> حذف</div>
      </div>
    </Modal>
  );
}
