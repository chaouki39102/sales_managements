// ════════════════════════════════════════════════════════════════════════════
// DataTable/FilterPopup.tsx  —  v8.2
// ✅ إصلاح: useCallback لتحديث الموضع + إزالة التبعيات غير المستقرة
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import type { Column } from './types';
import { decodeRange, encodeRange, getRawValue } from './utils';
import { useClickOutside, useEscapeKey } from './hooks';
import { StaticMultiSelect, DynamicMultiSelect } from './MultiSelect';

interface FilterPopupProps {
  col:       Column<Record<string, unknown>>;
  value:     string;
  onChange:  (v: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose:   () => void;
  allData?:  Record<string, unknown>[];
  data?:     Record<string, unknown>[];
}

const FilterPopup = memo(function FilterPopup({
  col, value, onChange, anchorRef, onClose, allData, data,
}: FilterPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // دالة مستقرة لحساب الموضع
  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popupW = 240;
    const popupH = 370;
    let left = rect.right - popupW;
    if (left < 8) left = 8;
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top = spaceBelow >= popupH
      ? rect.bottom + 4
      : Math.max(8, rect.top - popupH - 4);
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  useClickOutside(popupRef, anchorRef, onClose);
  useEscapeKey(onClose);

  if (!col.filter || !pos) return null;

  const { type } = col.filter;
  const hasVal = value !== '' && value !== '|';
  const header = typeof col.header === 'string' ? col.header : '';

  const renderContent = () => {
    if (type === 'text') return (
      <input
        className={`dt-fi${hasVal ? ' act' : ''}`}
        type="text"
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
        placeholder="ابحث..."
      />
    );

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
          />
          <span className="dt-range-sep">—</span>
          <input
            className={`dt-fi${max ? ' act' : ''}`}
            type="number"
            value={max}
            placeholder="إلى"
            onChange={e => onChange(encodeRange(min, e.target.value))}
          />
        </div>
      );
    }

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
            />
          </div>
          <div>
            <div className="dt-date-label">إلى</div>
            <input
              className={`dt-fi${max ? ' act' : ''}`}
              type="date"
              value={max}
              onChange={e => onChange(encodeRange(min, e.target.value))}
            />
          </div>
        </div>
      );
    }

    if (type === 'multiselect') {
      return (
        <StaticMultiSelect
          options={col.filter.options as { value: string; label: string }[]}
          value={value}
          onChange={onChange}
          onClose={onClose}
        />
      );
    }

    if (type === 'dynamic-multiselect') {
      const sourceData = allData ?? data ?? [];
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
