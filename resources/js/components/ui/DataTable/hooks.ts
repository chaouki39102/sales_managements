// DataTable/hooks.ts  —  v10.3 (كامل مع جميع hooks)
//
// Barrel: every hook lives in its own file under ./hooks/ — this file only
// re-exports them so existing `./hooks` imports keep working.

export { useClickOutside } from './hooks/useClickOutside';
export { useColumnResize } from './hooks/useColumnResize';
export { useEscapeKey } from './hooks/useEscapeKey';
export { useDebounce } from './hooks/useDebounce';
export { useIsMobile } from './hooks/useIsMobile';
export { useVirtualScroll } from './hooks/useVirtualScroll';
export { useColumnDragReorder } from './hooks/useColumnDragReorder';
export { useURLState } from './hooks/useURLState';
export { useMultiSort } from './hooks/useMultiSort';
export { useRowGrouping } from './hooks/useRowGrouping';
export { useColumnPinning } from './hooks/useColumnPinning';
export { useKeyboardNav } from './hooks/useKeyboardNav';
export { useBatchEdit } from './hooks/useBatchEdit';
export { useCellValidation } from './hooks/useCellValidation';
export { useClipboardPaste } from './hooks/useClipboardPaste';
export { DEFAULT_SMART_FILTER_PATTERNS, useSmartFilter } from './hooks/useSmartFilter';
export type { SmartFilterPattern } from './hooks/useSmartFilter';
export { useSavedViews } from './hooks/useSavedViews';
export { useContextMenu } from './hooks/useContextMenu';
export { useColumnVisibility } from './hooks/useColumnVisibility';
export { useColumnStatePersistence } from './hooks/useColumnStatePersistence';
export type { ColumnStateSnapshot } from './hooks/useColumnStatePersistence';
export { useRowModel } from './hooks/useRowModel';
export { useTreeData } from './hooks/useTreeData';
export type { TreeConfig, TreeRow } from './hooks/useTreeData';
export { useColumnGroups } from './hooks/useColumnGroups';
export type { ColumnGroupDef, ResolvedColumnGroup } from './hooks/useColumnGroups';
export { useRangeSelection } from './hooks/useRangeSelection';
export type { CellRange } from './hooks/useRangeSelection';
export { useQuickFilter } from './hooks/useQuickFilter';
