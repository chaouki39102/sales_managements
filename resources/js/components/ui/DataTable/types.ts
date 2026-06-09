// DataTable/types.ts  —  v10.0 (كامل مع جميع الميزات الجديدة)

import type { ReactNode } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// الأنواع الأساسية (موجودة سابقاً)
// ════════════════════════════════════════════════════════════════════════════

export type FilterDef =
  | { type: 'text' }
  | { type: 'number'; presets?: { label: string; min: string; max: string }[] }
  | { type: 'date';   presets?: string[] }   // قائمة preset keys من DATE_SHORTCUT_GROUPS
  | { type: 'select'; options: readonly { value: string; label: string }[] }
  | { type: 'multiselect'; options: readonly { value: string; label: string }[] }
  | { type: 'dynamic-multiselect'; labelFormatter?: (v: string) => string };

export type RangeFilter = { min: string; max: string };

export type AggregateType = 'sum' | 'avg' | 'min' | 'max' | 'count';

export const AGG_CYCLE: AggregateType[] = ['sum', 'avg', 'min', 'max', 'count'];
export const AGG_LABELS: Record<AggregateType, string> = {
  sum: 'Σ', avg: 'Ø', min: '↓', max: '↑', count: '#',
};

export type EditDef =
  | { type: 'text' }
  | { type: 'number'; min?: number; max?: number; step?: number }
  | { type: 'date' }
  | { type: 'select'; options: readonly { value: string; label: string }[] };

export interface CellValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string, row: Record<string, unknown>) => string | null;
  messages?: {
    required?: string;
    min?: string;
    max?: string;
    minLength?: string;
    maxLength?: string;
    pattern?: string;
  };
}

export interface Column<T = Record<string, unknown>> {
  key: string;
  header: ReactNode;
  exportHeader?: string;
  render?: (row: T, rowIndex: number) => ReactNode;
  accessor?: (row: T) => unknown;
  sortable?: boolean;
  filter?: FilterDef;
  width?: number;
  minWidth?: number;
  align?: 'start' | 'center' | 'end';
  hideOnMobile?: boolean;
  sticky?: 'start' | 'end';
  defaultHidden?: boolean;
  aggregate?: AggregateType | ((rows: T[]) => string | number | null);
  aggregateFormat?: (value: number, type: AggregateType) => string;
  editable?: EditDef;
  searchable?: boolean;
  disableDrag?: boolean;
  disablePin?: boolean;
  validation?: CellValidationRule;
  groupRenderer?: (groupValue: unknown, rows: T[]) => ReactNode;
}

export interface SortState {
  key: string | null;
  dir: 'asc' | 'desc' | null;
}

export interface MultiSortEntry {
  key: string;
  dir: 'asc' | 'desc';
}
export type MultiSortState = MultiSortEntry[];

export interface PaginationConfig {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}

export interface CellEditPayload<T> {
  row: T;
  rowIndex: number;
  colKey: string;
  oldValue: unknown;
  newValue: string;
}

export interface PendingEdit {
  rowKey: string | number;
  colKey: string;
  oldValue: string;
  newValue: string;
}

export interface BatchEditState {
  pending: Record<string, Record<string, string>>;
  history: PendingEdit[][];
  future: PendingEdit[][];
}

export interface RowGroupConfig {
  key: string;
  defaultCollapsed?: boolean;
  sortGroups?: 'asc' | 'desc' | null;
  showSubTotals?: boolean;
}

export interface RowGroup<T> {
  value: unknown;
  label: string;
  rows: T[];
  rowCount: number;   // العدد الحقيقي دائماً — حتى عند collapsed (rows قد تكون [])
  collapsed: boolean;
}

export interface ColumnPinConfig {
  start?: string[];
  end?: string[];
}

export interface ActiveCell {
  rowIndex: number;
  colIndex: number;
}

export interface VirtualConfig {
  rowHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

export interface URLStateConfig {
  enabled: boolean;
  prefix?: string;
  filters?: boolean;
  sort?: boolean;
  page?: boolean;
  search?: boolean;
}

export interface ConditionalFormat<T = Record<string, unknown>> {
  colKey: string | '*';
  condition: (value: unknown, row: T) => boolean;
  style?: React.CSSProperties;
  className?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// 🆕 الأنواع الجديدة للميزات المضافة
// ════════════════════════════════════════════════════════════════════════════

// ─── Copy/Paste from Excel ──────────────────────────────────────────────────

export interface PasteOptions {
  targetColumnKey?: string;
  allowMultiCell?: boolean;
  transform?: (value: string, colKey: string) => string;
}

// ─── Excel Export (حقيقي) ───────────────────────────────────────────────────

// ─── Excel Export ────────────────────────────────────────────────────────────
//
// ExcelExportOptions: خيارات التصدير البسيط (CSV fallback / print / json)
// DocumentInfo:       معلومات المستند والشركة للتصدير الاحترافي (excelExportAdvanced)
// ExcelExportAdvancedOptions: خيارات التصدير الاحترافي الكامل
//

export interface ExcelExportOptions {
  fileName?:             string;
  includeAggregates?:    boolean;
  includeHiddenColumns?: boolean;
  numberFormat?:         string;
  title?:                string;
  sheetName?:            string;
  headerStyle?:          boolean;
}

/** معلومات الشركة والمستند — تُمرَّر لـ exportToExcelAdvanced */
export interface DocumentInfo {
  // معلومات الشركة
  company?:        string;
  companyAddress?: string;
  companyPhone?:   string;
  /** رقم التعريف الجبائي / RC */
  companyTaxId?:   string;
  companyNIF?:     string;
  companyNIS?:     string;
  // معلومات المستند
  documentNumber?: string;
  /** مثال: 'فاتورة بيع' | 'أمر شراء' | 'وصل استلام' */
  documentType?:   string;
  dateFrom?:       string;
  dateTo?:         string;
  department?:     string;
  preparedBy?:     string;
  approvedBy?:     string;
  notes?:          string;
  /** 'DZD' | 'EUR' | 'USD' */
  currency?:       string;
  // ميزات ERP الجزائرية
  vatAmount?:      number;
  /** 0.19 = 19% */
  vatRate?:        number;
  /** الطابع المالي: 1% من TTC، حد أقصى 2500 دج */
  fiscalStamp?:    number;
}

export interface ExcelExportAdvancedOptions {
  fileName?:       string;
  title?:          string;
  documentInfo?:   DocumentInfo;
  showAggregates?: boolean;
  aggregates?:     Record<string, { type: AggregateType; value: number | string }>;
  currency?:       string;
  orientation?:    'landscape' | 'portrait';
  sheetName?:      string;
  /** callback لحفظ الـ buffer بطريقة مختلفة (مثلاً رفع للسيرفر) */
  onSave?:         (buffer: ArrayBuffer) => void;
}

export type ExportFormat = 'csv' | 'excel' | 'json' | 'print';

export interface ExportConfig {
  formats?: ExportFormat[];        // الصيغ المتاحة — default: ['csv','excel','json','print']
  fileName?: string;
  title?: string;
  includeHiddenColumns?: boolean;
  excelOptions?: ExcelExportOptions;
}

// ─── Smart Filter (تحليل اللغة العربية) ─────────────────────────────────────

export interface SmartFilterRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts' | 'ends' | 'between';
  value: string | number | [number, number];
}

export interface SmartFilterResult {
  success: boolean;
  filters: Record<string, string>;
  sort?: MultiSortState;
  message?: string;
}

// ─── Saved Views ────────────────────────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  createdAt: number;
  filters: Record<string, string>;
  sorts: MultiSortState;
  searchQuery: string;
  pageSize: number;
  hiddenColumns: string[];
  columnOrder: string[];
  pinnedColumns?: ColumnPinConfig;
}

export interface SavedViewsConfig {
  tableKey: string;
  maxViews?: number;
  autoSave?: boolean;
}

// ─── Context Menu ───────────────────────────────────────────────────────────

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: (context: ContextMenuContext) => void;
  divider?: boolean;
  disabled?: boolean;
}

export interface ContextMenuContext {
  type: 'cell' | 'row' | 'header';
  row?: Record<string, unknown>;
  rowIndex?: number;
  colKey?: string;
  value?: unknown;
  originalEvent: React.MouseEvent;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  context: ContextMenuContext | null;
}

// ════════════════════════════════════════════════════════════════════════════
// DataTable Props (موسعة)
// ════════════════════════════════════════════════════════════════════════════

export interface DataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  error?: string | null;

  pagination?: PaginationConfig;
  onFilterChange?: (filters: Record<string, string>) => void;
  onSortChange?: (key: string, dir: 'asc' | 'desc' | null) => void;
  onMultiSortChange?: (sorts: MultiSortState) => void;
  onSearchChange?: (query: string) => void;

  selectable?: boolean;
  onSelect?: (selectedRows: T[]) => void;
  bulkActions?: (selectedRows: T[], clearSelection: () => void) => ReactNode;

  onCellEdit?: (payload: CellEditPayload<T>) => void;
  batchEdit?: boolean;
  onBatchSave?: (edits: PendingEdit[]) => void;

  expandable?: boolean;
  renderExpanded?: (row: T, rowIndex: number) => ReactNode;
  isExpandable?: (row: T) => boolean;

  showAggregates?: boolean;
  aggregateLabel?: ReactNode;

  searchable?: boolean;
  searchPlaceholder?: string;

  showIndex?: boolean;
  indexHeader?: string;

  rowActions?: (row: T) => ReactNode;
  headerActions?: ReactNode;
  title?: ReactNode;
  emptyText?: ReactNode;
  emptyAction?: ReactNode;
  compact?: boolean;
  exportable?: boolean;
  exportName?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  allData?: T[];

  // v9
  virtual?: VirtualConfig;
  columnReorder?: boolean;
  initialColumnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  multiSort?: boolean;
  urlState?: URLStateConfig;

  // v10
  groupBy?: RowGroupConfig;
  pinnedColumns?: ColumnPinConfig;
  onPinnedColumnsChange?: (config: ColumnPinConfig) => void;
  keyboardNav?: boolean;
  conditionalFormatting?: ConditionalFormat<T>[];

  // 🆕 ميزات جديدة
  enableExcelExport?: boolean;
  excelExportOptions?: ExcelExportOptions;
  /** معلومات الشركة والمستند — تُمرَّر لـ exportToExcelAdvanced تلقائياً */
  documentInfo?: DocumentInfo;
  excelExportAdvancedOptions?: Omit<ExcelExportAdvancedOptions, 'documentInfo'>;
  enableSmartFilter?: boolean;
  smartFilterPatterns?: import('./hooks').SmartFilterPattern[];
  enableSavedViews?: boolean;
  savedViewsConfig?: SavedViewsConfig;
  enableContextMenu?: boolean;
  contextMenuItems?: (context: ContextMenuContext) => ContextMenuItem[];
  onSmartFilterApply?: (query: string, result: SmartFilterResult) => void;
  // 🆕 Export Menu الموحد (يستبدل exportable + enableExcelExport)
  exportConfig?: ExportConfig;
  // 🆕 v10.2
  treeData?: import('./hooks').TreeConfig;
  columnGroups?: import('./hooks').ColumnGroupDef[];
  enableRangeSelection?: boolean;
}

export interface EditingCell {
  rowKey: string | number;
  colKey: string;
  value: string;
}

export type FilterMap = Record<string, string>;

export const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100] as const;
export const SKELETON_WIDTHS = [70, 55, 82, 60, 75, 50, 88, 63, 72, 58] as const;
export const MIN_COL_WIDTH = 60;
export const SEARCH_DEBOUNCE = 180;
export const DEFAULT_ROW_HEIGHT = 40;
export const DEFAULT_CONTAINER_HEIGHT = 500;
export const DEFAULT_OVERSCAN = 5;
