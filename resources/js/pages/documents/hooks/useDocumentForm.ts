// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentForm.ts
//
// Hook مركزي: يحتوي على كل حالة النموذج ومنطق الأعمال.
// المكونات البصرية لا تعرف شيئاً عن الحسابات — تقرأ فقط ما تحتاجه.
//
// 🔧 BUGFIX: أُزيل require() الديناميكي من buildPayload (كان يسبب مشاكل مع
//    bundlers) واستُبدل باستيراد مباشر لـ calcLineTotal من أعلى الملف.
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
  paymentModes:       Array<{ id: number; name: string }>;
  parties:            Array<{ id: number; price_level_id?: number | null }>;
  stockData:          Record<number, number>;
  isPurchase:         boolean;
  open:               boolean;
}

interface UseDocumentFormReturn {
  form:               DocumentFormState;
  errors:             FormErrors;
  lineErr:            string;
  apiErr:             string;
  setApiErr:          (msg: string) => void;
  set:                (k: keyof DocumentFormState, v: unknown) => void;
  handlePartyChange:  (id: string) => void;
  priceLevelId:       number | null;
  // Lines
  addLine:            () => void;
  removeLine:         (idx: number) => void;
  duplicateLine:      (idx: number) => void;
  updateLine:         (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  // Payments
  addPayment:         () => void;
  removePayment:      (idx: number) => void;
  updatePayment:      (idx: number, patch: Partial<PaymentEntry>) => void;
  // Computed
  totals:             DocumentTotals;
  validate:           () => boolean;
  buildPayload:       () => Record<string, unknown>;
  validateLineStock:  (line: LineItem, product: Product) => LineStockValidation;
  // Meta
  docCode:            string;
  isEdit:             boolean;
  needsParty:         boolean;
  affectsStock:       boolean;
  stockDir:           1 | -1 | 0;
}

// ─── Line factory ─────────────────────────────────────────────────────────────

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

function buildLineFromApi(
  l:              Record<string, unknown>,
  defaultTvaRate: number,
): LineItem {
  const packaging  = (l.packaging as Packaging | null) ?? null;
  const packQty    = packaging ? Number(packaging.quantity) : 1;
  const unitPrice  = parseFloat(String(l.unit_price_ht ?? 0)) || 0;

  return {
    id:                    l.id as number | undefined,
    product_id:            String(l.product_id ?? ''),
    description:           String(l.description ?? ''),
    quantity:              parseFloat(String(l.quantity ?? 1)) || 1,
    unit_price_ht:         unitPrice,
    price_per_pack:        unitPrice * packQty,
    discount_mode:         'percent',
    discount_percentage:   parseFloat(String(l.discount_percentage ?? 0)) || 0,
    discount_amount_fixed: 0,
    tva_rate:              parseFloat(String(l.tva_rate ?? defaultTvaRate)) || defaultTvaRate,
    packaging_id:          packaging ? String(packaging.id) : '',
    stock_lot_id:          l.stock_lot_id ? String(l.stock_lot_id) : '',
    lot_number_new:        '',
    line_note:             String(l.notes ?? ''),
    _product:              l.product as Product | undefined,
    _packQty:              packQty,
  };
}

function buildDefaultForm(
  existingDocument: Record<string, unknown> | undefined,
  defaults:         { warehouseId: string; currencyId: string; yearId: string },
  defaultTvaRate:   number,
): DocumentFormState {
  if (existingDocument) {
    const doc = existingDocument;
    return {
      party_id:       String(doc.party_id       ?? ''),
      document_date:  String(doc.document_date  ?? today()).split('T')[0],
      due_date:       String(doc.due_date        ?? '').split('T')[0],
      notes:          String(doc.notes           ?? ''),
      warehouse_id:   String(doc.warehouse_id   ?? ''),
      fiscal_year_id: String(doc.fiscal_year_id ?? ''),
      currency_id:    String(doc.currency_id    ?? ''),
      exchange_rate:  String(doc.exchange_rate   ?? '1'),
      apply_stamp:    parseFloat(String(doc.total_stamp ?? 0)) > 0,
      price_level_id: String(doc.price_level_id ?? ''),
      lines:          ((doc.lines as Record<string, unknown>[]) ?? []).map(
        (l) => buildLineFromApi(l, defaultTvaRate),
      ),
      payments: [],
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
}: UseDocumentFormOptions): UseDocumentFormReturn {

  const docCode      = documentType?.code ?? '';
  const isEdit       = !!existingDocument;
  const needsParty   = REQUIRES_PARTY.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir: 1 | -1 | 0 = STOCK_IN_CODES.has(docCode) ? 1 : STOCK_OUT_CODES.has(docCode) ? -1 : 0;

  // ─── State ─────────────────────────────────────────────────────────────────

  const [form,    setForm]    = useState<DocumentFormState>(() =>
    buildDefaultForm(existingDocument, {
      warehouseId: defaultWarehouseId,
      currencyId:  baseCurrencyId,
      yearId:      selectedYearId,
    }, defaultTvaRate),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  // مرجع للـ payload داخل mutationFn (تجنب stale closure)
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // ─── Reset عند الفتح ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setForm(buildDefaultForm(
      existingDocument,
      { warehouseId: defaultWarehouseId, currencyId: baseCurrencyId, yearId: selectedYearId },
      defaultTvaRate,
    ));
    setErrors({});
    setLineErr('');
    setApiErr('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingDocument?.id]);

  // تطبيق القيم الافتراضية بعد تحميل lookups (للإنشاء فقط)
  // هذا الـ effect يعمل عندما تصل البيانات من useDocumentLookups
  // (defaultWarehouseId, baseCurrencyId) بعد تحميل الـ queries.
  useEffect(() => {
    if (isEdit || !open) return;
    setForm((f) => ({
      ...f,
      warehouse_id:   f.warehouse_id   || defaultWarehouseId,
      currency_id:    f.currency_id    || baseCurrencyId,
      fiscal_year_id: f.fiscal_year_id || selectedYearId,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, isEdit, open]);

  // ─── Form field setter ──────────────────────────────────────────────────────

  const set = useCallback((k: keyof DocumentFormState, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }, []);

  const priceLevelId = useMemo(
    () => (form.price_level_id ? parseInt(form.price_level_id) : null),
    [form.price_level_id],
  );

  const handlePartyChange = useCallback((id: string) => {
    set('party_id', id);
    const party = parties.find((p) => String(p.id) === id);
    if (party?.price_level_id) {
      set('price_level_id', String(party.price_level_id));
    }
  }, [parties, set]);

  // ─── Line management ────────────────────────────────────────────────────────

  const updateLine = useCallback((
    idx:      number,
    patch:    Partial<LineItem>,
    product?: Product | null,
  ) => {
    setForm((f) => {
      const lines = [...f.lines];
      let L = { ...lines[idx], ...patch };

      // تغيير المنتج: تحديث السعر، TVA، التعبئة، الكثير
      if (product !== undefined) {
        if (product) {
          L.description = product.name;
          L.tva_rate    = product.tva?.rate ?? defaultTvaRate;

          const defPkg = (product.packagings ?? []).find((pk) => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : '';
          L._packQty     = defPkg ? Number(defPkg.quantity) : 1;

          const price       = resolvePrice(product, priceLevelId, isPurchase);
          L.unit_price_ht   = price;
          L.price_per_pack  = price * L._packQty;

          // خصم الكميات التلقائي
          const qd = resolveQuantityDiscount(product, L.quantity, priceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            L.discount_mode         = 'fixed';
            L.discount_amount_fixed = qd.fixed;
            L.discount_percentage   = 0;
          }

          // الكثير: للبيع نأخذ أول متاح
          if (!isPurchase && product.has_lots) {
            const firstLot = (product.lots ?? []).find((lt) => lt.remaining_quantity > 0);
            L.stock_lot_id = firstLot ? String(firstLot.id) : '';
          } else {
            L.stock_lot_id   = '';
            L.lot_number_new = '';
          }

          L._product = product;
        } else {
          // مسح المنتج
          L._product       = undefined;
          L.packaging_id   = '';
          L._packQty       = 1;
          L.unit_price_ht  = 0;
          L.price_per_pack = 0;
          L.stock_lot_id   = '';
        }
      }

      // تغيير التعبئة: حساب سعر التعبئة
      if (patch.packaging_id !== undefined && product === undefined) {
        const pkg = (L._product?.packagings ?? []).find(
          (pk) => String(pk.id) === patch.packaging_id,
        );
        L._packQty       = pkg ? Number(pkg.quantity) : 1;
        L.price_per_pack = L.unit_price_ht * L._packQty;
      }

      // تغيير سعر الوحدة: تحديث سعر التعبئة
      if (patch.unit_price_ht !== undefined && product === undefined) {
        L.price_per_pack = patch.unit_price_ht * L._packQty;
      }

      // تغيير سعر التعبئة: اشتقاق سعر الوحدة
      if (patch.price_per_pack !== undefined && product === undefined) {
        L.unit_price_ht = L._packQty > 0
          ? patch.price_per_pack / L._packQty
          : patch.price_per_pack;
      }

      // تغيير الكمية: إعادة حساب خصم الكميات (للبيع)
      if (patch.quantity !== undefined && L._product && !isPurchase) {
        const qd = resolveQuantityDiscount(L._product, patch.quantity, priceLevelId);
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
  }, [defaultTvaRate, isPurchase, priceLevelId]);

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

  // ─── Payment management ─────────────────────────────────────────────────────

  const addPayment = useCallback(() => {
    setForm((f) => ({
      ...f,
      payments: [
        ...f.payments,
        {
          payment_mode_id: paymentModes[0] ? String(paymentModes[0].id) : '',
          amount:          '',
          reference:       '',
          payment_date:    today(),
        },
      ],
    }));
  }, [paymentModes]);

  const removePayment = useCallback((idx: number) => {
    setForm((f) => ({ ...f, payments: f.payments.filter((_, i) => i !== idx) }));
  }, []);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    setForm((f) => {
      const payments = [...f.payments];
      payments[idx] = { ...payments[idx], ...patch };
      return { ...f, payments };
    });
  }, []);

  // ─── Totals ─────────────────────────────────────────────────────────────────

  const totals = useMemo(
    () => calcTotals(form.lines, form.apply_stamp, form.payments),
    [form.lines, form.apply_stamp, form.payments],
  );

  // ─── Validation ─────────────────────────────────────────────────────────────

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
      if (!isPurchase && line.unit_price_ht === 0) {
        setLineErr(`السطر ${i + 1}: السعر إلزامي`);
        setErrors(errs);
        return false;
      }

      if (line._product) {
        const stockResult = validateLineStock(line, line._product, isPurchase, stockData);
        if (!stockResult.ok && stockResult.blocking) {
          setLineErr(`السطر ${i + 1}: ${stockResult.message}`);
          setErrors(errs);
          return false;
        }
      }
    }

    setLineErr('');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase, stockData]);

  // ─── Payload builder ────────────────────────────────────────────────────────
  // 🔧 calcLineTotal مستورد مباشرة من أعلى الملف — لا حاجة لـ require() الديناميكي.

  const buildPayload = useCallback((): Record<string, unknown> => {
    const f = formRef.current;

    return {
      document_type_id: documentType?.id,
      party_id:         needsParty && f.party_id ? parseInt(f.party_id) : null,
      warehouse_id:     parseInt(f.warehouse_id),
      fiscal_year_id:   parseInt(f.fiscal_year_id),
      currency_id:      parseInt(f.currency_id),
      exchange_rate:    parseFloat(f.exchange_rate) || 1,
      document_date:    f.document_date,
      due_date:         f.due_date || null,
      notes:            f.notes    || null,
      price_level_id:   f.price_level_id ? parseInt(f.price_level_id) : null,
      lines: f.lines.map((line) => {
        const { gross, discountAmt } = calcLineTotal(line);
        const discPct = gross > 0 ? (discountAmt / gross) * 100 : 0;
        return {
          ...(line.id         ? { id: line.id }                               : {}),
          product_id:           parseInt(line.product_id),
          description:          line.description || null,
          quantity:             line.quantity,
          unit_price_ht:        line.unit_price_ht,
          tva_rate:             line.tva_rate,
          discount_percentage:  Math.round(discPct * 10000) / 10000,
          ...(line.packaging_id   ? { packaging_id:   parseInt(line.packaging_id)   } : {}),
          ...(line.stock_lot_id   ? { stock_lot_id:   parseInt(line.stock_lot_id)   } : {}),
          ...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
          notes: line.line_note || null,
        };
      }),
      ...(f.payments.length > 0 ? {
        payments: f.payments
          .filter((p) => p.payment_mode_id && parseFloat(p.amount) > 0)
          .map((p) => ({
            payment_mode_id: parseInt(p.payment_mode_id),
            amount:          parseFloat(p.amount),
            reference:       p.reference || null,
            payment_date:    p.payment_date,
          })),
      } : {}),
    };
  }, [documentType?.id, needsParty, isPurchase]);

  // ─── Line stock wrapper ─────────────────────────────────────────────────────

  const validateLineStockFn = useCallback(
    (line: LineItem, product: Product) =>
      validateLineStock(line, product, isPurchase, stockData),
    [isPurchase, stockData],
  );

  return {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, priceLevelId,
    addLine, removeLine, duplicateLine, updateLine,
    addPayment, removePayment, updatePayment,
    totals, validate, buildPayload, validateLineStock: validateLineStockFn,
    docCode, isEdit, needsParty, affectsStock, stockDir,
  };
}
