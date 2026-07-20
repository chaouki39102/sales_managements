// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/reports.ts
// ✅ أُضيفت types مُعرَّفة بدل any — مبنية على DB schema الموجود في types.ts
// ════════════════════════════════════════════════════════════════════════════

import { useQuery }                          from '@tanstack/react-query';
import { apiGet }                            from '../core/client';
import { tenantKeys }                        from '../core/queryKeys';
import { useActiveSlug, useSelectedYearId }  from '../../store/appStore';
import type {
  Party, Product, ProductVariant,
  CommercialDocument,
} from '../core/types';

// ─── Report Params ────────────────────────────────────────────────────────────

export interface ReportBaseParams {
  year_id?:   number;
  from_date?: string;   // YYYY-MM-DD
  to_date?:   string;
  page?:      number;
  per_page?:  number;
}

export interface SalesReportParams extends ReportBaseParams {
  party_id?:      number;
  document_type?: string;   // FV, BL, ...
  status?:        string;
}

export interface PurchasesReportParams extends ReportBaseParams {
  party_id?:      number;
  document_type?: string;   // FA, BR, ...
  status?:        string;
}

export interface PartyReportParams extends ReportBaseParams {
  party_id?:    number;
  with_balance?: boolean;
}

export interface ProductsReportParams extends ReportBaseParams {
  family_id?:  number;
  brand_id?:   number;
  warehouse_id?: number;
}

export interface InventoryReportParams extends ReportBaseParams {
  warehouse_id?:  number;
  family_id?:     number;
  low_stock?:     boolean;
  out_of_stock?:  boolean;
}

export interface PaymentsReportParams extends ReportBaseParams {
  payment_mode_id?:    number;
  treasury_account_id?: number;
  status?:             string;
}

export interface TaxesReportParams extends ReportBaseParams {
  tva_rate?: number;
}

// ─── Report Response Types ────────────────────────────────────────────────────

export interface SalesReportDocument {
  id:                number;
  document_number:   string;
  date:              string;
  party_name:        string;
  total_ht:          number;
  total_tva:         number;
  total_ttc:         number;
  total_discount:    number;
  paid_amount:       number;
  remaining_amount:  number;
  doc_cost_ht:       number;
  margin_value:      number;
  status:            string;
}

export interface SalesProductRecapItem {
  product_id:     number;
  product_name:   string;
  product_ref:    string;
  total_qty:      number;
  total_ht:       number;
  total_cost:     number;
  total_ttc:      number;
  total_tva:      number;
  total_discount: number;
  margin_value:   number;
  margin_pct:     number;
}

export interface SalesReportData {
  summary: {
    total_ht:          number;
    total_tva:         number;
    total_ttc:         number;
    total_discount:    number;
    total_cost:        number;
    total_margin:      number;
    margin_pct:        number;
    total_paid:        number;
    total_remaining:   number;
    count:             number;
    unpaid_count:      number;
  };
  product_recap: SalesProductRecapItem[];
  documents: SalesReportDocument[];
}

export interface PurchasesReportDocument {
  id:               number;
  document_number:  string;
  date:             string;
  party_name:       string;
  total_ht:         number;
  total_tva:        number;
  total_ttc:        number;
  total_discount:   number;
  paid_amount:      number;
  remaining_amount: number;
  status:           string;
}

export interface PurchasesProductRecapItem {
  product_id:     number;
  product_name:   string;
  product_ref:    string;
  total_qty:      number;
  total_ht:       number;
  total_ttc:      number;
  total_discount: number;
}

export interface PurchasesReportData {
  summary: {
    total_ht:          number;
    total_tva:         number;
    total_ttc:         number;
    total_discount:    number;
    total_paid:        number;
    total_remaining:   number;
    count:             number;
    unpaid_count:      number;
  };
  product_recap: PurchasesProductRecapItem[];
  documents: PurchasesReportDocument[];
}

export interface CustomersReportRow {
  id:               number;
  code:             string;
  name:             string;
  activity:         string | null;
  phone:            string | null;
  email:            string | null;
  wilaya:           string | null;
  created_at:       string;
  doc_count:        number;
  total_ht:         number;
  total_ttc:        number;
  total_paid:       number;
  total_remaining:  number;
}

export interface CustomersReportData {
  summary: {
    total_customers:  number;
    total_ht:         number;
    total_ttc:        number;
    total_discount:   number;
    total_remaining:  number;
  };
  customers: CustomersReportRow[];
  product_recap: Array<{
    product_id:     number;
    product_name:   string;
    product_ref:    string;
    total_qty:      number;
    total_ht:       number;
    total_ttc:      number;
    total_discount: number;
  }>;
}

export interface SuppliersReportRow {
  id:               number;
  code:             string;
  name:             string;
  activity:         string | null;
  phone:            string | null;
  email:            string | null;
  wilaya:           string | null;
  nif:              string | null;
  nis:              string | null;
  ai:               string | null;
  created_at:       string;
  doc_count:        number;
  total_ht:         number;
  total_ttc:        number;
  total_paid:       number;
  total_remaining:  number;
}

export interface SuppliersReportData {
  summary: {
    total_suppliers:  number;
    total_ht:         number;
    total_ttc:        number;
    total_remaining:  number;
  };
  suppliers: SuppliersReportRow[];
}

export interface PaymentsReportData {
  summary: {
    total_amount: number;
    count:        number;
  };
  by_mode: Array<{
    mode:   string;
    count:  number;
    total:  number;
  }>;
  payments: Array<{
    id:               number;
    payment_date:     string;
    amount:           number;
    document_number?: string;
    document_type?:   string;
    party_name?:      string;
    payment_mode?:    string;
    treasury_account?: string;
    reference?:       string;
    notes?:           string;
    status:           string;
  }>;
}

export interface TaxesReportSummary {
  tva_collected:   number;
  tva_deductible:  number;
  tva_balance:     number;
}

export interface TaxesReportSide {
  total_ht:     number;
  total_tva:    number;
  total_stamp:  number;
  total_ttc:    number;
  count:        number;
}

export interface TaxesReportData {
  sales:     TaxesReportSide;
  purchases: TaxesReportSide;
  summary:   TaxesReportSummary;
}

export interface ProductsReportRow {
  id:                  number;
  ref:                 string;
  name:                string;
  family:              string | null;
  brand:               string | null;
  unit:                string | null;
  purchase_price_ht:   number;
  current_cost_price:  number;
  tva_rate:            number | null;
  stock_quantity:      number;
  min_stock_alert:     number;
  stock_value:         number;
  total_sold:          number;
  sales_ht:            number;
  sales_cost:          number;
  margin_value:        number;
  margin_pct:          number;
}

export interface ProductsReportData {
  summary: {
    total_products:     number;
    total_stock_value:  number;
    total_sold:         number;
    total_sales_ht:     number;
  };
  products: ProductsReportRow[];
}

export interface InventoryReportRow {
  id:                  number;
  ref:                 string;
  name:                string;
  family:              string | null;
  brand:               string | null;
  stock_quantity:      number;
  min_stock_alert:     number;
  purchase_price_ht:   number;
  current_cost_price:  number;
  stock_value:         number;
  status:              string;
}

export interface InventoryReportData {
  summary: {
    total_products:    number;
    total_quantity:    number;
    total_value:       number;
    low_stock_count:   number;
    out_of_stock_count: number;
  };
  products: InventoryReportRow[];
}

// ─── Velocity Report (سرعة البيع) ──────────────────────────────────────────────

export interface VelocityReportRow {
  product_id:   number;
  product_name: string;
  product_ref:  string;
  total_qty:    number;
  doc_count:    number;
  avg_price:    number;
  velocity:     number;
  days:         number;
}

export interface VelocityReportData {
  summary: {
    total_qty:   number;
    total_docs:  number;
    period_days: number;
  };
  items: VelocityReportRow[];
}

// ─── Margin Report (تقرير الهوامش) ──────────────────────────────────────────────

export interface MarginReportRow {
  product_id:    number;
  product_name:  string;
  product_ref:   string;
  total_qty:     number;
  total_ht:      number;
  cost_price:    number;
  cost_total:    number;
  margin_amount: number;
  margin_pct:    number;
}

export interface MarginReportData {
  summary: {
    total_ht:     number;
    total_cost:   number;
    total_margin: number;
    margin_pct:   number;
  };
  items: MarginReportRow[];
}

// ─── Aging Report (لوحة الديون) ─────────────────────────────────────────────

export interface AgingBucket {
  label: string;
  total: number;
  count: number;
}

export interface AgingReportRow {
  party_id:      number;
  party_name:    string;
  total_due:     number;
  invoice_count: number;
  max_days:      number;
  bucket:        string;
}

export interface AgingReportData {
  summary: {
    total_due:   number;
    total_count: number;
    as_of_date:  string;
  };
  rows:    AgingReportRow[];
  buckets: AgingBucket[];
}

// ─── Creative Report (التقرير الشامل) ──────────────────────────────────────

export interface CreativeReportOverview {
  total_sales_ht:       number;
  total_sales_ttc:      number;
  total_sales_cost:     number;
  total_sales_margin:   number;
  sales_margin_pct:     number;
  total_purchases_ht:   number;
  total_purchases_ttc:  number;
  total_payments:       number;
  total_receivable:     number;
  total_payable:        number;
  sales_count:          number;
  purchases_count:      number;
  unpaid_sales_count:   number;
}

export interface CreativeTopProduct {
  product_name:  string;
  product_ref:   string;
  total_qty:     number;
  total_ht:      number;
  total_cost:    number;
  margin_value:  number;
  margin_pct:    number;
}

export interface CreativeTopCustomer {
  party_name: string;
  total_ttc:  number;
  doc_count:  number;
}

export interface CreativeReportData {
  overview:       CreativeReportOverview;
  top_products:   CreativeTopProduct[];
  top_customers:  CreativeTopCustomer[];
  cash_flow: {
    collected:       number;
    outstanding:     number;
    collection_rate: number;
  };
}

// ─── Daily Report ─────────────────────────────────────────────────────────────

export interface DailyReportParams {
  date?: string;   // YYYY-MM-DD
}

export interface DailyDoc {
  id:               number;
  document_number:  string;
  document_type:    string;
  document_type_name: string;
  party_name:       string | null;
  total_ht:         number;
  total_tva:        number;
  total_ttc:        number;
  payment_status:   string;
}

export interface DailyReportData {
  date:      string;
  documents: DailyDoc[];
  summary: {
    total_docs:        number;
    sales_count:       number;
    purchases_count:   number;
    sales_ht:          number;
    sales_ttc:         number;
    purchases_ht:      number;
    purchases_ttc:     number;
    payments_received: number;
    payment_count:     number;
  };
}

// ─── Product Movement Report ──────────────────────────────────────────────────

export interface ProductMovementParams {
  product_id?: number;
  from_date?:  string;
  to_date?:    string;
}

export interface ProductMovementItem {
  product_id:    number;
  product_name:  string;
  product_ref:   string;
  sales_qty:     number;
  sales_ht:      number;
  purchase_qty:  number;
  purchase_ht:   number;
  net_qty:       number;
}

export interface ProductMovementData {
  items:   ProductMovementItem[];
  summary: {
    total_products:     number;
    total_sales_qty:    number;
    total_sales_ht:     number;
    total_purchase_qty: number;
    total_purchase_ht:  number;
  };
}

// ─── Profit & Loss Report ─────────────────────────────────────────────────────

export interface ProfitLossParams {
  year_id?: number;
}

export interface ProfitLossData {
  revenue: {
    sales_ht:         number;
    sales_tva:        number;
    sales_ttc:        number;
    sales_cost:       number;
    gross_margin:     number;
    gross_margin_pct: number;
  };
  purchases: {
    purchase_ht:  number;
    purchase_tva: number;
  };
  expenses: {
    total_expenses: number;
    by_category:    { category_name: string | null; total: number }[];
  };
  result: {
    gross_margin: number;
    net_result:   number;
  };
}

// ─── Returns Report ───────────────────────────────────────────────────────────

export interface ReturnsReportParams extends ReportBaseParams {}

export interface ReturnsReportData {
  documents: Array<{
    id: number; document_number: string; document_type: string;
    date: string; party_name: string | null;
    total_ht: number; total_ttc: number; reason: string | null;
  }>;
  product_recap: Array<{
    product_id: number; product_name: string; product_ref: string;
    total_qty: number; total_ht: number; total_ttc: number;
  }>;
  summary: {
    total_returns: number; sale_returns: number; purchase_returns: number;
    total_ht: number; total_ttc: number;
    sale_returns_ht: number; purchase_returns_ht: number;
  };
}

// ─── Cash Flow Report ─────────────────────────────────────────────────────────

export interface CashFlowParams extends ReportBaseParams {}

export interface CashFlowData {
  daily: Array<{ date: string; count: number; amount: number }>;
  monthly: Array<{ month: string; count: number; amount: number }>;
  by_mode: Array<{ mode: string; count: number; total: number }>;
  summary: {
    total_amount: number; count: number;
    avg_amount: number; days_with_movements: number;
  };
}

// ─── Expenses Report ──────────────────────────────────────────────────────────

export interface ExpensesReportParams extends ReportBaseParams {}

export interface ExpensesReportData {
  expenses: Array<{
    id: number; expense_number: string; date: string;
    amount: number; category_name: string | null;
    description: string | null; status: string;
  }>;
  by_category: Array<{ category_name: string; total: number; count: number }>;
  monthly: Array<{ month: string; total: number; count: number }>;
  summary: { total_expenses: number; count: number };
}

// ─── Sales Trend Report ───────────────────────────────────────────────────────

export interface SalesTrendParams extends ReportBaseParams {}

export interface SalesTrendData {
  daily: Array<{ date: string; count: number; total_ht: number; total_ttc: number }>;
  weekly: Array<{ week: string; count: number; total_ht: number; total_ttc: number }>;
  monthly: Array<{ month: string; count: number; total_ht: number; total_ttc: number }>;
  by_type: Array<{ code: string; count: number; total_ht: number; total_ttc: number }>;
  summary: {
    total_docs: number; total_ht: number; total_ttc: number;
    avg_ht: number; days_with_sales: number;
  };
}

// ─── Stock Movements Report ───────────────────────────────────────────────────

export interface StockMovementsParams {
  product_id?: number;
  warehouse_id?: number;
  from_date?: string;
  to_date?: string;
}

export interface StockMovementsData {
  movements: Array<{
    id: number; movement_date: string | null;
    product_name: string; product_ref: string;
    warehouse_name: string | null; type_label: string | null;
    direction: number; quantity: number;
    unit_price: number; total_price: number;
    reason: string | null; lot_number: string | null;
  }>;
  summary: {
    total_in: number; total_out: number;
    total_adjustment: number; movement_count: number;
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export const reportsApi = {
  sales:     (p?: SalesReportParams)     => apiGet<SalesReportData>    ('/reports/sales',     p),
  purchases: (p?: PurchasesReportParams) => apiGet<PurchasesReportData>('/reports/purchases', p),
  customers: (p?: PartyReportParams)     => apiGet<CustomersReportData>('/reports/customers', p),
  suppliers: (p?: PartyReportParams)     => apiGet<SuppliersReportData>('/reports/suppliers', p),
  products:  (p?: ProductsReportParams)  => apiGet<ProductsReportData> ('/reports/products',  p),
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
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSalesReport(params?: Omit<SalesReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'sales', yearId, params],
    queryFn:   () => reportsApi.sales({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function usePurchasesReport(params?: Omit<PurchasesReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'purchases', yearId, params],
    queryFn:   () => reportsApi.purchases({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useCustomersReport(params?: Omit<PartyReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'customers', yearId, params],
    queryFn:   () => reportsApi.customers({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useSuppliersReport(params?: Omit<PartyReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'suppliers', yearId, params],
    queryFn:   () => reportsApi.suppliers({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useProductsReport(params?: Omit<ProductsReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'products', yearId, params],
    queryFn:   () => reportsApi.products({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useInventoryReport(params?: InventoryReportParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'inventory', params],
    queryFn:   () => reportsApi.inventory(params),
    enabled:   !!slug,
    staleTime: 3 * 60_000,
  });
}

export function usePaymentsReport(params?: Omit<PaymentsReportParams, 'year_id'>) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'payments', yearId, params],
    queryFn:   () => reportsApi.payments({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useTvaReport() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  tenantKeys.reports.tva(slug ?? '', yearId ?? 0),
    queryFn:   () => reportsApi.taxes({ year_id: yearId ?? undefined }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useVelocityReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'velocity', yearId, params],
    queryFn:   () => reportsApi.velocity({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useMarginReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'margin', yearId, params],
    queryFn:   () => reportsApi.margin({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useAgingReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'aging', yearId, params],
    queryFn:   () => reportsApi.aging({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 3 * 60_000,
  });
}

// useDebtsReport → يستخدم customers report مع balance
export function useDebtsReport() {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'debts', yearId],
    queryFn:   () => reportsApi.customers({ year_id: yearId ?? undefined, with_balance: true }),
    enabled:   !!slug && !!yearId,
    staleTime: 3 * 60_000,
  });
}

export function useCreativeReport(params?: ReportBaseParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'creative', yearId, params],
    queryFn:   () => reportsApi.creative({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useDailyReport(params?: DailyReportParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'daily', params?.date],
    queryFn:   () => reportsApi.daily(params),
    enabled:   !!slug,
    staleTime: 2 * 60_000,
  });
}

export function useProductMovementReport(params?: ProductMovementParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'product-movement', params],
    queryFn:   () => reportsApi.productMovement(params),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useProfitLossReport(params?: ProfitLossParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'profit-loss', yearId],
    queryFn:   () => reportsApi.profitLoss({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useReturnsReport(params?: ReturnsReportParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'returns', yearId, params],
    queryFn:   () => reportsApi.returns({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useCashFlowReport(params?: CashFlowParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'cash-flow', yearId, params],
    queryFn:   () => reportsApi.cashFlow({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useExpensesReport(params?: ExpensesReportParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'expenses', yearId, params],
    queryFn:   () => reportsApi.expenses({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useSalesTrendReport(params?: SalesTrendParams) {
  const slug   = useActiveSlug();
  const yearId = useSelectedYearId();
  return useQuery({
    queryKey:  [slug, 'reports', 'sales-trend', yearId, params],
    queryFn:   () => reportsApi.salesTrend({ year_id: yearId ?? undefined, ...params }),
    enabled:   !!slug && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useStockMovementsReport(params?: StockMovementsParams) {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  [slug, 'reports', 'stock-movements', params],
    queryFn:   () => reportsApi.stockMovements(params),
    enabled:   !!slug,
    staleTime: 3 * 60_000,
  });
}
