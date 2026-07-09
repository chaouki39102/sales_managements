// ════════════════════════════════════════════════════════════════════════════
// pos/components/ProfessionalCart.tsx
//
// ✅ التحسينات عن النسخة السابقة:
//   1. زر "جديد" بجانب اختيار الزبون → يفتح CustomerSearchModal
//      (بحث فوري + إنشاء زبون مباشرة من POS)
//   2. onDiscountAmount مُمرَّر لـ CartRow (خصم ثابت بالمبلغ)
//   3. عرض رصيد الزبون بشكل أوضح مع لون تحذيري
//   4. شريط الخصومات على الفاتورة يقبل الآن % أو مبلغ ثابت
//
// ✅ تصحيحات هذه النسخة (تدقيق الأزرار):
//   5. حُذف زر 🔍 "بحث أو إنشاء زبون جديد" المكرر — كان يفتح نفس المودال
//      بالضبط الذي يفتحه النقر على صندوق الزبون نفسه (client-trigger-v2).
//      الآن يوجد مدخل واحد فقط لفتح CustomerSearchModal.
//   6. أُضيف زر "تراجع" (undo) بجانب زر المسح مباشرة — يعالج فجوة أمان
//      حقيقية: مسح السلة (بالزر أو بـ F12) كان عملية نهائية بدون أي طريقة
//      للاسترجاع. الآن onClear يحفظ نسخة تلقائياً (من POSPage) ويمكن
//      استرجاعها بضغطة واحدة، أو Ctrl+Z.
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CartItem, CartTotals, Party, PriceLevel } from '@/types';
import { formatDZD } from '../utils/calculations';
import { getEffectiveShortcut, useKbOverrides } from '../hooks/useKeyboardMap';
import CartRow from './CartRow';
import CustomerSearchModal from './CustomerSearchModal';

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
  onDiscountAmount:     (id: string, amount: number) => void;
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
  remainingToPay:       number;
  invoiceDiscountPct?:  number;
  onInvoiceDiscountChange?: (pct: number) => void;
  invoiceDiscountAmount?:   number;
  onUndoClear:          () => void;
  canUndoClear:         boolean;
  clientBalance?:       number;
  slug?:                string | null;
  cartRef?:             React.RefObject<HTMLDivElement>;
}

// كثافة عرض صفوف السلة — مفتاح حفظ محلي مستقل عن الشركة (تفضيل جهاز/كاشير)
const CART_DENSITY_KEY = 'pos-cart-density';
type CartDensity = 'comfortable' | 'compact';

export default function ProfessionalCart({
  items, totals, client, customers, priceLevels, selectedPriceLevelId,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
  onSetClient, onPriceLevelChange, onNoteChange,
  onHold, onSell, onClear, onHeld, totalTtcFinal, remainingToPay,
  invoiceDiscountPct = 0, onInvoiceDiscountChange, invoiceDiscountAmount = 0,
  onUndoClear, canUndoClear, clientBalance, slug, cartRef,
}: ProfessionalCartProps) {

  const [showNote,         setShowNote]         = useState(false);
  const [showCustModal,    setShowCustModal]     = useState(false);
  const [invDiscMode,      setInvDiscMode]       = useState<'pct' | 'amount'>('pct');
  const [invDiscAmtVal,    setInvDiscAmtVal]     = useState('');

  // ── كثافة عرض السلة (مريح / مضغوط) ────────────────────────────────────────
  // مضغوط: صف واحد بارتفاع ~34px لكل صنف بدل ~70-90px، فيظهر عدد أكبر
  // بكثير من المنتجات دفعة واحدة دون تمرير — مفيد جداً للفواتير الكبيرة.
  const [density, setDensity] = useState<CartDensity>(() => {
    try {
      const v = localStorage.getItem(CART_DENSITY_KEY);
      return v === 'compact' ? 'compact' : 'comfortable';
    } catch { return 'comfortable'; }
  });
  const toggleDensity = useCallback(() => {
    setDensity(prev => {
      const next: CartDensity = prev === 'compact' ? 'comfortable' : 'compact';
      try { localStorage.setItem(CART_DENSITY_KEY, next); } catch {}
      return next;
    });
  }, []);

  const isEmpty = !items.length;
  const overrides = useKbOverrides(slug ?? null);
  const kb = (action: string) => getEffectiveShortcut(slug ?? null, action) ?? '';

  const handleInvDiscAmount = useCallback((raw: string) => {
    setInvDiscAmtVal(raw);
    const n = parseFloat(raw) || 0;
    if (!onInvoiceDiscountChange || totals.total_ht <= 0) return;
    const pct = Math.min(100, (n / totals.total_ht) * 100);
    onInvoiceDiscountChange(pct);
  }, [onInvoiceDiscountChange, totals.total_ht]);

  return (
    <>
      <div className="pos-cart" id="pos-cart" ref={cartRef} tabIndex={-1}>

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
              <button
                className={`btn btn-xs density-toggle-btn ${density === 'compact' ? 'on' : ''}`}
                onClick={toggleDensity}
                title={density === 'compact' ? 'التبديل لعرض مريح (بطاقات أكبر)' : 'التبديل لعرض مضغوط (منتجات أكثر بدون تمرير)'}
                type="button"
              >
                <i className={`ti ${density === 'compact' ? 'ti-list-details' : 'ti-list'}`} />
              </button>
              <button className="btn btn-xs" onClick={onHeld} title={`الفواتير المعلقة (${kb('heldCarts')})`}>
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
                className="btn btn-xs btn-warn"
                onClick={onUndoClear}
                disabled={!canUndoClear}
                title={`تراجع عن آخر مسح — ${kb('undoClear')}`}
              >
                <i className="ti ti-arrow-back-up" />
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={onClear}
                disabled={isEmpty}
                title={`مسح السلة — ${kb('clearCart')}`}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>

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

          <div className="cart-client-v2">
            <div
              className={`client-trigger-v2 ${client ? 'has-client' : ''}`}
              onClick={() => setShowCustModal(true)}
              title="اختيار أو تغيير الزبون — بحث أو إنشاء زبون جديد"
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

              {client?.balance !== undefined && Number(client.balance) > 0 && (
                <span className="ctv2-debt" title={`رصيد الدين: ${formatDZD(Number(client.balance))}`}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 11 }} />
                  {formatDZD(Number(client.balance))}
                </span>
              )}

              <i className="ti ti-chevron-down ctv2-arrow" />
            </div>

            {client && (
              <div className="ctv2-actions">
                <button
                  className="btn btn-xs btn-r"
                  onClick={() => onSetClient(null)}
                  title="إلغاء اختيار الزبون"
                  type="button"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            )}
          </div>
        </div>

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
                onDiscountAmount={amount => onDiscountAmount(item.id, amount)}
                onPrice={price => onPrice(item.id, price)}
                onRemove={() => onRemove(item.id)}
                density={density}
              />
            ))
          )}
        </div>

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

            {onInvoiceDiscountChange && (
              <div className="ct-row ct-disc">
                <span>خصم الفاتورة</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
            {client !== null && clientBalance !== undefined && (
              <div className="ct-row" style={{ fontSize: 11.5, borderTop: '1px solid var(--b2)', paddingTop: 6, marginTop: 4 }}>
                <span>
                  <span style={{ opacity: 0.65 }}>رصيد {client.name} </span>
                  <span style={{ fontWeight: 600, color: clientBalance >= 0 ? '#ef4444' : '#22c55e' }}>
                    {formatDZD(clientBalance)}
                  </span>
                </span>
                <span>
                  <span style={{ opacity: 0.65 }}>الرصيد الجديد </span>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>
                    {formatDZD(clientBalance + totalTtcFinal)}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="cart-actions">
          <button
            className="btn btn-sm"
            onClick={onHold}
            disabled={isEmpty}
            title={`تعليق الفاتورة — ${kb('holdCart')}`}
          >
            <i className="ti ti-clock-pause" /> تعليق
          </button>
          <button
            className="cart-sell-btn"
            onClick={onSell}
            disabled={isEmpty}
            title={`دفع والإتمام — ${kb('payment')}`}
          >
            <i className="ti ti-circle-check" />
            <span>
              {isEmpty ? 'السلة فارغة' : (
                remainingToPay <= 0
                  ? 'مدفوعة ✓'
                  : `دفع — ${formatDZD(remainingToPay)}`
              )}
            </span>
            {kb('payment') && <kbd className="sell-kbd">{kb('payment')}</kbd>}
          </button>
        </div>
      </div>

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
