import type { Product, ProductVariant, ProductVariantPrice, PriceLevel } from '@/types';

type ProductApiResponse = Product & { current_stock?: number; prices?: ProductVariantPrice[] };

export type ViewMode = 'grid' | 'list';
export type GridSize = 'xs' | 'sm' | 'md' | 'lg';
export type SortMode = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'family';
export type ActiveModal = 'none' | 'payment' | 'held' | 'receipt' | 'manual' | 'kbhelp' | 'session' | 'barcode' | 'customer';

export interface QuickItem { variantId: number; name: string; priceHt: number; tvaRate: number; }

export function getVariantPrice(
  v: ProductVariant,
  priceLevelId: number | null,
  priceLevels: PriceLevel[],
): number {
  if (priceLevelId) {
    const priceEntry = v.prices?.find((p: ProductVariantPrice) => p.price_level_id === priceLevelId);
    if (priceEntry) return priceEntry.price;
    const pl = priceLevels.find(p => p.id === priceLevelId);
    if (pl?.discount_percent)
      return v.default_selling_price_ht * (1 - pl.discount_percent / 100);
  }
  return v.default_selling_price_ht;
}

export function productToVariant(p: Product): ProductVariant {
  return {
    id:                         p.id,
    product_id:                 p.id,
    ref:                        p.ref ?? '',
    barcode:                    p.barcode,
    variant_name:               '',
    unit_id:                    p.unit_id,
    tva_id:                     p.tva_id,
    last_purchase_price:        p.purchase_price_ht ?? 0,
    average_cost_price:         p.current_cost_price ?? 0,
    default_selling_price_ht:   p.default_selling_price_ht ?? (p.purchase_price_ht ? p.purchase_price_ht * 1.3 : 0),
    manages_stock:              p.manages_stock,
    allow_negative_stock:       p.allow_negative_stock,
    has_lots:                   p.has_lots,
    has_expiration_date:        p.has_expiration_date,
    min_stock_alert:            p.min_stock_alert ?? 0,
    max_stock_alert:            p.max_stock_alert,
    manages_quantity_discounts: p.manages_quantity_discounts,
    valuation_method_id:        p.valuation_method_id,
    weight:                     p.weight,
    volume:                     p.volume,
    current_stock:              (p as ProductApiResponse).current_stock,
    active:                     p.active,
    company_id:                 p.company_id,
    product:                    p,
    unit:                       p.unit,
    tva:                        p.tva,
    prices:                     (p as ProductApiResponse).prices,
    created_at:                 p.created_at,
    updated_at:                 p.updated_at,
  } as ProductVariant;
}

export function makeFakeVariant(name: string, priceHt: number, tvaRate: number): ProductVariant {
  return {
    id:                         Date.now(),
    product_id:                 0,
    ref:                        '',
    barcode:                    null,
    variant_name:               null,
    unit_id:                    null,
    tva_id:                     null,
    valuation_method_id:        null,
    weight:                     null, volume: null,
    last_purchase_price:        0,
    average_cost_price:         0,
    default_selling_price_ht:   priceHt,
    manages_stock:              false,
    allow_negative_stock:       true,
    has_lots:                   false,
    has_expiration_date:        false,
    manages_quantity_discounts: false,
    min_stock_alert:            0,
    max_stock_alert:            null,
    active:                     true,
    company_id:                 0,
    created_at:                 new Date().toISOString(),
    updated_at:                 new Date().toISOString(),
    product: {
      id: 0, name, slug: '', active: true, manages_stock: false,
      allow_negative_stock: true, has_lots: false, has_expiration_date: false,
      manages_quantity_discounts: false, company_id: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
    tva: {
      id: 0, name: `TVA ${tvaRate}%`, rate: tvaRate, description: null,
      is_default: false, active: true, company_id: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  } as ProductVariant;
}

const POS_PAGE_SIZE_KEY = 'pos_page_size';

export function getPosPageSize(): number {
  try {
    const v = localStorage.getItem(POS_PAGE_SIZE_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (n >= 20 && n <= 500) return n;
    }
  } catch { /* localStorage not available */ }
  return 120;
}

export function setPosPageSize(n: number): void {
  try {
    localStorage.setItem(POS_PAGE_SIZE_KEY, String(n));
  } catch { /* localStorage not available */ }
}

export function familyIcon(name: string): string {
  const f = name.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل') || f.includes('طعام')) return 'ti-apple';
  if (f.includes('شراب') || f.includes('ماء') || f.includes('عصير')) return 'ti-droplets';
  if (f.includes('إلكترون') || f.includes('تقن')) return 'ti-device-laptop';
  if (f.includes('ملابس')) return 'ti-shirt';
  if (f.includes('صيانة') || f.includes('إصلاح')) return 'ti-tool';
  if (f.includes('دواء') || f.includes('صحة')) return 'ti-pill';
  if (f.includes('مكتب') || f.includes('قرطاسية')) return 'ti-briefcase';
  if (f.includes('سيارة') || f.includes('مركبة')) return 'ti-car';
  return 'ti-package';
}

export function familyStyleFromName(family: string): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل')) return { icon: 'ti-apple',         color: 'var(--em)',    bg: 'var(--emb)'  };
  if (f.includes('شراب') || f.includes('ماء')) return { icon: 'ti-droplets',     color: 'var(--blue)',  bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                   return { icon: 'ti-device-mobile', color: 'var(--blue)',  bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                     return { icon: 'ti-shirt',         color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                     return { icon: 'ti-tool',          color: 'var(--orange)', bg: 'var(--orb)'   };
  if (f.includes('دواء'))                      return { icon: 'ti-pill',          color: 'var(--red)',   bg: 'var(--redb)'  };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
