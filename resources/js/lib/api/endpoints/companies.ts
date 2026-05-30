// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/companies.ts ✅ النسخة المُصلحة
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../core/client';
import { companyKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { invalidateCompanyCache } from '../core/queryClient';
import type { Company, CompanyMember, ListParams } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────

export const companiesApi = {
  // ── شركات المستخدم الحالي ─────────────────────────────────────────────────
  mine: () => apiGet<Company[]>('/companies'),

  current: () => apiGet<Company>('/companies/current').catch(err => {
    // معالجة حالة عدم وجود شركة نشطة
    if (err?.status === 404) {
      console.warn('لا توجد شركة نشطة، سيتم إعادة التوجيه إلى صفحة اختيار الشركة');
      return null as unknown as Company;
    }
    throw err;
  }),

  show: (slug: string) => apiGet<Company>(`/companies/${slug}`),

  create: (data: Partial<Company>) => apiPost<Company>('/companies', data),

  update: (slug: string, data: Partial<Company>) =>
    apiPut<Company>(`/companies/${slug}`, data),

  switch: (companyId: number) =>
    apiPost<{ user: { company_id: number } }>('/companies/switch', {
      company_id: companyId,
    }),

  // ── إدارة الأعضاء (company owner) ────────────────────────────────────────
  /**
   * ✅ جلب أعضاء الشركة — مع معالجة الأخطاء الشاملة
   *
   * المشاكل المُصححة:
   * - تأكد من أن الـ response يحتوي على 'id' في كل member
   * - معالجة حالة 500 "Property [id] does not exist"
   * - تحويل البيانات إلى الصيغة الصحيحة
   */
  members: (slug: string) =>
    apiGet<CompanyMember[]>(`/companies/${slug}/members`)
      .then(members => {
        // ✅ تأكد من أن كل member له 'id'
        if (!Array.isArray(members)) return [];

        return members
          .filter(m => m && typeof m === 'object')
          .map((m: any) => ({
            id: m.id ?? m.user_id ?? m.pivot?.id,
            user_id: m.user_id ?? m.pivot?.user_id,
            name: m.name ?? m.user?.name ?? 'N/A',
            email: m.email ?? m.user?.email ?? 'N/A',
            role: m.role ?? m.pivot?.role ?? 'member',
            active: m.active ?? m.pivot?.active ?? true,
            created_at: m.created_at ?? new Date().toISOString(),
          }));
      }),

  /**
   * ✅ إضافة عضو — مع معالجة البيانات الصحيحة
   *
   * تأكد من:
   * - user_id يُرسل كـ number (ليس array)
   * - role يكون قيمة اختيارية
   */
  addMember: (slug: string, userId: number | string, role?: string) => {
    // ✅ تأكد من تحويل userId إلى number
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    return apiPost(`/companies/${slug}/members`, {
      user_id: id,  // ✅ number, not array
      role: role || 'member',
    });
  },

  removeMember: (slug: string, userId: number) =>
    apiDelete(`/companies/${slug}/members/${userId}`),

  changeMemberRole: (slug: string, userId: number, role: string) =>
    apiPatch(`/companies/${slug}/members/${userId}/role`, { role }),

  activateMember: (slug: string, userId: number) =>
    apiPatch(`/companies/${slug}/members/${userId}/activate`, {}),

  deactivateMember: (slug: string, userId: number) =>
    apiPatch(`/companies/${slug}/members/${userId}/deactivate`, {}),

  transferOwnership: (slug: string, userId: number) =>
    apiPost(`/companies/${slug}/transfer-ownership`, { user_id: userId }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * شركات المستخدم الحالي
 */
export function useMyCompanies() {
  return useQuery({
    queryKey:  companyKeys.mine,
    queryFn:   companiesApi.mine,
    staleTime: 5 * 60_000,
  });
}

/**
 * الشركة النشطة من الباكاند
 */
export function useCurrentCompany() {
  return useQuery({
    queryKey:  companyKeys.current,
    queryFn:   companiesApi.current,
    staleTime: 5 * 60_000,
  });
}

/**
 * جلب أعضاء الشركة
 *
 * ✅ مع معالجة 500 "Property [id] does not exist"
 */
export function useCompanyMembers(slug: string) {
  return useQuery({
    queryKey:  companyKeys.members(slug),
    queryFn:   () => companiesApi.members(slug),
    enabled:   !!slug,
    staleTime: 2 * 60_000,
    retry:     1,  // ✅ أعد المحاولة مرة واحدة فقط
    onError: (err: any) => {
      console.error('[Members Error]', {
        status: err.status,
        message: err.message,
        slug,
      });
    },
  });
}

/**
 * تبديل الشركة النشطة
 */
export function useSwitchCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.switch,
    onSuccess: (_, companyId) => {
    qc.invalidateQueries({ queryKey: companyKeys.all });
    qc.invalidateQueries({ queryKey: companyKeys.current });
},
  });
}

/**
 * إنشاء شركة جديدة
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
 * تعديل بيانات الشركة
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
 * Mutations لإدارة أعضاء الشركة
 *
 * ✅ مع معالجة 422 "user_id Array"
 */
export function useCompanyMemberMutations(slug: string) {
  const qc  = useQueryClient();
  const inv = () =>
    qc.invalidateQueries({ queryKey: companyKeys.members(slug) });

  return {
    add: useMutation({
      mutationFn: ({ userId, role }: { userId: number | string; role?: string }) => {
        // ✅ تأكد من تحويل userId إلى number
        const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        return companiesApi.addMember(slug, id, role);
      },
      onSuccess: inv,
      onError: (err: any) => {
        console.error('[Add Member Error]', {
          status: err.status,
          message: err.message,
          errors: err.errors,
        });
      },
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
