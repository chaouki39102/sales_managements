// lib/api/admin/index.ts
export { companiesApi }                                            from './companies';
export { usersApi, impersonateApi, approvalApi }                                from './users';
export type { PendingUser }                                                    from './users';
export { dashboardApi, plansApi, settingsApi, maintenanceApi, systemBootApi, activityApi, dbApi } from './system';
export type { DbStatus } from './system';
