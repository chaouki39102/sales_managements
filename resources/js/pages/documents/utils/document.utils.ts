// ════════════════════════════════════════════════════════════════════════════
// pages/documents/utils/document.utils.ts
//
// دوال مساعدة خالصة (pure) — لا React، لا API، لا side effects.
// قابلة للاختبار بشكل مستقل.
// ════════════════════════════════════════════════════════════════════════════

import type {
  LineItem,
  DocumentTotals,
  Product,
  ProductPrice,
  ColKey,
} from '../types/document.types';

// ─── Number helpers ───────────────────────────────────────────────────────────

/** تحويل أي قيمة إلى رقم آمن */
export function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const p = parseFloat(String(v));
  return isNaN(p) ? 0 : p;
}

/** تنسيق رقم بالدينار الجزائري */
export function fmtDZD(v: number | string | null | undefined): string {
  const num = toNum(v);
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** تنسيق تاريخ بالصيغة الجزائرية */
export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

/** تاريخ اليوم بصيغة YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Fiscal stamp ─────────────────────────────────────────────────────────────

/**
 * حساب الطابع الجبائي: 1% من TTC بحد أقصى 2500 دج.
 * لا طابع إذا كان TTC < 30,000 دج.
 */
export function calcFiscalStamp(ttc: number): number {
  if (ttc < 30_000) return 0;
  return Math.min(Math.ceil(ttc * 0.01), 2_500);
}

// ─── Line calculations ────────────────────────────────────────────────────────

export interface LineCalcResult {
  gross:       number;   // السعر × الكمية قبل الخصم
  discountAmt: number;   // مبلغ الخصم
  discPct:     number;   // نسبة الخصم المحسوبة
  ht:          number;   // HT = gross - discount
  tva:         number;   // مبلغ TVA
  ttc:         number;   // TTC = ht + tva
}

export function calcLineTotal(line: LineItem): LineCalcResult {
  // السعر الفعّال: سعر التعبئة إذا كانت التعبئة > 1 وحدة
  const basePrice = line._packQty > 1 ? line.price_per_pack : line.unit_price_ht;
  const gross     = basePrice * line.quantity;

  let discountAmt: number;
  if (line.discount_mode === 'percent') {
    discountAmt = gross * (line.discount_percentage / 100);
  } else {
    discountAmt = line.discount_amount_fixed * line.quantity;
  }
  discountAmt = Math.min(discountAmt, gross);

  const ht     = gross - discountAmt;
  const tva    = ht * (line.tva_rate / 100);
  const ttc    = ht + tva;
  const discPct = gross > 0 ? (discountAmt / gross) * 100 : 0;

  return { gross, discountAmt, discPct, ht, tva, ttc };
}

export function calcTotals(
  lines:        LineItem[],
  applyStamp:   boolean,
  payments:     Array<{ amount: string }>,
): DocumentTotals {
  let gross = 0, ht = 0, tva = 0, discount = 0;

  for (const line of lines) {
    const t = calcLineTotal(line);
    gross    += t.gross;
    ht       += t.ht;
    tva      += t.tva;
    discount += t.discountAmt;
  }

  const ttc        = ht + tva;
  const stamp      = applyStamp ? calcFiscalStamp(ttc) : 0;
  const netToPay   = ttc + stamp;
  const totalPaid  = payments.reduce((acc, p) => acc + toNum(p.amount), 0);

  return { gross, ht, tva, ttc, discount, stamp, netToPay, totalPaid, remaining: netToPay - totalPaid };
}

// ─── Price resolution ─────────────────────────────────────────────────────────

function resolveProductPrice(
  product:  Product,
  entry:    ProductPrice,
): number {
  const cost = toNum(product.purchase_price_ht ?? product.current_cost_price ?? 0);
  const val  = entry.price ?? entry.rate ?? entry.margin ?? null;
  if (val === null) return 0;
  if (entry.pricing_method === 'fixed')  return val;
  if (entry.pricing_method === 'rate')   return cost * (1 + val / 100);
  if (entry.pricing_method === 'margin') return cost + val;
  return cost;
}

/**
 * يحدد السعر الصحيح للمنتج بناءً على:
 * - نوع العملية (شراء / بيع)
 * - فئة السعر (price level) إن وُجدت
 * - السعر الافتراضي
 * - fallback: سعر الشراء + هامش 30%
 */
export function resolvePrice(
  product:       Product,
  priceLevelId:  number | null,
  isPurchase:    boolean,
): number {
  if (isPurchase) {
    return toNum(product.purchase_price_ht ?? product.current_cost_price) || 0;
  }

  // بيع بفئة سعرية محددة
  if (priceLevelId) {
    const entry = (product.prices ?? []).find(
      (p) => p.price_level_id === priceLevelId && p.active,
    );
    if (entry) {
      const v = resolveProductPrice(product, entry);
      if (v > 0) return v;
    }
  }

  // السعر الافتراضي
  const defaultPrice = toNum(product.default_selling_price_ht);
  if (defaultPrice > 0) return defaultPrice;

  // fallback: سعر الشراء + 30%
  const costPrice = toNum(product.purchase_price_ht ?? product.current_cost_price);
  if (costPrice > 0) return Math.round(costPrice * 1.3 * 100) / 100;

  return 0;
}

/**
 * خصم الكميات المناسب لمنتج وكمية وفئة سعر معينة
 */
export function resolveQuantityDiscount(
  product:       Product,
  qty:           number,
  priceLevelId:  number | null,
): { percentage: number; fixed: number } {
  const matches = (product.quantityDiscounts ?? []).filter((d) => {
    if (!d.active)                              return false;
    if (priceLevelId && d.price_level_id !== priceLevelId) return false;
    if (qty < d.min_qty)                        return false;
    if (d.max_qty && qty > d.max_qty)           return false;
    return true;
  });

  if (matches.length === 0) return { percentage: 0, fixed: 0 };

  const best = matches[matches.length - 1];
  return {
    percentage: best.discount_percentage ?? 0,
    fixed:      best.discount_amount     ?? 0,
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

/** المخزون الفعلي للمنتج (يفضّل البيانات الآنية من API) */
export function getProductStock(
  product:   Product,
  stockData: Record<number, number>,
): number {
  if (!product.manages_stock) return Infinity;

  const realtime = stockData[product.id];
  if (realtime !== undefined) return toNum(realtime);
  if (product.stock_quantity != null) return toNum(product.stock_quantity);

  // fallback: مجموع الأكوام
  return (product.lots ?? []).reduce((acc, l) => acc + (l.remaining_quantity ?? 0), 0);
}

/** نتيجة التحقق من كمية سطر واحد */
export type LineStockValidation =
  | { ok: true }
  | { ok: false; blocking: true;  message: string }
  | { ok: false; blocking: false; message: string }; // تحذير غير محجوب

export function validateLineStock(
  line:       LineItem,
  product:    Product,
  isPurchase: boolean,
  stockData:  Record<number, number>,
): LineStockValidation {
  if (isPurchase || !product.manages_stock) return { ok: true };

  const stock = getProductStock(product, stockData);
  const qty   = toNum(line.quantity);

  if (qty <= stock) return { ok: true };

  if (!product.allow_negative_stock) {
    return {
      ok: false,
      blocking: true,
      message: `الكمية المطلوبة (${qty}) أكبر من المتاح (${stock})`,
    };
  }

  return {
    ok: false,
    blocking: false,
    message: `تنبيه: البيع سيجعل المخزون سالباً (${stock - qty})`,
  };
}
