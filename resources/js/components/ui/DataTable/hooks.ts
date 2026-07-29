// DataTable/hooks.ts  —  v10.3 (كامل مع جميع hooks)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  MultiSortState, URLStateConfig, FilterMap,
  RowGroupConfig, RowGroup, ColumnPinConfig, ActiveCell,
  Column, CellValidationRule, PendingEdit, BatchEditState,
  CellEditPayload, PasteOptions, SmartFilterResult, SavedView,
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
      if (value) params.set(k, value); else params.delete(k);
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
    const entries = [...groupMap.entries()];
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
      if (next.has(value)) next.delete(value); else next.add(value);
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

  return { pinConfig, pinColumn, isPinned, clearAllPins, getPinnedOffset, setPinConfigBatch };
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
  _columns: Column<T>[],
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
  _menuItems: (context: ContextMenuContext) => ContextMenuItem[],
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

    const { idKey, parentKey, defaultCollapsed: _defaultCollapsed = false } = config;

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

    const { idKey: _idKey, parentKey: _parentKey } = config;
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
      if (next.has(id)) next.delete(id); else next.add(id);
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
      if (next.has(key)) next.delete(key); else next.add(key);
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
  _rowCount: number,
  _colCount: number
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
