// ════════════════════════════════════════════════
// hooks/useAdmin.ts — النسخة الكاملة
// متوافقة مع ردود Backend الفعلية
// ════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type {
  AdminCompany, AdminUser, AdminPlan, AdminStats,
  ActivityLog, PaginatedResponse, SystemSettings,
  AdminCompaniesParams, AdminUsersParams, AdminActivityParams,
} from '@/types/admin';

// ── Query Keys ────────────────────────────────────────────────
export const adminKeys = {
  all:          ['admin'] as const,
  dashboard:    ()                       => [...adminKeys.all, 'dashboard'] as const,
  companies:    (p?: AdminCompaniesParams) => [...adminKeys.all, 'companies', p ?? {}] as const,
  company:      (id: number)             => [...adminKeys.all, 'company', id] as const,
  companyUsers: (id: number)             => [...adminKeys.all, 'company-users', id] as const,
  users:        (p?: AdminUsersParams)   => [...adminKeys.all, 'users', p ?? {}] as const,
  user:         (id: number)             => [...adminKeys.all, 'user', id] as const,
  plans:        ()                       => [...adminKeys.all, 'plans'] as const,
  activity:     (p?: AdminActivityParams) => [...adminKeys.all, 'activity', p ?? {}] as const,
  settings:     ()                       => [...adminKeys.all, 'settings'] as const,
};

// ── Dashboard ─────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery<AdminStats>({
    queryKey: adminKeys.dashboard(),
    queryFn:  adminApi.getDashboard,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Companies ─────────────────────────────────────────────────
export function useAdminCompanies(params?: AdminCompaniesParams) {
  return useQuery<PaginatedResponse<AdminCompany>>({
    queryKey: adminKeys.companies(params),
    queryFn:  () => adminApi.getCompanies(params),
    staleTime: 60_000,
    keepPreviousData: true,
  });
}

export function useAdminCompany(id: number) {
  return useQuery<AdminCompany>({
    queryKey: adminKeys.company(id),
    queryFn:  () => adminApi.getCompany(id),
    enabled:  !!id,
  });
}

// enabled يُتحكَّم به من الخارج (فقط عند فتح تبويب Users)
export function useAdminCompanyUsers(id: number, enabled = true) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.companyUsers(id),
    queryFn:  () => adminApi.getCompanyUsers(id),
    enabled:  !!id && enabled,
  });
}

// ── Company Mutations ─────────────────────────────────────────
export function useAdminCompanyMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    suspend: useMutation({
      mutationFn: ({ id, reason }: { id: number; reason: string }) =>
        adminApi.suspendCompany(id, reason),
      onSuccess: invalidate,
    }),
    unsuspend: useMutation({
      mutationFn: (id: number) => adminApi.unsuspendCompany(id),
      onSuccess: invalidate,
    }),
    verify: useMutation({
      mutationFn: (id: number) => adminApi.verifyCompany(id),
      onSuccess: invalidate,
    }),
    unverify: useMutation({
      mutationFn: (id: number) => adminApi.unverifyCompany(id),
      onSuccess: invalidate,
    }),
    activate: useMutation({
      mutationFn: (id: number) => adminApi.activateCompany(id),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (id: number) => adminApi.deactivateCompany(id),
      onSuccess: invalidate,
    }),
    changePlan: useMutation({
      mutationFn: ({ id, ...data }: {
        id: number; plan: string;
        max_users?: number; max_warehouses?: number; max_products?: number;
      }) => adminApi.changePlan(id, data),
      onSuccess: invalidate,
    }),
    deleteCompany: useMutation({
      mutationFn: (id: number) => adminApi.deleteCompany(id),
      onSuccess: invalidate,
    }),
    updateNotes: useMutation({
      mutationFn: ({ id, notes }: { id: number; notes: string }) =>
        adminApi.updateNotes(id, notes),
      onSuccess: invalidate,
    }),
    addUser: useMutation({
      mutationFn: ({ companyId, userId, role }: { companyId: number; userId: number; role?: string }) =>
        adminApi.addCompanyUser(companyId, userId, role),
      onSuccess: invalidate,
    }),
    removeUser: useMutation({
      mutationFn: ({ companyId, userId }: { companyId: number; userId: number }) =>
        adminApi.removeCompanyUser(companyId, userId),
      onSuccess: invalidate,
    }),
    toggleUser: useMutation({
      mutationFn: ({ companyId, userId }: { companyId: number; userId: number }) =>
        adminApi.toggleCompanyUser(companyId, userId),
      onSuccess: invalidate,
    }),
  };
}

// ── Users ─────────────────────────────────────────────────────
export function useAdminUsers(params?: AdminUsersParams) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.users(params),
    queryFn:  () => adminApi.getUsers(params),
    staleTime: 60_000,
    keepPreviousData: true,
  });
}

export function useAdminUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    createUser: useMutation({
      mutationFn: adminApi.createUser,
      onSuccess: invalidate,
    }),
    toggleActive: useMutation({
      mutationFn: (id: number) => adminApi.toggleUserActive(id),
      onSuccess: invalidate,
    }),
    resetPassword: useMutation({
      mutationFn: ({ id, password, password_confirmation }:
        { id: number; password: string; password_confirmation: string }) =>
        adminApi.resetPassword(id, password, password_confirmation),
    }),
    deleteUser: useMutation({
      mutationFn: (id: number) => adminApi.deleteUser(id),
      onSuccess: invalidate,
    }),
    impersonate: useMutation({
      mutationFn: (id: number) => adminApi.impersonateStart(id),
    }),
  };
}

// ── Plans ─────────────────────────────────────────────────────
export function useAdminPlans() {
  return useQuery<AdminPlan[]>({
    queryKey: adminKeys.plans(),
    queryFn:  adminApi.getPlans,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Activity Logs ─────────────────────────────────────────────
export function useAdminActivity(params?: AdminActivityParams) {
  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: adminKeys.activity(params),
    queryFn:  () => adminApi.getActivityLogs(params),
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

export function useAdminActivityExport() {
  return useMutation({
    mutationFn: async (params?: AdminActivityParams) => {
      const blob = await adminApi.exportActivityLogs(params) as Blob;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `activity_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ── System Settings ───────────────────────────────────────────
export function useAdminSettings() {
  return useQuery<SystemSettings>({
    queryKey: adminKeys.settings(),
    queryFn:  adminApi.getSystemSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateSystemSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.settings() }),
  });
}
