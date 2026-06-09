// DataTable/index.ts  —  v10.3
export { DataTable, DataTable as default, DataTableErrorBoundary } from './DataTable';

export type {
  DataTableProps,
  Column,
  FilterDef,
  EditDef,
  AggregateType,
  PaginationConfig,
  CellEditPayload,
  SortState,
  FilterMap,
  RangeFilter,
  // v9
  MultiSortState,
  MultiSortEntry,
  VirtualConfig,
  URLStateConfig,
  // v10
  RowGroupConfig,
  RowGroup,
  ColumnPinConfig,
  ActiveCell,
  CellValidationRule,
  PendingEdit,
  BatchEditState,
  ConditionalFormat,
  PasteOptions,
  ExcelExportOptions,
  ExportConfig,
  ExportFormat,
  SmartFilterRule,
  SmartFilterResult,
  SavedView,
  SavedViewsConfig,
  ContextMenuItem,
  ContextMenuContext,
  ContextMenuState,
} from './types';

export { StaticMultiSelect, DynamicMultiSelect } from './MultiSelect';
export { default as FilterPopup }               from './FilterPopup';
export { SkeletonRows, SkeletonCards, EditInput } from './Primitives';

export {
  getRawValue, getStringValue,
  encodeRange, decodeRange,
  applyClientFilter, applyGlobalSearch, applyClientSort,
  applyMultiSort,              // v9
  applyConditionalFormat,      // v10
  computeAggregate, exportToCSV, buildPageNumbers,
  getTextAlign,
  exportToExcel, exportToJSON, exportToPrint, parseTSV,
} from './utils';

export {
  useColumnResize, useClickOutside, useEscapeKey, useDebounce, useIsMobile,
  useVirtualScroll,            // v9
  useColumnDragReorder,        // v9
  useURLState,                 // v9
  useMultiSort,                // v9
  useRowGrouping,              // v10
  useColumnPinning,            // v10
  useKeyboardNav,              // v10
  useBatchEdit,                // v10
  useCellValidation,           // v10
  useColumnVisibility,         // v10 (كان مفقوداً من index.ts)
  useClipboardPaste,
  useSmartFilter,
  useSavedViews,
  useContextMenu,
  // v10.1
  DEFAULT_SMART_FILTER_PATTERNS,
  // v10.2 — الجديد
  useRowModel,
  useTreeData,
  useColumnGroups,
  useRangeSelection,
  // v10.3 — الجديد
  useColumnStatePersistence,
} from './hooks';

export type {
  SmartFilterPattern,       // v10.1
  TreeConfig,               // v10.2
  TreeRow,                  // v10.2
  ColumnGroupDef,           // v10.2
  ResolvedColumnGroup,      // v10.2
  CellRange,                // v10.2
  ColumnStateSnapshot,      // v10.3
} from './hooks';

export { default as ContextMenu } from './ContextMenu';
