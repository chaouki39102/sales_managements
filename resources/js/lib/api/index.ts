// ════════════════════════════════════════════════════════════════════════════
// lib/api/index.ts — تصدير كامل لطبقة الـ API
// ════════════════════════════════════════════════════════════════════════════

// Core
export * from './core/client';
export * from './core/queryClient';
export * from './core/queryKeys';
export type * from './core/types';

// Store
export * from '../store/appStore';

// Endpoints (جميعها بأحرف صغيرة)
export * from './endpoints/auth';
export * from './endpoints/companies';
export * from './endpoints/fiscalYears';
export * from './endpoints/lookups';
export * from './endpoints/seeds';
export * from './endpoints/documents';      // ✅
export * from './endpoints/parties';         // ✅
export * from './endpoints/products';        // ✅
export * from './endpoints/payments';        // ✅
export * from './endpoints/expenses';        // ✅
export * from './endpoints/inventory';       // ✅
export * from './endpoints/users';           // ✅
export * from './endpoints/settings';        // ✅
export * from './endpoints/dashboard';       // ✅
export * from './endpoints/reports';         // ✅

