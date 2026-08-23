// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocumentUIPrimitives.tsx
//
// مكونات UI بسيطة خالصة — لا حالة تجارية، لا API.
// قابلة للتصدير واستخدامها في أي مكان آخر.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ALL_COLUMNS, STATUS_CONFIG } from '../types/document.types';
import type { ColKey } from '../types/document.types';

// ─── Shared styles ────────────────────────────────────────────────────────────

export const inputStyle = (err?: boolean): React.CSSProperties => ({
  width:           '100%',
  boxSizing:       'border-box',
  padding:         '7px 10px',
  borderRadius:    'var(--r2)',
  border:          `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
  background:      'var(--bg1)',
  color:           'var(--t1)',
  fontSize:        13,
  fontFamily:      'Tajawal, sans-serif',
  outline:         'none',
  transition:      'border-color .15s',
});

export const cellStyle = (highlight?: boolean): React.CSSProperties => ({
  width:        '100%',
  padding:      '5px 6px',
  borderRadius: 'var(--r1)',
  border:       `1px solid ${highlight ? 'var(--em)' : 'var(--b3)'}`,
  background:   highlight ? 'color-mix(in srgb, var(--em) 6%, var(--bg1))' : 'var(--bg1)',
  color:        'var(--t1)',
  fontSize:     12,
  fontFamily:   'Tajawal, sans-serif',
  outline:      'none',
  textAlign:    'center',
});

export const labelStyle: React.CSSProperties = {
  fontSize:        11,
  fontWeight:      700,
  color:           'var(--t3)',
  display:         'block',
  marginBottom:    4,
  textTransform:   'uppercase',
  letterSpacing:   0.4,
};

// ─── Label ────────────────────────────────────────────────────────────────────

export function Label({
  children,
  required,
}: {
  children:  React.ReactNode;
  required?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {children}
      {required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
    </label>
  );
}

// ─── FieldError ───────────────────────────────────────────────────────────────

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>
      {msg}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Section({
  title, icon, badge, children, collapsible = false,
  defaultOpen = true, open: openProp, onOpenChange,
}: {
  title:        string;
  icon:         string;
  badge?:       React.ReactNode;
  children:     React.ReactNode;
  collapsible?: boolean;
  /** الحالة الابتدائية عند أول رسم — لا تُغيِّر أي استخدام حالي (افتراضياً true كما كان دائماً) */
  defaultOpen?: boolean;
  /** وضع "مُتحكَّم به" اختياري: مرّره من الأب لو احتجت فتح القسم تلقائياً لاحقاً
   *  (مثال: ظهور خطأ تحقق داخل قسم مطوي). عدم تمريره = نفس السلوك القديم تماماً. */
  open?:         boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const toggle = () => {
    if (!collapsible) return;
    if (isControlled) onOpenChange?.(!open);
    else setInternalOpen(v => !v);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           8,
          marginBottom:  open ? 12 : 0,
          paddingBottom: 8,
          borderBottom:  '1px solid var(--b1)',
          cursor:        collapsible ? 'pointer' : 'default',
        }}
        onClick={toggle}
      >
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 15 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)',
          textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
          {title}
        </span>
        {badge}
        {collapsible && (
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ fontSize: 12, color: 'var(--t4)' }} />
        )}
      </div>
      {open && children}
    </div>
  );
}

// ─── TotalCard ────────────────────────────────────────────────────────────────

export function TotalCard({
  label, value, bg, color, labelColor, large, muted,
}: {
  label:        string;
  value:        string;
  bg?:          string;
  color?:       string;
  labelColor?:  string;
  large?:       boolean;
  muted?:       boolean;
}) {
  return (
    <div style={{ padding: '10px 12px', background: bg ?? 'var(--bg2)',
      borderRadius: 'var(--r2)', opacity: muted ? 0.55 : 1 }}>
      <div style={{ fontSize: 11, color: labelColor ?? 'var(--t3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: large ? 18 : 14, fontWeight: 700, color: color ?? 'var(--t1)',
        fontVariantNumeric: 'tabular-nums', direction: 'ltr', textAlign: 'right',
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({
  checked, onChange, label, subLabel, disabled,
}: {
  checked:   boolean;
  onChange:  (v: boolean) => void;
  label:     string;
  subLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        cursor:     disabled ? 'not-allowed' : 'pointer',
        padding:    '8px 12px',
        borderRadius: 'var(--r2)',
        background: checked ? 'color-mix(in srgb, var(--em) 10%, transparent)' : 'var(--bg3)',
        border:     `1px solid ${checked ? 'var(--em)' : 'var(--b2)'}`,
        transition: 'all .18s',
        userSelect: 'none',
        opacity:    disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 20, flexShrink: 0,
        background: checked ? 'var(--em)' : 'var(--b3)',
        position: 'relative', transition: 'background .18s',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3,
          right: checked ? 3 : 'auto',
          left:  checked ? 'auto' : 3,
          transition: 'all .18s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600,
          color: checked ? 'var(--em)' : 'var(--t2)' }}>
          {label}
        </div>
        {subLabel && (
          <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{subLabel}</div>
        )}
      </div>
    </div>
  );
}

// ─── ComboBox ─────────────────────────────────────────────────────────────────

export interface ComboOption {
  id:          number;
  label:       string;
  sub?:        string;
  badge?:      string;
  badgeColor?: string;
}

interface ComboBoxProps {
  options:       ComboOption[];
  value:         string;
  onChange:      (id: string) => void;
  placeholder:   string;
  disabled?:     boolean;
  error?:        boolean;
  maxH?:         number;
  onAfterSelect?: () => void;
  /** معرّف DOM لزر المشغّل — يُستخدم للوصول بلوحة المفاتيح (مثل F4 للمتعامل). */
  id?:           string;
}
export function ComboBox({
  options, value, onChange, placeholder, 
disabled, error, maxH = 260, onAfterSelect, id,
}: ComboBoxProps) {
  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const ref          = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 80);
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q),
    ).slice(0, 80);
  }, [options, query]);

  // Reset highlight when filtered list changes or dropdown closes
  useEffect(() => {
    if (!open) setHighlightIdx(-1);
    else if (filtered.length > 0) setHighlightIdx(0);
  }, [open, filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLDivElement>('[data-combo-item]');
    items[highlightIdx]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const selectItem = (idx: number) => {
    const item = filtered[idx];
    if (!item) return;
    onChange(String(item.id));
    setOpen(false);
    setQuery('');
    onAfterSelect?.();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length === 0) return;
      const next = Math.min(highlightIdx + 1, filtered.length - 1);
      setHighlightIdx(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (highlightIdx <= 0) {
        setHighlightIdx(-1);
      } else {
        setHighlightIdx(highlightIdx - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < filtered.length) {
        selectItem(highlightIdx);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => { if (disabled) return; setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          ...inputStyle(error),
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer', gap: 6, textAlign: 'right',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', color: selected ? 'var(--t1)' : 'var(--t4)' }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{ color: 'var(--t4)', cursor: 'pointer', flexShrink: 0, fontSize: 11 }}
            title="مسح"
          >✕</span>
        )}
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 9999, background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 32px rgba(0,0,0,.22)',
          direction: 'rtl', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid var(--b1)',
            background: 'var(--bg3)' }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--t4)', fontSize: 13, pointerEvents: 'none',
              }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="ابحث..."
                style={{ ...inputStyle(), paddingRight: 28, fontSize: 12, background: 'var(--bg1)' }}
              />
            </div>
          </div>
          <div ref={listRef} style={{ maxHeight: maxH, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>لا توجد نتائج</div>
              : filtered.map((o, i) => (
                <div
                  key={o.id}
                  data-combo-item
                  onClick={() => { selectItem(i); }}
                  onMouseEnter={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                  onMouseLeave={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    background: highlightIdx === i
                      ? 'var(--emb)'
                      : String(o.id) === value ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    outline: highlightIdx === i ? '2px solid var(--em)' : undefined,
                    outlineOffset: -2,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--t1)',
                      fontWeight: String(o.id) === value ? 700 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.label}
                    </div>
                    {o.sub && (
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                        {o.sub}
                      </div>
                    )}
                  </div>
                  {o.badge && (
                    <span style={{
                      padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                      flexShrink: 0, background: o.badgeColor ?? 'var(--bg3)', color: 'var(--t3)',
                    }}>
                      {o.badge}
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ColumnManager ────────────────────────────────────────────────────────────

export function ColumnManager({
  visible,
  onChange,
}: {
  visible:  Set<ColKey>;
  onChange: (c: Set<ColKey>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const toggle = (key: ColKey) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.fixed) return;
    const next = new Set(visible);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="إدارة الأعمدة"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 'var(--r2)',
          border: '1px solid var(--b2)', background: 'var(--bg2)',
          color: 'var(--t3)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
        }}
      >
        <i className="ti ti-layout-columns" style={{ fontSize: 13 }} />
        الأعمدة
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 220, background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          zIndex: 9999, direction: 'rtl', overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px', fontSize: 10.5, fontWeight: 800,
            color: 'var(--t4)', textTransform: 'uppercase',
            borderBottom: '1px solid var(--b1)', background: 'var(--bg3)',
          }}>
            أظهر / أخفِ الأعمدة
          </div>
          {ALL_COLUMNS.filter((c) => !c.fixed).map((col) => (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer',
                background: visible.has(col.key) ? 'var(--emb)' : 'transparent',
                borderBottom: '1px solid var(--b1)', transition: 'background .1s',
              }}
              onMouseEnter={(e) => { if (!visible.has(col.key)) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
              onMouseLeave={(e) => { if (!visible.has(col.key)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <i className={`ti ti-${visible.has(col.key) ? 'eye' : 'eye-off'}`}
                style={{ fontSize: 13, color: visible.has(col.key) ? 'var(--em)' : 'var(--t4)' }} />
              <span style={{ fontSize: 12.5, color: visible.has(col.key) ? 'var(--t1)' : 'var(--t3)' }}>
                {col.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'var(--t4)', bg: 'var(--bg3)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────

export function AlertBanner({
  type, message,
}: {
  type:    'error' | 'success' | 'warning' | 'info';
  message: string;
}) {
  const colors = {
    error:   { bg: 'var(--redb)',   border: 'var(--red)',   color: 'var(--red)',   icon: 'ti-alert-circle'    },
    success: { bg: 'var(--greenb)', border: 'var(--green)', color: 'var(--green)', icon: 'ti-check-circle'    },
    warning: { bg: 'var(--goldb)',  border: 'var(--gold)',  color: 'var(--gold)',  icon: 'ti-alert-triangle'  },
    info:    { bg: 'var(--bg3)',    border: 'var(--b2)',    color: 'var(--t3)',    icon: 'ti-info-circle'     },
  };
  const c = colors[type];
  return (
    <div style={{
      padding: '9px 14px', marginBottom: 14,
      borderRadius: 'var(--r2)',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      fontSize: 12.5, display: 'flex', gap: 7, alignItems: 'flex-start',
    }}>
      <i className={`ti ${c.icon}`} style={{ marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

export interface Tab {
  key:   string;
  label: string;
  icon:  string;
  badge?: number;
}

export function Tabs({
  tabs, activeKey, onChange, children, style,
}: {
  tabs:     Tab[];
  activeKey: string;
  onChange:  (key: string) => void;
  children?: React.ReactNode;
  style?:    React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div style={{
        display: 'flex', gap: 2, borderBottom: '1px solid var(--b2)',
        marginBottom: 14, overflowX: 'auto',
      }}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                borderRadius: 'var(--r1) var(--r1) 0 0',
                background: isActive ? 'var(--bg1)' : 'transparent',
                color: isActive ? 'var(--em)' : 'var(--t4)',
                borderBottom: isActive ? '2px solid var(--em)' : '2px solid transparent',
                transition: 'all .15s',
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
              {tab.label}
              {tab.badge != null && (
                <span style={{
                  padding: '0 6px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: isActive ? 'var(--emb)' : 'var(--bg3)',
                  color: isActive ? 'var(--em)' : 'var(--t4)',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

/**
 * ════════════════════════════════════════════════════════════════════════
 * InfoPanel — لوحة صغيرة قابلة للطي (معلومات تكميلية اختيارية)
 * ────────────────────────────────────────────────────────────────────────
 * ✅ يوحّد تطبيقين منفصلين كانا يفعلان بالضبط نفس الشيء بكود مختلف قليلاً:
 *    - CollapsiblePanel المحلية داخل CustomerInsightPanel.tsx
 *    - الزر + useState المحلي داخل SmartSuggestionsPanel.tsx
 * الفرق عن Section: هذه للمعلومات الثانوية الصغيرة (تحليلات، اقتراحات)
 * التي تظهر ضمن قسم أكبر أصلاً — وليست تبويباً على مستوى المستند بالكامل
 * (لذلك تبقى نمط "طي" بسيط، عكس الحقول الأساسية التي انتقلت لنظام Tabs).
 * ════════════════════════════════════════════════════════════════════════
 */
export function InfoPanel({
  title, icon, badge, defaultOpen = false, children,
}: {
  title:        string;
  icon:         string;
  badge?:       React.ReactNode;
  defaultOpen?: boolean;
  children:     React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      marginTop: 8, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: 'var(--t4)' }} />
        <span style={{ flex: 1 }}>{title}</span>
        {badge}
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {open && (
        <div style={{ padding: '10px 12px', background: 'var(--bg1)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
