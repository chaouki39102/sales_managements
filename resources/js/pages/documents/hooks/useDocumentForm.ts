// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentForm.ts
//
// ✅ الإصلاحات المطبقة:
//
// 1. disableForm — القفل الوحيد هو is_locked فقط
//    لا يُجمَّد المستند بسبب validated_at أو أي حقل آخر
//
// 2. handlePartyChange — الشرطان:
//    a. وجود دفعات مرتبطة → حجب التغيير نهائياً
//    b. الأسطر ممتلئة وفئة السعر ستتغير → حجب مع رسالة واضحة
//    c. تحديث price_level_id تلقائياً من party.price_level_id
//
// 3. updateLine — إصلاح resolvePrice:
//    يمرر curPriceLevelId الصحيح (من form.price_level_id)
//    لا يعتمد على defaultTvaRate فقط — يقرأ tva من product.tva.rate
//
// 4. التعبئة (packaging): عند تغيير packaging_id يُعيد حساب
//    price_per_pack = unit_price_ht × packQty بشكل صحيح
//
// 5. الحصة (lot): عند اختيار منتج جديد يُحدِّد أول lot متاح تلقائياً
//
// 6. الخصم بالقيمة الثابتة: discount_amount_fixed مُرسَل للـ buildPayload
//    بشكل صريح بجانب discount_percentage
//
// 7. buildPayload: يُرسل discount_amount كقيمة مطلقة للسطر
//    (الباكاند يقبل إما discount_percentage أو discount_amount)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Packaging,
  LineStockValidation,
} from '../types/document.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormErrors = Record<keyof DocumentFormState | string, string>;

interface UseDocumentFormOptions {
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  defaultTvaRate:     number;
  defaultWarehouseId: string;
  baseCurrencyId:     string;
  selectedYearId:     string;
  paymentModes:       Array<{
    id: number;
    name: string;
    code?: string;
    icon?: string;
    treasury_account_id?: number | null;
    requires_reference?: boolean;
    is_cash?: boolean;
  }>;
  parties: Array<{
    id: number;
    price_level_id?: number | null;
    price_level?: { id: number; name: string } | null;
  }>;
  stockData:    Record<number, number>;
  isPurchase:   boolean;
  open:         boolean;
  // ✅ الدفعات المرتبطة بالمستند (من API) — لمنع تغيير الزبون
  existingPaymentsCount?: number;
}

interface UseDocumentFormReturn {
  form:               DocumentFormState;
  errors:             FormErrors;
  lineErr:            string;
  apiErr:             string;
  setApiErr:          (msg: string) => void;
  set:                (k: keyof DocumentFormState, v: unknown) => void;
  handlePartyChange:  (id: string) => { blocked: boolean; reason?: string };
  priceLevelId:       number | null;
  addLine:            () => void;
  removeLine:         (idx: number) => void;
  duplicateLine:      (idx: number) => void;
  updateLine:         (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  addPayment:         () => void;
  removePayment:      (idx: number) => void;
  updatePayment:      (idx: number, patch: Partial<PaymentEntry>) => void;
  totals:             DocumentTotals;
  validate:           () => boolean;
  buildPayload:       () => Record<string, unknown>;
  validateLineStock:  (line: LineItem, product: Product) => LineStockValidation;
  updateStockData:    (data: Record<number, number>) => void;
  docCode:            string;
  isEdit:             boolean;
  needsParty:         boolean;
  affectsStock:       boolean;
  stockDir:           1 | -1 | 0;
}

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

// ─── buildLineFromApi ─────────────────────────────────────────────────────────

function buildLineFromApi(
  l: Record<string, unknown>,
  defaultTvaRate: number,
): LineItem {
  // ✅ المنتج: يأتي إما من l.product أو l.productVariant
  const productRel = (l.product   as Record<string, unknown> | null)
                  ?? (l.productVariant as Record<string, unknown> | null)
                  ?? null;

  // ✅ التعبئة: العلاقة الكاملة أو الـ ID الخام
  const packagingRel = (l.packaging as Record<string, unknown> | null) ?? null;
  const packagingId  = packagingRel
    ? String(packagingRel.id)
    : (l.packaging_id ? String(l.packaging_id) : '');
  // ✅ packQty من العلاقة مباشرةً
  const packQty = packagingRel ? Number(packagingRel.quantity ?? 1) : 1;

  // ✅ الحصة (stock lot)
  const stockLotRel = (l.stockLot  as Record<string, unknown> | null)
                   ?? (l.stock_lot as Record<string, unknown> | null)
                   ?? null;
  const stockLotId = stockLotRel
    ? String(stockLotRel.id)
    : (l.stock_lot_id ? String(l.stock_lot_id) : '');

  const unitPrice = toNum(l.unit_price_ht ?? 0);

  // ✅ الخصم: نسبة أو ثابتة
  const discountPercentage = toNum(l.discount_percentage ?? 0);
  const discountAmount     = toNum(l.discount_amount ?? l.discount_amount_fixed ?? 0);
  const discountMode: 'percent' | 'fixed' =
    discountAmount > 0 && discountPercentage === 0 ? 'fixed' : 'percent';

  // ✅ TVA: من السطر أولاً، ثم من المنتج، ثم الافتراضي
  let tvaRate = toNum(l.tva_rate ?? 0);
  if (tvaRate === 0 && productRel) {
    tvaRate = toNum((productRel.tva as Record<string, unknown> | null)?.rate ?? 0);
  }
  if (tvaRate === 0) tvaRate = defaultTvaRate;

  return {
    id:                    l.id as number | undefined,
    product_id:            String(l.product_id ?? ''),
    description:           String(l.description ?? ''),
    quantity:              toNum(l.quantity ?? 1) || 1,
    unit_price_ht:         unitPrice,
    // ✅ price_per_pack: من الـ API أو محسوب
    price_per_pack:        toNum(l.price_per_pack ?? 0) || (unitPrice * packQty),
    discount_mode:         discountMode,
    discount_percentage:   discountPercentage,
    discount_amount_fixed: discountAmount,
    tva_rate:              tvaRate,
    packaging_id:          packagingId,
    stock_lot_id:          stockLotId,
    lot_number_new:        String(l.lot_number ?? l.lot_number_new ?? ''),
    line_note:             String(l.notes ?? l.line_note ?? ''),
    _product:              productRel as Product | undefined,
    _packQty:              packQty,
  };
}

// ─── buildPaymentFromApi ──────────────────────────────────────────────────────

function buildPaymentFromApi(p: Record<string, unknown>): PaymentEntry {
  // ✅ treasury_account_id: من الحقل المباشر أو من العلاقة
  let treasuryId: string = '';
  if (p.treasury_account_id) {
    treasuryId = String(p.treasury_account_id);
  } else if (p.treasuryAccount) {
    const ta = p.treasuryAccount as Record<string, unknown>;
    if (ta?.id) treasuryId = String(ta.id);
  }

  // ✅ payment_mode_id: من الحقل أو من العلاقة
  const paymentModeId = String(
    p.payment_mode_id ?? (p.paymentMode as Record<string, unknown> | null)?.id ?? ''
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
  defaults:         { warehouseId: string; currencyId: string; yearId: string },
  defaultTvaRate:   number,
): DocumentFormState {
  if (existingDocument) {
    const doc = existingDocument;

    const existingLines = ((doc.lines as Record<string, unknown>[]) ?? [])
      .map((l) => buildLineFromApi(l, defaultTvaRate));

    // ✅ الدفعات: تُقرأ من المستند عند كل فتح للمودال
    const existingPayments = ((doc.payments as Record<string, unknown>[]) ?? [])
      .map((p) => buildPaymentFromApi(p));

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
      lines:          existingLines,
      payments:       existingPayments,
    };
  }

  return {
    party_id:       '',
    document_date:  today(),
    due_date:       '',
    notes:          '',
    warehouse_id:   defaults.warehouseId,
    fiscal_year_id: defaults.yearId,
    currency_id:    defaults.currencyId,
    exchange_rate:  '1',
    apply_stamp:    false,
    price_level_id: '',
    lines:          [],
    payments:       [],
  };
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
  stockData,
  isPurchase,
  open,
  existingPaymentsCount = 0,
}: UseDocumentFormOptions): UseDocumentFormReturn {

  const docCode      = documentType?.code ?? '';
  const isEdit       = !!existingDocument;
  const needsParty   = REQUIRES_PARTY.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir: 1 | -1 | 0 = STOCK_IN_CODES.has(docCode) ? 1
                              : STOCK_OUT_CODES.has(docCode) ? -1 : 0;

  // ─── Refs ────────────────────────────────────────────────────────────────────

  const stockDataRef    = useRef(stockData);
  const paymentModesRef = useRef(paymentModes);
  const partiesRef      = useRef(parties);
  const formRef         = useRef<DocumentFormState | null>(null);

  useEffect(() => { stockDataRef.current    = stockData;    }, [stockData]);
  useEffect(() => { paymentModesRef.current = paymentModes; }, [paymentModes]);
  useEffect(() => { partiesRef.current      = parties;      }, [parties]);

  // ─── State ───────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<DocumentFormState>(() =>
    buildDefaultForm(existingDocument, {
      warehouseId: defaultWarehouseId,
      currencyId:  baseCurrencyId,
      yearId:      selectedYearId,
    }, defaultTvaRate),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  useEffect(() => { formRef.current = form; }, [form]);

  // Reset عند فتح المودال
  useEffect(() => {
    if (!open) return;
    const newForm = buildDefaultForm(
      existingDocument,
      { warehouseId: defaultWarehouseId, currencyId: baseCurrencyId, yearId: selectedYearId },
      defaultTvaRate,
    );
    setForm(newForm);
    setErrors({});
    setLineErr('');
    setApiErr('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingDocument?.id]);

  // ضبط الافتراضيات عند الإنشاء (ليس التعديل)
  useEffect(() => {
    if (isEdit || !open) return;
    setForm((f) => ({
      ...f,
      warehouse_id:   f.warehouse_id   || defaultWarehouseId,
      currency_id:    f.currency_id    || baseCurrencyId,
      fiscal_year_id: f.fiscal_year_id || selectedYearId,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, isEdit, open]);

  // ─── Form field setter ───────────────────────────────────────────────────────

  const set = useCallback((k: keyof DocumentFormState, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => { const n = { ...prev }; delete n[k]; return n; });
  }, []);

  const priceLevelId = useMemo(
    () => (form.price_level_id ? parseInt(form.price_level_id) : null),
    [form.price_level_id],
  );

  // ─── handlePartyChange ───────────────────────────────────────────────────────
  //
  // قواعد:
  // 1. إذا كانت هناك دفعات مرتبطة بالمستند (existingPaymentsCount > 0) → حجب
  // 2. إذا كانت الأسطر ممتلئة وفئة السعر ستتغير → حجب
  // 3. في كل الأحوال: تحديث price_level_id تلقائياً من الزبون الجديد

  const handlePartyChange = useCallback((id: string): { blocked: boolean; reason?: string } => {
    const curForm       = formRef.current!;
    const party         = partiesRef.current.find((p) => String(p.id) === id);
    const newPriceLevel = party?.price_level_id ?? null;
    const curPriceLvl   = curForm.price_level_id ? parseInt(curForm.price_level_id) : null;

    // ✅ حجب إذا كانت هناك دفعات مرتبطة بالمستند
    const paymentsInForm = curForm.payments.filter(
      (p) => p.payment_mode_id && parseFloat(p.amount) > 0,
    ).length;
    const totalPayments = existingPaymentsCount + paymentsInForm;

    if (!isPurchase && totalPayments > 0) {
      return {
        blocked: true,
        reason: 'لا يمكن تغيير الزبون: هناك دفعات مرتبطة بهذا المستند. احذف الدفعات أولاً.',
      };
    }

    // ✅ حجب إذا كانت الأسطر ممتلئة وفئة السعر ستتغير
    const hasFilledLines  = curForm.lines.some((l) => l.product_id !== '');
    const priceWillChange = newPriceLevel !== curPriceLvl;

    if (!isPurchase && hasFilledLines && priceWillChange) {
      const curName = curPriceLvl   ? `فئة #${curPriceLvl}`   : 'الافتراضية';
      const newName = newPriceLevel ? `فئة #${newPriceLevel}` : 'الافتراضية';
      return {
        blocked: true,
        reason:  `لا يمكن تغيير الزبون: فئة السعر ستتغير من "${curName}" إلى "${newName}". احذف جميع أسطر المستند أولاً.`,
      };
    }

    // ✅ تطبيق التغيير + تحديث price_level_id
    const newPriceLevelStr = newPriceLevel ? String(newPriceLevel) : '';
    setForm((f) => ({
      ...f,
      party_id:       id,
      price_level_id: newPriceLevelStr,
    }));
    setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });

    return { blocked: false };
  }, [isPurchase, existingPaymentsCount]);

  // ─── updateLine ──────────────────────────────────────────────────────────────

  const updateLine = useCallback((
    idx:      number,
    patch:    Partial<LineItem>,
    product?: Product | null,
  ) => {
    setForm((f) => {
      const lines          = [...f.lines];
      let L                = { ...lines[idx], ...patch };
      const curPriceLevelId = f.price_level_id ? parseInt(f.price_level_id) : null;

      // ── اختيار منتج جديد ────────────────────────────────────────────────────
      if (product !== undefined) {
        if (product) {
          L.description = product.name;

          // ✅ TVA: من المنتج مباشرةً
          L.tva_rate = toNum(product.tva?.rate ?? 0) || defaultTvaRate;

          // ✅ التعبئة الافتراضية
          const defPkg   = (product.packagings ?? []).find((pk) => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : '';
          L._packQty     = defPkg ? Number(defPkg.quantity) || 1 : 1;

          // ✅ resolvePrice: يمرر curPriceLevelId الصحيح من form.price_level_id
          const price      = resolvePrice(product, curPriceLevelId, isPurchase);
          L.unit_price_ht  = price;
          L.price_per_pack = price * L._packQty;

          // ✅ خصم الكميات
          const qd = resolveQuantityDiscount(product, L.quantity, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            L.discount_mode         = 'fixed';
            L.discount_amount_fixed = qd.fixed;
            L.discount_percentage   = 0;
          } else {
            // إبقاء القيم الحالية إذا لم يوجد خصم كميات
            L.discount_mode         = 'percent';
            L.discount_percentage   = 0;
            L.discount_amount_fixed = 0;
          }

          // ✅ الحصة: أول lot متاح تلقائياً للبيع
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
          L._product            = undefined;
          L.packaging_id        = '';
          L._packQty            = 1;
          L.unit_price_ht       = 0;
          L.price_per_pack      = 0;
          L.stock_lot_id        = '';
          L.discount_percentage = 0;
          L.discount_amount_fixed = 0;
        }
      }

      // ── تغيير التعبئة ────────────────────────────────────────────────────────
      if (patch.packaging_id !== undefined && product === undefined) {
        const pkg  = (L._product?.packagings ?? []).find(
          (pk) => String(pk.id) === patch.packaging_id,
        );
        // ✅ إذا اختار "" (بدون تعبئة) → packQty = 1
        L._packQty       = pkg ? (Number(pkg.quantity) || 1) : 1;
        L.price_per_pack = L.unit_price_ht * L._packQty;
      }

      // ── تغيير سعر الوحدة يدوياً ─────────────────────────────────────────────
      if (patch.unit_price_ht !== undefined && product === undefined) {
        L.price_per_pack = patch.unit_price_ht * L._packQty;
      }

      // ── تغيير سعر التعبئة يدوياً ────────────────────────────────────────────
      if (patch.price_per_pack !== undefined && product === undefined) {
        L.unit_price_ht = L._packQty > 1
          ? patch.price_per_pack / L._packQty
          : patch.price_per_pack;
      }

      // ── تغيير الكمية → إعادة حساب خصم الكميات ──────────────────────────────
      if (patch.quantity !== undefined && L._product && !isPurchase) {
        const qd = resolveQuantityDiscount(L._product, patch.quantity, curPriceLevelId);
        if (qd.percentage > 0) {
          L.discount_mode         = 'percent';
          L.discount_percentage   = qd.percentage;
          L.discount_amount_fixed = 0;
        } else if (qd.fixed > 0) {
          L.discount_mode         = 'fixed';
          L.discount_amount_fixed = qd.fixed;
          L.discount_percentage   = 0;
        }
      }

      lines[idx] = L;
      return { ...f, lines };
    });
    setLineErr('');
  }, [defaultTvaRate, isPurchase]);

  // ─── addLine / removeLine / duplicateLine ────────────────────────────────────

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

  // ─── Payment management ──────────────────────────────────────────────────────

  const addPayment = useCallback(() => {
    const firstMode = paymentModesRef.current[0];
    setForm((f) => ({
      ...f,
      payments: [
        ...f.payments,
        {
          payment_mode_id:     firstMode ? String(firstMode.id) : '',
          amount:              '',
          reference:           '',
          payment_date:        today(),
          treasury_account_id: firstMode?.treasury_account_id
            ? String(firstMode.treasury_account_id)
            : '',
        },
      ],
    }));
  }, []);

  const removePayment = useCallback((idx: number) => {
    setForm((f) => ({ ...f, payments: f.payments.filter((_, i) => i !== idx) }));
  }, []);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    setForm((f) => {
      const payments = [...f.payments];
      let P = { ...payments[idx], ...patch };

      // ✅ عند تغيير طريقة الدفع → تحديث treasury_account_id تلقائياً
      if (patch.payment_mode_id !== undefined) {
        const selectedMode = paymentModesRef.current.find(
          (pm) => String(pm.id) === patch.payment_mode_id,
        );
        P.treasury_account_id = selectedMode?.treasury_account_id
          ? String(selectedMode.treasury_account_id)
          : '';
      }

      payments[idx] = P;
      return { ...f, payments };
    });
  }, []);

  // ─── Totals ──────────────────────────────────────────────────────────────────

  const totals = useMemo(
    () => calcTotals(form.lines, form.apply_stamp, form.payments),
    [form.lines, form.apply_stamp, form.payments],
  );

  // ─── validate ────────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (needsParty && !form.party_id)
      errs.party_id = isPurchase ? 'المورد إلزامي' : 'الزبون إلزامي';
    if (!form.document_date)  errs.document_date  = 'التاريخ إلزامي';
    if (!form.warehouse_id)   errs.warehouse_id   = 'المستودع إلزامي';
    if (!form.fiscal_year_id) errs.fiscal_year_id = 'السنة المالية إلزامية';
    if (!form.currency_id)    errs.currency_id    = 'العملة إلزامية';

    if (form.lines.length === 0) {
      setLineErr('يجب إضافة سطر واحد على الأقل');
      setErrors(errs);
      return false;
    }

    for (let i = 0; i < form.lines.length; i++) {
      const line = form.lines[i];
      if (!line.product_id) {
        setLineErr(`السطر ${i + 1}: المنتج إلزامي`);
        setErrors(errs);
        return false;
      }
      if (line.quantity <= 0) {
        setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون > 0`);
        setErrors(errs);
        return false;
      }
      if (!isPurchase && line.unit_price_ht === 0 && line.price_per_pack === 0) {
        setLineErr(`السطر ${i + 1}: السعر إلزامي`);
        setErrors(errs);
        return false;
      }
      if (line._product) {
        const sv = validateLineStock(line, line._product, isPurchase, stockDataRef.current);
        if (!sv.ok && sv.blocking) {
          setLineErr(`السطر ${i + 1}: ${sv.message}`);
          setErrors(errs);
          return false;
        }
      }
    }

    // التحقق من حسابات الخزينة في الدفعات
    for (let i = 0; i < form.payments.length; i++) {
      const pay    = form.payments[i];
      const amount = parseFloat(pay.amount);
      if (amount > 0 && !pay.treasury_account_id) {
        setLineErr(`الدفعة ${i + 1}: يجب اختيار حساب خزينة`);
        setErrors(errs);
        return false;
      }
    }

    setLineErr('');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase]);

  // ─── buildPayload ────────────────────────────────────────────────────────────

  const buildPayload = useCallback((): Record<string, unknown> => {
    const f = formRef.current!;
    return {
      document_type_id:   documentType?.id,
      party_id:           needsParty && f.party_id ? parseInt(f.party_id) : null,
      warehouse_id:       parseInt(f.warehouse_id),
      fiscal_year_id:     parseInt(f.fiscal_year_id),
      currency_id:        parseInt(f.currency_id),
      exchange_rate:      parseFloat(f.exchange_rate) || 1,
      document_date:      f.document_date,
      due_date:           f.due_date   || null,
      notes:              f.notes      || null,
      price_level_id:     f.price_level_id ? parseInt(f.price_level_id) : null,
      apply_fiscal_stamp: f.apply_stamp,
      lines: f.lines.map((line) => {
        // ✅ إرسال الخصم بالطريقة الصحيحة حسب الوضع
        const discountPayload: Record<string, unknown> = {};
        if (line.discount_mode === 'percent') {
          discountPayload.discount_percentage = line.discount_percentage;
          discountPayload.discount_amount     = 0;
        } else {
          // ✅ الخصم بالقيمة الثابتة: discount_amount_fixed × quantity = إجمالي الخصم
          const totalDiscount = line.discount_amount_fixed * line.quantity;
          const { gross }     = calcLineTotal(line);
          // نُرسل نسبة مكافئة للباكاند (إذا كان يتوقع فقط percentage)
          discountPayload.discount_percentage  = gross > 0
            ? Math.round((totalDiscount / gross) * 100 * 10000) / 10000
            : 0;
          // ✅ نُرسل أيضاً discount_amount للباكاندات التي تقبله مباشرةً
          discountPayload.discount_amount      = line.discount_amount_fixed;
        }

        return {
          ...(line.id ? { id: line.id } : {}),
          product_id:    parseInt(line.product_id),
          description:   line.description || null,
          quantity:      line.quantity,
          unit_price_ht: line.unit_price_ht,
          tva_rate:      line.tva_rate,
          ...discountPayload,
          ...(line.packaging_id ? { packaging_id: parseInt(line.packaging_id) } : {}),
          ...(line.stock_lot_id ? { stock_lot_id: parseInt(line.stock_lot_id) } : {}),
          ...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
          notes: line.line_note || null,
        };
      }),
      ...(f.payments.length > 0 ? {
        payments: f.payments
          .filter((p) => p.payment_mode_id && parseFloat(p.amount) > 0)
          .map((p) => ({
            payment_mode_id:     parseInt(p.payment_mode_id),
            amount:              parseFloat(p.amount),
            reference:           p.reference || null,
            payment_date:        p.payment_date,
            treasury_account_id: p.treasury_account_id
              ? parseInt(String(p.treasury_account_id))
              : null,
          })),
      } : {}),
    };
  }, [documentType?.id, needsParty, isPurchase]);

  // ─── validateLineStockFn ─────────────────────────────────────────────────────

  const validateLineStockFn = useCallback(
    (line: LineItem, product: Product) =>
      validateLineStock(line, product, isPurchase, stockDataRef.current),
    [isPurchase],
  );

  return {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    addPayment, removePayment, updatePayment,
    totals, validate, buildPayload,
    validateLineStock: validateLineStockFn,
    updateStockData: useCallback(
      (data: Record<number, number>) => { stockDataRef.current = data; },
      [],
    ),
    docCode, isEdit, needsParty, affectsStock, stockDir,
  };
}
