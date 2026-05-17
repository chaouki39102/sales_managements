// ════════════════════════════════════════════════════════════════════════════
// lib/admin.ts — adminApi الموحّد
// ════════════════════════════════════════════════════════════════════════════
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api/core/client';
import type {
  AdminCompany,
  AdminUser,
  AdminPlan,
  ActivityLog,
  AdminDashboardStats,
  AdminCompaniesFilter,
  AdminUsersFilter,
  Paginated,
  SystemSettings,
} from '@/types/admin';

export type PaginatedResponse<T> = Paginated<T>;

export const adminApi = {

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  getDashboard: () =>
    apiGet<AdminDashboardStats>('/admin/dashboard'),

  // ─── Companies ─────────────────────────────────────────────────────────────
  getCompanies: (params?: AdminCompaniesFilter) =>
    apiGet<PaginatedResponse<AdminCompany>>('/admin/companies', params as any),

  getCompany: (id: number) =>
    apiGet<AdminCompany>(`/admin/companies/${id}`),

  createCompany: (data: Partial<AdminCompany>) =>
    apiPost<AdminCompany>('/admin/companies', data),

  updateCompany: (id: number, data: Partial<AdminCompany>) =>
    apiPut<AdminCompany>(`/admin/companies/${id}`, data),

  deleteCompany: (id: number) =>
    apiDelete(`/admin/companies/${id}`),

  suspendCompany:    (id: number, reason: string) =>
    apiPost<AdminCompany>(`/admin/companies/${id}/suspend`, { reason }),
  unsuspendCompany:  (id: number) =>
    apiPost<AdminCompany>(`/admin/companies/${id}/unsuspend`),
  activateCompany:   (id: number) =>
    apiPost<AdminCompany>(`/admin/companies/${id}/activate`),
  deactivateCompany: (id: number) =>
    apiPost<AdminCompany>(`/admin/companies/${id}/deactivate`),
  verifyCompany:     (id: number) =>
    apiPost<AdminCompany>(`/admin/companies/${id}/verify`),
  unverifyCompany:   (id: number) =>
    apiPost<AdminCompany>(`/admin/companies/${id}/unverify`),
  changePlan: (id: number, data: {
    plan: string;
    max_users?: number;
    max_products?: number;
    max_warehouses?: number;
  }) => apiPost<AdminCompany>(`/admin/companies/${id}/change-plan`, data),
  updateNotes: (id: number, notes: string) =>
    apiPatch<void>(`/admin/companies/${id}/notes`, { notes }),

  getCompanyUsers: (id: number, params?: { page?: number; per_page?: number }) =>
    apiGet<PaginatedResponse<AdminUser>>(`/admin/companies/${id}/users`, params as any),
  addCompanyUser:    (companyId: number, userId: number, role?: string) =>
    apiPost(`/admin/companies/${companyId}/users`, { user_id: userId, role }),
  removeCompanyUser: (companyId: number, userId: number) =>
    apiDelete(`/admin/companies/${companyId}/users/${userId}`),
  toggleCompanyUser: (companyId: number, userId: number) =>
    apiPatch(`/admin/companies/${companyId}/users/${userId}/toggle`, {}),
  seedCompany: (id: number) =>
    apiPost<{ message: string; applied: string[]; skipped: string[] }>(
      `/admin/companies/${id}/seed`
    ),

  // ─── Users ─────────────────────────────────────────────────────────────────
  getUsers: (params?: AdminUsersFilter) =>
    apiGet<PaginatedResponse<AdminUser>>('/admin/users', params as any),

  getUser: (id: number) =>
    apiGet<AdminUser>(`/admin/users/${id}`),

  createUser: (data: Partial<AdminUser> & { password?: string }) =>
    apiPost<AdminUser>('/admin/users', data),

  updateUser: (id: number, data: Partial<AdminUser>) =>
    apiPut<AdminUser>(`/admin/users/${id}`, data),

  deleteUser: (id: number) =>
    apiDelete(`/admin/users/${id}`),

  resetPassword: (id: number, password: string) =>
    apiPost(`/admin/users/${id}/reset-password`, {
      password,
      password_confirmation: password,
    }),

  toggleActive: (id: number) =>
    apiPost<AdminUser>(`/admin/users/${id}/toggle-active`),

  getUserCompanies: (id: number) =>
    apiGet<AdminCompany[]>(`/admin/users/${id}/companies`),

  // ─── Impersonate ───────────────────────────────────────────────────────────
  impersonate: (id: number) =>
    apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${id}`),

  stopImpersonate: () =>
    apiPost('/admin/impersonate/stop'),

  // ─── Plans ─────────────────────────────────────────────────────────────────
  getPlans: () =>
    apiGet<AdminPlan[]>('/admin/plans'),

  getPlan: (key: string) =>
    apiGet<AdminPlan>(`/admin/plans/${key}`),

  // ─── Activity ──────────────────────────────────────────────────────────────
  getActivity: (params?: {
    search?:    string;
    event?:     string;
    date_from?: string;
    date_to?:   string;
    page?:      number;
    per_page?:  number;
  }) => apiGet<PaginatedResponse<ActivityLog>>('/admin/activity-log', params as any),

  getActivityLog: (id: number) =>
    apiGet<ActivityLog>(`/admin/activity-log/${id}`),

  // ─── System ────────────────────────────────────────────────────────────────
  getSystemStatus: () =>
    apiGet<{ is_ready: boolean; components: any[] }>('/admin/system/status'),

  bootSystem:      () => apiPost('/admin/system/boot'),
  bootWilayas:     () => apiPost('/admin/system/boot/wilayas'),
  bootPermissions: () => apiPost('/admin/system/boot/permissions'),

  // ─── Settings ──────────────────────────────────────────────────────────────
  getSettings: () =>
    apiGet<SystemSettings>('/admin/system/settings'),

  updateSettings: (data: Partial<SystemSettings>) =>
    apiPut<SystemSettings>('/admin/system/settings', data),

  // ─── Maintenance ───────────────────────────────────────────────────────────
  getMaintenance: () =>
    apiGet<{ maintenance_mode: boolean; message?: string }>('/admin/system/maintenance'),

  enableMaintenance:  (message?: string) =>
    apiPost('/admin/system/maintenance/enable', { message }),
  disableMaintenance: () =>
    apiPost('/admin/system/maintenance/disable'),
  clearCache: () =>
    apiPost('/admin/system/maintenance/cache-clear'),

  // ─── Reports ───────────────────────────────────────────────────────────────
  getReports: (period: '7d' | '30d' | '90d') =>
    apiGet<{
      users:     { date: string; value: number }[];
      companies: { date: string; value: number }[];
      apiCalls:  { date: string; value: number }[];
      revenue:   { date: string; value: number }[];
    }>('/admin/reports', { period } as any),

  // ─── Scheduler & Backup — المسارات الصحيحة ✅ ──────────────────────────────
  // كانت خاطئة: '/admin/maintenance/scheduler' و '/admin/maintenance/backup'
  runScheduler: () =>
    apiPost<{ message: string }>('/admin/system/maintenance/scheduler'),

  exportBackup: () =>
    apiPost<{ message: string; path?: string }>('/admin/system/maintenance/backup'),

} as const;

export default adminApi;
