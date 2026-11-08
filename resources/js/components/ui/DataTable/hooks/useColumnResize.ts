// DataTable/hooks/useColumnResize.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { MIN_COL_WIDTH } from '../types';

export function useColumnResize(initialWidths: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null);
  const startResize = useCallback((key: string, currentW: number, e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { key, startX: e.clientX, startW: currentW };
  }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const { key, startX, startW } = drag.current;
      // RTL: handle في يسار العمود — السحب يساراً (clientX أقل) = تكبير
      // LTR: handle في يمين العمود — السحب يميناً (clientX أكبر) = تكبير
      const isRTL =
        document.documentElement.dir === 'rtl' ||
        document.body.dir === 'rtl';
      const delta = isRTL
        ? startX - e.clientX   // RTL: يسار = أكبر
        : e.clientX - startX;  // LTR: يمين = أكبر
      setWidths(p => ({ ...p, [key]: Math.max(MIN_COL_WIDTH, startW + delta) }));
    };
    const onUp = () => { drag.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);
  const resetWidth = useCallback((key: string) => {
    setWidths(p => { const n = { ...p }; delete n[key]; return n; });
  }, []);

  // 🆕 v10.4 — قياس عمود واحد بأوسع محتوى (رأس + عيّنة حتى 100 صف)
  const measureColumn = useCallback((table: HTMLTableElement, key: string): number | null => {
    const headerCell = table.querySelector(`thead [data-col-key="${key}"]`) as HTMLElement | null;
    if (!headerCell) return null;

    const measure = document.createElement('div');
    measure.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;white-space:nowrap;font:inherit;direction:inherit;';
    document.body.appendChild(measure);

    // Measure header
    measure.textContent = headerCell.textContent ?? '';
    let maxWidth = measure.getBoundingClientRect().width;

    // Measure visible cells in this column (sample up to 100 rows)
    const cells = table.querySelectorAll(`tbody td[data-col-key="${key}"]`);
    const sample = Array.from(cells).slice(0, 100);
    for (const cell of sample) {
      measure.textContent = (cell as HTMLElement).textContent ?? '';
      const w = measure.getBoundingClientRect().width;
      if (w > maxWidth) maxWidth = w;
    }

    document.body.removeChild(measure);

    // Add padding (16px) + sort/filter icon space (24px)
    return Math.max(MIN_COL_WIDTH, Math.ceil(maxWidth) + 44);
  }, []);

  const autoSize = useCallback((tableEl: HTMLDivElement | null, key: string) => {
    if (!tableEl) return;
    const table = tableEl.querySelector('table');
    if (!table) return;
    const w = measureColumn(table, key);
    if (w == null) return;
    setWidths(p => ({ ...p, [key]: w }));
  }, [measureColumn]);

  // 🆕 v10.4 — توسيط كل الأعمدة دفعة واحدة حسب محتواها
  const autoFitAll = useCallback((tableEl: HTMLDivElement | null, keys: string[]) => {
    if (!tableEl || !keys.length) return;
    const table = tableEl.querySelector('table');
    if (!table) return;
    const next: Record<string, number> = {};
    for (const key of keys) {
      const w = measureColumn(table, key);
      if (w != null) next[key] = w;
    }
    setWidths(p => ({ ...p, ...next }));
  }, [measureColumn]);

  return { widths, startResize, resetWidth, autoSize, autoFitAll };
}
