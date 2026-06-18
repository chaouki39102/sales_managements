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
  LineStockValidation,
} from '../utils/document.utils';
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

} from '../types/document.types';

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

export interface PartyChangeResult {
  blocked:    boolean;
  reason?:    string;
  blockType?: 'has_payments' | 'price_level_change' | 'existing_payments';
}

interface UseDocumentFormOptions {
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  defaultTvaRate:     number;
  defaultWarehouseId: string;
  baseCurrencyId:     string;
  selectedYearId:     string;
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
  products:   Product[];
  stockData:  Record<number, number>;
  isPurchase: boolean;
  open:       boolean;
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
  removeLine:             (idx: number) => void;
  duplicateLine:          (idx: number) => void;
  updateLine:             (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  paymentMode:            PaymentMode;
  existingPayments:       PaymentEntry[];
  newPayments:            PaymentEntry[];
  addPayment:             () => void;
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
    tvaRate = toNum((productRel.tva as Record<string, unknown> | null)?.rate ?? NaN);
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
  defaults: { warehouseId: string; currencyId: string; yearId: string },
  defaultTvaRate: number,
  products?: Product[],
): DocumentFormState {
  if (existingDocument) {
    const doc   = existingDocument;
    const lines = ((doc.lines as Record<string, unknown>[]) ?? [])
      .map((l) => buildLineFromApi(l, defaultTvaRate, products));

    return {
      party_id:       String(doc.party_id       ?? ''),
      document_date:  String(doc.document_date  ?? today()).split('T')[0],
      due_date:       doc.due_date ? String(doc.due_date).split('T')[0] : '',
      notes:          String(doc.notes          ?? ''),
      warehouse_id:   String(doc.warehouse_id   ?? ''),
      fiscal_year_id: String(doc.fiscal_year_id ?? ''),
      currency_id:    String(doc.currency_id    ?? ''),
      exchange_rate:  String(doc.exchange_rate  ?? '1'),
      apply_stamp:    toNum(doc.total_stamp ?? doc.fiscal_stamp ?? 0) > 0,
      price_level_id: String(doc.price_level_id ?? ''),
      lines,
      payments: [],
    };
  }

  return {
    party_id: '', document_date: today(), due_date: '', notes: '',
    warehouse_id:   defaults.warehouseId,
    fiscal_year_id: defaults.yearId,
    currency_id:    defaults.currencyId,
    exchange_rate:  '1',
    apply_stamp:    false,
    price_level_id: '',
    lines: [], payments: [],
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
  selectedYearId,
  paymentModes,
  parties,
  products,
  stockData,
  isPurchase,
  open,
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
  const isLinesReadOnly = isReadOnly;

  const pmMode = resolvePaymentMode(existingDocument, isLocked, isCancelled);

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
    }, defaultTvaRate, products),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  const [existingPayments, setExistingPayments] = useState<PaymentEntry[]>([]);
  const [newPayments,      setNewPayments]      = useState<PaymentEntry[]>([]);

  useEffect(() => { formRef.current = form; }, [form]);

  // ── Reset عند فتح ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setForm(buildDefaultForm(
      existingDocument,
      { warehouseId: defaultWarehouseId, currencyId: baseCurrencyId, yearId: selectedYearId },
      defaultTvaRate,
      productsRef.current,
    ));
    setErrors({});
    setLineErr('');
    setApiErr('');

    const rawPayments = ((existingDocument?.payments as Record<string, unknown>[]) ?? [])
      .map(buildPaymentFromApi);

    if (pmMode === 'additive') {
      setExistingPayments(rawPayments);
      setNewPayments([]);
    } else if (pmMode === 'free') {
      setExistingPayments([]);
      setNewPayments(rawPayments);
    } else {
      setExistingPayments(rawPayments);
      setNewPayments([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingDocument?.id]);

  useEffect(() => {
    if (isEdit || !open) return;
    setForm((f) => ({
      ...f,
      warehouse_id:   f.warehouse_id   || defaultWarehouseId,
      currency_id:    f.currency_id    || baseCurrencyId,
      fiscal_year_id: f.fiscal_year_id || selectedYearId,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, isEdit, open]);

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
    const newPriceLevel = party?.default_price_level_id ?? null;
    const curPriceLvl   = curForm.price_level_id ? parseInt(curForm.price_level_id) : null;

    if (existingPayments.length > 0) {
      return {
        blocked: true, blockType: 'existing_payments',
        reason: 'لا يمكن تغيير الزبون: هناك دفعات مُسجَّلة. احذف الدفعات أولاً.',
      };
    }

    const validNew = newPayments.filter((p) => p.payment_mode_id && parseFloat(p.amount) > 0);
    if (validNew.length > 0) {
      return {
        blocked: true, blockType: 'has_payments',
        reason: `لا يمكن تغيير الزبون: هناك ${validNew.length} دفعة في النموذج. احذفها أولاً.`,
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

    const newPriceLevelStr = newPriceLevel ? String(newPriceLevel) : '';
    setForm((f) => ({ ...f, party_id: id, price_level_id: newPriceLevelStr }));
    setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });
    return { blocked: false };
  }, [isPurchase, existingPayments.length, newPayments]);

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

  const updateLine = useCallback((
    idx:      number,
    patch:    Partial<LineItem>,
    product?: Product | null,
  ) => {
    setForm((f) => {
      const lines           = [...f.lines];
      let   L               = { ...lines[idx], ...patch };
      const curPriceLevelId = f.price_level_id ? parseInt(f.price_level_id) : null;

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
          }

          L._product = product;

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
        if (!pkg) {
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

      // ─ L6: تغيير الكمية ───────────────────────────────────────────────────
      if (patch.quantity !== undefined && L._product && !isPurchase) {
        const baseQty = Math.round(patch.quantity * L._packQty * 1_000_000) / 1_000_000;
        const qd = resolveQuantityDiscount(L._product, baseQty, curPriceLevelId);
        if (qd.percentage > 0) {
          L.discount_mode         = 'percent';
          L.discount_percentage   = qd.percentage;
          L.discount_amount_fixed = 0;
        } else if (qd.fixed > 0) {
          L.discount_mode         = 'fixed';
          L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000;
          L.discount_percentage   = 0;
        }
      }

      lines[idx] = L;
      return { ...f, lines };
    });
    setLineErr('');
  }, [defaultTvaRate, isPurchase]);

  // ── addLine / removeLine / duplicateLine ──────────────────────────────────

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, makeLine(defaultTvaRate)] }));
    setLineErr('');
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

  // ── إدارة الدفعات ─────────────────────────────────────────────────────────

  const addPayment = useCallback(() => {
    if (pmMode === 'locked') return;
    const firstMode = paymentModsRef.current[0];
    setNewPayments((prev) => [...prev, {
      payment_mode_id:     firstMode ? String(firstMode.id) : '',
      amount:              '',
      reference:           '',
      payment_date:        today(),
      treasury_account_id: firstMode?.treasury_account_id
        ? String(firstMode.treasury_account_id) : '',
    }]);
  }, [pmMode]);

  const removePayment = useCallback((idx: number) => {
    if (pmMode === 'locked') return;
    setNewPayments((prev) => prev.filter((_, i) => i !== idx));
  }, [pmMode]);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    if (pmMode === 'locked') return;
    setNewPayments((prev) => {
      const payments = [...prev];
      let   P        = { ...payments[idx], ...patch };
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

  const allPaymentsForTotals = useMemo(
    () => [...existingPayments, ...newPayments],
    [existingPayments, newPayments],
  );

  const totals = useMemo(
    () => calcTotals(form.lines, form.apply_stamp, allPaymentsForTotals),
    [form.lines, form.apply_stamp, allPaymentsForTotals],
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

    for (let i = 0; i < newPayments.length; i++) {
      const pay    = newPayments[i];
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
  }, [form, needsParty, isPurchase, isLinesReadOnly, newPayments]);

  // ── buildPayload ──────────────────────────────────────────────────────────

  const buildPayload = useCallback((): Record<string, unknown> => {
    const f = formRef.current!;

    const validNewPayments = newPayments.filter(
      (p) => p.payment_mode_id && parseFloat(p.amount) > 0,
    );

    const paymentsPayload = validNewPayments.map((p) => {
      const mode = paymentModsRef.current.find((pm) => String(pm.id) === p.payment_mode_id);
      const treasuryId = mode?.treasury_account_id
        ? mode.treasury_account_id
        : (p.treasury_account_id ? parseInt(String(p.treasury_account_id)) : null);
      return {
        payment_mode_id:     parseInt(p.payment_mode_id),
        amount:              parseFloat(p.amount),
        reference:           p.reference?.trim() || null,
        payment_date:        p.payment_date,
        treasury_account_id: treasuryId,
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
      due_date:         f.due_date || null,
      notes:            f.notes   || null,
    };

    if (pmMode === 'additive') {
      if (paymentsPayload.length > 0) base.new_payments = paymentsPayload;
    } else {
      base.lines = linesPayload;
      if (paymentsPayload.length > 0) base.payments = paymentsPayload;
    }

    return base;
  }, [documentType?.id, needsParty, isPurchase, pmMode, newPayments]);

  // ── validateLineStockFn ───────────────────────────────────────────────────

  const validateLineStockFn = useCallback(
    (line: LineItem, product: Product) =>
      validateLineStock(line, product, isPurchase, stockDataRef.current),
    [isPurchase],
  );

  return {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    existingPayments, newPayments,
    addPayment, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    validateLineStock: validateLineStockFn,
    updateStockData: useCallback(
      (data: Record<number, number>) => { stockDataRef.current = data; }, [],
    ),
    docCode, isEdit, needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
  };
}
