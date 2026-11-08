// lib/api/endpoints/reports/api.ts — raw API functions for every report.
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import { apiGet } from '../../core/client';
import type { ReportBaseParams } from './types/common';
import type { DailyReportData, DailyReportParams, ReturnsReportData, ReturnsReportParams, SalesReportData, SalesReportParams, SalesTrendData, SalesTrendParams, VelocityReportData } from './types/sales';
import type { PurchasesReportData, PurchasesReportParams } from './types/purchases';
import type { AgingReportData, ClientMonthlyReportData, CustomersReportData, GrandLivreParams, GrandLivreReportData, PartyReportParams, SuppliersReportData } from './types/parties';
import type { ForecastReportData, ForecastReportParams, MarginReportData, ProductHistoryData, ProductHistoryParams, ProductMovementData, ProductMovementParams, ProductsReportData, ProductsReportParams } from './types/products';
import type { InventoryReportData, InventoryReportParams, StockMovementsData, StockMovementsParams } from './types/stock';
import type { CashFlowData, CashFlowParams, ExpensesReportData, ExpensesReportParams, MonthlyReportData, PaymentsReportData, PaymentsReportParams, ProfitLossData, ProfitLossParams, TaxesReportData, TaxesReportParams } from './types/finance';
import type { CreativeReportData, DashboardReportData } from './types/analytics';
import type { MatrixDetailParams, MatrixDetailRow, MatrixReportData, MatrixReportParams } from './types/matrix';

export const reportsApi = {
  sales:     (p?: SalesReportParams)     => apiGet<SalesReportData>    ('/reports/sales',     p),
  purchases: (p?: PurchasesReportParams) => apiGet<PurchasesReportData>('/reports/purchases', p),
  customers: (p?: PartyReportParams)     => apiGet<CustomersReportData>('/reports/customers', p),
  suppliers: (p?: PartyReportParams)     => apiGet<SuppliersReportData>('/reports/suppliers', p),
  products:  (p?: ProductsReportParams)  => apiGet<ProductsReportData> ('/reports/products',  p),
  forecast:  (p?: ForecastReportParams)  => apiGet<ForecastReportData>('/reports/forecast',   p),
  monthly:   (p?: ReportBaseParams)      => apiGet<MonthlyReportData>('/reports/monthly',    p),
  dashboard: (p?: ReportBaseParams)      => apiGet<DashboardReportData>('/reports/dashboard', p),
  inventory: (p?: InventoryReportParams) => apiGet<InventoryReportData>('/reports/inventory', p),
  payments:  (p?: PaymentsReportParams)  => apiGet<PaymentsReportData> ('/reports/payments',  p),
  taxes:     (p?: TaxesReportParams)     => apiGet<TaxesReportData>    ('/reports/taxes',     p),
  velocity:  (p?: ReportBaseParams)      => apiGet<VelocityReportData> ('/reports/velocity',  p),
  margin:    (p?: ReportBaseParams)      => apiGet<MarginReportData>   ('/reports/margin',    p),
  aging:     (p?: ReportBaseParams)      => apiGet<AgingReportData>    ('/reports/aging',     p),
  creative:  (p?: ReportBaseParams)      => apiGet<CreativeReportData> ('/reports/creative',  p),
  daily:     (p?: DailyReportParams)    => apiGet<DailyReportData>    ('/reports/daily',     p),
  productMovement: (p?: ProductMovementParams) => apiGet<ProductMovementData>('/reports/product-movement', p),
  profitLoss:(p?: ProfitLossParams)     => apiGet<ProfitLossData>     ('/reports/profit-loss', p),
  returns:    (p?: ReturnsReportParams)     => apiGet<ReturnsReportData>    ('/reports/returns',         p),
  cashFlow:   (p?: CashFlowParams)          => apiGet<CashFlowData>         ('/reports/cash-flow',       p),
  expenses:   (p?: ExpensesReportParams)    => apiGet<ExpensesReportData>   ('/reports/expenses',        p),
  salesTrend: (p?: SalesTrendParams)        => apiGet<SalesTrendData>       ('/reports/sales-trend',     p),
  stockMovements: (p?: StockMovementsParams) => apiGet<StockMovementsData>  ('/reports/stock-movements',  p),
  salesMatrix:     (p?: MatrixReportParams)   => apiGet<MatrixReportData>   ('/reports/sales-matrix',     p),
  purchasesMatrix: (p?: MatrixReportParams)   => apiGet<MatrixReportData>   ('/reports/purchases-matrix', p),
  matrixDetail:    (p: MatrixDetailParams)    => apiGet<MatrixDetailRow[]>  ('/reports/matrix-detail',    p),
  clientMonthly:   (p?: ReportBaseParams)     => apiGet<ClientMonthlyReportData>('/reports/client-monthly', p),
  grandLivre:      (p?: GrandLivreParams)     => apiGet<GrandLivreReportData>   ('/reports/grand-livre',    p),
  productHistory:  (p?: ProductHistoryParams) => apiGet<ProductHistoryData>     ('/reports/product-history', p),
} as const;
