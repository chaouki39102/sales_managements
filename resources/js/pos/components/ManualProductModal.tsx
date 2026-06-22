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
