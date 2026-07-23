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
import React, { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import { getEffectiveShortcut } from '../hooks/useKeyboardMap';
import CartRow from './CartRow';
import CustomerSearchModal from './CustomerSearchModal';

interface ProfessionalCartProps {
  items:                CartItem[];
  totals:               CartTotals;
  client:               Party | null;
  note:                 string;
  selectedItemId:       string | null;
  onSelectItem:         (id: string | null) => void;
  onQty:                (id: string, qty: number) => void;
  onDiscount:           (id: string, pct: number) => void;
  onDiscountAmount:     (id: string, amount: number) => void;
  onPrice:              (id: string, price: number) => void;
  onRemove:             (id: string) => void;
  onSetClient:          (c: Party | null) => void;
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
  undoClearSecondsLeft?: number;
  clientBalance?:       number;
  slug?:                string | null;
  cartRef?:             React.RefObject<HTMLDivElement>;
  onClientModalClose?:  () => void;
}

/** واجهة برمجية للتحكم بالسلة من المكوّن الأب (POSPage) — بديل عن querySelectorAll */
export interface ProfessionalCartHandle {
  /** تمرير السلة إلى موقع صنف معيّن وتركيزه */
  scrollToItemId: (itemId: string) => void;
  /** فتح مودال اختيار الزبون */
  openCustomerModal: () => void;
}

// كثافة عرض صفوف السلة — مفتاح حفظ محلي مستقل عن الشركة (تفضيل جهاز/كاشير)
const CART_DENSITY_KEY = 'pos-cart-density';
type CartDensity = 'comfortable' | 'compact';

const CART_ZOOM_KEY = 'pos-cart-zoom';
type CartZoom = 0.75 | 0.875 | 1 | 1.125 | 1.25;

const ProfessionalCart = forwardRef<ProfessionalCartHandle, ProfessionalCartProps>(function ProfessionalCart({
  items, totals, client,
  note, selectedItemId, onSelectItem,
  onQty, onDiscount, onDiscountAmount, onPrice, onRemove,
  onSetClient, onNoteChange,
  onHold, onSell, onClear, onHeld, totalTtcFinal, remainingToPay,
  invoiceDiscountPct = 0, onInvoiceDiscountChange, invoiceDiscountAmount = 0,
  onUndoClear, canUndoClear, undoClearSecondsLeft = 0, clientBalance, slug, cartRef, onClientModalClose,
}, ref) {

  const [showNote,         setShowNote]         = useState(false);
  const [showCustModal,    setShowCustModal]     = useState(false);
  const [invDiscMode,      setInvDiscMode]       = useState<'pct' | 'amount'>('amount');
  const [invDiscAmtVal,    setInvDiscAmtVal]     = useState('');

  useEffect(() => {
    if (!invoiceDiscountPct || invoiceDiscountPct <= 0) setInvDiscAmtVal('');
  }, [invoiceDiscountPct]);

  // ── طيّ تفاصيل الحساب ─────────────────────────────────────────────────────
  // افتراضياً مطوي (يظهر فقط سطر الإجمالي TTC) لتحرير مساحة رأسية دائمة
  // لصالح قائمة الأصناف — التفاصيل (HT/TVA/الخصومات/رصيد الزبون) تظهر
  // فقط عند الحاجة الفعلية (تعديل خصم الفاتورة، أو مراجعة قبل الدفع).
  // الحالة محفوظة في localStorage لاستمرار التفضيل بين الجلسات.
  const [showTotalsDetails, setShowTotalsDetails] = useState(() => {
    try { return localStorage.getItem('pos-cart-totals-open') === '1'; }
    catch { return false; }
  });
  const toggleTotals = useCallback(() => {
    setShowTotalsDetails(prev => {
      const next = !prev;
      try { localStorage.setItem('pos-cart-totals-open', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // ── كثافة عرض السلة (مريح / مضغوط) ────────────────────────────────────────
  // مضغوط: صف واحد بارتفاع ~34px لكل صنف بدل ~70-90px، فيظهر عدد أكبر
  // بكثير من المنتجات دفعة واحدة دون تمرير — مفيد جداً للفواتير الكبيرة.
  //
  // سلوك تلقائي ذكي: إذا لم يسبق للمستخدم اختيار الكثافة يدوياً (لا يوجد
  // تفضيل محفوظ في localStorage)، تتحوّل الكثافة تلقائياً إلى "مضغوط"
  // بمجرد أن يتجاوز عدد أصناف السلة 7، وترجع "مريح" عندما يقل العدد عن
  // ذلك مجدداً. أما بمجرد أن يضغط المستخدم الزر مرة واحدة يدوياً، يُحفَظ
  // اختياره ويُحترَم نهائياً (لا يُبدَّل تلقائياً بعد ذلك أبداً).
  const manualDensityRef = useRef(false);
  const [density, setDensityState] = useState<CartDensity>('comfortable');

  useEffect(() => {
    try {
      const v = localStorage.getItem(CART_DENSITY_KEY);
      if (v === 'compact' || v === 'comfortable') {
        manualDensityRef.current = true;
        setDensityState(v);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (manualDensityRef.current) return;
    setDensityState(items.length >= 7 ? 'compact' : 'comfortable');
  }, [items.length]);

  const toggleDensity = useCallback(() => {
    manualDensityRef.current = true;
    setDensityState(prev => {
      const next: CartDensity = prev === 'compact' ? 'comfortable' : 'compact';
      try { localStorage.setItem(CART_DENSITY_KEY, next); } catch {}
      return next;
    });
  }, []);

  // ── تكبير/تصغير حجم النص وعرض الأسطر في السلة ────────────────────────────
  // النطاق: 0.75 (صغير جداً) → 1.25 (كبير). القيمة الافتراضية 1 (عادي).
  // يُطبق كـ CSS variable `--cart-zoom` على عنصر .pos-cart ويؤثر على
  // font-size, padding, gap لكل العناصر الداخلية بنسبة الضرب.
  const ZOOM_STEPS: CartZoom[] = [0.75, 0.875, 1, 1.125, 1.25];
  const [cartZoom, setCartZoom] = useState<CartZoom>(() => {
    try {
      const v = parseFloat(localStorage.getItem(CART_ZOOM_KEY) ?? '');
      return ZOOM_STEPS.includes(v as CartZoom) ? v as CartZoom : 1;
    } catch { return 1; }
  });
  const saveZoom = useCallback((z: CartZoom) => {
    setCartZoom(z);
    try { localStorage.setItem(CART_ZOOM_KEY, String(z)); } catch {}
  }, []);
  const zoomIn = useCallback(() => {
    const i = ZOOM_STEPS.indexOf(cartZoom);
    if (i < ZOOM_STEPS.length - 1) saveZoom(ZOOM_STEPS[i + 1]);
  }, [cartZoom, saveZoom]);
  const zoomOut = useCallback(() => {
    const i = ZOOM_STEPS.indexOf(cartZoom);
    if (i > 0) saveZoom(ZOOM_STEPS[i - 1]);
  }, [cartZoom, saveZoom]);

  const kb = (action: string) => getEffectiveShortcut(slug ?? null, action) ?? '';

  // ── افتراضية قائمة الأصناف (virtualization) ──────────────────────────────
  // نفس نمط ProductGrid: حاوية تمرير ثابتة + قياس ديناميكي لكل صف
  // (measureElement) لأن ارتفاع CartRow يختلف حسب الكثافة ووجود خصم.
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const nodeMap       = useRef(new Map<string, HTMLDivElement>());

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => cartScrollRef.current,
    estimateSize: () => (density === 'compact' ? 38 : 82),
    overscan: 8,
  });

  // إعادة قياس الكل عند تبدّل الكثافة
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [density, rowVirtualizer]);

  const registerRowNode = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeMap.current.set(id, el);
    else nodeMap.current.delete(id);
  }, []);

  const isEmpty = !items.length;

  const totalQty = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    [items]
  );

  useImperativeHandle(ref, () => ({
    scrollToItemId: (id: string) => {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return;
      rowVirtualizer.scrollToIndex(idx, { align: 'auto' });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          nodeMap.current.get(id)?.focus();
        });
      });
    },
    openCustomerModal: () => setShowCustModal(true),
  }), [items, rowVirtualizer]);

  const handleInvDiscAmount = useCallback((raw: string) => {
    setInvDiscAmtVal(raw);
    const n = parseFloat(raw) || 0;
    if (!onInvoiceDiscountChange) return;

    // Invoice discount is applied at HT level (calcTotals: invoiceDiscountAmount = totalHt * pct / 100).
    // Reverse-engineer original HT before discount to compute the correct percentage.
    const curHt       = totals.total_ht ?? 0;
    const curDiscHt   = totals.invoice_discount_amount ?? 0;
    const origHt      = curHt + curDiscHt;

    if (origHt <= 0) return;
    const pct = Math.min(100, (n / origHt) * 100);
    onInvoiceDiscountChange(pct);
  }, [onInvoiceDiscountChange, totals.total_ht, totals.invoice_discount_amount]);

  return (
    <>
      <div className="pos-cart" id="pos-cart" ref={cartRef} tabIndex={-1} style={{ '--cart-zoom': cartZoom } as React.CSSProperties}>

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
                className="btn btn-xs"
                onClick={zoomOut}
                disabled={cartZoom <= 0.75}
                title={`تصغير النص — ${kb('zoomOut')}`}
              >
                <i className="ti ti-minus" />
              </button>
              <button
                className="btn btn-xs"
                onClick={zoomIn}
                disabled={cartZoom >= 1.25}
                title={`تكبير النص — ${kb('zoomIn')}`}
              >
                <i className="ti ti-plus" />
              </button>
              <button
                className={`btn btn-xs density-toggle-btn ${density === 'compact' ? 'on' : ''}`}
                onClick={toggleDensity}
                title={density === 'compact' ? 'التبديل لعرض مريح (بطاقات أكبر)' : 'التبديل لعرض مضغوط (منتجات أكثر بدون تمرير)'}
                type="button"
              >
                <i className={`ti ${density === 'compact' ? 'ti-list-details' : 'ti-list'}`} />
              </button>
              <button className="btn btn-xs" onClick={onHeld} title="الفواتير المعلقة">
                <i className="ti ti-clock-pause" />
                {kb('heldCarts') && <span className="tb-txt"> {kb('heldCarts')}</span>}
              </button>
              <button
                className={`btn btn-xs ${note ? 'btn-p' : ''}`}
                onClick={() => setShowNote(s => !s)}
                title="ملاحظة على الفاتورة"
              >
                <i className="ti ti-notes" />
              </button>
              <button
                className={`btn btn-xs btn-warn ${undoClearSecondsLeft > 0 ? 'btn-pulse' : ''}`}
                onClick={onUndoClear}
                disabled={!canUndoClear}
                title={`تراجع عن آخر مسح — ${kb('undoClear')}${undoClearSecondsLeft > 0 ? ` (${undoClearSecondsLeft}s)` : ''}`}
              >
                <i className="ti ti-arrow-back-up" />
                {undoClearSecondsLeft > 0 && <span className="undo-ct">{undoClearSecondsLeft}</span>}
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={onClear}
                disabled={isEmpty}
                title="مسح السلة"
              >
                <i className="ti ti-trash" />
                {kb('clearCart') && <span className="tb-txt"> {kb('clearCart')}</span>}
              </button>
            </div>
          </div>

          <div className={`cart-hero ${isEmpty ? '' : 'has-items'}`}>
            <div className="ch-top">
              <span className="ch-label"><i className="ti ti-wallet" /> الإجمالي المستحق</span>
              <span className="ch-badge">{totalQty % 1 === 0 ? totalQty : totalQty.toFixed(2)} قطعة</span>
            </div>
            <div className="ch-amount">{formatDZD(totalTtcFinal)}</div>
            {/* <div className="ch-stats">
              <div className="ch-stat">
                <span className="ch-stat-v">{items.length}</span>
                <span className="ch-stat-l">صنف</span>
              </div>
              <div className="ch-stat">
                <span className="ch-stat-v">{formatDZD(totals.total_ht)}</span>
                <span className="ch-stat-l">HT</span>
              </div>
              <div className="ch-stat">
                <span className="ch-stat-v">{formatDZD(totals.total_tva)}</span>
                <span className="ch-stat-l">TVA</span>
              </div>
            </div> */}
            {/* <div className={`pay-status ${
              isEmpty ? 'pay-status--empty' : (remainingToPay <= 0 ? 'pay-status--ok' : 'pay-status--change')
            }`}>
              <i className={`ti ${isEmpty ? 'ti-shopping-cart-off' : (remainingToPay <= 0 ? 'ti-circle-check' : 'ti-clock')}`} />
              {isEmpty ? 'السلة فارغة' : (remainingToPay <= 0 ? 'جاهز للدفع' : 'بانتظار الإتمام')}
            </div> */}
            {!isEmpty && !showTotalsDetails && (
              <button type="button" className="ch-more-btn" onClick={toggleTotals} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-eye" style={{ fontSize: 13 }} />
                تفاصيل إضافية
              </button>
            )}

            {!isEmpty && showTotalsDetails && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4, fontSize: 11 }}>
                {/* يمين: الرصيد */}
                {client !== null && clientBalance !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 500 }}>الرصيد السابق</span>
                    <span style={{ fontWeight: 700, fontSize: 11, color: '#ef4444', background: 'rgba(255,255,255,0.85)', padding: '1px 6px', borderRadius: 4 }}>
                      {formatDZD(clientBalance)}
                    </span>
                    <i className="ti ti-arrow-left" style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }} />
                    <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 500 }}>الرصيد الجديد</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#fff' }}>
                      {formatDZD(clientBalance + totalTtcFinal)}
                    </span>
                  </div>
                )}

                {/* وسط: مرونة */}
                <div style={{ flex: 1 }} />

                {/* يسار: خصم الفاتورة */}
                {onInvoiceDiscountChange && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 500 }}>خصم</span>
                    <button
                      onClick={() => setInvDiscMode('pct')}
                      type="button"
                      style={{
                        fontSize: 10, padding: '2px 5px', borderRadius: 3, border: '1px solid rgba(255,255,255,.2)',
                        background: invDiscMode === 'pct' ? 'rgba(255,255,255,.2)' : 'transparent',
                        color: '#fff', cursor: 'pointer', fontWeight: 600,
                      }}
                    >%</button>
                    <button
                      onClick={() => setInvDiscMode('amount')}
                      type="button"
                      style={{
                        fontSize: 10, padding: '2px 5px', borderRadius: 3, border: '1px solid rgba(255,255,255,.2)',
                        background: invDiscMode === 'amount' ? 'rgba(255,255,255,.2)' : 'transparent',
                        color: '#fff', cursor: 'pointer', fontWeight: 600,
                      }}
                    >دج</button>
                    <input
                      type="number"
                      value={invDiscMode === 'pct' ? (invoiceDiscountPct || '') : invDiscAmtVal}
                      onChange={e => {
                        if (invDiscMode === 'pct') {
                          onInvoiceDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)));
                        } else {
                          handleInvDiscAmount(e.target.value);
                        }
                      }}
                      min={0}
                      placeholder="0"
                      style={{
                        width: 48, textAlign: 'center', fontSize: 12, fontWeight: 700,
                        background: 'rgba(255,255,255,.12)', color: '#fff',
                        border: '1px solid rgba(255,255,255,.2)', borderRadius: 3,
                      }}
                    />
                    <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>
                      {invDiscMode === 'pct' ? '%' : 'دج'}
                    </span>
                    {((invDiscMode === 'pct' && invoiceDiscountAmount > 0) || (invDiscMode === 'amount' && parseFloat(invDiscAmtVal) > 0)) && (
                      <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 700 }}>
                        -{formatDZD(invoiceDiscountAmount)}
                      </span>
                    )}
                    <button
                      onClick={toggleTotals}
                      type="button"
                      style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: 13, display: 'flex', alignItems: 'center', gap: 3 }}
                      title="إخفاء التفاصيل"
                    >
                      <i className="ti ti-eye-off" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                )}
              </div>
            )}
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

        <div
          className="cart-items"
          ref={cartScrollRef}
          style={{ overflow: 'auto', flexShrink: 0 }}
        >
          {isEmpty ? (
            <div className="cart-empty">
              <div className="ce-ico"><i className="ti ti-shopping-cart-off" /></div>
              <div className="ce-ttl">السلة فارغة</div>
              <div className="ce-sub">ابحث عن منتج أو امسح الباركود</div>
            </div>
          ) : (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', flexShrink: 0, width: '100%' }}>
              {rowVirtualizer.getVirtualItems().map(vRow => {
                const item = items[vRow.index];
                if (!item) return null;
                return (
                  <div
                    key={item.id}
                    data-index={vRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%',
                      transform: `translateY(${vRow.start}px)`,
                    }}
                  >
                    <CartRow
                      item={item}
                      idx={vRow.index}
                      isSelected={selectedItemId === item.id}
                      onSelect={() => onSelectItem(item.id)}
                      onQty={qty => onQty(item.id, qty)}
                      onDiscount={pct => onDiscount(item.id, pct)}
                      onDiscountAmount={amount => onDiscountAmount(item.id, amount)}
                      onPrice={price => onPrice(item.id, price)}
                      onRemove={() => onRemove(item.id)}
                      density={density}
                      registerNode={registerRowNode}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cart-actions">
          <button
            className="btn btn-sm"
            onClick={onHold}
            disabled={isEmpty}
            title="تعليق الفاتورة"
          >
            <i className="ti ti-clock-pause" /> تعليق
            {kb('holdCart') && <span className="tb-txt"> {kb('holdCart')}</span>}
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
            {kb('payment') && <span className="tb-txt" style={{ fontSize: 13 }}> {kb('payment')}</span>}
          </button>
        </div>
      </div>

      {showCustModal && (
        <CustomerSearchModal
          currentClient={client}
          onSelect={c => {
            onSetClient(c);
            setShowCustModal(false);
            onClientModalClose?.();
          }}
          onClose={() => {
            setShowCustModal(false);
            onClientModalClose?.();
          }}
        />
      )}
    </>
  );
});

export default ProfessionalCart;