// DataTable/hooks/useRowModel.ts

import { useMemo } from 'react';
import { applyClientFilter, applyGlobalSearch, applyClientSort, applyMultiSort } from '../utils';

//
// يُشغّل الفلتر والفرز والبحث بـ useRef للنتائج دون إعادة render
// حتى اكتمال المعالجة — يُمهّد لنقل المعالجة لـ Web Worker لاحقاً
// ════════════════════════════════════════════════════════════════════════════

export function useRowModel<T>(
  data: T[],
  filters: import('../types').FilterMap,
  globalQuery: string,
  sorts: import('../types').MultiSortState,
  legacySortState: import('../types').SortState,
  /** كل الأعمدة (بما فيها المخفية) — للفلترة والفرز */
  columns: import('../types').Column<T>[],
  /** الأعمدة المرئية فقط — للبحث العام (لا نبحث في المخفية) */
  searchCols: import('../types').Column<T>[],
  options: {
    clientFiltered: boolean;
    clientSorted: boolean;
    searchable: boolean;
    multiSort: boolean;
  }
): T[] {
  const result = useMemo(() => {
    let r = data;
    // الفلترة: تشمل كل الأعمدة (المخفية يمكن فلترتها من الـ API)
    if (options.clientFiltered) r = applyClientFilter(r, filters, columns);
    // البحث العام: فقط الأعمدة المرئية — لا نُرجع نتائج من أعمدة المستخدم لا يراها
    if (options.searchable && globalQuery) r = applyGlobalSearch(r, globalQuery, searchCols);
    if (options.clientSorted) {
      if (options.multiSort && sorts.length > 0) r = applyMultiSort(r, sorts, columns);
      else if (legacySortState.key) r = applyClientSort(r, legacySortState, columns);
    }
    return r;
  }, [
    data, filters, globalQuery, sorts, legacySortState,
    columns, searchCols,
    options.clientFiltered, options.clientSorted,
    options.searchable, options.multiSort,
  ]);

  return result;
}
