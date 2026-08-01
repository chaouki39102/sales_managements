// ════════════════════════════════════════════════════════════════════════════
// pos-pro/store/usePosProCart.ts
//
// سلة مستقلة كلياً لصفحة POS PRO — لا تشارك أي حالة مع POS الكلاسيكي.
// نفس منطق useCartStore لكن بمفتاح localStorage خاص (pos-pro-cart) بحيث
// أن إضافة منتج هنا لا تظهر هناك والعكس صحيح.
//
// الحالة مستقلة تماماً: لا نعدّل POS الكلاسيكي، بل نعيد استعمال الدوال
// النقية المشتركة فقط (recalcItem / resolveQuantityTier من pos/utils).
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, HeldCart, Party, ProductPackaging, ProductVariant } from '@/types';
import { resolveQuantityTier, recalcItem } from '@/pos/utils/calculations';

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

interface PosProCartState {
  items:              CartItem[];
  client:             Party | null;
  notes:              string;
  invoiceDiscountPct: number;
  payments:           DocumentPayment[];
  heldCarts:          HeldCart[];
  /** رقم السلة الحالية — السلة الفارغة تأخذ دائماً أقل رقم حر بين السلات المعلّقة (ترقيم مضغوط) */
  saleNumber:         number;
  _isDirty:           boolean;
  // Identity of the existing document this cart is editing (null = new sale).
  // Lives in the STORE so it survives hold/restore + reload → pay always
  // UPDATES the same document instead of creating a duplicate.
  documentId?:    number | null;
  documentNumber?: string | null;
  documentDate?:  string | null;

  addItem:              (variant: ProductVariant, qty?: number, packaging?: ProductPackaging | null) => string | null;
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
  setDocumentMeta:      (meta: { id?: number | null; number?: string | null; date?: string | null }) => void;
  holdCart:   (params: { items: CartItem[]; totals: CartTotals; client: Party | null; label?: string }) => void;
  restoreCart:          (id: string) => HeldCart | null;
  deleteHeldCart:       (id: string) => void;
  bumpSaleNumber:       () => void;
  markClean:            () => void;
}

function getUnitSymbol(v: ProductVariant): string {
  if (v.is_sold_by_weight) return 'كغ';
  return v.unit?.symbol ?? v.unit?.abbreviation ?? 'قطعة';
}

/** أقل رقم حر بين السلات المعلّقة — السلة الحالية الفارغة تأخذ دائماً هذا الرقم (ترقيم مضغوط) */
function smallestFreeNumber(heldCarts: HeldCart[]): number {
  const used = new Set(heldCarts.map(c => {
    const m = (c.label ?? '').match(/\d+/);
    return m ? Number(m[0]) : 0;
  }));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

/**
 * مصنع سلة — يمكن إنشاء عدة سلات مستقلة، كل واحدة بمفتاح persist خاص بها.
 * POS PRO يستعمل المفتاح `pos-pro-cart` فلا تتداخل مع `pos-cart` الكلاسيكي.
 */
function createCartStore(persistKey: string) {
  return create<PosProCartState>()(
    persist(
      (set, get) => ({
        items:              [],
        client:             null,
        notes:              '',
        invoiceDiscountPct: 0,
        payments:           [],
        heldCarts:          [],
        saleNumber:         1,
        _isDirty:           false,
        documentId:         null,
        documentNumber:     null,
        documentDate:       null,

        addItem: (variant, qty = 1, packaging = null) => {
          const state = get();
          const isWeight = variant.is_sold_by_weight ?? variant.product?.is_sold_by_weight ?? false;
          const rawQty = isWeight ? qty : Math.round(qty);
          const safeQty = Math.max(isWeight ? 0.001 : 1, rawQty);

          // Resolve default packaging when none provided
          const resolvedPkg = packaging ?? (() => {
            const pkgs = (variant.packagings ?? (variant as any).product?.packagings ?? []) as ProductPackaging[];
            const active = pkgs.filter((p: ProductPackaging) => p.active !== false);
            return active.find((p: ProductPackaging) => p.is_default) ?? active[0] ?? null;
          })();

          const packQty = resolvedPkg ? Math.max(1, Number(resolvedPkg.quantity) || 1) : 1;
          const packId  = resolvedPkg?.id ?? null;

          // Merge only if same product + same packaging
          const existing = state.items.find(
            i => i.variant_id === variant.id && (i.packaging_id ?? null) === packId,
          );
          if (existing) {
            const newQty   = existing.quantity + safeQty;
            const existPackQty = existing.pack_qty ?? 1;
            const tierSource = variant.quantity_discounts ?? existing.quantity_discounts ?? [];
            const hasTiers = tierSource.length > 0;

            let discPatch: Partial<Pick<CartItem, 'discount_percentage' | 'discount_amount' | 'discount_mode'>>;

            if (hasTiers) {
              const resolved = resolveQuantityTier(tierSource, newQty, existPackQty);
              discPatch = {
                discount_percentage: resolved?.discount_percentage ?? 0,
                discount_amount:     resolved?.mode === 'fixed_amount' ? resolved.discount_amount : 0,
                discount_mode:       resolved?.mode ?? 'percentage',
              };
            } else {
              // No tier data — preserve existing discount
              discPatch = {};
            }

            const updated  = recalcItem({ ...existing, quantity: newQty, ...discPatch });
            set({
              items: state.items.map(i =>
                i.variant_id === variant.id && (i.packaging_id ?? null) === packId ? updated : i,
              ),
              _isDirty: true,
            });
            return existing.id;
          }

          const priceHt  = variant.default_selling_price_ht * packQty;
          const baseHt   = variant.default_selling_price_ht;
          const tvaRate  = variant.tva?.rate ?? 0;
          const resolved = resolveQuantityTier(variant.quantity_discounts, safeQty, packQty);

          const newItem: CartItem = recalcItem({
            id:                  nanoid(8),
            product_id:          variant.product_id,
            variant_id:          variant.id,
            ref:                 variant.ref ?? '',
            product_name:        variant.product?.name ?? '',
            variant_name:        variant.variant_name ?? null,
            barcode:             variant.barcode ?? null,
            unit_symbol:         resolvedPkg?.label ?? getUnitSymbol(variant),
            image_url:           (variant as any).image_url ?? variant.product?.default_image ?? variant.product?.images?.[0] ?? null,
            quantity:            safeQty,
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
            is_sold_by_weight:   variant.is_sold_by_weight ?? variant.product?.is_sold_by_weight ?? false,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
            packaging_id:        packId,
            pack_qty:            packQty,
            packaging_label:     resolvedPkg?.label ?? null,
            base_price_ht:       baseHt,
            available_packagings: (variant.packagings ?? []).filter((p: ProductPackaging) => p.active !== false),
            quantity_discounts:  variant.quantity_discounts ?? [],
          });

          set({ items: [...state.items, newItem], _isDirty: true });
          return newItem.id;
        },

        removeItem: (id) =>
          set(state => ({ items: state.items.filter(i => i.id !== id), _isDirty: true })),

        updateQty: (id, qty) =>
          set(state => {
            const item = state.items.find(i => i.id === id);
            if (!item) return state;
            const isWeight = item.is_sold_by_weight;
            const rounded = isWeight ? qty : Math.round(qty);
            const safeQty = Math.max(isWeight ? 0.001 : 1, rounded);

            const packQty = item.pack_qty ?? 1;
            const hasTiers = (item.quantity_discounts ?? []).length > 0;

            let discPatch: Partial<Pick<CartItem, 'discount_percentage' | 'discount_amount' | 'discount_mode'>>;

            if (hasTiers) {
              const resolved = resolveQuantityTier(item.quantity_discounts, safeQty, packQty);
              discPatch = {
                discount_percentage: resolved?.discount_percentage ?? 0,
                discount_amount:     resolved?.mode === 'fixed_amount' ? resolved.discount_amount : 0,
                discount_mode:       resolved?.mode ?? 'percentage',
              };
            } else {
              discPatch = {};
            }

            const updated = recalcItem({ ...item, quantity: safeQty, ...discPatch });
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
        clearCart: () => set(s => ({
          items: [], client: null, notes: '', invoiceDiscountPct: 0, payments: [], _isDirty: false,
          documentId: null, documentNumber: null, documentDate: null,
          saleNumber: smallestFreeNumber(s.heldCarts),
        })),
        setInvoiceDiscountPct: (pct) =>
          set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)), _isDirty: true }),

        setDocumentMeta: ({ id, number, date }) =>
          set({
            documentId:      id ?? null,
            documentNumber:  number ?? null,
            documentDate:    date ?? null,
          }),

        holdCart: ({ items, totals, client, label }) => {
          if (!items.length) return;
          const held: HeldCart = {
            id:             nanoid(6),
            label:          label ?? `سلة ${get().saleNumber}`,
            items:          [...items],
            totals,
            client:         client ?? null,
            created_at:     new Date().toISOString(),
            documentId:     get().documentId ?? null,
            documentNumber: get().documentNumber ?? null,
            documentDate:   get().documentDate ?? null,
          };
          set(s => {
            const heldCarts = [...s.heldCarts, held];
            return {
              heldCarts,
              items: [], client: null, notes: '', invoiceDiscountPct: 0, payments: [], _isDirty: false,
              documentId: null, documentNumber: null, documentDate: null,
              saleNumber: smallestFreeNumber(heldCarts),
            };
          });
        },

        restoreCart: (id) => {
          const held = get().heldCarts.find(c => c.id === id);
          if (!held) return null;
          set(s => {
            const m = (held.label ?? '').match(/\d+/);
            return {
              items:           held.items,
              client:          held.client ?? null,
              heldCarts:       s.heldCarts.filter(c => c.id !== id),
              saleNumber:      m ? Number(m[0]) : s.saleNumber,
              documentId:      held.documentId ?? null,
              documentNumber:  held.documentNumber ?? null,
              documentDate:    held.documentDate ?? null,
              _isDirty:        false,
            };
          });
          return held;
        },

        deleteHeldCart: (id) =>
          set(s => {
            const heldCarts = s.heldCarts.filter(c => c.id !== id);
            if (s.items.length === 0) return { heldCarts, saleNumber: smallestFreeNumber(heldCarts) };
            return { heldCarts };
          }),

        bumpSaleNumber: () => set(s => ({ saleNumber: smallestFreeNumber(s.heldCarts) })),

        markClean: () => set({ _isDirty: false }),
      }),
      {
        name:       persistKey,
        partialize: (state) => ({
          items:              state.items,
          client:             state.client,
          notes:              state.notes,
          invoiceDiscountPct: state.invoiceDiscountPct,
          payments:           state.payments,
          heldCarts:          state.heldCarts,
          saleNumber:         state.saleNumber,
          documentId:         state.documentId,
          documentNumber:     state.documentNumber,
          documentDate:       state.documentDate,
          _isDirty:           true,
        }),
        merge: (persisted, current) => {
          const merged = { ...current, ...(persisted as Partial<PosProCartState> ?? {}) } as PosProCartState;
          if (merged.items.length === 0) merged.saleNumber = smallestFreeNumber(merged.heldCarts);
          return merged;
        },
      },
    ),
  );
}

/** سلة POS PRO — مستقلة عن pos-cart بمفتاحها الخاص */
export const usePosProCart = createCartStore('pos-pro-cart');
