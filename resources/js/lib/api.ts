// ════════════════════════════════════════════════
// lib/api.ts — تصدير مركزي
// ════════════════════════════════════════════════

export { dashboardApi }                               from './api/dashboard';
export { productsApi, variantsApi }                   from './api/products';
export { invoicesApi, partiesApi, lookupsApi }        from './api/index';
export { default as apiClient }                       from './api/client';
export { setAuthToken, clearAuthToken, getAuthToken } from './api/client';

// للتوافق مع الكود القديم الذي يستخدم setToken / clearToken
export { setAuthToken as setToken, clearAuthToken as clearToken } from './api/client';

// default export للتوافق مع أي كود يستخدم: import api from '@/lib/api'
export { default } from './api/client';
