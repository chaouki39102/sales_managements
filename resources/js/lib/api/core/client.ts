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
