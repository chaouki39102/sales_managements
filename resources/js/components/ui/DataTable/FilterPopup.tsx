// ════════════════════════════════════════════════════════════════════════════
// DataTable/FilterPopup.tsx  — v8.1
//
// ✅ createPortal → يُعرَض في document.body خارج الـ <table> تماماً
//    يمنع اقتطاع الـ popup بسبب overflow:hidden على الـ <th>
// ✅ Smart positioning: يفتح لأعلى إذا لا مساحة أدناه
//    يُحدَّث عند scroll/resize
// ✅ getRawValue يدعم dot-notation (party.name, warehouse.name...)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal }                              from 'react-dom';
import type { Column }                               from './types';
import { decodeRange, encodeRange, getRawValue }     from './utils';
import { useClickOutside, useEscapeKey }             from './hooks';
import { StaticMultiSelect, DynamicMultiSelect }     from './MultiSelect';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FilterPopupProps {
  col:       Column<Record<string, unknown>>;
  value:     string;
  onChange:  (v: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose:   () => void;
  allData?:  Record<string, unknown>[];
  data?:     Record<string, unknown>[];
}

// ─── FilterPopup ─────────────────────────────────────────────────────────────

const FilterPopup = memo(function FilterPopup({
  col, value, onChange, anchorRef, onClose, allData, data,
}: FilterPopupProps) {

  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // حساب الموضع ويُحدَّث عند scroll/resize
  useEffect(() => {
    if (!anchorRef.current) return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect   = anchor.getBoundingClientRect();
      const popupW = 240;
      const popupH = 370;
      let   left   = rect.right - popupW;
      if (left < 8) left = 8;
      if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const top = spaceBelow >= popupH
        ? rect.bottom + 4
        : Math.max(8, rect.top - popupH - 4);
      setPos({ top, left });
    };

    update();
    // يُحدَّث عند scroll أي عنصر (true = capture phase)
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef]);

  useClickOutside(popupRef, anchorRef, onClose);
  useEscapeKey(onClose);

  // لا نُعرِض حتى يُحسب الموضع
  if (!col.filter || !pos) return null;

  const { type } = col.filter;
  const hasVal   = value !== '' && value !== '|';
  const header   = typeof col.header === 'string' ? col.header : '';

  // ── المحتوى حسب نوع الفلتر ───────────────────────────────────────────────

  const renderContent = () => {
    // Text
    if (type === 'text') return (
      <input
        className={`dt-fi${hasVal ? ' act' : ''}`}
        type="text"
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
        placeholder="ابحث..."
        aria-label={`فلتر ${header}`}
      />
    );

    // Select
    if (type === 'select') return (
      <select
        className={`dt-fi${hasVal ? ' act' : ''}`}
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
      >
        <option value="">الكل</option>
        {col.filter.options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );

    // Number range
    if (type === 'number') {
      const { min, max } = decodeRange(value);
      return (
        <div className="dt-range-row">
          <input
            className={`dt-fi${min ? ' act' : ''}`}
            type="number"
            value={min}
            placeholder="من"
            onChange={e => onChange(encodeRange(e.target.value, max))}
            aria-label="الحد الأدنى"
          />
          <span className="dt-range-sep">—</span>
          <input
            className={`dt-fi${max ? ' act' : ''}`}
            type="number"
            value={max}
            placeholder="إلى"
            onChange={e => onChange(encodeRange(min, e.target.value))}
            aria-label="الحد الأعلى"
          />
        </div>
      );
    }

    // Date range
    if (type === 'date') {
      const { min, max } = decodeRange(value);
      return (
        <div className="dt-date-group">
          <div>
            <div className="dt-date-label">من</div>
            <input
              className={`dt-fi${min ? ' act' : ''}`}
              type="date"
              value={min}
              onChange={e => onChange(encodeRange(e.target.value, max))}
              aria-label="تاريخ البداية"
            />
          </div>
          <div>
            <div className="dt-date-label">إلى</div>
            <input
              className={`dt-fi${max ? ' act' : ''}`}
              type="date"
              value={max}
              onChange={e => onChange(encodeRange(min, e.target.value))}
              aria-label="تاريخ النهاية"
            />
          </div>
        </div>
      );
    }

    // Static multiselect
    if (type === 'multiselect') return (
      <StaticMultiSelect
        options={col.filter.options as { value: string; label: string }[]}
        value={value}
        onChange={onChange}
        onClose={onClose}
      />
    );

    // Dynamic multiselect — يبني خياراته من البيانات الحالية
    if (type === 'dynamic-multiselect') {
      const sourceData = allData ?? data ?? [];
      // ✅ getRawValue يدعم dot-notation الآن
      const rawValues = [...new Set(
        sourceData
          .map(row => {
            const v = getRawValue(row, col);
            return v == null ? '' : String(v);
          })
          .filter(v => v !== ''),
      )];
      return (
        <DynamicMultiSelect
          rawValues={rawValues}
          labelFormatter={col.filter.labelFormatter}
          value={value}
          onChange={onChange}
          onClose={onClose}
        />
      );
    }

    return null;
  };

  const showFooter = hasVal && type !== 'multiselect' && type !== 'dynamic-multiselect';

  // ✅ Portal → يُعرَض في document.body بدلاً من داخل <th>
  return createPortal(
    <div
      ref={popupRef}
      className="dt-flt-popup"
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-label={`فلتر ${header}`}
    >
      {header && <div className="dt-flt-popup-title">{header}</div>}

      {renderContent()}

      {showFooter && (
        <div className="dt-flt-footer">
          <button
            className="dt-flt-clear"
            onClick={() => { onChange(''); onClose(); }}
            type="button"
          >
            مسح الفلتر ✕
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
});

export default FilterPopup;
