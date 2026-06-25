import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant, QuantityDiscount } from '@/types';
import { calcTotals } from '../utils/calculations';

interface CartState {
  items:              CartItem[];
  client:             Party | null;
  notes:              string;
  invoiceDiscountPct: number;
  _isDirty:           boolean;

  addItem:              (variant: ProductVariant, qty?: number) => void;
  removeItem:           (id: string) => void;
  updateQty:            (id: string, qty: number) => void;
  updateDiscount:       (id: string, pct: number) => void;
  updateDiscountAmount: (id: string, amount: number) => void;
  updatePrice:          (id: string, price: number) => void;
  setClient:            (client: Party | null) => void;
  setNotes:             (notes: string) => void;
  clearCart:            () => void;
  setInvoiceDiscountPct:(pct: number) => void;
  totals:               () => CartTotals;
  markClean:            () => void;
}

function findQuantityDiscount(discounts: QuantityDiscount[] | undefined, qty: number): number {
  if (!discounts?.length) return 0;
  const sorted = [...discounts]
    .filter(d => d.active)
    .sort((a, b) => b.tier_order - a.tier_order);
  const match = sorted.find(d =>
    qty >= d.min_quantity &&
    (d.max_quantity === null || d.max_quantity === undefined || qty <= d.max_quantity)
  );
  return match ? Math.min(100, Math.max(0, match.discount_percentage ?? 0)) : 0;
}

function recalcItem(item: CartItem): CartItem {
  const gross = item.unit_price_ht * item.quantity;
  let discAmount: number;
  if (item.discount_percentage > 0) {
    discAmount = gross * (item.discount_percentage / 100);
  } else if (item.discount_amount > 0) {
    discAmount = Math.min(gross, item.discount_amount);
    item = {
      ...item,
      discount_percentage: gross > 0 ? (discAmount / gross) * 100 : 0,
    };
  } else {
    discAmount = 0;
  }
  const totalHt  = gross - discAmount;
  const totalTva = totalHt * (item.tva_rate / 100);
  return {
    ...item,
    discount_amount: round2(discAmount),
    total_ht:        round2(totalHt),
    total_ttc:       round2(totalHt + totalTva),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getUnitSymbol(v: ProductVariant): string {
  return v.unit?.abbreviation ?? 'قطعة';
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:              [],
      client:             null,
      notes:              '',
      invoiceDiscountPct: 0,
      _isDirty:           false,

      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);
          if (existing) {
            const newQty   = existing.quantity + qty;
            const autoDisc = findQuantityDiscount(variant.quantity_discounts, newQty);
            const updated  = recalcItem({
              ...existing,
              quantity:            newQty,
              discount_percentage: Math.max(existing.discount_percentage, autoDisc),
            });
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id ? updated : i,
              ),
              _isDirty: true,
            };
          }

          const priceHt  = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 19;
          const autoDisc = findQuantityDiscount(variant.quantity_discounts, qty);

          const newItem: CartItem = recalcItem({
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         getUnitSymbol(variant),
            image_url:           (variant as any).image_url ?? variant.product?.images?.[0] ?? null,
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceHt * (1 + tvaRate / 100),
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: autoDisc,
            discount_amount:     0,
            total_ht:            0,
            total_ttc:           0,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          });

          return { items: [...state.items, newItem], _isDirty: true };
        });
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id), _isDirty: true })),

      updateQty: (id, qty) =>
        set(state => {
          const item = state.items.find(i => i.id === id);
          if (!item) return state;
          const safeQty = Math.max(0.001, qty);
          const updated = recalcItem({ ...item, quantity: safeQty });
          return { items: state.items.map(i => i.id === id ? updated : i), _isDirty: true };
        }),

      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_percentage: Math.min(100, Math.max(0, pct)),
                  discount_amount:     0,
                })
              : i,
          ),
          _isDirty: true,
        })),

      updateDiscountAmount: (id, amount) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_amount:     Math.max(0, amount),
                  discount_percentage: 0,
                })
              : i,
          ),
          _isDirty: true,
        })),

      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
          _isDirty: true,
        })),

      setClient: (client) => set({ client, _isDirty: true }),
      setNotes:  (notes)  => set({ notes, _isDirty: true }),
      clearCart: ()       => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0, _isDirty: false }),
      setInvoiceDiscountPct: (pct) =>
        set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)), _isDirty: true }),

      markClean: () => set({ _isDirty: false }),

      totals: () => calcTotals(get().items, get().invoiceDiscountPct),
    }),
    {
      name:       'pos-cart',
      partialize: () => ({}),
    },
  ),
);
