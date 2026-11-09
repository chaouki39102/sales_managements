// lib/api/endpoints/reports/types/parties.ts — report types (parties).
// Split out of reports.ts (re-exported from there); keep that barrel in sync.

import type { ReportBaseParams } from './common';

export interface PartyReportParams extends ReportBaseParams {
  party_id?:    number;
  with_balance?: boolean;
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
    product_id:     number | null;
    is_manual?:     boolean;
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

// ─── Client Monthly Report (رقم الأعمال الشهري حسب الزبون) ────────────────
export interface ClientMonthlyMonth {
  month:     string;   // YYYY-MM
  label:     string;   // جانفي 2026
  total_qty: number;
  total_ht:  number;
  total_ttc: number;
}

export interface ClientMonthlyCell {
  qty: number;
  ht:  number;
  ttc: number;
}

export interface ClientMonthlyParty {
  id:        number;
  name:      string;
  code:      string | null;
  total_qty: number;
  total_ht:  number;
  total_ttc: number;
  /** مفاتيح = YYYY-MM */
  months: Record<string, ClientMonthlyCell>;
}

export interface ClientMonthlyReportData {
  months:  ClientMonthlyMonth[];
  parties: ClientMonthlyParty[];
  summary: {
    party_count: number;
    month_count: number;
    total_qty:   number;
    total_ht:    number;
    total_ttc:   number;
  };
}

// ─── Grand Livre (دفتر الأستاذ العام) ─────────────────────────────────────
export interface GrandLivreParams extends ReportBaseParams {
  party_id?:      number;
  party_type_id?: number;
}

export interface GrandLivreTransaction {
  type:      'document' | 'payment';
  seq:       number;
  date:      string;
  reference: string;
  label:     string;
  type_code: string | null;
  debit:     number;
  credit:    number;
  balance:   number;
}

export interface GrandLivreParty {
  id:              number;
  name:            string;
  code:            string | null;
  party_type_id:   number;
  opening_balance: number;
  closing_balance: number;
  total_debit:     number;
  total_credit:    number;
  transactions:    GrandLivreTransaction[];
}

export interface GrandLivreReportData {
  parties: GrandLivreParty[];
  summary: {
    party_count:       number;
    transaction_count: number;
    total_debit:       number;
    total_credit:      number;
    net:               number;
  };
}
