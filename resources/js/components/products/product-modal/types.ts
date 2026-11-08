// Types for ProductModal
import type { Product } from '@/lib/api/core/types';

export interface TvaRate         { id: number; rate: number; is_default?: boolean; }
export interface ValuationMethod { id: number; name: string; method?: string; }

export interface ProductPrice {
  price_level_id:  number;
  pricing_method:  'fixed' | 'rate' | 'margin';
  price:           number | null | '';
  rate:            number | null | '';
  margin:          number | null | '';
  active:          boolean;
}

export interface ProductPackaging {
  id?:           number;
  code:          string;
  label:         string;
  quantity:      number | '';
  barcode:       string;
  is_default:    boolean;
  active:        boolean;
  display_order: number;
}

export interface QuantityDiscount {
  id?:                  number;
  price_level_id:       number;
  min_qty:              number | '';
  max_qty:              number | null | '';
  discount_amount:      number | null | '';
  discount_percentage:  number | null | '';
  tier_order:           number;
  is_blocked:           boolean;
  active:               boolean;
}

export interface ProductForm {
  // ── الأساسيات ──
  name:               string;
  slug:               string;
  ref:                string;
  barcode:            string;
  description:        string;
  family_id:          number | null;
  brand_id:           number | null;
  product_type_id:    number | null;
  tva_id:             number | null;
  unit_id:            number | null;
  // ── الأسعار ──
  purchase_price_ht:      number | '';
  current_cost_price:     number | '';
  min_margin_percentage:  number | null | '';
  prices:             ProductPrice[];
  // ── التعبئة ──
  packagings:         ProductPackaging[];
  // ── المخزون ──
  manages_stock:          boolean;
  allow_negative_stock:   boolean;
  has_lots:               boolean;
  has_expiration_date:    boolean;
  min_stock_alert:        number | '';
  max_stock_alert:        number | '';
  manages_quantity_discounts: boolean;
  valuation_method_id:    number | null;
  // ── الخصومات ──
  quantity_discounts:     QuantityDiscount[];
  // ── الأبعاد ──
  weight:   number | null | '';
  volume:   number | null | '';
  length:   number | null | '';
  width:    number | null | '';
  height:   number | null | '';
  specifications: Record<string, string>;
  // ── SEO ──
  meta_title:       string;
  meta_description: string;
  meta_keywords:    string[];
  // ── الصور ──
  images:  string[];
  default_image: string | null;
  // ── الوزن ──
  is_sold_by_weight:       boolean;
  // ── الدعم (المواد المدعمة) ──
  is_subsidized:           boolean;
  regulated_product_config_id: number | null;
  // ── عام ──
  active:  boolean;
}

export interface ProductModalProps {
  open:       boolean;
  product?:   Product | null;
  onClose:    () => void;
  onSaved:    (product: Product) => void;
}
