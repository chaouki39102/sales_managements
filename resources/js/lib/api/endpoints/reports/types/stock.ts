// lib/api/endpoints/reports/types/stock.ts — report types (stock).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import type { ReportBaseParams } from './common';

export interface InventoryReportParams extends ReportBaseParams {
  warehouse_id?:  number;
  family_id?:     number;
  low_stock?:     boolean;
  out_of_stock?:  boolean;
  as_of_date?:    string;   // رصيد المخزون حتى تاريخ (لقطة)
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
