// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalCart.tsx
//
// ✅ التحسينات عن النسخة السابقة:
//   1. زر "جديد" بجانب اختيار الزبون → يفتح CustomerSearchModal
//      (بحث فوري + إنشاء زبون مباشرة من POS)
//   2. onDiscountAmount مُمرَّر لـ CartRow (خصم ثابت بالمبلغ)
//   3. عرض رصيد الزبون بشكل أوضح مع لون تحذيري
//   4. شريط الخصومات على الفاتورة يقبل الآن % أو مبلغ ثابت
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CartItem, CartTotals, Party, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import CartRow from './CartRow';
import CustomerSearchModal from './CustomerSearchModal';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfessionalCartProps {
  items:                CartItem[];
  totals:               CartTotals;
  client:               Party | null;
  customers:            Party[];
  priceLevels:          PriceLevel[];
  selectedPriceLevelId: number | null;
  note:                 string;
  selectedItemId:       string | null;
  onSelectItem:         (id: string | null) => void;
  onQty:                (id: string, qty: number) => void;
  onDiscount:           (id: string, pct: number) => void;
  onDiscountAmount:     (id: string, amount: number) => void;   // ✅ جديد
  onPrice:              (id: string, price: number) => void;
  onRemove:             (id: string) => void;
  onSetClient:          (c: Party | null) => void;
  onPriceLevelChange:   (plId: number | null) => void;
  onNoteChange:         (n: string) => void;
  onHold:               () => void;
  onSell:               () => void;
  onClear:              () => void;
  onHeld:               () => void;
  totalTtcFinal:        number;
  invoiceDiscountPct?:  number;
  onInvoiceDiscountChange?: (pct: number) => void;
  invoiceDiscountAmount?:   number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfessionalCart({
  items, totals, client, customers, priceLevels, selectedPriceLevelId,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
  onSetClient, onPriceLevelChange, onNoteChange,
  onHold, onSell, onClear, onHeld, totalTtcFinal,
  invoiceDiscountPct = 0, onInvoiceDiscountChange, invoiceDiscountAmount = 0,
}: ProfessionalCartProps) {

  const [showNote,         setShowNote]         = useState(false);
  const [showCustModal,    setShowCustModal]     = useState(false);   // ✅ مودال البحث
  const [invDiscMode,      setInvDiscMode]       = useState<'pct' | 'amount'>('pct'); // ✅
  const [invDiscAmtVal,    setInvDiscAmtVal]     = useState('');

  const isEmpty = !items.length;

  // ── خصم الفاتورة بالمبلغ ──────────────────────────────────────────────────
  const handleInvDiscAmount = useCallback((raw: string) => {
    setInvDiscAmtVal(raw);
    const n = parseFloat(raw) || 0;
    if (!onInvoiceDiscountChange || totals.total_ht <= 0) return;
    // نحوّل المبلغ لنسبة (مستوى total_ht قبل الخصم)
    const pct = Math.min(100, (n / totals.total_ht) * 100);
    onInvoiceDiscountChange(pct);
  }, [onInvoiceDiscountChange, totals.total_ht]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="pos-cart" id="pos-cart">

        {/* ── Header ── */}
        <div className="cart-top">
          <div className="cart-top-row">
            <div className="cart-ttl">
              <i className="ti ti-shopping-cart" style={{ fontSize: 15 }} />
              فاتورة البيع
              <span className={`cart-pill ${totals.items_count > 0 ? 'on' : ''}`}>
                {totals.items_count}
              </span>
            </div>
            <div className="cart-acts2">
              <button className="btn btn-xs" onClick={onHeld} title="الفواتير المعلقة (F7)">
                <i className="ti ti-clock-pause" />
              </button>
              <button
                className={`btn btn-xs ${note ? 'btn-p' : ''}`}
                onClick={() => setShowNote(s => !s)}
                title="ملاحظة على الفاتورة"
              >
                <i className="ti ti-notes" />
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={onClear}
                disabled={isEmpty}
                title="مسح السلة — F12"
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>

          {/* ملاحظة */}
          {showNote && (
            <div className="cart-note-wrap">
              <input
                value={note}
                onChange={e => onNoteChange(e.target.value)}
                placeholder="ملاحظة تظهر على الفاتورة..."
                autoFocus
                className="cart-note-inp"
              />
            </div>
          )}

          {/* مستويات السعر */}
          {priceLevels.length > 0 && (
            <div className="cart-modes2">
              <button
                className={`cmode ${selectedPriceLevelId === null ? 'on' : ''}`}
                onClick={() => onPriceLevelChange(null)}
                title="السعر الافتراضي"
              >
                <i className="ti ti-tag" /> عادي
              </button>
              {priceLevels.map(pl => (
                <button
                  key={pl.id}
                  className={`cmode ${selectedPriceLevelId === pl.id ? 'on' : ''}`}
                  onClick={() => onPriceLevelChange(pl.id)}
                  title={pl.discount_percent ? `خصم ${pl.discount_percent}%` : undefined}
                >
                  <i className="ti ti-tag" />
                  {pl.name}
                  {pl.discount_percent
                    ? <span className="cmode-disc">-{pl.discount_percent}%</span>
                    : null
                  }
                </button>
              ))}
            </div>
          )}

          {/* ── قسم الزبون المُحسَّن ── */}
          <div className="cart-client-v2">
            {/* trigger */}
            <div
              className={`client-trigger-v2 ${client ? 'has-client' : ''}`}
              onClick={() => setShowCustModal(true)}
              title="اختيار أو تغيير الزبون"
            >
              <div className="ctv2-av">
                {client
                  ? <span>{(client.name?.[0] ?? '?').toUpperCase()}</span>
                  : <i className="ti ti-user" />
                }
              </div>
              <div className="ctv2-info">
                <div className="ctv2-name">
                  {client ? client.name : 'زبون عابر'}
                </div>
                {client?.phone && (
                  <div className="ctv2-meta">
                    <i className="ti ti-phone" style={{ fontSize: 10 }} /> {client.phone}
                  </div>
                )}
              </div>

              {/* رصيد الدين */}
              {client?.balance !== undefined && Number(client.balance) > 0 && (
                <span className="ctv2-debt" title={`رصيد الدين: ${formatDZD(Number(client.balance))}`}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 11 }} />
                  {formatDZD(Number(client.balance))}
                </span>
              )}

              <i className="ti ti-chevron-down ctv2-arrow" />
            </div>

            {/* أزرار سريعة */}
            <div className="ctv2-actions">
              <button
                className="btn btn-xs btn-p"
                onClick={() => setShowCustModal(true)}
                title="بحث أو إنشاء زبون جديد"
                type="button"
              >
                <i className="ti ti-user-search" />
              </button>
              {client && (
                <button
                  className="btn btn-xs btn-r"
                  onClick={() => onSetClient(null)}
                  title="إلغاء اختيار الزبون"
                  type="button"
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── أصناف السلة ── */}
        <div className="cart-items">
          {isEmpty ? (
            <div className="cart-empty">
              <div className="ce-ico"><i className="ti ti-shopping-cart-off" /></div>
              <div className="ce-ttl">السلة فارغة</div>
              <div className="ce-sub">ابحث عن منتج أو امسح الباركود</div>
            </div>
          ) : (
            items.map((item, idx) => (
              <CartRow
                key={item.id}
                item={item}
                idx={idx}
                isSelected={selectedItemId === item.id}
                onSelect={() => onSelectItem(item.id)}
                onQty={qty => onQty(item.id, qty)}
                onDiscount={pct => onDiscount(item.id, pct)}
                onDiscountAmount={amount => onDiscountAmount(item.id, amount)}  // ✅
                onPrice={price => onPrice(item.id, price)}
                onRemove={() => onRemove(item.id)}
              />
            ))
          )}
        </div>

        {/* ── الإجماليات ── */}
        {!isEmpty && (
          <div className="cart-totals">
            <div className="ct-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>

            {totals.total_discount > 0 && (
              <div className="ct-row ct-disc">
                <span>إجمالي الخصومات</span>
                <span style={{ color: 'var(--red)' }}>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}

            <div className="ct-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>

            {/* ── خصم الفاتورة % أو مبلغ ── */}
            {onInvoiceDiscountChange && (
              <div className="ct-row ct-disc">
                <span>خصم الفاتورة</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* تبديل الوضع */}
                  <button
                    className={`cr-disc-mode-btn ${invDiscMode === 'pct' ? 'on' : ''}`}
                    onClick={() => setInvDiscMode('pct')}
                    type="button"
                    style={{ fontSize: 10, padding: '2px 5px' }}
                  >%</button>
                  <button
                    className={`cr-disc-mode-btn ${invDiscMode === 'amount' ? 'on' : ''}`}
                    onClick={() => setInvDiscMode('amount')}
                    type="button"
                    style={{ fontSize: 10, padding: '2px 5px' }}
                  >دج</button>

                  {invDiscMode === 'pct' ? (
                    <>
                      <input
                        type="number"
                        className="ct-disc-inp"
                        value={invoiceDiscountPct || ''}
                        onChange={e => onInvoiceDiscountChange(
                          Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        )}
                        min={0} max={100} step={1}
                        placeholder="0"
                        style={{ width: 50 }}
                      />
                      <span style={{ fontSize: 11 }}>%</span>
                      {invoiceDiscountAmount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>
                          -{formatDZD(invoiceDiscountAmount)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        className="ct-disc-inp"
                        value={invDiscAmtVal}
                        onChange={e => handleInvDiscAmount(e.target.value)}
                        min={0}
                        placeholder="0"
                        style={{ width: 70 }}
                      />
                      <span style={{ fontSize: 11 }}>دج</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {totals.fiscal_stamp > 0 && (
              <div className="ct-row">
                <span>طابع مالي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}

            <div className="ct-row ct-grand">
              <span>الإجمالي TTC</span>
              <strong className="grand-amount">{formatDZD(totalTtcFinal)}</strong>
            </div>
          </div>
        )}

        {/* ── أزرار الإجراءات ── */}
        <div className="cart-actions">
          <button
            className="btn btn-sm"
            onClick={onHold}
            disabled={isEmpty}
            title="تعليق الفاتورة — F5"
          >
            <i className="ti ti-clock-pause" /> تعليق
          </button>
          <button
            className="cart-sell-btn"
            onClick={onSell}
            disabled={isEmpty}
            title="دفع والإتمام — F4"
          >
            <i className="ti ti-circle-check" />
            <span>
              {isEmpty ? 'السلة فارغة' : `دفع — ${formatDZD(totalTtcFinal)}`}
            </span>
            <kbd className="sell-kbd">F4</kbd>
          </button>
        </div>
      </div>

      {/* ── CustomerSearchModal ── */}
      {showCustModal && (
        <CustomerSearchModal
          currentClient={client}
          onSelect={c => {
            onSetClient(c);
            setShowCustModal(false);
          }}
          onClose={() => setShowCustModal(false)}
        />
      )}
    </>
  );
}
