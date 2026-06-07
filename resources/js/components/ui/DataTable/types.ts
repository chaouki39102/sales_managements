// DataTable/types.ts  —  v10.0
//
// 🆕 RowGroup          — تجميع الصفوف حسب عمود
// 🆕 PinnedColumn      — تثبيت الأعمدة ديناميكياً من قِبَل المستخدم
// 🆕 CellValidation    — قواعد التحقق لكل خلية
// 🆕 EditState         — حالة مجمّعة للـ Batch Edit + Undo/Redo
// 🆕 KeyboardNavState  — تتبّع الخلية النشطة (keyboard navigation)
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

// ─── 🆕 Cell Validation ───────────────────────────────────────────────────────

export interface CellValidationRule {
  required?:   boolean;
  min?:        number;
  max?:        number;
  minLength?:  number;
  maxLength?:  number;
  pattern?:    RegExp;
  custom?:     (value: string, row: Record<string, unknown>) => string | null;
  /** رسالة خطأ مخصصة لكل قاعدة */
  messages?: {
    required?:  string;
    min?:       string;
    max?:       string;
    minLength?: string;
    maxLength?: string;
    pattern?:   string;
  };
}

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
  /** منع السحب لإعادة الترتيب */
  disableDrag?:     boolean;
  /** منع التثبيت الديناميكي */
  disablePin?:      boolean;
  /** قواعد التحقق للخلية عند التعديل */
  validation?:      CellValidationRule;
  /** عمود التجميع (للعرض في رأس المجموعة) */
  groupRenderer?:   (groupValue: unknown, rows: T[]) => ReactNode;
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

export interface SortState {
  key: string | null;
  dir: 'asc' | 'desc' | null;
}

export interface MultiSortEntry {
  key: string;
  dir: 'asc' | 'desc';
}
export type MultiSortState = MultiSortEntry[];

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

// ─── 🆕 Batch Edit ────────────────────────────────────────────────────────────

export interface PendingEdit {
  rowKey:   string | number;
  colKey:   string;
  oldValue: string;
  newValue: string;
}

export interface BatchEditState {
  /** التعديلات المعلّقة (قبل الحفظ) */
  pending:  Record<string, Record<string, string>>;  // [rowKey][colKey] = newValue
  /** stack للـ undo */
  history:  PendingEdit[][];
  /** stack للـ redo */
  future:   PendingEdit[][];
}

// ─── 🆕 Row Grouping ─────────────────────────────────────────────────────────

export interface RowGroupConfig {
  /** مفتاح العمود الذي يُجمَّع حسبه */
  key: string;
  /** هل المجموعات مطوية افتراضياً */
  defaultCollapsed?: boolean;
  /** ترتيب المجموعات */
  sortGroups?: 'asc' | 'desc' | null;
  /** عرض إجماليات جزئية لكل مجموعة */
  showSubTotals?: boolean;
}

export interface RowGroup<T> {
  value:     unknown;
  label:     string;
  rows:      T[];
  collapsed: boolean;
}

// ─── 🆕 Column Pinning ────────────────────────────────────────────────────────

export interface ColumnPinConfig {
  /** أعمدة مثبتة في البداية (start/right في RTL) */
  start?: string[];
  /** أعمدة مثبتة في النهاية (end/left في RTL) */
  end?:   string[];
}

// ─── 🆕 Keyboard Navigation ──────────────────────────────────────────────────

export interface ActiveCell {
  rowIndex: number;
  colIndex: number;
}

// ─── Virtual Scrolling ────────────────────────────────────────────────────────

export interface VirtualConfig {
  rowHeight?:       number;
  containerHeight?: number;
  overscan?:        number;
}

// ─── URL State ────────────────────────────────────────────────────────────────

export interface URLStateConfig {
  enabled:  boolean;
  prefix?:  string;
  filters?: boolean;
  sort?:    boolean;
  page?:    boolean;
  search?:  boolean;
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
  onMultiSortChange?: (sorts: MultiSortState) => void;
  onSearchChange?:  (query: string) => void;

  selectable?:      boolean;
  onSelect?:        (selectedRows: T[]) => void;
  bulkActions?:     (selectedRows: T[], clearSelection: () => void) => ReactNode;

  onCellEdit?:      (payload: CellEditPayload<T>) => void;

  /**
   * 🆕 Batch Edit: بدلاً من حفظ كل خلية فوراً،
   * يجمع التعديلات ويرسلها دفعة واحدة.
   */
  batchEdit?:       boolean;
  onBatchSave?:     (edits: PendingEdit[]) => void;

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

  allData?:         T[];

  // ── v9 ───────────────────────────────────────────────────────────────────

  virtual?:               VirtualConfig;
  columnReorder?:         boolean;
  initialColumnOrder?:    string[];
  onColumnOrderChange?:   (order: string[]) => void;
  multiSort?:             boolean;
  urlState?:              URLStateConfig;

  // ── v10: ميزات جديدة ─────────────────────────────────────────────────────

  /**
   * 🆕 تجميع الصفوف حسب عمود
   */
  groupBy?:               RowGroupConfig;

  /**
   * 🆕 تثبيت الأعمدة الديناميكي
   * يُدمج مع sticky في Column definition
   */
  pinnedColumns?:         ColumnPinConfig;
  onPinnedColumnsChange?: (config: ColumnPinConfig) => void;

  /**
   * 🆕 تنقل لوحة المفاتيح بين الخلايا
   * Tab/Enter/Arrows للتنقل، F2 للتعديل، Escape للإلغاء
   */
  keyboardNav?:           boolean;

  /**
   * 🆕 Conditional Formatting
   * تلوين الخلايا بناءً على شروط
   */
  conditionalFormatting?: ConditionalFormat<T>[];
}

// ─── 🆕 Conditional Formatting ───────────────────────────────────────────────

export interface ConditionalFormat<T = Record<string, unknown>> {
  /** العمود المستهدف (* = كل الأعمدة) */
  colKey:    string | '*';
  condition: (value: unknown, row: T) => boolean;
  style:     React.CSSProperties;
  /** CSS class بدلاً من style inline */
  className?: string;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

export interface EditingCell { rowKey: string | number; colKey: string; value: string; }
export type FilterMap = Record<string, string>;

// ─── Constants ────────────────────────────────────────────────────────────────

export const PER_PAGE_OPTIONS       = [10, 15, 25, 50, 100] as const;
export const SKELETON_WIDTHS        = [70, 55, 82, 60, 75, 50, 88, 63, 72, 58] as const;
export const MIN_COL_WIDTH          = 60;
export const SEARCH_DEBOUNCE        = 180;
export const DEFAULT_ROW_HEIGHT     = 40;
export const DEFAULT_CONTAINER_HEIGHT = 500;
export const DEFAULT_OVERSCAN       = 5;

import type React from 'react';
