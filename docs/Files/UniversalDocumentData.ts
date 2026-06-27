// ════════════════════════════════════════════════════════════════════════════
// reporting/data/UniversalDocumentData.ts
//
// THE single data contract for the ERP Report Designer Framework.
//
// Design rules:
//   1. Every preview component (Thermal, A4, A5, future) consumes THIS type.
//   2. No component builds its own data shape from raw API responses.
//   3. ReceiptLiveData / TemplateLiveData (in types.ts) become aliases for
//      UniversalDocumentData. Migration happens in Phase 1 — in Phase 0 the
//      old types keep their existing shape and live alongside this contract.
//   4. No MOCK or demo data lives in this file or in any component file.
//      Test fixtures live in __tests__/ or Storybook stories only.
//   5. All fields are optional at the top level so the contract is usable
//      for partial documents (e.g. draft with no party yet assigned).
// ════════════════════════════════════════════════════════════════════════════

// ─── Sub-types ───────────────────────────────────────────────────────────────

export interface DocumentInfo {
  /** e.g. "FV-2025-001770" */
  number:       string;
  /** ISO date string "2026-06-26" */
  date:         string;
  /** ISO date string or null */
  dueDate?:     string | null;
  /** localised time string e.g. "14:35" — computed by DocumentDataBuilder */
  time?:        string;
  /** DocTypeCode: "FV", "BL", "FA", "POS", … */
  typeCode?:    string;
  /** Localised document type name e.g. "فاتورة المبيعات" */
  typeName?:    string;
  /** "draft" | "pending" | "validated" | "paid" | "cancelled" | … */
  status?:      string;
  notes?:       string | null;
  reference?:   string | null;
}

export interface CompanyInfo {
  name:     string;
  address?: string | null;
  phone?:   string | null;
  nif?:     string | null;
  rc?:      string | null;
  nis?:     string | null;
  ice?:     string | null;
  article?: string | null;
  logoUrl?: string | null;
  email?:   string | null;
  website?: string | null;
}

export interface PartyInfo {
  id?:          number;
  name:         string;
  type?:        'customer' | 'supplier';
  nif?:         string | null;
  rc?:          string | null;
  nis?:         string | null;
  phone?:       string | null;
  email?:       string | null;
  address?:     string | null;
  deliveryAddress?: string | null;
  /** Cashier name for POS context */
  cashierName?: string | null;
}

export interface WarehouseInfo {
  id?:     number;
  name:    string;
  address?: string | null;
  code?:   string | null;
}

export interface SessionInfo {
  id?:         number;
  /** Session code / number */
  code?:       string | null;
  openedAt?:   string | null;
  closedAt?:   string | null;
  cashierName?: string | null;
}

export interface DocumentLine {
  /** Line index (1-based, for display) */
  rowNumber:    number;
  /** Product reference / SKU */
  ref?:         string | null;
  /** Product barcode */
  barcode?:     string | null;
  /** Product or service description */
  name:         string;
  /** Unit of measure label e.g. "قطعة" */
  unit?:        string | null;
  quantity:     number;
  /** Unit price excluding tax */
  unitPriceHt:  number;
  /** Unit price including tax */
  unitPriceTtc: number;
  /** TVA rate as decimal e.g. 0.19 for 19% */
  tvaRate:      number;
  /** TVA percentage as integer e.g. 19 */
  tvaPct:       number;
  /** Discount percentage e.g. 10 for 10% */
  discountPct:  number;
  /** Discount amount in DZD */
  discountAmt:  number;
  /** Line total HT after discount */
  totalHt:      number;
  /** Line TVA amount */
  totalTva:     number;
  /** Line total TTC after discount */
  totalTtc:     number;
  /** Lot/serial number if applicable */
  lot?:         string | null;
  notes?:       string | null;
}

export interface TaxRate {
  /** Integer percentage e.g. 9, 19 */
  rate:   number;
  /** Taxable base HT */
  baseHt: number;
  /** TVA amount for this rate */
  tva:    number;
  /** Total TTC for this rate */
  ttc:    number;
}

export interface DocumentTotals {
  totalHt:       number;
  totalTva:      number;
  totalTtc:      number;
  /** Fiscal stamp (timbre fiscal) — flat 1% capped at 2500 DZD in Algeria */
  fiscalStamp:   number;
  totalDiscount: number;
  /** Amount effectively paid */
  paid:          number;
  /** Change returned to customer */
  change:        number;
  /** Amount still owed */
  remaining:     number;
}

export interface Payment {
  /** Payment mode name e.g. "نقداً", "تحويل بنكي" */
  mode:      string;
  amount:    number;
  reference?: string | null;
  date?:     string | null;
}

export interface BalanceInfo {
  /** Party balance before this document */
  previous: number;
  /** Net movement from this document */
  movement: number;
  /** Party balance after this document */
  current:  number;
  /** Payment due date balance (for credit terms) */
  due?:     number | null;
}

export interface CurrencyInfo {
  code?:   string;
  /** DZD by default */
  symbol?: string;
  /** Exchange rate to base currency */
  rate?:   number;
}

// ─── Primary contract ─────────────────────────────────────────────────────────

export interface UniversalDocumentData {
  /** Document identity: number, date, type, status */
  doc:          DocumentInfo;
  /** Printing company info (may be overridden by template override_* fields) */
  company:      CompanyInfo;
  /** Customer or supplier. Null for anonymous POS sales. */
  party?:       PartyInfo | null;
  /** Warehouse / branch */
  warehouse?:   WarehouseInfo | null;
  /** POS session — null for commercial documents */
  session?:     SessionInfo | null;
  /** Document lines */
  lines:        DocumentLine[];
  /** Aggregated totals */
  totals:       DocumentTotals;
  /** Per-rate tax breakdown */
  taxBreakdown: TaxRate[];
  /** Payment methods used */
  payments:     Payment[];
  /** Party balance snapshot — null if party has no balance tracking */
  balance?:     BalanceInfo | null;
  /** Currency info */
  currency?:    CurrencyInfo;
  /**
   * Computed / formula results.
   * FormulaEngine writes results here keyed by expression ID.
   * Preview components read from here after evaluation.
   */
  computed:     Record<string, unknown>;
}

// ─── Legacy shape (for migration only) ────────────────────────────────────────
//
// This mirrors the old TemplateLiveData from types.ts.
// It is NOT exported from the reporting package — existing code continues
// to import ReceiptLiveData / TemplateLiveData from types.ts until Phase 1.
// The fromLegacyLiveData() converter below bridges old → new.

/**
 * The old TemplateLiveData / ReceiptLiveData shape — kept for migration.
 * Do NOT add new fields here. Add them to UniversalDocumentData instead.
 */
export interface LegacyLiveDataShape {
  docNumber?:   string;
  docDate?:     string;
  dueDate?:     string;
  cashierName?: string;
  client?:      { name?: string; nif?: string; phone?: string; address?: string } | null;
  items?:       Array<{
    name:               string;
    ref?:               string;
    qty:                number;
    unit_price_ht:      number;
    unit?:              string;
    tva_rate:           number;
    discount_percentage?: number;
    total_ht:           number;
  }>;
  totals?: {
    total_ht:       number;
    total_tva:      number;
    total_ttc:      number;
    fiscal_stamp:   number;
    total_discount: number;
    paid?:          number;
    change?:        number;
    remaining?:     number;
  };
  payments?:    Array<{ mode: string; amount: number }>;
  prevBalance?: number;
  newBalance?:  number;
}

// ─── Migration helper ─────────────────────────────────────────────────────────

/**
 * Converts the old LegacyLiveDataShape into UniversalDocumentData.
 * Used during Phase 0 migration at call sites that still build the legacy shape.
 * Once all call sites are migrated to DocumentDataBuilder, this can be removed.
 *
 * @param legacy     — The legacy snake_case data shape
 * @param company    — Optional company info (falls back to empty)
 * @param fallback   — Optional date/time strings when legacy has none
 */
export function fromLegacyLiveData(
  legacy: LegacyLiveDataShape,
  company?: CompanyInfo,
  fallback?: { date?: string; time?: string },
): UniversalDocumentData {
  const totals = legacy.totals;

  const lines: DocumentLine[] = (legacy.items ?? []).map((item, i) => {
    const tvaRate = item.tva_rate ?? 0;
    const tvaPct  = Math.round(tvaRate * 100);
    const totalHt = item.total_ht ?? 0;
    const totalTva = totalHt * tvaRate;
    return {
      rowNumber:    i + 1,
      ref:          item.ref ?? null,
      barcode:      null,
      name:         item.name,
      unit:         item.unit ?? null,
      quantity:     item.qty,
      unitPriceHt:  item.unit_price_ht,
      unitPriceTtc: item.unit_price_ht * (1 + tvaRate),
      tvaRate,
      tvaPct,
      discountPct:  item.discount_percentage ?? 0,
      discountAmt:  item.total_ht * ((item.discount_percentage ?? 0) / 100),
      totalHt,
      totalTva,
      totalTtc:     totalHt + totalTva,
      lot:          null,
      notes:        null,
    };
  });

  // Build per-rate tax breakdown from lines
  const rateMap = new Map<number, TaxRate>();
  for (const line of lines) {
    const existing = rateMap.get(line.tvaPct) ?? { rate: line.tvaPct, baseHt: 0, tva: 0, ttc: 0 };
    rateMap.set(line.tvaPct, {
      rate:   line.tvaPct,
      baseHt: existing.baseHt + line.totalHt,
      tva:    existing.tva    + line.totalTva,
      ttc:    existing.ttc    + line.totalTtc,
    });
  }

  const hasPrevBalance = legacy.prevBalance !== undefined && legacy.prevBalance !== null;
  const hasNewBalance  = legacy.newBalance  !== undefined && legacy.newBalance  !== null;

  return {
    doc: {
      number:  legacy.docNumber ?? '',
      date:    legacy.docDate   ?? fallback?.date ?? '—',
      dueDate: legacy.dueDate   ?? null,
      time:    fallback?.time ?? null,
    },
    company: company ?? {
      name:    '',
      address: null,
      phone:   null,
      nif:     null,
      rc:      null,
      nis:     null,
      ice:     null,
      article: null,
      logoUrl: null,
    },
    party: legacy.client
      ? {
          name:    legacy.client.name    ?? '',
          nif:     legacy.client.nif     ?? null,
          phone:   legacy.client.phone   ?? null,
          address: legacy.client.address ?? null,
          cashierName: legacy.cashierName ?? null,
        }
      : legacy.cashierName
        ? { name: '', cashierName: legacy.cashierName }
        : null,
    session:   null,
    warehouse: null,
    lines,
    totals: {
      totalHt:       totals?.total_ht       ?? 0,
      totalTva:      totals?.total_tva      ?? 0,
      totalTtc:      totals?.total_ttc      ?? 0,
      fiscalStamp:   totals?.fiscal_stamp   ?? 0,
      totalDiscount: totals?.total_discount ?? 0,
      paid:          totals?.paid           ?? 0,
      change:        totals?.change         ?? 0,
      remaining:     totals?.remaining      ?? 0,
    },
    taxBreakdown: Array.from(rateMap.values()),
    payments:     (legacy.payments ?? []).map(p => ({ mode: p.mode, amount: p.amount })),
    balance: (hasPrevBalance || hasNewBalance)
      ? {
          previous: legacy.prevBalance ?? 0,
          movement: (legacy.newBalance ?? 0) - (legacy.prevBalance ?? 0),
          current:  legacy.newBalance  ?? 0,
        }
      : null,
    currency: { code: 'DZD', symbol: 'دج', rate: 1 },
    computed: {},
  };
}

// ─── Empty document factory ───────────────────────────────────────────────────

/**
 * Returns a structurally valid but visually empty UniversalDocumentData.
 * Use this in preview components instead of MOCK data when liveData is null.
 * All string fields are '—', all numbers are 0, all arrays empty, no timestamps.
 * Deterministic — always returns the same shape regardless of when called.
 */
export function emptyDocumentData(): UniversalDocumentData {
  return {
    doc: {
      number:   '—',
      date:     '—',
      dueDate:  null,
      time:     null,
      typeCode: 'FV',
      typeName: 'معاينة',
      status:   'draft',
    },
    company: {
      name:    '',
      address: null,
      phone:   null,
      nif:     null,
      rc:      null,
      nis:     null,
      ice:     null,
      article: null,
      logoUrl: null,
    },
    party:       null,
    session:     null,
    warehouse:   null,
    lines:       [],
    totals: {
      totalHt:       0,
      totalTva:      0,
      totalTtc:      0,
      fiscalStamp:   0,
      totalDiscount: 0,
      paid:          0,
      change:        0,
      remaining:     0,
    },
    taxBreakdown: [],
    payments:     [],
    balance:      null,
    currency:     { code: 'DZD', symbol: 'دج', rate: 1 },
    computed:     {},
  };
}
