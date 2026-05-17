// hooks/admin/useAdminUsers.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { usersApi, impersonateApi } from '@/lib/api/admin';
import type { AdminUsersFilter } from '@/types/admin';

const KEY = ['admin', 'users'] as const;

export function useAdminUsers(filter?: AdminUsersFilter) {
  return useQuery({
    queryKey:        [...KEY, filter],
    queryFn:         () => usersApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserCompanies(userId: number, enabled = true) {
  return useQuery({
    queryKey: [...KEY, userId, 'companies'],
    queryFn:  () => usersApi.companies(userId),
    enabled:  enabled && userId > 0,
    staleTime: 60_000,
  });
}

export function useUserMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    create:        useMutation({ mutationFn: usersApi.create,                                       onSuccess: inv }),
    update:        useMutation({ mutationFn: ({ id, data }: any) => usersApi.update(id, data),      onSuccess: inv }),
    remove:        useMutation({ mutationFn: (id: number) => usersApi.remove(id),                   onSuccess: inv }),
    toggleActive:  useMutation({ mutationFn: (id: number) => usersApi.toggleActive(id),             onSuccess: inv }),
    resetPassword: useMutation({ mutationFn: ({ id, pwd }: { id: number; pwd: string }) => usersApi.resetPassword(id, pwd) }),
    impersonate:   useMutation({
      mutationFn: (id: number) => impersonateApi.start(id),
      onSuccess:  (res: any) => {
        const token = res?.token ?? res?.data?.token;
        if (token) { localStorage.setItem('auth_token', token); window.location.href = '/dashboard'; }
      },
    }),
  };
}
