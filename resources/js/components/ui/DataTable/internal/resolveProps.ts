// DataTable/internal/resolveProps.ts — applies DataTable's prop defaults
// The destructuring (with its defaults) is copied verbatim from the original
// DataTable signature, so `undefined` props resolve exactly as before.

import type { DataTableProps } from '../types';

export function resolveProps<T>({
  // بيانات أساسية
  data,
  columns,
  columnDefs,
  hiddenColumnKeys,
  onHiddenColumnsChange,
  rowKey,
  loading = false,
  error = null,

  // Pagination (Server/Client)
  pagination,
  onFilterChange,
  onSortChange,
  onMultiSortChange,
  onSearchChange,

  // تحديد الصفوف
  selectable = false,
  onSelect,
  bulkActions,

  // تحرير الخلايا
  onCellEdit,
  batchEdit = false,
  onBatchSave,

  // توسيع الصفوف
  expandable = false,
  renderExpanded,
  isExpandable,

  // إجماليات
  showAggregates = false,
  aggregateLabel,

  // بحث عام
  searchable = false,
  searchPlaceholder = 'بحث...',

  // ترقيم الصفوف
  showIndex = false,
  indexHeader = '#',

  // أزرار وإجراءات
  rowActions,
  hoverActions,
  headerActions,
  title,
  emptyText = 'لا توجد بيانات',
  emptyAction,
  emptyNode,
  loadingNode,
  compact = false,
  exportable = false,
  exportName = 'export',
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  allData,
  pinTopRows,
  pinBottomRows,

  // v9
  virtual,
  columnReorder = false,
  initialColumnOrder,
  onColumnOrderChange,
  multiSort = false,
  urlState,

  // v10
  groupBy,
  pinnedColumns,
  onPinnedColumnsChange,
  keyboardNav = false,
  conditionalFormatting,

  // 🆕 ميزات جديدة
  enableExcelExport = false,
  excelExportOptions,
  documentInfo,
  excelExportAdvancedOptions,
  enableSmartFilter = false,
  smartFilterPatterns,
  enableSavedViews = false,
  savedViewsConfig,
  exportConfig,
  enableContextMenu = false,
  contextMenuItems,
  onSmartFilterApply,
  // 🆕 v10.2
  treeData: treeConfig,
  columnGroups,
  enableRangeSelection = false,
  fetchAllForExport,
  enableQuickFilter = false,
}: DataTableProps<T>) {
  return {
    data, columns, columnDefs, hiddenColumnKeys, onHiddenColumnsChange, rowKey,
    loading, error, pagination, onFilterChange, onSortChange, onMultiSortChange,
    onSearchChange, selectable, onSelect, bulkActions, onCellEdit, batchEdit,
    onBatchSave, expandable, renderExpanded, isExpandable, showAggregates, aggregateLabel,
    searchable, searchPlaceholder, showIndex, indexHeader, rowActions, hoverActions,
    headerActions, title, emptyText, emptyAction, emptyNode, loadingNode,
    compact, exportable, exportName, onRowClick, onRowDoubleClick, rowClassName,
    allData, pinTopRows, pinBottomRows, virtual, columnReorder, initialColumnOrder,
    onColumnOrderChange, multiSort, urlState, groupBy, pinnedColumns, onPinnedColumnsChange,
    keyboardNav, conditionalFormatting, enableExcelExport, excelExportOptions, documentInfo, excelExportAdvancedOptions,
    enableSmartFilter, smartFilterPatterns, enableSavedViews, savedViewsConfig, exportConfig, enableContextMenu,
    contextMenuItems, onSmartFilterApply, treeConfig, columnGroups, enableRangeSelection, fetchAllForExport,
    enableQuickFilter,
  };
}

export type ResolvedProps<T> = ReturnType<typeof resolveProps<T>>;
