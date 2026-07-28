// ════════════════════════════════════════════════════════════════════════════
// lib/api/admin/companies.ts
//
// ✅ هذا الملف خاص بـ AdminCompanyController (api_admin.php → /api/v1/admin/*)
//    المستخدم: super-admin فقط (middleware: super.admin)
//
// ✅ كل العمليات بالـ id الرقمي — route model binding في Laravel بالـ id
//    (AdminCompanyController يستخدم Company $company بدون getRouteKeyName override)
// ════════════════════════════════════════════════════════════════════════════

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/core/client';
import type { AdminCompany, AdminUser, Paginated, AdminCompaniesFilter } from '@/types/admin';

const ADMIN = '/admin/companies';

export const companiesApi = {
  // ── CRUD ───────────────────────────────────────────────────────────────────

  // GET  /api/v1/admin/companies
  list: (f?: AdminCompaniesFilter) =>
    apiGet<Paginated<AdminCompany>>(ADMIN, f as any),

  // GET  /api/v1/admin/companies/{id}
  show: (id: number) =>
    apiGet<AdminCompany>(`${ADMIN}/${id}`),

  // POST /api/v1/admin/companies
  create: (data: Partial<AdminCompany>) =>
    apiPost<AdminCompany>(ADMIN, data),

  // PUT  /api/v1/admin/companies/{id}
  update: (id: number, data: Partial<AdminCompany>) =>
    apiPut<AdminCompany>(`${ADMIN}/${id}`, data),

  // DELETE /api/v1/admin/companies/{id}
  remove: (id: number) =>
    apiDelete(`${ADMIN}/${id}`),

  // ── Notes ──────────────────────────────────────────────────────────────────

  // PATCH /api/v1/admin/companies/{id}/notes
  updateNotes: (id: number, notes: string) =>
    apiPatch<void>(`${ADMIN}/${id}/notes`, { notes }),

  // ── Actions ────────────────────────────────────────────────────────────────
  // جميع هذه الـ routes تحت prefix('v1/admin') في api_admin.php

  // POST /api/v1/admin/companies/{id}/suspend
  suspend: (id: number, reason: string) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/suspend`, { reason }),

  // POST /api/v1/admin/companies/{id}/unsuspend
  unsuspend: (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/unsuspend`),

  // POST /api/v1/admin/companies/{id}/activate
  activate: (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/activate`),

  // POST /api/v1/admin/companies/{id}/deactivate
  deactivate: (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/deactivate`),

  // POST /api/v1/admin/companies/{id}/verify
  verify: (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/verify`),

  // POST /api/v1/admin/companies/{id}/unverify
  unverify: (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/unverify`),

  // POST /api/v1/admin/companies/{id}/change-plan
  changePlan: (
    id: number,
    d: {
      plan:            string;
      max_users?:      number;
      max_products?:   number;
      max_warehouses?: number;
    },
  ) => apiPost<AdminCompany>(`${ADMIN}/${id}/change-plan`, d),

  // ── Members ────────────────────────────────────────────────────────────────

  // GET  /api/v1/admin/companies/{id}/users
  listUsers: (id: number, params?: { page?: number; per_page?: number }) =>
    apiGet<Paginated<AdminUser>>(`${ADMIN}/${id}/users`, params as any),

  // POST /api/v1/admin/companies/{id}/users
  addUser: (id: number, userId: number, role?: string) =>
    apiPost(`${ADMIN}/${id}/users`, { user_id: userId, role }),

  // DELETE /api/v1/admin/companies/{id}/users/{userId}
  removeUser: (id: number, userId: number) =>
    apiDelete(`${ADMIN}/${id}/users/${userId}`),

  // PATCH /api/v1/admin/companies/{id}/users/{userId}/toggle
  toggleUser: (id: number, userId: number) =>
    apiPatch(`${ADMIN}/${id}/users/${userId}/toggle`, {}),

  // ── Seed ───────────────────────────────────────────────────────────────────

  // POST /api/v1/admin/companies/{id}/seed
  seed: (id: number) =>
    apiPost<{ message: string; applied: string[]; skipped: string[] }>(
      `${ADMIN}/${id}/seed`,
    ),

  // POST /api/v1/admin/companies/{id}/seed/{seeder}
  seedSingle: (id: number, seeder: string) =>
    apiPost<{ message: string }>(`${ADMIN}/${id}/seed/${seeder}`),

  // ── Bulk Actions ─────────────────────────────────────────────────────────────

  bulkSuspend:   (ids: number[], reason: string) =>
    apiPost<{ message: string; count: number }>(`${ADMIN}/bulk-suspend`, { ids, reason }),
  bulkUnsuspend: (ids: number[]) =>
    apiPost<{ message: string; count: number }>(`${ADMIN}/bulk-unsuspend`, { ids }),
  bulkVerify:    (ids: number[]) =>
    apiPost<{ message: string; count: number }>(`${ADMIN}/bulk-verify`, { ids }),
  bulkActivate:  (ids: number[]) =>
    apiPost<{ message: string; count: number }>(`${ADMIN}/bulk-activate`, { ids }),
  bulkDeactivate:(ids: number[]) =>
    apiPost<{ message: string; count: number }>(`${ADMIN}/bulk-deactivate`, { ids }),

  // ── Export ───────────────────────────────────────────────────────────────────
  export: (params?: { status?: string; plan?: string }) =>
    apiGet<{ data: Record<string, unknown>[]; total: number }>(`${ADMIN}/export`, params as any),

} as const;

// ─── Type helpers للـ hooks ───────────────────────────────────────────────────

export type CompanyActionPayload =
  | { action: 'suspend';    id: number; reason: string }
  | { action: 'unsuspend';  id: number }
  | { action: 'activate';   id: number }
  | { action: 'deactivate'; id: number }
  | { action: 'verify';     id: number }
  | { action: 'unverify';   id: number };
