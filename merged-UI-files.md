

# =========================================
# 🧠 HOOKS
# =========================================

## FILE: resources/js/hooks/admin/index.ts
```
// hooks/admin/index.ts
export * from './useAdminCompanies';
export * from './useAdminUsers';
export * from './useAdminSystem';
```

## FILE: resources/js/hooks/admin/useAdminCompanies.ts
```
// ════════════════════════════════════════════════════════════════════════════
// hooks/admin/useAdminCompanies.ts  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   suspend/unsuspend/activate/deactivate/verify/unverify/changePlan
//   كانت تقبل (slug: string) لأن companiesApi القديم كان يستخدم Tenant routes
//
//   الآن companiesApi مُصلَح → كل العمليات بالـ id الرقمي
//   → جميع الـ mutations تقبل id: number فقط
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/admin';
import type { AdminCompany, AdminCompaniesFilter } from '@/types/admin';

const KEY = ['admin', 'companies'] as const;

const keys = {
  all:     KEY,
  list:    (f?: AdminCompaniesFilter) => [...KEY, 'list', f] as const,
  detail:  (id: number)               => [...KEY, id]        as const,
  members: (id: number)               => [...KEY, id, 'users'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAdminCompanies(filter?: AdminCompaniesFilter) {
  return useQuery({
    queryKey:        keys.list(filter),
    queryFn:         () => companiesApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminCompany(id: number) {
  return useQuery({
    queryKey:  keys.detail(id),
    queryFn:   () => companiesApi.show(id),
    staleTime: 30_000,
    enabled:   id > 0,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
//
// ✅ كل العمليات الآن بالـ id الرقمي — تتوافق مع companiesApi المُصلَح
//

export function useCompanyMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    // CRUD
    create: useMutation({
      mutationFn: companiesApi.create,
      onSuccess:  inv,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<AdminCompany> }) =>
        companiesApi.update(id, data),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: number) => companiesApi.remove(id),
      onSuccess:  inv,
    }),
    updateNotes: useMutation({
      mutationFn: ({ id, notes }: { id: number; notes: string }) =>
        companiesApi.updateNotes(id, notes),
      onSuccess: inv,
    }),

    // Actions — ✅ id بدل slug
    suspend: useMutation({
      mutationFn: ({ id, reason }: { id: number; reason: string }) =>
        companiesApi.suspend(id, reason),
      onSuccess: inv,
    }),
    unsuspend: useMutation({
      mutationFn: (id: number) => companiesApi.unsuspend(id),
      onSuccess:  inv,
    }),
    activate: useMutation({
      mutationFn: (id: number) => companiesApi.activate(id),
      onSuccess:  inv,
    }),
    deactivate: useMutation({
      mutationFn: (id: number) => companiesApi.deactivate(id),
      onSuccess:  inv,
    }),
    verify: useMutation({
      mutationFn: (id: number) => companiesApi.verify(id),
      onSuccess:  inv,
    }),
    unverify: useMutation({
      mutationFn: (id: number) => companiesApi.unverify(id),
      onSuccess:  inv,
    }),
    changePlan: useMutation({
      mutationFn: ({ id, ...d }: { id: number } & Parameters<typeof companiesApi.changePlan>[1]) =>
        companiesApi.changePlan(id, d),
      onSuccess: inv,
    }),
    seed: useMutation({
      mutationFn: (id: number) => companiesApi.seed(id),
    }),
  };
}

export function useCompanyMemberMutations(companyId: number) {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: keys.members(companyId) });

  return {
    addUser: useMutation({
      mutationFn: ({ userId, role }: { userId: number; role?: string }) =>
        companiesApi.addUser(companyId, userId, role),
      onSuccess: inv,
    }),
    removeUser: useMutation({
      mutationFn: (userId: number) => companiesApi.removeUser(companyId, userId),
      onSuccess:  inv,
    }),
    toggleUser: useMutation({
      mutationFn: (userId: number) => companiesApi.toggleUser(companyId, userId),
      onSuccess:  inv,
    }),
  };
}
```

## FILE: resources/js/hooks/admin/useAdminSystem.ts
```
// hooks/admin/useAdminSystem.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, plansApi, settingsApi, maintenanceApi } from '@/lib/api/admin';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey:  ['admin', 'dashboard'],
    queryFn:   dashboardApi.get,
    staleTime: 2 * 60_000,
    retry:     false,
  });
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export function useAdminPlans() {
  return useQuery({
    queryKey:  ['admin', 'plans'],
    queryFn:   plansApi.list,
    staleTime: 10 * 60_000,
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function useSystemSettings() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  const query  = useQuery({
    queryKey:  ['admin', 'settings'],
    queryFn:   settingsApi.get,
    staleTime: 5 * 60_000,
  });

  const update = useMutation({
    mutationFn: settingsApi.update,
    onSuccess:  inv,
  });

  return { ...query, update };
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export function useMaintenanceMutations() {
  const qc     = useQueryClient();
  const invSet = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  return {
    enable:  useMutation({
      mutationFn: (msg?: string) => maintenanceApi.enable(msg),
      onSuccess:  invSet,
    }),
    disable: useMutation({
      mutationFn: maintenanceApi.disable,
      onSuccess:  invSet,
    }),
    // ✅ إصلاح: clearCache لا تحتاج invalidate — هي عملية على الباكاند فقط
    clearCache: useMutation({
      mutationFn: maintenanceApi.cache,
    }),
    runScheduler: useMutation({
      mutationFn: maintenanceApi.scheduler,
    }),
    exportBackup: useMutation({
      mutationFn: maintenanceApi.backup,
    }),
  };
}
```

## FILE: resources/js/hooks/admin/useAdminUsers.ts
```
// hooks/admin/useAdminUsers.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { usersApi, impersonateApi }                                 from '@/lib/api/admin';
import { tokenStorage }                                             from '@/lib/api/core/client';
import type { AdminUsersFilter }                                    from '@/types/admin';

const KEY = ['admin', 'users'] as const;

const keys = {
  all:       KEY,
  list:      (f?: AdminUsersFilter) => [...KEY, 'list', f] as const,
  detail:    (id: number)            => [...KEY, id]        as const,
  companies: (id: number)            => [...KEY, id, 'companies'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAdminUsers(filter?: AdminUsersFilter) {
  return useQuery({
    queryKey:        keys.list(filter),
    queryFn:         () => usersApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: number) {
  return useQuery({
    queryKey:  keys.detail(id),
    queryFn:   () => usersApi.show(id),
    staleTime: 30_000,
    enabled:   id > 0,
  });
}

export function useAdminUserCompanies(userId: number, enabled = true) {
  return useQuery({
    queryKey:  keys.companies(userId),
    queryFn:   () => usersApi.companies(userId),
    enabled:   enabled && userId > 0,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUserMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    create:        useMutation({ mutationFn: usersApi.create,                                                                  onSuccess: inv }),
    update:        useMutation({ mutationFn: ({ id, data }: { id: number; data: Parameters<typeof usersApi.update>[1] }) =>
                                               usersApi.update(id, data),                                                      onSuccess: inv }),
    remove:        useMutation({ mutationFn: (id: number) => usersApi.remove(id),                                              onSuccess: inv }),
    toggleActive:  useMutation({ mutationFn: (id: number) => usersApi.toggleActive(id),                                       onSuccess: inv }),
    resetPassword: useMutation({ mutationFn: ({ id, pwd }: { id: number; pwd: string }) =>
                                               usersApi.resetPassword(id, pwd) }),

    // ✅ إصلاح: apiPost يمر عبر extractData → token موجود في res.token مباشرة
    impersonate: useMutation({
      mutationFn: (id: number) => impersonateApi.start(id),
      onSuccess:  (res) => {
        if (res?.token) {
          tokenStorage.set(res.token);
          window.location.href = '/dashboard';
        }
      },
    }),
  };
}
```

## FILE: resources/js/hooks/useAdmin.ts
```
// hooks/useAdmin.ts — re-export مركزي
// الصفحات التي تستورد من '@/hooks/useAdmin' تجد كل شيء هنا
export * from './admin/useAdminSystem';
export * from './admin/useAdminCompanies';
export * from './admin/useAdminUsers';
export type { AdminDashboardStats } from '@/types/admin';
```

## FILE: resources/js/hooks/useDebounce.ts
```
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

## FILE: resources/js/hooks/useLookup.ts
```
// ════════════════════════════════════════════════════════════════════════════
// hooks/useLookup.ts — FIXED
// ════════════════════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

// ✅ FIXED: فقط المسارات الموجودة خارج /{company}/ في api.php
// /wilayas  → Route::apiResource('wilayas'...)  خارج {company}
// /communes → Route::apiResource('communes'...) خارج {company}
//
// ❌ تمت إزالة كل lookups الأخرى من هنا لأنها جميعاً داخل /{company}/
//    وكانت تُسبب 405 عند POST/PUT لأن الـ interceptor لا يُضيف slug لها
const GLOBAL_ENDPOINTS = [
  '/wilayas',
  '/communes',
];

function isGlobal(endpoint: string): boolean {
  return GLOBAL_ENDPOINTS.some(
    e => endpoint === e || endpoint.startsWith(e + '/'),
  );
}

export interface UseLookupReturn<T> {
  items:   T[];
  loading: boolean;
  error:   string | null;
  saving:  boolean;
  refetch: () => void;
  create:  (data: Partial<T>) => Promise<void>;
  update:  (id: number, data: Partial<T>) => Promise<void>;
  remove:  (id: number) => Promise<void>;
}

/**
 * useLookup — يُستخدم في LookupPage
 *
 * Global  (/wilayas, /communes):
 *   queryKey = ['global', endpoint]
 *   الـ interceptor لا يُضيف slug → /api/v1/wilayas
 *
 * Tenant (كل شيء آخر: /currencies, /tvas, /units, ...):
 *   queryKey = [slug, 'lookups', endpoint]
 *   الـ interceptor يُضيف slug → /api/v1/{slug}/currencies
 */
export function useLookup<T extends { id: number; name: string }>(
  endpoint: string,
): UseLookupReturn<T> {
  const slug   = useActiveSlug();
  const qc     = useQueryClient();
  const global = isGlobal(endpoint);

  const queryKey = global
    ? ['global', endpoint]
    : [slug ?? '', 'lookups', endpoint];

  const { data, isLoading, error, refetch } = useQuery<T[]>({
    queryKey,
    queryFn:   () => apiGet<T[]>(endpoint, { per_page: 500 }),
    enabled:   global ? true : !!slug,
    staleTime: global ? 60 * 60_000 : 10 * 60_000,
    select:    (data) => (Array.isArray(data) ? data : []),
  });

  const [saving, setSaving] = useState(false);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, JSON.stringify(queryKey)]);

  const createMutation = useMutation({
    mutationFn: (body: Partial<T>) => apiPost<T>(endpoint, body),
    onSuccess:  invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<T> }) =>
      apiPut<T>(`${endpoint}/${id}`, data),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`${endpoint}/${id}`),
    onSuccess:  invalidate,
  });

  const create = useCallback(async (body: Partial<T>) => {
    setSaving(true);
    try { await createMutation.mutateAsync(body); }
    finally { setSaving(false); }
  }, [createMutation]);

  const update = useCallback(async (id: number, body: Partial<T>) => {
    setSaving(true);
    try { await updateMutation.mutateAsync({ id, data: body }); }
    finally { setSaving(false); }
  }, [updateMutation]);

  const remove = useCallback(async (id: number) => {
    setSaving(true);
    try { await removeMutation.mutateAsync(id); }
    finally { setSaving(false); }
  }, [removeMutation]);

  return {
    items:   data ?? [],
    loading: isLoading,
    error:   error ? (error as Error).message : null,
    saving,
    refetch: () => refetch(),
    create,
    update,
    remove,
  };
}
```

## FILE: resources/js/hooks/useModal.ts
```
// hooks/useModal.ts
import { useState, useCallback } from 'react';

export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);
  const openModal  = useCallback(() => setOpen(true),  []);
  const closeModal = useCallback(() => setOpen(false), []);
  const toggle     = useCallback(() => setOpen(v => !v), []);
  return { open, openModal, closeModal, toggle };
}
```

## FILE: resources/js/hooks/usePagination.ts
```
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
```

## FILE: resources/js/hooks/useTheme.ts
```
// ════════════════════════════════════════════════════════════════════════════
// hooks/useTheme.ts
// Dark/Light mode — يقرأ من localStorage ويُطبق class على <html>
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark-mode', dark);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light'); } catch {}
}

export function useTheme() {
  const [dark, setDark] = useState<boolean>(getInitialDark);

  // طبّق عند التحميل الأول
  useEffect(() => { applyTheme(dark); }, []);

  const toggle = () => {
    setDark(prev => {
      applyTheme(!prev);
      return !prev;
    });
  };

  return { dark, toggle };
}
```

## FILE: resources/js/hooks/useTopbarTitle.ts
```
// hooks/useTopbarTitle.ts
// يُعيد عنوان الصفحة الحالية والمسار التفصيلي بناءً على الـ URL
import { useLocation } from 'react-router-dom';

interface PageMeta {
  title: string;
  path:  string;
}

const META: Record<string, PageMeta> = {
  '/dashboard':    { title:'لوحة التحكم',         path:'الرئيسية ← إحصائيات'       },
  '/pos':          { title:'نقطة البيع',           path:'الرئيسية ← POS'            },
  '/invoices':     { title:'الفواتير',             path:'مبيعات ← فواتير'           },
  '/orders':       { title:'طلبيات الشراء',         path:'مبيعات ← طلبيات'          },
  '/returns':      { title:'المرتجعات',             path:'مبيعات ← مرتجعات'         },
  '/quotations':   { title:'فاتورة شكلية',          path:'مبيعات ← عروض أسعار'      },
  '/bl':           { title:'وصل التسليم BL',        path:'مبيعات ← وصل تسليم'       },
  '/products':     { title:'المنتجات',              path:'مخزون ← منتجات'           },
  '/inventory':    { title:'إدارة المخزون',         path:'مخزون ← جرد'              },
  '/categories':   { title:'الفئات',               path:'مخزون ← فئات'             },
  '/brands':       { title:'العلامات التجارية',     path:'مخزون ← علامات'           },
  '/units':        { title:'وحدات القياس',          path:'مخزون ← وحدات'            },
  '/suppliers':    { title:'الموردون',              path:'مخزون ← موردون'           },
  '/warehouses':   { title:'المستودعات',            path:'مخزون ← مستودعات'         },
  '/clients':      { title:'العملاء',               path:'محاسبة ← عملاء'           },
  '/finance':      { title:'الخزينة',               path:'محاسبة ← خزينة'           },
  '/expenses':     { title:'المصروفات',             path:'محاسبة ← مصروفات'         },
  '/debts':        { title:'الديون',                path:'محاسبة ← ديون'            },
  '/tva':          { title:'إقرار TVA — G50',       path:'محاسبة ← TVA'             },
  '/fiscal':       { title:'الملف الجبائي',         path:'محاسبة ← جبايات'          },
  '/fiscalyears':  { title:'السنوات المالية',        path:'محاسبة ← سنوات مالية'     },
  '/currencies':   { title:'العملات',               path:'محاسبة ← عملات'           },
  '/pricelevels':  { title:'مستويات الأسعار',       path:'محاسبة ← مستويات أسعار'   },
  '/employees':    { title:'الموظفون',              path:'موارد بشرية ← موظفون'      },
  '/reports':      { title:'التقارير',              path:'تقارير'                    },
  '/balance':      { title:'الميزانية التقديرية',   path:'تقارير ← ميزانية'         },
  '/users':        { title:'المستخدمون',            path:'نظام ← مستخدمون'          },
  '/settings':     { title:'الإعدادات',             path:'نظام ← إعدادات'           },
};

export function useTopbarTitle(): PageMeta {
  const { pathname } = useLocation();
  return META[pathname] ?? { title: 'لوحة التحكم', path: 'الرئيسية' };
}
```

## FILE: resources/js/pos/hooks/usePOS.ts
```
// resources/js/pos/hooks/usePOS.ts
// ════════════════════════════════════
// Hook موحّد يجمع POSStore + CartStore
// ════════════════════════════════════
import { usePOSStore } from './usePOSStore';
import { useCartStore } from '../utils/useCartStore';

export function usePOS() {
  // ── POS Store ──────────────────────────────
  const sessionStarted    = usePOSStore(s => s.sessionStarted);
  const sessionInvoices   = usePOSStore(s => s.sessionInvoices);
  const sessionSales      = usePOSStore(s => s.sessionSales);
  const heldCarts         = usePOSStore(s => s.heldCarts);
  const activeTab         = usePOSStore(s => s.activeTab);
  const searchQuery       = usePOSStore(s => s.searchQuery);
  const selectedCategory  = usePOSStore(s => s.selectedCategory);
  const paymentModalOpen  = usePOSStore(s => s.paymentModalOpen);

  const startSession      = usePOSStore(s => s.startSession);
  const endSession        = usePOSStore(s => s.endSession);
  const incrementSession  = usePOSStore(s => s.incrementSession);
  const holdCart          = usePOSStore(s => s.holdCart);
  const restoreCart       = usePOSStore(s => s.restoreCart);
  const deleteHeldCart    = usePOSStore(s => s.deleteHeldCart);
  const setTab            = usePOSStore(s => s.setTab);
  const setSearch         = usePOSStore(s => s.setSearch);
  const setCategory       = usePOSStore(s => s.setCategory);
  const openPayment       = usePOSStore(s => s.openPayment);
  const closePayment      = usePOSStore(s => s.closePayment);

  // ── Cart Store ─────────────────────────────
  const items             = useCartStore(s => s.items);
  const client            = useCartStore(s => s.client);
  const addItem           = useCartStore(s => s.addItem);
  const removeItem        = useCartStore(s => s.removeItem);
  const updateQty         = useCartStore(s => s.updateQty);
  const clearCart         = useCartStore(s => s.clearCart);
  const setClient         = useCartStore(s => s.setClient);
  const totals            = useCartStore(s => s.totals);

  return {
    // Session
    sessionStarted, sessionInvoices, sessionSales,
    startSession, endSession, incrementSession,

    // Held carts
    heldCarts, holdCart, restoreCart, deleteHeldCart,

    // UI
    activeTab, searchQuery, selectedCategory, paymentModalOpen,
    setTab, setSearch, setCategory, openPayment, closePayment,

    // Cart
    items, client, addItem, removeItem, updateQty, clearCart, setClient, totals,
  };
}
```

## FILE: resources/js/pos/hooks/usePOSStore.ts
```
// ════════════════════════════════════════════════
// store/usePOSStore.ts — حالة نقطة البيع الكاملة
// ════════════════════════════════════════════════
import { create } from 'zustand';
import type { HeldCart } from '@/types';
import { nanoid } from 'nanoid';
import { useCartStore } from '../utils/useCartStore';

interface POSState {
  // Session
  sessionStarted:    boolean;
  sessionInvoices:   number;
  sessionSales:      number;

  // Held carts
  heldCarts:         HeldCart[];

  // UI state
  activeTab:         'products' | 'clients' | 'held';
  searchQuery:       string;
  selectedCategory:  number | null;
  paymentModalOpen:  boolean;

  // Actions
  startSession:      () => void;
  endSession:        () => void;
  incrementSession:  (amount: number) => void;

  holdCart:          (label?: string) => void;
  restoreCart:       (id: string) => void;
  deleteHeldCart:    (id: string) => void;

  setTab:            (tab: POSState['activeTab']) => void;
  setSearch:         (q: string) => void;
  setCategory:       (id: number | null) => void;
  openPayment:       () => void;
  closePayment:      () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  sessionStarted:   false,
  sessionInvoices:  0,
  sessionSales:     0,
  heldCarts:        [],
  activeTab:        'products',
  searchQuery:      '',
  selectedCategory: null,
  paymentModalOpen: false,

  startSession: () => set({ sessionStarted: true, sessionInvoices: 0, sessionSales: 0 }),
  endSession:   () => set({ sessionStarted: false }),

  incrementSession: (amount) =>
    set(s => ({ sessionInvoices: s.sessionInvoices + 1, sessionSales: s.sessionSales + amount })),

  holdCart: (label) => {
    const cart  = useCartStore.getState();
    const items = cart.items;
    if (items.length === 0) return;
    const held: HeldCart = {
      id:         nanoid(6),
      label:      label ?? `عربة ${get().heldCarts.length + 1}`,
      items:      [...items],
      totals:     cart.totals(),
      client:     cart.client,
      created_at: new Date().toISOString(),
    };
    set(s => ({ heldCarts: [...s.heldCarts, held] }));
    cart.clearCart();
  },

  restoreCart: (id) => {
    const held = get().heldCarts.find(c => c.id === id);
    if (!held) return;
    const cart = useCartStore.getState();
    // Restore items directly
    useCartStore.setState({ items: held.items, client: held.client ?? null });
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) }));
  },

  deleteHeldCart: (id) =>
    set(s => ({ heldCarts: s.heldCarts.filter(c => c.id !== id) })),

  setTab:      (tab)  => set({ activeTab: tab }),
  setSearch:   (q)    => set({ searchQuery: q }),
  setCategory: (id)   => set({ selectedCategory: id }),
  openPayment:  ()    => set({ paymentModalOpen: true }),
  closePayment: ()    => set({ paymentModalOpen: false }),
}));


// ════════════════════════════════════════════════
// store/useUIStore.ts — الحالة العامة للواجهة
// ════════════════════════════════════════════════
import { create as cr } from 'zustand';
import { persist as ps } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  notifications:   number;
  // actions
  toggleSidebar:   () => void;
  setNotifications:(n: number) => void;
}

export const useUIStore = cr<UIState>()(
  ps(
    (set) => ({
      sidebarCollapsed: false,
      notifications:   0,
      toggleSidebar:   () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setNotifications:(n) => set({ notifications: n }),
    }),
    { name: 'ui-state' }
  )
);
```



# =========================================
# 🌐 CONTEXT
# =========================================

## FILE: resources/js/context/AuthContext.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// context/AuthContext.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   Zustand يحتفظ بالـ activeCompany/slug في sessionStorage (persist)
//   → بعد انتهاء الجلسة، عند فتح صفحة Login:
//     slug لا يزال موجوداً → FiscalYearProvider يُشغِّل query → 500
//
//   ملاحظة: useCurrentUser في auth.ts لديه retry:false وهو صحيح
//   المشكلة الوحيدة: auth/me يُعيد 500 (خطأ PHP syntax في الباكاند)
//   وليس 401 → الـ interceptor لا يُشغِّل forcedLogout → المشكلة في الباكاند
//
// الحل الصحيح هنا (frontend):
//   FiscalYearContext الجديد يقرأ isAuthenticated قبل تشغيل أي query
//   (انظر FiscalYearContext.tsx المُصلَح)
//
//   AuthContext: لا حاجة لتغييره — useLogout يستدعي appActions.reset()
//   الذي يمسح الـ slug. المشكلة كانت أن FiscalYearContext لا ينتظر Auth.
// ════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useCurrentUser, useLogin, useLogout } from '@/lib/api/endpoints/auth';
import { useActiveCompany, useAppStore } from '@/lib/store/appStore';
import type { User, ActiveCompany, LoginCredentials } from '@/lib/api/core/types';

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:             User | null;
  isAuthenticated:  boolean;
  isLoading:        boolean;
  isSuperAdmin:     boolean;
  activeCompany:    ActiveCompany | null;
  login:            (creds: LoginCredentials) => Promise<User>;
  logout:           () => Promise<void>;
  setActiveCompany: (company: ActiveCompany) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const activeCompany             = useActiveCompany();
  const setActiveCompanyInStore   = useAppStore(s => s.setActiveCompany);

  const loginMutation  = useLogin();
  const logoutMutation = useLogout();

  const login = async (creds: LoginCredentials): Promise<User> => {
    const result = await loginMutation.mutateAsync(creds);
    return result.user;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const setActiveCompany = (company: ActiveCompany) => {
    setActiveCompanyInStore(company);
  };

  const isSuperAdmin = user?.roles?.some(r => r.name === 'super-admin') ?? false;

  return (
    <AuthContext.Provider value={{
      user:            user ?? null,
      isAuthenticated: !!user,
      isLoading,
      isSuperAdmin,
      activeCompany,
      login,
      logout,
      setActiveCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const useAuthUser        = () => useAuth().user;
export const useIsAuthenticated = () => useAuth().isAuthenticated;
export const useIsSuperAdmin    = () => useAuth().isSuperAdmin;
```

## FILE: resources/js/context/FiscalYearContext.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// context/FiscalYearContext.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   FiscalYearProvider كان يُشغَّل دائماً بمجرد وجود slug في Zustand
//   حتى لو لم يكن المستخدم مسجّل دخوله بعد.
//
//   Zustand يحتفظ بالـ slug من الجلسة السابقة (persist) حتى بعد logout
//   → بمجرد تحميل الصفحة: slug موجود → useFiscalYears يُشغَّل
//   → يُرسل: GET /api/v1/el-houda.../fiscal-years?per_page=50
//   → الـ token منتهي أو 500 في الباكاند
//
// الحل:
//   1. FiscalYearContext يقرأ isAuthenticated من AuthContext
//   2. useFiscalYears لا يُشغَّل إلا بعد التحقق من Auth
//   3. إضافة enabled: !!slug && isAuthenticated في الـ query
//
// ملاحظة بخصوص 500 "Unclosed '{' on line 15":
//   هذا خطأ PHP syntax في الباكاند — ليس مشكلة frontend.
//   على الأرجح في BaseService.php من التعديلات الأخيرة.
//   الحل: تحقق من السطر 15 في BaseService.php وأصلح الـ syntax error.
// ════════════════════════════════════════════════════════════════════════════

import React, {
  createContext, useContext, useCallback,
  useState, useRef, useEffect,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { fiscalYearsApi }    from '@/lib/api/endpoints/fiscalYears';
import { tenantKeys }        from '@/lib/api/core/queryKeys';
import { useActiveSlug }     from '@/lib/store/appStore';
import { useAppStore }       from '@/lib/store/appStore';
import { useAuth }           from '@/context/AuthContext';  // ✅ نقرأ Auth
import type { FiscalYear }   from '@/lib/api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiscalYearContextType {
  years:           FiscalYear[];
  selectedYear:    FiscalYear | null;
  currentYear:     FiscalYear | null;
  open:            FiscalYear[];
  closed:          FiscalYear[];
  setSelectedYear: (year: FiscalYear) => void;
  goToCurrentYear: () => void;
  isLoading:       boolean;
  hasMultipleOpen: boolean;
  refetch:         () => void;
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

// ─── useFiscalYears المُصلَح — لا يُشغَّل إلا بعد Auth ───────────────────────

function useFiscalYearsAuth() {
  const slug            = useActiveSlug();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ✅ الشرط المزدوج: يجب أن يكون هناك slug + مستخدم مصادق عليه
  const enabled = !!slug && isAuthenticated && !authLoading;

  return useQuery({
    queryKey:  tenantKeys.fiscalYears.all(slug ?? ''),
    queryFn:   () => fiscalYearsApi.list(),
    enabled,
    staleTime: 5 * 60_000,
    retry:     false,  // ✅ لا نُعيد المحاولة إذا فشل (يمنع loops)
    select: (years) => ({
      years,
      current: years.find(y => y.is_current) ??
               years.find(y => !y.is_closed)  ??
               years[0] ??
               null,
      open:    years.filter(y => !y.is_closed),
      closed:  years.filter(y => y.is_closed),
    }),
  });
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  // ✅ استخدام useFiscalYearsAuth بدل useFiscalYears
  const { data, isLoading, refetch } = useFiscalYearsAuth();
  const selectedYearId    = useAppStore(s => s.selectedYearId);
  const setSelectedYearId = useAppStore(s => s.setSelectedYearId);

  const years   = data?.years   ?? [];
  const current = data?.current ?? null;
  const open    = data?.open    ?? [];
  const closed  = data?.closed  ?? [];

  // ─── selectedYear: من Zustand id → يبحث في القائمة ──────────────────────
  const selectedYear: FiscalYear | null = (() => {
    if (!data) return null;
    if (!selectedYearId) return current;
    return years.find(y => y.id === selectedYearId) ?? current;
  })();

  const setSelectedYear = useCallback((year: FiscalYear) => {
    setSelectedYearId(year.id);
  }, [setSelectedYearId]);

  const goToCurrentYear = useCallback(() => {
    if (current) setSelectedYearId(current.id);
  }, [current, setSelectedYearId]);

  return (
    <FiscalYearContext.Provider value={{
      years,
      selectedYear,
      currentYear:     current,
      open,
      closed,
      setSelectedYear,
      goToCurrentYear,
      isLoading,
      hasMultipleOpen: open.length > 1,
      refetch,
    }}>
      {children}
    </FiscalYearContext.Provider>
  );
}

export function useFiscalYear(): FiscalYearContextType {
  const ctx = useContext(FiscalYearContext);
  if (!ctx) throw new Error('useFiscalYear must be used within FiscalYearProvider');
  return ctx;
}

// ─── FiscalYearSelector ───────────────────────────────────────────────────────

export function FiscalYearSelector() {
  const { years, selectedYear, setSelectedYear, isLoading, open, closed } = useFiscalYear();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 20,
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite', fontSize: 13 }} />
        تحميل...
      </div>
    );
  }

  if (!selectedYear && years.length === 0) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          background: 'var(--bg3)', border: '1px solid var(--b2)',
          cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          transition: 'all .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--em)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
      >
        <i
          className={`ti ${selectedYear?.is_closed ? 'ti-lock' : 'ti-calendar-check'}`}
          style={{ color: selectedYear?.is_closed ? 'var(--t4)' : 'var(--em)', fontSize: 13 }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>
          {selectedYear?.name ?? 'اختر سنة'}
        </span>
        {selectedYear?.is_current && (
          <i className="ti ti-star-filled" style={{ color: 'var(--gold)', fontSize: 9 }} />
        )}
        <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`}
           style={{ fontSize: 11, color: 'var(--t4)' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: 200, background: 'var(--bg2)',
          border: '1px solid var(--b2)', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)',
          zIndex: 1000, overflow: 'hidden', direction: 'rtl',
        }}>
          {open.length > 0 && (
            <>
              <div style={{
                padding: '6px 12px', fontSize: 9.5, fontWeight: 800,
                color: 'var(--em)', textTransform: 'uppercase', letterSpacing: .5,
                background: 'var(--bg3)',
              }}>مفتوحة</div>
              {open.map(year => (
                <YearOption
                  key={year.id} year={year}
                  selected={selectedYear?.id === year.id}
                  onClick={() => { setSelectedYear(year); setIsOpen(false); }}
                />
              ))}
            </>
          )}

          {closed.length > 0 && (
            <>
              <div style={{
                padding: '6px 12px', fontSize: 9.5, fontWeight: 800,
                color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .5,
                borderTop: open.length ? '1px solid var(--b1)' : 'none',
                background: 'var(--bg3)',
              }}>مقفلة</div>
              {closed.slice(0, 3).map(year => (
                <YearOption
                  key={year.id} year={year}
                  selected={selectedYear?.id === year.id}
                  onClick={() => { setSelectedYear(year); setIsOpen(false); }}
                />
              ))}
              {closed.length > 3 && (
                <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--t4)', fontStyle: 'italic' }}>
                  + {closed.length - 3} سنوات أخرى...
                </div>
              )}
            </>
          )}

          <div style={{ borderTop: '1px solid var(--b1)' }}>
            <a
              href="/fiscalyears"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', fontSize: 12,
                color: 'var(--em)', fontWeight: 600,
                textDecoration: 'none', transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className="ti ti-settings" style={{ fontSize: 13 }} />
              إدارة السنوات المالية
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function YearOption({
  year, selected, onClick,
}: {
  year: FiscalYear; selected: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', cursor: 'pointer',
        background: selected ? 'var(--emb)' : 'transparent',
        transition: 'background .1s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i
          className={`ti ${year.is_closed ? 'ti-lock' : year.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
          style={{
            fontSize: 13,
            color: year.is_closed ? 'var(--t4)' : year.is_current ? 'var(--gold)' : 'var(--em)',
          }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? 'var(--em)' : 'var(--t1)' }}>
            {year.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>
            {year.start_date?.split('-')[0]} — {year.end_date?.split('-')[0]}
          </div>
        </div>
      </div>
      {selected && <i className="ti ti-check" style={{ color: 'var(--em)', fontSize: 14 }} />}
    </div>
  );
}
```



# =========================================
# 🔌 API / LIB
# =========================================

## FILE: resources/js/lib/admin.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/admin.ts
//
// ⚠️  هذا الملف re-export + backward-compat فقط.
//    المنطق الفعلي: lib/api/admin/*
//    الصفحات الجديدة تستورد من '@/lib/api/admin' مباشرة.
// ════════════════════════════════════════════════════════════════════════════

import { apiGet }          from './api/core/client';
import {
  companiesApi,
  usersApi,
  impersonateApi,
  dashboardApi,
  plansApi,
  settingsApi,
  maintenanceApi,
  systemBootApi,
  activityApi,
} from './api/admin';

// ─── Named re-exports ────────────────────────────────────────────────────────
export {
  companiesApi,
  usersApi,
  impersonateApi,
  dashboardApi,
  plansApi,
  settingsApi,
  maintenanceApi,
  systemBootApi,
  activityApi,
};
export { apiGetPaginated } from './api/admin';

// ─── adminApi — wrapper بدون تكرار كود ───────────────────────────────────────
export const adminApi = {
  // Dashboard
  getDashboard:      dashboardApi.get,

  // Companies
  getCompanies:      companiesApi.list,
  getCompany:        companiesApi.show,
  createCompany:     companiesApi.create,
  updateCompany:     (id: number, d: Parameters<typeof companiesApi.update>[1]) => companiesApi.update(id, d),
  deleteCompany:     companiesApi.remove,
  suspendCompany:    companiesApi.suspend,
  unsuspendCompany:  companiesApi.unsuspend,
  activateCompany:   companiesApi.activate,
  deactivateCompany: companiesApi.deactivate,
  verifyCompany:     companiesApi.verify,
  unverifyCompany:   companiesApi.unverify,
  changePlan:        (id: number, d: Parameters<typeof companiesApi.changePlan>[1]) => companiesApi.changePlan(id, d),
  updateNotes:       companiesApi.updateNotes,
  getCompanyUsers:   companiesApi.listUsers,
  addCompanyUser:    companiesApi.addUser,
  removeCompanyUser: companiesApi.removeUser,
  toggleCompanyUser: companiesApi.toggleUser,
  seedCompany:       companiesApi.seed,

  // Users
  getUsers:         usersApi.list,
  getUser:          usersApi.show,
  createUser:       usersApi.create,
  updateUser:       (id: number, d: Parameters<typeof usersApi.update>[1]) => usersApi.update(id, d),
  deleteUser:       usersApi.remove,
  resetPassword:    usersApi.resetPassword,
  toggleActive:     usersApi.toggleActive,
  getUserCompanies: usersApi.companies,

  // Impersonate
  impersonate:     impersonateApi.start,
  stopImpersonate: impersonateApi.stop,

  // Plans
  getPlans: plansApi.list,
  getPlan:  plansApi.show,

  // Activity
  getActivity:    activityApi.list,
  getActivityLog: activityApi.show,

  // System
  getSystemStatus:  systemBootApi.status,
  bootSystem:       systemBootApi.boot,
  bootWilayas:      systemBootApi.bootWilayas,
  bootPermissions:  systemBootApi.bootPerms,

  // Settings
  getSettings:    settingsApi.get,
  updateSettings: settingsApi.update,

  // Maintenance
  getMaintenance:     maintenanceApi.status,
  enableMaintenance:  maintenanceApi.enable,
  disableMaintenance: maintenanceApi.disable,
  clearCache:         maintenanceApi.cache,
  runScheduler:       maintenanceApi.scheduler,
  exportBackup:       maintenanceApi.backup,

  // Reports
  getReports: (period: '7d' | '30d' | '90d') =>
    apiGet<{
      users:     { date: string; value: number }[];
      companies: { date: string; value: number }[];
      revenue:   { date: string; value: number }[];
    }>('/admin/reports', { period } as Record<string, unknown>),

} as const;

export default adminApi;
export type { Paginated, AdminCompaniesFilter, AdminUsersFilter } from '@/types/admin';
```

## FILE: resources/js/lib/api/admin/client.ts
```
// lib/api/admin/client.ts
//
// apiGetPaginated — تتجاوز extractData لأن admin API يُعيد:
//   { data:[...], meta:{...} }  ← طبقة واحدة
// بينما extractData مُصمَّمة للـ tenant الذي يُعيد:
//   { data: { data:[...], meta:{...} } }  ← طبقتان
//
import client from '@/lib/api/core/client';
import type { AxiosRequestConfig } from 'axios';

export async function apiGetPaginated<T>(
  url: string,
  params?: Record<string, unknown>,
  cfg?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.get<T>(url, { params, ...cfg });
  return response.data;
}
```

## FILE: resources/js/lib/api/admin/companies.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/admin/companies.ts  ← النسخة المُصلحة الكاملة
//
// المشكلة الأصلية:
//   suspend/unsuspend/activate/deactivate/verify/unverify/changePlan
//   كانت تستخدم Tenant routes:
//     /companies/{slug}/suspend  (مع _skipSlug: true)
//   لكن api_admin.php يُعرّفها في Admin routes:
//     /api/v1/admin/companies/{id}/suspend
//
//   النتيجة: 404 أو 403 عند كل محاولة تعديل على شركة
//
// الحل:
//   كل العمليات تستخدم /admin/companies/{id}/... (الـ id الرقمي)
//   لا يوجد _skipSlug — لا حاجة له
//   أُضيفت listUsers التي كانت مستخدمة في CompanyDrawer لكن غير معرّفة
// ════════════════════════════════════════════════════════════════════════════
import { apiPost, apiPut, apiPatch, apiDelete, apiGet } from '@/lib/api/core/client';
import { apiGetPaginated }                              from './client';
import type {
  AdminCompany,
  AdminUser,
  Paginated,
  AdminCompaniesFilter,
} from '@/types/admin';

const ADMIN = '/admin/companies';

export const companiesApi = {

  // ─── List & CRUD ───────────────────────────────────────────────────────────
  list: (f?: AdminCompaniesFilter) =>
    apiGetPaginated<Paginated<AdminCompany>>(ADMIN, f as any),

  show:   (id: number)                           => apiGet<AdminCompany>(`${ADMIN}/${id}`),
  create: (d: Partial<AdminCompany>)             => apiPost<AdminCompany>(ADMIN, d),
  update: (id: number, d: Partial<AdminCompany>) => apiPut<AdminCompany>(`${ADMIN}/${id}`, d),
  remove: (id: number)                           => apiDelete(`${ADMIN}/${id}`),

  // ─── Notes ─────────────────────────────────────────────────────────────────
  updateNotes: (id: number, notes: string) =>
    apiPatch<void>(`${ADMIN}/${id}/notes`, { notes }),

  // ─── Company Actions — كلها /admin/companies/{id}/... ✅ ──────────────────
  // الخطأ القديم: كانت تستخدم /companies/{slug}/... مع _skipSlug: true
  // الصواب: api_admin.php يُعرّف هذه الـ routes تحت prefix('v1/admin')

  suspend:    (id: number, reason: string) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/suspend`,   { reason }),

  unsuspend:  (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/unsuspend`),

  activate:   (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/activate`),

  deactivate: (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/deactivate`),

  verify:     (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/verify`),

  unverify:   (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/unverify`),

  changePlan: (id: number, d: {
    plan:             string;
    max_users?:       number;
    max_products?:    number;
    max_warehouses?:  number;
  }) => apiPost<AdminCompany>(`${ADMIN}/${id}/change-plan`, d),

  // ─── Members ───────────────────────────────────────────────────────────────
  // ✅ listUsers كانت مُستخدَمة في CompanyDrawer لكن غير موجودة
  listUsers: (id: number, params?: { page?: number; per_page?: number }) =>
    apiGetPaginated<Paginated<AdminUser>>(`${ADMIN}/${id}/users`, params as any),

  addUser:    (id: number, userId: number, role?: string) =>
    apiPost(`${ADMIN}/${id}/users`, { user_id: userId, role }),

  removeUser: (id: number, userId: number) =>
    apiDelete(`${ADMIN}/${id}/users/${userId}`),

  toggleUser: (id: number, userId: number) =>
    apiPatch(`${ADMIN}/${id}/users/${userId}/toggle`, {}),

  // ─── Seed ──────────────────────────────────────────────────────────────────
  seed: (id: number) =>
    apiPost<{ message: string; applied: string[]; skipped: string[] }>(
      `${ADMIN}/${id}/seed`
    ),

} as const;

// ─── Type helpers للـ hooks ───────────────────────────────────────────────────
export type CompanyActionId =
  | { action: 'suspend';    id: number; reason: string }
  | { action: 'unsuspend';  id: number }
  | { action: 'activate';   id: number }
  | { action: 'deactivate'; id: number }
  | { action: 'verify';     id: number }
  | { action: 'unverify';   id: number };
```

## FILE: resources/js/lib/api/admin/index.ts
```
// lib/api/admin/index.ts
export { apiGetPaginated }                                         from './client';
export { companiesApi }                                            from './companies';
export { usersApi, impersonateApi }                                from './users';
export { dashboardApi, plansApi, settingsApi, maintenanceApi, systemBootApi, activityApi } from './system';
```

## FILE: resources/js/lib/api/admin/system.ts
```
// lib/api/admin/system.ts
import { apiGet, apiPost, apiPut } from '@/lib/api/core/client';
import { apiGetPaginated }         from './client';
import type {
  AdminDashboardStats,
  AdminPlan,
  ActivityLog,
  Paginated,
  SystemSettings,
} from '@/types/admin';

export const dashboardApi = {
  get: () => apiGet<AdminDashboardStats>('/admin/dashboard'),
} as const;

export const plansApi = {
  list: () => apiGet<AdminPlan[]>('/admin/plans'),
  show: (key: string) => apiGet<AdminPlan>(`/admin/plans/${key}`),
} as const;

export const settingsApi = {
  get:    ()                             => apiGet<SystemSettings>('/admin/system/settings'),
  update: (d: Partial<SystemSettings>)  => apiPut<SystemSettings>('/admin/system/settings', d),
} as const;

export const maintenanceApi = {
  status:    ()              => apiGet<{ maintenance_mode: boolean; message?: string }>('/admin/system/maintenance'),
  enable:    (msg?: string)  => apiPost('/admin/system/maintenance/enable',   { message: msg }),
  disable:   ()              => apiPost('/admin/system/maintenance/disable'),
  cache:     ()              => apiPost('/admin/system/maintenance/cache-clear'),
  scheduler: ()              => apiPost<{ message: string }>('/admin/system/maintenance/scheduler'),
  backup:    ()              => apiPost<{ message: string; path?: string }>('/admin/system/maintenance/backup'),
} as const;

export const systemBootApi = {
  status:      () => apiGet<{ is_ready: boolean; components: any[] }>('/admin/system/status'),
  boot:        () => apiPost('/admin/system/boot'),
  bootWilayas: () => apiPost('/admin/system/boot/wilayas'),
  bootPerms:   () => apiPost('/admin/system/boot/permissions'),
} as const;

export const activityApi = {
  list: (p?: {
    search?:    string;
    event?:     string;
    date_from?: string;
    date_to?:   string;
    page?:      number;
    per_page?:  number;
  }) => apiGetPaginated<Paginated<ActivityLog>>('/admin/activity-log', p as any),
  show: (id: number) => apiGet<ActivityLog>(`/admin/activity-log/${id}`),
} as const;
```

## FILE: resources/js/lib/api/admin/users.ts
```
// lib/api/admin/users.ts
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import { apiGetPaginated }                    from './client';
import type { AdminUser, AdminCompany, Paginated, AdminUsersFilter } from '@/types/admin';

const BASE = '/admin/users';

export const usersApi = {
  // Paginated
  list: (f?: AdminUsersFilter) => apiGetPaginated<Paginated<AdminUser>>(BASE, f as any),

  // Single / mutation
  show:          (id: number)                                    => apiGet<AdminUser>(`${BASE}/${id}`),
  create:        (d: Partial<AdminUser> & { password?: string }) => apiPost<AdminUser>(BASE, d),
  update:        (id: number, d: Partial<AdminUser>)             => apiPut<AdminUser>(`${BASE}/${id}`, d),
  remove:        (id: number)                                    => apiDelete(`${BASE}/${id}`),
  toggleActive:  (id: number)                                    => apiPost<AdminUser>(`${BASE}/${id}/toggle-active`),
  resetPassword: (id: number, password: string)                  =>
    apiPost(`${BASE}/${id}/reset-password`, { password, password_confirmation: password }),
  companies:     (id: number)                                    => apiGet<AdminCompany[]>(`${BASE}/${id}/companies`),
} as const;

export const impersonateApi = {
  start: (id: number) => apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${id}`),
  stop:  ()           => apiPost('/admin/impersonate/stop'),
} as const;
```

## FILE: resources/js/lib/api/core/client.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/client.ts — النسخة النهائية المُصلحة
// ════════════════════════════════════════════════════════════════════════════
import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// ─── Slug getter ──────────────────────────────────────────────────────────────
let _getSlug: () => string | null = () => null;
export function connectSlugToInterceptor(getter: () => string | null): void {
  _getSlug = getter;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ApiErrorPayload {
  message: string;
  code?:   string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code:   string,
    public readonly errors: Record<string, string[]>,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  hasFieldError = (f: string) => f in this.errors;
  fieldError    = (f: string) => this.errors[f]?.[0];
}

function makeError(status: number, p?: ApiErrorPayload): ApiError {
  return new ApiError(
    status,
    p?.code   ?? 'UNKNOWN',
    p?.errors ?? {},
    p?.message ?? 'حدث خطأ غير متوقع',
  );
}

// ─── Token ────────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'auth_token';
export const tokenStorage = {
  get:   () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set:   (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch {} },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} },
};
export const setAuthToken   = tokenStorage.set;
export const clearAuthToken = tokenStorage.clear;
export const getAuthToken   = tokenStorage.get;

// ─── PUBLIC PATHS (الوحيدة التي لا تحتاج slug) ───────────────────────────────
//
// مصدر الحقيقة: api.php
//
// ✅ بدون slug (خارج {company}):
//    /auth/*        — تسجيل دخول/خروج
//    /companies/*   — إدارة الشركات
//    /admin/*       — Super Admin
//    /wilayas/*     — قراءة فقط (global)
//    /communes/*    — قراءة فقط (global)
//
// ❌ كل شيء آخر يحتاج slug حتى:
//    currencies, tvas, units, families, brands, document-types,
//    document-statuses, genders, legal-forms, party-types ...إلخ
//    لأنها كلها داخل: Route::prefix('{company}')
//
const TRULY_PUBLIC: readonly string[] = [
  '/auth',
  '/companies',
  '/admin',
  '/wilayas',
  '/communes',
];

const isPublicPath = (url: string): boolean => {
  const path = url.split('?')[0];
  return TRULY_PUBLIC.some(p => path === p || path.startsWith(p + '/'));
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

const client: AxiosInstance = axios.create({
  baseURL:         API_BASE,
  timeout:         30_000,
  withCredentials: false,
  headers: {
    'Content-Type':     'application/json',
    'Accept':           'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? '';
    const slug = _getSlug();

    // ✅ إذا كان الطلب يحوي _skipSlug == true، لا تعدل المسار
    if ((config as any)._skipSlug) {
      delete (config as any)._skipSlug;
      // لا نضيف slug، ونستخدم المسار كما هو
    } else if (!isPublicPath(url) && slug) {
      if (!url.startsWith(`/${slug}/`) && url !== `/${slug}`) {
        config.url = `/${slug}${url.startsWith('/') ? url : '/' + url}`;
      }
   } else if (!isPublicPath(url) && !slug && import.meta.env.DEV) {
  // لا نُحذِّر إذا كان الـ URL يحتوي على slug بالفعل (مثل FiscalYearModal)
  const urlAlreadyHasSlug = /^\/[a-z0-9-]+-[a-f0-9]+\//.test(url);
  if (!urlAlreadyHasSlug) {
    console.warn(`⚠️ Tenant request without slug: ${config.method?.toUpperCase()} ${url}`);
  }
}

    const token = tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (slug)  config.headers['X-Company-Slug'] = slug;
    if (config.data instanceof FormData) config.timeout = 60_000;

    return config;
  },
  (e) => Promise.reject(e),
);

// ─── Response interceptor ─────────────────────────────────────────────────────
let _isRefreshing = false;
let _queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (err: unknown, token: string | null) => {
  _queue.forEach(i => err || !token ? i.reject(err) : i.resolve(token!));
  _queue = [];
};

function forcedLogout(): void {
  tokenStorage.clear();
  try { sessionStorage.clear(); } catch {}
  const ret = window.location.pathname !== '/login'
    ? window.location.pathname + window.location.search : '/dashboard';
  window.location.href = `/login?return=${encodeURIComponent(ret)}`;
}

client.interceptors.response.use(
  r => r,
  async (error: AxiosError<ApiErrorPayload>) => {
    const req    = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const data   = error.response?.data;

    if (status === 401) {
      if (window.location.pathname === '/login') return Promise.reject(makeError(401, data));
      if (req._retry) { forcedLogout(); return Promise.reject(makeError(401, data)); }
      if (_isRefreshing)
        return new Promise<string>((res, rej) => _queue.push({ resolve: res, reject: rej }))
          .then(t => { req.headers.Authorization = `Bearer ${t}`; return client(req); });
      _isRefreshing = req._retry = true;
      try { throw new Error('no_refresh'); }
      catch { processQueue(new Error('expired'), null); forcedLogout(); return Promise.reject(makeError(401, { message: 'انتهت الجلسة' })); }
      finally { _isRefreshing = false; }
    }

    if (status === 403) {
      const code = data?.code;
      if (code === 'COMPANY_SUSPENDED' || code === 'COMPANY_INACTIVE') {
        try { sessionStorage.removeItem('app-store'); } catch {}
        if (window.location.pathname !== '/onboarding') window.location.href = '/onboarding';
      }
      return Promise.reject(makeError(403, data));
    }

    if (status === 404) return Promise.reject(makeError(404, { message: 'المورد غير موجود',                           code: 'NOT_FOUND' }));
    if (status === 405) return Promise.reject(makeError(405, { message: 'الإجراء غير مدعوم على هذا المسار',           code: 'METHOD_NOT_ALLOWED' }));
    if (status === 422) return Promise.reject(makeError(422, data));
    if (status === 429) return Promise.reject(makeError(429, { message: 'تجاوزت الحد المسموح',                        code: 'RATE_LIMITED' }));
    if (status && status >= 500) return Promise.reject(makeError(status, { message: data?.message ?? 'خطأ في الخادم', code: 'SERVER_ERROR' }));
    if (!error.response) return Promise.reject(makeError(0, {
      message: error.code === 'ECONNABORTED' ? 'انتهت مهلة الطلب' : 'لا يوجد اتصال',
      code:    error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
    }));

    return Promise.reject(makeError(status ?? 0, data));
  },
);

// ─── extractData ──────────────────────────────────────────────────────────────
export function extractData<T>(response: { data: unknown }): T {
  const outer = response?.data;
  if (Array.isArray(outer)) return outer as T;
  if (outer !== null && typeof outer === 'object') {
    const obj = outer as Record<string, unknown>;
    if ('data' in obj) {
      const inner = obj.data;
      if (Array.isArray(inner)) return inner as T;
      if (inner !== null && typeof inner === 'object') {
        const io = inner as Record<string, unknown>;
        if ('data' in io && 'meta' in io) return inner as T; // Paginated
        return inner as T;
      }
      if (inner !== undefined) return inner as T;
    }
    return outer as T;
  }
  return (outer ?? null) as T;
}

// ─── In-flight dedup ──────────────────────────────────────────────────────────
const _pending = new Map<string, Promise<unknown>>();
const reqKey   = (m: string, u: string, p?: unknown) => `${m}::${u}::${JSON.stringify(p ?? {})}`;

// ─── Typed API wrappers ───────────────────────────────────────────────────────
export interface LaravelResponse<T> { data: T; meta?: unknown; links?: unknown; }

export async function apiGet<T>(url: string, params?: Record<string, unknown>, cfg?: AxiosRequestConfig): Promise<T> {
  const key = reqKey('GET', url, params);
  const hit = _pending.get(key);
  if (hit) return hit as Promise<T>;
  const p = client.get<LaravelResponse<T>>(url, { params, ...cfg })
    .then(r => extractData<T>(r))
    .finally(() => _pending.delete(key));
  _pending.set(key, p);
  return p;
}

export const apiPost   = <T>(url: string, data?: unknown, cfg?: AxiosRequestConfig): Promise<T> =>
  client.post<LaravelResponse<T>>(url, data, cfg).then(r => extractData<T>(r));

export const apiPut    = <T>(url: string, data?: unknown, cfg?: AxiosRequestConfig): Promise<T> =>
  client.put<LaravelResponse<T>>(url, data, cfg).then(r => extractData<T>(r));

export const apiPatch  = <T>(url: string, data?: unknown, cfg?: AxiosRequestConfig): Promise<T> =>
  client.patch<LaravelResponse<T>>(url, data, cfg).then(r => extractData<T>(r));

export const apiDelete = (url: string, cfg?: AxiosRequestConfig): Promise<void> =>
  client.delete(url, cfg).then(() => undefined);

export const apiUpload = <T>(url: string, fd: FormData, onProgress?: (p: number) => void): Promise<T> =>
  client.post<LaravelResponse<T>>(url, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
    onUploadProgress: e => { if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100)); },
  }).then(r => extractData<T>(r));

export default client;
```

## FILE: resources/js/lib/api/core/queryClient.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/queryClient.ts
// React Query Client — إعدادات مُحسَّنة للأداء
// ════════════════════════════════════════════════════════════════════════════

import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { ApiError } from './client';

// ─── Constants ────────────────────────────────────────────────────────────────

const MINUTE = 60_000;

// ─── Global error handler ─────────────────────────────────────────────────────

function onGlobalError(error: unknown): void {
  if (error instanceof ApiError) {
    // 401 يُعالَج في الـ Interceptor مباشرة
    if (error.status === 401) return;

    if (import.meta.env.DEV) {
      console.error(`[API ${error.status}] ${error.message}`, error.errors);
    }
  }
}

// ─── QueryClient instance ─────────────────────────────────────────────────────

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onGlobalError,
  }),

  mutationCache: new MutationCache({
    onError: onGlobalError,
  }),

  defaultOptions: {
    queries: {
      staleTime:            10 * MINUTE,
      gcTime:               30 * MINUTE,
      // ✅ refetchOnMount: true — ضروري حتى يعمل invalidateQueries بشكل صحيح
      // بدونه: بعد mutation + invalidate، القائمة لا تتحدث لأن الـ component لم يُعد mount
      refetchOnMount:       true,
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
      // إعادة المحاولة مرة واحدة فقط — بسرعة
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          // لا إعادة محاولة لأخطاء العميل
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },

    mutations: {
      retry: false,
    },
  },
});

// ─── Cache invalidation helpers ───────────────────────────────────────────────

/**
 * إبطال كل كاش شركة معينة عند تبديل الشركة النشطة
 */
export function invalidateCompanyCache(slug: string): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [slug] });
}

/**
 * إزالة كل بيانات الـ tenant من الكاش عند تسجيل الخروج
 */
export function clearAllCache(): void {
  queryClient.clear();
}

export default queryClient;
```

## FILE: resources/js/lib/api/core/queryKeys.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/queryKeys.ts — النسخة النهائية
//
// قاعدة التصنيف (مستخرجة من api.php):
//   globalKeys  → wilayas, communes فقط (خارج {company} تماماً)
//   tenantKeys  → كل شيء آخر (داخل /{slug}/...)
// ════════════════════════════════════════════════════════════════════════════

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authKeys = {
  all: ['auth']        as const,
  me:  ['auth', 'me'] as const,
} as const;

// ─── Companies ────────────────────────────────────────────────────────────────
export const companyKeys = {
  all:    ['companies']                                               as const,
  list:   (p?: Record<string, unknown>) => ['companies', 'list', p]  as const,
  detail: (id: number)                   => ['companies', id]         as const,
  mine:   ['companies', 'mine']                                       as const,
} as const;

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  companies: {
    list:   (p?: Record<string, unknown>) => ['admin', 'companies', 'list', p] as const,
    detail: (id: number)                   => ['admin', 'companies', id]        as const,
    users:  (id: number)                   => ['admin', 'companies', id, 'users'] as const,
  },
  users: {
    list:   (p?: Record<string, unknown>) => ['admin', 'users', 'list', p] as const,
    detail: (id: number)                   => ['admin', 'users', id]        as const,
  },
  plans:    ['admin', 'plans']    as const,
  activity: (p?: Record<string, unknown>) => ['admin', 'activity', p] as const,
  settings: ['admin', 'settings'] as const,
} as const;

// ─── GLOBAL Lookups ───────────────────────────────────────────────────────────
// فقط wilayas و communes — تُرسَل بدون slug
export const globalKeys = {
  wilayas:  ['global', 'wilayas']                         as const,
  communes: (wilayaId: number) => ['global', 'communes', wilayaId] as const,
} as const;

// ─── TENANT keys ──────────────────────────────────────────────────────────────
// كل شيء آخر — يُرسَل مع /{slug}/
export const tenantKeys = {

  // ── Lookups (tenant) ────────────────────────────────────────────────────────
  // currencies, tvas, units, families, brands, document-types, genders ... إلخ
  // كلها داخل /{slug}/ في api.php
  lookups: {
    all:                (slug: string) => [slug, 'lookups']                           as const,
    currencies:         (slug: string) => [slug, 'lookups', 'currencies']             as const,
    tvas:               (slug: string) => [slug, 'lookups', 'tvas']                   as const,
    units:              (slug: string) => [slug, 'lookups', 'units']                  as const,
    families:           (slug: string) => [slug, 'lookups', 'families']               as const,
    brands:             (slug: string) => [slug, 'lookups', 'brands']                 as const,
    priceLevels:        (slug: string) => [slug, 'lookups', 'price-levels']           as const,
    warehouses:         (slug: string) => [slug, 'lookups', 'warehouses']             as const,
    paymentModes:       (slug: string) => [slug, 'lookups', 'payment-modes']          as const,
    exchangeRates:      (slug: string) => [slug, 'lookups', 'exchange-rates']         as const,
    expenseCategories:  (slug: string) => [slug, 'lookups', 'expense-categories']     as const,
    documentTypes:      (slug: string) => [slug, 'lookups', 'document-types']         as const,
    documentStatuses:   (slug: string) => [slug, 'lookups', 'document-statuses']      as const,
    documentBaseOps:    (slug: string) => [slug, 'lookups', 'document-base-operations'] as const,
    fiscalStamps:       (slug: string) => [slug, 'lookups', 'fiscal-stamps']          as const,
    genders:            (slug: string) => [slug, 'lookups', 'genders']                as const,
    legalForms:         (slug: string) => [slug, 'lookups', 'legal-forms']            as const,
    partyTypes:         (slug: string) => [slug, 'lookups', 'party-types']            as const,
    productTypes:       (slug: string) => [slug, 'lookups', 'product-types']          as const,
    treasuryAccountTypes:(slug: string)=> [slug, 'lookups', 'treasury-account-types'] as const,
    stockMovementTypes: (slug: string) => [slug, 'lookups', 'stock-movement-types']   as const,
    valuationMethods:   (slug: string) => [slug, 'lookups', 'inventory-valuation-methods'] as const,
    numberingSeries:    (slug: string) => [slug, 'lookups', 'numbering-series']       as const,
    treasuryAccounts:   (slug: string) => [slug, 'lookups', 'treasury-accounts']      as const,
    roles:              (slug: string) => [slug, 'lookups', 'roles']                  as const,
  },

  // ── Fiscal Years ──────────────────────────────────────────────────────────
  fiscalYears: {
    all:    (slug: string) => [slug, 'fiscal-years']                                   as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'fiscal-years', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'fiscal-years', id]                   as const,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    stats:  (slug: string, yearId: number) => [slug, 'dashboard', 'stats', yearId]    as const,
    chart:  (slug: string, p: string)      => [slug, 'dashboard', 'chart', p]         as const,
    all:    (slug: string)                 => [slug, 'dashboard']                      as const,
  },

  // ── Parties ───────────────────────────────────────────────────────────────
  parties: {
    all:    (slug: string) => [slug, 'parties']                                        as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'parties', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'parties', id]                        as const,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    all:    (slug: string) => [slug, 'products']                                       as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'products', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'products', id]                       as const,
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  documents: {
    all:    (slug: string) => [slug, 'documents']                                      as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'documents', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'documents', id]                      as const,
    byType: (slug: string, code: string, p?: Record<string, unknown>) => [slug, 'documents', code, p] as const,
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: {
    all:  (slug: string) => [slug, 'payments']                                         as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'payments', 'list', p] as const,
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  expenses: {
    all:  (slug: string) => [slug, 'expenses']                                         as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'expenses', 'list', p] as const,
  },


  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    all:       (slug: string)                              => [slug, 'inventory']                            as const,
    list:      (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'list', p]                as const,
    movements: (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'movements', p]           as const,
    stock:     (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'stock', p]               as const,
    lots:      (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'lots', p]                as const,
  },

  // ── Users & Roles ─────────────────────────────────────────────────────────
  users: {
    all:  (slug: string) => [slug, 'users']                                            as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'users', 'list', p]   as const,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    tva:   (slug: string, yearId: number) => [slug, 'reports', 'tva', yearId]          as const,
    debts: (slug: string)                 => [slug, 'reports', 'debts']                as const,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    current: (slug: string) => [slug, 'settings']                                      as const,
  },

} as const;
```

## FILE: resources/js/lib/api/core/types.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/types.ts
// ✅ مطابق 100% لـ DB schema وباكاند Laravel
// ════════════════════════════════════════════════════════════════════════════

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
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
export interface PaginationLinks {
  first:   string | null;
  last:    string | null;
  prev:    string | null;
  next:    string | null;
  current: string | null;
}
export interface PaginatedResponse<T> {
  data:  T[];
  meta:  PaginationMeta;
  links: PaginationLinks;
}

// ─── Common ───────────────────────────────────────────────────────────────────
export interface BaseModel {
  id:         number;
  created_at: string;
  updated_at: string;
}
export interface ListParams {
  page?:      number;
  per_page?:  number;
  search?:    string;
  sort?:      string;
  direction?: 'asc' | 'desc';
  include?:   string;
  [key: string]: unknown;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginCredentials { email: string; password: string; }
export interface AuthResponse     { user: User; token: string; }

export interface User extends BaseModel {
  name:        string;
  email:       string;
  avatar?:     string | null;
  phone?:      string | null;
  company_id?: number | null;  // آخر شركة نشطة
  active:      boolean;
  roles?:      Role[];
  permissions?: string[];
}

// ─── Active Company (Zustand state only) ──────────────────────────────────────
export interface ActiveCompany {
  id:   number;
  name: string;
  slug: string;
}

// ─── Company ──────────────────────────────────────────────────────────────────
export interface Company extends BaseModel {
  name:             string;
  commercial_name?: string | null;
  slug:             string;
  activity?:        string | null;
  email?:           string | null;
  phone?:           string | null;
  address?:         string | null;
  avatar?:          string | null;
  nif?:             string | null;
  nis?:             string | null;
  rc?:              string | null;
  ai?:              string | null;
  owner_id:         number;
  active:           boolean;
  plan:             'free' | 'starter' | 'professional' | 'enterprise';
  max_users:        number;
  max_products:     number;
  max_warehouses:   number;
  is_suspended:     boolean;
  is_verified:      boolean;
  trial_ends_at?:   string | null;
  owner?:           Pick<User, 'id' | 'name' | 'email'>;
}

// ─── Fiscal Year ──────────────────────────────────────────────────────────────
export interface FiscalYear extends BaseModel {
  name:       string;
  start_date: string;
  end_date:   string;
  is_current: boolean;
  is_closed:  boolean;
  closed_at?: string | null;
  closed_by?: number | null;
  notes?:     string | null;
  company_id: number;
  closedBy?:  Pick<User, 'id' | 'name'>;
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────
export interface Permission extends BaseModel {
  name:          string;
  display_name:  string;
  group:         string;
  description?:  string | null;
}
export interface Role extends BaseModel {
  name:          string;
  display_name:  string;
  description?:  string | null;
  company_id?:   number | null;
  permissions?:  Permission[];
}

// ─── Global Lookups ───────────────────────────────────────────────────────────
export interface Currency extends BaseModel {
  name:             string;
  code:             string;
  symbol:           string;
  decimal_places:   number;
  is_base_currency: boolean;
  active:           boolean;
  company_id:       number;
}
export interface Tva extends BaseModel {
  name:        string;
  rate:        number;
  description?: string | null;
  is_default:  boolean;
  active:      boolean;
  company_id:  number;
}
export interface LegalForm extends BaseModel {
  name: string; code?: string;
}
export interface FiscalStamp extends BaseModel {
  name: string; value: number; is_default: boolean; company_id: number;
}
export interface InventoryValuationMethod extends BaseModel {
  name: string; code: 'FIFO' | 'LIFO' | 'AVERAGE';
}
export interface Wilaya extends BaseModel {
  name: string; arabic_name: string; code: string;
}
export interface Commune extends BaseModel {
  name: string; arabic_name: string; wilaya_id: number;
}
export interface DocumentStatus extends BaseModel {
  name: string; code: string; color?: string | null; is_final: boolean;
}
export interface DocumentType extends BaseModel {
  name:                    string;
  code:                    string;
  base_operation_id:       number;
  affects_stock_direction: -1 | 0 | 1;
  requires_party:          boolean;
  affects_accounting:      boolean;
  active:                  boolean;
}
export interface DocumentBaseOperation extends BaseModel {
  name: string; code: string;
}
export interface StockMovementType extends BaseModel {
  name: string; code: string; direction: 'in' | 'out';
}
export interface ProductType extends BaseModel {
  name: string; code: string; manages_stock: boolean;
}
export interface PartyType extends BaseModel {
  name: string; code: string;
}
export interface TreasuryAccountType extends BaseModel {
  name: string; code: string;
}

// ─── Tenant Lookups ───────────────────────────────────────────────────────────
export interface Unit extends BaseModel {
  name:          string;
  abbreviation:  string;
  description?:  string | null;
  active:        boolean;
  company_id:    number;
}
export interface Warehouse extends BaseModel {
  name:          string;
  code?:         string | null;
  address?:      string | null;
  wilaya_id?:    number | null;
  commune_id?:   number | null;
  manager_name?: string | null;
  phone?:        string | null;
  active:        boolean;
  is_default:    boolean;
  company_id:    number;
}
export interface PriceLevel extends BaseModel {
  name:              string;
  discount_percent:  number;
  description?:      string | null;
  is_default:        boolean;
  active:            boolean;
  company_id:        number;
}
export interface PaymentMode extends BaseModel {
  name:       string;
  code:       string;
  is_default: boolean;
  active:     boolean;
  company_id: number;
}
export interface NumberingSeries extends BaseModel {
  name:               string;
  prefix:             string;
  suffix?:            string | null;
  start_number:       number;
  last_number:        number;
  padding:            number;
  document_type_id:   number;
  fiscal_year_id?:    number | null;
  is_locked:          boolean;
  is_default:         boolean;
  company_id:         number;
}
export interface TreasuryAccount extends BaseModel {
  name:                    string;
  code:                    string;
  account_number?:         string | null;
  bank_name?:              string | null;
  is_default:              boolean;
  active:                  boolean;
  current_balance:         number;
  initial_balance:         number;
  currency_id:             number;
  treasury_account_type_id:number;
  company_id:              number;
  currency?:               Currency;
  account_type?:           TreasuryAccountType;
}
export interface ExpenseCategory extends BaseModel {
  name:        string;
  description?: string | null;
  parent_id?:  number | null;
  active:      boolean;
  company_id:  number;
  parent?:     ExpenseCategory;
  children?:   ExpenseCategory[];
}
export interface Brand extends BaseModel {
  name:         string;
  description?: string | null;
  active:       boolean;
  company_id:   number;
}
export interface Family extends BaseModel {
  name:          string;
  description?:  string | null;
  parent_id?:    number | null;
  active:        boolean;
  display_order: number;
  company_id:    number;
  parent?:       Family;
  children?:     Family[];
}

// ─── Parties ──────────────────────────────────────────────────────────────────
export interface Party extends BaseModel {
  name:                   string;
  commercial_name?:       string | null;
  code?:                  string | null;
  slug:                   string;
  party_type_id:          number;
  nif?:                   string | null;
  nis?:                   string | null;
  rc?:                    string | null;
  ai?:                    string | null;
  address?:               string | null;
  wilaya_id?:             number | null;
  commune_id?:            number | null;
  phone?:                 string | null;
  mobile?:                string | null;
  email?:                 string | null;
  initial_balance:        number;
  credit_limit:           number;
  credit_days?:           number | null;
  default_price_level_id?:number | null;
  is_tva_exempt:          boolean;
  active:                 boolean;
  company_id:             number;
  // Relations
  party_type?:            PartyType;
  default_price_level?:   PriceLevel;
  // Computed
  balance?:               number;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface ProductVariantPrice extends BaseModel {
  product_variant_id: number;
  price_level_id:     number;
  price:              number;
  valid_from?:        string | null;
  valid_to?:          string | null;
  active:             boolean;
  price_level?:       PriceLevel;
}

export interface QuantityDiscount extends BaseModel {
  product_variant_id:  number;
  min_quantity:        number;
  max_quantity?:       number | null;
  discount_percentage?:number | null;
  discount_per_unit?:  number | null;
  tier_order:          number;
  active:              boolean;
}

export interface ProductLot extends BaseModel {
  product_variant_id:    number;
  warehouse_id:          number;
  lot_number:            string;
  supplier_lot_number?:  string | null;
  manufacturing_date?:   string | null;
  expiration_date?:      string | null;
  purchase_date?:        string | null;
  purchase_price?:       number | null;
  legal_selling_price?:  number | null;
  original_quantity:     number;
  remaining_quantity:    number;
  active:                boolean;
  company_id:            number;
}

export interface ProductVariant extends BaseModel {
  product_id:                number;
  ref:                       string;
  barcode?:                  string | null;
  variant_name?:             string | null;
  unit_id?:                  number | null;
  tva_id?:                   number | null;
  valuation_method_id?:      number | null;
  weight?:                   number | null;
  volume?:                   number | null;
  length?:                   number | null;
  width?:                    number | null;
  height?:                   number | null;
  variant_attributes?:       Record<string, string>;
  last_purchase_price:       number;
  average_cost_price:        number;
  default_selling_price_ht:  number;
  manages_stock:             boolean;
  allow_negative_stock:      boolean;
  has_lots:                  boolean;
  has_expiration_date:       boolean;
  min_stock_alert:           number;
  max_stock_alert?:          number | null;
  manages_quantity_discounts:boolean;
  active:                    boolean;
  company_id:                number;
  // Relations
  product?:            Product;
  unit?:               Unit;
  tva?:                Tva;
  prices?:             ProductVariantPrice[];
  quantity_discounts?: QuantityDiscount[];
  lots?:               ProductLot[];
  // Computed
  current_stock?:      number;
  selling_price_ttc?:  number;
}

export interface Product extends BaseModel {
  name:             string;
  slug:             string;
  description?:     string | null;
  family_id?:       number | null;
  brand_id?:        number | null;
  product_type_id?: number | null;
  images?:          string[] | null;
  specifications?:  Record<string, string> | null;
  meta_title?:      string | null;
  meta_description?:string | null;
  active:           boolean;
  company_id:       number;
  // Relations
  family?:      Family;
  brand?:       Brand;
  productType?: ProductType;
  variants?:    ProductVariant[];
}

// ─── Commercial Documents ─────────────────────────────────────────────────────
export type DocumentStatusCode =
  | 'draft' | 'validated' | 'partial' | 'paid' | 'cancelled' | 'locked';

export interface CommercialDocumentLine extends BaseModel {
  commercial_document_id: number;
  product_variant_id?:    number | null;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage:    number;
  discount_amount:        number;
  tva_rate:               number;
  total_ht:               number;
  total_tva:              number;
  total_ttc:              number;
  line_order:             number;
  // Relations
  product_variant?: ProductVariant;
}

export interface CommercialDocument extends BaseModel {
  // ✅ أسماء الحقول من DB مباشرة
  document_type_id:   number;
  document_number:    string;
  party_id?:          number | null;
  warehouse_id:       number;
  fiscal_year_id:     number;
  document_date:      string;
  due_date?:          string | null;
  status:             DocumentStatusCode;
  notes?:             string | null;
  // Amounts
  total_ht:           number;
  total_tva:          number;
  total_ttc:          number;
  total_discount:     number;
  fiscal_stamp:       number;
  amount_paid:        number;
  amount_remaining:   number;
  is_locked:          boolean;
  company_id:         number;
  // Relations
  document_type?: DocumentType;
  party?:         Party;
  warehouse?:     Warehouse;
  fiscal_year?:   FiscalYear;
  lines?:         CommercialDocumentLine[];
  payments?:      Payment[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Payment extends BaseModel {
  commercial_document_id: number;
  payment_mode_id:        number;
  treasury_account_id?:   number | null;
  amount:                 number;
  payment_date:           string;
  reference?:             string | null;
  notes?:                 string | null;
  status:                 PaymentStatus;
  company_id:             number;
  fiscal_year_id:         number;
  // Relations
  payment_mode?:      PaymentMode;
  treasury_account?:  TreasuryAccount;
  document?:          CommercialDocument;
}

// ─── Checks ───────────────────────────────────────────────────────────────────
export type CheckStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled';
export interface Check extends BaseModel {
  commercial_document_id: number;
  party_id:               number;
  amount:                 number;
  check_number:           string;
  check_date:             string;
  bank_name?:             string | null;
  status:                 CheckStatus;
  notes?:                 string | null;
  company_id:             number;
  party?:                 Party;
}

// ─── Stock Movements ──────────────────────────────────────────────────────────
export interface StockMovement extends BaseModel {
  product_variant_id:       number;
  warehouse_id:             number;
  fiscal_year_id:           number;
  stock_movement_type_id:   number;
  commercial_document_id?:  number | null;
  movement_date:            string;
  quantity:                 number;
  unit_price:               number;
  cost_price:               number;
  total_price:              number;
  notes?:                   string | null;
  company_id:               number;
  product_variant?:         ProductVariant;
  warehouse?:               Warehouse;
  movement_type?:           StockMovementType;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export type ExpenseStatus = 'unpaid' | 'partial' | 'paid';
export interface Expense extends BaseModel {
  expense_category_id: number;
  party_id?:           number | null;
  amount:              number;
  amount_paid:         number;
  expense_date:        string;
  due_date?:           string | null;
  description:         string;
  status:              ExpenseStatus;
  payment_mode_id?:    number | null;
  reference?:          string | null;
  fiscal_year_id:      number;
  company_id:          number;
  expense_category?:   ExpenseCategory;
  party?:              Party;
}

// ─── Employees ────────────────────────────────────────────────────────────────
export interface Employee extends BaseModel {
  first_name:  string;
  last_name:   string;
  email?:      string | null;
  phone?:      string | null;
  position?:   string | null;
  department?: string | null;
  hire_date:   string;
  active:      boolean;
  company_id:  number;
  full_name?:  string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  today_sales:          number;
  month_sales:          number;
  month_invoices_count: number;
  pending_invoices:     number;
  new_clients_month:    number;
  total_clients:        number;
  low_stock_count:      number;
  out_of_stock_count:   number;
  month_profit:         number;
  profit_margin:        number;
  month_tva_collected:  number;
  month_tva_deductible: number;
  tva_due:              number;
  total_debts:          number;
  debtors_count:        number;
}

// ─── POS (Cart) ───────────────────────────────────────────────────────────────
export interface CartItem {
  id:                  string;   // unique cart item id (uuid)
  product_id:          number;
  variant_id:          number;
  product_name:        string;
  variant_name?:       string | null;
  ref:                 string;
  barcode?:            string | null;
  unit_symbol?:        string | null;
  quantity:            number;
  unit_price_ht:       number;
  selling_price_ttc:   number;
  tva_rate:            number;
  tva_id?:             number | null;
  discount_percentage: number;
  discount_amount:     number;
  total_ht:            number;
  total_ttc:           number;
  max_stock?:          number | null;
  manages_stock:       boolean;
}
export interface CartTotals {
  total_ht:       number;
  total_tva:      number;
  total_ttc:      number;
  total_discount: number;
  fiscal_stamp:   number;
  items_count:    number;
  lines_count:    number;
}
export interface HeldCart {
  id:        string;
  label:     string;
  items:     CartItem[];
  totals:    CartTotals;
  client?:   Party | null;
  created_at:string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface Setting extends BaseModel {
  key:          string;
  value:        string | null;
  group?:       string | null;
  type:         'string' | 'integer' | 'boolean' | 'json';
  label?:       string | null;
  description?: string | null;
  company_id:   number;
}

// ─── Seeds ────────────────────────────────────────────────────────────────────
export type SeedKey =
  | 'currencies' | 'tvas' | 'units' | 'legal-forms' | 'fiscal-stamps'
  | 'price-levels' | 'party-types' | 'product-types' | 'stock-movement-types'
  | 'treasury-account-types' | 'document-base-operations' | 'document-statuses'
  | 'document-types' | 'inventory-valuation-methods' | 'warehouses'
  | 'treasury-accounts' | 'payment-modes' | 'expense-categories'
  | 'numbering-series' | 'wilayas-communes';

export interface SeedResult {
  key:     SeedKey;
  success: boolean;
  message: string;
}

export interface Gender        extends BaseModel { name: string; code?: string; }
export interface ExchangeRate  extends BaseModel {
  currency_id: number; rate: number; date: string;
  currency?: Currency; company_id: number;
}
```

## FILE: resources/js/lib/api/endpoints/auth.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/auth.ts
// ✅ مصحح: useLogin يُعيد AuthResponse لتمكين redirect بناءً على role
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, tokenStorage } from '../core/client';
import { authKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { clearAllCache } from '../core/queryClient';
import type { User, LoginCredentials, AuthResponse } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const authApi = {
  me:     ()                        => apiGet<User>('/auth/me'),
  login:  (creds: LoginCredentials) => apiPost<AuthResponse>('/auth/login', creds),
  logout: ()                        => apiPost<void>('/auth/logout'),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey:  authKeys.me,
    queryFn:   authApi.me,
    enabled:   !!tokenStorage.get(),
    staleTime: Infinity,
    retry:     false,
  });
}

/**
 * ✅ يُعيد AuthResponse (user + token) لتمكين redirect بناءً على الدور
 *
 * مثال:
 *   const { mutateAsync: login } = useLogin();
 *   const result = await login(creds);
 *   if (result.user.roles?.some(r => r.name === 'super-admin')) {
 *     navigate('/admin');
 *   } else {
 *     navigate('/dashboard');
 *   }
 */
export function useLogin() {
  const qc = useQueryClient();

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: authApi.login,
    onSuccess: ({ user, token }) => {
      tokenStorage.set(token);
      // ✅ حفظ المستخدم مباشرة في الكاش — لا طلب /auth/me إضافي
      qc.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      tokenStorage.clear();
      appActions.reset();
      clearAllCache();
      window.location.href = '/login';
    },
  });
}
```

## FILE: resources/js/lib/api/endpoints/companies.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/companies.ts
// Companies API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { companyKeys, adminKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { invalidateCompanyCache } from '../core/queryClient';
import type { Company, ListParams, PaginatedResponse } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────

export const companiesApi = {
  // شركات المستخدم الحالي
  mine: ()                              => apiGet<Company[]>('/companies'),
  show: (slug: string)                  => apiGet<Company>(`/companies/${slug}`),

  create: (data: Partial<Company>)      => apiPost<Company>('/companies', data),
  update: (slug: string, data: Partial<Company>) =>
                                           apiPut<Company>(`/companies/${slug}`, data),

  switch: (companyId: number)           => apiPost<{ user: { company_id: number } }>(
                                            '/companies/switch', { company_id: companyId }),

  // Admin — كل الشركات
  adminList: (params?: ListParams)      => apiGet<PaginatedResponse<Company>>('/admin/companies', params),
  adminShow: (id: number)              => apiGet<Company>(`/admin/companies/${id}`),
  suspend:   (slug: string, reason?: string) =>
                                           apiPost<void>(`/admin/companies/${slug}/suspend`, { reason }),
  unsuspend: (slug: string)             => apiPost<void>(`/admin/companies/${slug}/unsuspend`),
  verify:    (slug: string)             => apiPost<void>(`/admin/companies/${slug}/verify`),
  unverify:  (slug: string)             => apiPost<void>(`/admin/companies/${slug}/unverify`),
  activate:  (slug: string)             => apiPost<void>(`/admin/companies/${slug}/activate`),
  deactivate:(slug: string)             => apiPost<void>(`/admin/companies/${slug}/deactivate`),
  changePlan:(slug: string, plan: string) =>
                                           apiPatch<void>(`/admin/companies/${slug}/change-plan`, { plan }),
  updateNotes:(slug: string, notes: string) =>
                                           apiPatch<void>(`/admin/companies/${slug}/notes`, { notes }),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * شركات المستخدم الحالي (للـ OnboardingPage)
 */
export function useMyCompanies() {
  return useQuery({
    queryKey: companyKeys.mine,
    queryFn:  companiesApi.mine,
    staleTime: 5 * 60_000,
  });
}

/**
 * تبديل الشركة النشطة
 * بعد النجاح: يُحدِّث Zustand store → الـ Interceptor يقرأ الـ slug الجديد فوراً
 */
export function useSwitchCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId }: { companyId: number; company: { id: number; name: string; slug: string } }) =>
      companiesApi.switch(companyId),

    onSuccess: (_, { company }) => {
      appActions.setActiveCompany(company);
      // إبطال كاش الشركة القديمة (لن يُعيد الجلب تلقائياً)
      qc.removeQueries({ queryKey: [company.slug] });
    },
  });
}

// ─── Admin Hooks ──────────────────────────────────────────────────────────────

export function useAdminCompanies(params?: ListParams) {
  return useQuery({
    queryKey: adminKeys.companies.list(params),
    queryFn:  () => companiesApi.adminList(params),
    staleTime: 2 * 60_000,
  });
}

type AdminAction = 'suspend' | 'unsuspend' | 'verify' | 'unverify' | 'activate' | 'deactivate';

export function useAdminCompanyAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ action, slug, payload }: {
      action:   AdminAction;
      slug:     string;
      payload?: Record<string, unknown>;
    }) => {
      switch (action) {
        case 'suspend':    return companiesApi.suspend(slug, payload?.reason as string);
        case 'unsuspend':  return companiesApi.unsuspend(slug);
        case 'verify':     return companiesApi.verify(slug);
        case 'unverify':   return companiesApi.unverify(slug);
        case 'activate':   return companiesApi.activate(slug);
        case 'deactivate': return companiesApi.deactivate(slug);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.companies.all });
      qc.invalidateQueries({ queryKey: companyKeys.mine });
    },
  });
}

export function useUpdateCompanyNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, notes }: { slug: string; notes: string }) =>
      companiesApi.updateNotes(slug, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.companies.all }),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, plan }: { slug: string; plan: string }) =>
      companiesApi.changePlan(slug, plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.companies.all }),
  });
}
```

## FILE: resources/js/lib/api/endpoints/dashboard.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/dashboard.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId } from '../../store/appStore';
import type { DashboardStats } from '../core/types';

interface SalesChartData { labels: string[]; sales: number[]; purchases: number[]; }
interface TopProduct     { id: number; name: string; quantity: number; revenue: number; }
interface TopCustomer    { id: number; name: string; total: number; count: number; }

export const dashboardApi = {
  stats:           (yearId: number) => apiGet<DashboardStats>('/dashboard', { year_id: yearId }),
  salesChart:      (period = 'monthly') => apiGet<SalesChartData>('/dashboard/sales-chart', { period }),
  topProducts:     (limit = 5)          => apiGet<TopProduct[]>('/dashboard/top-products', { limit }),
  topCustomers:    (limit = 5)          => apiGet<TopCustomer[]>('/dashboard/top-customers', { limit }),
  recentTransactions: ()                => apiGet<any[]>('/dashboard/recent-transactions'),
  inventory:       ()                   => apiGet<any>('/dashboard/inventory'),
} as const;

export function useDashboardStats() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();

  return useQuery({
    queryKey: tenantKeys.dashboard.stats(slug ?? '', yearId ?? 0),
    queryFn:  () => dashboardApi.stats(yearId!),
    enabled:  !!slug && !!yearId,
    staleTime: 2 * 60_000,
  });
}

export function useSalesChart(period = 'monthly') {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'chart', period],
    queryFn:  () => dashboardApi.salesChart(period),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useTopProducts(limit = 5) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'top-products', limit],
    queryFn:  () => dashboardApi.topProducts(limit),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useRecentTransactions() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'recent-transactions'],
    queryFn:  dashboardApi.recentTransactions,
    enabled:  !!slug,
    staleTime: 60_000,
  });
}
```

## FILE: resources/js/lib/api/endpoints/documents.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/documents.ts
// ✅ مصحح: lines endpoints + fiscal_year_id + typeCode صحيح
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type {
  CommercialDocument,
  CommercialDocumentLine,
  PaginatedResponse,
  ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentCreateInput {
  document_type_id:  number;
  party_id?:         number | null;
  warehouse_id:      number;
  fiscal_year_id:    number;           // ✅ مطلوب — يُمرَّر دائماً
  document_date:     string;
  due_date?:         string | null;
  notes?:            string | null;
  fiscal_stamp?:     number;
  lines?:            DocumentLineInput[];
}

export interface DocumentLineInput {
  id?:                    number;       // للتعديل
  product_variant_id?:    number | null;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage?:   number;
  tva_rate:               number;
}

export interface DocumentListParams extends ListParams {
  document_type_id?:  number;
  type_code?:         string;   // ✅ الاسم الصحيح
  party_id?:          number;
  status?:            string;
  fiscal_year_id?:    number;
  date_from?:         string;
  date_to?:           string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {
  // ── Documents CRUD ─────────────────────────────────────────────────────────
  list: (params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', params),

  // ✅ إصلاح: الفلتر بـ document_type_id أو type_code حسب الباكاند
  byType: (typeCode: string, params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', {
      ...params,
      'filter[document_type.code]': typeCode,  // ✅ Spatie filter الصحيح
    }),

  show: (id: number) =>
    apiGet<CommercialDocument>(`/documents/${id}`, {
      include: 'party,warehouse,documentType,lines.productVariant,payments.paymentMode',
    }),

  create: (data: DocumentCreateInput) =>
    apiPost<CommercialDocument>('/documents', data),

  update: (id: number, data: Partial<DocumentCreateInput>) =>
    apiPut<CommercialDocument>(`/documents/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/documents/${id}`),

  // ── Document Actions ───────────────────────────────────────────────────────
  validate: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/validate`),

  lock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/lock`),

  unlock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/unlock`),

  cancel: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/cancel`),

  qrcode: (id: number) =>
    apiGet<{ url: string }>(`/documents/${id}/qrcode`),

  // ── Lines ──────────────────────────────────────────────────────────────────
  // ✅ مفقودة في النسخة الأصلية — ضرورية لإضافة/تعديل سطور
  lines: {
    list: (documentId: number) =>
      apiGet<CommercialDocumentLine[]>(`/commercial-document-lines`, {
        'filter[commercial_document_id]': documentId,
      }),

    create: (data: DocumentLineInput & { commercial_document_id: number }) =>
      apiPost<CommercialDocumentLine>('/commercial-document-lines', data),

    update: (id: number, data: Partial<DocumentLineInput>) =>
      apiPut<CommercialDocumentLine>(`/commercial-document-lines/${id}`, data),

    delete: (id: number) =>
      apiDelete(`/commercial-document-lines/${id}`),
  },
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDocuments(params?: DocumentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.list(slug ?? '', params),
    queryFn:         () => documentsApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocumentsByType(typeCode: string, params?: DocumentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.byType(slug ?? '', typeCode, params),
    queryFn:         () => documentsApi.byType(typeCode, params),
    enabled:         !!slug && !!typeCode,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.documents.detail(slug ?? '', id!),
    queryFn:   () => documentsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useDocumentMutations() {
  const slug       = useActiveSlug();
  const qc         = useQueryClient();
  const { selectedYear } = useFiscalYear();

  const invalidateAll = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
  };

  const invalidateOne = (doc: CommercialDocument) => {
    if (slug) {
      qc.setQueryData(tenantKeys.documents.detail(slug, doc.id), doc);
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
  };

  // ✅ يُضيف fiscal_year_id تلقائياً من السياق
  const create = useMutation({
    mutationFn: (data: Omit<DocumentCreateInput, 'fiscal_year_id'> & { fiscal_year_id?: number }) =>
      documentsApi.create({
        ...data,
        fiscal_year_id: data.fiscal_year_id ?? selectedYear?.id ?? 0,
      }),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DocumentCreateInput> }) =>
      documentsApi.update(id, data),
    onSuccess: invalidateOne,
  });

  const remove = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess:  invalidateAll,
  });

  const validate = useMutation({
    mutationFn: documentsApi.validate,
    onSuccess:  invalidateOne,
  });

  const lock = useMutation({
    mutationFn: documentsApi.lock,
    onSuccess:  invalidateOne,
  });

  const unlock = useMutation({
    mutationFn: documentsApi.unlock,
    onSuccess:  invalidateOne,
  });

  const cancel = useMutation({
    mutationFn: documentsApi.cancel,
    onSuccess:  invalidateOne,
  });

  return { create, update, remove, validate, lock, unlock, cancel, selectedYear };
}

// ─── Line Mutations ───────────────────────────────────────────────────────────

export function useDocumentLineMutations(documentId: number) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: tenantKeys.documents.detail(slug, documentId) });
    }
  };

  const create = useMutation({
    mutationFn: (data: DocumentLineInput) =>
      documentsApi.lines.create({ ...data, commercial_document_id: documentId }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DocumentLineInput> }) =>
      documentsApi.lines.update(id, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: documentsApi.lines.delete,
    onSuccess:  invalidate,
  });

  return { create, update, remove };
}
```

## FILE: resources/js/lib/api/endpoints/expenses.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/expenses.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Expense, PaginatedResponse, ListParams } from '../core/types';

export const expensesApi = {
  list:   (params?: ListParams) => apiGet<PaginatedResponse<Expense>>('/expenses', params),
  show:   (id: number)          => apiGet<Expense>(`/expenses/${id}`),
  create: (data: Partial<Expense>) => apiPost<Expense>('/expenses', data),
  update: (id: number, data: Partial<Expense>) => apiPut<Expense>(`/expenses/${id}`, data),
  delete: (id: number)          => apiDelete(`/expenses/${id}`),
} as const;

export function useExpenses(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.expenses.list(slug ?? '', params),
    queryFn:         () => expensesApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useExpenseMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.expenses.all(slug) }); };

  return {
    create: useMutation({ mutationFn: expensesApi.create,  onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) => expensesApi.update(id, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: expensesApi.delete,  onSuccess: inv }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/fiscalYears.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/fiscalYears.ts
// ✅ مصحح: close يستخدم POST (حسب api.php) + notes + invalidate documents
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId, useAppStore } from '../../store/appStore';
import type { FiscalYear, ListParams } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const fiscalYearsApi = {
  list: (params?: ListParams) =>
    apiGet<FiscalYear[]>('/fiscal-years', { per_page: 50, ...params }),

  show: (id: number) =>
    apiGet<FiscalYear>(`/fiscal-years/${id}`),

  create: (data: Partial<FiscalYear>) =>
    apiPost<FiscalYear>('/fiscal-years', data),

  update: (id: number, data: Partial<FiscalYear>) =>
    apiPut<FiscalYear>(`/fiscal-years/${id}`, data),

  // ✅ POST حسب api.php: Route::post('fiscal-years/{year}/close', ...)
  close: (id: number, notes?: string) =>
    apiPost<FiscalYear>(`/fiscal-years/${id}/close`, { notes }),

  // ✅ patch للتعديلات العادية
  setCurrent: (id: number) =>
    apiPatch<FiscalYear>(`/fiscal-years/${id}`, { is_current: true }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFiscalYears() {
  const slug = useActiveSlug();

  return useQuery({
    queryKey:  tenantKeys.fiscalYears.all(slug ?? ''),
    queryFn:   () => fiscalYearsApi.list(),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
    // ✅ select يُحوِّل المصفوفة إلى كائن منظم
    select: (years) => ({
      years,
      current: years.find(y => y.is_current) ??
               years.find(y => !y.is_closed)  ??
               years[0] ??
               null,
      open:   years.filter(y => !y.is_closed),
      closed: years.filter(y => y.is_closed),
    }),
  });
}

/**
 * ✅ السنة المختارة: من Zustand id → يبحث في React Query cache
 */
export function useSelectedFiscalYear() {
  const selectedId = useSelectedYearId();
  const { data }   = useFiscalYears();

  if (!data) return null;
  if (!selectedId) return data.current;
  return data.years.find(y => y.id === selectedId) ?? data.current;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FiscalYear>) =>
      fiscalYearsApi.create(data),
    onSuccess: (created) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        // ✅ عيِّن السنة الجديدة تلقائياً إذا كانت الأولى
        const state = useAppStore.getState();
        if (!state.selectedYearId) {
          state.setSelectedYearId(created.id);
        }
      }
    },
  });
}

export function useUpdateFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FiscalYear> }) =>
      fiscalYearsApi.update(id, data),
    onSuccess: (updated) => {
      if (slug) {
        qc.setQueryData(tenantKeys.fiscalYears.detail(slug, updated.id), updated);
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
      }
    },
  });
}

export function useCloseFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      fiscalYearsApi.close(id, notes),
    onSuccess: () => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        // ✅ إبطال المستندات أيضاً — الإقفال يؤثر على حالتها
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        // ✅ إعادة تعيين السنة المختارة
        useAppStore.getState().setSelectedYearId(null);
      }
    },
  });
}
```

## FILE: resources/js/lib/api/endpoints/inventory.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/inventory.ts — مُصلح
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
// ✅ FIX: أضفنا apiPut
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  StockMovement, ProductLot,
  PaginatedResponse, ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockMovementCreateInput {
  product_variant_id:     number;
  warehouse_id:           number;
  fiscal_year_id:         number;
  stock_movement_type_id: number;
  movement_date:          string;
  quantity:               number;
  unit_price:             number;
  notes?:                 string | null;
}

export interface StockMovementListParams extends ListParams {
  product_variant_id?:     number;
  warehouse_id?:           number;
  stock_movement_type_id?: number;
  fiscal_year_id?:         number;
  date_from?:              string;
  date_to?:                string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const inventoryApi = {
  // ── Stock Movements ────────────────────────────────────────────────────────
  movements: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements', {
      ...params,
      include: 'productVariant.product,warehouse,movementType',
    }),

  incoming: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements/incoming', params),

  outgoing: (params?: StockMovementListParams) =>
    apiGet<PaginatedResponse<StockMovement>>('/stock-movements/outgoing', params),

  createMovement: (data: StockMovementCreateInput) =>
    apiPost<StockMovement>('/stock-movements', data),

  deleteMovement: (id: number) =>
    apiDelete(`/stock-movements/${id}`),

  // ── Product Lots ───────────────────────────────────────────────────────────
  lots: (params?: ListParams) =>
    apiGet<PaginatedResponse<ProductLot>>('/product-lots', params),

  lotAvailable: () =>
    apiGet<ProductLot[]>('/product-lots/available'),

  lotExpiring: (days = 30) =>
    apiGet<ProductLot[]>('/product-lots/expiring', { days }),

  createLot: (data: Partial<ProductLot>) =>
    apiPost<ProductLot>('/product-lots', data),

  // ✅ FIX: apiPut بدل apiPost
  updateLot: (id: number, data: Partial<ProductLot>) =>
    apiPut<ProductLot>(`/product-lots/${id}`, data),

  deleteLot: (id: number) =>
    apiDelete(`/product-lots/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useStockMovements(params?: StockMovementListParams) {
  const slug = useActiveSlug();
  return useQuery({
    // ✅ FIX: استخدام tenantKeys.inventory.movements الجديد
    queryKey:        tenantKeys.inventory.movements(slug ?? '', params),
    queryFn:         () => inventoryApi.movements(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProductLots(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.inventory.lots(slug ?? '', params),
    queryFn:         () => inventoryApi.lots(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useExpiringLots(days = 30) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'product-lots', 'expiring', days],
    queryFn:   () => inventoryApi.lotExpiring(days),
    enabled:   !!slug,
    staleTime: 10 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useInventoryMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
    // إبطال المنتجات أيضاً — الحركات تغير current_stock
    qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  return {
    createMovement: useMutation({
      mutationFn: inventoryApi.createMovement,
      onSuccess:  invalidate,
    }),
    deleteMovement: useMutation({
      mutationFn: inventoryApi.deleteMovement,
      onSuccess:  invalidate,
    }),
    createLot: useMutation({
      mutationFn: inventoryApi.createLot,
      onSuccess:  invalidate,
    }),
    updateLot: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductLot> }) =>
        inventoryApi.updateLot(id, data),
      onSuccess: invalidate,
    }),
    deleteLot: useMutation({
      mutationFn: inventoryApi.deleteLot,
      onSuccess:  invalidate,
    }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/lookups.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/lookups.ts — النسخة النهائية المُصلحة
//
// ⚠️  قاعدة أساسية مستخرجة من api.php:
//   GLOBAL (بدون slug): wilayas, communes فقط
//   TENANT (مع slug):   كل شيء آخر بما فيها:
//     currencies, tvas, units, families, brands, document-types,
//     document-statuses, document-base-operations, genders, legal-forms,
//     party-types, product-types, fiscal-stamps, treasury-account-types,
//     stock-movement-types, inventory-valuation-methods ...
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { globalKeys, tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Currency, Tva, Unit, Family, Brand, PriceLevel, Warehouse,
  PaymentMode, DocumentType, DocumentStatus, DocumentBaseOperation,
  FiscalStamp, Gender, LegalForm, PartyType, ProductType,
  TreasuryAccountType, StockMovementType, InventoryValuationMethod,
  NumberingSeries, TreasuryAccount, ExpenseCategory, ExchangeRate,
  Wilaya, Commune,
} from '../core/types';

// ─── Stale times ──────────────────────────────────────────────────────────────
const GLOBAL_STALE = Infinity;    // wilayas/communes لا تتغير أبداً
const TENANT_STALE = 10 * 60_000; // 10 دقائق

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — GLOBAL (wilayas, communes فقط)
// ══════════════════════════════════════════════════════════════════════════════

export const globalLookupsApi = {
  wilayas:  ()              => apiGet<Wilaya[]>('/wilayas',  { per_page: 500 }),
  communes: (wId: number)   => apiGet<Commune[]>(`/communes/by-wilaya/${wId}`),
  allCommunes: ()           => apiGet<Commune[]>('/communes', { per_page: 1600 }),
} as const;

export function useWilayas() {
  return useQuery<Wilaya[]>({
    queryKey: globalKeys.wilayas,
    queryFn:  globalLookupsApi.wilayas,
    staleTime: GLOBAL_STALE,
    select:   (d) => Array.isArray(d) ? d : [],
  });
}

export function useCommunes(wilayaId: number | null | undefined) {
  return useQuery<Commune[]>({
    queryKey: globalKeys.communes(wilayaId ?? 0),
    queryFn:  () => globalLookupsApi.communes(wilayaId!),
    staleTime: GLOBAL_STALE,
    enabled:  !!wilayaId,
    select:   (d) => Array.isArray(d) ? d : [],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — TENANT Lookups
// كلها تُرسَل مع /{slug}/ تلقائياً عبر الـ interceptor
// ══════════════════════════════════════════════════════════════════════════════

// ─── API functions ────────────────────────────────────────────────────────────
// الـ interceptor يُضيف slug تلقائياً — لا نحتاج تمريره هنا
export const tenantLookupsApi = {
  currencies:          () => apiGet<Currency[]>('/currencies',                    { per_page: 100 }),
  tvas:                () => apiGet<Tva[]>('/tvas',                               { per_page: 50  }),
  units:               () => apiGet<Unit[]>('/units',                             { per_page: 100 }),
  families:            () => apiGet<Family[]>('/families',                        { per_page: 100 }),
  brands:              () => apiGet<Brand[]>('/brands',                           { per_page: 100 }),
  priceLevels:         () => apiGet<PriceLevel[]>('/price-levels',               { per_page: 50  }),
  warehouses:          () => apiGet<Warehouse[]>('/warehouses',                   { per_page: 50  }),
  paymentModes:        () => apiGet<PaymentMode[]>('/payment-modes',              { per_page: 50  }),
  exchangeRates:       () => apiGet<ExchangeRate[]>('/exchange-rates',            { per_page: 50  }),
  expenseCategories:   () => apiGet<ExpenseCategory[]>('/expense-categories',     { per_page: 100 }),
  documentTypes:       () => apiGet<DocumentType[]>('/document-types',            { per_page: 50  }),
  documentStatuses:    () => apiGet<DocumentStatus[]>('/document-statuses',       { per_page: 50  }),
  documentBaseOps:     () => apiGet<DocumentBaseOperation[]>('/document-base-operations'),
  fiscalStamps:        () => apiGet<FiscalStamp[]>('/fiscal-stamps'),
  genders:             () => apiGet<Gender[]>('/genders'),
  legalForms:          () => apiGet<LegalForm[]>('/legal-forms',                 { per_page: 50  }),
  partyTypes:          () => apiGet<PartyType[]>('/party-types',                  { per_page: 50  }),
  productTypes:        () => apiGet<ProductType[]>('/product-types',              { per_page: 50  }),
  treasuryAccountTypes:() => apiGet<TreasuryAccountType[]>('/treasury-account-types'),
  stockMovementTypes:  () => apiGet<StockMovementType[]>('/stock-movement-types'),
  valuationMethods:    () => apiGet<InventoryValuationMethod[]>('/inventory-valuation-methods'),
  numberingSeries:     () => apiGet<NumberingSeries[]>('/numbering-series',       { per_page: 50  }),
  treasuryAccounts:    () => apiGet<TreasuryAccount[]>('/treasury-accounts',      { per_page: 50  }),
} as const;

// ─── Hook factory ─────────────────────────────────────────────────────────────
function useTenantLookup<T>(
  keyFn: (slug: string) => readonly unknown[],
  apiFn: () => Promise<T[]>,
  enabled = true,
) {
  const slug = useActiveSlug();
  return useQuery<T[]>({
    queryKey: keyFn(slug ?? ''),
    queryFn:  apiFn,
    enabled:  !!slug && enabled,
    staleTime: TENANT_STALE,
    select:   (d) => Array.isArray(d) ? d : [],
  });
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export const useCurrencies          = () => useTenantLookup(tenantKeys.lookups.currencies,          tenantLookupsApi.currencies);
export const useTvas                = () => useTenantLookup(tenantKeys.lookups.tvas,                tenantLookupsApi.tvas);
export const useUnits               = () => useTenantLookup(tenantKeys.lookups.units,               tenantLookupsApi.units);
export const useFamilies            = () => useTenantLookup(tenantKeys.lookups.families,            tenantLookupsApi.families);
export const useBrands              = () => useTenantLookup(tenantKeys.lookups.brands,              tenantLookupsApi.brands);
export const usePriceLevels         = () => useTenantLookup(tenantKeys.lookups.priceLevels,         tenantLookupsApi.priceLevels);
export const useWarehouses          = () => useTenantLookup(tenantKeys.lookups.warehouses,          tenantLookupsApi.warehouses);
export const usePaymentModes        = () => useTenantLookup(tenantKeys.lookups.paymentModes,        tenantLookupsApi.paymentModes);
export const useExchangeRates       = () => useTenantLookup(tenantKeys.lookups.exchangeRates,       tenantLookupsApi.exchangeRates);
export const useExpenseCategories   = () => useTenantLookup(tenantKeys.lookups.expenseCategories,   tenantLookupsApi.expenseCategories);
export const useDocumentTypes       = () => useTenantLookup(tenantKeys.lookups.documentTypes,       tenantLookupsApi.documentTypes);
export const useDocumentStatuses    = () => useTenantLookup(tenantKeys.lookups.documentStatuses,    tenantLookupsApi.documentStatuses);
export const useDocumentBaseOps     = () => useTenantLookup(tenantKeys.lookups.documentBaseOps,     tenantLookupsApi.documentBaseOps);
export const useFiscalStamps        = () => useTenantLookup(tenantKeys.lookups.fiscalStamps,        tenantLookupsApi.fiscalStamps);
export const useGenders             = () => useTenantLookup(tenantKeys.lookups.genders,             tenantLookupsApi.genders);
export const useLegalForms          = () => useTenantLookup(tenantKeys.lookups.legalForms,          tenantLookupsApi.legalForms);
export const usePartyTypes          = () => useTenantLookup(tenantKeys.lookups.partyTypes,          tenantLookupsApi.partyTypes);
export const useProductTypes        = () => useTenantLookup(tenantKeys.lookups.productTypes,        tenantLookupsApi.productTypes);
export const useTreasuryAccountTypes= () => useTenantLookup(tenantKeys.lookups.treasuryAccountTypes,tenantLookupsApi.treasuryAccountTypes);
export const useStockMovementTypes  = () => useTenantLookup(tenantKeys.lookups.stockMovementTypes,  tenantLookupsApi.stockMovementTypes);
export const useValuationMethods    = () => useTenantLookup(tenantKeys.lookups.valuationMethods,    tenantLookupsApi.valuationMethods);
export const useNumberingSeries     = () => useTenantLookup(tenantKeys.lookups.numberingSeries,     tenantLookupsApi.numberingSeries);
export const useTreasuryAccounts    = () => useTenantLookup(tenantKeys.lookups.treasuryAccounts,    tenantLookupsApi.treasuryAccounts);

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — CRUD Mutations (tenant)
// ══════════════════════════════════════════════════════════════════════════════

type Entity = { id: number };

function useLookupMutations<T extends Entity>(
  resource: string,
  keyFn:    (slug: string) => readonly unknown[],
) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: keyFn(slug) }); };

  return {
    create: useMutation({ mutationFn: (data: Omit<T, 'id'>)                              => apiPost<T>(`/${resource}`, data),           onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<T> })   => apiPut<T>(`/${resource}/${id}`, data),      onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: number)                                        => apiDelete(`/${resource}/${id}`),           onSuccess: inv }),
  };
}

export const useCurrencyMutations         = () => useLookupMutations<Currency>('currencies',                     tenantKeys.lookups.currencies);
export const useTvaMutations              = () => useLookupMutations<Tva>('tvas',                                tenantKeys.lookups.tvas);
export const useUnitMutations             = () => useLookupMutations<Unit>('units',                              tenantKeys.lookups.units);
export const useFamilyMutations           = () => useLookupMutations<Family>('families',                         tenantKeys.lookups.families);
export const useBrandMutations            = () => useLookupMutations<Brand>('brands',                            tenantKeys.lookups.brands);
export const usePriceLevelMutations       = () => useLookupMutations<PriceLevel>('price-levels',                 tenantKeys.lookups.priceLevels);
export const useWarehouseMutations        = () => useLookupMutations<Warehouse>('warehouses',                    tenantKeys.lookups.warehouses);
export const usePaymentModeMutations      = () => useLookupMutations<PaymentMode>('payment-modes',               tenantKeys.lookups.paymentModes);
export const useExchangeRateMutations     = () => useLookupMutations<ExchangeRate>('exchange-rates',             tenantKeys.lookups.exchangeRates);
export const useExpenseCategoryMutations  = () => useLookupMutations<ExpenseCategory>('expense-categories',      tenantKeys.lookups.expenseCategories);
export const useDocumentTypeMutations     = () => useLookupMutations<DocumentType>('document-types',             tenantKeys.lookups.documentTypes);
export const useDocumentStatusMutations   = () => useLookupMutations<DocumentStatus>('document-statuses',        tenantKeys.lookups.documentStatuses);
export const useGenderMutations           = () => useLookupMutations<Gender>('genders',                          tenantKeys.lookups.genders);
export const useLegalFormMutations        = () => useLookupMutations<LegalForm>('legal-forms',                   tenantKeys.lookups.legalForms);
export const useNumberingSeriesMutations  = () => useLookupMutations<NumberingSeries>('numbering-series',        tenantKeys.lookups.numberingSeries);
export const useTreasuryAccountMutations  = () => useLookupMutations<TreasuryAccount>('treasury-accounts',       tenantKeys.lookups.treasuryAccounts);

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Composite hooks (للصفحات التي تحتاج عدة lookups)
// ══════════════════════════════════════════════════════════════════════════════

export function useInvoiceLookups() {
  const documentTypes    = useDocumentTypes();
  const documentStatuses = useDocumentStatuses();
  const warehouses       = useWarehouses();
  const paymentModes     = usePaymentModes();
  const treasuryAccounts = useTreasuryAccounts();
  const tvas             = useTvas();
  const currencies       = useCurrencies();

  return {
    documentTypes:    documentTypes.data    ?? [],
    documentStatuses: documentStatuses.data ?? [],
    warehouses:       warehouses.data       ?? [],
    paymentModes:     paymentModes.data     ?? [],
    treasuryAccounts: treasuryAccounts.data ?? [],
    tvas:             tvas.data             ?? [],
    currencies:       currencies.data       ?? [],
    isLoading: documentTypes.isLoading || warehouses.isLoading,
  };
}

export function useProductLookups() {
  const families     = useFamilies();
  const brands       = useBrands();
  const units        = useUnits();
  const tvas         = useTvas();
  const priceLevels  = usePriceLevels();
  const warehouses   = useWarehouses();
  const productTypes = useProductTypes();

  return {
    families:     families.data     ?? [],
    brands:       brands.data       ?? [],
    units:        units.data        ?? [],
    tvas:         tvas.data         ?? [],
    priceLevels:  priceLevels.data  ?? [],
    warehouses:   warehouses.data   ?? [],
    productTypes: productTypes.data ?? [],
    isLoading: families.isLoading || units.isLoading,
  };
}

export function usePartyLookups() {
  const partyTypes = usePartyTypes();
  const legalForms = useLegalForms();
  const currencies = useCurrencies();
  const wilayas    = useWilayas();

  return {
    partyTypes: partyTypes.data ?? [],
    legalForms: legalForms.data ?? [],
    currencies: currencies.data ?? [],
    wilayas:    wilayas.data    ?? [],
    isLoading: partyTypes.isLoading,
  };
}
```

## FILE: resources/js/lib/api/endpoints/parties.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts
// ✅ مصحح: party_type_id صحيح + include relations + balance
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Party, PaginatedResponse, ListParams } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartyListParams extends ListParams {
  party_type_id?: number;
  active?:        boolean;
  wilaya_id?:     number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const partiesApi = {
  list: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/parties', params),

  // ✅ /customers و /suppliers مسارات مختصرة في api.php
  clients: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/customers', params),

  suppliers: (params?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/suppliers', params),

  show: (id: number) =>
    apiGet<Party>(`/parties/${id}`, {
      include: 'partyType,defaultPriceLevel,wilaya,commune',
    }),

  create: (data: Partial<Party>) =>
    apiPost<Party>('/parties', data),

  update: (id: number, data: Partial<Party>) =>
    apiPut<Party>(`/parties/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/parties/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePartyList(params?: PartyListParams & { _type?: 'client' | 'supplier' | 'all' }) {
  const slug = useActiveSlug();
  const { _type = 'all', ...rest } = params ?? {};

  const queryFn =
    _type === 'client'   ? () => partiesApi.clients(rest) :
    _type === 'supplier' ? () => partiesApi.suppliers(rest) :
                           () => partiesApi.list(rest);

  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', params),
    queryFn,
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export const useParties   = (params?: PartyListParams) =>
  usePartyList(params);

export const useClients   = (params?: PartyListParams) =>
  usePartyList({ ...params, _type: 'client' });

export const useSuppliers = (params?: PartyListParams) =>
  usePartyList({ ...params, _type: 'supplier' });

export function useParty(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.parties.detail(slug ?? '', id!),
    queryFn:   () => partiesApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function usePartyMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({
        queryKey:    tenantKeys.parties.all(slug),
        refetchType: 'active', // يُعيد الجلب فوراً للـ queries المعروضة حالياً
      });
    }
  };

  const invalidateOne = (party: Party) => {
    if (slug) {
      qc.setQueryData(tenantKeys.parties.detail(slug, party.id), party);
      qc.invalidateQueries({
        queryKey:    tenantKeys.parties.all(slug),
        refetchType: 'active',
      });
    }
  };

  return {
    create: useMutation({ mutationFn: partiesApi.create,  onSuccess: invalidate    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) =>
        partiesApi.update(id, data),
      onSuccess: invalidateOne,
    }),
    remove: useMutation({ mutationFn: partiesApi.delete,  onSuccess: invalidate    }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/payments.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/payments.ts
// ✅ مصحح: ربط بالمستند + Checks + treasury validation
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Payment, Check, PaginatedResponse, ListParams, PaymentStatus, CheckStatus } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentCreateInput {
  commercial_document_id: number;   // ✅ مطلوب دائماً
  payment_mode_id:        number;
  treasury_account_id?:   number | null;
  amount:                 number;
  payment_date:           string;
  reference?:             string | null;
  notes?:                 string | null;
  fiscal_year_id:         number;   // ✅ مطلوب من الباكاند
}

export interface CheckCreateInput {
  commercial_document_id: number;
  party_id:               number;
  amount:                 number;
  check_number:           string;
  check_date:             string;
  bank_name?:             string | null;
  notes?:                 string | null;
}

export interface PaymentListParams extends ListParams {
  commercial_document_id?: number;
  party_id?:               number;
  payment_mode_id?:        number;
  status?:                 PaymentStatus;
  date_from?:              string;
  date_to?:                string;
  fiscal_year_id?:         number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const paymentsApi = {
  list:   (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments', params),

  show:   (id: number) =>
    apiGet<Payment>(`/payments/${id}`, {
      include: 'paymentMode,treasuryAccount,document',
    }),

  // ✅ يتطلب commercial_document_id وfiscal_year_id
  create: (data: PaymentCreateInput) =>
    apiPost<Payment>('/payments', data),

  update: (id: number, data: Partial<PaymentCreateInput>) =>
    apiPut<Payment>(`/payments/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/payments/${id}`),

  // ── Payments by document ───────────────────────────────────────────────────
  byDocument: (documentId: number) =>
    apiGet<Payment[]>('/payments', {
      'filter[commercial_document_id]': documentId,
      include: 'paymentMode,treasuryAccount',
    }),

  confirmed: (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments/confirmed', params),

  pending: (params?: PaymentListParams) =>
    apiGet<PaginatedResponse<Payment>>('/payments/pending', params),
} as const;

// ─── Checks API ───────────────────────────────────────────────────────────────

export const checksApi = {
  list:   (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks', params),

  show:   (id: number) =>
    apiGet<Check>(`/checks/${id}`),

  create: (data: CheckCreateInput) =>
    apiPost<Check>('/checks', data),

  update: (id: number, data: Partial<CheckCreateInput>) =>
    apiPut<Check>(`/checks/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/checks/${id}`),

  markCleared: (id: number) =>
    apiPost<Check>(`/checks/${id}/mark-cleared`),

  markBounced: (id: number) =>
    apiPost<Check>(`/checks/${id}/mark-bounced`),

  pending: (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks/pending', params),

  overdue: (params?: ListParams) =>
    apiGet<PaginatedResponse<Check>>('/checks/overdue', params),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePayments(params?: PaymentListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.payments.list(slug ?? '', params),
    queryFn:         () => paymentsApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

// ✅ جلب مدفوعات مستند معين
export function useDocumentPayments(documentId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [...tenantKeys.documents.detail(slug ?? '', documentId!), 'payments'],
    queryFn:   () => paymentsApi.byDocument(documentId!),
    enabled:   !!slug && !!documentId,
    staleTime: 2 * 60_000,
  });
}

export function usePaymentMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = (docId?: number) => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.payments.all(slug) });
    if (docId) {
      // ✅ أبطل المستند أيضاً لتحديث amount_paid وamount_remaining
      qc.invalidateQueries({ queryKey: tenantKeys.documents.detail(slug, docId) });
    }
  };

  const create = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess:  (p) => invalidate(p.commercial_document_id),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaymentCreateInput> }) =>
      paymentsApi.update(id, data),
    onSuccess: (p) => invalidate(p.commercial_document_id),
  });

  const remove = useMutation({
    mutationFn: paymentsApi.delete,
    onSuccess:  () => invalidate(),
  });

  return { create, update, remove };
}

// ─── Check Hooks ──────────────────────────────────────────────────────────────

// قائمة الشيكات (مستقلة عن tenantKeys — أضف checksKeys إذا احتجت)
export function useChecks(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'checks', 'list', params],
    queryFn:         () => checksApi.list(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCheckMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: [slug, 'checks'] });
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
  };

  return {
    create:      useMutation({ mutationFn: checksApi.create,      onSuccess: invalidate }),
    update:      useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<CheckCreateInput> }) => checksApi.update(id, data), onSuccess: invalidate }),
    remove:      useMutation({ mutationFn: checksApi.delete,      onSuccess: invalidate }),
    markCleared: useMutation({ mutationFn: checksApi.markCleared, onSuccess: invalidate }),
    markBounced: useMutation({ mutationFn: checksApi.markBounced, onSuccess: invalidate }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/products.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/products.ts
// ✅ مصحح: variants endpoints + تصحيح active route + POS support
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Product, ProductVariant, ProductVariantPrice,
  QuantityDiscount, ProductLot,
  PaginatedResponse, ListParams,
} from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductListParams extends ListParams {
  family_id?:       number;
  brand_id?:        number;
  product_type_id?: number;
  active?:          boolean;
}

export interface VariantListParams extends ListParams {
  product_id?:    number;
  barcode?:       string;
  manages_stock?: boolean;
  active?:        boolean;
}

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: ProductListParams) =>
    apiGet<PaginatedResponse<Product>>('/products', params),

  show: (id: number, include?: string) =>
    apiGet<Product>(`/products/${id}`, {
      include: include ?? 'family,brand,productType',
    }),

  // ✅ إصلاح: active يُرسل `filter[active]=1` بدل /products/active
  // (لأن /products/:id يتعارض مع /products/active في بعض إعدادات الـ router)
  activeList: (params?: ProductListParams) =>
    apiGet<Product[]>('/products/active', params),

  byFamily: (familyId: number) =>
    apiGet<Product[]>(`/products/by-family/${familyId}`),

  byBrand: (brandId: number) =>
    apiGet<Product[]>(`/products/by-brand/${brandId}`),

  create: (data: Partial<Product> & { variants?: Partial<ProductVariant>[] }) =>
    apiPost<Product>('/products', data),

  update: (id: number, data: Partial<Product> & { variants?: Partial<ProductVariant>[] }) =>
    apiPut<Product>(`/products/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/products/${id}`),

  uploadImage: (id: number, fd: FormData, onProgress?: (p: number) => void) =>
    apiUpload<Product>(`/products/${id}/image`, fd, onProgress),
} as const;

// ─── Variants API ─────────────────────────────────────────────────────────────
// ✅ مفقودة في النسخة الأصلية — مطلوبة للـ POS وصفحة المنتجات

export const variantsApi = {
  list: (params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', params),

  byProduct: (productId: number, params?: VariantListParams) =>
    apiGet<ProductVariant[]>(`/products/${productId}/variants`),

  show: (id: number) =>
    apiGet<ProductVariant>(`/product-variants/${id}`, {
      include: 'product,unit,tva,prices.priceLevel,quantityDiscounts,lots',
    }),

  // ✅ للـ POS: بحث بالباركود
  byBarcode: (barcode: string) =>
    apiGet<ProductVariant[]>('/product-variants', {
      barcode,
      include: 'product,unit,tva,prices.priceLevel',
      per_page: 5,
    }),

  // ✅ للـ POS: بحث بالنص
  search: (query: string, params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      ...params,
      search: query,
      include: 'product,unit,tva,prices',
      per_page: 30,
    }),

  create: (data: Partial<ProductVariant>) =>
    apiPost<ProductVariant>('/product-variants', data),

  update: (id: number, data: Partial<ProductVariant>) =>
    apiPut<ProductVariant>(`/product-variants/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/product-variants/${id}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProducts(params?: ProductListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.products.list(slug ?? '', params),
    queryFn:         () => productsApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.products.detail(slug ?? '', id!),
    queryFn:   () => productsApi.show(id!,
      'family,brand,productType,variants.unit,variants.tva,variants.prices.priceLevel,variants.quantityDiscounts'
    ),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ✅ للـ POS: جلب متغير بالباركود
export function useVariantByBarcode(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'variants', 'barcode', barcode],
    queryFn:   () => variantsApi.byBarcode(barcode!),
    enabled:   !!slug && !!barcode,
    staleTime: 10 * 60_000,
  });
}

// ✅ للـ POS: بحث بالنص
export function useVariantSearch(query: string, params?: VariantListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'variants', 'search', query, params],
    queryFn:         () => variantsApi.search(query, params),
    enabled:         !!slug && query.length >= 2,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

// ✅ متغيرات منتج بعينه
export function useProductVariants(productId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'products', productId, 'variants'],
    queryFn:   () => variantsApi.byProduct(productId!),
    enabled:   !!slug && !!productId,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useProductMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  const invalidateOne = (product: Product) => {
    if (slug) {
      qc.setQueryData(tenantKeys.products.detail(slug, product.id), product);
      qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    }
  };

  return {
    create: useMutation({
      mutationFn: productsApi.create,
      onSuccess:  invalidate,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
        productsApi.update(id, data),
      onSuccess: invalidateOne,
    }),

    remove: useMutation({
      mutationFn: productsApi.delete,
      onSuccess:  invalidate,
    }),

    uploadImage: useMutation({
      mutationFn: ({
        id, formData, onProgress,
      }: { id: number; formData: FormData; onProgress?: (p: number) => void }) =>
        productsApi.uploadImage(id, formData, onProgress),
      onSuccess: invalidateOne,
    }),
  };
}

export function useVariantMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
  };

  return {
    create: useMutation({ mutationFn: variantsApi.create, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
        variantsApi.update(id, data),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: variantsApi.delete, onSuccess: invalidate }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/reports.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/reports.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId } from '../../store/appStore';

export const reportsApi = {
  sales:     (params?: Record<string, unknown>) => apiGet<any>('/reports/sales', params),
  purchases: (params?: Record<string, unknown>) => apiGet<any>('/reports/purchases', params),
  inventory: (params?: Record<string, unknown>) => apiGet<any>('/reports/inventory', params),
  payments:  (params?: Record<string, unknown>) => apiGet<any>('/reports/payments', params),
  taxes:     (params?: Record<string, unknown>) => apiGet<any>('/reports/taxes', params),
  customers: (params?: Record<string, unknown>) => apiGet<any>('/reports/customers', params),
  suppliers: (params?: Record<string, unknown>) => apiGet<any>('/reports/suppliers', params),
} as const;

export function useSalesReport(params?: Record<string, unknown>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: [slug, 'reports', 'sales', yearId, params],
    queryFn:  () => reportsApi.sales({ year_id: yearId, ...params }),
    enabled:  !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useTvaReport() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: tenantKeys.reports.tva(slug ?? '', yearId ?? 0),
    queryFn:  () => reportsApi.taxes({ year_id: yearId }),
    enabled:  !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useDebtsReport() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.reports.debts(slug ?? ''),
    queryFn:  () => reportsApi.customers(),
    enabled:  !!slug,
    staleTime: 3 * 60_000,
  });
}
```

## FILE: resources/js/lib/api/endpoints/resource.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/resource.ts
// Generic CRUD hook factory — يُنشئ hooks كاملة لأي resource
// يُستخدَم في: Products, Parties, Documents, Expenses, etc.
// ════════════════════════════════════════════════════════════════════════════

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
    type UseQueryOptions,
} from "@tanstack/react-query";
import {
    apiGet,
    apiPost,
    apiPut,
    apiPatch,
    apiDelete,
    apiUpload,
} from "../core/client";
import { useActiveSlug } from "../../store/appStore";
import type { PaginatedResponse, ListParams, BaseModel } from "../core/types";


// ─── Types ────────────────────────────────────────────────────────────────────

interface ResourceConfig<T> {
    resource: string;
    /** * التعديل هنا: جعل params اختيارية في النوع ليتوافق مع تعريف queryKeys
     * واستخدام any لتجنب صرامة التوافق مع Record<string, unknown>
     */
    queryKey: (slug: string, params?: any) => readonly any[];
    staleTime?: number;
}

// ─── Hook Factory ─────────────────────────────────────────────────────────────

export function createResourceHooks<T extends BaseModel>(
    config: ResourceConfig<T>,
) {
    const { resource, queryKey, staleTime = 5 * 60_000 } = config;

    /**
     * قائمة مُقسَّمة مع Pagination
     */
    function useList(params?: ListParams) {
        const slug = useActiveSlug();

        return useQuery({
            queryKey: queryKey(slug ?? "", params),
            queryFn: () => apiGet<PaginatedResponse<T>>(`/${resource}`, params),
            enabled: !!slug,
            staleTime,
            placeholderData: keepPreviousData, // لا يختفي المحتوى عند تغيير الصفحة
        });
    }

    /**
     * عنصر واحد
     */
    function useDetail(id: number | null | undefined) {
        const slug = useActiveSlug();

        return useQuery({
            queryKey: [...queryKey(slug ?? ""), id],
            queryFn: () => apiGet<T>(`/${resource}/${id}`),
            enabled: !!slug && !!id,
            staleTime,
        });
    }

    /**
     * إنشاء عنصر جديد
     */
    function useCreate() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: (data: Partial<T>) => apiPost<T>(`/${resource}`, data),
            onSuccess: (created) => {
                if (slug) {
                    // Optimistic: أضف للكاش مباشرة بدلاً من إعادة الجلب
                    qc.invalidateQueries({ queryKey: queryKey(slug) });
                }
            },
        });
    }

    /**
     * تعديل عنصر
     */
    function useUpdate() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: ({ id, data }: { id: number; data: Partial<T> }) =>
                apiPut<T>(`/${resource}/${id}`, data),
            onSuccess: (updated) => {
                if (slug) {
                    // تحديث الكاش مباشرة
                    qc.setQueryData([...queryKey(slug), updated.id], updated);
                    qc.invalidateQueries({ queryKey: queryKey(slug) });
                }
            },
        });
    }

    /**
     * حذف عنصر
     */
    function useDelete() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: (id: number) => apiDelete(`/${resource}/${id}`),
            onSuccess: () => {
                if (slug) qc.invalidateQueries({ queryKey: queryKey(slug) });
            },
        });
    }

    /**
     * رفع ملف مرتبط بعنصر
     */
    function useUpload() {
        const slug = useActiveSlug();
        const qc = useQueryClient();

        return useMutation({
            mutationFn: ({
                id,
                formData,
                onProgress,
            }: {
                id: number;
                formData: FormData;
                onProgress?: (pct: number) => void;
            }) =>
                apiUpload<T>(`/${resource}/${id}/upload`, formData, onProgress),
            onSuccess: () => {
                if (slug) qc.invalidateQueries({ queryKey: queryKey(slug) });
            },
        });
    }

    return { useList, useDetail, useCreate, useUpdate, useDelete, useUpload };
}

// ─── Pre-built resource hooks ─────────────────────────────────────────────────

import { tenantKeys } from "../core/queryKeys";
import type { Party, Product } from "../core/types";

export const useParties = createResourceHooks<Party>({
    resource: "parties",
    queryKey: tenantKeys.parties.list,
});

export const useProducts = createResourceHooks<Product>({
    resource: "products",
    queryKey: tenantKeys.products.list,
    staleTime: 5 * 60_000,
});
```

## FILE: resources/js/lib/api/endpoints/seeds.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/seeds.ts
// Seeds API — بذر البيانات الأولية للشركة
// ════════════════════════════════════════════════════════════════════════════

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import type { SeedKey, SeedResult } from '../core/types';

// ─── كل الـ seeds المتاحة بالترتيب الصحيح ────────────────────────────────────

export const SEED_DEFINITIONS: Array<{
  key:   SeedKey;
  label: string;
  group: 'global' | 'tenant';
}> = [
  // Global (مشتركة — تُدرَج مرة واحدة)
  { key: 'currencies',                  label: 'العملات (DZD, EUR, USD)',             group: 'global' },
  { key: 'tvas',                        label: 'نسب الضريبة TVA',                     group: 'global' },
  { key: 'legal-forms',                 label: 'الأشكال القانونية',                   group: 'global' },
  { key: 'fiscal-stamps',               label: 'طوابع الدفع',                         group: 'global' },
  { key: 'inventory-valuation-methods', label: 'طرق تقييم المخزون',                  group: 'global' },
  { key: 'wilayas-communes',            label: 'الولايات والبلديات',                  group: 'global' },
  { key: 'document-base-operations',    label: 'العمليات الأساسية للوثائق',           group: 'global' },
  { key: 'document-statuses',           label: 'حالات الوثائق',                       group: 'global' },
  { key: 'document-types',              label: 'أنواع الوثائق التجارية',              group: 'global' },
  // Tenant (مرتبطة بالشركة — تُدرَج لكل شركة)
  { key: 'units',                       label: 'وحدات القياس',                        group: 'tenant' },
  { key: 'price-levels',                label: 'مستويات الأسعار',                     group: 'tenant' },
  { key: 'warehouses',                  label: 'مستودع رئيسي',                        group: 'tenant' },
  { key: 'treasury-accounts',           label: 'حسابات الخزينة',                      group: 'tenant' },
  { key: 'payment-modes',               label: 'طرق الدفع',                           group: 'tenant' },
  { key: 'numbering-series',            label: 'سلاسل الترقيم التلقائي',              group: 'tenant' },
  { key: 'expense-categories',          label: 'تصنيفات المصاريف',                    group: 'tenant' },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export const seedsApi = {
  run: (slug: string, key: SeedKey) =>
    apiPost<{ message: string }>(`/${slug}/seeds/${key}`),
} as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface SeedProgress {
  total:     number;
  completed: number;
  results:   SeedResult[];
  current:   SeedKey | null;
}

/**
 * يُشغِّل الـ seeds بشكل تسلسلي ويتتبع التقدم
 * بعد الاكتمال: يُبطل كاش جميع lookups الخاصة بالشركة
 */
export function useSeedCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      keys,
      onProgress,
    }: {
      slug:       string;
      keys:       SeedKey[];
      onProgress: (progress: SeedProgress) => void;
    }): Promise<SeedResult[]> => {
      const results: SeedResult[] = [];

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        onProgress({ total: keys.length, completed: i, results, current: key });

        try {
          const res = await seedsApi.run(slug, key);
          results.push({ key, success: true, message: res.message });
        } catch (err: any) {
          results.push({
            key,
            success: false,
            message: err?.message ?? 'فشل',
          });
          // نكمل بقية الـ seeds حتى لو فشل واحد
        }
      }

      onProgress({ total: keys.length, completed: keys.length, results, current: null });
      return results;
    },

    onSuccess: (_, { slug }) => {
      // إبطال كاش كل lookups الخاصة بهذه الشركة
      qc.invalidateQueries({ queryKey: tenantKeys.lookups.all(slug) });
    },
  });
}
```

## FILE: resources/js/lib/api/endpoints/settings.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/settings.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

export interface Setting { key: string; value: unknown; group: string; }

export const settingsApi = {
  list:     ()                         => apiGet<Setting[]>('/settings'),
  update:   (settings: Record<string, unknown>) => apiPut<Setting[]>('/settings', settings),
  byGroup:  (group: string)            => apiGet<Setting[]>(`/settings/group/${group}`),
} as const;

export function useSettings() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.settings.current(slug ?? ''),
    queryFn:  settingsApi.list,
    enabled:  !!slug,
    staleTime: 15 * 60_000,
  });
}

export function useSettingsMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return {
    update: useMutation({
      mutationFn: settingsApi.update,
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: tenantKeys.settings.all(slug) });
      },
    }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/users.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/users.ts
// Users + Roles API (Tenant-scoped)
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { User, Role, Permission, PaginatedResponse, ListParams } from '../core/types';

// ─── API ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:           (params?: ListParams)   => apiGet<PaginatedResponse<User>>('/users', params),
  show:           (id: number)            => apiGet<User>(`/users/${id}`),
  create:         (data: Partial<User>)   => apiPost<User>('/users', data),
  update:         (id: number, data: Partial<User>) => apiPut<User>(`/users/${id}`, data),
  delete:         (id: number)            => apiDelete(`/users/${id}`),
  toggleActive:   (id: number)            => apiPost<User>(`/users/${id}/toggle-active`),
  changePassword: (id: number, password: string, confirmation: string) =>
    apiPost(`/users/${id}/change-password`, { password, password_confirmation: confirmation }),
  assignRole:     (id: number, roleId: number) =>
    apiPost<User>(`/users/${id}/assign-role`, { role_id: roleId }),
} as const;

export const rolesApi = {
  list:   (params?: ListParams) => apiGet<Role[]>('/roles', params),
  show:   (id: number)          => apiGet<Role>(`/roles/${id}`),
  create: (data: Partial<Role>) => apiPost<Role>('/roles', data),
  update: (id: number, data: Partial<Role>) => apiPut<Role>(`/roles/${id}`, data),
  delete: (id: number)          => apiDelete(`/roles/${id}`),
  permissions: ()               => apiGet<Permission[]>('/permissions'),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useUsers(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.users.list(slug ?? '', params),
    queryFn:         () => usersApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRoles() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.lookups.roles(slug ?? ''),
    queryFn:  () => rolesApi.list(),
    enabled:  !!slug,
    staleTime: 10 * 60_000,
  });
}

export function usePermissions() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'permissions'],
    queryFn:  () => rolesApi.permissions(),
    enabled:  !!slug,
    staleTime: 30 * 60_000,
  });
}

export function useUserMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.users.all(slug) }); };

  return {
    create:         useMutation({ mutationFn: usersApi.create,  onSuccess: inv }),
    update:         useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => usersApi.update(id, data), onSuccess: inv }),
    remove:         useMutation({ mutationFn: usersApi.delete,  onSuccess: inv }),
    toggleActive:   useMutation({ mutationFn: usersApi.toggleActive,  onSuccess: inv }),
    changePassword: useMutation({ mutationFn: ({ id, password, confirmation }: { id: number; password: string; confirmation: string }) => usersApi.changePassword(id, password, confirmation) }),
    assignRole:     useMutation({ mutationFn: ({ id, roleId }: { id: number; roleId: number }) => usersApi.assignRole(id, roleId), onSuccess: inv }),
  };
}

export function useRoleMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.lookups.roles(slug ?? '') }); };

  return {
    create: useMutation({ mutationFn: rolesApi.create,  onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Role> }) => rolesApi.update(id, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: rolesApi.delete,  onSuccess: inv }),
  };
}
```

## FILE: resources/js/lib/api/index.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/index.ts — تصدير كامل لطبقة الـ API
// ✅ مصحح: اسم الملف document.ts وليس documents.ts
// ════════════════════════════════════════════════════════════════════════════

// Core
export * from './core/client';
export * from './core/queryClient';
export * from './core/queryKeys';
export type * from './core/types';

// Store
export * from '../store/appStore';

// Endpoints
export * from './endpoints/auth';
export * from './endpoints/companies';
export * from './endpoints/fiscalYears';
export * from './endpoints/lookups';
export * from './endpoints/seeds';
export * from './endpoints/documents';
export * from './endpoints/parties';
export * from './endpoints/products';
export * from './endpoints/payments';
export * from './endpoints/expenses';
export * from './endpoints/inventory';
export * from './endpoints/users';
export * from './endpoints/settings';
export * from './endpoints/dashboard';
export * from './endpoints/reports';
```

## FILE: resources/js/lib/store/appStore.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/store/appStore.ts
// Zustand — للحالة المحلية فقط (لا server state هنا)
// React Query يتولى كل بيانات الـ API
// ════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ActiveCompany } from '../api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppState {
  // الشركة النشطة
  activeCompany:    ActiveCompany | null;
  // السنة المالية المختارة (id فقط — البيانات من React Query)
  selectedYearId:   number | null;
  // السايدبار
  sidebarCollapsed: boolean;
  // الثيم
  theme:            'light' | 'dark' | 'auto';
}

interface AppActions {
  setActiveCompany:   (company: ActiveCompany | null) => void;
  setSelectedYearId:  (id: number | null) => void;
  toggleSidebar:      () => void;
  setSidebarCollapsed:(collapsed: boolean) => void;
  setTheme:           (theme: AppState['theme']) => void;
  reset:              () => void;
}

type AppStore = AppState & AppActions;

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: AppState = {
  activeCompany:    null,
  selectedYearId:   null,
  sidebarCollapsed: false,
  theme:            'auto',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    immer((set) => ({
      ...initialState,

      setActiveCompany: (company) =>
        set((state) => {
          // تغيير الشركة → إعادة تعيين السنة المختارة
          if (state.activeCompany?.slug !== company?.slug) {
            state.selectedYearId = null;
          }
          state.activeCompany = company;
        }),

      setSelectedYearId: (id) =>
        set((state) => { state.selectedYearId = id; }),

      toggleSidebar: () =>
        set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed; }),

      setSidebarCollapsed: (collapsed) =>
        set((state) => { state.sidebarCollapsed = collapsed; }),

      setTheme: (theme) =>
        set((state) => { state.theme = theme; }),

      reset: () => set(initialState),
    })),

    {
      name:    'app-store',
      storage: createJSONStorage(() => sessionStorage),
      // persist فقط الحالة الضرورية بين الصفحات
      partialize: (state) => ({
        activeCompany:    state.activeCompany,
        selectedYearId:   state.selectedYearId,
        sidebarCollapsed: state.sidebarCollapsed,
        theme:            state.theme,
      }),
    },
  ),
);

// ─── Selectors (محسَّنة — كل selector يقرأ فقط ما يحتاجه) ───────────────────

export const useActiveCompany    = () => useAppStore((s) => s.activeCompany);
export const useActiveSlug       = () => useAppStore((s) => s.activeCompany?.slug ?? null);
export const useSelectedYearId   = () => useAppStore((s) => s.selectedYearId);
export const useSidebarCollapsed = () => useAppStore((s) => s.sidebarCollapsed);
export const useTheme            = () => useAppStore((s) => s.theme);

// ─── Actions (خارج React — للاستخدام في Interceptors وما شابه) ──────────────

export const appActions = {
  getActiveSlug: () => useAppStore.getState().activeCompany?.slug ?? null,
  setActiveCompany: (company: ActiveCompany | null) =>
    useAppStore.getState().setActiveCompany(company),
  reset: () => useAppStore.getState().reset(),
};
```

## FILE: resources/js/lib/utils.ts
```
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'DZD'): string {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date, locale = 'ar-DZ'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale = 'ar-DZ'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'حدث خطأ غير متوقع';
}```



# =========================================
# 📘 TYPES
# =========================================

## FILE: resources/js/types/admin.ts
```
// types/admin.ts

export interface AdminCompany {
  id:               number;
  name:             string;
  commercial_name?: string | null;
  slug:             string;
  email?:           string | null;
  phone?:           string | null;
  address?:         string | null;
  activity?:        string | null;
  nif?:             string | null;
  plan:             string;
  max_users:        number;
  max_products:     number;
  max_warehouses:   number;
  users_count:      number;
  active:           boolean;
  is_suspended:     boolean;
  suspended_at?:    string | null;
  suspended_reason?: string | null;
  verified_at?:     string | null;
  notes?:           string | null;
  owner_id?:        number | null;
  owner?:           AdminUserMin | null;
  created_at:       string;
  updated_at:       string;
}

export interface AdminUser {
  id:               number;
  name:             string;
  email:            string;
  phone?:           string | null;
  active:           boolean;
  role?:            string;
  companies_count?: number;
  last_login_at?:   string | null;
  created_at:       string;
}

export interface AdminUserMin {
  id:    number;
  name:  string;
  email: string;
}

export interface CompanyMembership {
  id:         number;
  name:       string;
  slug:       string;
  pivot?: {
    role:   string;
    active: boolean;
  };
}

export interface ActivityLog {
  id:            number;
  event:         string;
  description?:  string;
  subject_type?: string;
  subject_id?:   number;
  causer?:       AdminUserMin | null;
  company?:      { id: number; name: string } | null;
  ip_address?:   string | null;
  old_values?:   Record<string, unknown> | null;
  new_values?:   Record<string, unknown> | null;
  created_at:    string;
}

export interface AdminPlan {
  key:             string;
  label:           string;
  max_users:       number;
  max_products:    number;
  max_warehouses:  number;
  companies_count: number;
}

export interface SystemSettings {
  allow_registration:   boolean;
  allow_new_companies:  boolean;
  debug_mode:           boolean;
  public_api:           boolean;
  maintenance_mode:     boolean;
  maintenance_message:  string;
  free_trial_days:      number;
  free_max_users:       number;
  starter_max_products: number;
}

export interface AdminDashboardStats {
  companies: {
    total:          number;
    active:         number;
    suspended:      number;
    verified:       number;
    by_plan:        Record<string, number>;
  };
  users: {
    total:          number;
    active:         number;
    new_this_month: number;
  };
  recent_companies: AdminCompany[];
  recent_users:     AdminUser[];
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page:    number;
    per_page:     number;
    total:        number;
    from:         number | null;
    to:           number | null;
  };
}

export interface AdminCompaniesFilter {
  search?:   string;
  status?:   '' | 'active' | 'suspended' | 'inactive' | 'verified' | 'unverified';
  plan?:     string;
  sort_by?:  'name' | 'created_at' | 'users_count';
  sort_dir?: 'asc' | 'desc';
  page?:     number;
  per_page?: number;
}

export interface AdminUsersFilter {
  search?:   string;
  role?:     string;
  active?:   string;
  page?:     number;
  per_page?: number;
}
```

## FILE: resources/js/types/filters.ts
```
// types/filters.ts — فلاتر الاستعلام لكل كيان
export interface InvoiceFilters {
  search?:           string;
  document_type_id?: number;
  party_id?:         number;
  status?:           string;
  date_from?:        string;
  date_to?:          string;
  page?:             number;
  per_page?:         number;
  sort?:             string;
}

export interface PartyFilters {
  search?:        string;
  party_type_id?: number;
  active?:        boolean;
  page?:          number;
  per_page?:      number;
  sort?:          string;
}

export interface ProductFilters {
  search?:          string;
  family_id?:       number;
  brand_id?:        number;
  product_type_id?: number;
  active?:          boolean;
  page?:            number;
  per_page?:        number;
  sort?:            string;
  include?:         string;
}

export interface VariantFilters {
  search?:     string;
  barcode?:    string;
  product_id?: number;
  page?:       number;
  per_page?:   number;
}
```

## FILE: resources/js/types/index.ts
```
// ════════════════════════════════════════════════════════════════════════════
// types/index.ts
// ✅ مصدر واحد للحقيقة — كل الأنواع من lib/api/core/types.ts
// لا تعريفات مكررة هنا
// ════════════════════════════════════════════════════════════════════════════
export * from '@/lib/api/core/types';
```

## FILE: resources/js/types/product.ts
```
// types/product.ts
export interface Family { id: number; name: string; }
export interface Brand { id: number; name: string; }
export interface ProductType { id: number; name: string; label: string; manages_stock: boolean; }
export interface Unit { id: number; name: string; symbol: string; }
export interface TvaRate { id: number; rate: number; is_default?: boolean; }
export interface PriceLevel { id: number; name: string; }
export interface InventoryValuationMethod { id: number; name: string; method: 'FIFO' | 'LIFO' | 'AVERAGE'; }
export interface Warehouse { id: number; name: string; }
export interface ProductVariantPrice { price_level_id: number; price: number | null; valid_from?: string | null; valid_to?: string | null; active: boolean; }
export interface QuantityDiscount { min_quantity: number; max_quantity?: number | null; discount_percentage?: number | null; discount_per_unit?: number | null; tier_order: number; active: boolean; }
export interface ProductLot { lot_number: string; supplier_lot_number?: string | null; warehouse_id: number | null; manufacturing_date?: string | null; expiration_date?: string | null; purchase_date?: string | null; purchase_price: number | null; legal_selling_price?: number | null; margin_percentage?: number | null; original_quantity: number; remaining_quantity?: number; active?: boolean; }
export interface ProductVariant {
  id?: number; ref: string; barcode?: string | null; variant_name?: string | null;
  unit_id: number | null; tva_id: number | null;
  weight?: number | null; volume?: number | null; length?: number | null; width?: number | null; height?: number | null;
  variant_attributes?: Record<string, string>;
  default_selling_price_ht: number; last_purchase_price?: number | null; average_cost_price?: number | null;
  manages_stock: boolean; allow_negative_stock: boolean; has_lots: boolean; has_expiration_date: boolean;
  min_stock_alert?: number | null; max_stock_alert?: number | null; manages_quantity_discounts: boolean;
  valuation_method_id?: number | null; active: boolean;
  prices: ProductVariantPrice[]; quantity_discounts: QuantityDiscount[]; lots?: ProductLot[];
}
export interface Product {
  id: number; name: string; slug: string; description?: string | null;
  family_id?: number | null; brand_id?: number | null; product_type_id?: number | null;
  specifications?: Record<string, string>; images?: string[] | null;
  meta_title?: string | null; meta_description?: string | null; meta_keywords?: string[] | null; active: boolean;
  variants?: ProductVariant[];
  family?: Family; brand?: Brand; productType?: ProductType;
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

