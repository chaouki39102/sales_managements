// lib/api/endpoints/reports/types/analytics.ts — report types (analytics).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

// ─── Dashboard KPIs Report (لوحة القيادة) ───────────────────────────────────
export interface DashboardReportData {
  summary: {
    total_products:     number;
    total_stock_value:  number;
    total_sold:         number;
    total_sales_ht:     number;
    total_qty_bought:   number;
    total_purchase_ht:  number;
    total_cogs:         number;
    total_est_profit:   number;
    margin_pct:         number;
    reorder_count:      number;
  };
  best_product:  { id: number; name: string; est_profit: number } | null;
  worst_product: { id: number; name: string; est_profit: number } | null;
}

// ─── Creative Report (التقرير الشامل) ──────────────────────────────────────
export interface CreativeReportOverview {
  total_sales_ht:         number;
  total_sales_tva:        number;
  total_sales_ttc:        number;
  total_sales_cost:       number;
  total_sales_margin:     number;
  sales_margin_pct:       number;
  total_purchases_ht:     number;
  total_purchases_tva:    number;
  total_purchases_ttc:    number;
  total_payments_in:      number;
  total_payments_out:     number;
  total_receivable:       number;
  total_payable:          number;
  sales_count:            number;
  purchases_count:        number;
  unpaid_sales_count:     number;
  sale_returns_count:     number;
  purchase_returns_count: number;
  returns_ht:             number;
  returns_ttc:            number;
  expenses_total:         number;
  expenses_count:         number;
  net_profit:             number;
  net_profit_pct:         number;
  tva_collected:          number;
  tva_deductible:         number;
  tva_balance:            number;
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
