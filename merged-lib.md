

# =========================================
# 🧠 lib
# =========================================

## FILE: resources/js/lib/api/core/client.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/client.ts — FIXED
// ════════════════════════════════════════════════════════════════════════════

import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// ─── Slug getter (يُربط مرة واحدة عند init) ──────────────────────────────────
let _getSlug: () => string | null = () => null;

export function connectSlugToInterceptor(getter: () => string | null): void {
  _getSlug = getter;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ApiErrorPayload {
  message: string;
  code?:   string;
  errors?: Record<string, string[]>;
  meta?:   Record<string, unknown>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code:   string;
  public readonly errors: Record<string, string[]>;
  public readonly meta:   Record<string, unknown>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message ?? 'حدث خطأ غير متوقع');
    this.name   = 'ApiError';
    this.status = status;
    this.code   = payload.code   ?? 'UNKNOWN';
    this.errors = payload.errors ?? {};
    this.meta   = payload.meta   ?? {};
  }

  hasFieldError = (field: string) => field in this.errors;
  fieldError    = (field: string) => this.errors[field]?.[0];
}

// ─── Token storage ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'auth_token';
export const tokenStorage = {
  get:   () => localStorage.getItem(TOKEN_KEY),
  set:   (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
} as const;

export const setAuthToken   = tokenStorage.set;
export const clearAuthToken = tokenStorage.clear;
export const getAuthToken   = tokenStorage.get;

// ─── Request ID ───────────────────────────────────────────────────────────────
let _counter = 0;
const newReqId = () => `${Date.now().toString(36)}-${(++_counter % 1_000_000).toString(36)}`;

// ─── PUBLIC paths (لا يُضاف لها slug) ─────────────────────────────────────────
// ⚠️  مهم: هذه المسارات تُطابَق بالـ prefix — تأكد أنها تشمل كل Global Lookups
const PUBLIC_PREFIXES = [
  '/auth',
  '/companies',
  '/admin',
  '/wilayas',
  '/communes',
  '/genders',
  // ── Global Lookups (مشتركة بين الشركات) ──
  '/currencies',
  '/tvas',
  '/legal-forms',
  '/fiscal-stamps',
  '/document-types',
  '/document-statuses',
  '/document-base-operations',
  '/fiscal-stamps',
  '/stock-movement-types',
  '/inventory-valuation-methods',
  '/product-types',
  '/party-types',
  '/treasury-account-types',
] as const;

const isPublicPath = (url: string): boolean => {
  const path = url.split('?')[0];
  return (PUBLIC_PREFIXES as readonly string[]).some(p => path === p || path.startsWith(p + '/'));
};

// ─── In-flight deduplication ──────────────────────────────────────────────────
const _pending = new Map<string, Promise<unknown>>();
const reqKey   = (c: AxiosRequestConfig) =>
  `${c.method?.toUpperCase()}::${c.url}::${JSON.stringify(c.params ?? {})}`;

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

// ─── REQUEST interceptor ──────────────────────────────────────────────────────
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const slug        = _getSlug();
    const originalUrl = config.url ?? '';

    // أضف slug فقط للمسارات tenant
    if (slug && !isPublicPath(originalUrl)) {
      if (!originalUrl.startsWith(`/${slug}/`) && !originalUrl.startsWith(`/${slug}`)) {
        config.url = `/${slug}${originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl}`;
      }
    }

    // Bearer token
    const token = tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Headers
    if (slug) config.headers['X-Company-Slug'] = slug;
    config.headers['X-Request-ID'] = newReqId();

    // رفع ملفات: timeout أطول
    if (config.data instanceof FormData) config.timeout = 60_000;

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── 401 queue ────────────────────────────────────────────────────────────────
type QueueItem = { resolve: (t: string) => void; reject: (e: unknown) => void };
let _isRefreshing = false;
let _failedQueue:  QueueItem[] = [];

const processQueue = (err: unknown, token: string | null) => {
  _failedQueue.forEach(item => err || !token ? item.reject(err) : item.resolve(token!));
  _failedQueue = [];
};

function handleForcedLogout(): void {
  tokenStorage.clear();
  try {
    sessionStorage.clear();
    localStorage.removeItem('app-store');
  } catch {}
  const ret = window.location.pathname !== '/login'
    ? window.location.pathname + window.location.search
    : '/dashboard';
  window.location.href = `/login?return=${encodeURIComponent(ret)}`;
}

// ─── RESPONSE interceptor ─────────────────────────────────────────────────────
client.interceptors.response.use(
  (res) => res,

  async (error: AxiosError<ApiErrorPayload>) => {
    const req     = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status  = error.response?.status;
    const payload = error.response?.data;

    if (status === 401) {
      if (window.location.pathname === '/login')
        return Promise.reject(new ApiError(status, payload ?? { message: 'غير مصرح' }));
      if (req._retry) { handleForcedLogout(); return Promise.reject(new ApiError(status, payload ?? { message: 'انتهت الجلسة' })); }
      if (_isRefreshing)
        return new Promise<string>((resolve, reject) => _failedQueue.push({ resolve, reject }))
          .then(t => { req.headers.Authorization = `Bearer ${t}`; return client(req); });

      _isRefreshing = req._retry = true;
      try { throw new Error('no_refresh'); }
      catch {
        processQueue(new Error('expired'), null);
        handleForcedLogout();
        return Promise.reject(new ApiError(401, { message: 'انتهت جلستك، يرجى تسجيل الدخول مجدداً' }));
      } finally { _isRefreshing = false; }
    }

    if (status === 403) {
      const code = payload?.code;
      if (code === 'COMPANY_SUSPENDED' || code === 'COMPANY_INACTIVE') {
        try { sessionStorage.removeItem('app-store'); } catch {}
        if (window.location.pathname !== '/onboarding') window.location.href = '/onboarding';
      }
      return Promise.reject(new ApiError(status, payload ?? { message: 'ممنوع' }));
    }

    if (status === 422) return Promise.reject(new ApiError(status, payload ?? { message: 'خطأ في البيانات' }));
    if (status === 429) return Promise.reject(new ApiError(status, { message: 'تجاوزت الحد المسموح به', code: 'RATE_LIMITED' }));
    if (status && status >= 500) return Promise.reject(new ApiError(status, { message: payload?.message ?? 'خطأ في الخادم', code: 'SERVER_ERROR' }));
    if (!error.response) return Promise.reject(new ApiError(0, {
      message: error.code === 'ECONNABORTED' ? 'انتهت مهلة الطلب' : 'لا يوجد اتصال بالإنترنت',
      code:    error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
    }));

    return Promise.reject(new ApiError(status ?? 0, payload ?? { message: 'خطأ غير متوقع' }));
  },
);

// ─── extractData ──────────────────────────────────────────────────────────────
// ⚠️  المشكلة الأصلية: Laravel يُعيد { data: { data: [], meta: {} } }
//    الدالة القديمة كانت تُعيد { data: [], meta: {} } كاملاً بدل [] فقط
//    React Query يُخزّنه كـ object → undefined warning + العملات لا تظهر
//
// المنطق الصحيح:
//   response.data = { data: [...] }          → يُعيد [...]
//   response.data = { data: {data:[], meta} } → يُعيد {data:[], meta} (Paginated)
//   response.data = [...]                    → يُعيد [...]
//   response.data = { status, data: ... }    → يُعيد data

export function extractData<T>(response: { data: unknown }): T {
  const outer = response?.data;

  // ① مصفوفة مباشرة (نادر في Laravel لكن ممكن)
  if (Array.isArray(outer)) return outer as T;

  if (outer !== null && typeof outer === 'object') {
    const obj = outer as Record<string, unknown>;

    // ② غلاف Laravel القياسي: { data: T, meta?, links?, message?, status? }
    if ('data' in obj) {
      const inner = obj.data;

      // ② أ — مصفوفة مباشرة: { data: [...] }
      if (Array.isArray(inner)) return inner as T;

      // ② ب — Paginated: { data: { data: [], meta: {}, links: {} } }
      if (inner !== null && typeof inner === 'object') {
        const innerObj = inner as Record<string, unknown>;
        if ('data' in innerObj && 'meta' in innerObj) {
          // هذا هو الـ PaginatedResponse — نُعيده كاملاً
          return inner as T;
        }
        // ② ج — object عادي: { data: { id, name, ... } }
        return inner as T;
      }

      // ② د — قيمة بسيطة: { data: null | string | number }
      if (inner !== undefined) return inner as T;
    }

    // ③ لا يوجد 'data' — أعد الـ object نفسه (مثل { token, user })
    return outer as T;
  }

  // ④ قيمة بسيطة
  return (outer ?? null) as T;
}

// ─── Typed API wrappers ───────────────────────────────────────────────────────
export interface LaravelResponse<T> {
  data:   T;
  meta?:  import('./types').PaginationMeta;
  links?: import('./types').PaginationLinks;
}

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> {
  const key = reqKey({ method: 'GET', url, params });
  const hit = _pending.get(key);
  if (hit) return hit as Promise<T>;

  const p = client
    .get<LaravelResponse<T>>(url, { params, ...config })
    .then(res => extractData<T>(res))
    .finally(() => _pending.delete(key));

  _pending.set(key, p);
  return p;
}

export const apiPost = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  extractData<T>(await client.post<LaravelResponse<T>>(url, data, config));

export const apiPut = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  extractData<T>(await client.put<LaravelResponse<T>>(url, data, config));

export const apiPatch = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  extractData<T>(await client.patch<LaravelResponse<T>>(url, data, config));

export const apiDelete = async (url: string, config?: AxiosRequestConfig): Promise<void> =>
  void (await client.delete(url, config));

export const apiUpload = async <T>(
  url: string,
  fd: FormData,
  onProgress?: (pct: number) => void,
): Promise<T> =>
  extractData<T>(await client.post<LaravelResponse<T>>(url, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
    onUploadProgress: e => { if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100)); },
  }));

// ─── tenantApi factory ────────────────────────────────────────────────────────
export function tenantApi(slug: string) {
  const p = (path: string) => `/${slug}/${path.replace(/^\//, '')}`;
  return {
    get:    <T>(path: string, params?: Record<string, unknown>) => apiGet<T>(p(path), params),
    post:   <T>(path: string, data?: unknown)                   => apiPost<T>(p(path), data),
    put:    <T>(path: string, data?: unknown)                   => apiPut<T>(p(path), data),
    patch:  <T>(path: string, data?: unknown)                   => apiPatch<T>(p(path), data),
    delete: (path: string)                                       => apiDelete(p(path)),
    upload: <T>(path: string, fd: FormData, cb?: (p: number) => void) => apiUpload<T>(p(path), fd, cb),
  };
}

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
      // لا تُعيد الجلب تلقائياً إلا عند انتهاء الـ staleTime
      staleTime:            10 * MINUTE,
      // احتفظ بالبيانات في الكاش لمدة أطول من staleTime
      gcTime:               30 * MINUTE,
      // لا تُعيد الجلب عند focus/mount — يُقلل الطلبات الزائدة
      refetchOnWindowFocus: false,
      refetchOnMount:       false,
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
// lib/api/core/queryKeys.ts — FIXED
// أضفنا: document-types-select (كان في الـ console error)
// ════════════════════════════════════════════════════════════════════════════

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authKeys = {
  all: ['auth']        as const,
  me:  ['auth', 'me'] as const,
} as const;

// ─── Companies ────────────────────────────────────────────────────────────────
export const companyKeys = {
  all:    ['companies']                                        as const,
  lists:  ['companies', 'list']                               as const,
  list:   (params?: Record<string, unknown>) => ['companies', 'list', params] as const,
  detail: (id: number)                       => ['companies', id]             as const,
  mine:   ['companies', 'mine']                               as const,
} as const;

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminKeys = {
  companies: {
    all:    ['admin', 'companies']                                       as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'companies', 'list', p] as const,
    detail: (id: number)                  => ['admin', 'companies', id]        as const,
    users:  (id: number)                  => ['admin', 'companies', id, 'users'] as const,
  },
  users: {
    all:    ['admin', 'users']                                     as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'users', 'list', p] as const,
    detail: (id: number)                  => ['admin', 'users', id]        as const,
  },
} as const;

// ─── Tenant keys ──────────────────────────────────────────────────────────────
export const tenantKeys = {

  fiscalYears: {
    all:    (slug: string) => [slug, 'fiscal-years']                           as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'fiscal-years', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'fiscal-years', id]          as const,
  },

  dashboard: {
    all:   (slug: string) => [slug, 'dashboard']                               as const,
    stats: (slug: string, yearId: number) => [slug, 'dashboard', 'stats', yearId] as const,
  },

  parties: {
    all:    (slug: string) => [slug, 'parties']                                as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'parties', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'parties', id]               as const,
  },

  products: {
    all:    (slug: string) => [slug, 'products']                               as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'products', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'products', id]              as const,
  },

  documents: {
    all:    (slug: string) => [slug, 'documents']                              as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'documents', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'documents', id]             as const,
    byType: (slug: string, typeCode: string, p?: Record<string, unknown>) => [slug, 'documents', typeCode, p] as const,
  },

  payments: {
    all:  (slug: string) => [slug, 'payments']                                 as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'payments', 'list', p] as const,
  },

  expenses: {
    all:  (slug: string) => [slug, 'expenses']                                 as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'expenses', 'list', p] as const,
  },

  inventory: {
    all:       (slug: string) => [slug, 'inventory']                           as const,
    stock:     (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'stock', p] as const,
    movements: (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'movements', p] as const,
  },

  // ── Tenant Lookups ────────────────────────────────────────────────────────
  lookups: {
    all:              (slug: string) => [slug, 'lookups']                      as const,
    units:            (slug: string) => [slug, 'lookups', 'units']             as const,
    warehouses:       (slug: string) => [slug, 'lookups', 'warehouses']        as const,
    priceLevels:      (slug: string) => [slug, 'lookups', 'price-levels']      as const,
    paymentModes:     (slug: string) => [slug, 'lookups', 'payment-modes']     as const,
    numberingSeries:  (slug: string) => [slug, 'lookups', 'numbering-series']  as const,
    treasuryAccounts: (slug: string) => [slug, 'lookups', 'treasury-accounts'] as const,
    expenseCategories:(slug: string) => [slug, 'lookups', 'expense-categories'] as const,
    brands:           (slug: string) => [slug, 'lookups', 'brands']            as const,
    families:         (slug: string) => [slug, 'lookups', 'families']          as const,
    roles:            (slug: string) => [slug, 'lookups', 'roles']             as const,
    users:            (slug: string) => [slug, 'lookups', 'users']             as const,
  },

  reports: {
    all:   (slug: string) => [slug, 'reports']                                 as const,
    tva:   (slug: string, yearId: number) => [slug, 'reports', 'tva', yearId] as const,
    debts: (slug: string) => [slug, 'reports', 'debts']                       as const,
  },

  settings: {
    all:     (slug: string) => [slug, 'settings']                              as const,
    current: (slug: string) => [slug, 'settings', 'current']                  as const,
  },

  users: {
    all:  (slug: string) => [slug, 'users']                                    as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'users', 'list', p] as const,
  },
} as const;

// ─── Global Lookups (مشتركة — لا تحتاج slug) ─────────────────────────────────
export const globalKeys = {
  currencies:                ['global', 'currencies']                       as const,
  tvas:                      ['global', 'tvas']                             as const,
  legalForms:                ['global', 'legal-forms']                      as const,
  fiscalStamps:              ['global', 'fiscal-stamps']                    as const,
  inventoryValuationMethods: ['global', 'inventory-valuation-methods']      as const,
  wilayas:                   ['global', 'wilayas']                          as const,
  communes:  (wilayaId: number) => ['global', 'communes', wilayaId]        as const,
  documentStatuses:          ['global', 'document-statuses']                as const,
  documentBaseOperations:    ['global', 'document-base-operations']         as const,
  // ✅ FIX: إضافة documentTypes كـ array (كان مفقوداً → undefined warning)
  documentTypes:             ['global', 'document-types']                   as const,
  // ✅ FIX: مفتاح للـ select variant المستخدَم في الصفحات
  documentTypesSelect:       ['global', 'document-types-select']            as const,
  stockMovementTypes:        ['global', 'stock-movement-types']             as const,
  productTypes:              ['global', 'product-types']                    as const,
  partyTypes:                ['global', 'party-types']                      as const,
  treasuryAccountTypes:      ['global', 'treasury-account-types']           as const,
} as const;
```

## FILE: resources/js/lib/api/core/types.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/types.ts — كامل مع الأنواع المفقودة
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
}
export interface PaginationLinks {
  first: string | null; last: string | null;
  prev:  string | null; next: string | null;
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
  page?:     number;
  per_page?: number;
  search?:   string;
  sort?:     string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginCredentials {
  email:    string;
  password: string;
}
export interface AuthResponse {
  user:  User;
  token: string;
}
export interface User extends BaseModel {
  name:       string;
  email:      string;
  avatar?:    string | null;
  company_id?:number | null;
  roles?:     Role[];
  permissions?:Permission[];
}

// ─── Active Company (Zustand) ─────────────────────────────────────────────────
export interface ActiveCompany {
  id:   number;
  name: string;
  slug: string;
}

// ─── Company ──────────────────────────────────────────────────────────────────
export interface Company extends BaseModel {
  name:            string;
  commercial_name?:string | null;
  slug:            string;
  activity?:       string | null;
  email?:          string | null;
  phone?:          string | null;
  address?:        string | null;
  avatar?:         string | null;
  owner_id:        number;
  active:          boolean;
  plan:            'free' | 'starter' | 'professional' | 'enterprise';
  max_users:       number;
  max_products:    number;
  max_warehouses:  number;
  is_suspended:    boolean;
  is_verified:     boolean;
  is_on_trial:     boolean;
  trial_days_remaining: number;
}

// ─── Fiscal Year ──────────────────────────────────────────────────────────────
export interface FiscalYear extends BaseModel {
  name:       string;
  start_date: string;
  end_date:   string;
  is_current: boolean;
  is_closed:  boolean;
  company_id: number;
}

// ─── Global Lookups ───────────────────────────────────────────────────────────
export interface Currency extends BaseModel {
  code:   string;
  name:   string;
  symbol: string;
  is_default: boolean;
}
export interface Tva extends BaseModel {
  name:  string;
  rate:  number;
  is_default: boolean;
}
export interface LegalForm extends BaseModel {
  name: string; code: string;
}
export interface FiscalStamp extends BaseModel {
  name: string; amount: number;
}
export interface InventoryValuationMethod extends BaseModel {
  name: string; code: string;
}
export interface Wilaya extends BaseModel {
  name: string; code: string;
}
export interface Commune extends BaseModel {
  name: string; wilaya_id: number;
}
export interface DocumentStatus extends BaseModel {
  name: string; code: string; color?: string;
}
export interface DocumentType extends BaseModel {
  name: string; code: string; base_operation_id: number;
}
export interface DocumentBaseOperation extends BaseModel {
  name: string; code: string;
}
export interface StockMovementType extends BaseModel {
  name: string; code: string; direction: 'in' | 'out';
}
export interface ProductType extends BaseModel {
  name: string; code: string;
}
export interface PartyType extends BaseModel {
  name: string; code: string;
}
export interface TreasuryAccountType extends BaseModel {
  name: string; code: string;
}

// ─── Tenant Lookups ───────────────────────────────────────────────────────────
export interface Unit extends BaseModel {
  name: string; symbol: string; company_id: number;
}
export interface Warehouse extends BaseModel {
  name: string; address?: string | null;
  is_default: boolean; company_id: number;
}
export interface PriceLevel extends BaseModel {
  name: string; multiplier: number;
  is_default: boolean; company_id: number;
}
export interface PaymentMode extends BaseModel {
  name: string; code: string; is_default: boolean; company_id: number;
}
export interface NumberingSeries extends BaseModel {
  name: string; prefix: string; next_number: number;
  document_type_id: number; company_id: number; is_locked: boolean;
}
export interface TreasuryAccount extends BaseModel {
  name:        string;
  code:        string;
  account_number?: string | null;
  bank_name?:  string | null;
  is_default:  boolean;
  active:      boolean;
  current_balance: number;
  initial_balance: number;
  currency_id: number;
  treasury_account_type_id: number;
  company_id:  number;
  currency?:   Currency;
  type?:       TreasuryAccountType;
}
export interface ExpenseCategory extends BaseModel {
  name: string; parent_id?: number | null; company_id: number;
}
export interface Brand extends BaseModel {
  name: string; company_id: number;
}
export interface Family extends BaseModel {
  name: string; parent_id?: number | null; company_id: number;
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────
export interface Role extends BaseModel {
  name:         string;
  display_name: string;
  company_id?:  number | null;
  permissions?: Permission[];
}
export interface Permission extends BaseModel {
  name:         string;
  display_name: string;
  group:        string;
}

// ─── Parties ──────────────────────────────────────────────────────────────────
export type PartyTypeCode = 'client' | 'supplier' | 'both';
export interface Party extends BaseModel {
  name:       string;
  type:       PartyTypeCode;
  email?:     string | null;
  phone?:     string | null;
  address?:   string | null;
  tax_id?:    string | null;
  balance:    number;
  company_id: number;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface Product extends BaseModel {
  name:       string;
  reference:  string;
  barcode?:   string | null;
  unit_id:    number;
  family_id?: number | null;
  brand_id?:  number | null;
  tva_id?:    number | null;
  price:      number;
  cost:       number;
  stock:      number;
  is_active:  boolean;
  company_id: number;
  unit?:      Unit;
  family?:    Family;
  brand?:     Brand;
  tva?:       Tva;
}

// ─── Commercial Documents ─────────────────────────────────────────────────────
export interface CommercialDocument extends BaseModel {
  number:       string;
  date:         string;
  due_date?:    string | null;
  party_id:     number;
  type_id:      number;
  status_id:    number;
  total_ht:     number;
  total_tva:    number;
  total_ttc:    number;
  paid_amount:  number;
  balance:      number;
  is_locked:    boolean;
  company_id:   number;
  fiscal_year_id: number;
  party?:       Party;
  type?:        DocumentType;
  status?:      DocumentStatus;
  lines?:       CommercialDocumentLine[];
}
export interface CommercialDocumentLine extends BaseModel {
  document_id: number;
  product_id:  number;
  quantity:    number;
  unit_price:  number;
  discount:    number;
  tva_rate:    number;
  total_ht:    number;
  total_ttc:   number;
  product?:    Product;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export interface Payment extends BaseModel {
  document_id: number;
  amount:      number;
  date:        string;
  mode_id:     number;
  reference?:  string | null;
  company_id:  number;
  mode?:       PaymentMode;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export interface Expense extends BaseModel {
  description:  string;
  amount:       number;
  date:         string;
  category_id:  number;
  is_paid:      boolean;
  company_id:   number;
  fiscal_year_id: number;
  category?:    ExpenseCategory;
}

// ─── Employees ────────────────────────────────────────────────────────────────
export interface Employee extends BaseModel {
  first_name:  string;
  last_name:   string;
  email?:      string | null;
  phone?:      string | null;
  hire_date:   string;
  is_active:   boolean;
  company_id:  number;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
export type SeedKey =
  | 'currencies' | 'tvas' | 'units' | 'legal-forms' | 'fiscal-stamps'
  | 'price-levels' | 'wilayas-communes' | 'document-base-operations'
  | 'document-statuses' | 'document-types' | 'inventory-valuation-methods'
  | 'numbering-series' | 'warehouses' | 'treasury-account-types'
  | 'treasury-accounts' | 'payment-modes' | 'expense-categories';

export interface SeedResult {
  key:     SeedKey;
  success: boolean;
  message: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_sales:     number;
  total_purchases: number;
  total_expenses:  number;
  net_profit:      number;
  clients_count:   number;
  suppliers_count: number;
  products_count:  number;
  low_stock_count: number;
}
```

## FILE: resources/js/lib/api/endpoints/auth.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/auth.ts
// Auth API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, tokenStorage } from '../core/client';
import { authKeys, companyKeys, tenantKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { clearAllCache } from '../core/queryClient';
import type { User, LoginCredentials, AuthResponse } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────

export const authApi = {
  me:     ()                       => apiGet<User>('/auth/me'),
  login:  (creds: LoginCredentials) => apiPost<AuthResponse>('/auth/login', creds),
  logout: ()                       => apiPost<void>('/auth/logout'),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * جلب المستخدم الحالي — يُشغَّل فقط إذا كان هناك token
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn:  authApi.me,
    enabled:  !!tokenStorage.get(),
    staleTime: Infinity, // لا تُعد الجلب تلقائياً — يُبطَل يدوياً عند logout
    retry: false,
  });
}

/**
 * تسجيل الدخول
 */
export function useLogin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, token }) => {
      tokenStorage.set(token);
      // حفظ المستخدم مباشرة في الكاش بدون طلب إضافي
      qc.setQueryData(authKeys.me, user);
    },
  });
}

/**
 * تسجيل الخروج — يُنظف كل الحالة
 */
export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // نُنظف حتى لو فشل الطلب
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

## FILE: resources/js/lib/api/endpoints/document.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/documents.ts
// Commercial Documents API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { CommercialDocument, PaginatedResponse, ListParams } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const documentsApi = {
  list:     (params?: ListParams)              => apiGet<PaginatedResponse<CommercialDocument>>('/documents', params),
  byType:   (typeCode: string, params?: ListParams) => apiGet<PaginatedResponse<CommercialDocument>>('/documents', { ...params, type: typeCode }),
  show:     (id: number)                       => apiGet<CommercialDocument>(`/documents/${id}`),
  create:   (data: Partial<CommercialDocument>)=> apiPost<CommercialDocument>('/documents', data),
  update:   (id: number, data: Partial<CommercialDocument>) =>
                                                  apiPut<CommercialDocument>(`/documents/${id}`, data),
  delete:   (id: number)                       => apiDelete(`/documents/${id}`),
  validate: (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/validate`),
  lock:     (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/lock`),
  unlock:   (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/unlock`),
  cancel:   (id: number)                       => apiPost<CommercialDocument>(`/documents/${id}/cancel`),
  qrcode:   (id: number)                       => apiGet<{ url: string }>(`/documents/${id}/qrcode`),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDocuments(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.documents.list(slug ?? '', params),
    queryFn:         () => documentsApi.list(params),
    enabled:         !!slug,
    staleTime:       2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDocumentsByType(typeCode: string, params?: ListParams) {
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
    queryKey: tenantKeys.documents.detail(slug ?? '', id!),
    queryFn:  () => documentsApi.show(id!),
    enabled:  !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

export function useDocumentMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const invalidate = () => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
  };

  const create   = useMutation({ mutationFn: documentsApi.create,                                                   onSuccess: invalidate });
  const update   = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<CommercialDocument> }) => documentsApi.update(id, data), onSuccess: invalidate });
  const remove   = useMutation({ mutationFn: documentsApi.delete,                                                   onSuccess: invalidate });
  const validate = useMutation({ mutationFn: documentsApi.validate,                                                  onSuccess: invalidate });
  const lock     = useMutation({ mutationFn: documentsApi.lock,                                                      onSuccess: invalidate });
  const unlock   = useMutation({ mutationFn: documentsApi.unlock,                                                    onSuccess: invalidate });
  const cancel   = useMutation({ mutationFn: documentsApi.cancel,                                                    onSuccess: invalidate });

  return { create, update, remove, validate, lock, unlock, cancel };
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
// Fiscal Years API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId, useAppStore } from '../../store/appStore';
import type { FiscalYear, ListParams } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────

export const fiscalYearsApi = {
  list:   (slug: string, params?: ListParams) =>
            apiGet<FiscalYear[]>(`/${slug}/fiscal-years`, { per_page: 50, ...params }),
  show:   (slug: string, id: number)          =>
            apiGet<FiscalYear>(`/${slug}/fiscal-years/${id}`),
  create: (slug: string, data: Partial<FiscalYear>) =>
            apiPost<FiscalYear>(`/${slug}/fiscal-years`, data),
  update: (slug: string, id: number, data: Partial<FiscalYear>) =>
            apiPut<FiscalYear>(`/${slug}/fiscal-years/${id}`, data),
  close:  (slug: string, id: number)          =>
            apiPatch<FiscalYear>(`/${slug}/fiscal-years/${id}/close`, {}),
  setCurrent: (slug: string, id: number)      =>
            apiPatch<FiscalYear>(`/${slug}/fiscal-years/${id}/set-current`, {}),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * جلب سنوات الشركة النشطة
 * مرتبط تلقائياً بـ activeSlug من Zustand
 */
export function useFiscalYears(slug?: string) {
  const activeSlug = useActiveSlug();
  const s = slug ?? activeSlug;

  return useQuery({
    queryKey: tenantKeys.fiscalYears.all(s ?? ''),
    queryFn:  () => fiscalYearsApi.list(s!),
    enabled:  !!s,
    staleTime: 5 * 60_000,
    select: (years) => ({
      years,
      current: years.find(y => y.is_current) ??
               years.find(y => !y.is_closed) ??
               years[0] ??
               null,
      open:   years.filter(y => !y.is_closed),
      closed: years.filter(y => y.is_closed),
    }),
  });
}

/**
 * السنة المالية المختارة حالياً (من Zustand + React Query)
 */
export function useSelectedFiscalYear() {
  const selectedId = useSelectedYearId();
  const { data } = useFiscalYears();

  if (!data) return null;
  if (!selectedId) return data.current;
  return data.years.find(y => y.id === selectedId) ?? data.current;
}

/**
 * إنشاء سنة مالية جديدة لشركة محددة (مستخدَم في OnboardingPage/CreateCompanyModal)
 */
export function useCreateFiscalYear(slug?: string) {
  const activeSlug = useActiveSlug();
  const s = slug ?? activeSlug;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FiscalYear>) =>
      fiscalYearsApi.create(s!, data),
    onSuccess: () => {
      if (s) qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(s) });
    },
  });
}

export function useUpdateFiscalYear() {
  const slug = useActiveSlug();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FiscalYear> }) =>
      fiscalYearsApi.update(slug!, id, data),
    onSuccess: (updated) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        qc.setQueryData(tenantKeys.fiscalYears.detail(slug, updated.id), updated);
      }
    },
  });
}

export function useCloseFiscalYear() {
  const slug = useActiveSlug();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fiscalYearsApi.close(slug!, id),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
    },
  });
}
```

## FILE: resources/js/lib/api/endpoints/inventory.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/inventory.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { PaginatedResponse, ListParams, BaseModel } from '../core/types';

export interface StockMovement extends BaseModel {
  product_id:  number;
  warehouse_id:number;
  quantity:    number;
  direction:   'in' | 'out';
  type_id:     number;
  reference?:  string | null;
  date:        string;
  company_id:  number;
  fiscal_year_id: number;
}

export const inventoryApi = {
  movements: (params?: ListParams) => apiGet<PaginatedResponse<StockMovement>>('/stock-movements', params),
  create:    (data: Partial<StockMovement>) => apiPost<StockMovement>('/stock-movements', data),
  delete:    (id: number) => apiDelete(`/stock-movements/${id}`),
} as const;

export function useStockMovements(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.inventory.movements(slug ?? '', params),
    queryFn:         () => inventoryApi.movements(params),
    enabled:         !!slug,
    staleTime:       3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) }); };

  return {
    create: useMutation({ mutationFn: inventoryApi.create, onSuccess: inv }),
    remove: useMutation({ mutationFn: inventoryApi.delete, onSuccess: inv }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/lookups.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/lookups.ts — FIXED
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { globalKeys, tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import { useAuth } from '@/context/AuthContext';
import type {
  Currency, Tva, LegalForm, FiscalStamp, InventoryValuationMethod,
  Wilaya, Commune, DocumentStatus, DocumentType, DocumentBaseOperation,
  Unit, PriceLevel, Warehouse, PaymentMode, NumberingSeries,
  TreasuryAccount, ExpenseCategory, Brand, Family, ListParams,
} from '../core/types';

// ─── Stale times ──────────────────────────────────────────────────────────────
const GLOBAL_STALE = 60 * 60_000; // ساعة
const TENANT_STALE = 10 * 60_000; // 10 دقائق

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL LOOKUPS API
// ⚠️  هذه المسارات في PUBLIC_PREFIXES في client.ts → لا يُضاف لها slug
// ══════════════════════════════════════════════════════════════════════════════

export const globalLookupsApi = {
  currencies:              () => apiGet<Currency[]>('/currencies'),
  tvas:                    () => apiGet<Tva[]>('/tvas'),
  legalForms:              () => apiGet<LegalForm[]>('/legal-forms'),
  fiscalStamps:            () => apiGet<FiscalStamp[]>('/fiscal-stamps'),
  inventoryValuationMethods: () => apiGet<InventoryValuationMethod[]>('/inventory-valuation-methods'),
  wilayas:                 () => apiGet<Wilaya[]>('/wilayas', { per_page: 500 }),
  communes:       (wilayaId: number) => apiGet<Commune[]>(`/communes/by-wilaya/${wilayaId}`),
  documentStatuses:        () => apiGet<DocumentStatus[]>('/document-statuses'),
  documentTypes:           () => apiGet<DocumentType[]>('/document-types'),
  documentBaseOperations:  () => apiGet<DocumentBaseOperation[]>('/document-base-operations'),
} as const;

// ─── Global Lookup hook factory ───────────────────────────────────────────────
// ⚠️  لا نستخدم placeholderData: [] لأن [] ليست undefined
// React Query يُحدِّث عندما تعود البيانات الحقيقية
// ⚠️  select: data => data ?? [] يضمن أن القيمة لا تكون null

function useGlobalLookup<T>(
  queryKey: readonly unknown[],
  queryFn:  () => Promise<T[]>,
) {
  const { isAuthenticated } = useAuth();

  return useQuery<T[], Error, T[]>({
    queryKey,
    queryFn,
    staleTime: GLOBAL_STALE,
    enabled:   isAuthenticated,
    // ✅ FIX: select يضمن أن البيانات لا تكون null/undefined
    select:    (data) => Array.isArray(data) ? data : [],
    // ✅ FIX: لا نضع placeholderData: [] لأنه يُسبب undefined warning
    //    بدلاً من ذلك نعتمد على data ?? [] في الكومبوننت
  });
}

// ─── Global Hooks ─────────────────────────────────────────────────────────────
export const useGlobalCurrencies             = () => useGlobalLookup(globalKeys.currencies,              globalLookupsApi.currencies);
export const useGlobalTvas                   = () => useGlobalLookup(globalKeys.tvas,                    globalLookupsApi.tvas);
export const useGlobalLegalForms             = () => useGlobalLookup(globalKeys.legalForms,              globalLookupsApi.legalForms);
export const useGlobalFiscalStamps           = () => useGlobalLookup(globalKeys.fiscalStamps,            globalLookupsApi.fiscalStamps);
export const useGlobalInventoryValuationMethods = () => useGlobalLookup(globalKeys.inventoryValuationMethods, globalLookupsApi.inventoryValuationMethods);
export const useGlobalWilayas               = () => useGlobalLookup(globalKeys.wilayas,                 globalLookupsApi.wilayas);
export const useGlobalDocumentStatuses       = () => useGlobalLookup(globalKeys.documentStatuses,        globalLookupsApi.documentStatuses);
export const useGlobalDocumentTypes          = () => useGlobalLookup(globalKeys.documentTypes,           globalLookupsApi.documentTypes);
export const useGlobalDocumentBaseOperations = () => useGlobalLookup(globalKeys.documentBaseOperations,  globalLookupsApi.documentBaseOperations);

// ─── Communes (تأخذ wilayaId) ─────────────────────────────────────────────────
export function useGlobalCommunes(wilayaId: number | null | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery<Commune[], Error, Commune[]>({
    queryKey: globalKeys.communes(wilayaId ?? 0),
    queryFn:  () => globalLookupsApi.communes(wilayaId!),
    staleTime: GLOBAL_STALE,
    enabled:   isAuthenticated && !!wilayaId,
    select:    (data) => Array.isArray(data) ? data : [],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// TENANT LOOKUPS API
// الـ interceptor يُضيف slug تلقائياً — لا داعي لإضافته في المسار
// ══════════════════════════════════════════════════════════════════════════════

export const tenantLookupsApi = {
  units:             (p?: ListParams) => apiGet<Unit[]>('/units',                   { per_page: 100, ...p }),
  warehouses:        (p?: ListParams) => apiGet<Warehouse[]>('/warehouses',         { per_page: 50,  ...p }),
  priceLevels:       (p?: ListParams) => apiGet<PriceLevel[]>('/price-levels',      { per_page: 50,  ...p }),
  paymentModes:      (p?: ListParams) => apiGet<PaymentMode[]>('/payment-modes',    { per_page: 50,  ...p }),
  numberingSeries:   (p?: ListParams) => apiGet<NumberingSeries[]>('/numbering-series', { per_page: 50, ...p }),
  treasuryAccounts:  (p?: ListParams) => apiGet<TreasuryAccount[]>('/treasury-accounts', { per_page: 50, ...p }),
  expenseCategories: (p?: ListParams) => apiGet<ExpenseCategory[]>('/expense-categories', { per_page: 100, ...p }),
  brands:            (p?: ListParams) => apiGet<Brand[]>('/brands',                 { per_page: 100, ...p }),
  families:          (p?: ListParams) => apiGet<Family[]>('/families',              { per_page: 100, ...p }),
} as const;

// ─── Generic tenant lookup hook factory ───────────────────────────────────────
function useTenantLookup<T>(
  keyFn:   (slug: string) => readonly unknown[],
  apiFn:   (p?: ListParams) => Promise<T[]>,
  params?: ListParams,
) {
  const slug = useActiveSlug();

  return useQuery<T[], Error, T[]>({
    queryKey: keyFn(slug ?? ''),
    queryFn:  () => apiFn(params),
    enabled:  !!slug,
    staleTime: TENANT_STALE,
    // ✅ FIX: نفس الحل — select يضمن array دائماً
    select:    (data) => Array.isArray(data) ? data : [],
  });
}

// ─── Tenant Hooks ─────────────────────────────────────────────────────────────
export const useUnits             = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.units,             tenantLookupsApi.units,             p);
export const useWarehouses        = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.warehouses,        tenantLookupsApi.warehouses,        p);
export const usePriceLevels       = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.priceLevels,       tenantLookupsApi.priceLevels,       p);
export const usePaymentModes      = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.paymentModes,      tenantLookupsApi.paymentModes,      p);
export const useNumberingSeries   = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.numberingSeries,   tenantLookupsApi.numberingSeries,   p);
export const useTreasuryAccounts  = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.treasuryAccounts,  tenantLookupsApi.treasuryAccounts,  p);
export const useExpenseCategories = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.expenseCategories, tenantLookupsApi.expenseCategories, p);
export const useBrands            = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.brands,            tenantLookupsApi.brands,            p);
export const useFamilies          = (p?: ListParams) => useTenantLookup(tenantKeys.lookups.families,          tenantLookupsApi.families,          p);

// ─── CRUD mutations لجداول البحث التينانت ────────────────────────────────────
type LookupEntity = Unit | Warehouse | PriceLevel | PaymentMode | Brand | Family | ExpenseCategory;

function useLookupMutations<T extends LookupEntity>(
  resource: string,
  keyFn:    (slug: string) => readonly unknown[],
) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: keyFn(slug) }); };

  return {
    create: useMutation({ mutationFn: (data: Partial<T>) => apiPost<T>(`/${resource}`, data),                                    onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<T> }) => apiPut<T>(`/${resource}/${id}`, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: number)                                     => apiDelete(`/${resource}/${id}`),       onSuccess: inv }),
  };
}

export const useUnitMutations             = () => useLookupMutations<Unit>('units',                tenantKeys.lookups.units);
export const useWarehouseMutations        = () => useLookupMutations<Warehouse>('warehouses',      tenantKeys.lookups.warehouses);
export const usePriceLevelMutations       = () => useLookupMutations<PriceLevel>('price-levels',   tenantKeys.lookups.priceLevels);
export const usePaymentModeMutations      = () => useLookupMutations<PaymentMode>('payment-modes', tenantKeys.lookups.paymentModes);
export const useBrandMutations            = () => useLookupMutations<Brand>('brands',              tenantKeys.lookups.brands);
export const useFamilyMutations           = () => useLookupMutations<Family>('families',           tenantKeys.lookups.families);
export const useExpenseCategoryMutations  = () => useLookupMutations<ExpenseCategory>('expense-categories', tenantKeys.lookups.expenseCategories);
export const useNumberingSeriesMutations  = () => useLookupMutations<NumberingSeries>('numbering-series',   tenantKeys.lookups.numberingSeries);
export const useTreasuryAccountMutations  = () => useLookupMutations<TreasuryAccount>('treasury-accounts',  tenantKeys.lookups.treasuryAccounts);
```

## FILE: resources/js/lib/api/endpoints/parties.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/parties.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Party, PaginatedResponse, ListParams } from '../core/types';

export const partiesApi = {
  list:      (params?: ListParams)         => apiGet<PaginatedResponse<Party>>('/parties', params),
  clients:   (params?: ListParams)         => apiGet<PaginatedResponse<Party>>('/customers', params),
  suppliers: (params?: ListParams)         => apiGet<PaginatedResponse<Party>>('/suppliers', params),
  show:      (id: number)                  => apiGet<Party>(`/parties/${id}`),
  create:    (data: Partial<Party>)        => apiPost<Party>('/parties', data),
  update:    (id: number, data: Partial<Party>) => apiPut<Party>(`/parties/${id}`, data),
  delete:    (id: number)                  => apiDelete(`/parties/${id}`),
} as const;

function usePartyList(params?: ListParams & { partyType?: 'client' | 'supplier' | 'all' }) {
  const slug = useActiveSlug();
  const { partyType = 'all', ...rest } = params ?? {};
  const endpoint = partyType === 'client' ? partiesApi.clients : partyType === 'supplier' ? partiesApi.suppliers : partiesApi.list;
  return useQuery({
    queryKey:        tenantKeys.parties.list(slug ?? '', params),
    queryFn:         () => endpoint(rest),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export const useParties   = (params?: ListParams) => usePartyList(params);
export const useClients   = (params?: ListParams) => usePartyList({ ...params, partyType: 'client' });
export const useSuppliers = (params?: ListParams) => usePartyList({ ...params, partyType: 'supplier' });

export function useParty(id: number | null | undefined) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.parties.detail(slug ?? '', id!),
    queryFn:  () => partiesApi.show(id!),
    enabled:  !!slug && !!id,
  });
}

export function usePartyMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const invalidate = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.parties.all(slug) }); };

  return {
    create: useMutation({ mutationFn: partiesApi.create,                                               onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Party> }) => partiesApi.update(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: partiesApi.delete,                                               onSuccess: invalidate }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/payments.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/payments.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Payment, PaginatedResponse, ListParams } from '../core/types';

export const paymentsApi = {
  list:   (params?: ListParams)  => apiGet<PaginatedResponse<Payment>>('/payments', params),
  show:   (id: number)           => apiGet<Payment>(`/payments/${id}`),
  create: (data: Partial<Payment>) => apiPost<Payment>('/payments', data),
  update: (id: number, data: Partial<Payment>) => apiPut<Payment>(`/payments/${id}`, data),
  delete: (id: number)           => apiDelete(`/payments/${id}`),
} as const;

export function usePayments(params?: ListParams) {
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
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.payments.all(slug) }); };

  return {
    create: useMutation({ mutationFn: paymentsApi.create,  onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Payment> }) => paymentsApi.update(id, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: paymentsApi.delete,  onSuccess: inv }),
  };
}
```

## FILE: resources/js/lib/api/endpoints/products.ts
```
// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/products.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { Product, PaginatedResponse, ListParams } from '../core/types';

export const productsApi = {
  list:   (params?: ListParams) => apiGet<PaginatedResponse<Product>>('/products', params),
  show:   (id: number)          => apiGet<Product>(`/products/${id}`),
  active: ()                    => apiGet<Product[]>('/products/active'),
  create: (data: Partial<Product>)         => apiPost<Product>('/products', data),
  update: (id: number, data: Partial<Product>) => apiPut<Product>(`/products/${id}`, data),
  delete: (id: number)          => apiDelete(`/products/${id}`),
  uploadImage: (id: number, fd: FormData, onProgress?: (p: number) => void) =>
    apiUpload<Product>(`/products/${id}/image`, fd, onProgress),
} as const;

export function useProducts(params?: ListParams) {
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
    queryKey: tenantKeys.products.detail(slug ?? '', id!),
    queryFn:  () => productsApi.show(id!),
    enabled:  !!slug && !!id,
    staleTime: 5 * 60_000,
  });
}

export function useProductMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const invalidate = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) }); };

  return {
    create: useMutation({ mutationFn: productsApi.create,                                                    onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) => productsApi.update(id, data), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: productsApi.delete,                                                    onSuccess: invalidate }),
    uploadImage: useMutation({
      mutationFn: ({ id, formData, onProgress }: { id: number; formData: FormData; onProgress?: (p: number) => void }) =>
        productsApi.uploadImage(id, formData, onProgress),
      onSuccess: (updated: Product) => {
        if (slug) {
          qc.setQueryData(tenantKeys.products.detail(slug, updated.id), updated);
          qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
        }
      },
    }),
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
// ════════════════════════════════════════════════════════════════════════════

// Core
export * from './core/client';
export * from './core/queryClient';
export * from './core/queryKeys';
export type * from './core/types';

// Store
export * from '../store/appStore';

// Endpoints (جميعها بأحرف صغيرة)
export * from './endpoints/auth';
export * from './endpoints/companies';
export * from './endpoints/fiscalYears';
export * from './endpoints/lookups';
export * from './endpoints/seeds';
export * from './endpoints/document';      // ✅
export * from './endpoints/parties';         // ✅
export * from './endpoints/products';        // ✅
export * from './endpoints/payments';        // ✅
export * from './endpoints/expenses';        // ✅
export * from './endpoints/inventory';       // ✅
export * from './endpoints/users';           // ✅
export * from './endpoints/settings';        // ✅
export * from './endpoints/dashboard';       // ✅
export * from './endpoints/reports';         // ✅

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

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

