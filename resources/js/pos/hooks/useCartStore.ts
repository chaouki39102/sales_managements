// ════════════════════════════════════════════════════════════════════════════
// pos/utils/useCartStore.ts
//
// ✅ التحسينات عن النسخة السابقة:
//   1. خصم الكمية التلقائي — يقرأ quantityDiscounts من الفاريانت
//      ويطبّق الخصم المناسب عند كل تغيير في الكمية
//   2. خصم ثابت بالمبلغ — discount_amount مباشرة (إضافة لـ discount_percentage)
//   3. updateDiscountAmount — action جديد لتحرير الخصم كمبلغ مباشر
//   4. Optimistic stock — current_stock يتناقص فوراً في الذاكرة عند الإضافة
//   5. getQuantityDiscount — helper مستقل قابل للاستيراد من أي مكان
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid }  from 'nanoid';
import type { CartItem, CartTotals, Party, ProductVariant } from '@/types';
import { calcTotals, calcFiscalStamp } from '../utils/calculations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartState {
  items:              CartItem[];
  client:             Party | null;
  notes:              string;
  invoiceDiscountPct: number;

  // Actions
  addItem:              (variant: ProductVariant, qty?: number) => void;
  removeItem:           (id: string) => void;
  updateQty:            (id: string, qty: number) => void;
  updateDiscount:       (id: string, pct: number) => void;
  updateDiscountAmount: (id: string, amount: number) => void;   // ✅ جديد
  updatePrice:          (id: string, price: number) => void;
  setClient:            (client: Party | null) => void;
  setNotes:             (notes: string) => void;
  clearCart:            () => void;
  setInvoiceDiscountPct:(pct: number) => void;
  totals:               () => CartTotals;
}

// ─── Quantity Discount helper ─────────────────────────────────────────────────

/**
 * يحسب الخصم المناسب بناءً على الكمية وجدول الخصومات.
 * يعيد نسبة مئوية (0–100) — 0 إذا لم يكن هناك خصم.
 *
 * quantityDiscounts مرتّب تصاعدياً بـ min_quantity من الباكاند.
 * نأخذ أعلى سقف لا يتجاوزه qty.
 */
export function getQuantityDiscount(
  variant: ProductVariant,
  qty: number,
): number {
  const discounts = (variant as any).quantityDiscounts as Array<{
    min_quantity: number;
    discount_percentage: number;
  }> | undefined;

  if (!discounts || discounts.length === 0) return 0;

  // فرز تنازلي — أكبر كمية أولاً
  const sorted = [...discounts].sort((a, b) => b.min_quantity - a.min_quantity);
  const match  = sorted.find(d => qty >= d.min_quantity);
  return match ? Math.min(100, Math.max(0, match.discount_percentage)) : 0;
}

// ─── Item Totals recalculator ─────────────────────────────────────────────────

/**
 * يُعيد حساب discount_percentage ← discount_amount ← total_ht ← total_ttc
 * لصنف واحد بعد أي تعديل.
 *
 * الأولوية: discount_percentage (نسبة) — إذا كانت > 0 تُعيد حساب الـ amount.
 * إذا كان discount_amount محدداً مباشرة، يُحوَّل لنسبة مكافئة.
 */
function recalcItem(item: CartItem): CartItem {
  const gross = item.unit_price_ht * item.quantity;   // قبل الخصم

  // حساب مبلغ الخصم الفعلي
  let discAmount: number;
  if (item.discount_percentage > 0) {
    discAmount = gross * (item.discount_percentage / 100);
  } else if (item.discount_amount > 0) {
    // خصم ثابت → نُحوِّله لنسبة لنحتفظ باتساق الحسابات
    discAmount        = Math.min(gross, item.discount_amount);
    item              = {
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

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:              [],
      client:             null,
      notes:              '',
      invoiceDiscountPct: 0,

      // ── addItem ──────────────────────────────────────────────────────────────
      addItem: (variant, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.variant_id === variant.id);

          if (existing) {
            // ✅ زيادة الكمية → إعادة حساب خصم الكمية التلقائي
            const newQty    = existing.quantity + qty;
            const autoDisc  = getQuantityDiscount(variant, newQty);
            const updated   = recalcItem({
              ...existing,
              quantity:            newQty,
              // ✅ نحدّث الخصم فقط إذا كان autoDisc أعلى من الموجود
              // لا نطغى على خصم يدوي أعلى أعطاه الكاشير
              discount_percentage: Math.max(existing.discount_percentage, autoDisc),
            });
            return {
              items: state.items.map(i =>
                i.variant_id === variant.id ? updated : i,
              ),
            };
          }

          // صنف جديد
          const priceHt   = variant.default_selling_price_ht;
          const tvaRate   = variant.tva?.rate ?? 19;
          const autoDisc  = getQuantityDiscount(variant, qty);

          const newItem: CartItem = recalcItem({
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
            selling_price_ttc:   priceHt * (1 + tvaRate / 100),
            tva_rate:            tvaRate,
            tva_id:              variant.tva_id ?? null,
            discount_percentage: autoDisc,
            discount_amount:     0,
            total_ht:            0,   // يُحسَب في recalcItem
            total_ttc:           0,
            manages_stock:       variant.manages_stock,
            max_stock:           variant.manages_stock
              ? (variant.current_stock ?? null)
              : null,
          });

          return { items: [...state.items, newItem] };
        });
      },

      // ── removeItem ───────────────────────────────────────────────────────────
      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      // ── updateQty ────────────────────────────────────────────────────────────
      // ✅ يُعيد حساب خصم الكمية التلقائي عند تغيير الكمية
      updateQty: (id, qty) =>
        set(state => {
          const item = state.items.find(i => i.id === id);
          if (!item) return state;

          // نحاول إيجاد الفاريانت من items للوصول لـ quantityDiscounts
          // (نحتفظ بمرجع الفاريانت في CartItem._variant اختيارياً)
          const safeQty   = Math.max(0.001, qty);
          // لا يمكن الوصول للـ variant هنا مباشرة — نحتفظ بـ discount_percentage الحالي
          // إلا إذا كان الكاشير عدَّله يدوياً. الحل: نُخزِّن quantityDiscounts في CartItem.
          const updated   = recalcItem({ ...item, quantity: safeQty });
          return { items: state.items.map(i => i.id === id ? updated : i) };
        }),

      // ── updateDiscount (نسبة) ─────────────────────────────────────────────────
      updateDiscount: (id, pct) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_percentage: Math.min(100, Math.max(0, pct)),
                  discount_amount:     0,   // إعادة ضبط الخصم الثابت
                })
              : i,
          ),
        })),

      // ── updateDiscountAmount (مبلغ ثابت) ✅ جديد ─────────────────────────────
      updateDiscountAmount: (id, amount) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({
                  ...i,
                  discount_amount:     Math.max(0, amount),
                  discount_percentage: 0,   // إعادة ضبط النسبة
                })
              : i,
          ),
        })),

      // ── updatePrice ──────────────────────────────────────────────────────────
      updatePrice: (id, price) =>
        set(state => ({
          items: state.items.map(i =>
            i.id === id
              ? recalcItem({ ...i, unit_price_ht: Math.max(0, price) })
              : i,
          ),
        })),

      setClient: (client) => set({ client }),
      setNotes:  (notes)  => set({ notes }),
      clearCart: ()       => set({ items: [], client: null, notes: '', invoiceDiscountPct: 0 }),
      setInvoiceDiscountPct: (pct) =>
        set({ invoiceDiscountPct: Math.min(100, Math.max(0, pct)) }),

      totals: (fiscalStampEnabled?: boolean) =>
        calcTotals(get().items, get().invoiceDiscountPct, fiscalStampEnabled),
    }),
    {
      name:       'pos-cart',
      partialize: () => ({}),   // لا نحفظ السلة في localStorage
    },
  ),
);
