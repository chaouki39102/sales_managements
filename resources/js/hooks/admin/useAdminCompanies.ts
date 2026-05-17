// hooks/admin/useAdminCompanies.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/admin';
import type { AdminCompaniesFilter } from '@/types/admin';

const KEY = ['admin', 'companies'] as const;

export function useAdminCompanies(filter?: AdminCompaniesFilter) {
  return useQuery({
    queryKey:        [...KEY, filter],
    queryFn:         () => companiesApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminCompany(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn:  () => companiesApi.show(id),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useCompanyMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    create:     useMutation({ mutationFn: companiesApi.create,                           onSuccess: inv }),
    update:     useMutation({ mutationFn: ({ id, data }: any) => companiesApi.update(id, data),  onSuccess: inv }),
    remove:     useMutation({ mutationFn: companiesApi.remove,                           onSuccess: inv }),
    suspend:    useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => companiesApi.suspend(id, reason), onSuccess: inv }),
    unsuspend:  useMutation({ mutationFn: (id: number) => companiesApi.unsuspend(id),    onSuccess: inv }),
    activate:   useMutation({ mutationFn: (id: number) => companiesApi.activate(id),    onSuccess: inv }),
    deactivate: useMutation({ mutationFn: (id: number) => companiesApi.deactivate(id),  onSuccess: inv }),
    verify:     useMutation({ mutationFn: (id: number) => companiesApi.verify(id),      onSuccess: inv }),
    unverify:   useMutation({ mutationFn: (id: number) => companiesApi.unverify(id),    onSuccess: inv }),
    changePlan: useMutation({ mutationFn: ({ id, ...d }: any) => companiesApi.changePlan(id, d), onSuccess: inv }),
    updateNotes:useMutation({ mutationFn: ({ id, notes }: { id: number; notes: string }) => companiesApi.updateNotes(id, notes), onSuccess: inv }),
    seed:       useMutation({ mutationFn: (id: number) => companiesApi.seed(id),        onSuccess: inv }),
  };
}

export function useCompanyMemberMutations(companyId: number) {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: [...KEY, companyId, 'users'] });

  return {
    addUser:    useMutation({ mutationFn: ({ userId, role }: { userId: number; role?: string }) => companiesApi.addUser(companyId, userId, role),    onSuccess: inv }),
    removeUser: useMutation({ mutationFn: (userId: number) => companiesApi.removeUser(companyId, userId), onSuccess: inv }),
    toggleUser: useMutation({ mutationFn: (userId: number) => companiesApi.toggleUser(companyId, userId), onSuccess: inv }),
  };
}
