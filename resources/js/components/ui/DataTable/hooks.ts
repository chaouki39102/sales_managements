// DataTable/hooks.ts  —  v10.0 (كامل مع جميع hooks)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  MultiSortState, URLStateConfig, FilterMap,
  RowGroupConfig, RowGroup, ColumnPinConfig, ActiveCell,
  Column, CellValidationRule, PendingEdit, BatchEditState,
  EditingCell, PasteOptions, SmartFilterResult, SavedView,
  SavedViewsConfig, ContextMenuItem, ContextMenuContext, ContextMenuState,
} from './types';
import {
  MIN_COL_WIDTH, DEFAULT_ROW_HEIGHT,
  DEFAULT_CONTAINER_HEIGHT, DEFAULT_OVERSCAN,
} from './types';
import { getRawValue, parseTSV } from './utils';

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
      const delta = startX - e.clientX;
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
  return { widths, startResize, resetWidth };
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
  useEffect(() => {
    setColumnOrder(prev => {
      const existing = new Set(prev);
      const newKeys = initialOrder.filter(k => !existing.has(k));
      const removed = new Set(initialOrder);
      const filtered = prev.filter(k => removed.has(k));
      return [...filtered, ...newKeys];
    });
  }, [initialOrder.join(',')]);
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
    return entries.map(([value, rows]) => ({
      value,
      label: value || '(فارغ)',
      rows,
      collapsed: collapsedGroups.has(value),
    }));
  }, [data, config, columns, collapsedGroups]);
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
  return { groups, toggleGroup, expandAll, collapseAll, collapsedGroups };
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
  return { pinConfig, pinColumn, isPinned, clearAllPins };
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
      case 'ArrowUp': e.preventDefault(); move(-1, 0); break;
      case 'ArrowDown': e.preventDefault(); move(+1, 0); break;
      case 'ArrowRight': e.preventDefault(); move(0, -1); break;
      case 'ArrowLeft': e.preventDefault(); move(0, +1); break;
      case 'Tab': e.preventDefault(); if (e.shiftKey) move(0, -1); else move(0, +1); break;
      case 'Enter': e.preventDefault(); if (activeCell) { if (isEditing) move(+1, 0); else { setIsEditing(true); onStartEdit?.(activeCell); } } break;
      case 'F2': if (activeCell) { e.preventDefault(); setIsEditing(true); onStartEdit?.(activeCell); } break;
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
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
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
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [tableRef, handlePaste]);
}

// ─── useSmartFilter (تحليل اللغة العربية) ───────────────────────────────────

export function useSmartFilter<T>(
  columns: Column<T>[],
  onFilterChange: (filters: Record<string, string>, sorts?: MultiSortState) => void
) {
  const parseNaturalQuery = useCallback((query: string): SmartFilterResult | null => {
    const q = query.trim();
    const result: Record<string, string> = {};
    let sort: MultiSortState | undefined;
    const patterns: { regex: RegExp; field: string; operator: string; valueType: 'string' | 'number' }[] = [
      { regex: /فاتورة(?:ات)?\s+أكثر\s+من\s+(\d+)\s+يوم/, field: 'overdue_days', operator: 'gt', valueType: 'number' },
      { regex: /أقل\s+من\s+(\d+)\s+([^\s]+)/, field: '$2', operator: 'lt', valueType: 'number' },
      { regex: /بين\s+(\d+)\s+و\s+(\d+)/, field: 'range', operator: 'between', valueType: 'number' },
      { regex: /العميل\s+([^\s]+)/, field: 'party.name', operator: 'contains', valueType: 'string' },
      { regex: /الحالة\s+([^\s]+)/, field: 'document_status.name', operator: 'eq', valueType: 'string' },
      { regex: /الفرز\s+حسب\s+([^\s]+)\s+(تصاعدي|تنازلي)/, field: '$1', operator: 'sort', valueType: 'string' },
    ];
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
  }, []);
  const applySmartFilter = useCallback((query: string) => {
    const parsed = parseNaturalQuery(query);
    if (parsed && parsed.success) {
      onFilterChange(parsed.filters, parsed.sort);
    }
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

export function useContextMenu(
  menuItems: (context: ContextMenuContext) => ContextMenuItem[],
  containerRef: React.RefObject<HTMLElement>
) {
  const [state, setState] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, context: null });
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    let target = e.target as HTMLElement;
    let context: ContextMenuContext | null = null;
    if (target.closest('.dt-td')) {
      const cell = target.closest('.dt-td') as HTMLElement;
      const rowIndexAttr = cell.getAttribute('data-row-index');
      const colKey = cell.getAttribute('data-col-key');
      if (rowIndexAttr !== null && colKey) {
        context = { type: 'cell', rowIndex: parseInt(rowIndexAttr, 10), colKey, originalEvent: e };
      }
    } else if (target.closest('.dt-row')) {
      const row = target.closest('.dt-row') as HTMLElement;
      const rowIndexAttr = row.getAttribute('data-row-index');
      if (rowIndexAttr !== null) {
        context = { type: 'row', rowIndex: parseInt(rowIndexAttr, 10), originalEvent: e };
      }
    } else if (target.closest('th')) {
      const th = target.closest('th') as HTMLElement;
      const colKey = th.getAttribute('data-col-key');
      if (colKey) {
        context = { type: 'header', colKey, originalEvent: e };
      }
    }
    if (!context) return;
    setState({ visible: true, x: e.clientX, y: e.clientY, context });
  }, []);
  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (state.visible) closeMenu(); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [state.visible, closeMenu]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('contextmenu', handleContextMenu as any);
    return () => container.removeEventListener('contextmenu', handleContextMenu as any);
  }, [containerRef, handleContextMenu]);
  return { menuState: state, closeMenu, setContext: setState };
}
