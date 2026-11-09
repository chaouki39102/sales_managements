// lib/api/endpoints/reports/types/common.ts — report types (common).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

export interface ReportBaseParams extends Record<string, unknown> {
  year_id?:   number;
  from_date?: string;   // YYYY-MM-DD
  to_date?:   string;
  page?:      number;
  per_page?:  number;
}

/** سطر وثيقة (تفاصيل تفاصيل التقرير) */
export interface ReportDocumentLine {
  product_id:          number | null;  // null = منتج يدوي (سطر حر)
  is_manual?:          boolean;
  product_name:        string;
  product_ref:         string | null;
  quantity:            number;
  unit_price_ht:       number;
  discount_percentage: number;
  discount_amount:     number;   // خصم الوحدة الثابت (لكل وحدة مباعة)
  discount_amount_per_unit: number;
  total_discount_amount: number; // إجمالي خصم السطر = الكمية × discount_amount_per_unit
  tva_rate:            number;
  total_ht:            number;
  total_tva:           number;
  total_ttc:           number;
  pack_qty?:           number | null;   // عامل التغليف (packaging_units_snapshot)
}
