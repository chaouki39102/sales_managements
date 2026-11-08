// DataTable/hooks/useKeyboardNav.ts

import { useState, useCallback } from 'react';
import type { ActiveCell } from '../types';

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
