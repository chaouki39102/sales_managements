// DataTable/internal/useColumnVisibilityState.ts — column visibility (controlled/uncontrolled) + columns/export menu open state
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ResolvedProps } from './resolveProps';

type Params<T> =
  Pick<ResolvedProps<T>, 'columns' | 'columnDefs' | 'hiddenColumnKeys' | 'onHiddenColumnsChange'>;

export function useColumnVisibilityState<T>(p: Params<T>) {
  const { columns, columnDefs, hiddenColumnKeys, onHiddenColumnsChange } = p;

  // ── Column visibility ─────────────────────────────────────────────────────
  // ── Column visibility — نمط controlled/uncontrolled ─────────────────────
  //
  // القيمة الأولية: hiddenColumnKeys (من الأب) → أو defaultHidden من columnDefs/columns
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(() => {
    if (hiddenColumnKeys) return new Set(hiddenColumnKeys);
    const src = columnDefs ?? columns;
    return new Set(src.filter(c => c.defaultHidden).map(c => c.key));
  });

  // Sync from parent prop when it changes (controlled mode)
  useEffect(() => {
    if (hiddenColumnKeys) {
      setHiddenKeys(new Set(hiddenColumnKeys));
    }
  }, [hiddenColumnKeys]);

  // updateHidden: دالة مركزية تُعدِّل hiddenKeys وتُعلم الأب دائماً
  // تستخدمها: toggleColVisibility + toggleCollapseAll + handleApplyView
  const onHiddenColumnsChangeRef = useRef(onHiddenColumnsChange);
  useEffect(() => { onHiddenColumnsChangeRef.current = onHiddenColumnsChange; }, [onHiddenColumnsChange]);

  const updateHidden = useCallback((next: ReadonlySet<string>) => {
    setHiddenKeys(next);
    // batch update: نُرسل key='' كإشارة أن التغيير شامل (ليس toggle فردي)
    onHiddenColumnsChangeRef.current?.('', false, [...next]);
  }, []);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  // 🆕 v10.4 — نطاق التصدير: الكل أو المحدد فقط
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');

  useEffect(() => {
    if (!colMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
        setColMenuOpen(false);
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [colMenuOpen]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
        setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [exportMenuOpen]);

  const toggleColVisibility = useCallback((key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      const willBeHidden = !next.has(key);
      if (willBeHidden) next.add(key); else next.delete(key);
      // إعلام الأب: toggle فردي
      onHiddenColumnsChangeRef.current?.(key, willBeHidden, [...next]);
      return next;
    });
  }, []);

  // إذا مُرِّر columnDefs → قائمة إدارة الأعمدة تعرض كل الأعمدة بما فيها المخفية
  // (columns = الأعمدة المُصفَّاة للعرض، columnDefs = كل الأعمدة)
  const nonIndexCols = useMemo(
    () => columnDefs ?? columns,
    [columnDefs, columns],
  );
  const allHidden = nonIndexCols.length > 0 && nonIndexCols.every(c => hiddenKeys.has(c.key));

  const toggleCollapseAll = useCallback(() => {
    const next = allHidden
      ? new Set<string>()
      : new Set(nonIndexCols.filter((_c, i) => i > 0).map(c => c.key));
    updateHidden(next);
    setColMenuOpen(false);
  }, [allHidden, nonIndexCols, updateHidden]);

  return {
    hiddenKeys, updateHidden, colMenuOpen, setColMenuOpen, colMenuRef, exportMenuOpen,
    setExportMenuOpen, exportMenuRef, exportScope, setExportScope, toggleColVisibility, nonIndexCols,
    allHidden, toggleCollapseAll,
  };
}

export type ColumnVisibilityState<T> = ReturnType<typeof useColumnVisibilityState<T>>;
