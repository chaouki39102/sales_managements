// lib/api/endpoints/reports/types/purchases.ts — report types (purchases).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import type { ReportBaseParams, ReportDocumentLine } from './common';

export interface PurchasesReportParams extends ReportBaseParams {
  party_id?:      number;
  document_type?: string;   // FA, BR, ...
  status?:        string;
}

export interface PurchasesReportDocument {
  id:               number;
  document_number:  string;
  document_type?:   string;
  document_type_name?: string;
  date:             string;
  party_name:       string;
  total_ht:         number;
  total_tva:        number;
  total_stamp:      number;
  total_ttc:        number;
  total_discount:   number;
  paid_amount:      number;
  remaining_amount: number;
  status:           string;
  lines?:           ReportDocumentLine[];
}

export interface PurchasesProductRecapItem {
  product_id:     number | null;   // null = منتج يدوي
  is_manual?:     boolean;
  product_name:   string;
  product_ref:    string;
  total_qty:      number;
  total_ht:       number;
  total_tva:      number;
  total_ttc:      number;
  total_discount: number;
}

export interface PurchasesReportData {
  summary: {
    total_ht:          number;
    total_tva:         number;
    total_stamp:       number;
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
