// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/companies.ts
//
// ✅ هذا الملف خاص بـ CompanyController (api.php → /api/v1/companies/*)
//    المستخدم: company owner + أعضاء الشركة
//
// ❌ admin actions (suspend/verify/changePlan/...) محذوفة من هنا نهائياً
//    لأنها تنتمي لـ AdminCompanyController (api_admin.php → /api/v1/admin/companies/*)
//    وموجودة في lib/api/admin/companies.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { companyKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { invalidateCompanyCache } from '../core/queryClient';
import type { Company, CompanyMember, ListParams } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────
// كل هذه الـ endpoints تحت /api/v1/companies/* (CompanyController)

export const companiesApi = {
  // ── شركات المستخدم الحالي ─────────────────────────────────────────────────
  // GET /api/v1/companies
  mine: () => apiGet<Company[]>('/companies'),

  // GET /api/v1/companies/current  ← الشركة النشطة الحالية
  current: () => apiGet<Company>('/companies/current'),

  // GET /api/v1/companies/{slug}
  show: (slug: string) => apiGet<Company>(`/companies/${slug}`),

  // POST /api/v1/companies
  create: (data: Partial<Company>) => apiPost<Company>('/companies', data),

  // PUT /api/v1/companies/{slug}  ← company owner يعدّل شركته
  update: (slug: string, data: Partial<Company>) =>
    apiPut<Company>(`/companies/${slug}`, data),

  // POST /api/v1/companies/switch  ← تبديل الشركة النشطة
  switch: (companyId: number) =>
    apiPost<{ user: { company_id: number } }>('/companies/switch', {
      company_id: companyId,
    }),

  // ── إدارة الأعضاء (company owner) ────────────────────────────────────────
  // GET  /api/v1/companies/{company}/members
  members: (slug: string) =>
    apiGet<CompanyMember[]>(`/companies/${slug}/members`),

  // POST /api/v1/companies/{company}/members
  addMember: (slug: string, userId: number, role?: string) =>
    apiPost(`/companies/${slug}/members`, { user_id: userId, role }),

  // DELETE /api/v1/companies/{company}/members/{userId}
  removeMember: (slug: string, userId: number) =>
    apiDelete(`/companies/${slug}/members/${userId}`),

  // PATCH /api/v1/companies/{company}/members/{userId}/role
  changeMemberRole: (slug: string, userId: number, role: string) =>
    apiPatch(`/companies/${slug}/members/${userId}/role`, { role }),

  // PATCH /api/v1/companies/{company}/members/{userId}/activate
  activateMember: (slug: string, userId: number) =>
    apiPatch(`/companies/${slug}/members/${userId}/activate`, {}),

  // PATCH /api/v1/companies/{company}/members/{userId}/deactivate
  deactivateMember: (slug: string, userId: number) =>
    apiPatch(`/companies/${slug}/members/${userId}/deactivate`, {}),

  // POST /api/v1/companies/{company}/transfer-ownership
  transferOwnership: (slug: string, userId: number) =>
    apiPost(`/companies/${slug}/transfer-ownership`, { user_id: userId }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * شركات المستخدم الحالي
 * تُستخدم في: OnboardingPage, SwitchCompany
 */
export function useMyCompanies() {
  return useQuery({
    queryKey:  companyKeys.mine,
    queryFn:   companiesApi.mine,
    staleTime: 5 * 60_000,
  });
}

/**
 * الشركة النشطة من الباكاند (بيانات كاملة)
 */
export function useCurrentCompany() {
  return useQuery({
    queryKey:  companyKeys.current,
    queryFn:   companiesApi.current,
    staleTime: 5 * 60_000,
  });
}

/**
 * تبديل الشركة النشطة
 * بعد النجاح: يُحدِّث Zustand store → الـ Interceptor يقرأ الـ slug الجديد فوراً
 */
export function useSwitchCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.switch,
    onSuccess: (_, companyId) => {
      invalidateCompanyCache(qc);
    },
  });
}

/**
 * إنشاء شركة جديدة (company owner)
 */
export function useCreateCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.mine });
    },
  });
}

/**
 * تعديل بيانات الشركة (company owner يعدّل شركته فقط)
 */
export function useUpdateCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: Partial<Company> }) =>
      companiesApi.update(slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.mine });
      qc.invalidateQueries({ queryKey: companyKeys.current });
    },
  });
}

/**
 * إدارة أعضاء الشركة (company owner)
 */
export function useCompanyMemberMutations(slug: string) {
  const qc  = useQueryClient();
  const inv = () =>
    qc.invalidateQueries({ queryKey: [...companyKeys.mine, slug, 'members'] });

  return {
    add: useMutation({
      mutationFn: ({ userId, role }: { userId: number; role?: string }) =>
        companiesApi.addMember(slug, userId, role),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (userId: number) => companiesApi.removeMember(slug, userId),
      onSuccess: inv,
    }),
    changeRole: useMutation({
      mutationFn: ({ userId, role }: { userId: number; role: string }) =>
        companiesApi.changeMemberRole(slug, userId, role),
      onSuccess: inv,
    }),
    activate: useMutation({
      mutationFn: (userId: number) => companiesApi.activateMember(slug, userId),
      onSuccess: inv,
    }),
    deactivate: useMutation({
      mutationFn: (userId: number) =>
        companiesApi.deactivateMember(slug, userId),
      onSuccess: inv,
    }),
    transferOwnership: useMutation({
      mutationFn: (userId: number) =>
        companiesApi.transferOwnership(slug, userId),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: companyKeys.mine });
        qc.invalidateQueries({ queryKey: companyKeys.current });
      },
    }),
  };
}
