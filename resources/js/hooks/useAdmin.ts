// ════════════════════════════════════════════════════════════════════════════
// hooks/useAdmin.ts
// Admin hooks — إحصائيات لوحة تحكم السوبر أدمن
// ════════════════════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  companies: {
    total:     number;
    active:    number;
    suspended: number;
    new_month: number;
  };
  users: {
    total:    number;
    active:   number;
    new_month: number;
  };
  revenue?: {
    total_month: number;
    currency:    string;
  };
}

// ─── Query key ────────────────────────────────────────────────────────────────

const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery<AdminDashboardStats>({
    queryKey: adminKeys.dashboard,
    queryFn:  () => apiGet<AdminDashboardStats>('/admin/dashboard'),
    staleTime: 2 * 60_000,   // تحديث كل دقيقتين
    retry: false,
  });
}
