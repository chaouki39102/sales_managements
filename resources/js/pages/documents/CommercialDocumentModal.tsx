// ════════════════════════════════════════════════════════════════════════════
// CommercialDocumentModal.tsx — النسخة النهائية
// يتوافق مع: جدول product_packagings (code, label, quantity, is_default)
//             route: /documents (وليس /commercial-documents)
//             apiGet من core/client (مع slug تلقائي)
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api/core/client";
import { useActiveSlug } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import type { DocumentType } from "@/types";

// ── Fiscal stamp (LF 2024) ─────────────────────────────────────────────────
function calcFiscalStamp(ttc: number): number {
    if (ttc < 30_000) return 0;
    return Math.min(Math.ceil(ttc * 0.01), 2_500);
}

// ── Types ──────────────────────────────────────────────────────────────────

/** يتوافق مع جدول product_packagings */
interface Packaging {
    id: number;
    code: string;        // "UN" / "FD" / "PLT"
    label: string;       // "لتر" / "فاردو" / "باليطة"
    quantity: number;    // عدد الوحدات الأساسية في التعبئة
    is_default: boolean;
    barcode?: string | null;
    display_order: number;
}

interface Product {
    id: number;
    name: string;
    ref?: string | null;
    purchase_price_ht?: string | number | null;
    tva?: { rate: string } | null;
    unit?: { symbol: string; name: string } | null;
    packagings?: Packaging[];
}

/**
 * LineItem — سطر المستند
 *
 * قواعد الحساب:
 *   _qty = quantity في التعبئة (1 إذا لا تعبئة)
 *   price_per_pack = unit_price_ht × _qty
 *   إجمالي_السطر_HT = quantity × price_per_pack  (شامل الكميات)
 *                    = quantity × unit_price_ht   (إذا لا تعبئة)
 *
 * عند تحرير سعر الوحدة   → price_per_pack = unit_price_ht × _qty
 * عند تحرير سعر التعبئة  → unit_price_ht  = price_per_pack / _qty
 */
interface LineItem {
    id?: number;
    product_id: string;
    description: string;
    quantity: number;
    unit_price_ht: number;
    price_per_pack: number;
    discount_percentage: number;
    tva_rate: number;
    packaging_id: string;          // "" = بدون تعبئة
    // metadata — لا تُرسَل للـ API
    _productName?: string;
    _unitSymbol?: string;
    _packagings: Packaging[];
    _qty: number;                  // quantity التعبئة (1 إذا لا تعبئة)
}

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

// ── Style helpers ──────────────────────────────────────────────────────────
const s = {
    inp: (err?: boolean): React.CSSProperties => ({
        width: "100%", boxSizing: "border-box",
        padding: "7px 10px", borderRadius: "var(--r2)",
        border: `1px solid ${err ? "var(--red)" : "var(--b3)"}`,
        background: "var(--bg1)", color: "var(--t1)",
        fontSize: 13, fontFamily: "Tajawal, sans-serif", outline: "none",
    }),
    cell: (): React.CSSProperties => ({
        width: "100%", padding: "5px 7px",
        borderRadius: "var(--r1)",
        border: "1px solid var(--b3)",
        background: "var(--bg1)", color: "var(--t1)",
        fontSize: 12, fontFamily: "Tajawal, sans-serif",
        outline: "none", textAlign: "center" as const,
    }),
    cellSel: (): React.CSSProperties => ({
        width: "100%", padding: "5px 7px",
        borderRadius: "var(--r1)",
        border: "1px solid var(--b3)",
        background: "var(--bg1)", color: "var(--t1)",
        fontSize: 12, fontFamily: "Tajawal, sans-serif",
        outline: "none", cursor: "pointer",
    }),
    cellPack: (): React.CSSProperties => ({
        width: "100%", padding: "5px 7px",
        borderRadius: "var(--r1)",
        border: "1px solid var(--em)",
        background: "color-mix(in srgb, var(--em) 5%, var(--bg1))",
        color: "var(--t1)",
        fontSize: 12, fontFamily: "Tajawal, sans-serif",
        outline: "none", textAlign: "center" as const,
    }),
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label style={{
            fontSize: 11, fontWeight: 700, color: "var(--t3)",
            display: "block", marginBottom: 4,
            textTransform: "uppercase", letterSpacing: 0.4,
        }}>
            {children}
            {required && <span style={{ color: "var(--red)", marginRight: 3 }}>*</span>}
        </label>
    );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--b1)",
            }}>
                <i className={`ti ${icon}`} style={{ color: "var(--em)", fontSize: 15 }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--t2)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function extractList(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (data.data && Array.isArray(data.data.data)) return data.data.data;
    return [];
}

function today() { return new Date().toISOString().split("T")[0]; }

function emptyLine(defaultTva = 19): LineItem {
    return {
        product_id: "", description: "",
        quantity: 1, unit_price_ht: 0, price_per_pack: 0,
        discount_percentage: 0, tva_rate: defaultTva,
        packaging_id: "", _packagings: [], _qty: 1,
    };
}

// ── calcLineTotal ──────────────────────────────────────────────────────────
function calcLineTotal(line: LineItem) {
    const base = line._qty > 1 ? line.price_per_pack : line.unit_price_ht;
    const gross = base * line.quantity;
    const disc = gross * (line.discount_percentage / 100);
    const net = gross - disc;
    const ttc = net + net * (line.tva_rate / 100);
    return { gross, disc, net, ttc };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════
interface Props {
    open: boolean;
    documentType: DocumentType | null;
    existingDocument?: any;
    onClose: () => void;
    onSaved: () => void;
}

export default function CommercialDocumentModal({
    open, documentType, existingDocument, onClose, onSaved,
}: Props) {
    const isEdit = !!existingDocument;
    const qc = useQueryClient();
    const slug = useActiveSlug();
    const { selectedYear } = useFiscalYear() as any;
    const isPurch = documentType?.document_base_operation_id === 2;
    const needsParty = documentType?.requires_party !== false;

    // ── Queries ───────────────────────────────────────────────────────────
    const { data: parties = [] } = useQuery({
        queryKey: [slug, "parties-select", isPurch],
        queryFn: () => apiGet<any>(isPurch ? "/suppliers" : "/customers", { per_page: 500 }).then(extractList),
        enabled: open && needsParty && !!slug,
        staleTime: 60_000,
    });

    const {
        data: products = [],
        isLoading: isLoadingProducts,
        error: productsError,
        refetch: refetchProducts,
    } = useQuery({
        queryKey: [slug, "products-select"],
        queryFn: () => apiGet<any>("/products", { per_page: 500, include: "unit,tva,packagings" }).then(extractList),
        enabled: open && !!slug,
        staleTime: 60_000,
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: [slug, "warehouses-select"],
        queryFn: () => apiGet<any>("/warehouses", { per_page: 100 }).then(extractList),
        enabled: open && !!slug, staleTime: 120_000,
    });

    const { data: currencies = [] } = useQuery({
        queryKey: [slug, "currencies-select"],
        queryFn: () => apiGet<any>("/currencies", { per_page: 50 }).then(extractList),
        enabled: open && !!slug, staleTime: 300_000,
    });

    const { data: fiscalYears = [] } = useQuery({
        queryKey: [slug, "fiscal-years-select"],
        queryFn: () => apiGet<any>("/fiscal-years", { per_page: 20, "filter[is_closed]": 0 }).then(extractList),
        enabled: open && !!slug, staleTime: 60_000,
    });

    const { data: tvaRates = [] } = useQuery({
        queryKey: [slug, "tvas-select"],
        queryFn: () => apiGet<any>("/tvas", { per_page: 20 }).then(extractList),
        enabled: open && !!slug, staleTime: 300_000,
    });

    // ── Derived defaults ──────────────────────────────────────────────────
    const baseCurrencyId = useMemo(() => {
        const base = (currencies as any[]).find(c => c.is_base_currency) ?? currencies[0];
        return base ? String(base.id) : "";
    }, [currencies]);

    const defaultWhId = useMemo(() =>
        (warehouses as any[])[0] ? String((warehouses as any[])[0].id) : ""
    , [warehouses]);

    const selectedYearId = useMemo(() =>
        selectedYear?.id ? String(selectedYear.id) : ""
    , [selectedYear]);

    const defaultTva = useMemo(() =>
        (tvaRates as any[]).find(t => t.is_default)?.rate ?? 19
    , [tvaRates]);

    // ── Form ──────────────────────────────────────────────────────────────
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
                lines: (existingDocument.lines ?? []).map((l: any) => {
                    const pkg: Packaging | null = l.packaging ?? null;
                    const qty = pkg ? Number(pkg.quantity) : 1;
                    const unitPrice = parseFloat(l.unit_price_ht) || 0;
                    return {
                        id: l.id,
                        product_id: String(l.product_id ?? ""),
                        description: l.description ?? "",
                        quantity: parseFloat(l.quantity) || 1,
                        unit_price_ht: unitPrice,
                        price_per_pack: unitPrice * qty,
                        discount_percentage: parseFloat(l.discount_percentage) || 0,
                        tva_rate: parseFloat(l.tva_rate) || 19,
                        packaging_id: pkg ? String(pkg.id) : "",
                        _qty: qty,
                        _productName: l.product?.name,
                        _unitSymbol: l.product?.unit?.symbol,
                        _packagings: l.product?.packagings ?? [],
                    } as LineItem;
                }),
            };
        }
        return {
            party_id: "", document_date: today(), due_date: "", notes: "",
            warehouse_id: "", fiscal_year_id: selectedYearId,
            currency_id: "", exchange_rate: "1",
            apply_stamp: false, lines: [],
        };
    }

    // تعبئة الافتراضيات بعد تحميل البيانات (للإنشاء فقط)
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

    // إعادة تعيين عند الفتح
    useEffect(() => {
        if (open) {
            setForm(buildDefault());
            setErrors({});
            setApiErr("");
            setLineErr("");
        }
    }, [open, existingDocument?.id]);

    const set = useCallback((k: keyof FormState, v: any) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(prev => ({ ...prev, [k as string]: undefined as any }));
    }, []);

    // ── updateLine — المنطق الكامل ────────────────────────────────────────
    const updateLine = useCallback((
        idx: number,
        field: keyof LineItem | "price_per_pack",
        value: any,
    ) => {
        setForm(f => {
            const lines = [...f.lines];
            const L = { ...lines[idx] };

            if (field === "product_id") {
                // ── اختيار منتج ──────────────────────────────────────────
                L.product_id = String(value);
                const p = (products as Product[]).find(pr => String(pr.id) === String(value));
                if (p) {
                    L._productName   = p.name;
                    L.description    = p.name;
                    L._unitSymbol    = p.unit?.symbol ?? "";
                    L._packagings    = p.packagings ?? [];
                    // اختر التعبئة الافتراضية تلقائياً إن وجدت
                    const defPkg = L._packagings.find(pk => pk.is_default);
                    L.packaging_id   = defPkg ? String(defPkg.id) : "";
                    L._qty           = defPkg ? Number(defPkg.quantity) : 1;
                    // السعر المبدئي = سعر الشراء (المستخدم يعدله)
                    const basePrice  = parseFloat(String(p.purchase_price_ht ?? 0));
                    L.unit_price_ht  = basePrice;
                    L.price_per_pack = basePrice * L._qty;
                    // TVA من المنتج
                    if (p.tva?.rate) L.tva_rate = parseFloat(p.tva.rate);
                } else {
                    L._productName = undefined;
                    L._unitSymbol  = undefined;
                    L._packagings  = [];
                    L.packaging_id = "";
                    L._qty         = 1;
                    L.unit_price_ht  = 0;
                    L.price_per_pack = 0;
                }

            } else if (field === "packaging_id") {
                // ── تغيير التعبئة ─────────────────────────────────────────
                L.packaging_id = String(value);
                const pkg = (L._packagings).find(pk => String(pk.id) === String(value));
                L._qty = pkg ? Number(pkg.quantity) : 1;
                // أعد حساب سعر التعبئة بناءً على سعر الوحدة الحالي
                L.price_per_pack = L.unit_price_ht * L._qty;

            } else if (field === "unit_price_ht") {
                // ── تغيير سعر الوحدة → يُحدَّث سعر التعبئة ──────────────
                const v = parseFloat(String(value)) || 0;
                L.unit_price_ht  = v;
                L.price_per_pack = v * L._qty;

            } else if (field === "price_per_pack") {
                // ── تغيير سعر التعبئة → يُحدَّث سعر الوحدة ──────────────
                const v = parseFloat(String(value)) || 0;
                L.price_per_pack = v;
                L.unit_price_ht  = L._qty > 0 ? v / L._qty : v;

            } else {
                (L as any)[field] = value;
            }

            lines[idx] = L;
            return { ...f, lines };
        });
    }, [products]);

    const addLine = useCallback(() => {
        setForm(f => ({ ...f, lines: [...f.lines, emptyLine(defaultTva)] }));
        setLineErr("");
    }, [defaultTva]);

    const removeLine = useCallback((idx: number) => {
        setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
    }, []);

    // ── Totals ────────────────────────────────────────────────────────────
    const totals = useMemo(() => {
        let ht = 0, tva = 0, discount = 0;
        form.lines.forEach(l => {
            const { net, disc } = calcLineTotal(l);
            ht += net;
            tva += net * (l.tva_rate / 100);
            discount += disc;
        });
        const ttc = ht + tva;
        const stamp = form.apply_stamp ? calcFiscalStamp(ttc) : 0;
        return { ht, tva, ttc, discount, stamp, netToPay: ttc + stamp };
    }, [form.lines, form.apply_stamp]);

    // ── Validate ──────────────────────────────────────────────────────────
    const validate = useCallback((): boolean => {
        const errs: Record<string, string> = {};
        if (needsParty && !form.party_id) errs.party_id = "هذا الحقل إلزامي";
        if (!form.document_date) errs.document_date = "هذا الحقل إلزامي";
        if (!form.warehouse_id) errs.warehouse_id = "اختر مستودعاً";
        if (!form.fiscal_year_id) errs.fiscal_year_id = "اختر السنة المالية";
        if (!form.currency_id) errs.currency_id = "اختر العملة";
        if (form.lines.length === 0) { setLineErr("يجب إضافة سطر واحد على الأقل"); return false; }
        for (let i = 0; i < form.lines.length; i++) {
            if (!form.lines[i].product_id) { setLineErr(`السطر ${i + 1}: اختر منتجاً`); return false; }
            if (form.lines[i].quantity <= 0) { setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون أكبر من صفر`); return false; }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, [form, needsParty]);

    // ── Save ──────────────────────────────────────────────────────────────
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
            const errs = e?.errors;
            const msg = errs
                ? Object.values(errs).flat().join(" | ")
                : (e?.message ?? "فشل الحفظ");
            setApiErr(String(msg));
        },
    });

    const handleSave = useCallback(() => {
        setApiErr("");
        if (validate()) saveMut.mutate();
    }, [validate, saveMut]);

    if (!open) return null;
    const isPending = saveMut.isPending;
    const disableForm = isPending || isLoadingProducts;
    const hasProductsError = !!productsError;

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 500,
                background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "flex-start", justifyContent: "center",
                padding: "20px 16px", overflowY: "auto",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: "100%", maxWidth: 1060,
                    background: "var(--bg1)", borderRadius: "var(--r3)",
                    boxShadow: "0 24px 64px rgba(0,0,0,.25)",
                    display: "flex", flexDirection: "column",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: "16px 20px", borderBottom: "1px solid var(--b1)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "var(--bg2)", borderRadius: "var(--r3) var(--r3) 0 0",
                }}>
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
                    <button onClick={onClose} disabled={isPending} style={{
                        width: 30, height: 30, borderRadius: 8,
                        border: "1px solid var(--b2)", background: "var(--bg1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: isPending ? "not-allowed" : "pointer", color: "var(--t3)",
                    }}>
                        <i className="ti ti-x" style={{ fontSize: 14 }} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>

                    {/* API Error */}
                    {apiErr && (
                        <div style={{
                            padding: "10px 14px", marginBottom: 16, borderRadius: "var(--r2)",
                            background: "var(--redb)", border: "1px solid var(--redbo)",
                            color: "var(--red)", fontSize: 13, display: "flex", gap: 8, alignItems: "center",
                        }}>
                            <i className="ti ti-alert-circle" /> {apiErr}
                        </div>
                    )}

                    {/* ══ Section 1: معلومات المستند ═══════════════════════ */}
                    <Section title="معلومات المستند" icon="ti-file-description">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>

                            {needsParty && (
                                <div style={{ gridColumn: "span 2" }}>
                                    <Label required>{isPurch ? "المورد" : "الزبون"}</Label>
                                    <select value={form.party_id} onChange={e => set("party_id", e.target.value)}
                                        style={{ ...s.inp(!!errors.party_id), cursor: "pointer" }} disabled={disableForm}>
                                        <option value="">— اختر {isPurch ? "مورداً" : "زبوناً"} —</option>
                                        {(parties as any[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    {errors.party_id && <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.party_id}</div>}
                                </div>
                            )}

                            <div>
                                <Label required>تاريخ المستند</Label>
                                <input type="date" style={s.inp(!!errors.document_date)}
                                    value={form.document_date} onChange={e => set("document_date", e.target.value)} disabled={disableForm} />
                            </div>
                            <div>
                                <Label>تاريخ الاستحقاق</Label>
                                <input type="date" style={s.inp()}
                                    value={form.due_date} onChange={e => set("due_date", e.target.value)} disabled={disableForm} />
                            </div>
                            <div>
                                <Label required>المستودع</Label>
                                <select style={{ ...s.inp(!!errors.warehouse_id), cursor: "pointer" }}
                                    value={form.warehouse_id} onChange={e => set("warehouse_id", e.target.value)} disabled={disableForm}>
                                    <option value="">— اختر —</option>
                                    {(warehouses as any[]).map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
                                </select>
                                {errors.warehouse_id && <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.warehouse_id}</div>}
                            </div>
                            <div>
                                <Label required>السنة المالية</Label>
                                <select style={{ ...s.inp(!!errors.fiscal_year_id), cursor: "pointer" }}
                                    value={form.fiscal_year_id} onChange={e => set("fiscal_year_id", e.target.value)} disabled={disableForm}>
                                    <option value="">— اختر —</option>
                                    {(fiscalYears as any[]).map(fy => (
                                        <option key={fy.id} value={String(fy.id)}>
                                            {fy.name}{fy.is_current ? " ★" : ""}{fy.is_closed ? " (مقفلة)" : ""}
                                        </option>
                                    ))}
                                </select>
                                {errors.fiscal_year_id && <div style={{ color: "var(--red)", fontSize: 11, marginTop: 3 }}>{errors.fiscal_year_id}</div>}
                            </div>
                            <div>
                                <Label required>العملة</Label>
                                <select style={{ ...s.inp(!!errors.currency_id), cursor: "pointer" }}
                                    value={form.currency_id} onChange={e => set("currency_id", e.target.value)} disabled={disableForm}>
                                    <option value="">— اختر —</option>
                                    {(currencies as any[]).map(c => <option key={c.id} value={String(c.id)}>{c.code} — {c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>سعر الصرف</Label>
                                <input type="number" step="0.0001" min="0" style={s.inp()}
                                    value={form.exchange_rate} onChange={e => set("exchange_rate", e.target.value)} disabled={disableForm} />
                            </div>
                        </div>
                        <div style={{ marginTop: 14 }}>
                            <Label>ملاحظات</Label>
                            <textarea style={{ ...s.inp(), resize: "vertical" }} rows={2}
                                value={form.notes} placeholder="ملاحظات اختيارية..."
                                onChange={e => set("notes", e.target.value)} disabled={disableForm} />
                        </div>
                    </Section>

                    {/* ══ Section 2: أسطر المستند ══════════════════════════ */}
                    <Section title="أسطر المستند" icon="ti-list-details">

                        {lineErr && (
                            <div style={{
                                padding: "8px 12px", marginBottom: 10, borderRadius: "var(--r2)",
                                background: "var(--redb)", color: "var(--red)", fontSize: 12.5,
                                display: "flex", gap: 6, alignItems: "center",
                            }}>
                                <i className="ti ti-alert-circle" /> {lineErr}
                            </div>
                        )}

                        {isLoadingProducts && (
                            <div style={{ textAlign: "center", padding: 20, color: "var(--t4)" }}>
                                <i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }} /> جاري تحميل المنتجات...
                            </div>
                        )}
                        {hasProductsError && (
                            <div style={{ padding: "10px 14px", marginBottom: 10, borderRadius: "var(--r2)", background: "var(--redb)", color: "var(--red)", fontSize: 12 }}>
                                <i className="ti ti-alert-circle" /> فشل تحميل قائمة المنتجات.
                                <button onClick={() => refetchProducts()} style={{ background: "none", border: "none", color: "var(--red)", textDecoration: "underline", cursor: "pointer", marginRight: 8 }}>
                                    إعادة المحاولة
                                </button>
                            </div>
                        )}
                        {!isLoadingProducts && !hasProductsError && (products as any[]).length === 0 && (
                            <div style={{ padding: "10px 14px", marginBottom: 10, borderRadius: "var(--r2)", background: "var(--goldb)", color: "var(--gold)", fontSize: 12 }}>
                                <i className="ti ti-info-circle" /> لا توجد منتجات مسجلة. يرجى إضافة منتجات أولاً.
                            </div>
                        )}

                        {/* ── Table ──────────────────────────────────────── */}
                        <div style={{ overflowX: "auto", marginBottom: 10, opacity: isLoadingProducts ? 0.6 : 1 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid var(--b2)", background: "var(--bg2)" }}>
                                        {["#", "المنتج", "التعبئة", "الكمية", "سعر الوحدة HT", "سعر التعبئة", "خصم %", "TVA %", "إجمالي TTC", ""].map((h, i) => (
                                            <th key={i} style={{
                                                padding: "8px 6px", fontSize: 11, fontWeight: 700,
                                                color: "var(--t3)", textAlign: "right",
                                                whiteSpace: "nowrap",
                                                width: [32, "auto", 120, 75, 110, 110, 70, 70, 100, 32][i] as any,
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.lines.map((line, idx) => {
                                        const { ttc } = calcLineTotal(line);
                                        const hasPkgs = line._packagings.length > 0;
                                        const selPkg = line._packagings.find(pk => String(pk.id) === line.packaging_id);
                                        const hasActivePkg = !!line.packaging_id && line._qty > 1;

                                        return (
                                            <tr key={idx} style={{
                                                borderBottom: "1px solid var(--b1)",
                                                background: idx % 2 ? "color-mix(in srgb,var(--b1) 25%,transparent)" : "transparent",
                                            }}>
                                                {/* # */}
                                                <td style={{ textAlign: "center", fontSize: 11, color: "var(--t4)", padding: "5px 4px" }}>
                                                    {idx + 1}
                                                </td>

                                                {/* المنتج */}
                                                <td style={{ padding: "4px 4px" }}>
                                                    <select value={line.product_id}
                                                        onChange={e => updateLine(idx, "product_id", e.target.value)}
                                                        disabled={isLoadingProducts || (products as any[]).length === 0 || isPending}
                                                        style={s.cellSel()}>
                                                        <option value="">— اختر منتجاً —</option>
                                                        {(products as Product[]).map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name}{p.ref ? ` (${p.ref})` : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {line._unitSymbol && (
                                                        <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 2, paddingRight: 2 }}>
                                                            الوحدة: {line._unitSymbol}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* التعبئة */}
                                                <td style={{ padding: "4px 4px" }}>
                                                    {hasPkgs ? (
                                                        <>
                                                            <select value={line.packaging_id}
                                                                onChange={e => updateLine(idx, "packaging_id", e.target.value)}
                                                                disabled={isPending} style={s.cellSel()}>
                                                                <option value="">— وحدة مفردة —</option>
                                                                {line._packagings.map(pk => (
                                                                    <option key={pk.id} value={pk.id}>
                                                                        {pk.label} ({pk.quantity} {line._unitSymbol ?? "و"})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {selPkg && (
                                                                <div style={{ fontSize: 10, color: "var(--em)", marginTop: 2, paddingRight: 2 }}>
                                                                    {selPkg.quantity} {line._unitSymbol}/تعبئة
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div style={{ fontSize: 11, color: "var(--t4)", textAlign: "center" }}>
                                                            {line.product_id ? "—" : ""}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* الكمية */}
                                                <td style={{ padding: "4px 4px" }}>
                                                    <input type="number" min="0" step="0.001"
                                                        value={line.quantity}
                                                        onChange={e => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                                                        style={s.cell()} disabled={isPending} />
                                                    {hasActivePkg && (
                                                        <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 2, textAlign: "center" }}>
                                                            = {(line.quantity * line._qty).toLocaleString("fr-DZ")} {line._unitSymbol}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* سعر الوحدة HT */}
                                                <td style={{ padding: "4px 4px" }}>
                                                    <input type="number" min="0" step="0.01"
                                                        value={line.unit_price_ht}
                                                        onChange={e => updateLine(idx, "unit_price_ht", e.target.value)}
                                                        style={s.cell()} disabled={isPending} />
                                                    {line._unitSymbol && (
                                                        <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 2, textAlign: "center" }}>
                                                            دج/{line._unitSymbol}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* سعر التعبئة — فعّال فقط إذا كانت هناك تعبئة */}
                                                <td style={{ padding: "4px 4px" }}>
                                                    {hasActivePkg ? (
                                                        <>
                                                            <input type="number" min="0" step="0.01"
                                                                value={line.price_per_pack}
                                                                onChange={e => updateLine(idx, "price_per_pack", e.target.value)}
                                                                style={s.cellPack()} disabled={isPending} />
                                                            {selPkg && (
                                                                <div style={{ fontSize: 10, color: "var(--em)", marginTop: 2, textAlign: "center" }}>
                                                                    دج/{selPkg.label}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div style={{ textAlign: "center", color: "var(--t4)", fontSize: 11 }}>—</div>
                                                    )}
                                                </td>

                                                {/* خصم % */}
                                                <td style={{ padding: "4px 4px" }}>
                                                    <input type="number" min="0" max="100" step="0.01"
                                                        value={line.discount_percentage}
                                                        onChange={e => updateLine(idx, "discount_percentage", parseFloat(e.target.value) || 0)}
                                                        style={s.cell()} disabled={isPending} />
                                                </td>

                                                {/* TVA % */}
                                                <td style={{ padding: "4px 4px" }}>
                                                    <select value={line.tva_rate}
                                                        onChange={e => updateLine(idx, "tva_rate", parseFloat(e.target.value))}
                                                        style={s.cellSel()} disabled={isPending}>
                                                        {(tvaRates as any[]).length > 0
                                                            ? (tvaRates as any[]).map(t => <option key={t.id} value={t.rate}>{t.rate}%</option>)
                                                            : [0, 9, 19].map(r => <option key={r} value={r}>{r}%</option>)
                                                        }
                                                    </select>
                                                </td>

                                                {/* إجمالي TTC */}
                                                <td style={{
                                                    fontWeight: 700, color: "var(--em)",
                                                    direction: "ltr", textAlign: "right",
                                                    fontSize: 13, padding: "4px 8px", whiteSpace: "nowrap",
                                                }}>
                                                    {ttc.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>

                                                {/* حذف */}
                                                <td style={{ padding: "4px 4px", textAlign: "center" }}>
                                                    <button onClick={() => removeLine(idx)} disabled={isPending} style={{
                                                        width: 26, height: 26, borderRadius: 6, cursor: "pointer",
                                                        border: "1px solid color-mix(in srgb,var(--red) 30%,transparent)",
                                                        background: "color-mix(in srgb,var(--red) 8%,transparent)",
                                                        color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center",
                                                    }}>
                                                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* زر إضافة سطر */}
                        <button onClick={addLine}
                            disabled={isLoadingProducts || isPending || ((products as any[]).length === 0 && !hasProductsError)}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "7px 14px", borderRadius: "var(--r2)",
                                border: "1px dashed var(--b3)", background: "transparent",
                                color: "var(--em)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                                fontFamily: "Tajawal, sans-serif", transition: "all .15s",
                                opacity: (isLoadingProducts || isPending || (products as any[]).length === 0) ? 0.5 : 1,
                            }}>
                            <i className="ti ti-plus" style={{ fontSize: 14 }} />
                            إضافة سطر
                        </button>
                    </Section>

                    {/* ══ Section 3: المجاميع ═══════════════════════════════ */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>

                        {/* Stamp toggle */}
                        <div style={{
                            padding: "12px 16px", borderRadius: "var(--r2)",
                            background: "var(--bg2)", border: "1px solid var(--b1)",
                            display: "flex", alignItems: "center", gap: 12, opacity: disableForm ? 0.6 : 1,
                        }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>الطابع الجبائي</div>
                                <div style={{ fontSize: 11, color: "var(--t4)" }}>
                                    {totals.ttc >= 30_000 ? "1% من TTC — سقف 2500 دج" : "يُطبَّق للمبالغ ≥ 30,000 دج"}
                                </div>
                            </div>
                            <div onClick={() => !disableForm && set("apply_stamp", !form.apply_stamp)} style={{
                                width: 44, height: 24, borderRadius: 12,
                                cursor: disableForm ? "not-allowed" : "pointer",
                                background: form.apply_stamp ? "var(--em)" : "var(--b2)",
                                position: "relative", transition: "background .2s", flexShrink: 0,
                            }}>
                                <div style={{
                                    width: 18, height: 18, borderRadius: "50%", background: "#fff",
                                    position: "absolute", top: 3,
                                    left: form.apply_stamp ? "calc(100% - 21px)" : 3,
                                    transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                                }} />
                            </div>
                        </div>

                        {/* Totals */}
                        <div style={{ minWidth: 300, display: "flex", flexDirection: "column", gap: 7 }}>
                            {([
                                { label: "إجمالي HT", value: totals.ht, color: "var(--t2)" },
                                { label: "TVA", value: totals.tva, color: "var(--t3)" },
                                totals.discount > 0 ? { label: "إجمالي الخصم", value: -totals.discount, color: "var(--red)" } : null,
                                totals.stamp > 0 ? { label: "الطابع الجبائي", value: totals.stamp, color: "var(--orange)" } : null,
                            ] as any[]).filter(Boolean).map((row: any) => (
                                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                    <span style={{ color: "var(--t3)" }}>{row.label}</span>
                                    <span style={{ color: row.color, fontWeight: 600, direction: "ltr" }}>
                                        {Math.abs(row.value).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج
                                    </span>
                                </div>
                            ))}
                            <div style={{
                                display: "flex", justifyContent: "space-between",
                                paddingTop: 10, marginTop: 4, borderTop: "2px solid var(--b2)",
                                fontSize: 16, fontWeight: 800,
                            }}>
                                <span style={{ color: "var(--t1)" }}>الإجمالي TTC</span>
                                <span style={{ color: "var(--em)", direction: "ltr" }}>
                                    {totals.netToPay.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: "14px 20px", borderTop: "1px solid var(--b1)",
                    display: "flex", justifyContent: "flex-end", gap: 8,
                    background: "var(--bg2)", borderRadius: "0 0 var(--r3) var(--r3)",
                }}>
                    <button onClick={onClose} disabled={isPending} style={{
                        padding: "8px 20px", borderRadius: "var(--r2)",
                        border: "1px solid var(--b3)", background: "var(--bg1)",
                        color: "var(--t2)", fontSize: 13, fontWeight: 700,
                        cursor: isPending ? "not-allowed" : "pointer", fontFamily: "Tajawal, sans-serif",
                    }}>
                        إلغاء
                    </button>
                    <button onClick={handleSave} disabled={isPending} style={{
                        padding: "8px 24px", borderRadius: "var(--r2)", border: "none",
                        background: isPending ? "var(--b2)" : "var(--em)",
                        color: "#fff", fontSize: 13, fontWeight: 700,
                        cursor: isPending ? "not-allowed" : "pointer",
                        fontFamily: "Tajawal, sans-serif",
                        display: "flex", alignItems: "center", gap: 7, transition: "all .15s",
                    }}>
                        {isPending
                            ? <i className="ti ti-loader-2" style={{ animation: "spin .8s linear infinite" }} />
                            : <i className={`ti ${isEdit ? "ti-check" : "ti-plus"}`} />
                        }
                        {isPending ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء المستند"}
                    </button>
                </div>
            </div>
        </div>
    );
}