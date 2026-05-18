// lib/api/admin/users.ts
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import { apiGetPaginated }                    from './client';
import type { AdminUser, AdminCompany, Paginated, AdminUsersFilter } from '@/types/admin';

const BASE = '/admin/users';

export const usersApi = {
  // Paginated
  list: (f?: AdminUsersFilter) => apiGetPaginated<Paginated<AdminUser>>(BASE, f as any),

  // Single / mutation
  show:          (id: number)                                    => apiGet<AdminUser>(`${BASE}/${id}`),
  create:        (d: Partial<AdminUser> & { password?: string }) => apiPost<AdminUser>(BASE, d),
  update:        (id: number, d: Partial<AdminUser>)             => apiPut<AdminUser>(`${BASE}/${id}`, d),
  remove:        (id: number)                                    => apiDelete(`${BASE}/${id}`),
  toggleActive:  (id: number)                                    => apiPost<AdminUser>(`${BASE}/${id}/toggle-active`),
  resetPassword: (id: number, password: string)                  =>
    apiPost(`${BASE}/${id}/reset-password`, { password, password_confirmation: password }),
  companies:     (id: number)                                    => apiGet<AdminCompany[]>(`${BASE}/${id}/companies`),
} as const;

export const impersonateApi = {
  start: (id: number) => apiPost<{ token: string; user: AdminUser }>(`/admin/impersonate/${id}`),
  stop:  ()           => apiPost('/admin/impersonate/stop'),
} as const;
