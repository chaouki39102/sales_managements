import React, { useState, useRef, useEffect } from 'react';
import type { CartItem } from '@/types';
import { formatDZD } from '../utils/calculations';

interface CartRowProps {
  item:       CartItem;
  idx:        number;
  isSelected: boolean;
  onSelect:   () => void;
  onQty:      (qty: number) => void;
  onDiscount: (pct: number) => void;
  onDiscountAmount: (amount: number) => void;
  onPrice:    (price: number) => void;
  onRemove:   () => void;
}

type DiscMode = 'pct' | 'amount';

export default function CartRow({
  item, idx, isSelected, onSelect,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
}: CartRowProps) {
  const [editQty,    setEditQty]    = useState(false);
  const [editDisc,   setEditDisc]   = useState(false);
  const [editPrice,  setEditPrice]  = useState(false);
  const [qtyVal,     setQtyVal]     = useState('');
  const [discVal,    setDiscVal]    = useState('');
  const [priceVal,   setPriceVal]   = useState('');
  const [discMode,   setDiscMode]   = useState<DiscMode>('pct');

  const qtyRef   = useRef<HTMLInputElement>(null);
  const discRef  = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editQty  && qtyRef.current)   qtyRef.current.select();   }, [editQty]);
  useEffect(() => { if (editDisc && discRef.current)   discRef.current.select();  }, [editDisc]);
  useEffect(() => { if (editPrice && priceRef.current) priceRef.current.select(); }, [editPrice]);

  const commitQty = () => {
    const n = parseFloat(qtyVal);
    if (!isNaN(n) && n > 0) onQty(n);
    setEditQty(false);
  };

  const commitDisc = () => {
    const n = parseFloat(discVal);
    if (!isNaN(n) && n >= 0) {
      if (discMode === 'pct')    onDiscount(Math.min(100, n));
      else                       onDiscountAmount(Math.max(0, n));
    }
    setEditDisc(false);
  };

  const commitPrice = () => {
    const n = parseFloat(priceVal);
    if (!isNaN(n) && n >= 0) onPrice(n);
    setEditPrice(false);
  };

  const maxQty    = item.max_stock !== null ? item.max_stock : Infinity;
  const stockFull = item.manages_stock && item.quantity >= maxQty;

  const hasDisc   = item.discount_percentage > 0 || item.discount_amount > 0;
  const discLabel = item.discount_percentage > 0
    ? `-${item.discount_percentage.toFixed(1)}%`
    : item.discount_amount > 0
      ? `-${formatDZD(item.discount_amount)}`
      : null;

  return (
    <div
      className={`cr ${isSelected ? 'sel' : ''}`}
      onClick={onSelect}
    >
      <div className="cr-num">{idx + 1}</div>

      <div className="cr-info">
        <div className="cr-name-row">
          {item.image_url && (
            <img
              className="cr-img"
              src={item.image_url}
              alt={item.product_name}
              onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          )}
          <div className="cr-name">{item.product_name}</div>
        </div>

        <div className="cr-price-row">
          {editPrice ? (
            <input
              ref={priceRef}
              className="cr-edit-inp"
              type="number"
              value={priceVal}
              onChange={e => setPriceVal(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={e => {
                if (e.key === 'Enter')  commitPrice();
                if (e.key === 'Escape') setEditPrice(false);
              }}
              onClick={e => e.stopPropagation()}
              style={{ width: 70 }}
            />
          ) : (
            <span
              className="cr-price"
              onClick={e => {
                e.stopPropagation();
                setEditPrice(true);
                setPriceVal(String(item.unit_price_ht));
              }}
              title="انقر لتعديل السعر"
            >
              {formatDZD(item.unit_price_ht)}
              <span className="cr-price-unit"> HT</span>
            </span>
          )}

          {editDisc ? (
            <div
              className="cr-disc-edit"
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <button
                className={`cr-disc-mode-btn ${discMode === 'pct' ? 'on' : ''}`}
                onClick={() => setDiscMode('pct')}
                type="button"
                title="خصم نسبي %"
              >%</button>
              <button
                className={`cr-disc-mode-btn ${discMode === 'amount' ? 'on' : ''}`}
                onClick={() => setDiscMode('amount')}
                type="button"
                title="خصم ثابت دج"
              >دج</button>

              <input
                ref={discRef}
                className="cr-edit-inp"
                type="number"
                value={discVal}
                onChange={e => setDiscVal(e.target.value)}
                onBlur={commitDisc}
                onKeyDown={e => {
                  if (e.key === 'Enter')  commitDisc();
                  if (e.key === 'Escape') setEditDisc(false);
                }}
                style={{ width: 60 }}
              />
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                {discMode === 'pct' ? '%' : 'دج'}
              </span>
            </div>
          ) : hasDisc ? (
            <span
              className="cr-disc"
              onClick={e => {
                e.stopPropagation();
                setEditDisc(true);
                setDiscVal(
                  discMode === 'pct'
                    ? String(item.discount_percentage)
                    : String(item.discount_amount),
                );
              }}
              title="انقر لتعديل الخصم"
            >
              {discLabel}
            </span>
          ) : (
            <span
              className="cr-disc-add"
              onClick={e => {
                e.stopPropagation();
                setEditDisc(true);
                setDiscVal('0');
              }}
              title="إضافة خصم"
            >
              + خصم
            </span>
          )}
        </div>
      </div>

      <div className="cr-qty-ctrl" onClick={e => e.stopPropagation()}>
        <button
          className="cq-btn"
          onClick={() => onQty(Math.max(0.001, item.quantity - 1))}
          title="إنقاص (NumPad -)"
        >
          <i className="ti ti-minus" />
        </button>

        {editQty ? (
          <input
            ref={qtyRef}
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
            {item.quantity}
          </span>
        )}

        <button
          className="cq-btn"
          onClick={() => {
            if (stockFull) return;
            onQty(item.quantity + 1);
          }}
          title={stockFull ? 'نفد المخزون' : 'زيادة (NumPad +)'}
          disabled={stockFull}
          style={stockFull ? { opacity: 0.35 } : undefined}
        >
          <i className="ti ti-plus" />
        </button>

        <span className="cq-unit">{item.unit_symbol}</span>

        {stockFull && (
          <span
            className="cq-stock-warn"
            title={`الحد الأقصى: ${item.max_stock}`}
          >
            <i className="ti ti-alert-triangle" />
          </span>
        )}
      </div>

      <div className="cr-total">
        <div className="cr-ttc">{formatDZD(item.total_ttc)}</div>
        <div className="cr-ht">HT: {formatDZD(item.total_ht)}</div>
        {item.tva_rate > 0 && (
          <div className="cr-tva-badge">TVA {item.tva_rate}%</div>
        )}
      </div>

      <button
        className="cr-del"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        title="حذف الصنف (Del)"
      >
        <i className="ti ti-x" />
      </button>
    </div>
  );
}
