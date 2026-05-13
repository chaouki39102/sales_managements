// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/types.ts — كامل مع الأنواع المفقودة
// ════════════════════════════════════════════════════════════════════════════

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  current_page:   number;
  last_page:      number;
  per_page:       number;
  total:          number;
  from:           number | null;
  to:             number | null;
  has_more_pages: boolean;
}
export interface PaginationLinks {
  first: string | null; last: string | null;
  prev:  string | null; next: string | null;
}
export interface PaginatedResponse<T> {
  data:  T[];
  meta:  PaginationMeta;
  links: PaginationLinks;
}

// ─── Common ───────────────────────────────────────────────────────────────────
export interface BaseModel {
  id:         number;
  created_at: string;
  updated_at: string;
}

export interface ListParams {
  page?:     number;
  per_page?: number;
  search?:   string;
  sort?:     string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginCredentials {
  email:    string;
  password: string;
}
export interface AuthResponse {
  user:  User;
  token: string;
}
export interface User extends BaseModel {
  name:       string;
  email:      string;
  avatar?:    string | null;
  company_id?:number | null;
  roles?:     Role[];
  permissions?:Permission[];
}

// ─── Active Company (Zustand) ─────────────────────────────────────────────────
export interface ActiveCompany {
  id:   number;
  name: string;
  slug: string;
}

// ─── Company ──────────────────────────────────────────────────────────────────
export interface Company extends BaseModel {
  name:            string;
  commercial_name?:string | null;
  slug:            string;
  activity?:       string | null;
  email?:          string | null;
  phone?:          string | null;
  address?:        string | null;
  avatar?:         string | null;
  owner_id:        number;
  active:          boolean;
  plan:            'free' | 'starter' | 'professional' | 'enterprise';
  max_users:       number;
  max_products:    number;
  max_warehouses:  number;
  is_suspended:    boolean;
  is_verified:     boolean;
  is_on_trial:     boolean;
  trial_days_remaining: number;
}

// ─── Fiscal Year ──────────────────────────────────────────────────────────────
export interface FiscalYear extends BaseModel {
  name:       string;
  start_date: string;
  end_date:   string;
  is_current: boolean;
  is_closed:  boolean;
  company_id: number;
}

// ─── Global Lookups ───────────────────────────────────────────────────────────
export interface Currency extends BaseModel {
  code:   string;
  name:   string;
  symbol: string;
  is_default: boolean;
}
export interface Tva extends BaseModel {
  name:  string;
  rate:  number;
  is_default: boolean;
}
export interface LegalForm extends BaseModel {
  name: string; code: string;
}
export interface FiscalStamp extends BaseModel {
  name: string; amount: number;
}
export interface InventoryValuationMethod extends BaseModel {
  name: string; code: string;
}
export interface Wilaya extends BaseModel {
  name: string; code: string;
}
export interface Commune extends BaseModel {
  name: string; wilaya_id: number;
}
export interface DocumentStatus extends BaseModel {
  name: string; code: string; color?: string;
}
export interface DocumentType extends BaseModel {
  name: string; code: string; base_operation_id: number;
}
export interface DocumentBaseOperation extends BaseModel {
  name: string; code: string;
}
export interface StockMovementType extends BaseModel {
  name: string; code: string; direction: 'in' | 'out';
}
export interface ProductType extends BaseModel {
  name: string; code: string;
}
export interface PartyType extends BaseModel {
  name: string; code: string;
}
export interface TreasuryAccountType extends BaseModel {
  name: string; code: string;
}

// ─── Tenant Lookups ───────────────────────────────────────────────────────────
export interface Unit extends BaseModel {
  name: string; symbol: string; company_id: number;
}
export interface Warehouse extends BaseModel {
  name: string; address?: string | null;
  is_default: boolean; company_id: number;
}
export interface PriceLevel extends BaseModel {
  name: string; multiplier: number;
  is_default: boolean; company_id: number;
}
export interface PaymentMode extends BaseModel {
  name: string; code: string; is_default: boolean; company_id: number;
}
export interface NumberingSeries extends BaseModel {
  name: string; prefix: string; next_number: number;
  document_type_id: number; company_id: number; is_locked: boolean;
}
export interface TreasuryAccount extends BaseModel {
  name:        string;
  code:        string;
  account_number?: string | null;
  bank_name?:  string | null;
  is_default:  boolean;
  active:      boolean;
  current_balance: number;
  initial_balance: number;
  currency_id: number;
  treasury_account_type_id: number;
  company_id:  number;
  currency?:   Currency;
  type?:       TreasuryAccountType;
}
export interface ExpenseCategory extends BaseModel {
  name: string; parent_id?: number | null; company_id: number;
}
export interface Brand extends BaseModel {
  name: string; company_id: number;
}
export interface Family extends BaseModel {
  name: string; parent_id?: number | null; company_id: number;
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────
export interface Role extends BaseModel {
  name:         string;
  display_name: string;
  company_id?:  number | null;
  permissions?: Permission[];
}
export interface Permission extends BaseModel {
  name:         string;
  display_name: string;
  group:        string;
}

// ─── Parties ──────────────────────────────────────────────────────────────────
export type PartyTypeCode = 'client' | 'supplier' | 'both';
export interface Party extends BaseModel {
  name:       string;
  type:       PartyTypeCode;
  email?:     string | null;
  phone?:     string | null;
  address?:   string | null;
  tax_id?:    string | null;
  balance:    number;
  company_id: number;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface Product extends BaseModel {
  name:       string;
  reference:  string;
  barcode?:   string | null;
  unit_id:    number;
  family_id?: number | null;
  brand_id?:  number | null;
  tva_id?:    number | null;
  price:      number;
  cost:       number;
  stock:      number;
  is_active:  boolean;
  company_id: number;
  unit?:      Unit;
  family?:    Family;
  brand?:     Brand;
  tva?:       Tva;
}

// ─── Commercial Documents ─────────────────────────────────────────────────────
export interface CommercialDocument extends BaseModel {
  number:       string;
  date:         string;
  due_date?:    string | null;
  party_id:     number;
  type_id:      number;
  status_id:    number;
  total_ht:     number;
  total_tva:    number;
  total_ttc:    number;
  paid_amount:  number;
  balance:      number;
  is_locked:    boolean;
  company_id:   number;
  fiscal_year_id: number;
  party?:       Party;
  type?:        DocumentType;
  status?:      DocumentStatus;
  lines?:       CommercialDocumentLine[];
}
export interface CommercialDocumentLine extends BaseModel {
  document_id: number;
  product_id:  number;
  quantity:    number;
  unit_price:  number;
  discount:    number;
  tva_rate:    number;
  total_ht:    number;
  total_ttc:   number;
  product?:    Product;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export interface Payment extends BaseModel {
  document_id: number;
  amount:      number;
  date:        string;
  mode_id:     number;
  reference?:  string | null;
  company_id:  number;
  mode?:       PaymentMode;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export interface Expense extends BaseModel {
  description:  string;
  amount:       number;
  date:         string;
  category_id:  number;
  is_paid:      boolean;
  company_id:   number;
  fiscal_year_id: number;
  category?:    ExpenseCategory;
}

// ─── Employees ────────────────────────────────────────────────────────────────
export interface Employee extends BaseModel {
  first_name:  string;
  last_name:   string;
  email?:      string | null;
  phone?:      string | null;
  hire_date:   string;
  is_active:   boolean;
  company_id:  number;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
export type SeedKey =
  | 'currencies' | 'tvas' | 'units' | 'legal-forms' | 'fiscal-stamps'
  | 'price-levels' | 'wilayas-communes' | 'document-base-operations'
  | 'document-statuses' | 'document-types' | 'inventory-valuation-methods'
  | 'numbering-series' | 'warehouses' | 'treasury-account-types'
  | 'treasury-accounts' | 'payment-modes' | 'expense-categories';

export interface SeedResult {
  key:     SeedKey;
  success: boolean;
  message: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_sales:     number;
  total_purchases: number;
  total_expenses:  number;
  net_profit:      number;
  clients_count:   number;
  suppliers_count: number;
  products_count:  number;
  low_stock_count: number;
}
