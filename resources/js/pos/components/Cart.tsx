// pos/components/Cart.tsx
//
// ✅ إصلاحات مُطبَّقة على هذا الملف:
//   1. أزرار "تجزئة / نصف جملة / جملة" كانت مجرد حالة UI محلية (mode) بلا أي
//      تأثير فعلي على الأسعار — أصبحت الآن تعرض مستويات السعر الحقيقية من
//      usePriceLevels() وتُطبِّق السعر الفعلي على كل سطر في السلة عند التبديل.
//   2. زر "ملاحظة" كان onClick بلا أي تنفيذ (TODO فاضي في POSPage) — أصبح
//      يفتح/يطوي حقل ملاحظة فعلي مرتبط بـ useCartStore.notes/setNotes
//      (كانت هذه الدوال معرَّفة في الـ store ولم تُستخدم في أي مكان إطلاقاً).
//   3. زيادة الكمية (+) كانت لا تتحقق من المخزون المتاح — checkStock() في
//      calculations.ts كانت موجودة وغير مُستخدمة. أصبحت الآن تُستدعى فعلياً
//      وتمنع التجاوز مع رسالة تنبيه واضحة (إلا إذا كان allow_negative_stock).
import React, { useState, useRef, useEffect } from 'react';
import type { Party, PriceLevel } from '@/types';
import type { CartItem, CartTotals } from '@/types';
import { formatDZD, checkStock } from '../utils/calculations';

interface CartProps {
  items:       CartItem[];
  totals:      CartTotals;
  client:      Party | null;
  customers:   Party[];
  priceLevels: PriceLevel[];
  selectedPriceLevelId: number | null;
  note:        string;
  onQty:       (id: string, qty: number) => void;
  onDiscount:  (id: string, pct: number) => void;
  onPrice:     (id: string, price: number) => void;
  onRemove:    (id: string) => void;
  onSetClient: (c: Party | null) => void;
  onPriceLevelChange: (priceLevelId: number | null) => void;
  onNoteChange: (note: string) => void;
  onHold:      () => void;
  onSell:      () => void;
  onClear:     () => void;
  onHeld:      () => void;
}

export default function Cart({
  items, totals, client, customers, priceLevels, selectedPriceLevelId, note,
  onQty, onDiscount, onPrice, onRemove, onSetClient, onPriceLevelChange,
  onNoteChange, onHold, onSell, onClear, onHeld,
}: CartProps) {
  const [showNote, setShowNote] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCustomers = customers.filter(c =>
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClientName = client
    ? client.name
    : '👤 زبون عابر';

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
            <button
              className={`btn btn-xs ${note ? 'btn-p' : ''}`}
              onClick={() => setShowNote(s => !s)}
              title="ملاحظة على الفاتورة"
            >
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

        {/* حقل الملاحظة — يُفتح/يُطوى بزر الملاحظة، ومتصل فعلياً بالسلة */}
        {showNote && (
          <div style={{ margin: '6px 0' }}>
            <input
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="ملاحظة على الفاتورة (اختياري)..."
              autoFocus
              style={{
                width: '100%', padding: '6px 9px', borderRadius: 'var(--r1)',
                border: '1px solid var(--b2)', background: 'var(--bg3)',
                fontFamily: 'Tajawal,sans-serif', fontSize: '12.5px', outline: 'none',
              }}
            />
          </div>
        )}

        {/* مستويات السعر — حقيقية من إعدادات الشركة، لا أسماء ثابتة */}
        {priceLevels.length > 0 && (
          <div className="cart-modes2">
            {priceLevels.map(pl => (
              <button
                key={pl.id}
                className={`cmode ${selectedPriceLevelId === pl.id ? 'on' : ''}`}
                onClick={() => onPriceLevelChange(pl.id)}
                title={pl.discount_percent ? `خصم ${pl.discount_percent}%` : undefined}
              >
                <span className="ic ic-xs"><i className="ti ti-tag" /></span>
                {pl.name}
              </button>
            ))}
          </div>
        )}

        {/* Client search combobox */}
        <div className="cart-client" ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            className="client-trigger"
            onClick={() => setOpenDropdown(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '7px 9px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
              background: 'var(--bg3)', fontSize: '12.5px',
            }}
          >
            <span style={{ fontSize: 14, opacity: 0.5 }}><i className="ti ti-user-search" /></span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedClientName}
            </span>
            <span style={{ fontSize: 10, opacity: 0.4 }}>▾</span>
          </div>

          {openDropdown && (
            <div
              className="client-dropdown"
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--bg0)', border: '1px solid var(--b2)',
                borderRadius: 'var(--r1)', boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                maxHeight: 280, overflow: 'auto', marginTop: 2,
              }}
            >
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--b3)' }}>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="🔍 ابحث عن زبون..."
                  autoFocus
                  style={{
                    width: '100%', padding: '6px 8px', border: '1px solid var(--b2)',
                    borderRadius: 'var(--r1)', background: 'var(--bg3)',
                    fontFamily: 'Tajawal,sans-serif', fontSize: '12.5px', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                className="client-opt"
                onClick={() => { onSetClient(null); setClientSearch(''); setOpenDropdown(false); }}
                style={{
                  padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: '1px solid var(--b3)', fontWeight: client === null ? 700 : 400,
                  background: client === null ? 'var(--emb)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 16 }}>👤</span>
                <span>زبون عابر</span>
              </div>

              {filteredCustomers.map(c => {
                const debt = (c.balance ?? 0) > 0;
                return (
                  <div
                    key={c.id}
                    className="client-opt"
                    onClick={() => { onSetClient(c); setClientSearch(''); setOpenDropdown(false); }}
                    style={{
                      padding: '8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                      borderBottom: '1px solid var(--b3)',
                      background: client?.id === c.id ? 'var(--emb)' : 'transparent',
                      fontWeight: client?.id === c.id ? 700 : 400,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px' }}>{c.name}</span>
                      {debt && (
                        <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 600, direction: 'ltr' }}>
                          {c.balance?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                        </span>
                      )}
                    </div>
                    {c.address && (
                      <div style={{ fontSize: '10.5px', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.address}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredCustomers.length === 0 && (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', opacity: 0.4 }}>
                  لا توجد نتائج
                </div>
              )}
            </div>
          )}
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
              onPrice={onPrice}
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
  item, index, onQty, onDiscount, onPrice, onRemove,
}: {
  item: CartItem;
  index: number;
  onQty:      (id: string, qty: number) => void;
  onDiscount: (id: string, pct: number) => void;
  onPrice:    (id: string, price: number) => void;
  onRemove:   (id: string) => void;
}) {
  const name = [item.product_name, item.variant_name].filter(Boolean).join(' — ');
  const [warning, setWarning] = useState('');

  const requestQty = (newQty: number) => {
    if (newQty <= 0) { onRemove(item.id); return; }
    const check = checkStock(item, newQty);
    if (!check.ok) {
      setWarning(check.message);
      // نسمح بالوصول للحد الأقصى المتاح فقط، لا نرفض الزيادة بالكامل
      if (item.max_stock != null) onQty(item.id, item.max_stock);
      return;
    }
    setWarning('');
    onQty(item.id, newQty);
  };

  return (
    <div className="ci">
      <div className="ci-n">{index}</div>
      <div className="ci-body">
        <div className="ci-name" title={name}>{name}</div>
        <div className="ci-prow">
          <input
            type="number"
            className="ci-pinp"
            defaultValue={item.unit_price_ht}
            min={0}
            step={0.01}
            onBlur={e => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val !== item.unit_price_ht) onPrice(item.id, val);
              else e.target.value = String(item.unit_price_ht);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
          <span className="ci-punit">HT/{item.unit_symbol ?? 'قطعة'}</span>
          {item.discount_percentage > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--red)', marginRight: 'auto' }}>
              -{item.discount_percentage}%
            </span>
          )}
        </div>
        {warning && (
          <div style={{ fontSize: '10.5px', color: 'var(--red)', marginTop: 2 }}>
            <i className="ti ti-alert-triangle" /> {warning}
          </div>
        )}
      </div>

      {/* Qty controls */}
      <div className="qc2">
        <button className="qb2" onClick={() => requestQty(item.quantity - 1)}>−</button>
        <span className="qn2">{item.quantity}</span>
        <button className="qb2" onClick={() => requestQty(item.quantity + 1)}>+</button>
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
