// DataTable/hooks/useSmartFilter.ts

import { useCallback, useMemo } from 'react';
import type { MultiSortState, Column, SmartFilterResult } from '../types';

// ─── useSmartFilter (تحليل اللغة العربية) ───────────────────────────────────

// نوع النمط القابل للتمرير من الخارج
export interface SmartFilterPattern {
  regex: RegExp;
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'contains' | 'between' | 'sort';
  valueType: 'string' | 'number';
}

// الأنماط الافتراضية — فارغة عمداً
// المكتبة لا تعرف شيئاً عن بنية بيانات المشروع
// كل مشروع يُمرر customPatterns الخاصة به:
//   useSmartFilter(columns, onFilter, MY_PATTERNS)
// مثال: datatable-patterns.ts في مشروع ERP الجزائري
export const DEFAULT_SMART_FILTER_PATTERNS: SmartFilterPattern[] = [];

export function useSmartFilter<T>(
  _columns: Column<T>[],
  onFilterChange: (filters: Record<string, string>, sorts?: MultiSortState) => void,
  /** أنماط مخصصة — إذا مُررت تحل محل الافتراضية بالكامل */
  customPatterns?: SmartFilterPattern[]
) {
  const patterns = useMemo(
    () => customPatterns ?? DEFAULT_SMART_FILTER_PATTERNS,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customPatterns],
  );
  const parseNaturalQuery = useCallback((query: string): SmartFilterResult | null => {
    const q = query.trim();
    const result: Record<string, string> = {};
    let sort: MultiSortState | undefined;

    for (const p of patterns) {
      const match = q.match(p.regex);
      if (match) {
        if (p.operator === 'sort') {
          const dir = match[2] === 'تصاعدي' ? 'asc' : 'desc';
          sort = [{ key: match[1], dir }];
        } else if (p.operator === 'between') {
          result[p.field] = `${match[1]}|${match[2]}`;
        } else {
          let val = match[1];
          if (p.valueType === 'number') val = parseFloat(val).toString();
          result[p.field] = `${p.operator}:${val}`;
        }
      }
    }
    if (Object.keys(result).length === 0 && !sort) return null;
    return { success: true, filters: result, sort };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns]);
  const applySmartFilter = useCallback((query: string): SmartFilterResult | null => {
    const parsed = parseNaturalQuery(query);
    if (parsed && parsed.success) {
      onFilterChange(parsed.filters, parsed.sort);
      return parsed;
    }
    // لا تطابق → نُجرّب fallback: global search
    return null;
  }, [parseNaturalQuery, onFilterChange]);
  return { applySmartFilter, parseNaturalQuery };
}
