// ════════════════════════════════════════════════
// lib/api/adminApi.ts  —  كل نداءات Super Admin API
// ════════════════════════════════════════════════
import apiClient from '@/lib/api/client';
import type {
  AdminCompany, AdminUser, AdminPlan, ActivityLog,
  AdminDashboardStats, Paginated,
  AdminCompaniesParams, AdminUsersParams, AdminActivityParams,
  SuspendPayload, ChangePlanPayload, ResetPasswordPayload,
  UpdateNotesPayload, CreateCompanyPayload,
  SystemSettings,
  SystemSettings,
} from '@/types/admin';
import { PaginatedResponse } from './admin';

// ─── helpers ─────────────────────────────────────────────────
function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ════════════════════════════════════════════════
// Dashboard
// ════════════════════════════════════════════════
export const adminDashboardApi = {
  /** إحصائيات كاملة للمنصة */
  getStats: (): Promise<AdminDashboardStats> =>
    apiClient.get('/admin/dashboard').then(r => r.data),

  /** صحة النظام (يمكن استدعاؤه كل دقيقة) */
  getHealth: (): Promise<AdminDashboardStats['system']> =>
    apiClient.get('/admin/system/health').then(r => r.data),
};

// ════════════════════════════════════════════════
// Companies
// ════════════════════════════════════════════════
export const adminCompaniesApi = {
  list: (params?: AdminCompaniesParams): Promise<Paginated<AdminCompany>> =>
    apiClient.get(`/admin/companies${qs(params as Record<string, unknown>)}`).then(r => r.data),

  get: (id: number): Promise<AdminCompany> =>
    apiClient.get(`/admin/companies/${id}`).then(r => r.data),

  create: (payload: CreateCompanyPayload): Promise<AdminCompany> =>
    apiClient.post('/admin/companies', payload).then(r => r.data),

  update: (id: number, payload: Partial<AdminCompany>): Promise<AdminCompany> =>
    apiClient.put(`/admin/companies/${id}`, payload).then(r => r.data),

  delete: (id: number): Promise<void> =>
    apiClient.delete(`/admin/companies/${id}`),

  // ── حالة ──────────────────────────────────────
  suspend: (payload: SuspendPayload): Promise<AdminCompany> =>
    apiClient.post(`/admin/companies/${payload.id}/suspend`, { reason: payload.reason }).then(r => r.data),

  unsuspend: (id: number): Promise<AdminCompany> =>
    apiClient.post(`/admin/companies/${id}/unsuspend`).then(r => r.data),

  activate: (id: number): Promise<AdminCompany> =>
    apiClient.post(`/admin/companies/${id}/activate`).then(r => r.data),

  deactivate: (id: number): Promise<AdminCompany> =>
    apiClient.post(`/admin/companies/${id}/deactivate`).then(r => r.data),

  verify: (id: number): Promise<AdminCompany> =>
    apiClient.post(`/admin/companies/${id}/verify`).then(r => r.data),

  unverify: (id: number): Promise<AdminCompany> =>
    apiClient.post(`/admin/companies/${id}/unverify`).then(r => r.data),

  // ── خطة ──────────────────────────────────────
  changePlan: (payload: ChangePlanPayload): Promise<AdminCompany> =>
    apiClient.put(`/admin/companies/${payload.id}/plan`, payload).then(r => r.data),

  // ── تمديد التجربة ─────────────────────────────
  extendTrial: (id: number, days: number): Promise<AdminCompany> =>
    apiClient.post(`/admin/companies/${id}/extend-trial`, { days }).then(r => r.data),

  // ── ملاحظات ───────────────────────────────────
  updateNotes: (payload: UpdateNotesPayload): Promise<AdminCompany> =>
    apiClient.put(`/admin/companies/${payload.id}/notes`, { notes: payload.notes }).then(r => r.data),

  // ── مستخدمو الشركة ───────────────────────────
  getUsers: (id: number): Promise<AdminUser[]> =>
    apiClient.get(`/admin/companies/${id}/users`).then(r => r.data),

  // ── إحصائيات الشركة ──────────────────────────
  getStats: (id: number): Promise<AdminCompany['stats']> =>
    apiClient.get(`/admin/companies/${id}/stats`).then(r => r.data),

  // ── تسجيل دخول كمسؤول الشركة (impersonate) ───
  impersonate: (id: number): Promise<{ token: string; user: AdminUser }> =>
    apiClient.post(`/admin/companies/${id}/impersonate`).then(r => r.data),

  // ── تصدير CSV ────────────────────────────────
  export: (params?: AdminCompaniesParams): Promise<Blob> =>
    apiClient.get(`/admin/companies/export${qs(params as Record<string, unknown>)}`,
      { responseType: 'blob' }).then(r => r.data),
};

// ════════════════════════════════════════════════
// Users
// ════════════════════════════════════════════════
export const adminUsersApi = {
  list: (params?: AdminUsersParams): Promise<Paginated<AdminUser>> =>
    apiClient.get(`/admin/users${qs(params as Record<string, unknown>)}`).then(r => r.data),

  get: (id: number): Promise<AdminUser> =>
    apiClient.get(`/admin/users/${id}`).then(r => r.data),

  toggleActive: (id: number): Promise<AdminUser> =>
    apiClient.post(`/admin/users/${id}/toggle-active`).then(r => r.data),

  resetPassword: (payload: ResetPasswordPayload): Promise<void> =>
    apiClient.post(`/admin/users/${payload.id}/reset-password`, payload),

  impersonate: (id: number): Promise<{ token: string }> =>
    apiClient.post(`/admin/users/${id}/impersonate`).then(r => r.data),

  delete: (id: number): Promise<void> =>
    apiClient.delete(`/admin/users/${id}`),

  getCompanies: (id: number): Promise<AdminUser['companies']> =>
    apiClient.get(`/admin/users/${id}/companies`).then(r => r.data),

  export: (params?: AdminUsersParams): Promise<Blob> =>
    apiClient.get(`/admin/users/export${qs(params as Record<string, unknown>)}`,
      { responseType: 'blob' }).then(r => r.data),
};

// ════════════════════════════════════════════════
// Plans
// ════════════════════════════════════════════════
export const adminPlansApi = {
  list: (): Promise<AdminPlan[]> =>
    apiClient.get('/admin/plans').then(r => r.data),

  update: (key: string, payload: Partial<AdminPlan>): Promise<AdminPlan> =>
    apiClient.put(`/admin/plans/${key}`, payload).then(r => r.data),
};

// ════════════════════════════════════════════════
// Activity Logs
// ════════════════════════════════════════════════
export const adminActivityApi = {
  list: (params?: AdminActivityParams): Promise<Paginated<ActivityLog>> =>
    apiClient.get(`/admin/activity${qs(params as Record<string, unknown>)}`).then(r => r.data),

  export: (params?: AdminActivityParams): Promise<Blob> =>
    apiClient.get(`/admin/activity/export${qs(params as Record<string, unknown>)}`,
      { responseType: 'blob' }).then(r => r.data),
};
export function useAdminActivity(params?: AdminActivityParams) {
  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: ['admin-activity', params],
    queryFn: async () => {
      const res = await adminApi.getActivityLogs(params);
      return unwrap<PaginatedResponse<ActivityLog>>(res);
    },
  });
}
export function useAdminSettings() {
  return useQuery<SystemSettings>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await adminApi.getSystemSettings();
      return unwrap<SystemSettings>(res);
    },
  });
}

