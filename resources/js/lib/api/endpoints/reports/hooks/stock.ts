// lib/api/endpoints/reports/hooks/stock.ts — React Query hooks (stock).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { useQuery } from '@tanstack/react-query';
import { useActiveSlug } from '../../../../store/appStore';
import { reportsApi } from '../api';
import type { InventoryReportParams, StockMovementsParams } from '../types/stock';

export function useInventoryReport(params?: InventoryReportParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'inventory', params],
    queryFn:   () => reportsApi.inventory(params),
    enabled:   !!slug,
    staleTime: 3 * 60_000,
  });
}

export function useStockMovementsReport(params?: StockMovementsParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'stock-movements', params],
    queryFn:   () => reportsApi.stockMovements(params),
    enabled:   !!slug,
    staleTime: 3 * 60_000,
  });
}
