// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/client.ts
// Axios Instance — Multi-Tenant HTTP Client
// slug يُقرأ من Zustand مباشرة (appActions.getActiveSlug)
// ════════════════════════════════════════════════════════════════════════════

import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// ─── Re-export من appStore لتجنب circular dependency ─────────────────────────
// نستخدم دالة getter بدلاً من import مباشر للـ store
// (appStore يُعرَّف بعد client.ts في ترتيب الـ modules)

let _getSlug: () => string | null = () => null;

/**
 * يُستدعى مرة واحدة عند تهيئة التطبيق لربط Zustand بالـ Interceptor
 * app/main.tsx: connectSlugToInterceptor(() => appActions.getActiveSlug())
 */
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _reqCounter = 0;
const generateRequestId = () => {
  _reqCounter = (_reqCounter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${_reqCounter.toString(36)}`;
};

// ─── Public paths (لا تحتاج slug) ────────────────────────────────────────────

const PUBLIC_PATH_PREFIXES = [
  '/auth',
  '/companies',
  '/admin',
  '/wilayas',
  '/communes',
  '/genders',
  '/currencies',
  '/tvas',
  '/document-types',
  '/document-statuses',
  '/document-base-operations',
  '/fiscal-stamps',
  '/stock-movement-types',
  '/inventory-valuation-methods',
  '/product-types',
  '/party-types',
  '/treasury-account-types',
  '/legal-forms',
] as const;

const isPublicPath = (path: string) => {
  const clean = path.split('?')[0];
  return PUBLIC_PATH_PREFIXES.some(p => clean.startsWith(p));
};

// ─── 401 queue ────────────────────────────────────────────────────────────────

type QueueItem = { resolve: (t: string) => void; reject: (e: unknown) => void };
let _isRefreshing = false;
let _failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null) => {
  _failedQueue.forEach(item => error || !token ? item.reject(error) : item.resolve(token!));
  _failedQueue = [];
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

    // إضافة slug للمسارات tenant فقط
    if (slug && !isPublicPath(originalUrl)) {
      if (!originalUrl.startsWith(`/${slug}/`)) {
        config.url = `/${slug}${originalUrl}`;
        if (import.meta.env.DEV) {
          console.debug(`🌐 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        }
      }
    }

    // Bearer token
    const token = tokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Headers
    if (slug) config.headers['X-Company-Slug'] = slug;
    config.headers['X-Request-ID'] = generateRequestId();

    // Upload timeout
    if (config.data instanceof FormData) config.timeout = 60_000;

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── RESPONSE interceptor ─────────────────────────────────────────────────────

const ACTIVE_COMPANY_KEY = 'app-store'; // Zustand persist key

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

      if (_isRefreshing) {
        return new Promise<string>((resolve, reject) => _failedQueue.push({ resolve, reject }))
          .then(t => { req.headers.Authorization = `Bearer ${t}`; return client(req); });
      }

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
        try { sessionStorage.removeItem(ACTIVE_COMPANY_KEY); } catch {}
        if (window.location.pathname !== '/onboarding') window.location.href = '/onboarding';
      }
      return Promise.reject(new ApiError(status, payload ?? { message: 'ممنوع' }));
    }

    if (status === 422) return Promise.reject(new ApiError(status, payload ?? { message: 'خطأ تحقق' }));
    if (status === 429) return Promise.reject(new ApiError(status, { message: 'تجاوزت الحد المسموح', code: 'RATE_LIMITED' }));
    if (status && status >= 500) return Promise.reject(new ApiError(status, { message: payload?.message ?? 'خطأ في الخادم', code: 'SERVER_ERROR' }));
    if (!error.response) return Promise.reject(new ApiError(0, {
      message: error.code === 'ECONNABORTED' ? 'انتهت مهلة الطلب' : 'لا يوجد اتصال بالإنترنت',
      code:    error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
    }));

    return Promise.reject(new ApiError(status ?? 0, payload ?? { message: 'خطأ غير متوقع' }));
  },
);

// ─── Forced logout ────────────────────────────────────────────────────────────

function handleForcedLogout() {
  tokenStorage.clear();
  try {
    sessionStorage.clear();
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
  } catch {}
  const ret = window.location.pathname !== '/login'
    ? window.location.pathname + window.location.search
    : '/dashboard';
  window.location.href = `/login?return=${encodeURIComponent(ret)}`;
}

// ─── Response extractor ───────────────────────────────────────────────────────

function extractData<T>(response: any): T {
  const d = response?.data;
  if (Array.isArray(d)) return d as T;
  if (d && typeof d === 'object' && 'data' in d) return d.data as T;
  return d as T;
}

// ─── Typed wrappers ───────────────────────────────────────────────────────────

export interface LaravelResponse<T> {
  data:   T;
  meta?:  import('./types').PaginationMeta;
  links?: import('./types').PaginationLinks;
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
  const key = reqKey({ method: 'GET', url, params });
  const existing = _pending.get(key);
  if (existing) return existing as Promise<T>;
  const p = client.get<LaravelResponse<T>>(url, { params, ...config })
    .then(res => extractData<T>(res))
    .finally(() => _pending.delete(key));
  _pending.set(key, p);
  return p;
}

export const apiPost   = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  extractData<T>(await client.post<LaravelResponse<T>>(url, data, config));

export const apiPut    = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  extractData<T>(await client.put<LaravelResponse<T>>(url, data, config));

export const apiPatch  = async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  extractData<T>(await client.patch<LaravelResponse<T>>(url, data, config));

export const apiDelete = async (url: string, config?: AxiosRequestConfig): Promise<void> =>
  void (await client.delete(url, config));

export const apiUpload = async <T>(url: string, fd: FormData, onProgress?: (pct: number) => void): Promise<T> =>
  extractData<T>(await client.post<LaravelResponse<T>>(url, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
    onUploadProgress: e => { if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100)); },
  }));

// ─── Tenant-scoped factory ────────────────────────────────────────────────────

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
