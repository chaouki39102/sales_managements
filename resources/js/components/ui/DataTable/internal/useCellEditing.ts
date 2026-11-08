// DataTable/internal/useCellEditing.ts — inline editing, batch edit and cell validation
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useCallback, useRef, useEffect } from 'react';
import type { EditingCell } from '../types';
import { getRawValue } from '../utils';
import { useBatchEdit, useCellValidation } from '../hooks';
import type { ResolvedProps } from './resolveProps';
import type { VisibleColumnsAndAggregatesState } from './useVisibleColumnsAndAggregates';

type Params<T> =
  Pick<ResolvedProps<T>, 'data' | 'rowKey' | 'onCellEdit' | 'batchEdit' | 'onBatchSave'>
  & Pick<VisibleColumnsAndAggregatesState<T>, 'allColDefs'>;

export function useCellEditing<T>(p: Params<T>) {
  const { data, rowKey, onCellEdit, batchEdit, onBatchSave, allColDefs } = p;

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

  return {
    editingCell, setEditingCell, onCellEditRef, batch, getError, startEdit,
    commitEdit, cancelEdit,
  };
}

export type CellEditingState<T> = ReturnType<typeof useCellEditing<T>>;
