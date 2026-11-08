// DataTable/internal/useNavigationAndClipboard.ts — range selection, keyboard navigation and Excel paste
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useMemo, useCallback, useRef } from 'react';
import type { Column } from '../types';
import { getRawValue } from '../utils';
import { useKeyboardNav, useClipboardPaste, useRangeSelection } from '../hooks';
import type { ResolvedProps } from './resolveProps';
import type { RowPipelineState } from './useRowPipeline';
import type { VisibleColumnsAndAggregatesState } from './useVisibleColumnsAndAggregates';
import type { CellEditingState } from './useCellEditing';

type Params<T> =
  Pick<ResolvedProps<T>, 'data' | 'rowKey' | 'enableRangeSelection' | 'keyboardNav' | 'batchEdit' | 'onCellEdit'>
  & { effectiveDisplayData: T[] }
  & Pick<RowPipelineState<T>, 'displayData' | 'isVirtual' | 'visibleRange'>
  & Pick<VisibleColumnsAndAggregatesState<T>, 'visibleCols' | 'allColDefs'>
  & Pick<CellEditingState<T>, 'setEditingCell' | 'onCellEditRef' | 'batch'>;

export function useNavigationAndClipboard<T>(p: Params<T>) {
  const {
    data, rowKey, enableRangeSelection, keyboardNav, batchEdit,
    effectiveDisplayData, displayData, isVirtual, visibleRange, visibleCols, allColDefs,
    setEditingCell, onCellEditRef, batch,
  } = p;

  // ── Range Selection (v10.2) ───────────────────────────────────────────────
  const { selectCell, isInRange } = useRangeSelection(
    enableRangeSelection,
    displayData.length,
    visibleCols.length,
  );

  // effectiveVirtualDisplayData depends on visibleRange from useRangeSelection
  const effectiveVirtualDisplayData = useMemo(() => {
    if (!isVirtual) return effectiveDisplayData;
    return effectiveDisplayData.slice(visibleRange.start, visibleRange.end + 1);
  }, [isVirtual, effectiveDisplayData, visibleRange]);

  // ── Keyboard Navigation (v10) ─────────────────────────────────────────────
  const {
    activeCell,
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
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef   = useRef<HTMLDivElement>(null);
  // نمرر onCellEditRef.current عبر wrapper مستقر لتجنب stale closure
  const stableOnCellEdit = useCallback(
    (...args: Parameters<NonNullable<typeof p.onCellEdit>>) => onCellEditRef.current?.(...args),
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

  return {
    selectCell, isInRange, effectiveVirtualDisplayData, activeCell, kbHandleKeyDown, activateCell,
    tableWrapRef, toolbarRef,
  };
}

export type NavigationAndClipboardState<T> = ReturnType<typeof useNavigationAndClipboard<T>>;
