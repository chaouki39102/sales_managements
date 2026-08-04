// ════════════════════════════════════════════════════════════════════════════
// lib/api/portal/portal.ts — types + endpoints لبوابة الزبائن
// ════════════════════════════════════════════════════════════════════════════
import { portalGet, portalPost, portalPut, portalTokenStorage } from './client';
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
  id:                number;
  name:              string;
  commercial_name:   string | null;
  code:              string | null;
  activity:          string | null;
  rc:                string | null;
  nif:               string | null;
  nis:               string | null;
  mobile:            string | null;
  phone:             string | null;
  fax:               string | null;
  email:             string | null;
  address:           string | null;
  full_address:      string | null;
  bank_name:         string | null;
  rib:               string | null;
  credit_limit:      number;
  credit_days:       number | null;
  allow_credit_sale: boolean;
  is_tva_exempt:     boolean;
  is_taxable:        boolean;
  tax_option:        string | null;
  cnas_number:       string | null;
  tax_regime:        string | null;
  is_vat_registered: boolean;
  active:            boolean;
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
  previous_balance: number | null;
  new_balance:      number | null;
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

export interface PortalProfile {
  id:    number;
  name:  string;
  email: string;
  party: PortalParty | null;
}

// ─── طلبات السلع (وصل طلب سلعة) ────────────────────────────────────────────────
export type PortalOrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface PortalCatalogItem {
  id:            number;
  name:          string;
  ref:           string | null;
  barcode:       string | null;
  unit_price_ht: number;
  tva_rate:      number;
  unit:          { name: string; symbol: string } | null;
  manages_stock: boolean;
  current_stock: number | null;
}

export interface PortalOrderItem {
  product_id:    number;
  product_name:  string;
  product_ref:   string | null;
  unit_name:     string | null;
  unit_price_ht: number;
  tva_rate:      number;
  quantity:      number;
  total_ht:      number;
  total_tva:     number;
  total_ttc:     number;
}

export interface PortalOrder {
  id:           number;
  reference:    string;
  status:       PortalOrderStatus;
  status_label: string;
  notes:        string | null;
  total_ht:     number;
  total_tva:    number;
  total_ttc:    number;
  items_count:  number;
  requested_at: string | null;
  created_at:   string | null;
  items?:       PortalOrderItem[];
  party?:       { id: number; name: string; code: string | null } | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface PortalDocFilters {
  page?: number;
  per_page?: number;
  search?: string;
  type_code?: string;
  status?: string;
  sort?: 'date_desc' | 'date_asc' | 'amount_asc' | 'amount_desc';
}

export interface PortalPaymentFilters {
  page?: number;
  per_page?: number;
  search?: string;
  direction?: 'in' | 'out';
  payment_mode?: string;
  sort?: 'date_desc' | 'date_asc' | 'amount_asc' | 'amount_desc';
}

export const portalApi = {
  login:    (email: string, password: string) =>
    portalPost<PortalLoginResponse>('/portal/auth/login', { email, password }),
  company:  ()    => portalGet<PortalCompany>('/portal/info'),
  me:       ()    => portalGet<PortalUser>('/portal/auth/me'),
  logout:   ()    => portalPost<void>('/portal/auth/logout'),
  dashboard:()    => portalGet<PortalDashboard>('/portal/dashboard'),
  documents:(filters: PortalDocFilters = {}) =>
    portalGet<PortalPaginated<PortalDocument>>('/portal/documents', {
      page: filters.page ?? 1,
      per_page: filters.per_page ?? 15,
      search: filters.search || undefined,
      type_code: filters.type_code || undefined,
      status: filters.status || undefined,
      sort: filters.sort || undefined,
    }),
  document: (id: number) => portalGet<PortalDocumentDetail>(`/portal/documents/${id}`),
  payments: (filters: PortalPaymentFilters = {}) =>
    portalGet<PortalPaginated<PortalPayment>>('/portal/payments', {
      page: filters.page ?? 1,
      per_page: filters.per_page ?? 15,
      search: filters.search || undefined,
      direction: filters.direction || undefined,
      payment_mode: filters.payment_mode || undefined,
      sort: filters.sort || undefined,
    }),
  statement:(from?: string, to?: string) =>
    portalGet<PortalStatement>('/portal/statement', { from: from || undefined, to: to || undefined }),
  profile:      ()    => portalGet<PortalProfile>('/portal/profile'),
  updateProfile:(data: { name?: string; email?: string }) =>
    portalPut<PortalProfile>('/portal/profile', data),
  updatePassword:(data: { current_password: string; password: string; password_confirmation: string }) =>
    portalPut<void>('/portal/profile/password', data),
  catalog:  (filters: { page?: number; per_page?: number; search?: string } = {}) =>
    portalGet<PortalPaginated<PortalCatalogItem>>('/portal/orders/catalog', {
      page: filters.page ?? 1,
      per_page: filters.per_page ?? 24,
      search: filters.search || undefined,
    }),
  orders:   (filters: { page?: number; per_page?: number; status?: PortalOrderStatus } = {}) =>
    portalGet<PortalPaginated<PortalOrder>>('/portal/orders', {
      page: filters.page ?? 1,
      per_page: filters.per_page ?? 10,
      status: filters.status || undefined,
    }),
  createOrder: (items: { product_id: number; quantity: number }[], notes?: string) =>
    portalPost<PortalOrder>('/portal/orders', { items, notes: notes || undefined }),
};

export function isPortalAuthenticated(): boolean {
  return !!portalTokenStorage.get();
}
