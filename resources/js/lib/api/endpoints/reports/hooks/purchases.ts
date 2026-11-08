// lib/api/endpoints/reports/hooks/purchases.ts — React Query hooks (purchases).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug, useSelectedYearId } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { PurchasesReportParams } from '../types/purchases';

export function usePurchasesReport(params?: Omit<PurchasesReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'purchases', yearId, params],
    queryFn:   () => reportsApi.purchases({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}
