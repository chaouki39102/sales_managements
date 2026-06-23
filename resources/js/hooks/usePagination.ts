/**
 * usePagination — النسخة المُصلحة
 * ─────────────────────────────────────────────────────
 * التغيير الجوهري: استبدال useState/useEffect/fetch اليدوي
 * بـ useQuery من React Query لأجل:
 *   ✅ كاش تلقائي — لا طلب مكرر عند العودة للصفحة
 *   ✅ placeholderData — لا وميض عند تغيير الصفحة
 *   ✅ dedup — طلب واحد حتى لو mount متعدد
 *   ✅ invalidation — تحديث فوري بعد mutations
 *
 * بنية رد الباكاند (ApiResponders.php):
 * {
 *   status: 'success',
 *   message: '...',
 *   timestamp: '...',
 *   data: [...],
 *   meta: { current_page, last_page, per_page, total, from, to,
 *           has_more_pages, is_first_page, is_last_page },
 *   links: { first, last, prev, next, current }
 * }
 */

import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// ── Types matching backend exactly ──────────────────────────────────────────

export interface BackendMeta {
  current_page:   number;
  last_page:      number;
  per_page:       number;
  total:          number;
  from:           number | null;
  to:             number | null;
  has_more_pages: boolean;
  is_first_page:  boolean;
  is_last_page:   boolean;
}

export interface BackendLinks {
  first:   string | null;
  last:    string | null;
  prev:    string | null;
  next:    string | null;
  current: string;
}

export interface BackendListResponse<T> {
  status:    'success' | 'error';
  message:   string;
  timestamp: string;
  data:      T[];
  meta:      BackendMeta;
  links:     BackendLinks;
}

export interface BackendErrorResponse {
  status:    'error';
  code:      string;
  message:   string;
  timestamp: string;
  errors?:   Record<string, string[]>;
}

// ── Params ───────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?:     number;
  per_page?: number;
  sort?:     string;
  search?:   string;
  filter?:   Record<string, string | number | boolean | undefined>;
  include?:  string;
  export?:   'csv' | 'xlsx' | 'json';
  [key: string]: unknown;
}

export interface UsePaginationOptions<T> {
  /** دالة الجلب — تستقبل الـ params وترجع Promise ببنية الـ Backend */
  fetcher: (params: PaginationParams) => Promise<BackendListResponse<T>>;

  /**
   * ✅ جديد: مفتاح الكاش الخاص بهذا المورد
   * مثال: ['products'] أو ['customers'] أو [slug, 'invoices']
   * سيُضاف إليه params تلقائياً: [...queryKey, params]
   */
  queryKey: unknown[];

  /** الـ params الابتدائية */
  initialParams?: PaginationParams;

  /**
   * ✅ جديد: مدة الكاش بالـ ms — الافتراضي دقيقتان
   * للقوائم الديناميكية (فواتير، مصروفات): 2 دقيقة
   * للقوائم شبه الثابتة (زبائن، موردون): 5 دقائق
   */
  staleTime?: number;

  /** تعطيل الجلب (مثلاً: انتظار slug) */
  enabled?: boolean;
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface UsePaginationReturn<T> {
  // Data
  data:  T[];
  meta:  BackendMeta | null;
  links: BackendLinks | null;
  // State
  loading:   boolean;
  error:     string | null;
  // Params
  params: PaginationParams;
  // Actions
  setPage:      (page: number) => void;
  setPerPage:   (perPage: number) => void;
  setSort:      (sort: string) => void;
  setSearch:    (search: string) => void;
  setFilter:    (key: string, value: string | number | boolean | undefined) => void;
  setFilters:   (filters: Record<string, string | number | boolean | undefined>) => void;
  resetFilters: () => void;
  refresh:      () => void;
  goNext:       () => void;
  goPrev:       () => void;
  goFirst:      () => void;
  goLast:       () => void;
}

// ── تنظيف params من القيم الفارغة (نفس المنطق القديم) ───────────────────────

function cleanPaginationParams(p: PaginationParams): PaginationParams {
  const result: PaginationParams = {};

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
      if (Object.keys(clean).length > 0) result[k] = clean;
    } else {
      result[k] = v;
    }
  }

  return result;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePagination<T>({
  fetcher,
  queryKey,
  initialParams = {},
  staleTime = 2 * 60_000,
  enabled = true,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {

  // ── params تبقى في useState لأنها UI state وليست server state ───────────
  const [params, setParams] = useState<PaginationParams>({
    page:     1,
    per_page: 15,
    ...initialParams,
  });

  // ── cleanParams محسوبة من params ─────────────────────────────────────────
  const cleanParams = cleanPaginationParams(params);

  // ── useQuery يستبدل useState/useEffect/fetch اليدوي ──────────────────────
  const {
    data:      response,
    isFetching,
    error:     queryError,
    refetch,
  } = useQuery({
    // ✅ queryKey = [مورد المستخدم, cleanParams] — يختلف مع كل params
    queryKey: [...queryKey, cleanParams],

    queryFn:  () => fetcher(cleanParams),

    // ✅ يُظهر البيانات القديمة أثناء جلب الجديدة — لا وميض عند تغيير الصفحة
    placeholderData: keepPreviousData,

    staleTime,

    // ✅ يبقى في الذاكرة 10 دقائق بعد آخر استخدام
    gcTime: 10 * 60_000,

    enabled,

    // ✅ مرة واحدة فقط — أخطاء الـ pagination لا تستحق retry
    retry: false,

    // ✅ لا نُعيد الجلب عند focus — القوائم لا تتغير بمجرد العودة للتاب
    refetchOnWindowFocus: false,
  });

  // ── استخراج data/meta/links من الـ response ──────────────────────────────
  const data  = response?.status === 'success' ? response.data  : [];
  const meta  = response?.status === 'success' ? response.meta  : null;
  const links = response?.status === 'success' ? response.links : null;

  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'حدث خطأ في جلب البيانات')
    : response?.status === 'error'
      ? (response.message ?? 'حدث خطأ في جلب البيانات')
      : null;

  // ── updateParams: helper داخلي ────────────────────────────────────────────
  const updateParams = useCallback(
    (updates: Partial<PaginationParams>, resetPage = false) => {
      setParams(prev => ({
        ...prev,
        ...(resetPage ? { page: 1 } : {}),
        ...updates,
      }));
    },
    [],
  );

  // ── Public API — نفس الواجهة القديمة تماماً ───────────────────────────────

  const setPage = useCallback(
    (page: number) => updateParams({ page }),
    [updateParams],
  );

  const setPerPage = useCallback(
    (per_page: number) => updateParams({ per_page, page: 1 }),
    [updateParams],
  );

  const setSort = useCallback(
    (sort: string) => updateParams({ sort, page: 1 }),
    [updateParams],
  );

  const setSearch = useCallback(
    (search: string) => updateParams({ search, page: 1 }),
    [updateParams],
  );

  const setFilter = useCallback(
    (key: string, value: string | number | boolean | undefined) => {
      setParams(prev => ({
        ...prev,
        page:   1,
        filter: { ...(prev.filter ?? {}), [key]: value },
      }));
    },
    [],
  );

  const setFilters = useCallback(
    (filters: Record<string, string | number | boolean | undefined>) => {
      setParams(prev => ({ ...prev, page: 1, filter: filters }));
    },
    [],
  );

  const resetFilters = useCallback(
    () => setParams(prev => ({ ...prev, page: 1, filter: {}, search: '' })),
    [],
  );

  const refresh = useCallback(() => { refetch(); }, [refetch]);

  const goNext = useCallback(() => {
    if (meta?.has_more_pages) setPage((meta.current_page ?? 1) + 1);
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
    loading: isFetching,
    error,
    params,
    setPage, setPerPage, setSort, setSearch,
    setFilter, setFilters, resetFilters,
    refresh,
    goNext, goPrev, goFirst, goLast,
  };
}
