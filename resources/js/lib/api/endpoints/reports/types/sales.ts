// lib/api/endpoints/reports/types/sales.ts — report types (sales).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import type { ReportBaseParams, ReportDocumentLine } from './common';

export interface SalesReportParams extends ReportBaseParams {
  party_id?:      number;
  document_type?: string;   // FV, BL, ...
  status?:        string;
}

export interface SalesReportDocument {
  id:                number;
  document_number:   string;
  document_type?:    string;
  document_type_name?: string;
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
  lines?:            ReportDocumentLine[];
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

// ─── Daily Report ─────────────────────────────────────────────────────────────
export interface DailyReportParams extends ReportBaseParams {
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
  lines?:           ReportDocumentLine[];
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

// ─── Returns Report ───────────────────────────────────────────────────────────
export type ReturnsReportParams = ReportBaseParams

export interface ReturnsReportData {
  documents: Array<{
    id: number; document_number: string; document_type: string;
    document_type_name?: string;
    date: string; party_name: string | null;
    total_ht: number; total_ttc: number; reason: string | null;
    lines?: ReportDocumentLine[];
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

// ─── Sales Trend Report ───────────────────────────────────────────────────────
export type SalesTrendParams = ReportBaseParams

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
