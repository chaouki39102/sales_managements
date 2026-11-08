// lib/api/endpoints/reports/types/finance.ts — report types (finance).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import type { ReportBaseParams } from './common';

export interface PaymentsReportParams extends ReportBaseParams {
  payment_mode_id?:    number;
  treasury_account_id?: number;
  status?:             string;
}

export interface TaxesReportParams extends ReportBaseParams {
  tva_rate?: number;
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

// ─── Monthly Report (التقرير الشهري) ────────────────────────────────────────
export interface MonthlyReportRow {
  month:       string;   // YYYY-MM
  sales_ht:    number;
  purchase_ht: number;
  diff:        number;   // sales − purchases (صافي التدفق)
}

export interface MonthlyReportData {
  months: MonthlyReportRow[];
  summary: {
    months_count:   number;
    total_sales:    number;
    total_purchase: number;
    total_diff:     number;
  };
}

// ─── Profit & Loss Report ─────────────────────────────────────────────────────
export interface ProfitLossParams {
  year_id?:   number;
  from_date?: string;
  to_date?:   string;
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

// ─── Cash Flow Report ─────────────────────────────────────────────────────────
export type CashFlowParams = ReportBaseParams

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
export type ExpensesReportParams = ReportBaseParams

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
