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
  name:            string;
  commercialName?: string | null;
  address?:        string | null;
  phone?:          string | null;
  mobile?:         string | null;
  fax?:            string | null;
  email?:          string | null;
  nif?:            string | null;
  rc?:             string | null;
  nis?:            string | null;
  article?:        string | null;
  logoUrl?:        string | null;
  capital?:        string | null;
  bankName?:       string | null;
  rib?:            string | null;
  activity?:       string | null;
  website?:        string | null;
}

export interface PartyInfo {
  id?:          number;
  name:         string;
  type?:        'customer' | 'supplier';
  code?:        string | null;
  nif?:         string | null;
  rc?:          string | null;
  nis?:         string | null;
  ai?:          string | null;
  phone?:       string | null;
  mobile?:      string | null;
  fax?:         string | null;
  email?:       string | null;
  address?:     string | null;
  deliveryAddress?: string | null;
  commercialName?: string | null;
  activity?:    string | null;
  bankName?:    string | null;
  rib?:         string | null;
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

// ─── Report summary (for session reports, aggregated reports) ──────────────────

export interface ReportPaymentBreakdown {
  mode:   string;
  count:  number;
  amount: number;
}

export interface ReportProductSummary {
  name:        string;
  ref?:        string | null;
  quantity:    number;
  totalHt:     number;
  totalTtc:    number;
}

export interface ReportSummary {
  /** Report title */
  title?:           string;
  /** Period start (ISO date) */
  periodStart?:     string | null;
  /** Period end (ISO date) */
  periodEnd?:       string | null;
  /** Cashier / user who generated the report */
  cashierName?:     string | null;
  /** Gross sales before returns */
  grossSales:       number;
  /** Total returns */
  returnsTotal:     number;
  /** Net sales (gross - returns) */
  netSales:         number;
  /** Number of invoices in period */
  invoicesCount:    number;
  /** Number of returns in period */
  returnsCount:     number;
  /** Highest single invoice amount */
  highestInvoice:   number;
  /** Average invoice amount */
  avgInvoice:       number;
  /** Total TVA collected */
  totalTva:         number;
  /** Total fiscal stamp */
  totalFiscalStamp: number;
  /** Total discounts given */
  totalDiscount:    number;
  /** Opening cash amount */
  openingCash:      number;
  /** Expected cash in drawer */
  closingCashExpected: number;
  /** Counted cash in drawer */
  closingCashCounted:  number;
  /** Difference (counted - expected) */
  cashDifference:   number;
  /** Per payment mode breakdown */
  paymentBreakdown: ReportPaymentBreakdown[];
  /** Top products sold */
  topProducts:      ReportProductSummary[];
  /** Group label (for grouped reports) */
  groupLabel?:      string;
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
  /** Aggregated report summary — for session reports and aggregated reports */
  report?:      ReportSummary | null;
  /**
   * Computed / formula results.
   * FormulaEngine writes results here keyed by expression ID.
   * Preview components read from here after evaluation.
   */
  computed:     Record<string, unknown>;
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
      mobile:  null,
      nif:     null,
      rc:      null,
      nis:     null,
      article: null,
      logoUrl: null,
      capital: null,
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
    report:       null,
    balance:      null,
    currency:     { code: 'DZD', symbol: 'دج', rate: 1 },
    computed:     {},
  };
}
