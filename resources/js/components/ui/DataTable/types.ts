// ════════════════════════════════════════════════════════════════════════════
// DataTable/types.ts
// جميع الأنواع المشتركة — يُستورَد من هنا في كل ملفات المكوّن
// ════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';

// ─── Filter ───────────────────────────────────────────────────────────────────

export type FilterDef =
  | { type: 'text' }
  | { type: 'number' }
  | { type: 'date' }
  | { type: 'select';              options: readonly { value: string; label: string }[] }
  | { type: 'multiselect';         options: readonly { value: string; label: string }[] }
  | { type: 'dynamic-multiselect'; labelFormatter?: (v: string) => string };

export type RangeFilter = { min: string; max: string };

// ─── Aggregate ────────────────────────────────────────────────────────────────

export type AggregateType = 'sum' | 'avg' | 'min' | 'max' | 'count';

export const AGG_CYCLE: AggregateType[] = ['sum', 'avg', 'min', 'max', 'count'];
export const AGG_LABELS: Record<AggregateType, string> = {
  sum: 'Σ', avg: 'Ø', min: '↓', max: '↑', count: '#',
};

// ─── Edit ─────────────────────────────────────────────────────────────────────

export type EditDef =
  | { type: 'text' }
  | { type: 'number'; min?: number; max?: number; step?: number }
  | { type: 'date' }
  | { type: 'select'; options: readonly { value: string; label: string }[] };

// ─── Column ───────────────────────────────────────────────────────────────────

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

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationConfig {
  page:      number;
  perPage:   number;
  total:     number;
  lastPage:  number;
  onPage:    (p: number) => void;
  onPerPage: (n: number) => void;
}

// ─── Cell edit ────────────────────────────────────────────────────────────────

export interface CellEditPayload<T> {
  row:      T;
  rowIndex: number;
  colKey:   string;
  oldValue: unknown;
  newValue: string;
}

// ─── DataTable props ─────────────────────────────────────────────────────────

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

  /** كل البيانات غير المفلترة (لـ dynamic-multiselect) */
  allData?:         T[];
}

// ─── Internal ─────────────────────────────────────────────────────────────────

export interface SortState   { key: string | null; dir: 'asc' | 'desc' | null; }
export interface EditingCell { rowKey: string | number; colKey: string; value: string; }
export type FilterMap = Record<string, string>;

// ─── Constants ────────────────────────────────────────────────────────────────

export const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100] as const;
export const SKELETON_WIDTHS  = [70, 55, 82, 60, 75, 50, 88, 63, 72, 58] as const;
export const MIN_COL_WIDTH    = 60;
export const SEARCH_DEBOUNCE  = 180;
