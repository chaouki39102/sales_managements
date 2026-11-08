// DataTable/hooks/useMultiSort.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MultiSortState } from '../types';

export function useMultiSort(
  initial: MultiSortState = [],
  onChange?: (sorts: MultiSortState) => void,
  onLegacySortChange?: (key: string, dir: 'asc' | 'desc' | null) => void,
) {
  const [sorts, setSorts] = useState<MultiSortState>(initial);
  const onChangeRef = useRef(onChange);
  const onLegacyRef = useRef(onLegacySortChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onLegacyRef.current = onLegacySortChange; }, [onLegacySortChange]);
  const toggleSort = useCallback((key: string, shiftKey: boolean) => {
    setSorts(prev => {
      let next: MultiSortState;
      if (!shiftKey) {
        const existing = prev.find(s => s.key === key);
        if (!existing) next = [{ key, dir: 'asc' }];
        else if (existing.dir === 'asc') next = [{ key, dir: 'desc' }];
        else next = [];
      } else {
        const idx = prev.findIndex(s => s.key === key);
        if (idx === -1) next = [...prev, { key, dir: 'asc' }];
        else if (prev[idx].dir === 'asc') next = prev.map((s, i) => i === idx ? { ...s, dir: 'desc' } : s);
        else next = prev.filter((_, i) => i !== idx);
      }
      Promise.resolve().then(() => {
        onChangeRef.current?.(next);
        if (onLegacyRef.current) {
          const first = next[0];
          onLegacyRef.current(first?.key ?? key, first?.dir ?? null);
        }
      });
      return next;
    });
  }, []);
  const clearSort = useCallback(() => { setSorts([]); onChangeRef.current?.([]); }, []);
  const legacySortState = sorts[0] ? { key: sorts[0].key, dir: sorts[0].dir } : { key: null, dir: null };
  return { sorts, setSorts, toggleSort, clearSort, legacySortState };
}
