// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentForm.ts — إصلاح كامل للحسابات + الدفعات
//
// ══ نموذج الدفعات (بعد الإصلاح) ═══════════════════════════════════════════
//
// مجموعة واحدة قابلة للتعديل بالكامل: payments[]
//   - صف بـ id       → UPDATE عند الحفظ
//   - صف بدون id     → INSERT عند الحفظ
//   - id كان موجوداً في existingDocument.payments ولم يعد في payments[] → DELETE
//
// buildPayload() يُرسل دائماً المصفوفة الكاملة الحالية في المفتاح `payments`،
// بغض النظر عن حالة المستند (validated/paid/draft). الباكاند (syncPayments)
// هو من يقرر UPDATE/INSERT/DELETE بمقارنة الـ ids — تماماً كأسطر الفاتورة.
//
// ⚠️ ملاحظة backend مطلوبة بالتوازي مع هذا الملف:
//   CommercialDocumentService::afterCreate/afterUpdate يستخدمان
//   `if (!empty($payments))` قبل استدعاء syncPayments — هذا يمنع حذف
//   كل الدفعات دفعة واحدة (empty([]) === true في PHP). يجب تغييرها إلى
//   `$request?->has('payments')` حتى يعمل "حذف كل الدفعات" بشكل صحيح.
//
// ══ نموذج الكميات والتعبئة ════════════════════════════════════════════════
//
// الفرونتند يعمل بـ "عدد العبوات" (displayQty) — هذا ما يُدخله المستخدم.
// الباكاند يخزن "وحدات أساسية" (baseQty = displayQty × _packQty).
//
// ══ نموذج الخصم ══════════════════════════════════════════════════════════
//
// الباكاند يخزن discount_percentage (أساسي) و discount_amount (مرجعي = خصم الوحدة).
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
  PURCHASE_CODES,
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

/**
 * 'free'    → مستند غير معتمَد بعد: الأسطر والدفعات كلاهما قابل للتعديل الحر.
 * 'linesLocked' → مستند معتمَد (validated/paid/partially_paid/overdue):
 *                 الأسطر محمية (قاعدة الباكاند R4) لكن الدفعات تبقى محررة بالكامل.
 * 'locked'  → مقفول أو ملغى: كل شيء للقراءة فقط.
 */
export type PaymentMode = 'free' | 'linesLocked' | 'locked';

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
  set:                    (k: keyof DocumentFormState, v: unknown) => void;
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
  /** المجموعة الموحَّدة القابلة للتعديل بالكامل — الصفوف ذات id تُحدَّث، الباقي يُنشأ. */
  payments:               PaymentEntry[];
  addPayment:             () => void;
  addPaymentWithValues:   (values: Partial<PaymentEntry>) => void;
  removePayment:          (idx: number) => void;
  updatePayment:          (idx: number, patch: Partial<PaymentEntry>) => void;
  paymentsReadOnly:       boolean;
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
    line_note:             '',
    _packQty:              1,
  };
}

// ─── resolvePackQty ───────────────────────────────────────────────────────────

function resolvePackQty(
  packagingId:  string,
  packagingRel: Record<string, unknown> | null,
  productRel:   Record<string, unknown> | null,
  products?:    Product[],
  productId?:   string,
): number {
  if (!packagingId) return 1;

  if (packagingRel) {
    const q = Number(packagingRel.quantity);
    if (q > 0) return q;
  }

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

function buildLineFromApi(
  l:              Record<string, unknown>,
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

  const dbDiscountAmount   = toNum(l.discount_amount ?? 0);
  const discountAmountFixed = packQty > 1
    ? Math.round(dbDiscountAmount * packQty * 10_000) / 10_000
    : dbDiscountAmount;

  const discountMode: 'percent' | 'fixed' =
    dbDiscountAmount > 0 && discountPercentage === 0 ? 'fixed' : 'percent';

  let tvaRate = l.tva_rate != null ? toNum(l.tva_rate) : NaN;
  if (isNaN(tvaRate) && productRel) {
    tvaRate = toNum((productRel.tva as Record<string, unknown> | null)?.rate ?? NaN);
  }
  if (isNaN(tvaRate)) tvaRate = defaultTvaRate;

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
    line_note:             String(l.notes ?? l.line_note ?? ''),
    _product:              productRel as Product | undefined,
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
): DocumentFormState {
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
      apply_stamp:    toNum(doc.total_stamp ?? doc.fiscal_stamp ?? 0) > 0,
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
    apply_stamp:    defaults.applyStamp ?? false,
    price_level_id: defaults.priceLevelId ?? '',
    lines: [], payments: [],
    shipping_info:  { ...defaultShipping },
    payment_terms:  [...defaultPaymentTerms],
  };
}

// ─── resolvePaymentMode ───────────────────────────────────────────────────────

/**
 * تُحدِّد فقط قابلية تعديل الأسطر (وحالة القفل الكاملة).
 * الدفعات لم تعد مرتبطة بهذه القيمة — تُتحكَّم عبر `paymentsReadOnly` بشكل مستقل،
 * وهي محررة دائماً طالما المستند غير مقفول/ملغى.
 */
function resolvePaymentMode(
  existingDocument: Record<string, unknown> | undefined,
  isLocked:    boolean,
  isCancelled: boolean,
): PaymentMode {
  if (isLocked || isCancelled) return 'locked';
  if (!existingDocument) return 'free';
  const statusName = String(
    (existingDocument.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument.status ?? '',
  ).toLowerCase();
  if (VALIDATED_STATUSES.has(statusName)) return 'linesLocked';
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

  // الأسطر: محمية بمجرد الاعتماد (تطابق قاعدة الباكاند R4)، وليس فقط عند القفل.
  const isLinesReadOnly = isReadOnly || pmMode === 'linesLocked';
  // الدفعات: محررة بالكامل ما لم يكن المستند مقفولاً/ملغى.
  const paymentsReadOnly = pmMode === 'locked';

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
    }, defaultTvaRate, products),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  /** المجموعة الموحَّدة القابلة للتعديل بالكامل: دفعات موجودة (بـ id) + دفعات جديدة. */
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

        let discountMode       = L.discount_mode;
        let discountPercentage = L.discount_percentage;
        let discountAmountFixed = L.discount_amount_fixed;

        if (result.discount_percentage > 0) {
          discountMode        = 'percent';
          discountPercentage  = result.discount_percentage;
          discountAmountFixed = 0;
        } else if (result.quantity_discount_tier === null && L._fromCompute) {
          discountMode        = 'percent';
          discountPercentage  = 0;
          discountAmountFixed = 0;
        }

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
          _fromCompute: true,
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
      apply_stamp:    (!('apply_stamp' in f) || !f.apply_stamp) ? defaultApplyStamp : f.apply_stamp,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, defaultPriceLevelId, defaultApplyStamp, isEdit, open]);

  // ── set ───────────────────────────────────────────────────────────────────

  const set = useCallback((k: keyof DocumentFormState, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => { const n = { ...prev }; delete n[k as string]; return n; });
  }, []);

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
    const newPriceLevel = party?.default_price_level_id ?? party?.default_price_level?.id ?? party?.price_level?.id ?? (defaultPriceLevelId ? parseInt(defaultPriceLevelId) : null);
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
  }, [isPurchase, payments, existingDocument, defaultPriceLevelId]);

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
      let   L               = { ...lines[idx], ...patch };
      const effectivePLRaw  = switched.plChanged ? switched.to : f.price_level_id;
      const curPriceLevelId = effectivePLRaw ? parseInt(effectivePLRaw) : null;

      if (product !== undefined) {
        if (product) {
          L.description = product.name;

          L.tva_rate = product.tva?.rate != null
            ? toNum(product.tva.rate)
            : defaultTvaRate;

          const defPkg   = (product.packagings ?? []).find((pk) => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : '';
          L._packQty     = defPkg ? (Number(defPkg.quantity) || 1) : 1;

          const unitPrice  = resolvePrice(product, curPriceLevelId, isPurchase);
          L.unit_price_ht  = unitPrice;
          L.price_per_pack = Math.round(unitPrice * L._packQty * 10_000) / 10_000;

          const baseQty = Math.round(L.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            L.discount_mode         = 'fixed';
            L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000;
            L.discount_percentage   = 0;
          } else {
            L.discount_mode         = 'percent';
            L.discount_percentage   = 0;
            L.discount_amount_fixed = 0;
          }

          if (!isPurchase && product.has_lots) {
            const firstLot = (product.lots ?? []).find((lt) => lt.remaining_quantity > 0);
            L.stock_lot_id = firstLot ? String(firstLot.id) : '';
          } else {
            L.stock_lot_id   = '';
            L.lot_number_new = '';
          }

          L._product = product;

          triggerCompute(idx, {
            product_id:                   product.id,
            quantity:                     L.quantity,
            packaging_id:                 L.packaging_id ? parseInt(L.packaging_id) : null,
            price_level_id:               curPriceLevelId,
            warehouse_id:                 warehouseIdForCompute,
            party_id:                     partyIdForCompute,
            is_purchase:                  isPurchase,
            document_date:                formRef.current?.document_date,
          }, 0);

        } else {
          L._product = undefined;
          L.packaging_id = ''; L._packQty = 1;
          L.unit_price_ht = 0; L.price_per_pack = 0;
          L.stock_lot_id = '';
          L.discount_percentage = 0; L.discount_amount_fixed = 0;
        }
      }

      if (patch.packaging_id !== undefined && product === undefined) {
        const packId = patch.packaging_id;

        let pkg = (L._product?.packagings ?? []).find((pk) => String(pk.id) === packId);
        if (!pkg && productsRef.current) {
          const prod = productsRef.current.find((p) => String(p.id) === L.product_id);
          pkg = prod?.packagings?.find((pk) => String(pk.id) === packId);
        }

        const oldPackQty = L._packQty;
        L._packQty       = pkg ? (Number(pkg.quantity) || 1) : 1;

        L.price_per_pack = Math.round(L.unit_price_ht * L._packQty * 10_000) / 10_000;

        if (L.discount_mode === 'fixed' && oldPackQty > 0) {
          const unitDisc = L.discount_amount_fixed / oldPackQty;
          L.discount_amount_fixed = Math.round(unitDisc * L._packQty * 10_000) / 10_000;
        }

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

      if (patch.unit_price_ht !== undefined && product === undefined) {
        L.price_per_pack = Math.round(patch.unit_price_ht * L._packQty * 10_000) / 10_000;
      }

      if (patch.price_per_pack !== undefined && product === undefined) {
        L.unit_price_ht = L._packQty > 1
          ? Math.round((patch.price_per_pack / L._packQty) * 10_000) / 10_000
          : patch.price_per_pack;
      }

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
  }, [defaultTvaRate, isPurchase, priceLevelMap]);

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

  // ── إدارة الدفعات (مجموعة موحَّدة قابلة للتعديل بالكامل) ──────────────────

  /**
   * معرّف داخلي فقط (طبقة API/شبكة — ليس جزءاً من نموذج الدفعة نفسه، تماماً
   * كـ _product و_packQty في LineItem). يُولَّد مرة واحدة عند إضافة الصف
   * ويرافقه حتى أول حفظ ناجح. لا معنى محاسبياً له إطلاقاً — غرضه الوحيد:
   * تمكين الباكاند من التعرّف على "هذا نفس الصف الذي أُرسل سابقاً" إذا تكرر
   * إرسال الطلب (نقرة مزدوجة، إعادة محاولة شبكة بعد timeout). لا علاقة له
   * بمنطق UPDATE/INSERT/DELETE في نفسه — ذلك يبقى محكوماً بـ id فقط.
   */
  function genClientRef(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  const addPayment = useCallback(() => {
    if (paymentsReadOnly) return;
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
  }, [paymentsReadOnly]);

  const addPaymentWithValues = useCallback((values: Partial<PaymentEntry>) => {
    if (paymentsReadOnly) return;
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
  }, [paymentsReadOnly]);

  /**
   * حذف صف دفعة من النموذج.
   * إذا كان الصف يملك id (دفعة موجودة فعلاً في DB)، فإن حذفه من المصفوفة
   * كافٍ وحده — عند buildPayload/الحفظ، الباكاند (syncPayments) سيرى أن
   * هذا الـ id لم يعد ضمن المُرسَل ويحذفه فعلياً في DB (نفس منطق أسطر الفاتورة).
   * لا حاجة لاستدعاء API منفصل هنا؛ الحذف الفعلي يحدث عند الحفظ.
   */
  const removePayment = useCallback((idx: number) => {
    if (paymentsReadOnly) return;
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }, [paymentsReadOnly]);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    if (paymentsReadOnly) return;
    setPayments((prev) => {
      const next = [...prev];
      let   P    = { ...next[idx], ...patch };
      if (patch.payment_mode_id !== undefined) {
        const selectedMode = paymentModsRef.current.find(
          (pm) => String(pm.id) === patch.payment_mode_id,
        );
        P.treasury_account_id = selectedMode?.treasury_account_id
          ? String(selectedMode.treasury_account_id) : '';
      }
      next[idx] = P;
      return next;
    });
  }, [paymentsReadOnly]);

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

    // نُبقي فقط الصفوف الصالحة (وسيلة دفع + مبلغ > 0). أي صف كان له id
    // ولم يعد ضمن هذه القائمة (سواء حُذف يدوياً أو أُفرغ مبلغه) سيُحذَف
    // فعلياً في DB بواسطة syncPayments — هذا هو سلوك "المصفوفة الكاملة"
    // المطلوب في المواصفة، تماماً كأسطر الفاتورة.
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
        // الترجمة من الحقل الداخلي _clientRef إلى اسم حقل الـ API `client_ref`
        // تحدث هنا فقط، عند حدود الشبكة — وليست جزءاً من شكل PaymentEntry
        // الذي تعمل عليه شاشة التحرير. طبقة العرض/التحرير لا "ترى" هذا الحقل.
        ...(!p.id && p._clientRef ? { client_ref: p._clientRef } : {}),
        payment_mode_id:     parseInt(p.payment_mode_id),
        amount:              parseFloat(p.amount),
        reference:           p.reference?.trim() || null,
        payment_date:        p.payment_date,
        treasury_account_id: treasuryId,
        ...(p.check_number   ? { check_number: p.check_number } : {}),
        ...(p.check_bank     ? { check_bank: p.check_bank } : {}),
        ...(p.check_due_date ? { check_due_date: p.check_due_date } : {}),
      };
    });

    const linesPayload = f.lines.map((line) => {
      const calc = calcLineTotal(line);
      const effectiveQty = calc.baseQty;
      const discountPercentage = Math.round(calc.discPct * 10_000) / 10_000;
      const discountAmount = calc.unitDiscount;

      return {
        ...(line.id ? { id: line.id } : {}),
        product_id:          parseInt(line.product_id),
        description:         line.description || null,
        quantity:            effectiveQty,
        unit_price_ht:       line.unit_price_ht,
        tva_rate:            line.tva_rate,
        discount_percentage: discountPercentage,
        discount_amount:     discountAmount,
        ...(line.packaging_id ? { packaging_id: parseInt(line.packaging_id) } : {}),
        ...(line.stock_lot_id ? { stock_lot_id: parseInt(line.stock_lot_id) } : {}),
        ...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
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

    // الأسطر تُرسَل فقط عندما تكون قابلة للتعديل (غير معتمَدة بعد).
    if (!isLinesReadOnly) {
      base.lines = linesPayload;
    }

    // الدفعات تُرسَل دائماً كمصفوفة كاملة — سواء كان المستند معتمَداً أم لا —
    // ما دامت قابلة للتعديل. نرسلها حتى لو أصبحت فارغة (حذف كل الدفعات)؛
    // هذا يتطلب أن يتحقق الباكاند بـ `has('payments')` وليس `!empty($payments)`.
    if (!paymentsReadOnly && (validPayments.length > 0 || (isEdit && (existingDocument?.payments as unknown[] | undefined)?.length))) {
      base.payments = paymentsPayload;
    }

    return base;
  }, [documentType?.id, needsParty, isPurchase, isLinesReadOnly, paymentsReadOnly, payments, isEdit, existingDocument]);

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
    paymentsReadOnly,
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
