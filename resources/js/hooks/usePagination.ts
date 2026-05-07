/**
 * usePagination
 * ─────────────────────────────────────────────────────
 * مبني على بنية ردود ApiResponders.php الحقيقية:
 *
 * {
 *   status: 'success',
 *   message: '...',
 *   timestamp: '...',
 *   data: [...],           ← items المصفوفة الفعلية
 *   meta: {
 *     current_page,
 *     last_page,
 *     per_page,
 *     total,
 *     from,
 *     to,
 *     has_more_pages,
 *     is_first_page,
 *     is_last_page,
 *   },
 *   links: {
 *     first, last, prev, next, current
 *   }
 * }
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types matching backend exactly ──────────────────────────────────────────

export interface BackendMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  has_more_pages: boolean;
  is_first_page: boolean;
  is_last_page: boolean;
}

export interface BackendLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
  current: string;
}

export interface BackendListResponse<T> {
  status: 'success' | 'error';
  message: string;
  timestamp: string;
  data: T[];
  meta: BackendMeta;
  links: BackendLinks;
}

export interface BackendErrorResponse {
  status: 'error';
  code: string;
  message: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

// ── Params ───────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  filter?: Record<string, string | number | boolean | undefined>;
  include?: string;
  export?: 'csv' | 'xlsx' | 'json';
  [key: string]: unknown;
}

export interface UsePaginationOptions<T> {
  /** دالة الجلب — تستقبل الـ params وترجع Promise ببنية الـ Backend */
  fetcher: (params: PaginationParams) => Promise<BackendListResponse<T>>;
  /** الـ params الابتدائية */
  initialParams?: PaginationParams;
  /** تشغيل الجلب فوراً */
  immediate?: boolean;
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface UsePaginationReturn<T> {
  // Data
  data: T[];
  meta: BackendMeta | null;
  links: BackendLinks | null;
  // State
  loading: boolean;
  error: string | null;
  // Params
  params: PaginationParams;
  // Actions
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  setSort: (sort: string) => void;
  setSearch: (search: string) => void;
  setFilter: (key: string, value: string | number | boolean | undefined) => void;
  setFilters: (filters: Record<string, string | number | boolean | undefined>) => void;
  resetFilters: () => void;
  refresh: () => void;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePagination<T>({
  fetcher,
  initialParams = {},
  immediate = true,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<BackendMeta | null>(null);
  const [links, setLinks] = useState<BackendLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    per_page: 15,
    ...initialParams,
  });

  const abortRef = useRef<AbortController | null>(null);
  const initialFired = useRef(false);

  const fetch = useCallback(async (p: PaginationParams) => {
    // إلغاء أي طلب سابق
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // تنظيف الـ params من القيم الفارغة
      const cleanParams: PaginationParams = {};
      for (const [k, v] of Object.entries(p)) {
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'object' && !Array.isArray(v)) {
          // filter object: تنظيف القيم الفارغة
          const clean: Record<string, string | number | boolean> = {};
          for (const [fk, fv] of Object.entries(v)) {
            if (fv !== undefined && fv !== null && fv !== '') {
              clean[fk] = fv as string | number | boolean;
            }
          }
          if (Object.keys(clean).length > 0) cleanParams[k] = clean;
        } else {
          cleanParams[k] = v;
        }
      }

      const response = await fetcher(cleanParams);

      if (response.status === 'success') {
        setData(response.data);
        setMeta(response.meta);
        setLinks(response.links);
      } else {
        setError(response.message ?? 'حدث خطأ في جلب البيانات');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  // Auto-fetch on params change
  useEffect(() => {
    if (!immediate && !initialFired.current) {
      initialFired.current = true;
      return;
    }
    initialFired.current = true;
    fetch(params);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page reset helpers ───────────────────────────────────────────────────

  const updateParams = useCallback((updates: Partial<PaginationParams>, resetPage = false) => {
    setParams(prev => ({
      ...prev,
      ...(resetPage ? { page: 1 } : {}),
      ...updates,
    }));
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const setPage = useCallback((page: number) => {
    updateParams({ page });
  }, [updateParams]);

  const setPerPage = useCallback((per_page: number) => {
    updateParams({ per_page, page: 1 });
  }, [updateParams]);

  const setSort = useCallback((sort: string) => {
    updateParams({ sort, page: 1 });
  }, [updateParams]);

  const setSearch = useCallback((search: string) => {
    updateParams({ search, page: 1 });
  }, [updateParams]);

  const setFilter = useCallback((key: string, value: string | number | boolean | undefined) => {
    setParams(prev => ({
      ...prev,
      page: 1,
      filter: { ...(prev.filter ?? {}), [key]: value },
    }));
  }, []);

  const setFilters = useCallback((filters: Record<string, string | number | boolean | undefined>) => {
    setParams(prev => ({
      ...prev,
      page: 1,
      filter: filters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setParams(prev => ({ ...prev, page: 1, filter: {}, search: '' }));
  }, []);

  const refresh = useCallback(() => {
    fetch(params);
  }, [fetch, params]);

  const goNext = useCallback(() => {
    if (meta?.has_more_pages) setPage((meta?.current_page ?? 1) + 1);
  }, [meta, setPage]);

  const goPrev = useCallback(() => {
    if (!meta?.is_first_page) setPage((meta?.current_page ?? 1) - 1);
  }, [meta, setPage]);

  const goFirst = useCallback(() => setPage(1), [setPage]);

  const goLast = useCallback(() => {
    if (meta?.last_page) setPage(meta.last_page);
  }, [meta, setPage]);

  return {
    data, meta, links,
    loading, error,
    params,
    setPage, setPerPage, setSort, setSearch,
    setFilter, setFilters, resetFilters,
    refresh,
    goNext, goPrev, goFirst, goLast,
  };
}
