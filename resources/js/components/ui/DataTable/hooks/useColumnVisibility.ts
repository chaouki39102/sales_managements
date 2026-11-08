// DataTable/hooks/useColumnVisibility.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Column } from '../types';

// ════════════════════════════════════════════════════════════════════════════
// useColumnVisibility — standalone hook لإدارة رؤية الأعمدة
//
// ⚠️  استخدمه فقط خارج DataTable (في مكونات مخصصة)
//     داخل DataTable استخدم: columnDefs + hiddenColumnKeys + onHiddenColumnsChange
//     التي تُدار بـ updateHidden المركزية وتُعلم الأب دائماً
//
// الاستخدام المستقل:
//   const { visibleColumns, hiddenColumns, toggleColumn } =
//     useColumnVisibility(allColumns, initialHidden);
// ════════════════════════════════════════════════════════════════════════════

export function useColumnVisibility<T = Record<string, unknown>>(
  columns: Column<T>[],
  /** مفاتيح الأعمدة المخفية افتراضياً (تُدمج مع defaultHidden على العمود) */
  initialHidden: string[] = [],
  /** مفتاح localStorage للحفظ — إذا تُرك فارغاً لا يُحفظ */
  storageKey?: string,
): {
  visibleColumns: Column<T>[];
  hiddenColumns: Set<string>;
  toggleColumn: (key: string) => void;
  showColumn: (key: string) => void;
  hideColumn: (key: string) => void;
  resetVisibility: () => void;
} {
  // بناء القيمة الابتدائية من defaultHidden + initialHidden + localStorage
  const getInitial = useCallback((): Set<string> => {
    const fromProps = new Set<string>([
      ...initialHidden,
      ...columns.filter(c => c.defaultHidden).map(c => c.key),
    ]);

    if (!storageKey) return fromProps;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {
      // localStorage غير متاح أو البيانات تالفة — نتجاهل
    }

    return fromProps;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // نحسبها مرة واحدة عند التهيئة

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(getInitial);

  // حفظ في localStorage عند كل تغيير
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...hiddenColumns]));
    } catch {
      // تجاهل خطأ الكتابة (وضع private / حجم ممتلئ)
    }
  }, [hiddenColumns, storageKey]);

  const toggleColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const showColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const hideColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      if (prev.has(key)) return prev;
      return new Set([...prev, key]);
    });
  }, []);

  const resetVisibility = useCallback(() => {
    const defaults = new Set<string>([
      ...initialHidden,
      ...columns.filter(c => c.defaultHidden).map(c => c.key),
    ]);
    setHiddenColumns(defaults);
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* تجاهل */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenColumns.has(c.key)),
    [columns, hiddenColumns],
  );

  return { visibleColumns, hiddenColumns, toggleColumn, showColumn, hideColumn, resetVisibility };
}
