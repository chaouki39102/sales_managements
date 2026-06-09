// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentsPage.tsx  —  v10.3
//
// ✅ جديد في v10.3:
//   • useColumnStatePersistence — مفتاح localStorage واحد لكل typeCode يحفظ:
//     columnOrder + hiddenColumns + activeFilters (pinnedColumns جاهز للإضافة)
//   • زر إعادة ضبط Layout يظهر عند وجود snapshot محفوظ
//   • إزالة المفاتيح المتفرقة: cdp-column-order-* و cdp-cols-*
//
// ✅ محفوظ من v10.2:
//   • smartFilterPatterns={ERP_FILTER_PATTERNS} مُفعَّل
//   • DataTableErrorBoundary يلف الجدول
// ════════════════════════════════════════════════════════════════════════════

import React, {
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
} from "react";
import { useParams } from "react-router-dom";
import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import { DataTable, DataTableErrorBoundary } from "@/components/ui/DataTable";
import type {
    Column,
    MultiSortState,
    ConditionalFormat,
    ContextMenuItem,
    ContextMenuContext,
} from "@/components/ui/DataTable";
import { useColumnVisibility, useColumnStatePersistence } from "@/components/ui/DataTable";
import CommercialDocumentModal from "./CommercialDocumentModal";
import QuickSaleModal from "./QuickSaleModal";
import type { DocumentType, CommercialDocument } from "@/lib/api/core/types";

// أنماط SmartFilter الخاصة بالمشروع (مفصولة عن library)
import { ERP_FILTER_PATTERNS } from "@/lib/datatable-patterns";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const SALE_CODES     = new Set(["FV", "BL", "DEV", "BCC", "AV"]);
const PURCHASE_CODES = new Set(["FA", "BR", "DDP", "BCF", "AA"]);

const STATUS_CFG = {
    draft:          { label: "مسودة",          color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
    pending:        { label: "قيد الانتظار",   color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
    validated:      { label: "معتمد",          color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
    partially_paid: { label: "مدفوع جزئياً",   color: "#7c3aed", bg: "#f5f3ff", dot: "#8b5cf6" },
    paid:           { label: "مدفوع",          color: "#059669", bg: "#ecfdf5", dot: "#10b981" },
    overdue:        { label: "متأخر",          color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
    cancelled:      { label: "ملغي",           color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    returned:       { label: "مرتجع",          color: "#7c3aed", bg: "#f5f3ff", dot: "#a78bfa" },
} as const;

type StatusKey = keyof typeof STATUS_CFG;

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function fmtDate(d?: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-DZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
    });
}

function fmtMoney(n?: number | string | null): string {
    const v = parseFloat(String(n ?? 0));
    if (isNaN(v)) return "—";
    return v.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDocStatus(doc: CommercialDocument): string {
    return (
        ((doc.document_status as Record<string, unknown> | undefined)?.name as string) ??
        ((doc as unknown as Record<string, unknown>).status as string) ??
        "draft"
    );
}

function getPartyName(doc: CommercialDocument): string {
    return ((doc.party as Record<string, unknown> | undefined)?.name as string) ?? "";
}

function getWarehouseName(doc: CommercialDocument): string {
    return ((doc.warehouse as Record<string, unknown> | undefined)?.name as string) ?? "";
}

// ════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.draft;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: cfg.color, background: cfg.bg,
            border: `1px solid color-mix(in srgb, ${cfg.color} 22%, transparent)`,
            whiteSpace: "nowrap",
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
        </span>
    );
}

function MoneyCell({ value, bold, accent }: { value?: number | string | null; bold?: boolean; accent?: string }) {
    const v = parseFloat(String(value ?? 0));
    if (isNaN(v) || v === 0) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
    return (
        <span style={{
            direction: "ltr", display: "inline-block",
            fontVariantNumeric: "tabular-nums",
            fontWeight: bold ? 800 : 400, color: accent ?? "var(--t2)",
        }}>
            {fmtMoney(v)}
            <span style={{ fontSize: 10, marginRight: 3, color: "var(--t4)" }}>دج</span>
        </span>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY CARDS
// ════════════════════════════════════════════════════════════════════════════

function SummaryCards({ items = [], opColor }: { items: CommercialDocument[]; opColor: string }) {
    const stats = useMemo(() => ({
        count:    items.length,
        totalHt:  items.reduce((s, d) => s + (Number(d.total_ht) || 0), 0),
        totalTtc: items.reduce((s, d) => s + (Number(d.total_ttc) || 0), 0),
        unpaid:   items.filter(d => {
            const rem = Number((d as unknown as Record<string, unknown>).remaining_amount ?? 0);
            return rem > 0.001;
        }).length,
    }), [items]);

    const cards = [
        { icon: "ti-file-text",         label: "عدد المستندات", value: stats.count.toLocaleString("ar-DZ"),       accent: opColor },
        { icon: "ti-currency-dinar",     label: "HT (الصفحة)",   value: fmtMoney(stats.totalHt) + " دج",           accent: "var(--blue)", ltr: true },
        { icon: "ti-receipt",            label: "TTC (الصفحة)",  value: fmtMoney(stats.totalTtc) + " دج",          accent: opColor, ltr: true },
        { icon: "ti-clock-exclamation",  label: "غير مسدد",      value: stats.unpaid.toLocaleString("ar-DZ"),       accent: stats.unpaid > 0 ? "var(--red)" : "var(--t4)" },
    ] as const;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {cards.map(c => (
                <div key={c.label} style={{
                    padding: "12px 16px", background: "var(--bg1)",
                    border: "1px solid var(--b1)", borderRadius: "var(--r2)",
                    borderTop: `3px solid ${c.accent}`,
                    display: "flex", alignItems: "center", gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <i className={`ti ${c.icon}`} style={{ fontSize: 17, color: c.accent }} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: "var(--t4)", fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap" }}>
                            {c.label}
                        </div>
                        <div style={{
                            fontSize: 14, fontWeight: 800, color: "var(--t1)",
                            direction: (c as { ltr?: boolean }).ltr ? "ltr" : "rtl",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                            {c.value}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPANDED LINES
// ════════════════════════════════════════════════════════════════════════════

function ExpandedLines({ doc }: { doc: CommercialDocument }) {
    const slug = useActiveSlug();

    const { data: full, isLoading } = useQuery({
        queryKey: [slug, "doc-lines", doc.id],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: "lines.product,lines.productVariant",
            }).then(r => ((r as unknown as Record<string, unknown>).data as CommercialDocument) ?? r),
        staleTime: 5 * 60_000,
        enabled: !!doc.id,
    });

    if (isLoading) return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t4)", fontSize: 12, padding: "4px 0" }}>
            <i className="ti ti-loader-2" style={{ animation: "cdp-spin .8s linear infinite", fontSize: 14 }} aria-hidden="true" />
            جارٍ تحميل الأسطر…
        </div>
    );

    const lines = ((full as unknown as Record<string, unknown>)?.lines as Record<string, unknown>[] | undefined) ?? [];
    if (lines.length === 0) return <div style={{ color: "var(--t4)", fontSize: 12 }}>لا توجد أسطر</div>;

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                    <tr style={{ background: "var(--bg3)" }}>
                        {["#", "المنتج", "الكمية", "سعر HT", "خصم", "TVA%", "الإجمالي TTC"].map(h => (
                            <th key={h} style={{ padding: "5px 12px", textAlign: "right", fontWeight: 700, color: "var(--t4)", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line, idx) => {
                        const name =
                            ((line.product as Record<string, unknown> | undefined)?.name as string) ??
                            (line.description as string) ?? "—";
                        const disc = parseFloat(String(line.discount_percentage ?? 0));
                        return (
                            <tr key={String(line.id ?? idx)} style={{ borderBottom: "1px solid var(--b1)" }}>
                                <td style={{ padding: "6px 12px", color: "var(--t4)" }}>{idx + 1}</td>
                                <td style={{ padding: "6px 12px", fontWeight: 600 }}>{name}</td>
                                <td style={{ padding: "6px 12px", textAlign: "left" }}>{String(line.quantity ?? "")}</td>
                                <td style={{ padding: "6px 12px", direction: "ltr", textAlign: "left" }}>
                                    <MoneyCell value={line.unit_price_ht as number} />
                                </td>
                                <td style={{ padding: "6px 12px", textAlign: "left" }}>
                                    {disc > 0 ? <span style={{ color: "var(--red)", fontWeight: 700 }}>-{disc}%</span> : <span style={{ color: "var(--t4)" }}>—</span>}
                                </td>
                                <td style={{ padding: "6px 12px", color: "var(--t4)", textAlign: "left" }}>{line.tva_rate}%</td>
                                <td style={{ padding: "6px 12px", direction: "ltr", textAlign: "left" }}>
                                    <MoneyCell value={line.total_ttc as number} bold accent="var(--em)" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════════════

interface ToastItem { id: number; msg: string; type: "success" | "error" | "info" }

function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const counterRef = useRef(0);

    const show = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
        const id = ++counterRef.current;
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    }, []);

    const ToastContainer = useCallback(() => (
        <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px", borderRadius: 10,
                    background: t.type === "error" ? "color-mix(in srgb, var(--red) 15%, var(--bg1))" : t.type === "info" ? "color-mix(in srgb, var(--blue) 12%, var(--bg1))" : "color-mix(in srgb, var(--em) 12%, var(--bg1))",
                    border: `1px solid ${t.type === "error" ? "var(--red)" : t.type === "info" ? "var(--blue)" : "var(--em)"}`,
                    boxShadow: "0 8px 24px rgba(0,0,0,.14)", fontSize: 13, fontWeight: 600, color: "var(--t1)",
                    animation: "cdp-toast-in .2s ease",
                }}>
                    <i className={`ti ${t.type === "error" ? "ti-alert-circle" : t.type === "info" ? "ti-info-circle" : "ti-circle-check"}`}
                       style={{ color: t.type === "error" ? "var(--red)" : t.type === "info" ? "var(--blue)" : "var(--em)" }} aria-hidden="true" />
                    {t.msg}
                </div>
            ))}
        </div>
    ), [toasts]);

    return { show, ToastContainer };
}

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTION BUTTON
// ════════════════════════════════════════════════════════════════════════════

const ActionBtn = React.memo(function ActionBtn({
    icon, title, onClick, color, disabled,
}: { icon: string; title: string; onClick: () => void; color?: string; disabled?: boolean }) {
    return (
        <button title={title} aria-label={title} disabled={disabled} onClick={onClick} style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid var(--b1)",
            background: "var(--bg2)", color: color ?? "var(--t3)", fontSize: 13,
            cursor: "pointer", display: "inline-flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s", opacity: disabled ? 0.4 : 1,
        }}>
            <i className={`ti ${icon}`} aria-hidden="true" />
        </button>
    );
});

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT VIEW MODAL (مختصر — يبقى كما هو تقريباً)
// ════════════════════════════════════════════════════════════════════════════

function DocumentViewModal({
    docId, docType, onClose, onEdit, isReadOnly,
}: { docId: number; docType: DocumentType | null; onClose: () => void; onEdit: () => void; isReadOnly: boolean }) {
    const slug    = useActiveSlug();
    const isPurch = PURCHASE_CODES.has(docType?.code ?? "");

    const { data, isLoading } = useQuery({
        queryKey: [slug, "doc-detail-full", docId],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${docId}`, {
                include: ["party","documentStatus","warehouse","fiscalYear","currency","documentType","lines.product","lines.productVariant","validatedBy","payments.paymentMode"].join(","),
            }).then(r => ((r as unknown as Record<string, unknown>).data as CommercialDocument) ?? r),
        staleTime: 2 * 60_000,
    });

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);

    const d      = data as unknown as Record<string, unknown> | undefined;
    const status = d ? getDocStatus(data as CommercialDocument) : "draft";

    return (
        <div role="dialog" aria-modal="true" aria-label={`تفاصيل ${docType?.name ?? "المستند"}`}
             style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, direction: "rtl" }}
             onClick={onClose}>
            <div style={{ width: "100%", maxWidth: 920, maxHeight: "94vh", overflowY: "auto", overflowX: "hidden", background: "var(--bg1)", borderRadius: "var(--r3)", boxShadow: "0 24px 64px rgba(0,0,0,.22)", display: "flex", flexDirection: "column" }}
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--b1)", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, ${isPurch ? "var(--purple)" : "var(--em)"} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className={`ti ${isPurch ? "ti-shopping-cart" : "ti-file-invoice"}`} style={{ fontSize: 18, color: isPurch ? "var(--purple)" : "var(--em)" }} aria-hidden="true" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--t1)" }}>
                                {docType?.name}
                                {d && <span style={{ marginRight: 8, color: isPurch ? "var(--purple)" : "var(--em)", fontFamily: "monospace" }}>{String(d.document_number ?? `#${d.id}`)}</span>}
                            </div>
                            {d && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                                    <StatusBadge status={status} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {!isReadOnly && d && status === "draft" && (
                            <button onClick={onEdit} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, var(--blue) 30%, transparent)`, background: "color-mix(in srgb, var(--blue) 8%, transparent)", color: "var(--blue)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                                <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />
                                تعديل
                            </button>
                        )}
                        <button onClick={onClose} aria-label="إغلاق" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--b1)", background: "var(--bg2)", color: "var(--t3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "20px 24px", flex: 1 }}>
                    {isLoading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "var(--t4)" }}>
                            <i className="ti ti-loader-2" style={{ animation: "cdp-spin .8s linear infinite", fontSize: 20 }} aria-hidden="true" />
                            جارٍ تحميل التفاصيل…
                        </div>
                    ) : !d ? (
                        <div style={{ textAlign: "center", padding: 60, color: "var(--t4)" }}>المستند غير موجود</div>
                    ) : (
                        <>
                            {/* Meta Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                                {[
                                    { label: "التاريخ",     value: fmtDate(d.document_date as string) },
                                    { label: "الاستحقاق",   value: fmtDate(d.due_date as string) },
                                    { label: isPurch ? "المورد" : "الزبون", value: getPartyName(data as CommercialDocument) || "—" },
                                    { label: "المستودع",    value: getWarehouseName(data as CommercialDocument) || "—" },
                                ].map(f => (
                                    <div key={f.label} style={{ background: "var(--bg2)", borderRadius: "var(--r2)", padding: "10px 14px" }}>
                                        <div style={{ fontSize: 10, color: "var(--t4)", fontWeight: 700, marginBottom: 4 }}>{f.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Lines */}
                            <ExpandedLines doc={data as CommercialDocument} />

                            {/* Totals */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                                <div style={{ width: 310, border: "1px solid var(--b1)", borderRadius: "var(--r2)", overflow: "hidden" }}>
                                    {([
                                        { label: "إجمالي HT",  value: d.total_ht,  dim: true },
                                        { label: "TVA",         value: d.total_tva, dim: true },
                                        parseFloat(String(d.total_discount ?? 0)) > 0 ? { label: "الخصم الإجمالي", value: d.total_discount, dim: false, red: true } : null,
                                        parseFloat(String(d.total_stamp ?? 0)) > 0 ? { label: "الطابع الجبائي", value: d.total_stamp, dim: true } : null,
                                    ] as ({ label: string; value: unknown; dim: boolean; red?: boolean } | null)[])
                                        .filter(Boolean)
                                        .map(row => {
                                            const r = row!;
                                            return (
                                                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid var(--b1)", fontSize: 12, color: r.dim ? "var(--t4)" : "var(--t2)" }}>
                                                    <span>{r.label}</span>
                                                    <span style={{ fontWeight: 600, direction: "ltr", color: r.red ? "var(--red)" : "inherit" }}>
                                                        {fmtMoney(r.value as number)} دج
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    {/* Total TTC */}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg2)", fontSize: 14, fontWeight: 800 }}>
                                        <span style={{ color: "var(--t1)" }}>الإجمالي TTC</span>
                                        <span style={{ direction: "ltr", color: "var(--em)" }}>{fmtMoney(d.total_ttc as number)} دج</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — DataTable v10.1
// ════════════════════════════════════════════════════════════════════════════

export default function CommercialDocumentsPage() {
    const { typeCode }                       = useParams<{ typeCode: string }>();
    const qc                                 = useQueryClient();
    const slug                               = useActiveSlug();
    const { selectedYear, isReadOnly }       = useFiscalYear() as { selectedYear?: { id: number; name: string }; isReadOnly?: boolean };
    const { show: showToast, ToastContainer } = useToast();

    // ── Modal state ───────────────────────────────────────────────────────────
    type ModalMode = "add" | "edit" | "view" | "quick" | null;
    const [modal, setModal]           = useState<ModalMode>(null);
    const [viewDocId, setViewDocId]   = useState<number | null>(null);
    const [editDocFull, setEditDocFull] = useState<CommercialDocument | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // ── Server-side state ─────────────────────────────────────────────────────
    const [page, setPage]               = useState(1);
    const [perPage, setPerPage]         = useState(15);
    const [serverFilters, setServerFilters] = useState<Record<string, string>>({});
    const [multiSort, setMultiSort]     = useState<MultiSortState>([]);

    const isPurch   = PURCHASE_CODES.has(typeCode ?? "");
    const isSalable = SALE_CODES.has(typeCode ?? "");
    const opColor   = isPurch ? "var(--purple)" : "var(--em)";

    // ── Column State Persistence — مفتاح واحد يحفظ: ترتيب + عرض + مخفي + مثبت + فلاتر ──
    const COL_STATE_KEY = `cdp-cols-state-${typeCode}-${slug ?? "default"}`;
    const { save: saveColState, reset: resetColState, initialSnapshot } = useColumnStatePersistence(COL_STATE_KEY);

    // columnOrder: يُقرأ من الـ snapshot المحفوظة
    const [columnOrder, setColumnOrder] = useState<string[] | undefined>(
        () => initialSnapshot?.columnOrder,
    );

    const handleColumnOrderChange = useCallback((order: string[]) => {
        setColumnOrder(order);
        saveColState({ columnOrder: order });
    }, [saveColState]);

    // ── Sort → server param ───────────────────────────────────────────────────
    const sortParam = useMemo(() => {
        if (!multiSort.length) return "-document_date";
        return multiSort.map(s => `${s.dir === "desc" ? "-" : ""}${s.key}`).join(",");
    }, [multiSort]);

    // ── Filter change ─────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((filters: Record<string, string>) => {
        const converted: Record<string, string> = {};
        const rangeFields = new Set(["document_date","due_date","total_ht","total_tva","total_ttc","net_to_pay"]);
        for (const [key, val] of Object.entries(filters)) {
            if (!val || val === "|") continue;
            converted[key] = rangeFields.has(key) && val.includes("|") ? val.replace("|", ",") : val;
        }
        setServerFilters(converted);
        setPage(1);
        // حفظ الفلاتر في snapshot الموحد
        saveColState({ activeFilters: converted });
    }, [saveColState]);

    const invalidateDocs = useCallback(() => {
        if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }, [qc, slug]);

    // ── Fetch document type ───────────────────────────────────────────────────
    const { data: docType } = useQuery<DocumentType | null>({
        queryKey: [slug, "document-type-by-code", typeCode],
        queryFn: () =>
            apiGet<{ data?: DocumentType[] }>("/document-types", { per_page: 500 }).then(res => {
                const list = Array.isArray(res) ? (res as DocumentType[]) : (((res as Record<string,unknown>).data as DocumentType[]) ?? []);
                return list.find(dt => dt.code === typeCode) ?? null;
            }),
        enabled: !!slug && !!typeCode,
        staleTime: 10 * 60_000,
    });

    // ── Fetch documents ───────────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        // نبني الـ params بدون أي مفتاح قيمته undefined أو null
        // لأن بعض HTTP clients تُرسلها كـ "undefined" string → Backend يُرجع []
        const params: Record<string, unknown> = {
            include: "party,documentStatus,warehouse",
            sort: sortParam,
            per_page: perPage,
            page,
        };

        // نُضيف filter[document_type_id] فقط إذا كانت القيمة موجودة
        if (docType?.id != null)       params["filter[document_type_id]"] = docType.id;
        if (selectedYear?.id != null)  params["filter[fiscal_year_id]"]   = selectedYear.id;

        const filterMap: Record<string, string> = {
            search:                   "filter[search]",
            "party.name":             "filter[party.name]",
            "warehouse.name":         "filter[warehouse.name]",
            "document_status.name":   "filter[document_status.name]",
            document_date:            "filter[document_date]",
            due_date:                 "filter[due_date]",
            total_ht:                 "filter[total_ht]",
            total_tva:                "filter[total_tva]",
            total_ttc:                "filter[total_ttc]",
            net_to_pay:               "filter[net_to_pay]",
        };
        for (const [fk, pk] of Object.entries(filterMap)) {
            if (serverFilters[fk]) params[pk] = serverFilters[fk];
        }
        return params;
    }, [docType?.id, selectedYear?.id, serverFilters, sortParam, perPage, page]);

    const { data: docsRaw, isLoading, isFetching } = useQuery({
        queryKey: tenantKeys.documents.byType(slug ?? "", typeCode ?? "", queryParams),
        queryFn: () => {
            // TODO: احذف هذا الـ log بعد حل المشكلة
            if (process.env.NODE_ENV === "development") {
                console.debug("[CommercialDocumentsPage] sending params:", queryParams);
            }
            return apiGet<{ data: CommercialDocument[]; meta: Record<string, number> }>("/documents", queryParams);
        },
        enabled: !!slug && !!typeCode && !!selectedYear?.id && !!docType?.id,
        placeholderData: keepPreviousData,
        staleTime: 2 * 60_000,
    });

    const items = useMemo((): CommercialDocument[] => {
        if (!docsRaw) return [];
        if (Array.isArray(docsRaw)) return docsRaw as CommercialDocument[];
        const raw = docsRaw as unknown as Record<string, unknown>;
        // بنية مباشرة: { data: [...], meta: {...} }
        if (Array.isArray(raw.data)) return raw.data as CommercialDocument[];
        // بنية مُغلَّفة: { data: { data: [...], meta: {...} } }
        const nested = raw.data as Record<string, unknown> | undefined;
        if (nested && Array.isArray(nested.data)) return nested.data as CommercialDocument[];
        return [];
    }, [docsRaw]);

    // ── استخراج meta مع دعم كل بنى Laravel ──────────────────────────────────
    // Laravel يُرجع pagination في:
    //   • { data: [...], meta: { current_page, last_page, total, per_page } }  ← JsonResource::collection
    //   • { data: { data: [...], meta: {...} } }                                ← لو apiGet يُغلّف
    //   • { data: [...], current_page, last_page, total }                       ← paginator مباشر
    const meta = useMemo(() => {
        if (!docsRaw || Array.isArray(docsRaw)) return { total: 0, last_page: 1, current_page: 1, per_page: perPage };

        const raw    = docsRaw as unknown as Record<string, unknown>;
        // الأكثر شيوعاً: meta object على المستوى الأول
        const m      = (raw.meta ?? (raw.data as Record<string, unknown> | undefined)?.meta) as Record<string, number> | undefined;

        if (m && (m.total != null || m.last_page != null)) {
            return {
                total:        Number(m.total        ?? 0),
                last_page:    Number(m.last_page    ?? 1),
                current_page: Number(m.current_page ?? 1),
                per_page:     Number(m.per_page     ?? perPage),
            };
        }

        // fallback: pagination مباشرة على الـ root object (بعض الإعدادات)
        if (raw.total != null || raw.last_page != null) {
            return {
                total:        Number(raw.total        ?? 0),
                last_page:    Number(raw.last_page    ?? 1),
                current_page: Number(raw.current_page ?? 1),
                per_page:     Number(raw.per_page     ?? perPage),
            };
        }

        return { total: 0, last_page: 1, current_page: 1, per_page: perPage };
    }, [docsRaw, perPage]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const validateMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/validate`),
        onSuccess: () => { showToast("تم الاعتماد بنجاح"); invalidateDocs(); },
        onError:   () => showToast("فشل الاعتماد", "error"),
    });
    const lockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/lock`),
        onSuccess: () => { showToast("تم قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل القفل", "error"),
    });
    const cancelMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/cancel`),
        onSuccess: () => { showToast("تم إلغاء المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل الإلغاء", "error"),
    });
    const deleteMut = useMutation({
        mutationFn: (id: number) => apiDelete(`/documents/${id}`),
        onSuccess: () => { showToast("تم الحذف بنجاح"); invalidateDocs(); },
        onError:   () => showToast("فشل الحذف", "error"),
    });

    // ── Edit modal ────────────────────────────────────────────────────────────
    const openEditModal = useCallback(async (doc: CommercialDocument) => {
        setLoadingEdit(true);
        try {
            const res  = await apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: ["party","warehouse","documentType","fiscalYear","lines.product","lines.productVariant","payments.paymentMode"].join(","),
            });
            const full = ((res as unknown as Record<string,unknown>).data as CommercialDocument) ?? res;
            setEditDocFull(full);
            setModal("edit");
        } catch {
            showToast("فشل تحميل بيانات المستند", "error");
        } finally {
            setLoadingEdit(false);
        }
    }, [showToast]);

    const closeModal = useCallback(() => { setModal(null); setViewDocId(null); setEditDocFull(null); }, []);

    const handleMultiSortChange = useCallback((sorts: MultiSortState) => {
        setMultiSort(sorts);
        setPage(1);
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // COLUMN DEFINITIONS
    // ════════════════════════════════════════════════════════════════════════

    const allColumns = useMemo((): Column<CommercialDocument>[] => [
        {
            key: "document_number",
            header: "رقم المستند",
            exportHeader: "رقم المستند",
            sticky: "start",
            width: 145,
            sortable: true,
            filter: { type: "text" },
            searchable: true,
            disablePin: true,          // لا نسمح بـ pin مرة ثانية — هو sticky بالفعل
            accessor: r => String(r.document_number ?? r.id),
            render: row => (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {row.is_locked && <i className="ti ti-lock" style={{ fontSize: 10, color: "var(--t4)" }} aria-label="مقفل" />}
                    <span style={{ fontWeight: 800, color: opColor, fontSize: 12, fontFamily: "monospace", letterSpacing: "-.3px" }}>
                        {String(row.document_number ?? `#${row.id}`)}
                    </span>
                </div>
            ),
        },
        {
            key: "document_date",
            header: "التاريخ",
            exportHeader: "التاريخ",
            width: 110,
            sortable: true,
            filter: { type: "date" },
            accessor: r => r.document_date,
            render: row => <span style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(row.document_date)}</span>,
        },
        {
            key: "party.name",
            header: isPurch ? "المورد" : "الزبون",
            exportHeader: isPurch ? "المورد" : "الزبون",
            sortable: true,
            searchable: true,
            filter: { type: "dynamic-multiselect" },
            accessor: r => getPartyName(r),
            render: row => {
                const name = getPartyName(row);
                return name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: `color-mix(in srgb, ${opColor} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: opColor }}>
                            {name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--t1)", fontSize: 13 }}>{name}</span>
                    </div>
                ) : (
                    <span style={{ color: "var(--t4)", fontStyle: "italic", fontSize: 12 }}>نقدي</span>
                );
            },
        },
        {
            key: "warehouse.name",
            header: "المستودع",
            exportHeader: "المستودع",
            sortable: false,
            hideOnMobile: true,
            filter: { type: "dynamic-multiselect" },
            accessor: r => getWarehouseName(r),
            render: row => <span style={{ fontSize: 12, color: "var(--t3)" }}>{getWarehouseName(row) || "—"}</span>,
        },
        {
            key: "document_status.name",
            header: "الحالة",
            exportHeader: "الحالة",
            width: 135,
            sortable: true,
            filter: {
                type: "select",
                options: Object.entries(STATUS_CFG).map(([v, c]) => ({ value: v, label: c.label })),
            },
            accessor: r => getDocStatus(r),
            render: row => <StatusBadge status={getDocStatus(row)} />,
        },
        {
            key: "total_ht",
            header: "إجمالي HT",
            exportHeader: "إجمالي HT (دج)",
            width: 130,
            align: "end",
            sortable: true,
            hideOnMobile: true,
            filter: { type: "number" },
            accessor: r => Number(r.total_ht ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_ht} />,
        },
        {
            key: "total_tva",
            header: "TVA",
            exportHeader: "TVA (دج)",
            width: 110,
            align: "end",
            sortable: true,
            defaultHidden: true,          // مخفي افتراضياً
            filter: { type: "number" },
            accessor: r => Number(r.total_tva ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_tva} />,
        },
        {
            key: "total_ttc",
            header: "الإجمالي TTC",
            exportHeader: "الإجمالي TTC (دج)",
            width: 145,
            align: "end",
            sortable: true,
            filter: { type: "number" },
            accessor: r => Number(r.total_ttc ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_ttc} bold />,
        },
        {
            key: "net_to_pay",
            header: "المستحق",
            exportHeader: "المستحق (دج)",
            width: 145,
            align: "end",
            sortable: true,
            hideOnMobile: true,
            filter: { type: "number" },
            accessor: r => Number((r as unknown as Record<string,unknown>).net_to_pay ?? r.total_ttc ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const ntp = Number((row as unknown as Record<string,unknown>).net_to_pay ?? row.total_ttc ?? 0);
                const rem = Number((row as unknown as Record<string,unknown>).remaining_amount ?? 0);
                const paid = ntp > 0 && rem <= 0.001;
                return <MoneyCell value={ntp} bold accent={paid ? "var(--em)" : rem > 0 ? "var(--red)" : "var(--t2)"} />;
            },
        },
        {
            key: "due_date",
            header: "الاستحقاق",
            exportHeader: "تاريخ الاستحقاق",
            width: 110,
            sortable: true,
            defaultHidden: true,          // مخفي افتراضياً
            filter: { type: "date" },
            accessor: r => r.due_date ?? "",
            render: row => {
                if (!row.due_date) return <span style={{ color: "var(--t4)" }}>—</span>;
                const overdue = new Date(row.due_date) < new Date();
                const status  = getDocStatus(row);
                const isLate  = overdue && status !== "paid" && status !== "cancelled";
                return (
                    <span style={{ fontSize: 12, fontWeight: isLate ? 700 : 400, color: isLate ? "var(--red)" : "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
                        {isLate && <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} aria-label="متأخر" />}
                        {fmtDate(row.due_date)}
                    </span>
                );
            },
        },
    ], [isPurch, opColor]);

    // ✅ useColumnVisibility:
    //    — يدمج defaultHidden (من تعريف الأعمدة) مع hiddenColumns المحفوظة في snapshot
    //    — إذا لا يوجد snapshot → يُطبق defaultHidden فقط
    //    — إذا يوجد snapshot → يستخدمه كاملاً (يشمل ما حفظه المستخدم بما في ذلك
    //      الأعمدة ذات defaultHidden التي أظهرها أو أخفاها يدوياً)
    const defaultHiddenKeys = useMemo(
        () => allColumns.filter(c => c.defaultHidden).map(c => c.key),
        [allColumns],
    );
    const initialHiddenKeys = initialSnapshot?.hiddenColumns ?? defaultHiddenKeys;

    const {
        visibleColumns: columns,
        hiddenColumns,
        toggleColumn: toggleColumnBase,
    } = useColumnVisibility(
        allColumns,
        initialHiddenKeys,
        null,   // لا مفتاح localStorage مستقل — الحفظ عبر useColumnStatePersistence
    );

    // نُغلّف toggleColumn لنحفظ التغيير في snapshot الموحد
    const toggleColumn = useCallback((key: string) => {
        toggleColumnBase(key);
        setTimeout(() => {
            const newHidden = allColumns
                .filter(c => hiddenColumns.has(c.key) ? c.key !== key : c.key === key)
                .map(c => c.key);
            saveColState({ hiddenColumns: newHidden });
        }, 0);
    }, [toggleColumnBase, hiddenColumns, allColumns, saveColState]);

    // ════════════════════════════════════════════════════════════════════════
    // CONDITIONAL FORMATTING
    // ════════════════════════════════════════════════════════════════════════

    const conditionalFormatting = useMemo<ConditionalFormat<CommercialDocument>[]>(() => [
        {
            colKey: "*",
            condition: (_value, row) => {
                const status  = getDocStatus(row);
                const dueDate = row.due_date;
                return !!(dueDate && new Date(dueDate) < new Date() && status !== "paid" && status !== "cancelled");
            },
            className: "cdp-row-overdue",
            style: { background: "color-mix(in srgb, var(--red) 6%, var(--bg1))" },
        },
        {
            colKey: "net_to_pay",
            condition: (_value, row) => {
                const rem = Number((row as unknown as Record<string, unknown>).remaining_amount ?? 0);
                return rem > 0 && rem < (row.total_ttc ?? 0);
            },
            style: { fontWeight: 700 },
        },
        {
            // تلوين خفيف للمستندات المسودة
            colKey: "*",
            condition: (_value, row) => getDocStatus(row) === "draft",
            style: { opacity: 0.85 },
        },
    ], []);

    // ════════════════════════════════════════════════════════════════════════
    // CONTEXT MENU ITEMS — يستخدم ctx.row المُصلح في v10.1
    // ════════════════════════════════════════════════════════════════════════

    const contextMenuItems = useCallback((ctx: ContextMenuContext): ContextMenuItem[] => {
        const menuItems: ContextMenuItem[] = [];

        if (ctx.type === "cell") {
            // ✅ ctx.row مُملوء الآن بـ useContextMenu v10.1
            const row    = ctx.row as CommercialDocument | undefined;
            const colKey = ctx.colKey;
            const value  = row && colKey ? (row as unknown as Record<string, unknown>)[colKey] : undefined;

            menuItems.push(
                {
                    label: "نسخ القيمة",
                    icon: "copy",
                    onClick: () => {
                        const cellEl = document.querySelector(`[data-row-index="${ctx.rowIndex}"][data-col-key="${colKey}"]`);
                        const text   = cellEl?.textContent?.trim() ?? String(value ?? "");
                        if (text) { navigator.clipboard.writeText(text); showToast("تم نسخ القيمة", "info"); }
                    },
                },
                { label: "", divider: true, onClick: () => {} },
                {
                    label: "فلتر بنفس القيمة",
                    icon: "filter",
                    disabled: !colKey || value === undefined,
                    onClick: () => {
                        if (colKey && value !== undefined) {
                            setServerFilters(prev => ({ ...prev, [colKey]: String(value) }));
                            setPage(1);
                            showToast(`تم تطبيق فلتر على: ${colKey}`, "info");
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => {
                        if (row) { setViewDocId(row.id); setModal("view"); }
                    },
                },
            );
        }

        if (ctx.type === "row") {
            // ✅ ctx.row مُملوء
            const row = ctx.row as CommercialDocument | undefined;
            const status = row ? getDocStatus(row) : "";

            menuItems.push(
                {
                    label: "نسخ رقم المستند",
                    icon: "copy",
                    disabled: !row?.document_number,
                    onClick: () => {
                        if (row?.document_number) {
                            navigator.clipboard.writeText(String(row.document_number));
                            showToast("تم نسخ رقم المستند", "info");
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
            );

            if (!isReadOnly && row && status === "draft") {
                menuItems.push(
                    { label: "", divider: true, onClick: () => {} },
                    {
                        label: "تعديل المستند",
                        icon: "pencil",
                        onClick: () => { if (row) openEditModal(row); },
                    },
                    {
                        label: "اعتماد المستند",
                        icon: "check",
                        onClick: () => {
                            if (row && window.confirm("تأكيد اعتماد هذا المستند؟")) {
                                validateMut.mutate(row.id);
                            }
                        },
                    },
                    {
                        label: "حذف المستند",
                        icon: "trash",
                        onClick: () => {
                            if (row && !row.is_locked && window.confirm("تأكيد حذف هذا المستند؟")) {
                                deleteMut.mutate(row.id);
                            }
                        },
                    },
                );
            }

            if (!isReadOnly && row && !["cancelled","returned","draft"].includes(status)) {
                menuItems.push(
                    { label: "", divider: true, onClick: () => {} },
                    {
                        label: "إلغاء المستند",
                        icon: "ban",
                        onClick: () => {
                            if (row && window.confirm("تأكيد إلغاء هذا المستند؟")) {
                                cancelMut.mutate(row.id);
                            }
                        },
                    },
                );
            }
        }

        if (ctx.type === "header") {
            const colKey = ctx.colKey;
            const isHidden = colKey ? hiddenColumns.has(colKey) : false;
            menuItems.push(
                {
                    label: isHidden ? "إظهار العمود" : "إخفاء العمود",
                    icon: isHidden ? "eye" : "eye-off",
                    disabled: !colKey,
                    onClick: () => {
                        if (colKey) {
                            toggleColumn(colKey);
                            showToast(isHidden ? `تم إظهار العمود` : `تم إخفاء العمود`, "info");
                        }
                    },
                },
            );
        }

        return menuItems;
    }, [hiddenColumns, toggleColumn, isReadOnly, openEditModal, validateMut, deleteMut, cancelMut, showToast]);

    // ════════════════════════════════════════════════════════════════════════
    // SMART FILTER CALLBACK
    // ════════════════════════════════════════════════════════════════════════

    const handleSmartFilterApply = useCallback((query: string, result: { success: boolean; filters: Record<string, string> }) => {
        if (result.success && Object.keys(result.filters).length > 0) {
            setServerFilters(prev => ({ ...prev, ...result.filters }));
            setPage(1);
            const count = Object.keys(result.filters).length;
            showToast(`✓ ${count} فلتر من: "${query}"`, "success");
        } else if (result.success) {
            // تطابق نمط بدون فلاتر (مثل sort فقط)
            showToast(`✓ فُرِّز حسب: "${query}"`, "info");
        } else {
            showToast(`لم يُتعرف على: "${query}"`, "info");
        }
    }, [showToast]);

    // ════════════════════════════════════════════════════════════════════════
    // ROW ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const rowActions = useCallback((row: CommercialDocument) => {
        const status   = getDocStatus(row);
        const canEdit  = !isReadOnly && !row.is_locked && status === "draft";
        const canValid = !isReadOnly && !row.is_locked && status === "draft";
        const canLock  = !isReadOnly && !row.is_locked && !!( row as unknown as Record<string,unknown>).validated_at;
        const canCancel = !isReadOnly && !["cancelled","returned"].includes(status);
        const canDelete = !isReadOnly && !row.is_locked && status === "draft";

        return (
            <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                <ActionBtn icon="ti-eye"   title="عرض"    onClick={() => { setViewDocId(row.id); setModal("view"); }} />
                {canEdit  && <ActionBtn icon={loadingEdit ? "ti-loader-2" : "ti-pencil"} title="تعديل"  color="var(--blue)"   disabled={loadingEdit}         onClick={() => openEditModal(row)} />}
                {canValid && <ActionBtn icon="ti-check"  title="اعتماد" color="var(--em)"    disabled={validateMut.isPending} onClick={() => { if (window.confirm("تأكيد اعتماد هذا المستند؟")) validateMut.mutate(row.id); }} />}
                {canLock  && <ActionBtn icon="ti-lock"   title="قفل"    color="var(--orange)" disabled={lockMut.isPending}    onClick={() => { if (window.confirm("تأكيد قفل هذا المستند؟")) lockMut.mutate(row.id); }} />}
                {canDelete ? (
                    <ActionBtn icon="ti-trash" title="حذف"   color="var(--red)"   disabled={deleteMut.isPending}  onClick={() => { if (window.confirm("تأكيد حذف هذا المستند؟")) deleteMut.mutate(row.id); }} />
                ) : canCancel ? (
                    <ActionBtn icon="ti-ban"   title="إلغاء" color="var(--red)"   disabled={cancelMut.isPending}  onClick={() => { if (window.confirm("تأكيد إلغاء هذا المستند؟")) cancelMut.mutate(row.id); }} />
                ) : null}
            </div>
        );
    }, [isReadOnly, loadingEdit, openEditModal, validateMut, lockMut, deleteMut, cancelMut]);

    // ════════════════════════════════════════════════════════════════════════
    // HEADER ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const headerActions = useMemo(() => (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isFetching && !isLoading && (
                <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: 15, color: "var(--t4)", animation: "cdp-spin .8s linear infinite" }} />
            )}
            {isReadOnly && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--orange) 12%, transparent)", color: "var(--orange)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-lock" style={{ fontSize: 10 }} aria-hidden="true" />
                    للقراءة فقط
                </span>
            )}
            {/* مؤشر الأعمدة المخفية */}
            {hiddenColumns.size > 0 && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-eye-off" style={{ fontSize: 10 }} aria-hidden="true" />
                    {hiddenColumns.size} مخفي
                </span>
            )}
            {/* زر إعادة ضبط layout — يظهر فقط عند وجود snapshot محفوظ */}
            {initialSnapshot && (
                <button
                    title="إعادة ضبط تخطيط الأعمدة (الترتيب، العرض، المخفي، الفلاتر)"
                    onClick={() => {
                        if (window.confirm("إعادة ضبط تخطيط الجدول للإعدادات الافتراضية؟")) {
                            resetColState();
                            window.location.reload();
                        }
                    }}
                    style={{ height: 28, width: 28, borderRadius: 7, border: "1px solid var(--b2)", background: "var(--bg2)", color: "var(--t4)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                    aria-label="إعادة ضبط تخطيط الجدول"
                >
                    <i className="ti ti-layout-columns" aria-hidden="true" />
                </button>
            )}
            {isSalable && !isReadOnly && (
                <button onClick={() => setModal("quick")} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, ${opColor} 35%, transparent)`, background: `color-mix(in srgb, ${opColor} 8%, transparent)`, color: opColor, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <i className="ti ti-bolt" style={{ fontSize: 14 }} aria-hidden="true" />
                    بيع سريع
                </button>
            )}
            {!isReadOnly && (
                <button onClick={() => setModal("add")} style={{ height: 32, padding: "0 16px", borderRadius: 8, border: "none", background: opColor, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px color-mix(in srgb, ${opColor} 30%, transparent)`, fontFamily: "inherit" }}>
                    <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
                    مستند جديد
                </button>
            )}
        </div>
    ), [isFetching, isLoading, isReadOnly, isSalable, opColor, hiddenColumns.size, initialSnapshot, resetColState]);

    // ── Page title ────────────────────────────────────────────────────────────
    const tableTitle = useMemo(() => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb, ${opColor} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${isPurch ? "ti-shopping-cart" : "ti-file-invoice"}`} style={{ fontSize: 16, color: opColor }} aria-hidden="true" />
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--t1)", lineHeight: 1.2 }}>{docType?.name ?? typeCode}</div>
                {selectedYear && <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 1 }}>{selectedYear.name}</div>}
            </div>
        </div>
    ), [docType?.name, typeCode, isPurch, opColor, selectedYear]);

    // ── Callbacks ─────────────────────────────────────────────────────────────
    const isExpandable  = useCallback((row: CommercialDocument) => { const s = getDocStatus(row); return s !== "draft" && s !== "cancelled"; }, []);
    const renderExpanded = useCallback((row: CommercialDocument) => <ExpandedLines doc={row} />, []);
    const rowClassName = useCallback((row: CommercialDocument): string | undefined => {
        const status = getDocStatus(row);
        // cdp-row-overdue يُطبَّق عبر conditionalFormatting فقط (لا ازدواج)
        if (status === "cancelled") return "cdp-row-cancelled";
        return undefined;
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════

    return (
        <>
            <style>{`
                @keyframes cdp-spin    { to { transform: rotate(360deg); } }
                @keyframes cdp-toast-in {
                    from { transform: translateY(10px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .cdp-row-cancelled td { opacity: .55; }
                .cdp-row-overdue td:first-child { border-right: 3px solid var(--red) !important; }
            `}</style>

            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0, flex: 1, direction: "rtl", fontFamily: "Tajawal, sans-serif" }}>

                {/* Summary cards */}
                {items.length > 0 && <SummaryCards items={items} opColor={opColor} />}

                {/* DataTable v10.2 — محاطة بـ ErrorBoundary لمنع أي خطأ من إسقاط الصفحة */}
                <div style={{ background: "var(--bg1)", border: "1px solid var(--b1)", borderRadius: "var(--r3)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)", flex: 1 }}>
                    <DataTableErrorBoundary>
                    <DataTable<CommercialDocument>
                        data={items}
                        columns={columns}                           // ← visibleColumns من useColumnVisibility
                        rowKey={r => r.id}
                        loading={isLoading}

                        // ── Reorder + Sort + URL ────────────────────────
                        columnReorder={true}
                        initialColumnOrder={columnOrder}
                        onColumnOrderChange={handleColumnOrderChange}
                        multiSort={true}
                        onMultiSortChange={handleMultiSortChange}
                        urlState={{
                            enabled: true,
                            prefix: `commercial_${typeCode}`,
                            filters: true, sort: true, page: true, search: true,
                        }}

                        // ── Virtual scroll: فقط عند تعطيل pagination وتحميل كمية كبيرة ──
                        virtual={items.length > 100 ? { rowHeight: 40, containerHeight: 600, overscan: 8 } : undefined}

                        // ── تنسيق شرطي ─────────────────────────────────
                        conditionalFormatting={conditionalFormatting}

                        // ── لوحة المفاتيح ✅ مُفعَّل الآن مع RTL fix ──
                        keyboardNav={true}

                        // ── Batch edit: معطل (no-server-side mutations) ─
                        batchEdit={false}

                        // ── Column pinning ─────────────────────────────
                        pinnedColumns={{ start: ["document_number"] }}

                        // ── Pagination server-side ─────────────────────
                        pagination={{
                            page: Number(meta.current_page ?? 1),
                            perPage,
                            total:    Number(meta.total    ?? 0),
                            lastPage: Number(meta.last_page ?? 1),
                            onPage:    setPage,
                            onPerPage: n => { setPerPage(n); setPage(1); },
                        }}
                        onFilterChange={handleFilterChange}
                        onSearchChange={q => {
                            setServerFilters(prev => { const n = { ...prev }; q ? (n.search = q) : delete n.search; return n; });
                            setPage(1);
                        }}
                        allData={items as unknown as Record<string, unknown>[]}

                        // ── الميزات الأساسية ────────────────────────────
                        searchable
                        searchPlaceholder="بحث برقم المستند أو اسم المتعامل…"
                        showAggregates
                        aggregateLabel="إجمالي الصفحة"
                        expandable
                        renderExpanded={renderExpanded}
                        isExpandable={isExpandable}
                        rowActions={rowActions}
                        headerActions={headerActions}
                        title={tableTitle}
                        exportable
                        exportName={`${typeCode}_${selectedYear?.name ?? ""}`}
                        onRowClick={row => { setViewDocId(row.id); setModal("view"); }}
                        rowClassName={rowClassName}
                        emptyText={
                            !selectedYear  ? "الرجاء اختيار سنة مالية" :
                            !docType       ? "جارٍ تحميل نوع المستند…" :
                                            "لا توجد مستندات"
                        }

                        // ── 🆕 Excel Export ─────────────────────────────
                        enableExcelExport={true}
                        excelExportOptions={{
                            fileName: `${typeCode}_${selectedYear?.name ?? ""}_export`,
                            includeAggregates:    true,
                            includeHiddenColumns: false,
                            title: docType?.name ?? typeCode,
                        }}

                        // ── 🆕 Smart Filter عربي — مع أنماط ERP الجزائري ──
                        enableSmartFilter={true}
                        smartFilterPatterns={ERP_FILTER_PATTERNS}
                        onSmartFilterApply={handleSmartFilterApply}

                        // ── 🆕 Saved Views ──────────────────────────────
                        enableSavedViews={true}
                        savedViewsConfig={{
                            tableKey: `commercial_${typeCode}_${slug ?? "default"}`,
                            maxViews: 10,
                        }}

                        // ── 🆕 Context Menu — يستخدم ctx.row المُصلح ────
                        enableContextMenu={true}
                        contextMenuItems={contextMenuItems}
                    />
                    </DataTableErrorBoundary>
                </div>
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            {(modal === "add" || modal === "edit") && (
                <CommercialDocumentModal
                    open
                    documentType={docType ?? null}
                    existingDocument={modal === "edit" ? (editDocFull ?? undefined) : undefined}
                    onClose={closeModal}
                    onSaved={() => {
                        closeModal();
                        invalidateDocs();
                        showToast(modal === "add" ? "تم إنشاء المستند بنجاح" : "تم تحديث المستند بنجاح");
                    }}
                />
            )}

            {modal === "quick" && (
                <QuickSaleModal
                    open
                    onClose={closeModal}
                    onSaved={(state: Record<string, unknown>) => {
                        closeModal();
                        invalidateDocs();
                        showToast(`تم إنشاء ${String(state.document_number ?? "المستند")} بنجاح`);
                    }}
                />
            )}

            {modal === "view" && viewDocId != null && (
                <DocumentViewModal
                    docId={viewDocId}
                    docType={docType ?? null}
                    onClose={closeModal}
                    onEdit={() => {
                        const doc = items.find(d => d.id === viewDocId);
                        if (doc) { closeModal(); openEditModal(doc); }
                    }}
                    isReadOnly={!!isReadOnly}
                />
            )}

            <ToastContainer />
        </>
    );
}
