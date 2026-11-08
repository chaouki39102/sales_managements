// DataTable/internal/useColumnArrangement.ts — column resize, drag reorder and pinning
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useMemo, useCallback, useRef } from 'react';
import type { Column } from '../types';
import { useColumnResize, useColumnDragReorder, useColumnPinning } from '../hooks';
import type { ResolvedProps } from './resolveProps';

type Params<T> =
  Pick<ResolvedProps<T>, 'columns' | 'columnDefs' | 'initialColumnOrder' | 'onColumnOrderChange' | 'columnReorder' | 'pinnedColumns' | 'onPinnedColumnsChange'>;

export function useColumnArrangement<T>(p: Params<T>) {
  const {
    columns, columnDefs, initialColumnOrder, onColumnOrderChange, columnReorder, pinnedColumns,
    onPinnedColumnsChange,
  } = p;

  // ── Column resize ─────────────────────────────────────────────────────────
  const initialWidthsRef = useRef<Record<string, number>>(
    Object.fromEntries((columnDefs ?? columns).filter(c => c.width).map(c => [c.key, c.width!])),
  );
  const { widths: colWidths, startResize, autoSize, autoFitAll } = useColumnResize(initialWidthsRef.current);

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

  return {
    colWidths, startResize, autoSize, autoFitAll, setColumnOrder, dragOverKey,
    dragHandlers, orderedColumns, pinConfig, pinColumn, isPinned, clearAllPins,
    setPinConfigBatch, pinMenuKey, setPinMenuKey, getEffectiveSticky,
  };
}

export type ColumnArrangementState<T> = ReturnType<typeof useColumnArrangement<T>>;
