// DataTable/hooks/useRangeSelection.ts

import { useState, useEffect, useCallback } from 'react';

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
