// ════════════════════════════════════════════════════════════════════════════
// lib/api/client.ts
// Axios Instance — Enterprise-grade Multi-Tenancy HTTP Client
// ✅ تحديث: إضافة slug تلقائيًا لجميع طلبات tenant
// ════════════════════════════════════════════════════════════════════════════

import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// 0. Types
// ─────────────────────────────────────────────────────────────────────────────

/** هيكل الخطأ الموحَّد القادم من Laravel API */
export interface ApiErrorPayload {
  message:  string;
  code?:    string;
  errors?:  Record<string, string[]>;
  meta?:    Record<string, unknown>;
}

/** خطأ منظَّم يُلقى من كل طلب فاشل */
export class ApiError extends Error {
  public readonly status:  number;
  public readonly code:    string;
  public readonly errors:  Record<string, string[]>;
  public readonly meta:    Record<string, unknown>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message ?? 'حدث خطأ غير متوقع');
    this.name   = 'ApiError';
    this.status = status;
    this.code   = payload.code   ?? 'UNKNOWN';
    this.errors = payload.errors ?? {};
    this.meta   = payload.meta   ?? {};
  }

  hasFieldError(field: string): boolean {
    return field in this.errors;
  }

  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Token storage
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';

export const tokenStorage = {
  get:   ()              => localStorage.getItem(TOKEN_KEY),
  set:   (t: string)    => localStorage.setItem(TOKEN_KEY, t),
  clear: ()              => localStorage.removeItem(TOKEN_KEY),
} as const;

export const setAuthToken   = tokenStorage.set;
export const clearAuthToken = tokenStorage.clear;
export const getAuthToken   = tokenStorage.get;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Active-company slug accessor (محسّن)
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_COMPANY_KEY = 'active_company';

function getActiveSlug(): string | null {
  // 1. من sessionStorage (المصدر الأساسي)
  try {
    const raw = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.slug) return parsed.slug;
    }
  } catch {}

  // 2. من localStorage (احتياطي)
  try {
    const raw = localStorage.getItem(ACTIVE_COMPANY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.slug) return parsed.slug;
    }
  } catch {}

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Request ID generator
// ─────────────────────────────────────────────────────────────────────────────

let _reqCounter = 0;
function generateRequestId(): string {
  _reqCounter = (_reqCounter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${_reqCounter.toString(36)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 401 refresh queue
// ─────────────────────────────────────────────────────────────────────────────

type QueueItem = {
  resolve: (token: string) => void;
  reject:  (reason: unknown) => void;
};

let _isRefreshing  = false;
let _failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null): void {
  _failedQueue.forEach(item => {
    if (error || !token) item.reject(error);
    else                  item.resolve(token);
  });
  _failedQueue = [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. In-flight request deduplication (GET only)
// ─────────────────────────────────────────────────────────────────────────────

const _pendingRequests = new Map<string, Promise<unknown>>();

function getRequestKey(config: AxiosRequestConfig): string {
  return `${config.method?.toUpperCase()}::${config.url}::${JSON.stringify(config.params ?? {})}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Axios instance
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

const client: AxiosInstance = axios.create({
  baseURL:         API_BASE_URL,
  timeout:         30_000,
  withCredentials: false,
  headers: {
    'Content-Type':    'application/json',
    'Accept':          'application/json',
    'X-Requested-With':'XMLHttpRequest',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 6-b. قائمة المسارات العامة (لا تحتاج slug)
// ─────────────────────────────────────────────────────────────────────────────

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
];

function isPublicPath(path: string): boolean {
  const cleanPath = path.split('?')[0];
  return PUBLIC_PATH_PREFIXES.some(prefix => cleanPath.startsWith(prefix));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6-c. الكشف عن URL يحمل slug مضمَّناً بالفعل: /{word}/...
//      يُستخدم لتجنب حقن slug مكرَّر ولإسكات تحذير "No active slug"
// ─────────────────────────────────────────────────────────────────────────────

function isPreSluggedUrl(path: string): boolean {
  // يطابق /{slug}/{resource} — مقطعان على الأقل بعد /
  // مثال: /alhday-69fb717c0e4ec/seeds/currencies → true
  // مثال: /fiscal-years → false
  return /^\/[^/]+\/.+/.test(path.split('?')[0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. REQUEST interceptor (✅ التعديل الأساسي)
// ─────────────────────────────────────────────────────────────────────────────

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 7-a. استخراج slug
    const slug = getActiveSlug();
    const originalUrl = config.url ?? '';

    // 7-b. إضافة slug تلقائيًا لجميع مسارات tenant
    // المقارنة مع active slug فقط — آمنة لأن أي مسار بـ slug مختلف
    // يُرسَل يدوياً فقط من OnboardingPage حيث slug=null أصلاً
    if (slug && !isPublicPath(originalUrl)) {
      if (!originalUrl.startsWith(`/${slug}/`) && !isPreSluggedUrl(originalUrl)) {
        config.url = `/${slug}${originalUrl}`;
        if (import.meta.env.DEV) {
          console.debug(`🌐 Tenant request: ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url}`);
        }
      }
    } else if (!slug && !isPublicPath(originalUrl) && !isPreSluggedUrl(originalUrl)) {
      // تحذير فقط إذا كان URL لا يحمل slug مضمَّناً
      if (import.meta.env.DEV) {
        console.warn(`⚠️ No active company slug for request: ${config.method?.toUpperCase()} ${originalUrl}`);
      }
    }

    // 7-c. Bearer token
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 7-d. Tenant slug header (للتتبع)
    if (slug) {
      config.headers['X-Company-Slug'] = slug;
    }

    // 7-e. Request tracing ID
    config.headers['X-Request-ID'] = generateRequestId();

    // 7-f. Upload timeout override
    if (config.data instanceof FormData) {
      config.timeout = 60_000;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. RESPONSE interceptor (مُحسَّن لاستخراج البيانات)
// ─────────────────────────────────────────────────────────────────────────────

client.interceptors.response.use(
  response => response,

  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status          = error.response?.status;
    const payload         = error.response?.data;

    // 8-b-i. 401 Unauthorized
    if (status === 401) {
      if (window.location.pathname === '/login') {
        return Promise.reject(buildApiError(status, payload));
      }
      if (originalRequest._retry) {
        handleForcedLogout();
        return Promise.reject(buildApiError(status, payload));
      }
      if (_isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          _failedQueue.push({ resolve, reject });
        })
          .then(newToken => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      _isRefreshing         = true;
      originalRequest._retry = true;

      try {
        const currentToken = tokenStorage.get();
        if (!currentToken) throw new Error('no_token');
        throw new Error('token_rejected');
      } catch {
        processQueue(new Error('Session expired'), null);
        handleForcedLogout();
        return Promise.reject(buildApiError(401, { message: 'انتهت جلستك، يرجى تسجيل الدخول مجدداً' }));
      } finally {
        _isRefreshing = false;
      }
    }

    // 8-b-ii. 403 Forbidden
    if (status === 403) {
      const code = payload?.code;
      if (code === 'COMPANY_SUSPENDED' || code === 'COMPANY_INACTIVE') {
        try { sessionStorage.removeItem(ACTIVE_COMPANY_KEY); } catch {}
        if (window.location.pathname !== '/onboarding') {
          window.location.href = '/onboarding';
        }
      }
      return Promise.reject(buildApiError(status, payload));
    }

    // 8-b-iii. 422 Validation
    if (status === 422) {
      return Promise.reject(buildApiError(status, payload));
    }

    // 8-b-iv. 429 Rate limit
    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      return Promise.reject(
        buildApiError(status, {
          message: `تجاوزت الحد المسموح من الطلبات. حاول بعد ${retryAfter ?? 60} ثانية.`,
          code:    'RATE_LIMITED',
        }),
      );
    }

    // 8-b-v. 5xx Server errors
    if (status && status >= 500) {
      return Promise.reject(
        buildApiError(status, {
          message: payload?.message ?? 'خطأ في الخادم، يرجى المحاولة لاحقاً.',
          code:    'SERVER_ERROR',
        }),
      );
    }

    // 8-b-vi. Network / timeout
    if (!error.response) {
      return Promise.reject(
        buildApiError(0, {
          message: error.code === 'ECONNABORTED'
            ? 'انتهت مهلة الطلب، تحقق من اتصالك.'
            : 'لا يوجد اتصال بالإنترنت.',
          code: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
        }),
      );
    }

    // 8-b-vii. Fallback
    return Promise.reject(buildApiError(status ?? 0, payload));
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildApiError(status: number, payload: ApiErrorPayload | undefined): ApiError {
  return new ApiError(status, payload ?? { message: 'حدث خطأ غير متوقع' });
}

function handleForcedLogout(): void {
  tokenStorage.clear();
  try {
    sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
    sessionStorage.removeItem('selected_fiscal_year');
  } catch {}

  const currentPath = window.location.pathname + window.location.search;
  const returnPath  = currentPath !== '/login' ? currentPath : '/dashboard';
  window.location.href = `/login?return=${encodeURIComponent(returnPath)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. استخراج البيانات بمرونة (يتعامل مع اختلاف هيكل الاستجابة)
// ─────────────────────────────────────────────────────────────────────────────

function extractData<T>(response: any): T {
  const d = response?.data;
  // الحالة 1: response.data مباشرة مصفوفة أو كائن
  if (Array.isArray(d)) return d as T;
  // الحالة 2: response.data.data (الشكل القياسي)
  if (d && typeof d === 'object' && 'data' in d) {
    return d.data as T;
  }
  // الحالة 3: أي شكل آخر
  return d as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Typed request wrappers
// ─────────────────────────────────────────────────────────────────────────────

export interface LaravelResponse<T> {
  data:    T;
  meta?:   PaginationMeta;
  links?:  PaginationLinks;
}

export interface PaginationMeta {
  current_page:  number;
  last_page:     number;
  per_page:      number;
  total:         number;
  from:          number | null;
  to:            number | null;
}

export interface PaginationLinks {
  first: string | null;
  last:  string | null;
  prev:  string | null;
  next:  string | null;
}

/** GET → يُعيد T مباشرة (بعد سحب .data) */
export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> {
  const key = getRequestKey({ method: 'GET', url, params });

  const existing = _pendingRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = client
    .get<LaravelResponse<T>>(url, { params, ...config })
    .then(res => extractData<T>(res))
    .finally(() => _pendingRequests.delete(key));

  _pendingRequests.set(key, promise);
  return promise;
}

/** POST → يُعيد T مباشرة */
export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await client.post<LaravelResponse<T>>(url, data, config);
  return extractData<T>(res);
}

/** PUT → يُعيد T مباشرة */
export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await client.put<LaravelResponse<T>>(url, data, config);
  return extractData<T>(res);
}

/** PATCH → يُعيد T مباشرة */
export async function apiPatch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await client.patch<LaravelResponse<T>>(url, data, config);
  return extractData<T>(res);
}

/** DELETE → يُعيد void */
export async function apiDelete(
  url: string,
  config?: AxiosRequestConfig,
): Promise<void> {
  await client.delete(url, config);
}

/** Upload (FormData) → يُعيد T مباشرة */
export async function apiUpload<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const res = await client.post<LaravelResponse<T>>(url, formData, {
    headers:         { 'Content-Type': 'multipart/form-data' },
    timeout:         60_000,
    onUploadProgress: e => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return extractData<T>(res);
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Tenant-scoped factory (اختياري)
// ─────────────────────────────────────────────────────────────────────────────

export function tenantApi(slug: string) {
  const prefix = (path: string) => `/${slug}/${path.replace(/^\//, '')}`;

  return {
    get:    <T>(path: string, params?: Record<string, unknown>) => apiGet<T>(prefix(path), params),
    post:   <T>(path: string, data?: unknown)                   => apiPost<T>(prefix(path), data),
    put:    <T>(path: string, data?: unknown)                   => apiPut<T>(prefix(path), data),
    patch:  <T>(path: string, data?: unknown)                   => apiPatch<T>(prefix(path), data),
    delete: (path: string)                                       => apiDelete(prefix(path)),
    upload: <T>(path: string, fd: FormData, cb?: (p: number) => void) =>
      apiUpload<T>(prefix(path), fd, cb),
  };
}

export default client;
