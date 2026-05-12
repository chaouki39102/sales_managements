// ════════════════════════════════════════════════
// lib/api/admin.ts — النسخة الكاملة
// جميع endpoints الـ Super Admin
// ════════════════════════════════════════════════
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/client';
import type {
  AdminCompany, AdminUser, AdminPlan, AdminStats, ActivityLog,
  PaginatedResponse, AdminCompaniesParams, AdminUsersParams,
  AdminActivityParams, SystemSettings,
} from '@/types/admin';

export const adminApi = {

  // ── Dashboard ────────────────────────────────────────────────
  getDashboard: () =>
    apiGet<AdminStats>('/admin/dashboard'),

  // ── Companies ────────────────────────────────────────────────
  getCompanies: (params?: AdminCompaniesParams) =>
    apiGet<PaginatedResponse<AdminCompany>>('/admin/companies', params as Record<string, unknown>),

  getCompany: (id: number) =>
    apiGet<AdminCompany>(`/admin/companies/${id}`),

  createCompany: (data: Partial<AdminCompany> & { owner_id: number }) =>
    apiPost<AdminCompany>('/admin/companies', data),

  updateCompany: (id: number, data: Partial<AdminCompany>) =>
    apiPut<AdminCompany>(`/admin/companies/${id}`, data),

  deleteCompany: (id: number) =>
    apiDelete(`/admin/companies/${id}`),

  suspendCompany: (id: number, reason: string) =>
    apiPost(`/admin/companies/${id}/suspend`, { reason }),

  unsuspendCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/unsuspend`),

  activateCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/activate`),

  deactivateCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/deactivate`),

  verifyCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/verify`),

  unverifyCompany: (id: number) =>
    apiPost(`/admin/companies/${id}/unverify`),

  changePlan: (id: number, data: {
    plan: string;
    max_users?: number;
    max_warehouses?: number;
    max_products?: number;
  }) => apiPost(`/admin/companies/${id}/change-plan`, data),

  updateNotes: (id: number, notes: string) =>
    apiPatch(`/admin/companies/${id}/notes`, { notes }),

  getCompanyUsers: (id: number, params?: Record<string, unknown>) =>
    apiGet<PaginatedResponse<AdminUser>>(`/admin/companies/${id}/users`, params),

  addCompanyUser: (companyId: number, userId: number, role?: string) =>
    apiPost(`/admin/companies/${companyId}/users`, { user_id: userId, role }),

  removeCompanyUser: (companyId: number, userId: number) =>
    apiDelete(`/admin/companies/${companyId}/users/${userId}`),

  toggleCompanyUser: (companyId: number, userId: number) =>
    apiPatch(`/admin/companies/${companyId}/users/${userId}/toggle`),

  // ── Users ────────────────────────────────────────────────────
  getUsers: (params?: AdminUsersParams) =>
    apiGet<PaginatedResponse<AdminUser>>('/admin/users', params as Record<string, unknown>),

  getUser: (id: number) =>
    apiGet<AdminUser>(`/admin/users/${id}`),

  createUser: (data: { name: string; email: string; password: string; role?: string; company_id?: number }) =>
    apiPost<AdminUser>('/admin/users', data),

  updateUser: (id: number, data: Partial<AdminUser>) =>
    apiPut<AdminUser>(`/admin/users/${id}`, data),

  deleteUser: (id: number) =>
    apiDelete(`/admin/users/${id}`),

  resetPassword: (id: number, password: string, password_confirmation: string) =>
    apiPost(`/admin/users/${id}/reset-password`, { password, password_confirmation }),

  toggleUserActive: (id: number) =>
    apiPost(`/admin/users/${id}/toggle-active`),

  getUserCompanies: (id: number) =>
    apiGet<AdminCompany[]>(`/admin/users/${id}/companies`),

  // ── Plans ────────────────────────────────────────────────────
  getPlans: () =>
    apiGet<AdminPlan[]>('/admin/plans'),

  // ── Impersonate ──────────────────────────────────────────────
  impersonateStart: (userId: number) =>
    apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${userId}`),

  impersonateStop: () =>
    apiPost('/admin/impersonate/stop'),

  // ── Activity Logs ────────────────────────────────────────────
  getActivityLogs: (params?: AdminActivityParams) =>
    apiGet<PaginatedResponse<ActivityLog>>('/admin/activity-log', params as Record<string, unknown>),

  getActivityLog: (id: number) =>
    apiGet<ActivityLog>(`/admin/activity-log/${id}`),

  exportActivityLogs: (params?: AdminActivityParams) =>
    apiGet('/admin/activity-log', { ...params as Record<string, unknown>, export: 'csv' }, { responseType: 'blob' }),

  // ── System Settings ──────────────────────────────────────────
  getSystemSettings: () =>
    apiGet<SystemSettings>('/admin/settings'),

  updateSystemSettings: (data: Partial<SystemSettings>) =>
    apiPut<SystemSettings>('/admin/settings', data),

  // ── System Operations ────────────────────────────────────────
  clearCache: () =>
    apiPost('/admin/maintenance/cache-clear'),

  runScheduler: () =>
    apiPost('/admin/maintenance/run-jobs'),

  enableMaintenance: (message?: string) =>
    apiPost('/admin/maintenance/enable', { message }),

  disableMaintenance: () =>
    apiPost('/admin/maintenance/disable'),

  exportBackup: () =>
    apiGet('/admin/system/backup', undefined, { responseType: 'blob' }),

  // ── Reports ──────────────────────────────────────────────────
  getReports: (period: '7d' | '30d' | '90d') =>
    apiGet<{
      users: Array<{ date: string; value: number }>;
      companies: Array<{ date: string; value: number }>;
      apiCalls: Array<{ date: string; value: number }>;
      revenue: Array<{ date: string; value: number }>;
    }>('/admin/reports', { period }),
};
