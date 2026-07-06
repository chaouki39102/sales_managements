

# =========================================
# 📘 core
# =========================================

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

// ─── CSRF (required for stateful Sanctum API requests from the SPA) ───────────
const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null;
};

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// ─── Axios instance ───────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

const client: AxiosInstance = axios.create({
  baseURL:         API_BASE,
  timeout:         30_000,
  withCredentials: true,
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

    const method = config.method?.toLowerCase() ?? '';
    if (MUTATING_METHODS.has(method)) {
      const csrf = getCsrfToken();
      if (csrf) config.headers['X-CSRF-TOKEN'] = csrf;
    }

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
      if (Array.isArray(inner)) {
        // Paginated response: outer has both 'data'(array) and 'meta' — preserve full shape
        if ('meta' in obj) return outer as T;
        return inner as T;
      }
      if (inner !== null && typeof inner === 'object') {
        const io = inner as Record<string, unknown>;
        if ('data' in io && 'meta' in io) return inner as T; // Nested paginated
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
          // لا إعادة محاولة لأخطاء الزبون
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
 */export function invalidateCompanyCache(qc: QueryClient, slug?: string): Promise<void> {
    return slug
        ? qc.invalidateQueries({ queryKey: [slug] })
        : qc.invalidateQueries({ queryKey: companyKeys.all });
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
// lib/api/core/queryKeys.ts
//
// قاعدة التصنيف (مستخرجة من api.php):
//   globalKeys  → wilayas, communes فقط (خارج {company} تماماً)
//   companyKeys → /companies/* (CompanyController — company owner)
//   adminKeys   → /admin/* (AdminCompanyController — super-admin فقط)
//   tenantKeys  → /{slug}/* (كل tenant resources)
// ════════════════════════════════════════════════════════════════════════════

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authKeys = {
  all: ['auth']        as const,
  me:  ['auth', 'me'] as const,
} as const;

// ─── Companies (CompanyController — /api/v1/companies/*) ─────────────────────
export const companyKeys = {
  all:     ['companies']                                              as const,
  list:    (p?: Record<string, unknown>) => ['companies', 'list', p] as const,
  detail:  (id: number)                   => ['companies', id]        as const,
  mine:    ['companies', 'mine']                                      as const,
  // ✅ إضافة: الشركة النشطة الحالية (GET /companies/current)
  current: ['companies', 'current']                                   as const,
  // أعضاء شركة بعينها
  members: (slug: string) => ['companies', slug, 'members']           as const,
} as const;

// ─── Admin (AdminCompanyController — /api/v1/admin/*) ────────────────────────
// super-admin فقط
export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  companies: {
    all:    ['admin', 'companies']                                                      as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'companies', 'list', p]         as const,
    detail: (id: number)                   => ['admin', 'companies', id]                as const,
    users:  (id: number)                   => ['admin', 'companies', id, 'users']       as const,
  },
  users: {
    all:    ['admin', 'users']                                                          as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'users', 'list', p]             as const,
    detail: (id: number)                   => ['admin', 'users', id]                    as const,
    companies: (id: number)                => ['admin', 'users', id, 'companies']       as const,
  },
  plans:    ['admin', 'plans']    as const,
  activity: (p?: Record<string, unknown>) => ['admin', 'activity', p] as const,
  settings: ['admin', 'settings'] as const,
} as const;

// ─── GLOBAL Lookups ───────────────────────────────────────────────────────────
// فقط wilayas و communes — تُرسَل بدون slug (خارج {company} في api.php)
export const globalKeys = {
  wilayas:  ['global', 'wilayas']                                  as const,
  communes: (wilayaId: number) => ['global', 'communes', wilayaId] as const,
} as const;

// ─── TENANT keys ──────────────────────────────────────────────────────────────
// كل شيء آخر — يُرسَل مع /{slug}/
export const tenantKeys = {

  // ── Lookups (tenant) ────────────────────────────────────────────────────────
  lookups: {
    all:                  (slug: string) => [slug, 'lookups']                                      as const,
    currencies:           (slug: string) => [slug, 'lookups', 'currencies']                        as const,
    tvas:                 (slug: string) => [slug, 'lookups', 'tvas']                              as const,
    units:                (slug: string) => [slug, 'lookups', 'units']                             as const,
    families:             (slug: string) => [slug, 'lookups', 'families']                          as const,
    brands:               (slug: string) => [slug, 'lookups', 'brands']                            as const,
    priceLevels:          (slug: string) => [slug, 'lookups', 'price-levels']                      as const,
    warehouses:           (slug: string) => [slug, 'lookups', 'warehouses']                        as const,
    paymentModes:         (slug: string) => [slug, 'lookups', 'payment-modes']                     as const,
    exchangeRates:        (slug: string) => [slug, 'lookups', 'exchange-rates']                    as const,
    expenseCategories:    (slug: string) => [slug, 'lookups', 'expense-categories']                as const,
    documentTypes:        (slug: string) => [slug, 'lookups', 'document-types']                    as const,
    documentStatuses:     (slug: string) => [slug, 'lookups', 'document-statuses']                 as const,
    documentBaseOps:      (slug: string) => [slug, 'lookups', 'document-base-operations']          as const,
    fiscalStamps:         (slug: string) => [slug, 'lookups', 'fiscal-stamps']                     as const,
    genders:              (slug: string) => [slug, 'lookups', 'genders']                           as const,
    legalForms:           (slug: string) => [slug, 'lookups', 'legal-forms']                       as const,
    partyTypes:           (slug: string) => [slug, 'lookups', 'party-types']                       as const,
    productTypes:         (slug: string) => [slug, 'lookups', 'product-types']                     as const,
    treasuryAccountTypes: (slug: string) => [slug, 'lookups', 'treasury-account-types']            as const,
    stockMovementTypes:   (slug: string) => [slug, 'lookups', 'stock-movement-types']              as const,
    valuationMethods:     (slug: string) => [slug, 'lookups', 'inventory-valuation-methods']       as const,
    numberingSeries:      (slug: string) => [slug, 'lookups', 'numbering-series']                  as const,
    treasuryAccounts:     (slug: string) => [slug, 'lookups', 'treasury-accounts']                 as const,
    roles:                (slug: string) => [slug, 'lookups', 'roles']                             as const,
  },

  // ── Fiscal Years ──────────────────────────────────────────────────────────
  fiscalYears: {
    all:    (slug: string)                              => [slug, 'fiscal-years']                  as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'fiscal-years', 'list', p]       as const,
    detail: (slug: string, id: number)                  => [slug, 'fiscal-years', id]              as const,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    all:   (slug: string)                  => [slug, 'dashboard']                                  as const,
    stats: (slug: string, yearId: number)  => [slug, 'dashboard', 'stats', yearId]                as const,
    chart: (slug: string, p: string)       => [slug, 'dashboard', 'chart', p]                     as const,
  },

  // ── Parties ───────────────────────────────────────────────────────────────
  parties: {
    all:    (slug: string)                              => [slug, 'parties']                        as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'parties', 'list', p]            as const,
    detail: (slug: string, id: number)                  => [slug, 'parties', id]                   as const,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    all:    (slug: string)                              => [slug, 'products']                       as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'products', 'list', p]           as const,
    detail: (slug: string, id: number)                  => [slug, 'products', id]                  as const,
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  documents: {
    all:    (slug: string)                              => [slug, 'documents']                      as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'documents', 'list', p]          as const,
    detail: (slug: string, id: number)                  => [slug, 'documents', id]                 as const,
    byType: (slug: string, code: string, p?: Record<string, unknown>) =>
      [slug, 'documents', code, p]                                                                  as const,
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: {
    all:  (slug: string)                              => [slug, 'payments']                         as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'payments', 'list', p]             as const,
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  expenses: {
    all:  (slug: string)                              => [slug, 'expenses']                         as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'expenses', 'list', p]             as const,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    all:       (slug: string)                              => [slug, 'inventory']                   as const,
    list:      (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'list', p]       as const,
    movements: (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'movements', p]  as const,
    stock:     (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'stock', p]      as const,
    lots:      (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'lots', p]       as const,
  },

  // ── Users & Roles ─────────────────────────────────────────────────────────
  users: {
    all:  (slug: string)                              => [slug, 'users']                            as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'users', 'list', p]               as const,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    tva:   (slug: string, yearId: number) => [slug, 'reports', 'tva', yearId]                      as const,
    debts: (slug: string)                 => [slug, 'reports', 'debts']                            as const,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    current: (slug: string) => [slug, 'settings']                                                  as const,
  },


  // ── Balances (الأرصدة) ─────────────────────────────────────────────────────
   partyBalances: {
        all:  (slug: string) => [slug, 'party-balances'] as const,
        list: (slug: string, params?: Record<string, unknown>) => [slug, 'party-balances', 'list', params] as const,
        detail: (slug: string, partyId: number, date?: string) => [slug, 'party-balances', partyId, date] as const,
    },
    openingBalances: {
        parties:  (slug: string, yearId: number) => [slug, 'opening-balances', 'parties', yearId] as const,
        treasury: (slug: string, yearId: number) => [slug, 'opening-balances', 'treasury', yearId] as const,
    },

    // ── Document Type Conversions ─────────────────────────────────────────
    conversions: {
        all:            (slug: string) => [slug, 'document-type-conversions'] as const,
        allowedTargets: (slug: string, sourceCode: string) => [slug, 'document-type-conversions', sourceCode] as const,
    },

    // ── Tax Management ────────────────────────────────────────────────────
    taxConfig: {
        detail:  (slug: string, regime: string)          => [slug, 'tax-config', regime]             as const,
        history: (slug: string, regime: string)           => [slug, 'tax-config', regime, 'history'] as const,
    },

    regulatedProducts: {
        all:    (slug: string)                            => [slug, 'regulated-products']             as const,
        list:   (slug: string, p?: Record<string, unknown>) => [slug, 'regulated-products', 'list', p] as const,
    },

    subsidizedSales: {
        summary:    (slug: string, yearId: number, month?: number)  => [slug, 'subsidized-sales', 'summary', yearId, month]    as const,
        violations: (slug: string, yearId: number)                  => [slug, 'subsidized-sales', 'violations', yearId]        as const,
    },

    g50Declaration: {
        detail:  (slug: string, yearId: number, month: number) => [slug, 'g50', yearId, month]                               as const,
        history: (slug: string, yearId: number)                 => [slug, 'g50', yearId, 'history']                          as const,
    },

    ifuDeclaration: {
        detail:  (slug: string, yearId: number, month?: number)  => [slug, 'ifu', yearId, month]                             as const,
        history: (slug: string, yearId: number)                  => [slug, 'ifu', yearId, 'history']                         as const,
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
  id:      number;
  name:    string;
  slug:    string;
  address?: string | null;
  phone?:   string | null;
  nif?:     string | null;
  nis?:     string | null;
  rc?:      string | null;
  ai?:      string | null;
  avatar?:  string | null;
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
  activity?:              string | null;
  legal_form_id?:         number | null;
  capital_amount?:        number;
  rc_date?:               string | null;
  nif?:                   string | null;
  nis?:                   string | null;
  rc?:                    string | null;
  ai?:                    string | null;
  address?:               string | null;
  wilaya_id?:             number | null;
  commune_id?:            number | null;
  phone?:                 string | null;
  mobile?:                string | null;
  fax?:                   string | null;
  email?:                 string | null;
  avatar?:                string | null;
  bank_name?:             string | null;
  rib?:                   string | null;
  initial_balance:        number;
  credit_limit:           number;
  credit_days?:           number | null;
  default_price_level_id?:number | null;
  is_tva_exempt:          boolean;
  is_taxable?:            boolean;
  tax_option?:            string | null;
  cnas_number?:           string | null;
  tax_regime?:            string | null;
  is_final_consumer?:     boolean;
  is_vat_registered?:     boolean;
  vat_registration_date?: string | null;
  additional_data?:       any;
  active:                    boolean;
  company_id:                number;
  default_selling_price_ht?: number;
  // Relations
  party_type?:            PartyType;
  legal_form?:            LegalForm;
  commune?:               Commune;
  wilaya?:                Wilaya;
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
  name:                      string;
  slug:                      string;
  ref?:                      string | null;
  barcode?:                  string | null;
  description?:              string | null;
  family_id?:                number | null;
  brand_id?:                 number | null;
  product_type_id?:          number | null;
  tva_id?:                   number | null;
  unit_id?:                  number | null;
  purchase_price_ht?:        number;
  current_cost_price?:       number;
  min_margin_percentage?:    number;
  manages_stock:             boolean;
  allow_negative_stock:      boolean;
  has_lots:                  boolean;
  has_expiration_date:       boolean;
  min_stock_alert?:          number;
  max_stock_alert?:          number | null;
  manages_quantity_discounts:boolean;
  weight?:                   number;
  volume?:                   number;
  length?:                   number;
  width?:                    number;
  height?:                   number;
  valuation_method_id?:      number | null;
  specifications?:           Record<string, string> | null;
  images?:                   string[] | null;
  meta_title?:               string | null;
  meta_description?:         string | null;
  active:                    boolean;
  company_id:                number;
  // Relations
  family?:       Family;
  brand?:        Brand;
  productType?:  ProductType;
  tva?:          Tva;
  unit?:         Unit;
  variants?:     ProductVariant[];
}

// ─── Commercial Documents ─────────────────────────────────────────────────────
export type DocumentStatusCode =
  | 'draft' | 'validated' | 'partial' | 'paid' | 'cancelled' | 'locked';

export interface CommercialDocumentLine extends BaseModel {
  commercial_document_id: number;
  product_id?:            number | null;
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
  product?:         Product;
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
  paid_amount:        number;
  remaining_amount:   number;
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
  client_ref?:            string | null;
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
  image_url?:          string | null;
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
  invoice_discount_pct?:    number;
  invoice_discount_amount?: number;
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

// ─── Company Members ──────────────────────────────────────────────────────────

export type CompanyMemberRole =
  | 'owner'
  | 'admin'
  | 'accountant'
  | 'cashier'
  | 'warehouseman'
  | 'viewer'
  | 'member';

export interface CompanyMember extends BaseModel {
  user_id:    number;
  company_id: number;
  role:       CompanyMemberRole;
  active:     boolean;
  user?: {
    id:    number;
    name:  string;
    email: string;
  };
}

export interface PartyBalance {
  party_id:          number;
  date:              string;
  fiscal_year_id:    number;
  opening_balance:   number;
  documents_balance: number;
  payments_total:    number;
  current_balance:   number;
  balance_type:      'debit' | 'credit';
  party?: {
    id:   number;
    name: string;
    party_type?: { name: string };
  };
}

```



# =========================================
# 📘 endpoints
# =========================================

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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "../core/client";
import { companyKeys } from "../core/queryKeys";
import type { Company, CompanyMember } from "../core/types";

// ─── API functions ─────────────────────────────────────────────────────────────

export const companiesApi = {
    mine: () => apiGet<Company[]>("/companies"),

    current: () =>
        apiGet<Company>("/companies/current").catch((err) => {
            if (err?.status === 404) return null as unknown as Company;
            throw err;
        }),

    show: (slug: string) => apiGet<Company>(`/companies/${slug}`),
    create: (data: Partial<Company>) => apiPost<Company>("/companies", data),
    update: (slug: string, data: Partial<Company>) =>
        apiPut<Company>(`/companies/${slug}`, data),

    switch: (companyId: number) =>
        apiPost<{ user: { company_id: number } }>("/companies/switch", {
            company_id: companyId,
        }),

    members: (slug: string) =>
        apiGet<CompanyMember[]>(`/companies/${slug}/members`).then(
            (members) => {
                if (!Array.isArray(members)) return [];
                return members
                    .filter((m) => m && typeof m === "object")
                    .map((m: any) => ({
                        id: m.id ?? m.user_id ?? m.pivot?.id,
                        user_id: m.user_id ?? m.pivot?.user_id,
                        name: m.name ?? m.user?.name ?? "N/A",
                        email: m.email ?? m.user?.email ?? "N/A",
                        role: m.role ?? m.pivot?.role ?? "member",
                        active: m.active ?? m.pivot?.active ?? true,
                        created_at: m.created_at ?? new Date().toISOString(),
                    }));
            },
        ),

    addMember: (slug: string, userId: number | string, role?: string) =>
        apiPost(`/companies/${slug}/members`, {
            user_id: typeof userId === "string" ? parseInt(userId, 10) : userId,
            role: role || "member",
        }),

    removeMember: (slug: string, userId: number) =>
        apiDelete(`/companies/${slug}/members/${userId}`),
    changeMemberRole: (slug: string, userId: number, role: string) =>
        apiPatch(`/companies/${slug}/members/${userId}/role`, { role }),
    activateMember: (slug: string, userId: number) =>
        apiPatch(`/companies/${slug}/members/${userId}/activate`, {}),
    deactivateMember: (slug: string, userId: number) =>
        apiPatch(`/companies/${slug}/members/${userId}/deactivate`, {}),
    transferOwnership: (slug: string, userId: number) =>
        apiPost(`/companies/${slug}/transfer-ownership`, { user_id: userId }),
    remove: (slug: string) => apiDelete(`/companies/${slug}`),
} as const;

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useMyCompanies() {
    return useQuery({
        queryKey: companyKeys.mine,
        queryFn: companiesApi.mine,
        staleTime: 5 * 60_000,
    });
}

export function useCurrentCompany(enabled = true) {
  return useQuery({
    queryKey:  companyKeys.current,
    queryFn:   companiesApi.current,
    enabled,
    staleTime: 5 * 60_000,
    retry:     false,  // ✅ لا تُعيد المحاولة — 404 متوقع
  });
}

// ✅ onError مُزال من useQuery — مُعاد كـ useEffect
export function useCompanyMembers(slug: string) {
    const query = useQuery({
        queryKey: companyKeys.members(slug),
        queryFn: () => companiesApi.members(slug),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        retry: 1,
    });

    useEffect(() => {
        if (query.error) {
            const err = query.error as any;
            console.error("[Members Error]", {
                status: err.status,
                message: err.message,
                slug,
            });
        }
    }, [query.error, slug]);

    return query;
}

export function useSwitchCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: companiesApi.switch,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: companyKeys.all });
            qc.invalidateQueries({ queryKey: companyKeys.current });
        },
    });
}

export function useCreateCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: companiesApi.create,
        onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.mine }),
    });
}

export function useUpdateCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            slug,
            data,
        }: {
            slug: string;
            data: Partial<Company>;
        }) => companiesApi.update(slug, data),
        onSuccess: (updatedCompany) => {
            // ✅ حدّث الـ cache مباشرة بدل invalidate فقط
            // هذا يمنع loading state وسط العمل
            if (updatedCompany) {
                qc.setQueryData(companyKeys.current, updatedCompany);
            }
            // ✅ أبطل mine لتحديث القائمة
            qc.invalidateQueries({ queryKey: companyKeys.mine });
        },
    });
}

export function useDeactivateCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (slug: string) => companiesApi.remove(slug),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: companyKeys.all });
        },
    });
}

export function useCompanyMemberMutations(slug: string) {
    const qc = useQueryClient();
    const inv = () =>
        qc.invalidateQueries({ queryKey: companyKeys.members(slug) });

    return {
        add: useMutation({
            mutationFn: ({
                userId,
                role,
            }: {
                userId: number | string;
                role?: string;
            }) =>
                companiesApi.addMember(
                    slug,
                    typeof userId === "string" ? parseInt(userId, 10) : userId,
                    role,
                ),
            onSuccess: inv,
            onError: (
                err: any, // ✅ onError صحيح في useMutation
            ) =>
                console.error("[Add Member Error]", {
                    status: err.status,
                    message: err.message,
                    errors: err.errors,
                }),
        }),

        remove: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.removeMember(slug, userId),
            onSuccess: inv,
        }),

        changeRole: useMutation({
            mutationFn: ({ userId, role }: { userId: number; role: string }) =>
                companiesApi.changeMemberRole(slug, userId, role),
            onSuccess: inv,
        }),

        activate: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.activateMember(slug, userId),
            onSuccess: inv,
        }),

        deactivate: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.deactivateMember(slug, userId),
            onSuccess: inv,
        }),

        transferOwnership: useMutation({
            mutationFn: (userId: number) =>
                companiesApi.transferOwnership(slug, userId),
            onSuccess: () => {
                qc.invalidateQueries({ queryKey: companyKeys.mine });
                qc.invalidateQueries({ queryKey: companyKeys.current });
            },
        }),
    };
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
// lib/api/endpoints/documents.ts — النسخة المُعاد هيكلتها
//
// ══ ملاحظات ══════════════════════════════════════════════════════════════════
//
// UNIFIED PAYMENT PAYLOAD:
//   Frontend ALWAYS sends `payments[]` (never `new_payments[]`).
//   Backend `syncPayments()` handles UPSERT/DELETE by id presence.
//   The legacy `POST /documents/{id}/payments` endpoint (addPayments) is
//   preserved on the backend for external API consumers only — the frontend
//   no longer calls it.
//
// show: إضافة العلاقات الكاملة المطلوبة
//
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

export interface DocumentPaymentInput {
  id?:                  number;
  payment_mode_id:      number;
  amount:               number;
  reference?:           string | null;
  notes?:               string | null;
  client_ref?:          string | null;
  payment_date:         string;
  treasury_account_id?: number | null;
}

export interface DocumentLineInput {
  id?:                    number;
  product_id:             number;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage?:   number;
  discount_amount?:       number;
  tva_rate:               number;
  packaging_id?:          number | null;
  stock_lot_id?:          number | null;
  lot_number?:            string | null;
  notes?:                 string | null;
}

export interface DocumentCreateInput {
  document_type_id:  number;
  party_id?:         number | null;
  warehouse_id:      number;
  fiscal_year_id:    number;
  currency_id?:      number;
  exchange_rate?:    number;
  document_date:     string;
  due_date?:         string | null;
  notes?:            string | null;
  lines:             DocumentLineInput[];
  payments?:         DocumentPaymentInput[];
  // ✅ price_level_id و apply_fiscal_stamp مُزالَان — الباكاند لا يستخدمهما
}

/** تحديث في وضع free (draft/pending) — كامل الحقول */
export interface DocumentUpdateFreeInput {
  party_id?:         number | null;
  warehouse_id?:     number;
  fiscal_year_id?:   number;
  currency_id?:      number;
  exchange_rate?:    number;
  document_date?:    string;
  due_date?:         string | null;
  notes?:            string | null;
  document_number?:  string;
  lines?:            DocumentLineInput[];
  payments?:         DocumentPaymentInput[];
}

export type DocumentUpdateInput = DocumentUpdateFreeInput;

export interface DocumentListParams extends ListParams {
  document_type_id?:  number;
  type_code?:         string;
  party_id?:          number;
  status?:            string;
  fiscal_year_id?:    number;
  date_from?:         string;
  date_to?:           string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {

  // ── CRUD ───────────────────────────────────────────────────────────────────

  list: (params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', params),

  byType: (typeCode: string, params?: DocumentListParams) =>
    apiGet<PaginatedResponse<CommercialDocument>>('/documents', {
      ...params,
      'filter[document_type.code]': typeCode,
    }),

  show: (id: number) =>
    apiGet<CommercialDocument>(`/documents/${id}`, {
      include: [
        'party',
        'warehouse',
        'documentType',
        'documentStatus',
        'fiscalYear',
        'currency',
        'validatedBy',
        'createdBy',
        'lines',
        'lines.product',
        'lines.product.unit',
        'lines.product.tva',
        'lines.product.packagings',
        'lines.product.lots',
        'lines.product.prices',
        'lines.product.prices.priceLevel',
        'lines.product.quantityDiscounts',
        'lines.packaging',
        'lines.stockLot',
        'payments',
        'payments.paymentMode',
        'payments.treasuryAccount',
      ].join(','),
    }),

  create: (data: DocumentCreateInput) =>
    apiPost<CommercialDocument>('/documents', data),

  update: (id: number, data: DocumentUpdateInput) =>
    apiPut<CommercialDocument>(`/documents/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/documents/${id}`),

  checkNumber: (params: {
    document_number:   string;
    document_type_id:  number;
    exclude_id?:       number;
  }) =>
    apiGet<{ exists: boolean }>('/documents/check-number', params),

  // ── Actions ────────────────────────────────────────────────────────────────

  validate: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/validate`),

  lock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/lock`),

  unlock: (id: number) =>
    apiPost<CommercialDocument>(`/documents/${id}/unlock`),

  cancel: (id: number, reason: string) =>
    apiPost<CommercialDocument>(`/documents/${id}/cancel`, { cancellation_reason: reason }),

  qrcode: (id: number) =>
    apiGet<{ url: string }>(`/documents/${id}/qrcode`),

  // ── Lines ──────────────────────────────────────────────────────────────────

  lines: {
    list: (documentId: number) =>
      apiGet<CommercialDocumentLine[]>('/commercial-document-lines', {
        'filter[commercial_document_id]': documentId,
        include: 'product,packaging,stockLot',
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
  const slug                 = useActiveSlug();
  const qc                   = useQueryClient();
  const { selectedYear }     = useFiscalYear();

  const invalidateAll = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
  };

  const invalidateOne = (doc: CommercialDocument) => {
    if (slug) {
      qc.setQueryData(tenantKeys.documents.detail(slug, doc.id), doc);
      qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }
  };

  const invalidatePartyBalance = (partyId?: number | null) => {
    if (slug && partyId) {
      qc.invalidateQueries({ queryKey: [slug, 'party-balance', partyId] });
    }
  };

  // ── create ────────────────────────────────────────────────────────────────

  const create = useMutation({
    mutationFn: (data: Omit<DocumentCreateInput, 'fiscal_year_id'> & { fiscal_year_id?: number }) =>
      documentsApi.create({
        ...data,
        fiscal_year_id: data.fiscal_year_id ?? selectedYear?.id ?? 0,
      }),
    onSuccess: (doc) => {
      invalidateAll();
      invalidatePartyBalance(doc.party_id);
    },
  });

  // ── update ────────────────────────────────────────────────────────────────

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DocumentUpdateInput }) =>
      documentsApi.update(id, data),
    onSuccess: (doc) => {
      invalidateOne(doc);
      invalidatePartyBalance(doc.party_id);
    },
  });

  // ── delete ────────────────────────────────────────────────────────────────

  const remove = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess:  invalidateAll,
  });

  // ── actions ───────────────────────────────────────────────────────────────

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
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      documentsApi.cancel(id, reason),
    onSuccess: invalidateOne,
  });

  return {
    create, update, remove,
    validate, lock, unlock, cancel,
    selectedYear,
  };
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
import type { FiscalYear, ListParams, PaginatedResponse } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const fiscalYearsApi = {
  list: (params?: ListParams) =>
    apiGet<PaginatedResponse<FiscalYear>>('/fiscal-years', { per_page: 50, ...params }),

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
    select: (response) => {
      const years = response.data;
      return {
        years,
        current: years.find(y => y.is_current) ??
                 years.find(y => !y.is_closed)  ??
                 years[0] ??
                 null,
        open:   years.filter(y => !y.is_closed),
        closed: years.filter(y => y.is_closed),
      };
    },
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
// lib/api/endpoints/inventory.ts
// ════════════════════════════════════════════════════════════════════════════

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../core/client";
import { tenantKeys } from "../core/queryKeys";
import { useActiveSlug } from "../../store/appStore";
import type {
    StockMovement,
    ProductLot,
    Product,
    PaginatedResponse,
    ListParams,
} from "../core/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** منتج مبسّط لعرض المخزون — يعكس Product model في الـ Backend */
export interface InventoryProduct {
    id: number;
    name: string;
    ref?: string | null;
    current_stock: number;
    min_stock_alert: number;
    max_stock_alert?: number | null;
    current_cost_price: number;
    purchase_price_ht: number;
    manages_stock: boolean;
    family_id?: number | null;
    brand_id?: number | null;
    unit_id?: number | null;
    tva_id?: number | null;
    active: boolean;
    company_id: number;
    // Relations
    family?: { id: number; name: string } | null;
    brand?: { id: number; name: string } | null;
    unit?: { id: number; name: string; symbol: string } | null;
    tva?: { id: number; rate: number } | null;
}

export interface StockMovementCreateInput {
    product_id: number;
    warehouse_id: number;
    fiscal_year_id: number;
    stock_movement_type_id: number;
    movement_date: string;
    quantity: number;
    unit_price: number;
    notes?: string | null;
    lot_number?: string | null;
}

export interface StockMovementListParams extends ListParams {
    product_id?: number;
    warehouse_id?: number;
    stock_movement_type_id?: number;
    fiscal_year_id?: number;
    date_from?: string;
    date_to?: string;
    is_validated?: boolean;
}

export interface InventoryProductListParams extends ListParams {
    family_id?: number;
    brand_id?: number;
    warehouse_id?: number;
    /** low = أقل من min_stock_alert, out = نفد, ok = جيد */
    status?: "low" | "out" | "ok";
}

export interface StockSummary {
    total_products: number;
    out_of_stock: number;
    low_stock: number;
    total_value: number;
}

export interface StockAtRow {
    id: number;
    name: string;
    ref?: string | null;
    opening_quantity: number;
    total_in: number;
    total_out: number;
    current_stock: number;
    min_stock_alert: number;
    current_cost_price: number;
    total_value: number;
    manages_stock: boolean;
    family?: { name: string } | null;
    unit?: { name: string; symbol: string } | null;
}

export interface StockAtParams {
    date?: string;
    warehouse_id?: number | null;
    search?: string;
}
// ─── API ──────────────────────────────────────────────────────────────────────

export const inventoryApi = {
    // ── Products (for inventory view) ─────────────────────────────────────────
    products: (params?: InventoryProductListParams) =>
        apiGet<PaginatedResponse<InventoryProduct>>("/products", {
            ...params,
            include: "family,brand,unit,tva",
        }),

    lowStockProducts: () => apiGet<InventoryProduct[]>("/inventory/low-stock"),

    stockSummary: () => apiGet<StockSummary>("/inventory/summary"),

    // ── Stock Movements ────────────────────────────────────────────────────────
    movements: (params?: StockMovementListParams) =>
        apiGet<PaginatedResponse<StockMovement>>("/stock-movements", {
            ...params,
            include: "product,warehouse,stockMovementType",
        }),

    createMovement: (data: StockMovementCreateInput) =>
        apiPost<StockMovement>("/stock-movements", data),

    deleteMovement: (id: number) => apiDelete(`/stock-movements/${id}`),

    // ── Product Lots ───────────────────────────────────────────────────────────
    lots: (params?: ListParams) =>
        apiGet<PaginatedResponse<ProductLot>>("/product-lots", {
            ...params,
            include: "product,warehouse",
        }),

    lotsAvailable: () => apiGet<ProductLot[]>("/product-lots/available"),

    lotsExpiring: (days = 30) =>
        apiGet<ProductLot[]>("/product-lots/expiring", { days }),

    createLot: (data: Partial<ProductLot>) =>
        apiPost<ProductLot>("/product-lots", data),

    updateLot: (id: number, data: Partial<ProductLot>) =>
        apiPut<ProductLot>(`/product-lots/${id}`, data),

    deleteLot: (id: number) => apiDelete(`/product-lots/${id}`),

    stockAt: (params?: StockAtParams) =>
        apiGet<StockAtRow[]>(
            "/inventory/stock-at",
            params as Record<string, unknown>,
        ),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** قائمة المنتجات مع بيانات المخزون */
export function useInventoryProducts(params?: InventoryProductListParams) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: tenantKeys.inventory.list(slug ?? "", params),
        queryFn: () => inventoryApi.products(params),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        placeholderData: keepPreviousData,
    });
}

/** منتجات منخفضة أو نافدة المخزون */
export function useLowStockProducts() {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: [slug, "inventory", "low-stock"],
        queryFn: () => inventoryApi.lowStockProducts(),
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

/** ملخص المخزون للـ KPIs */
export function useStockSummary() {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: [slug, "inventory", "summary"],
        queryFn: () => inventoryApi.stockSummary(),
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

/** قائمة حركات المخزون */
export function useStockMovements(params?: StockMovementListParams) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: tenantKeys.inventory.movements(slug ?? "", params),
        queryFn: () => inventoryApi.movements(params),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        placeholderData: keepPreviousData,
    });
}

/** دفعات المخزون */
export function useProductLots(params?: ListParams) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: tenantKeys.inventory.lots(slug ?? "", params),
        queryFn: () => inventoryApi.lots(params),
        enabled: !!slug,
        staleTime: 3 * 60_000,
        placeholderData: keepPreviousData,
    });
}

/** دفعات قاربت الانتهاء */
export function useExpiringLots(days = 30) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: [slug, "product-lots", "expiring", days],
        queryFn: () => inventoryApi.lotsExpiring(days),
        enabled: !!slug,
        staleTime: 10 * 60_000,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useInventoryMutations() {
    const slug = useActiveSlug();
    const qc = useQueryClient();

    const invalidate = () => {
        if (!slug) return;
        // إبطال المخزون
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        // إبطال المنتجات — الحركات تغير current_stock
        qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
    };

    return {
        createMovement: useMutation({
            mutationFn: inventoryApi.createMovement,
            onSuccess: invalidate,
        }),
        deleteMovement: useMutation({
            mutationFn: inventoryApi.deleteMovement,
            onSuccess: invalidate,
        }),
        createLot: useMutation({
            mutationFn: inventoryApi.createLot,
            onSuccess: invalidate,
        }),
        updateLot: useMutation({
            mutationFn: ({
                id,
                data,
            }: {
                id: number;
                data: Partial<ProductLot>;
            }) => inventoryApi.updateLot(id, data),
            onSuccess: invalidate,
        }),
        deleteLot: useMutation({
            mutationFn: inventoryApi.deleteLot,
            onSuccess: invalidate,
        }),
    };
}
export function useStockAt(params?: StockAtParams) {
    const slug = useActiveSlug();
    return useQuery({
        queryKey: [slug, "inventory", "stock-at", params],
        queryFn: () => inventoryApi.stockAt(params),
        enabled: !!slug,
        staleTime: 2 * 60_000,
        placeholderData: keepPreviousData,
    });
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

function extractArray<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && 'data' in (d as object) && Array.isArray((d as Record<'data', unknown>)['data'])) {
    return (d as Record<string, unknown>)['data'] as T[];
  }
  return [];
}

export function useWilayas() {
  return useQuery<Wilaya[]>({
    queryKey: globalKeys.wilayas,
    queryFn:  globalLookupsApi.wilayas,
    staleTime: GLOBAL_STALE,
    select:   extractArray<Wilaya>,
  });
}

export function useCommunes(wilayaId: number | null | undefined) {
  return useQuery<Commune[]>({
    queryKey: globalKeys.communes(wilayaId ?? 0),
    queryFn:  () => globalLookupsApi.communes(wilayaId!),
    staleTime: GLOBAL_STALE,
    enabled:  !!wilayaId,
    select:   extractArray<Commune>,
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
    select:   (d) => {
      if (Array.isArray(d)) return d;
      if (d && typeof d === 'object' && 'data' in (d as object) && Array.isArray((d as Record<'data', unknown>)['data'])) {
        return (d as Record<string, unknown>)['data'] as T[];
      }
      return [];
    },
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

## FILE: resources/js/lib/api/endpoints/notifications.ts
```
import { apiGet, apiPost, apiDelete } from '@/lib/api/core/client';

export type RemoteNotificationType = 'success' | 'error' | 'warning' | 'info';

export interface RemoteNotification {
  id: string;
  type: RemoteNotificationType;
  title: string;
  message?: string;
  action_url?: string;
  icon?: string;
  is_read: boolean;
  created_at: string;
  created_at_human: string;
}

export interface NotificationsResponse {
  data: RemoteNotification[];
  unread_count: number;
}

export interface NotificationsMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  is_first_page: boolean;
  is_last_page: boolean;
}

export interface PaginatedNotificationsResponse {
  data: RemoteNotification[];
  meta: NotificationsMeta;
}

export interface NotificationsFilters {
  type?: RemoteNotificationType;
  is_read?: boolean;
  page?: number;
  per_page?: number;
}

export const getUnreadNotifications = () =>
  apiGet<NotificationsResponse>('/notifications/unread');

export const markNotificationAsRead = (id: string) =>
  apiPost<{ message: string }>(`/notifications/${id}/read`);

export const markAllNotificationsAsRead = () =>
  apiPost<{ message: string }>('/notifications/read-all');

export const getNotifications = (filters: NotificationsFilters = {}) =>
  apiGet<PaginatedNotificationsResponse>('/notifications', filters);

export const deleteNotification = (id: string) =>
  apiDelete(`/notifications/${id}`);

export const deleteMultipleNotifications = (ids: string[]) =>
  apiPost<{ deleted_count: number }>('/notifications/delete-multiple', { ids });

```

## FILE: resources/js/lib/api/endpoints/openingBalances.ts
```
// lib/api/endpoints/openingBalances.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';

export const openingBalancesApi = {
    getParties: (fiscalYearId: number) =>
        apiGet('/opening-balance-parties', { 'filter[fiscal_year_id]': fiscalYearId, include: 'party', per_page: 200 }),
    getTreasury: (fiscalYearId: number) =>
        apiGet('/opening-balance-treasury', { 'filter[fiscal_year_id]': fiscalYearId, include: 'treasuryAccount', per_page: 200 }),

    createParty: (data: any) =>
        apiPost('/opening-balance-parties', data),
    updateParty: (id: number, data: any) =>
        apiPut(`/opening-balance-parties/${id}`, data),
    deleteParty: (id: number) =>
        apiDelete(`/opening-balance-parties/${id}`),

    createTreasury: (data: any) =>
        apiPost('/opening-balance-treasury', data),
    updateTreasury: (id: number, data: any) =>
        apiPut(`/opening-balance-treasury/${id}`, data),
    deleteTreasury: (id: number) =>
        apiDelete(`/opening-balance-treasury/${id}`),
};

export function useOpeningParties(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: tenantKeys.openingBalances.parties(slug, yearId!),
        queryFn: () => openingBalancesApi.getParties(yearId!),
        enabled: !!slug && !!yearId,
        select: (data: any) =>
            Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
    });
}

export function useOpeningTreasury(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: tenantKeys.openingBalances.treasury(slug, yearId!),
        queryFn: () => openingBalancesApi.getTreasury(yearId!),
        enabled: !!slug && !!yearId,
        select: (data: any) =>
            Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
    });
}

```

## FILE: resources/js/lib/api/endpoints/parties.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts — النسخة الكاملة مع stats
// ════════════════════════════════════════════════════════════════════════════
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import apiClient, { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Party, PaginatedResponse } from '../core/types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PartyListParams {
  search?:        string;
  party_type_id?: number;
  active?:        boolean;
  wilaya_id?:     number;
  per_page?:      number;
  page?:          number;
  include?:       string;
  [key: string]:  unknown;
}

export interface PartyStatRow {
  count:            number;
  total_ttc:        number;
  total_ht:         number;
  total_tva:        number;
  amount_paid:      number;
  amount_remaining: number;
  total_discount:   number;
}

export interface PartyStats {
  party:         Party;
  balance:       number;
  sales:         PartyStatRow;
  purchases:     PartyStatRow;
  payments:      { count: number; total: number };
  checks:        { count: number; total: number; pending_total: number; bounced_total: number };
  expenses:      { count: number; total: number; total_paid: number };
  last_document: {
    id: number; document_number: string; document_date: string;
    total_ttc: number; status: string; type_name: string;
  } | null;
  active_years:  { id: number; name: string; start_date: string; end_date: string }[];
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const partiesApi = {
  list: (p?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/parties', p as Record<string, unknown>),

  clients: (p?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/customers', p as Record<string, unknown>),

  suppliers: (p?: PartyListParams) =>
    apiGet<PaginatedResponse<Party>>('/suppliers', p as Record<string, unknown>),

  show: (id: number) =>
    apiGet<Party>(`/parties/${id}`, {
      include: 'partyType,legalForm,defaultPriceLevel,wilaya,commune',
    }),

  stats: (id: number, fiscalYearId?: number) =>
    apiGet<PartyStats>(`/parties/${id}/stats`,
      fiscalYearId ? { fiscal_year_id: fiscalYearId } : undefined,
    ),

  create: (data: Partial<Party>) => apiPost<Party>('/parties', data),
  update: (id: number, data: Partial<Party>) => apiPut<Party>(`/parties/${id}`, data),
  delete: (id: number) => apiDelete(`/parties/${id}`),
} as const;

// ─── Query Hooks ──────────────────────────────────────────────────────────────
export function useParties(params?: PartyListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', params),
    queryFn:         () => partiesApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useClients(params?: PartyListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', { ...params, _scope: 'customers' }),
    queryFn:         () => partiesApi.clients(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useSuppliers(params?: PartyListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', { ...params, _scope: 'suppliers' }),
    queryFn:         () => partiesApi.suppliers(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useParty(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.parties.detail(slug ?? '', id!),
    queryFn:   () => partiesApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ✅ hook إحصاءات الطرف — يُشغَّل فقط عند فتح مودال التفاصيل
export function usePartyStats(id: number | null | undefined, fiscalYearId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'parties', id, 'stats', fiscalYearId],
    queryFn:   () => partiesApi.stats(id!, fiscalYearId),
    enabled:   !!slug && !!id,
    staleTime: 2 * 60_000,  // 2 دقيقة — تتغير بتغير المعاملات
  });
}

// ─── تصدير جميع الزبائن ────────────────────────────────────────────────────────
export async function fetchAllCustomers(search?: string, active?: boolean): Promise<Party[]> {
  const all: Party[] = [];
  let page = 1;
  let lastPage = 1;
  const perPage = 100;

  do {
    const res = await apiClient.get('/customers', {
      params: {
        per_page: perPage,
        page,
        include: 'wilaya,commune,legalForm,defaultPriceLevel',
        ...(search ? { search } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });
    const body = res.data;
    const data = body?.data ?? [];
    all.push(...data);
    lastPage = body?.meta?.last_page ?? 1;
    page++;
  } while (page <= lastPage);

  return all;
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function usePartyMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
    if (!slug) return;
    qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug), refetchType: 'active' });
  };

  const invalidateOne = (party: Party) => {
    if (!slug) return;
    qc.setQueryData(tenantKeys.parties.detail(slug, party.id), party);
    invalidateAll();
  };

  return {
    create: useMutation({ mutationFn: (d: Partial<Party>) => partiesApi.create(d), onSuccess: invalidateAll }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) => partiesApi.update(id, data),
      onSuccess: invalidateOne,
    }),
    remove: useMutation({ mutationFn: (id: number) => partiesApi.delete(id), onSuccess: invalidateAll }),
  };
}

```

## FILE: resources/js/lib/api/endpoints/partyBalances.ts
```
// lib/api/endpoints/partyBalances.ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '@/lib/store/appStore';
import type { PartyBalance } from '../core/types';

export const partyBalancesApi = {
    getAll: (params?: { date?: string; party_type_id?: number; search?: string }) =>
        apiGet<PartyBalance[]>('/party-balances', params as Record<string, unknown>),

    getOne: (partyId: number, date?: string) =>
        apiGet<PartyBalance>(`/party-balances/${partyId}`, date ? { date } : undefined),
};

export function usePartyBalances(params?: { date?: string; party_type_id?: number; search?: string }) {
    const slug = useActiveSlug();

    return useQuery({
        queryKey: tenantKeys.partyBalances.list(slug ?? '', params as Record<string, unknown>),
        queryFn:  () => partyBalancesApi.getAll(params),
        enabled:  !!slug,
        staleTime: 2 * 60_000,

        // ✅ إصلاح: casting صريح لجميع الحقول الرقمية
        // الباكاند يُرجع decimal كـ string في بعض قواعد البيانات
        // extractData يعيد المصفوفة مباشرة — select تستقبلها كـ PartyBalance[]
        select: (data: unknown): PartyBalance[] => {
            let arr: PartyBalance[] = [];

            if (Array.isArray(data)) {
                arr = data as PartyBalance[];
            } else if (data && typeof data === 'object') {
                const obj = data as Record<string, unknown>;
                if (Array.isArray(obj['data'])) {
                    arr = obj['data'] as PartyBalance[];
                }
            }

            return arr.map(b => ({
                ...b,
                opening_balance:   Number(b.opening_balance   ?? 0),
                documents_balance: Number(b.documents_balance ?? 0),
                payments_total:    Number(b.payments_total    ?? 0),
                current_balance:   Number(b.current_balance   ?? 0),
            }));
        },
    });
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

## FILE: resources/js/lib/api/endpoints/posSession.ts
```
import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import { apiGet, apiPost } from '../core/client';
import { useActiveSlug }   from '../../store/appStore';
import type { CartItem }   from '@/types';

export interface PosSessionPaymentLine {
  payment_mode_id: number;
  payment_mode?:   { id: number; name: string; code: string };
  amount:          number;
  count:           number;
}

export interface PosSessionProduct {
  product_id:    number;
  product_name:  string;
  quantity_sold: number;
  total_ht:      number;
  total_ttc:     number;
}

export interface PosSession {
  id:                     number;
  status:                 'open' | 'closed' | 'suspended';
  opened_at:              string;
  closed_at:              string | null;
  duration:               string;
  user:                   { id: number; name: string };
  warehouse:              { id: number; name: string };
  opening_cash:           number;
  opening_note:           string | null;
  invoices_count:         number;
  returns_count:          number;
  gross_sales:            number;
  returns_total:          number;
  net_sales:              number;
  total_tva:              number;
  total_fiscal_stamp:     number;
  total_discount:         number;
  highest_invoice:        number;
  avg_invoice:            number;
  cash_collected:         number;
  cib_collected:          number;
  ccp_collected:          number;
  bank_collected:         number;
  credit_total:           number;
  closing_cash_counted:   number | null;
  closing_cash_expected:  number | null;
  cash_difference:        number | null;
  closing_note:           string | null;
  payments:               PosSessionPaymentLine[];
  top_products:           PosSessionProduct[];
}

export interface OpenSessionInput {
  warehouse_id:    number;
  fiscal_year_id:  number;
  opening_cash:    number;
  opening_note?:   string;
}

export interface IncrementSessionInput {
  invoice_total:      number;
  total_ht:           number;
  total_tva:          number;
  total_fiscal_stamp: number;
  total_discount:     number;
  is_return?:         boolean;
  payments?: Array<{ payment_mode_id: number; amount: number }>;
  items?:    Array<{
    product_id:   number;
    product_name: string;
    quantity:     number;
    total_ht:     number;
    total_ttc:    number;
  }>;
}

export interface CloseSessionInput {
  closing_cash_counted: number;
  closing_note?:        string;
}

const sessionKeys = {
  all:     (slug: string) => [slug, 'pos-sessions'] as const,
  current: (slug: string) => [slug, 'pos-sessions', 'current'] as const,
  list:    (slug: string, p?: object) => [slug, 'pos-sessions', 'list', p] as const,
  detail:  (slug: string, id: number) => [slug, 'pos-sessions', id] as const,
};

export const posSessionApi = {
  current: ()                        => apiGet<PosSession | null>('/pos-sessions/current'),
  open:    (data: OpenSessionInput)  => apiPost<PosSession>('/pos-sessions', data),
  increment: (id: number, data: IncrementSessionInput) =>
    apiPost<PosSession>(`/pos-sessions/${id}/increment`, data),
  close:   (id: number, data: CloseSessionInput) =>
    apiPost<PosSession>(`/pos-sessions/${id}/close`, data),
  list:    (params?: object) =>
    apiGet<{ data: PosSession[]; meta: any }>('/pos-sessions', params as any),
  show:    (id: number) => apiGet<PosSession>(`/pos-sessions/${id}`),
} as const;

export function useCurrentPosSession() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:            sessionKeys.current(slug ?? ''),
    queryFn:             posSessionApi.current,
    enabled:             !!slug,
    staleTime:           0,
    refetchOnWindowFocus: true,
    refetchInterval:     15_000,
    retry:               false,
  });
}

export function usePosSessionList(params?: object) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        sessionKeys.list(slug ?? '', params),
    queryFn:         () => posSessionApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePosSession(id: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  sessionKeys.detail(slug ?? '', id!),
    queryFn:   () => posSessionApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 60_000,
  });
}

export function useOpenSession() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return useMutation({
    mutationFn: posSessionApi.open,
    onSuccess: (session) => {
      if (slug) {
        qc.setQueryData(sessionKeys.current(slug), session);
        qc.invalidateQueries({ queryKey: sessionKeys.all(slug) });
      }
    },
  });
}

export function useIncrementSession(sessionId: number | null) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return useMutation({
    mutationFn: (data: IncrementSessionInput) =>
      posSessionApi.increment(sessionId!, data),
    onSuccess: (session) => {
      if (slug) {
        qc.setQueryData(sessionKeys.current(slug), session);
        qc.setQueryData(sessionKeys.detail(slug, session.id), session);
      }
    },
    onError: (err) => console.warn('[POS Session increment failed]', err),
  });
}

export function useCloseSession(sessionId: number | null) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  return useMutation({
    mutationFn: (data: CloseSessionInput) =>
      posSessionApi.close(sessionId!, data),
    onSuccess: (session) => {
      if (slug) {
        qc.setQueryData(sessionKeys.current(slug), null);
        qc.setQueryData(sessionKeys.detail(slug, session.id), session);
        qc.invalidateQueries({ queryKey: sessionKeys.all(slug) });
      }
    },
  });
}

export function buildIncrementInput(params: {
  items:          CartItem[];
  totalHt:        number;
  totalTva:       number;
  totalFiscalStamp: number;
  totalDiscount:  number;
  grandTotal:     number;
  isReturn?:      boolean;
  payments?:      Array<{ payment_mode_id: number; amount: number }>;
}): IncrementSessionInput {
  return {
    invoice_total:      params.grandTotal,
    total_ht:           params.totalHt,
    total_tva:          params.totalTva,
    total_fiscal_stamp: params.totalFiscalStamp,
    total_discount:     params.totalDiscount,
    is_return:          params.isReturn ?? false,
    payments:           params.payments ?? [],
    items: params.items.map(i => ({
      product_id:   i.product_id,
      product_name: i.product_name,
      quantity:     i.quantity,
      total_ht:     i.total_ht,
      total_ttc:    i.total_ttc,
    })),
  };
}

```

## FILE: resources/js/lib/api/endpoints/products.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/products.ts
//
// ✅ يغطي:
//   - variantsApi.list()       — تصفح المنتجات في POS (مع include كامل)
//   - variantsApi.search()     — بحث بالاسم / الباركود
//   - useVariantSearch()       — hook بحث (مُفعَّل عند length >= 2)
//   - useProducts / useProduct — صفحات إدارة المنتجات
//   - useProductMutations / useVariantMutations
//
// ⚠️  الـ interceptor يُضيف /{slug}/ تلقائياً — لا نمرره هنا
// ════════════════════════════════════════════════════════════════════════════

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type {
  Product,
  ProductVariant,
  ProductVariantPrice,
  QuantityDiscount,
  ProductLot,
  PaginatedResponse,
  ListParams,
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

export interface ImageSearchResult {
  id:            string;
  thumb:         string | null;
  full:          string | null;
  photographer?: string | null;
  width?:        number | null;
  height?:       number | null;
  source?:       string | null;
  /** مطابقة دقيقة (باركود) — تُعرض بشارة ذهبية مميزة في الواجهة */
  exact?:        boolean;
  label?:        string | null;
}

// ─── Include string للـ POS ───────────────────────────────────────────────────
// يجلب كل ما يحتاجه ProductCard + useCartStore.addItem
// ✅ أُضيف prices.priceLevel: بدونها لا يمكن لصفحة POS تطبيق مستويات
//    السعر (تجزئة/نصف جملة/جملة) — كان الزر موجوداً في الواجهة بدون أي بيانات يعمل بها
const POS_VARIANT_INCLUDE =
  'product,product.family,unit,tva,prices.priceLevel';

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: ProductListParams) =>
    apiGet<PaginatedResponse<Product>>('/products', {
      include: 'family,brand,productType',
      ...params,
    }),

  show: (id: number, include?: string) =>
    apiGet<Product>(`/products/${id}`, {
      include: include ??
        'family,brand,productType,variants.unit,variants.tva,variants.prices.priceLevel,variants.quantityDiscounts',
    }),

  activeList: (params?: ProductListParams) =>
    apiGet<Product[]>('/products/active', { include: 'family,brand', ...params }),

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

  /**
   * بحث اقتراح صور المنتج — يدمج Google CSE (مقيّد بمواقع جزائرية) + متاجر
   * جزائرية عبر WooCommerce Store API + Open Food Facts (باركود + نص) +
   * Pexels كاحتياطي. كل الاستعلامات تتم من الخادم لتفادي مشاكل CORS
   * والحاجة لمفاتيح API في المتصفح.
   */
  searchImages: (query: string, page = 1, barcode?: string) =>
    apiGet<ImageSearchResult[]>('/products/image-search', {
      query,
      page,
      ...(barcode ? { barcode } : {}),
    }),
} as const;

// ─── Variants API ─────────────────────────────────────────────────────────────

export const variantsApi = {
  /**
   * قائمة كاملة — للـ POS browse mode
   * include: product, product.family (للفلترة بالتصنيف), unit, tva
   */
  list: (params?: VariantListParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      per_page:  200,
      include:   POS_VARIANT_INCLUDE,
      active:    true,
      ...params,
    }),

  /**
   * بحث بالاسم أو الباركود — للـ POS search bar
   */
  search: (query: string, params?: Omit<VariantListParams, 'search'>) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      per_page: 60,
      include:  POS_VARIANT_INCLUDE,
      active:   true,
      search:   query,
      ...params,
    }),

  /**
   * بحث بالباركود فقط — للماسح الضوئي
   */
  byBarcode: (barcode: string) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants', {
      barcode,
      include:  POS_VARIANT_INCLUDE,
      per_page: 5,
      active:   true,
    }),

  /**
   * متغيرات منتج واحد
   */
  byProduct: (productId: number) =>
    apiGet<ProductVariant[]>(`/products/${productId}/variants`, {
      include: POS_VARIANT_INCLUDE,
    }),

  show: (id: number) =>
    apiGet<ProductVariant>(`/product-variants/${id}`, {
      include:
        'product,product.family,unit,tva,prices.priceLevel,quantityDiscounts,lots',
    }),

  create: (data: Partial<ProductVariant>) =>
    apiPost<ProductVariant>('/product-variants', data),

  update: (id: number, data: Partial<ProductVariant>) =>
    apiPut<ProductVariant>(`/product-variants/${id}`, data),

  delete: (id: number) =>
    apiDelete(`/product-variants/${id}`),
} as const;

// ─── Hooks — Products ─────────────────────────────────────────────────────────

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
    queryFn:   () => productsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Hooks — Variants ─────────────────────────────────────────────────────────

/**
 * قائمة المتغيرات — تصفح POS (browse mode)
 * مُفعَّل دائماً عندما يكون هناك slug
 */
export function useVariants(params?: VariantListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        [slug, 'variants', 'list', params],
    queryFn:         () => variantsApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * بحث المتغيرات — POS search bar
 * مُفعَّل فقط عند query.length >= 2
 */
export function useVariantSearch(
  query: string,
  params?: Omit<VariantListParams, 'search'>,
) {
  const slug    = useActiveSlug();
  const enabled = !!slug && query.trim().length >= 2;

  return useQuery({
    queryKey:        [slug, 'variants', 'search', query.trim(), params],
    queryFn:         () => variantsApi.search(query.trim(), params),
    enabled,
    staleTime:       30_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * بحث بالباركود — ماسح ضوئي
 */
export function useVariantByBarcode(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'variants', 'barcode', barcode],
    queryFn:   () => variantsApi.byBarcode(barcode!),
    enabled:   !!slug && !!barcode && barcode.length > 0,
    staleTime: 10 * 60_000,
  });
}

/**
 * متغيرات منتج واحد
 */
export function useProductVariants(productId: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'products', productId, 'variants'],
    queryFn:   () => variantsApi.byProduct(productId!),
    enabled:   !!slug && !!productId,
    staleTime: 5 * 60_000,
  });
}

/**
 * تفاصيل متغير واحد
 */
export function useVariant(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'variants', 'detail', id],
    queryFn:   () => variantsApi.show(id!),
    enabled:   !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useProductMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
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
      onSuccess:  invalidateAll,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
        productsApi.update(id, data),
      onSuccess: invalidateOne,
    }),

    remove: useMutation({
      mutationFn: productsApi.delete,
      onSuccess:  invalidateAll,
    }),

    uploadImage: useMutation({
      mutationFn: ({
        id,
        formData,
        onProgress,
      }: {
        id:          number;
        formData:    FormData;
        onProgress?: (p: number) => void;
      }) => productsApi.uploadImage(id, formData, onProgress),
      onSuccess: invalidateOne,
    }),
  };
}

export function useVariantMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
    if (slug) {
      // إبطال المنتجات أيضاً — المتغيرات مرتبطة بها في الكاش
      qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
      qc.invalidateQueries({ queryKey: [slug, 'variants'] });
    }
  };

  return {
    create: useMutation({
      mutationFn: variantsApi.create,
      onSuccess:  invalidateAll,
    }),

    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
        variantsApi.update(id, data),
      onSuccess: invalidateAll,
    }),

    remove: useMutation({
      mutationFn: variantsApi.delete,
      onSuccess:  invalidateAll,
    }),
  };
}

```

## FILE: resources/js/lib/api/endpoints/productsEnhanced.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { ProductVariant, Family, PaginatedResponse } from '../core/types';

export interface FamilyWithStats extends Family {
  _count?: { products: number; active_products?: number };
}

export interface SmartSearchParams {
  query: string;
  family_id?: number;
  price_from?: number;
  price_to?: number;
  in_stock?: boolean;
  sort?: 'popularity' | 'rating' | 'price' | 'newest' | 'name';
  per_page?: number;
}

export const productsEnhancedApi = {
  getAllFamilies: () =>
    apiGet<FamilyWithStats[]>('/families', {
      active: true, per_page: 1000, sort: 'display_order,name',
    }),

  smartSearch: (params: SmartSearchParams) =>
    apiGet<PaginatedResponse<ProductVariant>>('/product-variants/search', {
      search: params.query,
      'filter[family_id]': params.family_id,
      'filter[price_range]': params.price_from && params.price_to
        ? `${params.price_from},${params.price_to}`
        : undefined,
      'filter[in_stock]': params.in_stock,
      sort: params.sort || 'popularity',
      per_page: params.per_page || 50,
      include: 'product,product.family,unit,tva,prices.priceLevel',
      active: true,
    }),

  barcodeSearch: (barcode: string) =>
    apiGet<ProductVariant[]>('/product-variants/barcode-search', {
      barcode, include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),

  trending: (familyId?: number) =>
    apiGet<ProductVariant[]>('/product-variants/trending', {
      family_id: familyId, limit: 20, include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),

  discounted: (familyId?: number) =>
    apiGet<ProductVariant[]>('/product-variants/discounted', {
      family_id: familyId, limit: 20, include: 'product,product.family,unit,tva,prices.priceLevel,quantityDiscounts', active: true,
    }),

  searchGroupedByFamily: (query: string, familiesLimit?: number) =>
    apiGet<Record<string, ProductVariant[]>>('/product-variants/search/grouped', {
      search: query, families_limit: familiesLimit || 10, variants_per_family: 10,
      include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),

  similar: (productId: number, limit?: number) =>
    apiGet<ProductVariant[]>(`/products/${productId}/similar-variants`, {
      limit: limit || 5, include: 'product,product.family,unit,tva,prices.priceLevel', active: true,
    }),
} as const;

export function useAllFamilies() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.lookups.families(slug ?? ''),
    queryFn: () => productsEnhancedApi.getAllFamilies(),
    enabled: !!slug,
    staleTime: 30 * 60_000,
  });
}

export function useSmartSearch(params: SmartSearchParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'smart-search', params],
    queryFn: () => productsEnhancedApi.smartSearch(params),
    enabled: !!slug && !!params.query.trim(),
    staleTime: 2 * 60_000,
  });
}

export function useBarcodeLookup(barcode: string | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'barcode', barcode],
    queryFn: () => productsEnhancedApi.barcodeSearch(barcode!),
    enabled: !!slug && !!barcode,
    staleTime: 5 * 60_000,
  });
}

export function useTrendingProducts(familyId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'trending', familyId],
    queryFn: () => productsEnhancedApi.trending(familyId),
    enabled: !!slug,
    staleTime: 15 * 60_000,
  });
}

export function useDiscountedProducts(familyId?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'discounted', familyId],
    queryFn: () => productsEnhancedApi.discounted(familyId),
    enabled: !!slug,
    staleTime: 15 * 60_000,
  });
}

export function useGroupedSearch(query: string, familiesLimit?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'grouped-search', query, familiesLimit],
    queryFn: () => productsEnhancedApi.searchGroupedByFamily(query, familiesLimit),
    enabled: !!slug && !!query.trim(),
    staleTime: 2 * 60_000,
  });
}

export function useSimilarVariants(productId: number | null, limit?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'similar', productId, limit],
    queryFn: () => productsEnhancedApi.similar(productId!, limit),
    enabled: !!slug && !!productId,
    staleTime: 10 * 60_000,
  });
}

export default productsEnhancedApi;

```

## FILE: resources/js/lib/api/endpoints/reports.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/reports.ts
// ✅ أُضيفت types مُعرَّفة بدل any — مبنية على DB schema الموجود في types.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery }                          from '@tanstack/react-query';
import { apiGet }                            from '../core/client';
import { tenantKeys }                        from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId }  from '../../store/appStore';
import type {
  Party, Product, ProductVariant,
  CommercialDocument, Payment, StockMovement,
} from '../core/types';

// ─── Report Params ────────────────────────────────────────────────────────────

export interface ReportBaseParams {
  year_id?:   number;
  from?:      string;   // YYYY-MM-DD
  to?:        string;
  page?:      number;
  per_page?:  number;
}

export interface SalesReportParams extends ReportBaseParams {
  party_id?:      number;
  document_type?: string;   // FV, BL, ...
  status?:        string;
}

export interface PurchasesReportParams extends ReportBaseParams {
  party_id?:      number;
  document_type?: string;   // FA, BR, ...
  status?:        string;
}

export interface PartyReportParams extends ReportBaseParams {
  party_id?:    number;
  with_balance?: boolean;
}

export interface ProductsReportParams extends ReportBaseParams {
  family_id?:  number;
  brand_id?:   number;
  warehouse_id?: number;
}

export interface InventoryReportParams extends ReportBaseParams {
  warehouse_id?:  number;
  family_id?:     number;
  low_stock?:     boolean;
  out_of_stock?:  boolean;
}

export interface PaymentsReportParams extends ReportBaseParams {
  payment_mode_id?:    number;
  treasury_account_id?: number;
  status?:             string;
}

export interface TaxesReportParams extends ReportBaseParams {
  tva_rate?: number;
}

// ─── Report Response Types ────────────────────────────────────────────────────

export interface SalesReportData {
  summary: {
    total_ht:         number;
    total_tva:        number;
    total_ttc:        number;
    total_discount:   number;
    documents_count:  number;
    paid_count:       number;
    unpaid_count:     number;
    cancelled_count:  number;
  };
  by_month: Array<{
    month:     string;   // YYYY-MM
    total_ht:  number;
    total_ttc: number;
    count:     number;
  }>;
  by_document_type: Array<{
    code:      string;
    name:      string;
    total_ttc: number;
    count:     number;
  }>;
  documents: CommercialDocument[];
}

export interface PurchasesReportData {
  summary: {
    total_ht:        number;
    total_tva:       number;
    total_ttc:       number;
    documents_count: number;
    paid_count:      number;
    unpaid_count:    number;
  };
  by_month: Array<{
    month:     string;
    total_ht:  number;
    total_ttc: number;
    count:     number;
  }>;
  documents: CommercialDocument[];
}

export interface PartyReportRow {
  party:            Pick<Party, 'id' | 'name' | 'code' | 'phone'>;
  total_purchases:  number;
  total_payments:   number;
  balance:          number;
  documents_count:  number;
  last_transaction?: string | null;
}

export interface PartyReportData {
  summary: {
    total_balance:    number;
    debtors_count:    number;
    creditors_count:  number;
  };
  rows: PartyReportRow[];
}

export interface ProductsReportRow {
  product:       Pick<Product, 'id' | 'name' | 'slug'>;
  variant:       Pick<ProductVariant, 'id' | 'ref' | 'variant_name'>;
  quantity_sold: number;
  total_ht:      number;
  total_ttc:     number;
  profit?:       number;
}

export interface ProductsReportData {
  summary: {
    total_ht:      number;
    total_ttc:     number;
    items_count:   number;
    products_count:number;
  };
  rows: ProductsReportRow[];
}

export interface InventoryReportRow {
  product:       Pick<Product, 'id' | 'name' | 'slug'>;
  variant:       Pick<ProductVariant, 'id' | 'ref' | 'variant_name'>;
  warehouse:     { id: number; name: string };
  current_stock: number;
  average_cost:  number;
  total_value:   number;
  min_alert:     number;
  is_low_stock:  boolean;
  is_out:        boolean;
}

export interface InventoryReportData {
  summary: {
    total_value:    number;
    total_items:    number;
    low_stock:      number;
    out_of_stock:   number;
  };
  rows: InventoryReportRow[];
}

export interface PaymentsReportData {
  summary: {
    total_confirmed: number;
    total_pending:   number;
    total_cancelled: number;
    count:           number;
  };
  by_mode: Array<{
    mode_name: string;
    mode_code: string;
    total:     number;
    count:     number;
  }>;
  payments: Payment[];
}

export interface TvaReportLine {
  tva_rate:          number;
  base_ht_sales:     number;
  tva_collected:     number;
  base_ht_purchases: number;
  tva_deductible:    number;
  tva_due:           number;
}

// ─── Velocity Report (سرعة البيع) ──────────────────────────────────────────────

export interface VelocityReportRow {
  product_id:   number;
  product_name: string;
  product_ref:  string;
  total_qty:    number;
  doc_count:    number;
  avg_price:    number;
  velocity:     number;
  days:         number;
}

export interface VelocityReportData {
  summary: {
    total_qty:   number;
    total_docs:  number;
    period_days: number;
  };
  items: VelocityReportRow[];
}

// ─── Margin Report (تقرير الهوامش) ──────────────────────────────────────────────

export interface MarginReportRow {
  product_id:    number;
  product_name:  string;
  product_ref:   string;
  total_qty:     number;
  total_ht:      number;
  cost_price:    number;
  cost_total:    number;
  margin_amount: number;
  margin_pct:    number;
}

export interface MarginReportData {
  summary: {
    total_ht:     number;
    total_cost:   number;
    total_margin: number;
    margin_pct:   number;
  };
  items: MarginReportRow[];
}

// ─── Aging Report (لوحة الديون) ─────────────────────────────────────────────

export interface AgingBucket {
  label: string;
  total: number;
  count: number;
}

export interface AgingReportRow {
  party_id:      number;
  party_name:    string;
  total_due:     number;
  invoice_count: number;
  max_days:      number;
  bucket:        string;
}

export interface AgingReportData {
  summary: {
    total_due:   number;
    total_count: number;
    as_of_date:  string;
  };
  rows:    AgingReportRow[];
  buckets: AgingBucket[];
}

export interface TaxesReportData {
  period: { from: string; to: string };
  summary: {
    total_tva_collected:  number;
    total_tva_deductible: number;
    total_tva_due:        number;
  };
  by_rate:  TvaReportLine[];
  by_month: Array<{
    month:           string;
    tva_collected:   number;
    tva_deductible:  number;
    tva_due:         number;
  }>;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const reportsApi = {
  sales:     (p?: SalesReportParams)     => apiGet<SalesReportData>    ('/reports/sales',     p),
  purchases: (p?: PurchasesReportParams) => apiGet<PurchasesReportData>('/reports/purchases', p),
  customers: (p?: PartyReportParams)     => apiGet<PartyReportData>    ('/reports/customers', p),
  suppliers: (p?: PartyReportParams)     => apiGet<PartyReportData>    ('/reports/suppliers', p),
  products:  (p?: ProductsReportParams)  => apiGet<ProductsReportData> ('/reports/products',  p),
  inventory: (p?: InventoryReportParams) => apiGet<InventoryReportData>('/reports/inventory', p),
  payments:  (p?: PaymentsReportParams)  => apiGet<PaymentsReportData> ('/reports/payments',  p),
  taxes:     (p?: TaxesReportParams)     => apiGet<TaxesReportData>    ('/reports/taxes',     p),
  velocity:  (p?: ReportBaseParams)      => apiGet<VelocityReportData> ('/reports/velocity',  p),
  margin:    (p?: ReportBaseParams)      => apiGet<MarginReportData>   ('/reports/margin',    p),
  aging:     (p?: ReportBaseParams)      => apiGet<AgingReportData>    ('/reports/aging',     p),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSalesReport(params?: Omit<SalesReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'sales', yearId, params],
    queryFn:   () => reportsApi.sales({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function usePurchasesReport(params?: Omit<PurchasesReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'purchases', yearId, params],
    queryFn:   () => reportsApi.purchases({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useCustomersReport(params?: Omit<PartyReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'customers', yearId, params],
    queryFn:   () => reportsApi.customers({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useSuppliersReport(params?: Omit<PartyReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'suppliers', yearId, params],
    queryFn:   () => reportsApi.suppliers({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useProductsReport(params?: Omit<ProductsReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'products', yearId, params],
    queryFn:   () => reportsApi.products({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useInventoryReport(params?: InventoryReportParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'inventory', params],
    queryFn:   () => reportsApi.inventory(params),
    enabled:   !!slug,
    staleTime: 3 * 60_000,
  });
}

export function usePaymentsReport(params?: Omit<PaymentsReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'payments', yearId, params],
    queryFn:   () => reportsApi.payments({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useTvaReport() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  tenantKeys.reports.tva(slug ?? '', yearId ?? 0),
    queryFn:   () => reportsApi.taxes({ year_id: yearId ?? undefined }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useVelocityReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'velocity', yearId, params],
    queryFn:   () => reportsApi.velocity({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useMarginReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'margin', yearId, params],
    queryFn:   () => reportsApi.margin({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useAgingReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'aging', yearId, params],
    queryFn:   () => reportsApi.aging({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 3 * 60_000,
  });
}

// useDebtsReport → يستخدم customers report مع balance
export function useDebtsReport() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  tenantKeys.reports.debts(slug ?? ''),
    queryFn:   () => reportsApi.customers({ year_id: yearId ?? undefined, with_balance: true }),
    enabled:   !!slug,
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

## FILE: resources/js/lib/api/endpoints/roles.ts
```
// lib/api/endpoints/roles.ts
// ════════════════════════════════════════════════════════════════════════════
// Roles & Permissions API — قراءة وكتابة
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../core/client";
import { tenantKeys } from "../core/queryKeys";
import { useActiveSlug } from "../../store/appStore";
import type { Permission, Role } from "../core/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoleWithPermissions extends Role {
    permissions: Permission[];
    users_count?: number;
}

export interface PermissionsGrouped {
    [group: string]: Permission[];
}

export interface CreateRolePayload {
    name: string;
    display_name?: string;
    description?: string;
    guard_name?: string;
    permission_ids?: number[];
}

export interface UpdateRolePayload {
    display_name?: string;
    description?: string;
    permission_ids?: number[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export const rolesApi = {
    /** جلب كل الأدوار مع صلاحياتها */
    list: () =>
        apiGet<RoleWithPermissions[]>("/roles", {
            per_page: 100,
            sort: "name",
        }),

    /** جلب دور واحد */
    show: (id: number) => apiGet<RoleWithPermissions>(`/roles/${id}`),

    /** إنشاء دور */
    create: (data: CreateRolePayload) =>
        apiPost<RoleWithPermissions>("/roles", data),

    /** تحديث دور */
    update: (id: number, data: UpdateRolePayload) =>
        apiPut<RoleWithPermissions>(`/roles/${id}`, data),

    /** حذف دور */
    delete: (id: number) => apiDelete(`/roles/${id}`),
} as const;

export const permissionsApi = {
    /** جلب كل الصلاحيات */
    list: () =>
        apiGet<Permission[]>("/permissions", { per_page: 500, sort: "group" }),

    /** جلب الصلاحيات مجمّعة حسب المجموعة */
    byGroup: (group?: string) =>
        apiGet<PermissionsGrouped | Permission[]>(
            "/permissions/by-group",
            group ? { group } : undefined,
        ),

    /** صلاحيات المستخدم الحالي */
    myPermissions: () => apiGet<string[]>("/me/permissions"),

    /** صلاحيات المستخدم الحالي مع الأدوار */
    myRoles: () =>
        apiGet<{ roles: Role[]; permissions: string[] }>("/me/roles"),
} as const;

// ─── Query Keys ───────────────────────────────────────────────────────────────

// ✅ مدمجة في tenantKeys من queryKeys.ts — لكن نُصدّرها هنا للراحة
export const roleKeys = {
    all: (slug: string) => [...tenantKeys.lookups.roles(slug)] as const,
    list: (slug: string) =>
        [...tenantKeys.lookups.roles(slug), "list"] as const,
    detail: (slug: string, id: number) =>
        [...tenantKeys.lookups.roles(slug), id] as const,
    permissions: (slug: string) =>
        [...tenantKeys.lookups.roles(slug), "permissions"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * ✅ جلب كل الأدوار مع صلاحياتها
 * يحل مشكلة التكرار لأن الباكاند يُضيف ->distinct()
 */
export function useRoles() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: roleKeys.list(slug),
        queryFn: () => rolesApi.list().then(r => r?.data ?? r ?? []),
        enabled: !!slug,
        staleTime: 5 * 60_000,
        select: (data) => {
            const items = Array.isArray(data) ? data : [];
            const seen = new Map<string, typeof items[0]>();
            for (const role of items) {
                if (!seen.has(role.name)) {
                    seen.set(role.name, role);
                }
            }
            return Array.from(seen.values());
        },
    });
}

/**
 * جلب دور واحد
 */
export function useRole(id: number) {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: roleKeys.detail(slug, id),
        queryFn: () => rolesApi.show(id),
        enabled: !!slug && !!id,
        staleTime: 5 * 60_000,
    });
}

/**
 * ✅ جلب الصلاحيات مجمّعة حسب المجموعة
 */
export function usePermissionsGrouped() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: [...roleKeys.permissions(slug), "grouped"],
        queryFn: () => permissionsApi.byGroup(),
        enabled: !!slug,
        staleTime: 10 * 60_000, // صلاحيات لا تتغير كثيراً
        select: (data): PermissionsGrouped => {
            // data قد تكون grouped dict أو array مسطّح
            if (Array.isArray(data)) {
                // حوّل array إلى grouped
                return (data as Permission[]).reduce<PermissionsGrouped>(
                    (acc, p) => {
                        const group = p.group ?? "أخرى";
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(p);
                        return acc;
                    },
                    {},
                );
            }
            return data as PermissionsGrouped;
        },
    });
}

/**
 * ✅ صلاحيات المستخدم الحالي
 */
export function useMyPermissions() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: [...roleKeys.all(slug), "my-permissions"],
        queryFn: permissionsApi.myPermissions,
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

/**
 * ✅ أدوار وصلاحيات المستخدم الحالي معاً
 */
export function useMyRolesAndPermissions() {
    const slug = useActiveSlug() ?? "";

    return useQuery({
        queryKey: [...roleKeys.all(slug), "my-roles"],
        queryFn: permissionsApi.myRoles,
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateRole() {
    const slug = useActiveSlug() ?? "";
    const qc = useQueryClient();

    return useMutation({
        mutationFn: rolesApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: roleKeys.all(slug) });
        },
    });
}

export function useUpdateRole() {
    const slug = useActiveSlug() ?? "";
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateRolePayload }) =>
            rolesApi.update(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: roleKeys.all(slug) });
            qc.invalidateQueries({ queryKey: roleKeys.detail(slug, id) });
        },
    });
}

export function useDeleteRole() {
    const slug = useActiveSlug() ?? "";
    const qc = useQueryClient();

    return useMutation({
        mutationFn: rolesApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: roleKeys.all(slug) });
        },
    });
}

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
    apiPost<{ message: string }>(
      `/${slug}/seeds/${key}`,
      undefined,
      { _skipSlug: true } as Parameters<typeof apiPost>[2],
    ),
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
// lib/api/endpoints/settings.ts — النسخة المُصلحة والمكتملة
//
// الإصلاحات:
// ① settingsApi.list()    → يُرجع dict، نُحوِّله لـ array داخلياً
// ② settingsApi.byGroup() → يُرجع array من objects مباشرة (صحيح)
// ③ settingsApi.update()  → PATCH (لا fallback لـ POST — الـ backend يدعمه)
// ④ useSettingsByGroup()  → hook متخصص يُرجع array (ما يتوقعه SettingsPage)
// ⑤ gs() helper          → آمن مع أي صيغة response
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Setting {
  key:         string;
  value:       unknown;
  group:       string;
  type?:       string;
  is_editable?: boolean;
  updated_at?: string;
}

/** الصيغة التي يُرجعها GET /settings (dictionary) */
export type SettingsDict = Record<string, {
  value:       unknown;
  group:       string;
  type:        string;
  is_editable: boolean;
}>;

// ─── API functions ────────────────────────────────────────────────────────────

export const settingsApi = {

  /**
   * GET /settings → dictionary
   * يُرجع: { "app_name": { value, group, type, is_editable }, ... }
   */
  list: () => apiGet<SettingsDict>('/settings'),

  /**
   * PATCH /settings → تحديث متعدد
   * يقبل: { "app_name": "My App", "tax_regime": "reel", ... }
   * يُرجع: [{ key, value, group, type }, ...]
   *
   * ✅ PATCH فقط — الـ backend يدعمه صراحةً في المسارات
   */
  update: (settings: Record<string, unknown>) =>
    apiPatch<Setting[]>('/settings', settings),

  /**
   * GET /settings/group/{group} → array من objects
   * يُرجع: [{ key, value, group, type, is_editable, updated_at }, ...]
   *
   * ✅ هذا الشكل متوافق مع ما يتوقعه SettingsPage:
   *   (rawSettings as any[]).find(s => s.key === key)?.value
   */
  byGroup: (group: string) => apiGet<Setting[]>(`/settings/group/${group}`),

  /**
   * GET /settings/{key} → إعداد واحد
   */
  getValue: (key: string) =>
    apiGet<{ key: string; value: unknown; group: string; type: string }>(`/settings/${key}`),

} as const;

// ─── Helper: gs() — جلب قيمة آمنة من array ──────────────────────────────────

/**
 * ✅ gs() — Get Setting value بأمان
 *
 * يعمل مع:
 *   - rawSettings: Setting[] (array من objects)
 *   - إرجاع القيمة مع default إذا لم توجد
 *
 * الاستخدام:
 *   const gs = makeGs(rawSettings);
 *   gs('app_name', 'My App') → 'My App'
 */
export function makeGs(rawSettings: Setting[]) {
  return function gs<T = unknown>(key: string, defaultValue: T): T {
    const found = rawSettings.find(s => s.key === key);
    if (!found) return defaultValue;
    const v = found.value;
    if (v === null || v === undefined || v === '') return defaultValue;
    return v as T;
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * جلب كل الإعدادات كـ dictionary
 * للاستخدام في Export/Import وغيرها
 */
export function useSettingsDict() {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey:  tenantKeys.settings.current(slug),
    queryFn:   settingsApi.list,
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

/**
 * ✅ جلب إعدادات مجموعة محددة كـ array من objects
 *
 * يُستخدم في كل تبويبات الإعدادات:
 *   const { data: rawSettings = [] } = useSettingsByGroup('invoice');
 *   const gs = makeGs(rawSettings);
 *   const design = gs('invoice_design', 'classic');
 */
// settings.ts — الإصلاح الفوري والنهائي
export function useSettingsByGroup(group: string) {
  const slug = useActiveSlug() ?? '';

  return useQuery({
    queryKey:  [...tenantKeys.settings.current(slug), group],
    queryFn:   async () => {
      // ✅ نجلب كل الإعدادات من endpoint الذي يعمل
      // ونفلتر محلياً بدل endpoint byGroup الذي يُرجع []
      const dict = await settingsApi.list();

      return Object.entries(dict)
        .filter(([_, meta]) => (meta as any).group === group)
        .map(([key, meta]) => ({
          key,
          value:       (meta as any).value,
          group:       (meta as any).group,
          type:        (meta as any).type        ?? 'string',
          is_editable: (meta as any).is_editable ?? true,
          updated_at:  undefined, // list() لا يُرجع updated_at
        } satisfies Setting));
    },
    enabled:              !!slug && !!group,
    staleTime:            5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData:      [],
  });
}

/**
 * Mutation لتحديث الإعدادات
 *
 * الاستخدام:
 *   const { mutateAsync: saveSettings, isPending } = useUpdateSettings();
 *   await saveSettings({ app_name: 'My App', tax_regime: 'reel' });
 */
export function useUpdateSettings() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      // ✅ أبطل كل الـ settings queries للـ slug الحالي
      qc.invalidateQueries({ queryKey: tenantKeys.settings.current(slug) });
    },
    onError: (err: unknown) => {
      const e = err as { status?: number; message?: string; errors?: unknown };
      console.error('[Settings Update Error]', {
        status:  e.status,
        message: e.message,
        errors:  e.errors,
      });
    },
  });
}

// ─── Legacy exports (للتوافق مع الكود القديم) ────────────────────────────────

/** @deprecated استخدم useUpdateSettings() بدلاً منه */
export function useSettingsMutations() {
  return { update: useUpdateSettings() };
}

```

## FILE: resources/js/lib/api/endpoints/taxManagement.ts
```
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

export interface TvaRate {
  rate: number;
  label: string;
}

export interface TimbreBaremeItem {
  from_amount: number;
  to_amount: number | null;
  rate: number;
  type: string;
  amount: number | null;
}

/** @deprecated Kept for ifuSettings endpoint. Use IfuDocumentSource instead. */
export interface IFUCategoryConfig {
  document_codes: string[];
  require_locked: boolean;
  base: 'purchases' | 'margin' | 'revenue';
}

/** @deprecated Kept for ifuSettings endpoint. Use TaxConfig instead. */
export interface IFUSettings {
  ifu_source_document_types: {
    subsidized: IFUCategoryConfig;
    other_goods: IFUCategoryConfig;
    services: IFUCategoryConfig;
  };
  ifu_require_locked: boolean;
  ifu_period_type: 'annual' | 'monthly';
  ifu_rate_subsidized: number | null;
  ifu_rate_goods: number;
  ifu_rate_services: number;
  ifu_rate_auto: number;
  ifu_minimum: number;
  ifu_minimum_auto: number;
}

export interface IfuDocumentSource {
  category: 'subsidized' | 'other_goods' | 'services';
  base: 'purchases' | 'margin' | 'revenue';
  require_locked: boolean;
  document_codes: string[];
}

export interface DocumentType {
  id: number;
  code: string;
  name: string;
  name_latin: string;
  document_base_operation_id: number;
  operation?: 'purchase' | 'sale';
}

export interface TaxConfig {
  id: number;
  company_id: number;
  regime: 'forfaitaire' | 'reel';
  tva_rates?: TvaRate[];
  timbre_bareme?: TimbreBaremeItem[];
  ifu_document_sources?: IfuDocumentSource[];
  g50_deadline_day?: number;
  ifu_rate_goods?: number;
  ifu_rate_services?: number;
  ifu_rate_auto?: number;
  ifu_rate_subsidized?: number | null;
  ifu_minimum?: number;
  ifu_minimum_auto?: number;
  ifu_ca_threshold?: number;
  ifu_require_locked?: boolean;
  ifu_period_type?: string;
  g12_previsionnel_deadline?: string;
  g12_definitif_deadline?: string;
  g12_tranche1_pct?: number;
  g12_tranche2_pct?: number;
  g12_tranche3_pct?: number;
  g12_tranche2_deadline?: string;
  g12_tranche3_deadline?: string;
  timbre_fiscal_electronic_exempt?: boolean;
  is_active?: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RegulatedProduct {
  id: number;
  company_id: number;
  product_key: string;
  label: string;
  unit_label: string;
  category: string;
  regulated_max_price: number;
  regulated_margin?: number;
  regulation_type: 'price' | 'margin';
  legal_reference?: string;
  effective_date?: string;
  active: boolean;
  notes?: string;
}

export interface SubsidizedSalesSummary {
  id: number;
  company_id: number;
  fiscal_year_id: number;
  month?: number;
  product_key: string;
  product_label: string;
  qty_sold: number;
  weighted_avg_sell_price: number;
  pmp: number;
  total_revenue: number;
  total_purchase_cost: number;
  margin: number;
  ifu_due: number;
  price_violation: boolean;
  computed_at: string;
}

export interface SubsidizedSalesResult {
  summaries: SubsidizedSalesSummary[];
  totals: {
    total_qty: number;
    total_margin: number;
    total_ifu: number;
    violations_count?: number;
  };
}

export interface TaxDeclarationPeriod {
  id: number;
  company_id: number;
  fiscal_year_id: number;
  form_type: 'g50' | 'g12' | 'g12bis';
  month?: number;
  year?: number;
  tva_collectee?: number;
  tva_deductible?: number;
  tva_carry_fwd?: number;
  tva_net?: number;
  tva_due?: number;
  timbre_fiscal?: number;
  ifu_subsidized?: number;
  ifu_other?: number;
  ifu_total?: number;
  ifu_minimum?: number;
  amount_due: number;
  amount_paid?: number;
  status: 'draft' | 'submitted' | 'paid';
  notes?: string;
  created_by?: number;
  filed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IFUDeclaration {
  subsidized: {
    rows:           SubsidizedSalesSummary[];
    base_amount:    number;
    ifu_amount:     number;
    rate:           number;
    doc_codes:      string[];
    base_type:      string;
    require_locked: boolean;
  };
  other_goods: {
    base_amount:    number;
    ifu_amount:     number;
    rate:           number;
    doc_codes:      string[];
    base_type:      string;
    require_locked: boolean;
  };
  services: {
    base_amount:    number;
    ifu_amount:     number;
    rate:           number;
    doc_codes:      string[];
    base_type:      string;
    require_locked: boolean;
  };
  config_info: {
    subsidized:  { doc_codes: string[]; require_locked: boolean; base_type: string; rate: number };
    other_goods: { doc_codes: string[]; require_locked: boolean; base_type: string; rate: number };
    services:    { doc_codes: string[]; require_locked: boolean; base_type: string; rate: number };
  };
  summary: {
    ifu_subsidized: number;
    ifu_other:      number;
    ifu_services:   number;
    ifu_auto:       number;
    ifu_total:      number;
    ifu_minimum:    number;
    ifu_due:        number;
  };
  payment_schedule: {
    tranche1_pct:      number;
    tranche1_amount:   number;
    tranche1_deadline: string;
    tranche2_pct:      number;
    tranche2_amount:   number;
    tranche2_deadline: string;
    tranche3_pct:      number;
    tranche3_amount:   number;
    tranche3_deadline: string;
    g12bis_deadline:   string;
  };
  fiscal_year_id: number;
  // Flattened fields for backward compat
  ifu_subsidized?: number;
  ifu_other?:      number;
  ifu_total?:      number;
  ifu_minimum?:    number;
  amount_due?:     number;
  status?:         'draft' | 'submitted' | 'paid';
}

export const taxManagementApi = {
  // ── Tax Configuration ────────────────────────────────────
  getConfig: (regime: string) =>
    apiGet<TaxConfig>(`/tax-config/${regime}`),

  updateConfig: (regime: string, data: Record<string, unknown>) =>
    apiPut<TaxConfig>(`/tax-config/${regime}`, data),

  getConfigHistory: (regime: string) =>
    apiGet<TaxConfig[]>(`/tax-config/${regime}/history`),

  getIFUSettings: () =>
    apiGet<IFUSettings>('/tax-config/ifu-settings'),

  // ── Regulated Products ──────────────────────────────────
  getRegulatedProducts: (activeOnly = true) =>
    apiGet<RegulatedProduct[]>('/regulated-products', { active_only: activeOnly }),

  createRegulatedProduct: (data: Partial<RegulatedProduct>) =>
    apiPost<RegulatedProduct>('/regulated-products', data),

  updateRegulatedProduct: (id: number, data: Partial<RegulatedProduct>) =>
    apiPut<RegulatedProduct>(`/regulated-products/${id}`, data),

  toggleRegulatedProduct: (id: number) =>
    apiPatch<RegulatedProduct>(`/regulated-products/${id}/toggle`),

  deleteRegulatedProduct: (id: number) =>
    apiDelete(`/regulated-products/${id}`),

  seedDefaultRegulatedProducts: () =>
    apiPost<{ message: string }>('/regulated-products/seed-defaults'),

  // ── Subsidized Sales ────────────────────────────────────
  getSubsidizedSummary: (fiscalYearId: number, month?: number) =>
    apiGet<SubsidizedSalesResult>('/subsidized-sales/summary', {
      fiscal_year_id: fiscalYearId,
      ...(month ? { month } : {}),
    }),

  computeSubsidizedSales: (fiscalYearId: number, month?: number) =>
    apiPost<SubsidizedSalesResult>('/subsidized-sales/compute', {
      fiscal_year_id: fiscalYearId,
      ...(month ? { month } : {}),
    }),

  getSubsidizedViolations: (fiscalYearId: number) =>
    apiGet<SubsidizedSalesSummary[]>('/subsidized-sales/violations', {
      fiscal_year_id: fiscalYearId,
    }),

  updateSubsidizedRow: (id: number, data: Partial<SubsidizedSalesSummary>) =>
    apiPut<SubsidizedSalesSummary>(`/subsidized-sales/${id}`, data),

  deleteSubsidizedRow: (id: number) =>
    apiDelete(`/subsidized-sales/${id}`),

  // ── G50 Declaration ────────────────────────────────────
  getG50Declaration: (fiscalYearId: number, month: number) =>
    apiGet<Record<string, unknown>>('/g50-declaration', {
      fiscal_year_id: fiscalYearId,
      month,
    }),

  saveG50Period: (data: Partial<TaxDeclarationPeriod>) =>
    apiPost<TaxDeclarationPeriod>('/g50-declaration/save-period', data),

  getG50History: (fiscalYearId: number) =>
    apiGet<TaxDeclarationPeriod[]>('/g50-declaration/history', {
      fiscal_year_id: fiscalYearId,
    }),

  // ── IFU Declaration ────────────────────────────────────
  getIFUDeclaration: (fiscalYearId: number, month?: number) =>
    apiGet<IFUDeclaration>('/ifu-declaration', {
      fiscal_year_id: fiscalYearId,
      ...(month ? { month } : {}),
    }),

  saveIFUPeriod: (data: Partial<TaxDeclarationPeriod>) =>
    apiPost<TaxDeclarationPeriod>('/ifu-declaration/save-period', data),

  getIFUHistory: (fiscalYearId: number) =>
    apiGet<TaxDeclarationPeriod[]>('/ifu-declaration/history', {
      fiscal_year_id: fiscalYearId,
    }),
} as const;

// ─── Query Hooks ────────────────────────────────────────────

export function useTaxConfig(regime: string) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.taxConfig.detail(slug ?? '', regime),
    queryFn: () => taxManagementApi.getConfig(regime),
    enabled: !!slug && !!regime,
    staleTime: 5 * 60_000,
  });
}

export function useTaxConfigHistory(regime: string) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.taxConfig.history(slug ?? '', regime),
    queryFn: () => taxManagementApi.getConfigHistory(regime),
    enabled: !!slug && !!regime,
    staleTime: 5 * 60_000,
  });
}

export function useRegulatedProducts(activeOnly = true) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.regulatedProducts.list(slug ?? '', { active_only: activeOnly }),
    queryFn: () => taxManagementApi.getRegulatedProducts(activeOnly),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useSubsidizedSummary(fiscalYearId: number | null, month?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.subsidizedSales.summary(slug ?? '', fiscalYearId ?? 0, month),
    queryFn: () => taxManagementApi.getSubsidizedSummary(fiscalYearId!, month),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

export function useSubsidizedViolations(fiscalYearId: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.subsidizedSales.violations(slug ?? '', fiscalYearId ?? 0),
    queryFn: () => taxManagementApi.getSubsidizedViolations(fiscalYearId!),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

export function useG50Declaration(fiscalYearId: number | null, month: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.g50Declaration.detail(slug ?? '', fiscalYearId ?? 0, month ?? 0),
    queryFn: () => taxManagementApi.getG50Declaration(fiscalYearId!, month!),
    enabled: !!slug && !!fiscalYearId && !!month,
    staleTime: 5 * 60_000,
    select: (data: Record<string, unknown>) => ({
      ...data,
      amount_due: data.total_due,
      timbre_fiscal: data.timbre_total,
    }),
  });
}

export function useG50History(fiscalYearId: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.g50Declaration.history(slug ?? '', fiscalYearId ?? 0),
    queryFn: () => taxManagementApi.getG50History(fiscalYearId!),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

export function useIFUDeclaration(fiscalYearId: number | null, month?: number) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.ifuDeclaration.detail(slug ?? '', fiscalYearId ?? 0, month),
    queryFn: () => taxManagementApi.getIFUDeclaration(fiscalYearId!, month),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
    select: (data: IFUDeclaration) => ({
      ...data,
      ifu_subsidized: data.summary?.ifu_subsidized,
      ifu_other:      data.summary?.ifu_other,
      ifu_total:      data.summary?.ifu_total,
      ifu_minimum:    data.summary?.ifu_minimum,
      amount_due:     data.summary?.ifu_due,
    }),
  });
}

export function useIFUSettings() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.taxConfig.detail(slug ?? '', 'forfaitaire'),
    queryFn: () => taxManagementApi.getIFUSettings(),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useDocumentTypes(operation?: 'purchase' | 'sale' | 'transfer') {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [...(slug ? [slug] : ['']), 'document-types', operation],
    queryFn: () => apiGet<DocumentType[]>('/document-types', operation ? { operation } : {}),
    enabled: !!slug,
    staleTime: 10 * 60_000,
  });
}

export function useIFUHistory(fiscalYearId: number | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.ifuDeclaration.history(slug ?? '', fiscalYearId ?? 0),
    queryFn: () => taxManagementApi.getIFUHistory(fiscalYearId!),
    enabled: !!slug && !!fiscalYearId,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useTaxManagementMutations() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const inv = (keys: readonly unknown[]) => { if (slug) qc.invalidateQueries({ queryKey: keys, refetchType: 'active' }); };

  return {
    updateConfig: useMutation({
      mutationFn: ({ regime, data }: { regime: string; data: Record<string, unknown> }) =>
        taxManagementApi.updateConfig(regime, data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'tax-config'] });
      },
    }),

    createRegulatedProduct: useMutation({
      mutationFn: (data: Partial<RegulatedProduct>) =>
        taxManagementApi.createRegulatedProduct(data),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    updateRegulatedProduct: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<RegulatedProduct> }) =>
        taxManagementApi.updateRegulatedProduct(id, data),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    toggleRegulatedProduct: useMutation({
      mutationFn: (id: number) => taxManagementApi.toggleRegulatedProduct(id),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    deleteRegulatedProduct: useMutation({
      mutationFn: (id: number) => taxManagementApi.deleteRegulatedProduct(id),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    seedDefaults: useMutation({
      mutationFn: () => taxManagementApi.seedDefaultRegulatedProducts(),
      onSuccess: () => inv(tenantKeys.regulatedProducts.all(slug ?? '')),
    }),

    computeSubsidizedSales: useMutation({
      mutationFn: ({ fiscalYearId, month }: { fiscalYearId: number; month?: number }) =>
        taxManagementApi.computeSubsidizedSales(fiscalYearId, month),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'subsidized-sales'] });
      },
    }),

    updateSubsidizedRow: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<SubsidizedSalesSummary> }) =>
        taxManagementApi.updateSubsidizedRow(id, data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'subsidized-sales'] });
      },
    }),

    deleteSubsidizedRow: useMutation({
      mutationFn: (id: number) => taxManagementApi.deleteSubsidizedRow(id),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'subsidized-sales'] });
      },
    }),

    saveG50Period: useMutation({
      mutationFn: (data: Partial<TaxDeclarationPeriod>) =>
        taxManagementApi.saveG50Period(data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'g50'] });
      },
    }),

    saveIFUPeriod: useMutation({
      mutationFn: (data: Partial<TaxDeclarationPeriod>) =>
        taxManagementApi.saveIFUPeriod(data),
      onSuccess: () => {
        if (slug) qc.invalidateQueries({ queryKey: [slug, 'ifu'] });
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


====================================================
⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
====================================================
