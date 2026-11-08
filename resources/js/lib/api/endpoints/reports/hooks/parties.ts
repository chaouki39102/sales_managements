// lib/api/endpoints/reports/hooks/parties.ts — React Query hooks (parties).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug, useSelectedYearId } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { ReportBaseParams } from '../types/common';
import type { GrandLivreParams, PartyReportParams } from '../types/parties';

export function useCustomersReport(params?: Omit<PartyReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'customers', yearId, params],
    queryFn:   () => reportsApi.customers({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useSuppliersReport(params?: Omit<PartyReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'suppliers', yearId, params],
    queryFn:   () => reportsApi.suppliers({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useAgingReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'aging', yearId, params],
    queryFn:   () => reportsApi.aging({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 3 * 60_000,
  });
}

// useDebtsReport → يستخدم customers report مع balance
export function useDebtsReport() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'debts', yearId],
    queryFn:   () => reportsApi.customers({ year_id: yearId ?? undefined, with_balance: true }),
    enabled:   !!slug && !!yearId,
    staleTime: 3 * 60_000,
  });
}

export function useClientMonthlyReport(params?: Omit<ReportBaseParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'client-monthly', yearId, params],
    queryFn:   () => reportsApi.clientMonthly({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useGrandLivreReport(params?: Omit<GrandLivreParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'grand-livre', yearId, params],
    queryFn:   () => reportsApi.grandLivre({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}
