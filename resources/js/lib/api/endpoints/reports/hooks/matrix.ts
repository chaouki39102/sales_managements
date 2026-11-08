// lib/api/endpoints/reports/hooks/matrix.ts — React Query hooks (matrix).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug, useSelectedYearId } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { MatrixDetailParams, MatrixReportParams } from '../types/matrix';

export function useMatrixReport(mode: 'sale' | 'purchase', params?: Omit<MatrixReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  const isSale = mode === 'sale';
  return useQuery({
    queryKey:  [slug, 'reports', isSale ? 'sales-matrix' : 'purchases-matrix', yearId, params],
    queryFn:   () => isSale
      ? reportsApi.salesMatrix({ year_id: yearId ?? undefined, ...params })
      : reportsApi.purchasesMatrix({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useSalesMatrixReport(params?: Omit<MatrixReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'sales-matrix', yearId, params],
    queryFn:   () => reportsApi.salesMatrix({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function usePurchasesMatrixReport(params?: Omit<MatrixReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'purchases-matrix', yearId, params],
    queryFn:   () => reportsApi.purchasesMatrix({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useMatrixDetail(params: MatrixDetailParams | null) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'matrix-detail', params],
    queryFn:   () => reportsApi.matrixDetail(params!),
    enabled:   !!slug && !!params,
    staleTime: 2 * 60_000,
  });
}
