// DataTable/index.ts  —  v10.0
export { DataTable, DataTable as default } from './DataTable';

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
} from './hooks';
