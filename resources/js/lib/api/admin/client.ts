// lib/api/admin/client.ts
//
// apiGetPaginated — تتجاوز extractData لأن admin API يُعيد:
//   { data:[...], meta:{...} }  ← طبقة واحدة
// بينما extractData مُصمَّمة للـ tenant الذي يُعيد:
//   { data: { data:[...], meta:{...} } }  ← طبقتان
//
import client from '@/lib/api/core/client';
import type { AxiosRequestConfig } from 'axios';

export async function apiGetPaginated<T>(
  url: string,
  params?: Record<string, unknown>,
  cfg?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.get<T>(url, { params, ...cfg });
  return response.data;
}
