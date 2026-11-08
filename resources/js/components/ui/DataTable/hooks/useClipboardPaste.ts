// DataTable/hooks/useClipboardPaste.ts

import { useEffect, useCallback, useRef } from 'react';
import type { Column, PendingEdit, CellEditPayload, PasteOptions } from '../types';
import { getRawValue, parseTSV } from '../utils';

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
