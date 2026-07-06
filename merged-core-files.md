

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

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

