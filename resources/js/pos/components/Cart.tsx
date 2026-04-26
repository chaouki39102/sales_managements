// pos/components/Cart.tsx
import React, { useState } from 'react';
import type { Party } from '@/types';
import type { CartItem, CartTotals } from '@/types';
import { formatDZD } from '../utils/calculations';

interface CartProps {
  items:       CartItem[];
  totals:      CartTotals;
  client:      Party | null;
  customers:   Party[];
  onQty:       (id: string, qty: number) => void;
  onDiscount:  (id: string, pct: number) => void;
  onRemove:    (id: string) => void;
  onSetClient: (c: Party | null) => void;
  onHold:      () => void;
  onSell:      () => void;
  onNote:      () => void;
  onClear:     () => void;
  onHeld:      () => void;
}

type PriceMode = 'retail' | 'semi' | 'wholesale';

export default function Cart({
  items, totals, client, customers,
  onQty, onDiscount, onRemove, onSetClient,
  onHold, onSell, onNote, onClear, onHeld,
}: CartProps) {
  const [mode, setMode] = useState<PriceMode>('retail');

  const isEmpty = items.length === 0;

  return (
    <div className="pos-cart" id="pos-cart">

      {/* ── Cart header ── */}
      <div className="cart-top">
        <div className="cart-top-row">
          <div className="cart-ttl">
            <span className="ic ic-sm"><i className="ti ti-shopping-cart" /></span>
            السلة
            <span className={`cart-pill`}>{totals.items_count}</span>
          </div>
          <div className="cart-acts2">
            <button className="btn btn-xs" onClick={onHeld} title="المعلقة">
              <span className="ic ic-xs"><i className="ti ti-clock-pause" /></span>
            </button>
            <button className="btn btn-xs" onClick={onNote} title="ملاحظة">
              <span className="ic ic-xs"><i className="ti ti-notes" /></span>
            </button>
            <button
              className="btn btn-xs btn-r"
              onClick={onClear}
              disabled={isEmpty}
              title="مسح السلة"
            >
              <span className="ic ic-xs"><i className="ti ti-trash" /></span>
            </button>
          </div>
        </div>

        {/* Price mode */}
        <div className="cart-modes2">
          {(['retail','semi','wholesale'] as PriceMode[]).map(m => (
            <button
              key={m}
              className={`cmode ${mode === m ? 'on' : ''}`}
              onClick={() => setMode(m)}
            >
              <span className="ic ic-xs">
                <i className={`ti ${m === 'retail' ? 'ti-user' : m === 'semi' ? 'ti-packages' : 'ti-building-store'}`} />
              </span>
              {m === 'retail' ? 'تجزئة' : m === 'semi' ? 'نصف جملة' : 'جملة'}
            </button>
          ))}
        </div>

        {/* Client selector */}
        <div className="cart-client">
          <select
            value={client?.id ?? ''}
            onChange={e => {
              const id = Number(e.target.value);
              onSetClient(id ? (customers.find(c => c.id === id) ?? null) : null);
            }}
          >
            <option value="">👤 زبون عابر</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
                {(c.balance ?? 0) > 0 ? ` ⚠️ دين ${c.balance?.toLocaleString('fr-DZ')} دج` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Cart items ── */}
      <div className="cart-items-body" id="cart-items">
        {isEmpty ? (
          <div className="cart-empty">
            <div className="cart-empty-ic"><i className="ti ti-shopping-cart" /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t3)' }}>السلة فارغة</div>
            <div style={{ fontSize: '11.5px' }}>اضغط على منتج لإضافته</div>
          </div>
        ) : (
          items.map((item, idx) => (
            <CartItemRow
              key={item.id}
              item={item}
              index={idx + 1}
              onQty={onQty}
              onDiscount={onDiscount}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {/* ── Fixed footer ── */}
      <div className="cart-foot">
        {/* Summary rows */}
        <div className="cart-sums">
          <div className="sum-row">
            <span className="sum-l">المجموع HT</span>
            <span className="sum-v">{formatDZD(totals.total_ht)}</span>
          </div>
          {totals.total_discount > 0 && (
            <div className="sum-row">
              <span className="sum-l" style={{ color: 'var(--red)' }}>خصم</span>
              <span className="sum-v" style={{ color: 'var(--red)' }}>- {formatDZD(totals.total_discount)}</span>
            </div>
          )}
          <div className="sum-row">
            <span className="sum-l">TVA (مجمّع)</span>
            <span className="sum-v">{formatDZD(totals.total_tva)}</span>
          </div>
          {totals.fiscal_stamp > 0 && (
            <div className="sum-row">
              <span className="sum-l">الطابع الجبائي</span>
              <span className="sum-v">+ {formatDZD(totals.fiscal_stamp)}</span>
            </div>
          )}
        </div>

        {/* Grand total */}
        <div className="grand-bar">
          <span className="grand-lbl">الإجمالي TTC</span>
          <span className="grand-val">
            <span className="gu">دج </span>
            <span>{(totals.total_ttc + totals.fiscal_stamp).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}</span>
          </span>
        </div>

        {/* Action buttons */}
        <div className="cart-btns2">
          <button className="btn-hold2" onClick={onHold} disabled={isEmpty} title="F5">
            <span className="ic ic-xs"><i className="ti ti-player-pause" /></span> تعليق
          </button>
          <button className="btn-sell2" onClick={onSell} disabled={isEmpty} title="F4">
            <span className="ic ic-xs"><i className="ti ti-circle-check" /></span> تأكيد البيع
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single cart item row ──────────────────────────
function CartItemRow({
  item, index, onQty, onDiscount, onRemove,
}: {
  item: CartItem;
  index: number;
  onQty:      (id: string, qty: number) => void;
  onDiscount: (id: string, pct: number) => void;
  onRemove:   (id: string) => void;
}) {
  const name = [item.product_name, item.variant_name].filter(Boolean).join(' — ');

  return (
    <div className="ci">
      <div className="ci-n">{index}</div>
      <div className="ci-body">
        <div className="ci-name" title={name}>{name}</div>
        <div className="ci-prow">
          <input
            type="number"
            className="ci-pinp"
            value={item.unit_price_ht}
            min={0}
            step={0.01}
            onChange={e => onDiscount(item.id, item.discount_percentage)}
            onBlur={e => {
              // price edit — via parent handler (simplified)
            }}
          />
          <span className="ci-punit">HT/{item.unit_symbol ?? 'قطعة'}</span>
          {item.discount_percentage > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--red)', marginRight: 'auto' }}>
              -{item.discount_percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Qty controls */}
      <div className="qc2">
        <button className="qb2" onClick={() => onQty(item.id, item.quantity - 1)}>−</button>
        <span className="qn2">{item.quantity}</span>
        <button className="qb2" onClick={() => onQty(item.id, item.quantity + 1)}>+</button>
      </div>

      {/* Total */}
      <span className="ci-sum" style={{ direction: 'ltr' }}>
        {item.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
      </span>

      {/* Delete */}
      <button className="ci-del" onClick={() => onRemove(item.id)} title="حذف">
        <span className="ic ic-xs"><i className="ti ti-x" /></span>
      </button>
    </div>
  );
}
