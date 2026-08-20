// lib/api/admin/system.ts
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';
import type {
  AdminDashboardStats,
  AdminPlan,
  ActivityLog,
  Paginated,
  SystemSettings,
} from '@/types/admin';

export const dashboardApi = {
  get: () => apiGet<AdminDashboardStats>('/admin/dashboard'),
} as const;

export const plansApi = {
  list: () => apiGet<AdminPlan[]>('/admin/plans'),
  show: (id: number) => apiGet<AdminPlan>(`/admin/plans/${id}`),
  create: (data: Partial<AdminPlan>) => apiPost<AdminPlan>('/admin/plans', data),
  update: (id: number, data: Partial<AdminPlan>) => apiPut<AdminPlan>(`/admin/plans/${id}`, data),
  remove: (id: number) => apiDelete(`/admin/plans/${id}`),
} as const;

export const settingsApi = {
  get:    ()                             => apiGet<SystemSettings>('/admin/system/settings'),
  update: (d: Partial<SystemSettings>)  => apiPut<SystemSettings>('/admin/system/settings', d),
} as const;

export interface DbStatus {
  current_driver: string;
  connected: boolean;
  server?: string;
  host?: string;
  database?: string;
  path?: string;
  writable?: boolean;
  size?: string;
  error?: string;
  pending_migrations: number;
}

export interface DbSwitchResult {
  message: string;
  driver: string;
  reachable: boolean;
  migrated: boolean;
  migration_error?: string;
}

export const dbApi = {
  status:  ()               => apiGet<DbStatus>('/admin/system/db-status'),
  switchTo: (driver: string) => apiPost<DbSwitchResult>('/admin/system/switch-db', { driver }),
} as const;

export const maintenanceApi = {
  status:    ()              => apiGet<{ maintenance_mode: boolean; message?: string }>('/admin/system/maintenance'),
  enable:    (msg?: string)  => apiPost('/admin/system/maintenance/enable',   { message: msg }),
  disable:   ()              => apiPost('/admin/system/maintenance/disable'),
  cache:     ()              => apiPost('/admin/system/maintenance/cache-clear'),
  scheduler: ()              => apiPost<{ message: string }>('/admin/system/maintenance/scheduler'),
  backup:    ()              => apiPost<{ message: string; path?: string }>('/admin/system/maintenance/backup'),
} as const;

export const systemBootApi = {
  status:      () => apiGet<{ is_ready: boolean; components: any[] }>('/admin/system/status'),
  boot:        () => apiPost('/admin/system/boot'),
  bootWilayas: () => apiPost('/admin/system/boot/wilayas'),
  bootPerms:   () => apiPost('/admin/system/boot/permissions'),
} as const;

export const activityApi = {
  list: (p?: {
    search?:    string;
    event?:     string;
    date_from?: string;
    date_to?:   string;
    page?:      number;
    per_page?:  number;
  }) => apiGet<Paginated<ActivityLog>>('/admin/activity-log', p as any),
  show: (id: number) => apiGet<ActivityLog>(`/admin/activity-log/${id}`),
} as const;
