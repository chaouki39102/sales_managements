// ════════════════════════════════════════════════════════════════════════════
// pages/documents/utils/document.utils.ts — إصلاح كامل للحسابات
//
// ══ نموذج البيانات (مصدر الحقيقة) ══════════════════════════════════════════
//
// الباكاند (DB):
//   quantity         = وحدات أساسية دائماً (مثلاً: 24 قارورة)
//   unit_price_ht    = سعر الوحدة الأساسية HT
//   discount_percentage = نسبة الخصم %
//   discount_amount  = مبلغ خصم الوحدة الواحدة (= unit_price_ht × discPct/100)
//   total_ht         = quantity × unit_price_ht × (1 - discPct/100)
//
// الفرونتند (LineItem):
//   quantity         = عدد العبوات (مثلاً: 2 كرتون)
//   _packQty         = كمية الوحدات في العبوة (مثلاً: 12)
//   unit_price_ht    = سعر الوحدة الأساسية HT (نفس الباكاند)
//   price_per_pack   = سعر العبوة = unit_price_ht × _packQty
//   discount_mode    = 'percent' | 'fixed'
//   discount_percentage = نسبة الخصم % (عند percent)
//   discount_amount_fixed = مبلغ خصم العبوة الواحدة (عند fixed)
//
// ══ معادلات الإرسال للباكاند ════════════════════════════════════════════════
//
//   effectiveQty = quantity × _packQty    (تحويل للوحدات الأساسية)
//   unit_price_ht = unit_price_ht         (لا تغيير)
//   discount_percentage:
//     - percent mode:  discountPercentage (مباشر)
//     - fixed mode:    (discount_amount_fixed / price_per_pack) × 100
//       ملاحظة: discount_amount_fixed هو خصم العبوة الواحدة
//               الباكاند يريد discount_amount = خصم الوحدة الأساسية
//   discount_amount (للباكاند) = unit_price_ht × discPct / 100
//
// ══ معادلات الاستقبال من الباكاند ═══════════════════════════════════════════
//
//   displayQty = db.quantity / _packQty   (تحويل لعبوات)
//   discount_amount_fixed = db.discount_amount × _packQty
//
// ════════════════════════════════════════════════════════════════════════════

import type {
  LineItem,
  DocumentTotals,
  Product,
  ProductPrice,
  ColKey,
} from '../types/document.types';

// ─── Number helpers ───────────────────────────────────────────────────────────

export function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const p = parseFloat(String(v));
  return isNaN(p) ? 0 : p;
}

export function fmtDZD(v: number | string | null | undefined): string {
  const num = toNum(v);
  const formatted = new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return formatted.startsWith('-') ? '\u200E' + formatted : formatted;
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Fiscal stamp ─────────────────────────────────────────────────────────────
// SSOT: App\Services\Tax\FiscalStampCalculator — no threshold, min=5, max=2500, rate=1%
const STAMP_MIN = 5;
const STAMP_MAX = 2_500;

export function calcFiscalStamp(ttc: number): number {
  if (ttc <= 0) return 0;
  const calculated = ttc * 0.01;
  return Math.round(Math.max(STAMP_MIN, Math.min(calculated, STAMP_MAX)) * 100) / 100;
}

// ─── Line calculations ────────────────────────────────────────────────────────

export interface LineCalcResult {
  /** الكمية بالوحدات الأساسية = quantity × _packQty */
  baseQty:      number;
  /** إجمالي قبل الخصم = unit_price_ht × baseQty */
  gross:        number;
  /** مبلغ الخصم الإجمالي */
  discountAmt:  number;
  /** نسبة الخصم الفعلية */
  discPct:      number;
  /** HT بعد الخصم */
  ht:           number;
  /** مبلغ TVA */
  tva:          number;
  /** TTC = ht + tva */
  ttc:          number;
  /** خصم الوحدة الأساسية الواحدة = unit_price_ht × discPct/100 */
  unitDiscount: number;
}

/**
 * حساب إجماليات سطر واحد.
 *
 * القاعدة الأساسية:
 *   baseQty  = quantity × _packQty
 *   gross    = unit_price_ht × baseQty
 *   discount = gross × discPct/100  (أو fixed × quantity لكل العبوات)
 *   ht       = gross - discount
 *   tva      = ht × tvaRate/100
 *   ttc      = ht + tva
 */
export function calcLineTotal(line: LineItem): LineCalcResult {
  const packQty = line._packQty > 1 ? line._packQty : 1;
  const baseQty = Math.round(line.quantity * packQty * 1_000_000) / 1_000_000;

  // الإجمالي قبل الخصم — دائماً unit_price_ht × الكميات الأساسية
  const gross = Math.round(line.unit_price_ht * baseQty * 10_000) / 10_000;

  let discountAmt: number;
  let discPct:     number;

  if (line.discount_mode === 'percent') {
    discPct     = line.discount_percentage;
    discountAmt = Math.round(gross * (discPct / 100) * 10_000) / 10_000;
  } else {
    // fixed: discount_amount_fixed = خصم إجمالي على السطر كله
    discountAmt = Math.min(line.discount_amount_fixed, gross);
    discPct     = gross > 0 ? (discountAmt / gross) * 100 : 0;
  }

  const ht  = Math.round((gross - discountAmt) * 10_000) / 10_000;
  const tva = Math.round(ht * (line.tva_rate / 100) * 10_000) / 10_000;
  const ttc = Math.round((ht + tva) * 10_000) / 10_000;

  // خصم الوحدة الواحدة للإرسال للباكاند
  const unitDiscount = Math.round(line.unit_price_ht * (discPct / 100) * 10_000) / 10_000;

  return { baseQty, gross, discountAmt, discPct, ht, tva, ttc, unitDiscount };
}

export function calcTotals(
  lines:      LineItem[],
  applyStamp: boolean,
  payments:   Array<{ amount: string }>,
): DocumentTotals {
  let gross = 0, ht = 0, tva = 0, discount = 0;

  for (const line of lines) {
    const t = calcLineTotal(line);
    gross    += t.gross;
    ht       += t.ht;
    tva      += t.tva;
    discount += t.discountAmt;
  }

  // تقريب نهائي
  gross    = Math.round(gross    * 100) / 100;
  ht       = Math.round(ht       * 100) / 100;
  tva      = Math.round(tva      * 100) / 100;
  discount = Math.round(discount * 100) / 100;

  const ttc      = Math.round((ht + tva) * 100) / 100;
  const stamp    = applyStamp ? calcFiscalStamp(ttc) : 0;
  const netToPay = Math.round((ttc + stamp) * 100) / 100;
  const totalPaid = payments.reduce((acc, p) => acc + toNum(p.amount), 0);

  return { gross, ht, tva, ttc, discount, stamp, netToPay, totalPaid, remaining: netToPay - totalPaid };
}

// ─── Price resolution ─────────────────────────────────────────────────────────

function resolveProductPrice(product: Product, entry: ProductPrice): number {
  const cost = toNum(product.purchase_price_ht) || toNum(product.current_cost_price) || 0;
  const val  = entry.price ?? entry.rate ?? entry.margin ?? null;
  if (val === null) return 0;
  if (entry.pricing_method === 'fixed')  return val;
  if (entry.pricing_method === 'rate')   return cost * (1 + val / 100);
  if (entry.pricing_method === 'margin') return cost + val;
  return cost;
}

export function resolvePrice(
  product:      Product,
  priceLevelId: number | null,
  isPurchase:   boolean,
): number {
  if (isPurchase) {
    return toNum(product.purchase_price_ht ?? product.current_cost_price) || 0;
  }

  if (priceLevelId) {
    const entry = (product.prices ?? []).find(
      (p) => p.price_level_id === priceLevelId && p.active,
    );
    if (entry) {
      const v = resolveProductPrice(product, entry);
      if (v > 0) return v;
    }
  }

  const defaultPrice = toNum(product.default_selling_price_ht);
  if (defaultPrice > 0) return defaultPrice;

  const costPrice = toNum(product.purchase_price_ht) || toNum(product.current_cost_price);
  if (costPrice > 0) return Math.round(costPrice * 1.3 * 100) / 100;

  return 0;
}

export function resolveQuantityDiscount(
  product:      Product,
  baseQty:      number,
  priceLevelId: number | null,
): { percentage: number; fixed: number } {
  // baseQty = الكميات الأساسية (بعد ضرب عدد العبوات)
  const matches = (product.quantityDiscounts ?? []).filter((d: any) => {
    if (!d.active)                                              return false;
    if (priceLevelId && d.price_level_id !== priceLevelId)     return false;
    if (baseQty < d.min_qty)                                    return false;
    if (d.max_qty != null && baseQty > d.max_qty)               return false;
    return true;
  });

  if (matches.length === 0) return { percentage: 0, fixed: 0 };

  const best = matches[matches.length - 1];
  return {
    percentage: toNum(best.discount_percentage),
    fixed:      toNum(best.discount_amount),
  };
}

// ─── Columns persistence ──────────────────────────────────────────────────────

const COLS_STORAGE_KEY = 'cdm_visible_cols_v3';

const DEFAULT_VISIBLE_COLS: ColKey[] = [
  'idx', 'product', 'packaging', 'lot',
  'quantity', 'unit_price', 'pack_price',
  'discount', 'tva', 'total_ttc', 'actions',
];

export function loadVisibleCols(slug: string): Set<ColKey> {
  try {
    const raw = localStorage.getItem(`${COLS_STORAGE_KEY}_${slug}`);
    if (raw) return new Set(JSON.parse(raw) as ColKey[]);
  } catch {}
  return new Set<ColKey>(DEFAULT_VISIBLE_COLS);
}

export function saveVisibleCols(slug: string, cols: Set<ColKey>): void {
  try {
    localStorage.setItem(`${COLS_STORAGE_KEY}_${slug}`, JSON.stringify([...cols]));
  } catch {}
}

// ─── Stock helpers ────────────────────────────────────────────────────────────

export function getProductStock(
  product:   Product,
  stockData: Record<number, number>,
): number {
  if (!product.manages_stock) return Infinity;
  const realtime = stockData[product.id];
  if (realtime !== undefined) return toNum(realtime);
  if (product.stock_quantity != null) return toNum(product.stock_quantity);
  return (product.lots ?? []).reduce((acc, l) => acc + (l.remaining_quantity ?? 0), 0);
}

export type LineStockValidation =
  | { ok: true }
  | { ok: false; blocking: true;  message: string }
  | { ok: false; blocking: false; message: string };

/**
 * التحقق من المخزون.
 * stockData يحتوي على الكميات بالوحدات الأساسية.
 * يجب مقارنتها بـ baseQty (= quantity × _packQty).
 */
export function validateLineStock(
  line:       LineItem,
  product:    Product,
  isPurchase: boolean,
  stockData:  Record<number, number>,
): LineStockValidation {
  if (isPurchase || !product.manages_stock) return { ok: true };

  const stock   = getProductStock(product, stockData);
  const baseQty = Math.round(line.quantity * (line._packQty > 1 ? line._packQty : 1) * 1000) / 1000;

  if (baseQty <= stock) return { ok: true };

  const packLabel = line._packQty > 1
    ? `${line.quantity} عبوة (${baseQty} وحدة)`
    : `${baseQty} وحدة`;

  if (!product.allow_negative_stock) {
    return {
      ok: false,
      blocking: false,
      message: `تنبيه: الكمية المطلوبة (${packLabel}) — المتاح (${stock} وحدة)`,
    };
  }

  return {
    ok: false,
    blocking: false,
    message: `تنبيه: البيع سيجعل المخزون سالباً (${Math.round((stock - baseQty) * 1000) / 1000} وحدة)`,
  };
}
