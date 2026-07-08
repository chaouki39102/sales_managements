import { describe, it, expect } from 'vitest';
import {
  htToTtc, ttcToHt, calcMargin, calcFiscalStamp,
  calcTotals, formatDZD, calcChange, checkStock, round2,
} from './calculations';
import type { CartItem } from '@/types';

describe('htToTtc', () => {
  it('calculates TTC from HT with TVA rate', () => {
    expect(htToTtc(1000, 19)).toBe(1190);
  });
  it('returns HT when TVA is 0', () => {
    expect(htToTtc(500, 0)).toBe(500);
  });
  it('handles zero HT', () => {
    expect(htToTtc(0, 19)).toBe(0);
  });
});

describe('ttcToHt', () => {
  it('calculates HT from TTC with TVA rate', () => {
    expect(ttcToHt(1190, 19)).toBe(1000);
  });
  it('returns TTC when TVA is 0', () => {
    expect(ttcToHt(500, 0)).toBe(500);
  });
  it('handles zero TTC', () => {
    expect(ttcToHt(0, 19)).toBe(0);
  });
});

describe('calcMargin', () => {
  it('calculates margin percentage', () => {
    expect(calcMargin(1000, 700)).toBe(30);
  });
  it('returns 0 when selling price is 0', () => {
    expect(calcMargin(0, 100)).toBe(0);
  });
  it('returns negative margin when cost exceeds selling', () => {
    expect(calcMargin(100, 150)).toBeCloseTo(-50, 5);
  });
});

describe('calcFiscalStamp', () => {
  it('returns 0 for zero and negative amounts', () => {
    expect(calcFiscalStamp(0)).toBe(0);
    expect(calcFiscalStamp(-100)).toBe(0);
  });
  it('applies 1% floor at MIN_STAMP=5', () => {
    expect(calcFiscalStamp(200)).toBe(5);
    expect(calcFiscalStamp(499.99)).toBe(5);
  });
  it('applies 1% for medium amounts', () => {
    expect(calcFiscalStamp(30000)).toBe(300);
    expect(calcFiscalStamp(100000)).toBe(1000);
    expect(calcFiscalStamp(200000)).toBe(2000);
  });
  it('caps at MAX_STAMP=2500', () => {
    expect(calcFiscalStamp(250000)).toBe(2500);
    expect(calcFiscalStamp(300000)).toBe(2500);
    expect(calcFiscalStamp(500000)).toBe(2500);
    expect(calcFiscalStamp(1_000_000)).toBe(2500);
  });
});

describe('calcTotals', () => {
  const baseItem = (overrides: Partial<CartItem> = {}): CartItem => ({
    id: '1', product_id: 1, variant_id: 1, product_name: 'Test',
    ref: '', barcode: null, variant_name: null, unit_symbol: null,
    quantity: 1, unit_price_ht: 1000, selling_price_ttc: 1190,
    tva_rate: 19, tva_id: null, discount_percentage: 0, discount_amount: 0,
    total_ht: 1000, total_ttc: 1190, max_stock: null, manages_stock: false,
    ...overrides,
  });

  it('returns zeros for empty cart', () => {
    const r = calcTotals([]);
    expect(r.total_ht).toBe(0);
    expect(r.total_tva).toBe(0);
    expect(r.total_ttc).toBe(0);
    expect(r.total_discount).toBe(0);
    expect(r.items_count).toBe(0);
    expect(r.lines_count).toBe(0);
  });

  it('calculates totals for a single item', () => {
    const r = calcTotals([baseItem()]);
    expect(r.total_ht).toBe(1000);
    expect(r.total_tva).toBe(190);
    expect(r.total_ttc).toBe(1190);
    expect(r.items_count).toBe(1);
  });

  it('calculates totals for multiple items', () => {
    const r = calcTotals([
      baseItem({ id: '1', total_ht: 1000 }),
      baseItem({ id: '2', total_ht: 2000, tva_rate: 9, unit_price_ht: 2000, selling_price_ttc: 2180, total_ttc: 2180 }),
    ]);
    expect(r.total_ht).toBe(3000);
    expect(r.total_tva).toBe(190 + 180);
    expect(r.items_count).toBe(2);
  });

  it('applies invoice discount percentage', () => {
    const r = calcTotals([baseItem({ total_ht: 1000 })], 10);
    expect(r.invoice_discount_pct).toBe(10);
    expect(r.invoice_discount_amount).toBe(100);
    expect(r.total_ht).toBe(900);
  });

  it('handles zero invoice discount pct', () => {
    const r = calcTotals([baseItem({ total_ht: 1000 })], 0);
    expect(r.invoice_discount_pct).toBeUndefined();
    expect(r.invoice_discount_amount).toBeUndefined();
    expect(r.total_ht).toBe(1000);
  });

  it('accumulates item discounts', () => {
    const r = calcTotals([
      baseItem({ id: '1', total_ht: 1000, discount_amount: 50 }),
      baseItem({ id: '2', total_ht: 2000, discount_amount: 100 }),
    ]);
    expect(r.total_discount).toBe(150);
  });
});

describe('formatDZD', () => {
  it('formats amount with DZD symbol', () => {
    expect(formatDZD(1000)).toMatch(/دج/);
  });
  it('formats whole number with 2 decimals', () => {
    const r = formatDZD(1000);
    expect(r).toMatch(/1 000,00 دج/);
  });
  it('formats decimal amount', () => {
    expect(formatDZD(1500.5)).toMatch(/1 500,50 دج/);
  });
});

describe('calcChange', () => {
  it('returns 0 when paid equals total', () => {
    expect(calcChange(1190, 1000, 190)).toBe(0);
  });
  it('returns positive change when overpaid', () => {
    expect(calcChange(2000, 1000, 190)).toBe(810);
  });
  it('returns 0 when underpaid', () => {
    expect(calcChange(500, 1000, 0)).toBe(0);
  });
});

describe('checkStock', () => {
  const item = (max: number | null): CartItem => ({
    id: '1', product_id: 1, variant_id: 1, product_name: 'Test',
    ref: '', barcode: null, variant_name: null, unit_symbol: 'pcs',
    quantity: 1, unit_price_ht: 1000, selling_price_ttc: 1190,
    tva_rate: 19, tva_id: null, discount_percentage: 0, discount_amount: 0,
    total_ht: 1000, total_ttc: 1190, max_stock: max, manages_stock: true,
  });

  it('returns ok when stock is unlimited', () => {
    const r = checkStock(item(null), 100);
    expect(r.ok).toBe(true);
  });
  it('returns ok when new qty <= max stock', () => {
    const r = checkStock(item(10), 5);
    expect(r.ok).toBe(true);
  });
  it('returns error when new qty > max stock', () => {
    const r = checkStock(item(5), 10);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('pcs');
  });
});

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(100.456)).toBe(100.46);
    expect(round2(100.454)).toBe(100.45);
    expect(round2(100)).toBe(100);
    expect(round2(0)).toBe(0);
  });
});
