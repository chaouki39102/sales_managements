// DataTable/internal/useSearchFilterSort.ts — global search, column filters, filter popup and multi-sort
// Extracted verbatim from the DataTable component body (no behaviour change).

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { FilterMap } from '../types';
import { SEARCH_DEBOUNCE, FILTER_DEBOUNCE } from '../types';
import { useMultiSort } from '../hooks';
import type { ResolvedProps } from './resolveProps';
import type { URLState } from './useDataTableState';

type Params<T> =
  Pick<ResolvedProps<T>, 'pagination' | 'onSearchChange' | 'onFilterChange' | 'onMultiSortChange' | 'onSortChange' | 'multiSort'>
  & { url: URLState };

export function useSearchFilterSort<T>(p: Params<T>) {
  const {
    pagination, onSearchChange, onFilterChange, onMultiSortChange, onSortChange, multiSort,
    url,
  } = p;

  // ── Global search ─────────────────────────────────────────────────────────
  const [globalQuery, setGlobalQuery] = useState(() => url.readInitialSearch());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  const handleSearchChange = useCallback(
    (v: string) => {
      setGlobalQuery(v);
      if (!pagination) setLocalPage(1);
      url.writeSearch(v);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        onSearchChangeRef.current?.(v);
      }, SEARCH_DEBOUNCE);
    },
    [pagination, url],
  );

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
  }, []);

  // ── Pagination state — مُعرَّف هنا لأن handleFilterChange تحتاجه ──────────
  const [localPage, setLocalPage] = useState(() => url.readInitialPage());
  const [localPerPage, setLocalPerPage] = useState(15);

  // ── Column filters ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterMap>(() => url.readInitialFilters());
  const onFilterChangeRef = useRef(onFilterChange);
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  const isServerPaged = !!pagination;

  // ✅ إصلاح v10.5: فلاتر/بحث محفوظان في الرابط (URL State) — عند إعادة فتح الصفحة
  //    كانت القيم تُسترجَع إلى الواجهة (أيقونات الفلترة مضاءة) لكن لا تُرسَل إلى
  //    onFilterChange/onSearchChange إطلاقاً (المستدعي الوحيد كان handleFilterChange
  //    الذي لا يُنفَّذ عند التركيب) → الجدول server-paged يفتح بدون أي فلترة.
  //    الآن ندفع الحالة الأولية إلى المستدعي مرة واحدة عند التركيب — العميل
  //    (بلا pagination) لا يحتاج ذلك لأنه يُفلتر محلياً عبر useRowModel.
  const mountRestoreDoneRef = useRef(false);
  useEffect(() => {
    if (mountRestoreDoneRef.current) return;
    mountRestoreDoneRef.current = true;
    if (!isServerPaged || !url.enabled) return;

    const initialFilters = url.readInitialFilters();
    const initialSearch   = url.readInitialSearch();

    const hasRestoredState =
      Object.values(initialFilters).some(v => v && v !== '|') || !!initialSearch;
    if (!hasRestoredState) return;

    onFilterChangeRef.current?.(initialFilters);
    if (initialSearch) onSearchChangeRef.current?.(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = useCallback(
    (key: string, val: string) => {
      setFilters(prev => {
        const next = { ...prev };
        if (val) next[key] = val; else delete next[key];
        url.writeFilters(next);
        if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
        filterTimerRef.current = setTimeout(() => {
          onFilterChangeRef.current?.(next);
        }, FILTER_DEBOUNCE);
        return next;
      });
      // setLocalPage مُعرَّف لاحقاً لكن useState يعمل بـ hoisting — آمن
      if (!isServerPaged) setLocalPage(1);
    },
    [isServerPaged, url],
  );

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setGlobalQuery('');
    if (!isServerPaged) setLocalPage(1);
    url.clear();
    onFilterChangeRef.current?.({});
    onSearchChangeRef.current?.('');
  }, [isServerPaged, url]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(v => v && v !== '|').length + (globalQuery ? 1 : 0),
    [filters, globalQuery],
  );

  // ── Filter popup ──────────────────────────────────────────────────────────
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const filterBtnRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

  // ✅ إصلاح: useCallback لمنع إنشاء ref جديد في كل render
  // الاستدعاء المزدوج (ref + anchorRef) لا يُنشئ كائنَين مختلفَين
  const getFilterBtnRef = useCallback((key: string): React.RefObject<HTMLButtonElement> => {
    if (!filterBtnRefs.current[key]) {
      filterBtnRefs.current[key] = React.createRef<HTMLButtonElement>();
    }
    return filterBtnRefs.current[key];
  }, []);

  // ── Multi-sort (v9) ───────────────────────────────────────────────────────
  const {
    sorts,
    setSorts,
    toggleSort: toggleMultiSort,
    clearSort,
    legacySortState,
  } = useMultiSort(
    url.readInitialSort(),
    onMultiSortChange,
    onSortChange,
  );

  const handleSortToggle = useCallback(
    (key: string, e: React.MouseEvent) => {
      const shiftKey = multiSort && e.shiftKey;
      // toggleMultiSort يحدّث sorts ويستدعي onMultiSortChange داخلياً
      // نستمع على التغيير عبر useEffect لكتابة URL بعد التحديث
      toggleMultiSort(key, shiftKey);
      if (!isServerPaged) setLocalPage(1);
    },
    [multiSort, toggleMultiSort, isServerPaged],
  );

  // كتابة URL بعد تحديث sorts (ليس أثناء render)
  useEffect(() => {
    if (!url.enabled) return;
    url.writeSort(sorts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorts]);

  return {
    globalQuery, setGlobalQuery, handleSearchChange, localPage, setLocalPage, localPerPage,
    setLocalPerPage, filters, setFilters, isServerPaged, handleFilterChange, clearAllFilters,
    activeFilterCount, openFilterKey, setOpenFilterKey, getFilterBtnRef, sorts, setSorts,
    clearSort, legacySortState, handleSortToggle,
  };
}

export type SearchFilterSortState<T> = ReturnType<typeof useSearchFilterSort<T>>;
