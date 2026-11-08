// DataTable/internal/useSelectionAndExpand.ts — row selection, hover and expand state
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ResolvedProps } from './resolveProps';

type Params<T> =
  Pick<ResolvedProps<T>, 'data' | 'rowKey' | 'onSelect'>
  & { effectiveDisplayData: T[] };

export function useSelectionAndExpand<T>(p: Params<T>) {
  const { data, rowKey, onSelect, effectiveDisplayData } = p;

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
      if (allChecked) {
        displayKeys.forEach(k => next.delete(k));
      } else {
        displayKeys.forEach(k => next.add(k));
      }
      return next;
    });
  }, [allChecked, displayKeys]);

  const toggleRow = useCallback((key: string | number, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
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
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  return {
    selectedKeys, hoveredRowKey, setHoveredRowKey, indRef, allChecked, toggleAll,
    toggleRow, clearSelection, expandedKeys, toggleExpanded,
  };
}

export type SelectionAndExpandState<T> = ReturnType<typeof useSelectionAndExpand<T>>;
