// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/ProductSearch.tsx
//
// ComboBox متخصص للمنتجات: يعرض المخزون، التحذيرات، المرجع، الوحدة.
//
// 🔧 BUGFIX: القائمة المنسدلة كانت تُقطع داخل الجدول بسبب overflow:hidden
//    على عناصر الـ table/tbody/td. الحل: نستخدم ReactDOM.createPortal
//    لتصيير الـ dropdown مباشرةً في document.body، مع position:fixed
//    وحساب الإحداثيات بـ getBoundingClientRect().
// ════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getProductStock, fmtDZD, productDisplayPrice } from '../utils/document.utils';
import { cellStyle } from './DocumentUIPrimitives';
import type { Product } from '../types/document.types';
import type { ProductType, Tva, Unit } from '@/lib/api/core/types';

// ─── Quick-Create Payload ─────────────────────────────────────────────────────

export interface QuickCreatePayload {
  name:             string;
  ref?:             string;
  product_type_id:  number;
  purchase_price_ht?: number;
  tva_id?:          number;
  unit_id?:         number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductSearchProps {
  products:    Product[];
  value:       string;
  onChange:    (productId: string, product: Product | null) => void;
  disabled?:   boolean;
  error?:      boolean;
  isPurchase?: boolean;
  stockData?:  Record<number, number>;
  /** مُعرّف ثابت لزر الفتح (doc-line-{idx}-product) ليصل إليه التنقل بلوحة المفاتيح. */
  triggerId?:  string;
  /** مُعرّف الخلية التي يُعاد إليها التركيز بعد الاختيار (كمية السطر عادةً). */
  afterSelectFocusId?: string;
  /** إنشاء منتج جديد سريع — يُمرَّر مع بيانات المنتج الجديد. */
  onQuickCreate?: (payload: QuickCreatePayload) => void;
  /** أنواع المنتجات المتاحة (مطلوب عند وجود onQuickCreate). */
  productTypes?: ProductType[];
  /** نسب TVA المتاحة. */
  tvas?: Tva[];
  /** الوحدات المتاحة. */
  units?: Unit[];
  /** هل لا تزال قائمة المنتجات قيد التحميل؟ */
  isLoadingProducts?: boolean;
  /** مسح نص البحث بعد الاختيار / عند الإغلاق (تفضيل «الإدخال السريع»). الافتراضي true. */
  clearOnChoose?: boolean;
  /** فتح القائمة تلقائياً عند التركيز على زر منتقي منتج فارغ. */
  autoOpenWhenEmpty?: boolean;
  /**
   * طريقة عرض السعر في القائمة المنسدلة: 'ht' (سعر خالص الضريبة) أو 'ttc'
   * (سعر شامل الضريبة). عرضي فقط — لا يعدّل السعر القابل للتحرير.
   */
  priceDisplayMode?: 'ht' | 'ttc';
}

// ─── Dropdown position ────────────────────────────────────────────────────────

interface DropdownPos {
  top:   number;
  right: number;   // RTL: نستخدم right بدل left حتى تمتد القائمة من يمين الزر
  width: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductSearch({
  products,
  value,
  onChange,
  disabled,
  error,
  isPurchase  = false,
  stockData   = {},
  triggerId,
  afterSelectFocusId,
  onQuickCreate,
  productTypes = [],
  tvas         = [],
  units        = [],
  isLoadingProducts = false,
  clearOnChoose = true,
  autoOpenWhenEmpty = false,
  priceDisplayMode = 'ht',
}: ProductSearchProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [pos,   setPos]   = useState<DropdownPos>({ top: 0, right: 0, width: 320 });
  const [highlightedIdx, setHighlightedIdx] = useState(0);

  // ── Quick-create form state ───────────────────────────────────────────────
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [qcName, setQcName]             = useState('');
  const [qcRef, setQcRef]               = useState('');
  const [qcProductTypeId, setQcProductTypeId] = useState<number | ''>('');
  const [qcPriceHt, setQcPriceHt]       = useState('');
  const [qcTvaId, setQcTvaId]           = useState<number | ''>('');
  const [qcUnitId, setQcUnitId]         = useState<number | ''>('');
  const [qcSubmitting, setQcSubmitting] = useState(false);
  const [qcError, setQcError]           = useState('');
  const qcFormRef = useRef<HTMLFormElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  const selected = products.find((p) => String(p.id) === value);

  // ─── حساب موضع الـ dropdown بناءً على موضع الزر في الشاشة ─────────────────

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect  = triggerRef.current.getBoundingClientRect();
    const dropW = Math.max(rect.width, 320);

    // حساب المساحة المتاحة — نُقيّد بالـ viewport مع هامش 8px
    const viewportH    = window.innerHeight;
    const spaceBelow   = viewportH - rect.bottom - 8;
    const spaceAbove   = rect.top - 8;
    const maxDropH     = 320;
    const openUpward   = spaceBelow < Math.min(maxDropH, 200) && spaceAbove > spaceBelow;

    // RTL: right = المسافة من يمين الـ viewport إلى يمين الزر
    const rightFromViewport = window.innerWidth - rect.right;

    const top = openUpward
      ? rect.top  - Math.min(maxDropH, spaceAbove) - 3
      : rect.bottom + 3;

    setPos({
      top:   Math.max(top, 8),
      right: Math.max(rightFromViewport, 4),
      width: Math.min(dropW, rect.right - 8),
    });
  }, []);

  // ─── فتح / إغلاق ──────────────────────────────────────────────────────────

  const handleOpen = () => {
    if (disabled) return;
    if (!open) {
      calcPos();
      setOpen(true);
      setShowQuickCreate(false);
      setQcError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
      if (clearOnChoose) setQuery('');
      setShowQuickCreate(false);
    }
  };

  // ─── إغلاق عند النقر خارجاً أو Escape ────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    const handleMouse = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropRef.current    && !dropRef.current.contains(target)
      ) {
        setOpen(false);
        if (clearOnChoose) setQuery('');
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // أوقف الانتشار حتى لا يغلق مستمع Escape على مستوى النافذة المحرّر كله
        e.stopPropagation();
        setOpen(false);
        if (clearOnChoose) setQuery('');
      }
    };

    // إعادة حساب الموضع عند التمرير أو تغيير الحجم
    const handleReposition = () => calcPos();

    document.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown',   handleKey);
    window.addEventListener('scroll',  handleReposition, true);
    window.addEventListener('resize',  handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown',   handleKey);
      window.removeEventListener('scroll',  handleReposition, true);
      window.removeEventListener('resize',  handleReposition);
    };
  }, [open, calcPos]);

  // ─── فلترة المنتجات ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const base = query.trim()
      ? products.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.ref     ?? '').toLowerCase().includes(query.toLowerCase()) ||
          (p.barcode ?? '').toLowerCase().includes(query.toLowerCase()),
        )
      : products;
    return base.slice(0, 60);
  }, [products, query]);

  // ─── اختيار منتج ─────────────────────────────────────────────────────────

  const choose = (p: Product) => {
    onChange(String(p.id), p);
    setOpen(false);
    if (clearOnChoose) setQuery('');
    // إكمال الدورة بلوحة المفاتيح: بعد الاختيار بالـ Enter ينتقل التركيز
    // مباشرة إلى خلية الكمية في نفس السطر — بدون لمس الفأرة.
    if (afterSelectFocusId) {
      requestAnimationFrame(() => {
        const el = document.getElementById(afterSelectFocusId);
        if (el) {
          el.focus();
          if (el instanceof HTMLInputElement) el.select();
        }
      });
    }
  };

  // إعادة تعيين المؤشر عند تغير الفلترة
  useEffect(() => {
    setHighlightedIdx(0);
  }, [filtered.length]);

  // ─── Quick-create handlers ────────────────────────────────────────────────

  const startQuickCreate = () => {
    setQcName(query.trim());
    setQcRef('');
    setQcProductTypeId(productTypes.length === 1 ? productTypes[0].id : '');
    setQcPriceHt('');
    setQcTvaId('');
    setQcUnitId('');
    setQcError('');
    setShowQuickCreate(true);
    setTimeout(() => qcFormRef.current?.querySelector<HTMLInputElement>('input')?.focus(), 50);
  };

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcName.trim() || !qcProductTypeId || !onQuickCreate) return;
    setQcSubmitting(true);
    setQcError('');
    try {
      onQuickCreate({
        name:               qcName.trim(),
        ref:                qcRef.trim() || undefined,
        product_type_id:    Number(qcProductTypeId),
        purchase_price_ht:  qcPriceHt ? Number(qcPriceHt) : undefined,
        tva_id:             qcTvaId ? Number(qcTvaId) : undefined,
        unit_id:            qcUnitId ? Number(qcUnitId) : undefined,
      });
      setShowQuickCreate(false);
      setQuery('');
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الإنشاء';
      setQcError(msg);
    } finally {
      setQcSubmitting(false);
    }
  };

  const defaultTva = tvas.find(t => t.is_default);
  const canQuickCreate = !!onQuickCreate && query.trim().length > 0 && !isLoadingProducts;

  const qcLabelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--t3)', marginBottom: 2 };
  const qcInputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 7px', fontSize: 12, borderRadius: 6,
    border: '1px solid var(--b2)', background: 'var(--bg1)', color: 'var(--t1)',
  };
  // ─── Badge المخزون ────────────────────────────────────────────────────────

  const stockBadge = (p: Product): { label: string; color: string } | null => {
    if (isPurchase || !p.manages_stock) return null;
    const qty = getProductStock(p, stockData);
    if (qty === Infinity) return null;
    if (qty <= 0)         return { label: 'نفد',          color: 'var(--red)'    };
    if (qty < 5)          return { label: `متاح: ${qty}`, color: 'var(--orange)' };
    return                       { label: `متاح: ${qty}`, color: 'var(--green)'  };
  };

  // ─── Dropdown markup (يُصيَّر في portal) ─────────────────────────────────

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position:     'fixed',
        top:          pos.top,
        right:        pos.right,
        width:        pos.width,
        maxWidth:     420,
        zIndex:       99999,
        background:   'var(--bg2)',
        border:       '1px solid var(--b2)',
        borderRadius: 'var(--r2)',
        boxShadow:    '0 8px 32px rgba(0,0,0,.28)',
        direction:    'rtl',
        overflow:     'hidden',
      }}
    >
      {/* حقل البحث */}
      <div style={{
        padding: '6px 6px 5px', borderBottom: '1px solid var(--b1)',
        background: 'var(--bg3)',
      }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', right: 7, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 12,
            pointerEvents: 'none',
          }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightedIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIdx((prev) => Math.max(prev - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered[highlightedIdx]) {
                  choose(filtered[highlightedIdx]);
                }
              }
            }}
            placeholder="ابحث بالاسم أو الرمز..."
            style={{
              width: '100%', padding: '5px 28px 5px 8px',
              borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
              background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 12, fontFamily: 'Tajawal, sans-serif',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* النتائج */}
      <div ref={listRef} style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.length === 0 && !showQuickCreate
          ? (
            <div style={{ padding: '10px 10px 6px' }}>
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', marginBottom: 6 }}>
                لا توجد نتائج
              </div>
              {canQuickCreate && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); startQuickCreate(); }}
                  style={{
                    width: '100%', padding: '7px 10px',
                    borderRadius: 'var(--r1)',
                    border: '1px dashed var(--em)',
                    background: 'color-mix(in srgb, var(--em) 6%, transparent)',
                    color: 'var(--em)', fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 14 }} />
                  إنشاء منتج جديد: «{query.trim()}»
                </button>
              )}
            </div>
          )
          : showQuickCreate
            ? (
              /* ── Quick-create inline form ── */
              <form
                ref={qcFormRef}
                onSubmit={handleQuickCreateSubmit}
                style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--b1)' }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--em)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-package" style={{ fontSize: 13 }} />
                  إنشاء منتج جديد
                </div>

                {/* الاسم */}
                <div style={{ marginBottom: 5 }}>
                  <label style={qcLabelStyle}>الاسم *</label>
                  <input
                    value={qcName}
                    onChange={e => setQcName(e.target.value)}
                    required
                    maxLength={150}
                    style={qcInputStyle}
                  />
                </div>

                {/* المرجع + نوع المنتج */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 5 }}>
                  <div>
                    <label style={qcLabelStyle}>المرجع</label>
                    <input
                      value={qcRef}
                      onChange={e => setQcRef(e.target.value)}
                      maxLength={50}
                      style={qcInputStyle}
                    />
                  </div>
                  <div>
                    <label style={qcLabelStyle}>النوع *</label>
                    <select
                      value={qcProductTypeId}
                      onChange={e => setQcProductTypeId(e.target.value ? Number(e.target.value) : '')}
                      required
                      style={qcInputStyle}
                    >
                      <option value="">— اختر —</option>
                      {productTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* السعر + TVA + الوحدة */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
                  <div>
                    <label style={qcLabelStyle}>سعر HT</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={qcPriceHt}
                      onChange={e => setQcPriceHt(e.target.value)}
                      style={qcInputStyle}
                    />
                  </div>
                  <div>
                    <label style={qcLabelStyle}>TVA</label>
                    <select
                      value={qcTvaId}
                      onChange={e => setQcTvaId(e.target.value ? Number(e.target.value) : '')}
                      style={qcInputStyle}
                    >
                      <option value="">{defaultTva ? `${defaultTva.rate}%` : '—'}</option>
                      {tvas.filter(t => t.id !== defaultTva?.id).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={qcLabelStyle}>الوحدة</label>
                    <select
                      value={qcUnitId}
                      onChange={e => setQcUnitId(e.target.value ? Number(e.target.value) : '')}
                      style={qcInputStyle}
                    >
                      <option value="">—</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {qcError && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 6 }}>
                    {qcError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    type="submit"
                    disabled={qcSubmitting || !qcName.trim() || !qcProductTypeId}
                    style={{
                      flex: 1, padding: '6px 0',
                      borderRadius: 'var(--r1)',
                      border: 'none',
                      background: 'var(--em)', color: '#fff',
                      fontSize: 12, fontWeight: 600,
                      cursor: qcSubmitting ? 'wait' : 'pointer',
                      opacity: qcSubmitting || !qcName.trim() || !qcProductTypeId ? 0.6 : 1,
                    }}
                  >
                    {qcSubmitting ? 'جاري الإنشاء...' : 'إنشاء وتحديد'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowQuickCreate(false); setQcError(''); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--r1)',
                      border: '1px solid var(--b2)',
                      background: 'var(--bg2)', color: 'var(--t3)',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )
            : filtered.map((p, i) => {
              const badge      = stockBadge(p);
              const isSelected = String(p.id) === value;
              const isHighlighted = i === highlightedIdx;
              return (
                <div
                  key={p.id}
                  ref={isHighlighted ? (el) => {
                    if (el) el.scrollIntoView({ block: 'nearest' });
                  } : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  onMouseEnter={() => setHighlightedIdx(i)}
                  style={{
                    padding:      '8px 10px',
                    cursor:       'pointer',
                    background:   isHighlighted ? 'var(--bg3)' : isSelected ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  {/* معلومات المنتج */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: isSelected ? 700 : 500,
                      color: 'var(--t1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontSize: 10.5, color: 'var(--t4)', marginTop: 1,
                      display: 'flex', gap: 6,
                    }}>
                      {p.ref    && <span>{p.ref}</span>}
                      {p.unit   && <span>{p.unit.symbol}</span>}
                      {p.family && <span>{p.family.name}</span>}
                    </div>
                  </div>

                  {/* Badge المخزون */}
                  {badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                      padding: '2px 6px', borderRadius: 99,
                      background: `color-mix(in srgb, ${badge.color} 12%, transparent)`,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  )}

                  {/* السعر (عرضي حسب طريقة العرض) */}
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, flexShrink: 0,
                    color: 'var(--em)', whiteSpace: 'nowrap',
                  }}>
                    {fmtDZD(productDisplayPrice(p, priceDisplayMode, isPurchase))}
                    <span style={{ fontSize: 9, color: 'var(--t4)', marginInlineStart: 2 }}>
                      {priceDisplayMode === 'ttc' ? 'TTC' : 'HT'}
                    </span>
                  </span>
                </div>
              );
            })
        }
      </div>
    </div>,
    document.body,
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* زر الفتح */}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        data-has-product={value ? '1' : '0'}
        disabled={disabled}
        onClick={handleOpen}
        onFocus={() => {
          if (autoOpenWhenEmpty && !value && !open && !disabled) handleOpen();
        }}
        style={{
          ...cellStyle(!!value && !error),
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          gap:            4,
          textAlign:      'right',
          border:         error ? '1px solid var(--red)' : undefined,
          maxWidth:       '100%',
        }}
      >
        <span style={{
          flex:         1,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          color:        selected ? 'var(--t1)' : 'var(--t4)',
          textAlign:    'right',
        }}>
          {selected ? selected.name : '— اختر منتجاً —'}
        </span>
        <i
          className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}
        />
      </button>

      {/* القائمة المنسدلة — مُصيَّرة في document.body عبر portal */}
      {dropdown}
    </div>
  );
}
