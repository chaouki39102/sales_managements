// lib/api/endpoints/health.ts — فحص اتصال النظام (/status)
// مسار عام بدون مصادقة؛ يستخدم timeout قصير حتى تظهر صفحة الحالة
// بسرعة عندما يكون الخادم متوقفاً.

import client from '../core/client';

export interface HealthCheck {
  id:     string;
  name:   string;
  ok:     boolean;
  detail: string;
  fix:    string | null;
}

export interface HealthReport {
  status:          'ok' | 'degraded';
  service:         string;
  environment:     string;
  debug:           boolean;
  app_url:         string;
  database:        'connected' | 'error';
  database_error:  string | null;
  database_driver: string;
  php_version:     string;
  laravel_version: string;
  server_time:     string;
  timezone:        string;
  checks?:         HealthCheck[];
  problem?:        HealthCheck | null;
}

export async function fetchHealth(timeoutMs = 9000): Promise<HealthReport | null> {
  try {
    const res = await client.get('/health', { timeout: timeoutMs });
    const payload = (res as { data?: { data?: HealthReport } }).data?.data;
    return payload ?? null;
  } catch {
    return null;
  }
}
