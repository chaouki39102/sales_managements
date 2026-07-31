import { describe, it, expect } from 'vitest';
import type { Product, ProductVariant, PriceLevel, ProductVariantPrice } from '@/types';
import {
  getVariantPrice, productToVariant, makeFakeVariant,
  familyIcon, familyStyleFromName,
} from './posHelpers';

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  const now = new Date().toISOString();
  return {
    id: 1, product_id: 1, ref: 'REF-001', barcode: null, variant_name: null,
    unit_id: null, tva_id: 1, valuation_method_id: null,
    weight: null, volume: null, length: null, width: null, height: null,
    last_purchase_price: 0, average_cost_price: 0, default_selling_price_ht: 1000,
    manages_stock: false, allow_negative_stock: true, has_lots: false, has_expiration_date: false,
    min_stock_alert: 0, max_stock_alert: null, manages_quantity_discounts: false,
    active: true, company_id: 1, created_at: now, updated_at: now,
    ...overrides,
  } as any;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date().toISOString();
  return {
    id: 1, name: 'Test Product', slug: 'test-product',
    ref: 'PRD-001', barcode: null, description: null,
    family_id: null, brand_id: null, product_type_id: null,
    tva_id: 1, unit_id: null, purchase_price_ht: 800, current_cost_price: 700,
    min_margin_percentage: null, manages_stock: false, allow_negative_stock: true,
    has_lots: false, has_expiration_date: false, min_stock_alert: null, max_stock_alert: null,
    manages_quantity_discounts: false, weight: null, volume: null,
    length: null, width: null, height: null, valuation_method_id: null,
    specifications: null, images: null, meta_title: null, meta_description: null,
    active: true, company_id: 1, created_at: now, updated_at: now,
    ...overrides,
  } as any;
}

describe('getVariantPrice', () => {
  it('returns default selling price when no price level', () => {
    const v = makeVariant({ default_selling_price_ht: 1500 });
    expect(getVariantPrice(v, null, [])).toBe(1500);
  });

  it('returns matching price level price when found', () => {
    const prices: ProductVariantPrice[] = [
      { price_level_id: 2, price: 1200, active: true } as any,
    ];
    const v = makeVariant({ default_selling_price_ht: 1500, prices });
    const levels: PriceLevel[] = [
      { id: 2, name: 'Wholesale', discount_percent: 0, company_id: 1, is_default: false, active: true, created_at: '', updated_at: '' },
    ];
    expect(getVariantPrice(v, 2, levels)).toBe(1200);
  });

  it('applies discount percent when price entry not found', () => {
    const prices: ProductVariantPrice[] = [];
    const v = makeVariant({ default_selling_price_ht: 1000, prices });
    const levels: PriceLevel[] = [
      { id: 3, name: 'VIP', discount_percent: 10, company_id: 1, is_default: false, active: true, created_at: '', updated_at: '' },
    ];
    expect(getVariantPrice(v, 3, levels)).toBe(900);
  });

  it('returns default price when both price entry and discount percent are missing', () => {
    const v = makeVariant({ default_selling_price_ht: 2000 });
    const levels: PriceLevel[] = [
      { id: 4, name: 'Regular', discount_percent: 0, company_id: 1, is_default: false, active: true, created_at: '', updated_at: '' },
    ];
    expect(getVariantPrice(v, 4, levels)).toBe(2000);
  });
});

describe('productToVariant', () => {
  it('converts a basic product to variant', () => {
    const p = makeProduct({ id: 5, ref: 'PRD-005', purchase_price_ht: 500 });
    const v = productToVariant(p);
    expect(v.product_id).toBe(5);
    expect(v.ref).toBe('PRD-005');
    expect(v.id).toBe(5);
    expect(v.last_purchase_price).toBe(500);
    expect(v.product).toBe(p);
  });

  it('uses default selling price from product when available', () => {
    const p = makeProduct({ default_selling_price_ht: 1200 } as any);
    const v = productToVariant(p);
    expect(v.default_selling_price_ht).toBe(1200);
  });

  it('calculates fallback selling price from purchase price * 1.3', () => {
    const p = makeProduct({ default_selling_price_ht: undefined as unknown as number, purchase_price_ht: 1000 } as any);
    const v = productToVariant(p);
    expect(v.default_selling_price_ht).toBe(1300);
  });

  it('passes through current_stock and prices from API response', () => {
    const p = makeProduct() as Product & { current_stock?: number; prices?: ProductVariantPrice[] };
    p.current_stock = 42;
    p.prices = [{ price_level_id: 1, price: 900, active: true }] as any;
    const v = productToVariant(p);
    expect(v.current_stock).toBe(42);
    expect(v.prices).toEqual(p.prices);
  });

  it('handles missing optional product fields gracefully', () => {
    const p = makeProduct({
      ref: null as unknown as string | undefined,
      purchase_price_ht: undefined as unknown as number,
      current_cost_price: undefined as unknown as number,
      min_stock_alert: undefined as unknown as number,
    });
    const v = productToVariant(p);
    expect(v.ref).toBe('');
    expect(v.last_purchase_price).toBe(0);
    expect(v.average_cost_price).toBe(0);
    expect(v.min_stock_alert).toBe(0);
  });
});

describe('makeFakeVariant', () => {
  it('creates a variant with given name, price, tva rate', () => {
    const v = makeFakeVariant('Custom Item', 2000, 19);
    expect(v.variant_name).toBeNull();
    expect(v.default_selling_price_ht).toBe(2000);
    expect(v.product!.name).toBe('Custom Item');
    expect(v.tva!.rate).toBe(19);
    expect(v.tva!.name).toContain('19');
    expect(v.product_id).toBe(0);
    expect(v.id).toBeGreaterThan(0);
  });

  it('id is greater than 0', () => {
    const v = makeFakeVariant('A', 100, 19);
    expect(v.id).toBeGreaterThan(0);
  });
});

describe('familyIcon', () => {
  it('returns apple icon for food keywords', () => {
    expect(familyIcon('أكل')).toBe('ti-apple');
    expect(familyIcon('طعام')).toBe('ti-apple');
    expect(familyIcon('غذاء')).toBe('ti-apple');
  });
  it('returns droplets for drink keywords', () => {
    expect(familyIcon('ماء')).toBe('ti-droplets');
    expect(familyIcon('عصير')).toBe('ti-droplets');
    expect(familyIcon('شراب')).toBe('ti-droplets');
  });
  it('returns default package icon for unknown', () => {
    expect(familyIcon('أثاث')).toBe('ti-package');
  });
});

describe('familyStyleFromName', () => {
  it('returns emerald for food', () => {
    const s = familyStyleFromName('أكل');
    expect(s.icon).toBe('ti-apple');
    expect(s.color).toBe('var(--em)');
  });
  it('returns red for medicine', () => {
    const s = familyStyleFromName('دواء');
    expect(s.icon).toBe('ti-pill');
    expect(s.color).toBe('var(--red)');
  });
  it('returns default for unknown', () => {
    const s = familyStyleFromName('أثاث');
    expect(s.icon).toBe('ti-package');
  });
});
