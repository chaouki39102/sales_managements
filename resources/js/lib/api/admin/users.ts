// lib/api/admin/users.ts
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import type { AdminUser, AdminCompany, Paginated, AdminUsersFilter } from '@/types/admin';

const BASE = '/admin/users';

export const usersApi = {
  // Paginated
  list: (f?: AdminUsersFilter) => apiGet<Paginated<AdminUser>>(BASE, f as any),

  // Single / mutation
  show:          (id: number)                                    => apiGet<AdminUser>(`${BASE}/${id}`),
  create:        (d: Partial<AdminUser> & { password?: string }) => apiPost<AdminUser>(BASE, d),
  update:        (id: number, d: Partial<AdminUser>)             => apiPut<AdminUser>(`${BASE}/${id}`, d),
  remove:        (id: number)                                    => apiDelete(`${BASE}/${id}`),
  toggleActive:  (id: number)                                    => apiPost<AdminUser>(`${BASE}/${id}/toggle-active`),
  toggleApproval: (id: number)                                   => apiPost<AdminUser>(`${BASE}/${id}/toggle-approval`),
  resetPassword: (id: number, password: string)                  =>
    apiPost(`${BASE}/${id}/reset-password`, { password, password_confirmation: password }),
  companies:     (id: number)                                    => apiGet<AdminCompany[]>(`${BASE}/${id}/companies`),
} as const;

export type PendingUser = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export const approvalApi = {
  pending:  (params?: { search?: string; per_page?: number }) =>
    apiGet<Paginated<PendingUser>>('/admin/users/pending-approval', params as any),
  approve:  (id: number)                          => apiPost(`/admin/users/${id}/approve`),
  reject:   (id: number)                          => apiPost(`/admin/users/${id}/reject`),
  bulkApprove: (ids: number[])                    => apiPost<{ message: string; count: number }>('/admin/users/bulk-approve', { ids }),
  bulkReject:  (ids: number[])                    => apiPost<{ message: string; count: number }>('/admin/users/bulk-reject', { ids }),
} as const;

export const impersonateApi = {
  start: (id: number) => apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${id}`),
  stop:  ()           => apiPost('/admin/impersonate/stop'),
} as const;
