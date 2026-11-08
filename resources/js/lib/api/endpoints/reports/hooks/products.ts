// lib/api/endpoints/reports/hooks/products.ts — React Query hooks (products).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug, useSelectedYearId } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { ReportBaseParams } from '../types/common';
import type { ForecastReportParams, ProductHistoryParams, ProductMovementParams, ProductsReportParams } from '../types/products';

export function useProductsReport(params?: Omit<ProductsReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'products', yearId, params],
    queryFn:   () => reportsApi.products({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useForecastReport(params?: Omit<ForecastReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'forecast', yearId, params],
    queryFn:   () => reportsApi.forecast({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useMarginReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'margin', yearId, params],
    queryFn:   () => reportsApi.margin({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useProductMovementReport(params?: Omit<ProductMovementParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'product-movement', yearId, params],
    queryFn:   () => reportsApi.productMovement({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useProductHistory(params?: ProductHistoryParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'product-history', params],
    queryFn:   () => reportsApi.productHistory(params),
    enabled:   !!slug && !!params?.product_id,
    staleTime: 30 * 1000,
  });
}
