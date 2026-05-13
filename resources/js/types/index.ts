// ════════════════════════════════════════════════
// types/index.ts — أنواع TypeScript المتكاملة
// مطابقة لقاعدة البيانات
// ════════════════════════════════════════════════
export type * from '@/lib/api/core/types';

// ── Common ────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  links: { first: string; last: string; prev: string | null; next: string | null };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface SelectOption {
  value: number | string;
  label: string;
}

// ── Auth ──────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  role?: string;
  roles?: Role[];
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ── Lookup Tables ─────────────────────────────────
export interface Unit {
  id: number;
  name: string;
  symbol: string | null;
  description: string | null;
  active: boolean;
  display_order: number;
}

export interface Tva {
  id: number;
  name: string;
  rate: number;
  description: string | null;
  active: boolean;
  is_default: boolean;
  display_order: number;
}

export interface Family {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  parent_id: number | null;
  parent?: Family;
  children?: Family[];
  active: boolean;
  display_order: number;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  active: boolean;
  display_order: number;
}

export interface PriceLevel {
  id: number;
  name: string;
  description: string | null;
  is_percentage: boolean;
  value: number;
  active: boolean;
  display_order: number;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  active: boolean;
  is_default: boolean;
}

export interface FiscalYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: number | null;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  display_name: string | null;
  group: string | null;
  description: string | null;
}

export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  is_default: boolean;
  active: boolean;
}

export interface DocumentType {
  id: number;
  name: string;
  name_latin: string;
  code: string;
  description: string | null;
  affects_stock_direction: -1 | 0 | 1;
  requires_party: boolean;
  affects_accounting: boolean;
  active: boolean;
}

export interface DocumentStatus {
  id: number;
  name: string;
  label: string;
  color: string | null;
  is_final: boolean;
}

export interface PaymentMode {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

export interface TreasuryAccount {
  id: number;
  name: string;
  code: string;
  type: 'bank' | 'cash';
  balance: number;
  is_default: boolean;
  active: boolean;
}

// ── Product ───────────────────────────────────────
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  family_id: number | null;
  brand_id: number | null;
  product_type_id: number;
  images: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  // relations
  family?: Family;
  brand?: Brand;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  ref: string | null;
  barcode: string | null;
  variant_name: string | null;
  unit_id: number | null;
  tva_id: number | null;
  last_purchase_price: number;
  average_cost_price: number;
  default_selling_price_ht: number;
  manages_stock: boolean;
  allow_negative_stock: boolean;
  has_lots: boolean;
  min_stock_alert: number;
  max_stock_alert: number;
  active: boolean;
  // relations
  product?: Product;
  unit?: Unit;
  tva?: Tva;
  variant_prices?: ProductVariantPrice[];
  // computed
  current_stock?: number;
  selling_price_ttc?: number;
}

export interface ProductVariantPrice {
  id: number;
  product_id: number;
  price_level_id: number;
  price: number;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
  price_level?: PriceLevel;
}

// ── Party (Client / Supplier) ─────────────────────
export interface Party {
  id: number;
  party_type_id: number;
  code: string | null;
  name: string;
  commercial_name: string | null;
  slug: string;
  nif: string | null;
  nis: string | null;
  ai: string | null;
  rc: string | null;
  address: string | null;
  wilaya_id: number | null;
  commune_id: number | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  initial_balance: number;
  credit_limit: number;
  credit_days: number | null;
  default_price_level_id: number | null;
  is_tva_exempt: boolean;
  active: boolean;
  created_at: string;
  // relations
  party_type?: { id: number; name: string; code: string };
  default_price_level?: PriceLevel;
  // computed
  balance?: number;
  total_purchases?: number;
}

// ── Commercial Document ───────────────────────────
export type DocumentStatusValue = 'draft' | 'validated' | 'partial' | 'paid' | 'cancelled' | 'locked';

export interface CommercialDocument {
  id: number;
  document_type_id: number;
  document_number: string;
  party_id: number | null;
  warehouse_id: number;
  fiscal_year_id: number;
  document_date: string;
  due_date: string | null;
  status: DocumentStatusValue;
  notes: string | null;
  // Amounts
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_discount: number;
  fiscal_stamp: number;
  amount_paid: number;
  amount_remaining: number;
  // Relations
  document_type?: DocumentType;
  party?: Party;
  warehouse?: Warehouse;
  lines?: CommercialDocumentLine[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface CommercialDocumentLine {
  id: number;
  commercial_document_id: number;
  product_id: number;
  description: string | null;
  quantity: number;
  unit_price_ht: number;
  discount_percentage: number;
  discount_amount: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  line_order: number;
  // Relations
  product_variant?: ProductVariant;
}

// ── Payment ───────────────────────────────────────
export interface Payment {
  id: number;
  commercial_document_id: number;
  payment_mode_id: number;
  treasury_account_id: number | null;
  amount: number;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  // Relations
  payment_mode?: PaymentMode;
  treasury_account?: TreasuryAccount;
}

// ── Stock ─────────────────────────────────────────
export interface StockMovement {
  id: number;
  product_id: number;
  warehouse_id: number;
  fiscal_year_id: number;
  stock_movement_type_id: number;
  movement_date: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_price: number;
  notes: string | null;
  // Relations
  product_variant?: ProductVariant;
  warehouse?: Warehouse;
}

// ── Expense ───────────────────────────────────────
export interface Expense {
  id: number;
  expense_category_id: number;
  party_id: number | null;
  amount: number;
  amount_paid: number;
  expense_date: string;
  due_date: string | null;
  description: string;
  status: 'unpaid' | 'partial' | 'paid';
  payment_mode_id: number | null;
  reference: string | null;
  // Relations
  expense_category?: { id: number; name: string };
  party?: Party;
}

// ── Employee ──────────────────────────────────────
export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  hire_date: string;
  active: boolean;
  // computed
  full_name?: string;
}

// ── Dashboard ─────────────────────────────────────
export interface DashboardStats {
  today_sales: number;
  month_sales: number;
  month_invoices_count: number;
  pending_invoices: number;
  new_clients_month: number;
  total_clients: number;
  low_stock_count: number;
  out_of_stock_count: number;
  month_profit: number;
  profit_margin: number;
  month_tva_collected: number;
  month_tva_deductible: number;
  tva_due: number;
  total_debts: number;
  debtors_count: number;
}

export interface SalesChartData {
  labels: string[];
  data: number[];
  min: number;
  max: number;
  average: number;
}

export interface TopProduct {
  id: number;
  name: string;
  quantity_sold: number;
  revenue: number;
  percentage: number;
}

// ── POS (Cart) ────────────────────────────────────
export interface CartItem {
  id: string;                    // unique cart item id
  product_id: number;
  product_name: string;
  variant_name: string | null;
  barcode: string | null;
  unit_symbol: string | null;
  quantity: number;
  unit_price_ht: number;
  selling_price_ttc: number;
  tva_rate: number;
  discount_percentage: number;
  discount_amount: number;
  total_ht: number;
  total_ttc: number;
  max_stock: number | null;      // null = no stock limit
}

export interface CartTotals {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_discount: number;
  fiscal_stamp: number;
  items_count: number;
  lines_count: number;
}

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  totals: CartTotals;
  client?: Party | null;
  created_at: string;
}

// ── Notification ─────────────────────────────────
export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// ── Settings ──────────────────────────────────────
export interface Setting {
  id: number;
  key: string;
  value: string | null;
  group: string | null;
  type: 'string' | 'integer' | 'boolean' | 'json';
  label: string | null;
  description: string | null;
}
