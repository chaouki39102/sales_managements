// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentForm.ts — إصلاح كامل للحسابات
//
// ══ نموذج الكميات والتعبئة ════════════════════════════════════════════════
//
// الفرونتند يعمل بـ "عدد العبوات" (displayQty) — هذا ما يُدخله المستخدم.
// الباكاند يخزن "وحدات أساسية" (baseQty = displayQty × _packQty).
//
// مثال: المستخدم يدخل 2 كرتون × 12 قارورة = 24 قارورة تُرسَل للباكاند.
//
// ══ نموذج الخصم ══════════════════════════════════════════════════════════
//
// الباكاند يخزن:
//   discount_percentage = نسبة الخصم (تُستخدم في الحساب)
//   discount_amount     = مبلغ خصم الوحدة الواحدة = unit_price_ht × discPct/100
//                         (للمرجع فقط — الحساب يعتمد على discPct)
//
// الفرونتند (percent mode):
//   يُرسل: discount_percentage = L.discount_percentage
//           discount_amount = unit_price_ht × discPct/100  (خصم وحدة واحدة)
//
// الفرونتند (fixed mode):
//   المستخدم يدخل: discount_amount_fixed = خصم العبوة الواحدة
//   يُحوَّل: discPct = (discount_amount_fixed / price_per_pack) × 100
//   يُرسل: discount_percentage = discPct
//           discount_amount = unit_price_ht × discPct/100
//
// ══ الاستقبال من الباكاند (بناء السطر من API) ════════════════════════════
//
//   displayQty = db.quantity / _packQty
//   discount_amount_fixed = db.discount_amount × _packQty
//     (تحويل خصم الوحدة إلى خصم العبوة للعرض)
//
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentType } from '@/lib/api/core/types';
import {
  today,
  resolvePrice,
  resolveQuantityDiscount,
  calcTotals,
  calcLineTotal,
  validateLineStock,
  toNum,
} from '../utils/document.utils';
import { useComputeLine } from './useComputeLine';
import type { ComputeLineWarning } from './useComputeLine';
import {
  REQUIRES_PARTY,
  STOCK_IN_CODES,
  STOCK_OUT_CODES,
} from '../types/document.types';
import type {
  LineItem,
  DocumentFormState,
  DocumentTotals,
  PaymentEntry,
  Product,
  ShippingInfo,
  PaymentTerm,
} from '../types/document.types';
import type { LineStockValidation } from '../utils/document.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormErrors = Record<string, string>;

export interface PartyBalanceInfo {
  party_id:          number;
  current_balance:   number;
  signed_balance:    number;
  balance_type:      'debit' | 'credit';
  opening_balance:   number;
  documents_balance: number;
  payments_total:    number;
  fiscal_year_id:    number;
  date:              string;
}

export type PaymentMode = 'free' | 'additive' | 'locked';

export interface PriceLevelSwitchMsg {
  from: string;
  to: string;
  productName: string;
}

export interface PartyChangeResult {
  blocked:    boolean;
  reason?:    string;
  blockType?: 'has_payments' | 'price_level_change' | 'existing_payments';
}

interface UseDocumentFormOptions {
  documentType:        DocumentType | null;
  existingDocument?:   Record<string, unknown>;
  defaultTvaRate:      number;
  defaultWarehouseId:  string;
  baseCurrencyId:      string;
  defaultPriceLevelId?: string;
  defaultApplyStamp?:  boolean;
  stampEnabled?:       boolean;
  selectedYearId:      string;
  paymentModes: Array<{
    id:                   number;
    name:                 string;
    code?:                string | null;
    icon?:                string | null;
    treasury_account_id?: number | null;
    requires_reference?:  boolean;
    is_cash?:             boolean;
  }>;
  parties: Array<{
    id:                       number;
    name:                     string;
    default_price_level_id?:  number | null;
    default_price_level?:     { id: number; name: string } | null;
  }>;
  products:      Product[];
  stockData:     Record<number, number>;
  isPurchase:    boolean;
  open:          boolean;
  priceLevels?:  Array<{ id: number; name: string }>;
}

export interface UseDocumentFormReturn {
  form:                   DocumentFormState;
  errors:                 FormErrors;
  lineErr:                string;
  apiErr:                 string;
  setApiErr:              (msg: string) => void;
  set:                    (k: string, v: unknown) => void;
  handlePartyChange:      (id: string) => PartyChangeResult;
  handlePriceLevelChange: (priceLevelIdStr: string) => void;
  priceLevelId:           number | null;
  addLine:                () => void;
  addLineWithProduct:     (productId: string, unitPrice?: number, tvaRate?: number) => void;
  bulkAddLines:           (importedLines: Array<{product_id?: string; description?: string; unit_price_ht?: number; quantity?: number; tva_rate?: number; line_note?: string}>) => void;
  removeLine:             (idx: number) => void;
  duplicateLine:          (idx: number) => void;
  updateLine:             (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  paymentMode:            PaymentMode;
  payments:               PaymentEntry[];
  addPayment:             () => void;
  addPaymentWithValues:   (values: Partial<PaymentEntry>) => void;
  removePayment:          (idx: number) => void;
  updatePayment:          (idx: number, patch: Partial<PaymentEntry>) => void;
  partyBalance:           PartyBalanceInfo | null;
  isLoadingBalance:       boolean;
  totals:                 DocumentTotals;
  validate:               () => boolean;
  buildPayload:           () => Record<string, unknown>;
  validateLineStock:      (line: LineItem, product: Product) => LineStockValidation;
  updateStockData:        (data: Record<number, number>) => void;
  docCode:                string;
  isEdit:                 boolean;
  needsParty:             boolean;
  affectsStock:           boolean;
  stockDir:               1 | -1 | 0;
  isReadOnly:             boolean;
  isLinesReadOnly:        boolean;
  lineWarnings:           Map<number, ComputeLineWarning[]>;
  priceLevelSwitchMsg:    PriceLevelSwitchMsg | null;
  clearPriceLevelSwitchMsg: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALIDATED_STATUSES = new Set(['validated', 'paid', 'partially_paid', 'overdue']);
const LOCKED_STATUSES    = new Set(['cancelled', 'returned']);

// ─── makeLine ─────────────────────────────────────────────────────────────────

function makeLine(defaultTvaRate: number): LineItem {
  return {
    product_id:            '',
    description:           '',
    quantity:              1,
    unit_price_ht:         0,
    price_per_pack:        0,
    discount_mode:         'percent',
    discount_percentage:   0,
    discount_amount_fixed: 0,
    tva_rate:              defaultTvaRate,
    packaging_id:          '',
    stock_lot_id:          '',
    lot_number_new:        '',
    manufacturing_date:    undefined as string | undefined,
    expiration_date:       undefined as string | undefined,
    supplier_lot_number:   undefined as string | undefined,
    line_note:             '',
    _packQty:              1,
  };
}

// ─── resolvePackQty ───────────────────────────────────────────────────────────

/**
 * يحدد كمية الوحدات في العبوة من مصادر متعددة:
 * 1. packaging relation مُحمَّلة مباشرة
 * 2. product.packagings من productRel
 * 3. products list (عند التعديل)
 */
function resolvePackQty(
  packagingId:  string,
  packagingRel: Record<string, unknown> | null,
  productRel:   Record<string, unknown> | null,
  products?:    Product[],
  productId?:   string,
): number {
  if (!packagingId) return 1;

  // 1. من العلاقة المباشرة
  if (packagingRel) {
    const q = Number(packagingRel.quantity);
    if (q > 0) return q;
  }

  // 2. من packagings المنتج في API response
  if (productRel) {
    const pkgs = (productRel as Record<string, unknown>).packagings;
    if (Array.isArray(pkgs)) {
      const found = pkgs.find((p: Record<string, unknown>) => String(p.id) === packagingId);
      if (found) {
        const q = Number((found as Record<string, unknown>).quantity);
        if (q > 0) return q;
      }
    }
  }

  // 3. من قائمة products الكاملة
  if (products && productId) {
    const prod = products.find((p) => String(p.id) === productId);
    const pkg  = prod?.packagings?.find((p) => String(p.id) === packagingId);
    if (pkg) {
      const q = Number(pkg.quantity);
      if (q > 0) return q;
    }
  }

  return 1;
}

// ─── buildLineFromApi ─────────────────────────────────────────────────────────

/**
 * بناء LineItem من بيانات الباكاند.
 *
 * الباكاند يخزن:
 *   quantity      = وحدات أساسية
 *   discount_amount = خصم الوحدة الواحدة = unit_price × discPct/100
 *
 * الفرونتند يعرض:
 *   quantity      = عدد العبوات = db.quantity / packQty
 *   discount_amount_fixed = خصم العبوة الواحدة = db.discount_amount × packQty
 */
function buildLineFromApi(
  l:              any,
  defaultTvaRate: number,
  products?:      Product[],
): LineItem {
  const productRel =
    (l.product        as Record<string, unknown> | null) ??
    (l.productVariant as Record<string, unknown> | null) ??
    null;

  const packagingRel = (l.packaging as Record<string, unknown> | null) ?? null;
  const packagingId  = packagingRel
    ? String(packagingRel.id)
    : l.packaging_id ? String(l.packaging_id) : '';

  const packQty = resolvePackQty(
    packagingId,
    packagingRel,
    productRel,
    products,
    String(l.product_id ?? ''),
  );

  const stockLotRel =
    (l.stockLot  as Record<string, unknown> | null) ??
    (l.stock_lot as Record<string, unknown> | null) ??
    null;
  const stockLotId = stockLotRel
    ? String(stockLotRel.id)
    : l.stock_lot_id ? String(l.stock_lot_id) : '';

  const unitPrice          = toNum(l.unit_price_ht ?? 0);
  const discountPercentage = toNum(l.discount_percentage ?? 0);

  // discount_amount في DB = خصم الوحدة الواحدة
  // discount_amount_fixed في الفرونتند = خصم العبوة الواحدة
  const dbDiscountAmount   = toNum(l.discount_amount ?? 0);
  const discountAmountFixed = packQty > 1
    ? Math.round(dbDiscountAmount * packQty * 10_000) / 10_000
    : dbDiscountAmount;

  const discountMode: 'percent' | 'fixed' =
    dbDiscountAmount > 0 && discountPercentage === 0 ? 'fixed' : 'percent';

  // TVA: 0 = معفى (قيمة صحيحة — لا تُستبدَل)
  let tvaRate = l.tva_rate != null ? toNum(l.tva_rate) : NaN;
  if (isNaN(tvaRate) && productRel) {
    tvaRate = toNum(((productRel as any)?.tva?.rate) ?? NaN);
  }
  if (isNaN(tvaRate)) tvaRate = defaultTvaRate;

  // تحويل الكمية من وحدات أساسية إلى عدد عبوات
  const dbQty    = toNum(l.quantity ?? 1) || 1;
  const displayQty = packQty > 1
    ? Math.round((dbQty / packQty) * 1_000_000) / 1_000_000
    : dbQty;

  return {
    id:                    l.id as number | undefined,
    product_id:            String(l.product_id ?? ''),
    description:           String(l.description ?? ''),
    quantity:              displayQty,
    unit_price_ht:         unitPrice,
    price_per_pack:        Math.round(unitPrice * packQty * 10_000) / 10_000,
    discount_mode:         discountMode,
    discount_percentage:   discountPercentage,
    discount_amount_fixed: discountAmountFixed,
    tva_rate:              tvaRate,
    packaging_id:          packagingId,
    stock_lot_id:          stockLotId,
    lot_number_new:        String(
      stockLotRel?.lot_number ?? l.lot_number ?? l.lot_number_new ?? '',
    ),
    manufacturing_date:    l.manufacturing_date ?? l.line_attributes?.manufacturing_date ?? undefined,
    expiration_date:       l.expiration_date ?? l.line_attributes?.expiration_date ?? undefined,
    supplier_lot_number:   l.supplier_lot_number ?? l.line_attributes?.supplier_lot_number ?? undefined,
    line_note:             String(l.notes ?? l.line_note ?? ''),
    _product:              productRel as any as Product | undefined,
    _packQty:              packQty,
  };
}

// ─── buildPaymentFromApi ──────────────────────────────────────────────────────

export function buildPaymentFromApi(p: Record<string, unknown>): PaymentEntry {
  const treasuryId = p.treasury_account_id
    ? String(p.treasury_account_id)
    : (p.treasuryAccount as Record<string, unknown> | null)?.id
      ? String((p.treasuryAccount as Record<string, unknown>).id)
      : '';

  const paymentModeId = String(
    p.payment_mode_id ??
    (p.paymentMode as Record<string, unknown> | null)?.id ??
    '',
  );

  return {
    id:                    p.id != null ? Number(p.id) : undefined,
    payment_mode_id:     paymentModeId,
    amount:              String(p.amount ?? '0'),
    reference:           String(p.reference ?? ''),
    notes:               p.notes ? String(p.notes) : undefined,
    client_ref:          p.client_ref ? String(p.client_ref) : undefined,
    payment_date:        String(p.payment_date ?? today()).split('T')[0],
    treasury_account_id: treasuryId,
  };
}

// ─── buildDefaultForm ─────────────────────────────────────────────────────────

function buildDefaultForm(
  existingDocument: Record<string, unknown> | undefined,
  defaults: { warehouseId: string; currencyId: string; yearId: string; priceLevelId?: string; applyStamp?: boolean },
  defaultTvaRate: number,
  products?: Product[],
  stampEnabled?: boolean,
): DocumentFormState {
  const stamp = stampEnabled !== false
    ? (defaults.applyStamp ?? false)
    : false;
  const defaultShipping: ShippingInfo = {};
  const defaultPaymentTerms: PaymentTerm[] = [];

  if (existingDocument) {
    const doc   = existingDocument;
    const lines = ((doc.lines as Record<string, unknown>[]) ?? [])
      .map((l) => buildLineFromApi(l, defaultTvaRate, products));

    const rawShipping = (doc as Record<string, unknown>).shipping_info;
    const rawTerms    = (doc as Record<string, unknown>).payment_terms;

    return {
      party_id:       String(doc.party_id       ?? ''),
      document_date:  String(doc.document_date  ?? today()).split('T')[0],
      due_date:       doc.due_date ? String(doc.due_date).split('T')[0] : '',
      delivery_date:  doc.delivery_date ? String(doc.delivery_date).split('T')[0] : '',
      notes:          String(doc.notes          ?? ''),
      internal_notes: String(doc.internal_notes ?? ''),
      warehouse_id:   String(doc.warehouse_id   ?? ''),
      fiscal_year_id: String(doc.fiscal_year_id ?? ''),
      currency_id:    String(doc.currency_id    ?? ''),
      exchange_rate:  String(doc.exchange_rate  ?? '1'),
      apply_stamp:    stampEnabled !== false
        ? (toNum((doc as any).total_stamp ?? (doc as any).fiscal_stamp ?? 0) > 0)
        : false,
      price_level_id: String(doc.price_level_id ?? ''),
      lines,
      payments: [],
      shipping_info:  (typeof rawShipping === 'object' && rawShipping !== null)
        ? (rawShipping as ShippingInfo) : { ...defaultShipping },
      payment_terms:  Array.isArray(rawTerms)
        ? (rawTerms as PaymentTerm[]) : [...defaultPaymentTerms],
    };
  }

  return {
    party_id: '', document_date: today(), due_date: '', delivery_date: '',
    notes: '', internal_notes: '',
    warehouse_id:   defaults.warehouseId,
    fiscal_year_id: defaults.yearId,
    currency_id:    defaults.currencyId,
    exchange_rate:  '1',
    apply_stamp:    stamp,
    price_level_id: defaults.priceLevelId ?? '',
    lines: [], payments: [],
    shipping_info:  { ...defaultShipping },
    payment_terms:  [...defaultPaymentTerms],
  };
}

// ─── resolvePaymentMode ───────────────────────────────────────────────────────

function resolvePaymentMode(
  existingDocument: Record<string, unknown> | undefined,
  isLocked:    boolean,
  isCancelled: boolean,
): PaymentMode {
  if (!existingDocument) return 'free';
  if (isLocked || isCancelled) return 'locked';
  const statusName = String(
    (existingDocument.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument.status ?? '',
  ).toLowerCase();
  if (VALIDATED_STATUSES.has(statusName)) return 'additive';
  return 'free';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentForm({
  documentType,
  existingDocument,
  defaultTvaRate,
  defaultWarehouseId,
  baseCurrencyId,
  defaultPriceLevelId = '',
  defaultApplyStamp = false,
  stampEnabled = true,
  selectedYearId,
  paymentModes,
  parties,
  products,
  stockData,
  isPurchase,
  open,
  priceLevels = [],
}: UseDocumentFormOptions): UseDocumentFormReturn {

  const slug    = useActiveSlug();
  const docCode = documentType?.code ?? '';
  const isEdit  = !!existingDocument;

  const needsParty   = REQUIRES_PARTY.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir: 1 | -1 | 0 = STOCK_IN_CODES.has(docCode) ? 1
                              : STOCK_OUT_CODES.has(docCode) ? -1 : 0;

  // ── حالة المستند ──────────────────────────────────────────────────────────

  const docStatusName = String(
    (existingDocument?.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument?.status ?? '',
  ).toLowerCase();

  const isLocked    = !!(existingDocument?.is_locked);
  const isCancelled = LOCKED_STATUSES.has(docStatusName);
  const isReadOnly  = isLocked || isCancelled;

  const pmMode = resolvePaymentMode(existingDocument, isLocked, isCancelled);
  const isLinesReadOnly = isReadOnly || pmMode === 'additive';

  // ── Refs ──────────────────────────────────────────────────────────────────

  const stockDataRef   = useRef(stockData);
  const paymentModsRef = useRef(paymentModes);
  const partiesRef     = useRef(parties);
  const productsRef    = useRef(products);
  const formRef        = useRef<DocumentFormState | null>(null);

  useEffect(() => { stockDataRef.current   = stockData;    }, [stockData]);
  useEffect(() => { paymentModsRef.current = paymentModes; }, [paymentModes]);
  useEffect(() => { partiesRef.current     = parties;      }, [parties]);
  useEffect(() => { productsRef.current    = products;     }, [products]);

  // ── State ─────────────────────────────────────────────────────────────────

  const [form, setForm]   = useState<DocumentFormState>(() =>
    buildDefaultForm(existingDocument, {
      warehouseId: defaultWarehouseId,
      currencyId:  baseCurrencyId,
      yearId:      selectedYearId,
      priceLevelId: defaultPriceLevelId,
      applyStamp:  defaultApplyStamp,
    }, defaultTvaRate, products, stampEnabled),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [lineWarnings, setLineWarnings] = useState<Map<number, ComputeLineWarning[]>>(new Map());
  const [priceLevelSwitchMsg, setPriceLevelSwitchMsg] = useState<PriceLevelSwitchMsg | null>(null);

  useEffect(() => { formRef.current = form; }, [form]);

  // ── useComputeLine — تحديث السطر من الباكاند ──────────────────────────────
  const warehouseIdForCompute = form.warehouse_id ? parseInt(form.warehouse_id) : null;
  const partyIdForCompute     = form.party_id     ? parseInt(form.party_id)     : null;

  const { compute: triggerCompute } = useComputeLine({
    enabled: !!slug,
    onSuccess: (result, lineIdx) => {
      setForm(f => {
        const lines = [...f.lines];
        const L     = lines[lineIdx];
        if (!L || !L.product_id) return f;

        // ── الخصم ────────────────────────────────────────────────────────────
        // الباكاند يُعيد خصم الكميات التلقائي فقط (quantity_discounts).
        // إذا كان المستخدم قد أدخل خصماً يدوياً (percent أو fixed)
        // نحتفظ بخصمه ولا نُكتب عليه — إلا إذا جاء خصم كميات جديد من الباكاند.
        let discountMode       = L.discount_mode;
        let discountPercentage = L.discount_percentage;
        let discountAmountFixed = L.discount_amount_fixed;

        if (result.discount_percentage > 0) {
          // خصم كميات تلقائي من الباكاند — يُطبَّق دائماً (له الأولوية)
          discountMode        = 'percent';
          discountPercentage  = result.discount_percentage;
          discountAmountFixed = 0;
        } else if (result.quantity_discount_tier === null && L._fromCompute) {
          // لا يوجد خصم كميات + السطر كان مُعيَّناً من compute سابق → صفّر
          discountMode        = 'percent';
          discountPercentage  = 0;
          discountAmountFixed = 0;
        }
        // غير ذلك: نُبقي على الخصم اليدوي كما هو

        lines[lineIdx] = {
          ...L,
          unit_price_ht:         result.unit_price_ht,
          price_per_pack:        result.price_per_pack,
          _packQty:              result.pack_qty,
          discount_mode:         discountMode,
          discount_percentage:   discountPercentage,
          discount_amount_fixed: discountAmountFixed,
          tva_rate:              result.tva_rate,
          stock_lot_id: L.stock_lot_id || (
            result.lot_suggestions[0] ? String(result.lot_suggestions[0].id) : ''
          ),
          _computing:   false,
          _fromCompute: true,   // علامة: هذا السطر مرّ على compute مرة واحدة على الأقل
          _warnings:    result.warnings,
        };
        return { ...f, lines };
      });
    },
    onWarnings: (warnings, lineIdx) => {
      setLineWarnings(prev => {
        const next = new Map(prev);
        if (warnings.length > 0) next.set(lineIdx, warnings);
        else next.delete(lineIdx);
        return next;
      });
    },
  });

  // ── Reset عند فتح ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setForm(buildDefaultForm(
      existingDocument,
      { warehouseId: defaultWarehouseId, currencyId: baseCurrencyId, yearId: selectedYearId, priceLevelId: defaultPriceLevelId, applyStamp: defaultApplyStamp },
      defaultTvaRate,
      productsRef.current,
      stampEnabled,
    ));
    setErrors({});
    setLineErr('');
    setApiErr('');

    const rawPayments = ((existingDocument?.payments as Record<string, unknown>[]) ?? [])
      .map(buildPaymentFromApi);
    setPayments(rawPayments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingDocument?.id]);

  useEffect(() => {
    if (isEdit || !open) return;
    setForm((f) => ({
      ...f,
      warehouse_id:   f.warehouse_id   || defaultWarehouseId,
      currency_id:    f.currency_id    || baseCurrencyId,
      fiscal_year_id: f.fiscal_year_id || selectedYearId,
      price_level_id: f.price_level_id || defaultPriceLevelId,
      apply_stamp:    stampEnabled !== false
        ? ((!('apply_stamp' in f) || !f.apply_stamp) ? defaultApplyStamp : f.apply_stamp)
        : false,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, defaultPriceLevelId, defaultApplyStamp, stampEnabled, isEdit, open]);

  // ── set ───────────────────────────────────────────────────────────────────

  const set = useCallback((k: string, v: unknown) => {
    if (k === 'apply_stamp' && stampEnabled === false) return;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => { const n = { ...prev }; delete n[k as string]; return n; });
  }, [stampEnabled]);

  const priceLevelId = useMemo(
    () => (form.price_level_id ? parseInt(form.price_level_id) : null),
    [form.price_level_id],
  );

  // ── رصيد المتعامل ─────────────────────────────────────────────────────────

  const partyIdNum = form.party_id ? parseInt(form.party_id) : null;

  const { data: partyBalance = null, isLoading: isLoadingBalance } =
    useQuery<PartyBalanceInfo | null>({
      queryKey: [slug, 'party-balance', partyIdNum, form.fiscal_year_id, form.document_date],
      queryFn: async () => {
        if (!partyIdNum) return null;
        return apiGet<PartyBalanceInfo>(
          `/party-balances/${partyIdNum}`,
          { date: form.document_date || today() },
        );
      },
      enabled:   !!slug && !!partyIdNum && needsParty,
      staleTime: 60_000,
    });

  // ── handlePartyChange ─────────────────────────────────────────────────────

  const handlePartyChange = useCallback((id: string): PartyChangeResult => {
    if (isPurchase) {
      setForm((f) => ({ ...f, party_id: id }));
      setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });
      return { blocked: false };
    }

    const curForm       = formRef.current!;
    const party         = partiesRef.current.find((p) => String(p.id) === id);
    const newPriceLevel = (party as any)?.default_price_level_id ?? (party as any)?.default_price_level?.id ?? (party as any)?.price_level?.id ?? (defaultPriceLevelId ? parseInt(defaultPriceLevelId) : null);
    const curPriceLvl   = curForm.price_level_id ? parseInt(curForm.price_level_id) : null;

    const hasPayments = payments.some((p) => p.payment_mode_id && parseFloat(p.amount) > 0);
    if (existingDocument && hasPayments) {
      const existingCount = payments.filter((p) => p.id).length;
      if (existingCount > 0) {
        return {
          blocked: true, blockType: 'existing_payments',
          reason: 'لا يمكن تغيير الزبون: هناك دفعات مُسجَّلة. احذف الدفعات أولاً.',
        };
      }
      return {
        blocked: true, blockType: 'has_payments',
        reason: `لا يمكن تغيير الزبون: هناك دفعات في النموذج. احذفها أولاً.`,
      };
    }

    const hasFilledLines  = curForm.lines.some((l) => l.product_id !== '');
    const priceWillChange = newPriceLevel !== curPriceLvl;

    if (hasFilledLines && priceWillChange) {
      return {
        blocked: true, blockType: 'price_level_change',
        reason: `فئة السعر ستتغير. احذف الأسطر أولاً ثم غيِّر الزبون.`,
      };
    }

    const newPriceLevelStr = newPriceLevel ? String(newPriceLevel) : defaultPriceLevelId;

    // due_date تلقائي من credit_days
    const creditDays = (party as Record<string, unknown> | undefined)?.credit_days as number ?? 0;
    const curDate    = formRef.current?.document_date || today();
    let   newDueDate = formRef.current?.due_date || '';
    if (creditDays > 0) {
      const d = new Date(curDate);
      d.setDate(d.getDate() + creditDays);
      newDueDate = d.toISOString().split('T')[0];
    }

    setForm((f) => {
      const isTvaExempt = (party as Record<string, unknown> | undefined)?.is_tva_exempt as boolean ?? false;

      // إذا كان الزبون معفى من TVA → تصفير TVA في كل الأسطر
      const updatedLines = isTvaExempt
        ? f.lines.map(line => ({ ...line, tva_rate: 0 }))
        : f.lines;

      return {
        ...f,
        party_id:       id,
        price_level_id: newPriceLevelStr,
        lines:          updatedLines,
        ...(newDueDate ? { due_date: newDueDate } : {}),
      };
    });
    setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });
    return { blocked: false };
  }, [isPurchase, payments, defaultPriceLevelId, existingDocument]);

  // ── handlePriceLevelChange ────────────────────────────────────────────────

  const handlePriceLevelChange = useCallback((priceLevelIdStr: string) => {
    const newPriceLevelId = priceLevelIdStr ? parseInt(priceLevelIdStr) : null;

    setForm((f) => ({
      ...f,
      price_level_id: priceLevelIdStr,
      lines: f.lines.map((line) => {
        if (!line.product_id || !line._product) return line;
        const newPrice = resolvePrice(line._product, newPriceLevelId, isPurchase);
        return {
          ...line,
          unit_price_ht:  newPrice,
          price_per_pack: Math.round(newPrice * line._packQty * 10_000) / 10_000,
        };
      }),
    }));
  }, [isPurchase]);

  // ── updateLine ────────────────────────────────────────────────────────────

  const priceLevelMap = useMemo(() =>
    Object.fromEntries(priceLevels.map((pl) => [pl.id, pl.name])),
    [priceLevels],
  );

  const updateLine = useCallback((
    idx:      number,
    patch:    Partial<LineItem>,
    product?: Product | null,
  ) => {
    // ── Auto-switch price level if product has no price for current one ──
    const prevForm  = formRef.current;
    const curPLRaw  = prevForm?.price_level_id ?? '';
    const curPLId   = curPLRaw ? parseInt(curPLRaw) : null;
    const switched  = { to: '', plChanged: false };

    if (product && curPLId && product.prices?.length) {
      const hasPriceForCur = product.prices.some((p) => p.price_level_id === curPLId && p.active);
      if (!hasPriceForCur) {
        const firstAvail = product.prices.find((p) => p.active);
        if (firstAvail) {
          switched.to       = String(firstAvail.price_level_id);
          switched.plChanged = true;
          setPriceLevelSwitchMsg({
            from:        priceLevelMap[curPLId] ?? String(curPLId),
            to:          priceLevelMap[firstAvail.price_level_id] ?? String(firstAvail.price_level_id),
            productName: product.name,
          });
        }
      }
    }

    setForm((f) => {
      const lines           = [...f.lines];
      const L               = { ...lines[idx], ...patch };
      const effectivePLRaw  = switched.plChanged ? switched.to : f.price_level_id;
      const curPriceLevelId = effectivePLRaw ? parseInt(effectivePLRaw) : null;

      // ─ L1: اختيار منتج جديد ──────────────────────────────────────────────
      if (product !== undefined) {
        if (product) {
          L.description = product.name;

          // TVA — 0 معفى لا تُستبدَل
          L.tva_rate = product.tva?.rate != null
            ? toNum(product.tva.rate)
            : defaultTvaRate;

          // التعبئة الافتراضية
          const defPkg   = (product.packagings ?? []).find((pk) => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : '';
          L._packQty     = defPkg ? (Number(defPkg.quantity) || 1) : 1;

          // السعر بوحدة أساسية
          const unitPrice  = resolvePrice(product, curPriceLevelId, isPurchase);
          L.unit_price_ht  = unitPrice;
          L.price_per_pack = Math.round(unitPrice * L._packQty * 10_000) / 10_000;

          // خصم الكميات — يحتاج baseQty
          const baseQty = Math.round(L.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            // qd.fixed = خصم الوحدة الأساسية → نحوّل لعبوة
            L.discount_mode         = 'fixed';
            L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000;
            L.discount_percentage   = 0;
          } else {
            L.discount_mode         = 'percent';
            L.discount_percentage   = 0;
            L.discount_amount_fixed = 0;
          }

          // الحصة (lot) — أول متاحة للبيع
          if (!isPurchase && product.has_lots) {
            const firstLot = (product.lots ?? []).find((lt) => lt.remaining_quantity > 0);
            L.stock_lot_id = firstLot ? String(firstLot.id) : '';
          } else {
            L.stock_lot_id   = '';
            L.lot_number_new = '';
            L.manufacturing_date = undefined;
            L.expiration_date    = undefined;
            L.supplier_lot_number = undefined;
          }

          L._product = product;

          // ── استدعاء compute-line فوراً من الباكاند ──
          triggerCompute(idx, {
            product_id:                   product.id,
            quantity:                     L.quantity,
            packaging_id:                 L.packaging_id ? parseInt(L.packaging_id) : null,
            price_level_id:               curPriceLevelId,
            warehouse_id:                 warehouseIdForCompute,
            party_id:                     partyIdForCompute,
            is_purchase:                  isPurchase,
            document_date:                formRef.current?.document_date,
            // عند اختيار منتج جديد لا يوجد خصم يدوي بعد
          }, 0); // فوري بدون debounce عند اختيار منتج جديد

        } else {
          // تفريغ المنتج
          L._product = undefined;
          L.packaging_id = ''; L._packQty = 1;
          L.unit_price_ht = 0; L.price_per_pack = 0;
          L.stock_lot_id = '';
          L.discount_percentage = 0; L.discount_amount_fixed = 0;
        }
      }

      // ─ L3: تغيير التعبئة ──────────────────────────────────────────────────
      if (patch.packaging_id !== undefined && product === undefined) {
        const packId = patch.packaging_id;

        // ابحث في _product أولاً ثم في productsRef
        let pkg = (L._product?.packagings ?? []).find((pk) => String(pk.id) === packId);
        if (!pkg && productsRef.current) {
          const prod = productsRef.current.find((p) => String(p.id) === L.product_id);
          pkg = prod?.packagings?.find((pk) => String(pk.id) === packId);
        }

        const oldPackQty = L._packQty;
        L._packQty       = pkg ? (Number(pkg.quantity) || 1) : 1;

        // تحويل: unit_price_ht لا يتغير — فقط price_per_pack
        L.price_per_pack = Math.round(L.unit_price_ht * L._packQty * 10_000) / 10_000;

        // تحديث discount_amount_fixed (كان خصم العبوة القديمة → نحوّل للجديدة)
        if (L.discount_mode === 'fixed' && oldPackQty > 0) {
          const unitDisc = L.discount_amount_fixed / oldPackQty;
          L.discount_amount_fixed = Math.round(unitDisc * L._packQty * 10_000) / 10_000;
        }

        // تحديث خصم الكميات
        if (L._product) {
          const baseQty = Math.round(L.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(L._product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          }
        }
      }

      // ─ L4: تغيير سعر الوحدة يدوياً ───────────────────────────────────────
      if (patch.unit_price_ht !== undefined && product === undefined) {
        L.price_per_pack = Math.round(patch.unit_price_ht * L._packQty * 10_000) / 10_000;
      }

      // ─ L5: تغيير سعر التعبئة يدوياً ──────────────────────────────────────
      if (patch.price_per_pack !== undefined && product === undefined) {
        L.unit_price_ht = L._packQty > 1
          ? Math.round((patch.price_per_pack / L._packQty) * 10_000) / 10_000
          : patch.price_per_pack;
        // price_per_pack مُحدَّث بالفعل من patch
      }

      // ─ L6: تغيير الكمية → خصم الكميات + compute ────────────────────────
      if (patch.quantity !== undefined && L.product_id) {
        if (L._product && !isPurchase) {
          const baseQty = Math.round(patch.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(L._product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode = 'percent'; L.discount_percentage = qd.percentage; L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            L.discount_mode = 'fixed'; L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000; L.discount_percentage = 0;
          }
        }
        // compute-line مع debounce 350ms عند تغيير الكمية
        if (L.product_id) {
          setTimeout(() => triggerCompute(idx, {
            product_id:                   parseInt(L.product_id),
            quantity:                     patch.quantity as number,
            packaging_id:                 L.packaging_id ? parseInt(L.packaging_id) : null,
            price_level_id:               curPriceLevelId,
            warehouse_id:                 warehouseIdForCompute,
            party_id:                     partyIdForCompute,
            is_purchase:                  isPurchase,
            document_date:                formRef.current?.document_date,
            // نُمرّر الخصم اليدوي للباكاند ليحسب الإجماليات الصحيحة
            manual_discount_mode:         L.discount_mode,
            manual_discount_percentage:   L.discount_mode === 'percent' ? L.discount_percentage : 0,
            manual_discount_amount_fixed: L.discount_mode === 'fixed'   ? L.discount_amount_fixed : 0,
          }, 350), 0);
        }
      }

      lines[idx] = L;
      return switched.plChanged ? { ...f, lines, price_level_id: switched.to } : { ...f, lines };
    });
    setLineErr('');
  }, [defaultTvaRate, isPurchase, priceLevelMap, triggerCompute, warehouseIdForCompute, partyIdForCompute]);

  // ── addLine / removeLine / duplicateLine ──────────────────────────────────

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, makeLine(defaultTvaRate)] }));
    setLineErr('');
  }, [defaultTvaRate]);

  const addLineWithProduct = useCallback((productId: string, unitPrice?: number, tvaRate?: number) => {
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          ...makeLine(defaultTvaRate),
          product_id: productId,
          unit_price_ht: unitPrice ?? 0,
          tva_rate: tvaRate ?? defaultTvaRate,
        },
      ],
    }));
  }, [defaultTvaRate]);

  const bulkAddLines = useCallback((importedLines: Array<{
    product_id?: string; description?: string; unit_price_ht?: number; quantity?: number; tva_rate?: number; line_note?: string;
  }>) => {
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        ...importedLines.map((line) => ({
          ...makeLine(defaultTvaRate),
          product_id: line.product_id ?? '',
          description: line.description ?? '',
          unit_price_ht: line.unit_price_ht ?? 0,
          quantity: line.quantity ?? 1,
          tva_rate: line.tva_rate ?? defaultTvaRate,
          line_note: line.line_note ?? '',
        })),
      ],
    }));
  }, [defaultTvaRate]);

  const removeLine = useCallback((idx: number) => {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }, []);

  const duplicateLine = useCallback((idx: number) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines.splice(idx + 1, 0, { ...lines[idx], id: undefined });
      return { ...f, lines };
    });
  }, []);

  // ── _clientRef generator (frontend-only idempotency token) ────────────────

  function genClientRef(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  // ── إدارة الدفعات ─────────────────────────────────────────────────────────

  const addPayment = useCallback(() => {
    if (pmMode === 'locked') return;
    const firstMode = paymentModsRef.current[0];
    setPayments((prev) => [...prev, {
      payment_mode_id:     firstMode ? String(firstMode.id) : '',
      amount:              '',
      reference:           '',
      payment_date:        today(),
      treasury_account_id: firstMode?.treasury_account_id
        ? String(firstMode.treasury_account_id) : '',
      _clientRef:          genClientRef(),
    }]);
  }, [pmMode]);

  const addPaymentWithValues = useCallback((values: Partial<PaymentEntry>) => {
    if (pmMode === 'locked') return;
    const firstMode = paymentModsRef.current[0];
    setPayments((prev) => [...prev, {
      payment_mode_id:     firstMode ? String(firstMode.id) : '',
      amount:              '',
      reference:           '',
      payment_date:        today(),
      treasury_account_id: firstMode?.treasury_account_id
        ? String(firstMode.treasury_account_id) : '',
      _clientRef:          genClientRef(),
      ...values,
    }]);
  }, [pmMode]);

  const removePayment = useCallback((idx: number) => {
    if (pmMode === 'locked') return;
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }, [pmMode]);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    if (pmMode === 'locked') return;
    setPayments((prev) => {
      const payments = [...prev];
      const P        = { ...payments[idx], ...patch };
      if (patch.payment_mode_id !== undefined) {
        const selectedMode = paymentModsRef.current.find(
          (pm) => String(pm.id) === patch.payment_mode_id,
        );
        P.treasury_account_id = selectedMode?.treasury_account_id
          ? String(selectedMode.treasury_account_id) : '';
      }
      payments[idx] = P;
      return payments;
    });
  }, [pmMode]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = useMemo(
    () => calcTotals(form.lines, form.apply_stamp, payments),
    [form.lines, form.apply_stamp, payments],
  );

  // ── validate ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (needsParty && !form.party_id)
      errs.party_id = isPurchase ? 'المورد إلزامي' : 'الزبون إلزامي';
    if (!form.document_date)  errs.document_date  = 'التاريخ إلزامي';
    if (!form.warehouse_id)   errs.warehouse_id   = 'المستودع إلزامي';
    if (!form.fiscal_year_id) errs.fiscal_year_id = 'السنة المالية إلزامية';
    if (!form.currency_id)    errs.currency_id    = 'العملة إلزامية';

    if (!isLinesReadOnly) {
      if (form.lines.length === 0) {
        setLineErr('يجب إضافة سطر واحد على الأقل');
        setErrors(errs); return false;
      }

      for (let i = 0; i < form.lines.length; i++) {
        const line = form.lines[i];
        if (!line.product_id) {
          setLineErr(`السطر ${i + 1}: المنتج إلزامي`);
          setErrors(errs); return false;
        }
        if (line.quantity <= 0) {
          setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون > 0`);
          setErrors(errs); return false;
        }
        if (!isPurchase && line.unit_price_ht === 0) {
          setLineErr(`السطر ${i + 1}: السعر إلزامي`);
          setErrors(errs); return false;
        }
        if (line._product) {
          const sv = validateLineStock(line, line._product, isPurchase, stockDataRef.current);
          if (!sv.ok && sv.blocking) {
            setLineErr(`السطر ${i + 1}: ${sv.message}`);
            setErrors(errs); return false;
          }
        }
      }
    }

    for (let i = 0; i < payments.length; i++) {
      const pay    = payments[i];
      const amount = parseFloat(pay.amount);
      if (amount <= 0) continue;
      if (!pay.payment_mode_id) {
        setLineErr(`الدفعة ${i + 1}: يجب اختيار طريقة الدفع`);
        setErrors(errs); return false;
      }
      const mode = paymentModsRef.current.find((pm) => String(pm.id) === pay.payment_mode_id);
      if (mode?.requires_reference && !pay.reference?.trim()) {
        setLineErr(`الدفعة ${i + 1}: المرجع إلزامي لـ "${mode.name}"`);
        setErrors(errs); return false;
      }
      const autoTreasury = mode?.treasury_account_id ?? null;
      if (!autoTreasury && !pay.treasury_account_id) {
        setLineErr(`الدفعة ${i + 1}: يجب اختيار حساب خزينة`);
        setErrors(errs); return false;
      }
    }

    setLineErr('');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase, isLinesReadOnly, payments]);

  // ── buildPayload ──────────────────────────────────────────────────────────

  const buildPayload = useCallback((): Record<string, unknown> => {
    const f = formRef.current!;

    const validPayments = payments.filter(
      (p) => p.payment_mode_id && parseFloat(p.amount) > 0,
    );

    const paymentsPayload = validPayments.map((p) => {
      const mode = paymentModsRef.current.find((pm) => String(pm.id) === p.payment_mode_id);
      const treasuryId = mode?.treasury_account_id
        ? mode.treasury_account_id
        : (p.treasury_account_id ? parseInt(String(p.treasury_account_id)) : null);
      return {
        ...(p.id ? { id: p.id } : {}),
        // translate internal _clientRef → API field client_ref at the network boundary
        ...(!p.id && p._clientRef ? { client_ref: p._clientRef } : {}),
        ...(p.client_ref ? { client_ref: p.client_ref } : {}),
        payment_mode_id:     parseInt(p.payment_mode_id),
        amount:              parseFloat(p.amount),
        reference:           p.reference?.trim() || null,
        notes:               p.notes?.trim() || null,
        payment_date:        p.payment_date,
        treasury_account_id: treasuryId,
        ...(p.check_number   ? { check_number: p.check_number } : {}),
        ...(p.check_bank     ? { check_bank: p.check_bank } : {}),
        ...(p.check_due_date ? { check_due_date: p.check_due_date } : {}),
      };
    });

    const linesPayload = f.lines.map((line) => {
      const calc = calcLineTotal(line);

      // تحويل الكمية للوحدات الأساسية
      const effectiveQty = calc.baseQty;

      // discount_percentage: نسبة الخصم الفعلية
      const discountPercentage = Math.round(calc.discPct * 10_000) / 10_000;

      // discount_amount للباكاند = خصم الوحدة الأساسية الواحدة
      const discountAmount = calc.unitDiscount;

      return {
        ...(line.id ? { id: line.id } : {}),
        product_id:          parseInt(line.product_id),
        description:         line.description || null,
        quantity:            effectiveQty,           // وحدات أساسية
        unit_price_ht:       line.unit_price_ht,     // سعر الوحدة الأساسية
        tva_rate:            line.tva_rate,
        discount_percentage: discountPercentage,
        discount_amount:     discountAmount,          // خصم الوحدة الواحدة
        ...(line.packaging_id ? { packaging_id: parseInt(line.packaging_id) } : {}),
        ...(line.stock_lot_id ? { stock_lot_id: parseInt(line.stock_lot_id) } : {}),
        ...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
        ...(isPurchase && line.manufacturing_date ? { manufacturing_date: line.manufacturing_date } : {}),
        ...(isPurchase && line.expiration_date ? { expiration_date: line.expiration_date } : {}),
        ...(isPurchase && line.supplier_lot_number ? { supplier_lot_number: line.supplier_lot_number } : {}),
        ...(line.warehouse_id ? { warehouse_id: parseInt(line.warehouse_id) } : {}),
        notes: line.line_note || null,
      };
    });

    const base: Record<string, unknown> = {
      document_type_id: documentType?.id,
      party_id:         needsParty && f.party_id ? parseInt(f.party_id) : null,
      warehouse_id:     parseInt(f.warehouse_id),
      fiscal_year_id:   parseInt(f.fiscal_year_id),
      currency_id:      parseInt(f.currency_id),
      exchange_rate:    parseFloat(f.exchange_rate) || 1,
      document_date:    f.document_date,
      due_date:         f.due_date         || null,
      delivery_date:    f.delivery_date    || null,
      notes:            f.notes            || null,
      internal_notes:   f.internal_notes   || null,
      shipping_info:    Object.keys(f.shipping_info).length > 0 ? f.shipping_info : null,
      payment_terms:    f.payment_terms.length > 0 ? f.payment_terms : null,
    };

    if (pmMode !== 'additive') {
      base.lines = linesPayload;
    }
    // Unified payment payload — always payments[], never new_payments.
    // syncPayments() on the backend handles UPSERT/DELETE by id presence.
    if (paymentsPayload.length > 0 || (isEdit && (existingDocument?.payments as unknown[] | undefined)?.length)) {
      base.payments = paymentsPayload;
    }

    return base;
  }, [documentType?.id, needsParty, isPurchase, pmMode, payments, isEdit, existingDocument]);

  // ── validateLineStockFn ───────────────────────────────────────────────────

  const validateLineStockFn = useCallback(
    (line: LineItem, product: Product) =>
      validateLineStock(line, product, isPurchase, stockDataRef.current),
    [isPurchase],
  );

  return {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, bulkAddLines, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    payments,
    addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    validateLineStock: validateLineStockFn,
    updateStockData: useCallback(
      (data: Record<number, number>) => { stockDataRef.current = data; }, [],
    ),
    docCode, isEdit, needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    clearPriceLevelSwitchMsg: () => setPriceLevelSwitchMsg(null),
  };
}
