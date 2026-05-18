// hooks/admin/useAdminSystem.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, plansApi, settingsApi, maintenanceApi } from '@/lib/api/admin';

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
    runScheduler: useMutation({
      mutationFn: maintenanceApi.scheduler,
    }),
    exportBackup: useMutation({
      mutationFn: maintenanceApi.backup,
    }),
  };
}
