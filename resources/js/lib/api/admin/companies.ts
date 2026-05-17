// lib/api/admin/companies.ts
import { apiPost, apiPut, apiPatch, apiDelete, apiGet } from '@/lib/api/core/client';
import { apiGetPaginated } from './client';
import type { AdminCompany, AdminUser, Paginated, AdminCompaniesFilter } from '@/types/admin';

const BASE = '/admin/companies';

export const companiesApi = {
  // ─── Paginated (تستخدم apiGetPaginated لأن admin يُعيد { data, meta } مباشرة) ─
  list:      (f?: AdminCompaniesFilter) => apiGetPaginated<Paginated<AdminCompany>>(BASE, f as any),
  listUsers: (id: number, params?: any) => apiGetPaginated<Paginated<AdminUser>>(`${BASE}/${id}/users`, params),

  // ─── Non-paginated (apiGet عادي) ──────────────────────────────────────────
  show:   (id: number)                         => apiGet<AdminCompany>(`${BASE}/${id}`),
  create: (d: Partial<AdminCompany>)           => apiPost<AdminCompany>(BASE, d),
  update: (id: number, d: Partial<AdminCompany>) => apiPut<AdminCompany>(`${BASE}/${id}`, d),
  remove: (id: number)                         => apiDelete(`${BASE}/${id}`),

  // ─── Actions ──────────────────────────────────────────────────────────────
  suspend:    (id: number, reason: string) => apiPost<AdminCompany>(`${BASE}/${id}/suspend`,    { reason }),
  unsuspend:  (id: number)                 => apiPost<AdminCompany>(`${BASE}/${id}/unsuspend`),
  activate:   (id: number)                 => apiPost<AdminCompany>(`${BASE}/${id}/activate`),
  deactivate: (id: number)                 => apiPost<AdminCompany>(`${BASE}/${id}/deactivate`),
  verify:     (id: number)                 => apiPost<AdminCompany>(`${BASE}/${id}/verify`),
  unverify:   (id: number)                 => apiPost<AdminCompany>(`${BASE}/${id}/unverify`),
  changePlan: (id: number, d: { plan: string; max_users?: number; max_products?: number; max_warehouses?: number }) =>
    apiPost<AdminCompany>(`${BASE}/${id}/change-plan`, d),
  updateNotes: (id: number, notes: string) => apiPatch<void>(`${BASE}/${id}/notes`, { notes }),

  // ─── Members ──────────────────────────────────────────────────────────────
  addUser:    (id: number, userId: number, role?: string) =>
    apiPost(`${BASE}/${id}/users`, { user_id: userId, role }),
  removeUser: (id: number, userId: number) => apiDelete(`${BASE}/${id}/users/${userId}`),
  toggleUser: (id: number, userId: number) => apiPatch(`${BASE}/${id}/users/${userId}/toggle`, {}),

  // ─── Seed ─────────────────────────────────────────────────────────────────
  seed: (id: number) => apiPost<{ message: string; applied: string[]; skipped: string[] }>(`${BASE}/${id}/seed`),
} as const;
