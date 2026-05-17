// ════════════════════════════════════════════════════════════════════════════
// lib/api/admin/client.ts
//
// دوال مساعدة خاصة بـ admin API.
//
// المشكلة: extractData في core/client.ts مُصمَّمة للـ tenant الذي يُعيد
//   response.data = { data: { data:[...], meta:{...} } }  ← طبقتان
//
// لكن admin API يُعيد:
//   response.data = { data:[...], meta:{...} }            ← طبقة واحدة
//
// فـ extractData تدخل لـ obj.data وتُعيد [...] فقط وتضيع meta.
//
// الحل: apiGetPaginated تقرأ r.data مباشرة (تتجاوز extractData)
//        للـ paginated endpoints فقط.
//        باقي دوال apiGet/apiPost/apiPut/apiPatch/apiDelete تبقى كما هي.
// ════════════════════════════════════════════════════════════════════════════
import client from '@/lib/api/core/client';
import type { AxiosRequestConfig } from 'axios';

/**
 * GET request للـ admin paginated endpoints.
 * تُعيد { data:[], meta:{}, links:{} } كاملاً.
 */
export async function apiGetPaginated<T>(
  url: string,
  params?: Record<string, unknown>,
  cfg?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.get<T>(url, { params, ...cfg });
  // r.data = { data:[...], meta:{...}, links:{...} } — نُعيده مباشرة
  return response.data;
}
