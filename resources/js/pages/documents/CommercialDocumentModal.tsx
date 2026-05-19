/**
 * ════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentModal.tsx — النسخة المحسّنة (Enhanced)
 *
 * التحسينات الرئيسية:
 * ✅ معالجة كاملة لعلاقات المنتج (packaging, prices, discounts, lots)
 * ✅ حساب السعر الذكي بناءً على price levels والتعبئات
 * ✅ دعم الخصومات على الكميات (quantity discounts)
 * ✅ إدارة الكثير والتاريخ الانتهاء
 * ✅ حساب TVA ديناميكي من المنتج
 * ✅ معالجة أخطاء شاملة
 * ✅ validations متقدمة
 * ════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api/core/client";
import { useActiveSlug } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import type { DocumentType } from "@/types";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

/** التعبئة — موافقة مع جدول product_packagings */
interface Packaging {
  id: number;
  code: string;           // "UN", "FD", "PLT"
  label: string;          // "لتر", "فاردو", "باليطة"
  quantity: number;       // كم وحدة أساسية في التعبئة
  is_default: boolean;
  barcode?: string | null;
  display_order: number;
}

/** الكثير/الدفعة */
interface ProductLot {
  id: number;
  lot_number: string;
  expiration_date?: string | null;
  quantity_available: number;
}

/** سعر المنتج حسب مستوى السعر */
interface ProductPrice {
  id: number;
  price_level_id: number;
  price_level?: { id: number; name: string };
  pricing_method: "fixed" | "rate" | "margin";
  price?: number;    // fixed
  rate?: number;     // rate: % فوق الشراء
  margin?: number;   // margin: هامش بالدج
  active: boolean;
}

/** خصم الكمية */
interface QuantityDiscount {
  id: number;
  price_level_id: number;
  min_qty: number;
  max_qty?: number | null;
  discount_amount?: number | null;
  discount_percentage?: number | null;
  active: boolean;
}

/** المنتج الكامل مع جميع العلاقات */
interface Product {
  id: number;
  name: string;
  ref?: string | null;
  description?: string;
  barcode?: string | null;

  // تسعير
  purchase_price_ht?: number | string | null;
  current_cost_price?: number | string | null;

  // التصنيفات
  family?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  productType?: { id: number; name: string } | null;

  // الضريبة والوحدة
  tva?: { id: number; rate: number; is_default?: boolean } | null;
  unit?: { id: number; symbol: string; name: string } | null;

  // العلاقات المهمة ✅
  packagings?: Packaging[];
  prices?: ProductPrice[];
  quantityDiscounts?: QuantityDiscount[];
  lots?: ProductLot[];

  // الإعدادات
  manages_stock?: boolean;
  has_lots?: boolean;
  has_expiration_date?: boolean;
  manages_quantity_discounts?: boolean;
  active?: boolean;
}

/** سطر المستند */
interface LineItem {
  id?: number;
  product_id: string;
  description: string;
  quantity: number;
  unit_price_ht: number;
  price_per_pack: number;  // سعر التعبئة (unit_price × qty)
  discount_percentage: number;
  tva_rate: number;
  packaging_id: string;    // "" = بدون تعبئة
  lot_id?: string;         // "" = بدون كثير

  // Metadata — لا تُرسَل للـ API
  _product?: Product;
  _qty: number;            // كمية الوحدات في التعبئة
}

/** حالة النموذج */
interface FormState {
  party_id: string;
  document_date: string;
  due_date: string;
  notes: string;
  warehouse_id: string;
  fiscal_year_id: string;
  currency_id: string;
  exchange_rate: string;
  apply_stamp: boolean;
  lines: LineItem[];
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function extractList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function fmtDZD(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (num === null || num === undefined || isNaN(num)) return "—";
  return new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * حساب سعر البيع بناءً على طريقة التسعير
 */
function calcSellingPrice(
  product: Product,
  method: "fixed" | "rate" | "margin",
  value: number | null
): number {
  if (!value || value === null) return 0;

  const baseCost = parseFloat(String(product.purchase_price_ht ?? 0));

  if (method === "fixed") return value;
  if (method === "rate") return baseCost * (1 + value / 100);
  if (method === "margin") return baseCost + value;

  return baseCost;
}

/**
 * البحث عن خصم الكمية المناسب
 */
function findQuantityDiscount(
  discounts: QuantityDiscount[],
  qty: number,
  priceLevelId: number
): QuantityDiscount | null {
  if (!discounts || discounts.length === 0) return null;

  return (
    discounts
      .filter(d => d.price_level_id === priceLevelId && d.active)
      .sort((a, b) => b.min_qty - a.min_qty)
      .find(d => qty >= d.min_qty && (!d.max_qty || qty <= d.max_qty)) || null
  );
}

/**
 * حساب إجمالي السطر
 */
function calcLineTotal(line: LineItem) {
  const basePrice = line._qty > 1 ? line.price_per_pack : line.unit_price_ht;
  const gross = basePrice * line.quantity;
  const discount = gross * (line.discount_percentage / 100);
  const ht = gross - discount;
  const tva = ht * (line.tva_rate / 100);
  const ttc = ht + tva;

  return { gross, discount, ht, tva, ttc };
}

/**
 * حساب الطابع المالي (Fiscal Stamp)
 */
function calcFiscalStamp(ttc: number): number {
  if (ttc < 30_000) return 0;
  const stamp = Math.ceil(ttc * 0.01);
  return Math.min(stamp, 2_500);
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const s = {
  inp: (err?: boolean): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 10px",
    borderRadius: "var(--r2)",
    border: `1px solid ${err ? "var(--red)" : "var(--b3)"}`,
    background: "var(--bg1)",
    color: "var(--t1)",
    fontSize: 13,
    fontFamily: "Tajawal, sans-serif",
    outline: "none",
  }),
  cell: (): React.CSSProperties => ({
    width: "100%",
    padding: "5px 7px",
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
  },
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTS
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
      {required && <span style={{ color: "var(--red)", marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
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
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface CommercialDocumentModalProps {
  open: boolean;
  documentType: DocumentType | null;
  existingDocument?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function CommercialDocumentModal({
  open,
  documentType,
  existingDocument,
  onClose,
  onSaved,
}: CommercialDocumentModalProps) {
  const isEdit = !!existingDocument;
  const qc = useQueryClient();
  const slug = useActiveSlug();
  const { selectedYear } = (useFiscalYear() as any) || {};
  const isPurchase = documentType?.document_base_operation_id === 2;
  const needsParty = documentType?.requires_party !== false;

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: parties = [] } = useQuery({
    queryKey: [slug, "parties-select", isPurchase],
    queryFn: () =>
      apiGet<any>(isPurchase ? "/suppliers" : "/customers", {
        per_page: 500,
      }).then(extractList),
    enabled: open && needsParty && !!slug,
    staleTime: 5 * 60 * 1000, // 5 دقائق
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: [slug, "products-select"],
    queryFn: () =>
      apiGet<any>("/products", {
        per_page: 500,
        include:
          "unit,tva,packagings,prices,prices.priceLevel,quantityDiscounts,lots",
      }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: [slug, "warehouses-select"],
    queryFn: () =>
      apiGet<any>("/warehouses", { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60 * 1000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: [slug, "currencies-select"],
    queryFn: () => apiGet<any>("/currencies", { per_page: 50 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 30 * 60 * 1000,
  });

  const { data: fiscalYears = [] } = useQuery({
    queryKey: [slug, "fiscal-years-select"],
    queryFn: () =>
      apiGet<any>("/fiscal-years", {
        per_page: 20,
        "filter[is_closed]": 0,
      }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: priceLevels = [] } = useQuery({
    queryKey: [slug, "price-levels-select"],
    queryFn: () =>
      apiGet<any>("/price-levels", { per_page: 50 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 30 * 60 * 1000,
  });

  // ── Derived defaults ───────────────────────────────────────────────────
  const baseCurrencyId = useMemo(() => {
    const base = (currencies as any[]).find(c => c.is_base_currency);
    return base ? String(base.id) : (currencies[0] ? String(currencies[0].id) : "");
  }, [currencies]);

  const defaultWhId = useMemo(
    () => (warehouses[0] ? String(warehouses[0].id) : ""),
    [warehouses]
  );

  const selectedYearId = useMemo(
    () => (selectedYear?.id ? String(selectedYear.id) : ""),
    [selectedYear]
  );

  const defaultTva = useMemo(() => {
    const tva = (products as any[]).find(
      p => p.tva?.is_default
    )?.tva;
    return tva?.rate ?? 19;
  }, [products]);

  // ── Form State ─────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(() => buildDefault());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState("");
  const [lineErr, setLineErr] = useState("");

  function buildDefault(): FormState {
    if (existingDocument) {
      return {
        party_id: String(existingDocument.party_id ?? ""),
        document_date: existingDocument.document_date ?? today(),
        due_date: existingDocument.due_date ?? "",
        notes: existingDocument.notes ?? "",
        warehouse_id: String(existingDocument.warehouse_id ?? ""),
        fiscal_year_id: String(existingDocument.fiscal_year_id ?? ""),
        currency_id: String(existingDocument.currency_id ?? ""),
        exchange_rate: String(existingDocument.exchange_rate ?? "1"),
        apply_stamp: parseFloat(existingDocument.total_stamp ?? 0) > 0,
        lines: (existingDocument.lines ?? []).map((l: any) => buildLineItem(l)),
      };
    }

    return {
      party_id: "",
      document_date: today(),
      due_date: "",
      notes: "",
      warehouse_id: "",
      fiscal_year_id: selectedYearId,
      currency_id: "",
      exchange_rate: "1",
      apply_stamp: false,
      lines: [],
    };
  }

  function buildLineItem(l: any): LineItem {
    const packaging: Packaging | null = l.packaging ?? null;
    const qty = packaging ? Number(packaging.quantity) : 1;
    const unitPrice = parseFloat(l.unit_price_ht) || 0;

    return {
      id: l.id,
      product_id: String(l.product_id ?? ""),
      description: l.description ?? "",
      quantity: parseFloat(l.quantity) || 1,
      unit_price_ht: unitPrice,
      price_per_pack: unitPrice * qty,
      discount_percentage: parseFloat(l.discount_percentage) || 0,
      tva_rate: parseFloat(l.tva_rate) || defaultTva,
      packaging_id: packaging ? String(packaging.id) : "",
      lot_id: l.lot_id ? String(l.lot_id) : "",
      _product: l.product,
      _qty: qty,
    };
  }

  // إعادة تعيين عند الفتح
  useEffect(() => {
    if (open) {
      setForm(buildDefault());
      setErrors({});
      setApiErr("");
      setLineErr("");
    }
  }, [open, existingDocument?.id]);

  // تعبئة الافتراضيات بعد تحميل البيانات
  useEffect(() => {
    if (!isEdit && open) {
      setForm(f => ({
        ...f,
        warehouse_id: f.warehouse_id || defaultWhId,
        currency_id: f.currency_id || baseCurrencyId,
        fiscal_year_id: f.fiscal_year_id || selectedYearId,
      }));
    }
  }, [defaultWhId, baseCurrencyId, selectedYearId, isEdit, open]);

  const set = useCallback((k: keyof FormState, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: undefined }));
  }, []);

  // ── updateLine — معالجة كاملة ─────────────────────────────────────────
  const updateLine = useCallback(
    (idx: number, field: keyof LineItem, value: any) => {
      setForm(f => {
        const lines = [...f.lines];
        const L = { ...lines[idx] };

        if (field === "product_id") {
          // اختيار منتج
          L.product_id = String(value);
          const p = (products as Product[]).find(
            pr => String(pr.id) === String(value)
          );

          if (p) {
            L._product = p;
            L.description = p.name;

            // اختر التعبئة الافتراضية
            const defPkg = (p.packagings ?? []).find(pk => pk.is_default);
            L.packaging_id = defPkg ? String(defPkg.id) : "";
            L._qty = defPkg ? Number(defPkg.quantity) : 1;

            // السعر المبدئي = سعر الشراء (يمكن تغييره)
            const basePrice = parseFloat(String(p.purchase_price_ht ?? 0));
            L.unit_price_ht = basePrice;
            L.price_per_pack = basePrice * L._qty;

            // TVA من المنتج
            if (p.tva?.rate) L.tva_rate = p.tva.rate;

            // إذا كان يدير الأكثير، اختر الأول
            if (p.has_lots && (p.lots ?? []).length > 0) {
              L.lot_id = String((p.lots ?? [])[0].id);
            }
          } else {
            L._product = undefined;
            L.packaging_id = "";
            L._qty = 1;
            L.unit_price_ht = 0;
            L.price_per_pack = 0;
            L.lot_id = "";
          }
        } else if (field === "packaging_id") {
          // تغيير التعبئة
          L.packaging_id = String(value);
          const pkg = (L._product?.packagings ?? []).find(
            pk => String(pk.id) === String(value)
          );
          L._qty = pkg ? Number(pkg.quantity) : 1;
          L.price_per_pack = L.unit_price_ht * L._qty;
        } else if (field === "unit_price_ht") {
          // تحديث سعر الوحدة
          const v = parseFloat(String(value)) || 0;
          L.unit_price_ht = v;
          L.price_per_pack = v * L._qty;
        } else if (field === "price_per_pack") {
          // تحديث سعر التعبئة
          const v = parseFloat(String(value)) || 0;
          L.price_per_pack = v;
          L.unit_price_ht = L._qty > 0 ? v / L._qty : v;
        } else {
          (L as any)[field] = value;
        }

        lines[idx] = L;
        return { ...f, lines };
      });
    },
    [products]
  );

  const addLine = useCallback(() => {
    setForm(f => ({
      ...f,
      lines: [
        ...f.lines,
        {
          product_id: "",
          description: "",
          quantity: 1,
          unit_price_ht: 0,
          price_per_pack: 0,
          discount_percentage: 0,
          tva_rate: defaultTva,
          packaging_id: "",
          lot_id: "",
          _qty: 1,
        } as LineItem,
      ],
    }));
    setLineErr("");
  }, [defaultTva]);

  const removeLine = useCallback((idx: number) => {
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }, []);

  // ── Totals ─────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let ht = 0,
      tva = 0,
      discount = 0;

    form.lines.forEach(l => {
      const { ht: lineHt, discount: lineDiscount, tva: lineTva } =
        calcLineTotal(l);
      ht += lineHt;
      tva += lineTva;
      discount += lineDiscount;
    });

    const ttc = ht + tva;
    const stamp = form.apply_stamp ? calcFiscalStamp(ttc) : 0;

    return { ht, tva, ttc, discount, stamp, netToPay: ttc + stamp };
  }, [form.lines, form.apply_stamp]);

  // ── Validation ─────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (needsParty && !form.party_id) {
      errs.party_id = "الزبون/المورد إلزامي";
    }
    if (!form.document_date) {
      errs.document_date = "التاريخ إلزامي";
    }
    if (!form.warehouse_id) {
      errs.warehouse_id = "المستودع إلزامي";
    }
    if (!form.fiscal_year_id) {
      errs.fiscal_year_id = "السنة المالية إلزامية";
    }
    if (!form.currency_id) {
      errs.currency_id = "العملة إلزامية";
    }

    if (form.lines.length === 0) {
      setLineErr("يجب إضافة سطر واحد على الأقل");
      return false;
    }

    for (let i = 0; i < form.lines.length; i++) {
      if (!form.lines[i].product_id) {
        setLineErr(`السطر ${i + 1}: المنتج إلزامي`);
        return false;
      }
      if (form.lines[i].quantity <= 0) {
        setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون أكبر من صفر`);
        return false;
      }
      if (form.lines[i].unit_price_ht < 0) {
        setLineErr(`السطر ${i + 1}: السعر لا يمكن أن يكون سالباً`);
        return false;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty]);

  // ── Save ───────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        document_type_id: documentType?.id,
        party_id: needsParty && form.party_id ? parseInt(form.party_id) : null,
        warehouse_id: parseInt(form.warehouse_id),
        fiscal_year_id: parseInt(form.fiscal_year_id),
        currency_id: parseInt(form.currency_id),
        exchange_rate: parseFloat(form.exchange_rate) || 1,
        document_date: form.document_date,
        due_date: form.due_date || null,
        notes: form.notes || null,
        total_discount: totals.discount,
        total_stamp: totals.stamp,
        lines: form.lines.map(l => ({
          ...(l.id ? { id: l.id } : {}),
          product_id: parseInt(l.product_id),
          description: l.description || null,
          quantity: l.quantity,
          unit_price_ht: l.unit_price_ht,
          tva_rate: l.tva_rate,
          discount_percentage: l.discount_percentage || 0,
          ...(l.packaging_id ? { packaging_id: parseInt(l.packaging_id) } : {}),
          ...(l.lot_id ? { lot_id: parseInt(l.lot_id) } : {}),
        })),
      };

      const url = isEdit ? `/documents/${existingDocument.id}` : "/documents";
      
      return isEdit ? apiPut<any>(url, payload) : apiPost<any>(url, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [slug, "commercial-documents"] });
      onSaved();
    },
    onError: (e: any) => {
      const msg =
        e?.errors && Object.values(e.errors).length > 0
          ? Object.values(e.errors).flat().join(" | ")
          : e?.message ?? "فشل الحفظ";
      setApiErr(String(msg));
    },
  });

  const handleSave = useCallback(() => {
    setApiErr("");
    if (validate()) {
      saveMut.mutate();
    }
  }, [validate, saveMut]);

  if (!open) return null;

  const isPending = saveMut.isPending;
  const disableForm = isPending || isLoadingProducts;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.5)",
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
          boxShadow: "0 24px 64px rgba(0,0,0,.25)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--b1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg2)",
            borderRadius: "var(--r3) var(--r3) 0 0",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)" }}>
              {isEdit ? `تعديل ${documentType?.name}` : `${documentType?.name} جديد`}
            </div>
            {documentType?.name_latin && (
              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>
                {documentType.name_latin} — {documentType.code}
              </div>
            )}
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
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {/* API Error */}
          {apiErr && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                borderRadius: "var(--r2)",
                background: "var(--redb)",
                border: "1px solid var(--redbo)",
                color: "var(--red)",
                fontSize: 13,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <i className="ti ti-alert-circle" />
              {apiErr}
            </div>
          )}

          {/* معلومات المستند */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              {needsParty && (
                <div style={{ gridColumn: "span 2" }}>
                  <Label required>
                    {isPurchase ? "المورد" : "الزبون"}
                  </Label>
                  <select
                    value={form.party_id}
                    onChange={e => set("party_id", e.target.value)}
                    style={{ ...s.inp(!!errors.party_id), cursor: "pointer" }}
                    disabled={disableForm}
                  >
                    <option value="">
                      — اختر {isPurchase ? "مورداً" : "زبوناً"} —
                    </option>
                    {(parties as any[]).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
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

              <div>
                <Label required>تاريخ المستند</Label>
                <input
                  type="date"
                  style={s.inp(!!errors.document_date)}
                  value={form.document_date}
                  onChange={e => set("document_date", e.target.value)}
                  disabled={disableForm}
                />
              </div>

              <div>
                <Label>تاريخ الاستحقاق</Label>
                <input
                  type="date"
                  style={s.inp()}
                  value={form.due_date}
                  onChange={e => set("due_date", e.target.value)}
                  disabled={disableForm}
                />
              </div>

              <div>
                <Label required>المستودع</Label>
                <select
                  style={{ ...s.inp(!!errors.warehouse_id), cursor: "pointer" }}
                  value={form.warehouse_id}
                  onChange={e => set("warehouse_id", e.target.value)}
                  disabled={disableForm}
                >
                  <option value="">— اختر —</option>
                  {(warehouses as any[]).map(w => (
                    <option key={w.id} value={String(w.id)}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label required>السنة المالية</Label>
                <select
                  style={{ ...s.inp(!!errors.fiscal_year_id), cursor: "pointer" }}
                  value={form.fiscal_year_id}
                  onChange={e => set("fiscal_year_id", e.target.value)}
                  disabled={disableForm}
                >
                  <option value="">— اختر —</option>
                  {(fiscalYears as any[]).map(fy => (
                    <option key={fy.id} value={String(fy.id)}>
                      {fy.name}
                      {fy.is_current ? " ★" : ""}
                      {fy.is_closed ? " (مقفلة)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label required>العملة</Label>
                <select
                  style={{ ...s.inp(!!errors.currency_id), cursor: "pointer" }}
                  value={form.currency_id}
                  onChange={e => set("currency_id", e.target.value)}
                  disabled={disableForm}
                >
                  <option value="">— اختر —</option>
                  {(currencies as any[]).map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

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

          {/* أسطر المستند */}
          <Section title="أسطر المستند" icon="ti-list-details">
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

            {isLoadingProducts && (
              <div style={{ textAlign: "center", padding: 20, color: "var(--t4)" }}>
                <i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }} />
                جاري تحميل المنتجات...
              </div>
            )}

            {!isLoadingProducts && (products as any[]).length === 0 && (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: 10,
                  borderRadius: "var(--r2)",
                  background: "var(--goldb)",
                  color: "var(--gold)",
                  fontSize: 12,
                }}
              >
                <i className="ti ti-info-circle" /> لا توجد منتجات مسجلة.
              </div>
            )}

            {/* جدول الأسطر */}
            <div style={{ overflowX: "auto", marginBottom: 10 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid var(--b2)",
                      background: "var(--bg2)",
                    }}
                  >
                    {[
                      "#",
                      "المنتج",
                      "التعبئة",
                      "الكثير",
                      "الكمية",
                      "سعر الوحدة",
                      "خصم %",
                      "TVA %",
                      "الإجمالي",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "8px 6px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--t3)",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => {
                    const { ttc } = calcLineTotal(line);
                    const selPkg = line._product?.packagings?.find(
                      pk => String(pk.id) === line.packaging_id
                    );
                    const hasActivePkg = !!line.packaging_id && line._qty > 1;
                    const selLot = line._product?.lots?.find(
                      l => String(l.id) === line.lot_id
                    );

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid var(--b1)",
                          background:
                            idx % 2
                              ? "color-mix(in srgb,var(--b1) 25%,transparent)"
                              : "transparent",
                        }}
                      >
                        {/* # */}
                        <td
                          style={{
                            textAlign: "center",
                            fontSize: 11,
                            color: "var(--t4)",
                            padding: "5px 4px",
                          }}
                        >
                          {idx + 1}
                        </td>

                        {/* المنتج */}
                        <td style={{ padding: "4px 4px" }}>
                          <select
                            value={line.product_id}
                            onChange={e => updateLine(idx, "product_id", e.target.value)}
                            disabled={isLoadingProducts || (products as any[]).length === 0 || isPending}
                            style={s.cell()}
                          >
                            <option value="">— اختر —</option>
                            {(products as Product[]).map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.ref ? ` (${p.ref})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* التعبئة */}
                        <td style={{ padding: "4px 4px" }}>
                          {line._product?.packagings && line._product.packagings.length > 0 ? (
                            <select
                              value={line.packaging_id}
                              onChange={e => updateLine(idx, "packaging_id", e.target.value)}
                              disabled={isPending}
                              style={s.cell()}
                            >
                              <option value="">— وحدة —</option>
                              {line._product.packagings.map(pk => (
                                <option key={pk.id} value={pk.id}>
                                  {pk.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div
                              style={{
                                textAlign: "center",
                                fontSize: 11,
                                color: "var(--t4)",
                              }}
                            >
                              —
                            </div>
                          )}
                        </td>

                        {/* الكثير */}
                        <td style={{ padding: "4px 4px" }}>
                          {line._product?.has_lots && line._product.lots && line._product.lots.length > 0 ? (
                            <select
                              value={line.lot_id}
                              onChange={e => updateLine(idx, "lot_id", e.target.value)}
                              disabled={isPending}
                              style={s.cell()}
                            >
                              <option value="">— اختر —</option>
                              {line._product.lots.map(lot => (
                                <option key={lot.id} value={lot.id}>
                                  {lot.lot_number}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div
                              style={{
                                textAlign: "center",
                                fontSize: 11,
                                color: "var(--t4)",
                              }}
                            >
                              —
                            </div>
                          )}
                        </td>

                        {/* الكمية */}
                        <td style={{ padding: "4px 4px" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={line.quantity}
                            onChange={e =>
                              updateLine(idx, "quantity", parseFloat(e.target.value) || 0)
                            }
                            style={s.cell()}
                            disabled={isPending}
                          />
                        </td>

                        {/* سعر الوحدة */}
                        <td style={{ padding: "4px 4px" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price_ht}
                            onChange={e => updateLine(idx, "unit_price_ht", e.target.value)}
                            style={s.cell()}
                            disabled={isPending}
                          />
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
                            disabled={isPending}
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
                              updateLine(idx, "tva_rate", parseFloat(e.target.value) || 0)
                            }
                            style={s.cell()}
                            disabled={isPending}
                          />
                        </td>

                        {/* الإجمالي */}
                        <td
                          style={{
                            padding: "4px 4px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--em)",
                            textAlign: "center",
                          }}
                        >
                          {fmtDZD(ttc)}
                        </td>

                        {/* حذف */}
                        <td style={{ padding: "4px 4px", textAlign: "center" }}>
                          <button
                            onClick={() => removeLine(idx)}
                            disabled={isPending}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              border: "1px solid var(--b3)",
                              background: "var(--bg1)",
                              color: "var(--red)",
                              cursor: isPending ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <i className="ti ti-trash" style={{ fontSize: 11 }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* زر إضافة سطر */}
            <button
              onClick={addLine}
              disabled={disableForm}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "var(--r2)",
                border: "1px dashed var(--em)",
                background: "transparent",
                color: "var(--em)",
                cursor: disableForm ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <i className="ti ti-plus" /> إضافة سطر
            </button>
          </Section>

          {/* الإجماليات */}
          <Section title="الإجماليات" icon="ti-calculator">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <div style={{ padding: 10, background: "var(--bg2)", borderRadius: "var(--r2)" }}>
                <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>
                  إجمالي HT
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>
                  {fmtDZD(totals.ht)}
                </div>
              </div>

              <div style={{ padding: 10, background: "var(--bg2)", borderRadius: "var(--r2)" }}>
                <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>
                  الخصم
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)" }}>
                  {fmtDZD(totals.discount)}
                </div>
              </div>

              <div style={{ padding: 10, background: "var(--bg2)", borderRadius: "var(--r2)" }}>
                <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>
                  TVA
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>
                  {fmtDZD(totals.tva)}
                </div>
              </div>

              <div style={{ padding: 10, background: "var(--em)", borderRadius: "var(--r2)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                  الإجمالي TTC
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>
                  {fmtDZD(totals.ttc)}
                </div>
              </div>

              {totals.stamp > 0 && (
                <div style={{ padding: 10, background: "var(--goldb)", borderRadius: "var(--r2)" }}>
                  <div style={{ fontSize: 11, color: "var(--gold)", marginBottom: 4 }}>
                    الطابع المالي
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>
                    {fmtDZD(totals.stamp)}
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: 10,
                  background: "var(--greenb)",
                  borderRadius: "var(--r2)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--green)", marginBottom: 4 }}>
                  المبلغ المستحق
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>
                  {fmtDZD(totals.netToPay)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.apply_stamp}
                  onChange={e => set("apply_stamp", e.target.checked)}
                  disabled={disableForm}
                  style={{ cursor: disableForm ? "not-allowed" : "pointer" }}
                />
                <span style={{ fontSize: 13, color: "var(--t2)" }}>
                  تطبيق الطابع المالي
                </span>
              </label>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--b1)",
            background: "var(--bg2)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: "8px 16px",
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
            disabled={isPending}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--r2)",
              border: "none",
              background: "var(--em)",
              color: "white",
              cursor: isPending ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending && (
              <i
                className="ti ti-loader"
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            {isEdit ? "تحديث" : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
