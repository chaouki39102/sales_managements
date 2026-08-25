// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/dashboard.ts
// Types match DashboardService.php backend shapes.
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId } from '../../store/appStore';
import type { DashboardStats } from '../core/types';

// ── Backend response shapes ──────────────────────────────────────────────────
export interface SalesChartPoint {
  month?: number;
  date?:  string;
  label:  string;
  total:  number;
}

export interface TopProductRow {
  product_id:   number;
  product_name: string | null;
  total_quantity: number;
  total_amount: number;
}

export interface TopCustomerRow {
  party_id:   number;
  party_name: string | null;
  total_amount: number;
}

export interface RecentTransaction {
  id:              number;
  document_number: string;
  document_type:   string | null;
  party_name:      string | null;
  total:           number;
  status:          string | null;
  date:            string | null;
}

export interface InventorySummary {
  total_products:    number;
  low_stock_count:   number;
  stock_in_this_month:  number;
  stock_out_this_month: number;
}

export interface TopDebtorRow {
  party_id:         number;
  party_name:       string | null;
  total_remaining:  number;
  invoice_count:    number;
}

export interface TopProfitableRow {
  product_id:     number;
  product_name:   string | null;
  total_profit:   number;
  total_revenue:  number;
  total_qty:      number;
  avg_cost:       number;
  margin_pct:     number;
}

// ── API object ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats:              (yearId: number)    => apiGet<DashboardStats>('/dashboard', { year_id: yearId }),
  salesChart:         (period = 'month')  => apiGet<SalesChartPoint[]>('/dashboard/sales-chart', { period }),
  topProducts:        (limit = 5)         => apiGet<TopProductRow[]>('/dashboard/top-products', { limit }),
  topCustomers:       (limit = 5)         => apiGet<TopCustomerRow[]>('/dashboard/top-customers', { limit }),
  recentTransactions: (limit = 10)        => apiGet<RecentTransaction[]>('/dashboard/recent-transactions', { limit }),
  inventory:          ()                  => apiGet<InventorySummary>('/dashboard/inventory'),
  topDebtors:         (limit = 5)         => apiGet<TopDebtorRow[]>('/dashboard/top-debtors', { limit }),
  topProfitable:      (limit = 6)         => apiGet<TopProfitableRow[]>('/dashboard/top-profitable', { limit }),
} as const;

// ── Hooks ────────────────────────────────────────────────────────────────────
export function useDashboardStats() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();

  return useQuery({
    queryKey: tenantKeys.dashboard.stats(slug ?? '', yearId ?? 0),
    queryFn:  () => dashboardApi.stats(yearId!),
    enabled:  !!slug && !!yearId,
    staleTime: 30_000,
  });
}

export function useSalesChart(period = 'month') {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: [slug, 'dashboard', 'chart', period, yearId],
    queryFn:  () => dashboardApi.salesChart(period),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useTopProducts(limit = 5) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: [slug, 'dashboard', 'top-products', limit, yearId],
    queryFn:  () => dashboardApi.topProducts(limit),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useTopCustomers(limit = 5) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: [slug, 'dashboard', 'top-customers', limit, yearId],
    queryFn:  () => dashboardApi.topCustomers(limit),
    enabled:  !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useRecentTransactions(limit = 10) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey: [slug, 'dashboard', 'recent-transactions', limit, yearId],
    queryFn:  () => dashboardApi.recentTransactions(limit),
    enabled:  !!slug,
    staleTime: 60_000,
  });
}

export function useDashboardInventory() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'inventory'],
    queryFn:  dashboardApi.inventory,
    enabled:  !!slug,
    staleTime: 2 * 60_000,
  });
}

export function useTopDebtors(limit = 5) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'top-debtors', limit],
    queryFn:  () => dashboardApi.topDebtors(limit),
    enabled:  !!slug,
    staleTime: 60_000,
  });
}

export function useTopProfitable(limit = 6) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: [slug, 'dashboard', 'top-profitable', limit],
    queryFn:  () => dashboardApi.topProfitable(limit),
    enabled:  !!slug,
    staleTime: 60_000,
  });
}
