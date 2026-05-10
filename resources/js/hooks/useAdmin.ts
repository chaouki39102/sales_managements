// hooks/useAdmin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type {
  AdminCompany,
  AdminUser,
  AdminPlan,
  AdminStats,
  ActivityLog,
  PaginatedResponse,
  AdminCompaniesParams,
  AdminUsersParams,
  AdminActivityParams,
} from '@/types/admin';

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  companies: (params?: AdminCompaniesParams) => [...adminKeys.all, 'companies', params ?? {}] as const,
  company: (id: number) => [...adminKeys.all, 'company', id] as const,
  companyUsers: (id: number) => [...adminKeys.all, 'company-users', id] as const,
  users: (params?: AdminUsersParams) => [...adminKeys.all, 'users', params ?? {}] as const,
  user: (id: number) => [...adminKeys.all, 'user', id] as const,
  plans: () => [...adminKeys.all, 'plans'] as const,
  activity: (params?: AdminActivityParams) => [...adminKeys.all, 'activity', params ?? {}] as const,
};

// ─── تتبع البيانات ────────────────────────────────────────────────────────────
//
// client.ts → extractData() يفعل هذا تلقائياً:
//   response.data        = { success, message, data: X }
//   return response.data.data  = X
//
// إذن ما يصل للـ hooks هو X مباشرة:
//   dashboard  → { companies, users, recent_companies, recent_users }
//   companies  → { data: AdminCompany[], meta: {...} }   ← LengthAwarePaginator
//   users      → { data: AdminUser[],    meta: {...} }
//   company    → { id, name, slug, ... }                 ← CompanyResource
//
// الصفحات تفعل data?.data للوصول للمصفوفة — هذا صحيح لأن X.data = المصفوفة.
// لا نحتاج أي unwrap إضافي في الـ hooks.
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery<AdminStats>({
    queryKey: adminKeys.dashboard(),
    queryFn: () => adminApi.getDashboard(),
    staleTime: 2 * 60 * 1000,
  });
}

// ── Companies ─────────────────────────────────────────────────────────────────
export function useAdminCompanies(params?: AdminCompaniesParams) {
  return useQuery<PaginatedResponse<AdminCompany>>({
    queryKey: adminKeys.companies(params),
    queryFn: () => adminApi.getCompanies(params),
    staleTime: 60_000,
  });
}

export function useAdminCompany(id: number) {
  return useQuery<AdminCompany>({
    queryKey: adminKeys.company(id),
    queryFn: () => adminApi.getCompany(id),
    enabled: !!id,
  });
}

export function useAdminCompanyUsers(id: number) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.companyUsers(id),
    queryFn: () => adminApi.getCompanyUsers(id),
    enabled: !!id,
  });
}

// ── Company Mutations ─────────────────────────────────────────────────────────
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
      mutationFn: ({
        id, ...data
      }: { id: number; plan: string; max_users?: number; max_warehouses?: number; max_products?: number }) =>
        adminApi.changePlan(id, data),
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
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────
export function useAdminUsers(params?: AdminUsersParams) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.getUsers(params),
    staleTime: 60_000,
  });
}

export function useAdminUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    toggleActive: useMutation({
      mutationFn: (id: number) => adminApi.toggleUserActive(id),
      onSuccess: invalidate,
    }),
    resetPassword: useMutation({
      mutationFn: ({
        id, password, password_confirmation,
      }: { id: number; password: string; password_confirmation: string }) =>
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

// ── Plans ─────────────────────────────────────────────────────────────────────
export function useAdminPlans() {
  return useQuery<AdminPlan[]>({
    queryKey: adminKeys.plans(),
    queryFn: () => adminApi.getPlans(),
    staleTime: 10 * 60 * 1000,
  });
}

// ── Activity ──────────────────────────────────────────────────────────────────
export function useAdminActivity(params?: AdminActivityParams) {
  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: adminKeys.activity(params),
    queryFn: () => adminApi.getActivityLogs(params),
    staleTime: 30_000,
  });
}

export function useAdminActivityExport() {
  return useMutation({
    mutationFn: async (params?: AdminActivityParams) => {
      const blob = await adminApi.exportActivityLogs(params);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_${new Date().toISOString().slice(0, 19)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
