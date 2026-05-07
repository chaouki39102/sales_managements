// ════════════════════════════════════════════════
// lib/api/admin.ts  —  Super Admin API
// جميع الطلبات تذهب إلى /admin/... بدون slug
// ════════════════════════════════════════════════
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────
export interface AdminCompany {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  plan: string;
  is_active: boolean;
  is_suspended: boolean;
  suspended_reason?: string;
  verified_at?: string;
  notes?: string;
  users_count: number;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  owner?: { id: number; name: string; email: string };
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  companies_count?: number;
  created_at: string;
}

export interface AdminStats {
  companies: {
    total: number;
    active: number;
    suspended: number;
    verified: number;
    by_plan: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    new_this_month: number;
  };
  recent_companies: AdminCompany[];
  recent_users: AdminUser[];
}

export interface AdminPlan {
  key: string;
  label: string;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  companies_count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

// ── Dashboard ─────────────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () =>
    apiGet<AdminStats>('/admin/dashboard'),

  // ── Companies ──────────────────────────────────────────────────────
  getCompanies: (params?: Record<string, unknown>) =>
    apiGet<PaginatedResponse<AdminCompany>>('/admin/companies', params),

  getCompany: (id: number) =>
    apiGet<AdminCompany>(`/admin/companies/${id}`),

  createCompany: (data: Partial<AdminCompany>) =>
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

  changePlan: (id: number, data: { plan: string; max_users?: number; max_warehouses?: number; max_products?: number }) =>
    apiPost(`/admin/companies/${id}/change-plan`, data),

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

  // ── Users ──────────────────────────────────────────────────────────
  getUsers: (params?: Record<string, unknown>) =>
    apiGet<PaginatedResponse<AdminUser>>('/admin/users', params),

  getUser: (id: number) =>
    apiGet<AdminUser>(`/admin/users/${id}`),

  createUser: (data: Partial<AdminUser> & { password: string }) =>
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

  // ── Impersonate ────────────────────────────────────────────────────
  impersonateStart: (userId: number) =>
    apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${userId}`),

  impersonateStop: () =>
    apiPost('/admin/impersonate/stop'),

  // ── Plans ──────────────────────────────────────────────────────────
  getPlans: () =>
    apiGet<AdminPlan[]>('/admin/plans'),
};
