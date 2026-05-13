// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/dashboard.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId } from '../../store/appStore';
import type { DashboardStats } from '../core/types';

interface SalesChartData { labels: string[]; sales: number[]; purchases: number[]; }
interface TopProduct     { id: number; name: string; quantity: number; revenue: number; }
interface TopCustomer    { id: number; name: string; total: number; count: number; }

export const dashboardApi = {
  stats:           (yearId: number) => apiGet<DashboardStats>('/dashboard', { year_id: yearId }),
  salesChart:      (period = 'monthly') => apiGet<SalesChartData>('/dashboard/sales-chart', { period }),
  topProducts:     (limit = 5)          => apiGet<TopProduct[]>('/dashboard/top-products', { limit }),
  topCustomers:    (limit = 5)          => apiGet<TopCustomer[]>('/dashboard/top-customers', { limit }),
  recentTransactions: ()                => apiGet<any[]>('/dashboard/recent-transactions'),
  inventory:       ()                   => apiGet<any>('/dashboard/inventory'),
} as const;

export function useDashboardStats() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();

  return useQuery({
    queryKey: tenantKeys.dashboard.stats(slug ?? '', yearId ?? 0),
    queryFn:  () => dashboardApi.stats(yearId!),
    enabled:  !!slug && !!yearId,
    staleTime: 2 * 60_000,
  });
}

export function useSalesChart(period = 'monthly') {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'chart', period],
    queryFn:  () => dashboardApi.salesChart(period),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useTopProducts(limit = 5) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'top-products', limit],
    queryFn:  () => dashboardApi.topProducts(limit),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useRecentTransactions() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'recent-transactions'],
    queryFn:  dashboardApi.recentTransactions,
    enabled:  !!slug,
    staleTime: 60_000,
  });
}
