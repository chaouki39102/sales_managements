// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/reports.ts
// ✅ أُضيفت types مُعرَّفة بدل any — مبنية على DB schema الموجود في types.ts
// ════════════════════════════════════════════════════════════════════════════
// Barrel: implementation lives in ./reports/ (types/, api.ts, hooks/).
// Every name previously exported from this file is re-exported unchanged.

export * from './reports/types/common';
export * from './reports/types/sales';
export * from './reports/types/purchases';
export * from './reports/types/parties';
export * from './reports/types/products';
export * from './reports/types/stock';
export * from './reports/types/finance';
export * from './reports/types/analytics';
export * from './reports/types/matrix';

export { reportsApi } from './reports/api';

export * from './reports/hooks/sales';
export * from './reports/hooks/purchases';
export * from './reports/hooks/parties';
export * from './reports/hooks/products';
export * from './reports/hooks/stock';
export * from './reports/hooks/finance';
export * from './reports/hooks/analytics';
export * from './reports/hooks/matrix';
