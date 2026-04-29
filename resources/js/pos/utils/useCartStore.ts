// ════════════════════════════════════════════════
// store/useCartStore.ts — عربة التسوق (POS)
// ════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant } from '@/types';

interface CartState {
  items: CartItem[];
  client: Party | null;
  notes: string;
  // actions
  addItem:        (variant: ProductVariant, qty?: number) => void;
  removeItem:     (id: string) => void;
  updateQty:      (id: string, qty: number) => void;
  updateDiscount: (id: string, pct: number) => void;
  updatePrice:    (id: string, price: number) => void;
  setClient:      (client: Party | null) => void;
  setNotes:       (notes: string) => void;
  clearCart:      () => void;
  totals:         () => CartTotals;
}

function calcItemTotals(item: CartItem): CartItem {
  const disc     = item.unit_price_ht * (item.discount_percentage / 100) * item.quantity;
  const totalHt  = item.unit_price_ht * item.quantity - disc;
  const totalTva = totalHt * (item.tva_rate / 100);
  return {
    ...item,
    discount_amount: disc,
    total_ht:        totalHt,
    total_ttc:       totalHt + totalTva,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:  [],
      client: null,
      notes:  '',

      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.product_id === variant.id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.product_id === variant.id
                  ? calcItemTotals({ ...i, quantity: i.quantity + qty })
                  : i
              ),
            };
          }
          const priceHt  = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 19;
          const priceTtc = priceHt * (1 + tvaRate / 100);
          const newItem: CartItem = {
            id:                  nanoid(8),
            product_id:  variant.id,
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name,
            barcode:             variant.barcode,
            unit_symbol:         variant.unit?.symbol ?? 'قطعة',
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceTtc,
            tva_rate:            tvaRate,
            discount_percentage: 0,
            discount_amount:     0,
            total_ht:            priceHt * qty,
            total_ttc:           priceTtc * qty,
            max_stock:           variant.manages_stock ? (variant.current_stock ?? null) : null,
          };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id ? calcItemTotals({ ...i, quantity: Math.max(0.001, qty) }) : i
          ),
        })),

      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id ? calcItemTotals({ ...i, discount_percentage: Math.min(100, Math.max(0, pct)) }) : i
          ),
        })),

      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id ? calcItemTotals({ ...i, unit_price_ht: price }) : i
          ),
        })),

      setClient: (client) => set({ client }),
      setNotes:  (notes)  => set({ notes }),
      clearCart: ()       => set({ items: [], client: null, notes: '' }),

      totals: () => {
        const { items } = get();
        const totalHt        = items.reduce((s, i) => s + i.total_ht,  0);
        const totalTva       = items.reduce((s, i) => s + (i.total_ht * i.tva_rate / 100), 0);
        const totalDiscount  = items.reduce((s, i) => s + i.discount_amount, 0);
        // Fiscal stamp: 1% if TTC >= 30,000 DZD (Algerian rule)
        const fiscalStamp    = totalHt + totalTva >= 30_000 ? Math.ceil((totalHt + totalTva) * 0.01) : 0;
        return {
          total_ht:       totalHt,
          total_tva:      totalTva,
          total_ttc:      totalHt + totalTva,
          total_discount: totalDiscount,
          fiscal_stamp:   fiscalStamp,
          items_count:    items.reduce((s, i) => s + i.quantity, 0),
          lines_count:    items.length,
        };
      },
    }),
    {
      name: 'pos-cart',
      // don't persist — cart resets on page refresh
      partialize: () => ({}),
    }
  )
);
