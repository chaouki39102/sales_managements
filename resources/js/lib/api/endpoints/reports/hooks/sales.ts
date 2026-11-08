// lib/api/endpoints/reports/hooks/sales.ts — React Query hooks (sales).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug, useSelectedYearId } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { ReportBaseParams } from '../types/common';
import type { DailyReportParams, ReturnsReportParams, SalesReportParams, SalesTrendParams } from '../types/sales';

export function useSalesReport(params?: Omit<SalesReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'sales', yearId, params],
    queryFn:   () => reportsApi.sales({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useVelocityReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'velocity', yearId, params],
    queryFn:   () => reportsApi.velocity({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useDailyReport(params?: Omit<DailyReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'daily', yearId, params?.date],
    queryFn:   () => reportsApi.daily({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug,
    staleTime: 2 * 60_000,
  });
}

export function useReturnsReport(params?: ReturnsReportParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'returns', yearId, params],
    queryFn:   () => reportsApi.returns({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useSalesTrendReport(params?: SalesTrendParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'sales-trend', yearId, params],
    queryFn:   () => reportsApi.salesTrend({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}
