// lib/api/endpoints/reports/types/products.ts — report types (products).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import type { ReportBaseParams } from './common';

export interface ProductsReportParams extends ReportBaseParams {
  family_id?:  number;
  brand_id?:   number;
  warehouse_id?: number;
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
  qty_bought:          number;         // كمية مشتراة ضمن الفترة
  purchase_ht:         number;         // قيمة المشتريات ضمن الفترة
  avg_purchase_price:  number;         // متوسط سعر الشراء المرجح (كل الفترات)
  cogs_estimated:      number;         // تكلفة البضاعة المباعة المقدرة
  est_profit:          number;         // الربح المقدر
  profit_pct:          number;         // هامش الربح % (مقدر)
  stock_status:        string;         // good | reorder | out_of_stock
  profit_rank:         number;         // ترتيب الربح
}

export interface ProductsReportData {
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
  products: ProductsReportRow[];
  best_product:  { id: number; name: string; est_profit: number } | null;
  worst_product: { id: number; name: string; est_profit: number } | null;
}

// ─── Forecast & Reorder Report (التنبؤ وإعادة الطلب) ────────────────────────
export interface ForecastReportParams extends ReportBaseParams {
  horizon?: number;   // أفق التنبؤ بالأيام
}

export interface ForecastReportRow {
  product_id:         number;
  product_name:       string;
  product_ref:        string;
  first_sale:         string;
  last_sale:          string;
  active_days:        number;
  total_sold:         number;
  sales_ht:           number;
  daily_rate_qty:     number;
  daily_rate_value:   number;
  avg_purchase_price: number;
  forecast_qty:       number;
  forecast_value:     number;
  forecast_profit:    number;
  current_stock:      number;
  suggested_qty:      number;
  needs_reorder:      boolean;
}

export interface ForecastReportData {
  items: ForecastReportRow[];
  horizon: number;
  summary: {
    products_count:         number;
    total_forecast_value:   number;
    total_forecast_profit:  number;
    total_suggested_qty:    number;
    needs_reorder_count:    number;
  };
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

// ─── Product Movement Report ──────────────────────────────────────────────────
export interface ProductMovementParams extends ReportBaseParams {
  product_id?: number;
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

export interface ProductHistoryParams {
  product_id?: number;
  from_date?:  string;
  to_date?:    string;
}

export interface ProductHistoryItem {
  id:              number;
  document_number: string;
  document_date:   string;
  type_code:       string;
  type_name:       string;
  party_name:      string;
  quantity:        number;
  total_ht:        number;
  total_tva:       number;
  total_ttc:       number;
}

export interface ProductHistoryData {
  items:   ProductHistoryItem[];
  summary: {
    doc_count: number;
    total_qty: number;
    total_ht:  number;
    total_ttc: number;
  };
}
