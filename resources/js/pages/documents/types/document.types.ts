// ════════════════════════════════════════════════════════════════════════════
// pages/documents/types/document.types.ts
//
// مصدر الحقيقة الوحيد لأنواع بيانات وحدة المستندات التجارية.
// ════════════════════════════════════════════════════════════════════════════

// ─── Document operation constants ────────────────────────────────────────────

export const PURCHASE_CODES  = new Set(['DDP', 'BCF', 'BR', 'FA', 'AA']);
export const STOCK_IN_CODES  = new Set(['FA', 'BR', 'AV']);
export const STOCK_OUT_CODES = new Set(['FV', 'BL', 'AA']);
export const REQUIRES_PARTY  = new Set(['DEV', 'BCC', 'BL', 'FV', 'AV', 'DDP', 'BCF', 'BR', 'FA', 'AA']);
export const SALE_CODES      = new Set(['FV', 'BL', 'DEV', 'BCC', 'AV']);
export const SHIPPING_CODES  = new Set(['BL', 'BCC']);

/** خريطة التحويلات المسموح بها (من → إلى[]) */
export const CONVERSION_MAP: Record<string, string[]> = {
  DEV: ['BCC', 'BL', 'FV'],
  BCC: ['BL', 'FV'],
  BL:  ['FV'],
  FV:  ['AV'],              // فاتورة مبيعات → إشعار دائن
  AV:  ['FV'],              // إشعار دائن → فاتورة مبيعات (عكس)
  DDP: ['BCF'],
  BCF: ['BR', 'FA'],
  BR:  ['FA'],
  FA:  ['AA'],              // فاتورة مشتريات → إشعار مدين
  AA:  ['FA'],              // إشعار مدين → فاتورة مشتريات (عكس)
};

/** أنواع تدعم إنشاء مرتجع */
export const RETURNABLE_CODES = new Set(['FV', 'FA', 'BL', 'BR']);

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Packaging {
  id:          number;
  code:        string;
  label:       string;
  quantity:    number;
  is_default:  boolean;
  barcode?:    string | null;
}

export interface ProductLot {
  id:                   number;
  lot_number:           string;
  expiration_date?:     string | null;
  remaining_quantity:   number;
  purchase_price?:      number | null;
  legal_selling_price?: number | null;
}

export interface ProductPrice {
  id:               number;
  price_level_id:   number;
  price_level?:     { id: number; name: string };
  pricing_method:   'fixed' | 'rate' | 'margin';
  price?:           number;
  rate?:            number;
  margin?:          number;
  active:           boolean;
}

export interface QuantityDiscount {
  id:                   number;
  price_level_id:       number;
  min_qty:              number;
  max_qty?:             number | null;
  discount_amount?:     number | null;
  discount_percentage?: number | null;
  active:               boolean;
  is_blocked?:          boolean;
  tier_order?:          number;
}

export interface Product {
  id:                         number;
  name:                       string;
  ref?:                       string | null;
  barcode?:                   string | null;
  purchase_price_ht?:         number | string | null;
  current_cost_price?:        number | string | null;
  default_selling_price_ht?:  number | string | null;
  family?:                    { id: number; name: string } | null;
  brand?:                     { id: number; name: string } | null;
  tva?:                       { id: number; rate: number; is_default?: boolean } | null;
  unit?:                      { id: number; symbol: string; name: string } | null;
  packagings?:                Packaging[];
  prices?:                    ProductPrice[];
  quantityDiscounts?:         QuantityDiscount[];
  lots?:                      ProductLot[];
  manages_stock?:             boolean;
  manages_quantity_discounts?: boolean;
  has_lots?:                  boolean;
  has_expiration_date?:      boolean;
  active?:                    boolean;
  stock_quantity?:            number | null;
  allow_negative_stock?:      boolean;
  min_stock_alert?:          number | null;
}

// ─── Party ────────────────────────────────────────────────────────────────────

export interface Party {
  id:                      number;
  name:                    string;
  code?:                   string | null;
  phone?:                  string | null;
  email?:                  string | null;
  balance?:                number | null;
  default_price_level_id?: number | null;
  default_price_level?:    { id: number; name: string } | null;
  credit_limit?:           number | null;
  credit_days?:            number | null;
  is_tva_exempt?:          boolean;
  is_final_consumer?:      boolean;
  is_vat_registered?:      boolean;
}

// ─── Shipping Info ──────────────────────────────────────────────────────────────

export interface ShippingInfo {
  address?:       string;
  transport_mode?: string;
  driver_name?:   string;
  vehicle_plate?: string;
  driver_notes?:  string;
}

// ─── Payment Term ──────────────────────────────────────────────────────────────

export interface PaymentTerm {
  due_date:    string;
  percentage:  number;
  amount:      number;
  notes?:      string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentMode {
  id:                    number;
  name:                  string;
  code?:                 string | null;
  icon?:                 string | null;
  treasury_account_id?:  number | null;
  requires_reference?:   boolean;
  is_cash?:              boolean;
}

export interface PaymentEntry {
  id?:                  number;
  payment_mode_id:      string;
  amount:               string;
  reference?:           string;
  notes?:               string;
  client_ref?:          string;
  payment_date:         string;
  treasury_account_id?: string | number;
  check_number?:        string;
  check_bank?:          string;
  check_due_date?:      string;
  /** internal frontend-only ref for idempotency — translated to client_ref at API boundary */
  _clientRef?:          string;
}

// ─── Treasury Account ─────────────────────────────────────────────────────────

export interface TreasuryAccount {
  id:              number;
  code:            string;
  name:            string;
  type:            'bank' | 'cash' | 'check';
  balance:         number;
  is_active:       boolean;
  bank_name?:      string | null;
  account_number?: string | null;
}

// ─── Line ─────────────────────────────────────────────────────────────────────

export type DiscountMode = 'percent' | 'fixed';

export interface LineItem {
  id?:                    number;
  product_id:             string;
  description:            string;
  quantity:               number;
  unit_price_ht:          number;
  /** سعر التعبئة = unit_price_ht × packQty */
  price_per_pack:         number;
  discount_mode:          DiscountMode;
  discount_percentage:    number;
  discount_amount_fixed:  number;
  tva_rate:               number;
  packaging_id:           string;
  stock_lot_id:           string;
  lot_number_new?:        string;
  warehouse_id?:          string;
  line_note?:             string;
  _product?:              Product;
  _packQty:               number;
  _warnings?:             Array<{ type: string; level: string; message: string }>;
  _computing?:            boolean;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface DocumentFormState {
  party_id:       string;
  document_date:  string;
  due_date:       string;
  delivery_date:  string;
  notes:          string;
  internal_notes: string;
  warehouse_id:   string;
  fiscal_year_id: string;
  currency_id:    string;
  exchange_rate:  string;
  apply_stamp:    boolean;
  price_level_id: string;
  lines:          LineItem[];
  payments:       PaymentEntry[];
  shipping_info:  ShippingInfo;
  payment_terms:  PaymentTerm[];
}

// ─── Totals ───────────────────────────────────────────────────────────────────

export interface DocumentTotals {
  gross:       number;
  ht:          number;
  tva:         number;
  ttc:         number;
  discount:    number;
  stamp:       number;
  netToPay:    number;
  totalPaid:   number;
  remaining:   number;
}

// ─── Document Status ──────────────────────────────────────────────────────────

export interface DocumentStatus {
  id:     number;
  name:   string;
  label:  string;
  color:  string;
  active: boolean;
}

// ─── Column config ────────────────────────────────────────────────────────────

export const ALL_COLUMNS = [
  { key: 'idx',        label: '#',              w: 34,  fixed: true  },
  { key: 'product',    label: 'المنتج',          w: 220, fixed: true  },
  { key: 'packaging',  label: 'التعبئة',         w: 110, fixed: false },
  { key: 'lot',        label: 'الحصة',             w: 120, fixed: false },
  { key: 'warehouse',  label: 'المستودع',        w: 100, fixed: false },
  { key: 'quantity',   label: 'الكمية',          w: 75,  fixed: true  },
  { key: 'unit',       label: 'الوحدة',          w: 60,  fixed: false },
  { key: 'unit_price', label: 'سعر الوحدة HT',  w: 110, fixed: false },
  { key: 'pack_price', label: 'سعر التعبئة',    w: 100, fixed: false },
  { key: 'orig_price', label: 'السعر الأصلي',   w: 100, fixed: false },
  { key: 'discount',   label: 'الخصم',           w: 110, fixed: false },
  { key: 'price_after',label: 'بعد الخصم HT',   w: 100, fixed: false },
  { key: 'tva',        label: 'TVA %',           w: 68,  fixed: false },
  { key: 'total_ht',   label: 'إجمالي HT',      w: 100, fixed: false },
  { key: 'total_ttc',  label: 'إجمالي TTC',     w: 110, fixed: true  },
  { key: 'cost',       label: 'التكلفة',         w: 100, fixed: false },
  { key: 'margin',     label: 'الهامش',         w: 110, fixed: false },
  { key: 'line_note',  label: 'ملاحظة',          w: 100, fixed: false },
  { key: 'actions',    label: '',                w: 36,  fixed: true  },
] as const;

export type ColKey = (typeof ALL_COLUMNS)[number]['key'];

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'مسودة',        color: 'var(--t4)',     bg: 'var(--bg3)' },
  pending:        { label: 'قيد الانتظار', color: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)' },
  validated:      { label: 'معتمد',         color: 'var(--blue)',   bg: 'color-mix(in srgb, var(--blue) 12%, transparent)'   },
  partially_paid: { label: 'مدفوع جزئياً', color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 12%, transparent)' },
  paid:           { label: 'مدفوع',         color: 'var(--em)',     bg: 'color-mix(in srgb, var(--em) 12%, transparent)'     },
  overdue:        { label: 'متأخر',         color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 12%, transparent)'    },
  cancelled:      { label: 'ملغي',          color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 8%, transparent)'     },
  returned:       { label: 'مرتجع',         color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 10%, transparent)' },
};
