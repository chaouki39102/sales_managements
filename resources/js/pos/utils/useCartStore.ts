import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, Party, ProductPackaging, ProductVariant, QuantityDiscount } from '@/types';

export interface DocumentPayment {
  id:                  number;
  payment_mode_id:     number;
  amount:              number;
  payment_date:        string;
  treasury_account_id?: number | null;
  reference?:          string | null;
  notes?:              string | null;
  client_ref?:         string | null;
}

interface CartState {
  items:              CartItem[];
  client:             Party | null;
  notes:              string;
  invoiceDiscountPct: number;
  payments:           DocumentPayment[];
  _isDirty:           boolean;

  addItem:              (variant: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => void;
  removeItem:           (id: string) => void;
  updateQty:            (id: string, qty: number) => void;
  updateDiscount:       (id: string, pct: number) => void;
  updateDiscountAmount: (id: string, amount: number) => void;
  updatePrice:          (id: string, price: number) => void;
  updatePackaging:      (id: string, packaging: ProductPackaging | null, basePriceHt: number) => void;
  setClient:            (client: Party | null) => void;
  setNotes:             (notes: string) => void;
  setPayments:          (payments: DocumentPayment[]) => void;
  clearCart:            () => void;
  setInvoiceDiscountPct:(pct: number) => void;
  markClean:            () => void;
}

interface ResolvedTier {
  mode:               'percentage' | 'fixed_amount';
  discount_percentage: number;
  discount_amount:     number;  // total line discount (per_unit × qty)
  quantity_discount_id?: number | null;
}

function resolveQuantityTier(
  discounts: QuantityDiscount[] | undefined,
  qty: number,
  packQty: number,
): ResolvedTier | null {
  if (!discounts?.length) return null;
  // Tier lookup uses BASE QTY (entered qty × packQty), matching backend
  const baseQty = qty * (packQty || 1);
  const sorted = [...discounts]
    .filter(d => d.active && !d.is_blocked)
    .sort((a, b) => b.min_qty - a.min_qty);
  const match = sorted.find(d =>
    baseQty >= d.min_qty &&
    (d.max_qty === null || d.max_qty === undefined || baseQty <= d.max_qty)
  );
  if (!match) return null;

  // Fixed-amount tier — per-BASE-UNIT DZD, NO percentage conversion
  if (match.discount_amount != null && match.discount_amount > 0) {
    return {
      mode:               'fixed_amount',
      discount_percentage: 0,
      discount_amount:     match.discount_amount * baseQty,
      quantity_discount_id: match.id,
    };
  }
  // Percentage tier
  if (match.discount_percentage != null && match.discount_percentage > 0) {
    const pct = Math.min(100, match.discount_percentage);
    return {
      mode:               'percentage',
      discount_percentage: pct,
      discount_amount:     0,
      quantity_discount_id: match.id,
    };
  }
  return null;
}

/** @deprecated Use resolveQuantityTier instead */
function findQuantityDiscount(discounts: QuantityDiscount[] | undefined, qty: number, unitPriceHt: number, packQty: number = 1): number {
  const resolved = resolveQuantityTier(discounts, qty, packQty);
  if (!resolved) return 0;
  if (resolved.mode === 'percentage') return resolved.discount_percentage;
  const baseQty = qty * (packQty || 1);
  return unitPriceHt > 0 ? Math.min(100, (resolved.discount_amount / baseQty / unitPriceHt) * 100) : 0;
}

function recalcItem(item: CartItem): CartItem {
  const gross = item.unit_price_ht * item.quantity;
  let discAmount: number;
  if (item.discount_mode === 'fixed_amount') {
    discAmount = Math.min(gross, item.discount_amount);
    item = { ...item, discount_percentage: gross > 0 ? round2((discAmount / gross) * 100) : 0 };
  } else {
    discAmount = gross * (item.discount_percentage / 100);
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
    (set) => ({
      items:              [],
      client:             null,
      notes:              '',
      invoiceDiscountPct: 0,
      payments:           [],
      _isDirty:           false,

      addItem: (variant, qty = 1, packaging = null) => {
        set(state => {
          const packQty = packaging ? Math.max(1, Number(packaging.quantity) || 1) : 1;
          const packId  = packaging?.id ?? null;

          // Merge only if same product + same packaging
          const existing = state.items.find(
            i => i.variant_id === variant.id && (i.packaging_id ?? null) === packId,
          );
          if (existing) {
            const newQty   = existing.quantity + qty;
            const existPackQty = existing.pack_qty ?? 1;
            const resolved = resolveQuantityTier(variant.quantity_discounts, newQty, existPackQty);
            const updated  = recalcItem({
              ...existing,
              quantity:            newQty,
              discount_percentage: resolved?.discount_percentage ?? existing.discount_percentage,
              discount_amount:     resolved?.mode === 'fixed_amount' ? resolved.discount_amount : existing.discount_amount,
              discount_mode:       resolved?.mode ?? existing.discount_mode,
            });
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id && (i.packaging_id ?? null) === packId ? updated : i,
              ),
              _isDirty: true,
            };
          }

          const priceHt  = variant.default_selling_price_ht * packQty;
          const baseHt   = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 0;
          const resolved = resolveQuantityTier(variant.quantity_discounts, qty, packQty);

          const newItem: CartItem = recalcItem({
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         packaging?.label ?? getUnitSymbol(variant),
            image_url:           (variant as any).image_url ?? variant.product?.images?.[0] ?? null,
            quantity:            qty,
            unit_price_ht:       priceHt,
            selling_price_ttc:   priceHt * (1 + tvaRate / 100),
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: resolved?.discount_percentage ?? 0,
            discount_amount:     resolved?.discount_amount ?? 0,
            discount_mode:       resolved?.mode ?? 'percentage',
            total_ht:            0,
            total_ttc:           0,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
            packaging_id:        packId,
            pack_qty:            packQty,
            packaging_label:     packaging?.label ?? null,
            base_price_ht:       baseHt,
            quantity_discounts:  variant.quantity_discounts ?? [],
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

          // Strict tier re-evaluation on every qty change.
          // The backend ALWAYS re-evaluates tiers in createDocumentLines(),
          // so the frontend must mirror this to keep cart display consistent.
          const packQty = item.pack_qty ?? 1;
          const resolved = item.quantity_discounts?.length
            ? resolveQuantityTier(item.quantity_discounts, safeQty, packQty)
            : null;

          const updated = recalcItem({
            ...item,
            quantity:            safeQty,
            discount_percentage: resolved?.discount_percentage ?? item.discount_percentage,
            discount_amount:     resolved?.mode === 'fixed_amount' ? resolved.discount_amount : item.discount_amount,
            discount_mode:       resolved?.mode ?? item.discount_mode,
          });
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
                  discount_mode:       'percentage',
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
                  discount_mode:       'fixed_amount',
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

      updatePackaging: (id, packaging, basePriceHt) =>
        set(state => {
          const packQty = packaging ? Math.max(1, Number(packaging.quantity) || 1) : 1;
          const newPrice = basePriceHt * packQty;
          const item = state.items.find(i => i.id === id);
          // Re-evaluate tier when packaging/price changes
          const resolved = item?.quantity_discounts?.length
            ? resolveQuantityTier(item.quantity_discounts, item.quantity, packQty)
            : null;
          return {
            items: state.items.map(i =>
              i.id === id
                ? recalcItem({
                    ...i,
                    packaging_id:     packaging?.id ?? null,
                    pack_qty:         packQty,
                    packaging_label:  packaging?.label ?? null,
                    unit_symbol:      packaging?.label ?? i.unit_symbol,
                    unit_price_ht:    newPrice,
                    selling_price_ttc: newPrice * (1 + i.tva_rate / 100),
                    base_price_ht:    basePriceHt,
                    discount_percentage: resolved?.discount_percentage ?? i.discount_percentage,
                    discount_amount:     resolved?.mode === 'fixed_amount' ? resolved.discount_amount : i.discount_amount,
                    discount_mode:       resolved?.mode ?? i.discount_mode,
                  })
                : i,
            ),
            _isDirty: true,
          };
        }),

      setClient: (client) => set({ client, _isDirty: true }),
      setNotes:  (notes)  => set({ notes, _isDirty: true }),
      setPayments: (payments) => set({ payments, _isDirty: true }),
      clearCart: () => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0, payments: [], _isDirty: false }),
      setInvoiceDiscountPct: (pct) =>
        set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)), _isDirty: true }),

      markClean: () => set({ _isDirty: false }),
    }),
    {
      name:       'pos-cart',
      partialize: (state) => ({
        items:              state.items,
        client:             state.client,
        notes:              state.notes,
        invoiceDiscountPct: state.invoiceDiscountPct,
        payments:           state.payments,
        _isDirty:           true,
      }),
    },
  ),
);
