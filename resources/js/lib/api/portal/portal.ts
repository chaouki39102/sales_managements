// ════════════════════════════════════════════════════════════════════════════
// lib/api/portal/portal.ts — types + endpoints لبوابة الزبائن
// ════════════════════════════════════════════════════════════════════════════
import { portalGet, portalPost, portalTokenStorage } from './client';
import type { PortalPaginated } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PortalCompany {
  id:              number;
  name:            string;
  commercial_name: string | null;
  slug:            string;
  nif:             string | null;
  phone:           string | null;
  email:           string | null;
  address:         string | null;
  avatar:          string | null;
}

export interface PortalParty {
  id:           number;
  name:         string;
  code:         string | null;
  nif:          string | null;
  phone:        string | null;
  email:        string | null;
  address:      string | null;
  credit_limit: number;
  credit_days:  number | null;
}

export interface PortalUser {
  id:            number;
  name:          string;
  email:         string;
  is_active:     boolean;
  last_login_at: string | null;
  company:       PortalCompany | null;
  party:         PortalParty | null;
}

export interface PortalLoginResponse {
  portal_user: PortalUser;
  token:       string;
  token_type:  string;
}

export interface PortalBalance {
  party_id:          number;
  date:              string;
  fiscal_year_id:    number;
  opening_balance:   number;
  documents_balance: number;
  payments_total:    number;
  current_balance:   number;
  signed_balance:    number;
  balance_type:      'debit' | 'credit';
}

export interface PortalDocument {
  id:               number;
  document_number:  string;
  document_date:    string;
  due_date:         string | null;
  type_code:        string;
  type_name:        string;
  status_name:      string | null;
  total_ht:         number;
  total_tva:        number;
  total_discount:   number;
  total_stamp:      number;
  total_ttc:        number;
  net_to_pay:       number;
  paid_amount:      number;
  remaining_amount: number;
}

export interface PortalDocumentLine {
  id:                    number;
  product_id:            number;
  product_name:          string;
  ref:                   string;
  quantity:              number;
  unit_price_ht:         number;
  discount_percentage:   number;
  total_discount_amount: number;
  tva_rate:              number;
  total_ht:              number;
  total_tva:             number;
  total_ttc:             number;
  pack_qty:              number | null;
}

export interface PortalDocumentPayment {
  id:           number;
  date:         string;
  amount:       number;
  payment_mode: string;
  reference:    string | null;
}

export interface PortalDocumentDetail extends PortalDocument {
  lines:    PortalDocumentLine[];
  payments: PortalDocumentPayment[];
}

export interface PortalPayment {
  id:               number;
  payment_number:   string;
  payment_date:     string;
  amount:           number;
  payment_mode:     string;
  payment_mode_code: string;
  is_cash:          boolean;
  reference:        string | null;
  notes:            string | null;
  direction:        'in' | 'out';
}

export interface PortalStatementRow {
  date:      string;
  reference: string;
  type:      string;
  label:     string;
  debit:     number;
  credit:    number;
  balance:   number;
  remaining: number;
}

export interface PortalStatement {
  opening:      number;
  closing:      number;
  total_debit:  number;
  total_credit: number;
  from:         string;
  to:           string;
  rows:         PortalStatementRow[];
}

export interface PortalDashboard {
  balance:          PortalBalance;
  party:            PortalParty;
  company:          PortalCompany | null;
  month:            { date: string; sales_total: number };
  unpaid_total:     number;
  recent_documents: PortalDocument[];
  recent_payments:  PortalPayment[];
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const portalApi = {
  login:    (email: string, password: string) =>
    portalPost<PortalLoginResponse>('/portal/auth/login', { email, password }),
  company:  ()    => portalGet<PortalCompany>('/portal/info'),
  me:       ()    => portalGet<PortalUser>('/portal/auth/me'),
  logout:   ()    => portalPost<void>('/portal/auth/logout'),
  dashboard:()    => portalGet<PortalDashboard>('/portal/dashboard'),
  documents:(page = 1, perPage = 15) =>
    portalGet<PortalPaginated<PortalDocument>>('/portal/documents', { page, per_page: perPage }),
  document: (id: number) => portalGet<PortalDocumentDetail>(`/portal/documents/${id}`),
  payments: (page = 1, perPage = 15) =>
    portalGet<PortalPaginated<PortalPayment>>('/portal/payments', { page, per_page: perPage }),
  statement:(from?: string, to?: string) =>
    portalGet<PortalStatement>('/portal/statement', { from: from || undefined, to: to || undefined }),
};

export function isPortalAuthenticated(): boolean {
  return !!portalTokenStorage.get();
}
