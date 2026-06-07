// ════════════════════════════════════════════════════════════════════════════
// DataTable/DataTable.tsx  —  v8.1
//
// ✅ مُقسَّم بالكامل: types / utils / hooks / MultiSelect / FilterPopup / Primitives
// ✅ FilterPopup يستخدم createPortal (v8.1) — يمنع اقتطاع الـ popup
// ✅ utils.getRawValue يدعم dot-notation ("party.name", "warehouse.name"...)
// ✅ tableLayout: fixed — ضروري لعمل column resize بشكل صحيح
// ✅ datatable.css مُستورَد هنا (يُطبَّق تلقائياً عند import DataTable)
// ════════════════════════════════════════════════════════════════════════════

import './datatable.css';

import React, {
  useState, useMemo, useCallback,
  useRef, useEffect, memo,
  type ReactNode, type CSSProperties,
} from 'react';

import type {
  DataTableProps, Column, SortState, EditingCell,
  FilterMap, AggregateType, PaginationConfig,
} from './types';

import {
  AGG_CYCLE, AGG_LABELS,
  PER_PAGE_OPTIONS, SKELETON_WIDTHS, MIN_COL_WIDTH, SEARCH_DEBOUNCE,
} from './types';

import {
  getRawValue, getTextAlign,
  applyClientFilter, applyGlobalSearch, applyClientSort,
  computeAggregate, exportToCSV, buildPageNumbers,
} from './utils';

import { useColumnResize, useIsMobile } from './hooks';
import FilterPopup                       from './FilterPopup';
import { SkeletonRows, SkeletonCards, EditInput } from './Primitives';

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
  onSearchChange,
  selectable         = false,
  onSelect,
  bulkActions,
  onCellEdit,
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
}: DataTableProps<T>) {

  // ── Responsive ────────────────────────────────────────────────────────────
  const isMobile = useIsMobile(639);

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

  // ── Column resize ─────────────────────────────────────────────────────────
  const initialWidthsRef = useRef<Record<string, number>>(
    Object.fromEntries(columns.filter(c => c.width).map(c => [c.key, c.width!])),
  );
  const { widths: colWidths, startResize, resetWidth } = useColumnResize(initialWidthsRef.current);

  // ── Global search ─────────────────────────────────────────────────────────
  const [globalQuery, setGlobalQuery] = useState('');
  const searchTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // ── Column filters ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterMap>({});
  const onFilterChangeRef     = useRef(onFilterChange);
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
    onSearchChangeRef.current?.('');
  }, [isServerPaged]);

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

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sort, setSort]   = useState<SortState>({ key: null, dir: null });
  const onSortChangeRef   = useRef(onSortChange);
  useEffect(() => { onSortChangeRef.current = onSortChange; }, [onSortChange]);

  const handleSortToggle = useCallback((key: string) => {
    setSort(prev => {
      const next: SortState =
        prev.key !== key   ? { key, dir: 'asc'  } :
        prev.dir === 'asc' ? { key, dir: 'desc' } :
                             { key: null, dir: null };
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
    if (isServerPaged) {
      paginationRef.current!.onPerPage(n);
      paginationRef.current!.onPage(1);
    } else {
      setLocalPerPage(n);
      setLocalPage(1);
    }
  }, [isServerPaged]);

  const displayData = useMemo(() => {
    if (isServerPaged) return processedData;
    const s = (localPage - 1) * localPerPage;
    return processedData.slice(s, s + localPerPage);
  }, [processedData, isServerPaged, localPage, localPerPage]);

  const pageNumbers = useMemo(() => buildPageNumbers(curPage, lastPage), [curPage, lastPage]);

  // ── Visible columns ───────────────────────────────────────────────────────
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

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedRows = useMemo(
    () => data.filter((r, i) => selectedKeys.has(rowKey(r, i))),
    [data, rowKey, selectedKeys],
  );
  const hiddenCount = hiddenKeys.size;

  // ── Drag scroll ────────────────────────────────────────────────────────────
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const dragState    = useRef<{ startX: number; scrollLeft: number } | null>(null);

  const handleDragMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // تجاهل الضغط على عناصر تفاعلية
    if (target.closest('button, input, select, a, label, [role="button"]')) return;
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

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className={`dt-v7${compact ? ' compact' : ''}`}>

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
        </div>

        <div className="dt-toolbar-right">
          {headerActions}
          {headerActions && <div className="dt-divider" />}

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
              type="button"
            >
              <i className="ti ti-table-export" aria-hidden="true" />
              تصدير
            </button>
          )}

          <div className="dt-divider" />

          {/* Per-page chips */}
          <div className="dt-pp-wrap">
            {PER_PAGE_OPTIONS.map(n => (
              <button
                key={n}
                className={`dt-pp-chip${perPage === n ? ' on' : ''}`}
                onClick={() => changePerPage(n)}
                aria-label={`${n} صف في الصفحة`}
                aria-pressed={perPage === n}
                type="button"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BULK ACTIONS ════════════════════════════════════════════════════ */}
      {selectable && selectedKeys.size > 0 && bulkActions && (
        <div className="dt-bulk" role="toolbar" aria-label="إجراءات المحدد">
          <span className="dt-bulk-count">
            <i className="ti ti-check" aria-hidden="true" />
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

      {/* ══ TABLE — Desktop ═════════════════════════════════════════════════ */}
      <div
        ref={tableWrapRef}
        className="dt-table-wrap dt-desktop"
        onMouseDown={handleDragMouseDown}
        onMouseMove={handleDragMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <table role="grid" aria-rowcount={total} style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {expandable && <col style={{ width: 38 }} />}
            {selectable && <col style={{ width: 38 }} />}
            {showIndex   && <col style={{ width: 44 }} />}
            {visibleCols.map(col => (
              <col key={col.key} style={{
                width:    colWidths[col.key] ?? col.width ?? undefined,
                minWidth: col.minWidth ?? 80,
              }} />
            ))}
            {rowActions && <col style={{ width: 90 }} />}
          </colgroup>

          <thead>
            <tr>
              {expandable && (
                <th scope="col" aria-label="توسيع" />
              )}
              {selectable && (
                <th scope="col">
                  <input
                    ref={indRef}
                    type="checkbox"
                    className="dt-ms-checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="تحديد الكل"
                  />
                </th>
              )}
              {showIndex && (
                <th scope="col" className="dt-idx">{indexHeader}</th>
              )}

              {visibleCols.map(col => {
                const isActive      = sort.key === col.key;
                const canSort       = col.sortable !== false;
                const colW          = colWidths[col.key] ?? col.width;
                const hasFilter     = !!col.filter;
                const filterVal     = filters[col.key] ?? '';
                const hasFilterVal  = filterVal !== '' && filterVal !== '|';
                const btnRef        = hasFilter ? getFilterBtnRef(col.key) : null;
                const isFilterOpen  = openFilterKey === col.key;

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
                      width:     colW ?? undefined,
                      minWidth:  col.minWidth ?? 80,
                    }}
                  >
                    <div className="dt-th-inner">
                      <div className="dt-th-label">

                        {/* زر الفلتر */}
                        {hasFilter && (
                          <button
                            ref={btnRef as React.RefObject<HTMLButtonElement>}
                            className={`dt-flt-btn${hasFilterVal ? ' has-val' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              setOpenFilterKey(isFilterOpen ? null : col.key);
                            }}
                            aria-label={`فلتر ${typeof col.header === 'string' ? col.header : ''}`}
                            title="فلتر"
                            type="button"
                          >
                            <i className="ti ti-filter" aria-hidden="true" />
                          </button>
                        )}

                        {/* رأس العمود (قابل للفرز أو لا) */}
                        {canSort ? (
                          <button
                            className="dt-sort-btn"
                            onClick={() => handleSortToggle(col.key)}
                            style={{ color: isActive ? 'var(--em)' : undefined }}
                            type="button"
                          >
                            {col.header}
                            <span aria-hidden="true" style={{
                              fontSize: isActive ? 11 : 10,
                              opacity:  isActive ? 1  : .25,
                            }}>
                              {isActive ? (sort.dir === 'asc' ? '↑' : '↓') : '⇅'}
                            </span>
                          </button>
                        ) : (
                          <span>{col.header}</span>
                        )}
                      </div>
                    </div>

                    {/* مقبض تغيير العرض */}
                    <div
                      className="dt-rh"
                      onMouseDown={e => startResize(col.key, colW ?? 120, e)}
                      onDoubleClick={() => resetWidth(col.key)}
                      title="اسحب لتغيير عرض العمود"
                      aria-hidden="true"
                    />

                    {/* Filter popup — يُعرض كـ portal عبر FilterPopup */}
                    {isFilterOpen && btnRef && (
                      <FilterPopup
                        col={col as Column<Record<string, unknown>>}
                        value={filterVal}
                        onChange={v => handleFilterChange(col.key, v)}
                        anchorRef={btnRef}
                        onClose={() => setOpenFilterKey(null)}
                        allData={allData as Record<string, unknown>[] | undefined}
                        data={data as Record<string, unknown>[]}
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
                  <div className="dt-empty" role="status">
                    <i className="ti ti-inbox" aria-hidden="true" />
                    <span className="dt-empty-text">{emptyText}</span>
                    {emptyAction && <div className="dt-empty-action">{emptyAction}</div>}
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
                        background: isSelected ? 'var(--emb)' : undefined,
                      }}
                    >
                      {expandable && (
                        <td style={{ textAlign: 'center', padding: '0 8px' }}>
                          {canExpand && (
                            <button
                              className={`dt-exp-btn${isExpanded ? ' open' : ''}`}
                              onClick={e => toggleExpanded(rKey, e)}
                              aria-label={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                              type="button"
                            >
                              <i
                                className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                                aria-hidden="true"
                              />
                            </button>
                          )}
                        </td>
                      )}

                      {selectable && (
                        <td
                          style={{ textAlign: 'center', padding: '0 10px' }}
                          onClick={e => toggleRow(rKey, e)}
                        >
                          <input
                            type="checkbox"
                            className="dt-ms-checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            aria-label={`تحديد الصف ${globalIdx}`}
                          />
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
                              textAlign:  getTextAlign(col.align),
                              background: isEditing ? 'var(--emb)' : undefined,
                              whiteSpace: isEditing ? 'normal' : undefined,
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

          {/* ── Aggregates footer ─────────────────────────────────────────── */}
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

    </div>
  );
}

export default DataTable;
