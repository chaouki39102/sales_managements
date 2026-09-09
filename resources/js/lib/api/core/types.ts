// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/types.ts
// ✅ مطابق 100% لـ DB schema وباكاند Laravel
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
  is_first_page:  boolean;
  is_last_page:   boolean;
  /** keyset (cursor) pagination — ?cursor= (اختياري، 0/غائب = لا يوجد المزيد) */
  next_cursor?:   number;
  has_more?:      boolean;
}
export interface PaginationLinks {
  first:   string | null;
  last:    string | null;
  prev:    string | null;
  next:    string | null;
  current: string | null;
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
  page?:      number;
  per_page?:  number;
  search?:    string;
  sort?:      string;
  direction?: 'asc' | 'desc';
  include?:   string;
  [key: string]: unknown;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginCredentials { email: string; password: string; }

export interface AuthResponse {
  user:       User;
  token:      string;
  token_type?: string;
  // تمييز الاتحاد: غياب token مع two_factor_required:true = تحدّي 2FA
  two_factor_required?: false;
}

export interface TwoFactorChallenge {
  two_factor_required: true;
  challenge_token:     string;
  user:                User;
}

// login يمكن أن يُرجع إما التوكن مباشرة أو تحدّي 2FA (لا توكن بعد)
export type LoginResult = AuthResponse | TwoFactorChallenge;

export interface TwoFactorConfirmPayload { challenge_token: string; code: string; }
export interface TwoFactorSetupResponse   { enabled: boolean; secret: string; qr_svg: string; otpauth_uri: string; }
export interface TwoFactorEnableResponse  { enabled: boolean; recovery_codes: string[]; }
export interface TwoFactorRecoveryResponse { recovery_codes: string[]; }

export interface User extends BaseModel {
  name:        string;
  email:       string;
  avatar?:     string | null;
  phone?:      string | null;
  company_id?: number | null;  // آخر شركة نشطة
  active:      boolean;
  roles?:      Role[];
  permissions?: string[];
  two_factor_enabled?: boolean;
}

// ─── Active Company (Zustand state only) ──────────────────────────────────────
export interface ActiveCompany {
  id:               number;
  name:             string;
  slug:             string;
  portal_slug?:     string | null;
  commercial_name?: string | null;
  address?:         string | null;
  phone?:           string | null;
  mobile?:          string | null;
  fax?:             string | null;
  email?:           string | null;
  nif?:             string | null;
  nis?:             string | null;
  rc?:              string | null;
  ai?:              string | null;
  capital_amount?:  string | null;
  bank_name?:       string | null;
  rib?:             string | null;
  activity?:        string | null;
  avatar?:          string | null;
  max_users?:       number;
  max_warehouses?:  number;
  max_products?:    number;
  trial_ends_at?:   string | null;
}

// ─── Company ──────────────────────────────────────────────────────────────────
export interface Company extends BaseModel {
  name:             string;
  commercial_name?: string | null;
  slug:             string;
  portal_slug?:     string | null;
  activity?:        string | null;
  email?:           string | null;
  phone?:           string | null;
  address?:         string | null;
  avatar?:          string | null;
  nif?:             string | null;
  nis?:             string | null;
  rc?:              string | null;
  ai?:              string | null;
  owner_id:         number;
  active:           boolean;
  plan:             'free' | 'starter' | 'professional' | 'enterprise';
  max_users:        number;
  max_products:     number;
  max_warehouses:   number;
  is_suspended:     boolean;
  is_verified:      boolean;
  trial_ends_at?:   string | null;
  owner?:           Pick<User, 'id' | 'name' | 'email'>;
}

// ─── Fiscal Year ──────────────────────────────────────────────────────────────
export interface FiscalYear extends BaseModel {
  name:          string;
  label?:        string;
  start_date:    string;
  end_date:      string;
  is_current:    boolean;
  is_closed:     boolean;
  closed_at?:    string | null;
  closed_by?:    number | null;
  closing_notes?: string | null;
  notes?:        string | null;
  company_id:    number;
  closedBy?:     Pick<User, 'id' | 'name'>;
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────
export interface Permission extends BaseModel {
  name:          string;
  display_name:  string;
  group:         string;
  description?:  string | null;
}
export interface Role extends BaseModel {
  name:          string;
  display_name:  string;
  description?:  string | null;
  company_id?:   number | null;
  permissions?:  Permission[];
}

// ─── Global Lookups ───────────────────────────────────────────────────────────
export interface Currency extends BaseModel {
  name:             string;
  code:             string;
  symbol:           string;
  decimal_places:   number;
  is_base_currency: boolean;
  active:           boolean;
  company_id:       number;
}
export interface Tva extends BaseModel {
  name:        string;
  rate:        number;
  description?: string | null;
  is_default:  boolean;
  active:      boolean;
  company_id:  number;
}
export interface LegalForm extends BaseModel {
  name: string; code?: string;
}
export interface FiscalStamp extends BaseModel {
  name: string; value: number; is_default: boolean; company_id: number;
}
export interface InventoryValuationMethod extends BaseModel {
  name: string; code: 'FIFO' | 'LIFO' | 'AVERAGE';
}
export interface Wilaya extends BaseModel {
  name: string; arabic_name: string; code: string;
}
export interface Commune extends BaseModel {
  name: string; arabic_name: string; wilaya_id: number;
}
export interface DocumentStatus extends BaseModel {
  name: string; code: string; color?: string | null; is_final: boolean;
}
export interface DocumentType extends BaseModel {
  name:                      string;
  name_latin?:               string;
  code:                      string;
  description?:              string | null;
  base_operation_id:         number;
  document_base_operation_id?: number;
  affects_stock_direction:   -1 | 0 | 1;
  requires_party:            boolean;
  affects_accounting:        boolean;
  is_printable?:             boolean;
  display_order?:            number;
  active:                    boolean;
}
export interface DocumentBaseOperation extends BaseModel {
  name: string; code: string;
}
export interface StockMovementType extends BaseModel {
  name: string; code: string; direction: 'in' | 'out';
}
export interface ProductType extends BaseModel {
  name: string; code: string; manages_stock: boolean;
}
export interface PartyType extends BaseModel {
  name: string; code: string;
}
export interface TreasuryAccountType extends BaseModel {
  name: string; code: string;
}

// ─── Tenant Lookups ───────────────────────────────────────────────────────────
export interface Unit extends BaseModel {
  name:          string;
  abbreviation:  string;
  symbol?:       string | null;
  description?:  string | null;
  active:        boolean;
  company_id:    number;
}
export interface Warehouse extends BaseModel {
  name:          string;
  code?:         string | null;
  address?:      string | null;
  wilaya_id?:    number | null;
  commune_id?:   number | null;
  manager_name?: string | null;
  phone?:        string | null;
  active:        boolean;
  is_default:    boolean;
  company_id:    number;
}
export interface PriceLevel extends BaseModel {
  name:              string;
  discount_percent:  number;
  description?:      string | null;
  is_default:        boolean;
  active:            boolean;
  company_id:        number;
}
export interface PaymentMode extends BaseModel {
  name:       string;
  code:       string;
  is_default: boolean;
  active:     boolean;
  company_id: number;
  treasury_account_id?: number | null;
  is_cash?: boolean;
  requires_reference?: boolean;
  description?: string;
  display_order?: number;
  relations?: Record<string, unknown>;
}
export interface NumberingSeries extends BaseModel {
  name:               string;
  prefix:             string;
  suffix?:            string | null;
  start_number:       number;
  last_number:        number;
  padding:            number;
  document_type_id:   number;
  fiscal_year_id?:    number | null;
  is_locked:          boolean;
  is_default:         boolean;
  company_id:         number;
}
export interface TreasuryAccount extends BaseModel {
  name:                    string;
  code:                    string;
  account_number?:         string | null;
  bank_name?:              string | null;
  is_default:              boolean;
  active:                  boolean;
  current_balance:         number;
  initial_balance:         number;
  currency_id:             number;
  treasury_account_type_id:number;
  company_id:              number;
  currency?:               Currency;
  account_type?:           TreasuryAccountType;
}
export interface ExpenseCategory extends BaseModel {
  name:        string;
  description?: string | null;
  parent_id?:  number | null;
  active:      boolean;
  company_id:  number;
  parent?:     ExpenseCategory;
  children?:   ExpenseCategory[];
}
export interface Brand extends BaseModel {
  name:         string;
  description?: string | null;
  active:       boolean;
  company_id:   number;
}
export interface Family extends BaseModel {
  name:          string;
  description?:  string | null;
  parent_id?:    number | null;
  active:        boolean;
  display_order: number;
  company_id:    number;
  parent?:       Family;
  children?:     Family[];
}

// ─── Parties ──────────────────────────────────────────────────────────────────
export interface Party extends BaseModel {
  name:                   string;
  commercial_name?:       string | null;
  code?:                  string | null;
  slug:                   string;
  party_type_id:          number;
  activity?:              string | null;
  legal_form_id?:         number | null;
  capital_amount?:        number;
  rc_date?:               string | null;
  nif?:                   string | null;
  nis?:                   string | null;
  rc?:                    string | null;
  ai?:                    string | null;
  address?:               string | null;
  wilaya_id?:             number | null;
  commune_id?:            number | null;
  phone?:                 string | null;
  mobile?:                string | null;
  fax?:                   string | null;
  email?:                 string | null;
  avatar?:                string | null;
  bank_name?:             string | null;
  rib?:                   string | null;
  initial_balance:        number;
  credit_limit:           number;
  credit_days?:           number | null;
  allow_credit_sale?:     boolean;
  default_price_level_id?:number | null;
  is_tva_exempt:          boolean;
  is_taxable?:            boolean;
  tax_option?:            string | null;
  cnas_number?:           string | null;
  tax_regime?:            string | null;
  is_final_consumer?:     boolean;
  is_vat_registered?:     boolean;
  vat_registration_date?: string | null;
  additional_data?:       any;
  active:                    boolean;
  company_id:                number;
  default_selling_price_ht?: number;
  // Relations
  party_type?:            PartyType;
  legal_form?:            LegalForm;
  commune?:               Commune;
  wilaya?:                Wilaya;
  default_price_level?:   PriceLevel;
  // Computed
  balance?:               number;
  total_purchases?:       number;
  total_sales?:           number;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface ProductVariantPrice extends BaseModel {
  product_variant_id: number;
  price_level_id:     number;
  price:              number;
  valid_from?:        string | null;
  valid_to?:          string | null;
  active:             boolean;
  price_level?:       PriceLevel;
}

export interface QuantityDiscount extends BaseModel {
  product_id:          number;
  price_level_id:      number;
  min_qty:             number;
  max_qty?:            number | null;
  discount_amount?:    number | null;
  discount_percentage?:number | null;
  is_blocked?:         boolean;
  tier_order:          number;
  active:              boolean;
}

export interface ProductLot extends BaseModel {
  product_id:            number;
  warehouse_id:          number;
  lot_number:            string;
  supplier_lot_number?:  string | null;
  manufacturing_date?:   string | null;
  expiration_date?:      string | null;
  purchase_date?:        string | null;
  purchase_price?:       number | null;
  legal_selling_price?:  number | null;
  margin_percentage?:    number | null;
  original_quantity:     number;
  remaining_quantity:    number;
  stock_movement_id?:    number | null;
  is_depleted?:          boolean;
  total_cost?:           number | null;
  remaining_value?:      number | null;
  active:                boolean;
  company_id:            number;
  product?:              { id: number; name: string; ref?: string };
  warehouse?:            { id: number; name: string };
}

export interface ProductVariant extends BaseModel {
  product_id:                number;
  ref:                       string;
  barcode?:                  string | null;
  variant_name?:             string | null;
  unit_id?:                  number | null;
  tva_id?:                   number | null;
  valuation_method_id?:      number | null;
  weight?:                   number | null;
  volume?:                   number | null;
  length?:                   number | null;
  width?:                    number | null;
  height?:                   number | null;
  variant_attributes?:       Record<string, string>;
  last_purchase_price:       number;
  average_cost_price:        number;
  default_selling_price_ht:  number;
  manages_stock:             boolean;
  allow_negative_stock:      boolean;
  has_lots:                  boolean;
  has_expiration_date:       boolean;
  min_stock_alert:           number;
  max_stock_alert?:          number | null;
  manages_quantity_discounts:boolean;
  active:                    boolean;
  is_sold_by_weight?:        boolean;
  company_id:                number;
  // Relations
  product?:            Product;
  unit?:               Unit;
  tva?:                Tva;
  prices?:             ProductVariantPrice[];
  quantity_discounts?: QuantityDiscount[];
  lots?:               ProductLot[];
  packagings?:         ProductPackaging[];
  barcodes?:           Barcode[];
  // Computed
  current_stock?:      number;
  image_url?:          string | null;
  selling_price_ttc?:  number;
}

export interface Product extends BaseModel {
  name:                      string;
  slug:                      string;
  ref?:                      string | null;
  barcode?:                  string | null;
  description?:              string | null;
  family_id?:                number | null;
  brand_id?:                 number | null;
  product_type_id?:          number | null;
  tva_id?:                   number | null;
  unit_id?:                  number | null;
  purchase_price_ht?:        number;
  current_cost_price?:       number;
  min_margin_percentage?:    number;
  manages_stock:             boolean;
  allow_negative_stock:      boolean;
  has_lots:                  boolean;
  has_expiration_date:       boolean;
  min_stock_alert?:          number;
  max_stock_alert?:          number | null;
  manages_quantity_discounts:boolean;
  is_sold_by_weight?:        boolean;
  is_subsidized?:            boolean;
  regulated_product_config_id?: number | null;
  weight?:                   number;
  volume?:                   number;
  length?:                   number;
  width?:                    number;
  height?:                   number;
  valuation_method_id?:      number | null;
  specifications?:           Record<string, string> | null;
  images?:                   string[] | null;
  default_image?:            string | null;
  meta_title?:               string | null;
  meta_description?:         string | null;
  meta_keywords?:            string[] | null;
  active:                    boolean;
  company_id:                number;
  // Computed accessors (backend-generated)
  current_stock?:            number;
  is_low_stock?:             boolean;
  default_selling_price_ht?: number;
  // Relations
  family?:       Family;
  brand?:        Brand;
  productType?:  ProductType;
  tva?:          Tva;
  unit?:         Unit;
  variants?:     ProductVariant[];
  packagings?:   ProductPackaging[];
  prices?:       ProductPrice[];
  barcodes?:     Barcode[];
}

export interface ProductPackaging {
  id:             number;
  company_id:     number;
  product_id:     number;
  code:           string;
  label:          string;
  quantity:       number;
  barcode?:       string | null;
  is_default:     boolean;
  active:         boolean;
  display_order:  number;
}

export interface ProductPrice {
  id:              number;
  price_level_id:  number;
  pricing_method:  'fixed' | 'rate' | 'margin';
  price:           number | null;
  rate:            number | null;
  margin:          number | null;
  active:          boolean;
  price_level?:    PriceLevel;
}

export interface Barcode {
  id:          number;
  company_id:  number;
  product_id:  number;
  variant_id?: number | null;
  barcode:     string;
  type:        string;
  is_primary:  boolean;
  unit?:       string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Commercial Documents ─────────────────────────────────────────────────────
export type DocumentStatusCode =
  | 'draft' | 'validated' | 'partial' | 'paid' | 'cancelled' | 'locked';

export interface CommercialDocumentLine extends BaseModel {
  commercial_document_id: number;
  product_id?:            number | null;
  product_variant_id?:    number | null;
  packaging_id?:          number | null;
  description?:           string | null;
  quantity:               number;
  unit_price_ht:          number;
  discount_percentage:    number;
  discount_amount:        number;
  discount_amount_per_unit?: number | null;
  total_discount_amount?: number;
  tva_rate:               number;
  total_ht:               number;
  total_tva:              number;
  total_ttc:              number;
  returned_quantity:      number;
  packaging_units_snapshot?: number | null;
  line_order:             number;
  // Relations
  product?:         Product;
  product_variant?: ProductVariant;
  packaging?:       ProductPackaging;
}

export interface CommercialDocument extends BaseModel {
  // ✅ أسماء الحقول من DB مباشرة
  document_type_id:   number;
  document_number:    string;
  party_id?:          number | null;
  warehouse_id:       number;
  fiscal_year_id:     number;
  pos_session_id?:    number | null;
  source_document_id?:         number | null;
  cancellation_of_document_id?: number | null;
  document_date:      string;
  due_date?:          string | null;
  status:             DocumentStatusCode;
  notes?:             string | null;
  // Amounts
  total_ht:           number;
  total_tva:          number;
  total_ttc:          number;
  total_discount:     number;
  total_stamp?:       number;
  net_to_pay?:        number;
  fiscal_stamp:       number;
  paid_amount:        number;
  remaining_amount:   number;
  currency_id?:       number | null;
  is_locked:          boolean;
  company_id:         number;
  validated_at?:      string | null;
  // Relations
  document_type?:   DocumentType;
  document_status?: { id: number; name: string };
  party?:           Party;
  warehouse?:       Warehouse;
  fiscal_year?:     FiscalYear;
  lines?:           CommercialDocumentLine[];
  payments?:        Payment[];
  validatedBy?:     User;
  user?:            User;
  createdBy?:       User;
  updatedBy?:       User;
  /** SSOT balance computed by backend */
  balance_data?: {
    previous_balance: number;
    invoice_total:    number;
    paid_amount:      number;
    remaining:        number;
    change:           number;
    new_balance:      number;
  } | null;
}

// ─── Document Audit Log ─────────────────────────────────────────────────────────
export type DocumentAuditAction =
  | 'created' | 'updated' | 'line_added' | 'line_removed' | 'line_modified'
  | 'price_changed' | 'discount_changed' | 'status_changed' | 'locked' | 'unlocked'
  | 'cancelled' | 'deleted' | 'payment_added' | 'payment_removed' | 'converted'
  | 'returned' | 'cloned' | 'stock_override';

export interface DocumentAuditValueRow {
  key:   string;
  label: string;
  value: string;
}

export interface DocumentAuditLogEntry {
  id:                 number;
  document_id:        number;
  company_id:         number;
  user_id?:           number | null;
  user?:              User | null;
  user_label?:        string | null;
  company_name?:      string | null;
  document?:          { id: number; document_number: string | null; display_label: string } | null;
  document_label?:    string | null;
  action:             DocumentAuditAction;
  action_label?:      string | null;
  action_summary?:    string | null;
  field_name?:        string | null;
  field_label?:       string | null;
  old_value?:         unknown;
  new_value?:         unknown;
  humanized_old_value?: unknown;
  humanized_new_value?: unknown;
  ip_address?:        string | null;
  user_agent?:        string | null;
  created_at:         string;
  updated_at:         string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Payment extends BaseModel {
  payment_mode_id:        number;
  treasury_account_id?:   number | null;
  direction?:             'in' | 'out';
  amount:                 number;
  total_applied?:         number | null;
  unapplied_amount?:      number | null;
  payment_date:           string;
  reference?:             string | null;
  notes?:                 string | null;
  client_ref?:            string | null;
  status:                 PaymentStatus;
  company_id:             number;
  fiscal_year_id:         number;
  // Relations
  payment_mode?:      PaymentMode;
  treasury_account?:  TreasuryAccount;
  document?:          CommercialDocument;
}

// ─── Checks ───────────────────────────────────────────────────────────────────
export type CheckStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled';
export interface Check extends BaseModel {
  commercial_document_id: number;
  party_id:               number;
  amount:                 number;
  check_number:           string;
  check_date:             string;
  bank_name?:             string | null;
  status:                 CheckStatus;
  notes?:                 string | null;
  company_id:             number;
  party?:                 Party;
}

// ─── Stock Movements ──────────────────────────────────────────────────────────
export interface StockMovement extends BaseModel {
  product_variant_id:       number;
  warehouse_id:             number;
  fiscal_year_id:           number;
  stock_movement_type_id:   number;
  commercial_document_id?:  number | null;
  movement_date:            string;
  quantity:                 number;
  unit_price:               number;
  cost_price:               number;
  total_price:              number;
  notes?:                   string | null;
  company_id:               number;
  product_variant?:         ProductVariant;
  warehouse?:               Warehouse;
  movement_type?:           StockMovementType;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export type ExpenseStatus = 'unpaid' | 'partial' | 'paid';
export interface Expense extends BaseModel {
  expense_category_id: number;
  party_id?:           number | null;
  amount:              number;
  amount_paid:         number;
  expense_date:        string;
  due_date?:           string | null;
  description:         string;
  status:              ExpenseStatus;
  payment_mode_id?:    number | null;
  reference?:          string | null;
  fiscal_year_id:      number;
  company_id:          number;
  expense_category?:   ExpenseCategory;
  party?:              Party;
}

// ─── Employees ────────────────────────────────────────────────────────────────
export interface Employee extends BaseModel {
  first_name:  string;
  last_name:   string;
  email?:      string | null;
  phone?:      string | null;
  position?:   string | null;
  department?: string | null;
  hire_date:   string;
  active:      boolean;
  company_id:  number;
  full_name?:  string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  today_sales:          number;
  today_invoices_count: number;
  month_sales:          number;
  month_invoices_count: number;
  pending_invoices:     number;
  customers_count:      number;
  suppliers_count:      number;
  products_count:       number;
  new_customers_month:  number;
  low_stock_count:      number;
  out_of_stock_count:   number;
  month_profit:         number;
  profit_margin:        number;
  month_tva_collected:  number;
  month_tva_deductible: number;
  tva_due:              number;
  total_debts:          number;
  debtors_count:        number;
  purchases_this_month: number;
}

// ─── POS (Cart) ───────────────────────────────────────────────────────────────
export interface CartItem {
  id:                  string;   // unique cart item id (uuid)
  product_id:          number;
  variant_id:          number;
  product_name:        string;
  variant_name?:       string | null;
  ref:                 string;
  barcode?:            string | null;
  unit_symbol?:        string | null;
  image_url?:          string | null;
  quantity:            number;
  unit_price_ht:       number;
  selling_price_ttc:   number;
  tva_rate:            number;
  tva_id?:             number | null;
  discount_percentage: number;
  discount_amount:     number;
  discount_mode?:      'percentage' | 'fixed_amount';
  total_ht:            number;
  total_ttc:           number;
  max_stock?:          number | null;
  manages_stock:       boolean;
  is_sold_by_weight:   boolean;
  packaging_id?:       number | null;
  pack_qty?:           number;
  packaging_label?:    string | null;
  base_price_ht?:      number;
  available_packagings?: ProductPackaging[];
  quantity_discounts?: QuantityDiscount[];
}
export interface CartTotals {
  total_ht:       number;
  total_tva:      number;
  total_ttc:      number;
  total_discount: number;
  fiscal_stamp:   number;
  items_count:    number;
  lines_count:    number;
  invoice_discount_pct?:    number;
  invoice_discount_amount?: number;
}
export interface HeldCart {
  id:        string;
  label:     string;
  items:     CartItem[];
  totals:    CartTotals;
  client?:   Party | null;
  created_at:string;
  // Provenance: when this cart was held while an existing document was being
  // edited, keep the document identity so a restore→pay flow UPDATES the same
  // document (PUT) instead of silently creating a new one (POST).
  documentId?:    number | null;
  documentNumber?: string | null;
  documentDate?:  string | null;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface Setting extends BaseModel {
  key:          string;
  value:        string | null;
  group?:       string | null;
  type:         'string' | 'integer' | 'boolean' | 'json';
  label?:       string | null;
  description?: string | null;
  company_id:   number;
}

// ─── Seeds ────────────────────────────────────────────────────────────────────
export type SeedKey =
  | 'currencies' | 'tvas' | 'units' | 'legal-forms' | 'fiscal-stamps'
  | 'price-levels' | 'party-types' | 'product-types' | 'stock-movement-types'
  | 'treasury-account-types' | 'document-base-operations' | 'document-statuses'
  | 'document-types' | 'document-type-conversions' | 'inventory-valuation-methods' | 'warehouses'
  | 'treasury-accounts' | 'payment-modes' | 'expense-categories'
  | 'numbering-series' | 'wilayas-communes';

export interface SeedResult {
  key:     SeedKey;
  success: boolean;
  message: string;
}

export interface Gender        extends BaseModel { name: string; code?: string; }
export interface ExchangeRate  extends BaseModel {
  currency_id: number; rate: number; date: string;
  currency?: Currency; company_id: number;
}

// ─── Company Members ──────────────────────────────────────────────────────────

export type CompanyMemberRole =
  | 'owner'
  | 'admin'
  | 'accountant'
  | 'cashier'
  | 'warehouseman'
  | 'viewer'
  | 'member';

export interface CompanyMember extends BaseModel {
  user_id:    number;
  company_id: number;
  role:       CompanyMemberRole;
  active:     boolean;
  user?: {
    id:    number;
    name:  string;
    email: string;
  };
}

export interface PartyBalance {
  party_id:          number;
  date:              string;
  fiscal_year_id:    number;
  opening_balance:   number;
  documents_balance: number;
  payments_total:    number;
  current_balance:   number;
  balance_type:      'debit' | 'credit';
  party?: {
    id:   number;
    name: string;
    party_type?: { name: string };
  };
}

export interface PartyTransaction {
  type:            'document' | 'payment';
  id:              number;
  seq:             number;
  date:            string;
  datetime:        string | null;
  reference:       string;
  label:           string;
  type_code:       string | null;
  document_amount: number;
  payment_amount:  number;
  remaining:       number;
  doc_cost_ht:     number;
  margin_value:    number;
}

export interface PartyBalanceHistory {
  opening_balance: number;
  transactions:    PartyTransaction[];
}

export interface DetailedLine {
  product_name:  string;
  product_ref:   string;
  unit_name:     string;
  quantity:      number;
  unit_price_ht: number;
  discount_pct:  number;
  total_ht:      number;
  total_tva:     number;
  total_ttc:     number;
  tva_rate:      number;
  cost_price_ht: number;
  line_cost_ht:  number;
  line_margin:   number;
}

export interface DetailedTransaction extends PartyTransaction {
  lines: DetailedLine[];
}

export interface DetailedBalanceHistory {
  opening_balance: number;
  transactions:    DetailedTransaction[];
}

export interface ProductRecapItem {
  product_id:          number;
  product_name:        string;
  product_ref:         string;
  unit_name:           string;
  brand_name:          string;
  family_name:         string;
  sale_qty:            number;
  sale_ht:             number;
  sale_ttc:            number;
  purchase_qty:        number;
  purchase_ht:         number;
  purchase_ttc:        number;
  total_qty:           number;
  total_ht:            number;
  total_ttc:           number;
  total_tva:           number;
  total_discount:      number;
  doc_count:           number;
  effective_cost_price: number;
  cost_ht:             number;
  margin_value:        number;
  margin_pct:          number;
}

export interface ProductRecapSummary {
  product_count:      number;
  total_sale_ht:      number;
  total_sale_ttc:     number;
  total_purchase_ht:  number;
  total_purchase_ttc: number;
  total_cost_ht:      number;
  total_margin_value: number;
  total_margin_pct:   number;
}

export interface ProductRecapResponse {
  products: ProductRecapItem[];
  summary:  ProductRecapSummary;
}
