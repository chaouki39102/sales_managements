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
import { getProductStock } from '../utils/document.utils';
import { cellStyle } from './DocumentUIPrimitives';
import type { Product } from '../types/document.types';

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
  afterSelectFocusId,
}: ProductSearchProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [pos,   setPos]   = useState<DropdownPos>({ top: 0, right: 0, width: 320 });
  const [highlightedIdx, setHighlightedIdx] = useState(0);

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
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
      setQuery('');
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
        setQuery('');
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // أوقف الانتشار حتى لا يغلق مستمع Escape على مستوى النافذة المحرّر كله
        e.stopPropagation();
        setOpen(false);
        setQuery('');
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
    setQuery('');
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
        {filtered.length === 0
          ? (
            <div style={{
              padding: 16, textAlign: 'center',
              color: 'var(--t4)', fontSize: 12,
            }}>
              لا توجد نتائج
            </div>
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
        disabled={disabled}
        onClick={handleOpen}
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
