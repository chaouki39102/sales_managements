// hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/endpoints/dashboard';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useAuth } from '@/context/AuthContext';

function useSlug() { return useAuth().activeCompany?.slug ?? ''; }

export function useDashboardStats() {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.stats(slug),        queryFn: dashboardApi.getStats,          enabled: !!slug, staleTime: 60_000 });
}

export function useSalesChart(period = 'monthly') {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.chart(slug, period), queryFn: () => dashboardApi.getSalesChart(period), enabled: !!slug });
}

export function useTopProducts(limit = 5) {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.topProducts(slug),  queryFn: () => dashboardApi.getTopProducts(limit), enabled: !!slug });
}

export function useRecentInvoices() {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.recent(slug),       queryFn: dashboardApi.getRecentInvoices,  enabled: !!slug });
}

export function useInventoryAlerts() {
  const slug = useSlug();
  return useQuery({ queryKey: tenantKeys.dashboard.inventory(slug),    queryFn: dashboardApi.getInventoryAlerts, enabled: !!slug });
}
