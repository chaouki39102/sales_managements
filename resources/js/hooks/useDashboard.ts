// ════════════════════════════════════════════════
// hooks/useDashboard.ts
// ════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

export const DASHBOARD_KEYS = {
  stats:      ['dashboard', 'stats'],
  chart:      (period: string) => ['dashboard', 'chart', period],
  topProducts:['dashboard', 'top-products'],
  invoices:   ['dashboard', 'recent-invoices'],
  inventory:  ['dashboard', 'inventory'],
};

export function useDashboardStats() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.stats,
    queryFn:  () => dashboardApi.getStats().then(r => r.data),
    staleTime: 60_000, // 1 min
  });
}

export function useSalesChart(period = 'monthly') {
  return useQuery({
    queryKey: DASHBOARD_KEYS.chart(period),
    queryFn:  () => dashboardApi.getSalesChart(period).then(r => r.data),
  });
}

export function useTopProducts(limit = 5) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.topProducts,
    queryFn:  () => dashboardApi.getTopProducts(limit).then(r => r.data),
  });
}

export function useRecentInvoices() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.invoices,
    queryFn:  () => dashboardApi.getRecentInvoices().then(r => r.data),
  });
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.inventory,
    queryFn:  () => dashboardApi.getInventoryAlerts().then(r => r.data),
  });
}
