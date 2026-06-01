// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/inventoryTypes.ts — Types, API & helpers مشتركة
// ════════════════════════════════════════════════════════════════════════════

// FIX 1: imports أولاً دائماً
import type React from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/core/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryProduct {
  id:                 number;
  name:               string;
  ref?:               string | null;
  current_stock:      number | string;
  min_stock_alert:    number | string;
  current_cost_price: number | string;
  manages_stock:      boolean;
  active:             boolean;
  family?: { id: number; name: string } | null;
  unit?:   { id: number; name: string; symbol: string } | null;
}

export interface OpeningBalanceStock {
  id:                  number;
  fiscal_year_id:      number;
  product_id:          number;
  warehouse_id:        number;
  opening_quantity:    number | string;
  opening_value:       number | string;
  lot_number?:         string | null;
  manufacturing_date?: string | null;
  expiration_date?:    string | null;
  product?:   { id: number; name: string; ref?: string | null; unit?: { symbol: string } | null } | null;
  warehouse?: { id: number; name: string; code?: string | null } | null;
}

export interface ProductOption   { id: number; name: string; ref?: string | null; unit?: { symbol: string } | null }
export interface WarehouseOption { id: number; name: string; code?: string | null }

export interface DraftRow {
  product_id:         number | '';
  warehouse_id:       number | '';
  opening_quantity:   string;
  opening_value:      string;
  lot_number:         string;
  manufacturing_date: string;
  expiration_date:    string;
}

// نوع ما يُرسَل للـ create (بدون id والـ relations)
export type CreateOpeningBalanceInput = Omit<OpeningBalanceStock,
  'id' | 'product' | 'warehouse'
>;

export type UpdateOpeningBalanceInput = Pick<OpeningBalanceStock,
  'opening_quantity' | 'opening_value' | 'lot_number' | 'manufacturing_date' | 'expiration_date'
>;

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const obKeys = {
  all:  (slug: string) => [slug, 'opening-balance-stocks'] as const,
  list: (slug: string, yearId?: number) =>
          [slug, 'opening-balance-stocks', 'list', yearId] as const,
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const obApi = {
  // المسار الصحيح من api.php: opening-balance-stocks
  list: (yearId: number) =>
    apiGet<OpeningBalanceStock[]>('/opening-balance-stocks', {
      fiscal_year_id: yearId,
      per_page:       500,
      include:        'product,warehouse',
    }),

  create: (d: CreateOpeningBalanceInput) =>
    apiPost<OpeningBalanceStock>('/opening-balance-stocks', d),

  update: (id: number, d: UpdateOpeningBalanceInput) =>
    apiPut<OpeningBalanceStock>(`/opening-balance-stocks/${id}`, d),

  delete: (id: number) =>
    apiDelete(`/opening-balance-stocks/${id}`),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const emptyDraft = (): DraftRow => ({
  product_id:         '',
  warehouse_id:       '',
  opening_quantity:   '',
  opening_value:      '',
  lot_number:         '',
  manufacturing_date: '',
  expiration_date:    '',
});

export function fmt(n: number | string | null | undefined, dec = 2): string {
  const num = Number(n ?? 0);
  if (isNaN(num)) return '0';
  return num.toLocaleString('fr-DZ', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function stockStatus(p: InventoryProduct): 'out' | 'low' | 'ok' {
  const stock = Number(p.current_stock ?? 0);
  const min   = Number(p.min_stock_alert ?? 0);
  if (stock <= 0)     return 'out';
  if (stock <= min)   return 'low';
  return 'ok';
}

// FIX 2: React imported as type فقط — CSSProperties يأتي منه
export function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width:       '100%',
    padding:     '5px 8px',
    background:  'var(--bg1)',
    border:      `1px solid ${hasError ? '#ef4444' : 'var(--b2)'}`,
    borderRadius: 6,
    color:       'var(--t1)',
    fontSize:    12,
    fontFamily:  'Tajawal, sans-serif',
    outline:     'none',
    boxSizing:   'border-box',
  };
}
