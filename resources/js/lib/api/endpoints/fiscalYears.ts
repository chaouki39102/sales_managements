// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/fiscalYears.ts
// ✅ مصحح: close يستخدم POST (حسب api.php) + notes + invalidate documents
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId, useAppStore } from '../../store/appStore';
import type { FiscalYear, ListParams } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const fiscalYearsApi = {
  list: (params?: ListParams) =>
    apiGet<FiscalYear[]>('/fiscal-years', { per_page: 50, ...params }),

  show: (id: number) =>
    apiGet<FiscalYear>(`/fiscal-years/${id}`),

  create: (data: Partial<FiscalYear>) =>
    apiPost<FiscalYear>('/fiscal-years', data),

  update: (id: number, data: Partial<FiscalYear>) =>
    apiPut<FiscalYear>(`/fiscal-years/${id}`, data),

  // ✅ POST حسب api.php: Route::post('fiscal-years/{year}/close', ...)
  close: (id: number, notes?: string) =>
    apiPost<FiscalYear>(`/fiscal-years/${id}/close`, { notes }),

  // ✅ patch للتعديلات العادية
  setCurrent: (id: number) =>
    apiPatch<FiscalYear>(`/fiscal-years/${id}`, { is_current: true }),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFiscalYears() {
  const slug = useActiveSlug();

  return useQuery({
    queryKey:  tenantKeys.fiscalYears.all(slug ?? ''),
    queryFn:   () => fiscalYearsApi.list(),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
    // ✅ select يُحوِّل المصفوفة إلى كائن منظم
    select: (years) => ({
      years,
      current: years.find(y => y.is_current) ??
               years.find(y => !y.is_closed)  ??
               years[0] ??
               null,
      open:   years.filter(y => !y.is_closed),
      closed: years.filter(y => y.is_closed),
    }),
  });
}

/**
 * ✅ السنة المختارة: من Zustand id → يبحث في React Query cache
 */
export function useSelectedFiscalYear() {
  const selectedId = useSelectedYearId();
  const { data }   = useFiscalYears();

  if (!data) return null;
  if (!selectedId) return data.current;
  return data.years.find(y => y.id === selectedId) ?? data.current;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FiscalYear>) =>
      fiscalYearsApi.create(data),
    onSuccess: (created) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        // ✅ عيِّن السنة الجديدة تلقائياً إذا كانت الأولى
        const state = useAppStore.getState();
        if (!state.selectedYearId) {
          state.setSelectedYearId(created.id);
        }
      }
    },
  });
}

export function useUpdateFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FiscalYear> }) =>
      fiscalYearsApi.update(id, data),
    onSuccess: (updated) => {
      if (slug) {
        qc.setQueryData(tenantKeys.fiscalYears.detail(slug, updated.id), updated);
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
      }
    },
  });
}

export function useCloseFiscalYear() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      fiscalYearsApi.close(id, notes),
    onSuccess: () => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.fiscalYears.all(slug) });
        // ✅ إبطال المستندات أيضاً — الإقفال يؤثر على حالتها
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        // ✅ إعادة تعيين السنة المختارة
        useAppStore.getState().setSelectedYearId(null);
      }
    },
  });
}
