// DataTable/hooks/useColumnStatePersistence.ts

import { useCallback, useRef } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// ─── useColumnStatePersistence — حفظ حالة الأعمدة الكاملة ──────────────────
//
// يحفظ تحت مفتاح واحد في localStorage لكل typeCode:
//   • columnOrder      — ترتيب الأعمدة (drag & drop)
//   • columnWidths     — عرض كل عمود (resize)
//   • hiddenColumns    — الأعمدة المخفية
//   • pinnedColumns    — الأعمدة المثبتة (start/end)
//   • activeFilters    — الفلاتر النشطة
//
// واجهة بسيطة: save(patch) / load() / reset()
// لا يُلوّث useColumnVisibility/useColumnResize بمنطق localStorage خارجي
// ════════════════════════════════════════════════════════════════════════════

export interface ColumnStateSnapshot {
  columnOrder?:   string[];
  columnWidths?:  Record<string, number>;
  hiddenColumns?: string[];
  pinnedColumns?: { start?: string[]; end?: string[] };
  activeFilters?: Record<string, string>;
  savedAt:        number;
}

export function useColumnStatePersistence(storageKey: string | null | undefined) {
  // القراءة: تُنفَّذ مرة واحدة عند التهيئة (lazy initializer)
  const load = useCallback((): ColumnStateSnapshot | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ColumnStateSnapshot;
      // تحقق بسيط من صحة البنية
      if (typeof parsed !== 'object' || !parsed.savedAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [storageKey]);

  // الحفظ: patch جزئي — يدمج مع الحالة المحفوظة بدلاً من الكتابة الكاملة
  const save = useCallback((patch: Partial<Omit<ColumnStateSnapshot, 'savedAt'>>) => {
    if (!storageKey) return;
    try {
      const current = (() => {
        try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as ColumnStateSnapshot; }
        catch { return {} as ColumnStateSnapshot; }
      })();
      const updated: ColumnStateSnapshot = { ...current, ...patch, savedAt: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // localStorage ممتلئ أو وضع private — نتجاهل بصمت
    }
  }, [storageKey]);

  // حذف: إعادة ضبط كاملة
  const reset = useCallback(() => {
    if (!storageKey) return;
    try { localStorage.removeItem(storageKey); } catch { /* تجاهل */ }
  }, [storageKey]);

  // استخراج القيمة الابتدائية مرة واحدة فقط عند الـ mount
  // useRef أفضل من useMemo هنا لأن useMemo لا يضمن الاستقرار
  const initialSnapshotRef = useRef<ColumnStateSnapshot | null | undefined>(undefined);
  if (initialSnapshotRef.current === undefined) {
    initialSnapshotRef.current = load();
  }
  const initialSnapshot = initialSnapshotRef.current;

  return { load, save, reset, initialSnapshot };
}
