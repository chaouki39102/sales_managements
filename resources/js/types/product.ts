// types/product.ts
export interface Family { id: number; name: string; }
export interface Brand { id: number; name: string; }
export interface ProductType { id: number; name: string; label: string; manages_stock: boolean; }
export interface Unit { id: number; name: string; symbol: string; }
export interface TvaRate { id: number; rate: number; is_default?: boolean; }
export interface PriceLevel { id: number; name: string; }
export interface InventoryValuationMethod { id: number; name: string; method: 'FIFO' | 'LIFO' | 'AVERAGE'; }
export interface Warehouse { id: number; name: string; }
export interface ProductVariantPrice { price_level_id: number; price: number | null; valid_from?: string | null; valid_to?: string | null; active: boolean; }
export interface QuantityDiscount { id: number; price_level_id: number; min_qty: number; max_qty?: number | null; discount_amount?: number | null; discount_percentage?: number | null; is_blocked?: boolean; tier_order: number; active: boolean; }
export interface ProductLot { lot_number: string; supplier_lot_number?: string | null; warehouse_id: number | null; manufacturing_date?: string | null; expiration_date?: string | null; purchase_date?: string | null; purchase_price: number | null; legal_selling_price?: number | null; margin_percentage?: number | null; original_quantity: number; remaining_quantity?: number; active?: boolean; }
export interface ProductVariant {
  id?: number; ref: string; barcode?: string | null; variant_name?: string | null;
  unit_id: number | null; tva_id: number | null;
  weight?: number | null; volume?: number | null; length?: number | null; width?: number | null; height?: number | null;
  variant_attributes?: Record<string, string>;
  default_selling_price_ht: number; last_purchase_price?: number | null; average_cost_price?: number | null;
  manages_stock: boolean; allow_negative_stock: boolean; has_lots: boolean; has_expiration_date: boolean;
  min_stock_alert?: number | null; max_stock_alert?: number | null; manages_quantity_discounts: boolean;
  valuation_method_id?: number | null; active: boolean;
  prices: ProductVariantPrice[]; quantity_discounts: QuantityDiscount[]; lots?: ProductLot[];
}
export interface Product {
  id: number; name: string; slug: string; description?: string | null;
  family_id?: number | null; brand_id?: number | null; product_type_id?: number | null;
  specifications?: Record<string, string>; images?: string[] | null;
  meta_title?: string | null; meta_description?: string | null; meta_keywords?: string[] | null; active: boolean;
  variants?: ProductVariant[];
  family?: Family; brand?: Brand; productType?: ProductType;
}
