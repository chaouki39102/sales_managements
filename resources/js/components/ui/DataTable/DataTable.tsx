// ════════════════════════════════════════════════════════════════════════════
// DataTable/DataTable.tsx  —  v10.0
//
// ✅ كل ميزات v9 محفوظة بالكامل (Virtual Scroll، Column Reorder، Multi-Sort، URL State)
// ✅ Column Resize محفوظ (كان مفقوداً في نسخة v10 السابقة)
// ✅ Filter Popup يعمل صحيحاً (portal داخل th وليس فوق الصفحة)
// ✅ Toolbar منظّم ومتسق مع v9
//
// 🆕 Row Grouping         — groupBy={{ key:'status', defaultCollapsed:false }}
// 🆕 Column Pinning       — pinnedColumns / زر تثبيت في رأس العمود
// 🆕 Keyboard Navigation  — keyboardNav={true} → Arrows/Tab/F2/Escape
// 🆕 Batch Edit + Undo    — batchEdit={true} → Ctrl+Z/Y، حفظ دفعي
// 🆕 Cell Validation      — column.validation → رسائل خطأ مضمّنة
// 🆕 Conditional Format   — conditionalFormatting={[...]}
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
  ActiveCell, PendingEdit,
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
} from './utils';

import {
  useColumnResize, useIsMobile,
  useVirtualScroll, useColumnDragReorder, useURLState, useMultiSort,
  useRowGrouping, useColumnPinning, useKeyboardNav, useBatchEdit, useCellValidation,
} from './hooks';

import FilterPopup                                  from './FilterPopup';
import { SkeletonRows, SkeletonCards, EditInput }   from './Primitives';

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function DataTable<T = Record<string, unknown>>({
  data,
  columns,
  rowKey,
  loading            = false,
  error              = null,
  pagination,
  onFilterChange,
  onSortChange,
  onMultiSortChange,
  onSearchChange,
  selectable         = false,
  onSelect,
  bulkActions,
  onCellEdit,
  // v10: batch edit
  batchEdit          = false,
  onBatchSave,
  expandable         = false,
  renderExpanded,
  isExpandable,
  showAggregates     = false,
  aggregateLabel,
  searchable         = false,
  searchPlaceholder  = 'بحث...',
  showIndex          = false,
  indexHeader        = '#',
  rowActions,
  headerActions,
  title,
  emptyText          = 'لا توجد بيانات',
  emptyAction,
  compact            = false,
  exportable         = false,
  exportName         = 'export',
  onRowClick,
  rowClassName,
  allData,
  // v9 props
  virtual,
  columnReorder      = false,
  initialColumnOrder,
  onColumnOrderChange,
  multiSort          = false,
  urlState,
  // v10 props
  groupBy,
  pinnedColumns,
  onPinnedColumnsChange,
  keyboardNav        = false,
  conditionalFormatting,
}: DataTableProps<T>) {

  // ── Responsive ────────────────────────────────────────────────────────────
  const isMobile = useIsMobile(639);

  // ── URL State ─────────────────────────────────────────────────────────────
  const url = useURLState(urlState);

  // ── Column visibility ─────────────────────────────────────────────────────
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

  const toggleCollapseAll = useCallback(() => {
    if (allHidden) {
      setHiddenKeys(new Set());
    } else {
      const firstKey = nonIndexCols[0]?.key;
      setHiddenKeys(new Set(nonIndexCols.filter(c => c.key !== firstKey).map(c => c.key)));
    }
    setColMenuOpen(false);
  }, [allHidden, nonIndexCols]);

  // ── Column resize ✅ (محفوظ من v9) ────────────────────────────────────────
  const initialWidthsRef = useRef<Record<string, number>>(
    Object.fromEntries(columns.filter(c => c.width).map(c => [c.key, c.width!])),
  );
  const { widths: colWidths, startResize, resetWidth } = useColumnResize(initialWidthsRef.current);

  // ── Column Reorder (v9) ───────────────────────────────────────────────────
  const defaultOrder = useMemo(
    () => initialColumnOrder ?? columns.map(c => c.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { columnOrder, dragOverKey, dragHandlers } = useColumnDragReorder(
    defaultOrder,
    onColumnOrderChange,
  );

  const orderedColumns = useMemo(() => {
    if (!columnReorder) return columns;
    const map     = new Map(columns.map(c => [c.key, c]));
    const ordered = columnOrder.map(k => map.get(k)).filter(Boolean) as Column<T>[];
    const inOrder = new Set(columnOrder);
    columns.forEach(c => { if (!inOrder.has(c.key)) ordered.push(c); });
    return ordered;
  }, [columns, columnOrder, columnReorder]);

  // ── 🆕 Column Pinning ─────────────────────────────────────────────────────
  const { pinConfig, pinColumn, isPinned, clearAllPins } = useColumnPinning(
    pinnedColumns,
    onPinnedColumnsChange,
  );
  const [pinMenuKey, setPinMenuKey] = useState<string | null>(null);

  // دمج sticky من Column definition مع dynamic pinning
  const getEffectiveSticky = useCallback((col: Column<T>): 'start' | 'end' | null => {
    const dynamic = isPinned(col.key);
    if (dynamic) return dynamic;
    if (col.sticky === 'start') return 'start';
    if (col.sticky === 'end')   return 'end';
    return null;
  }, [isPinned]);

  // ── Global search ─────────────────────────────────────────────────────────
  const [globalQuery, setGlobalQuery] = useState(() => url.readInitialSearch());
  const searchTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => { onSearchChangeRef.current = onSearchChange; }, [onSearchChange]);

  const handleSearchChange = useCallback((v: string) => {
    setGlobalQuery(v);
    if (!pagination) setLocalPage(1);
    url.writeSearch(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onSearchChangeRef.current?.(v);
    }, SEARCH_DEBOUNCE);
  }, [pagination, url]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  // ── Column filters ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterMap>(() => url.readInitialFilters());
  const onFilterChangeRef     = useRef(onFilterChange);
  useEffect(() => { onFilterChangeRef.current = onFilterChange; }, [onFilterChange]);

  const isServerPaged = !!pagination;

  const handleFilterChange = useCallback((key: string, val: string) => {
    setFilters(prev => {
      const next = { ...prev };
      val ? (next[key] = val) : delete next[key];
      url.writeFilters(next);
      Promise.resolve().then(() => onFilterChangeRef.current?.(next));
      return next;
    });
    if (!isServerPaged) setLocalPage(1);
  }, [isServerPaged, url]);

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

  const getFilterBtnRef = (key: string): React.RefObject<HTMLButtonElement> => {
    if (!filterBtnRefs.current[key]) {
      filterBtnRefs.current[key] = React.createRef<HTMLButtonElement>();
    }
    return filterBtnRefs.current[key];
  };

  // ── Multi-sort (v9) ───────────────────────────────────────────────────────
  const {
    sorts,
    toggleSort: toggleMultiSort,
    clearSort,
    legacySortState,
  } = useMultiSort(
    url.readInitialSort(),
    onMultiSortChange,
    onSortChange,
  );

  const handleSortToggle = useCallback((key: string, e: React.MouseEvent) => {
    const shiftKey = multiSort && e.shiftKey;
    toggleMultiSort(key, shiftKey);
    url.writeSort(sorts);
    if (!isServerPaged) setLocalPage(1);
  }, [multiSort, toggleMultiSort, url, sorts, isServerPaged]);

  // ── Client-side data processing ───────────────────────────────────────────
  const isClientFiltered = !onFilterChange;
  const isClientSorted   = !onSortChange && !onMultiSortChange;

  const processedData = useMemo(() => {
    let r = data;
    if (isClientFiltered) r = applyClientFilter(r, filters, orderedColumns);
    if (searchable && globalQuery) r = applyGlobalSearch(r, globalQuery, orderedColumns);
    if (isClientSorted) {
      if (multiSort && sorts.length > 0) {
        r = applyMultiSort(r, sorts, orderedColumns);
      } else if (legacySortState.key) {
        r = applyClientSort(r, legacySortState, orderedColumns);
      }
    }
    return r;
  }, [
    data, filters, globalQuery, sorts, legacySortState,
    orderedColumns, isClientFiltered, isClientSorted, searchable, multiSort,
  ]);

  // ── 🆕 Row Grouping ───────────────────────────────────────────────────────
  const { groups, toggleGroup, expandAll: expandAllGroups, collapseAll: collapseAllGroups } =
    useRowGrouping(processedData, groupBy, orderedColumns as Column<Record<string, unknown>>[]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [localPage,    setLocalPage]    = useState(() => url.readInitialPage());
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
    url.writePage(c);
  }, [isServerPaged, url]);

  const changePerPage = useCallback((n: number) => {
    if (isServerPaged) {
      paginationRef.current!.onPerPage(n);
      paginationRef.current!.onPage(1);
    } else {
      setLocalPerPage(n);
      setLocalPage(1);
    }
  }, [isServerPaged]);

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
    rowCount:        isVirtual ? processedData.length : 0,
    rowHeight:       virtual?.rowHeight       ?? DEFAULT_ROW_HEIGHT,
    containerHeight: virtual?.containerHeight ?? DEFAULT_CONTAINER_HEIGHT,
    overscan:        virtual?.overscan,
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
  const indRef      = useRef<HTMLInputElement>(null);
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
  useEffect(() => { onCellEditRef.current = onCellEdit; }, [onCellEdit]);

  // ── 🆕 Batch Edit ─────────────────────────────────────────────────────────
  const batch = useBatchEdit({ enabled: batchEdit, onBatchSave });

  // ── 🆕 Cell Validation ────────────────────────────────────────────────────
  const { validate: validateCell, getError, clearError } = useCellValidation();

  const startEdit = useCallback((rKey: string | number, colKey: string, rawVal: unknown, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCell({ rowKey: rKey, colKey, value: rawVal == null ? '' : String(rawVal) });
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell) { setEditingCell(null); return; }
    const { rowKey: rKey, colKey, value } = editingCell;
    const rowIdx = data.findIndex((r, i) => rowKey(r, i) === rKey);
    if (rowIdx < 0) { setEditingCell(null); return; }

    const col = columns.find(c => c.key === colKey);
    const oldValue = col ? getRawValue(data[rowIdx], col) : undefined;
    const cellId   = `${rKey}__${colKey}`;

    // Validation
    if (col?.validation) {
      const row = data[rowIdx] as Record<string, unknown>;
      const ok  = validateCell(value, col.validation, row, cellId);
      if (!ok) return; // لا تُغلق الخلية إذا فيها خطأ
    } else {
      clearError(cellId);
    }

    if (batchEdit) {
      batch.recordEdit({
        rowKey:   rKey,
        colKey,
        oldValue: String(oldValue ?? ''),
        newValue: value,
      });
    } else if (onCellEditRef.current) {
      onCellEditRef.current({ row: data[rowIdx], rowIndex: rowIdx, colKey, oldValue, newValue: value });
    }

    setEditingCell(null);
  }, [editingCell, data, rowKey, columns, batchEdit, batch, validateCell, clearError]);

  const cancelEdit = useCallback(() => {
    if (editingCell) clearError(`${editingCell.rowKey}__${editingCell.colKey}`);
    setEditingCell(null);
  }, [editingCell, clearError]);

  // ── 🆕 Keyboard Navigation ────────────────────────────────────────────────
  const {
    activeCell, isEditing: kbIsEditing, handleKeyDown: kbHandleKeyDown, activateCell,
  } = useKeyboardNav({
    enabled:  keyboardNav,
    rowCount: (isVirtual ? virtualDisplayData : displayData).length,
    colCount: visibleCols.length,
    onStartEdit: (cell) => {
      const rowData   = (isVirtual ? virtualDisplayData : displayData)[cell.rowIndex];
      if (!rowData) return;
      const col    = visibleCols[cell.colIndex];
      if (!col?.editable) return;
      const rKey   = rowKey(rowData, cell.rowIndex);
      const rawVal = getRawValue(rowData, col as Column<T>);
      setEditingCell({ rowKey: rKey, colKey: col.key, value: rawVal == null ? '' : String(rawVal) });
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedRows = useMemo(
    () => data.filter((r, i) => selectedKeys.has(rowKey(r, i))),
    [data, rowKey, selectedKeys],
  );
  const hiddenCount = hiddenKeys.size;

  // ── Drag scroll (desktop) ─────────────────────────────────────────────────
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const dragState    = useRef<{ startX: number; scrollLeft: number } | null>(null);

  const handleDragMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, label, [role="button"], [draggable]')) return;
    const el = tableWrapRef.current;
    if (!el) return;
    dragState.current = { startX: e.pageX - el.getBoundingClientRect().left, scrollLeft: el.scrollLeft };
    el.classList.add('dt-dragging');
  }, []);

  const handleDragMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    e.preventDefault();
    const el = tableWrapRef.current;
    if (!el) return;
    const x    = e.pageX - el.getBoundingClientRect().left;
    const walk = (x - dragState.current.startX) * 1.3;
    el.scrollLeft = dragState.current.scrollLeft - walk;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragState.current) return;
    dragState.current = null;
    tableWrapRef.current?.classList.remove('dt-dragging');
  }, []);

  // helper: رتبة العمود في الفرز المتعدد
  const getSortIndex = (key: string) => sorts.findIndex(s => s.key === key);
  const getSortDir   = (key: string) => sorts.find(s => s.key === key)?.dir ?? null;

  // ─── Render Helper: صف بيانات ──────────────────────────────────────────────
  const renderDataRow = (row: T, absoluteIdx: number) => {
    const rKey       = rowKey(row, absoluteIdx);
    const isSelected = selectedKeys.has(rKey);
    const isExpanded = expandedKeys.has(rKey);
    const canExpand  = expandable && (!isExpandable || isExpandable(row));
    const extraClass = rowClassName?.(row) ?? '';

    return (
      <React.Fragment key={rKey}>
        <tr
          className={[
            'dt-row',
            isSelected ? 'dt-row-sel' : '',
            onRowClick ? 'dt-row-click' : '',
            extraClass,
          ].filter(Boolean).join(' ')}
          style={isVirtual ? { height: rowHeight } : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          aria-selected={selectable ? isSelected : undefined}
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
                  <i className={`ti ti-chevron-${isExpanded ? 'down' : 'left'}`} aria-hidden="true" />
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
            const rawVal   = getRawValue(row, col as Column<T>);
            const cellId   = `${rKey}__${col.key}`;
            const isEditing  = editingCell?.rowKey === rKey && editingCell?.colKey === col.key;
            const canEdit    = !!col.editable && (!!onCellEdit || batchEdit);
            const isActiveCb = keyboardNav && activeCell?.rowIndex === absoluteIdx && activeCell?.colIndex === colIdx;
            const cellError  = getError(cellId);

            // Batch Edit: القيمة المعلّقة
            const pendingVal = batchEdit ? batch.getPendingValue(rKey, col.key) : undefined;
            const hasPending = pendingVal !== undefined;
            const displayVal = pendingVal ?? rawVal;

            // Conditional Formatting
            const cfResult = conditionalFormatting?.length
              ? applyConditionalFormat(rawVal, row as Record<string, unknown>, col.key, conditionalFormatting as any)
              : { style: {}, className: '' };

            // Sticky
            const sticky = getEffectiveSticky(col as Column<T>);

            return (
              <td
                key={col.key}
                className={[
                  'dt-td',
                  sticky === 'start' ? 'dt-sticky-start dt-pinned' : '',
                  sticky === 'end'   ? 'dt-sticky-end dt-pinned'   : '',
                  canEdit && !isEditing   ? 'dt-td-editable'  : '',
                  isActiveCb             ? 'dt-cell-active'   : '',
                  hasPending             ? 'dt-cell-pending'  : '',
                  cfResult.className,
                ].filter(Boolean).join(' ')}
                style={{
                  textAlign:  getTextAlign(col.align),
                  background: isEditing ? 'var(--emb)' : undefined,
                  whiteSpace: isEditing ? 'normal' : undefined,
                  position:   cellError ? 'relative' : undefined,
                  ...cfResult.style,
                }}
                onClick={e => {
                  if (keyboardNav) activateCell({ rowIndex: absoluteIdx, colIndex: colIdx });
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
                      onChange={v => setEditingCell(p => p ? { ...p, value: v } : null)}
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
              <div className="dt-exp-inner">
                {renderExpanded(row, absoluteIdx)}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

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
              <button onClick={clearAllFilters} aria-label="مسح كل الفلاتر" type="button">×</button>
            </span>
          )}

          {/* 🆕 Group controls */}
          {groupBy && groups && (
            <div className="dt-toolbar-group-btns">
              <button className="dt-tbtn" onClick={expandAllGroups} type="button" title="توسيع كل المجموعات">
                <i className="ti ti-layout-list" />
                توسيع الكل
              </button>
              <button className="dt-tbtn" onClick={collapseAllGroups} type="button" title="طي كل المجموعات">
                <i className="ti ti-layout-rows" />
                طي الكل
              </button>
            </div>
          )}
        </div>

        <div className="dt-toolbar-right">
          {headerActions}
          {headerActions && <div className="dt-divider" />}

          {/* per page */}
          {!isVirtual && (
            <div className="dt-pp-wrap">
              {PER_PAGE_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  className={`dt-pp-chip${perPage === n ? ' on' : ''}`}
                  onClick={() => changePerPage(n)}
                  aria-label={`${n} صف لكل صفحة`}
                  aria-pressed={perPage === n}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {isVirtual && (
            <span className="dt-virtual-badge">
              <i className="ti ti-viewport-narrow" />
              Virtual • {processedData.length.toLocaleString('ar-DZ')} صف
            </span>
          )}

          {/* 🆕 Keyboard nav indicator */}
          {keyboardNav && (
            <span className="dt-tbtn" style={{ cursor: 'default', opacity: .7 }} title="التنقل بلوحة المفاتيح مفعّل — Arrows/Tab/F2/Escape">
              <i className="ti ti-keyboard" />
              KB
            </span>
          )}

          {/* 🆕 Multi-sort clear */}
          {multiSort && sorts.length > 0 && (
            <button className="dt-tbtn" onClick={clearSort} type="button">
              <i className="ti ti-arrows-sort" />
              مسح الفرز ({sorts.length})
            </button>
          )}

          {/* 🆕 Unpin all */}
          {(pinConfig.start?.length || pinConfig.end?.length) && (
            <button className="dt-tbtn" onClick={clearAllPins} type="button" title="إزالة كل التثبيتات">
              <i className="ti ti-pinned-off" />
            </button>
          )}

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
                    {allHidden
                      ? <><i className="ti ti-eye" /> إظهار الكل</>
                      : <><i className="ti ti-eye-off" /> إخفاء الكل</>}
                  </button>
                </div>
                {nonIndexCols.map(col => (
                  <label key={col.key} className="dt-col-item" role="menuitemcheckbox"
                         aria-checked={!hiddenKeys.has(col.key)}>
                    <input
                      className="dt-ms-checkbox"
                      type="checkbox"
                      checked={!hiddenKeys.has(col.key)}
                      onChange={() => toggleColVisibility(col.key)}
                    />
                    <span>{col.header}</span>
                    {/* 🆕 Pin actions in column menu */}
                    {!col.disablePin && (
                      <div className="dt-col-pin-actions">
                        <button
                          className={`dt-pin-btn${isPinned(col.key) === 'start' ? ' active' : ''}`}
                          onClick={e => { e.preventDefault(); pinColumn(col.key, isPinned(col.key) === 'start' ? null : 'start'); }}
                          title="تثبيت يميناً"
                          type="button"
                        >
                          <i className="ti ti-pin" />
                        </button>
                        <button
                          className={`dt-pin-btn${isPinned(col.key) === 'end' ? ' active' : ''}`}
                          onClick={e => { e.preventDefault(); pinColumn(col.key, isPinned(col.key) === 'end' ? null : 'end'); }}
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

          {/* تصدير */}
          {exportable && (
            <button
              className="dt-tbtn"
              onClick={() => exportToCSV(processedData, columns, exportName)}
              aria-label="تصدير CSV"
              title="تصدير CSV"
              type="button"
            >
              <i className="ti ti-download" aria-hidden="true" />
              تصدير
            </button>
          )}
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
        ref={isVirtual ? scrollContainerRef : tableWrapRef}
        style={isVirtual ? {
          height:    virtualHeight,
          overflowY: 'auto',
          overflowX: 'auto',
          position:  'relative',
        } : undefined}
        onMouseDown={isVirtual ? undefined : handleDragMouseDown}
        onMouseMove={isVirtual ? undefined : handleDragMouseMove}
        onMouseUp={isVirtual ? undefined : handleDragEnd}
        onMouseLeave={isVirtual ? undefined : handleDragEnd}
      >
        {/* Virtual Scrolling: spacer */}
        {isVirtual && (
          <div style={{ height: totalHeight, position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }} />
        )}

        <table
          className="dt-table"
          role="grid"
          aria-rowcount={total}
          style={isVirtual ? {
            position:    'sticky',
            top:          0,
            tableLayout: 'fixed',
            width:       '100%',
          } : { tableLayout: 'fixed', width: '100%' }}
        >
          <colgroup>
            {expandable && <col style={{ width: 36 }} />}
            {selectable && <col style={{ width: 36 }} />}
            {showIndex  && <col style={{ width: 44 }} />}
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
                const canSort     = col.sortable !== false;
                const sortIdx     = getSortIndex(col.key);
                const sortDir     = getSortDir(col.key);
                const isSorted    = sortDir !== null;
                const singleSorted = !multiSort && legacySortState.key === col.key;
                const singleDir    = !multiSort ? legacySortState.dir : null;

                const canDrag   = columnReorder && !col.sticky && !col.disableDrag;
                const isDragOver = dragOverKey === col.key;
                const sticky    = getEffectiveSticky(col as Column<T>);
                const pinned    = isPinned(col.key);

                return (
                  <th
                    key={col.key}
                    className={[
                      'dt-th',
                      canSort                       ? 'dt-th-sort'     : '',
                      isSorted || singleSorted      ? 'dt-th-sorted'   : '',
                      sticky === 'start'            ? 'dt-sticky-start dt-pinned' : '',
                      sticky === 'end'              ? 'dt-sticky-end dt-pinned'   : '',
                      isDragOver                    ? 'dt-th-drag-over' : '',
                      canDrag                       ? 'dt-th-draggable' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ textAlign: getTextAlign(col.align), position: 'relative' }}
                    aria-sort={
                      isSorted || singleSorted
                        ? (sortDir ?? singleDir) === 'asc' ? 'ascending' : 'descending'
                        : undefined
                    }
                    draggable={canDrag}
                    onDragStart={canDrag ? e => dragHandlers.onDragStart(col.key, e) : undefined}
                    onDragOver={canDrag  ? e => dragHandlers.onDragOver(col.key, e)  : undefined}
                    onDrop={canDrag      ? e => dragHandlers.onDrop(col.key, e)       : undefined}
                    onDragEnd={canDrag   ? dragHandlers.onDragEnd                    : undefined}
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
                                <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} />
                              </>
                            ) : singleSorted ? (
                              <i className={`ti ti-arrow-${singleDir === 'asc' ? 'up' : 'down'}`} />
                            ) : (
                              <i className="ti ti-arrows-sort" />
                            )}
                          </span>
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}

                      {/* زر الفلتر */}
                      {col.filter && (
                        <button
                          ref={getFilterBtnRef(col.key)}
                          className={`dt-flt-btn${filters[col.key] ? ' on' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            setOpenFilterKey(p => p === col.key ? null : col.key);
                          }}
                          type="button"
                          aria-label={`فلتر ${typeof col.header === 'string' ? col.header : ''}`}
                          aria-expanded={openFilterKey === col.key}
                        >
                          <i className={`ti ${filters[col.key] ? 'ti-filter-filled' : 'ti-filter'}`} aria-hidden="true" />
                        </button>
                      )}

                      {/* 🆕 زر التثبيت في رأس العمود */}
                      {!col.disablePin && (
                        <button
                          className={`dt-th-pin-btn${pinned ? ' active' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            setPinMenuKey(p => p === col.key ? null : col.key);
                          }}
                          title="تثبيت العمود"
                          type="button"
                          aria-label="خيارات تثبيت العمود"
                        >
                          <i className={`ti ${pinned ? 'ti-pinned' : 'ti-pin'}`} />
                        </button>
                      )}

                      {/* ✅ resize handle — محفوظ من v9 */}
                      <span
                        className="dt-rh"
                        onMouseDown={e => startResize(col.key, colWidths[col.key] ?? col.width ?? 120, e)}
                        onDoubleClick={() => resetWidth(col.key)}
                        aria-hidden="true"
                        title="اسحب لتغيير العرض • دوبل-كليك لإعادة الضبط"
                      />
                    </div>

                    {/* 🆕 Pin menu */}
                    {pinMenuKey === col.key && (
                      <PinMenu
                        colKey={col.key}
                        current={pinned}
                        onPin={side => { pinColumn(col.key, side); setPinMenuKey(null); }}
                        onClose={() => setPinMenuKey(null)}
                      />
                    )}

                    {/* FilterPopup — portal يعمل صحيحاً */}
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
          <tbody
            style={isVirtual ? { transform: `translateY(${offsetY}px)` } : undefined}
          >
            {loading ? (
              <SkeletonRows rows={8} cols={totalColSpan} />
            ) : groups ? (
              /* ── Grouped mode ───────────────────────────────────────────── */
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
                    {/* رأس المجموعة */}
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
                          {/* groupRenderer مخصص أو label افتراضي */}
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

                    {/* صفوف المجموعة */}
                    {!group.collapsed && (group.rows as T[]).map((row, idx) =>
                      renderDataRow(row, idx),
                    )}

                    {/* Sub-totals */}
                    {!group.collapsed && groupBy?.showSubTotals && showAggregates && aggregates && (
                      <tr className="dt-group-subtotal">
                        {expandable && <td />}
                        {selectable && <td />}
                        {showIndex  && <td />}
                        {visibleCols.map((col, ci) => {
                          const agg = aggregates[col.key];
                          if (ci === 0) return <td key={col.key}><span className="dt-agg-label">Σ</span></td>;
                          if (!agg || agg.value == null) return <td key={col.key} />;
                          const fmt = col.aggregateFormat
                            ? col.aggregateFormat(agg.value, agg.type)
                            : agg.value.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
              /* ── Empty state ─────────────────────────────────────────────── */
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
              /* ── Normal rows ─────────────────────────────────────────────── */
              (isVirtual ? virtualDisplayData : displayData).map((row, idx) => {
                const absoluteIdx = isVirtual ? visibleRange.start + idx : idx;
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
                {showIndex  && <td />}

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

                  const canCycle  = typeof col.aggregate === 'string';
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
            const rKey     = rowKey(row, idx);
            const cardCols = visibleCols.slice(0, 4);
            return (
              <div
                key={rKey}
                className="dt-card-item"
                onClick={() => onRowClick?.(row)}
              >
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
              <button className="dt-pg" disabled={curPage <= 1}
                      onClick={() => goToPage(1)} aria-label="الصفحة الأولى" type="button">«</button>
              <button className="dt-pg" disabled={curPage <= 1}
                      onClick={() => goToPage(curPage - 1)} aria-label="الصفحة السابقة" type="button">‹</button>

              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="dt-pg-ellipsis" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`dt-pg${p === curPage ? ' on' : ''}`}
                    onClick={() => goToPage(p as number)}
                    aria-label={`الصفحة ${p}`}
                    aria-current={p === curPage ? 'page' : undefined}
                  >
                    {(p as number).toLocaleString('ar-DZ')}
                  </button>
                ),
              )}

              <button className="dt-pg" disabled={curPage >= lastPage}
                      onClick={() => goToPage(curPage + 1)} aria-label="الصفحة التالية" type="button">›</button>
              <button className="dt-pg" disabled={curPage >= lastPage}
                      onClick={() => goToPage(lastPage)} aria-label="الصفحة الأخيرة" type="button">»</button>
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

      {/* ══ 🆕 BATCH EDIT BAR ════════════════════════════════════════════════ */}
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

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PinMenu — قائمة تثبيت العمود
// ════════════════════════════════════════════════════════════════════════════

const PinMenu = memo(function PinMenu({
  colKey, current, onPin, onClose,
}: {
  colKey:  string;
  current: 'start' | 'end' | null;
  onPin:   (side: 'start' | 'end' | null) => void;
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

export default DataTable;
