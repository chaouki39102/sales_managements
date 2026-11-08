// ════════════════════════════════════════════════════════════════════════════
// pos/utils/posSaleHelpers.ts
//
// Pure helpers shared by the POS screens (POSPage, POSProPage, POSProMobilePage).
// Extracted verbatim from the pages — every formula here must stay identical
// to the backend computation (see CommercialDocumentService).
// ════════════════════════════════════════════════════════════════════════════
import { nanoid } from 'nanoid';
import { htToTtc } from '@/pos/utils/calculations';
import { toLocalDateKey } from '@/lib/utils';
import type { CartItem, PaymentMode } from '@/types';
import type { CommercialDocument, DocumentType } from '@/lib/api/core/types';
import type { DocumentPaymentInput } from '@/lib/api/endpoints/documents';
import type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';

/** Parameters of a completed sale (ProfessionalPaymentModal → onConfirm). */
export interface CompleteSaleParams {
  amountPaid:   number;
  dueDate?:     string;
  note?:        string;
  docTypeCode?: string;
  payments?:    Array<{ id?: number; paymentModeId: number; amount: number; treasuryAccountId?: number | null; reference?: string | null }>;
  currencyId?:  number | null;
  skipPreview?: boolean;
}

/** خصم تراكمي (سطر + فاتورة) — يجب أن يتطابق مع حساب الباكاند بالضبط */
export function compoundDiscountPct(linePct: number, invoicePct: number): number {
  if (invoicePct <= 0) return linePct;
  const compounded = 100 - (100 - linePct) * (100 - invoicePct) / 100;
  return Math.min(100, compounded);
}

/** Boolean system setting from the aggregated lookups (true / 1 / '1' / 'true'). */
export function parseLookupBool(val: unknown, fallback: boolean): boolean {
  return val === undefined
    ? fallback
    : (val === true || val === 1 || val === '1'
      || String(val).toLowerCase() === 'true');
}

/** Document type for a sale: requested code → POS → FV → BL → first. */
export function pickInvoiceType<T extends Pick<DocumentType, 'code'>>(
  documentTypes: T[] | undefined,
  typeCode: string,
): T | undefined {
  return documentTypes?.find(t => t.code === typeCode)
    ?? documentTypes?.find(t => t.code === 'POS')
    ?? documentTypes?.find(t => t.code === 'FV')
    ?? documentTypes?.find(t => t.code === 'BL')
    ?? documentTypes?.[0];
}

/** API lines payload for a sale (create / update). */
export function buildSaleLinesPayload(
  currentItems: CartItem[],
  currentInvDisc: number,
  clientIsTvaExempt: boolean,
) {
  return currentItems.map(i => {
    const compoundedDisc = compoundDiscountPct(i.discount_percentage, currentInvDisc);
    const baseQty = i.quantity * (i.pack_qty ?? 1);
    const lineDiscAmount = baseQty > 0 ? Math.round((i.discount_amount / baseQty) * 100) / 100 : 0;
    const isFixedAmount  = i.discount_mode === 'fixed_amount' && lineDiscAmount > 0;
    // Contract: unit_price_ht in the API payload is the PER-UNIT base price.
    // The backend derives the stored PACK price (per-unit × frozen snapshot).
    const perUnitPrice = (i.pack_qty && i.pack_qty > 1)
      ? Math.round((i.unit_price_ht / i.pack_qty) * 10000) / 10000
      : i.unit_price_ht;
    const isManual = !i.product_id || i.product_id <= 0;
    return {
      product_id:               isManual ? null : i.product_id,
      description:              i.product_name || null,
      quantity:                 i.quantity,
      pack_qty:                 i.pack_qty ?? 1,
      unit_price_ht:            perUnitPrice,
      discount_percentage:      isFixedAmount ? 0 : Math.min(100, compoundedDisc),
      discount_amount:          lineDiscAmount,
      discount_amount_per_unit: isFixedAmount ? lineDiscAmount : null,
      tva_rate:                 clientIsTvaExempt ? 0 : i.tva_rate,
      packaging_id:             i.packaging_id ?? null,
    };
  });
}

export type SaleLinePayload = ReturnType<typeof buildSaleLinesPayload>[number];

/** Totals recomputed from the lines payload (mirrors the backend). */
export function computeEffectiveTotals(linesPayload: SaleLinePayload[], fiscalStamp: number) {
  const effectiveTotalHt = linesPayload.reduce((s: number, l: Record<string, any>) => {
    const gross = l.quantity * l.unit_price_ht * l.pack_qty;
    const bq = l.quantity * l.pack_qty;
    const disc = l.discount_amount_per_unit
      ? l.discount_amount_per_unit * bq
      : gross * (l.discount_percentage / 100);
    return s + gross - disc;
  }, 0);
  const effectiveTotalTva = linesPayload.reduce((s: number, l: Record<string, any>) => {
    const gross = l.quantity * l.unit_price_ht * l.pack_qty;
    const bq = l.quantity * l.pack_qty;
    const disc = l.discount_amount_per_unit
      ? l.discount_amount_per_unit * bq
      : gross * (l.discount_percentage / 100);
    const lineHt = gross - disc;
    return s + lineHt * l.tva_rate / 100;
  }, 0);
  const effectiveTotalTtc = effectiveTotalHt + effectiveTotalTva + fiscalStamp;
  return { effectiveTotalHt, effectiveTotalTva, effectiveTotalTtc };
}

/** Cart rows → receipt snapshot rows. */
export function cartItemsToSnapshotItems(items: CartItem[]): POSSaleSnapshot['items'] {
  return items.map(i => ({
    name: i.product_name,
    ref:  i.ref,
    qty:  i.quantity,
    unit_price_ht:      i.unit_price_ht,
    unit:               i.unit_symbol,
    tva_rate:           i.tva_rate / 100,
    discount_percentage: i.discount_percentage,
    total_ht:           i.total_ht,
  }));
}

type SalePaymentParam = { paymentModeId: number; amount: number };

/** Receipt payment rows — mode names resolved from `paymentModes`. */
export function snapshotPaymentsFromParams(
  payments: SalePaymentParam[] | undefined,
  paymentModes: PaymentMode[] | undefined,
): POSSaleSnapshot['payments'] {
  return payments?.filter(p => p.amount > 0).map(p => ({
    mode: (paymentModes ?? []).find(m => m.id === p.paymentModeId)?.name ?? String(p.paymentModeId), amount: p.amount,
  })) ?? [];
}

/** True when at least one API payment uses a cash payment mode. */
export function hasCashPayment(
  apiPayments: DocumentPaymentInput[],
  paymentModes: PaymentMode[] | undefined,
): boolean {
  return apiPayments.some(p => {
    const mode = (paymentModes ?? []).find(m => m.id === p.payment_mode_id);
    return mode && /نقدا|نقداً|cash/i.test(mode.name);
  });
}

type DocumentLine = NonNullable<CommercialDocument['lines']>[number];

/** Saved document line → cart row (reopening an invoice for editing). */
export function documentLineToCartItem(line: DocumentLine, idx: number): CartItem {
  const v    = line.product_variant;
  const prod = line.product;
  const pkg  = (line as any).packaging ?? null;
  const pkgSnap = (line as any).packaging_units_snapshot;
  const qty      = Number(line.quantity);
  const priceHt  = Number(line.unit_price_ht);
  const discPct  = Number(line.discount_percentage);
  const gross    = qty * priceHt;
  // Frozen packaging qty at time of sale wins over the LIVE packaging row —
  // the live row's quantity may have changed since the sale.
  const frozenPackQty = pkgSnap ? Number(pkgSnap) : (pkg ? Number(pkg.quantity) : 1);
  // Native fixed-amount path: if discount_amount_per_unit is populated, use it
  // directly — NO percentage conversion, NO round-trip.
  const frozenPerUnit = Number((line as any).discount_amount_per_unit) || 0;
  let discountAmount: number;
  let discountMode: 'percentage' | 'fixed_amount';
  if (frozenPerUnit > 0) {
    // Native fixed-amount tier — exact total, zero round-trip error
    discountAmount = frozenPerUnit * qty;
    discountMode   = 'fixed_amount';
  } else {
    // Percentage-based line — use DB-computed total_discount_amount or derive from %
    const apiTotalDisc = Number((line as any).total_discount_amount) || 0;
    discountAmount = apiTotalDisc > 0 ? apiTotalDisc : gross * (discPct / 100);
    discountMode   = 'percentage';
  }
  const isManual = !line.product_id;
  const manualName = (line as any).description ?? (line as any).product_name ?? '';
  const productName = isManual
    ? (manualName || 'منتج يدوي')
    : (manualName || v?.product?.name || prod?.name || '');
  return {
    id:                  nanoid(8),
    product_id:          isManual ? 0 : (line.product_id ?? prod?.id ?? 0),
    // Manual lines have no catalog product; keep variant_id unique per row to avoid collisions.
    variant_id:          isManual ? -(Number(line.id) || (idx + 1)) : (line.product_id ?? prod?.id ?? 0),
    product_name:        productName,
    variant_name:        v?.variant_name ?? null,
    ref:                 v?.ref ?? prod?.ref ?? '',
    barcode:             v?.barcode ?? null,
    unit_symbol:         pkg?.label ?? v?.unit?.abbreviation ?? 'قطعة',
    image_url:           v?.image_url ?? prod?.default_image ?? null,
    quantity:            qty,
    unit_price_ht:       priceHt,
    selling_price_ttc:   htToTtc(priceHt, Number(line.tva_rate)),
    tva_rate:            Number(line.tva_rate),
    tva_id:              v?.tva_id ?? null,
    discount_percentage: discPct,
    discount_amount:     Math.round(discountAmount * 100) / 100,
    discount_mode:       discountMode,
    total_ht:            Number(line.total_ht),
    total_ttc:           Number(line.total_ttc),
    max_stock:           null,
    manages_stock:       false,
    is_sold_by_weight:   prod?.is_sold_by_weight ?? false,
    packaging_id:        line.packaging_id ?? null,
    pack_qty:            frozenPackQty,
    packaging_label:     pkg?.label ?? null,
    base_price_ht:       priceHt / (frozenPackQty || 1),
    quantity_discounts:  (prod as any)?.quantity_discounts ?? [],
  };
}

/** Saved document payments → cart-store payments. */
export function documentPaymentsToCart(doc: CommercialDocument) {
  return (doc.payments ?? []).map(p => ({
    id:                  p.id,
    payment_mode_id:     p.payment_mode_id,
    amount:              Number(p.amount),
    payment_date:        p.payment_date,
    treasury_account_id: p.treasury_account_id ?? null,
    reference:           p.reference ?? null,
  }));
}

/** Saved document → receipt snapshot (re-printing from the session invoices). */
export function documentToPrintSnapshot(doc: CommercialDocument): POSSaleSnapshot {
  const balance = doc.balance_data;
  return {
    docNumber: doc.document_number,
    docDate: toLocalDateKey(doc.document_date),
    client: doc.party ? { name: doc.party.name, nif: doc.party.nif, phone: doc.party.phone, address: doc.party.address } : null,
    items: (doc.lines ?? []).map(line => ({
      name: line.description ?? line.product?.name ?? '',
      ref: line.product?.ref,
      qty: Number(line.quantity),
      unit_price_ht: Number(line.unit_price_ht),
      unit: line.product?.unit?.abbreviation ?? null,
      tva_rate: Number(line.tva_rate),
      discount_percentage: Number(line.discount_percentage),
      total_ht: Number(line.total_ht),
    })),
    totals: {
      total_ht: Number(doc.total_ht),
      total_tva: Number(doc.total_tva),
      total_ttc: Number(doc.total_ttc),
      fiscal_stamp: Number((doc as any).total_stamp ?? doc.fiscal_stamp ?? 0),
      total_discount: Number(doc.total_discount),
      paid: Number(doc.paid_amount),
      change: Math.max(0, Number(doc.paid_amount) - Number(doc.total_ttc)),
      remaining: Number(doc.remaining_amount),
    },
    payments: (doc.payments ?? []).map(p => ({
      mode: p.payment_mode?.name ?? '',
      amount: Number(p.amount),
    })),
    prevBalance: balance?.previous_balance ?? null,
    newBalance: balance?.new_balance ?? null,
  };
}
