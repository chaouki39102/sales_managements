// ════════════════════════════════════════════════
// pos/utils/calculations.ts — حسابات POS
// ════════════════════════════════════════════════
import type { CartItem, CartTotals } from '@/types';

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
export function calcTotals(items: CartItem[], invoiceDiscountPct = 0, fiscalStampEnabled = true): CartTotals {
  let totalHt       = 0;
  let totalTva      = 0;
  let totalDiscount = 0;
  let itemsCount    = 0;

  for (const item of items) {
    totalHt       += item.total_ht;
    totalTva      += item.total_ht * (item.tva_rate / 100);
    totalDiscount += item.discount_amount;
    itemsCount    += item.quantity;
  }

  // No intermediate rounding — must match handleCompleteSale's compounded-discount math
  // exactly so the displayed total always equals the saved total (no 1-cent gaps).
  const invoiceDiscountAmount = totalHt > 0
    ? totalHt * invoiceDiscountPct / 100
    : 0;
  const adjTotalHt  = totalHt - invoiceDiscountAmount;
  const adjTotalTva = totalHt > 0
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
  if (item.max_stock === null) return { ok: true, message: '' };
  if (newQty > item.max_stock) {
    return { ok: false, message: `المخزون المتاح: ${item.max_stock} ${item.unit_symbol ?? ''}` };
  }
  return { ok: true, message: '' };
}

/** تقريب للمبلغ */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
