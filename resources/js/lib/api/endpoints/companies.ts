// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/companies.ts
// Companies API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { companyKeys, adminKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { invalidateCompanyCache } from '../core/queryClient';
import type { Company, ListParams, PaginatedResponse } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────

export const companiesApi = {
  // شركات المستخدم الحالي
  mine: ()                              => apiGet<Company[]>('/companies'),
  show: (slug: string)                  => apiGet<Company>(`/companies/${slug}`),

  create: (data: Partial<Company>)      => apiPost<Company>('/companies', data),
  update: (slug: string, data: Partial<Company>) =>
                                           apiPut<Company>(`/companies/${slug}`, data),

  switch: (companyId: number)           => apiPost<{ user: { company_id: number } }>(
                                            '/companies/switch', { company_id: companyId }),

  // Admin — كل الشركات
  adminList: (params?: ListParams)      => apiGet<PaginatedResponse<Company>>('/admin/companies', params),
  adminShow: (id: number)              => apiGet<Company>(`/admin/companies/${id}`),
  suspend:   (slug: string, reason?: string) =>
                                           apiPost<void>(`/admin/companies/${slug}/suspend`, { reason }),
  unsuspend: (slug: string)             => apiPost<void>(`/admin/companies/${slug}/unsuspend`),
  verify:    (slug: string)             => apiPost<void>(`/admin/companies/${slug}/verify`),
  unverify:  (slug: string)             => apiPost<void>(`/admin/companies/${slug}/unverify`),
  activate:  (slug: string)             => apiPost<void>(`/admin/companies/${slug}/activate`),
  deactivate:(slug: string)             => apiPost<void>(`/admin/companies/${slug}/deactivate`),
  changePlan:(slug: string, plan: string) =>
                                           apiPatch<void>(`/admin/companies/${slug}/change-plan`, { plan }),
  updateNotes:(slug: string, notes: string) =>
                                           apiPatch<void>(`/admin/companies/${slug}/notes`, { notes }),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * شركات المستخدم الحالي (للـ OnboardingPage)
 */
export function useMyCompanies() {
  return useQuery({
    queryKey: companyKeys.mine,
    queryFn:  companiesApi.mine,
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
    mutationFn: ({ companyId }: { companyId: number; company: { id: number; name: string; slug: string } }) =>
      companiesApi.switch(companyId),

    onSuccess: (_, { company }) => {
      appActions.setActiveCompany(company);
      // إبطال كاش الشركة القديمة (لن يُعيد الجلب تلقائياً)
      qc.removeQueries({ queryKey: [company.slug] });
    },
  });
}

// ─── Admin Hooks ──────────────────────────────────────────────────────────────

export function useAdminCompanies(params?: ListParams) {
  return useQuery({
    queryKey: adminKeys.companies.list(params),
    queryFn:  () => companiesApi.adminList(params),
    staleTime: 2 * 60_000,
  });
}

type AdminAction = 'suspend' | 'unsuspend' | 'verify' | 'unverify' | 'activate' | 'deactivate';

export function useAdminCompanyAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ action, slug, payload }: {
      action:   AdminAction;
      slug:     string;
      payload?: Record<string, unknown>;
    }) => {
      switch (action) {
        case 'suspend':    return companiesApi.suspend(slug, payload?.reason as string);
        case 'unsuspend':  return companiesApi.unsuspend(slug);
        case 'verify':     return companiesApi.verify(slug);
        case 'unverify':   return companiesApi.unverify(slug);
        case 'activate':   return companiesApi.activate(slug);
        case 'deactivate': return companiesApi.deactivate(slug);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.companies.all });
      qc.invalidateQueries({ queryKey: companyKeys.mine });
    },
  });
}

export function useUpdateCompanyNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, notes }: { slug: string; notes: string }) =>
      companiesApi.updateNotes(slug, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.companies.all }),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, plan }: { slug: string; plan: string }) =>
      companiesApi.changePlan(slug, plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.companies.all }),
  });
}
