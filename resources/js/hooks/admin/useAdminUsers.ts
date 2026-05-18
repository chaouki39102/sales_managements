// hooks/admin/useAdminUsers.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { usersApi, impersonateApi }                                 from '@/lib/api/admin';
import { tokenStorage }                                             from '@/lib/api/core/client';
import type { AdminUsersFilter }                                    from '@/types/admin';

const KEY = ['admin', 'users'] as const;

const keys = {
  all:       KEY,
  list:      (f?: AdminUsersFilter) => [...KEY, 'list', f] as const,
  detail:    (id: number)            => [...KEY, id]        as const,
  companies: (id: number)            => [...KEY, id, 'companies'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAdminUsers(filter?: AdminUsersFilter) {
  return useQuery({
    queryKey:        keys.list(filter),
    queryFn:         () => usersApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: number) {
  return useQuery({
    queryKey:  keys.detail(id),
    queryFn:   () => usersApi.show(id),
    staleTime: 30_000,
    enabled:   id > 0,
  });
}

export function useAdminUserCompanies(userId: number, enabled = true) {
  return useQuery({
    queryKey:  keys.companies(userId),
    queryFn:   () => usersApi.companies(userId),
    enabled:   enabled && userId > 0,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUserMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    create:        useMutation({ mutationFn: usersApi.create,                                                                  onSuccess: inv }),
    update:        useMutation({ mutationFn: ({ id, data }: { id: number; data: Parameters<typeof usersApi.update>[1] }) =>
                                               usersApi.update(id, data),                                                      onSuccess: inv }),
    remove:        useMutation({ mutationFn: (id: number) => usersApi.remove(id),                                              onSuccess: inv }),
    toggleActive:  useMutation({ mutationFn: (id: number) => usersApi.toggleActive(id),                                       onSuccess: inv }),
    resetPassword: useMutation({ mutationFn: ({ id, pwd }: { id: number; pwd: string }) =>
                                               usersApi.resetPassword(id, pwd) }),

    // ✅ إصلاح: apiPost يمر عبر extractData → token موجود في res.token مباشرة
    impersonate: useMutation({
      mutationFn: (id: number) => impersonateApi.start(id),
      onSuccess:  (res) => {
        if (res?.token) {
          tokenStorage.set(res.token);
          window.location.href = '/dashboard';
        }
      },
    }),
  };
}
