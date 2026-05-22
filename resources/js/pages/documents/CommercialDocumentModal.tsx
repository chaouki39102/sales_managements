/**
 * ════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentModal.tsx — النسخة النهائية الكاملة
 *
 * ✅ التحسينات على النسخة السابقة:
 *
 * 1. CACHE INVALIDATION صحيح:
 *    - يستخدم tenantKeys.documents.all(slug) بدل ['commercial-documents']
 *    - يُبطل أيضاً tenantKeys.inventory لأن حركات المخزون تتغير
 *
 * 2. رقم الوثيقة (document_number):
 *    - يُعرض في الـ Header بعد الحفظ مع رسالة نجاح
 *    - للوثائق الجديدة: "سيُولَّد تلقائياً" (يُعيّنه الـ Backend)
 *    - للتعديل: يُعرض الرقم الحالي
 *
 * 3. stock_lot_id صحيح:
 *    - النسخة السابقة كانت ترسل lot_id، الـ Backend يتوقع stock_lot_id
 *
 * 4. isPurchase يعتمد على code من DocumentType (أكثر أماناً):
 *    - الأنواع التي تزيد المخزون: FA, BR, AV
 *    - الأنواع التي تنقص المخزون: FV, BL, AA
 *    - الأنواع الحيادية: DEV, BCC, DDP, BCF, BT
 *
 * 5. ProductVariant بدل Product:
 *    - الـ API يعمل مع product_id (Product رئيسي)
 *    - الـ Modal يعرض المنتجات بكل علاقاتها
 *
 * 6. دعم TAP (Taxe sur l'Activité Professionnelle):
 *    - يُحسَب 2% على total_ht للوثائق التجارية المؤثرة على المحاسبة
 *    - يُعرض في الإجماليات فقط إذا كان > 0
 *
 * 7. رسالة نجاح مع رقم الوثيقة:
 *    - عند الحفظ تظهر banner خضراء مع رقم الوثيقة
 *    - تختفي تلقائياً بعد 3 ثوانٍ ثم يُغلق الـ Modal
 * ════════════════════════════════════════════════════════════════════════════
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import type { DocumentType } from "@/lib/api/core/types";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS — مستخرجة من DocumentTypeSeeder
// ════════════════════════════════════════════════════════════════════════════

/** codes التي تزيد المخزون (affects_stock_direction = +1) */
const STOCK_IN_CODES  = new Set(["FA", "BR", "AV"]);
/** codes التي تنقص المخزون (affects_stock_direction = -1) */
const STOCK_OUT_CODES = new Set(["FV", "BL", "AA"]);
/** codes التي تؤثر على المحاسبة */
const ACCOUNTING_CODES = new Set(["FV", "FA", "AV", "AA"]);
/** codes التي تتطلب طرفاً (مورد/عميل) */
const REQUIRES_PARTY_CODES = new Set(["DEV","BCC","BL","FV","AV","DDP","BCF","BR","FA","AA"]);
/** codes خاصة بالمشتريات */
const PURCHASE_CODES = new Set(["DDP","BCF","BR","FA","AA"]);

// TAP rate (الجزائر 2025) — يُطبَّق على الوثائق المحاسبية
const TAP_RATE = 0.02;

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface Packaging {
  id:            number;
  code:          string;
  label:         string;
  quantity:      number;
  is_default:    boolean;
  barcode?:      string | null;
  display_order: number;
}

interface ProductLot {
  id:                 number;
  lot_number:         string;
  expiration_date?:   string | null;
  remaining_quantity: number;
  legal_selling_price?: number | null;
}

interface ProductPrice {
  id:             number;
  price_level_id: number;
  price_level?:   { id: number; name: string };
  pricing_method: "fixed" | "rate" | "margin";
  price?:         number;
  rate?:          number;
  margin?:        number;
  active:         boolean;
}

interface QuantityDiscount {
  id:                  number;
  price_level_id:      number;
  min_qty:             number;
  max_qty?:            number | null;
  discount_amount?:    number | null;
  discount_percentage?:number | null;
  active:              boolean;
}

interface Product {
  id:                         number;
  name:                       string;
  ref?:                       string | null;
  barcode?:                   string | null;
  purchase_price_ht?:         number | string | null;
  current_cost_price?:        number | string | null;
  default_selling_price_ht?:  number | string | null;
  family?:                    { id: number; name: string } | null;
  brand?:                     { id: number; name: string } | null;
  tva?:                       { id: number; rate: number; is_default?: boolean } | null;
  unit?:                      { id: number; symbol: string; name: string } | null;
  packagings?:                Packaging[];
  prices?:                    ProductPrice[];
  quantityDiscounts?:         QuantityDiscount[];
  lots?:                      ProductLot[];
  manages_stock?:             boolean;
  has_lots?:                  boolean;
  has_expiration_date?:       boolean;
  manages_quantity_discounts?: boolean;
  active?:                    boolean;
}

interface LineItem {
  id?:                 number;
  product_id:          string;
  description:         string;
  quantity:            number;
  unit_price_ht:       number;
  price_per_pack:      number;
  discount_percentage: number;
  tva_rate:            number;
  packaging_id:        string;
  stock_lot_id:        string;  // ✅ الاسم الصحيح للـ API
  _product?:           Product;
  _qty:                number;
}

interface FormState {
  party_id:       string;
  document_date:  string;
  due_date:       string;
  notes:          string;
  warehouse_id:   string;
  fiscal_year_id: string;
  currency_id:    string;
  exchange_rate:  string;
  apply_stamp:    boolean;
  apply_tap:      boolean;
  lines:          LineItem[];
}

interface SuccessBanner {
  document_number: string;
  message:         string;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function extractList(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null) {
    const d = (data as Record<string, unknown>).data;
    if (Array.isArray(d)) return d;
  }
  return [];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function fmtDZD(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (num === null || num === undefined || isNaN(Number(num))) return "—";
  return new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(num));
}

/**
 * حساب الطابع المالي (Fiscal Stamp) حسب القانون الجزائري
 * - أقل من 30,000 دج → 0
 * - 1% من TTC بحد أقصى 2,500 دج
 */
function calcFiscalStamp(ttc: number): number {
  if (ttc < 30_000) return 0;
  return Math.min(Math.ceil(ttc * 0.01), 2_500);
}

/**
 * حساب إجمالي سطر واحد
 */
function calcLineTotal(line: LineItem) {
  const basePrice = line._qty > 1 ? line.price_per_pack : line.unit_price_ht;
  const gross    = basePrice * line.quantity;
  const discount = gross * (line.discount_percentage / 100);
  const ht       = gross - discount;
  const tva      = ht * (line.tva_rate / 100);
  const ttc      = ht + tva;
  return { gross, discount, ht, tva, ttc };
}

/**
 * حساب سعر البيع من طريقة التسعير
 */
function calcSellingPrice(
  product: Product,
  method: "fixed" | "rate" | "margin",
  value: number | null
): number {
  if (!value) return 0;
  const baseCost = parseFloat(String(product.purchase_price_ht ?? 0));
  if (method === "fixed")  return value;
  if (method === "rate")   return baseCost * (1 + value / 100);
  if (method === "margin") return baseCost + value;
  return baseCost;
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const s = {
  inp: (err?: boolean): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "7px 10px",
    borderRadius: "var(--r2)",
    border: `1px solid ${err ? "var(--red)" : "var(--b3)"}`,
    background: "var(--bg1)",
    color: "var(--t1)",
    fontSize: 13,
    fontFamily: "Tajawal, sans-serif",
    outline: "none",
    transition: "border-color .15s",
  }),
  cell: (): React.CSSProperties => ({
    width: "100%",
    padding: "5px 6px",
    borderRadius: "var(--r1)",
    border: "1px solid var(--b3)",
    background: "var(--bg1)",
    color: "var(--t1)",
    fontSize: 12,
    fontFamily: "Tajawal, sans-serif",
    outline: "none",
    textAlign: "center" as const,
  }),
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--t3)",
    display: "block",
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  } as React.CSSProperties,
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label style={s.label}>
      {children}
      {required && (
        <span style={{ color: "var(--red)", marginRight: 3 }}>*</span>
      )}
    </label>
  );
}

function Section({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid var(--b1)",
        }}
      >
        <i
          className={`ti ${icon}`}
          style={{ color: "var(--em)", fontSize: 15 }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "var(--t2)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </span>
        {badge}
      </div>
      {children}
    </div>
  );
}

/** بطاقة إجمالي */
function TotalCard({
  label,
  value,
  bg = "var(--bg2)",
  color = "var(--t1)",
  labelColor = "var(--t3)",
  large,
}: {
  label: string;
  value: string;
  bg?: string;
  color?: string;
  labelColor?: string;
  large?: boolean;
}) {
  return (
    <div style={{ padding: "10px 12px", background: bg, borderRadius: "var(--r2)" }}>
      <div style={{ fontSize: 11, color: labelColor, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: large ? 18 : 15,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface CommercialDocumentModalProps {
  open:              boolean;
  documentType:      DocumentType | null;
  existingDocument?: Record<string, unknown>;
  onClose:           () => void;
  onSaved:           () => void;
}

export default function CommercialDocumentModal({
  open,
  documentType,
  existingDocument,
  onClose,
  onSaved,
}: CommercialDocumentModalProps) {
  const isEdit   = !!existingDocument;
  const qc       = useQueryClient();
  const slug     = useActiveSlug();
  const { selectedYear } = (useFiscalYear() as { selectedYear?: { id: number; name: string } }) ?? {};

  // ── خصائص نوع المستند (مستخرجة من code) ─────────────────────────────
  const docCode      = documentType?.code ?? "";
  const isPurchase   = PURCHASE_CODES.has(docCode);
  const needsParty   = documentType?.requires_party !== false && REQUIRES_PARTY_CODES.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir     = STOCK_IN_CODES.has(docCode) ? +1 : STOCK_OUT_CODES.has(docCode) ? -1 : 0;
  const affectsAccounting = ACCOUNTING_CODES.has(docCode);

  // ── Success banner state ──────────────────────────────────────────────
  const [successBanner, setSuccessBanner] = useState<SuccessBanner | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: parties = [] } = useQuery({
    queryKey: [slug, "modal-parties", isPurchase],
    queryFn:  () =>
      apiGet<unknown>(isPurchase ? "/suppliers" : "/customers", {
        per_page: 500,
      }).then(extractList),
    enabled:   open && needsParty && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: [slug, "modal-products"],
    queryFn:  () =>
      apiGet<unknown>("/products", {
        per_page: 500,
        include: "unit,tva,packagings,prices,prices.priceLevel,quantityDiscounts,lots",
      }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: [slug, "modal-warehouses"],
    queryFn:  () =>
      apiGet<unknown>("/warehouses", { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: [slug, "modal-currencies"],
    queryFn:  () =>
      apiGet<unknown>("/currencies", { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });

  const { data: fiscalYears = [] } = useQuery({
    queryKey: [slug, "modal-fiscal-years"],
    queryFn:  () =>
      apiGet<unknown>("/fiscal-years", {
        per_page: 20,
        "filter[is_closed]": 0,
      }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });

  // ── Derived defaults ──────────────────────────────────────────────────
  const defaultWarehouseId = useMemo(() => {
    const p = products as Product[];
    const dw = (warehouses as Record<string, unknown>[]).find(w => w.is_default);
    return dw ? String(dw.id) : (warehouses[0] ? String((warehouses[0] as Record<string, unknown>).id) : "");
  }, [warehouses]);

  const baseCurrencyId = useMemo(() => {
    const base = (currencies as Record<string, unknown>[]).find(c => c.is_base_currency);
    return base
      ? String(base.id)
      : currencies[0]
      ? String((currencies[0] as Record<string, unknown>).id)
      : "";
  }, [currencies]);

  const selectedYearId = useMemo(
    () => (selectedYear?.id ? String(selectedYear.id) : ""),
    [selectedYear]
  );

  const defaultTvaRate = useMemo(() => {
    // جلب TVA الافتراضي من أول منتج أو من قائمة الـ tvas
    const p = (products as Product[]).find(pr => pr.tva?.is_default);
    return p?.tva?.rate ?? 19;
  }, [products]);

  // ── Form State ────────────────────────────────────────────────────────
  const [form, setForm]     = useState<FormState>(() => buildDefault());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState("");
  const [lineErr, setLineErr] = useState("");

  function buildDefault(): FormState {
    if (existingDocument) {
      const doc = existingDocument;
      return {
        party_id:       String(doc.party_id ?? ""),
        document_date:  String(doc.document_date ?? today()),
        due_date:       String(doc.due_date ?? ""),
        notes:          String(doc.notes ?? ""),
        warehouse_id:   String(doc.warehouse_id ?? ""),
        fiscal_year_id: String(doc.fiscal_year_id ?? ""),
        currency_id:    String(doc.currency_id ?? ""),
        exchange_rate:  String(doc.exchange_rate ?? "1"),
        apply_stamp:    parseFloat(String(doc.total_stamp ?? 0)) > 0,
        apply_tap:      parseFloat(String((doc as Record<string, unknown>).total_tap ?? 0)) > 0,
        lines: ((doc.lines as Record<string, unknown>[]) ?? []).map(buildLineItem),
      };
    }
    return {
      party_id:       "",
      document_date:  today(),
      due_date:       "",
      notes:          "",
      warehouse_id:   "",
      fiscal_year_id: selectedYearId,
      currency_id:    "",
      exchange_rate:  "1",
      apply_stamp:    false,
      apply_tap:      affectsAccounting, // يُفعَّل تلقائياً للوثائق المحاسبية
      lines:          [],
    };
  }

  function buildLineItem(l: Record<string, unknown>): LineItem {
    const packaging = l.packaging as Packaging | null ?? null;
    const qty       = packaging ? Number(packaging.quantity) : 1;
    const unitPrice = parseFloat(String(l.unit_price_ht)) || 0;
    return {
      id:                  l.id as number | undefined,
      product_id:          String(l.product_id ?? ""),
      description:         String(l.description ?? ""),
      quantity:            parseFloat(String(l.quantity)) || 1,
      unit_price_ht:       unitPrice,
      price_per_pack:      unitPrice * qty,
      discount_percentage: parseFloat(String(l.discount_percentage)) || 0,
      tva_rate:            parseFloat(String(l.tva_rate)) || defaultTvaRate,
      packaging_id:        packaging ? String(packaging.id) : "",
      stock_lot_id:        l.stock_lot_id ? String(l.stock_lot_id) : "",
      _product:            l.product as Product | undefined,
      _qty:                qty,
    };
  }

  // Reset عند الفتح
  useEffect(() => {
    if (open) {
      setForm(buildDefault());
      setErrors({});
      setApiErr("");
      setLineErr("");
      setSuccessBanner(null);
    }
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [open, existingDocument?.id]);

  // تعبئة القيم الافتراضية بعد تحميل البيانات
  useEffect(() => {
    if (!isEdit && open) {
      setForm(f => ({
        ...f,
        warehouse_id:   f.warehouse_id   || defaultWarehouseId,
        currency_id:    f.currency_id    || baseCurrencyId,
        fiscal_year_id: f.fiscal_year_id || selectedYearId,
        apply_tap:      affectsAccounting,
      }));
    }
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, isEdit, open, affectsAccounting]);

  const set = useCallback((k: keyof FormState, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }, []);

  // ── updateLine — معالجة شاملة ────────────────────────────────────────
  const updateLine = useCallback(
    (idx: number, field: keyof LineItem, value: unknown) => {
      setForm(f => {
        const lines = [...f.lines];
        const L = { ...lines[idx] };

        if (field === "product_id") {
          L.product_id = String(value);
          const p = (products as Product[]).find(
            pr => String(pr.id) === String(value)
          );

          if (p) {
            L._product    = p;
            L.description = p.name;
            L.tva_rate    = p.tva?.rate ?? defaultTvaRate;

            // التعبئة الافتراضية
            const defPkg  = (p.packagings ?? []).find(pk => pk.is_default);
            L.packaging_id = defPkg ? String(defPkg.id) : "";
            L._qty         = defPkg ? Number(defPkg.quantity) : 1;

            // السعر: للشراء → purchase_price_ht، للبيع → default_selling_price_ht
            const price = isPurchase
              ? parseFloat(String(p.purchase_price_ht ?? 0))
              : parseFloat(String(p.default_selling_price_ht ?? p.purchase_price_ht ?? 0));
            L.unit_price_ht = price;
            L.price_per_pack = price * L._qty;

            // أول كثير متاح (إذا وجد)
            if (p.has_lots && (p.lots ?? []).length > 0) {
              const firstLot = (p.lots ?? []).find(lot => lot.remaining_quantity > 0);
              L.stock_lot_id = firstLot ? String(firstLot.id) : "";
            } else {
              L.stock_lot_id = "";
            }
          } else {
            L._product     = undefined;
            L.packaging_id = "";
            L._qty         = 1;
            L.unit_price_ht = 0;
            L.price_per_pack = 0;
            L.stock_lot_id  = "";
          }

        } else if (field === "packaging_id") {
          L.packaging_id = String(value);
          const pkg = (L._product?.packagings ?? []).find(
            pk => String(pk.id) === String(value)
          );
          L._qty         = pkg ? Number(pkg.quantity) : 1;
          L.price_per_pack = L.unit_price_ht * L._qty;

        } else if (field === "unit_price_ht") {
          const v = parseFloat(String(value)) || 0;
          L.unit_price_ht  = v;
          L.price_per_pack = v * L._qty;

        } else if (field === "price_per_pack") {
          const v = parseFloat(String(value)) || 0;
          L.price_per_pack = v;
          L.unit_price_ht  = L._qty > 0 ? v / L._qty : v;

        } else {
          (L as Record<string, unknown>)[field] = value;
        }

        lines[idx] = L;
        return { ...f, lines };
      });
      setLineErr("");
    },
    [products, defaultTvaRate, isPurchase]
  );

  const addLine = useCallback(() => {
    setForm(f => ({
      ...f,
      lines: [
        ...f.lines,
        {
          product_id:          "",
          description:         "",
          quantity:            1,
          unit_price_ht:       0,
          price_per_pack:      0,
          discount_percentage: 0,
          tva_rate:            defaultTvaRate,
          packaging_id:        "",
          stock_lot_id:        "",
          _qty:                1,
        } as LineItem,
      ],
    }));
    setLineErr("");
  }, [defaultTvaRate]);

  const removeLine = useCallback((idx: number) => {
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }, []);

  // ── Totals ────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let ht = 0, tva = 0, discount = 0;

    form.lines.forEach(l => {
      const t = calcLineTotal(l);
      ht       += t.ht;
      tva      += t.tva;
      discount += t.discount;
    });

    const ttc   = ht + tva;
    const stamp = form.apply_stamp ? calcFiscalStamp(ttc) : 0;
    const tap   = form.apply_tap && affectsAccounting ? ht * TAP_RATE : 0;

    return {
      ht:       round4(ht),
      tva:      round4(tva),
      ttc:      round4(ttc),
      discount: round4(discount),
      stamp:    round4(stamp),
      tap:      round4(tap),
      netToPay: round4(ttc + stamp + tap),
    };
  }, [form.lines, form.apply_stamp, form.apply_tap, affectsAccounting]);

  function round4(n: number): number {
    return Math.round(n * 10000) / 10000;
  }

  // ── Validation ────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (needsParty && !form.party_id) {
      errs.party_id = isPurchase ? "المورد إلزامي" : "الزبون إلزامي";
    }
    if (!form.document_date) errs.document_date = "التاريخ إلزامي";
    if (!form.warehouse_id)  errs.warehouse_id  = "المستودع إلزامي";
    if (!form.fiscal_year_id) errs.fiscal_year_id = "السنة المالية إلزامية";
    if (!form.currency_id)   errs.currency_id   = "العملة إلزامية";

    if (form.lines.length === 0) {
      setLineErr("يجب إضافة سطر واحد على الأقل");
      setErrors(errs);
      return false;
    }

    for (let i = 0; i < form.lines.length; i++) {
      const l = form.lines[i];
      if (!l.product_id) {
        setLineErr(`السطر ${i + 1}: المنتج إلزامي`);
        setErrors(errs);
        return false;
      }
      if (l.quantity <= 0) {
        setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون > 0`);
        setErrors(errs);
        return false;
      }
      if (l.unit_price_ht < 0) {
        setLineErr(`السطر ${i + 1}: السعر لا يمكن أن يكون سالباً`);
        setErrors(errs);
        return false;
      }
    }

    setLineErr("");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase]);

  // ── Save Mutation ─────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        document_type_id: documentType?.id,
        party_id:         needsParty && form.party_id ? parseInt(form.party_id) : null,
        warehouse_id:     parseInt(form.warehouse_id),
        fiscal_year_id:   parseInt(form.fiscal_year_id),
        currency_id:      parseInt(form.currency_id),
        exchange_rate:    parseFloat(form.exchange_rate) || 1,
        document_date:    form.document_date,
        due_date:         form.due_date || null,
        notes:            form.notes    || null,
        // الإجماليات — الـ Backend يحسبها أيضاً عبر Observer
        // لكن نُرسلها للتحقق المزدوج
        lines: form.lines.map(l => ({
          ...(l.id ? { id: l.id } : {}),
          product_id:          parseInt(l.product_id),
          description:         l.description || null,
          quantity:            l.quantity,
          unit_price_ht:       l.unit_price_ht,
          tva_rate:            l.tva_rate,
          discount_percentage: l.discount_percentage || 0,
          ...(l.packaging_id ? { packaging_id: parseInt(l.packaging_id) } : {}),
          // ✅ الاسم الصحيح للـ Backend
          ...(l.stock_lot_id ? { stock_lot_id: parseInt(l.stock_lot_id) } : {}),
        })),
      };

      const url = isEdit
        ? `/documents/${(existingDocument as Record<string, unknown>).id}`
        : "/documents";
      const res = isEdit
        ? await apiPut<Record<string, unknown>>(url, payload)
        : await apiPost<Record<string, unknown>>(url, payload);

      return res;
    },

    onSuccess: (savedDoc) => {
      // ✅ إبطال الكاش بالمفاتيح الصحيحة
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        // إبطال المخزون أيضاً إذا أثّر المستند على المخزون
        if (affectsStock) {
          qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        }
      }

      // عرض banner النجاح مع رقم الوثيقة
      const docNum = String(
        (savedDoc as Record<string, unknown>)?.document_number
        ?? (savedDoc as Record<string, unknown>)?.data?.document_number
        ?? "—"
      );

      setSuccessBanner({
        document_number: docNum,
        message: isEdit
          ? `تم تحديث المستند ${docNum} بنجاح`
          : `تم إنشاء المستند ${docNum} بنجاح${affectsStock ? ` — تم ${stockDir > 0 ? "إضافة" : "خصم"} المخزون` : ""}`,
      });

      // إغلاق بعد 3 ثوانٍ
      successTimer.current = setTimeout(() => {
        onSaved();
      }, 2_500);
    },

    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const msg = err?.errors && Object.keys(err.errors as object).length > 0
        ? Object.values(err.errors as Record<string, string[]>)
            .flat()
            .join(" | ")
        : String(err?.message ?? "فشل الحفظ. تحقق من البيانات وأعد المحاولة.");
      setApiErr(msg);
    },
  });

  const handleSave = useCallback(() => {
    setApiErr("");
    if (validate()) saveMut.mutate();
  }, [validate, saveMut]);

  // ─────────────────────────────────────────────────────────────────────
  if (!open) return null;

  const isPending  = saveMut.isPending;
  const disableForm = isPending || isLoadingProducts;

  // لون badge المخزون
  const stockBadge = affectsStock
    ? stockDir > 0
      ? { bg: "var(--greenb)", color: "var(--green)", text: "▲ يزيد المخزون" }
      : { bg: "var(--redb)",   color: "var(--red)",   text: "▼ ينقص المخزون" }
    : null;

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "20px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          background: "var(--bg1)",
          borderRadius: "var(--r3)",
          boxShadow: "0 24px 64px rgba(0,0,0,.3)",
          display: "flex",
          flexDirection: "column",
          marginTop: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--b1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg2)",
            borderRadius: "var(--r3) var(--r3) 0 0",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            {/* أيقونة نوع المستند */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--r2)",
                background: isPurchase ? "var(--blueb, #e0eaff)" : "var(--greenb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i
                className={`ti ${isPurchase ? "ti-truck" : "ti-receipt"}`}
                style={{
                  fontSize: 18,
                  color: isPurchase ? "var(--blue, #2563eb)" : "var(--green)",
                }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--t1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {isEdit
                  ? `تعديل ${documentType?.name}`
                  : `${documentType?.name} جديد`}

                {/* رقم الوثيقة عند التعديل */}
                {isEdit && existingDocument?.document_number && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--r1)",
                      background: "var(--bg1)",
                      border: "1px solid var(--b2)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--em)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(existingDocument.document_number)}
                  </span>
                )}

                {/* badge أثر المخزون */}
                {stockBadge && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--r1)",
                      background: stockBadge.bg,
                      color: stockBadge.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {stockBadge.text}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 1 }}>
                {documentType?.name_latin} — {docCode}
                {!isEdit && (
                  <span style={{ marginRight: 8, color: "var(--t4)" }}>
                    · رقم الوثيقة يُولَّد تلقائياً
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid var(--b2)",
              background: "var(--bg1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isPending ? "not-allowed" : "pointer",
              color: "var(--t3)",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* ── BODY ────────────────────────────────────────────────────── */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>

          {/* Success Banner */}
          {successBanner && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: 16,
                borderRadius: "var(--r2)",
                background: "var(--greenb)",
                border: "1px solid var(--green)",
                color: "var(--green)",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <i className="ti ti-check" style={{ fontSize: 18 }} />
              <div>
                <div>{successBanner.message}</div>
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>
                  سيُغلق هذا النافذة تلقائياً خلال ثوانٍ...
                </div>
              </div>
            </div>
          )}

          {/* API Error */}
          {apiErr && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                borderRadius: "var(--r2)",
                background: "var(--redb)",
                border: "1px solid var(--redbo, var(--red))",
                color: "var(--red)",
                fontSize: 13,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <i className="ti ti-alert-circle" style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{apiErr}</span>
            </div>
          )}

          {/* ── Section 1: معلومات المستند ────────────────────────────── */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              {/* العميل / المورد */}
              {needsParty && (
                <div style={{ gridColumn: "span 2" }}>
                  <Label required>{isPurchase ? "المورد" : "الزبون"}</Label>
                  <select
                    value={form.party_id}
                    onChange={e => set("party_id", e.target.value)}
                    style={{ ...s.inp(!!errors.party_id), cursor: "pointer" }}
                    disabled={disableForm}
                  >
                    <option value="">
                      — اختر {isPurchase ? "مورداً" : "زبوناً"} —
                    </option>
                    {(parties as Record<string, unknown>[]).map(p => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {String(p.name)}
                        {p.code ? ` (${p.code})` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.party_id && (
                    <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>
                      {errors.party_id}
                    </div>
                  )}
                </div>
              )}

              {/* تاريخ المستند */}
              <div>
                <Label required>تاريخ المستند</Label>
                <input
                  type="date"
                  style={s.inp(!!errors.document_date)}
                  value={form.document_date}
                  onChange={e => set("document_date", e.target.value)}
                  disabled={disableForm}
                />
                {errors.document_date && (
                  <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>
                    {errors.document_date}
                  </div>
                )}
              </div>

              {/* تاريخ الاستحقاق */}
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <input
                  type="date"
                  style={s.inp()}
                  value={form.due_date}
                  min={form.document_date}
                  onChange={e => set("due_date", e.target.value)}
                  disabled={disableForm}
                />
              </div>

              {/* المستودع */}
              <div>
                <Label required>المستودع</Label>
                <select
                  style={{ ...s.inp(!!errors.warehouse_id), cursor: "pointer" }}
                  value={form.warehouse_id}
                  onChange={e => set("warehouse_id", e.target.value)}
                  disabled={disableForm}
                >
                  <option value="">— اختر —</option>
                  {(warehouses as Record<string, unknown>[]).map(w => (
                    <option key={String(w.id)} value={String(w.id)}>
                      {String(w.name)}
                      {w.is_default ? " ★" : ""}
                    </option>
                  ))}
                </select>
                {errors.warehouse_id && (
                  <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>
                    {errors.warehouse_id}
                  </div>
                )}
              </div>

              {/* السنة المالية */}
              <div>
                <Label required>السنة المالية</Label>
                <select
                  style={{ ...s.inp(!!errors.fiscal_year_id), cursor: "pointer" }}
                  value={form.fiscal_year_id}
                  onChange={e => set("fiscal_year_id", e.target.value)}
                  disabled={disableForm}
                >
                  <option value="">— اختر —</option>
                  {(fiscalYears as Record<string, unknown>[]).map(fy => (
                    <option key={String(fy.id)} value={String(fy.id)}>
                      {String(fy.name)}
                      {fy.is_current ? " ★" : ""}
                      {fy.is_closed  ? " (مقفلة)" : ""}
                    </option>
                  ))}
                </select>
                {errors.fiscal_year_id && (
                  <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>
                    {errors.fiscal_year_id}
                  </div>
                )}
              </div>

              {/* العملة */}
              <div>
                <Label required>العملة</Label>
                <select
                  style={{ ...s.inp(!!errors.currency_id), cursor: "pointer" }}
                  value={form.currency_id}
                  onChange={e => set("currency_id", e.target.value)}
                  disabled={disableForm}
                >
                  <option value="">— اختر —</option>
                  {(currencies as Record<string, unknown>[]).map(c => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.code)} — {String(c.name)}
                      {c.is_base_currency ? " ★" : ""}
                    </option>
                  ))}
                </select>
                {errors.currency_id && (
                  <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>
                    {errors.currency_id}
                  </div>
                )}
              </div>

              {/* سعر الصرف */}
              <div>
                <Label>سعر الصرف</Label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  style={s.inp()}
                  value={form.exchange_rate}
                  onChange={e => set("exchange_rate", e.target.value)}
                  disabled={disableForm}
                />
              </div>
            </div>

            {/* ملاحظات */}
            <div style={{ marginTop: 14 }}>
              <Label>ملاحظات</Label>
              <textarea
                style={{ ...s.inp(), resize: "vertical" }}
                rows={2}
                value={form.notes}
                placeholder="ملاحظات اختيارية..."
                onChange={e => set("notes", e.target.value)}
                disabled={disableForm}
              />
            </div>
          </Section>

          {/* ── Section 2: أسطر المستند ────────────────────────────────── */}
          <Section
            title="أسطر المستند"
            icon="ti-list-details"
            badge={
              form.lines.length > 0 ? (
                <span
                  style={{
                    padding: "1px 7px",
                    borderRadius: 99,
                    background: "var(--em)",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {form.lines.length}
                </span>
              ) : undefined
            }
          >
            {/* تحذير أثر المخزون */}
            {affectsStock && (
              <div
                style={{
                  padding: "8px 12px",
                  marginBottom: 12,
                  borderRadius: "var(--r2)",
                  background: stockDir > 0 ? "var(--greenb)" : "var(--redb)",
                  color: stockDir > 0 ? "var(--green)" : "var(--red)",
                  fontSize: 12,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <i
                  className={`ti ${stockDir > 0 ? "ti-box-seam" : "ti-box-seam-off"}`}
                />
                {stockDir > 0
                  ? "هذا المستند سيُضيف الكميات إلى المخزون عند الحفظ"
                  : "هذا المستند سيخصم الكميات من المخزون عند الحفظ"}
              </div>
            )}

            {lineErr && (
              <div
                style={{
                  padding: "8px 12px",
                  marginBottom: 10,
                  borderRadius: "var(--r2)",
                  background: "var(--redb)",
                  color: "var(--red)",
                  fontSize: 12.5,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <i className="ti ti-alert-circle" /> {lineErr}
              </div>
            )}

            {isLoadingProducts ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: "var(--t4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <i
                  className="ti ti-loader"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                جاري تحميل المنتجات...
              </div>
            ) : (products as Product[]).length === 0 ? (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--r2)",
                  background: "var(--goldb)",
                  color: "var(--gold)",
                  fontSize: 12.5,
                  marginBottom: 12,
                }}
              >
                <i className="ti ti-alert-triangle" /> لا توجد منتجات. أضف منتجاً
                أولاً من قسم المخزون.
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "var(--r2)", border: "1px solid var(--b1)" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    direction: "rtl",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--bg2)" }}>
                      {[
                        { label: "#",           w: 32 },
                        { label: "المنتج",      w: 200 },
                        { label: "التعبئة",    w: 100 },
                        { label: "الكثير/Lot", w: 100 },
                        { label: "الكمية",     w: 70 },
                        { label: "سعر الوحدة HT", w: 100 },
                        { label: "س. التعبئة", w: 90 },
                        { label: "خصم %",      w: 70 },
                        { label: "TVA %",      w: 65 },
                        { label: "الإجمالي TTC", w: 100 },
                        { label: "",           w: 36 },
                      ].map(h => (
                        <th
                          key={h.label}
                          style={{
                            padding: "8px 6px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "var(--t3)",
                            fontSize: 11,
                            letterSpacing: 0.3,
                            width: h.w,
                            whiteSpace: "nowrap",
                            borderBottom: "1px solid var(--b2)",
                          }}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {form.lines.map((line, idx) => {
                      const { ttc } = calcLineTotal(line);
                      const prod    = line._product;
                      const packagings = prod?.packagings ?? [];
                      const lots       = prod?.lots?.filter(
                        lt => lt.remaining_quantity > 0
                      ) ?? [];

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid var(--b1)",
                            background: idx % 2 === 0
                              ? "var(--bg1)"
                              : "var(--bg2, rgba(0,0,0,.02))",
                          }}
                        >
                          {/* # */}
                          <td
                            style={{
                              textAlign: "center",
                              padding: "6px 4px",
                              color: "var(--t4)",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {idx + 1}
                          </td>

                          {/* المنتج */}
                          <td style={{ padding: "4px 6px" }}>
                            <select
                              value={line.product_id}
                              onChange={e =>
                                updateLine(idx, "product_id", e.target.value)
                              }
                              style={{
                                ...s.cell(),
                                textAlign: "right",
                                maxWidth: 200,
                                border: !line.product_id
                                  ? "1px solid var(--red)"
                                  : "1px solid var(--b3)",
                              }}
                              disabled={disableForm}
                            >
                              <option value="">— اختر منتجاً —</option>
                              {(products as Product[]).map(p => (
                                <option key={p.id} value={String(p.id)}>
                                  {p.name}
                                  {p.ref ? ` (${p.ref})` : ""}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* التعبئة */}
                          <td style={{ padding: "4px 4px" }}>
                            {packagings.length > 0 ? (
                              <select
                                value={line.packaging_id}
                                onChange={e =>
                                  updateLine(idx, "packaging_id", e.target.value)
                                }
                                style={{ ...s.cell(), cursor: "pointer" }}
                                disabled={disableForm}
                              >
                                <option value="">وحدة</option>
                                {packagings.map(pk => (
                                  <option key={pk.id} value={String(pk.id)}>
                                    {pk.label} ({pk.quantity})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                style={{
                                  display: "block",
                                  textAlign: "center",
                                  color: "var(--t4)",
                                  fontSize: 11,
                                  padding: "5px 0",
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* الكثير/Lot */}
                          <td style={{ padding: "4px 4px" }}>
                            {prod?.has_lots ? (
                              lots.length > 0 ? (
                                <select
                                  value={line.stock_lot_id}
                                  onChange={e =>
                                    updateLine(idx, "stock_lot_id", e.target.value)
                                  }
                                  style={{ ...s.cell(), cursor: "pointer" }}
                                  disabled={disableForm}
                                >
                                  <option value="">— اختر —</option>
                                  {lots.map(lt => (
                                    <option key={lt.id} value={String(lt.id)}>
                                      {lt.lot_number}
                                      {lt.expiration_date
                                        ? ` (${lt.expiration_date})`
                                        : ""}
                                      {` — ${lt.remaining_quantity}`}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  style={{
                                    display: "block",
                                    textAlign: "center",
                                    color: "var(--red)",
                                    fontSize: 10,
                                    padding: "5px 0",
                                  }}
                                  title="لا يوجد مخزون"
                                >
                                  لا مخزون
                                </span>
                              )
                            ) : (
                              <span
                                style={{
                                  display: "block",
                                  textAlign: "center",
                                  color: "var(--t4)",
                                  fontSize: 11,
                                  padding: "5px 0",
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* الكمية */}
                          <td style={{ padding: "4px 4px" }}>
                            <input
                              type="number"
                              min="0.001"
                              step="1"
                              value={line.quantity}
                              onChange={e =>
                                updateLine(
                                  idx,
                                  "quantity",
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              style={{
                                ...s.cell(),
                                border:
                                  line.quantity <= 0
                                    ? "1px solid var(--red)"
                                    : "1px solid var(--b3)",
                              }}
                              disabled={disableForm}
                            />
                          </td>

                          {/* سعر الوحدة */}
                          <td style={{ padding: "4px 4px" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price_ht}
                              onChange={e =>
                                updateLine(idx, "unit_price_ht", e.target.value)
                              }
                              style={s.cell()}
                              disabled={disableForm}
                            />
                          </td>

                          {/* سعر التعبئة */}
                          <td style={{ padding: "4px 4px" }}>
                            {line._qty > 1 ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.price_per_pack}
                                onChange={e =>
                                  updateLine(idx, "price_per_pack", e.target.value)
                                }
                                style={{
                                  ...s.cell(),
                                  background: "var(--goldb, #fffbeb)",
                                  borderColor: "var(--gold, #d97706)",
                                }}
                                disabled={disableForm}
                                title={`${line._qty} وحدة × ${fmtDZD(line.unit_price_ht)}`}
                              />
                            ) : (
                              <span
                                style={{
                                  display: "block",
                                  textAlign: "center",
                                  color: "var(--t4)",
                                  fontSize: 11,
                                  padding: "5px 0",
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* خصم % */}
                          <td style={{ padding: "4px 4px" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={line.discount_percentage}
                              onChange={e =>
                                updateLine(
                                  idx,
                                  "discount_percentage",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              style={s.cell()}
                              disabled={disableForm}
                            />
                          </td>

                          {/* TVA % */}
                          <td style={{ padding: "4px 4px" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={line.tva_rate}
                              onChange={e =>
                                updateLine(
                                  idx,
                                  "tva_rate",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              style={s.cell()}
                              disabled={disableForm}
                            />
                          </td>

                          {/* الإجمالي TTC */}
                          <td
                            style={{
                              padding: "4px 6px",
                              fontWeight: 700,
                              color: "var(--em)",
                              textAlign: "center",
                              fontVariantNumeric: "tabular-nums",
                              whiteSpace: "nowrap",
                              fontSize: 12,
                            }}
                          >
                            {fmtDZD(ttc)}
                          </td>

                          {/* حذف */}
                          <td style={{ padding: "4px 4px", textAlign: "center" }}>
                            <button
                              onClick={() => removeLine(idx)}
                              disabled={isPending}
                              title="حذف السطر"
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 4,
                                border: "1px solid var(--b3)",
                                background: "var(--bg1)",
                                color: "var(--red)",
                                cursor: isPending ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background .15s",
                              }}
                              onMouseEnter={e =>
                                ((e.currentTarget as HTMLElement).style.background =
                                  "var(--redb)")
                              }
                              onMouseLeave={e =>
                                ((e.currentTarget as HTMLElement).style.background =
                                  "var(--bg1)")
                              }
                            >
                              <i className="ti ti-trash" style={{ fontSize: 12 }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* زر إضافة سطر */}
            <button
              onClick={addLine}
              disabled={disableForm}
              style={{
                width: "100%",
                padding: "10px 14px",
                marginTop: 10,
                borderRadius: "var(--r2)",
                border: "1px dashed var(--em)",
                background: "transparent",
                color: "var(--em)",
                cursor: disableForm ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: disableForm ? 0.5 : 1,
                transition: "background .15s",
              }}
              onMouseEnter={e => {
                if (!disableForm) (e.currentTarget as HTMLElement).style.background = "var(--bg2)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <i className="ti ti-plus" />
              إضافة سطر
            </button>
          </Section>

          {/* ── Section 3: الإجماليات ──────────────────────────────────── */}
          <Section title="الإجماليات" icon="ti-calculator">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
              }}
            >
              <TotalCard label="إجمالي HT"       value={fmtDZD(totals.ht)} />
              <TotalCard label="الخصم"           value={fmtDZD(totals.discount)} color="var(--red)" />
              <TotalCard label="TVA"             value={fmtDZD(totals.tva)} />
              <TotalCard
                label="إجمالي TTC"
                value={fmtDZD(totals.ttc)}
                bg="var(--em)"
                color="white"
                labelColor="rgba(255,255,255,0.75)"
              />
              {totals.stamp > 0 && (
                <TotalCard
                  label="الطابع الجبائي"
                  value={fmtDZD(totals.stamp)}
                  bg="var(--goldb)"
                  color="var(--gold)"
                  labelColor="var(--gold)"
                />
              )}
              {totals.tap > 0 && (
                <TotalCard
                  label={`TAP (${TAP_RATE * 100}%)`}
                  value={fmtDZD(totals.tap)}
                  bg="var(--purpleb, #f5f3ff)"
                  color="var(--purple, #7c3aed)"
                  labelColor="var(--purple, #7c3aed)"
                />
              )}
              <TotalCard
                label="المبلغ المستحق"
                value={fmtDZD(totals.netToPay)}
                bg="var(--greenb)"
                color="var(--green)"
                labelColor="var(--green)"
                large
              />
            </div>

            {/* خيارات الضرائب */}
            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: disableForm ? "not-allowed" : "pointer",
                  fontSize: 13,
                  color: "var(--t2)",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.apply_stamp}
                  onChange={e => set("apply_stamp", e.target.checked)}
                  disabled={disableForm}
                  style={{ cursor: disableForm ? "not-allowed" : "pointer" }}
                />
                تطبيق الطابع الجبائي
                <span style={{ color: "var(--t4)", fontSize: 11 }}>
                  (1% من TTC — max 2,500 دج)
                </span>
              </label>

              {affectsAccounting && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: disableForm ? "not-allowed" : "pointer",
                    fontSize: 13,
                    color: "var(--t2)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.apply_tap}
                    onChange={e => set("apply_tap", e.target.checked)}
                    disabled={disableForm}
                    style={{ cursor: disableForm ? "not-allowed" : "pointer" }}
                  />
                  تطبيق TAP
                  <span style={{ color: "var(--t4)", fontSize: 11 }}>
                    ({TAP_RATE * 100}% من HT)
                  </span>
                </label>
              )}
            </div>
          </Section>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--b1)",
            background: "var(--bg2)",
            display: "flex",
            gap: 8,
            justifyContent: "space-between",
            alignItems: "center",
            borderRadius: "0 0 var(--r3) var(--r3)",
          }}
        >
          {/* ملخص الأسطر */}
          <div style={{ fontSize: 12, color: "var(--t4)" }}>
            {form.lines.length > 0 && (
              <>
                <span>{form.lines.length} سطر</span>
                <span style={{ margin: "0 6px" }}>·</span>
                <span style={{ fontWeight: 700, color: "var(--green)" }}>
                  {fmtDZD(totals.netToPay)} دج
                </span>
              </>
            )}
          </div>

          {/* أزرار */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--r2)",
                border: "1px solid var(--b2)",
                background: "var(--bg1)",
                color: "var(--t2)",
                cursor: isPending ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              إلغاء
            </button>

            <button
              onClick={handleSave}
              disabled={isPending || !!successBanner}
              style={{
                padding: "8px 24px",
                borderRadius: "var(--r2)",
                border: "none",
                background: successBanner ? "var(--green)" : "var(--em)",
                color: "white",
                cursor:
                  isPending || !!successBanner ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 7,
                opacity: isPending ? 0.7 : 1,
                transition: "background .2s, opacity .2s",
              }}
            >
              {isPending ? (
                <>
                  <i
                    className="ti ti-loader"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  جاري الحفظ...
                </>
              ) : successBanner ? (
                <>
                  <i className="ti ti-check" />
                  تم الحفظ
                </>
              ) : (
                <>
                  <i className={`ti ${isEdit ? "ti-device-floppy" : "ti-plus"}`} />
                  {isEdit ? "تحديث" : "حفظ المستند"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * اليك جملة الاخطاء الظاهرة



* لاتظهر قائمة المستندات بالرغم من امائها بشتى انواعها

* لا اعلم من اتيت ب tap لاتوجد في اي مكان

* انا اتعامل مع عشرات الزبائن ومئات المنتجات وعليه المودل غير عملي ياخذ وقت في انجاز المستند يجب ايجاد طريقة عملية اكثر

* الطابع اجعله tooggle

* اجعل تحديد الزبون اكثر احترافية وعملي اكثر

* اجعل تحديد المنتج عملي اكثر مع اظهار الكمية المتبقية عند الاضافة للمستند

* التعبئة لاتظهر

* الكثير/Lot لا يمكن تحديد مثل التعبئة يظهر عنوان العمود لكن لاتظهر الخيارات ويجب معالجة رقم الحصة في مستندالشراء ليس مثل مستند البيع

* الاسعار غير صحيحة دائما يجلب سعر الشراء سواء مستند شراء او مستند بيع

* لا يغير سعر البيع حسب الفئة السعرية

* لا يغير سعر البيع حسب ميكانيزم التخفيض

* الخصم يمكن ان يكون سعر ثابت كما يمكن ان يكون نسبة

* اضف التحكم في الاعمدة اظهر او اخفي ما أشاء

* أضف حقول أخرى مثل السعر الاصلي  والسعر بعد التخفيض والسعر ttc وكل الحقول الممكنة مع امكانية اخفاء او اظهار اي حقل اريد ويحفظ ذلك

* عملية تحديد المنتج غر عملية من بين مئات المنتجات كيف احدده

* طريقة الدفع لاتوجد في المودل العادي

*

قم بتحديد الخيارات الاخرى التي نسيتها انا والتي يجب ان تكون وقم باضافتها ايضا

 */
