// ════════════════════════════════════════════════
// lib/api/dashboard.ts
// ════════════════════════════════════════════════
import client from './client';
import type { DashboardStats, SalesChartData, TopProduct, CommercialDocument } from '@/types';

export const dashboardApi = {
  getStats:            ()                      => client.get<DashboardStats>('/dashboard'),
  getSalesChart:       (period?: string)       => client.get<SalesChartData>('/dashboard/sales-chart', { params: { period } }),
  getTopProducts:      (limit = 5)             => client.get<TopProduct[]>('/dashboard/top-products', { params: { limit } }),
  getTopCustomers:     (limit = 5)             => client.get<unknown[]>('/dashboard/top-customers', { params: { limit } }),
  getRecentInvoices:   ()                      => client.get<CommercialDocument[]>('/dashboard/recent-transactions'),
  getInventoryAlerts:  ()                      => client.get<unknown>('/dashboard/inventory'),
};
