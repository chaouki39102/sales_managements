// Pure helpers for ProductModal (slug, pricing maths, form <-> payload)
import type { PriceLevel } from '@/lib/api/core/types';
import type { ProductPrice, ProductForm } from './types';

export const fmtPct = (n: number) => n.toFixed(2) + '%';

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function computeSellingPrice(pr: ProductPrice, purchasePrice: number): number {
  if (!purchasePrice) return 0;
  if (pr.pricing_method === 'fixed'  && pr.price  !== '' && pr.price  !== null) return Number(pr.price);
  if (pr.pricing_method === 'rate'   && pr.rate   !== '' && pr.rate   !== null) return purchasePrice * (1 + Number(pr.rate) / 100);
  if (pr.pricing_method === 'margin' && pr.margin !== '' && pr.margin !== null) return purchasePrice + Number(pr.margin);
  return 0;
}

export function computeMarginPct(sellingPrice: number, purchasePrice: number): number {
  if (!purchasePrice || !sellingPrice) return 0;
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
}

export function emptyForm(priceLevels: PriceLevel[] = [], defaultTvaId: number | null = null): ProductForm {
  return {
    name: '', slug: '', ref: '', barcode: '', description: '',
    family_id: null, brand_id: null, product_type_id: null,
    tva_id: defaultTvaId, unit_id: null,
    purchase_price_ht: '', current_cost_price: '', min_margin_percentage: null,
    manages_stock: true, allow_negative_stock: false,
    has_lots: false, has_expiration_date: false,
    min_stock_alert: '', max_stock_alert: '',
    manages_quantity_discounts: false, valuation_method_id: null,
    weight: '', volume: '', length: '', width: '', height: '',
    specifications: {}, images: [], default_image: null,
    meta_title: '', meta_description: '', meta_keywords: [],
    is_sold_by_weight: false, is_subsidized: false, regulated_product_config_id: null,
    active: true,
    prices: priceLevels.map(pl => ({
      price_level_id: pl.id, pricing_method: 'fixed', price: '', rate: '', margin: '', active: true,
    })),
    packagings: [], quantity_discounts: [],
  };
}

export function productToForm(p: any, priceLevels: PriceLevel[]): ProductForm {
  return {
    name: p.name ?? '', slug: p.slug ?? '', ref: p.ref ?? '',
    barcode: p.barcode ?? '', description: p.description ?? '',
    family_id: p.family_id ?? null, brand_id: p.brand_id ?? null,
    product_type_id: p.product_type_id ?? null,
    tva_id: p.tva_id ?? null, unit_id: p.unit_id ?? null,
    purchase_price_ht: p.purchase_price_ht ?? '', current_cost_price: p.current_cost_price ?? '',
    min_margin_percentage: p.min_margin_percentage ?? null,
    manages_stock: p.manages_stock ?? true, allow_negative_stock: p.allow_negative_stock ?? false,
    has_lots: p.has_lots ?? false, has_expiration_date: p.has_expiration_date ?? false,
    min_stock_alert: p.min_stock_alert ?? '', max_stock_alert: p.max_stock_alert ?? '',
    manages_quantity_discounts: p.manages_quantity_discounts ?? false,
    valuation_method_id: p.valuation_method_id ?? null,
    weight: p.weight ?? '', volume: p.volume ?? '',
    length: p.length ?? '', width: p.width ?? '', height: p.height ?? '',
    specifications: p.specifications ?? {},
    images: p.images ?? [],
    default_image: p.default_image ?? null,
    meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '',
    meta_keywords: Array.isArray(p.meta_keywords) ? p.meta_keywords : (p.meta_keywords ? String(p.meta_keywords).split(',').map((k: string) => k.trim()).filter(Boolean) : []),
    is_sold_by_weight: p.is_sold_by_weight ?? false, is_subsidized: p.is_subsidized ?? false,
    regulated_product_config_id: p.regulated_product_config_id ?? null,
    active: p.active ?? true,
    prices: priceLevels.map(pl => {
      const ex = (p.prices ?? []).find((x: any) => x.price_level_id === pl.id);
      return {
        price_level_id: pl.id,
        pricing_method: ex?.pricing_method ?? 'fixed',
        price: ex?.price ?? '', rate: ex?.rate ?? '', margin: ex?.margin ?? '',
        active: ex?.active !== false,
      };
    }),
    packagings: (p.packagings ?? []).map((pkg: any) => ({
      id: pkg.id, code: pkg.code ?? '', label: pkg.label ?? '',
      quantity: pkg.quantity ?? 1, barcode: pkg.barcode ?? '',
      is_default: pkg.is_default ?? false, active: pkg.active ?? true,
      display_order: pkg.display_order ?? 0,
    })),
    quantity_discounts: (p.quantity_discounts ?? []).map((d: any) => ({
      id: d.id, price_level_id: d.price_level_id, min_qty: d.min_qty ?? '',
      max_qty: d.max_qty ?? null, discount_amount: d.discount_amount ?? null,
      discount_percentage: d.discount_percentage ?? null, tier_order: d.tier_order ?? 0,
      is_blocked: d.is_blocked ?? false, active: d.active ?? true,
    })),
  };
}

export function buildPayload(form: ProductForm) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    ref: form.ref.trim() || null,
    barcode: form.barcode.trim() || null,
    description: form.description.trim() || null,
    family_id: form.family_id, brand_id: form.brand_id,
    product_type_id: form.product_type_id,
    tva_id: form.tva_id, unit_id: form.unit_id,
    purchase_price_ht: form.purchase_price_ht !== '' ? Number(form.purchase_price_ht) : 0,
    min_margin_percentage: form.min_margin_percentage !== '' && form.min_margin_percentage !== null ? Number(form.min_margin_percentage) : null,
    manages_stock: form.manages_stock, allow_negative_stock: form.allow_negative_stock,
    has_lots: form.has_lots, has_expiration_date: form.has_expiration_date,
    min_stock_alert: form.min_stock_alert !== '' ? Number(form.min_stock_alert) : 0,
    max_stock_alert: form.max_stock_alert !== '' ? Number(form.max_stock_alert) : 0,
    manages_quantity_discounts: form.manages_quantity_discounts,
    valuation_method_id: form.valuation_method_id,
    weight: form.weight !== '' ? form.weight : null,
    volume: form.volume !== '' ? form.volume : null,
    length: form.length !== '' ? form.length : null,
    width: form.width !== '' ? form.width : null,
    height: form.height !== '' ? form.height : null,
    specifications: Object.keys(form.specifications).length ? form.specifications : null,
    images: form.images,
    default_image: form.default_image || null,
    meta_title: form.meta_title.trim() || null,
    meta_description: form.meta_description.trim() || null,
    meta_keywords: form.meta_keywords.length ? form.meta_keywords : null,
    is_sold_by_weight: form.is_sold_by_weight,
    is_subsidized: form.is_subsidized,
    regulated_product_config_id: form.regulated_product_config_id || null,
    active: form.active,
    prices: form.prices.filter(p => {
      if (p.pricing_method === 'fixed')  return p.price  !== '' && p.price  !== null;
      if (p.pricing_method === 'rate')   return p.rate   !== '' && p.rate   !== null;
      if (p.pricing_method === 'margin') return p.margin !== '' && p.margin !== null;
      return false;
    }),
    packagings: form.packagings.filter(pkg => pkg.code.trim() && pkg.label.trim()),
    quantity_discounts: form.manages_quantity_discounts
      ? form.quantity_discounts.filter(d => d.price_level_id && d.min_qty !== '' && (d.discount_amount !== '' || d.discount_percentage !== ''))
      : [],
  };
}
