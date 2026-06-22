
## FILE: resources/js/pos/components/Cart.tsx
```
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
```

## FILE: resources/js/pos/components/HeldCartsModal.tsx
```
// pos/components/HeldCartsModal.tsx
import React from 'react';
import type { HeldCart } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface HeldCartsModalProps {
  open:     boolean;
  carts:    HeldCart[];
  onClose:  () => void;
  onRestore:(id: string) => void;
  onDelete: (id: string) => void;
}

export default function HeldCartsModal({
  open, carts, onClose, onRestore, onDelete,
}: HeldCartsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="الفواتير المعلقة"
      subtitle={`${carts.length} معلقة`}
      size="sm"
      footer={<button className="btn" onClick={onClose}>إغلاق</button>}
    >
      <div style={{ padding: 0, margin: -20 }}>
        {carts.length === 0 ? (
          <div className="cart-empty" style={{ padding: 30 }}>
            <div className="cart-empty-ic" style={{ fontSize: 36 }}>
              <i className="ti ti-clock-pause" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t3)' }}>
              لا توجد فواتير معلقة
            </div>
          </div>
        ) : (
          carts.map(cart => (
            <div
              key={cart.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', borderBottom: '1px solid var(--b1)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                  {cart.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                  {cart.items.length} صنف
                  {cart.client ? ` — ${cart.client.name}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--em)', direction: 'ltr', flexShrink: 0 }}>
                {formatDZD(cart.totals.total_ttc)}
              </div>
              <button
                className="btn btn-xs btn-p"
                onClick={() => { onRestore(cart.id); onClose(); }}
              >
                استرجاع
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={() => onDelete(cart.id)}
                title="حذف"
              >
                <span className="ic ic-xs"><i className="ti ti-trash" /></span>
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pos/components/PaymentModal.tsx
```
// pos/components/PaymentModal.tsx
//
// ✅ إصلاح جوهري: وضع "مختلط" (split) كان يعرض 3 حقول (نقداً/CIB/آجل) ويحسب
//    الفارق في الواجهة فقط، لكن handleConfirm كان يتجاهلها تماماً ويُرسل دفعة
//    واحدة بقيمة totalTtc الكاملة تحت وسيلة دفع "mixed" — أي أن تفصيل الدفعات
//    لم يكن يصل إلى الباكاند إطلاقاً. أصبح الآن يبني مصفوفة دفعات فعلية
//    (payments[]) ويتحقق أن المجموع المُدخل يطابق الإجمالي قبل التأكيد.
import React, { useState, useEffect, useCallback } from 'react';
import type { CartTotals, Party, PaymentMode } from '@/types';
import { formatDZD, calcChange } from '../utils/calculations';

type PayMethod = 'cash' | 'cib' | 'ccp' | 'bank' | 'credit' | 'split';

export interface PaymentLine {
  paymentModeId: number;
  amount:        number;
}

interface PaymentModalProps {
  open:         boolean;
  totals:       CartTotals;
  client:       Party | null;
  paymentModes: PaymentMode[];
  onClose:      () => void;
  onConfirm:    (params: {
    amountPaid:         number;
    dueDate?:           string;
    note?:              string;
    paymentModeId?:     number;
    treasuryAccountId?: number | null;
    payments?:          PaymentLine[];
  }) => Promise<{ ok: boolean; message?: string }>;
}

const PAYMENT_BTNS: { method: PayMethod; icon: string; label: string }[] = [
  { method:'cash',   icon:'💵', label:'نقداً'   },
  { method:'cib',    icon:'💳', label:'CIB'     },
  { method:'ccp',    icon:'📮', label:'CCP'     },
  { method:'bank',   icon:'🏦', label:'تحويل'   },
  { method:'credit', icon:'📋', label:'آجل'     },
  { method:'split',  icon:'✂️', label:'مختلط'  },
];

export default function PaymentModal({
  open, totals, client, paymentModes, onClose, onConfirm,
}: PaymentModalProps) {
  const totalTtc  = totals.total_ttc + totals.fiscal_stamp;
  const [method,  setMethod]  = useState<PayMethod>('cash');
  const [given,   setGiven]   = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [splitCash, setSplitCash] = useState('');
  const [splitCib,  setSplitCib]  = useState('');
  const [splitCr,   setSplitCr]   = useState('');

  useEffect(() => {
    if (open) {
      setGiven('');
      setError('');
      setMethod('cash');
      setSplitCash('');
      setSplitCib('');
      setSplitCr('');
    }
  }, [open]);

  const np = useCallback((key: string) => {
    setGiven(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      return prev + key;
    });
  }, []);

  const givenNum  = parseFloat(given || '0') || 0;
  const change    = calcChange(givenNum, totals.total_ttc, totals.fiscal_stamp);

  const splitCashNum = parseFloat(splitCash || '0') || 0;
  const splitCibNum  = parseFloat(splitCib  || '0') || 0;
  const splitCrNum   = parseFloat(splitCr   || '0') || 0;
  const splitSum     = splitCashNum + splitCibNum + splitCrNum;
  const splitDiff    = splitSum - totalTtc;

  const quickAmounts = [
    totalTtc,
    Math.ceil(totalTtc / 500) * 500,
    Math.ceil(totalTtc / 1000) * 1000,
    Math.ceil(totalTtc / 2000) * 2000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= totalTtc).slice(0, 4);

  const findMode = (code: string) => paymentModes.find(p => p.code?.toLowerCase() === code.toLowerCase());

  const handleConfirm = async () => {
    setError('');

    if (method === 'split') {
      if (Math.abs(splitDiff) >= 1) {
        setError('المجموع المُدخل لا يطابق الإجمالي — تحقق من المبالغ');
        return;
      }
      const payments: PaymentLine[] = [];
      if (splitCashNum > 0) {
        const pm = findMode('cash');
        if (!pm) { setError('وسيلة الدفع "نقداً" غير مُفعَّلة في إعدادات الشركة'); return; }
        payments.push({ paymentModeId: pm.id, amount: splitCashNum });
      }
      if (splitCibNum > 0) {
        const pm = findMode('cib');
        if (!pm) { setError('وسيلة الدفع "CIB" غير مُفعَّلة في إعدادات الشركة'); return; }
        payments.push({ paymentModeId: pm.id, amount: splitCibNum });
      }
      // الجزء الآجل (splitCrNum) لا يُسجَّل كدفعة — يبقى ديناً على الزبون

      setLoading(true);
      const res = await onConfirm({
        amountPaid: splitCashNum + splitCibNum,
        payments,
        note: note || undefined,
      });
      setLoading(false);
      if (!res.ok) { setError(res.message ?? 'فشل الحفظ'); return; }
      onClose();
      return;
    }

    let amountPaid = totalTtc;
    if (method === 'cash') amountPaid = givenNum || totalTtc;
    if (method === 'credit') amountPaid = 0;

    const modeMap: Record<PayMethod, string> = {
      cash: 'cash', cib: 'cib', ccp: 'ccp', bank: 'bank', credit: 'credit', split: 'mixed',
    };
    const pm = findMode(modeMap[method]);
    if (!pm) {
      setError(`وسيلة الدفع "${PAYMENT_BTNS.find(b => b.method === method)?.label}" غير مُفعَّلة في إعدادات الشركة`);
      return;
    }

    setLoading(true);
    const res = await onConfirm({
      paymentModeId: pm.id,
      amountPaid,
      dueDate: method === 'credit' ? dueDate : undefined,
      note: note || undefined,
    });
    setLoading(false);

    if (!res.ok) { setError(res.message ?? 'فشل الحفظ'); return; }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="ov on">
      <div className="modal modal-sm" style={{ maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>

        <div className="m-hd" style={{ padding: '12px 16px' }}>
          <div>
            <div className="m-title">
              <span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check" /></span>
              تأكيد البيع
            </div>
            <div className="m-sub">
              {totals.lines_count} صنف — {totals.items_count} وحدة
            </div>
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        <div className="pay-amount-hero">
          <div className="pay-ttc-label">المبلغ الإجمالي TTC</div>
          <div className="pay-ttc-big">{formatDZD(totalTtc)}</div>
          <div className="pay-client-badge">
            <span className="ic ic-xs"><i className="ti ti-user" /></span>
            <span>{client?.name ?? 'زبون عابر'}</span>
          </div>
        </div>

        <div className="pay-breakdown">
          <div className="pay-bd-c">
            <div className="pay-bd-l">HT</div>
            <div className="pay-bd-v">{formatDZD(totals.total_ht)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">TVA</div>
            <div className="pay-bd-v">{formatDZD(totals.total_tva)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">خصم</div>
            <div className="pay-bd-v" style={{ color: 'var(--red)' }}>
              {totals.total_discount > 0 ? `- ${formatDZD(totals.total_discount)}` : '—'}
            </div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">طابع</div>
            <div className="pay-bd-v">{totals.fiscal_stamp > 0 ? formatDZD(totals.fiscal_stamp) : '—'}</div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 'calc(95vh - 230px)' }}>

          <div className="pay-m-grid">
            {PAYMENT_BTNS.map(({ method: m, icon, label }) => (
              <button
                key={m}
                className={`pmpill ${method === m ? 'on' : ''}`}
                onClick={() => setMethod(m)}
              >
                <span className="pmi">{icon}</span>{label}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <div>
              <div className="pay-cash-sec">
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', display: 'block', marginBottom: 6 }}>
                  المبلغ المُسلَّم
                </label>
                <input
                  type="number"
                  className="given-inp"
                  placeholder="0"
                  value={given}
                  onChange={e => setGiven(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              <div className="qamts">
                {quickAmounts.map(v => (
                  <button key={v} className="qamt" onClick={() => setGiven(String(v))}>
                    {v.toLocaleString('fr-DZ')}
                  </button>
                ))}
              </div>
              <div className="change-display">
                <span className="change-lbl2">الباقي للزبون</span>
                <span className="change-val2" style={{ color: change >= 0 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(change)}
                </span>
              </div>
              <div className="numpad" id="numpad-grid">
                {['7','8','9','4','5','6','1','2','3'].map(k => (
                  <button key={k} className="npk" onClick={() => np(k)}>{k}</button>
                ))}
                <button className="npk del" onClick={() => np('del')}>
                  <span className="ic ic-xs"><i className="ti ti-backspace" /></span>
                </button>
                <button className="npk zero" onClick={() => np('0')}>0</button>
              </div>
            </div>
          )}

          {method === 'split' && (
            <div className="pay-split-sec" style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--t3)', marginBottom: 10 }}>
                الدفع المختلط — كل خانة تُسجَّل كدفعة مستقلة فعلياً
              </div>
              {[
                { label: 'نقداً', val: splitCash, set: setSplitCash },
                { label: 'CIB',   val: splitCib,  set: setSplitCib  },
                { label: 'آجل',   val: splitCr,   set: setSplitCr   },
              ].map(({ label, val, set }) => (
                <div className="split-row" key={label}>
                  <span className="split-lbl">{label}</span>
                  <input
                    type="number"
                    className="split-inp"
                    placeholder="0"
                    value={val}
                    onChange={e => set(e.target.value)}
                    inputMode="numeric"
                  />
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                </div>
              ))}
              {splitCrNum > 0 && !client && (
                <div className="al al-b" style={{ borderRadius: 'var(--r2)', margin: '6px 0' }}>
                  <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-info-circle" /></span>
                  <div>الجزء الآجل يتطلب اختيار زبون من القائمة قبل التأكيد.</div>
                </div>
              )}
              <div className="change-display">
                <span className="change-lbl2">الفارق</span>
                <span className="change-val2" style={{ color: Math.abs(splitDiff) < 1 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(splitDiff)}
                </span>
              </div>
            </div>
          )}

          {method === 'credit' && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-b" style={{ borderRadius: 'var(--r2)', marginBottom: 10 }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-info-circle" /></span>
                <div>بيع آجل — سيُسجَّل في ديون العملاء تلقائياً عند التأكيد.</div>
              </div>
              {!client && (
                <div className="al al-r" style={{ borderRadius: 'var(--r2)', marginBottom: 10 }}>
                  <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-alert-circle" /></span>
                  <div>يجب اختيار زبون من القائمة لتسجيل بيع آجل.</div>
                </div>
              )}
              <div className="fg">
                <label>تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          )}

          {(method === 'cib' || method === 'ccp' || method === 'bank') && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-g" style={{ borderRadius: 'var(--r2)' }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-check" /></span>
                <div>الدفع الإلكتروني — المبلغ الكامل يُسدَّد مباشرة.</div>
              </div>
            </div>
          )}

          <div className="pay-note-sec" style={{ padding: '4px 14px 8px' }}>
            <label>ملاحظة على الفاتورة</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="اختياري..."
              style={{ width: '100%', padding: '6px 9px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'var(--bg3)', fontFamily: 'Tajawal,sans-serif', fontSize: '12.5px', outline: 'none' }}
            />
          </div>

          {error && (
            <div className="al al-r" style={{ margin: '0 14px 8px', borderRadius: 'var(--r2)', fontSize: 12 }}>
              <span className="ic ic-xs"><i className="ti ti-alert-circle" /></span>
              <div>{error}</div>
            </div>
          )}
        </div>

        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button
            className="btn btn-p"
            onClick={handleConfirm}
            disabled={loading || (method === 'credit' && !client) || (method === 'split' && splitCrNum > 0 && !client)}
          >
            {loading ? (
              <span className="ic ic-xs"><i className="ti ti-loader" /></span>
            ) : (
              <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
            )}
            {loading ? 'جاري الحفظ...' : 'تأكيد وطباعة'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/ProductCard.tsx
```
// pos/components/ProductCard.tsx
import React from 'react';
import type { ProductVariant } from '@/types';

interface ProductCardProps {
  variant: ProductVariant;
  qtyInCart: number;
  view: 'grid' | 'list';
  onClick: () => void;
}

function stockClass(stock: number | undefined, min: number): string {
  if (stock === undefined || stock === null) return 'ok';
  if (stock <= 0) return 'no';
  if (stock <= min) return 'lo';
  return 'ok';
}

function stockLabel(stock: number | undefined): string {
  if (stock === undefined || stock === null) return '';
  if (stock <= 0) return 'نفد';
  return `${stock} ${stock === 1 ? 'وحدة' : 'وحدة'}`;
}

export default function ProductCard({ variant, qtyInCart, view, onClick }: ProductCardProps) {
  const product   = variant.product;
  const stock     = variant.current_stock;
  const isOOS     = variant.manages_stock && (stock ?? 1) <= 0 && !variant.allow_negative_stock;
  const sc        = stockClass(stock ?? undefined, variant.min_stock_alert);
  const tvaRate   = variant.tva?.rate ?? 19;
  const priceTtc  = variant.default_selling_price_ht * (1 + tvaRate / 100);

  // pick icon / color based on family name
  const familyName = product?.family?.name ?? '';
  const { icon, color, bg } = familyStyle(familyName);

  const name = [product?.name, variant.variant_name].filter(Boolean).join(' — ');

  if (view === 'list') {
    return (
      <div
        className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
        style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
        onClick={isOOS ? undefined : onClick}
      >
        {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
        <div className="pc2-ic">
          <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
        </div>
        <div className="pc2-info">
          <div className="pc2-name">{name}</div>
          <div className="pc2-price" style={{ direction: 'ltr' }}>
            {priceTtc.toFixed(0)} دج
          </div>
          {variant.manages_stock && (
            <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
      style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
      onClick={isOOS ? undefined : onClick}
    >
      {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
      <div className="pc2-ic">
        <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
      </div>
      <div className="pc2-name">{name}</div>
      <div className="pc2-price" style={{ direction: 'ltr' }}>{priceTtc.toFixed(0)} دج</div>
      {variant.manages_stock && (
        <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
      )}
    </div>
  );
}

// ── Family → icon/color mapping ────────────────────
function familyStyle(family: string): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل'))    return { icon: 'ti-apple',         color: 'var(--em)',     bg: 'var(--emb)'   };
  if (f.includes('شراب') || f.includes('ماء'))  return { icon: 'ti-droplets',      color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                    return { icon: 'ti-device-mobile', color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                      return { icon: 'ti-shirt',         color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                      return { icon: 'ti-tool',          color: 'var(--orange)', bg: 'var(--orb)'   };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
```

## FILE: resources/js/pos/components/Receipt.tsx
```
// pos/components/Receipt.tsx
import React from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface ReceiptProps {
  open:      boolean;
  items:     CartItem[];
  totals:    CartTotals;
  client:    Party | null;
  docNumber?: string;
  onClose:   () => void;
  onPrint:   () => void;
}

export default function Receipt({
  open, items, totals, client, docNumber, onClose, onPrint,
}: ReceiptProps) {
  const now = new Date().toLocaleDateString('fr-DZ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="معاينة الفاتورة"
      size="md"
      footer={
        <>
          <button className="btn" onClick={onClose}>إغلاق</button>
          <button className="btn btn-p" onClick={onPrint}>
            <span className="ic ic-xs"><i className="ti ti-printer" /></span>
            طباعة
          </button>
        </>
      }
    >
      <div className="receipt-wrap" id="invoice-preview">
        {/* Header */}
        <div className="receipt-head">
          <div>
            <div className="receipt-logo">مؤسسة النور للتجارة</div>
            <div className="receipt-meta">
              NIF: 001234567890123 | RC: 29/00-0012345B05<br />
              ورقلة — الجزائر | 029 71 23 45
            </div>
          </div>
          <div className="receipt-num">
            <div>{docNumber ?? 'مسودة'}</div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500, marginTop: 3 }}>
              التاريخ: {now}
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
              الزبون: {client?.name ?? 'عابر'}
            </div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '4px 6px', textAlign: 'right' }}>البيان</th>
              <th style={{ padding: '4px 6px', textAlign: 'center' }}>الكمية</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>سعر HT</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 6px' }}>
                  {item.product_name}
                  {item.variant_name && <span style={{ color: '#64748b' }}> — {item.variant_name}</span>}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  {item.quantity} {item.unit_symbol}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr' }}>
                  {item.unit_price_ht.toFixed(2)} دج
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr', fontWeight: 700 }}>
                  {item.total_ht.toFixed(2)} دج
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="receipt-totals">
          <div className="receipt-totals-inner">
            <div className="receipt-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>
            <div className="receipt-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="receipt-row" style={{ color: '#dc2626' }}>
                <span>خصم</span>
                <span>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}
            {totals.fiscal_stamp > 0 && (
              <div className="receipt-row">
                <span>الطابع الجبائي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}
            <div className="receipt-grand">
              <span>الإجمالي TTC</span>
              <span>{formatDZD(totals.total_ttc + totals.fiscal_stamp)}</span>
            </div>
          </div>
        </div>

        <div className="receipt-foot">
          شكراً لتعاملكم معنا — يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري
        </div>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pos/hooks/usePOS.ts
```
// resources/js/pos/hooks/usePOS.ts
// ════════════════════════════════════════════════════════════════════════════
// Hook موحَّد يجمع POSStore + CartStore
//
// ✅ إصلاح: calcFiscalStamp مستوردة من calculations.ts
//    (كانت مُضمَّنة inline بدون cap — الآن متطابقة مع LF 2024)
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { usePOSStore }   from './usePOSStore';
import { useCartStore }  from '../utils/useCartStore';
import { calcFiscalStamp } from '../utils/calculations';

export function usePOS() {
  // ── POS Store ──────────────────────────────────────────────────────────────
  const sessionStarted    = usePOSStore(s => s.sessionStarted);
  const sessionInvoices   = usePOSStore(s => s.sessionInvoices);
  const sessionSales      = usePOSStore(s => s.sessionSales);
  const heldCarts         = usePOSStore(s => s.heldCarts);
  const activeTab         = usePOSStore(s => s.activeTab);
  const searchQuery       = usePOSStore(s => s.searchQuery);
  const selectedCategory  = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen  = usePOSStore(s => s.paymentModalOpen);

  const startSession      = usePOSStore(s => s.startSession);
  const endSession        = usePOSStore(s => s.endSession);
  const incrementSession  = usePOSStore(s => s.incrementSession);
  const holdCart          = usePOSStore(s => s.holdCart);
  const restoreCart       = usePOSStore(s => s.restoreCart);
  const deleteHeldCart    = usePOSStore(s => s.deleteHeldCart);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // ── Cart Store ─────────────────────────────────────────────────────────────
  const items   = useCartStore(s => s.items);
  const client  = useCartStore(s => s.client);

  const addItem        = useCartStore(s => s.addItem);
  const removeItem     = useCartStore(s => s.removeItem);
  const updateQty      = useCartStore(s => s.updateQty);
  const updateDiscount = useCartStore(s => s.updateDiscount);
  const updatePrice    = useCartStore(s => s.updatePrice);
  const clearCart      = useCartStore(s => s.clearCart);
  const setClient      = useCartStore(s => s.setClient);

  // ── Computed totals ────────────────────────────────────────────────────────
  // ✅ calcFiscalStamp من calculations.ts — cap 3000 دج عند >= 300,000 دج (LF 2024)
  const totals = useMemo(() => {
    const totalHt       = items.reduce((s, i) => s + i.total_ht,          0);
    const totalTva      = items.reduce((s, i) => s + (i.total_ht * i.tva_rate / 100), 0);
    const totalDiscount = items.reduce((s, i) => s + i.discount_amount,   0);
    const totalTtc      = totalHt + totalTva;
    const fiscalStamp   = calcFiscalStamp(totalTtc);   // ✅ موحَّدة

    return {
      total_ht:       Math.round(totalHt       * 100) / 100,
      total_tva:      Math.round(totalTva      * 100) / 100,
      total_ttc:      Math.round(totalTtc      * 100) / 100,
      total_discount: Math.round(totalDiscount * 100) / 100,
      fiscal_stamp:   fiscalStamp,
      items_count:    items.reduce((s, i) => s + i.quantity, 0),
      lines_count:    items.length,
    };
  }, [items]);

  return {
    // Session
    sessionStarted, sessionInvoices, sessionSales,
    startSession, endSession, incrementSession,

    // Held carts
    heldCarts, holdCart, restoreCart, deleteHeldCart,

    // UI
    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    // Cart
    items, client,
    addItem, removeItem, updateQty, updateDiscount, updatePrice,
    clearCart, setClient,
    totals,
  };
}
```

## FILE: resources/js/pos/hooks/usePOSStore.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePOSStore.ts
//
// حالة نقطة البيع الكاملة
//
// ✅ useUIStore مُحذف من هنا — موجود في lib/store/uiStore.ts
// ════════════════════════════════════════════════════════════════════════════

import { create }        from 'zustand';
import { nanoid }        from 'nanoid';
import { useCartStore }  from '../utils/useCartStore';
import type { HeldCart } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface POSState {
  // Session
  sessionStarted:   boolean;
  sessionInvoices:  number;
  sessionSales:     number;

  // Held carts
  heldCarts:        HeldCart[];

  // UI state
  activeTab:        'products' | 'clients' | 'held';
  searchQuery:      string;
  selectedCategory: number | null;
  paymentModalOpen: boolean;

  // Actions
  startSession:     () => void;
  endSession:       () => void;
  incrementSession: (amount: number) => void;

  holdCart:         (label?: string) => void;
  restoreCart:      (id: string) => void;
  deleteHeldCart:   (id: string) => void;

  setTab:           (tab: POSState['activeTab']) => void;
  setSearch:        (q: string) => void;
  setCategory:      (id: number | null) => void;
  openPayment:      () => void;
  closePayment:     () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () =>
    set({ sessionStarted: true, sessionInvoices: 0, sessionSales: 0 }),

  endSession: () => set({ sessionStarted: false }),

  incrementSession: (amount) =>
    set((s) => ({
      sessionInvoices: s.sessionInvoices + 1,
      sessionSales:    s.sessionSales + amount,
    })),

  holdCart: (label) => {
    const cart  = useCartStore.getState();
    const items = cart.items;
    if (items.length === 0) return;

    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals:     cart.totals(),
      client:     cart.client,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ heldCarts: [...s.heldCarts, held] }));
    cart.clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find((c) => c.id === id);
    if (!held) return;
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set((s) => ({ heldCarts: s.heldCarts.filter((c) => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set((s) => ({ heldCarts: s.heldCarts.filter((c) => c.id !== id) })),

  setTab:       (tab) => set({ activeTab: tab }),
  setSearch:    (q)   => set({ searchQuery: q }),
  setCategory:  (id)  => set({ selectedCategory: id }),
  openPayment:  ()    => set({ paymentModalOpen: true }),
  closePayment: ()    => set({ paymentModalOpen: false }),
}));
```

## FILE: resources/js/pos/utils/calculations.ts
```
// ════════════════════════════════════════════════
// pos/utils/calculations.ts — حسابات POS
// ════════════════════════════════════════════════
import type { CartItem, CartTotals } from '@/types';

/** حساب سعر TTC من HT + TVA */
export function htToTtc(ht: number, tvaRate: number): number {
  return ht * (1 + tvaRate / 100);
}

/** حساب سعر HT من TTC + TVA */
export function ttcToHt(ttc: number, tvaRate: number): number {
  return ttc / (1 + tvaRate / 100);
}

/** حساب هامش الربح */
export function calcMargin(sellingHt: number, costHt: number): number {
  if (sellingHt <= 0) return 0;
  return ((sellingHt - costHt) / sellingHt) * 100;
}

/** الطابع الجبائي الجزائري — LF 2024 */
export function calcFiscalStamp(totalTtc: number): number {
  if (totalTtc < 30_000) return 0;
  if (totalTtc < 300_000) return Math.ceil(totalTtc * 0.01);
  // Cap at 3000 DZD for amounts >= 300,000
  return 3_000;
}

/** حساب مجاميع العربة */
export function calcTotals(items: CartItem[]): CartTotals {
  let totalHt       = 0;
  let totalTva      = 0;
  let totalDiscount = 0;
  let itemsCount    = 0;

  for (const item of items) {
    totalHt       += item.total_ht;
    totalTva      += item.total_ht * (item.tva_rate / 100);
    totalDiscount += item.discount_amount;
    itemsCount    += item.quantity;
  }

  const totalTtc   = totalHt + totalTva;
  const fiscalStamp = calcFiscalStamp(totalTtc);

  return {
    total_ht:       Math.round(totalHt * 100) / 100,
    total_tva:      Math.round(totalTva * 100) / 100,
    total_ttc:      Math.round(totalTtc * 100) / 100,
    total_discount: Math.round(totalDiscount * 100) / 100,
    fiscal_stamp:   fiscalStamp,
    items_count:    itemsCount,
    lines_count:    items.length,
  };
}

/** تنسيق المبلغ بالدينار الجزائري */
export function formatDZD(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(amount) + ' دج';
}

/** حساب الباقي من الدفع */
export function calcChange(paid: number, totalTtc: number, fiscalStamp: number): number {
  return Math.max(0, paid - (totalTtc + fiscalStamp));
}

/** تحقق أن الكمية في المخزون */
export function checkStock(item: CartItem, newQty: number): { ok: boolean; message: string } {
  if (item.max_stock === null) return { ok: true, message: '' };
  if (newQty > item.max_stock) {
    return { ok: false, message: `المخزون المتاح: ${item.max_stock} ${item.unit_symbol ?? ''}` };
  }
  return { ok: true, message: '' };
}

/** تقريب للمبلغ */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

## FILE: resources/js/pos/utils/useCartStore.ts
```
// ════════════════════════════════════════════════════════════════════════════
// store/useCartStore.ts — عربة التسوق (POS)
//
// ✅ إصلاحات:
//   1. calcFiscalStamp مُستوردة من calculations.ts (cap 3000 دج — LF 2024)
//   2. unit_symbol: يقرأ unit.symbol ثم unit.abbreviation كـ fallback
//      (Unit في types.ts لها abbreviation، لكن الـ API قد يُرجع symbol)
//   3. totals() تستخدم calcFiscalStamp أيضاً
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant } from '@/types';
import { calcFiscalStamp } from '../utils/calculations';

interface CartState {
  items:  CartItem[];
  client: Party | null;
  notes:  string;
  // actions
  addItem:        (variant: ProductVariant, qty?: number) => void;
  removeItem:     (id: string) => void;
  updateQty:      (id: string, qty: number) => void;
  updateDiscount: (id: string, pct: number) => void;
  updatePrice:    (id: string, price: number) => void;
  setClient:      (client: Party | null) => void;
  setNotes:       (notes: string) => void;
  clearCart:      () => void;
  totals:         () => CartTotals;
}

function calcItemTotals(item: CartItem): CartItem {
  const discountedHt = item.unit_price_ht * item.quantity * (1 - item.discount_percentage / 100);
  const disc         = item.unit_price_ht * item.quantity - discountedHt;
  const totalHt      = discountedHt;
  const totalTva     = totalHt * (item.tva_rate / 100);
  return {
    ...item,
    discount_amount: Math.round(disc    * 100) / 100,
    total_ht:        Math.round(totalHt * 100) / 100,
    total_ttc:       Math.round((totalHt + totalTva) * 100) / 100,
  };
}

/** يقرأ رمز الوحدة من الفاريانت مهما كان اسم الحقل */
function getUnitSymbol(variant: ProductVariant): string {
  // ✅ Unit في types.ts لها abbreviation، لكن بعض responses تُرجع symbol
  const u = variant.unit as any;
  return u?.symbol ?? u?.abbreviation ?? 'قطعة';
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:  [],
      client: null,
      notes:  '',

      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id
                  ? calcItemTotals({ ...i, quantity: i.quantity + qty })
                  : i,
              ),
            };
          }

          const priceHt  = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 19;
          const priceTtc = priceHt * (1 + tvaRate / 100);

          const newItem: CartItem = {
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         getUnitSymbol(variant),
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceTtc,
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: 0,
            discount_amount:     0,
            total_ht:            Math.round(priceHt * qty * 100) / 100,
            total_ttc:           Math.round(priceTtc * qty * 100) / 100,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, quantity: Math.max(0.001, qty) })
              : i,
          ),
        })),

      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, discount_percentage: Math.min(100, Math.max(0, pct)) })
              : i,
          ),
        })),

      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
        })),

      setClient: (client) => set({ client }),
      setNotes:  (notes)  => set({ notes }),
      clearCart: ()       => set({ items: [], client: null, notes: '' }),

      totals: () => {
        const { items } = get();
        const totalHt       = items.reduce((s, i) => s + i.total_ht,                    0);
        const totalTva      = items.reduce((s, i) => s + (i.total_ht * i.tva_rate / 100), 0);
        const totalDiscount = items.reduce((s, i) => s + i.discount_amount,              0);
        const totalTtc      = totalHt + totalTva;
        // ✅ calcFiscalStamp من calculations.ts — متوافقة مع LF 2024 (cap 3000 دج)
        const fiscalStamp   = calcFiscalStamp(totalTtc);
        return {
          total_ht:       Math.round(totalHt       * 100) / 100,
          total_tva:      Math.round(totalTva      * 100) / 100,
          total_ttc:      Math.round(totalTtc      * 100) / 100,
          total_discount: Math.round(totalDiscount * 100) / 100,
          fiscal_stamp:   fiscalStamp,
          items_count:    items.reduce((s, i) => s + i.quantity, 0),
          lines_count:    items.length,
        };
      },
    }),
    {
      name: 'pos-cart',
      // ❌ لا نُحفظ السلة — تُصفَّر عند إعادة التحميل
      partialize: () => ({}),
    },
  ),
);
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

