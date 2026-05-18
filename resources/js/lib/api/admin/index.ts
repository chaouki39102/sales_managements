// lib/api/admin/index.ts
export { apiGetPaginated }                                         from './client';
export { companiesApi }                                            from './companies';
export { usersApi, impersonateApi }                                from './users';
export { dashboardApi, plansApi, settingsApi, maintenanceApi, systemBootApi, activityApi } from './system';
