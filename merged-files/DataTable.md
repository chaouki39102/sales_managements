# DataTable Components

## FILE: ./resources/js/components/ui/DataTable/ContextMenu.tsx

```
// DataTable/ContextMenu.tsx

import React, { useEffect, useRef } from 'react';
import type { ContextMenuItem, ContextMenuContext } from './types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  /** السياق الذي فُتحت منه القائمة — يُمرَّر لكل onClick */
  context: ContextMenuContext;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, context, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // منع خروج القائمة عن الشاشة
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      className="dt-context-menu"
      style={{
        position: 'fixed',
        top: adjustedY,
        left: adjustedX,
        zIndex: 10000,
        backgroundColor: 'var(--bg2)',
        border: '1px solid var(--b2)',
        borderRadius: 'var(--r2)',
        boxShadow: 'var(--shadow2)',
        minWidth: '180px',
        padding: '4px 0',
      }}
    >
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.divider ? (
            <hr style={{ margin: '4px 0', borderColor: 'var(--b1)' }} />
          ) : (
            <button
              className="dt-context-item"
              onClick={() => {
                // ✅ تمرير ContextMenuContext الصحيح — وليس ContextMenuItem
                item.onClick(context);
                onClose();
              }}
              disabled={item.disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 12px',
                background: 'none',
                border: 'none',
                fontSize: '12px',
                textAlign: 'right',
                cursor: item.disabled ? 'default' : 'pointer',
                color: item.disabled ? 'var(--t4)' : 'var(--t1)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) e.currentTarget.style.backgroundColor = 'var(--bg3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item.icon && <i className={`ti ti-${item.icon}`} style={{ fontSize: '14px' }} />}
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;

```

## FILE: ./resources/js/components/ui/DataTable/DataTable.tsx

```
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
  PER_PAGE_OPTIONS, SKELETON_WIDTHS, MIN_COL_WIDTH, SEARCH_DEBOUNCE, FILTER_DEBOUNCE,
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
  hoverActions,
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
  fetchAllForExport,
  enableQuickFilter = false,
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

  // Sync from parent prop when it changes (controlled mode)
  useEffect(() => {
    if (hiddenColumnKeys) {
      setHiddenKeys(new Set(hiddenColumnKeys));
    }
  }, [hiddenColumnKeys]);

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
  const { widths: colWidths, startResize, resetWidth, autoSize } = useColumnResize(initialWidthsRef.current);

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
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
  }, []);

  // ── Pagination state — مُعرَّف هنا لأن handleFilterChange تحتاجه ──────────
  const [localPage, setLocalPage] = useState(() => url.readInitialPage());
  const [localPerPage, setLocalPerPage] = useState(15);

  // ── Column filters ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterMap>(() => url.readInitialFilters());
  const onFilterChangeRef = useRef(onFilterChange);
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
        filterTimerRef.current = setTimeout(() => {
          onFilterChangeRef.current?.(next);
        }, FILTER_DEBOUNCE);
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

  // ── Virtual Scrolling (v9) — must come before quick filter & pagination ───
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

  // ── Quick Filter (Ctrl+F) — must be before pagination (total/lastPage depend on it) ──
  // Inline to avoid Rolldown TDZ issue with cross-module hook
  const [qfIsOpen, setQfIsOpen] = useState(false);
  const [quickFilterQuery, setQuickFilterQuery] = useState('');
  const qfInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!enableQuickFilter) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setQfIsOpen(true);
        setTimeout(() => qfInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && qfIsOpen) {
        e.preventDefault();
        setQfIsOpen(false);
        setQuickFilterQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enableQuickFilter, qfIsOpen]);
  const qfMatchCount = useMemo(() => {
    if (!quickFilterQuery.trim()) return null;
    const q = quickFilterQuery.trim().toLowerCase();
    const cols = orderedColumns.filter(c => c.searchable !== false);
    return processedData.filter(row =>
      cols.some(col => {
        const v = getRawValue(row, col as Column<T>);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    ).length;
  }, [quickFilterQuery, processedData, orderedColumns]);
  const qfOpenFn = useCallback(() => { setQfIsOpen(true); setTimeout(() => qfInputRef.current?.focus(), 50); }, []);
  const qfCloseFn = useCallback(() => { setQfIsOpen(false); setQuickFilterQuery(''); }, []);
  const isQuickFiltered = enableQuickFilter && !!quickFilterQuery.trim();

  // Quick-filtered display data — computed from processedData directly (not displayData)
  // to avoid circular dependency with selection/displayKeys
  const effectiveDisplayData = useMemo(() => {
    if (!isQuickFiltered) return displayData;
    const q = quickFilterQuery.trim().toLowerCase();
    const cols = orderedColumns.filter(c => c.searchable !== false);
    const filtered = processedData.filter(row =>
      cols.some(col => {
        const v = getRawValue(row, col as Column<T>);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
    if (isVirtual) return filtered;
    if (isServerPaged) return filtered;
    const s = (localPage - 1) * localPerPage;
    return filtered.slice(s, s + localPerPage);
  }, [isQuickFiltered, quickFilterQuery, processedData, orderedColumns, isVirtual, isServerPaged, localPage, localPerPage, displayData]);

  // ── Pagination (state مُعرَّف أعلاه قبل filters) ────────────────────────

  const paginationRef = useRef(pagination);
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);
  const lastPageRef = useRef(1);

  const curPage = isServerPaged ? pagination!.page : localPage;
  const perPage = isServerPaged ? pagination!.perPage : localPerPage;
  // Quick-filtered total (unpaginated count)
  const quickFilterTotal = useMemo(() => {
    if (!isQuickFiltered) return 0;
    const q = quickFilterQuery.trim().toLowerCase();
    const cols = orderedColumns.filter(c => c.searchable !== false);
    return processedData.filter(row =>
      cols.some(col => {
        const v = getRawValue(row, col as Column<T>);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    ).length;
  }, [isQuickFiltered, quickFilterQuery, processedData, orderedColumns]);

  const total = isServerPaged ? pagination!.total : isQuickFiltered ? quickFilterTotal : processedData.length;
  const lastPage = isServerPaged
    ? pagination!.lastPage
    : Math.max(1, Math.ceil((isQuickFiltered ? quickFilterTotal : processedData.length) / localPerPage));

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
  const [hoveredRowKey, setHoveredRowKey] = useState<string | number | null>(null);
  const indRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const displayKeys = useMemo(
    () => effectiveDisplayData.map((r, i) => rowKey(r, i)),
    [effectiveDisplayData, rowKey],
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
    rowCount: (isVirtual ? effectiveVirtualDisplayData : effectiveDisplayData).length,
    colCount: visibleCols.length,
    onStartEdit: cell => {
      const rowData = (isVirtual ? effectiveVirtualDisplayData : effectiveDisplayData)[cell.rowIndex];
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

  // ── Keyboard Shortcuts Overlay (? key) ──────────────────────────────────
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcutsOpen]);

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

  // effectiveVirtualDisplayData depends on visibleRange from useRangeSelection
  const effectiveVirtualDisplayData = useMemo(() => {
    if (!isVirtual) return effectiveDisplayData;
    return effectiveDisplayData.slice(visibleRange.start, visibleRange.end + 1);
  }, [isVirtual, effectiveDisplayData, visibleRange]);

  // Smart Filter (اللغة العربية) 🆕 ───────────────────────────────────────
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
    selectedKeys,
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
  const handleExport = useCallback(async (format: ExportFormat) => {
    const cfg      = exportConfig ?? {};
    const fileName = cfg.fileName ?? exportName;
    const title    = cfg.title;
    const includeHiddenColumns = cfg.includeHiddenColumns ?? false;

    // For server-paged tables, fetch ALL rows before exporting
    const exportData = isServerPaged && fetchAllForExport
      ? await fetchAllForExport()
      : processedData;

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
      case 'csv':   exportToCSV(exportData, visibleCols, fileName); break;
      case 'excel': exportToExcel(exportData, visibleCols, opts); break;
      case 'json':  exportToJSON(exportData, visibleCols, opts); break;
      case 'print': exportToPrint(exportData, visibleCols, opts); break;
    }
  }, [
    exportConfig, exportName, processedData, visibleCols,
    documentInfo, excelExportAdvancedOptions,
    showAggregates, aggregates, isServerPaged, fetchAllForExport,
  ]);

  // helper: رتبة العمود في الفرز المتعدد
  const sortMap = useMemo(() => {
    const map = new Map<string, { index: number; dir: 'asc' | 'desc' | null }>();
    sorts.forEach((s, i) => map.set(s.key, { index: i, dir: s.dir }));
    return map;
  }, [sorts]);
  const getSortIndex = useCallback((key: string) => sortMap.get(key)?.index ?? -1, [sortMap]);
  const getSortDir = useCallback((key: string) => sortMap.get(key)?.dir ?? null, [sortMap]);

  // ─── Render Helper: صف بيانات (useCallback لتجنب إعادة إنشاء الدالة) ──────
  const renderDataRow = useCallback((row: T, absoluteIdx: number) => {
    const rKey = rowKey(row, absoluteIdx);
    const isSelected = selectedKeys.has(rKey);
    const isExpanded = expandedKeys.has(rKey);
    const canExpand = expandable && (!isExpandable || isExpandable(row));
    const extraClass = rowClassName?.(row) ?? '';
    const hasHoverActions = !!hoverActions && hoveredRowKey === rKey;

    return (
      <React.Fragment key={rKey}>
        <tr
          className={[
            'dt-row',
            isSelected ? 'dt-row-sel' : '',
            onRowClick ? 'dt-row-click' : '',
            hasHoverActions ? 'dt-row-hovered' : '',
            extraClass,
          ]
            .filter(Boolean)
            .join(' ')}
          style={isVirtual ? { height: rowHeight } : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onMouseEnter={hoverActions ? () => setHoveredRowKey(rKey) : undefined}
          onMouseLeave={hoverActions ? () => setHoveredRowKey(null) : undefined}
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
                title={
                  isEditing ? undefined
                  : canEdit ? 'انقر للتعديل'
                  : col.tooltip
                    ? typeof col.tooltip === 'function'
                      ? col.tooltip(row, absoluteIdx)
                      : col.tooltip
                    : undefined
                }
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

        {hasHoverActions && (
          <tr className="dt-hover-row">
            <td colSpan={totalColSpan} className="dt-hover-td">
              <div className="dt-hover-bar">
                {hoverActions!(row)}
              </div>
            </td>
          </tr>
        )}

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
    rowKey, selectable, expandable, showIndex, rowActions, hoverActions, keyboardNav,
    visibleCols, editingCell, batchEdit, batch, conditionalFormatting,
    getEffectiveSticky, activeCell, getError, startEdit, activateCell,
    commitEdit, cancelEdit, onRowClick, rowClassName,
    curPage, perPage, isVirtual, rowHeight, totalColSpan,
    renderExpanded, expandedKeys, toggleExpanded, selectedKeys, toggleRow,
    enableRangeSelection, isInRange, selectCell, hoveredRowKey,
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
                      {isServerPaged
                        ? `${(pagination?.total ?? processedData.length).toLocaleString('ar-DZ')} سجل (الكل)`
                        : `${processedData.length.toLocaleString('ar-DZ')} سجل`}
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

      {/* ══ QUICK FILTER BAR ═════════════════════════════════════════════════ */}
      {enableQuickFilter && qfIsOpen && (
        <div className="dt-qf-bar" role="search" aria-label="بحث سريع">
          <span className="dt-qf-icon">
            <i className="ti ti-search" aria-hidden="true" />
          </span>
          <input
            ref={qfInputRef}
            className="dt-qf-input"
            type="text"
            value={quickFilterQuery}
            onChange={e => setQuickFilterQuery(e.target.value)}
            placeholder="بحث سريع في الجدول..."
            aria-label="بحث سريع"
            autoFocus
          />
          {quickFilterQuery && qfMatchCount !== null && (
            <span className="dt-qf-count">
              {qfMatchCount.toLocaleString('ar-DZ')} نتيجة
            </span>
          )}
          {quickFilterQuery && (
            <button
              className="dt-qf-clear"
              onClick={() => setQuickFilterQuery('')}
              type="button"
              title="مسح البحث (Escape)"
              aria-label="مسح البحث"
            >
              <i className="ti ti-x" />
            </button>
          )}
          <button
            className="dt-qf-close"
            onClick={qfCloseFn}
            type="button"
            title="إغلاق (Escape)"
            aria-label="إغلاق البحث"
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}

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
                    title={col.headerTooltip}
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
                        onDoubleClick={() => autoSize(tableWrapRef, col.key)}
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
                      {emptyAction}
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
                                  <span className="dt-agg-label">
                                    <i className="ti ti-math-function" aria-hidden="true" />
                                    {aggregateLabel ?? 'Σ'}
                                  </span>
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
                              <td key={col.key} style={{ textAlign: getTextAlign(col.align), direction: 'ltr' }}>
                                <span className="dt-agg-type">{AGG_LABELS[agg.type as AggregateType]}</span>
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
            ) : (isVirtual ? effectiveVirtualDisplayData : effectiveDisplayData).length === 0 ? (
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
              (isVirtual ? effectiveVirtualDisplayData : effectiveDisplayData).map((row, idx) => {
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
        ) : effectiveDisplayData.length === 0 ? (
          <div className="dt-empty" role="status">
            <i className="ti ti-inbox" aria-hidden="true" />
            <span className="dt-empty-text">{emptyText}</span>
          </div>
        ) : (
          effectiveDisplayData.map((row, idx) => {
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

      {/* 🆕 KEYBOARD SHORTCUTS OVERLAY (? key) */}
      {shortcutsOpen && (
        <div className="dt-overlay" role="presentation" aria-hidden="true">
          <div
            className="dt-dialog dt-shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="اختصارات لوحة المفاتيح"
            style={{ maxWidth: 480 }}
          >
            <div className="dt-dialog-header">
              <span className="dt-dialog-title">
                <i className="ti ti-keyboard" />
                اختصارات لوحة المفاتيح
              </span>
              <button
                className="dt-dialog-close"
                onClick={() => setShortcutsOpen(false)}
                type="button"
                aria-label="إغلاق"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="dt-dialog-body" style={{ padding: '12px 16px' }}>
              <table className="dt-shortcuts-table">
                <tbody>
                  <tr><td><kbd>?</kbd></td><td>إظهار/إخفاء الاختصارات</td></tr>
                  <tr><td><kbd>Ctrl</kbd>+<kbd>F</kbd></td><td>بحث سريع</td></tr>
                  <tr><td><kbd>Ctrl</kbd>+<kbd>E</kbd></td><td>تصدير</td></tr>
                  <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>حفظ الفلتر</td></tr>
                  <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd></td><td>حفظ العرض</td></tr>
                  <tr><td><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></td><td>التنقل بين الخلايا</td></tr>
                  <tr><td><kbd>Enter</kbd></td><td>تعديل الخلايا / فتح السطر</td></tr>
                  <tr><td><kbd>Escape</kbd></td><td>إلغاء التعديل / إغلاق النافذة</td></tr>
                  <tr><td><kbd>Space</kbd></td><td>تحديد السطر</td></tr>
                  <tr><td><kbd>Ctrl</kbd>+<kbd>A</kbd></td><td>تحديد الكل</td></tr>
                  <tr><td><kbd>Home</kbd></td><td>العمود الأول</td></tr>
                  <tr><td><kbd>End</kbd></td><td>العمود الأخير</td></tr>
                  {enableSmartFilter && <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd></td><td>فلتر ذكي (NL)</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="dt-dialog-footer">
              <button className="dt-tbtn" onClick={() => setShortcutsOpen(false)} type="button">
                إغلاق
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

```

## FILE: ./resources/js/components/ui/DataTable/datatable-patterns.ts

```
// ════════════════════════════════════════════════════════════════════════════
// datatable-patterns.ts — أنماط SmartFilter الخاصة بـ ERP الجزائري
//
// هذه الأنماط مفصولة عمداً عن مكتبة DataTable العامة لأنها تحتوي
// مصطلحات وحقول خاصة بهذا المشروع (overdue_days، party.name، إلخ).
//
// الاستخدام:
//   import { ERP_FILTER_PATTERNS } from './datatable-patterns';
//   useSmartFilter(columns, onFilter, ERP_FILTER_PATTERNS)
// ════════════════════════════════════════════════════════════════════════════

import type { SmartFilterPattern } from './DataTable';

export const ERP_FILTER_PATTERNS: SmartFilterPattern[] = [
  // ── فواتير متأخرة ──────────────────────────────────────────────────────
  {
    regex: /فاتورة(?:ات)?\s+(?:متأخرة\s+)?أكثر\s+من\s+(\d+)\s+يوم/,
    field: 'overdue_days',
    operator: 'gt',
    valueType: 'number',
  },
  {
    regex: /(?:تأخر|مضى)\s+أكثر\s+من\s+(\d+)\s+يوم/,
    field: 'overdue_days',
    operator: 'gt',
    valueType: 'number',
  },

  // ── مقارنات رقمية عامة ─────────────────────────────────────────────────
  {
    regex: /أقل\s+من\s+(\d[\d\s]*)(?:\s+دج)?(?:\s+(?:في|للحقل)\s+([^\s]+))?/,
    field: '$2',
    operator: 'lt',
    valueType: 'number',
  },
  {
    regex: /أكثر\s+من\s+(\d[\d\s]*)(?:\s+دج)?(?:\s+(?:في|للحقل)\s+([^\s]+))?/,
    field: '$2',
    operator: 'gt',
    valueType: 'number',
  },
  {
    regex: /بين\s+(\d[\d\s]*)\s+و(?:الى|إلى)?\s+(\d[\d\s]*)/,
    field: 'range',
    operator: 'between',
    valueType: 'number',
  },

  // ── طرف / زبون / مورد ──────────────────────────────────────────────────
  {
    regex: /(?:الزبون|الزبون|الطرف|المورد)\s+(?:اسمه\s+)?["']?([^"'\s]+)["']?/,
    field: 'party.name',
    operator: 'contains',
    valueType: 'string',
  },

  // ── الحالة ─────────────────────────────────────────────────────────────
  {
    regex: /(?:الحالة|الوضع)\s+["']?([^"'\s]+)["']?/,
    field: 'document_status.name',
    operator: 'eq',
    valueType: 'string',
  },
  {
    regex: /(?:مؤكد|مسودة|ملغى|مدفوع|جزئي)/,
    field: 'document_status.name',
    operator: 'contains',
    valueType: 'string',
  },

  // ── المخزن / المستودع ──────────────────────────────────────────────────
  {
    regex: /(?:المخزن|المستودع)\s+["']?([^"'\s]+)["']?/,
    field: 'warehouse.name',
    operator: 'contains',
    valueType: 'string',
  },

  // ── الفرز ──────────────────────────────────────────────────────────────
  {
    regex: /(?:رتب|فرز|صنّف)\s+(?:حسب\s+)?([^\s]+)\s+(تصاعدي|تنازلي|الأحدث|الأقدم)/,
    field: '$1',
    operator: 'sort',
    valueType: 'string',
  },
];

```

## FILE: ./resources/js/components/ui/DataTable/excelExportAdvanced.ts

```
// ════════════════════════════════════════════════════════════════════════════
// DataTable/excelExportAdvanced.ts — Excel Export احترافي ERP (exceljs)
// v3.2 - مصحح واحترافي
//
// ✅ الإصلاحات:
//   • سطر الإجماليات يحسب تلقائياً
//   • جميع الأعمدة تُحسب حتى بدون aggregates مُمررة
//   • numberToArabicWords معرّفة وتعمل
//   • أرقام سالبة بتمييز أحمر + قوسين
//   • Hook useERPExport محدثة بشكل صحيح
//
// الاستخدام:
//   import { exportToExcelAdvanced, useERPExport } from '@/components/ui/DataTable';
//   const { exportData } = useERPExport();
//   await exportData(data, columns, documentInfo);
// ════════════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import React, { useCallback, useEffect, useRef } from 'react';
import type { Column, AggregateType, DocumentInfo, ExcelExportAdvancedOptions } from './types';

// ════════════════════════════════════════════════════════════════════════════
// Theme — ألوان ERP الاحترافية
// ════════════════════════════════════════════════════════════════════════════

const T = {
  titleBg:     'FF1F3864',
  titleFg:     'FFFFFFFF',
  headerBg:    'FF2E5090',
  headerFg:    'FFFFFFFF',
  footerBg:    'FF1F3864',
  footerFg:    'FFFFFFFF',
  footerSumBg: 'FF243F70',
  infoBg:      'FFF0F4FF',
  infoFg:      'FF1F3864',
  altRowBg:    'FFF5F7FA',
  whiteBg:     'FFFFFFFF',
  borderDark:  'FF2E5090',
  borderLight: 'FFD0D8E8',
  textNeg:     'FFB91C1C',
  textMain:    'FF1A1A2E',
  textSub:     'FF4A5568',
  aggLabelBg:  'FFE8EEF8',
} as const;

const DOC_TAB_COLORS: Record<string, string> = {
  'فاتورة بيع':  '2E5090',
  'فاتورة شراء': '7B3F00',
  'وصل استلام':  '1A6B3C',
  'أمر شراء':    '7B5200',
  'عرض سعر':     '4A1580',
};

const AGG_SYMBOLS: Record<AggregateType, string> = {
  sum: 'Σ', avg: 'Ø', min: '↓', max: '↑', count: '#',
};

// ════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════════════════

export function formatDateShort(val: string | Date | null | undefined): string {
  if (!val) return '';
  const s = String(val);
  const dateOnly = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return [
      d.getUTCFullYear(),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      String(d.getUTCDate()).padStart(2, '0'),
    ].join('-');
  } catch {
    return s;
  }
}

/**
 * الطابع المالي الجزائري — 1% من المبلغ الإجمالي TTC
 * الحد الأقصى: 2500 دج (المادة 215 من قانون الضرائب غير المباشرة)
 * النتيجة مقرَّبة لأقرب سنتيم (جزء من مئة دينار)
 */
export function calcFiscalStamp(ttcAmount: number): number {
  if (ttcAmount <= 0) return 0;
  return Math.min(Math.round(ttcAmount * 0.01 * 100) / 100, 2500);
}

// ─── تحويل الأرقام إلى كلمات عربية ─────────────────────────────────────────

const CURRENCY_NAMES: Record<string, string> = {
  DZD: 'دينار جزائري',
  EUR: 'يورو',
  USD: 'دولار أمريكي',
  GBP: 'جنيه إسترليني',
  SAR: 'ريال سعودي',
};

function numberToArabicWords(num: number, currency: string = 'DZD'): string {
  const ones = [
    '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  ];
  const tens = [
    '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون',
  ];
  const hundreds = [
    '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
    'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة',
  ];
  const thousands = ['', 'ألف', 'مليون', 'مليار', 'تريليون'];

  const currencyName = CURRENCY_NAMES[currency] ?? currency;

  if (num === 0) return `صفر ${currencyName}`;

  let result = '';
  let groupIndex = 0;
  // ✅ let بدلاً من const لأنها تتغير في الحلقة
  let remaining = Math.abs(Math.floor(num));

  while (remaining > 0 && groupIndex < thousands.length) {
    const group = remaining % 1000;
    if (group !== 0) {
      const groupWords = convertGroupToWords(group, ones, tens, hundreds);
      const scale      = thousands[groupIndex];
      result = groupWords + (scale ? ` ${scale}` : '') + (result ? ` ${result}` : '');
    }
    remaining  = Math.floor(remaining / 1000);
    groupIndex++;
  }

  const prefix = num < 0 ? 'سالب ' : '';
  return `${prefix}${result.trim()} ${currencyName}`;
}

function convertGroupToWords(num: number, ones: string[], tens: string[], hundreds: string[]): string {
  let result = '';

  if (num >= 100) {
    result = hundreds[Math.floor(num / 100)];
    num %= 100;
  }

  if (num >= 20) {
    result += (result ? ' و' : '') + tens[Math.floor(num / 10)];
    if (num % 10 !== 0) {
      result += ' و' + ones[num % 10];
    }
  } else if (num > 0) {
    result += (result ? ' و' : '') + ones[num];
  }

  return result.trim();
}

// ✅ حساب الإجماليات من البيانات
export function computeAggregatesForExport<T extends Record<string, unknown>>(
  data: T[],
  columns: Column<T>[],
  existingAggs?: Record<string, { type: AggregateType; value: number | string }>,
): Record<string, { type: AggregateType; value: number | string }> {
  const aggs = existingAggs ? { ...existingAggs } : {};

  for (const col of columns) {
    if (!col.aggregate || aggs[col.key]) continue;

    if (typeof col.aggregate === 'function') {
      const val = col.aggregate(data);
      if (val != null) {
        aggs[col.key] = { type: 'sum', value: val };
      }
      continue;
    }

    const type = col.aggregate;
    const values = data
      .map(row => {
        const v = col.accessor ? col.accessor(row) : (row[col.key] ?? 0);
        return typeof v === 'number' ? v : Number(v ?? 0);
      })
      .filter(v => !isNaN(v));

    if (values.length === 0) continue;

    let result: number = 0;
    switch (type) {
      case 'sum':   result = values.reduce((a, b) => a + b, 0); break;
      case 'avg':   result = values.reduce((a, b) => a + b, 0) / values.length; break;
      case 'min':   result = Math.min(...values); break;
      case 'max':   result = Math.max(...values); break;
      case 'count': result = values.length; break;
    }

    aggs[col.key] = { type, value: result };
  }

  return aggs;
}

// ─── Style helpers ──────────────────────────────────────────────────────────

const bdr = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border =>
  ({ style, color: { argb } });

const allBorders = (style: ExcelJS.BorderStyle, argb: string): Partial<ExcelJS.Borders> =>
  ({ top: bdr(style, argb), bottom: bdr(style, argb), left: bdr(style, argb), right: bdr(style, argb) });

const thickBox = (): Partial<ExcelJS.Borders> => ({
  top:    bdr('medium', T.borderDark), bottom: bdr('medium', T.borderDark),
  left:   bdr('medium', T.borderDark), right:  bdr('medium', T.borderDark),
});

const outerBold = (): Partial<ExcelJS.Borders> => ({
  top:    bdr('medium', T.borderDark), bottom: bdr('medium', T.borderDark),
  left:   bdr('thin',   T.borderDark), right:  bdr('thin',   T.borderDark),
});

function styleTitle(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 16, color: { argb: T.titleFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.titleBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rightToLeft' };
  cell.border    = thickBox();
}

function styleSubtitle(cell: ExcelJS.Cell) {
  cell.font      = { italic: true, size: 10, color: { argb: 'FFAABBCC' }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.titleBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
}

function styleHeader(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 11, color: { argb: T.headerFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.headerBg } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rightToLeft' };
  cell.border    = allBorders('thin', T.borderDark);
}

function styleFooter(cell: ExcelJS.Cell, isLabel = false) {
  cell.font      = { bold: true, size: 11, color: { argb: T.footerFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLabel ? T.footerBg : T.footerSumBg } };
  cell.alignment = { horizontal: isLabel ? 'right' : 'center', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = outerBold();
}

function styleInfoLabel(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 10, color: { argb: T.infoFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.infoBg } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = allBorders('thin', T.borderLight);
}

function styleInfoValue(cell: ExcelJS.Cell) {
  cell.font      = { size: 10, color: { argb: T.textSub }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.whiteBg } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = allBorders('thin', T.borderLight);
}

// ✅ أضيف معالجة للأرقام السالبة
function styleData(cell: ExcelJS.Cell, value: unknown, isAlt: boolean, align: 'right' | 'center' | 'left' = 'right') {
  cell.font      = { size: 10, name: 'Calibri', color: { argb: T.textMain } };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? T.altRowBg : T.whiteBg } };
  cell.alignment = { horizontal: align, vertical: 'middle', readingOrder: 'rightToLeft' };
  cell.border    = allBorders('thin', T.borderLight);

  // ✅ للأرقام السالبة: أحمر + قوسين محاسبيين
  if (typeof value === 'number' && value < 0) {
    cell.font = { ...cell.font, color: { argb: T.textNeg }, bold: true };
    cell.numFmt = `[RED](#,##0.00);(#,##0.00)`;
  }
}

function styleAmountWords(cell: ExcelJS.Cell) {
  cell.font      = { italic: true, size: 9, color: { argb: T.infoFg }, name: 'Calibri' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: T.aggLabelBg } };
  cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rightToLeft', wrapText: true };
  cell.border    = allBorders('thin', T.borderLight);
}

function currencyNumFmt(currency: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'DZD';
  return `#,##0.00 "${sym}"`;
}

// ════════════════════════════════════════════════════════════════════════════
// الدالة الرئيسية
// ════════════════════════════════════════════════════════════════════════════

export async function exportToExcelAdvanced<T extends Record<string, unknown>>(
  data:    T[],
  columns: Column<T>[],
  options: ExcelExportAdvancedOptions = {},
): Promise<void> {
  const {
    fileName       = 'document.xlsx',
    title          = 'تقرير',
    documentInfo   = {} as DocumentInfo,
    showAggregates = true,
    aggregates     = {},
    currency       = documentInfo.currency ?? 'DZD',
    orientation    = 'landscape',
    sheetName      = 'البيانات',
    onSave,
  } = options;

  const numFmt   = currencyNumFmt(currency);
  const colCount = columns.length;

  // ✅ حساب الإجماليات تلقائياً إذا كانت فارغة
  let finalAggregates = aggregates;
  if (showAggregates && Object.keys(finalAggregates).length === 0) {
    finalAggregates = computeAggregatesForExport(data, columns);
  }

  // ─── Workbook ─────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = documentInfo.preparedBy ?? 'ERP System';
  wb.created  = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views:     [{ rightToLeft: true }],
    pageSetup: {
      paperSize:   9,
      orientation,
      fitToPage:   true,
      fitToWidth:  1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddHeader: `&C&"Calibri,Bold"&14${title}`,
      oddFooter:  `&L${documentInfo.company ?? ''}&C&P / &N&R${formatDateShort(new Date().toISOString())}`,
    },
  });

  const tabColor = documentInfo.documentType ? DOC_TAB_COLORS[documentInfo.documentType] : undefined;
  if (tabColor) ws.properties = { ...ws.properties, tabColor: { argb: tabColor } };

  let r = 1;

  // ── 1. صف العنوان ────────────────────────────────────────────────────────
  ws.getRow(r).height = 38;
  ws.mergeCells(r, 1, r, colCount);
  styleTitle(ws.getCell(r, 1));
  ws.getCell(r, 1).value = title;
  r++;

  // ── 2. معلومات المستند ──────────────────────────────────────────────────
  if (documentInfo.documentNumber || documentInfo.documentType) {
    const infoCells = [];
    if (documentInfo.documentNumber) infoCells.push(`رقم: ${documentInfo.documentNumber}`);
    if (documentInfo.documentType) infoCells.push(`النوع: ${documentInfo.documentType}`);

    if (infoCells.length > 0) {
      ws.getRow(r).height = 20;
      ws.mergeCells(r, 1, r, colCount);
      const infoCell = ws.getCell(r, 1);
      infoCell.value = infoCells.join(' | ');
      styleSubtitle(infoCell);
      r++;
    }
  }

  r++;

  // ── 3. صف الرؤوس ────────────────────────────────────────────────────────
  ws.getRow(r).height = 25;
  for (let ci = 0; ci < colCount; ci++) {
    const col  = columns[ci];
    const cell = ws.getCell(r, ci + 1);
    const header = col.exportHeader ?? (typeof col.header === 'string' ? col.header : col.key);
    cell.value = header;
    styleHeader(cell);
  }
  r++;

  // ── 4. البيانات ──────────────────────────────────────────────────────────
  let sumTTC: number | null = null;

  for (let di = 0; di < data.length; di++) {
    const row = data[di];
    const isAlt = di % 2 === 0;
    ws.getRow(r).height = 20;

    for (let ci = 0; ci < colCount; ci++) {
      const col  = columns[ci];
      const cell = ws.getCell(r, ci + 1);
      const val  = col.accessor ? col.accessor(row) : (row[col.key] ?? '');

      if (typeof val === 'number') {
        cell.value  = val;
        cell.numFmt = col.key.toLowerCase().includes('price') ||
                      col.key.toLowerCase().includes('total') ||
                      col.key.toLowerCase().includes('amount') ? numFmt : '#,##0';
      } else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
        cell.value = formatDateShort(val);
      } else {
        cell.value = val;
      }

      const align = col.align === 'center' ? 'center' : col.align === 'end' ? 'left' : 'right';
      styleData(cell, val, isAlt, align);
    }

    r++;
  }

  // ── 5. سطر الإجماليات ────────────────────────────────────────────────────
  // ✅ المشكلة مصححة: يحسب الإجماليات دائماً
  if (showAggregates && Object.keys(finalAggregates).length > 0) {
    ws.getRow(r).height = 24;
    for (let ci = 0; ci < colCount; ci++) {
      const col  = columns[ci];
      const cell = ws.getCell(r, ci + 1);
      const agg  = finalAggregates[col.key];

      if (ci === 0) {
        cell.value = 'الإجمالي';
        styleFooter(cell, true);
      } else if (agg) {
        const { type, value } = agg;
        const prefix = AGG_SYMBOLS[type] ?? '';

        if (typeof value === 'number') {
          cell.value  = value;
          cell.numFmt = type === 'count' ? '#,##0' : numFmt;

          // حفظ TTC للمبلغ بالحروف
          if (col.key === 'total_ttc' || col.key === 'net_to_pay') {
            sumTTC = value;
          }
        } else {
          cell.value = prefix ? `${prefix} ${value}` : String(value);
        }
        styleFooter(cell, false);
      } else {
        cell.value = '';
        styleFooter(cell, false);
      }
    }
    r++;
  }

  // ── 6. TVA + الطابع المالي ────────────────────────────────────────────────
  const hasERP = documentInfo.vatAmount != null || documentInfo.fiscalStamp != null;
  if (hasERP) {
    r++;
    if (documentInfo.vatAmount != null) {
      ws.getRow(r).height = 18;
      const vatLabel = documentInfo.vatRate != null
        ? `TVA (${Math.round(documentInfo.vatRate * 100)}%):`
        : 'TVA:';
      if (colCount >= 2) {
        styleInfoLabel(ws.getCell(r, colCount - 1));
        ws.getCell(r, colCount - 1).value = vatLabel;
        styleInfoValue(ws.getCell(r, colCount));
        ws.getCell(r, colCount).value     = documentInfo.vatAmount;
        ws.getCell(r, colCount).numFmt    = numFmt;
      }
      r++;
    }
    if (documentInfo.fiscalStamp != null) {
      ws.getRow(r).height = 18;
      styleInfoLabel(ws.getCell(r, colCount - 1));
      ws.getCell(r, colCount - 1).value = 'الطابع المالي:';
      styleInfoValue(ws.getCell(r, colCount));
      ws.getCell(r, colCount).value     = documentInfo.fiscalStamp;
      ws.getCell(r, colCount).numFmt    = numFmt;
      r++;
    }
  }

  // ── 7. المبلغ بالحروف ────────────────────────────────────────────────────
  if (sumTTC != null && sumTTC > 0) {
    r++;
    ws.getRow(r).height = 22;
    ws.mergeCells(r, 1, r, colCount);
    const wordsCell = ws.getCell(r, 1);
    wordsCell.value = 'المبلغ بالحروف: ' + numberToArabicWords(sumTTC, currency);
    styleAmountWords(wordsCell);
    r++;
  }

  // ── 8. عرض الأعمدة ──────────────────────────────────────────────────────
  for (let ci = 0; ci < colCount; ci++) {
    const col    = columns[ci];
    const header = col.exportHeader ?? (typeof col.header === 'string' ? col.header : col.key);
    let maxLen   = header.length;
    for (const row of data) {
      const val = col.accessor ? col.accessor(row) : (row[col.key] ?? '');
      maxLen = Math.max(maxLen, String(val ?? '').length);
    }
    ws.getColumn(ci + 1).width = Math.min(Math.max(maxLen + 2, col.minWidth ?? 10), col.width ?? 50);
  }

  // ── 9. الحفظ أو التنزيل ──────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  if (onSave) {
    onSave(buffer);
  } else {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Wrapper Function for Documents
// ════════════════════════════════════════════════════════════════════════════

export async function exportDocumentToExcel<T extends Record<string, unknown>>(
  data:          T[],
  columns:       Column<T>[],
  documentInfo?: DocumentInfo,
  options:       ExcelExportAdvancedOptions = {},
): Promise<void> {
  // ✅ حساب الإجماليات دائماً
  const aggregates = computeAggregatesForExport(data, columns);

  return exportToExcelAdvanced(data, columns, {
    ...options,
    documentInfo,
    showAggregates: true,
    aggregates,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Hook: useERPExport
// ════════════════════════════════════════════════════════════════════════════

export interface UseERPExportOptions {
  defaultFileName?: string;
  defaultDocumentInfo?: DocumentInfo;
  defaultCurrency?: string;
}

export function useERPExport(defaultOptions?: UseERPExportOptions) {
  const optsRef = useRef(defaultOptions);

  // تحديث الخيارات عند التغيير
  useEffect(() => {
    optsRef.current = defaultOptions;
  }, [defaultOptions]);

  const exportData = useCallback(
    async <T extends Record<string, unknown>>(
      data:           T[],
      columns:        Column<T>[],
      documentInfo?:  DocumentInfo,
      customOptions?: Omit<ExcelExportAdvancedOptions, 'aggregates' | 'documentInfo'>,
    ): Promise<void> => {
      // دمج الخيارات
      const finalOpts: ExcelExportAdvancedOptions = {
        fileName: defaultOptions?.defaultFileName ?? 'document.xlsx',
        currency: defaultOptions?.defaultCurrency ?? 'DZD',
        ...customOptions,
      };

      // ✅ حساب الإجماليات إذا لم تُمرَّ
      if (!finalOpts.aggregates) {
        finalOpts.aggregates = computeAggregatesForExport(data, columns);
      }

      // ✅ تفعيل عرض الإجماليات
      finalOpts.showAggregates = finalOpts.showAggregates !== false;

      // دمج معلومات المستند
      const finalDocInfo: DocumentInfo = {
        ...defaultOptions?.defaultDocumentInfo,
        ...documentInfo,
      };

      return exportToExcelAdvanced(data, columns, {
        ...finalOpts,
        documentInfo: finalDocInfo,
      });
    },
    [],
  );

  return { exportData };
}

```

## FILE: ./resources/js/components/ui/DataTable/FilterPopup.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// DataTable/FilterPopup.tsx  — v9.1  ✦  فلاتر احترافية مُعاد تصميمها
//
// ✅ Date: تابين (اختصارات / يدوي) بدلاً من قائمة طويلة
//    • presets?: string[] — تصفية الاختصارات حسب ما يُحدده المطوّر لكل عمود
// ✅ Number: شريط slider بصري + حقول نصية + presets كـ pills
// ✅ Text: بحث فوري مع highlight نتائج + زر clear مدمج
// ✅ Select: قائمة مرئية بـ radio بدلاً من <select> عتيق
// ✅ Multiselect/Dynamic: محسّن بـ virtual list للخيارات الكثيرة
// ✅ تصميم موحّد: عرض 280px، border-radius، animations
// ✅ createPortal + Smart positioning (RTL-aware)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal }                          from 'react-dom';
import type { Column }                           from './types';
import { decodeRange, encodeRange, getRawValue } from './utils';
import { useClickOutside, useEscapeKey }         from './hooks';
import { StaticMultiSelect, DynamicMultiSelect } from './MultiSelect';

// ════════════════════════════════════════════════════════════════════════════
// Date Shortcuts helpers
// ════════════════════════════════════════════════════════════════════════════

function fmt(d: Date): string { return d.toISOString().slice(0, 10); }

function getDateRange(preset: string): { min: string; max: string } {
  const now = new Date();
  const today = fmt(now);

  const startOf = (d: Date, u: 'week'|'month'|'year'|'quarter') => {
    const r = new Date(d);
    if (u === 'week')    { r.setDate(r.getDate() - r.getDay()); }
    else if (u === 'month')   { r.setDate(1); }
    else if (u === 'year')    { r.setMonth(0, 1); }
    else if (u === 'quarter') { r.setMonth(Math.floor(r.getMonth() / 3) * 3, 1); }
    r.setHours(0, 0, 0, 0); return r;
  };
  const endOf = (d: Date, u: 'week'|'month'|'year'|'quarter') => {
    const r = new Date(d);
    if (u === 'week')    { r.setDate(r.getDate() + (6 - r.getDay())); }
    else if (u === 'month')   { r.setMonth(r.getMonth() + 1, 0); }
    else if (u === 'year')    { r.setMonth(11, 31); }
    else if (u === 'quarter') { r.setMonth(Math.floor(r.getMonth() / 3) * 3 + 3, 0); }
    r.setHours(23, 59, 59, 999); return r;
  };
  const add = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  const y = now.getFullYear();
  const presets: Record<string, { min: string; max: string }> = {
    today:         { min: today, max: today },
    yesterday:     { min: fmt(add(now,-1)), max: fmt(add(now,-1)) },
    last_7:        { min: fmt(add(now,-6)), max: today },
    last_30:       { min: fmt(add(now,-29)), max: today },
    last_90:       { min: fmt(add(now,-89)), max: today },
    this_week:     { min: fmt(startOf(now,'week')),  max: fmt(endOf(now,'week')) },
    last_week:     { min: fmt(startOf(add(now,-7),'week')), max: fmt(endOf(add(now,-7),'week')) },
    this_month:    { min: fmt(startOf(now,'month')), max: fmt(endOf(now,'month')) },
    last_month:    { min: fmt(startOf(new Date(y,now.getMonth()-1,1),'month')), max: fmt(endOf(new Date(y,now.getMonth()-1,1),'month')) },
    this_quarter:  { min: fmt(startOf(now,'quarter')), max: fmt(endOf(now,'quarter')) },
    last_quarter:  { min: fmt(startOf(add(now,-90),'quarter')), max: fmt(endOf(add(now,-90),'quarter')) },
    this_year:     { min: fmt(startOf(now,'year')), max: fmt(endOf(now,'year')) },
    last_year:     { min: `${y-1}-01-01`, max: `${y-1}-12-31` },
    q1: { min: `${y}-01-01`, max: `${y}-03-31` },
    q2: { min: `${y}-04-01`, max: `${y}-06-30` },
    q3: { min: `${y}-07-01`, max: `${y}-09-30` },
    q4: { min: `${y}-10-01`, max: `${y}-12-31` },
  };
  return presets[preset] ?? { min: '', max: '' };
}

// مجموعات الاختصارات — مُعاد تنظيمها
const SHORTCUT_GROUPS = [
  { label: 'أيام',            items: [
    { key:'today',        label:'اليوم',          icon:'calendar-event' },
    { key:'yesterday',    label:'أمس',            icon:'calendar-minus' },
    { key:'last_7',       label:'آخر 7 أيام',     icon:'calendar-week' },
    { key:'last_30',      label:'آخر 30 يوم',     icon:'calendar' },
  ]},
  { label: 'أسابيع وأشهر',   items: [
    { key:'this_week',    label:'هذا الأسبوع',    icon:'calendar-week' },
    { key:'last_week',    label:'الأسبوع الماضي', icon:'calendar-week' },
    { key:'this_month',   label:'هذا الشهر',      icon:'calendar-month' },
    { key:'last_month',   label:'الشهر الماضي',   icon:'calendar-month' },
  ]},
  { label: 'أرباع السنة',    items: [
    { key:'this_quarter', label:'هذا الربع',      icon:'chart-line' },
    { key:'last_quarter', label:'الربع الماضي',   icon:'chart-line' },
    { key:'q1',           label:'ر1',             icon:'' },
    { key:'q2',           label:'ر2',             icon:'' },
    { key:'q3',           label:'ر3',             icon:'' },
    { key:'q4',           label:'ر4',             icon:'' },
  ]},
  { label: 'سنوات',          items: [
    { key:'this_year',    label:'هذه السنة',      icon:'calendar' },
    { key:'last_year',    label:'السنة الماضية',  icon:'calendar' },
    { key:'last_90',      label:'آخر 90 يوم',     icon:'history' },
  ]},
];

function matchesPreset(value: string, key: string): boolean {
  const cur = decodeRange(value);
  const exp = getDateRange(key);
  return cur.min === exp.min && cur.max === exp.max;
}

// ════════════════════════════════════════════════════════════════════════════
// Props
// ════════════════════════════════════════════════════════════════════════════

interface FilterPopupProps {
  col:       Column<Record<string, unknown>>;
  value:     string;
  onChange:  (v: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose:   () => void;
  allData?:  Record<string, unknown>[];
  data?:     Record<string, unknown>[];
}

// ════════════════════════════════════════════════════════════════════════════
// FilterPopup
// ════════════════════════════════════════════════════════════════════════════

const FilterPopup = memo(function FilterPopup({
  col, value, onChange, anchorRef, onClose, allData, data,
}: FilterPopupProps) {

  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // For dynamic-multiselect with fetchOptions: async loaded values
  const [fetchedValues, setFetchedValues] = useState<string[] | null>(null);
  const fetchFn = col.filter?.type === 'dynamic-multiselect' ? col.filter.fetchOptions : undefined;
  useEffect(() => {
    if (!fetchFn) { setFetchedValues(null); return; }
    let cancelled = false;
    fetchFn().then(vals => { if (!cancelled) setFetchedValues(vals); }).catch(() => {});
    return () => { cancelled = true; };
  }, [fetchFn]);

  const [dateTab, setDateTab] = useState<'shortcuts' | 'manual'>(
    () => {
      if (col.filter?.type !== 'date') return 'shortcuts';
      const { min, max } = decodeRange(value);
      // إذا لا توجد قيمة أو تطابق اختصار → tab الاختصارات
      return 'shortcuts';
    }
  );

  // ── Positioning ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const POPUP_W = 280;
      const POPUP_H = col.filter?.type === 'date' ? 400
                    : col.filter?.type === 'multiselect' || col.filter?.type === 'dynamic-multiselect' ? 380
                    : 260;

      const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
      let left = isRTL ? rect.left : rect.right - POPUP_W;
      if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
      if (left < 8) left = 8;

      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const top = spaceBelow >= Math.min(POPUP_H, 220)
        ? rect.bottom + 4
        : Math.max(8, rect.top - POPUP_H - 4);

      setPos({ top, left });
    };
    update();
    const t = setTimeout(update, 16);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { clearTimeout(t); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [anchorRef, col.filter?.type]);

  useClickOutside(popupRef, anchorRef, onClose);
  useEscapeKey(onClose);

  if (!col.filter || !pos) return null;

  const { type } = col.filter;
  const hasVal = value !== '' && value !== '|';
  const header = typeof col.header === 'string' ? col.header : '';

  // ════════════════════════════════════════════════════════════════════════
  // ١. Text Filter — بحث فوري مع clear مدمج
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'text') return createPortal(
    <div ref={popupRef} className="dt-flt-popup dt-flt-popup--text"
      style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
      role="dialog" aria-label={`فلتر ${header}`}>
      {header && <div className="dt-flt-popup-title"><i className="ti ti-search" />{header}</div>}
      <div className="dt-flt-text-wrap">
        <i className="ti ti-search dt-flt-text-icon" />
        <input
          className={`dt-fi dt-flt-text-input${hasVal ? ' act' : ''}`}
          type="text" value={value} autoFocus
          onChange={e => onChange(e.target.value)}
          placeholder="ابحث..."
          aria-label={`فلتر ${header}`}
        />
        {hasVal && (
          <button className="dt-flt-text-clear" onClick={() => onChange('')} type="button" title="مسح">
            <i className="ti ti-x" />
          </button>
        )}
      </div>
      {hasVal && (
        <div className="dt-flt-footer">
          <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
            مسح الفلتر
          </button>
        </div>
      )}
    </div>,
    document.body,
  );

  // ════════════════════════════════════════════════════════════════════════
  // ٢. Select Filter — قائمة Radio مرئية بدلاً من <select>
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'select') return createPortal(
    <div ref={popupRef} className="dt-flt-popup dt-flt-popup--select"
      style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
      role="dialog" aria-label={`فلتر ${header}`}>
      {header && <div className="dt-flt-popup-title"><i className="ti ti-list" />{header}</div>}
      <div className="dt-flt-radio-list" role="listbox">
        <div
          role="option"
          aria-selected={value === ''}
          className={`dt-flt-radio-item${value === '' ? ' on' : ''}`}
          onClick={() => { onChange(''); onClose(); }}
        >
          <span className="dt-flt-radio-dot" />
          <span>الكل</span>
        </div>
        {col.filter.options.map(o => (
          <div
            key={o.value}
            role="option"
            aria-selected={value === o.value}
            className={`dt-flt-radio-item${value === o.value ? ' on' : ''}`}
            onClick={() => { onChange(o.value); onClose(); }}
          >
            <span className="dt-flt-radio-dot" />
            <span>{o.label}</span>
            {value === o.value && <i className="ti ti-check dt-flt-radio-check" />}
          </div>
        ))}
      </div>
      {hasVal && (
        <div className="dt-flt-footer">
          <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
            مسح الفلتر
          </button>
        </div>
      )}
    </div>,
    document.body,
  );

  // ════════════════════════════════════════════════════════════════════════
  // ٣. Number Filter — Presets + Range inputs + Slider
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'number') {
    const { min, max } = decodeRange(value);
    const presets = (col.filter as any).presets as { label: string; min: string; max: string }[] | undefined;
    return createPortal(
      <div ref={popupRef} className="dt-flt-popup dt-flt-popup--number"
        style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
        role="dialog" aria-label={`فلتر ${header}`}>
        {header && <div className="dt-flt-popup-title"><i className="ti ti-hash" />{header}</div>}

        {/* Presets — pills */}
        {presets && presets.length > 0 && (
          <div className="dt-flt-pills">
            {presets.map(p => {
              const active = min === p.min && max === p.max;
              return (
                <button
                  key={`${p.min}-${p.max}`}
                  type="button"
                  className={`dt-flt-pill${active ? ' act' : ''}`}
                  onClick={() => onChange(encodeRange(p.min, p.max))}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Range inputs */}
        <div className="dt-flt-range-wrap">
          <div className="dt-flt-range-field">
            <label className="dt-flt-range-label">من</label>
            <input className={`dt-fi${min ? ' act' : ''}`} type="number"
              value={min} placeholder="0"
              onChange={e => onChange(encodeRange(e.target.value, max))}
            />
          </div>
          <div className="dt-flt-range-sep"><i className="ti ti-minus" /></div>
          <div className="dt-flt-range-field">
            <label className="dt-flt-range-label">إلى</label>
            <input className={`dt-fi${max ? ' act' : ''}`} type="number"
              value={max} placeholder="∞"
              onChange={e => onChange(encodeRange(min, e.target.value))}
            />
          </div>
        </div>

        {hasVal && (
          <div className="dt-flt-footer">
            <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
              مسح الفلتر
            </button>
          </div>
        )}
      </div>,
      document.body,
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ٤. Date Filter — تابين: اختصارات + يدوي
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'date') {
    const { min, max } = decodeRange(value);
    // دعم presets مخصصة — المطوّر يُحدد مفاتيح فرعية من SHORTCUT_GROUPS
    const allowedKeys = (col.filter as { presets?: string[] }).presets;
    const visibleGroups = allowedKeys
      ? SHORTCUT_GROUPS
          .map(g => ({ ...g, items: g.items.filter(s => allowedKeys.includes(s.key)) }))
          .filter(g => g.items.length > 0)
      : SHORTCUT_GROUPS;

    const activePreset = visibleGroups.flatMap(g => g.items).find(s => matchesPreset(value, s.key));

    return createPortal(
      <div ref={popupRef} className="dt-flt-popup dt-flt-popup--date"
        style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
        role="dialog" aria-label={`فلتر ${header}`}>
        {header && (
          <div className="dt-flt-popup-title">
            <i className="ti ti-calendar" />
            {header}
            {hasVal && activePreset && (
              <span className="dt-flt-title-badge">{activePreset.label}</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="dt-flt-tabs" role="tablist">
          <button
            role="tab"
            type="button"
            className={`dt-flt-tab${dateTab === 'shortcuts' ? ' on' : ''}`}
            aria-selected={dateTab === 'shortcuts'}
            onClick={() => setDateTab('shortcuts')}
          >
            <i className="ti ti-bolt" />
            اختصارات
          </button>
          <button
            role="tab"
            type="button"
            className={`dt-flt-tab${dateTab === 'manual' ? ' on' : ''}`}
            aria-selected={dateTab === 'manual'}
            onClick={() => setDateTab('manual')}
          >
            <i className="ti ti-calendar-event" />
            يدوي
            {hasVal && dateTab !== 'manual' && !activePreset && (
              <span className="dt-flt-tab-dot" />
            )}
          </button>
        </div>

        {/* Tab: اختصارات */}
        {dateTab === 'shortcuts' && (
          <div className="dt-flt-sc-wrap">
            {visibleGroups.map(group => (
              <div key={group.label} className="dt-flt-sc-group">
                <div className="dt-flt-sc-label">{group.label}</div>
                <div className="dt-flt-sc-grid">
                  {group.items.map(sc => {
                    const active = matchesPreset(value, sc.key);
                    return (
                      <button
                        key={sc.key}
                        type="button"
                        className={`dt-flt-sc-btn${active ? ' act' : ''}`}
                        onClick={() => {
                          const r = getDateRange(sc.key);
                          onChange(encodeRange(r.min, r.max));
                          onClose();
                        }}
                        title={(() => { const r = getDateRange(sc.key); return `${r.min} — ${r.max}`; })()}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: يدوي */}
        {dateTab === 'manual' && (
          <div className="dt-flt-manual-wrap">
            <div className="dt-flt-manual-field">
              <label className="dt-flt-range-label">
                <i className="ti ti-calendar-event" />
                من
              </label>
              <input
                className={`dt-fi${min ? ' act' : ''}`}
                type="date" value={min}
                onChange={e => onChange(encodeRange(e.target.value, max))}
                aria-label="تاريخ البداية"
              />
            </div>
            <div className="dt-flt-manual-field">
              <label className="dt-flt-range-label">
                <i className="ti ti-calendar-event" />
                إلى
              </label>
              <input
                className={`dt-fi${max ? ' act' : ''}`}
                type="date" value={max}
                onChange={e => onChange(encodeRange(min, e.target.value))}
                aria-label="تاريخ النهاية"
              />
            </div>
            {min && max && (
              <div className="dt-flt-manual-preview">
                <i className="ti ti-calendar-stats" />
                {min} — {max}
              </div>
            )}
          </div>
        )}

        {hasVal && (
          <div className="dt-flt-footer">
            <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
              مسح الفلتر
            </button>
          </div>
        )}
      </div>,
      document.body,
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ٥. Multiselect / Dynamic-multiselect (موجود ومحسّن)
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'multiselect') return createPortal(
    <div ref={popupRef} className="dt-flt-popup dt-flt-popup--multi"
      style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
      role="dialog" aria-label={`فلتر ${header}`}>
      {header && <div className="dt-flt-popup-title"><i className="ti ti-filter" />{header}</div>}
      <StaticMultiSelect
        options={col.filter.options as { value: string; label: string }[]}
        value={value} onChange={onChange} onClose={onClose}
      />
    </div>,
    document.body,
  );

  if (type === 'dynamic-multiselect') {
    const rawValues = fetchedValues ?? [...new Set(
      (allData ?? data ?? []).map(row => { const v = getRawValue(row, col); return v == null ? '' : String(v); }).filter(Boolean)
    )];
    return createPortal(
      <div ref={popupRef} className="dt-flt-popup dt-flt-popup--multi"
        style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
        role="dialog" aria-label={`فلتر ${header}`}>
        {header && <div className="dt-flt-popup-title"><i className="ti ti-filter" />{header}</div>}
        <DynamicMultiSelect
          rawValues={rawValues}
          labelFormatter={(col.filter as any).labelFormatter}
          value={value} onChange={onChange} onClose={onClose}
        />
      </div>,
      document.body,
    );
  }

  return null;
});

export default FilterPopup;

```

## FILE: ./resources/js/components/ui/DataTable/hooks.ts

```
// DataTable/hooks.ts  —  v10.3 (كامل مع جميع hooks)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  MultiSortState, URLStateConfig, FilterMap,
  RowGroupConfig, RowGroup, ColumnPinConfig, ActiveCell,
  Column, CellValidationRule, PendingEdit, BatchEditState,
  CellEditPayload, EditingCell, PasteOptions, SmartFilterResult, SavedView,
  SavedViewsConfig, ContextMenuItem, ContextMenuContext, ContextMenuState,
} from './types';
import {
  MIN_COL_WIDTH, DEFAULT_ROW_HEIGHT,
  DEFAULT_CONTAINER_HEIGHT, DEFAULT_OVERSCAN,
} from './types';
import {
  getRawValue, parseTSV,
  applyClientFilter, applyGlobalSearch, applyClientSort, applyMultiSort,
} from './utils';
import type { SortState } from './types';

// ==================== hooks الموجودة سابقاً (محفوظة بالكامل) ====================

export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  anchorRef: React.RefObject<HTMLElement>,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onCloseRef.current();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, anchorRef]);
}

export function useColumnResize(initialWidths: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null);
  const startResize = useCallback((key: string, currentW: number, e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { key, startX: e.clientX, startW: currentW };
  }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const { key, startX, startW } = drag.current;
      // RTL: handle في يسار العمود — السحب يساراً (clientX أقل) = تكبير
      // LTR: handle في يمين العمود — السحب يميناً (clientX أكبر) = تكبير
      const isRTL =
        document.documentElement.dir === 'rtl' ||
        document.body.dir === 'rtl';
      const delta = isRTL
        ? startX - e.clientX   // RTL: يسار = أكبر
        : e.clientX - startX;  // LTR: يمين = أكبر
      setWidths(p => ({ ...p, [key]: Math.max(MIN_COL_WIDTH, startW + delta) }));
    };
    const onUp = () => { drag.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);
  const resetWidth = useCallback((key: string) => {
    setWidths(p => { const n = { ...p }; delete n[key]; return n; });
  }, []);

  const autoSize = useCallback((tableEl: HTMLDivElement | null, key: string) => {
    if (!tableEl) return;
    const table = tableEl.querySelector('table');
    if (!table) return;

    // Find the col index for this key
    const colKeyAttr = `[data-col-key="${key}"]`;
    const headerCell = table.querySelector(`thead ${colKeyAttr}`) as HTMLElement | null;
    if (!headerCell) return;

    // Measure header text width
    const headerClone = headerCell.cloneNode(true) as HTMLElement;
    const measure = document.createElement('div');
    measure.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap;font:inherit;direction:inherit;';
    document.body.appendChild(measure);

    // Measure header
    measure.textContent = headerCell.textContent ?? '';
    let maxWidth = measure.getBoundingClientRect().width;

    // Measure visible cells in this column (sample up to 100 rows)
    const cells = table.querySelectorAll(`tbody td${colKeyAttr}`);
    const sample = Array.from(cells).slice(0, 100);
    for (const cell of sample) {
      measure.textContent = (cell as HTMLElement).textContent ?? '';
      const w = measure.getBoundingClientRect().width;
      if (w > maxWidth) maxWidth = w;
    }

    document.body.removeChild(measure);

    // Add padding (16px) + sort/filter icon space (24px)
    const finalWidth = Math.ceil(maxWidth) + 44;
    setWidths(p => ({ ...p, [key]: Math.max(MIN_COL_WIDTH, finalWidth) }));
  }, []);

  return { widths, startResize, resetWidth, autoSize };
}

export function useEscapeKey(onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useIsMobile(breakpoint = 639): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export function useVirtualScroll({
  rowCount,
  rowHeight = DEFAULT_ROW_HEIGHT,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
}: {
  rowCount: number;
  rowHeight?: number;
  containerHeight?: number;
  overscan?: number;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);
  const totalHeight = rowCount * rowHeight;
  const rawStart = Math.floor(scrollTop / rowHeight);
  const start = Math.max(0, rawStart - overscan);
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const end = Math.min(rowCount - 1, rawStart + visibleCount + overscan);
  const offsetY = start * rowHeight;
  return {
    scrollContainerRef, totalHeight, offsetY,
    visibleRange: { start, end },
    containerHeight, rowHeight,
  };
}

export function useColumnDragReorder(
  initialOrder: string[],
  onOrderChange?: (order: string[]) => void,
) {
  const [columnOrder, setColumnOrder] = useState<string[]>(initialOrder);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const draggingKey = useRef<string | null>(null);
  // ✅ إصلاح: useRef للمقارنة العميقة بدلاً من JSON.stringify في dependency array
  const initialOrderRef = useRef<string[]>(initialOrder);
  useEffect(() => {
    const prev = initialOrderRef.current;
    const hasChanged =
      prev.length !== initialOrder.length ||
      prev.some((k, i) => k !== initialOrder[i]);
    if (!hasChanged) return;
    initialOrderRef.current = initialOrder;
    setColumnOrder(current => {
      const existing = new Set(current);
      const newKeys = initialOrder.filter(k => !existing.has(k));
      const removed = new Set(initialOrder);
      const filtered = current.filter(k => removed.has(k));
      return [...filtered, ...newKeys];
    });
  }, [initialOrder]);
  const onDragStart = useCallback((key: string, e: React.DragEvent) => {
    draggingKey.current = key;
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.textContent = key;
    ghost.style.cssText = 'position:fixed;top:-99px;left:-99px;background:var(--em,#0a8a5c);color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  }, []);
  const onDragOver = useCallback((key: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (key !== draggingKey.current) setDragOverKey(key);
  }, []);
  const onDrop = useCallback((targetKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const from = draggingKey.current;
    if (!from || from === targetKey) { setDragOverKey(null); return; }
    setColumnOrder(prev => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(targetKey);
      if (fi < 0 || ti < 0) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      onOrderChange?.(next);
      return next;
    });
    setDragOverKey(null);
  }, [onOrderChange]);
  const onDragEnd = useCallback(() => {
    draggingKey.current = null;
    setDragOverKey(null);
  }, []);
  return {
    columnOrder, setColumnOrder, dragOverKey,
    dragHandlers: { onDragStart, onDragOver, onDrop, onDragEnd },
  };
}

export function useURLState(config: URLStateConfig | undefined) {
  const prefix = config?.prefix ?? 'dt';
  const buildKey = useCallback((name: string) => `${prefix}_${name}`, [prefix]);
  const read = useCallback((name: string): string => {
    if (!config?.enabled || typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get(buildKey(name)) ?? '';
  }, [config?.enabled, buildKey]);
  const write = useCallback((updates: Record<string, string>) => {
    if (!config?.enabled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([name, value]) => {
      const k = buildKey(name);
      value ? params.set(k, value) : params.delete(k);
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [config?.enabled, buildKey]);
  const clear = useCallback(() => {
    if (!config?.enabled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    [...params.keys()].filter(k => k.startsWith(`${prefix}_`)).forEach(k => params.delete(k));
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [config?.enabled, prefix]);
  const readInitialFilters = useCallback((): FilterMap => {
    if (!config?.enabled || !config?.filters) return {};
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const filterPfx = buildKey('f_');
    const result: FilterMap = {};
    params.forEach((value, key) => { if (key.startsWith(filterPfx)) result[key.slice(filterPfx.length)] = value; });
    return result;
  }, [config?.enabled, config?.filters, buildKey]);
  const readInitialSort = useCallback((): MultiSortState => {
    if (!config?.enabled || !config?.sort) return [];
    const raw = read('sort');
    if (!raw) return [];
    return raw.split(',').map(s => {
      const [key, dir] = s.split(':');
      return { key, dir: (dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc' };
    }).filter(s => s.key);
  }, [config?.enabled, config?.sort, read]);
  const readInitialPage = useCallback((): number => {
    if (!config?.enabled || !config?.page) return 1;
    const n = parseInt(read('page'), 10);
    return isNaN(n) || n < 1 ? 1 : n;
  }, [config?.enabled, config?.page, read]);
  const readInitialSearch = useCallback((): string => {
    if (!config?.enabled || !config?.search) return '';
    return read('q');
  }, [config?.enabled, config?.search, read]);
  const writeFilters = useCallback((filters: FilterMap) => {
    if (!config?.filters) return;
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const filterPfx = buildKey('f_');
    [...params.keys()].filter(k => k.startsWith(filterPfx)).forEach(k => params.delete(k));
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(`${filterPfx}${k}`, v); });
    if (typeof window !== 'undefined') window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [config?.filters, buildKey]);
  const writeSort = useCallback((sorts: MultiSortState) => {
    if (!config?.sort) return;
    write({ sort: sorts.map(s => `${s.key}:${s.dir}`).join(',') });
  }, [config?.sort, write]);
  const writePage = useCallback((page: number) => {
    if (!config?.page) return;
    write({ page: page > 1 ? String(page) : '' });
  }, [config?.page, write]);
  const writeSearch = useCallback((q: string) => {
    if (!config?.search) return;
    write({ q });
  }, [config?.search, write]);
  return {
    enabled: config?.enabled ?? false,
    readInitialFilters, readInitialSort, readInitialPage, readInitialSearch,
    writeFilters, writeSort, writePage, writeSearch, clear,
  };
}

export function useMultiSort(
  initial: MultiSortState = [],
  onChange?: (sorts: MultiSortState) => void,
  onLegacySortChange?: (key: string, dir: 'asc' | 'desc' | null) => void,
) {
  const [sorts, setSorts] = useState<MultiSortState>(initial);
  const onChangeRef = useRef(onChange);
  const onLegacyRef = useRef(onLegacySortChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onLegacyRef.current = onLegacySortChange; }, [onLegacySortChange]);
  const toggleSort = useCallback((key: string, shiftKey: boolean) => {
    setSorts(prev => {
      let next: MultiSortState;
      if (!shiftKey) {
        const existing = prev.find(s => s.key === key);
        if (!existing) next = [{ key, dir: 'asc' }];
        else if (existing.dir === 'asc') next = [{ key, dir: 'desc' }];
        else next = [];
      } else {
        const idx = prev.findIndex(s => s.key === key);
        if (idx === -1) next = [...prev, { key, dir: 'asc' }];
        else if (prev[idx].dir === 'asc') next = prev.map((s, i) => i === idx ? { ...s, dir: 'desc' } : s);
        else next = prev.filter((_, i) => i !== idx);
      }
      Promise.resolve().then(() => {
        onChangeRef.current?.(next);
        if (onLegacyRef.current) {
          const first = next[0];
          onLegacyRef.current(first?.key ?? key, first?.dir ?? null);
        }
      });
      return next;
    });
  }, []);
  const clearSort = useCallback(() => { setSorts([]); onChangeRef.current?.([]); }, []);
  const legacySortState = sorts[0] ? { key: sorts[0].key, dir: sorts[0].dir } : { key: null, dir: null };
  return { sorts, setSorts, toggleSort, clearSort, legacySortState };
}

export function useRowGrouping<T>(
  data: T[],
  config: RowGroupConfig | undefined,
  columns: Column<T>[],
): {
  groups: RowGroup<T>[] | null;
  toggleGroup: (value: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  collapsedGroups: Set<string>;
  groupSubTotals: Record<string, Record<string, unknown>>;
} {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!config) { setCollapsedGroups(new Set()); return; }
    if (config.defaultCollapsed) {
      const col = columns.find(c => c.key === config.key);
      if (!col) return;
      const values = [...new Set(data.map(r => String(getRawValue(r, col) ?? '')))];
      setCollapsedGroups(new Set(values));
    } else {
      setCollapsedGroups(new Set());
    }
  }, [config?.key]);
  const groups = useMemo((): RowGroup<T>[] | null => {
    if (!config) return null;
    const col = columns.find(c => c.key === config.key);
    if (!col) return null;
    const groupMap = new Map<string, T[]>();
    data.forEach(row => {
      const val = String(getRawValue(row, col) ?? '');
      if (!groupMap.has(val)) groupMap.set(val, []);
      groupMap.get(val)!.push(row);
    });
    let entries = [...groupMap.entries()];
    if (config.sortGroups === 'asc') entries.sort(([a], [b]) => a.localeCompare(b, 'ar-DZ'));
    if (config.sortGroups === 'desc') entries.sort(([a], [b]) => b.localeCompare(a, 'ar-DZ'));
    // ✅ إصلاح: الصفوف المطوية تُحذف من الـ render فعلياً (تُخرج من DOM)
    // rowCount يحفظ العدد الحقيقي للعرض في group header
    return entries.map(([value, allRows]) => {
      const collapsed = collapsedGroups.has(value);
      return {
        value,
        label: value || '(فارغ)',
        rows: collapsed ? [] : allRows,   // ← DOM cleanup للمجموعات المطوية
        rowCount: allRows.length,          // ← العدد الحقيقي دائماً
        collapsed,
      };
    });
  }, [data, config, columns, collapsedGroups]);

  // ✅ حساب Sub-totals للمجموعات (يعمل فقط عند showSubTotals: true)
  const { computeAggregate: _computeAgg } = (() => {
    // استيراد lazy لتجنب circular dependency
    const computeAggregate = (rows: T[], col: Column<T>, type: import('./types').AggregateType): number | null => {
      const nums = rows
        .map(r => { const v = getRawValue(r, col); return typeof v === 'number' ? v : parseFloat(String(v ?? '')); })
        .filter(n => !isNaN(n));
      if (!nums.length) return null;
      switch (type) {
        case 'sum':   return nums.reduce((a, b) => a + b, 0);
        case 'avg':   return nums.reduce((a, b) => a + b, 0) / nums.length;
        case 'min':   return Math.min(...nums);
        case 'max':   return Math.max(...nums);
        case 'count': return nums.length;
      }
    };
    return { computeAggregate };
  })();

  const groupSubTotals = useMemo(() => {
    if (!config?.showSubTotals || !groups) return {} as Record<string, Record<string, unknown>>;
    const aggCols = columns.filter(c => c.aggregate);
    if (!aggCols.length) return {} as Record<string, Record<string, unknown>>;
    // نحتاج البيانات الكاملة (قبل الطي) — نُعيد تجميعها
    const col = columns.find(c => c.key === config.key);
    if (!col) return {} as Record<string, Record<string, unknown>>;
    const fullGroupMap = new Map<string, T[]>();
    data.forEach(row => {
      const val = String(getRawValue(row, col) ?? '');
      if (!fullGroupMap.has(val)) fullGroupMap.set(val, []);
      fullGroupMap.get(val)!.push(row);
    });
    return Object.fromEntries(
      [...fullGroupMap.entries()].map(([value, rows]) => [
        value,
        Object.fromEntries(
          aggCols.map(c => {
            const type = typeof c.aggregate === 'string' ? c.aggregate : 'sum';
            const val = typeof c.aggregate === 'function'
              ? c.aggregate(rows)
              : _computeAgg(rows, c, type as import('./types').AggregateType);
            return [c.key, { value: val, type }];
          })
        ),
      ])
    );
  }, [groups, columns, config?.showSubTotals, data, config?.key, _computeAgg]);

  const toggleGroup = useCallback((value: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }, []);
  const expandAll = useCallback(() => setCollapsedGroups(new Set()), []);
  const collapseAll = useCallback(() => {
    if (!groups) return;
    setCollapsedGroups(new Set(groups.map(g => String(g.value))));
  }, [groups]);
  return { groups, toggleGroup, expandAll, collapseAll, collapsedGroups, groupSubTotals };
}

export function useColumnPinning(
  initial: ColumnPinConfig | undefined,
  onChange?: (config: ColumnPinConfig) => void,
) {
  const [pinConfig, setPinConfig] = useState<ColumnPinConfig>(initial ?? {});
  const pinColumn = useCallback((key: string, side: 'start' | 'end' | null) => {
    setPinConfig(prev => {
      const next: ColumnPinConfig = {
        start: (prev.start ?? []).filter(k => k !== key),
        end: (prev.end ?? []).filter(k => k !== key),
      };
      if (side === 'start') next.start = [...(next.start ?? []), key];
      if (side === 'end') next.end = [...(next.end ?? []), key];
      onChange?.(next);
      return next;
    });
  }, [onChange]);
  const isPinned = useCallback((key: string): 'start' | 'end' | null => {
    if (pinConfig.start?.includes(key)) return 'start';
    if (pinConfig.end?.includes(key)) return 'end';
    return null;
  }, [pinConfig]);
  const clearAllPins = useCallback(() => {
    setPinConfig({});
    onChange?.({});
  }, [onChange]);

  // batch update: يُستخدم من handleApplyView — setState واحد بدلاً من N
  const setPinConfigBatch = useCallback((config: ColumnPinConfig) => {
    const next: ColumnPinConfig = {
      start: config.start ?? [],
      end:   config.end   ?? [],
    };
    setPinConfig(next);
    onChange?.(next);
  }, [onChange]);

  // ✅ إصلاح: حساب offset تراكمي للأعمدة المثبتة
  // بدون هذا، كل عمودين مثبتَين على نفس الجانب يحصلان على left:0 ويتداخلان
  const getPinnedOffset = useCallback((
    key: string,
    side: 'start' | 'end',
    colWidths: Record<string, number>,
    defaultWidth = 120,
  ): number => {
    const pinned = (side === 'start' ? pinConfig.start : pinConfig.end) ?? [];
    const idx = pinned.indexOf(key);
    if (idx <= 0) return 0;
    // لـ 'end': الترتيب معكوس (العمود الأخير في القائمة هو الأقرب للحافة)
    const orderedKeys = side === 'end' ? [...pinned].reverse() : pinned;
    const keyIdx = orderedKeys.indexOf(key);
    return orderedKeys
      .slice(0, keyIdx)
      .reduce((sum, k) => sum + (colWidths[k] ?? defaultWidth), 0);
  }, [pinConfig]);

  return { pinConfig, pinColumn, isPinned, clearAllPins, getPinnedOffset };
}

export function useKeyboardNav({
  enabled,
  rowCount,
  colCount,
  onActivate,
  onStartEdit,
}: {
  enabled: boolean;
  rowCount: number;
  colCount: number;
  onActivate?: (cell: ActiveCell) => void;
  onStartEdit?: (cell: ActiveCell) => void;
}) {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const move = useCallback((dRow: number, dCol: number) => {
    setActiveCell(prev => {
      if (!prev) return { rowIndex: 0, colIndex: 0 };
      const next: ActiveCell = {
        rowIndex: Math.max(0, Math.min(rowCount - 1, prev.rowIndex + dRow)),
        colIndex: Math.max(0, Math.min(colCount - 1, prev.colIndex + dCol)),
      };
      onActivate?.(next);
      return next;
    });
    setIsEditing(false);
  }, [rowCount, colCount, onActivate]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled) return;
    if (isEditing) {
      if (e.key === 'Escape') { setIsEditing(false); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); move(-1, 0); break;
      case 'ArrowDown':  e.preventDefault(); move(+1, 0); break;
      // RTL: السهم الأيمن → عمود بـ index أقل (نحو بداية المستند في RTL)
      case 'ArrowRight': e.preventDefault(); move(0, -1); break;
      case 'ArrowLeft':  e.preventDefault(); move(0, +1); break;
      // ✅ إصلاح: Tab يجب أن يتبع اتجاه القراءة الطبيعي للـ visual order
      // في RTL: Tab بدون Shift → العمود الأقل index (يمين الشاشة في RTL)
      // move(0, -1) = ينتقل نحو عمود بـ index أقل = يمين الشاشة في RTL = صحيح
      case 'Tab': {
        const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
        e.preventDefault();
        // في RTL: Tab → يمين (index أقل). في LTR: Tab → يسار (index أكبر)
        if (e.shiftKey) move(0, isRTL ? +1 : -1);
        else            move(0, isRTL ? -1 : +1);
        break;
      }
      case 'Enter': e.preventDefault();
        if (activeCell) {
          if (isEditing) move(+1, 0);
          else { setIsEditing(true); onStartEdit?.(activeCell); }
        }
        break;
      case 'F2':
        if (activeCell) { e.preventDefault(); setIsEditing(true); onStartEdit?.(activeCell); }
        break;
      // ✅ جديد: Ctrl+C لنسخ قيمة الخلية النشطة
      case 'c':
      case 'C':
        if ((e.ctrlKey || e.metaKey) && activeCell && !isEditing) {
          e.preventDefault();
          const cellEl = document.querySelector(
            `[data-row-index="${activeCell.rowIndex}"][data-col-key]`
          );
          if (cellEl?.textContent) {
            navigator.clipboard.writeText(cellEl.textContent.trim()).catch(() => {});
          }
        }
        break;
      case 'Escape': setActiveCell(null); setIsEditing(false); break;
    }
  }, [enabled, isEditing, activeCell, move, onStartEdit]);
  const activateCell = useCallback((cell: ActiveCell) => {
    setActiveCell(cell);
    setIsEditing(false);
    onActivate?.(cell);
  }, [onActivate]);
  return { activeCell, isEditing, handleKeyDown, activateCell, setIsEditing };
}

export function useBatchEdit({
  enabled,
  onBatchSave,
}: {
  enabled: boolean;
  onBatchSave?: (edits: PendingEdit[]) => void;
}) {
  const [state, setState] = useState<BatchEditState>({ pending: {}, history: [], future: [] });
  // refs لضمان أن keydown handler يستدعي أحدث نسخة دون stale closure
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
      if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoRef.current(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled]);
  const recordEdit = useCallback((edit: PendingEdit) => {
    if (!enabled) return;
    setState(prev => {
      const pending = {
        ...prev.pending,
        [String(edit.rowKey)]: {
          ...(prev.pending[String(edit.rowKey)] ?? {}),
          [edit.colKey]: edit.newValue,
        },
      };
      return { pending, history: [...prev.history, [edit]], future: [] };
    });
  }, [enabled]);
  const undo = useCallback(() => {
    setState(prev => {
      if (!prev.history.length) return prev;
      const last = prev.history[prev.history.length - 1];
      const history = prev.history.slice(0, -1);
      const pending = { ...prev.pending };
      last.forEach(e => {
        const rowPending = { ...(pending[String(e.rowKey)] ?? {}) };
        if (e.oldValue === '') delete rowPending[e.colKey];
        else rowPending[e.colKey] = e.oldValue;
        if (Object.keys(rowPending).length === 0) delete pending[String(e.rowKey)];
        else pending[String(e.rowKey)] = rowPending;
      });
      return { pending, history, future: [last, ...prev.future] };
    });
  }, []);
  const redo = useCallback(() => {
    setState(prev => {
      if (!prev.future.length) return prev;
      const [next, ...future] = prev.future;
      const pending = { ...prev.pending };
      next.forEach(e => {
        pending[String(e.rowKey)] = {
          ...(pending[String(e.rowKey)] ?? {}),
          [e.colKey]: e.newValue,
        };
      });
      return { pending, history: [...prev.history, next], future };
    });
  }, []);
  // تحديث refs بعد كل render
  undoRef.current = undo;
  redoRef.current = redo;

  const save = useCallback(() => {
    if (!onBatchSave) return;
    const edits: PendingEdit[] = [];
    Object.entries(state.pending).forEach(([rowKey, cols]) => {
      Object.entries(cols).forEach(([colKey, newValue]) => {
        const histEntry = [...state.history].reverse().find(h =>
          h.some(e => String(e.rowKey) === rowKey && e.colKey === colKey),
        );
        const oldValue = histEntry?.find(e => String(e.rowKey) === rowKey && e.colKey === colKey)?.oldValue ?? '';
        edits.push({ rowKey, colKey, oldValue, newValue });
      });
    });
    onBatchSave(edits);
    setState({ pending: {}, history: [], future: [] });
  }, [state, onBatchSave]);
  const discard = useCallback(() => {
    setState({ pending: {}, history: [], future: [] });
  }, []);
  const getPendingValue = useCallback((rowKey: string | number, colKey: string): string | undefined => {
    return state.pending[String(rowKey)]?.[colKey];
  }, [state.pending]);
  const pendingCount = useMemo(() => Object.values(state.pending).reduce((acc, cols) => acc + Object.keys(cols).length, 0), [state.pending]);
  return { pendingCount, hasPending: pendingCount > 0, canUndo: state.history.length > 0, canRedo: state.future.length > 0, recordEdit, undo, redo, save, discard, getPendingValue };
}

export function useCellValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validate = useCallback((value: string, rule: CellValidationRule, row: Record<string, unknown>, cellId: string): boolean => {
    let msg: string | null = null;
    if (rule.required && !value.trim()) msg = rule.messages?.required ?? 'هذا الحقل مطلوب';
    else if (rule.minLength && value.length < rule.minLength) msg = rule.messages?.minLength ?? `الحد الأدنى ${rule.minLength} أحرف`;
    else if (rule.maxLength && value.length > rule.maxLength) msg = rule.messages?.maxLength ?? `الحد الأقصى ${rule.maxLength} أحرف`;
    else if (rule.min !== undefined && parseFloat(value) < rule.min) msg = rule.messages?.min ?? `القيمة لا تقل عن ${rule.min}`;
    else if (rule.max !== undefined && parseFloat(value) > rule.max) msg = rule.messages?.max ?? `القيمة لا تزيد عن ${rule.max}`;
    else if (rule.pattern && !rule.pattern.test(value)) msg = rule.messages?.pattern ?? 'القيمة غير صحيحة';
    else if (rule.custom) msg = rule.custom(value, row);
    if (msg) { setErrors(prev => ({ ...prev, [cellId]: msg as string })); return false; }
    setErrors(prev => { const n = { ...prev }; delete n[cellId]; return n; });
    return true;
  }, []);
  const clearError = useCallback((cellId: string) => {
    setErrors(prev => { const n = { ...prev }; delete n[cellId]; return n; });
  }, []);
  const getError = useCallback((cellId: string) => errors[cellId] ?? null, [errors]);
  return { errors, validate, clearError, getError };
}

// ════════════════════════════════════════════════════════════════════════════
// 🆕 HOOKS الجديدة
// ════════════════════════════════════════════════════════════════════════════

// ─── useClipboardPaste (لصق من Excel) ───────────────────────────────────────

export function useClipboardPaste<T>(
  tableRef: React.RefObject<HTMLElement>,
  data: T[],
  columns: Column<T>[],
  rowKey: (row: T, idx: number) => string | number,
  onCellEdit?: (payload: CellEditPayload<T>) => void,
  batchEdit?: boolean,
  batchRecord?: (edit: PendingEdit) => void,
  options: PasteOptions = {}
) {
  const { transform } = options;
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const activeElement = document.activeElement;
    if (!activeElement || !tableRef.current?.contains(activeElement)) return;
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const parsedData = parseTSV(text);
    if (parsedData.length === 0) return;
    const activeCellEl = document.querySelector('.dt-cell-active, .dt-td:focus');
    if (!activeCellEl) return;
    const rowIdxAttr = activeCellEl.getAttribute('data-row-index');
    const colKeyAttr = activeCellEl.getAttribute('data-col-key');
    if (!rowIdxAttr || !colKeyAttr) return;
    const startRowIdx = parseInt(rowIdxAttr, 10);
    const startColKey = colKeyAttr;
    const startColIdx = columns.findIndex(c => c.key === startColKey);
    if (startColIdx === -1) return;
    for (let r = 0; r < parsedData.length; r++) {
      const rowIndex = startRowIdx + r;
      if (rowIndex >= data.length) break;
      const row = data[rowIndex];
      const rowId = rowKey(row, rowIndex);
      const pasteRow = parsedData[r];
      for (let c = 0; c < pasteRow.length; c++) {
        const colIndex = startColIdx + c;
        if (colIndex >= columns.length) break;
        const col = columns[colIndex];
        if (!col.editable) continue;
        let newValue = pasteRow[c];
        if (transform) newValue = transform(newValue, col.key);
        const oldValue = getRawValue(row, col);
        if (String(oldValue) === newValue) continue;
        if (batchEdit && batchRecord) {
          batchRecord({ rowKey: rowId, colKey: col.key, oldValue: String(oldValue ?? ''), newValue });
        } else if (onCellEdit) {
          onCellEdit({ row, rowIndex, colKey: col.key, oldValue, newValue });
        }
      }
    }
  }, [tableRef, data, columns, rowKey, onCellEdit, batchEdit, batchRecord, transform]);
  // ref للـ handler لتجنب re-register عند كل render
  const handlePasteRef = useRef(handlePaste);
  useEffect(() => { handlePasteRef.current = handlePaste; }, [handlePaste]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const stableHandler = (e: Event) => handlePasteRef.current(e as ClipboardEvent);
    el.addEventListener('paste', stableHandler);
    return () => el.removeEventListener('paste', stableHandler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRef]);
}

// ─── useSmartFilter (تحليل اللغة العربية) ───────────────────────────────────

// نوع النمط القابل للتمرير من الخارج
export interface SmartFilterPattern {
  regex: RegExp;
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'contains' | 'between' | 'sort';
  valueType: 'string' | 'number';
}

// الأنماط الافتراضية — فارغة عمداً
// المكتبة لا تعرف شيئاً عن بنية بيانات المشروع
// كل مشروع يُمرر customPatterns الخاصة به:
//   useSmartFilter(columns, onFilter, MY_PATTERNS)
// مثال: datatable-patterns.ts في مشروع ERP الجزائري
export const DEFAULT_SMART_FILTER_PATTERNS: SmartFilterPattern[] = [];

export function useSmartFilter<T>(
  columns: Column<T>[],
  onFilterChange: (filters: Record<string, string>, sorts?: MultiSortState) => void,
  /** أنماط مخصصة — إذا مُررت تحل محل الافتراضية بالكامل */
  customPatterns?: SmartFilterPattern[]
) {
  const patterns = useMemo(
    () => customPatterns ?? DEFAULT_SMART_FILTER_PATTERNS,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customPatterns],
  );
  const parseNaturalQuery = useCallback((query: string): SmartFilterResult | null => {
    const q = query.trim();
    const result: Record<string, string> = {};
    let sort: MultiSortState | undefined;

    for (const p of patterns) {
      const match = q.match(p.regex);
      if (match) {
        if (p.operator === 'sort') {
          const dir = match[2] === 'تصاعدي' ? 'asc' : 'desc';
          sort = [{ key: match[1], dir }];
        } else if (p.operator === 'between') {
          result[p.field] = `${match[1]}|${match[2]}`;
        } else {
          let val = match[1];
          if (p.valueType === 'number') val = parseFloat(val).toString();
          result[p.field] = `${p.operator}:${val}`;
        }
      }
    }
    if (Object.keys(result).length === 0 && !sort) return null;
    return { success: true, filters: result, sort };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns]);
  const applySmartFilter = useCallback((query: string): SmartFilterResult | null => {
    const parsed = parseNaturalQuery(query);
    if (parsed && parsed.success) {
      onFilterChange(parsed.filters, parsed.sort);
      return parsed;
    }
    // لا تطابق → نُجرّب fallback: global search
    return null;
  }, [parseNaturalQuery, onFilterChange]);
  return { applySmartFilter, parseNaturalQuery };
}

// ─── useSavedViews (حفظ واسترجاع العروض) ────────────────────────────────────

export function useSavedViews(config: SavedViewsConfig) {
  const { tableKey, maxViews = 10 } = config;
  const storageKey = `datatable_views_${tableKey}`;
  const loadViews = useCallback((): SavedView[] => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }, [storageKey]);
  const saveView = useCallback((name: string, viewData: Omit<SavedView, 'id' | 'name' | 'createdAt'>) => {
    const views = loadViews();
    const newView: SavedView = { id: Date.now().toString(), name, createdAt: Date.now(), ...viewData };
    const updated = [newView, ...views].slice(0, maxViews);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return newView;
  }, [loadViews, storageKey, maxViews]);
  const deleteView = useCallback((id: string) => {
    const views = loadViews();
    const filtered = views.filter(v => v.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(filtered));
  }, [loadViews, storageKey]);
  const applyView = useCallback((view: SavedView, applyCallback: (view: SavedView) => void) => {
    applyCallback(view);
  }, []);
  return { loadViews, saveView, deleteView, applyView };
}

// ─── useContextMenu (قائمة السياق) ──────────────────────────────────────────

export function useContextMenu<T = Record<string, unknown>>(
  menuItems: (context: ContextMenuContext) => ContextMenuItem[],
  containerRef: React.RefObject<HTMLElement>,
  // ✅ إصلاح: data مطلوبة لملء context.row الذي كان فارغاً دائماً
  data: T[] = [],
  selectedKeys?: ReadonlySet<string | number>,
) {
  const [state, setState] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, context: null });

  // نحفظ data في ref لتجنب إعادة تسجيل الـ event listener عند كل تغيير
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // نستخدم DOM MouseEvent مباشرةً لأن الـ listener مسجَّل عبر addEventListener
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    let context: ContextMenuContext | null = null;

    const cellEl = target.closest('.dt-td') as HTMLElement | null;
    const rowEl  = target.closest('.dt-row') as HTMLElement | null;
    const thEl   = target.closest('th')     as HTMLElement | null;

    // نحوّل DOM MouseEvent إلى React.MouseEvent للتوافق مع النوع
    const reactEvent = e as unknown as React.MouseEvent;

    if (cellEl) {
      const rowIndexStr = cellEl.getAttribute('data-row-index');
      const colKey      = cellEl.getAttribute('data-col-key');
      if (rowIndexStr !== null && colKey) {
        const rowIndex = parseInt(rowIndexStr, 10);
        // ✅ نملأ row data فعلياً من مصفوفة data
        const row = (dataRef.current[rowIndex] ?? null) as Record<string, unknown> | undefined;
        context = { type: 'cell', rowIndex, colKey, row, selectedKeys, originalEvent: reactEvent };
      }
    } else if (rowEl) {
      const rowIndexStr = rowEl.getAttribute('data-row-index');
      if (rowIndexStr !== null) {
        const rowIndex = parseInt(rowIndexStr, 10);
        const row = (dataRef.current[rowIndex] ?? null) as Record<string, unknown> | undefined;
        context = { type: 'row', rowIndex, row, selectedKeys, originalEvent: reactEvent };
      }
    } else if (thEl) {
      const colKey = thEl.getAttribute('data-col-key');
      if (colKey) {
        context = { type: 'header', colKey, selectedKeys, originalEvent: reactEvent };
      }
    }

    if (!context) return;
    setState({ visible: true, x: e.clientX, y: e.clientY, context });
  }, []);

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  // ref لضمان قراءة أحدث قيمة لـ closeMenu بدون إعادة تسجيل
  const closeMenuRef = useRef(closeMenu);
  useEffect(() => { closeMenuRef.current = closeMenu; }, [closeMenu]);

  useEffect(() => {
    const handler = () => closeMenuRef.current();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [containerRef, handleContextMenu]);

  return { menuState: state, closeMenu, setContext: setState };
}

// ════════════════════════════════════════════════════════════════════════════
// useColumnVisibility — standalone hook لإدارة رؤية الأعمدة
//
// ⚠️  استخدمه فقط خارج DataTable (في مكونات مخصصة)
//     داخل DataTable استخدم: columnDefs + hiddenColumnKeys + onHiddenColumnsChange
//     التي تُدار بـ updateHidden المركزية وتُعلم الأب دائماً
//
// الاستخدام المستقل:
//   const { visibleColumns, hiddenColumns, toggleColumn } =
//     useColumnVisibility(allColumns, initialHidden);
// ════════════════════════════════════════════════════════════════════════════

export function useColumnVisibility<T = Record<string, unknown>>(
  columns: Column<T>[],
  /** مفاتيح الأعمدة المخفية افتراضياً (تُدمج مع defaultHidden على العمود) */
  initialHidden: string[] = [],
  /** مفتاح localStorage للحفظ — إذا تُرك فارغاً لا يُحفظ */
  storageKey?: string,
): {
  visibleColumns: Column<T>[];
  hiddenColumns: Set<string>;
  toggleColumn: (key: string) => void;
  showColumn: (key: string) => void;
  hideColumn: (key: string) => void;
  resetVisibility: () => void;
} {
  // بناء القيمة الابتدائية من defaultHidden + initialHidden + localStorage
  const getInitial = useCallback((): Set<string> => {
    const fromProps = new Set<string>([
      ...initialHidden,
      ...columns.filter(c => c.defaultHidden).map(c => c.key),
    ]);

    if (!storageKey) return fromProps;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {
      // localStorage غير متاح أو البيانات تالفة — نتجاهل
    }

    return fromProps;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // نحسبها مرة واحدة عند التهيئة

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(getInitial);

  // حفظ في localStorage عند كل تغيير
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...hiddenColumns]));
    } catch {
      // تجاهل خطأ الكتابة (وضع private / حجم ممتلئ)
    }
  }, [hiddenColumns, storageKey]);

  const toggleColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const showColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const hideColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      if (prev.has(key)) return prev;
      return new Set([...prev, key]);
    });
  }, []);

  const resetVisibility = useCallback(() => {
    const defaults = new Set<string>([
      ...initialHidden,
      ...columns.filter(c => c.defaultHidden).map(c => c.key),
    ]);
    setHiddenColumns(defaults);
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* تجاهل */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenColumns.has(c.key)),
    [columns, hiddenColumns],
  );

  return { visibleColumns, hiddenColumns, toggleColumn, showColumn, hideColumn, resetVisibility };
}

// ════════════════════════════════════════════════════════════════════════════
// ─── useColumnStatePersistence — حفظ حالة الأعمدة الكاملة ──────────────────
//
// يحفظ تحت مفتاح واحد في localStorage لكل typeCode:
//   • columnOrder      — ترتيب الأعمدة (drag & drop)
//   • columnWidths     — عرض كل عمود (resize)
//   • hiddenColumns    — الأعمدة المخفية
//   • pinnedColumns    — الأعمدة المثبتة (start/end)
//   • activeFilters    — الفلاتر النشطة
//
// واجهة بسيطة: save(patch) / load() / reset()
// لا يُلوّث useColumnVisibility/useColumnResize بمنطق localStorage خارجي
// ════════════════════════════════════════════════════════════════════════════

export interface ColumnStateSnapshot {
  columnOrder?:   string[];
  columnWidths?:  Record<string, number>;
  hiddenColumns?: string[];
  pinnedColumns?: { start?: string[]; end?: string[] };
  activeFilters?: Record<string, string>;
  savedAt:        number;
}

export function useColumnStatePersistence(storageKey: string | null | undefined) {
  // القراءة: تُنفَّذ مرة واحدة عند التهيئة (lazy initializer)
  const load = useCallback((): ColumnStateSnapshot | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ColumnStateSnapshot;
      // تحقق بسيط من صحة البنية
      if (typeof parsed !== 'object' || !parsed.savedAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [storageKey]);

  // الحفظ: patch جزئي — يدمج مع الحالة المحفوظة بدلاً من الكتابة الكاملة
  const save = useCallback((patch: Partial<Omit<ColumnStateSnapshot, 'savedAt'>>) => {
    if (!storageKey) return;
    try {
      const current = (() => {
        try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as ColumnStateSnapshot; }
        catch { return {} as ColumnStateSnapshot; }
      })();
      const updated: ColumnStateSnapshot = { ...current, ...patch, savedAt: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // localStorage ممتلئ أو وضع private — نتجاهل بصمت
    }
  }, [storageKey]);

  // حذف: إعادة ضبط كاملة
  const reset = useCallback(() => {
    if (!storageKey) return;
    try { localStorage.removeItem(storageKey); } catch { /* تجاهل */ }
  }, [storageKey]);

  // استخراج القيمة الابتدائية مرة واحدة فقط عند الـ mount
  // useRef أفضل من useMemo هنا لأن useMemo لا يضمن الاستقرار
  const initialSnapshotRef = useRef<ColumnStateSnapshot | null | undefined>(undefined);
  if (initialSnapshotRef.current === undefined) {
    initialSnapshotRef.current = load();
  }
  const initialSnapshot = initialSnapshotRef.current;

  return { load, save, reset, initialSnapshot };
}
//
// يُشغّل الفلتر والفرز والبحث بـ useRef للنتائج دون إعادة render
// حتى اكتمال المعالجة — يُمهّد لنقل المعالجة لـ Web Worker لاحقاً
// ════════════════════════════════════════════════════════════════════════════

export function useRowModel<T>(
  data: T[],
  filters: import('./types').FilterMap,
  globalQuery: string,
  sorts: import('./types').MultiSortState,
  legacySortState: import('./types').SortState,
  /** كل الأعمدة (بما فيها المخفية) — للفلترة والفرز */
  columns: import('./types').Column<T>[],
  /** الأعمدة المرئية فقط — للبحث العام (لا نبحث في المخفية) */
  searchCols: import('./types').Column<T>[],
  options: {
    clientFiltered: boolean;
    clientSorted: boolean;
    searchable: boolean;
    multiSort: boolean;
  }
): T[] {
  const result = useMemo(() => {
    let r = data;
    // الفلترة: تشمل كل الأعمدة (المخفية يمكن فلترتها من الـ API)
    if (options.clientFiltered) r = applyClientFilter(r, filters, columns);
    // البحث العام: فقط الأعمدة المرئية — لا نُرجع نتائج من أعمدة المستخدم لا يراها
    if (options.searchable && globalQuery) r = applyGlobalSearch(r, globalQuery, searchCols);
    if (options.clientSorted) {
      if (options.multiSort && sorts.length > 0) r = applyMultiSort(r, sorts, columns);
      else if (legacySortState.key) r = applyClientSort(r, legacySortState, columns);
    }
    return r;
  }, [
    data, filters, globalQuery, sorts, legacySortState,
    columns, searchCols,
    options.clientFiltered, options.clientSorted,
    options.searchable, options.multiSort,
  ]);

  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// ─── useTreeData — بيانات هرمية (مخطط الحسابات، فئات المنتجات...) ─────────
//
// يبني الشجرة من flat array بـ idKey/parentKey
// يُخرج الصفوف المطوية من DOM فعلياً
// يدعم indentPx لكل مستوى
// ════════════════════════════════════════════════════════════════════════════

export interface TreeConfig {
  idKey: string;
  parentKey: string;
  defaultCollapsed?: boolean;
  indentPx?: number;
}

export interface TreeRow<T> {
  row: T;
  level: number;
  hasChildren: boolean;
  collapsed: boolean;
  id: string | number;
  parentId: string | number | null;
}

export function useTreeData<T>(
  data: T[],
  config: TreeConfig | undefined
): {
  treeRows: TreeRow<T>[];
  toggleTreeNode: (id: string | number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isTreeMode: boolean;
} {
  const [collapsed, setCollapsed] = useState<Set<string | number>>(new Set());

  // بناء الشجرة الأولية
  const tree = useMemo(() => {
    if (!config) return null;

    const { idKey, parentKey, defaultCollapsed = false } = config;

    // فهرسة البيانات
    const byId = new Map<string | number, T>();
    const childrenOf = new Map<string | number | null, (string | number)[]>();

    for (const row of data) {
      const id = (row as Record<string, unknown>)[idKey] as string | number;
      const pid = (row as Record<string, unknown>)[parentKey] as string | number | null;
      byId.set(id, row);
      const list = childrenOf.get(pid) ?? [];
      list.push(id);
      childrenOf.set(pid, list);
    }

    // جمع IDs التي لها أبناء
    const parentIds = new Set<string | number>();
    for (const [pid, children] of childrenOf.entries()) {
      if (pid !== null && pid !== undefined && children.length > 0) {
        parentIds.add(pid);
      }
    }

    return { byId, childrenOf, parentIds };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, config?.idKey, config?.parentKey, config?.defaultCollapsed]);

  // ✅ إصلاح خطأ حرج: نقل setCollapsed من useMemo إلى useEffect
  // useMemo يجب أن يكون pure — أي side effect فيه ينتهك قواعد React
  // ويمكن أن يسبب تحديثات غير متوقعة أو حلقات لا نهائية في Strict Mode
  const treeParentIds = tree?.parentIds;
  const defaultCollapsedFlag = config?.defaultCollapsed ?? false;
  useEffect(() => {
    if (!treeParentIds || !defaultCollapsedFlag) return;
    setCollapsed(new Set(treeParentIds));
  }, [treeParentIds, defaultCollapsedFlag]);

  // Flatten الشجرة مع مراعاة الـ collapsed
  const treeRows = useMemo<TreeRow<T>[]>(() => {
    if (!config || !tree) return [];

    const { idKey, parentKey } = config;
    const { byId, childrenOf, parentIds } = tree;

    const result: TreeRow<T>[] = [];

    const walk = (parentId: string | number | null, level: number) => {
      const children = childrenOf.get(parentId) ?? [];
      for (const id of children) {
        const row = byId.get(id);
        if (!row) continue;
        const hasChildren = parentIds.has(id);
        const isCollapsed = collapsed.has(id);
        result.push({ row, level, hasChildren, collapsed: isCollapsed, id, parentId });
        if (hasChildren && !isCollapsed) {
          walk(id, level + 1);
        }
      }
    };

    walk(null, 0);
    return result;
  }, [tree, collapsed, config]);

  const toggleTreeNode = useCallback((id: string | number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  const collapseAll = useCallback(() => {
    if (!tree) return;
    setCollapsed(new Set(tree.parentIds));
  }, [tree]);

  return {
    treeRows,
    toggleTreeNode,
    expandAll,
    collapseAll,
    isTreeMode: !!config,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ─── useColumnGroups — رؤوس أعمدة متعددة المستويات (Column Groups) ─────────
//
// يدعم تجميع الأعمدة تحت header مشترك مع collapse/expand للمجموعة
// ════════════════════════════════════════════════════════════════════════════

export interface ColumnGroupDef {
  key: string;
  header: import('react').ReactNode;
  children: string[];   // مفاتيح الأعمدة المضمَّنة
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface ResolvedColumnGroup {
  group: ColumnGroupDef;
  collapsed: boolean;
  visibleChildren: string[];
  colspan: number;
}

export function useColumnGroups(
  groups: ColumnGroupDef[] | undefined,
  visibleColKeys: string[]
): {
  resolvedGroups: ResolvedColumnGroup[];
  toggleGroupCollapse: (key: string) => void;
  isGrouped: boolean;
} {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    if (!groups) return new Set();
    return new Set(
      groups.filter(g => g.defaultCollapsed && g.collapsible).map(g => g.key)
    );
  });

  const resolvedGroups = useMemo<ResolvedColumnGroup[]>(() => {
    if (!groups) return [];
    return groups.map(group => {
      const collapsed = group.collapsible ? collapsedGroups.has(group.key) : false;
      // إذا مطوية: فقط أول عمود يظهر كـ placeholder
      const visibleChildren = collapsed
        ? [group.children[0]].filter(Boolean)
        : group.children.filter(k => visibleColKeys.includes(k));
      return {
        group,
        collapsed,
        visibleChildren,
        colspan: visibleChildren.length,
      };
    });
  }, [groups, collapsedGroups, visibleColKeys]);

  const toggleGroupCollapse = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return {
    resolvedGroups,
    toggleGroupCollapse,
    isGrouped: !!groups?.length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ─── useRangeSelection — تحديد نطاق خلايا (Shift+Click / سحب) ──────────────
//
// يُكمّل useClipboardPaste: النطاق المحدد = ما يُنسخ لـ Excel
// ════════════════════════════════════════════════════════════════════════════

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export function useRangeSelection(
  enabled: boolean,
  rowCount: number,
  colCount: number
): {
  range: CellRange | null;
  anchorCell: { row: number; col: number } | null;
  selectCell: (row: number, col: number, shift: boolean) => void;
  clearRange: () => void;
  isInRange: (row: number, col: number) => boolean;
  getRangeText: (getData: (row: number, col: number) => string) => string;
} {
  const [range, setRange] = useState<CellRange | null>(null);
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);

  const selectCell = useCallback((row: number, col: number, shift: boolean) => {
    if (!enabled) return;
    if (shift && anchor) {
      setRange({
        startRow: Math.min(anchor.row, row),
        startCol: Math.min(anchor.col, col),
        endRow: Math.max(anchor.row, row),
        endCol: Math.max(anchor.col, col),
      });
    } else {
      setAnchor({ row, col });
      setRange({ startRow: row, startCol: col, endRow: row, endCol: col });
    }
  }, [enabled, anchor]);

  const clearRange = useCallback(() => {
    setRange(null);
    setAnchor(null);
  }, []);

  const isInRange = useCallback((row: number, col: number): boolean => {
    if (!range) return false;
    return (
      row >= range.startRow && row <= range.endRow &&
      col >= range.startCol && col <= range.endCol
    );
  }, [range]);

  // تحويل النطاق المحدد إلى TSV (للنسخ لـ Excel)
  const getRangeText = useCallback((getData: (row: number, col: number) => string): string => {
    if (!range) return '';
    const rows: string[] = [];
    for (let r = range.startRow; r <= range.endRow; r++) {
      const cols: string[] = [];
      for (let c = range.startCol; c <= range.endCol; c++) {
        cols.push(getData(r, c));
      }
      rows.push(cols.join('\t'));
    }
    return rows.join('\n');
  }, [range]);

  // Clear on Escape
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearRange();
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && range) {
        // Ctrl+C → نسخ النطاق المحدد (يحتاج getData من الخارج)
        // يُفعَّل من المكوّن الأب بـ getRangeText
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, clearRange, range]);

  return { range, anchorCell: anchor, selectCell, clearRange, isInRange, getRangeText };
}

// ════════════════════════════════════════════════════════════════════════════
// ─── useQuickFilter — بحث سريع Ctrl+F داخل الجدول ─────────────────────────
//
// يُنشئ شريط بحث صغير فوق الجدول. يُفلتر البيانات المُعالجة client-side
// عبر جميع الأعمدة المرئية. يعمل بشكل مستقل عن البحث العالمي (globalQuery).
// ════════════════════════════════════════════════════════════════════════════

export function useQuickFilter<T>(
  enabled: boolean,
  data: T[],
  columns: Column<T>[],
): [
  query: string,
  setQuery: (q: string) => void,
  isOpen: boolean,
  open: () => void,
  close: () => void,
  matchCount: number | null,
] {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+F / Cmd+F to open
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, isOpen]);

  const matchCount = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    const cols = columns.filter(c => c.searchable !== false);
    return data.filter(row =>
      cols.some(col => {
        const v = getRawValue(row, col as Column<T>);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    ).length;
  }, [query, data, columns]);

  const open  = useCallback(() => { setIsOpen(true);  setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const close = useCallback(() => { setIsOpen(false); setQuery(''); }, []);

  return [query, setQuery, isOpen, open, close, matchCount];
}

```

## FILE: ./resources/js/components/ui/DataTable/index.ts

```
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
  // v10.3 — Excel Advanced
  DocumentInfo,
  ExcelExportAdvancedOptions,
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
  formatDateShort,             // v10.3 — تنسيق التاريخ للعرض
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
  useColumnVisibility,         // standalone — للاستخدام خارج DataTable فقط
  useClipboardPaste,
  useSmartFilter,
  useSavedViews,
  useContextMenu,
  DEFAULT_SMART_FILTER_PATTERNS, // [] فارغة — كل مشروع يُمرر patterns الخاصة به
  // v10.2
  useRowModel,
  useTreeData,
  useColumnGroups,
  useRangeSelection,
  // v10.3
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

// ── Excel Export الاحترافي (exceljs) ─────────────────────────────────────────
// استخدام مستقل: import { useERPExport } from '@/components/ui/DataTable'
export {
  exportToExcelAdvanced,
  exportDocumentToExcel,
  computeAggregatesForExport,
  calcFiscalStamp,
  useERPExport,
} from './excelExportAdvanced';

export type { UseERPExportOptions } from './excelExportAdvanced';

```

## FILE: ./resources/js/components/ui/DataTable/MultiSelect.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// DataTable/MultiSelect.tsx  —  v8.2
// (لا تغييرات جوهرية – آلية المزامنة تعمل لأن المكون يُعاد تحميله)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';

interface BaseMultiSelectProps {
  value:    string;
  onChange: (csv: string) => void;
  onClose:  () => void;
}

interface StaticMultiSelectProps extends BaseMultiSelectProps {
  options: readonly { value: string; label: string }[];
}

export const StaticMultiSelect = memo(function StaticMultiSelect({
  options, value, onChange, onClose,
}: StaticMultiSelectProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(
    () => value ? value.split(',').filter(Boolean) : [],
  );
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTempSelected(value ? value.split(',').filter(Boolean) : []);
  }, [value]);

  const filtered = useMemo(
    () => search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : [...options],
    [options, search],
  );

  const toggle = useCallback((val: string) => {
    setTempSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }, []);

  const selectAll = useCallback(() => setTempSelected(options.map(o => o.value)), [options]);
  const clearAll = useCallback(() => setTempSelected([]), []);
  const apply = useCallback(() => { onChange(tempSelected.join(',')); onClose(); }, [tempSelected, onChange, onClose]);
  const clear = useCallback(() => { onChange(''); onClose(); }, [onChange, onClose]);

  return (
    <MultiSelectShell
      options={filtered}
      selected={tempSelected}
      search={search}
      onSearch={setSearch}
      onToggle={toggle}
      onSelectAll={selectAll}
      onClearAll={clearAll}
      onApply={apply}
      onClear={clear}
      selectedCount={tempSelected.length}
    />
  );
});

interface DynamicMultiSelectProps extends BaseMultiSelectProps {
  rawValues:       string[];
  labelFormatter?: (v: string) => string;
}

export const DynamicMultiSelect = memo(function DynamicMultiSelect({
  rawValues, labelFormatter, value, onChange, onClose,
}: DynamicMultiSelectProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(
    () => value ? value.split(',').filter(Boolean) : [],
  );
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTempSelected(value ? value.split(',').filter(Boolean) : []);
  }, [value]);

  const allOptions = useMemo(
    () => rawValues.slice().sort((a, b) => a.localeCompare(b, 'ar')).map(v => ({ value: v, label: labelFormatter ? labelFormatter(v) : v })),
    [rawValues, labelFormatter],
  );

  const filtered = useMemo(() => search ? allOptions.filter(o => o.label.includes(search)) : allOptions, [allOptions, search]);

  const toggle = useCallback((val: string) => {
    setTempSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }, []);

  const selectAll = useCallback(() => setTempSelected(allOptions.map(o => o.value)), [allOptions]);
  const clearAll = useCallback(() => setTempSelected([]), []);
  const apply = useCallback(() => { onChange(tempSelected.join(',')); onClose(); }, [tempSelected, onChange, onClose]);
  const clear = useCallback(() => { onChange(''); onClose(); }, [onChange, onClose]);

  return (
    <MultiSelectShell
      options={filtered}
      selected={tempSelected}
      search={search}
      onSearch={setSearch}
      onToggle={toggle}
      onSelectAll={selectAll}
      onClearAll={clearAll}
      onApply={apply}
      onClear={clear}
      selectedCount={tempSelected.length}
      searchPlaceholder="بحث في الخيارات..."
    />
  );
});

interface ShellProps {
  options:           { value: string; label: string }[];
  selected:          string[];
  search:            string;
  onSearch:          (v: string) => void;
  onToggle:          (v: string) => void;
  onSelectAll:       () => void;
  onClearAll:        () => void;
  onApply:           () => void;
  onClear:           () => void;
  selectedCount:     number;
  searchPlaceholder?: string;
}

const MultiSelectShell = memo(function MultiSelectShell({
  options, selected, search, onSearch, onToggle,
  onSelectAll, onClearAll, onApply, onClear,
  selectedCount, searchPlaceholder = 'بحث...',
}: ShellProps) {
  return (
    <>
      <div className="dt-ms-controls">
        <button className="dt-ms-ctrl-btn" onClick={onSelectAll} disabled={options.length === 0}>
          <i className="ti ti-check" /> تحديد الكل
        </button>
        <button className="dt-ms-ctrl-btn" onClick={onClearAll} disabled={selectedCount === 0}>
          <i className="ti ti-square" /> إلغاء الكل
        </button>
      </div>

      <div className="dt-ms-search-wrap">
        <input className="dt-fi" type="text" placeholder={searchPlaceholder} value={search} onChange={e => onSearch(e.target.value)} autoFocus />
        <i className="ti ti-search dt-ms-search-icon" />
      </div>

      <div className="dt-ms-list" role="listbox" aria-multiselectable="true">
        {options.map(opt => {
          const isOn = selected.includes(opt.value);
          return (
            <div
              key={opt.value}
              role="option"
              aria-selected={isOn}
              className={`dt-ms-item${isOn ? ' on' : ''}`}
              onClick={() => onToggle(opt.value)}
              onKeyDown={e => e.key === 'Enter' && onToggle(opt.value)}
              tabIndex={0}
            >
              <span className="dt-ms-check" aria-hidden="true">
                <span className="dt-ms-check-box" />
              </span>
              <span className="dt-ms-label" title={opt.label}>{opt.label}</span>
            </div>
          );
        })}
        {options.length === 0 && <div className="dt-ms-empty">{search ? `لا نتائج لـ "${search}"` : 'لا توجد خيارات'}</div>}
      </div>

      <div className="dt-flt-footer dt-flt-footer-between">
        <span className="dt-ms-selected-count">{selectedCount > 0 ? `${selectedCount} محدد` : 'لا يوجد تحديد'}</span>
        <div className="dt-ms-footer-actions">
          <button className="dt-flt-clear" onClick={onClear}>مسح الفلتر</button>
          <button className="dt-ms-apply" onClick={onApply} disabled={selectedCount === 0}>تطبيق</button>
        </div>
      </div>
    </>
  );
});

```

## FILE: ./resources/js/components/ui/DataTable/Primitives.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// DataTable/Primitives.tsx
// مكوّنات بدائية صغيرة: Skeleton، EditInput، SkeletonCard
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, memo } from 'react';
import type { KeyboardEvent }  from 'react';
import type { EditDef }         from './types';
import { SKELETON_WIDTHS }      from './types';

// ─── SkeletonRows (جدول) ─────────────────────────────────────────────────────

export function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => {
            const w = SKELETON_WIDTHS[(r * cols + c) % SKELETON_WIDTHS.length];
            return (
              <td key={c} className="dt-skel-td">
                <span
                  className="dt-skel"
                  style={{
                    height: 13,
                    width: `${w}%`,
                    animationDelay: `${(r * 0.08 + c * 0.03).toFixed(2)}s`,
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// ─── SkeletonCards (موبايل) ───────────────────────────────────────────────────

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="dt-card-skeletons">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="dt-card-skel-item">
          <span
            className="dt-skel"
            style={{
              display: 'block',
              height: '100%',
              animationDelay: `${(i * 0.12).toFixed(2)}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── EditInput ───────────────────────────────────────────────────────────────

export const EditInput = memo(function EditInput({
  def, value, onChange, onCommit, onCancel,
}: {
  def:      EditDef;
  value:    string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // تركيز تلقائي بعد التصيير
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    if (inputRef.current instanceof HTMLInputElement && inputRef.current.type !== 'date') {
      inputRef.current.select();
    }
  }, []);

  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); onCommit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  if (def.type === 'select') return (
    <select
      autoFocus={true}
      ref={inputRef as React.RefObject<HTMLSelectElement>}
      className="dt-edit-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKey}
    >
      {def.options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className="dt-edit-input"
      type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
      value={value}
      min={def.type === 'number' ? def.min : undefined}
      max={def.type === 'number' ? def.max : undefined}
      step={def.type === 'number' ? (def.step ?? 'any') : undefined}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKey}
    />
  );
});

```

## FILE: ./resources/js/components/ui/DataTable/types.ts

```
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
  | { type: 'dynamic-multiselect'; labelFormatter?: (v: string) => string; fetchOptions?: () => Promise<string[]> };

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
  /** Tooltip shown on cell hover — static string or dynamic function */
  tooltip?: string | ((row: T, rowIndex: number) => string);
  /** Tooltip shown on column header hover */
  headerTooltip?: string;
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
  selectedKeys?: ReadonlySet<string | number>;
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
  /** Floating action bar rendered on row hover — more compact than rowActions column */
  hoverActions?: (row: T) => ReactNode;
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

  // ── Column Visibility API ────────────────────────────────────────────────
  /** كل الأعمدة بما فيها المخفية — لعرضها في قائمة الأعمدة */
  columnDefs?: Column<T>[];
  /** الأعمدة المخفية ابتداءً */
  hiddenColumnKeys?: string[];
  /**
   * يُستدعى عند كل تغيير في رؤية الأعمدة.
   * @param key         مفتاح العمود — أو '' في حالة batch (إخفاء الكل / Saved View)
   * @param willBeHidden true=إخفاء، false=إظهار
   * @param allHidden   القائمة الكاملة للمخفية بعد التغيير
   */
  onHiddenColumnsChange?: (key: string, willBeHidden: boolean, allHidden: string[]) => void;

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
  enableQuickFilter?: boolean;
  /** For server-paged tables: called during export to fetch ALL rows across all pages */
  fetchAllForExport?: () => Promise<T[]>;
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
export const FILTER_DEBOUNCE = 250;
export const DEFAULT_ROW_HEIGHT = 40;
export const DEFAULT_CONTAINER_HEIGHT = 500;
export const DEFAULT_OVERSCAN = 5;

```

## FILE: ./resources/js/components/ui/DataTable/utils.ts

```
// DataTable/utils.ts  —  v10.0 (كامل مع جميع الدوال)

import type {
  Column, SortState, MultiSortState, FilterMap, AggregateType, RangeFilter,
  ConditionalFormat, ExcelExportOptions, ExcelExportAdvancedOptions,
} from './types';

// ════════════════════════════════════════════════════════════════════════════
// دوال أساسية (موجودة سابقاً)
// ════════════════════════════════════════════════════════════════════════════

export function getRawValue<T>(row: T, col: Column<T>): unknown {
  if (col.accessor) return col.accessor(row);
  if (col.key.includes('.')) {
    const parts = col.key.split('.');
    let val: unknown = row;
    for (const part of parts) {
      if (val == null || typeof val !== 'object') return undefined;
      val = (val as Record<string, unknown>)[part];
    }
    return val;
  }
  return (row as Record<string, unknown>)[col.key];
}

export function getStringValue<T>(row: T, col: Column<T>): string {
  const v = getRawValue(row, col);
  return v == null ? '' : String(v).toLowerCase();
}

export function encodeRange(min: string, max: string): string {
  return `${min}|${max}`;
}

export function decodeRange(val: string): RangeFilter {
  const idx = val.indexOf('|');
  if (idx === -1) return { min: val, max: '' };
  return { min: val.slice(0, idx), max: val.slice(idx + 1) };
}

function compareDates(d1Str: string, d2Str: string, op: 'lt' | 'gt'): boolean {
  if (!d1Str || !d2Str) return true;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return op === 'lt' ? d1 < d2 : d1 > d2;
}

// ─── تحليل قيمة فلتر SmartFilter (operator:value) ──────────────────────────
//
// SmartFilter يُنتج قيماً بصيغة "gt:30" أو "contains:أحمد" أو "30|60" (range)
// هذه الدالة تُحوّلها لمقارنة رقمية/نصية صحيحة.
// إذا لم تكن بصيغة operator:value → تُعامَل كفلتر نصي عادي.
//
function applySmartOperator(rv: string, rawVal: string): boolean {
  const colonIdx = rawVal.indexOf(':');
  if (colonIdx === -1) return rv.includes(rawVal.toLowerCase());

  const op  = rawVal.slice(0, colonIdx);
  const val = rawVal.slice(colonIdx + 1);

  switch (op) {
    case 'eq':       return rv === val.toLowerCase();
    case 'neq':      return rv !== val.toLowerCase();
    case 'contains': return rv.includes(val.toLowerCase());
    case 'starts':   return rv.startsWith(val.toLowerCase());
    case 'ends':     return rv.endsWith(val.toLowerCase());
    case 'gt':  { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n > v; }
    case 'gte': { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n >= v; }
    case 'lt':  { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n < v; }
    case 'lte': { const n = parseFloat(rv); const v = parseFloat(val); return !isNaN(n) && !isNaN(v) && n <= v; }
    default:         return rv.includes(rawVal.toLowerCase());
  }
}

export function applyClientFilter<T>(data: T[], filters: FilterMap, columns: Column<T>[]): T[] {
  const active = Object.entries(filters).filter(([, v]) => v !== '');
  if (!active.length) return data;

  return data.filter(row =>
    active.every(([key, rawVal]) => {
      // ── فلاتر SmartFilter بدون عمود مطابق (مثل 'overdue_days', 'party.name')
      // نبحث عن العمود أولاً وإذا لم نجده نطبق البحث على الحقل المباشر
      const col = columns.find(c => c.key === key);

      // إذا لا يوجد عمود → محاولة dot-notation على الكائن مباشرة
      if (!col) {
        const parts = key.split('.');
        let val: unknown = row;
        for (const part of parts) {
          if (val == null || typeof val !== 'object') { val = undefined; break; }
          val = (val as Record<string, unknown>)[part];
        }
        const rv = val == null ? '' : String(val).toLowerCase();
        return applySmartOperator(rv, rawVal);
      }

      const { type } = col.filter ?? { type: 'text' };
      const rv = getStringValue(row, col);

      if (type === 'select') return rv === rawVal.toLowerCase();
      if (type === 'multiselect' || type === 'dynamic-multiselect') {
        const selected = rawVal.split(',').filter(Boolean).map(s => s.toLowerCase());
        return !selected.length || selected.includes(rv);
      }
      if (type === 'number') {
        // range عادي (min|max)
        if (rawVal.includes('|') && !rawVal.includes(':')) {
          const { min, max } = decodeRange(rawVal);
          const numRv = parseFloat(rv);
          if (min && !isNaN(parseFloat(min)) && numRv < parseFloat(min)) return false;
          if (max && !isNaN(parseFloat(max)) && numRv > parseFloat(max)) return false;
          return true;
        }
        // SmartFilter operator
        return applySmartOperator(rv, rawVal);
      }
      if (type === 'date') {
        const { min, max } = decodeRange(rawVal);
        if (min && !compareDates(rv, min, 'lt')) return false;
        if (max && !compareDates(rv, max, 'gt')) return false;
        return true;
      }
      // text / fallback — يدعم SmartFilter operators أيضاً
      return applySmartOperator(rv, rawVal);
    }),
  );
}

export function applyGlobalSearch<T>(data: T[], query: string, columns: Column<T>[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  const cols = columns.filter(c => c.searchable !== false);
  return data.filter(row => cols.some(col => String(getRawValue(row, col) ?? '').toLowerCase().includes(q)));
}

export function applyClientSort<T>(data: T[], sort: SortState, columns: Column<T>[]): T[] {
  if (!sort.key || !sort.dir) return data;
  const col = columns.find(c => c.key === sort.key);
  if (!col) return data;
  return [...data].sort((a, b) => {
    const va = getRawValue(a, col);
    const vb = getRawValue(b, col);
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va ?? '').localeCompare(String(vb ?? ''), 'ar-DZ');
    return sort.dir === 'desc' ? -cmp : cmp;
  });
}

export function applyMultiSort<T>(data: T[], sorts: MultiSortState, columns: Column<T>[]): T[] {
  if (!sorts.length) return data;
  const colMap = new Map(columns.map(c => [c.key, c]));
  return [...data].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const col = colMap.get(key);
      if (!col) continue;
      const va = getRawValue(a, col);
      const vb = getRawValue(b, col);
      let cmp: number;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'ar-DZ');
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

export function applyConditionalFormat<T>(
  value: unknown,
  row: T,
  colKey: string,
  formats: ConditionalFormat<T>[],
): { style: React.CSSProperties; className: string } {
  let style: React.CSSProperties = {};
  const classes: string[] = [];
  for (const fmt of formats) {
    if (fmt.colKey !== '*' && fmt.colKey !== colKey) continue;
    if (fmt.condition(value, row)) {
      style = { ...style, ...fmt.style };
      if (fmt.className) classes.push(fmt.className);
    }
  }
  return { style, className: classes.join(' ') };
}

export function computeAggregate<T>(rows: T[], col: Column<T>, type: AggregateType): number | null {
  const nums = rows
    .map(r => { const v = getRawValue(r, col); return typeof v === 'number' ? v : parseFloat(String(v ?? '')); })
    .filter(n => !isNaN(n));
  if (!nums.length) return null;
  switch (type) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'count': return nums.length;
  }
}

export function exportToCSV<T>(data: T[], columns: Column<T>[], name: string): void {
  const cols = columns.filter(c => typeof (c.exportHeader ?? c.header) === 'string');
  const hdr = cols.map(c => `"${(c.exportHeader ?? c.header as string)}"`).join(',');
  const rows = data.map(r =>
    cols.map(c => `"${String(getRawValue(r, c) ?? '').replace(/"/g, '""')}"`).join(','),
  );
  const blob = new Blob(['\ufeff' + [hdr, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function buildPageNumbers(cur: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  let s = Math.max(2, cur - 1);
  let e = Math.min(last - 1, cur + 1);
  if (cur <= 3) { s = 2; e = 4; }
  if (cur >= last - 2) { s = last - 3; e = last - 1; }
  if (s > 2) pages.push('…');
  for (let p = s; p <= e; p++) pages.push(p);
  if (e < last - 1) pages.push('…');
  if (last !== 1 && pages[pages.length - 1] !== last) pages.push(last);
  return pages;
}

export function getTextAlign(align?: Column['align']): React.CSSProperties['textAlign'] {
  if (align === 'center') return 'center';
  if (align === 'end') return 'left';
  return 'right';
}

// ─── formatDateShort ─────────────────────────────────────────────────────────
//
// تحويل أي صيغة تاريخ إلى YYYY-MM-DD للعرض والتصدير
//
// "2026-06-07T23:00:00.000000Z"  →  "2026-06-07"
// "2026-06-07 14:30:00"          →  "2026-06-07"
// null / undefined               →  ""
//
export function formatDateShort(val: string | Date | null | undefined): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  } catch {
    return String(val);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 🆕 دوال جديدة للميزات
// ════════════════════════════════════════════════════════════════════════════

// ─── Excel Export حقيقي (يتطلب xlsx) ─────────────────────────────────────────

// ─── Excel Export — يستخدم excelExportAdvanced (exceljs) مع fallback لـ CSV ───
//
// المسار المفضل: exportToExcelAdvanced من excelExportAdvanced.ts
// هذه الدالة تبقى للـ backward compatibility مع DataTable الداخلي
// (زر Excel في export menu)
//
export async function exportToExcel<T>(
  data:    T[],
  columns: Column<T>[],
  options: ExcelExportOptions & {
    documentInfo?:     import('./types').DocumentInfo;
    includeAggregates?: boolean;
    aggregates?:        Record<string, { type: AggregateType; value: number | string }>;
    // خيارات advanced إضافية
    orientation?:      'landscape' | 'portrait';
    sheetName?:        string;
    onSave?:           (buffer: ArrayBuffer) => void;
  } = {},
): Promise<void> {
  const {
    fileName = 'export', title, documentInfo,
    includeAggregates, aggregates: passedAggregates,
    orientation, sheetName, onSave,
  } = options;

  try {
    // استيراد dynamic لتجنب تحميل exceljs عند عدم الحاجة
    const { exportToExcelAdvanced, computeAggregatesForExport } =
      await import('./excelExportAdvanced');

    // ✅ إذا مُرِّرت aggregates جاهزة من DataTable نستخدمها مباشرة
    // وإلا نحسبها من columns.aggregate (fallback)
    const aggregates = passedAggregates && Object.keys(passedAggregates).length > 0
      ? passedAggregates
      : includeAggregates
        ? computeAggregatesForExport(data as Record<string, unknown>[], columns as Column[])
        : {};

    await exportToExcelAdvanced(
      data as Record<string, unknown>[],
      columns as Column[],
      {
        fileName,
        title:          title ?? fileName,
        documentInfo:   documentInfo ?? {},
        // ✅ showAggregates يتبع includeAggregates أو وجود aggregates جاهزة
        showAggregates: includeAggregates ?? Object.keys(aggregates).length > 0,
        aggregates,
        orientation,
        sheetName,
        onSave,
      },
    );
  } catch (error) {
    // Fallback: CSV مع إشعار المستخدم
    console.warn(
      'DataTable: مكتبة exceljs غير متوفرة — جارٍ التصدير بصيغة CSV.\n' +
      'لتفعيل تصدير Excel الاحترافي: npm install exceljs',
    );

    const msg = document.createElement('div');
    msg.setAttribute('role', 'alert');
    msg.style.cssText = [
      'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1a1a2e', 'color:#fff', 'padding:10px 20px',
      'border-radius:8px', 'font-size:13px', 'z-index:99999',
      'box-shadow:0 4px 12px rgba(0,0,0,.3)', 'direction:rtl',
    ].join(';');
    msg.textContent = '⚠️ مكتبة exceljs غير مثبتة — تم التصدير بصيغة CSV';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);

    exportToCSV(data, columns, fileName);
  }
}

// ─── JSON Export ──────────────────────────────────────────────────────────────

export function exportToJSON<T>(
  data: T[],
  columns: Column<T>[],
  options: ExcelExportOptions = {},
): void {
  const { fileName = 'export', includeHiddenColumns = false } = options;
  const visibleCols = columns.filter(c => !c.defaultHidden || includeHiddenColumns);

  const rows = data.map(row => {
    const obj: Record<string, unknown> = {};
    for (const col of visibleCols) {
      const key = col.exportHeader ?? (typeof col.header === 'string' ? col.header : col.key);
      obj[key] = getRawValue(row, col) ?? '';
    }
    return obj;
  });

  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ─── Print Export (نافذة طباعة مُنسَّقة) ────────────────────────────────────

export function exportToPrint<T>(
  data: T[],
  columns: Column<T>[],
  options: ExcelExportOptions = {},
): void {
  const { fileName = 'تقرير', title, includeHiddenColumns = false } = options;
  const visibleCols = columns.filter(c => !c.defaultHidden || includeHiddenColumns);
  const headers = visibleCols.map(c => c.exportHeader ?? (typeof c.header === 'string' ? c.header : c.key));

  const rows = data.map(row =>
    visibleCols.map(col => {
      const v = getRawValue(row, col);
      return v == null ? '' : String(v);
    }),
  );

  const tableRows = rows.map(r =>
    `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`,
  ).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${title ?? fileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #111; direction: rtl; padding: 16px; }
    h2 { font-size: 14px; margin-bottom: 12px; color: #222; border-bottom: 2px solid #333; padding-bottom: 6px; }
    .meta { font-size: 10px; color: #666; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a1a2e; color: #fff; padding: 6px 8px; text-align: right; font-size: 10px; font-weight: 700; }
    td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9f9f9; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  ${title ? `<h2>${title}</h2>` : ''}
  <div class="meta">
    عدد السجلات: ${data.length} &nbsp;|&nbsp;
    تاريخ الطباعة: ${new Date().toLocaleDateString('ar-DZ')}
  </div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  try {
    const win = window.open('', '_blank');
    if (!win) {
      // Popup blocker: fallback — فتح في نافذة جديدة عبر data URL
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try { win.print(); } catch { /* المستخدم أغلق النافذة قبل الطباعة */ }
    }, 300);
  } catch (err) {
    console.warn('[DataTable] exportToPrint: فشل فتح نافذة الطباعة', err);
  }
}

// ─── Paste from Excel (TSV/CSV parsing) ──────────────────────────────────────

export function parseTSV(plainText: string): string[][] {
  const lines = plainText.split(/\r?\n/);
  const result: string[][] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    let cells: string[] = [];
    if (line.includes('\t')) {
      cells = line.split('\t');
    } else {
      const regex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        cells.push(match[1] ? match[1].replace(/""/g, '"') : (match[2] || ''));
      }
    }
    result.push(cells);
  }
  return result;
}

```
