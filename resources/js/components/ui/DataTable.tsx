// ════════════════════════════════════════════════════════════════════════════
// components/ui/DataTable.tsx  —  v7.2
//
// ✅ التعديلات عن v7.1:
//    - getRawValue: دعم dot-notation keys ("party.name") بدون accessor
//      مهم لأعمدة مثل: key:"party.name", key:"warehouse.name",
//      key:"document_status.name" التي يجب أن تطابق مفاتيح الباكاند
//    - لا تعديلات أخرى — v7.1 صحيح في كل النواحي الأخرى
// ════════════════════════════════════════════════════════════════════════════

import React, {
  useState, useMemo, useCallback,
  useRef, useEffect, useId, memo,
  type ReactNode, type CSSProperties, type KeyboardEvent,
} from 'react';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type FilterDef =
  | { type: 'text' }
  | { type: 'number' }
  | { type: 'date' }
  | { type: 'select';             options: readonly { value: string; label: string }[] }
  | { type: 'multiselect';        options: readonly { value: string; label: string }[] }
  | { type: 'dynamic-multiselect'; labelFormatter?: (value: string) => string };

export type RangeFilter    = { min: string; max: string };
export type AggregateType  = 'sum' | 'avg' | 'min' | 'max' | 'count';

const AGG_CYCLE: AggregateType[]             = ['sum', 'avg', 'min', 'max', 'count'];
const AGG_LABELS: Record<AggregateType, string> = {
  sum: 'Σ', avg: 'Ø', min: '↓', max: '↑', count: '#',
};

export type EditDef =
  | { type: 'text' }
  | { type: 'number'; min?: number; max?: number; step?: number }
  | { type: 'date' }
  | { type: 'select'; options: readonly { value: string; label: string }[] };

export interface Column<T = Record<string, unknown>> {
  key:              string;
  header:           ReactNode;
  exportHeader?:    string;
  render?:          (row: T, rowIndex: number) => ReactNode;
  accessor?:        (row: T) => unknown;
  sortable?:        boolean;
  filter?:          FilterDef;
  width?:           number;
  minWidth?:        number;
  align?:           'start' | 'center' | 'end';
  hideOnMobile?:    boolean;
  sticky?:          'start' | 'end';
  defaultHidden?:   boolean;
  aggregate?:       AggregateType | ((rows: T[]) => string | number | null);
  aggregateFormat?: (value: number, type: AggregateType) => string;
  editable?:        EditDef;
  searchable?:      boolean;
}

export interface PaginationConfig {
  page:      number;
  perPage:   number;
  total:     number;
  lastPage:  number;
  onPage:    (p: number) => void;
  onPerPage: (n: number) => void;
}

export interface CellEditPayload<T> {
  row:      T;
  rowIndex: number;
  colKey:   string;
  oldValue: unknown;
  newValue: string;
}

export interface DataTableProps<T = Record<string, unknown>> {
  data:             T[];
  columns:          Column<T>[];
  rowKey:           (row: T, index: number) => string | number;
  loading?:         boolean;
  error?:           string | null;

  pagination?:      PaginationConfig;
  onFilterChange?:  (filters: Record<string, string>) => void;
  onSortChange?:    (key: string, dir: 'asc' | 'desc' | null) => void;
  onSearchChange?:  (query: string) => void;

  selectable?:      boolean;
  onSelect?:        (selectedRows: T[]) => void;
  bulkActions?:     (selectedRows: T[], clearSelection: () => void) => ReactNode;

  onCellEdit?:      (payload: CellEditPayload<T>) => void;

  expandable?:      boolean;
  renderExpanded?:  (row: T, rowIndex: number) => ReactNode;
  isExpandable?:    (row: T) => boolean;

  showAggregates?:  boolean;
  aggregateLabel?:  ReactNode;

  searchable?:        boolean;
  searchPlaceholder?: string;

  showIndex?:       boolean;
  indexHeader?:     string;

  rowActions?:      (row: T) => ReactNode;
  headerActions?:   ReactNode;
  title?:           ReactNode;
  emptyText?:       ReactNode;
  emptyAction?:     ReactNode;
  compact?:         boolean;
  exportable?:      boolean;
  exportName?:      string;
  onRowClick?:      (row: T) => void;
  rowClassName?:    (row: T) => string | undefined;
  /**
   * allData — البيانات الكاملة لبناء dynamic-multiselect options
   * في Server-side mode: مرر البيانات الكاملة غير المُصفَّحة هنا
   * إذا لم تُمرَّر: يستخدم data (الصفحة الحالية)
   */
  allData?:         T[];
}

// ════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ════════════════════════════════════════════════════════════════════════════

interface SortState   { key: string | null; dir: 'asc' | 'desc' | null; }
interface EditingCell { rowKey: string | number; colKey: string; value: string; }
type FilterMap = Record<string, string>;

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100] as const;
const SKELETON_WIDTHS  = [70, 55, 82, 60, 75, 50, 88, 63, 72, 58] as const;
const MIN_COL_WIDTH    = 60;
const SEARCH_DEBOUNCE  = 180;

// ════════════════════════════════════════════════════════════════════════════
// CSS — موحَّد مع النظام (مع fallback لـ color-mix)
// ════════════════════════════════════════════════════════════════════════════

let _cssInjected = false;

function injectCSS(): void {
  if (_cssInjected || typeof document === 'undefined') return;
  _cssInjected = true;
  const el = document.createElement('style');
  el.id = 'dt-v7-css';
  el.textContent = `

/* ── Animations ── */
@keyframes dt-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
@keyframes dt-spin   { to{transform:rotate(360deg)} }
@keyframes dt-fade   { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
@keyframes dt-expand { from{opacity:0;transform:translateY(-3px)} to{opacity:1;transform:none} }

/* ── Base wrapper ── */
.dt-v7 {
  font-family: 'Tajawal', sans-serif;
  direction: rtl;
  font-size: 13px;
  color: var(--t1);
}
.dt-v7 * { box-sizing: border-box; }

/* ── Toolbar ── */
.dt-v7 .dt-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--b1);
  background: var(--bg2);
}
.dt-v7 .dt-toolbar-left  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dt-v7 .dt-toolbar-right { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

/* ── Toolbar buttons ── */
.dt-v7 .dt-tbtn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px; height: 28px;
  border: 1px solid var(--b2); border-radius: var(--r1);
  background: var(--bg2); color: var(--t3);
  font-size: 12px; cursor: pointer; font-family: inherit;
  transition: all .12s; white-space: nowrap;
}
.dt-v7 .dt-tbtn:hover { border-color: var(--em); color: var(--em); background: var(--emb); }
.dt-v7 .dt-tbtn.on    { background: var(--em); color: #fff; border-color: var(--em); }

/* ── Search ── */
.dt-v7 .dt-search.srch input { width: 180px; }

/* ── Filter badge ── */
.dt-v7 .dt-filter-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 20px; font-size: 11px;
  background: var(--emb); color: var(--em); font-weight: 700;
  border: 1px solid var(--embo);
}
.dt-v7 .dt-filter-badge button {
  background: none; border: none; cursor: pointer;
  color: var(--em); font-size: 14px; padding: 0;
  display: flex; align-items: center; line-height: 1;
}

/* ── Bulk bar ── */
.dt-v7 .dt-bulk {
  padding: 7px 14px;
  background: var(--emb);
  border-bottom: 1px solid var(--embo);
  display: flex; align-items: center; gap: 10px;
  animation: dt-fade .15s ease;
}
.dt-v7 .dt-bulk-count { font-size: 12px; font-weight: 700; color: var(--em); }

/* ── Error bar ── */
.dt-v7 .dt-error {
  padding: 10px 16px; font-size: 13px;
  background: var(--redb);
  border-bottom: 1px solid var(--redbo);
  color: var(--red);
  display: flex; align-items: center; gap: 8px;
}

/* ── Table wrapper ── */
.dt-v7 .dt-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.dt-v7 table {
  width: 100%;
  border-collapse: collapse;
}

/* ── TH ── */
.dt-v7 thead th {
  padding: 8px 10px;
  text-align: right;
  font-size: 11px; font-weight: 800;
  color: var(--t4);
  letter-spacing: .5px;
  text-transform: uppercase;
  background: var(--bg3);
  white-space: nowrap;
  user-select: none;
  position: relative;
}

/* ── TR ── */
.dt-v7 tbody tr {
  border-bottom: 1px solid var(--b1);
  transition: background .1s;
}
.dt-v7 tbody tr:hover > td { background: var(--bg3) !important; }
.dt-v7 tbody tr:last-child  { border-bottom: none; }
.dt-v7 .dt-row-click { cursor: pointer; }

/* ── TD ── */
.dt-v7 td {
  padding: 9px 10px;
  font-size: 13px;
  color: var(--t2);
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Sticky columns ── */
.dt-v7 .dt-ss {
  position: sticky; right: 0; z-index: 2;
  box-shadow: -3px 0 8px -4px rgba(0,0,0,.12);
}
.dt-v7 .dt-se {
  position: sticky; left: 0; z-index: 2;
  box-shadow:  3px 0 8px -4px rgba(0,0,0,.12);
}

/* ── Sort button ── */
.dt-v7 .dt-sort-btn {
  background: none; border: none; padding: 0; margin: 0;
  color: inherit; font: inherit; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
  width: 100%; text-align: right;
}
.dt-v7 .dt-sort-btn:hover { color: var(--em); }
.dt-v7 .dt-sort-btn:focus-visible { outline: 2px solid var(--em); outline-offset: 2px; border-radius: 3px; }

/* ── TH inner layout ── */
.dt-v7 .dt-th-inner {
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
  width: 100%;
}
.dt-v7 .dt-th-label { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; }

/* ── Filter icon button in TH ── */
.dt-v7 .dt-flt-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; flex-shrink: 0;
  border: none; background: none; cursor: pointer;
  border-radius: 4px; color: var(--t4);
  transition: all .12s; padding: 0;
  position: relative;
}
.dt-v7 .dt-flt-btn:hover { background: var(--bg4,var(--bg2)); color: var(--em); }
.dt-v7 .dt-flt-btn.has-val { color: var(--em); }
.dt-v7 .dt-flt-btn.has-val::after {
  content: ''; position: absolute; top: 1px; right: 1px;
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--em);
}

/* ── Resize handle ── */
.dt-v7 .dt-rh {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 5px; cursor: col-resize; z-index: 4;
  transition: background .15s;
}
.dt-v7 .dt-rh:hover, .dt-v7 .dt-rh:active { background: var(--em); opacity: .5; }

/* ── Expand button ── */
.dt-v7 .dt-exp-btn {
  width: 22px; height: 22px; border-radius: 5px;
  border: 1px solid var(--b2); background: var(--bg2);
  color: var(--t4); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; transition: all .15s;
}
.dt-v7 .dt-exp-btn:hover, .dt-v7 .dt-exp-btn.open {
  border-color: var(--em); color: var(--em); background: var(--emb);
}

/* ── Expanded content row ── */
.dt-v7 .dt-exp-td {
  padding: 0 !important;
  background: var(--bg3) !important;
  border-bottom: 1px solid var(--b1);
}
.dt-v7 .dt-exp-inner {
  padding: 12px 16px;
  animation: dt-expand .15s ease;
}

/* ── Inline editing ── */
.dt-v7 .dt-editable { cursor: text; position: relative; }
.dt-v7 .dt-editable::after {
  content: ''; position: absolute; inset: 2px;
  border: 1px dashed transparent; border-radius: 4px;
  transition: border-color .15s; pointer-events: none;
}
.dt-v7 .dt-editable:hover::after {
  border-color: rgba(var(--em-rgb, 0, 150, 136), 0.4);
}
.dt-v7 .dt-edit-input {
  width: 100%; padding: 3px 6px; font-size: inherit;
  border: 2px solid var(--em); border-radius: var(--r1);
  background: var(--bg2); color: var(--t1); outline: none;
  font-family: inherit;
  box-shadow: 0 0 0 3px var(--emb);
}

/* ── Filter popup (dropdown) ── */
.dt-v7 .dt-flt-popup {
  position: fixed; z-index: 9999;
  background: var(--bg2);
  border: 1px solid var(--b2);
  border-radius: var(--r2);
  box-shadow: 0 8px 24px rgba(0,0,0,0.16);
  padding: 10px;
  min-width: 200px; max-width: 260px;
  animation: dt-fade .12s ease;
}
.dt-v7 .dt-flt-popup-title {
  font-size: 10px; font-weight: 800; color: var(--t4);
  text-transform: uppercase; letter-spacing: .5px;
  margin-bottom: 8px; padding-bottom: 6px;
  border-bottom: 1px solid var(--b1);
}

/* ── Filter inputs inside popup ── */
.dt-v7 .dt-fi {
  width: 100%; padding: 6px 9px; font-size: 12px;
  border: 1px solid var(--b2); border-radius: var(--r1);
  background: var(--bg2); color: var(--t1); outline: none;
  font-family: inherit; transition: border-color .15s;
  height: 32px;
}
.dt-v7 .dt-fi:focus { border-color: var(--em); box-shadow: 0 0 0 2px var(--emb); }
.dt-v7 .dt-fi.act   { background: var(--emb); border-color: var(--embo); }
.dt-v7 .dt-fi[type="date"] { padding: 4px 8px; }
.dt-v7 .dt-fi[type="number"] { padding: 4px 8px; direction: ltr; text-align: left; }
.dt-v7 .dt-range-row { display: flex; align-items: center; gap: 6px; }
.dt-v7 .dt-range-row .dt-fi { flex: 1; }

/* ── Multiselect items ── */
.dt-v7 .dt-ms-list { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; margin-top: 6px; }
.dt-v7 .dt-ms-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: var(--r1);
  cursor: pointer; font-size: 12px; color: var(--t2);
  transition: background .1s;
}
.dt-v7 .dt-ms-item:hover { background: var(--bg3); }
.dt-v7 .dt-ms-item.on { color: var(--em); font-weight: 600; }

/* ── Filter popup footer ── */
.dt-v7 .dt-flt-footer {
  display: flex; justify-content: flex-end;
  margin-top: 8px; padding-top: 6px;
  border-top: 1px solid var(--b1);
}
.dt-v7 .dt-flt-clear {
  font-size: 11px; cursor: pointer; color: var(--t4);
  background: none; border: none; font-family: inherit;
  padding: 3px 6px; border-radius: var(--r1);
}
.dt-v7 .dt-flt-clear:hover { color: var(--red, #e03e3e); background: var(--redb,#fff1f0); }

/* ── Aggregate footer ── */
.dt-v7 .dt-agg-row td {
  background: var(--emb) !important;
  border-top: 2px solid var(--embo);
  padding: 6px 10px;
  font-weight: 700; font-size: 12px;
}
.dt-v7 .dt-agg-cell {
  display: inline-flex; align-items: center; gap: 4px;
  cursor: pointer; border-radius: var(--r1); padding: 2px 5px;
  transition: background .15s; user-select: none;
  color: var(--em);
}
.dt-v7 .dt-agg-cell:hover { background: rgba(var(--em-rgb, 0, 150, 136), 0.12); }
.dt-v7 .dt-agg-type {
  font-size: 9px; padding: 1px 4px; border-radius: 8px;
  background: var(--embo); color: var(--em);
  font-weight: 800;
}

/* ── Active filter dot ── */
.dt-v7 .dt-flt-dot {
  display: inline-block; width: 5px; height: 5px; border-radius: 50%;
  background: var(--em); flex-shrink: 0;
}

/* ── Index column ── */
.dt-v7 .dt-idx { color: var(--t4); font-size: 11px; font-weight: 600; text-align: center; }

/* ── Empty state ── */
.dt-v7 .dt-empty {
  text-align: center; padding: 54px 0; color: var(--t4);
}
.dt-v7 .dt-empty i { font-size: 38px; display: block; margin-bottom: 10px; opacity: .4; }
.dt-v7 .dt-empty-text { font-size: 13px; }

/* ── Skeleton ── */
.dt-v7 .dt-skel {
  display: block; border-radius: var(--r1);
  background: linear-gradient(
    90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%
  );
  background-size: 400px 100%;
  animation: dt-skel-shimmer 1.5s infinite linear;
}
@keyframes dt-skel-shimmer {
  0%   { background-position: 400px 0; }
  100% { background-position: -400px 0; }
}

/* ── Pagination buttons ── */
.dt-v7 .dt-pg {
  min-width: 28px; height: 26px; padding: 0 6px;
  border: 1px solid var(--b2); border-radius: var(--r1);
  background: var(--bg2); color: var(--t3);
  font-size: 12px; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .12s; user-select: none;
}
.dt-v7 .dt-pg:hover:not(:disabled):not(.on) { border-color: var(--em); color: var(--em); }
.dt-v7 .dt-pg.on { background: var(--em); color: #fff; border-color: var(--em); }
.dt-v7 .dt-pg:disabled { opacity: .3; cursor: not-allowed; }
.dt-v7 .dt-pg:focus-visible { outline: 2px solid var(--em); outline-offset: 2px; }

/* ── Per-page chips ── */
.dt-v7 .dt-pp-chip {
  height: 24px; min-width: 30px; padding: 0 6px;
  border-radius: var(--r1); border: 1px solid var(--b2);
  background: var(--bg2); color: var(--t4); font-size: 11px;
  cursor: pointer; font-family: inherit; transition: all .12s;
  display: inline-flex; align-items: center; justify-content: center;
}
.dt-v7 .dt-pp-chip:hover { border-color: var(--em); color: var(--em); }
.dt-v7 .dt-pp-chip.on { background: var(--em); color: #fff; border-color: var(--em); font-weight: 700; }

/* ── Footer ── */
.dt-v7 .dt-footer {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--b1);
  background: var(--bg3);
}
.dt-v7 .dt-footer-info { font-size: 12px; color: var(--t4); display: flex; gap: 10px; align-items: center; }

/* ── Col visibility menu ── */
.dt-v7 .dt-col-menu {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 300;
  background: var(--bg2); border: 1px solid var(--b2);
  border-radius: var(--r2); padding: 5px 3px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 200px;
  animation: dt-fade .12s ease; max-height: 320px; overflow-y: auto;
}
.dt-v7 .dt-col-menu-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 8px 8px; border-bottom: 1px solid var(--b1); margin-bottom: 3px;
  font-size: 11px; color: var(--t4); font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
}
.dt-v7 .dt-col-menu-header button {
  font-size: 11px; color: var(--em); background: none; border: none;
  cursor: pointer; font-family: inherit; padding: 0;
}
.dt-v7 .dt-col-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; cursor: pointer; border-radius: var(--r1);
  font-size: 12px; color: var(--t2); transition: background .1s;
}
.dt-v7 .dt-col-item:hover { background: var(--bg3); }

/* ── Mobile cards ── */
.dt-v7 .dt-card-item {
  border: 1px solid var(--b2); border-radius: var(--r2);
  padding: 10px 14px; background: var(--bg2);
  margin-bottom: 8px; cursor: pointer;
  transition: box-shadow .15s;
}
.dt-v7 .dt-card-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.dt-v7 .dt-card-label { font-size: 10px; color: var(--t4); font-weight: 700; margin-bottom: 2px; }
.dt-v7 .dt-card-value { font-size: 13px; color: var(--t1); font-weight: 600; }

/* ── Dynamic multiselect header controls ── */
.dt-v7 .dt-ms-controls {
  display: flex; gap: 4px; margin-bottom: 6px;
}
.dt-v7 .dt-ms-ctrl-btn {
  flex: 1; padding: 3px 0; font-size: 10px; font-weight: 700;
  border: 1px solid var(--b2); border-radius: var(--r1);
  background: var(--bg3); color: var(--t4); cursor: pointer;
  font-family: inherit; transition: all .12s;
}
.dt-v7 .dt-ms-ctrl-btn:hover { border-color: var(--em); color: var(--em); background: var(--emb); }

.dt-v7 .dt-ms-count {
  margin-right: auto; font-size: 10px; color: var(--em);
  font-weight: 700; padding: 1px 6px; border-radius: 10px;
  background: var(--emb);
}

.dt-v7 .dt-ms-item-count {
  margin-right: auto; font-size: 10px; color: var(--t4);
  background: var(--bg3); padding: 1px 5px; border-radius: 8px;
  flex-shrink: 0;
}

.dt-v7 .dt-ms-empty {
  text-align: center; padding: 16px 0; color: var(--t4); font-size: 12px;
}

.dt-v7 .dt-ms-loading {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 16px 0; color: var(--t4); font-size: 12px;
}

/* Divider في footer الـ popup */
.dt-v7 .dt-flt-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 8px; padding-top: 6px;
  border-top: 1px solid var(--b1);
}
.dt-v7 .dt-ms-selected-count {
  font-size: 11px; color: var(--em); font-weight: 700;
}
  width: 1px; height: 20px; background: var(--b2); flex-shrink: 0;
}

/* ── Responsive ── */
@media (max-width: 639px) {
  .dt-v7 .dt-desktop { display: none !important; }
  .dt-v7 .dt-mobile  { display: block !important; }
}
@media (min-width: 640px) {
  .dt-v7 .dt-mobile { display: none !important; }
}
`;
  document.head.appendChild(el);
}

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getRawValue<T>(row: T, col: Column<T>): unknown {
  if (col.accessor) return col.accessor(row);
  // ✅ دعم dot-notation (مثل "party.name") إذا لم يكن هناك accessor
  if (col.key.includes('.')) {
    const parts = col.key.split('.');
    let val: unknown = row;
    for (const part of parts) {
      if (val == null || typeof val !== 'object') return undefined;
      val = (val as Record<string, unknown>)[part];
    }
    return val;
  }
  return (row as Record<string, unknown>)[col.key];
}

function getStringValue<T>(row: T, col: Column<T>): string {
  const v = getRawValue(row, col);
  return v == null ? '' : String(v).toLowerCase();
}

function encodeRange(min: string, max: string): string { return `${min}|${max}`; }
function decodeRange(val: string): RangeFilter {
  const idx = val.indexOf('|');
  if (idx === -1) return { min: val, max: '' };
  return { min: val.slice(0, idx), max: val.slice(idx + 1) };
}

// دالة مساعدة لمقارنة التواريخ بصيغة ISO
function compareDateStrings(dateStr1: string, dateStr2: string, operator: 'lt' | 'gt'): boolean {
  if (!dateStr1 || !dateStr2) return true;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  if (operator === 'lt') return d1 < d2;
  return d1 > d2;
}

function applyClientFilter<T>(
  data: T[], filters: FilterMap, columns: Column<T>[],
): T[] {
  const active = Object.entries(filters).filter(([, v]) => v !== '');
  if (!active.length) return data;

  return data.filter(row =>
    active.every(([key, rawVal]) => {
      const col = columns.find(c => c.key === key);
      if (!col?.filter) return true;
      const { type } = col.filter;
      const rv       = getStringValue(row, col);

      if (type === 'select') return rv === rawVal.toLowerCase();

      if (type === 'multiselect') {
        const selected = rawVal.split(',').filter(Boolean);
        return !selected.length || selected.includes(rv);
      }

      if (type === 'number') {
        const { min, max } = decodeRange(rawVal);
        const numRv = parseFloat(getStringValue(row, col));
        if (min && !isNaN(parseFloat(min)) && numRv < parseFloat(min)) return false;
        if (max && !isNaN(parseFloat(max)) && numRv > parseFloat(max)) return false;
        return true;
      }

      if (type === 'date') {
        const { min, max } = decodeRange(rawVal);
        const dateRv = getStringValue(row, col);
        if (min && !compareDateStrings(dateRv, min, 'lt')) return false;
        if (max && !compareDateStrings(dateRv, max, 'gt')) return false;
        return true;
      }

      // text
      return rv.includes(rawVal.toLowerCase());
    }),
  );
}

function applyGlobalSearch<T>(data: T[], query: string, columns: Column<T>[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  const cols = columns.filter(c => c.searchable !== false);
  return data.filter(row => cols.some(col => {
    const v = getRawValue(row, col);
    return String(v ?? '').toLowerCase().includes(q);
  }));
}

function applyClientSort<T>(data: T[], sort: SortState, columns: Column<T>[]): T[] {
  if (!sort.key || !sort.dir) return data;
  const col = columns.find(c => c.key === sort.key);
  if (!col) return data;
  return [...data].sort((a, b) => {
    const va = getRawValue(a, col);
    const vb = getRawValue(b, col);
    const cmp = (typeof va === 'number' && typeof vb === 'number')
      ? va - vb
      : String(va ?? '').localeCompare(String(vb ?? ''), 'ar-DZ');
    return sort.dir === 'desc' ? -cmp : cmp;
  });
}

function computeAggregate<T>(rows: T[], col: Column<T>, type: AggregateType): number | null {
  const nums = rows
    .map(r => {
      const v = getRawValue(r, col);
      return typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    })
    .filter(n => !isNaN(n));
  if (!nums.length) return null;
  switch (type) {
    case 'sum':   return nums.reduce((a, b) => a + b, 0);
    case 'avg':   return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min':   return Math.min(...nums);
    case 'max':   return Math.max(...nums);
    case 'count': return nums.length;
  }
}

function exportToCSV<T>(data: T[], columns: Column<T>[], name: string): void {
  const cols = columns.filter(c => typeof (c.exportHeader ?? c.header) === 'string');
  const hdr  = cols.map(c => `"${(c.exportHeader ?? c.header as string)}"`).join(',');
  const rows = data.map(r =>
    cols.map(c => `"${String(getRawValue(r, c) ?? '').replace(/"/g, '""')}"`).join(','),
  );
  const blob = new Blob(['\ufeff' + [hdr, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// تحسين buildPageNumbers للحالات الحدودية
function buildPageNumbers(cur: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  let s = Math.max(2, cur - 1);
  let e = Math.min(last - 1, cur + 1);
  // إذا كان cur قريبًا من البداية
  if (cur <= 3) {
    s = 2;
    e = 4;
  }
  // إذا كان cur قريبًا من النهاية
  if (cur >= last - 2) {
    s = last - 3;
    e = last - 1;
  }
  if (s > 2) pages.push('…');
  for (let p = s; p <= e; p++) pages.push(p);
  if (e < last - 1) pages.push('…');
  if (last !== 1 && pages[pages.length - 1] !== last) pages.push(last);
  return pages;
}

// إصلاح alignToCSS لـ RTL
function getTextAlign(align?: Column['align']): CSSProperties['textAlign'] {
  if (align === 'center') return 'center';
  if (align === 'end') return 'left';    // في RTL، النهاية تكون يسار
  return 'right';                         // البداية تكون يمين
}

// ════════════════════════════════════════════════════════════════════════════
// useColumnResize
// ════════════════════════════════════════════════════════════════════════════

function useColumnResize(initialWidths: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const startResize = useCallback((key: string, currentW: number, e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { key, startX: e.clientX, startW: currentW };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const { key, startX, startW } = drag.current;
      const delta = startX - e.clientX;
      setWidths(p => ({ ...p, [key]: Math.max(MIN_COL_WIDTH, startW + delta) }));
    };
    const onUp = () => { drag.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const resetWidth = useCallback((key: string) => {
    setWidths(p => { const n = { ...p }; delete n[key]; return n; });
  }, []);

  return { widths, startResize, resetWidth };
}

// ════════════════════════════════════════════════════════════════════════════
// useClickOutside (local hook لاستخدامه في FilterPopup)
// ════════════════════════════════════════════════════════════════════════════

function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  anchorRef: React.RefObject<HTMLElement>,
  onClose: () => void
) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, anchorRef, onClose]);
}

// ════════════════════════════════════════════════════════════════════════════
// FilterPopup — popup منسدلة لكل عمود
// ════════════════════════════════════════════════════════════════════════════

const FilterPopup = memo(function FilterPopup({
  col, value, onChange, anchorRef, onClose,
}: {
  col:       Column<Record<string, unknown>>;
  value:     string;
  onChange:  (v: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose:   () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // حساب موضع الـ popup
  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popupW = 230;
    let left = rect.right - popupW;
    if (left < 8) left = 8;
    setPos({ top: rect.bottom + 4, left });
  }, [anchorRef]);

  // إغلاق عند الضغط خارجاً باستخدام useClickOutside المحسن
  useClickOutside(popupRef, anchorRef, onClose);

  // إغلاق بـ Escape
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!col.filter) return null;
  const { type } = col.filter;
  const hasVal   = value !== '' && value !== '|';
  const header   = typeof col.header === 'string' ? col.header : '';

  const renderInput = () => {
    if (type === 'text') {
      return (
        <input
          className={`dt-fi ${hasVal ? 'act' : ''}`}
          type="text"
          value={value}
          autoFocus
          onChange={e => onChange(e.target.value)}
          placeholder="ابحث..."
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          className={`dt-fi ${hasVal ? 'act' : ''}`}
          value={value}
          autoFocus
          onChange={e => onChange(e.target.value)}
        >
          <option value="">الكل</option>
          {col.filter.options.map((o: { value: string; label: string }) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }

    if (type === 'number') {
      const { min, max } = decodeRange(value);
      return (
        <div className="dt-range-row">
          <input
            className={`dt-fi ${min ? 'act' : ''}`}
            type="number"
            value={min}
            placeholder="من"
            onChange={e => onChange(encodeRange(e.target.value, max))}
          />
          <span style={{ color: 'var(--t4)', fontSize: 12, flexShrink: 0 }}>—</span>
          <input
            className={`dt-fi ${max ? 'act' : ''}`}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 3, fontWeight: 600 }}>من</div>
            <input
              className={`dt-fi ${min ? 'act' : ''}`}
              type="date"
              value={min}
              onChange={e => onChange(encodeRange(e.target.value, max))}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 3, fontWeight: 600 }}>إلى</div>
            <input
              className={`dt-fi ${max ? 'act' : ''}`}
              type="date"
              value={max}
              onChange={e => onChange(encodeRange(min, e.target.value))}
            />
          </div>
        </div>
      );
    }

    if (type === 'multiselect') {
      const selected = value ? value.split(',').filter(Boolean) : [];
      const [search, setSearch] = useState('');
      const filtered = col.filter.options.filter((o: { value: string; label: string }) =>
        !search || o.label.toLowerCase().includes(search.toLowerCase())
      );
      return (
        <>
          <input
            className="dt-fi"
            type="text"
            placeholder="بحث..."
            value={search}
            autoFocus
            onChange={e => setSearch(e.target.value)}
          />
          <div className="dt-ms-list">
            {filtered.map((o: { value: string; label: string }) => {
              const on = selected.includes(o.value);
              return (
                <div
                  key={o.value}
                  className={`dt-ms-item ${on ? 'on' : ''}`}
                  onClick={() => {
                    const next = on
                      ? selected.filter(v => v !== o.value)
                      : [...selected, o.value];
                    onChange(next.join(','));
                  }}
                >
                  <input type="checkbox" checked={on} readOnly style={{ accentColor: 'var(--em)' }} />
                  {o.label}
                </div>
              );
            })}
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div
      ref={popupRef}
      className="dt-flt-popup"
      style={{ top: pos.top, left: pos.left, width: 230 }}
    >
      {header && (
        <div className="dt-flt-popup-title">{header}</div>
      )}
      {renderInput()}
      {hasVal && (
        <div className="dt-flt-footer">
          <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }}>
            مسح الفلتر ✕
          </button>
        </div>
      )}
    </div>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// SkeletonRows
// ════════════════════════════════════════════════════════════════════════════

function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => {
            const w = SKELETON_WIDTHS[(r * cols + c) % SKELETON_WIDTHS.length];
            return (
              <td key={c} style={{ padding: '9px 10px' }}>
                <span
                  className="dt-skel"
                  style={{
                    display: 'block', height: 13,
                    width: `${w}%`,
                    animationDelay: `${(r * 0.08 + c * 0.03).toFixed(2)}s`,
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EditInput — مع تحسين التركيز التلقائي
// ════════════════════════════════════════════════════════════════════════════

const EditInput = memo(function EditInput({
  def, value, onChange, onCommit, onCancel,
}: {
  def:      EditDef;
  value:    string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    // التركيز التلقائي بعد التصيير
    if (inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement && inputRef.current.type !== 'date') {
        inputRef.current.select();
      }
    }
  }, []);

  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); onCommit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  if (def.type === 'select') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        className="dt-edit-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKey}
      >
        {def.options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  const t = def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text';
  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className="dt-edit-input"
      type={t}
      value={value}
      min={def.type === 'number' ? def.min : undefined}
      max={def.type === 'number' ? def.max : undefined}
      step={def.type === 'number' ? (def.step ?? 'any') : undefined}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKey}
    />
  );
});

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function DataTable<T = Record<string, unknown>>({
  data,
  columns,
  rowKey,
  loading        = false,
  error          = null,
  pagination,
  onFilterChange,
  onSortChange,
  onSearchChange,
  selectable     = false,
  onSelect,
  bulkActions,
  onCellEdit,
  expandable     = false,
  renderExpanded,
  isExpandable,
  showAggregates = false,
  aggregateLabel,
  searchable     = false,
  searchPlaceholder = 'بحث...',
  showIndex      = false,
  indexHeader    = '#',
  rowActions,
  headerActions,
  title,
  emptyText      = 'لا توجد بيانات',
  emptyAction,
  compact        = false,
  exportable     = false,
  exportName     = 'export',
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {

  useEffect(() => { injectCSS(); }, []);

  // ── Responsive ─────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // ── Column visibility ────────────────────────────────────────────────────
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(
    () => new Set(columns.filter(c => c.defaultHidden).map(c => c.key)),
  );
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
        setColMenuOpen(false);
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [colMenuOpen]);

  const toggleColVisibility = useCallback((key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const nonIndexCols = useMemo(() => columns, [columns]);
  const allHidden    = nonIndexCols.length > 0 && nonIndexCols.every(c => hiddenKeys.has(c.key));
  const someHidden   = !allHidden && nonIndexCols.some(c => hiddenKeys.has(c.key));

  const toggleCollapseAll = useCallback(() => {
    if (allHidden) {
      setHiddenKeys(new Set());
    } else {
      const firstKey = nonIndexCols[0]?.key;
      setHiddenKeys(new Set(nonIndexCols.filter(c => c.key !== firstKey).map(c => c.key)));
    }
    setColMenuOpen(false);
  }, [allHidden, nonIndexCols]);

  // ── Column resize ────────────────────────────────────────────────────────
  const initialWidthsRef = useRef<Record<string, number>>(
    Object.fromEntries(columns.filter(c => c.width).map(c => [c.key, c.width!])),
  );
  const { widths: colWidths, startResize, resetWidth } = useColumnResize(initialWidthsRef.current);

  // ── Global search ────────────────────────────────────────────────────────
  const [globalQuery, setGlobalQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => { onSearchChangeRef.current = onSearchChange; }, [onSearchChange]);

  const handleSearchChange = useCallback((v: string) => {
    setGlobalQuery(v);
    if (!pagination) setLocalPage(1);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onSearchChangeRef.current?.(v);
    }, SEARCH_DEBOUNCE);
  }, [pagination]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  // ── Column filters ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterMap>({});
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => { onFilterChangeRef.current = onFilterChange; }, [onFilterChange]);

  const isServerPaged = !!pagination;

  const handleFilterChange = useCallback((key: string, val: string) => {
    setFilters(prev => {
      const next = { ...prev };
      val ? (next[key] = val) : delete next[key];
      Promise.resolve().then(() => onFilterChangeRef.current?.(next));
      return next;
    });
    if (!isServerPaged) setLocalPage(1);
  }, [isServerPaged]);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setGlobalQuery('');
    if (!isServerPaged) setLocalPage(1);
    onFilterChangeRef.current?.({});
    if (onSearchChangeRef.current) onSearchChangeRef.current('');
  }, [isServerPaged]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(v => v && v !== '|').length + (globalQuery ? 1 : 0),
    [filters, globalQuery],
  );

  // ── open filter popup ────────────────────────────────────────────────────
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const filterBtnRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

  const getFilterBtnRef = (key: string): React.RefObject<HTMLButtonElement> => {
    if (!filterBtnRefs.current[key]) {
      filterBtnRefs.current[key] = React.createRef<HTMLButtonElement>();
    }
    return filterBtnRefs.current[key];
  };

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });
  const onSortChangeRef = useRef(onSortChange);
  useEffect(() => { onSortChangeRef.current = onSortChange; }, [onSortChange]);

  const handleSortToggle = useCallback((key: string) => {
    setSort(prev => {
      const next: SortState =
        prev.key !== key       ? { key, dir: 'asc'  } :
        prev.dir === 'asc'     ? { key, dir: 'desc' } :
        /* else */               { key: null, dir: null };
      onSortChangeRef.current?.(key, next.dir);
      return next;
    });
  }, []);

  // ── Client-side data processing ───────────────────────────────────────────
  const isClientFiltered = !onFilterChange;
  const isClientSorted   = !onSortChange;

  const processedData = useMemo(() => {
    let r = data;
    if (isClientFiltered) r = applyClientFilter(r, filters, columns);
    if (searchable && globalQuery) r = applyGlobalSearch(r, globalQuery, columns);
    if (isClientSorted)  r = applyClientSort(r, sort, columns);
    return r;
  }, [data, filters, globalQuery, sort, columns, isClientFiltered, isClientSorted, searchable]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [localPage,    setLocalPage]    = useState(1);
  const [localPerPage, setLocalPerPage] = useState(15);

  const paginationRef = useRef(pagination);
  useEffect(() => { paginationRef.current = pagination; }, [pagination]);

  const lastPageRef = useRef(1);

  const curPage  = isServerPaged ? pagination!.page    : localPage;
  const perPage  = isServerPaged ? pagination!.perPage : localPerPage;
  const total    = isServerPaged ? pagination!.total   : processedData.length;
  const lastPage = isServerPaged
    ? pagination!.lastPage
    : Math.max(1, Math.ceil(processedData.length / localPerPage));

  useEffect(() => { lastPageRef.current = lastPage; }, [lastPage]);

  const goToPage = useCallback((p: number) => {
    const c = Math.max(1, Math.min(p, lastPageRef.current));
    if (isServerPaged) paginationRef.current!.onPage(c);
    else setLocalPage(c);
  }, [isServerPaged]);

  const changePerPage = useCallback((n: number) => {
    if (isServerPaged) { paginationRef.current!.onPerPage(n); paginationRef.current!.onPage(1); }
    else { setLocalPerPage(n); setLocalPage(1); }
  }, [isServerPaged]);

  const displayData = useMemo(() => {
    if (isServerPaged) return processedData;
    const s = (localPage - 1) * localPerPage;
    return processedData.slice(s, s + localPerPage);
  }, [processedData, isServerPaged, localPage, localPerPage]);

  const pageNumbers = useMemo(() => buildPageNumbers(curPage, lastPage), [curPage, lastPage]);

  // ── Visible columns ──────────────────────────────────────────────────────
  const visibleCols = useMemo(
    () => columns.filter(c => !hiddenKeys.has(c.key) && !(isMobile && c.hideOnMobile)),
    [columns, hiddenKeys, isMobile],
  );

  const totalColSpan =
    visibleCols.length
    + (selectable ? 1 : 0)
    + (expandable ? 1 : 0)
    + (showIndex  ? 1 : 0)
    + (rowActions ? 1 : 0);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const [aggTypes, setAggTypes] = useState<Record<string, AggregateType>>(() =>
    Object.fromEntries(
      columns
        .filter(c => c.aggregate && typeof c.aggregate === 'string')
        .map(c => [c.key, c.aggregate as AggregateType]),
    ),
  );

  const aggregates = useMemo(() => {
    if (!showAggregates) return null;
    const r: Record<string, { value: number | null; type: AggregateType }> = {};
    for (const col of columns) {
      if (!col.aggregate) continue;
      if (typeof col.aggregate === 'function') {
        const v = col.aggregate(processedData);
        r[col.key] = { value: v as number | null, type: 'sum' };
      } else {
        const type = aggTypes[col.key] ?? col.aggregate;
        r[col.key] = { value: computeAggregate(processedData, col, type), type };
      }
    }
    return r;
  }, [showAggregates, processedData, columns, aggTypes]);

  const cycleAgg = useCallback((key: string) => {
    setAggTypes(prev => {
      const cur = prev[key] ?? 'sum';
      const idx = AGG_CYCLE.indexOf(cur);
      return { ...prev, [key]: AGG_CYCLE[(idx + 1) % AGG_CYCLE.length] };
    });
  }, []);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string | number>>(new Set());
  const indRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const displayKeys = useMemo(
    () => displayData.map((r, i) => rowKey(r, i)),
    [displayData, rowKey],
  );
  const allChecked  = displayKeys.length > 0 && displayKeys.every(k => selectedKeys.has(k));
  const someChecked = !allChecked && displayKeys.some(k => selectedKeys.has(k));

  useEffect(() => {
    if (indRef.current) indRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAll = useCallback(() => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      allChecked ? displayKeys.forEach(k => next.delete(k)) : displayKeys.forEach(k => next.add(k));
      return next;
    });
  }, [allChecked, displayKeys]);

  const toggleRow = useCallback((key: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  useEffect(() => {
    if (!onSelectRef.current) return;
    const rows = data.filter((r, i) => selectedKeys.has(rowKey(r, i)));
    onSelectRef.current(rows);
  }, [selectedKeys, data, rowKey]);

  // ── Expanded rows ─────────────────────────────────────────────────────────
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string | number>>(new Set());

  const toggleExpanded = useCallback((key: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // ── Inline editing ────────────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const onCellEditRef = useRef(onCellEdit);
  useEffect(() => { onCellEditRef.current = onCellEdit; }, [onCellEdit]);

  const startEdit = useCallback((rKey: string | number, colKey: string, rawVal: unknown, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCell({ rowKey: rKey, colKey, value: rawVal == null ? '' : String(rawVal) });
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell || !onCellEditRef.current) { setEditingCell(null); return; }
    const { rowKey: rKey, colKey, value } = editingCell;
    const rowIdx = data.findIndex((r, i) => rowKey(r, i) === rKey);
    if (rowIdx < 0) { setEditingCell(null); return; }
    const col      = columns.find(c => c.key === colKey);
    const oldValue = col ? getRawValue(data[rowIdx], col) : undefined;
    onCellEditRef.current({ row: data[rowIdx], rowIndex: rowIdx, colKey, oldValue, newValue: value });
    setEditingCell(null);
  }, [editingCell, data, rowKey, columns]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  // ── Render dims ───────────────────────────────────────────────────────────
  const ROW_H  = compact ? 34 : 44;
  const CELL_P = compact ? '4px 10px' : '9px 10px';

  // ── Selected rows ─────────────────────────────────────────────────────────
  const selectedRows = useMemo(
    () => data.filter((r, i) => selectedKeys.has(rowKey(r, i))),
    [data, rowKey, selectedKeys],
  );

  const hiddenCount = hiddenKeys.size;

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="dt-v7">

      {/* ══ TOOLBAR ══════════════════════════════════════════════════════════ */}
      <div className="dt-toolbar">

        <div className="dt-toolbar-left">
          {title && (
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>
              {title}
            </div>
          )}

          {searchable && (
            <div className="srch dt-search">
              <span className="srch-ic">
                <i className="ti ti-search" aria-hidden="true" />
              </span>
              <input
                type="text"
                value={globalQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              {globalQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  aria-label="مسح البحث"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--t4)', fontSize: 14, display: 'flex',
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          )}

          {activeFilterCount > 0 && (
            <span className="dt-filter-badge">
              <i className="ti ti-filter" style={{ fontSize: 10 }} aria-hidden="true" />
              {activeFilterCount}
              <button onClick={clearAllFilters} aria-label="مسح الفلاتر">×</button>
            </span>
          )}
        </div>

        <div className="dt-toolbar-right">
          {headerActions}

          {headerActions && <div className="dt-divider" />}

          <div ref={colMenuRef} style={{ position: 'relative' }}>
            <button
              className={`dt-tbtn ${hiddenCount > 0 ? 'on' : ''}`}
              onClick={() => setColMenuOpen(p => !p)}
              aria-expanded={colMenuOpen}
              aria-label="إظهار / إخفاء الأعمدة"
              title="إدارة الأعمدة"
            >
              <i className="ti ti-layout-columns" style={{ fontSize: 13 }} aria-hidden="true" />
              {hiddenCount > 0 ? `الأعمدة (${hiddenCount})` : 'الأعمدة'}
            </button>
            {colMenuOpen && (
              <div className="dt-col-menu" role="menu">
                <div className="dt-col-menu-header">
                  <span>الأعمدة</span>
                  <button
                    onClick={toggleCollapseAll}
                    title={allHidden ? 'إظهار الكل' : 'إخفاء الكل'}
                  >
                    {allHidden
                      ? <><i className="ti ti-eye" style={{ fontSize: 11 }} /> إظهار الكل</>
                      : <><i className="ti ti-eye-off" style={{ fontSize: 11 }} /> إخفاء الكل</>
                    }
                  </button>
                </div>
                {nonIndexCols.map(col => (
                  <label key={col.key} className="dt-col-item" role="menuitemcheckbox"
                         aria-checked={!hiddenKeys.has(col.key)}>
                    <input
                      type="checkbox"
                      style={{ accentColor: 'var(--em)' }}
                      checked={!hiddenKeys.has(col.key)}
                      onChange={() => toggleColVisibility(col.key)}
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            )}
          </div>

          {exportable && (
            <button
              className="dt-tbtn"
              onClick={() => exportToCSV(processedData, columns, exportName)}
              aria-label="تصدير CSV"
              title="تصدير إلى CSV"
            >
              <i className="ti ti-table-export" style={{ fontSize: 13 }} aria-hidden="true" />
              تصدير
            </button>
          )}

          <div className="dt-divider" />

          <div style={{ display: 'flex', gap: 2 }}>
            {PER_PAGE_OPTIONS.map(n => (
              <button
                key={n}
                className={`dt-pp-chip ${perPage === n ? 'on' : ''}`}
                onClick={() => changePerPage(n)}
                aria-label={`${n} صف`}
                aria-pressed={perPage === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BULK ACTIONS ═════════════════════════════════════════════════════ */}
      {selectable && selectedKeys.size > 0 && bulkActions && (
        <div className="dt-bulk" role="toolbar" aria-label="إجراءات المحدد">
          <span className="dt-bulk-count">
            <i className="ti ti-check" aria-hidden="true" style={{ marginLeft: 4 }} />
            {selectedKeys.size} محدد
          </span>
          {bulkActions(selectedRows, clearSelection)}
        </div>
      )}

      {/* ══ ERROR ════════════════════════════════════════════════════════════ */}
      {error && (
        <div className="dt-error" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ══ TABLE — Desktop ══════════════════════════════════════════════════ */}
      <div className="dt-table-wrap dt-desktop">
        <table role="grid" aria-rowcount={total}>
          <colgroup>
            {expandable  && <col style={{ width: 38 }} />}
            {selectable  && <col style={{ width: 38 }} />}
            {showIndex   && <col style={{ width: 44 }} />}
            {visibleCols.map(col => (
              <col key={col.key} style={{
                width:    colWidths[col.key] ?? col.width    ?? undefined,
                minWidth: col.minWidth ?? 80,
              }} />
            ))}
            {rowActions  && <col style={{ width: 90 }} />}
          </colgroup>

          <thead>
            <tr>
              {expandable && (
                <th scope="col" aria-label="توسيع" style={{ width: 38, textAlign: 'center' }} />
              )}
              {selectable && (
                <th scope="col" style={{ width: 38, textAlign: 'center' }}>
                  <input
                    ref={indRef}
                    type="checkbox"
                    style={{ accentColor: 'var(--em)' }}
                    checked={allChecked} onChange={toggleAll}
                    aria-label="تحديد الكل"
                  />
                </th>
              )}
              {showIndex && (
                <th scope="col" style={{ textAlign: 'center', fontSize: 10 }}>
                  {indexHeader}
                </th>
              )}

              {visibleCols.map(col => {
                const isActive  = sort.key === col.key;
                const canSort   = col.sortable !== false;
                const colW      = colWidths[col.key] ?? col.width;
                const hasFilter = !!col.filter;
                const filterVal = filters[col.key] ?? '';
                const hasVal    = filterVal !== '' && filterVal !== '|';
                const btnRef    = hasFilter ? getFilterBtnRef(col.key) : null;
                const isFilterOpen = openFilterKey === col.key;

                return (
                  <th

                    key={col.key}
                    scope="col"
                    aria-sort={canSort
                      ? (isActive ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')
                      : undefined}
                    className={
                      col.sticky === 'start' ? 'dt-ss' :
                      col.sticky === 'end'   ? 'dt-se' : ''
                    }
                    style={{
                      textAlign: getTextAlign(col.align),
                      width:    colW ?? undefined,
                      minWidth: col.minWidth ?? 80,
                    }}

                  >
                    <div className="dt-th-inner">
                      <div className="dt-th-label">
                        {hasFilter && (
                        <button
                          ref={btnRef as React.RefObject<HTMLButtonElement>}
                          className={`dt-flt-btn ${hasVal ? 'has-val' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            setOpenFilterKey(isFilterOpen ? null : col.key);
                          }}
                          aria-label={`فلتر ${col.header}`}
                          title="فلتر"
                          type="button"
                        >
                          <i className="ti ti-filter" style={{ fontSize: 11 }} aria-hidden="true" />
                        </button>
                      )}
                        {canSort ? (
                          <button
                            className="dt-sort-btn"
                            onClick={() => handleSortToggle(col.key)}
                            style={{ color: isActive ? 'var(--em)' : 'var(--t4)' }}
                          >
                            {col.header}
                            <span aria-hidden="true" style={{
                              fontSize: isActive ? 11 : 10,
                              opacity: isActive ? 1 : .25,
                            }}>
                              {isActive ? (sort.dir === 'asc' ? '↑' : '↓') : '⇅'}
                            </span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--t4)' }}>{col.header}</span>
                        )}
                      </div>


                    </div>

                    <div
                      className="dt-rh"
                      onMouseDown={e => startResize(col.key, colW ?? 120, e)}
                      onDoubleClick={() => resetWidth(col.key)}
                      title="اسحب لتغيير العرض"
                      aria-hidden="true"
                    />

                    {isFilterOpen && btnRef && (
                      <FilterPopup
                        col={col as Column<Record<string, unknown>>}
                        value={filterVal}
                        onChange={v => handleFilterChange(col.key, v)}
                        anchorRef={btnRef}
                        onClose={() => setOpenFilterKey(null)}
                      />
                    )}
                  </th>
                );
              })}

              {rowActions && (
                <th scope="col" style={{ textAlign: 'center' }}>إجراءات</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <SkeletonRows rows={Math.min(perPage, 8)} cols={totalColSpan} />
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan}>
                  <div className="dt-empty">
                    <i className="ti ti-inbox" aria-hidden="true" />
                    <span className="dt-empty-text">{emptyText}</span>
                    {emptyAction && <div style={{ marginTop: 12 }}>{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              displayData.map((row, idx) => {
                const rKey       = rowKey(row, idx);
                const isSelected = selectedKeys.has(rKey);
                const isExpanded = expandedKeys.has(rKey);
                const canExpand  = expandable && (isExpandable ? isExpandable(row) : true);
                const globalIdx  = (curPage - 1) * perPage + idx + 1;

                return (
                  <React.Fragment key={rKey}>
                    <tr
                      role="row"
                      aria-selected={selectable ? isSelected : undefined}
                      aria-expanded={expandable ? isExpanded : undefined}
                      className={[
                        onRowClick ? 'dt-row-click' : '',
                        rowClassName?.(row) ?? '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => onRowClick?.(row)}
                      style={{
                        height: ROW_H,
                        background: isSelected ? 'var(--emb)' : 'var(--bg2)',
                      }}
                    >
                      {expandable && (
                        <td style={{ textAlign: 'center', padding: '0 8px' }}>
                          {canExpand && (
                            <button
                              className={`dt-exp-btn ${isExpanded ? 'open' : ''}`}
                              onClick={e => toggleExpanded(rKey, e)}
                              aria-label={isExpanded ? 'إخفاء' : 'عرض'}
                            >
                              <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                                 aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      )}

                      {selectable && (
                        <td style={{ textAlign: 'center', padding: '0 10px' }}
                            onClick={e => toggleRow(rKey, e)}>
                          <input type="checkbox"
                                 style={{ accentColor: 'var(--em)' }}
                                 checked={isSelected} onChange={() => {}}
                                 aria-label={`تحديد الصف ${globalIdx}`} />
                        </td>
                      )}

                      {showIndex && <td className="dt-idx">{globalIdx}</td>}

                      {visibleCols.map(col => {
                        const isEditing = editingCell?.rowKey === rKey && editingCell?.colKey === col.key;
                        const rawVal    = getRawValue(row, col as Column<T>);
                        const canEdit   = !!col.editable && !!onCellEdit;

                        return (
                          <td
                            key={col.key}
                            className={[
                              col.sticky === 'start' ? 'dt-ss' :
                              col.sticky === 'end'   ? 'dt-se' : '',
                              canEdit && !isEditing ? 'dt-editable' : '',
                            ].filter(Boolean).join(' ')}
                            style={{
                              textAlign: getTextAlign(col.align),
                              padding: CELL_P,
                              background: isEditing
                                ? 'rgba(var(--em-rgb, 0, 150, 136), 0.08)'
                                : 'inherit',
                              whiteSpace: isEditing ? 'normal' : 'nowrap',
                            }}
                            onClick={canEdit && !isEditing
                              ? e => startEdit(rKey, col.key, rawVal, e)
                              : undefined}
                            title={canEdit && !isEditing ? 'انقر للتعديل' : undefined}
                          >
                            {isEditing && col.editable ? (
                              <EditInput
                                def={col.editable}
                                value={editingCell!.value}
                                onChange={v => setEditingCell(p => p ? { ...p, value: v } : null)}
                                onCommit={commitEdit}
                                onCancel={cancelEdit}
                              />
                            ) : col.render ? (
                              col.render(row, idx)
                            ) : (
                              String(rawVal ?? '—')
                            )}
                          </td>
                        );
                      })}

                      {rowActions && (
                        <td style={{ textAlign: 'center', padding: '0 6px', whiteSpace: 'nowrap' }}
                            onClick={e => e.stopPropagation()}>
                          {rowActions(row)}
                        </td>
                      )}
                    </tr>

                    {isExpanded && renderExpanded && (
                      <tr>
                        <td colSpan={totalColSpan} className="dt-exp-td">
                          <div className="dt-exp-inner">
                            {renderExpanded(row, idx)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {showAggregates && aggregates && !loading && processedData.length > 0 && (
            <tfoot>
              <tr className="dt-agg-row" aria-label="صف الإجماليات">
                {expandable && <td />}
                {selectable && <td />}
                {showIndex  && <td />}

                {visibleCols.map((col, ci) => {
                  const agg = aggregates[col.key];

                  if (ci === 0) {
                    return (
                      <td key={col.key} style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          color: 'var(--em)', fontWeight: 800, fontSize: 11,
                        }}>
                          <i className="ti ti-math-function" style={{ fontSize: 12 }} aria-hidden="true" />
                          {aggregateLabel ?? 'Σ'}
                        </span>
                      </td>
                    );
                  }

                  if (!agg || agg.value == null) return <td key={col.key} />;

                  const canCycle = typeof col.aggregate === 'string';
                  const formatted = col.aggregateFormat
                    ? col.aggregateFormat(agg.value, agg.type)
                    : agg.value.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                  return (
                    <td
                      key={col.key}
                      style={{ textAlign: getTextAlign(col.align), direction: 'ltr' }}
                    >
                      {canCycle ? (
                        <span
                          className="dt-agg-cell"
                          onClick={() => cycleAgg(col.key)}
                          title="انقر لتغيير نوع الإجمالي"
                          role="button"
                          tabIndex={0}
                        >
                          <span className="dt-agg-type">{AGG_LABELS[agg.type]}</span>
                          {formatted}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--em)', fontWeight: 700 }}>{formatted}</span>
                      )}
                    </td>
                  );
                })}

                {rowActions && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ══ CARDS — Mobile ═══════════════════════════════════════════════════ */}
      <div className="dt-mobile" style={{ padding: '8px 10px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ height: 90 }}>
                <span className="dt-skel" style={{
                  display: 'block', height: '100%', borderRadius: 'var(--r2)',
                  animationDelay: `${(i * 0.12).toFixed(2)}s`,
                }} />
              </div>
            ))}
          </div>
        ) : displayData.length === 0 ? (
          <div className="dt-empty">
            <i className="ti ti-inbox" aria-hidden="true" />
            <span className="dt-empty-text">{emptyText}</span>
          </div>
        ) : (
          displayData.map((row, idx) => {
            const rKey     = rowKey(row, idx);
            const cardCols = visibleCols.slice(0, 4);
            return (
              <div
                key={rKey}
                className="dt-card-item"
                onClick={() => onRowClick?.(row)}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
                  {cardCols.map(col => (
                    <div key={col.key}>
                      <div className="dt-card-label">{col.header}</div>
                      <div className="dt-card-value">
                        {col.render ? col.render(row, idx) : String(getRawValue(row, col as Column<T>) ?? '—')}
                      </div>
                    </div>
                  ))}
                </div>
                {rowActions && (
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}
                       onClick={e => e.stopPropagation()}>
                    {rowActions(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <div className="dt-footer">
        <div className="dt-footer-info" aria-live="polite">
          {loading ? (
            <i className="ti ti-loader-2" aria-hidden="true"
               style={{ animation: 'dt-spin .8s linear infinite', fontSize: 14 }} />
          ) : total > 0 ? (
            <span>
              {((curPage - 1) * perPage + 1).toLocaleString('ar-DZ')}
              {'–'}
              {Math.min(curPage * perPage, total).toLocaleString('ar-DZ')}
              {' من '}
              <strong style={{ color: 'var(--t1)' }}>
                {total.toLocaleString('ar-DZ')}
              </strong>
            </span>
          ) : null}

          {selectedKeys.size > 0 && (
            <span className="bx be">
              {selectedKeys.size.toLocaleString('ar-DZ')} محدد
            </span>
          )}
        </div>

        {lastPage > 1 && (
          <nav aria-label="التنقل بين الصفحات"
               style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="dt-pg" disabled={curPage <= 1}
                    onClick={() => goToPage(1)} aria-label="الصفحة الأولى">«</button>
            <button className="dt-pg" disabled={curPage <= 1}
                    onClick={() => goToPage(curPage - 1)} aria-label="السابقة">‹</button>

            {pageNumbers.map((p, i) =>
              p === '…' ? (
                <span key={`s${i}`} aria-hidden="true"
                      style={{ padding: '0 4px', color: 'var(--t4)', fontSize: 13 }}>…</span>
              ) : (
                <button
                  key={p}
                  className={`dt-pg ${p === curPage ? 'on' : ''}`}
                  onClick={() => goToPage(p as number)}
                  aria-label={`الصفحة ${p}`}
                  aria-current={p === curPage ? 'page' : undefined}
                >
                  {(p as number).toLocaleString('ar-DZ')}
                </button>
              ),
            )}

            <button className="dt-pg" disabled={curPage >= lastPage}
                    onClick={() => goToPage(curPage + 1)} aria-label="التالية">›</button>
            <button className="dt-pg" disabled={curPage >= lastPage}
                    onClick={() => goToPage(lastPage)} aria-label="الأخيرة">»</button>
          </nav>
        )}
      </div>

    </div>
  );
}

export default DataTable;
