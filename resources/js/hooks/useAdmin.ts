// ════════════════════════════════════════════════
// hooks/useAdmin.ts  —  React Query hooks للـ Super Admin
// ════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { AdminCompany, AdminUser, AdminStats, PaginatedResponse } from '@/lib/api/admin';

// ── Keys ──────────────────────────────────────────────────────────────
export const adminKeys = {
  all:            ['admin'] as const,
  dashboard:      () => [...adminKeys.all, 'dashboard'] as const,
  companies:      (p?: object) => [...adminKeys.all, 'companies', p ?? {}] as const,
  company:        (id: number) => [...adminKeys.all, 'company', id] as const,
  companyUsers:   (id: number) => [...adminKeys.all, 'company-users', id] as const,
  users:          (p?: object) => [...adminKeys.all, 'users', p ?? {}] as const,
  user:           (id: number) => [...adminKeys.all, 'user', id] as const,
  plans:          () => [...adminKeys.all, 'plans'] as const,
};

// ── helper: يسحب data من { success, message, data } أو يُعيد القيمة مباشرة ──
// الـ apiGet في client قد يُعيد الـ response كاملاً أو data فقط حسب الإعداد
function unwrap<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && 'success' in res) {
    return res.data as T;
  }
  return res as T;
}

// ── Dashboard ─────────────────────────────────────────────────────────
export function useAdminDashboard() {
  return useQuery<AdminStats>({
    queryKey: adminKeys.dashboard(),
    queryFn:  async () => {
      const res = await adminApi.getDashboard();
      // ✅ يتعامل مع كلا الحالتين:
      // • apiGet يُعيد { success, message, data: {...} }  → يسحب data
      // • apiGet يُعيد { companies, users, ... }          → يُعيد مباشرة
      return unwrap<AdminStats>(res);
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ── Companies ─────────────────────────────────────────────────────────
export function useAdminCompanies(params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<AdminCompany>>({
    queryKey: adminKeys.companies(params),
    queryFn:  async () => {
      const res = await adminApi.getCompanies(params);
      return unwrap<PaginatedResponse<AdminCompany>>(res);
    },
    staleTime: 60_000,
  });
}

export function useAdminCompany(id: number) {
  return useQuery<AdminCompany>({
    queryKey: adminKeys.company(id),
    queryFn:  async () => {
      const res = await adminApi.getCompany(id);
      return unwrap<AdminCompany>(res);
    },
    enabled:  !!id,
  });
}

export function useAdminCompanyUsers(id: number) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.companyUsers(id),
    queryFn:  async () => {
      const res = await adminApi.getCompanyUsers(id);
      return unwrap<PaginatedResponse<AdminUser>>(res);
    },
    enabled:  !!id,
  });
}

// ── Company Mutations ─────────────────────────────────────────────────
export function useAdminCompanyMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.all });
  };

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.suspendCompany(id, reason),
    onSuccess: invalidate,
  });

  const unsuspend = useMutation({
    mutationFn: (id: number) => adminApi.unsuspendCompany(id),
    onSuccess:  invalidate,
  });

  const verify = useMutation({
    mutationFn: (id: number) => adminApi.verifyCompany(id),
    onSuccess:  invalidate,
  });

  const unverify = useMutation({
    mutationFn: (id: number) => adminApi.unverifyCompany(id),
    onSuccess:  invalidate,
  });

  const activate = useMutation({
    mutationFn: (id: number) => adminApi.activateCompany(id),
    onSuccess:  invalidate,
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => adminApi.deactivateCompany(id),
    onSuccess:  invalidate,
  });

  const changePlan = useMutation({
    mutationFn: ({
      id, ...data
    }: { id: number; plan: string; max_users?: number; max_warehouses?: number; max_products?: number }) =>
      adminApi.changePlan(id, data),
    onSuccess: invalidate,
  });

  const deleteCompany = useMutation({
    mutationFn: (id: number) => adminApi.deleteCompany(id),
    onSuccess:  invalidate,
  });

  const updateNotes = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      adminApi.updateNotes(id, notes),
    onSuccess: invalidate,
  });

  return {
    suspend, unsuspend, verify, unverify,
    activate, deactivate, changePlan, deleteCompany, updateNotes,
  };
}

// ── Users ─────────────────────────────────────────────────────────────
export function useAdminUsers(params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.users(params),
    queryFn:  async () => {
      const res = await adminApi.getUsers(params);
      return unwrap<PaginatedResponse<AdminUser>>(res);
    },
    staleTime: 60_000,
  });
}

export function useAdminUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.all });

  const toggleActive = useMutation({
    mutationFn: (id: number) => adminApi.toggleUserActive(id),
    onSuccess:  invalidate,
  });

  const resetPassword = useMutation({
    mutationFn: ({
      id, password, password_confirmation,
    }: { id: number; password: string; password_confirmation: string }) =>
      adminApi.resetPassword(id, password, password_confirmation),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess:  invalidate,
  });

  const impersonate = useMutation({
    mutationFn: (id: number) => adminApi.impersonateStart(id),
    // ✅ بعد الانتحال: الـ UI يتولى تخزين token وإعادة التوجيه
  });

  return { toggleActive, resetPassword, deleteUser, impersonate };
}

// ── Plans ─────────────────────────────────────────────────────────────
export function useAdminPlans() {
  return useQuery({
    queryKey: adminKeys.plans(),
    queryFn:  async () => {
      const res = await adminApi.getPlans();
      return unwrap(res);
    },
    staleTime: 10 * 60 * 1000,
  });
}