// ════════════════════════════════════════════════════════════════════════════
// store/useCartStore.ts — عربة التسوق (POS)
//
// ✅ إصلاحات:
//   1. calcFiscalStamp مُستوردة من calculations.ts (cap 3000 دج — LF 2024)
//   2. unit_symbol: يقرأ unit.abbreviation مع fallback
//   3. totals() تستخدم calcFiscalStamp + خصم الفاتورة
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant } from '@/types';
import { calcTotals, calcFiscalStamp } from '../utils/calculations';

interface CartState {
  items:  CartItem[];
  client: Party | null;
  notes:  string;
  invoiceDiscountPct: number;
  // actions
  addItem:        (variant: ProductVariant, qty?: number) => void;
  removeItem:     (id: string) => void;
  updateQty:      (id: string, qty: number) => void;
  updateDiscount: (id: string, pct: number) => void;
  updatePrice:    (id: string, price: number) => void;
  setClient:      (client: Party | null) => void;
  setNotes:       (notes: string) => void;
  clearCart:      () => void;
  setInvoiceDiscountPct: (pct: number) => void;
  totals:         () => CartTotals;
}

function calcItemTotals(item: CartItem): CartItem {
  const discountedHt = item.unit_price_ht * item.quantity * (1 - item.discount_percentage / 100);
  const disc         = item.unit_price_ht * item.quantity - discountedHt;
  const totalHt      = discountedHt;
  const totalTva     = totalHt * (item.tva_rate / 100);
  return {
    ...item,
    discount_amount: Math.round(disc    * 100) / 100,
    total_ht:        Math.round(totalHt * 100) / 100,
    total_ttc:       Math.round((totalHt + totalTva) * 100) / 100,
  };
}

/** يقرأ رمز الوحدة من الفاريانت */
function getUnitSymbol(variant: ProductVariant): string {
  return variant.unit?.abbreviation ?? 'قطعة';
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:  [],
      client: null,
      notes:  '',
      invoiceDiscountPct: 0,

      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id
                  ? calcItemTotals({ ...i, quantity: i.quantity + qty })
                  : i,
              ),
            };
          }

          const priceHt  = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 19;
          const priceTtc = priceHt * (1 + tvaRate / 100);

          const newItem: CartItem = {
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         getUnitSymbol(variant),
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceTtc,
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: 0,
            discount_amount:     0,
            total_ht:            Math.round(priceHt * qty * 100) / 100,
            total_ttc:           Math.round(priceTtc * qty * 100) / 100,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, quantity: Math.max(0.001, qty) })
              : i,
          ),
        })),

      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, discount_percentage: Math.min(100, Math.max(0, pct)) })
              : i,
          ),
        })),

      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? calcItemTotals({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
        })),

      setClient: (client) => set({ client }),
      setNotes:  (notes)  => set({ notes }),
      clearCart: ()       => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0 }),
      setInvoiceDiscountPct: (pct) => set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)) }),

      totals: () => calcTotals(get().items, get().invoiceDiscountPct),
    }),
    {
      name: 'pos-cart',
      partialize: () => ({}),
    },
  ),
);
