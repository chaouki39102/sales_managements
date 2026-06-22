import React, { useState } from 'react';
import type { CartItem } from '@/types';
import { formatDZD } from '../utils/calculations';

interface CartRowProps {
  item: CartItem; idx: number; isSelected: boolean;
  onSelect: () => void;
  onQty: (qty: number) => void;
  onDiscount: (pct: number) => void;
  onPrice: (price: number) => void;
  onRemove: () => void;
}

export default function CartRow({
  item, idx, isSelected, onSelect, onQty, onDiscount, onPrice, onRemove,
}: CartRowProps) {
  const [editQty,  setEditQty]  = useState(false);
  const [editDisc, setEditDisc] = useState(false);
  const [editPrc,  setEditPrc]  = useState(false);
  const [qtyVal,   setQtyVal]   = useState(String(item.quantity));
  const [discVal,  setDiscVal]  = useState(String(item.discount_percentage));
  const [prcVal,   setPrcVal]   = useState(String(item.unit_price_ht));

  const commitQty  = () => { const v = parseFloat(qtyVal); if (!isNaN(v) && v > 0) onQty(v); else setQtyVal(String(item.quantity)); setEditQty(false); };
  const commitDisc = () => { const v = parseFloat(discVal); if (!isNaN(v)) onDiscount(Math.min(100, Math.max(0, v))); else setDiscVal(String(item.discount_percentage)); setEditDisc(false); };
  const commitPrc  = () => { const v = parseFloat(prcVal); if (!isNaN(v) && v >= 0) onPrice(v); else setPrcVal(String(item.unit_price_ht)); setEditPrc(false); };

  return (
    <div
      className={`cart-row ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="cr-idx">{idx + 1}</div>
      <div className="cr-info">
        <div className="cr-name">{item.product_name}</div>
        {item.variant_name && <div className="cr-variant">{item.variant_name}</div>}
        <div className="cr-meta">
          {editPrc ? (
            <input
              className="cr-edit-inp"
              type="number"
              value={prcVal}
              onChange={e => setPrcVal(e.target.value)}
              onBlur={commitPrc}
              onKeyDown={e => { if (e.key === 'Enter') commitPrc(); if (e.key === 'Escape') setEditPrc(false); }}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ width: 80 }}
            />
          ) : (
            <span className="cr-price" onClick={e => { e.stopPropagation(); setEditPrc(true); setPrcVal(String(item.unit_price_ht)); }} title="انقر لتعديل السعر">
              {formatDZD(item.unit_price_ht)}
            </span>
          )}
          <span className="cr-tva">TVA {item.tva_rate}%</span>
          {editDisc ? (
            <input
              className="cr-edit-inp"
              type="number"
              value={discVal}
              onChange={e => setDiscVal(e.target.value)}
              onBlur={commitDisc}
              onKeyDown={e => { if (e.key === 'Enter') commitDisc(); if (e.key === 'Escape') setEditDisc(false); }}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ width: 60 }}
            />
          ) : item.discount_percentage > 0 ? (
            <span className="cr-disc" onClick={e => { e.stopPropagation(); setEditDisc(true); setDiscVal(String(item.discount_percentage)); }} title="انقر لتعديل الخصم">
              -{item.discount_percentage}%
            </span>
          ) : (
            <span className="cr-disc-add" onClick={e => { e.stopPropagation(); setEditDisc(true); setDiscVal('0'); }} title="إضافة خصم">
              + خصم
            </span>
          )}
        </div>
      </div>

      <div className="cr-qty-ctrl" onClick={e => e.stopPropagation()}>
        <button className="cq-btn" onClick={() => onQty(Math.max(0.001, item.quantity - 1))} title="إنقاص (NumPad -)">
          <i className="ti ti-minus" />
        </button>
        {editQty ? (
          <input
            className="cr-edit-inp cq-inp"
            type="number"
            value={qtyVal}
            onChange={e => setQtyVal(e.target.value)}
            onBlur={commitQty}
            onKeyDown={e => { if (e.key === 'Enter') commitQty(); if (e.key === 'Escape') setEditQty(false); }}
            autoFocus
          />
        ) : (
          <span
            className="cq-val"
            onClick={() => { setEditQty(true); setQtyVal(String(item.quantity)); }}
            title="انقر لتعديل الكمية"
          >
            {item.quantity}
          </span>
        )}
        <button className="cq-btn" onClick={() => {
          if (item.max_stock !== null && item.quantity >= item.max_stock && !item.manages_stock) return;
          onQty(item.quantity + 1);
        }} title="زيادة (NumPad +)">
          <i className="ti ti-plus" />
        </button>
        <span className="cq-unit">{item.unit_symbol}</span>
      </div>

      <div className="cr-total">
        <div className="cr-ttc">{formatDZD(item.total_ttc)}</div>
        <div className="cr-ht">HT: {formatDZD(item.total_ht)}</div>
      </div>

      <button className="cr-del" onClick={e => { e.stopPropagation(); onRemove(); }} title="حذف الصنف (Del)">
        <i className="ti ti-x" />
      </button>
    </div>
  );
}
