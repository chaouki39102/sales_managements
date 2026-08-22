// hooks/admin/useAdminSystem.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, plansApi, settingsApi, maintenanceApi } from '@/lib/api/admin';
import type { AdminPlan } from '@/types/admin';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey:  ['admin', 'dashboard'],
    queryFn:   dashboardApi.get,
    staleTime: 2 * 60_000,
    retry:     false,
  });
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export function useAdminPlans() {
  return useQuery({
    queryKey:  ['admin', 'plans'],
    queryFn:   plansApi.list,
    staleTime: 10 * 60_000,
  });
}

export function usePlanMutations() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] });

  return {
    create: useMutation({
      mutationFn: (data: Partial<AdminPlan>) => plansApi.create(data),
      onSuccess:  inv,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<AdminPlan> }) =>
        plansApi.update(id, data),
      onSuccess:  inv,
    }),
    remove: useMutation({
      mutationFn: (id: number) => plansApi.remove(id),
      onSuccess:  inv,
    }),
  };
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function useSystemSettings() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  const query  = useQuery({
    queryKey:  ['admin', 'settings'],
    queryFn:   settingsApi.get,
    staleTime: 5 * 60_000,
  });

  const update = useMutation({
    mutationFn: settingsApi.update,
    onSuccess:  inv,
  });

  return { ...query, update };
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export function useMaintenanceMutations() {
  const qc     = useQueryClient();
  const invSet = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  return {
    enable:  useMutation({
      mutationFn: (msg?: string) => maintenanceApi.enable(msg),
      onSuccess:  invSet,
    }),
    disable: useMutation({
      mutationFn: maintenanceApi.disable,
      onSuccess:  invSet,
    }),
    // ✅ إصلاح: clearCache لا تحتاج invalidate — هي عملية على الباكاند فقط
    clearCache: useMutation({
      mutationFn: maintenanceApi.cache,
    }),
  };
}
