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
// ✅ القاعدة: فقط المسارات الموجودة خارج Route::prefix('{company}') في api.php
//
// ❌ تمت إزالة: currencies, tvas, legal-forms, fiscal-stamps,
//              document-types, document-statuses, document-base-operations,
//              stock-movement-types, inventory-valuation-methods,
//              product-types, party-types, treasury-account-types, genders
//
//    السبب: هذه كلها داخل /{company}/ في api.php → يجب أن يُضاف لها slug
//    عند وضعها هنا كانت POST/PUT تذهب إلى /api/v1/currencies بدلاً من
//    /api/v1/{slug}/currencies → 405 Method Not Allowed
//
// ✅ يبقى هنا فقط:
//    /auth      → خارج {company} في api.php
//    /companies → خارج {company} في api.php
//    /admin     → api_admin.php خارج {company}
//    /wilayas   → Route::apiResource('wilayas'...) خارج {company}
//    /communes  → Route::apiResource('communes'...) خارج {company}

const PUBLIC_PREFIXES = [
  '/auth',
  '/companies',
  '/admin',
  '/wilayas',
  '/communes',
] as const;

const isPublicPath = (url: string): boolean => {
  const path = url.split('?')[0];
  return (PUBLIC_PREFIXES as readonly string[]).some(
    p => path === p || path.startsWith(p + '/'),
  );
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

    // أضف slug فقط للمسارات tenant (غير العامة)
    if (slug && !isPublicPath(originalUrl)) {
      if (
        !originalUrl.startsWith(`/${slug}/`) &&
        originalUrl !== `/${slug}`
      ) {
        config.url = `/${slug}${originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl}`;
      }
    }

    // Bearer token
    const token = tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Headers إضافية
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
  _failedQueue.forEach(item =>
    err || !token ? item.reject(err) : item.resolve(token!),
  );
  _failedQueue = [];
};

function handleForcedLogout(): void {
  tokenStorage.clear();
  try {
    sessionStorage.clear();
    localStorage.removeItem('app-store');
  } catch {}
  const ret =
    window.location.pathname !== '/login'
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

      if (req._retry) {
        handleForcedLogout();
        return Promise.reject(new ApiError(status, payload ?? { message: 'انتهت الجلسة' }));
      }

      if (_isRefreshing)
        return new Promise<string>((resolve, reject) =>
          _failedQueue.push({ resolve, reject }),
        ).then(t => {
          req.headers.Authorization = `Bearer ${t}`;
          return client(req);
        });

      _isRefreshing = req._retry = true;
      try {
        throw new Error('no_refresh');
      } catch {
        processQueue(new Error('expired'), null);
        handleForcedLogout();
        return Promise.reject(
          new ApiError(401, { message: 'انتهت جلستك، يرجى تسجيل الدخول مجدداً' }),
        );
      } finally {
        _isRefreshing = false;
      }
    }

    if (status === 403) {
      const code = payload?.code;
      if (code === 'COMPANY_SUSPENDED' || code === 'COMPANY_INACTIVE') {
        try { sessionStorage.removeItem('app-store'); } catch {}
        if (window.location.pathname !== '/onboarding')
          window.location.href = '/onboarding';
      }
      return Promise.reject(new ApiError(status, payload ?? { message: 'ممنوع' }));
    }

    if (status === 422)
      return Promise.reject(new ApiError(status, payload ?? { message: 'خطأ في البيانات' }));

    if (status === 429)
      return Promise.reject(
        new ApiError(status, { message: 'تجاوزت الحد المسموح به', code: 'RATE_LIMITED' }),
      );

    if (status && status >= 500)
      return Promise.reject(
        new ApiError(status, {
          message: payload?.message ?? 'خطأ في الخادم',
          code:    'SERVER_ERROR',
        }),
      );

    if (!error.response)
      return Promise.reject(
        new ApiError(0, {
          message:
            error.code === 'ECONNABORTED'
              ? 'انتهت مهلة الطلب'
              : 'لا يوجد اتصال بالإنترنت',
          code:
            error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
        }),
      );

    return Promise.reject(
      new ApiError(status ?? 0, payload ?? { message: 'خطأ غير متوقع' }),
    );
  },
);

// ─── extractData ──────────────────────────────────────────────────────────────
// Laravel يُعيد دائماً: { data: T, message?, meta?, links? }
//
// الحالات:
//   { data: [...] }              → يُعيد [...]
//   { data: { data: [], meta } } → يُعيد { data: [], meta } (Paginated)
//   { data: { id, name, ... } }  → يُعيد { id, name, ... }
//   { data: null }               → يُعيد null
//   [...]                        → يُعيد [...] (نادر)

export function extractData<T>(response: { data: unknown }): T {
  const outer = response?.data;

  // ① مصفوفة مباشرة
  if (Array.isArray(outer)) return outer as T;

  if (outer !== null && typeof outer === 'object') {
    const obj = outer as Record<string, unknown>;

    if ('data' in obj) {
      const inner = obj.data;

      // ② أ — مصفوفة: { data: [...] }
      if (Array.isArray(inner)) return inner as T;

      // ② ب — Paginated: { data: { data: [], meta: {} } }
      if (inner !== null && typeof inner === 'object') {
        const innerObj = inner as Record<string, unknown>;
        if ('data' in innerObj && 'meta' in innerObj) return inner as T;
        // ② ج — object عادي: { data: { id, name } }
        return inner as T;
      }

      // ② د — قيمة بسيطة أو null
      if (inner !== undefined) return inner as T;
    }

    // ③ لا يوجد 'data' — أعد الـ object كاملاً (مثل { token, user })
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

export const apiPost = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> =>
  extractData<T>(await client.post<LaravelResponse<T>>(url, data, config));

export const apiPut = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> =>
  extractData<T>(await client.put<LaravelResponse<T>>(url, data, config));

export const apiPatch = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> =>
  extractData<T>(await client.patch<LaravelResponse<T>>(url, data, config));

export const apiDelete = async <T = void>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> =>
  extractData<T>(await client.delete<LaravelResponse<T>>(url, config));

export default client;
