// ════════════════════════════════════════════════════════════════════════════
// hooks/admin/useAdminSystem.ts  ← النسخة المُصلحة الكاملة
//
// المشكلة الأصلية:
//   • useAdminPlans كانت موجودة هنا لكن لم تُصدَّر من hooks/useAdmin.ts
//   • useSystemSettings وuseMaintenanceMutations كانتا موجودتين لكن
//     AdminSettingsPage كانت تستورد useSystemSettings من '@/hooks/admin'
//     مباشرة وهو ما يعمل عبر hooks/admin/index.ts
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, plansApi, settingsApi, maintenanceApi } from '@/lib/api/admin';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn:  dashboardApi.get,
    staleTime: 2 * 60_000,
    retry: false,
  });
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn:  plansApi.list,
    staleTime: 10 * 60_000,
  });
}

// ─── System Settings ─────────────────────────────────────────────────────────

export function useSystemSettings() {
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  const query  = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn:  settingsApi.get,
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
  const qc  = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] });

  return {
    enable:     useMutation({
      mutationFn: (msg?: string) => maintenanceApi.enable(msg),
      onSuccess:  inv,
    }),
    disable:    useMutation({
      mutationFn: maintenanceApi.disable,
      onSuccess:  inv,
    }),
    clearCache: useMutation({
      mutationFn: maintenanceApi.cache,
    }),
  };
}
