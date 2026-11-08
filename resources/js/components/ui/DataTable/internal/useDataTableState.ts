// DataTable/internal/useDataTableState.ts — all DataTable state & handlers
//
// Calls every state hook in the exact order the original monolithic component
// did, and returns one flat object (`DataTableState`) consumed by the parts.

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Column, DataTableProps } from '../types';
import { getRawValue } from '../utils';
import { useIsMobile, useURLState, useTreeData, useColumnGroups } from '../hooks';
import { resolveProps } from './resolveProps';
import { useColumnVisibilityState } from './useColumnVisibilityState';
import { useColumnArrangement } from './useColumnArrangement';
import { useSearchFilterSort } from './useSearchFilterSort';
import { useRowPipeline } from './useRowPipeline';
import { usePagination } from './usePagination';
import { useVisibleColumnsAndAggregates } from './useVisibleColumnsAndAggregates';
import { useSelectionAndExpand } from './useSelectionAndExpand';
import { useCellEditing } from './useCellEditing';
import { useNavigationAndClipboard } from './useNavigationAndClipboard';
import { useShortcutsOverlay } from './useShortcutsOverlay';
import { useSmartFilterDialog } from './useSmartFilterDialog';
import { useSavedViewsState } from './useSavedViewsState';
import { useMenuPositions } from './useMenuPositions';
import { useTableContextMenu } from './useTableContextMenu';
import { useDragScroll } from './useDragScroll';
import { useExportHandler } from './useExportHandler';
import { useRenderDataRow } from './useRenderDataRow';
import { useRenderHelpers } from './useRenderHelpers';

export type URLState = ReturnType<typeof useURLState>;

export function useDataTableState<T>(props: DataTableProps<T>) {
  const p = resolveProps(props);
  const { data, urlState, enableQuickFilter, treeConfig, columnGroups, rowKey } = p;

  // ── Responsive ────────────────────────────────────────────────────────────
  const isMobile = useIsMobile(639);

  // ── URL State ─────────────────────────────────────────────────────────────
  const url = useURLState(urlState);

  const vis = useColumnVisibilityState(p);
  const arr = useColumnArrangement(p);
  const sfs = useSearchFilterSort({ ...p, url });
  const rows = useRowPipeline({ ...p, ...vis, ...arr, ...sfs });

  const { orderedColumns } = arr;
  const { isServerPaged, localPage, localPerPage, sorts } = sfs;
  const { processedData, displayData, isVirtual } = rows;

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
  // ✅ إصلاح: الحساب الأساسي للبحث السريع (الفلترة على processedData) يُنفَّذ
  // مرة واحدة فقط هنا — qfMatchCount / effectiveDisplayData / quickFilterTotal
  // كلها تُشتق منه بدلاً من تكرار منطق الفلترة 3 مرات.
  const qfCols = useMemo(() => orderedColumns.filter(c => c.searchable !== false), [orderedColumns]);
  const qfData = useMemo(() => {
    if (!enableQuickFilter || !quickFilterQuery.trim()) return null;
    const q = quickFilterQuery.trim().toLowerCase();
    return processedData.filter(row =>
      qfCols.some(col => {
        const v = getRawValue(row, col as Column<T>);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }, [enableQuickFilter, quickFilterQuery, processedData, qfCols]);

  const qfMatchCount = qfData ? qfData.length : null;
  const quickFilterTotal = qfData ? qfData.length : 0;
  const qfCloseFn = useCallback(() => { setQfIsOpen(false); setQuickFilterQuery(''); }, []);
  const isQuickFiltered = enableQuickFilter && !!quickFilterQuery.trim();

  // Quick-filtered display data — computed from qfData (not displayData)
  // to avoid circular dependency with selection/displayKeys
  const effectiveDisplayData = useMemo(() => {
    if (!isQuickFiltered || !qfData) return displayData;
    if (isVirtual) return qfData;
    if (isServerPaged) return qfData;
    const s = (localPage - 1) * localPerPage;
    return qfData.slice(s, s + localPerPage);
  }, [isQuickFiltered, qfData, isVirtual, isServerPaged, localPage, localPerPage, displayData]);

  const pg = usePagination({ ...p, url, isQuickFiltered, quickFilterTotal, ...sfs, ...rows });
  const cols = useVisibleColumnsAndAggregates({ ...p, isMobile, ...vis, ...arr, ...rows });
  const sel = useSelectionAndExpand({ ...p, effectiveDisplayData });
  const edit = useCellEditing({ ...p, ...cols });
  const nav = useNavigationAndClipboard({ ...p, effectiveDisplayData, ...rows, ...cols, ...edit });
  const shortcuts = useShortcutsOverlay();

  const { visibleCols } = cols;
  const { selectedKeys } = sel;
  const { hiddenKeys } = vis;

  // ── Tree Data (v10.2) ─────────────────────────────────────────────────────
  const {
    treeRows,
    toggleTreeNode,
    expandAll: expandAllTree,
    collapseAll: collapseAllTree,
    isTreeMode,
  } = useTreeData(data, treeConfig);

  // ── Column Groups (v10.2) ─────────────────────────────────────────────────
  const visibleColKeysForGroups = useMemo(() => visibleCols.map(c => c.key), [visibleCols]);
  const { resolvedGroups, toggleGroupCollapse, isGrouped } = useColumnGroups(
    columnGroups,
    visibleColKeysForGroups,
  );

  const smart = useSmartFilterDialog({ ...p, url, ...cols, ...sfs });
  const views = useSavedViewsState({ ...p, url, ...sfs, ...pg, ...vis, ...arr });
  const menuPos = useMenuPositions({ ...vis, ...views, ...nav });
  const ctxMenu = useTableContextMenu({ ...p, ...vis, ...arr, ...sfs, ...cols, ...sel, ...edit, ...nav });

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedRows = useMemo(
    () => data.filter((r, i) => selectedKeys.has(rowKey(r, i))),
    [data, rowKey, selectedKeys],
  );
  const hiddenCount = hiddenKeys.size;

  const drag = useDragScroll(nav);
  const { handleExport } = useExportHandler({ ...p, ...sfs, ...rows, ...cols, ...vis, ...sel });

  // helper: رتبة العمود في الفرز المتعدد
  const sortMap = useMemo(() => {
    const map = new Map<string, { index: number; dir: 'asc' | 'desc' | null }>();
    sorts.forEach((s, i) => map.set(s.key, { index: i, dir: s.dir }));
    return map;
  }, [sorts]);
  const getSortIndex = useCallback((key: string) => sortMap.get(key)?.index ?? -1, [sortMap]);
  const getSortDir = useCallback((key: string) => sortMap.get(key)?.dir ?? null, [sortMap]);

  const { renderDataRow } = useRenderDataRow({ ...p, ...sel, ...rows, ...pg, ...cols, ...edit, ...nav, ...arr });
  const helpers = useRenderHelpers({ ...p, ...rows, ...nav, ...cols, ...arr });

  return {
    ...p, isMobile, url,
    ...vis, ...arr, ...sfs, ...rows,
    qfIsOpen, quickFilterQuery, setQuickFilterQuery, qfInputRef, qfMatchCount, qfCloseFn, effectiveDisplayData,
    ...pg, ...cols, ...sel, ...edit, ...nav, ...shortcuts,
    treeRows, toggleTreeNode, expandAllTree, collapseAllTree, isTreeMode,
    resolvedGroups, toggleGroupCollapse, isGrouped,
    ...smart, ...views, ...menuPos, ...ctxMenu,
    selectedRows, hiddenCount,
    ...drag, handleExport, getSortIndex, getSortDir, renderDataRow, ...helpers,
  };
}

export type DataTableState<T> = ReturnType<typeof useDataTableState<T>>;
