// lib/api/endpoints/serverControl.ts — التحكم بخادم التطبيق عبر المساعد (port 8777)
//
// المساعد (server-helper/router.php) خادم PHP مستقل عن Laravel — يبقى يعمل حتى
// عندما يتوقف التطبيق. يوفر:
//   GET  /api/status   → تشخيص كامل (PHP, إضافات, .env, قاعدة بيانات, ترحيلات, build, خادم)
//   POST /api/start    → تشغيل خادم Laravel (php artisan serve --host=0.0.0.0 --port=8000)
//   POST /api/stop     → إيقافه
//   POST /api/restart  → إعادة تشغيله
//
// يُستدعى عبر fetch مباشرة (وليس axios) لأن المساعد قد لا يكون متاحاً أصلاً
// عندما يكون التطبيق متوقفاً، ونريد دائماً محاولة الوصول إليه فوراً.
//
// ملاحظة: عنوان المساعد يستخدم hostname الحالي (localhost أو 192.168.x.x)
// مع المنفذ الثابت 8777.

const HELPER_PORT = 8777;

export interface HelperCheck {
  id:     string;
  name:   string;
  ok:     boolean;
  detail: string;
  fix:    string | null;
}

export interface HelperHealth {
  status:          string;
  service:         string;
  environment:     string;
  database:        string;
  database_error:  string | null;
  php_version:     string;
  laravel_version: string;
  checks:          HelperCheck[];
  problem:         HelperCheck | null;
}

export interface HelperServer {
  up:     boolean;
  port:   number;
  pid:    number | null;
  health: HelperHealth | null;
}

export interface HelperStatus {
  ok:       boolean;
  app:      { dir: string; port: number };
  server:   HelperServer;
  checks:   HelperCheck[];
  problem:  HelperCheck | null;
  actions:  { can_start: boolean; can_stop: boolean };
  message?: string;
}

export interface HelperActionResult {
  ok:      boolean;
  message: string;
  up:      boolean;
  server?: HelperServer;
}

function helperBase(): string {
  return `http://${window.location.hostname}:${HELPER_PORT}`;
}

async function helperFetch<T>(path: string, init?: RequestInit, timeoutMs = 20000): Promise<T> {
  const res = await fetch(`${helperBase()}${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body,
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** هل المساعد متاح أصلاً؟ (فحص سريع دون أخطاء) */
export async function isHelperReachable(timeoutMs = 2500): Promise<boolean> {
  try {
    await helperFetch<{ ok: boolean }>('/api/ping', undefined, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

/** جلب حالة المساعد الكاملة (تشخيص + حالة الخادم) */
export function getServerStatus(): Promise<HelperStatus> {
  return helperFetch<HelperStatus>('/api/status');
}

/** تشغيل خادم Laravel عبر المساعد */
export function startServer(): Promise<HelperActionResult> {
  return helperFetch<HelperActionResult>('/api/start', { method: 'POST' });
}

/** إيقاف خادم Laravel عبر المساعد */
export function stopServer(): Promise<HelperActionResult> {
  return helperFetch<HelperActionResult>('/api/stop', { method: 'POST' });
}

/** إعادة تشغيل خادم Laravel عبر المساعد */
export function restartServer(): Promise<HelperActionResult> {
  return helperFetch<HelperActionResult>('/api/restart', { method: 'POST' });
}

/** فتح صفحة التحكم اليدوية للمساعد في نافذة جديدة */
export function openHelperPage(): void {
  window.open(`${helperBase()}/`, '_blank', 'noopener');
}
