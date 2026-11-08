// DataTable/hooks/useQuickFilter.ts

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Column } from '../types';
import { getRawValue } from '../utils';

// ════════════════════════════════════════════════════════════════════════════
// ─── useQuickFilter — بحث سريع Ctrl+F داخل الجدول ─────────────────────────
//
// يُنشئ شريط بحث صغير فوق الجدول. يُفلتر البيانات المُعالجة client-side
// عبر جميع الأعمدة المرئية. يعمل بشكل مستقل عن البحث العالمي (globalQuery).
// ════════════════════════════════════════════════════════════════════════════

export function useQuickFilter<T>(
  enabled: boolean,
  data: T[],
  columns: Column<T>[],
): [
  query: string,
  setQuery: (q: string) => void,
  isOpen: boolean,
  open: () => void,
  close: () => void,
  matchCount: number | null,
] {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+F / Cmd+F to open
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, isOpen]);

  const matchCount = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    const cols = columns.filter(c => c.searchable !== false);
    return data.filter(row =>
      cols.some(col => {
        const v = getRawValue(row, col as Column<T>);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    ).length;
  }, [query, data, columns]);

  const open  = useCallback(() => { setIsOpen(true);  setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const close = useCallback(() => { setIsOpen(false); setQuery(''); }, []);

  return [query, setQuery, isOpen, open, close, matchCount];
}
