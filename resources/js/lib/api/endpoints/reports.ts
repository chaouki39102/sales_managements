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
  CommercialDocument, Payment, StockMovement,
} from '../core/types';

// ─── Report Params ────────────────────────────────────────────────────────────

export interface ReportBaseParams {
  year_id?:   number;
  from?:      string;   // YYYY-MM-DD
  to?:        string;
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

export interface SalesReportData {
  summary: {
    total_ht:         number;
    total_tva:        number;
    total_ttc:        number;
    total_discount:   number;
    documents_count:  number;
    paid_count:       number;
    unpaid_count:     number;
    cancelled_count:  number;
  };
  by_month: Array<{
    month:     string;   // YYYY-MM
    total_ht:  number;
    total_ttc: number;
    count:     number;
  }>;
  by_document_type: Array<{
    code:      string;
    name:      string;
    total_ttc: number;
    count:     number;
  }>;
  documents: CommercialDocument[];
}

export interface PurchasesReportData {
  summary: {
    total_ht:        number;
    total_tva:       number;
    total_ttc:       number;
    documents_count: number;
    paid_count:      number;
    unpaid_count:    number;
  };
  by_month: Array<{
    month:     string;
    total_ht:  number;
    total_ttc: number;
    count:     number;
  }>;
  documents: CommercialDocument[];
}

export interface PartyReportRow {
  party:            Pick<Party, 'id' | 'name' | 'code' | 'phone'>;
  total_purchases:  number;
  total_payments:   number;
  balance:          number;
  documents_count:  number;
  last_transaction?: string | null;
}

export interface PartyReportData {
  summary: {
    total_balance:    number;
    debtors_count:    number;
    creditors_count:  number;
  };
  rows: PartyReportRow[];
}

export interface ProductsReportRow {
  product:       Pick<Product, 'id' | 'name' | 'slug'>;
  variant:       Pick<ProductVariant, 'id' | 'ref' | 'variant_name'>;
  quantity_sold: number;
  total_ht:      number;
  total_ttc:     number;
  profit?:       number;
}

export interface ProductsReportData {
  summary: {
    total_ht:      number;
    total_ttc:     number;
    items_count:   number;
    products_count:number;
  };
  rows: ProductsReportRow[];
}

export interface InventoryReportRow {
  product:       Pick<Product, 'id' | 'name' | 'slug'>;
  variant:       Pick<ProductVariant, 'id' | 'ref' | 'variant_name'>;
  warehouse:     { id: number; name: string };
  current_stock: number;
  average_cost:  number;
  total_value:   number;
  min_alert:     number;
  is_low_stock:  boolean;
  is_out:        boolean;
}

export interface InventoryReportData {
  summary: {
    total_value:    number;
    total_items:    number;
    low_stock:      number;
    out_of_stock:   number;
  };
  rows: InventoryReportRow[];
}

export interface PaymentsReportData {
  summary: {
    total_confirmed: number;
    total_pending:   number;
    total_cancelled: number;
    count:           number;
  };
  by_mode: Array<{
    mode_name: string;
    mode_code: string;
    total:     number;
    count:     number;
  }>;
  payments: Payment[];
}

export interface TvaReportLine {
  tva_rate:          number;
  base_ht_sales:     number;
  tva_collected:     number;
  base_ht_purchases: number;
  tva_deductible:    number;
  tva_due:           number;
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

export interface TaxesReportData {
  period: { from: string; to: string };
  summary: {
    total_tva_collected:  number;
    total_tva_deductible: number;
    total_tva_due:        number;
  };
  by_rate:  TvaReportLine[];
  by_month: Array<{
    month:           string;
    tva_collected:   number;
    tva_deductible:  number;
    tva_due:         number;
  }>;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const reportsApi = {
  sales:     (p?: SalesReportParams)     => apiGet<SalesReportData>    ('/reports/sales',     p),
  purchases: (p?: PurchasesReportParams) => apiGet<PurchasesReportData>('/reports/purchases', p),
  customers: (p?: PartyReportParams)     => apiGet<PartyReportData>    ('/reports/customers', p),
  suppliers: (p?: PartyReportParams)     => apiGet<PartyReportData>    ('/reports/suppliers', p),
  products:  (p?: ProductsReportParams)  => apiGet<ProductsReportData> ('/reports/products',  p),
  inventory: (p?: InventoryReportParams) => apiGet<InventoryReportData>('/reports/inventory', p),
  payments:  (p?: PaymentsReportParams)  => apiGet<PaymentsReportData> ('/reports/payments',  p),
  taxes:     (p?: TaxesReportParams)     => apiGet<TaxesReportData>    ('/reports/taxes',     p),
  velocity:  (p?: ReportBaseParams)      => apiGet<VelocityReportData> ('/reports/velocity',  p),
  margin:    (p?: ReportBaseParams)      => apiGet<MarginReportData>   ('/reports/margin',    p),
  aging:     (p?: ReportBaseParams)      => apiGet<AgingReportData>    ('/reports/aging',     p),
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
