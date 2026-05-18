// hooks/useAdmin.ts — re-export مركزي
// الصفحات التي تستورد من '@/hooks/useAdmin' تجد كل شيء هنا
export * from './admin/useAdminSystem';
export * from './admin/useAdminCompanies';
export * from './admin/useAdminUsers';
export type { AdminDashboardStats } from '@/types/admin';
