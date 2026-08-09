// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/users.ts
// Users + Roles API (Tenant-scoped)
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';
import type { User, Role, Permission, PaginatedResponse, ListParams } from '../core/types';

// ─── API ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:           (params?: ListParams)   => apiGet<PaginatedResponse<User>>('/users', params),
  show:           (id: number)            => apiGet<User>(`/users/${id}`),
  create:         (data: Partial<User>)   => apiPost<User>('/users', data),
  update:         (id: number, data: Partial<User>) => apiPut<User>(`/users/${id}`, data),
  delete:         (id: number)            => apiDelete(`/users/${id}`),
  toggleActive:   (id: number)            => apiPost<User>(`/users/${id}/toggle-active`),
  changePassword: (id: number, password: string, confirmation: string) =>
    apiPost(`/users/${id}/change-password`, { password, password_confirmation: confirmation }),
  assignRole:     (id: number, role: string) =>
    apiPost<User>(`/users/${id}/assign-role`, { role }),
} as const;

export const rolesApi = {
  list:   (params?: ListParams) => apiGet<Role[]>('/roles', params),
  show:   (id: number)          => apiGet<Role>(`/roles/${id}`),
  create: (data: Partial<Role>) => apiPost<Role>('/roles', data),
  update: (id: number, data: Partial<Role>) => apiPut<Role>(`/roles/${id}`, data),
  delete: (id: number)          => apiDelete(`/roles/${id}`),
  permissions: ()         => apiGet<Permission[]>('/permissions', { per_page: 500, sort: 'group' }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useUsers(params?: ListParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:        tenantKeys.users.list(slug ?? '', params),
    queryFn:         () => usersApi.list(params),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRoles() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.lookups.roles(slug ?? ''),
    queryFn:  () => rolesApi.list(),
    enabled:  !!slug,
    staleTime: 10 * 60_000,
  });
}

export function usePermissions() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'permissions'],
    queryFn:  () => rolesApi.permissions(),
    enabled:  !!slug,
    staleTime: 30 * 60_000,
  });
}

export function useUserMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.users.all(slug) }); };

  return {
    create:         useMutation({ mutationFn: usersApi.create,  onSuccess: inv }),
    update:         useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => usersApi.update(id, data), onSuccess: inv }),
    remove:         useMutation({ mutationFn: usersApi.delete,  onSuccess: inv }),
    toggleActive:   useMutation({ mutationFn: usersApi.toggleActive,  onSuccess: inv }),
    changePassword: useMutation({ mutationFn: ({ id, password, confirmation }: { id: number; password: string; confirmation: string }) => usersApi.changePassword(id, password, confirmation) }),
    assignRole:     useMutation({ mutationFn: ({ id, role }: { id: number; role: string }) => usersApi.assignRole(id, role), onSuccess: inv }),
  };
}

export function useRoleMutations() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();
  const inv  = () => { if (slug) qc.invalidateQueries({ queryKey: tenantKeys.lookups.roles(slug ?? '') }); };

  return {
    create: useMutation({ mutationFn: rolesApi.create,  onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Role> }) => rolesApi.update(id, data), onSuccess: inv }),
    remove: useMutation({ mutationFn: rolesApi.delete,  onSuccess: inv }),
  };
}
