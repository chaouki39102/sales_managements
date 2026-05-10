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

// ✅ دالة استخراج البيانات الصحيحة (تتعامل مع شكل successResponse في Laravel)
function unwrap<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && 'meta' in res) {
    // هذا هو الشكل الكامل القادم من successResponse (يحتوي على data, meta, links, status, message)
    // نعيد الكائن كما هو لأن الصفحات تنتظر { data: [], meta: {} }
    return res as T;
  }
  if (res && typeof res === 'object' && 'data' in res && !('meta' in res)) {
    return res.data as T;
  }
  return res as T;
}

// Dashboard
export function useAdminDashboard() {
  return useQuery<AdminStats>({
    queryKey: adminKeys.dashboard(),
    queryFn: async () => unwrap<AdminStats>(await adminApi.getDashboard()),
    staleTime: 2 * 60 * 1000,
  });
}

// Companies
export function useAdminCompanies(params?: AdminCompaniesParams) {
  return useQuery<PaginatedResponse<AdminCompany>>({
    queryKey: adminKeys.companies(params),
    queryFn: async () => unwrap<PaginatedResponse<AdminCompany>>(await adminApi.getCompanies(params)),
    staleTime: 60_000,
  });
}

export function useAdminCompany(id: number) {
  return useQuery<AdminCompany>({
    queryKey: adminKeys.company(id),
    queryFn: async () => unwrap<AdminCompany>(await adminApi.getCompany(id)),
    enabled: !!id,
  });
}

export function useAdminCompanyUsers(id: number) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.companyUsers(id),
    queryFn: async () => unwrap<PaginatedResponse<AdminUser>>(await adminApi.getCompanyUsers(id)),
    enabled: !!id,
  });
}

export function useAdminCompanyMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    suspend: useMutation({
      mutationFn: ({ id, reason }: { id: number; reason: string }) => adminApi.suspendCompany(id, reason),
      onSuccess: invalidate,
    }),
    unsuspend: useMutation({ mutationFn: (id: number) => adminApi.unsuspendCompany(id), onSuccess: invalidate }),
    verify: useMutation({ mutationFn: (id: number) => adminApi.verifyCompany(id), onSuccess: invalidate }),
    unverify: useMutation({ mutationFn: (id: number) => adminApi.unverifyCompany(id), onSuccess: invalidate }),
    activate: useMutation({ mutationFn: (id: number) => adminApi.activateCompany(id), onSuccess: invalidate }),
    deactivate: useMutation({ mutationFn: (id: number) => adminApi.deactivateCompany(id), onSuccess: invalidate }),
    changePlan: useMutation({
      mutationFn: ({ id, ...data }: { id: number; plan: string; max_users?: number; max_warehouses?: number; max_products?: number }) =>
        adminApi.changePlan(id, data),
      onSuccess: invalidate,
    }),
    deleteCompany: useMutation({ mutationFn: (id: number) => adminApi.deleteCompany(id), onSuccess: invalidate }),
    updateNotes: useMutation({
      mutationFn: ({ id, notes }: { id: number; notes: string }) => adminApi.updateNotes(id, notes),
      onSuccess: invalidate,
    }),
  };
}

// Users
export function useAdminUsers(params?: AdminUsersParams) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.users(params),
    queryFn: async () => unwrap<PaginatedResponse<AdminUser>>(await adminApi.getUsers(params)),
    staleTime: 60_000,
  });
}

export function useAdminUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  return {
    toggleActive: useMutation({ mutationFn: (id: number) => adminApi.toggleUserActive(id), onSuccess: invalidate }),
    resetPassword: useMutation({
      mutationFn: ({ id, password, password_confirmation }: { id: number; password: string; password_confirmation: string }) =>
        adminApi.resetPassword(id, password, password_confirmation),
    }),
    deleteUser: useMutation({ mutationFn: (id: number) => adminApi.deleteUser(id), onSuccess: invalidate }),
    impersonate: useMutation({ mutationFn: (id: number) => adminApi.impersonateStart(id) }),
  };
}

// Plans
export function useAdminPlans() {
  return useQuery<AdminPlan[]>({
    queryKey: adminKeys.plans(),
    queryFn: async () => unwrap<AdminPlan[]>(await adminApi.getPlans()),
    staleTime: 10 * 60 * 1000,
  });
}

// Activity
export function useAdminActivity(params?: AdminActivityParams) {
  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: adminKeys.activity(params),
    queryFn: async () => unwrap<PaginatedResponse<ActivityLog>>(await adminApi.getActivityLogs(params)),
    staleTime: 30_000,
  });
}

export function useAdminActivityExport() {
  return useMutation({
    mutationFn: async (params?: AdminActivityParams) => {
      const blob = await adminApi.exportActivityLogs(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_${new Date().toISOString().slice(0, 19)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
