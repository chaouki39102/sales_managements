// ════════════════════════════════════════════════════════════════════════════
// lib/api/portal/client.ts — بوابة الزبائن (Customer Portal) client
//
// استقلال كامل عن client.ts الرئيسي:
//   - Token منفصل (portal_token) — لا يختلط مع auth_token الخاص بالإدارة
//   - لا slug للشركة — مسارات البوابة خارج بادئة {company}
//   - لا forcedLogout إلى /login — 401 يوجّه إلى /portal/login
//   - extractData نفسها (نسخة محلية) لأنها العقد الموحّد بين الباك-إند والفرونت
// ════════════════════════════════════════════════════════════════════════════
import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const PORTAL_TOKEN_KEY = 'portal_token';

export const portalTokenStorage = {
  get:   () => { try { return localStorage.getItem(PORTAL_TOKEN_KEY); } catch { return null; } },
  set:   (t: string) => { try { localStorage.setItem(PORTAL_TOKEN_KEY, t); } catch {} },
  clear: () => { try { localStorage.removeItem(PORTAL_TOKEN_KEY); } catch {} },
};

const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null;
};

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export const portalClient: AxiosInstance = axios.create({
  baseURL:         API_BASE,
  timeout:         30_000,
  withCredentials: true,
  headers: {
    'Content-Type':     'application/json',
    'Accept':           'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

portalClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = portalTokenStorage.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const method = config.method?.toLowerCase() ?? '';
    if (MUTATING_METHODS.has(method)) {
      const csrf = getCsrfToken();
      if (csrf) config.headers['X-CSRF-TOKEN'] = csrf;
    }
    return config;
  },
  (e) => Promise.reject(e),
);

portalClient.interceptors.response.use(
  r => r,
  async (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status;
    const data   = error.response?.data;

    if (status === 401 && !window.location.pathname.startsWith('/portal/login')) {
      portalTokenStorage.clear();
      const ret = window.location.pathname + window.location.search;
      window.location.href = `/portal/login?return=${encodeURIComponent(ret)}`;
    }

    return Promise.reject(makeError(status, data));
  },
);

// ─── Error + extractData (مطابقة client.ts الرئيسي) ───────────────────────────
export interface ApiErrorPayload {
  message: string;
  code?:   string;
  errors?: Record<string, string[]>;
}

export class PortalApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code:   string,
    public readonly errors: Record<string, string[]>,
    message: string,
  ) {
    super(message);
    this.name = 'PortalApiError';
  }
  hasFieldError = (f: string) => f in this.errors;
  fieldError    = (f: string) => this.errors[f]?.[0];
}

function makeError(status?: number, p?: ApiErrorPayload): PortalApiError {
  return new PortalApiError(
    status ?? 0,
    p?.code   ?? 'UNKNOWN',
    p?.errors ?? {},
    p?.message ?? 'حدث خطأ غير متوقع',
  );
}

export interface PortalPaginated<T> {
  data:  T[];
  meta:  { current_page: number; last_page: number; per_page: number; total: number };
  links: { first: string | null; last: string | null; next: string | null; prev: string | null };
}

export function portalExtractData<T>(response: { data: unknown }): T {
  const raw = response?.data;
  if (raw === null || raw === undefined) return null as T;
  if (Array.isArray(raw)) return raw as T;
  if (typeof raw !== 'object') return raw as T;

  const envelope = raw as Record<string, unknown>;
  if (!('data' in envelope)) return raw as T;

  const payload = envelope.data;
  if (Array.isArray(payload) && 'meta' in envelope) {
    return { data: payload, meta: envelope.meta, links: envelope.links } as T;
  }
  if (payload !== null && payload !== undefined) {
    if (typeof payload === 'object' && !Array.isArray(payload)) {
      const inner = payload as Record<string, unknown>;
      if ('data' in inner && 'meta' in inner) {
        return { data: inner.data, meta: inner.meta, links: inner.links } as T;
      }
    }
    return payload as T;
  }
  return null as T;
}

export async function portalGet<T>(url: string, params?: Record<string, unknown>, cfg?: AxiosRequestConfig): Promise<T> {
  return portalClient.get<{ data: unknown }>(url, { params, ...cfg }).then(r => portalExtractData<T>(r));
}

export const portalPost = <T>(url: string, data?: unknown, cfg?: AxiosRequestConfig): Promise<T> =>
  portalClient.post<{ data: unknown }>(url, data, cfg).then(r => portalExtractData<T>(r));
