// ════════════════════════════════════════════════════════════════════════════
// hooks/admin/useAdminCompanies.ts  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   suspend/unsuspend/activate/deactivate/verify/unverify/changePlan
//   كانت تقبل (slug: string) لأن companiesApi القديم كان يستخدم Tenant routes
//
//   الآن companiesApi مُصلَح → كل العمليات بالـ id الرقمي
//   → جميع الـ mutations تقبل id: number فقط
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/admin';
import type { AdminCompany, AdminCompaniesFilter } from '@/types/admin';

const KEY = ['admin', 'companies'] as const;

const keys = {
  all:     KEY,
  list:    (f?: AdminCompaniesFilter) => [...KEY, 'list', f] as const,
  detail:  (id: number)               => [...KEY, id]        as const,
  members: (id: number)               => [...KEY, id, 'users'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAdminCompanies(filter?: AdminCompaniesFilter) {
  return useQuery({
    queryKey:        keys.list(filter),
    queryFn:         () => companiesApi.list(filter),
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminCompany(id: number) {
  return useQuery({
    queryKey:  keys.detail(id),
    queryFn:   () => companiesApi.show(id),
    staleTime: 30_000,
    enabled:   id > 0,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
//
// ✅ كل العمليات الآن بالـ id الرقمي — تتوافق مع companiesApi المُصلَح
//

export function useCompanyMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: KEY });

  return {
    // CRUD
    create: useMutation({
      mutationFn: companiesApi.create,
      onSuccess:  inv,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<AdminCompany> }) =>
        companiesApi.update(id, data),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: number) => companiesApi.remove(id),
      onSuccess:  inv,
    }),
    updateNotes: useMutation({
      mutationFn: ({ id, notes }: { id: number; notes: string }) =>
        companiesApi.updateNotes(id, notes),
      onSuccess: inv,
    }),

    // Actions — ✅ id بدل slug
    suspend: useMutation({
      mutationFn: ({ id, reason }: { id: number; reason: string }) =>
        companiesApi.suspend(id, reason),
      onSuccess: inv,
    }),
    unsuspend: useMutation({
      mutationFn: (id: number) => companiesApi.unsuspend(id),
      onSuccess:  inv,
    }),
    activate: useMutation({
      mutationFn: (id: number) => companiesApi.activate(id),
      onSuccess:  inv,
    }),
    deactivate: useMutation({
      mutationFn: (id: number) => companiesApi.deactivate(id),
      onSuccess:  inv,
    }),
    verify: useMutation({
      mutationFn: (id: number) => companiesApi.verify(id),
      onSuccess:  inv,
    }),
    unverify: useMutation({
      mutationFn: (id: number) => companiesApi.unverify(id),
      onSuccess:  inv,
    }),
    changePlan: useMutation({
      mutationFn: ({ id, ...d }: { id: number } & Parameters<typeof companiesApi.changePlan>[1]) =>
        companiesApi.changePlan(id, d),
      onSuccess: inv,
    }),
    seed: useMutation({
      mutationFn: (id: number) => companiesApi.seed(id),
    }),
  };
}

export function useCompanyMemberMutations(companyId: number) {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: keys.members(companyId) });

  return {
    addUser: useMutation({
      mutationFn: ({ userId, role }: { userId: number; role?: string }) =>
        companiesApi.addUser(companyId, userId, role),
      onSuccess: inv,
    }),
    removeUser: useMutation({
      mutationFn: (userId: number) => companiesApi.removeUser(companyId, userId),
      onSuccess:  inv,
    }),
    toggleUser: useMutation({
      mutationFn: (userId: number) => companiesApi.toggleUser(companyId, userId),
      onSuccess:  inv,
    }),
  };
}
