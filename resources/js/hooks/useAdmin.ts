// ════════════════════════════════════════════════════════════════════════════
// hooks/useAdmin.ts
//
// نقطة إعادة تصدير مركزية للـ admin hooks.
// الصفحات التي تستورد من '@/hooks/useAdmin' ستجد كل شيء هنا.
// ════════════════════════════════════════════════════════════════════════════

// ─── System (Dashboard, Plans, Settings, Maintenance) ────────────────────────
export {
  useAdminDashboard,
  useAdminPlans,
  useSystemSettings,
  useMaintenanceMutations,
} from './admin/useAdminSystem';

// ─── Companies ────────────────────────────────────────────────────────────────
export {
  useAdminCompanies,
  useAdminCompany,
  useCompanyMutations,
  useCompanyMemberMutations,
} from './admin/useAdminCompanies';

// ─── Users ────────────────────────────────────────────────────────────────────
export {
  useAdminUsers,
  useAdminUserCompanies,
  useUserMutations,
} from './admin/useAdminUsers';

// ─── Types (re-export للصفحات التي تستورد types من هنا) ──────────────────────
export type { AdminDashboardStats } from '@/types/admin';
