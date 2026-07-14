// ════════════════════════════════════════════════════════════════════════════
// DataTable/DataTable.tsx  —  v10.3
//
// ✅ كل ميزات v9 محفوظة بالكامل:
//    • Virtual Scrolling
//    • Column Reorder (سحب وإفلات)
//    • Multi‑Column Sort (فرز بأعمدة متعددة)
//    • URL State (حفظ الحالة في الرابط)
//    • Column Resize (تغيير عرض الأعمدة)
//    • Filter Popup (بوابة إلى document.body)
//
// ✅ ميزات v10:
//    • Row Grouping (تجميع الصفوف + collapse/expand + إجماليات جزئية)
//    • Column Pinning الديناميكي (تثبيت أعمدة من الرأس أو قائمة الأعمدة)
//    • Keyboard Navigation (أسهم / Tab / F2 / Enter / Escape)
//    • Batch Edit + Undo/Redo (تعديل دفعي + Ctrl+Z/Y)
//    • Cell Validation (تحقق من الخلايا مع رسائل خطأ)
//    • Conditional Formatting (تلوين شرطي)
//
// ✅ ميزات جديدة إضافية (AG Grid مستوى احترافي):
//    • Copy/Paste من Excel (لصق خلايا من جدول بيانات)
//    • Excel Export حقيقي (.xlsx مع تنسيق)
//    • Smart Filter باللغة العربية (تحليل جمل طبيعية)
//    • Saved Views (حفظ واسترجاع العروض في localStorage)
//    • Context Menu (قائمة النقر الأيمن)
//
// ✅ v10.2: Tree Data، Column Groups، Range Selection، ErrorBoundary
//
// ✅ v10.3:
//    • VirtualRow كـ memo مستقل بمقارنة عميقة — scroll لا يُعيد render الصفوف
// ════════════════════════════════════════════════════════════════════════════

import './datatable.css';

import React, {
  useState, useMemo, useCallback,
  useRef, useEffect, memo,
  type ReactNode, type CSSProperties,
} from 'react';

import type {
  DataTableProps, Column, MultiSortState, EditingCell,
  FilterMap, AggregateType, PaginationConfig,
  ActiveCell, PendingEdit, SavedView, ContextMenuContext,
  ContextMenuItem, ExcelExportOptions, ExportConfig, ExportFormat,
} from './types';

import {
  AGG_CYCLE, AGG_LABELS,
  PER_PAGE_OPTIONS, SKELETON_WIDTHS, MIN_COL_WIDTH, SEARCH_DEBOUNCE,
  DEFAULT_ROW_HEIGHT, DEFAULT_CONTAINER_HEIGHT,
} from './types';

import {
  getRawValue, getTextAlign,
  applyClientFilter, applyGlobalSearch, applyClientSort, applyMultiSort,
  applyConditionalFormat,
  computeAggregate, exportToCSV, buildPageNumbers,
  exportToExcel, exportToJSON, exportToPrint, parseTSV,
} from './utils';

import {
  useColumnResize, useIsMobile,
  useVirtualScroll, useColumnDragReorder, useURLState, useMultiSort,
  useRowGrouping, useColumnPinning, useKeyboardNav, useBatchEdit, useCellValidation,
  useClipboardPaste, useSmartFilter, useSavedViews, useContextMenu,
  useRowModel, useTreeData, useColumnGroups, useRangeSelection, useEscapeKey,
} from './hooks';

import FilterPopup from './FilterPopup';
import { SkeletonRows, SkeletonCards, EditInput } from './Primitives';
import ContextMenu from './ContextMenu';

// ════════════════════════════════════════════════════════════════════════════
// VirtualRow — صف بيانات معزول كـ memo مستقل
//
// الهدف: عند تحرك virtual scroll يتغير visibleRange فقط،
//        وهذا يُعيد render الـ parent. بدون memo كل الصفوف
//        المرئية تُعاد كاملاً حتى لو بياناتها لم تتغير.
//
// المقارنة: areEqual يدوية تتحقق فقط من:
//   • تغيير بيانات الصف نفسه (rowData)
//   • تغيير حالة التحديد / التوسيع / التعديل
//   • تغيير Range Selection
//   • تغيير التنسيق الشرطي
//   الـ visibleRange/offsetY لا تُسبب re-render للصف إذا بياناته ثابتة
// ════════════════════════════════════════════════════════════════════════════

interface VirtualRowProps {
  rowNode:    React.ReactNode;
  /** renderFn: يُستدعى بدلاً من rowNode إذا مُرِّر — يمنع حساب rowNode في الأب */
  renderFn?:  () => React.ReactNode;
  rowDataKey: string | number;  // row key للمقارنة في areEqual
  dataHash?:  string;           // hash للبيانات — تغييره يُجبر إعادة Render
  isSelected: boolean;
  isExpanded: boolean;
  isEditing:  boolean;          // أي خلية في هذا الصف تُعدَّل
  isActive:   boolean;          // keyboard nav
  inRange:    boolean;          // range selection يشمل هذا الصف
}

// areEqual: مقارنة يدوية — يُعاد render الصف فقط عند تغيير حقيقي
function virtualRowAreEqual(prev: VirtualRowProps, next: VirtualRowProps): boolean {
  return (
    prev.rowDataKey === next.rowDataKey &&
    prev.dataHash    === next.dataHash    &&
    prev.isSelected === next.isSelected &&
    prev.isExpanded === next.isExpanded &&
    prev.isEditing  === next.isEditing  &&
    prev.isActive   === next.isActive   &&
    prev.inRange    === next.inRange
  );
}

const VirtualRow = memo(function VirtualRow({ rowNode, renderFn }: VirtualRowProps) {
  // renderFn: يُستدعى فقط عند تغيير حقيقي في البيانات (بعد areEqual يمر)
  return <>{renderFn ? renderFn() : rowNode}</>;
}, virtualRowAreEqual);

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function DataTable<T = Record<string, unknown>>({
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
  headerActions,
  title,
  emptyText = 'لا توجد بيانات',
  emptyAction,
  compact = false,
  exportable = false,
  exportName = 'export',
  onRowClick,
  rowClassName,
  allData,

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
}: DataTableProps<T>) {
  // ── Responsive ────────────────────────────────────────────────────────────
  const isMobile = useIsMobile(639);

  // ── URL State ─────────────────────────────────────────────────────────────
  const url = useURLState(urlState);

  // ── Column visibility ─────────────────────────────────────────────────────
  // ── Column visibility — نمط controlled/uncontrolled ─────────────────────
  //
  // القيمة الأولية: hiddenColumnKeys (من الأب) → أو defaultHidden من columnDefs/columns
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(() => {
    if (hiddenColumnKeys) return new Set(hiddenColumnKeys);
    const src = columnDefs ?? columns;
    return new Set(src.filter(c => c.defaultHidden).map(c => c.key));
  });

  // updateHidden: دالة مركزية تُعدِّل hiddenKeys وتُعلم الأب دائماً
  // تستخدمها: toggleColVisibility + toggleCollapseAll + handleApplyView
  const onHiddenColumnsChangeRef = useRef(onHiddenColumnsChange);
  useEffect(() => { onHiddenColumnsChangeRef.current = onHiddenColumnsChange; }, [onHiddenColumnsChange]);

  const updateHidden = useCallback((next: ReadonlySet<string>) => {
    setHiddenKeys(next);
    // batch update: نُرسل key='' كإشارة أن التغيير شامل (ليس toggle فردي)
    onHiddenColumnsChangeRef.current?.('', false, [...next]);
  }, []);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
        setColMenuOpen(false);
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [colMenuOpen]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
        setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [exportMenuOpen]);

  const toggleColVisibility = useCallback((key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      const willBeHidden = !next.has(key);
      willBeHidden ? next.add(key) : next.delete(key);
      // إعلام الأب: toggle فردي
      onHiddenColumnsChangeRef.current?.(key, willBeHidden, [...next]);
      return next;
    });
  }, []);

  // إذا مُرِّر columnDefs → قائمة إدارة الأعمدة تعرض كل الأعمدة بما فيها المخفية
  // (columns = الأعمدة المُصفَّاة للعرض، columnDefs = كل الأعمدة)
  const nonIndexCols = useMemo(
    () => columnDefs ?? columns,
    [columnDefs, columns],
  );
  const allHidden = nonIndexCols.length > 0 && nonIndexCols.every(c => hiddenKeys.has(c.key));

  const toggleCollapseAll = useCallback(() => {
    const next = allHidden
      ? new Set<string>()
      : new Set(nonIndexCols.filter((c, i) => i > 0).map(c => c.key));
    updateHidden(next);
    setColMenuOpen(false);
  }, [allHidden, nonIndexCols, updateHidden]);

  // ── Column resize ─────────────────────────────────────────────────────────
  const initialWidthsRef = useRef<Record<string, number>>(
    Object.fromEntries((columnDefs ?? columns).filter(c => c.width).map(c => [c.key, c.width!])),
  );
  const { widths: colWidths, startResize, resetWidth } = useColumnResize(initialWidthsRef.current);

  // ── Column Reorder (v9) ───────────────────────────────────────────────────
  const defaultOrder = useMemo(
    () => initialColumnOrder ?? (columnDefs ?? columns).map(c => c.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnDefs, columns, initialColumnOrder],
  );

  const { columnOrder, setColumnOrder, dragOverKey, dragHandlers } = useColumnDragReorder(
    defaultOrder,
    onColumnOrderChange,
  );

  const orderedColumns = useMemo(() => {
    // نعمل على allColumnDefs حتى يشمل الأعمدة المخفية في الـ reorder
    const src = columnDefs ?? columns;
    if (!columnReorder) return src;
    const map = new Map(src.map(c => [c.key, c]));
    const ordered = columnOrder.map(k => map.get(k)).filter(Boolean) as Column<T>[];
    const inOrder = new Set(columnOrder);
    src.forEach(c => {
      if (!inOrder.has(c.key)) ordered.push(c);
    });
    return ordered;
  }, [columns, columnDefs, columnOrder, columnReorder]);

  // ── Column Pinning (v10) ──────────────────────────────────────────────────
  const { pinConfig, pinColumn, isPinned, clearAllPins, setPinConfigBatch } = useColumnPinning(
    pinnedColumns,
    onPinnedColumnsChange,
  );
  const [pinMenuKey, setPinMenuKey] = useState<string | null>(null);

  const getEffectiveSticky = useCallback((col: Column<T>): 'start' | 'end' | null => {
    const dynamic = isPinned(col.key);
    if (dynamic) return dynamic;
    if (col.sticky === 'start') return 'start';
    if (col.sticky === 'end') return 'end';
    return null;
  }, [isPinned]);

  // ── Global search ─────────────────────────────────────────────────────────
  const [globalQuery, setGlobalQuery] = useState(() => url.readInitialSearch());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  const handleSearchChange = useCallback(
    (v: string) => {
      setGlobalQuery(v);
      if (!pagination) setLocalPage(1);
      url.writeSearch(v);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        onSearchChangeRef.current?.(v);
      }, SEARCH_DEBOUNCE);
    },
    [pagination, url],
  );

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  // ── Pagination state — مُعرَّف هنا لأن handleFilterChange تحتاجه ──────────
  const [localPage, setLocalPage] = useState(() => url.readInitialPage());
  const [localPerPage, setLocalPerPage] = useState(15);

  // ── Column filters ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterMap>(() => url.readInitialFilters());
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  const isServerPaged = !!pagination;

  const handleFilterChange = useCallback(
    (key: string, val: string) => {
      setFilters(prev => {
        const next = { ...prev };
        val ? (next[key] = val) : delete next[key];
        url.writeFilters(next);
        Promise.resolve().then(() => onFilterChangeRef.current?.(next));
        return next;
      });
      // setLocalPage مُعرَّف لاحقاً لكن useState يعمل بـ hoisting — آمن
      if (!isServerPaged) setLocalPage(1);
    },
    [isServerPaged, url],
  );

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setGlobalQuery('');
    if (!isServerPaged) setLocalPage(1);
    url.clear();
    onFilterChangeRef.current?.({});
    onSearchChangeRef.current?.('');
  }, [isServerPaged, url]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(v => v && v !== '|').length + (globalQuery ? 1 : 0),
    [filters, globalQuery],
  );

  // ── Filter popup ──────────────────────────────────────────────────────────
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const filterBtnRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

  // ✅ إصلاح: useCallback لمنع إنشاء ref جديد في كل render
  // الاستدعاء المزدوج (ref + anchorRef) لا يُنشئ كائنَين مختلفَين
  const getFilterBtnRef = useCallback((key: string): React.RefObject<HTMLButtonElement> => {
    if (!filterBtnRefs.current[key]) {
      filterBtnRefs.current[key] = React.createRef<HTMLButtonElement>();
    }
    return filterBtnRefs.current[key];
  }, []);

  // ── Multi-sort (v9) ───────────────────────────────────────────────────────
  const {
    sorts,
    setSorts,
    toggleSort: toggleMultiSort,
    clearSort,
    legacySortState,
  } = useMultiSort(
    url.readInitialSort(),
    onMultiSortChange,
    onSortChange,
  );

  const handleSortToggle = useCallback(
    (key: string, e: React.MouseEvent) => {
      const shiftKey = multiSort && e.shiftKey;
      // toggleMultiSort يحدّث sorts ويستدعي onMultiSortChange داخلياً
      // نستمع على التغيير عبر useEffect لكتابة URL بعد التحديث
      toggleMultiSort(key, shiftKey);
      if (!isServerPaged) setLocalPage(1);
    },
    [multiSort, toggleMultiSort, isServerPaged],
  );

  // كتابة URL بعد تحديث sorts (ليس أثناء render)
  const sortsRef = useRef(sorts);
  useEffect(() => { sortsRef.current = sorts; }, [sorts]);
  useEffect(() => {
    if (!url.enabled) return;
    url.writeSort(sorts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorts]);

  // ── Client-side data processing (useRowModel — خارج دورة React) ─────────
  const isClientFiltered = !onFilterChange;
  const isClientSorted = !onSortChange && !onMultiSortChange;

  // searchCols: فقط الأعمدة المرئية وغير المخفية للبحث العام
  // فلترة الأعمدة المخفية من البحث تمنع ظهور نتائج مربِكة للمستخدم
  const searchCols = useMemo(
    () => orderedColumns.filter(c => !hiddenKeys.has(c.key)),
    [orderedColumns, hiddenKeys],
  );

  const processedData = useRowModel(
    data,
    filters,
    globalQuery,
    sorts,
    legacySortState,
    orderedColumns,   // كل الأعمدة للفلترة (المخفية تُفلتر أيضاً)
    searchCols,       // فقط المرئية للبحث العام
    {
      clientFiltered: isClientFiltered,
      clientSorted: isClientSorted,
      searchable,
      multiSort,
    },
  );

  // ── Row Grouping (v10) ────────────────────────────────────────────────────
  const {
    groups,
    toggleGroup,
    expandAll: expandAllGroups,
    collapseAll: collapseAllGroups,
    groupSubTotals,
  } = useRowGrouping(processedData, groupBy, orderedColumns as Column<Record<string, unknown>>[]);

  // ── Pagination (state مُعرَّف أعلاه قبل filters) ────────────────────────

  const paginationRef = useRef(pagination);
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);
  const lastPageRef = useRef(1);

  const curPage = isServerPaged ? pagination!.page : localPage;
  const perPage = isServerPaged ? pagination!.perPage : localPerPage;
  const total = isServerPaged ? pagination!.total : processedData.length;
  const lastPage = isServerPaged
    ? pagination!.lastPage
    : Math.max(1, Math.ceil(processedData.length / localPerPage));

  useEffect(() => {
    lastPageRef.current = lastPage;
  }, [lastPage]);

  const goToPage = useCallback(
    (p: number) => {
      const c = Math.max(1, Math.min(p, lastPageRef.current));
      if (isServerPaged) paginationRef.current!.onPage(c);
      else setLocalPage(c);
      url.writePage(c);
    },
    [isServerPaged, url],
  );

  const changePerPage = useCallback(
    (n: number) => {
      if (isServerPaged) {
        paginationRef.current!.onPerPage(n);
        paginationRef.current!.onPage(1);
      } else {
        setLocalPerPage(n);
        setLocalPage(1);
      }
    },
    [isServerPaged],
  );

  // ── Virtual Scrolling (v9) ────────────────────────────────────────────────
  const isVirtual = !!virtual;
  const {
    scrollContainerRef,
    totalHeight,
    offsetY,
    visibleRange,
    containerHeight: virtualHeight,
    rowHeight,
  } = useVirtualScroll({
    rowCount: isVirtual ? processedData.length : 0,
    rowHeight: virtual?.rowHeight ?? DEFAULT_ROW_HEIGHT,
    containerHeight: virtual?.containerHeight ?? DEFAULT_CONTAINER_HEIGHT,
    overscan: virtual?.overscan,
  });

  const displayData = useMemo(() => {
    if (isVirtual) return processedData;
    if (isServerPaged) return processedData;
    const s = (localPage - 1) * localPerPage;
    return processedData.slice(s, s + localPerPage);
  }, [processedData, isVirtual, isServerPaged, localPage, localPerPage]);

  const virtualDisplayData = useMemo(() => {
    if (!isVirtual) return displayData;
    return displayData.slice(visibleRange.start, visibleRange.end + 1);
  }, [isVirtual, displayData, visibleRange]);

  const pageNumbers = useMemo(() => buildPageNumbers(curPage, lastPage), [curPage, lastPage]);

  // ── Visible columns ───────────────────────────────────────────────────────
  const visibleCols = useMemo(
    () => orderedColumns.filter(c => !hiddenKeys.has(c.key) && !(isMobile && c.hideOnMobile)),
    [orderedColumns, hiddenKeys, isMobile],
  );

  const totalColSpan =
    visibleCols.length +
    (selectable ? 1 : 0) +
    (expandable ? 1 : 0) +
    (showIndex ? 1 : 0) +
    (rowActions ? 1 : 0);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const [aggTypes, setAggTypes] = useState<Record<string, AggregateType>>(() =>
    Object.fromEntries(
      (columnDefs ?? columns)
        .filter(c => c.aggregate && typeof c.aggregate === 'string')
        .map(c => [c.key, c.aggregate as AggregateType]),
    ),
  );

  // allColDefs: مرجع موحد لكل الأعمدة (بما فيها المخفية) — يُستخدم في aggregates/edit/smartFilter
  const allColDefs = useMemo(() => columnDefs ?? columns, [columnDefs, columns]);

  const aggregates = useMemo(() => {
    if (!showAggregates) return null;
    const r: Record<string, { value: number | null; type: AggregateType }> = {};
    for (const col of allColDefs) {
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
  }, [showAggregates, processedData, allColDefs, aggTypes]);

  const cycleAgg = useCallback(
    (key: string) => {
      setAggTypes(prev => {
        const cur = prev[key] ?? 'sum';
        const idx = AGG_CYCLE.indexOf(cur);
        return { ...prev, [key]: AGG_CYCLE[(idx + 1) % AGG_CYCLE.length] };
      });
    },
    [],
  );

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string | number>>(new Set());
  const indRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const displayKeys = useMemo(
    () => displayData.map((r, i) => rowKey(r, i)),
    [displayData, rowKey],
  );
  const allChecked = displayKeys.length > 0 && displayKeys.every(k => selectedKeys.has(k));
  const someChecked = !allChecked && displayKeys.some(k => selectedKeys.has(k));

  useEffect(() => {
    if (indRef.current) indRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAll = useCallback(() => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      allChecked
        ? displayKeys.forEach(k => next.delete(k))
        : displayKeys.forEach(k => next.add(k));
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

  // ── Expand ────────────────────────────────────────────────────────────────
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
  useEffect(() => {
    onCellEditRef.current = onCellEdit;
  }, [onCellEdit]);

  // ── Batch Edit (v10) ──────────────────────────────────────────────────────
  const batch = useBatchEdit({ enabled: batchEdit, onBatchSave });

  // ── Cell Validation (v10) ─────────────────────────────────────────────────
  const { validate: validateCell, getError, clearError } = useCellValidation();

  const startEdit = useCallback(
    (rKey: string | number, colKey: string, rawVal: unknown, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingCell({ rowKey: rKey, colKey, value: rawVal == null ? '' : String(rawVal) });
    },
    [],
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) {
      setEditingCell(null);
      return;
    }
    const { rowKey: rKey, colKey, value } = editingCell;
    const rowIdx = data.findIndex((r, i) => rowKey(r, i) === rKey);
    if (rowIdx < 0) {
      setEditingCell(null);
      return;
    }

    const col = allColDefs.find(c => c.key === colKey);
    const oldValue = col ? getRawValue(data[rowIdx], col) : undefined;
    const cellId = `${rKey}__${colKey}`;

    if (col?.validation) {
      const row = data[rowIdx] as Record<string, unknown>;
      const ok = validateCell(value, col.validation, row, cellId);
      if (!ok) return;
    } else {
      clearError(cellId);
    }

    if (batchEdit) {
      batch.recordEdit({
        rowKey: rKey,
        colKey,
        oldValue: String(oldValue ?? ''),
        newValue: value,
      });
    } else if (onCellEditRef.current) {
      onCellEditRef.current({
        row: data[rowIdx],
        rowIndex: rowIdx,
        colKey,
        oldValue,
        newValue: value,
      });
    }

    setEditingCell(null);
  }, [editingCell, data, rowKey, allColDefs, batchEdit, batch, validateCell, clearError]);

  const cancelEdit = useCallback(() => {
    if (editingCell) clearError(`${editingCell.rowKey}__${editingCell.colKey}`);
    setEditingCell(null);
  }, [editingCell, clearError]);

  // ── Keyboard Navigation (v10) ─────────────────────────────────────────────
  const {
    activeCell,
    isEditing: kbIsEditing,
    handleKeyDown: kbHandleKeyDown,
    activateCell,
  } = useKeyboardNav({
    enabled: keyboardNav,
    rowCount: (isVirtual ? virtualDisplayData : displayData).length,
    colCount: visibleCols.length,
    onStartEdit: cell => {
      const rowData = (isVirtual ? virtualDisplayData : displayData)[cell.rowIndex];
      if (!rowData) return;
      const col = visibleCols[cell.colIndex];
      if (!col?.editable) return;
      const rKey = rowKey(rowData, cell.rowIndex);
      const rawVal = getRawValue(rowData, col as Column<T>);
      setEditingCell({ rowKey: rKey, colKey: col.key, value: rawVal == null ? '' : String(rawVal) });
    },
  });

  // ── Copy/Paste from Excel 🆕 ──────────────────────────────────────────────
  const tableWrapRef = useRef<HTMLDivElement>(null);
  // نمرر onCellEditRef.current عبر wrapper مستقر لتجنب stale closure
  const stableOnCellEdit = useCallback(
    (...args: Parameters<NonNullable<typeof onCellEdit>>) => onCellEditRef.current?.(...args),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useClipboardPaste(
    tableWrapRef,
    data,
    allColDefs,
    rowKey,
    stableOnCellEdit,
    batchEdit,
    batch.recordEdit,
    { allowMultiCell: true },
  );

  // ── Smart Filter + Saved Views — Dialog states (يجب قبل الـ callbacks) ────
  const [smartFilterOpen, setSmartFilterOpen] = useState(false);
  const [smartFilterInput, setSmartFilterInput] = useState('');
  const smartFilterRef = useRef<HTMLDivElement>(null);
  const smartInputRef = useRef<HTMLInputElement>(null);

  // ── Tree Data (v10.2) ─────────────────────────────────────────────────────
  const {
    treeRows,
    toggleTreeNode,
    expandAll: expandTree,
    collapseAll: collapseTree,
    isTreeMode,
  } = useTreeData(data, treeConfig);

  // ── Column Groups (v10.2) ─────────────────────────────────────────────────
  const visibleColKeysForGroups = useMemo(() => visibleCols.map(c => c.key), [visibleCols]);
  const { resolvedGroups, toggleGroupCollapse, isGrouped } = useColumnGroups(
    columnGroups,
    visibleColKeysForGroups,
  );

  // ── Range Selection (v10.2) ───────────────────────────────────────────────
  const { range, selectCell, clearRange, isInRange, getRangeText } = useRangeSelection(
    enableRangeSelection,
    displayData.length,
    visibleCols.length,
  );

  // ── Smart Filter (اللغة العربية) 🆕 ───────────────────────────────────────
  const { applySmartFilter } = useSmartFilter(allColDefs, (newFilters, newSorts) => {
    setFilters(newFilters);
    if (newSorts) setSorts(newSorts);
    setLocalPage(1);
    if (urlState?.enabled) {
      url.writeFilters(newFilters);
      if (newSorts) url.writeSort(newSorts);
    }
  }, smartFilterPatterns);

  const handleSmartFilter = useCallback(() => {
    setSmartFilterOpen(true);
    setTimeout(() => smartInputRef.current?.focus(), 50);
  }, []);

  const submitSmartFilter = useCallback(() => {
    const q = smartFilterInput.trim();
    if (!q) return;
    const result = applySmartFilter(q);
    onSmartFilterApply?.(q, result
      ? { success: true,  filters: result.filters ?? {}, sort: result.sort ?? [] }
      : { success: false, filters: {},                   sort: [] }
    );
    setSmartFilterOpen(false);
    setSmartFilterInput('');
  }, [smartFilterInput, applySmartFilter, onSmartFilterApply]);

  const closeSmartFilter = useCallback(() => {
    setSmartFilterOpen(false);
    setSmartFilterInput('');
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!smartFilterOpen) return;
    const handler = (e: MouseEvent) => {
      if (smartFilterRef.current && !smartFilterRef.current.contains(e.target as Node)) {
        closeSmartFilter();
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [smartFilterOpen, closeSmartFilter]);

  // ── Saved Views 🆕 ────────────────────────────────────────────────────────
  const { loadViews, saveView, deleteView } = useSavedViews(
    enableSavedViews && savedViewsConfig ? savedViewsConfig : { tableKey: 'default' },
  );
  const [savedViewsList, setSavedViewsList] = useState<SavedView[]>([]);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const saveViewInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (enableSavedViews) setSavedViewsList(loadViews());
  }, [enableSavedViews, loadViews]);

  const handleSaveCurrentView = useCallback(() => {
    setSaveViewDialogOpen(true);
    setSaveViewName('');
    setTimeout(() => saveViewInputRef.current?.focus(), 50);
  }, []);

  const commitSaveView = useCallback(() => {
    const name = saveViewName.trim();
    if (!name) return;
    saveView(name, {
      filters,
      sorts,
      searchQuery: globalQuery,
      pageSize: perPage,
      hiddenColumns: Array.from(hiddenKeys),
      columnOrder: orderedColumns.map(c => c.key),
      pinnedColumns: pinConfig,
    });
    setSavedViewsList(loadViews());
    setSaveViewDialogOpen(false);
    setSaveViewName('');
  }, [
    saveViewName,
    filters,
    sorts,
    globalQuery,
    perPage,
    hiddenKeys,
    orderedColumns,
    pinConfig,
    saveView,
    loadViews,
  ]);

  const handleApplyView = useCallback(
    (view: SavedView) => {
      // ✅ إصلاح: تطبيق كامل الحالة المحفوظة (كانت تُطبق نصف الحالة فقط)
      setFilters(view.filters);
      setSorts(view.sorts);
      setGlobalQuery(view.searchQuery);

      // pageSize
      if (view.pageSize) setLocalPerPage(view.pageSize);

      // hiddenColumns — كامل + إعلام الأب
      updateHidden(new Set(view.hiddenColumns ?? []));

      // columnOrder — كامل
      if (view.columnOrder?.length) setColumnOrder(view.columnOrder);

      // pinnedColumns — batch update بـ setState واحد (تجنب renders متعددة)
      setPinConfigBatch(view.pinnedColumns ?? {});

      setLocalPage(1);
      if (urlState?.enabled) {
        url.writeFilters(view.filters);
        url.writeSort(view.sorts);
        url.writeSearch(view.searchQuery);
        url.writePage(1);
      }
      setViewsMenuOpen(false);
    },
    [
      setFilters, setSorts, setGlobalQuery,
      setLocalPerPage, updateHidden,
      setColumnOrder, setPinConfigBatch,
      setLocalPage, url, urlState,
    ],
  );

  // ── Context Menu 🆕 ───────────────────────────────────────────────────────
  const defaultContextMenuItems = useCallback(
    (ctx: ContextMenuContext): ContextMenuItem[] => {
      const items: ContextMenuItem[] = [];
      if (ctx.type === 'cell') {
        items.push(
          {
            label: 'نسخ القيمة',
            icon: 'copy',
            onClick: c => {
              if (c.value) navigator.clipboard.writeText(String(c.value));
            },
          },
          { divider: true },
          {
            label: 'فلتر بنفس القيمة',
            icon: 'filter',
            onClick: c => {
              if (c.colKey && c.value)
                setFilters(prev => ({ ...prev, [c.colKey!]: String(c.value) }));
            },
          },
          {
            label: 'تعديل الخلية',
            icon: 'edit',
            onClick: () => {},
            disabled: !allColDefs.find(col => col.key === ctx.colKey)?.editable,
          },
        );
      } else if (ctx.type === 'row') {
        items.push(
          {
            label: 'نسخ معرف الصف',
            icon: 'copy',
            onClick: c => {
              if (c.row) navigator.clipboard.writeText(String(c.row.id));
            },
          },
          {
            label: 'توسيع/طي',
            icon: 'arrows-expand',
            onClick: c => {
              if (c.rowIndex !== undefined) {
                toggleExpanded(rowKey(data[c.rowIndex], c.rowIndex), new MouseEvent('click'));
              }
            },
          },
        );
      } else if (ctx.type === 'header') {
        items.push(
          {
            label: 'إخفاء العمود',
            icon: 'eye-off',
            onClick: c => {
              if (c.colKey) toggleColVisibility(c.colKey);
            },
          },
          {
            label: 'تثبيت العمود',
            icon: 'pin',
            onClick: c => {
              if (c.colKey) pinColumn(c.colKey, 'start');
            },
          },
        );
      }
      return items;
    },
    [allColDefs, data, rowKey, toggleExpanded, toggleColVisibility, pinColumn, setFilters],
  );

  const { menuState, closeMenu } = useContextMenu(
    enableContextMenu ? contextMenuItems || defaultContextMenuItems : () => [],
    tableWrapRef,
    data,   // ✅ context.row يحتاج بيانات الصف الفعلية
  );

  // ✅ إصلاح: إغلاق قائمة السياق بـ Escape (كانت تبقى مفتوحة بدون هذا)
  useEscapeKey(closeMenu);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedRows = useMemo(
    () => data.filter((r, i) => selectedKeys.has(rowKey(r, i))),
    [data, rowKey, selectedKeys],
  );
  const hiddenCount = hiddenKeys.size;

  // ── Drag scroll (desktop) ─────────────────────────────────────────────────
  const dragState = useRef<{ startX: number; scrollLeft: number } | null>(null);

  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'button, input, select, a, label, [role="button"], [draggable]',
        )
      )
        return;
      const el = tableWrapRef.current;
      if (!el) return;
      dragState.current = {
        startX: e.pageX - el.getBoundingClientRect().left,
        scrollLeft: el.scrollLeft,
      };
      el.classList.add('dt-dragging');
    },
    [],
  );

  const handleDragMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      e.preventDefault();
      const el = tableWrapRef.current;
      if (!el) return;
      const x = e.pageX - el.getBoundingClientRect().left;
      const walk = (x - dragState.current.startX) * 1.3;
      el.scrollLeft = dragState.current.scrollLeft - walk;
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    if (!dragState.current) return;
    dragState.current = null;
    tableWrapRef.current?.classList.remove('dt-dragging');
  }, []);

  // helper: تنفيذ الـ export حسب الصيغة
  const handleExport = useCallback((format: ExportFormat) => {
    const cfg      = exportConfig ?? {};
    const fileName = cfg.fileName ?? exportName;
    const title    = cfg.title;
    const includeHiddenColumns = cfg.includeHiddenColumns ?? false;

    // ✅ تحويل aggregates من format الـ state إلى format التصدير
    const aggregatesForExport = showAggregates && aggregates
      ? Object.fromEntries(
          Object.entries(aggregates).map(([k, v]) => [
            k,
            { type: v.type, value: v.value ?? 0 },
          ]),
        )
      : {};

    const opts = {
      fileName,
      title,
      includeHiddenColumns,
      // ✅ documentInfo يصل الآن للملف
      documentInfo: documentInfo ?? {},
      // ✅ aggregates الجاهزة من الـ state
      includeAggregates: showAggregates && !!aggregates,
      aggregates: aggregatesForExport,
      // خيارات excel الأساسية
      ...cfg.excelOptions,
      // ✅ خيارات advanced (orientation، sheetName، onSave)
      ...excelExportAdvancedOptions,
    };

    setExportMenuOpen(false);
    switch (format) {
      case 'csv':   exportToCSV(processedData, visibleCols, fileName); break;
      case 'excel': exportToExcel(processedData, visibleCols, opts); break;
      case 'json':  exportToJSON(processedData, visibleCols, opts); break;
      case 'print': exportToPrint(processedData, visibleCols, opts); break;
    }
  }, [
    exportConfig, exportName, processedData, visibleCols,
    documentInfo, excelExportAdvancedOptions,
    showAggregates, aggregates,
  ]);

  // helper: رتبة العمود في الفرز المتعدد
  const getSortIndex = (key: string) => sorts.findIndex(s => s.key === key);
  const getSortDir = (key: string) => sorts.find(s => s.key === key)?.dir ?? null;

  // ─── Render Helper: صف بيانات (useCallback لتجنب إعادة إنشاء الدالة) ──────
  const renderDataRow = useCallback((row: T, absoluteIdx: number) => {
    const rKey = rowKey(row, absoluteIdx);
    const isSelected = selectedKeys.has(rKey);
    const isExpanded = expandedKeys.has(rKey);
    const canExpand = expandable && (!isExpandable || isExpandable(row));
    const extraClass = rowClassName?.(row) ?? '';

    return (
      <React.Fragment key={rKey}>
        <tr
          className={[
            'dt-row',
            isSelected ? 'dt-row-sel' : '',
            onRowClick ? 'dt-row-click' : '',
            extraClass,
          ]
            .filter(Boolean)
            .join(' ')}
          style={isVirtual ? { height: rowHeight } : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          aria-selected={selectable ? isSelected : undefined}
          data-row-index={absoluteIdx}
        >
          {expandable && (
            <td className="dt-td-exp">
              {canExpand && (
                <button
                  className={`dt-exp-btn${isExpanded ? ' on' : ''}`}
                  onClick={e => toggleExpanded(rKey, e)}
                  type="button"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'طي' : 'توسيع'}
                >
                  <i
                    className={`ti ti-chevron-${isExpanded ? 'down' : 'left'}`}
                    aria-hidden="true"
                  />
                </button>
              )}
            </td>
          )}

          {selectable && (
            <td className="dt-td-sel" onClick={e => toggleRow(rKey, e)}>
              <input
                className="dt-cb"
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                aria-label={`تحديد الصف ${absoluteIdx + 1}`}
              />
            </td>
          )}

          {showIndex && (
            <td className="dt-td dt-td-idx">
              {((curPage - 1) * perPage + absoluteIdx + 1).toLocaleString('ar-DZ')}
            </td>
          )}

          {visibleCols.map((col, colIdx) => {
            const rawVal = getRawValue(row, col as Column<T>);
            const cellId = `${rKey}__${col.key}`;
            const isEditing = editingCell?.rowKey === rKey && editingCell?.colKey === col.key;
            const canEdit = !!col.editable && (!!onCellEdit || batchEdit);
            const isActiveCb =
              keyboardNav &&
              activeCell?.rowIndex === absoluteIdx &&
              activeCell?.colIndex === colIdx;
            const cellError = getError(cellId);

            const pendingVal = batchEdit ? batch.getPendingValue(rKey, col.key) : undefined;
            const hasPending = pendingVal !== undefined;
            const displayVal = pendingVal ?? rawVal;

            const cfResult = conditionalFormatting?.length
              ? applyConditionalFormat(
                  rawVal,
                  row as Record<string, unknown>,
                  col.key,
                  conditionalFormatting as any,
                )
              : { style: {}, className: '' };

            const sticky = getEffectiveSticky(col as Column<T>);

            return (
              <td
                key={col.key}
                className={[
                  'dt-td',
                  sticky === 'start' ? 'dt-sticky-start dt-pinned' : '',
                  sticky === 'end' ? 'dt-sticky-end dt-pinned' : '',
                  canEdit && !isEditing ? 'dt-td-editable' : '',
                  isActiveCb ? 'dt-cell-active' : '',
                  hasPending ? 'dt-cell-pending' : '',
                  enableRangeSelection && isInRange(absoluteIdx, colIdx) ? 'dt-cell-selected' : '',
                  cfResult.className,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  textAlign: getTextAlign(col.align),
                  background: isEditing ? 'var(--emb)' : undefined,
                  whiteSpace: isEditing ? 'normal' : undefined,
                  position: cellError ? 'relative' : undefined,
                  ...cfResult.style,
                }}
                data-row-index={absoluteIdx}
                data-col-key={col.key}
                onClick={e => {
                  if (keyboardNav) activateCell({ rowIndex: isVirtual ? idx : absoluteIdx, colIndex: colIdx });
                  if (enableRangeSelection) selectCell(absoluteIdx, colIdx, e.shiftKey);
                  if (canEdit && !isEditing) startEdit(rKey, col.key, rawVal, e);
                }}
                title={canEdit && !isEditing ? 'انقر للتعديل' : undefined}
                tabIndex={keyboardNav ? 0 : undefined}
              >
                {isEditing && col.editable ? (
                  <>
                    <EditInput
                      def={col.editable}
                      value={editingCell!.value}
                      onChange={v => setEditingCell(p => (p ? { ...p, value: v } : null))}
                      onCommit={commitEdit}
                      onCancel={cancelEdit}
                    />
                    {cellError && <div className="dt-cell-error">{cellError}</div>}
                  </>
                ) : col.render ? (
                  <span className={hasPending ? 'dt-pending-value' : undefined}>
                    {col.render(row, absoluteIdx)}
                  </span>
                ) : (
                  <span className={hasPending ? 'dt-pending-value' : undefined}>
                    {String(displayVal ?? '—')}
                  </span>
                )}
              </td>
            );
          })}

          {rowActions && (
            <td
              style={{ textAlign: 'center', padding: '0 6px', whiteSpace: 'nowrap' }}
              onClick={e => e.stopPropagation()}
            >
              {rowActions(row)}
            </td>
          )}
        </tr>

        {isExpanded && renderExpanded && (
          <tr>
            <td colSpan={totalColSpan} className="dt-exp-td">
              <div className="dt-exp-inner">{renderExpanded(row, absoluteIdx)}</div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rowKey, selectable, expandable, showIndex, rowActions, keyboardNav,
    visibleCols, editingCell, batchEdit, batch, conditionalFormatting,
    getEffectiveSticky, activeCell, getError, startEdit, activateCell,
    commitEdit, cancelEdit, onRowClick, rowClassName,
    curPage, perPage, isVirtual, rowHeight, totalColSpan,
    renderExpanded, expandedKeys, toggleExpanded, selectedKeys, toggleRow,
    enableRangeSelection, isInRange, selectCell,
  ]);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div
      className={`dt-v7${compact ? ' compact' : ''}`}
      tabIndex={keyboardNav ? 0 : undefined}
      onKeyDown={keyboardNav ? kbHandleKeyDown : undefined}
    >
      {/* ══ TOOLBAR ═════════════════════════════════════════════════════════ */}
      <div className="dt-toolbar">
        <div className="dt-toolbar-left">
          {title && <span className="dt-toolbar-title">{title}</span>}

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
                  className="dt-search-clear"
                  onClick={() => handleSearchChange('')}
                  aria-label="مسح البحث"
                  type="button"
                >
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {activeFilterCount > 0 && (
            <span className="dt-filter-badge">
              <i className="ti ti-filter" aria-hidden="true" />
              {activeFilterCount}
              <button onClick={clearAllFilters} aria-label="مسح كل الفلاتر" type="button">
                ×
              </button>
            </span>
          )}

          {groupBy && groups && (
            <div className="dt-toolbar-group-btns">
              <button
                className="dt-tbtn"
                onClick={expandAllGroups}
                type="button"
                title="توسيع كل المجموعات"
              >
                <i className="ti ti-layout-list" />
                توسيع الكل
              </button>
              <button
                className="dt-tbtn"
                onClick={collapseAllGroups}
                type="button"
                title="طي كل المجموعات"
              >
                <i className="ti ti-layout-rows" />
                طي الكل
              </button>
            </div>
          )}
        </div>

        <div className="dt-toolbar-right">
          {headerActions}
          {headerActions && <div className="dt-divider" />}

          {/* per page — select أنيق بدلاً من chips */}
          {!isVirtual && (
            <div className="dt-pp-wrap">
              <label className="dt-pp-label" htmlFor="dt-pp-select">
                <i className="ti ti-layout-rows" aria-hidden="true" />
              </label>
              <div className="dt-pp-select-wrap">
                <select
                  id="dt-pp-select"
                  className="dt-pp-select"
                  value={perPage}
                  onChange={e => changePerPage(Number(e.target.value))}
                  aria-label="عدد الصفوف لكل صفحة"
                >
                  {PER_PAGE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} صف</option>
                  ))}
                </select>
                <i className="ti ti-chevron-down dt-pp-chevron" aria-hidden="true" />
              </div>
            </div>
          )}

          {isVirtual && (
            <span className="dt-virtual-badge">
              <i className="ti ti-viewport-narrow" />
              Virtual • {processedData.length.toLocaleString('ar-DZ')} صف
            </span>
          )}

          {/* Keyboard nav indicator */}
          {keyboardNav && (
            <span
              className="dt-tbtn"
              style={{ cursor: 'default', opacity: 0.7 }}
              title="التنقل بلوحة المفاتيح مفعّل — Arrows/Tab/F2/Escape"
            >
              <i className="ti ti-keyboard" />
              KB
            </span>
          )}

          {/* Multi-sort clear */}
          {multiSort && sorts.length > 0 && (
            <button className="dt-tbtn" onClick={clearSort} type="button">
              <i className="ti ti-arrows-sort" />
              مسح الفرز ({sorts.length})
            </button>
          )}

          {/* Unpin all */}
          {(pinConfig.start?.length || pinConfig.end?.length) && (
            <button
              className="dt-tbtn"
              onClick={clearAllPins}
              type="button"
              title="إزالة كل التثبيتات"
            >
              <i className="ti ti-pinned-off" />
            </button>
          )}

          {/* 🆕 Smart Filter */}
          {enableSmartFilter && (
            <button
              className="dt-tbtn"
              onClick={handleSmartFilter}
              type="button"
              title="فلتر ذكي بالعربية"
            >
              <i className="ti ti-robot" />
              فلتر ذكي
            </button>
          )}

          {/* 🆕 Saved Views */}
          {enableSavedViews && (
            <div className="dt-col-menu-wrap">
              <button
                className="dt-tbtn"
                onClick={() => setViewsMenuOpen(v => !v)}
                type="button"
              >
                <i className="ti ti-bookmark" />
                العروض
              </button>
              {viewsMenuOpen && (
                <div className="dt-col-menu" style={{ minWidth: '200px' }}>
                  <div className="dt-col-menu-header">
                    <span>العروض المحفوظة</span>
                    <button
                      onClick={() => { setViewsMenuOpen(false); handleSaveCurrentView(); }}
                      type="button"
                      title="حفظ العرض الحالي"
                    >
                      <i className="ti ti-plus" /> حفظ
                    </button>
                  </div>
                  {savedViewsList.length === 0 && (
                    <div style={{ padding: '8px', color: 'var(--t4)' }}>لا توجد عروض</div>
                  )}
                  {savedViewsList.map(view => (
                    <div
                      key={view.id}
                      className="dt-col-item"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span onClick={() => handleApplyView(view)}>{view.name}</span>
                      <button
                        onClick={() => {
                          deleteView(view.id);
                          setSavedViewsList(loadViews());
                        }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🆕 Export Menu — يجمع CSV + Excel + JSON + Print */}
          {(exportable || enableExcelExport || exportConfig) && (() => {
            const formats = exportConfig?.formats ?? (
              enableExcelExport
                ? ['csv', 'excel', 'json', 'print'] as ExportFormat[]
                : ['csv', 'json', 'print'] as ExportFormat[]
            );
            const ITEMS: { fmt: ExportFormat; icon: string; label: string; ext: string }[] = [
              { fmt: 'csv',   icon: 'ti-file-text',        label: 'CSV',         ext: '.csv' },
              { fmt: 'excel', icon: 'ti-file-spreadsheet', label: 'Excel',       ext: '.xlsx' },
              { fmt: 'json',  icon: 'ti-file-code',        label: 'JSON',        ext: '.json' },
              { fmt: 'print', icon: 'ti-printer',          label: 'طباعة / PDF', ext: '' },
            ].filter(i => formats.includes(i.fmt));

            return (
              <div ref={exportMenuRef} className="dt-export-wrap">
                <button
                  className={`dt-tbtn${exportMenuOpen ? ' on' : ''}`}
                  onClick={() => setExportMenuOpen(p => !p)}
                  aria-expanded={exportMenuOpen}
                  aria-haspopup="menu"
                  title="تصدير البيانات"
                  type="button"
                >
                  <i className="ti ti-download" aria-hidden="true" />
                  تصدير
                  <i className="ti ti-chevron-down dt-export-chevron" aria-hidden="true" />
                </button>

                {exportMenuOpen && (
                  <div className="dt-export-menu" role="menu">
                    <div className="dt-export-menu-title">تصدير البيانات</div>
                    <div className="dt-export-menu-count">
                      {processedData.length.toLocaleString('ar-DZ')} سجل
                    </div>
                    {ITEMS.map(item => (
                      <button
                        key={item.fmt}
                        className="dt-export-item"
                        role="menuitem"
                        type="button"
                        onClick={() => handleExport(item.fmt)}
                      >
                        <i className={`ti ${item.icon} dt-export-item-icon`} aria-hidden="true" />
                        <span className="dt-export-item-label">{item.label}</span>
                        {item.ext && (
                          <span className="dt-export-item-ext">{item.ext}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="dt-divider" />

          {/* إدارة الأعمدة */}
          <div ref={colMenuRef} className="dt-col-menu-wrap">
            <button
              className={`dt-tbtn${hiddenCount > 0 ? ' on' : ''}`}
              onClick={() => setColMenuOpen(p => !p)}
              aria-expanded={colMenuOpen}
              aria-label="إظهار / إخفاء الأعمدة"
              title="إدارة الأعمدة"
              type="button"
            >
              <i className="ti ti-layout-columns" aria-hidden="true" />
              {hiddenCount > 0 ? `الأعمدة (${hiddenCount})` : 'الأعمدة'}
            </button>

            {colMenuOpen && (
              <div className="dt-col-menu" role="menu">
                <div className="dt-col-menu-header">
                  <span>الأعمدة</span>
                  <button onClick={toggleCollapseAll} type="button">
                    {allHidden ? (
                      <>
                        <i className="ti ti-eye" /> إظهار الكل
                      </>
                    ) : (
                      <>
                        <i className="ti ti-eye-off" /> إخفاء الكل
                      </>
                    )}
                  </button>
                </div>
                {nonIndexCols.map(col => (
                  <label
                    key={col.key}
                    className="dt-col-item"
                    role="menuitemcheckbox"
                    aria-checked={!hiddenKeys.has(col.key)}
                  >
                    <input
                      className="dt-ms-checkbox"
                      type="checkbox"
                      checked={!hiddenKeys.has(col.key)}
                      onChange={() => toggleColVisibility(col.key)}
                    />
                    <span title={col.exportHeader ?? (typeof col.header === 'string' ? col.header : '')}>{col.exportHeader ?? col.header}</span>
                    {!col.disablePin && (
                      <div className="dt-col-pin-actions">
                        <button
                          className={`dt-pin-btn${isPinned(col.key) === 'start' ? ' active' : ''}`}
                          onClick={e => {
                            e.preventDefault();
                            pinColumn(
                              col.key,
                              isPinned(col.key) === 'start' ? null : 'start',
                            );
                          }}
                          title="تثبيت يميناً"
                          type="button"
                        >
                          <i className="ti ti-pin" />
                        </button>
                        <button
                          className={`dt-pin-btn${isPinned(col.key) === 'end' ? ' active' : ''}`}
                          onClick={e => {
                            e.preventDefault();
                            pinColumn(
                              col.key,
                              isPinned(col.key) === 'end' ? null : 'end',
                            );
                          }}
                          title="تثبيت يساراً"
                          type="button"
                        >
                          <i className="ti ti-pin-filled" />
                        </button>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ BULK BAR ════════════════════════════════════════════════════════ */}
      {selectable && selectedKeys.size > 0 && bulkActions && (
        <div className="dt-bulk" role="toolbar" aria-label="إجراءات المحددين">
          <span className="dt-bulk-count">
            <i className="ti ti-check" aria-hidden="true" />
            {selectedKeys.size.toLocaleString('ar-DZ')} محدد
          </span>
          {bulkActions(selectedRows, clearSelection)}
          <button
            className="dt-bulk-clear"
            onClick={clearSelection}
            aria-label="إلغاء التحديد"
            type="button"
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      {/* ══ ERROR ══════════════════════════════════════════════════════════ */}
      {error && (
        <div className="dt-error" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ══ TABLE — Desktop ═════════════════════════════════════════════════ */}
      <div
        className="dt-desktop dt-table-outer"
        ref={tableWrapRef}
        style={
          isVirtual
            ? {
                height: virtualHeight,
                overflowY: 'auto',
                overflowX: 'auto',
                position: 'relative',
              }
            : undefined
        }
        onMouseDown={isVirtual ? undefined : handleDragMouseDown}
        onMouseMove={isVirtual ? undefined : handleDragMouseMove}
        onMouseUp={isVirtual ? undefined : handleDragEnd}
        onMouseLeave={isVirtual ? undefined : handleDragEnd}
      >
        {isVirtual && (
          <div
            style={{
              height: totalHeight,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        <table
          className="dt-table"
          role="grid"
          aria-rowcount={total}
          style={
            isVirtual
              ? {
                  position: 'sticky',
                  top: 0,
                  tableLayout: 'fixed',
                  width: '100%',
                }
              : { tableLayout: 'auto', width: 'max-content', minWidth: '100%' }
          }
        >
          <colgroup>
            {expandable && <col style={{ width: 36 }} />}
            {selectable && <col style={{ width: 36 }} />}
            {showIndex && <col style={{ width: 44 }} />}
            {visibleCols.map(col => (
              <col
                key={col.key}
                style={{ width: colWidths[col.key] ?? col.width ?? undefined }}
              />
            ))}
            {rowActions && <col style={{ width: 80 }} />}
          </colgroup>

          {/* ── thead ──────────────────────────────────────────────────────── */}
          <thead>
            {/* ── صف Column Groups (إذا مفعّل) ──────────────────────────── */}
            {isGrouped && resolvedGroups.length > 0 && (
              <tr className="dt-group-header-row">
                {expandable && <th />}
                {selectable && <th />}
                {showIndex && <th />}
                {resolvedGroups.map(({ group, collapsed, colspan }) => (
                  <th
                    key={group.key}
                    colSpan={colspan}
                    className="dt-th dt-th-group"
                    style={{ textAlign: 'center', background: 'var(--bg3)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span>{group.header}</span>
                      {group.collapsible && (
                        <button
                          className="dt-tbtn"
                          style={{ padding: '0 4px', fontSize: 11 }}
                          onClick={() => toggleGroupCollapse(group.key)}
                          type="button"
                          title={collapsed ? 'توسيع المجموعة' : 'طي المجموعة'}
                        >
                          <i className={`ti ti-chevron-${collapsed ? 'left' : 'down'}`} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {rowActions && <th />}
              </tr>
            )}
            <tr>
              {expandable && <th className="dt-th dt-th-exp" />}
              {selectable && (
                <th className="dt-th dt-th-sel">
                  <input
                    ref={indRef}
                    className="dt-cb"
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="تحديد الكل"
                  />
                </th>
              )}
              {showIndex && <th className="dt-th dt-th-idx">{indexHeader}</th>}

              {visibleCols.map(col => {
                const canSort = col.sortable !== false;
                const sortIdx = getSortIndex(col.key);
                const sortDir = getSortDir(col.key);
                const isSorted = sortDir !== null;
                const singleSorted = !multiSort && legacySortState.key === col.key;
                const singleDir = !multiSort ? legacySortState.dir : null;

                const canDrag = columnReorder && !col.sticky && !col.disableDrag;
                const isDragOver = dragOverKey === col.key;
                const sticky = getEffectiveSticky(col as Column<T>);
                const pinned = isPinned(col.key);

                return (
                  <th
                    key={col.key}
                    className={[
                      'dt-th',
                      canSort ? 'dt-th-sort' : '',
                      isSorted || singleSorted ? 'dt-th-sorted' : '',
                      sticky === 'start' ? 'dt-sticky-start dt-pinned' : '',
                      sticky === 'end' ? 'dt-sticky-end dt-pinned' : '',
                      isDragOver ? 'dt-th-drag-over' : '',
                      canDrag ? 'dt-th-draggable' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ textAlign: getTextAlign(col.align), position: 'relative' }}
                    aria-sort={
                      isSorted || singleSorted
                        ? (sortDir ?? singleDir) === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    draggable={canDrag}
                    onDragStart={
                      canDrag ? e => dragHandlers.onDragStart(col.key, e) : undefined
                    }
                    onDragOver={
                      canDrag ? e => dragHandlers.onDragOver(col.key, e) : undefined
                    }
                    onDrop={canDrag ? e => dragHandlers.onDrop(col.key, e) : undefined}
                    onDragEnd={canDrag ? dragHandlers.onDragEnd : undefined}
                    data-col-key={col.key}
                  >
                    <div className="dt-th-inner">
                      {canSort ? (
                        <button
                          className="dt-sort-btn"
                          onClick={e => handleSortToggle(col.key, e)}
                          type="button"
                          title={
                            multiSort
                              ? 'Click للفرز • Shift+Click لإضافة عمود فرز'
                              : 'Click للفرز'
                          }
                        >
                          {col.header}
                          <span className="dt-sort-ic" aria-hidden="true">
                            {multiSort && isSorted ? (
                              <>
                                <span className="dt-sort-priority">{sortIdx + 1}</span>
                                <i
                                  className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`}
                                />
                              </>
                            ) : singleSorted ? (
                              <i
                                className={`ti ti-arrow-${singleDir === 'asc' ? 'up' : 'down'}`}
                              />
                            ) : (
                              <i className="ti ti-arrows-sort" />
                            )}
                          </span>
                        </button>
                      ) : (
                        <span title={col.exportHeader ?? (typeof col.header === 'string' ? col.header : '')}>{col.exportHeader ?? col.header}</span>
                      )}

                      {col.filter && (
                        <button
                          ref={getFilterBtnRef(col.key)}
                          className={`dt-flt-btn${filters[col.key] ? ' on' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            setOpenFilterKey(p => (p === col.key ? null : col.key));
                          }}
                          type="button"
                          aria-label={`فلتر ${typeof col.header === 'string' ? col.header : ''}`}
                          aria-expanded={openFilterKey === col.key}
                        >
                          <i
                            className={`ti ${filters[col.key] ? 'ti-filter-filled' : 'ti-filter'}`}
                            aria-hidden="true"
                          />
                        </button>
                      )}

                      {!col.disablePin && (
                        <button
                          className={`dt-th-pin-btn${pinned ? ' active' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            setPinMenuKey(p => (p === col.key ? null : col.key));
                          }}
                          title="تثبيت العمود"
                          type="button"
                          aria-label="خيارات تثبيت العمود"
                        >
                          <i className={`ti ${pinned ? 'ti-pinned' : 'ti-pin'}`} />
                        </button>
                      )}

                      <span
                        className="dt-rh"
                        onMouseDown={e =>
                          startResize(
                            col.key,
                            colWidths[col.key] ?? col.width ?? 120,
                            e,
                          )
                        }
                        onDoubleClick={() => resetWidth(col.key)}
                        aria-hidden="true"
                        title="اسحب لتغيير العرض • دوبل-كليك لإعادة الضبط"
                      />
                    </div>

                    {pinMenuKey === col.key && (
                      <PinMenu
                        colKey={col.key}
                        current={pinned}
                        onPin={side => {
                          pinColumn(col.key, side);
                          setPinMenuKey(null);
                        }}
                        onClose={() => setPinMenuKey(null)}
                      />
                    )}

                    {openFilterKey === col.key && col.filter && (
                      <FilterPopup
                        col={col as Column<Record<string, unknown>>}
                        value={filters[col.key] ?? ''}
                        onChange={v => handleFilterChange(col.key, v)}
                        anchorRef={getFilterBtnRef(col.key)}
                        onClose={() => setOpenFilterKey(null)}
                        allData={allData as Record<string, unknown>[] | undefined}
                        data={data as Record<string, unknown>[]}
                      />
                    )}
                  </th>
                );
              })}

              {rowActions && <th className="dt-th dt-th-acts" />}
            </tr>
          </thead>

          {/* ── tbody ──────────────────────────────────────────────────────── */}
          <tbody style={isVirtual ? { transform: `translateY(${offsetY}px)` } : undefined}>
            {loading ? (
              <SkeletonRows rows={8} cols={totalColSpan} />
            ) : isTreeMode ? (
              // ── Tree Data rendering ──────────────────────────────────────
              treeRows.length === 0 ? (
                <tr>
                  <td colSpan={totalColSpan} className="dt-empty-td">
                    <div className="dt-empty" role="status">
                      <i className="ti ti-inbox" aria-hidden="true" />
                      <span className="dt-empty-text">{emptyText}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                treeRows.map(({ row, level, hasChildren, collapsed: nodeCollapsed, id }, treeIdx) => {
                  const rKey = id;
                  return (
                    <tr
                      key={String(rKey)}
                      className="dt-row"
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      data-row-index={treeIdx}
                    >
                      {expandable && <td className="dt-td-exp" />}
                      {selectable && <td className="dt-td-sel" />}
                      {showIndex && <td className="dt-td dt-td-idx">{level + 1}</td>}
                      {visibleCols.map((col, colIdx) => {
                        const rawVal = getRawValue(row, col as Column<T>);
                        const isFirst = colIdx === 0;
                        return (
                          <td
                            key={col.key}
                            className="dt-td"
                            style={{ textAlign: getTextAlign(col.align) }}
                          >
                            {isFirst ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  paddingRight: `${level * (treeConfig?.indentPx ?? 20)}px`,
                                }}
                              >
                                {hasChildren ? (
                                  <button
                                    className="dt-exp-btn"
                                    onClick={e => { e.stopPropagation(); toggleTreeNode(id); }}
                                    type="button"
                                    aria-expanded={!nodeCollapsed}
                                  >
                                    <i className={`ti ti-chevron-${nodeCollapsed ? 'left' : 'down'}`} />
                                  </button>
                                ) : (
                                  <span style={{ width: 20, display: 'inline-block' }} />
                                )}
                                {col.render ? col.render(row, 0) : String(rawVal ?? '—')}
                              </span>
                            ) : (
                              col.render ? col.render(row, 0) : String(rawVal ?? '—')
                            )}
                          </td>
                        );
                      })}
                      {rowActions && <td style={{ textAlign: 'center' }}>{rowActions(row)}</td>}
                    </tr>
                  );
                })
              )
            ) : groups ? (
              groups.length === 0 ? (
                <tr>
                  <td colSpan={totalColSpan} className="dt-empty-td">
                    <div className="dt-empty" role="status">
                      <i className="ti ti-inbox" aria-hidden="true" />
                      <span className="dt-empty-text">{emptyText}</span>
                      {emptyAction}
                    </div>
                  </td>
                </tr>
              ) : (
                groups.map(group => (
                  <React.Fragment key={String(group.value)}>
                    <tr
                      className="dt-group-row"
                      onClick={() => toggleGroup(String(group.value))}
                      aria-expanded={!group.collapsed}
                    >
                      <td colSpan={totalColSpan}>
                        <div className="dt-group-cell">
                          <i
                            className={`ti ti-chevron-${group.collapsed ? 'left' : 'down'} dt-group-chevron`}
                            aria-hidden="true"
                          />
                          {(() => {
                            const groupCol = visibleCols.find(c => c.key === groupBy!.key);
                            return groupCol?.groupRenderer
                              ? groupCol.groupRenderer(group.value, group.rows as T[])
                              : <span className="dt-group-label">{group.label}</span>;
                          })()}
                          <span className="dt-group-count">{group.rows.length}</span>
                        </div>
                      </td>
                    </tr>

                    {!group.collapsed &&
                      (group.rows as T[]).map((row, idx) => renderDataRow(row, idx))}

                    {!group.collapsed &&
                      groupBy?.showSubTotals &&
                      showAggregates &&
                      aggregates && (
                        <tr className="dt-group-subtotal">
                          {expandable && <td />}
                          {selectable && <td />}
                          {showIndex && <td />}
                          {visibleCols.map((col, ci) => {
                            const groupAgg = groupSubTotals?.[String(group.value)]?.[col.key] as { value: unknown; type: string } | undefined;
                            const agg = groupAgg ?? aggregates[col.key];
                            if (ci === 0)
                              return (
                                <td key={col.key}>
                                  <span className="dt-agg-label">Σ</span>
                                </td>
                              );
                            if (!agg || agg.value == null) return <td key={col.key} />;
                            const fmt = col.aggregateFormat
                              ? col.aggregateFormat(agg.value, agg.type)
                              : agg.value.toLocaleString('fr-DZ', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                });
                            return (
                              <td key={col.key} style={{ textAlign: getTextAlign(col.align) }}>
                                <span className="dt-agg-value">{fmt}</span>
                              </td>
                            );
                          })}
                          {rowActions && <td />}
                        </tr>
                      )}
                  </React.Fragment>
                ))
              )
            ) : (isVirtual ? virtualDisplayData : displayData).length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} className="dt-empty-td">
                  <div className="dt-empty" role="status">
                    <i className="ti ti-inbox" aria-hidden="true" />
                    <span className="dt-empty-text">{emptyText}</span>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              (isVirtual ? virtualDisplayData : displayData).map((row, idx) => {
                const absoluteIdx = isVirtual ? visibleRange.start + idx : idx;
                const rKey = rowKey(row, absoluteIdx);

                // في وضع virtual: نُغلّف كل صف بـ VirtualRow memo
                // حتى تحرك الـ scroll لا يُعيد render الصف ما لم تتغير بياناته
                if (isVirtual) {
                  const isRowEditing = editingCell?.rowKey === rKey;
                  const isRowActive = !!(activeCell && activeCell.rowIndex === (isVirtual ? idx : absoluteIdx));
                  const rowInRange = enableRangeSelection
                    ? isInRange(absoluteIdx, 0) // تحقق أن الصف داخل النطاق
                    : false;

                  // dataHash: نفضل updated_at لأنه خفيف — fallback إلى JSON.stringify
                  const dataHash = String((row as Record<string, unknown>).updated_at ?? JSON.stringify(row));
                  return (
                    <VirtualRow
                      key={rKey}
                      rowDataKey={rKey}
                      dataHash={dataHash}
                      isSelected={selectedKeys.has(rKey)}
                      isExpanded={expandedKeys.has(rKey)}
                      isEditing={!!isRowEditing}
                      isActive={isRowActive}
                      inRange={rowInRange}
                      rowNode={null}
                      renderFn={() => renderDataRow(row, absoluteIdx)}
                    />
                  );
                }

                return renderDataRow(row, absoluteIdx);
              })
            )}
          </tbody>

          {/* ── Aggregates footer ──────────────────────────────────────────── */}
          {showAggregates && aggregates && !loading && processedData.length > 0 && !groupBy && (
            <tfoot>
              <tr className="dt-agg-row" aria-label="صف الإجماليات">
                {expandable && <td />}
                {selectable && <td />}
                {showIndex && <td />}

                {visibleCols.map((col, ci) => {
                  const agg = aggregates[col.key];

                  if (ci === 0) {
                    return (
                      <td key={col.key}>
                        <span className="dt-agg-label">
                          <i className="ti ti-math-function" aria-hidden="true" />
                          {aggregateLabel ?? 'Σ'}
                        </span>
                      </td>
                    );
                  }

                  if (!agg || agg.value == null) return <td key={col.key} />;

                  const canCycle = typeof col.aggregate === 'string';
                  const formatted = col.aggregateFormat
                    ? col.aggregateFormat(agg.value, agg.type)
                    : agg.value.toLocaleString('fr-DZ', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });

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
                          onKeyDown={e => e.key === 'Enter' && cycleAgg(col.key)}
                        >
                          <span className="dt-agg-type">{AGG_LABELS[agg.type]}</span>
                          <span className="dt-agg-value">{formatted}</span>
                        </span>
                      ) : (
                        <span className="dt-agg-value">{formatted}</span>
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

      {/* ══ CARDS — Mobile ══════════════════════════════════════════════════ */}
      <div className="dt-mobile dt-mobile-wrap">
        {loading ? (
          <SkeletonCards count={4} />
        ) : displayData.length === 0 ? (
          <div className="dt-empty" role="status">
            <i className="ti ti-inbox" aria-hidden="true" />
            <span className="dt-empty-text">{emptyText}</span>
          </div>
        ) : (
          displayData.map((row, idx) => {
            const rKey = rowKey(row, idx);
            const cardCols = visibleCols.slice(0, 4);
            return (
              <div key={rKey} className="dt-card-item" onClick={() => onRowClick?.(row)}>
                <div className="dt-card-grid">
                  {cardCols.map(col => (
                    <div key={col.key}>
                      <div className="dt-card-label">{col.header}</div>
                      <div className="dt-card-value">
                        {col.render
                          ? col.render(row, idx)
                          : String(getRawValue(row, col as Column<T>) ?? '—')}
                      </div>
                    </div>
                  ))}
                </div>
                {rowActions && (
                  <div className="dt-card-actions" onClick={e => e.stopPropagation()}>
                    {rowActions(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      {!isVirtual && (
        <div className="dt-footer">
          <div className="dt-footer-info" aria-live="polite">
            {loading ? (
              <i className="ti ti-loader-2 dt-footer-spinner" aria-hidden="true" />
            ) : total > 0 ? (
              <span>
                {((curPage - 1) * perPage + 1).toLocaleString('ar-DZ')}
                {'–'}
                {Math.min(curPage * perPage, total).toLocaleString('ar-DZ')}
                {' من '}
                <strong>{total.toLocaleString('ar-DZ')}</strong>
              </span>
            ) : null}

            {selectedKeys.size > 0 && (
              <span className="bx be">{selectedKeys.size.toLocaleString('ar-DZ')} محدد</span>
            )}
          </div>

          {lastPage > 1 && (
            <nav aria-label="التنقل بين الصفحات" className="dt-pagination">
              {/* زر السابق */}
              <button
                className="dt-pg-arrow"
                disabled={curPage <= 1}
                onClick={() => goToPage(curPage - 1)}
                aria-label="الصفحة السابقة"
                type="button"
                title="السابق"
              >
                <i className="ti ti-chevron-right" />
              </button>

              {/* ✅ أرقام الصفحات الظاهرة — تستخدم pageNumbers المحسوبة أعلاه */}
              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`ell-${i}`} className="dt-pg-ellipsis" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={p}
                    className={`dt-pg-btn${p === curPage ? ' active' : ''}`}
                    onClick={() => goToPage(p as number)}
                    type="button"
                    aria-label={`الصفحة ${p}`}
                    aria-current={p === curPage ? 'page' : undefined}
                  >
                    {(p as number).toLocaleString('ar-DZ')}
                  </button>
                )
              )}

              {/* للجداول ذات صفحات كثيرة: إدخال رقم مباشر */}
              {lastPage > 7 && (
                <div className="dt-pg-select-wrap" title="انتقل إلى صفحة">
                  <select
                    className="dt-pg-select"
                    value={curPage}
                    onChange={e => goToPage(Number(e.target.value))}
                    aria-label="اختر الصفحة"
                  >
                    {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                      <option key={p} value={p}>{p.toLocaleString('ar-DZ')}</option>
                    ))}
                  </select>
                  <i className="ti ti-chevron-down dt-pg-select-icon" aria-hidden="true" />
                </div>
              )}

              {/* زر التالي */}
              <button
                className="dt-pg-arrow"
                disabled={curPage >= lastPage}
                onClick={() => goToPage(curPage + 1)}
                aria-label="الصفحة التالية"
                type="button"
                title="التالي"
              >
                <i className="ti ti-chevron-left" />
              </button>
            </nav>
          )}
        </div>
      )}

      {/* Virtual footer */}
      {isVirtual && (
        <div className="dt-footer">
          <div className="dt-footer-info" aria-live="polite">
            {loading ? (
              <i className="ti ti-loader-2 dt-footer-spinner" aria-hidden="true" />
            ) : (
              <span>
                <i className="ti ti-eye" style={{ marginLeft: 4 }} />
                يعرض <strong>{visibleRange.end - visibleRange.start + 1}</strong>
                {' صف من '}
                <strong>{total.toLocaleString('ar-DZ')}</strong>
                {' (virtual scroll)'}
              </span>
            )}
            {selectedKeys.size > 0 && (
              <span className="bx be">{selectedKeys.size.toLocaleString('ar-DZ')} محدد</span>
            )}
          </div>
          {sorts.length > 0 && (
            <button className="dt-tbtn" onClick={clearSort} type="button">
              <i className="ti ti-arrows-sort" />
              مسح الفرز ({sorts.length})
            </button>
          )}
        </div>
      )}

      {/* ══ BATCH EDIT BAR ════════════════════════════════════════════════════ */}
      {batchEdit && batch.hasPending && (
        <div className="dt-batch-bar">
          <div className="dt-batch-info">
            <i className="ti ti-edit" />
            {batch.pendingCount} تعديل معلّق
            <button
              className="dt-tbtn"
              onClick={batch.undo}
              disabled={!batch.canUndo}
              title="تراجع (Ctrl+Z)"
              type="button"
            >
              <i className="ti ti-arrow-back-up" />
            </button>
            <button
              className="dt-tbtn"
              onClick={batch.redo}
              disabled={!batch.canRedo}
              title="إعادة (Ctrl+Y)"
              type="button"
            >
              <i className="ti ti-arrow-forward-up" />
            </button>
          </div>
          <div className="dt-batch-actions">
            <button
              className="dt-tbtn dt-batch-discard"
              onClick={batch.discard}
              type="button"
            >
              <i className="ti ti-x" />
              تجاهل
            </button>
            <button
              className="dt-tbtn dt-batch-save"
              onClick={batch.save}
              type="button"
            >
              <i className="ti ti-device-floppy" />
              حفظ التعديلات ({batch.pendingCount})
            </button>
          </div>
        </div>
      )}

      {/* 🆕 CONTEXT MENU */}
      {enableContextMenu && menuState.visible && menuState.context && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={(contextMenuItems || defaultContextMenuItems)(menuState.context)}
          context={menuState.context}
          onClose={closeMenu}
        />
      )}

      {/* 🆕 SMART FILTER DIALOG */}
      {enableSmartFilter && smartFilterOpen && (
        <div className="dt-overlay" role="presentation" aria-hidden="true">
          <div
            ref={smartFilterRef}
            className="dt-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="فلتر ذكي"
          >
            <div className="dt-dialog-header">
              <span className="dt-dialog-title">
                <i className="ti ti-robot" />
                فلتر ذكي بالعربية
              </span>
              <button className="dt-dialog-close" onClick={closeSmartFilter} type="button" aria-label="إغلاق">
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="dt-dialog-body">
              <p className="dt-dialog-hint">
                اكتب وصفاً مثل: &quot;فواتير متأخرة أكثر من 30 يوم&quot; أو &quot;الفرز حسب التاريخ تنازلي&quot;
              </p>
              <input
                ref={smartInputRef}
                className="dt-fi dt-dialog-input"
                type="text"
                value={smartFilterInput}
                onChange={e => setSmartFilterInput(e.target.value)}
                placeholder="اكتب استعلامك هنا..."
                onKeyDown={e => {
                  if (e.key === 'Enter') submitSmartFilter();
                  if (e.key === 'Escape') closeSmartFilter();
                }}
                aria-label="نص الفلتر الذكي"
              />
            </div>
            <div className="dt-dialog-footer">
              <button className="dt-tbtn" onClick={closeSmartFilter} type="button">
                إلغاء
              </button>
              <button
                className="dt-tbtn dt-batch-save"
                onClick={submitSmartFilter}
                disabled={!smartFilterInput.trim()}
                type="button"
              >
                <i className="ti ti-filter" />
                تطبيق الفلتر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 SAVE VIEW DIALOG */}
      {enableSavedViews && saveViewDialogOpen && (
        <div className="dt-overlay" role="presentation" aria-hidden="true">
          <div
            className="dt-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="حفظ العرض"
          >
            <div className="dt-dialog-header">
              <span className="dt-dialog-title">
                <i className="ti ti-bookmark" />
                حفظ العرض الحالي
              </span>
              <button
                className="dt-dialog-close"
                onClick={() => setSaveViewDialogOpen(false)}
                type="button"
                aria-label="إغلاق"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="dt-dialog-body">
              <p className="dt-dialog-hint">أدخل اسماً للعرض ليتم حفظ الفلاتر والترتيب وإعدادات الأعمدة.</p>
              <input
                ref={saveViewInputRef}
                className="dt-fi dt-dialog-input"
                type="text"
                value={saveViewName}
                onChange={e => setSaveViewName(e.target.value)}
                placeholder="اسم العرض..."
                onKeyDown={e => {
                  if (e.key === 'Enter') commitSaveView();
                  if (e.key === 'Escape') setSaveViewDialogOpen(false);
                }}
                aria-label="اسم العرض"
                maxLength={50}
              />
            </div>
            <div className="dt-dialog-footer">
              <button
                className="dt-tbtn"
                onClick={() => setSaveViewDialogOpen(false)}
                type="button"
              >
                إلغاء
              </button>
              <button
                className="dt-tbtn dt-batch-save"
                onClick={commitSaveView}
                disabled={!saveViewName.trim()}
                type="button"
              >
                <i className="ti ti-device-floppy" />
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PinMenu — قائمة تثبيت العمود
// ════════════════════════════════════════════════════════════════════════════

const PinMenu = memo(function PinMenu({
  colKey,
  current,
  onPin,
  onClose,
}: {
  colKey: string;
  current: 'start' | 'end' | null;
  onPin: (side: 'start' | 'end' | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [onClose]);

  return (
    <div className="dt-pin-menu" ref={ref} role="menu" aria-label="خيارات التثبيت">
      <button
        className={current === 'start' ? 'active' : ''}
        onClick={() => onPin(current === 'start' ? null : 'start')}
        type="button"
        role="menuitem"
      >
        <i className="ti ti-pin" />
        {current === 'start' ? 'إلغاء التثبيت يميناً' : 'تثبيت يميناً'}
      </button>
      <button
        className={current === 'end' ? 'active' : ''}
        onClick={() => onPin(current === 'end' ? null : 'end')}
        type="button"
        role="menuitem"
      >
        <i className="ti ti-pin-filled" />
        {current === 'end' ? 'إلغاء التثبيت يساراً' : 'تثبيت يساراً'}
      </button>
      {current && (
        <button onClick={() => onPin(null)} type="button" role="menuitem">
          <i className="ti ti-pinned-off" />
          إزالة التثبيت
        </button>
      )}
    </div>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// DataTableErrorBoundary — يمنع خطأ في عمود واحد من إسقاط الصفحة كاملاً
// ════════════════════════════════════════════════════════════════════════════

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class DataTableErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DataTable] خطأ في التصيير:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          style={{
            padding: '24px',
            background: 'var(--bg2, #fff8f8)',
            border: '1px solid var(--red2, #fca5a5)',
            borderRadius: '8px',
            textAlign: 'center',
            direction: 'rtl',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--t1, #111)' }}>
            حدث خطأ في عرض الجدول
          </div>
          <div style={{ fontSize: 13, color: 'var(--t3, #666)', marginBottom: 16 }}>
            {this.state.error?.message ?? 'خطأ غير متوقع'}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 18px',
              background: 'var(--primary, #2563eb)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DataTable;
