

# =========================================
# 🧠 hooks
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
// hooks/admin/useAdminCompanies.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/admin';
import type { AdminCompaniesFilter } from '@/types/admin';

const KEY = ['admin', 'companies'] as const;

export function useAdminCompanies(filter?: AdminCompaniesFilter) {
  return useQuery({
    queryKey:        [...KEY, filter],
    queryFn:         () => companiesApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminCompany(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn:  () => companiesApi.show(id),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useCompanyMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    create:     useMutation({ mutationFn: companiesApi.create,                           onSuccess: inv }),
    update:     useMutation({ mutationFn: ({ id, data }: any) => companiesApi.update(id, data),  onSuccess: inv }),
    remove:     useMutation({ mutationFn: companiesApi.remove,                           onSuccess: inv }),
    suspend:    useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => companiesApi.suspend(id, reason), onSuccess: inv }),
    unsuspend:  useMutation({ mutationFn: (id: number) => companiesApi.unsuspend(id),    onSuccess: inv }),
    activate:   useMutation({ mutationFn: (id: number) => companiesApi.activate(id),    onSuccess: inv }),
    deactivate: useMutation({ mutationFn: (id: number) => companiesApi.deactivate(id),  onSuccess: inv }),
    verify:     useMutation({ mutationFn: (id: number) => companiesApi.verify(id),      onSuccess: inv }),
    unverify:   useMutation({ mutationFn: (id: number) => companiesApi.unverify(id),    onSuccess: inv }),
    changePlan: useMutation({ mutationFn: ({ id, ...d }: any) => companiesApi.changePlan(id, d), onSuccess: inv }),
    updateNotes:useMutation({ mutationFn: ({ id, notes }: { id: number; notes: string }) => companiesApi.updateNotes(id, notes), onSuccess: inv }),
    seed:       useMutation({ mutationFn: (id: number) => companiesApi.seed(id),        onSuccess: inv }),
  };
}

export function useCompanyMemberMutations(companyId: number) {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: [...KEY, companyId, 'users'] });

  return {
    addUser:    useMutation({ mutationFn: ({ userId, role }: { userId: number; role?: string }) => companiesApi.addUser(companyId, userId, role),    onSuccess: inv }),
    removeUser: useMutation({ mutationFn: (userId: number) => companiesApi.removeUser(companyId, userId), onSuccess: inv }),
    toggleUser: useMutation({ mutationFn: (userId: number) => companiesApi.toggleUser(companyId, userId), onSuccess: inv }),
  };
}
```

## FILE: resources/js/hooks/admin/useAdminSystem.ts
```
// hooks/admin/useAdminSystem.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, plansApi, settingsApi, maintenanceApi } from '@/lib/api/admin';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn:  dashboardApi.get,
    staleTime: 2 * 60_000,
    retry: false,
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn:  plansApi.list,
    staleTime: 10 * 60_000,
  });
}

export function useSystemSettings() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  const query  = useQuery({ queryKey: ['admin', 'settings'], queryFn: settingsApi.get, staleTime: 5 * 60_000 });
  const update = useMutation({ mutationFn: settingsApi.update, onSuccess: inv });

  return { ...query, update };
}

export function useMaintenanceMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  return {
    enable:     useMutation({ mutationFn: (msg?: string) => maintenanceApi.enable(msg), onSuccess: inv }),
    disable:    useMutation({ mutationFn: maintenanceApi.disable,                       onSuccess: inv }),
    clearCache: useMutation({ mutationFn: maintenanceApi.cache }),
  };
}
```

## FILE: resources/js/hooks/admin/useAdminUsers.ts
```
// hooks/admin/useAdminUsers.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { usersApi, impersonateApi } from '@/lib/api/admin';
import type { AdminUsersFilter } from '@/types/admin';

const KEY = ['admin', 'users'] as const;

export function useAdminUsers(filter?: AdminUsersFilter) {
  return useQuery({
    queryKey:        [...KEY, filter],
    queryFn:         () => usersApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserCompanies(userId: number, enabled = true) {
  return useQuery({
    queryKey: [...KEY, userId, 'companies'],
    queryFn:  () => usersApi.companies(userId),
    enabled:  enabled && userId > 0,
    staleTime: 60_000,
  });
}

export function useUserMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    create:        useMutation({ mutationFn: usersApi.create,                                       onSuccess: inv }),
    update:        useMutation({ mutationFn: ({ id, data }: any) => usersApi.update(id, data),      onSuccess: inv }),
    remove:        useMutation({ mutationFn: (id: number) => usersApi.remove(id),                   onSuccess: inv }),
    toggleActive:  useMutation({ mutationFn: (id: number) => usersApi.toggleActive(id),             onSuccess: inv }),
    resetPassword: useMutation({ mutationFn: ({ id, pwd }: { id: number; pwd: string }) => usersApi.resetPassword(id, pwd) }),
    impersonate:   useMutation({
      mutationFn: (id: number) => impersonateApi.start(id),
      onSuccess:  (res: any) => {
        const token = res?.token ?? res?.data?.token;
        if (token) { localStorage.setItem('auth_token', token); window.location.href = '/dashboard'; }
      },
    }),
  };
}
```

## FILE: resources/js/hooks/useAdmin.ts
```
// ════════════════════════════════════════════════════════════════════════════
// hooks/useAdmin.ts
// Admin hooks — إحصائيات لوحة تحكم السوبر أدمن
// ════════════════════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  companies: {
    total:     number;
    active:    number;
    suspended: number;
    new_month: number;
  };
  users: {
    total:    number;
    active:   number;
    new_month: number;
  };
  revenue?: {
    total_month: number;
    currency:    string;
  };
}

// ─── Query key ────────────────────────────────────────────────────────────────

const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery<AdminDashboardStats>({
    queryKey: adminKeys.dashboard,
    queryFn:  () => apiGet<AdminDashboardStats>('/admin/dashboard'),
    staleTime: 2 * 60_000,   // تحديث كل دقيقتين
    retry: false,
  });
}
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

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

