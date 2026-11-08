// lib/api/endpoints/reports/hooks/analytics.ts — React Query hooks (analytics).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug, useSelectedYearId } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { ReportBaseParams } from '../types/common';

export function useDashboardReport(params?: Omit<ReportBaseParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'dashboard', yearId, params],
    queryFn:   () => reportsApi.dashboard({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useCreativeReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'creative', yearId, params],
    queryFn:   () => reportsApi.creative({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}
