import React, { useState, useRef, useEffect } from 'react';
import type { ViewMode, GridSize, SortMode } from '../utils/posHelpers';

const SORT_OPTIONS: { value: SortMode; icon: string; label: string }[] = [
  { value: 'name',      icon: 'ti ti-text-caption',    label: 'أ-ي' },
  { value: 'price_asc', icon: 'ti ti-arrow-up',        label: 'سعر ↑' },
  { value: 'price_desc',icon: 'ti ti-arrow-down',      label: 'سعر ↓' },
  { value: 'stock',     icon: 'ti ti-package',         label: 'مخزون' },
  { value: 'family',    icon: 'ti ti-category',        label: 'تصنيف' },
];

const sortIcon: Record<SortMode, string> = {
  name: 'ti ti-text-caption',
  price_asc: 'ti ti-arrow-up',
  price_desc: 'ti ti-arrow-down',
  stock: 'ti ti-package',
  family: 'ti ti-category',
};

interface ProductSearchBarProps {
  query: string; onQuery: (q: string) => void;
  view: ViewMode; gridSize: GridSize;
  onView: (v: ViewMode) => void;
  onGridSize: (s: GridSize) => void;
  onFilter: () => void;
  filterActive: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  sortBy: SortMode;
  onSort: (s: SortMode) => void;
  resultsCount: number;
  onEnterFirst: () => void;
  highlightedIndex?: number;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  keyboardNavEnabled?: boolean;
}

export default function ProductSearchBar({
  query, onQuery, view, gridSize, onView, onGridSize,
  onFilter, filterActive, inputRef, sortBy, onSort, resultsCount, onEnterFirst,
  highlightedIndex, onArrowUp, onArrowDown, keyboardNavEnabled,
}: ProductSearchBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="pos-search-bar">
      <div className="pos-inp">
        <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--t4)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الباركود أو الرمز... (F2)"
          autoComplete="off"
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onEnterFirst(); }
            if (e.key === 'Escape') { e.preventDefault(); onQuery(''); }
            if (keyboardNavEnabled && onArrowUp && e.key === 'ArrowUp') { e.preventDefault(); onArrowUp(); }
            if (keyboardNavEnabled && onArrowDown && e.key === 'ArrowDown') { e.preventDefault(); onArrowDown(); }
          }}
        />
        {query && (
          <button className="srch-clear" onClick={() => onQuery('')} title="مسح (Escape)">
            <i className="ti ti-x" />
          </button>
        )}
        {!query && (
          <span className="srch-hint"><kbd>F2</kbd></span>
        )}
      </div>

      {query && (
        <span className="srch-count">{resultsCount} نتيجة</span>
      )}
      {query && keyboardNavEnabled && highlightedIndex !== undefined && resultsCount > 0 && (
        <span className="srch-pos" style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 700, direction: 'ltr' }}>
          {highlightedIndex + 1}/{resultsCount}
        </span>
      )}

      <div className="pos-sort-wrap" ref={sortRef}>
        <button className="pos-sort-btn" onClick={() => setSortOpen(o => !o)} title="ترتيب المنتجات">
          <i className={sortIcon[sortBy]} />
        </button>
        {sortOpen && (
          <div className="pos-sort-drop">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`psd-item ${sortBy === opt.value ? 'on' : ''}`}
                onClick={() => { onSort(opt.value); setSortOpen(false); }}
              >
                <i className={opt.icon} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className={`pos-tool-icon ${filterActive ? 'pos-tool-icon--active' : ''}`}
        onClick={onFilter}
        title="فلتر متقدم — F3"
        style={{ width: 34, height: 34 }}
      >
        <i className="ti ti-adjustments-horizontal" />
        {filterActive && <span className="filter-dot" />}
      </button>

      <div className="pos-view-btns">
        <button
          className={`pvb ${view === 'grid' ? 'on' : ''}`}
          onClick={() => onView('grid')}
          title="عرض شبكة"
        >
          <i className="ti ti-layout-grid" />
        </button>
        <button
          className={`pvb ${view === 'list' ? 'on' : ''}`}
          onClick={() => onView('list')}
          title="عرض قائمة"
        >
          <i className="ti ti-list" />
        </button>
      </div>

      {view === 'grid' && (
        <div className="pos-grid-size">
          {(['xs', 'sm', 'md', 'lg'] as GridSize[]).map(s => (
            <button
              key={s}
              className={`pgs ${gridSize === s ? 'on' : ''}`}
              onClick={() => onGridSize(s)}
              title={`حجم ${s}`}
            >
              {s === 'xs' ? 'S' : s === 'sm' ? 'M' : s === 'md' ? 'L' : 'XL'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
