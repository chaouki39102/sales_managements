// lib/api/endpoints/reports/types/matrix.ts — report types (matrix).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import type { ReportBaseParams } from './common';

// ─── Matrix Report (المبيعات حسب المنتج والزبون / المشتريات حسب المنتج والمورد) ──
export interface MatrixReportParams extends ReportBaseParams {
  family_id?: number;
  brand_id?:  number;
}

/** خلية المصفوفة = زوج (طرف × منتج) */
export interface MatrixCell {
  qty:  number;   // الكمية (الإرجاعات سالبة)
  ht:   number;
  ttc:  number;
  cost: number;
}

export interface MatrixParty {
  id:           number;
  name:         string;
  code:         string | null;
  total_qty:    number;
  total_ht:     number;
  total_ttc:    number;
  total_cost:   number;
  total_margin: number;
  /** مفاتيح = product_id */
  cells: Record<string, MatrixCell>;
}

export interface MatrixProduct {
  id:           number;          // سالب اصطناعي للمنتج اليدوي
  is_manual?:   boolean;
  name:         string;
  ref:          string | null;
  total_qty:    number;
  total_ht:     number;
  total_ttc:    number;
  total_cost:   number;
  total_margin: number;
}

export interface MatrixReportData {
  mode:     'sale' | 'purchase';
  parties:  MatrixParty[];
  products: MatrixProduct[];
  summary: {
    party_count:   number;
    product_count: number;
    total_qty:     number;
    total_ht:      number;
    total_ttc:     number;
    total_cost:    number;
    total_margin:  number;
  };
}

export interface MatrixDetailParams {
  mode?:      'sale' | 'purchase';
  party_id:   number;
  product_id: number;
  from_date?: string;
  to_date?:   string;
}

export interface MatrixDetailRow {
  id:              number;
  document_number: string;
  document_date:   string;
  type_name:       string;
  type_code:       string;
  quantity:        number;
  unit_price_ht:   number;
  total_ht:        number;
  total_ttc:       number;
  cost_ht:         number;
  margin_value:    number;
}
