// ════════════════════════════════════════════════════════════════════════════
// lib/admin.ts
//
// ⚠️  هذا الملف re-export + backward-compat فقط.
//    المنطق الفعلي: lib/api/admin/*
//    الصفحات الجديدة تستورد من '@/lib/api/admin' مباشرة.
// ════════════════════════════════════════════════════════════════════════════

import { apiGet }          from './api/core/client';
import {
  companiesApi,
  usersApi,
  impersonateApi,
  approvalApi,
  dashboardApi,
  plansApi,
  settingsApi,
  maintenanceApi,
  systemBootApi,
  activityApi,
  dbApi,
} from './api/admin';

// ─── Named re-exports ────────────────────────────────────────────────────────
export {
  companiesApi,
  usersApi,
  impersonateApi,
  approvalApi,
  dashboardApi,
  plansApi,
  settingsApi,
  maintenanceApi,
  systemBootApi,
  activityApi,
  dbApi,
};

// ─── adminApi — wrapper بدون تكرار كود ───────────────────────────────────────
export const adminApi = {
  // Dashboard
  getDashboard:      dashboardApi.get,

  // Companies
  getCompanies:      companiesApi.list,
  getCompany:        companiesApi.show,
  createCompany:     companiesApi.create,
  updateCompany:     (id: number, d: Parameters<typeof companiesApi.update>[1]) => companiesApi.update(id, d),
  deleteCompany:     companiesApi.remove,
  suspendCompany:    companiesApi.suspend,
  unsuspendCompany:  companiesApi.unsuspend,
  activateCompany:   companiesApi.activate,
  deactivateCompany: companiesApi.deactivate,
  verifyCompany:     companiesApi.verify,
  unverifyCompany:   companiesApi.unverify,
  changePlan:        (id: number, d: Parameters<typeof companiesApi.changePlan>[1]) => companiesApi.changePlan(id, d),
  updateNotes:       companiesApi.updateNotes,
  getCompanyUsers:   companiesApi.listUsers,
  addCompanyUser:    companiesApi.addUser,
  removeCompanyUser: companiesApi.removeUser,
  toggleCompanyUser: companiesApi.toggleUser,
  seedCompany:       companiesApi.seed,

  // Bulk actions
  bulkSuspendCompanies:   companiesApi.bulkSuspend,
  bulkUnsuspendCompanies: companiesApi.bulkUnsuspend,
  bulkVerifyCompanies:    companiesApi.bulkVerify,
  bulkActivateCompanies:  companiesApi.bulkActivate,
  bulkDeactivateCompanies: companiesApi.bulkDeactivate,
  exportCompanies:        companiesApi.export,

  // Users
  getUsers:         usersApi.list,
  getUser:          usersApi.show,
  createUser:       usersApi.create,
  updateUser:       (id: number, d: Parameters<typeof usersApi.update>[1]) => usersApi.update(id, d),
  deleteUser:       usersApi.remove,
  resetPassword:    usersApi.resetPassword,
  toggleActive:     usersApi.toggleActive,
  toggleApproval:   usersApi.toggleApproval,
  getUserCompanies: usersApi.companies,

  // Impersonate
  impersonate:     impersonateApi.start,
  stopImpersonate: impersonateApi.stop,

  // Approvals
  getPendingUsers: approvalApi.pending,
  approveUser:     approvalApi.approve,
  rejectUser:      approvalApi.reject,
  bulkApproveUsers: approvalApi.bulkApprove,
  bulkRejectUsers:  approvalApi.bulkReject,

  // Plans
  getPlans: plansApi.list,
  getPlan:  plansApi.show,

  // Activity
  getActivity:    activityApi.list,
  getActivityLog: activityApi.show,

  // System
  getSystemStatus:  systemBootApi.status,
  bootSystem:       systemBootApi.boot,
  bootWilayas:      systemBootApi.bootWilayas,
  bootPermissions:  systemBootApi.bootPerms,

  // Settings
  getSettings:    settingsApi.get,
  updateSettings: settingsApi.update,

  // Maintenance
  getMaintenance:     maintenanceApi.status,
  enableMaintenance:  maintenanceApi.enable,
  disableMaintenance: maintenanceApi.disable,
  clearCache:         maintenanceApi.cache,

  // Database
  getDbStatus:  dbApi.status,
  switchDb:     dbApi.switchTo,

  // Reports
  getReports: (period: '7d' | '30d' | '90d') =>
    apiGet<{
      users:     { date: string; value: number }[];
      companies: { date: string; value: number }[];
      revenue:   { date: string; value: number }[];
    }>('/admin/reports', { period } as Record<string, unknown>),

} as const;

export default adminApi;
export type { Paginated, AdminCompaniesFilter, AdminUsersFilter } from '@/types/admin';
