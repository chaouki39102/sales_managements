// ════════════════════════════════════════════════════════════════════════════
// reporting/data/DocumentDataBuilder.ts
//
// Builds UniversalDocumentData from various source shapes:
//   - CommercialDocument (from /api/v1/{company}/documents/{id})
//   - POSSaleSnapshot (from POSPage.handleCompleteSale)
//   - LegacyLiveDataShape (backward compat — existing POS flow)
//
// Principles:
//   - No component builds its own data shape. Call a builder method instead.
//   - All field access is null-safe. Missing API fields → sensible defaults.
//   - No side effects. Pure functions, easily testable.
//   - CompanyInfo is passed in (from the company context, not hardcoded).
// ════════════════════════════════════════════════════════════════════════════

import type {
  UniversalDocumentData,
  DocumentInfo,
  CompanyInfo,
  PartyInfo,
  WarehouseInfo,
  SessionInfo,
  DocumentLine,
  TaxRate,
  DocumentTotals,
  Payment,
  BalanceInfo,
  CurrencyInfo,
} from './UniversalDocumentData';

import { fromLegacyLiveData, emptyDocumentData, type LegacyLiveDataShape } from './UniversalDocumentData';

// ─── Source type: CommercialDocument from API ─────────────────────────────────
//
// We define a minimal interface here so this file has no circular dependency
// on lib/api/core/types. The real CommercialDocument type is a superset.

interface ApiDocumentLine {
  id?:                  number;
  product_id?:          number;
  description?:         string | null;
  quantity:             number;
  unit_price_ht:        number;
  unit_price_ttc?:      number;
  tva_rate:             number;
  discount_percentage?: number;
  discount_amount?:     number;
  total_ht:             number;
  total_tva?:           number;
  total_ttc?:           number;
  product?: {
    name?:       string;
    reference?:  string | null;
    barcode?:    string | null;
    unit?: { name?: string } | null;
  } | null;
  packaging?: { name?: string } | null;
  stock_lot?: { lot_number?: string } | null;
  notes?:     string | null;
}

interface ApiPayment {
  amount:       number;
  reference?:   string | null;
  payment_date?: string | null;
  payment_mode?: { name?: string } | null;
}

interface ApiDocument {
  id?:           number;
  document_number?: string;
  document_date?:   string;
  due_date?:        string | null;
  notes?:           string | null;
  document_type?: {
    code?: string;
    name?: string;
  } | null;
  document_status?: {
    name?: string;
    code?: string;
  } | null;
  party?: {
    id?:      number;
    name?:    string;
    type?:    string;
    nif?:     string | null;
    rc?:      string | null;
    nis?:     string | null;
    /** Actual API returns flat strings, not arrays */
    phone?:   string | null;
    mobile?:  string | null;
    email?:   string | null;
    address?: string | null;
  } | null;
  warehouse?: {
    id?:     number;
    name?:   string;
    code?:   string | null;
    address?: string | null;
  } | null;
  currency?: {
    code?:          string;
    symbol?:        string;
    exchange_rate?: number;
  } | null;
  lines?:    ApiDocumentLine[];
  payments?: ApiPayment[];
  /** Totals computed by backend */
  totals?: {
    total_ht?:       number;
    total_tva?:      number;
    total_ttc?:      number;
    fiscal_stamp?:   number;
    total_discount?: number;
    paid?:           number;
    change?:         number;
    remaining?:      number;
  } | null;
}

// ─── Source type: POS sale snapshot ──────────────────────────────────────────

export interface POSSaleSnapshot {
  docNumber:    string;
  docDate:      string;
  cashierName?: string;
  client?: {
    name?:    string;
    nif?:     string | null;
    phone?:   string | null;
    address?: string | null;
  } | null;
  items: Array<{
    name:               string;
    ref?:               string | null;
    qty:                number;
    unit_price_ht:      number;
    unit?:              string | null;
    tva_rate:           number;
    discount_percentage?: number;
    total_ht:           number;
  }>;
  totals: {
    total_ht:       number;
    total_tva:      number;
    total_ttc:      number;
    fiscal_stamp:   number;
    total_discount: number;
    paid:           number;
    change:         number;
    remaining:      number;
  };
  payments:    Array<{ mode: string; amount: number }>;
  prevBalance?: number | null;
  newBalance?:  number | null;
  dueDate?:    string | null;
}

// ─── DocumentDataBuilder ──────────────────────────────────────────────────────

export const DocumentDataBuilder = {

  /**
   * Build from a full CommercialDocument API response.
   * Used by CommercialDocumentModal and any document-list print action.
   */
  fromApiDocument(
    doc:     ApiDocument,
    company: CompanyInfo,
    options?: {
      prevBalance?: number;
      newBalance?:  number;
    },
  ): UniversalDocumentData {
    const lines  = buildLinesFromApi(doc.lines ?? []);
    const totals = buildTotalsFromApi(doc, lines);

    // Auto-compute balance from document when no explicit options provided:
    // remaining > 0 indicates the party still owes this amount after this doc.
    const balance = options?.prevBalance != null && options?.newBalance != null
      ? buildBalance(options.prevBalance, options.newBalance)
      : buildBalance(0, totals.remaining);

    return {
      doc:         buildDocInfo(doc),
      company,
      party:       buildPartyFromApi(doc.party),
      warehouse:   buildWarehouseFromApi(doc.warehouse),
      session:     null,
      lines,
      totals,
      taxBreakdown: buildTaxBreakdown(lines),
      payments:     buildPaymentsFromApi(doc.payments ?? []),
      balance,
      currency:     buildCurrencyFromApi(doc.currency),
      computed:     {},
    };
  },

  /**
   * Build from a POS sale snapshot.
   * Used by POSPage after a completed sale.
   */
  fromPOSSnapshot(
    snapshot: POSSaleSnapshot,
    company:  CompanyInfo,
    sessionInfo?: SessionInfo | null,
  ): UniversalDocumentData {
    const lines  = buildLinesFromSnapshot(snapshot.items);
    const totals: DocumentTotals = {
      totalHt:       snapshot.totals.total_ht,
      totalTva:      snapshot.totals.total_tva,
      totalTtc:      snapshot.totals.total_ttc,
      fiscalStamp:   snapshot.totals.fiscal_stamp,
      totalDiscount: snapshot.totals.total_discount,
      paid:          snapshot.totals.paid,
      change:        snapshot.totals.change,
      remaining:     snapshot.totals.remaining,
    };

    return {
      doc: {
        number:   snapshot.docNumber,
        date:     snapshot.docDate,
        dueDate:  snapshot.dueDate ?? null,
        time:     new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        typeCode: 'POS',
        typeName: 'إيصال POS',
        status:   'validated',
      },
      company,
      party: snapshot.client
        ? {
            name:         snapshot.client.name    ?? '',
            nif:          snapshot.client.nif     ?? null,
            phone:        snapshot.client.phone   ?? null,
            address:      snapshot.client.address ?? null,
            cashierName:  snapshot.cashierName    ?? null,
          }
        : snapshot.cashierName
          ? { name: '', cashierName: snapshot.cashierName }
          : null,
      session:      sessionInfo ?? null,
      warehouse:    null,
      lines,
      totals,
      taxBreakdown: buildTaxBreakdown(lines),
      payments:     snapshot.payments.map(p => ({ mode: p.mode, amount: p.amount })),
      balance:      buildBalance(snapshot.prevBalance, snapshot.newBalance),
      currency:     { code: 'DZD', symbol: 'دج', rate: 1 },
      computed:     {},
    };
  },

  /**
   * Build from the legacy ReceiptLiveData / TemplateLiveData shape.
   * Migration shim — remove once all call sites use fromPOSSnapshot.
   */
  fromLegacy(
    legacy:  LegacyLiveDataShape,
    company: CompanyInfo,
  ): UniversalDocumentData {
    return fromLegacyLiveData(legacy, company);
  },

  /**
   * Returns an empty document for preview placeholders.
   * Replaces MOCK / MOCK_COMPANY in preview components.
   */
  empty(): UniversalDocumentData {
    return emptyDocumentData();
  },

  /**
   * Builds a UniversalDocumentData from a POS session report.
   * Converts aggregated session data into the ReportSummary structure
   * for template-based session report printing.
   */
  fromSessionReport(
    session: Record<string, unknown>,
    company: CompanyInfo,
  ): UniversalDocumentData {
    const sessionPayments = (session.payments as Array<Record<string, unknown>> | undefined) ?? [];
    const topProducts     = (session.top_products as Array<Record<string, unknown>> | undefined) ?? [];
    const grossSales      = Number(session.gross_sales ?? 0);
    const returnsTotal    = Number(session.returns_total ?? 0);

    return {
      doc: {
        number:   session.document_number as string ?? '—',
        date:     session.closed_at ? String(session.closed_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
        typeCode: 'RPT',
        typeName: 'تقرير الجلسة',
        status:   String(session.status ?? ''),
      },
      company,
      party: null,
      session: {
        id:          session.id as number ?? undefined,
        code:        session.code as string ?? null,
        openedAt:    session.opened_at as string ?? null,
        closedAt:    session.closed_at as string ?? null,
        cashierName: (session.user as Record<string, unknown> | undefined)?.name as string ?? null,
      },
      warehouse: session.warehouse ? {
        id:   (session.warehouse as Record<string, unknown>).id as number ?? undefined,
        name: String((session.warehouse as Record<string, unknown>).name ?? ''),
      } : null,
      lines: [],
      totals: {
        totalHt:       0,
        totalTva:      Number(session.total_tva ?? 0),
        totalTtc:      grossSales,
        fiscalStamp:   Number(session.total_fiscal_stamp ?? 0),
        totalDiscount: Number(session.total_discount ?? 0),
        paid:          grossSales,
        change:        0,
        remaining:     0,
      },
      taxBreakdown: [],
      payments: sessionPayments.map(p => ({
        mode:   String((p.payment_mode as Record<string, unknown> | undefined)?.name ?? '—'),
        amount: Number(p.amount ?? 0),
      })),
      balance: null,
      currency: { code: 'DZD', symbol: 'دج', rate: 1 },
      report: {
        title:              'تقرير جلسة',
        periodStart:        session.opened_at as string ?? null,
        periodEnd:          session.closed_at as string ?? null,
        cashierName:        (session.user as Record<string, unknown> | undefined)?.name as string ?? null,
        grossSales,
        returnsTotal,
        netSales:           Number(session.net_sales ?? 0),
        invoicesCount:      Number(session.invoices_count ?? 0),
        returnsCount:       Number(session.returns_count ?? 0),
        highestInvoice:     Number(session.highest_invoice ?? 0),
        avgInvoice:         Number(session.avg_invoice ?? 0),
        totalTva:           Number(session.total_tva ?? 0),
        totalFiscalStamp:   Number(session.total_fiscal_stamp ?? 0),
        totalDiscount:      Number(session.total_discount ?? 0),
        openingCash:        Number(session.opening_cash ?? 0),
        closingCashExpected: Number(session.closing_cash_expected ?? 0),
        closingCashCounted: Number(session.closing_cash_counted ?? 0),
        cashDifference:     Number(session.cash_difference ?? 0),
        paymentBreakdown: sessionPayments.map(p => ({
          mode:   String((p.payment_mode as Record<string, unknown> | undefined)?.name ?? '—'),
          count:  Number(p.count ?? 0),
          amount: Number(p.amount ?? 0),
        })),
        topProducts: topProducts.slice(0, 10).map(p => ({
          name:     String(p.product_name ?? ''),
          ref:      null,
          quantity: Number(p.quantity_sold ?? 0),
          totalHt:  Number(p.total_ht ?? 0),
          totalTtc: Number(p.total_ttc ?? 0),
        })),
      },
      computed: {},
    };
  },
} as const;

// ─── Internal builders ────────────────────────────────────────────────────────

function buildDocInfo(doc: ApiDocument): DocumentInfo {
  return {
    number:   doc.document_number ?? '—',
    date:     doc.document_date   ?? new Date().toLocaleDateString('ar-DZ'),
    dueDate:  doc.due_date        ?? null,
    time:     new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    typeCode: doc.document_type?.code ?? undefined,
    typeName: doc.document_type?.name ?? undefined,
    status:   doc.document_status?.code ?? doc.document_status?.name ?? undefined,
    notes:    doc.notes ?? null,
  };
}

function buildPartyFromApi(
  party: ApiDocument['party'],
  deliveryAddress?: string | null,
): PartyInfo | null {
  if (!party) return null;
  return {
    id:      party.id,
    name:    party.name ?? '',
    type:    (party.type as 'customer' | 'supplier') ?? undefined,
    nif:     party.nif ?? null,
    rc:      party.rc  ?? null,
    nis:     party.nis ?? null,
    phone:   party.phone ?? null,
    email:   party.email ?? null,
    address: party.address ?? null,
    deliveryAddress: deliveryAddress ?? null,
  };
}

function buildWarehouseFromApi(
  warehouse: ApiDocument['warehouse'],
): WarehouseInfo | null {
  if (!warehouse) return null;
  return {
    id:      warehouse.id,
    name:    warehouse.name    ?? '',
    code:    warehouse.code    ?? null,
    address: warehouse.address ?? null,
  };
}

function buildCurrencyFromApi(
  currency: ApiDocument['currency'],
): CurrencyInfo {
  if (!currency) return { code: 'DZD', symbol: 'دج', rate: 1 };
  return {
    code:   currency.code   ?? 'DZD',
    symbol: currency.symbol ?? 'دج',
    rate:   currency.exchange_rate ?? 1,
  };
}

function buildLineFromApi(line: ApiDocumentLine, index: number): DocumentLine {
  const tvaRate   = line.tva_rate ?? 0;
  const tvaPct    = Math.round(tvaRate * 100);
  const discPct   = line.discount_percentage ?? 0;
  const discAmt   = line.discount_amount     ?? 0;
  const totalHt   = line.total_ht ?? 0;
  const totalTva  = line.total_tva  ?? totalHt * tvaRate;
  const totalTtc  = line.total_ttc  ?? totalHt + totalTva;
  const uPriceHt  = line.unit_price_ht  ?? 0;
  const uPriceTtc = line.unit_price_ttc ?? uPriceHt * (1 + tvaRate);

  return {
    rowNumber:    index + 1,
    ref:          line.product?.reference  ?? null,
    barcode:      line.product?.barcode    ?? null,
    name:         line.product?.name ?? line.description ?? '',
    unit:         line.product?.unit?.name ?? line.packaging?.name ?? null,
    quantity:     line.quantity,
    unitPriceHt:  uPriceHt,
    unitPriceTtc: uPriceTtc,
    tvaRate,
    tvaPct,
    discountPct:  discPct,
    discountAmt:  discAmt,
    totalHt,
    totalTva,
    totalTtc,
    lot:   line.stock_lot?.lot_number ?? null,
    notes: line.notes ?? null,
  };
}

function buildLinesFromApi(apiLines: ApiDocumentLine[]): DocumentLine[] {
  return apiLines.map((line, i) => buildLineFromApi(line, i));
}

function buildLinesFromSnapshot(
  items: POSSaleSnapshot['items'],
): DocumentLine[] {
  return items.map((item, i) => {
    const tvaRate  = item.tva_rate ?? 0;
    const tvaPct   = Math.round(tvaRate * 100);
    const totalHt  = item.total_ht ?? 0;
    const totalTva = totalHt * tvaRate;
    return {
      rowNumber:    i + 1,
      ref:          item.ref  ?? null,
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
}

function buildTaxBreakdown(lines: DocumentLine[]): TaxRate[] {
  const map = new Map<number, TaxRate>();
  for (const line of lines) {
    const existing = map.get(line.tvaPct) ?? {
      rate: line.tvaPct, baseHt: 0, tva: 0, ttc: 0,
    };
    map.set(line.tvaPct, {
      rate:   line.tvaPct,
      baseHt: existing.baseHt + line.totalHt,
      tva:    existing.tva    + line.totalTva,
      ttc:    existing.ttc    + line.totalTtc,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
}

function buildTotalsFromApi(
  doc:   ApiDocument,
  lines: DocumentLine[],
): DocumentTotals {
  // Prefer backend-computed totals; fall back to summing lines
  const t = doc.totals;
  return {
    totalHt:       t?.total_ht       ?? lines.reduce((s, l) => s + l.totalHt,  0),
    totalTva:      t?.total_tva      ?? lines.reduce((s, l) => s + l.totalTva, 0),
    totalTtc:      t?.total_ttc      ?? lines.reduce((s, l) => s + l.totalTtc, 0),
    fiscalStamp:   t?.fiscal_stamp   ?? 0,
    totalDiscount: t?.total_discount ?? lines.reduce((s, l) => s + l.discountAmt, 0),
    paid:          t?.paid           ?? 0,
    change:        t?.change         ?? 0,
    remaining:     t?.remaining      ?? 0,
  };
}

function buildPaymentsFromApi(apiPayments: ApiPayment[]): Payment[] {
  return apiPayments.map(p => ({
    mode:      p.payment_mode?.name ?? '—',
    amount:    p.amount,
    reference: p.reference    ?? null,
    date:      p.payment_date ?? null,
  }));
}

function buildBalance(
  prev?: number | null,
  next?: number | null,
): BalanceInfo | null {
  // Both prev and next must be present for a meaningful balance snapshot.
  // Partial data (one null) → null (caller should provide both or neither).
  if (prev == null || next == null) return null;
  return {
    previous: prev,
    movement: next - prev,
    current:  next,
  };
}
