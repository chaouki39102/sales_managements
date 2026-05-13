// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/fiscalYears.ts
// Fiscal Years API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId, useAppStore } from '../../store/appStore';
import type { FiscalYear, ListParams } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────

export const fiscalYearsApi = {
  list:   (slug: string, params?: ListParams) =>
            apiGet<FiscalYear[]>(`/${slug}/fiscal-years`, { per_page: 50, ...params }),
  show:   (slug: string, id: number)          =>
            apiGet<FiscalYear>(`/${slug}/fiscal-years/${id}`),
  create: (slug: string, data: Partial<FiscalYear>) =>
            apiPost<FiscalYear>(`/${slug}/fiscal-years`, data),
  update: (slug: string, id: number, data: Partial<FiscalYear>) =>
            apiPut<FiscalYear>(`/${slug}/fiscal-years/${id}`, data),
  close:  (slug: string, id: number)          =>
            apiPatch<FiscalYear>(`/${slug}/fiscal-years/${id}/close`, {}),
  setCurrent: (slug: string, id: number)      =>
            apiPatch<FiscalYear>(`/${slug}/fiscal-years/${id}/set-current`, {}),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * جلب سنوات الشركة النشطة
 * مرتبط تلقائياً بـ activeSlug من Zustand
 */
export function useFiscalYears(slug?: string) {
  const activeSlug = useActiveSlug();
  const s = slug ?? activeSlug;

  return useQuery({
    queryKey: tenantKeys.fiscalYears.all(s ?? ''),
    queryFn:  () => fiscalYearsApi.list(s!),
    enabled:  !!s,
    staleTime: 5 * 60_000,
    select: (years) => ({
      years,
      current: years.find(y => y.is_current) ??
               years.find(y => !y.is_closed) ??
               years[0] ??
               null,
      open:   years.filter(y => !y.is_closed),
      closed: years.filter(y => y.is_closed),
    }),
  });
}

/**
 * السنة المالية المختارة حالياً (من Zustand + React Query)
 */
export function useSelectedFiscalYear() {
  const selectedId = useSelectedYearId();
  const { data } = useFiscalYears();

  if (!data) return null;
  if (!selectedId) return data.current;
  return data.years.find(y => y.id === selectedId) ?? data.current;
}

/**
 * إنشاء سنة مالية جديدة لشركة محددة (مستخدَم في OnboardingPage/CreateCompanyModal)
 */
export function useCreateFiscalYear(slug?: string) {
  const activeSlug = useActiveSlug();
  const s = slug ?? activeSlug;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FiscalYear>) =>
      fiscalYearsApi.create(s!, data),
    onSuccess: () => {
      if (s) qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(s) });
    },
  });
}

export function useUpdateFiscalYear() {
  const slug = useActiveSlug();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FiscalYear> }) =>
      fiscalYearsApi.update(slug!, id, data),
    onSuccess: (updated) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        qc.setQueryData(tenantKeys.fiscalYears.detail(slug, updated.id), updated);
      }
    },
  });
}

export function useCloseFiscalYear() {
  const slug = useActiveSlug();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fiscalYearsApi.close(slug!, id),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
    },
  });
}
