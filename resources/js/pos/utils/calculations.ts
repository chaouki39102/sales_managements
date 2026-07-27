// ════════════════════════════════════════════════
// pos/utils/calculations.ts — حسابات POS
// مصدر واحد فقط لكل الحسابات
// ════════════════════════════════════════════════
import type { CartItem, CartTotals } from '@/types';
import type { QuantityDiscount } from '@/types/product';

/** حساب سعر TTC من HT + TVA */
export function htToTtc(ht: number, tvaRate: number): number {
  return ht * (1 + tvaRate / 100);
}

/** حساب سعر HT من TTC + TVA */
export function ttcToHt(ttc: number, tvaRate: number): number {
  return ttc / (1 + tvaRate / 100);
}

/** حساب هامش الربح */
export function calcMargin(sellingHt: number, costHt: number): number {
  if (sellingHt <= 0) return 0;
  return ((sellingHt - costHt) / sellingHt) * 100;
}

/** متوسط هامش الربح موزون حسب قيمة البيع */
export function calcWeightedAverageMargin(items: Array<{ sellingHt: number; costHt: number }>): number {
  if (!items.length) return 0;
  const totalSellingHt = items.reduce((sum, item) => sum + (item.sellingHt ?? 0), 0);
  if (totalSellingHt <= 0) return 0;
  const totalCostHt = items.reduce((sum, item) => sum + (item.costHt ?? 0), 0);
  return ((totalSellingHt - totalCostHt) / totalSellingHt) * 100;
}

/** الطابع الجبائي الجزائري — متوافق مع App\Services\Tax\FiscalStampCalculator */
const FISCAL_STAMP_MIN = 5.0;
const FISCAL_STAMP_MAX = 2500.0;
const FISCAL_STAMP_RATE = 0.01;

export function calcFiscalStamp(totalTtc: number): number {
  if (totalTtc <= 0) return 0;
  const calculated = totalTtc * FISCAL_STAMP_RATE;
  return Math.round(Math.max(FISCAL_STAMP_MIN, Math.min(calculated, FISCAL_STAMP_MAX)) * 100) / 100;
}

/**
 * Calc compounded discount percentage (item discount + invoice discount stacked multiplicatively).
 * Used by both calcTotals (display) and handleCompleteSale (save) to guarantee identical totals.
 * Formula: 1 - (1 - itemDisc%) × (1 - invDisc%)
 */
export function calcCompoundedDiscount(itemDiscPct: number, invDiscPct: number): number {
  return invDiscPct > 0
    ? 100 - (100 - itemDiscPct) * (100 - invDiscPct) / 100
    : itemDiscPct;
}

/** حساب مجاميع العربة */
export function calcTotals(items: CartItem[], invoiceDiscountPct = 0, fiscalStampEnabled = true, isTvaExempt = false): CartTotals {
  let totalHt       = 0;
  const totalTva      = 0;
  let totalDiscount = 0;
  let itemsCount    = 0;

  for (const item of items) {
    totalHt       += item.total_ht;
    totalDiscount += item.discount_amount;
    itemsCount    += item.quantity;
  }

  // No intermediate rounding — must match handleCompleteSale's compounded-discount math
  // exactly so the displayed total always equals the saved total (no 1-cent gaps).
  const invoiceDiscountAmount = totalHt > 0
    ? totalHt * invoiceDiscountPct / 100
    : 0;
  const adjTotalHt  = totalHt - invoiceDiscountAmount;
  // ✅ TVA-exempt parties: backend forces tva_rate=0, so frontend must match
  const adjTotalTva = isTvaExempt ? 0
    : totalHt > 0
      ? items.reduce((s, item) => {
          const share = item.total_ht / totalHt;
          return s + ((item.total_ht - invoiceDiscountAmount * share) * item.tva_rate / 100);
        }, 0)
      : totalTva;
  const totalTtc     = adjTotalHt + adjTotalTva;
  const fiscalStamp  = fiscalStampEnabled ? calcFiscalStamp(totalTtc) : 0;

  return {
    total_ht:                Math.round(adjTotalHt  * 100) / 100,
    total_tva:               Math.round(adjTotalTva * 100) / 100,
    total_ttc:               Math.round(totalTtc    * 100) / 100,
    total_discount:          Math.round(totalDiscount * 100) / 100,
    fiscal_stamp:            fiscalStamp,
    items_count:             itemsCount,
    lines_count:             items.length,
    invoice_discount_pct:    invoiceDiscountPct || undefined,
    invoice_discount_amount: invoiceDiscountAmount || undefined,
  };
}

/** تنسيق المبلغ بالدينار الجزائري */
export function formatDZD(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0 دج';
  const formatted = new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(n);
  return (formatted.startsWith('-') ? '\u200E' : '') + formatted + ' دج';
}

/** حساب الباقي من الدفع */
export function calcChange(paid: number, totalTtc: number, fiscalStamp: number): number {
  return Math.max(0, paid - (totalTtc + fiscalStamp));
}

/** تحقق أن الكمية في المخزون */
export function checkStock(item: CartItem, newQty: number): { ok: boolean; message: string } {
  if (item.max_stock == null) return { ok: true, message: '' };
  if (newQty > item.max_stock) {
    return { ok: false, message: `المخزون المتاح: ${item.max_stock} ${item.unit_symbol ?? ''}` };
  }
  return { ok: true, message: '' };
}

/** تقريب للمبلغ */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
// Quantity Tiers — مصدر واحد لجميع مكونات POS
// ══════════════════════════════════════════════════════════════

export interface ResolvedTier {
  mode:               'percentage' | 'fixed_amount';
  discount_percentage: number;
  discount_amount:     number;
  quantity_discount_id?: number | null;
}

/** حساب الكمية الأساسية (الكمية × packQty) — يطابق الباكند */
export function resolveQuantityTier(
  discounts: QuantityDiscount[] | undefined,
  qty: number,
  packQty: number,
): ResolvedTier | null {
  if (!discounts?.length) return null;
  const baseQty = qty * (packQty || 1);
  const sorted = [...discounts]
    .filter(d => d.active && !d.is_blocked)
    .sort((a, b) => Number(b.min_qty) - Number(a.min_qty));
  const match = sorted.find(d =>
    baseQty >= Number(d.min_qty) &&
    (d.max_qty == null || baseQty <= Number(d.max_qty)),
  );
  if (!match) return null;

  if (match.discount_amount != null && Number(match.discount_amount) > 0) {
    return {
      mode:               'fixed_amount',
      discount_percentage: 0,
      discount_amount:     Number(match.discount_amount) * baseQty,
      quantity_discount_id: match.id,
    };
  }
  if (match.discount_percentage != null && Number(match.discount_percentage) > 0) {
    const pct = Math.min(100, Number(match.discount_percentage));
    return {
      mode:               'percentage',
      discount_percentage: pct,
      discount_amount:     0,
      quantity_discount_id: match.id,
    };
  }
  return null;
}

/** حساب إجمالي سطر العربة — مصدر واحد فقط */
export function recalcItem(item: CartItem): CartItem {
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

// ══════════════════════════════════════════════════════════════
// Weight Entry Modal — حسابات الميزان
// ══════════════════════════════════════════════════════════════

/** حساب سعر الوزن = weight × unitPriceHt */
export function calcWeightTotal(weightKg: number, unitPriceHt: number): number {
  return round2(weightKg * unitPriceHt);
}

/** حساب السعر مع التخفيض */
export function calcWeightDiscounted(
  originalTotal: number,
  tier: ResolvedTier | null,
  weight: number,
): number | null {
  if (!tier || weight <= 0 || originalTotal <= 0) return null;
  if (tier.discount_percentage > 0) {
    return round2(originalTotal * (1 - tier.discount_percentage / 100));
  }
  if (tier.discount_amount > 0) {
    return round2(Math.max(0, originalTotal - tier.discount_amount));
  }
  return null;
}

/** حساب الوزن من السعر */
export function calcWeightFromPrice(price: number, unitPriceHt: number): number {
  return unitPriceHt > 0 ? parseFloat((price / unitPriceHt).toFixed(10)) : 0;
}
