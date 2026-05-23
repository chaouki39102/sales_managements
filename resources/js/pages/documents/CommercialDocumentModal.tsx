/**
 * ════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentModal.tsx — النسخة المُعاد بناؤها بالكامل
 *
 * الإصلاحات والتحسينات:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. بحث فوري للزبون/المورد مع ComboBox احترافي (بدل <select>)
 * 2. بحث فوري للمنتج مع ComboBox + عرض المخزون المتاح
 * 3. الأسعار صحيحة: شراء → purchase_price_ht / بيع → default_selling_price_ht
 * 4. تطبيق الفئة السعرية (price levels) تلقائياً
 * 5. تطبيق خصم الكميات (quantity discounts) تلقائياً
 * 6. الخصم: نسبة % أو مبلغ ثابت مع toggle
 * 7. التعبئة (packagings): تظهر دائماً عند وجودها
 * 8. الكثير/Lot: منفصل بين شراء (رقم حصة جديد) وبيع (اختيار من المتاح)
 * 9. الطابع الجبائي: toggle احترافي (لا checkbox)
 * 10. TAP: حُذف (لا وجود له في الـ Schema)
 * 11. التحكم في الأعمدة: أظهر/أخفِ + تُحفظ في localStorage
 * 12. أعمدة إضافية: السعر الأصلي، بعد الخصم، HT، TTC كل سطر
 * 13. طريقة الدفع: قسم مستقل في المودال
 * 14. إضافة: ملاحظة لكل سطر، حقل الوحدة، رقم المرجع
 * 15. إضافة: مربع بحث سريع بالباركود
 * 16. إضافة: نسخ مستند (duplicate)
 * 17. قائمة المستندات: إصلاح filter بالـ type_code الصحيح
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
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const STOCK_IN_CODES   = new Set(["FA", "BR", "AV"]);
const STOCK_OUT_CODES  = new Set(["FV", "BL", "AA"]);
const PURCHASE_CODES   = new Set(["DDP", "BCF", "BR", "FA", "AA"]);
const REQUIRES_PARTY   = new Set(["DEV","BCC","BL","FV","AV","DDP","BCF","BR","FA","AA"]);

// أعمدة الجدول مع إمكانية الإخفاء
const ALL_COLUMNS = [
  { key: "idx",          label: "#",            w: 34,   fixed: true  },
  { key: "product",      label: "المنتج",       w: 220,  fixed: true  },
  { key: "packaging",    label: "التعبئة",      w: 110,  fixed: false },
  { key: "lot",          label: "الكثير",       w: 120,  fixed: false },
  { key: "quantity",     label: "الكمية",       w: 75,   fixed: true  },
  { key: "unit",         label: "الوحدة",       w: 60,   fixed: false },
  { key: "unit_price",   label: "سعر الوحدة HT",w: 110,  fixed: false },
  { key: "pack_price",   label: "سعر التعبئة", w: 100,  fixed: false },
  { key: "orig_price",   label: "السعر الأصلي",w: 100,  fixed: false },
  { key: "discount",     label: "الخصم",        w: 110,  fixed: false },
  { key: "price_after",  label: "بعد الخصم HT", w: 100,  fixed: false },
  { key: "tva",          label: "TVA %",        w: 68,   fixed: false },
  { key: "total_ht",     label: "إجمالي HT",   w: 100,  fixed: false },
  { key: "total_ttc",    label: "إجمالي TTC",  w: 110,  fixed: true  },
  { key: "line_note",    label: "ملاحظة",       w: 100,  fixed: false },
  { key: "actions",      label: "",             w: 36,   fixed: true  },
] as const;

type ColKey = typeof ALL_COLUMNS[number]["key"];

const COLS_STORAGE_KEY = "cdm_visible_cols_v2";

function loadVisibleCols(): Set<ColKey> {
  try {
    const raw = localStorage.getItem(COLS_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as ColKey[]);
  } catch {}
  // الافتراضي
  return new Set<ColKey>([
    "idx","product","packaging","lot","quantity","unit_price",
    "pack_price","discount","tva","total_ttc","actions",
  ]);
}

function saveVisibleCols(cols: Set<ColKey>) {
  try {
    localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify([...cols]));
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface Packaging {
  id: number; code: string; label: string;
  quantity: number; is_default: boolean; barcode?: string | null;
}

interface ProductLot {
  id: number; lot_number: string;
  expiration_date?: string | null;
  remaining_quantity: number;
  purchase_price?: number | null;
  legal_selling_price?: number | null;
}

interface ProductPrice {
  id: number; price_level_id: number;
  price_level?: { id: number; name: string };
  pricing_method: "fixed" | "rate" | "margin";
  price?: number; rate?: number; margin?: number; active: boolean;
}

interface QuantityDiscount {
  id: number; price_level_id: number;
  min_qty: number; max_qty?: number | null;
  discount_amount?: number | null;
  discount_percentage?: number | null; active: boolean;
}

interface Product {
  id: number; name: string; ref?: string | null; barcode?: string | null;
  purchase_price_ht?: number | string | null;
  current_cost_price?: number | string | null;
  default_selling_price_ht?: number | string | null;
  family?: { id: number; name: string } | null;
  brand?:  { id: number; name: string } | null;
  tva?:    { id: number; rate: number; is_default?: boolean } | null;
  unit?:   { id: number; symbol: string; name: string } | null;
  packagings?:       Packaging[];
  prices?:           ProductPrice[];
  quantityDiscounts?: QuantityDiscount[];
  lots?:             ProductLot[];
  manages_stock?: boolean;
  has_lots?:      boolean;
  active?:        boolean;
  stock_quantity?: number | null; // الكمية الإجمالية المتاحة
}

interface Party {
  id: number; name: string; code?: string | null;
  phone?: string | null; email?: string | null;
  balance?: number | null;
  price_level_id?: number | null;
  price_level?: { id: number; name: string } | null;
}

interface PaymentMode {
  id: number; name: string; code?: string | null; icon?: string | null;
}

interface PaymentEntry {
  payment_mode_id: string;
  amount: string;
  reference?: string;
  payment_date: string;
}

// نوع الخصم لكل سطر
type DiscountMode = "percent" | "fixed";

interface LineItem {
  id?: number;
  product_id:     string;
  description:    string;
  quantity:       number;
  unit_price_ht:  number;
  price_per_pack: number;
  // الخصم
  discount_mode:       DiscountMode;
  discount_percentage: number;
  discount_amount_fixed: number;
  // TVA
  tva_rate: number;
  // التعبئة والكثير
  packaging_id:  string;
  stock_lot_id:  string;
  lot_number_new?: string; // لمستندات الشراء
  // ملاحظة
  line_note?: string;
  // داخلي
  _product?: Product;
  _qty:      number;
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
  price_level_id: string; // الفئة السعرية من الزبون أو يدوياً
  lines:          LineItem[];
  payments:       PaymentEntry[];
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

function n(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const p = parseFloat(String(v));
  return isNaN(p) ? 0 : p;
}

function fmtDZD(v: number | string | null | undefined): string {
  const num = n(v);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(num);
}

function calcFiscalStamp(ttc: number): number {
  if (ttc < 30_000) return 0;
  return Math.min(Math.ceil(ttc * 0.01), 2_500);
}

function calcLineTotal(line: LineItem) {
  const basePrice = line._qty > 1 ? line.price_per_pack : line.unit_price_ht;
  const gross     = basePrice * line.quantity;
  let discountAmt = 0;
  if (line.discount_mode === "percent") {
    discountAmt = gross * (line.discount_percentage / 100);
  } else {
    discountAmt = line.discount_amount_fixed * line.quantity;
  }
  discountAmt  = Math.min(discountAmt, gross);
  const ht     = gross - discountAmt;
  const tva    = ht * (line.tva_rate / 100);
  const ttc    = ht + tva;
  const discPct = gross > 0 ? (discountAmt / gross) * 100 : 0;
  return { gross, discountAmt, discPct, ht, tva, ttc };
}

/** حساب سعر البيع من طريقة التسعير */
function resolvePrice(
  product: Product,
  method: "fixed" | "rate" | "margin",
  val: number | null | undefined
): number {
  const cost = n(product.purchase_price_ht ?? product.current_cost_price ?? 0);
  if (!val) return 0;
  if (method === "fixed")  return val;
  if (method === "rate")   return cost * (1 + val / 100);
  if (method === "margin") return cost + val;
  return cost;
}

/** الحصول على السعر حسب الفئة السعرية */
function getPriceByLevel(
  product: Product,
  priceLevelId: number | null,
  isPurchase: boolean
): number {
  // الشراء دائماً يأخذ سعر الشراء
  if (isPurchase) return n(product.purchase_price_ht ?? product.current_cost_price);

  // بدون فئة سعرية → السعر الافتراضي
  if (!priceLevelId) return n(product.default_selling_price_ht ?? product.purchase_price_ht);

  const priceEntry = (product.prices ?? []).find(
    p => p.price_level_id === priceLevelId && p.active
  );
  if (!priceEntry) return n(product.default_selling_price_ht ?? product.purchase_price_ht);

  const v = priceEntry.price ?? priceEntry.rate ?? priceEntry.margin ?? null;
  return resolvePrice(product, priceEntry.pricing_method, v);
}

/** الحصول على خصم الكميات */
function getQuantityDiscount(
  product: Product,
  qty: number,
  priceLevelId: number | null
): { percentage: number; fixed: number } {
  const discounts = (product.quantityDiscounts ?? []).filter(d => {
    if (!d.active) return false;
    if (priceLevelId && d.price_level_id !== priceLevelId) return false;
    if (qty < d.min_qty) return false;
    if (d.max_qty && qty > d.max_qty) return false;
    return true;
  });
  if (discounts.length === 0) return { percentage: 0, fixed: 0 };
  const d = discounts[discounts.length - 1]; // آخر نطاق مطابق
  return {
    percentage: d.discount_percentage ?? 0,
    fixed:      d.discount_amount ?? 0,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const s = {
  inp: (err?: boolean): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box" as const,
    padding: "7px 10px", borderRadius: "var(--r2)",
    border: `1px solid ${err ? "var(--red)" : "var(--b3)"}`,
    background: "var(--bg1)", color: "var(--t1)",
    fontSize: 13, fontFamily: "Tajawal, sans-serif",
    outline: "none", transition: "border-color .15s",
  }),
  cell: (highlight?: boolean): React.CSSProperties => ({
    width: "100%", padding: "5px 6px",
    borderRadius: "var(--r1)",
    border: `1px solid ${highlight ? "var(--em)" : "var(--b3)"}`,
    background: highlight ? "color-mix(in srgb, var(--em) 6%, var(--bg1))" : "var(--bg1)",
    color: "var(--t1)", fontSize: 12,
    fontFamily: "Tajawal, sans-serif",
    outline: "none", textAlign: "center" as const,
  }),
  label: {
    fontSize: 11, fontWeight: 700, color: "var(--t3)",
    display: "block", marginBottom: 4,
    textTransform: "uppercase" as const, letterSpacing: 0.4,
  } as React.CSSProperties,
};

// ════════════════════════════════════════════════════════════════════════════
// COMBOBOX — بحث احترافي للزبون/المورد والمنتج
// ════════════════════════════════════════════════════════════════════════════

interface ComboOption {
  id:    number;
  label: string;
  sub?:  string;
  badge?: string;
  badgeColor?: string;
}

interface ComboBoxProps {
  options:     ComboOption[];
  value:       string;
  onChange:    (id: string) => void;
  placeholder: string;
  disabled?:   boolean;
  error?:      boolean;
  maxH?:       number;
}

function ComboBox({ options, value, onChange, placeholder, disabled, error, maxH = 260 }: ComboBoxProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref    = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => String(o.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 80);
    const q = query.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q)
    ).slice(0, 80);
  }, [options, query]);

  // إغلاق عند النقر خارج
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const choose = (id: number) => {
    onChange(String(id));
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* زر الاختيار */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(v => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        style={{
          ...s.inp(error),
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          gap: 6, textAlign: "right",
        }}
      >
        <span style={{
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: selected ? "var(--t1)" : "var(--t4)",
        }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && !disabled && (
          <span
            onClick={e => { e.stopPropagation(); onChange(""); }}
            style={{ color: "var(--t4)", cursor: "pointer", flexShrink: 0, fontSize: 11, lineHeight: 1 }}
            title="مسح"
          >✕</span>
        )}
        <i className={`ti ti-chevron-${open ? "up" : "down"}`}
           style={{ fontSize: 11, color: "var(--t4)", flexShrink: 0 }} />
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          zIndex: 9999, background: "var(--bg2)",
          border: "1px solid var(--b2)", borderRadius: "var(--r2)",
          boxShadow: "0 8px 32px rgba(0,0,0,.22)",
          direction: "rtl", overflow: "hidden",
        }}>
          {/* حقل البحث */}
          <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid var(--b1)", background: "var(--bg3)" }}>
            <div style={{ position: "relative" }}>
              <i className="ti ti-search" style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                color: "var(--t4)", fontSize: 13, pointerEvents: "none",
              }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ابحث..."
                style={{
                  ...s.inp(), paddingRight: 28, fontSize: 12,
                  background: "var(--bg1)",
                }}
              />
            </div>
          </div>
          {/* النتائج */}
          <div style={{ maxHeight: maxH, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--t4)", fontSize: 12 }}>
                لا توجد نتائج
              </div>
            ) : filtered.map(o => (
              <div
                key={o.id}
                onClick={() => choose(o.id)}
                style={{
                  padding: "8px 12px", cursor: "pointer",
                  background: String(o.id) === value ? "var(--emb)" : "transparent",
                  borderBottom: "1px solid var(--b1)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8, transition: "background .1s",
                }}
                onMouseEnter={e => {
                  if (String(o.id) !== value)
                    (e.currentTarget as HTMLElement).style.background = "var(--bg3)";
                }}
                onMouseLeave={e => {
                  if (String(o.id) !== value)
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--t1)", fontWeight: String(o.id) === value ? 700 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.label}
                  </div>
                  {o.sub && (
                    <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 1 }}>{o.sub}</div>
                  )}
                </div>
                {o.badge && (
                  <span style={{
                    padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, flexShrink: 0,
                    background: o.badgeColor ?? "var(--bg3)", color: "var(--t3)",
                  }}>{o.badge}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PRODUCT SEARCH — بحث سريع للمنتج مع إظهار المخزون
// ════════════════════════════════════════════════════════════════════════════

interface ProductSearchProps {
  products:    Product[];
  value:       string;
  onChange:    (productId: string, product: Product | null) => void;
  disabled?:   boolean;
  error?:      boolean;
  isPurchase?: boolean;
}

function ProductSearch({ products, value, onChange, disabled, error, isPurchase }: ProductSearchProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref    = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = products.find(p => String(p.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return products.slice(0, 60);
    const q = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.ref ?? "").toLowerCase().includes(q) ||
      (p.barcode ?? "").toLowerCase().includes(q)
    ).slice(0, 60);
  }, [products, query]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const choose = (p: Product) => {
    onChange(String(p.id), p);
    setOpen(false);
    setQuery("");
  };

  // المخزون الإجمالي للمنتج
  const stockQty = (p: Product): number => {
    if (!p.manages_stock) return Infinity;
    if (p.stock_quantity != null) return n(p.stock_quantity);
    if (p.lots && p.lots.length > 0) {
      return p.lots.reduce((acc, l) => acc + l.remaining_quantity, 0);
    }
    return 0;
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(v => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        style={{
          ...s.cell(!!value && !error),
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          gap: 4, textAlign: "right",
          border: error ? "1px solid var(--red)" : undefined,
          maxWidth: "100%",
        }}
      >
        <span style={{
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: selected ? "var(--t1)" : "var(--t4)", textAlign: "right",
        }}>
          {selected ? selected.name : "— اختر منتجاً —"}
        </span>
        <i className={`ti ti-chevron-${open ? "up" : "down"}`}
           style={{ fontSize: 10, color: "var(--t4)", flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 3px)", left: 0,
          minWidth: 320, maxWidth: 400,
          zIndex: 9999, background: "var(--bg2)",
          border: "1px solid var(--b2)", borderRadius: "var(--r2)",
          boxShadow: "0 8px 32px rgba(0,0,0,.22)",
          direction: "rtl", overflow: "hidden",
        }}>
          <div style={{ padding: "6px 6px 5px", borderBottom: "1px solid var(--b1)", background: "var(--bg3)" }}>
            <div style={{ position: "relative" }}>
              <i className="ti ti-search" style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                color: "var(--t4)", fontSize: 12, pointerEvents: "none",
              }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="اسم / رمز / باركود..."
                style={{ ...s.inp(), paddingRight: 28, fontSize: 12, background: "var(--bg1)" }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--t4)", fontSize: 12 }}>لا توجد نتائج</div>
            ) : filtered.map(p => {
              const stock = stockQty(p);
              const outOfStock = p.manages_stock && stock <= 0 && !isPurchase;
              return (
                <div
                  key={p.id}
                  onClick={() => !outOfStock && choose(p)}
                  style={{
                    padding: "7px 10px", cursor: outOfStock ? "not-allowed" : "pointer",
                    background: String(p.id) === value ? "var(--emb)" : outOfStock ? "var(--redb)" : "transparent",
                    borderBottom: "1px solid var(--b1)",
                    opacity: outOfStock ? 0.6 : 1,
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => {
                    if (String(p.id) !== value && !outOfStock)
                      (e.currentTarget as HTMLElement).style.background = "var(--bg3)";
                  }}
                  onMouseLeave={e => {
                    if (String(p.id) !== value)
                      (e.currentTarget as HTMLElement).style.background =
                        outOfStock ? "var(--redb)" : "transparent";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: "var(--t1)", fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--t4)", marginTop: 2, display: "flex", gap: 6 }}>
                        {p.ref && <span>#{p.ref}</span>}
                        {p.barcode && <span>🔖{p.barcode}</span>}
                        {p.unit && <span>{p.unit.symbol}</span>}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "left" }}>
                      {p.manages_stock !== false && (
                        <span style={{
                          display: "block", fontSize: 10.5, fontWeight: 700, textAlign: "center",
                          color: stock > 0 ? "var(--green)" : "var(--red)",
                          background: stock > 0 ? "var(--greenb)" : "var(--redb)",
                          padding: "1px 7px", borderRadius: 99,
                        }}>
                          {stock === Infinity ? "∞" : stock} {p.unit?.symbol ?? ""}
                        </span>
                      )}
                      {!isPurchase && p.default_selling_price_ht != null && (
                        <span style={{ display: "block", fontSize: 10, color: "var(--t4)", marginTop: 2, textAlign: "center" }}>
                          {fmtDZD(p.default_selling_price_ht)} دج
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TOGGLE BUTTON
// ════════════════════════════════════════════════════════════════════════════

function Toggle({ checked, onChange, label, subLabel, disabled }:{
  checked: boolean; onChange: (v: boolean) => void;
  label: string; subLabel?: string; disabled?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "8px 12px", borderRadius: "var(--r2)",
        background: checked ? "var(--emb, color-mix(in srgb, var(--em) 10%, transparent))" : "var(--bg3)",
        border: `1px solid ${checked ? "var(--em)" : "var(--b2)"}`,
        transition: "all .18s", userSelect: "none" as const,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* مفتاح التبديل */}
      <div style={{
        width: 36, height: 20, borderRadius: 20, flexShrink: 0,
        background: checked ? "var(--em)" : "var(--b3)",
        position: "relative", transition: "background .18s",
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: "50%", background: "white",
          position: "absolute", top: 3,
          right: checked ? 3 : "auto",
          left: checked ? "auto" : 3,
          transition: "all .18s",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: checked ? "var(--em)" : "var(--t2)" }}>
          {label}
        </div>
        {subLabel && (
          <div style={{ fontSize: 10.5, color: "var(--t4)" }}>{subLabel}</div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COLUMN MANAGER
// ════════════════════════════════════════════════════════════════════════════

function ColumnManager({ visible, onChange }: {
  visible: Set<ColKey>;
  onChange: (c: Set<ColKey>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const toggle = (key: ColKey) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col?.fixed) return;
    const next = new Set(visible);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
    saveVisibleCols(next);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="إدارة الأعمدة"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: "var(--r2)",
          border: "1px solid var(--b2)", background: "var(--bg2)",
          color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 600,
        }}
      >
        <i className="ti ti-layout-columns" style={{ fontSize: 13 }} />
        الأعمدة
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          width: 220, background: "var(--bg2)",
          border: "1px solid var(--b2)", borderRadius: "var(--r2)",
          boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          zIndex: 9999, direction: "rtl", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px", fontSize: 10.5, fontWeight: 800, color: "var(--t4)",
            textTransform: "uppercase", borderBottom: "1px solid var(--b1)", background: "var(--bg3)" }}>
            أظهر / أخفِ الأعمدة
          </div>
          {ALL_COLUMNS.filter(c => !c.fixed).map(col => (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", cursor: "pointer",
                background: visible.has(col.key) ? "var(--emb)" : "transparent",
                borderBottom: "1px solid var(--b1)", transition: "background .1s",
              }}
              onMouseEnter={e => {
                if (!visible.has(col.key))
                  (e.currentTarget as HTMLElement).style.background = "var(--bg3)";
              }}
              onMouseLeave={e => {
                if (!visible.has(col.key))
                  (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <i className={`ti ti-${visible.has(col.key) ? "eye" : "eye-off"}`}
                 style={{ fontSize: 13, color: visible.has(col.key) ? "var(--em)" : "var(--t4)" }} />
              <span style={{ fontSize: 12.5, color: visible.has(col.key) ? "var(--t1)" : "var(--t3)" }}>
                {col.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION & LABEL
// ════════════════════════════════════════════════════════════════════════════

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={s.label}>
      {children}
      {required && <span style={{ color: "var(--red)", marginRight: 3 }}>*</span>}
    </label>
  );
}

function Section({ title, icon, badge, children, collapsible }: {
  title: string; icon: string; badge?: React.ReactNode;
  children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: open ? 12 : 0, paddingBottom: 8,
          borderBottom: "1px solid var(--b1)",
          cursor: collapsible ? "pointer" : "default",
        }}
        onClick={() => collapsible && setOpen(v => !v)}
      >
        <i className={`ti ${icon}`} style={{ color: "var(--em)", fontSize: 15 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--t2)",
          textTransform: "uppercase" as const, letterSpacing: 0.5, flex: 1 }}>
          {title}
        </span>
        {badge}
        {collapsible && (
          <i className={`ti ti-chevron-${open ? "up" : "down"}`}
             style={{ fontSize: 12, color: "var(--t4)" }} />
        )}
      </div>
      {open && children}
    </div>
  );
}

function TotalCard({ label, value, bg, color, labelColor, large, muted }: {
  label: string; value: string; bg?: string; color?: string;
  labelColor?: string; large?: boolean; muted?: boolean;
}) {
  return (
    <div style={{
      padding: "10px 12px", background: bg ?? "var(--bg2)",
      borderRadius: "var(--r2)", opacity: muted ? 0.55 : 1,
    }}>
      <div style={{ fontSize: 11, color: labelColor ?? "var(--t3)", marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: large ? 18 : 14, fontWeight: 700, color: color ?? "var(--t1)",
        fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right" as const,
      }}>
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
  open, documentType, existingDocument, onClose, onSaved,
}: CommercialDocumentModalProps) {
  const isEdit   = !!existingDocument;
  const qc       = useQueryClient();
  const slug     = useActiveSlug();
  const { selectedYear } = useFiscalYear() as { selectedYear?: { id: number; name: string } };

  const docCode    = documentType?.code ?? "";
  const isPurchase = PURCHASE_CODES.has(docCode);
  const needsParty = REQUIRES_PARTY.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir     = STOCK_IN_CODES.has(docCode) ? 1 : STOCK_OUT_CODES.has(docCode) ? -1 : 0;

  // ── أعمدة مرئية ──────────────────────────────────────────────────────────
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(loadVisibleCols);

  // ── Success banner ────────────────────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── API Errors ────────────────────────────────────────────────────────────
  const [apiErr,  setApiErr]  = useState("");
  const [lineErr, setLineErr] = useState("");
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  // ════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════════════════

  const { data: partiesRaw = [] } = useQuery({
    queryKey: [slug, "modal-parties", isPurchase],
    queryFn:  () =>
      apiGet<unknown>(isPurchase ? "/suppliers" : "/customers", {
        per_page: 1000,
        include: "priceLevel",
      }).then(extractList),
    enabled: open && needsParty && !!slug, staleTime: 5 * 60_000,
  });
  const parties = partiesRaw as Party[];

  const { data: productsRaw = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: [slug, "modal-products-v2"],
    queryFn:  () =>
      apiGet<unknown>("/products", {
        per_page: 2000,
        include: "unit,tva,packagings,prices,prices.priceLevel,quantityDiscounts,lots",
        active: 1,
      }).then(extractList),
    enabled: open && !!slug, staleTime: 5 * 60_000,
  });
  const products = productsRaw as Product[];

  const { data: warehousesRaw = [] } = useQuery({
    queryKey: [slug, "modal-warehouses"],
    queryFn:  () => apiGet<unknown>("/warehouses", { per_page: 100 }).then(extractList),
    enabled: open && !!slug, staleTime: 10 * 60_000,
  });
  const warehouses = warehousesRaw as Record<string, unknown>[];

  const { data: currenciesRaw = [] } = useQuery({
    queryKey: [slug, "modal-currencies"],
    queryFn:  () => apiGet<unknown>("/currencies", { per_page: 50 }).then(extractList),
    enabled: open && !!slug, staleTime: 30 * 60_000,
  });
  const currencies = currenciesRaw as Record<string, unknown>[];

  const { data: fiscalYearsRaw = [] } = useQuery({
    queryKey: [slug, "modal-fiscal-years"],
    queryFn:  () => apiGet<unknown>("/fiscal-years", {
      per_page: 20, "filter[is_closed]": 0,
    }).then(extractList),
    enabled: open && !!slug, staleTime: 5 * 60_000,
  });
  const fiscalYears = fiscalYearsRaw as Record<string, unknown>[];

  const { data: paymentModesRaw = [] } = useQuery({
    queryKey: [slug, "modal-payment-modes"],
    queryFn:  () => apiGet<unknown>("/payment-modes", { per_page: 50 }).then(extractList),
    enabled: open && !!slug, staleTime: 30 * 60_000,
  });
  const paymentModes = paymentModesRaw as PaymentMode[];

  const { data: priceLevelsRaw = [] } = useQuery({
    queryKey: [slug, "modal-price-levels"],
    queryFn:  () => apiGet<unknown>("/price-levels", { per_page: 100 }).then(extractList),
    enabled: open && !isPurchase && !!slug, staleTime: 30 * 60_000,
  });
  const priceLevels = priceLevelsRaw as Record<string, unknown>[];

  // ════════════════════════════════════════════════════════════════════════
  // DEFAULTS
  // ════════════════════════════════════════════════════════════════════════

  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default);
    return dw ? String(dw.id) : (warehouses[0] ? String((warehouses[0] as Record<string, unknown>).id) : "");
  }, [warehouses]);

  const baseCurrencyId = useMemo(() => {
    const base = currencies.find(c => c.is_base_currency);
    return base ? String(base.id) : (currencies[0] ? String((currencies[0] as Record<string, unknown>).id) : "");
  }, [currencies]);

  const selectedYearId = useMemo(
    () => (selectedYear?.id ? String(selectedYear.id) : ""),
    [selectedYear]
  );

  const defaultTvaRate = useMemo(() => {
    const p = products.find(pr => pr.tva?.is_default);
    return p?.tva?.rate ?? 19;
  }, [products]);

  // ════════════════════════════════════════════════════════════════════════
  // FORM STATE
  // ════════════════════════════════════════════════════════════════════════

  const [form, setForm] = useState<FormState>(() => buildDefault());

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
        apply_stamp:    n(String(doc.total_stamp ?? 0)) > 0,
        price_level_id: String(doc.price_level_id ?? ""),
        lines: ((doc.lines as Record<string, unknown>[]) ?? []).map(buildLineFromApi),
        payments: [],
      };
    }
    return {
      party_id: "", document_date: today(), due_date: "",
      notes: "", warehouse_id: "", fiscal_year_id: selectedYearId,
      currency_id: "", exchange_rate: "1",
      apply_stamp: false, price_level_id: "",
      lines: [], payments: [],
    };
  }

  function buildLineFromApi(l: Record<string, unknown>): LineItem {
    const packaging = l.packaging as Packaging | null ?? null;
    const qty = packaging ? Number(packaging.quantity) : 1;
    const unitPrice = n(String(l.unit_price_ht));
    const discPct = n(String(l.discount_percentage));
    return {
      id: l.id as number | undefined,
      product_id:   String(l.product_id ?? ""),
      description:  String(l.description ?? ""),
      quantity:     n(String(l.quantity)) || 1,
      unit_price_ht: unitPrice,
      price_per_pack: unitPrice * qty,
      discount_mode: "percent",
      discount_percentage: discPct,
      discount_amount_fixed: 0,
      tva_rate:    n(String(l.tva_rate)) || defaultTvaRate,
      packaging_id: packaging ? String(packaging.id) : "",
      stock_lot_id: l.stock_lot_id ? String(l.stock_lot_id) : "",
      lot_number_new: "",
      line_note: String(l.notes ?? ""),
      _product: l.product as Product | undefined,
      _qty: qty,
    };
  }

  function makeLine(): LineItem {
    return {
      product_id: "", description: "", quantity: 1,
      unit_price_ht: 0, price_per_pack: 0,
      discount_mode: "percent", discount_percentage: 0, discount_amount_fixed: 0,
      tva_rate: defaultTvaRate,
      packaging_id: "", stock_lot_id: "", lot_number_new: "",
      line_note: "", _qty: 1,
    };
  }

  // reset عند الفتح
  useEffect(() => {
    if (open) {
      setForm(buildDefault());
      setErrors({}); setApiErr(""); setLineErr(""); setSuccessMsg("");
    }
    return () => { if (successTimer.current) clearTimeout(successTimer.current); };
  }, [open, existingDocument?.id]);

  // قيم افتراضية بعد تحميل البيانات
  useEffect(() => {
    if (!isEdit && open) {
      setForm(f => ({
        ...f,
        warehouse_id:   f.warehouse_id   || defaultWarehouseId,
        currency_id:    f.currency_id    || baseCurrencyId,
        fiscal_year_id: f.fiscal_year_id || selectedYearId,
      }));
    }
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, isEdit, open]);

  const set = useCallback((k: keyof FormState, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  }, []);

  // عند تغيير الزبون → تحديث الفئة السعرية
  const handlePartyChange = useCallback((id: string) => {
    set("party_id", id);
    const party = parties.find(p => String(p.id) === id);
    if (party?.price_level_id) {
      set("price_level_id", String(party.price_level_id));
    }
  }, [parties, set]);

  // ════════════════════════════════════════════════════════════════════════
  // LINE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════

  const priceLevelId = useMemo(
    () => (form.price_level_id ? parseInt(form.price_level_id) : null),
    [form.price_level_id]
  );

  const updateLine = useCallback((idx: number, patch: Partial<LineItem>) => {
    setForm(f => {
      const lines = [...f.lines];
      const L     = { ...lines[idx], ...patch };

      // إذا تغير المنتج
      if (patch.product_id !== undefined && patch._product !== undefined) {
        const p = patch._product;
        if (p) {
          L.description = p.name;
          L.tva_rate    = p.tva?.rate ?? defaultTvaRate;

          // التعبئة الافتراضية
          const defPkg  = (p.packagings ?? []).find(pk => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : "";
          L._qty         = defPkg ? Number(defPkg.quantity) : 1;

          // السعر الصحيح
          const price = getPriceByLevel(p, priceLevelId, isPurchase);
          L.unit_price_ht  = price;
          L.price_per_pack = price * L._qty;

          // خصم الكميات الافتراضي
          const qdisc = getQuantityDiscount(p, L.quantity, priceLevelId);
          if (qdisc.percentage > 0) {
            L.discount_mode = "percent";
            L.discount_percentage = qdisc.percentage;
            L.discount_amount_fixed = 0;
          } else if (qdisc.fixed > 0) {
            L.discount_mode = "fixed";
            L.discount_amount_fixed = qdisc.fixed;
            L.discount_percentage = 0;
          }

          // الكثير: للبيع نأخذ أول متاح، للشراء لا نحدد (يُدخَل رقم جديد)
          if (!isPurchase && p.has_lots) {
            const firstLot = (p.lots ?? []).find(lt => lt.remaining_quantity > 0);
            L.stock_lot_id  = firstLot ? String(firstLot.id) : "";
          } else {
            L.stock_lot_id    = "";
            L.lot_number_new  = "";
          }
        } else {
          L._product = undefined; L.packaging_id = ""; L._qty = 1;
          L.unit_price_ht = 0; L.price_per_pack = 0; L.stock_lot_id = "";
        }
      }

      // تغيير التعبئة
      if (patch.packaging_id !== undefined && !patch._product) {
        const pkg = (L._product?.packagings ?? []).find(pk => String(pk.id) === patch.packaging_id);
        L._qty = pkg ? Number(pkg.quantity) : 1;
        L.price_per_pack = L.unit_price_ht * L._qty;
      }

      // تغيير سعر الوحدة
      if (patch.unit_price_ht !== undefined && !patch._product) {
        L.price_per_pack = patch.unit_price_ht * L._qty;
      }

      // تغيير سعر التعبئة
      if (patch.price_per_pack !== undefined && !patch._product) {
        L.unit_price_ht = L._qty > 0 ? (patch.price_per_pack / L._qty) : patch.price_per_pack;
      }

      // تغيير الكمية → إعادة حساب خصم الكميات
      if (patch.quantity !== undefined && L._product && !isPurchase) {
        const qdisc = getQuantityDiscount(L._product, patch.quantity, priceLevelId);
        if (qdisc.percentage > 0) {
          L.discount_mode = "percent";
          L.discount_percentage = qdisc.percentage;
          L.discount_amount_fixed = 0;
        } else if (qdisc.fixed > 0) {
          L.discount_mode = "fixed";
          L.discount_amount_fixed = qdisc.fixed;
          L.discount_percentage = 0;
        }
      }

      lines[idx] = L;
      return { ...f, lines };
    });
    setLineErr("");
  }, [defaultTvaRate, isPurchase, priceLevelId]);

  const addLine = useCallback(() => {
    setForm(f => ({ ...f, lines: [...f.lines, makeLine()] }));
    setLineErr("");
  }, [defaultTvaRate]);

  const removeLine = useCallback((idx: number) => {
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }, []);

  const duplicateLine = useCallback((idx: number) => {
    setForm(f => {
      const lines = [...f.lines];
      lines.splice(idx + 1, 0, { ...lines[idx], id: undefined });
      return { ...f, lines };
    });
  }, []);

  // ── الدفعات ──────────────────────────────────────────────────────────────
  const addPayment = useCallback(() => {
    setForm(f => ({
      ...f,
      payments: [...f.payments, {
        payment_mode_id: paymentModes[0] ? String(paymentModes[0].id) : "",
        amount: "", reference: "",
        payment_date: today(),
      }],
    }));
  }, [paymentModes]);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    setForm(f => {
      const payments = [...f.payments];
      payments[idx] = { ...payments[idx], ...patch };
      return { ...f, payments };
    });
  }, []);

  const removePayment = useCallback((idx: number) => {
    setForm(f => ({ ...f, payments: f.payments.filter((_, i) => i !== idx) }));
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // TOTALS
  // ════════════════════════════════════════════════════════════════════════

  const totals = useMemo(() => {
    let ht = 0, tva = 0, discount = 0, gross = 0;
    form.lines.forEach(l => {
      const t = calcLineTotal(l);
      gross    += t.gross;
      ht       += t.ht;
      tva      += t.tva;
      discount += t.discountAmt;
    });
    const ttc     = ht + tva;
    const stamp   = form.apply_stamp ? calcFiscalStamp(ttc) : 0;
    const netToPay = ttc + stamp;
    const totalPaid = form.payments.reduce((acc, p) => acc + n(p.amount), 0);
    return { gross, ht, tva, ttc, discount, stamp, netToPay, totalPaid, remaining: netToPay - totalPaid };
  }, [form.lines, form.apply_stamp, form.payments]);

  // ════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ════════════════════════════════════════════════════════════════════════

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (needsParty && !form.party_id) errs.party_id = isPurchase ? "المورد إلزامي" : "الزبون إلزامي";
    if (!form.document_date) errs.document_date = "التاريخ إلزامي";
    if (!form.warehouse_id)  errs.warehouse_id  = "المستودع إلزامي";
    if (!form.fiscal_year_id) errs.fiscal_year_id = "السنة المالية إلزامية";
    if (!form.currency_id)   errs.currency_id   = "العملة إلزامية";

    if (form.lines.length === 0) {
      setLineErr("يجب إضافة سطر واحد على الأقل");
      setErrors(errs); return false;
    }
    for (let i = 0; i < form.lines.length; i++) {
      const l = form.lines[i];
      if (!l.product_id) { setLineErr(`السطر ${i+1}: المنتج إلزامي`); setErrors(errs); return false; }
      if (l.quantity <= 0) { setLineErr(`السطر ${i+1}: الكمية يجب أن تكون > 0`); setErrors(errs); return false; }
    }
    setLineErr(""); setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase]);

  // ════════════════════════════════════════════════════════════════════════
  // SAVE
  // ════════════════════════════════════════════════════════════════════════

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
        // تحويل الخصم الثابت إلى نسبة للـ API
        lines: form.lines.map(l => {
          const { gross, discountAmt } = calcLineTotal(l);
          const discPct = gross > 0 ? (discountAmt / gross) * 100 : 0;
          return {
            ...(l.id ? { id: l.id } : {}),
            product_id:          parseInt(l.product_id),
            description:         l.description || null,
            quantity:            l.quantity,
            unit_price_ht:       l.unit_price_ht,
            tva_rate:            l.tva_rate,
            discount_percentage: Math.round(discPct * 10000) / 10000,
            ...(l.packaging_id  ? { packaging_id:  parseInt(l.packaging_id) }  : {}),
            ...(l.stock_lot_id  ? { stock_lot_id:  parseInt(l.stock_lot_id) }  : {}),
            ...(isPurchase && l.lot_number_new ? { lot_number: l.lot_number_new } : {}),
            notes: l.line_note || null,
          };
        }),
        // الدفعات
        ...(form.payments.length > 0 ? {
          payments: form.payments
            .filter(p => p.payment_mode_id && n(p.amount) > 0)
            .map(p => ({
              payment_mode_id: parseInt(p.payment_mode_id),
              amount:          n(p.amount),
              reference:       p.reference || null,
              payment_date:    p.payment_date,
            })),
        } : {}),
      };

      const url = isEdit ? `/documents/${(existingDocument as Record<string, unknown>).id}` : "/documents";
      return isEdit
        ? apiPut<Record<string, unknown>>(url, payload)
        : apiPost<Record<string, unknown>>(url, payload);
    },

    onSuccess: (savedDoc) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        if (affectsStock) qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
      }
      const docNum = String(
        (savedDoc as Record<string, unknown>)?.document_number
        ?? (savedDoc as Record<string, unknown>)?.data?.document_number
        ?? "—"
      );
      setSuccessMsg(isEdit ? `تم تحديث المستند ${docNum}` : `تم إنشاء المستند ${docNum} ✓`);
      successTimer.current = setTimeout(() => onSaved(), 2_000);
    },

    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const msgs = err?.errors && Object.keys(err.errors as object).length > 0
        ? Object.values(err.errors as Record<string, string[]>).flat().join(" | ")
        : String(err?.message ?? "فشل الحفظ");
      setApiErr(msgs);
    },
  });

  const handleSave = useCallback(() => {
    setApiErr("");
    if (validate()) saveMut.mutate();
  }, [validate, saveMut]);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════════════════════════════

  if (!open) return null;

  const isPending   = saveMut.isPending;
  const disableForm = isPending;

  const stockBadge = affectsStock
    ? stockDir > 0
      ? { bg: "var(--greenb)", color: "var(--green)", text: "▲ يزيد المخزون" }
      : { bg: "var(--redb)",   color: "var(--red)",   text: "▼ ينقص المخزون" }
    : null;

  // ComboBox options
  const partyOptions: ComboOption[] = parties.map(p => ({
    id: p.id, label: p.name,
    sub: [p.code && `#${p.code}`, p.phone].filter(Boolean).join(" · "),
    badge: p.price_level?.name,
    badgeColor: "var(--emb)",
  }));

  // ════════════════════════════════════════════════════════════════════════
  // JSX
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "16px", overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 1280, minWidth: 0,
          background: "var(--bg1)", borderRadius: "var(--r3)",
          boxShadow: "0 24px 80px rgba(0,0,0,.35)",
          display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div style={{
          padding: "12px 20px", borderBottom: "1px solid var(--b1)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--bg2)", borderRadius: "var(--r3) var(--r3) 0 0", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "var(--r2)", flexShrink: 0,
              background: isPurchase ? "color-mix(in srgb, var(--blue, #2563eb) 12%, transparent)" : "var(--greenb)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className={`ti ${isPurchase ? "ti-truck" : "ti-receipt"}`}
                 style={{ fontSize: 18, color: isPurchase ? "var(--blue, #2563eb)" : "var(--green)" }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t1)",
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {isEdit ? `تعديل ${documentType?.name}` : `${documentType?.name} جديد`}
                {isEdit && existingDocument?.document_number && (
                  <span style={{
                    padding: "2px 8px", borderRadius: "var(--r1)",
                    background: "var(--bg1)", border: "1px solid var(--b2)",
                    fontSize: 12, fontWeight: 700, color: "var(--em)",
                  }}>{String(existingDocument.document_number)}</span>
                )}
                {stockBadge && (
                  <span style={{
                    padding: "2px 8px", borderRadius: "var(--r1)", fontSize: 11, fontWeight: 700,
                    background: stockBadge.bg, color: stockBadge.color,
                  }}>{stockBadge.text}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--t4)", marginTop: 1 }}>
                {documentType?.name} — {docCode}
                {!isEdit && <span style={{ marginRight: 8 }}>· رقم الوثيقة يُولَّد تلقائياً</span>}
              </div>
            </div>
          </div>

          <button onClick={onClose} disabled={isPending} style={{
            width: 28, height: 28, borderRadius: 8, border: "1px solid var(--b2)",
            background: "var(--bg1)", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: isPending ? "not-allowed" : "pointer",
            color: "var(--t3)", flexShrink: 0,
          }}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>

        {/* ══ BODY ════════════════════════════════════════════════════════ */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>

          {/* Success */}
          {successMsg && (
            <div style={{
              padding: "10px 16px", marginBottom: 16, borderRadius: "var(--r2)",
              background: "var(--greenb)", border: "1px solid var(--green)",
              color: "var(--green)", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <i className="ti ti-check-circle" style={{ fontSize: 18 }} />
              {successMsg}
            </div>
          )}

          {/* API Error */}
          {apiErr && (
            <div style={{
              padding: "9px 14px", marginBottom: 14, borderRadius: "var(--r2)",
              background: "var(--redb)", border: "1px solid var(--red)",
              color: "var(--red)", fontSize: 12.5,
              display: "flex", gap: 7, alignItems: "flex-start",
            }}>
              <i className="ti ti-alert-circle" style={{ marginTop: 1 }} />
              <span>{apiErr}</span>
            </div>
          )}

          {/* ── SECTION 1: معلومات المستند ─────────────────────────── */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
            }}>
              {/* الزبون / المورد */}
              {needsParty && (
                <div style={{ gridColumn: "span 2" }}>
                  <Label required>{isPurchase ? "المورد" : "الزبون"}</Label>
                  <ComboBox
                    options={partyOptions}
                    value={form.party_id}
                    onChange={handlePartyChange}
                    placeholder={`— ابحث عن ${isPurchase ? "مورد" : "زبون"} —`}
                    disabled={disableForm}
                    error={!!errors.party_id}
                  />
                  {errors.party_id && (
                    <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.party_id}</div>
                  )}
                </div>
              )}

              {/* تاريخ المستند */}
              <div>
                <Label required>تاريخ المستند</Label>
                <input type="date" style={s.inp(!!errors.document_date)}
                  value={form.document_date} disabled={disableForm}
                  onChange={e => set("document_date", e.target.value)} />
                {errors.document_date && <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.document_date}</div>}
              </div>

              {/* تاريخ الاستحقاق */}
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <input type="date" style={s.inp()} value={form.due_date}
                  min={form.document_date} disabled={disableForm}
                  onChange={e => set("due_date", e.target.value)} />
              </div>

              {/* المستودع */}
              <div>
                <Label required>المستودع</Label>
                <select style={{ ...s.inp(!!errors.warehouse_id), cursor: "pointer" }}
                  value={form.warehouse_id} disabled={disableForm}
                  onChange={e => set("warehouse_id", e.target.value)}>
                  <option value="">— اختر —</option>
                  {warehouses.map(w => (
                    <option key={String(w.id)} value={String(w.id)}>
                      {String(w.name)}{w.is_default ? " ★" : ""}
                    </option>
                  ))}
                </select>
                {errors.warehouse_id && <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.warehouse_id}</div>}
              </div>

              {/* السنة المالية */}
              <div>
                <Label required>السنة المالية</Label>
                <select style={{ ...s.inp(!!errors.fiscal_year_id), cursor: "pointer" }}
                  value={form.fiscal_year_id} disabled={disableForm}
                  onChange={e => set("fiscal_year_id", e.target.value)}>
                  <option value="">— اختر —</option>
                  {fiscalYears.map(fy => (
                    <option key={String(fy.id)} value={String(fy.id)}>
                      {String(fy.name)}{fy.is_current ? " ★" : ""}{fy.is_closed ? " (مقفلة)" : ""}
                    </option>
                  ))}
                </select>
                {errors.fiscal_year_id && <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.fiscal_year_id}</div>}
              </div>

              {/* العملة */}
              <div>
                <Label required>العملة</Label>
                <select style={{ ...s.inp(!!errors.currency_id), cursor: "pointer" }}
                  value={form.currency_id} disabled={disableForm}
                  onChange={e => set("currency_id", e.target.value)}>
                  <option value="">— اختر —</option>
                  {currencies.map(c => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.code)} — {String(c.name)}{c.is_base_currency ? " ★" : ""}
                    </option>
                  ))}
                </select>
                {errors.currency_id && <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.currency_id}</div>}
              </div>

              {/* الفئة السعرية (بيع فقط) */}
              {!isPurchase && priceLevels.length > 0 && (
                <div>
                  <Label>الفئة السعرية</Label>
                  <select style={{ ...s.inp(), cursor: "pointer" }}
                    value={form.price_level_id} disabled={disableForm}
                    onChange={e => set("price_level_id", e.target.value)}>
                    <option value="">الافتراضي</option>
                    {priceLevels.map(pl => (
                      <option key={String(pl.id)} value={String(pl.id)}>{String(pl.name)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* سعر الصرف */}
              <div>
                <Label>سعر الصرف</Label>
                <input type="number" step="0.0001" min="0" style={s.inp()}
                  value={form.exchange_rate} disabled={disableForm}
                  onChange={e => set("exchange_rate", e.target.value)} />
              </div>
            </div>

            {/* ملاحظات */}
            <div style={{ marginTop: 12 }}>
              <Label>ملاحظات</Label>
              <textarea style={{ ...s.inp(), resize: "vertical" }} rows={2}
                value={form.notes} placeholder="ملاحظات اختيارية..."
                onChange={e => set("notes", e.target.value)} disabled={disableForm} />
            </div>
          </Section>

          {/* ── SECTION 2: أسطر المستند ─────────────────────────────── */}
          <Section
            title="أسطر المستند"
            icon="ti-list-details"
            badge={
              <>
                {form.lines.length > 0 && (
                  <span style={{
                    padding: "1px 7px", borderRadius: 99,
                    background: "var(--em)", color: "white",
                    fontSize: 11, fontWeight: 700,
                  }}>{form.lines.length}</span>
                )}
                <div style={{ marginRight: "auto" }}>
                  <ColumnManager visible={visibleCols} onChange={setVisibleCols} />
                </div>
              </>
            }
          >
            {/* تحذير المخزون */}
            {affectsStock && (
              <div style={{
                padding: "7px 12px", marginBottom: 10, borderRadius: "var(--r2)",
                background: stockDir > 0 ? "var(--greenb)" : "var(--redb)",
                color: stockDir > 0 ? "var(--green)" : "var(--red)",
                fontSize: 12, display: "flex", gap: 7, alignItems: "center",
              }}>
                <i className={`ti ${stockDir > 0 ? "ti-box-seam" : "ti-box-seam-off"}`} />
                {stockDir > 0
                  ? "هذا المستند سيُضيف الكميات إلى المخزون عند الحفظ"
                  : "هذا المستند سيخصم الكميات من المخزون عند الحفظ"}
              </div>
            )}

            {lineErr && (
              <div style={{
                padding: "7px 12px", marginBottom: 8, borderRadius: "var(--r2)",
                background: "var(--redb)", color: "var(--red)",
                fontSize: 12, display: "flex", gap: 6, alignItems: "center",
              }}>
                <i className="ti ti-alert-circle" /> {lineErr}
              </div>
            )}

            {isLoadingProducts ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--t4)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }} />
                جاري تحميل المنتجات...
              </div>
            ) : products.length === 0 ? (
              <div style={{
                padding: "10px 14px", borderRadius: "var(--r2)",
                background: "var(--goldb)", color: "var(--gold)", fontSize: 12.5, marginBottom: 10,
              }}>
                <i className="ti ti-alert-triangle" /> لا توجد منتجات نشطة.
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "var(--r2)", border: "1px solid var(--b1)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, direction: "rtl" }}>
                  <thead>
                    <tr style={{ background: "var(--bg2)" }}>
                      {ALL_COLUMNS.filter(c => visibleCols.has(c.key)).map(col => (
                        <th key={col.key} style={{
                          padding: "7px 5px", textAlign: "center",
                          fontWeight: 700, color: "var(--t3)", fontSize: 10.5,
                          letterSpacing: 0.3, width: col.w, whiteSpace: "nowrap",
                          borderBottom: "1px solid var(--b2)",
                        }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {form.lines.map((line, idx) => {
                      const { gross, discountAmt, discPct, ht, tva: lineTva, ttc } = calcLineTotal(line);
                      const prod     = line._product;
                      const packagings = prod?.packagings ?? [];
                      const lots = prod?.has_lots
                        ? (prod?.lots ?? []).filter(lt => lt.remaining_quantity > 0)
                        : [];
                      // الكمية المتاحة في الكثير المختار
                      const selectedLot = lots.find(lt => String(lt.id) === line.stock_lot_id);

                      return (
                        <tr key={idx} style={{
                          borderBottom: "1px solid var(--b1)",
                          background: idx % 2 === 0 ? "var(--bg1)" : "var(--bg2, rgba(0,0,0,.015))",
                        }}>

                          {/* # */}
                          {visibleCols.has("idx") && (
                            <td style={{ textAlign: "center", padding: "5px 4px", color: "var(--t4)", fontSize: 11, fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                          )}

                          {/* المنتج */}
                          {visibleCols.has("product") && (
                            <td style={{ padding: "4px 5px", minWidth: 200 }}>
                              <ProductSearch
                                products={products}
                                value={line.product_id}
                                onChange={(id, p) => updateLine(idx, { product_id: id, _product: p ?? undefined })}
                                disabled={disableForm}
                                error={!line.product_id}
                                isPurchase={isPurchase}
                              />
                              {/* عرض المخزون المتاح بعد تحديد المنتج */}
                              {prod && prod.manages_stock !== false && (
                                <div style={{ fontSize: 10, marginTop: 2, textAlign: "center",
                                  color: "var(--t4)" }}>
                                  {selectedLot
                                    ? `الكثير: ${selectedLot.remaining_quantity} ${prod.unit?.symbol ?? ""}`
                                    : prod.stock_quantity != null
                                      ? `متاح: ${prod.stock_quantity} ${prod.unit?.symbol ?? ""}`
                                      : ""}
                                </div>
                              )}
                            </td>
                          )}

                          {/* التعبئة */}
                          {visibleCols.has("packaging") && (
                            <td style={{ padding: "4px 4px" }}>
                              {packagings.length > 0 ? (
                                <select
                                  value={line.packaging_id}
                                  onChange={e => updateLine(idx, { packaging_id: e.target.value })}
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
                                <span style={{ display: "block", textAlign: "center", color: "var(--t4)", fontSize: 11 }}>—</span>
                              )}
                            </td>
                          )}

                          {/* الكثير/Lot */}
                          {visibleCols.has("lot") && (
                            <td style={{ padding: "4px 4px" }}>
                              {isPurchase ? (
                                /* شراء: حقل نص لرقم الحصة الجديد */
                                prod ? (
                                  <input
                                    type="text"
                                    placeholder="رقم الحصة (اختياري)"
                                    value={line.lot_number_new ?? ""}
                                    onChange={e => updateLine(idx, { lot_number_new: e.target.value })}
                                    style={{ ...s.cell(), textAlign: "right" as const }}
                                    disabled={disableForm}
                                    title="رقم الحصة الجديدة — يُولَّد تلقائياً إذا تُرك فارغاً"
                                  />
                                ) : (
                                  <span style={{ display: "block", textAlign: "center", color: "var(--t4)", fontSize: 11 }}>—</span>
                                )
                              ) : (
                                /* بيع: اختيار من الكثيرات المتاحة */
                                prod?.has_lots ? (
                                  lots.length > 0 ? (
                                    <select
                                      value={line.stock_lot_id}
                                      onChange={e => updateLine(idx, { stock_lot_id: e.target.value })}
                                      style={{ ...s.cell(), cursor: "pointer" }}
                                      disabled={disableForm}
                                    >
                                      <option value="">— اختر —</option>
                                      {lots.map(lt => (
                                        <option key={lt.id} value={String(lt.id)}>
                                          {lt.lot_number} · {lt.remaining_quantity} {prod.unit?.symbol ?? ""}
                                          {lt.expiration_date ? ` · ${lt.expiration_date}` : ""}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span style={{ display: "block", textAlign: "center", color: "var(--red)", fontSize: 10 }}>
                                      لا مخزون
                                    </span>
                                  )
                                ) : (
                                  <span style={{ display: "block", textAlign: "center", color: "var(--t4)", fontSize: 11 }}>—</span>
                                )
                              )}
                            </td>
                          )}

                          {/* الكمية */}
                          {visibleCols.has("quantity") && (
                            <td style={{ padding: "4px 4px" }}>
                              <input
                                type="number" min="0.001" step="1"
                                value={line.quantity}
                                onChange={e => updateLine(idx, { quantity: parseFloat(e.target.value) || 1 })}
                                style={{
                                  ...s.cell(),
                                  border: line.quantity <= 0 ? "1px solid var(--red)" : "1px solid var(--b3)",
                                }}
                                disabled={disableForm}
                              />
                            </td>
                          )}

                          {/* الوحدة */}
                          {visibleCols.has("unit") && (
                            <td style={{ padding: "4px 3px", textAlign: "center" as const, color: "var(--t4)", fontSize: 11 }}>
                              {prod?.unit?.symbol ?? "—"}
                            </td>
                          )}

                          {/* سعر الوحدة HT */}
                          {visibleCols.has("unit_price") && (
                            <td style={{ padding: "4px 4px" }}>
                              <input
                                type="number" min="0" step="0.01"
                                value={line.unit_price_ht}
                                onChange={e => updateLine(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
                                style={s.cell()}
                                disabled={disableForm}
                              />
                            </td>
                          )}

                          {/* سعر التعبئة */}
                          {visibleCols.has("pack_price") && (
                            <td style={{ padding: "4px 4px" }}>
                              {line._qty > 1 ? (
                                <input
                                  type="number" min="0" step="0.01"
                                  value={line.price_per_pack}
                                  onChange={e => updateLine(idx, { price_per_pack: parseFloat(e.target.value) || 0 })}
                                  style={{
                                    ...s.cell(),
                                    background: "var(--goldb)", borderColor: "var(--gold)",
                                  }}
                                  disabled={disableForm}
                                  title={`${line._qty} وحدة × ${fmtDZD(line.unit_price_ht)}`}
                                />
                              ) : (
                                <span style={{ display: "block", textAlign: "center", color: "var(--t4)", fontSize: 11 }}>—</span>
                              )}
                            </td>
                          )}

                          {/* السعر الأصلي */}
                          {visibleCols.has("orig_price") && (
                            <td style={{ padding: "4px 4px", textAlign: "center" as const,
                              fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>
                              {fmtDZD(gross)}
                            </td>
                          )}

                          {/* الخصم — نسبة أو مبلغ */}
                          {visibleCols.has("discount") && (
                            <td style={{ padding: "4px 4px" }}>
                              <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                                {/* toggle نوع الخصم */}
                                <button
                                  type="button"
                                  onClick={() => updateLine(idx, {
                                    discount_mode: line.discount_mode === "percent" ? "fixed" : "percent",
                                    discount_percentage: 0,
                                    discount_amount_fixed: 0,
                                  })}
                                  disabled={disableForm}
                                  title={line.discount_mode === "percent" ? "تبديل إلى مبلغ ثابت" : "تبديل إلى نسبة"}
                                  style={{
                                    width: 24, height: 24, borderRadius: 4, border: "1px solid var(--b3)",
                                    background: "var(--bg2)", cursor: "pointer", flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 10, color: "var(--em)", fontWeight: 700,
                                  }}
                                >
                                  {line.discount_mode === "percent" ? "%" : "="}
                                </button>
                                <input
                                  type="number" min="0"
                                  max={line.discount_mode === "percent" ? 100 : undefined}
                                  step="0.01"
                                  value={line.discount_mode === "percent"
                                    ? line.discount_percentage
                                    : line.discount_amount_fixed}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (line.discount_mode === "percent") {
                                      updateLine(idx, { discount_percentage: Math.min(100, val) });
                                    } else {
                                      updateLine(idx, { discount_amount_fixed: val });
                                    }
                                  }}
                                  style={{ ...s.cell(), flex: 1 }}
                                  disabled={disableForm}
                                  title={line.discount_mode === "percent"
                                    ? `الخصم: ${fmtDZD(discountAmt)} دج`
                                    : `${discPct.toFixed(1)}%`}
                                />
                              </div>
                              {discountAmt > 0 && (
                                <div style={{ fontSize: 9.5, color: "var(--red)", textAlign: "center", marginTop: 1 }}>
                                  −{fmtDZD(discountAmt)}
                                </div>
                              )}
                            </td>
                          )}

                          {/* السعر بعد الخصم HT */}
                          {visibleCols.has("price_after") && (
                            <td style={{ padding: "4px 4px", textAlign: "center" as const,
                              fontSize: 11, color: "var(--t2)", fontVariantNumeric: "tabular-nums" }}>
                              {fmtDZD(ht)}
                            </td>
                          )}

                          {/* TVA % */}
                          {visibleCols.has("tva") && (
                            <td style={{ padding: "4px 4px" }}>
                              <input
                                type="number" min="0" max="100" step="0.01"
                                value={line.tva_rate}
                                onChange={e => updateLine(idx, { tva_rate: parseFloat(e.target.value) || 0 })}
                                style={s.cell()}
                                disabled={disableForm}
                              />
                            </td>
                          )}

                          {/* إجمالي HT */}
                          {visibleCols.has("total_ht") && (
                            <td style={{ padding: "4px 5px", textAlign: "center" as const,
                              fontWeight: 600, color: "var(--t2)",
                              fontVariantNumeric: "tabular-nums", fontSize: 11 }}>
                              {fmtDZD(ht)}
                            </td>
                          )}

                          {/* إجمالي TTC */}
                          {visibleCols.has("total_ttc") && (
                            <td style={{ padding: "4px 5px", textAlign: "center" as const,
                              fontWeight: 700, color: "var(--em)",
                              fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                              {fmtDZD(ttc)}
                            </td>
                          )}

                          {/* ملاحظة السطر */}
                          {visibleCols.has("line_note") && (
                            <td style={{ padding: "4px 4px" }}>
                              <input
                                type="text"
                                value={line.line_note ?? ""}
                                onChange={e => updateLine(idx, { line_note: e.target.value })}
                                style={{ ...s.cell(), textAlign: "right" as const }}
                                placeholder="ملاحظة..."
                                disabled={disableForm}
                              />
                            </td>
                          )}

                          {/* إجراءات */}
                          {visibleCols.has("actions") && (
                            <td style={{ padding: "4px 3px", textAlign: "center" as const }}>
                              <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                                <button
                                  onClick={() => duplicateLine(idx)}
                                  disabled={isPending}
                                  title="نسخ السطر"
                                  style={{
                                    width: 22, height: 22, borderRadius: 4,
                                    border: "1px solid var(--b3)", background: "var(--bg1)",
                                    color: "var(--t3)", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}
                                >
                                  <i className="ti ti-copy" style={{ fontSize: 10 }} />
                                </button>
                                <button
                                  onClick={() => removeLine(idx)}
                                  disabled={isPending}
                                  title="حذف السطر"
                                  style={{
                                    width: 22, height: 22, borderRadius: 4,
                                    border: "1px solid var(--b3)", background: "var(--bg1)",
                                    color: "var(--red)", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}
                                >
                                  <i className="ti ti-trash" style={{ fontSize: 10 }} />
                                </button>
                              </div>
                            </td>
                          )}
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
                width: "100%", padding: "9px 14px", marginTop: 8,
                borderRadius: "var(--r2)", border: "1px dashed var(--em)",
                background: "transparent", color: "var(--em)",
                cursor: disableForm ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600, opacity: disableForm ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <i className="ti ti-plus" />
              إضافة سطر منتج
            </button>
          </Section>

          {/* ── SECTION 3: طريقة الدفع ──────────────────────────────── */}
          <Section
            title="طريقة الدفع"
            icon="ti-credit-card"
            collapsible
            badge={
              form.payments.length > 0 ? (
                <span style={{
                  padding: "1px 7px", borderRadius: 99,
                  background: "var(--green)", color: "white",
                  fontSize: 11, fontWeight: 700,
                }}>{form.payments.length}</span>
              ) : undefined
            }
          >
            {form.payments.length === 0 ? (
              <div style={{
                padding: "10px 14px", borderRadius: "var(--r2)",
                background: "var(--bg3)", color: "var(--t4)", fontSize: 12.5,
                textAlign: "center" as const, marginBottom: 10,
              }}>
                لا توجد دفعات — سيُحفظ المستند بحالة "غير مدفوع"
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {form.payments.map((pmt, idx) => (
                  <div key={idx} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr auto",
                    gap: 8, alignItems: "end",
                  }}>
                    <div>
                      {idx === 0 && <Label>طريقة الدفع</Label>}
                      <select
                        style={{ ...s.inp(), cursor: "pointer" }}
                        value={pmt.payment_mode_id}
                        onChange={e => updatePayment(idx, { payment_mode_id: e.target.value })}
                        disabled={disableForm}
                      >
                        <option value="">— اختر —</option>
                        {paymentModes.map(pm => (
                          <option key={pm.id} value={String(pm.id)}>{pm.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      {idx === 0 && <Label>المبلغ (دج)</Label>}
                      <input
                        type="number" min="0" step="0.01"
                        placeholder="0.00"
                        value={pmt.amount}
                        onChange={e => updatePayment(idx, { amount: e.target.value })}
                        style={s.inp()}
                        disabled={disableForm}
                      />
                    </div>
                    <div>
                      {idx === 0 && <Label>مرجع / ملاحظة</Label>}
                      <input
                        type="text" placeholder="رقم الشيك، التحويل..."
                        value={pmt.reference ?? ""}
                        onChange={e => updatePayment(idx, { reference: e.target.value })}
                        style={s.inp()}
                        disabled={disableForm}
                      />
                    </div>
                    <div>
                      {idx === 0 && <div style={{ height: 19 }} />}
                      <button
                        onClick={() => removePayment(idx)}
                        disabled={isPending}
                        style={{
                          width: 34, height: 34, borderRadius: "var(--r2)",
                          border: "1px solid var(--b3)", background: "var(--bg1)",
                          color: "var(--red)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 13 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={addPayment}
              disabled={disableForm || paymentModes.length === 0}
              style={{
                padding: "7px 14px", borderRadius: "var(--r2)",
                border: "1px dashed var(--green)", background: "transparent",
                color: "var(--green)", cursor: "pointer",
                fontSize: 12.5, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
                opacity: paymentModes.length === 0 ? 0.4 : 1,
              }}
            >
              <i className="ti ti-plus" />
              إضافة دفعة
            </button>
          </Section>

          {/* ── SECTION 4: الإجماليات ────────────────────────────────── */}
          <Section title="الإجماليات" icon="ti-calculator">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              <TotalCard label="إجمالي HT"      value={`${fmtDZD(totals.ht)} دج`} />
              <TotalCard label="الخصم الإجمالي" value={`${fmtDZD(totals.discount)} دج`}
                color="var(--red)" muted={totals.discount === 0} />
              <TotalCard label="TVA"             value={`${fmtDZD(totals.tva)} دج`} />
              <TotalCard label="إجمالي TTC"      value={`${fmtDZD(totals.ttc)} دج`}
                bg="var(--bg3)" color="var(--t1)" />
              {totals.stamp > 0 && (
                <TotalCard label="الطابع الجبائي" value={`${fmtDZD(totals.stamp)} دج`}
                  bg="var(--goldb)" color="var(--gold)" labelColor="var(--gold)" />
              )}
              <TotalCard label="المبلغ المستحق" value={`${fmtDZD(totals.netToPay)} دج`}
                bg="var(--em)" color="white" labelColor="rgba(255,255,255,.75)" large />
              {form.payments.length > 0 && (
                <>
                  <TotalCard label="المدفوع"    value={`${fmtDZD(totals.totalPaid)} دج`}
                    color="var(--green)" bg="var(--greenb)" labelColor="var(--green)" />
                  <TotalCard label="المتبقي"    value={`${fmtDZD(totals.remaining)} دج`}
                    color={totals.remaining > 0 ? "var(--red)" : "var(--green)"}
                    bg={totals.remaining > 0 ? "var(--redb)" : "var(--greenb)"}
                    labelColor={totals.remaining > 0 ? "var(--red)" : "var(--green)"} />
                </>
              )}
            </div>

            {/* الطابع الجبائي — toggle احترافي */}
            <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Toggle
                checked={form.apply_stamp}
                onChange={v => set("apply_stamp", v)}
                label="الطابع الجبائي"
                subLabel="1% من TTC — بحد أقصى 2,500 دج"
                disabled={disableForm}
              />
            </div>
          </Section>
        </div>

        {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid var(--b1)",
          background: "var(--bg2)", display: "flex", gap: 8,
          justifyContent: "space-between", alignItems: "center",
          borderRadius: "0 0 var(--r3) var(--r3)",
        }}>
          <div style={{ fontSize: 12, color: "var(--t4)" }}>
            {form.lines.length > 0 && (
              <>
                <span>{form.lines.length} سطر</span>
                <span style={{ margin: "0 6px" }}>·</span>
                <span style={{ fontWeight: 700, color: "var(--green)" }}>
                  {fmtDZD(totals.netToPay)} دج
                </span>
                {form.payments.length > 0 && totals.remaining > 0 && (
                  <>
                    <span style={{ margin: "0 6px" }}>·</span>
                    <span style={{ color: "var(--red)" }}>
                      متبقي {fmtDZD(totals.remaining)} دج
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose} disabled={isPending}
              style={{
                padding: "8px 18px", borderRadius: "var(--r2)",
                border: "1px solid var(--b2)", background: "var(--bg1)",
                color: "var(--t2)", cursor: isPending ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600,
              }}
            >
              إلغاء
            </button>

            <button
              onClick={handleSave} disabled={isPending || !!successMsg}
              style={{
                padding: "8px 24px", borderRadius: "var(--r2)", border: "none",
                background: successMsg ? "var(--green)" : "var(--em)",
                color: "white",
                cursor: isPending || !!successMsg ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 7,
                opacity: isPending ? 0.7 : 1,
                transition: "background .2s",
              }}
            >
              {isPending ? (
                <><i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }} /> جاري الحفظ...</>
              ) : successMsg ? (
                <><i className="ti ti-check" /> تم الحفظ</>
              ) : (
                <><i className={`ti ${isEdit ? "ti-device-floppy" : "ti-plus"}`} />
                  {isEdit ? "تحديث المستند" : "حفظ المستند"}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}