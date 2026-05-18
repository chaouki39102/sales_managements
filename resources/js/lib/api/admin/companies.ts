// ════════════════════════════════════════════════════════════════════════════
// lib/api/admin/companies.ts  ← النسخة المُصلحة الكاملة
//
// المشكلة الأصلية:
//   suspend/unsuspend/activate/deactivate/verify/unverify/changePlan
//   كانت تستخدم Tenant routes:
//     /companies/{slug}/suspend  (مع _skipSlug: true)
//   لكن api_admin.php يُعرّفها في Admin routes:
//     /api/v1/admin/companies/{id}/suspend
//
//   النتيجة: 404 أو 403 عند كل محاولة تعديل على شركة
//
// الحل:
//   كل العمليات تستخدم /admin/companies/{id}/... (الـ id الرقمي)
//   لا يوجد _skipSlug — لا حاجة له
//   أُضيفت listUsers التي كانت مستخدمة في CompanyDrawer لكن غير معرّفة
// ════════════════════════════════════════════════════════════════════════════
import { apiPost, apiPut, apiPatch, apiDelete, apiGet } from '@/lib/api/core/client';
import { apiGetPaginated }                              from './client';
import type {
  AdminCompany,
  AdminUser,
  Paginated,
  AdminCompaniesFilter,
} from '@/types/admin';

const ADMIN = '/admin/companies';

export const companiesApi = {

  // ─── List & CRUD ───────────────────────────────────────────────────────────
  list: (f?: AdminCompaniesFilter) =>
    apiGetPaginated<Paginated<AdminCompany>>(ADMIN, f as any),

  show:   (id: number)                           => apiGet<AdminCompany>(`${ADMIN}/${id}`),
  create: (d: Partial<AdminCompany>)             => apiPost<AdminCompany>(ADMIN, d),
  update: (id: number, d: Partial<AdminCompany>) => apiPut<AdminCompany>(`${ADMIN}/${id}`, d),
  remove: (id: number)                           => apiDelete(`${ADMIN}/${id}`),

  // ─── Notes ─────────────────────────────────────────────────────────────────
  updateNotes: (id: number, notes: string) =>
    apiPatch<void>(`${ADMIN}/${id}/notes`, { notes }),

  // ─── Company Actions — كلها /admin/companies/{id}/... ✅ ──────────────────
  // الخطأ القديم: كانت تستخدم /companies/{slug}/... مع _skipSlug: true
  // الصواب: api_admin.php يُعرّف هذه الـ routes تحت prefix('v1/admin')

  suspend:    (id: number, reason: string) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/suspend`,   { reason }),

  unsuspend:  (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/unsuspend`),

  activate:   (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/activate`),

  deactivate: (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/deactivate`),

  verify:     (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/verify`),

  unverify:   (id: number) =>
    apiPost<AdminCompany>(`${ADMIN}/${id}/unverify`),

  changePlan: (id: number, d: {
    plan:             string;
    max_users?:       number;
    max_products?:    number;
    max_warehouses?:  number;
  }) => apiPost<AdminCompany>(`${ADMIN}/${id}/change-plan`, d),

  // ─── Members ───────────────────────────────────────────────────────────────
  // ✅ listUsers كانت مُستخدَمة في CompanyDrawer لكن غير موجودة
  listUsers: (id: number, params?: { page?: number; per_page?: number }) =>
    apiGetPaginated<Paginated<AdminUser>>(`${ADMIN}/${id}/users`, params as any),

  addUser:    (id: number, userId: number, role?: string) =>
    apiPost(`${ADMIN}/${id}/users`, { user_id: userId, role }),

  removeUser: (id: number, userId: number) =>
    apiDelete(`${ADMIN}/${id}/users/${userId}`),

  toggleUser: (id: number, userId: number) =>
    apiPatch(`${ADMIN}/${id}/users/${userId}/toggle`, {}),

  // ─── Seed ──────────────────────────────────────────────────────────────────
  seed: (id: number) =>
    apiPost<{ message: string; applied: string[]; skipped: string[] }>(
      `${ADMIN}/${id}/seed`
    ),

} as const;

// ─── Type helpers للـ hooks ───────────────────────────────────────────────────
export type CompanyActionId =
  | { action: 'suspend';    id: number; reason: string }
  | { action: 'unsuspend';  id: number }
  | { action: 'activate';   id: number }
  | { action: 'deactivate'; id: number }
  | { action: 'verify';     id: number }
  | { action: 'unverify';   id: number };
