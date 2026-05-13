// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/reports.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId } from '../../store/appStore';

export const reportsApi = {
  sales:     (params?: Record<string, unknown>) => apiGet<any>('/reports/sales', params),
  purchases: (params?: Record<string, unknown>) => apiGet<any>('/reports/purchases', params),
  inventory: (params?: Record<string, unknown>) => apiGet<any>('/reports/inventory', params),
  payments:  (params?: Record<string, unknown>) => apiGet<any>('/reports/payments', params),
  taxes:     (params?: Record<string, unknown>) => apiGet<any>('/reports/taxes', params),
  customers: (params?: Record<string, unknown>) => apiGet<any>('/reports/customers', params),
  suppliers: (params?: Record<string, unknown>) => apiGet<any>('/reports/suppliers', params),
} as const;

export function useSalesReport(params?: Record<string, unknown>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: [slug, 'reports', 'sales', yearId, params],
    queryFn:  () => reportsApi.sales({ year_id: yearId, ...params }),
    enabled:  !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useTvaReport() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: tenantKeys.reports.tva(slug ?? '', yearId ?? 0),
    queryFn:  () => reportsApi.taxes({ year_id: yearId }),
    enabled:  !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useDebtsReport() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: tenantKeys.reports.debts(slug ?? ''),
    queryFn:  () => reportsApi.customers(),
    enabled:  !!slug,
    staleTime: 3 * 60_000,
  });
}
