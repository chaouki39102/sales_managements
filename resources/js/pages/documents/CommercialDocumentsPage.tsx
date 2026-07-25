// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentsPage.tsx  —  v10.4
//
// ✅ جديد في v10.4:
//   • إزالة validateMut و deleteMut (المستند معتمد فور الإنشاء)
//   • إضافة unlockMut — فتح القفل متاح للمستندات غير المُصدَّرة
//   • cancelMut يرسل cancellation_reason
//   • getRowPermissions() — helper خارجي لحساب الصلاحيات
//   • عمود is_locked مرئي افتراضياً + نقر مزدوج للتبديل
//   • contextMenuItems: كتلة "table" للقفل/فتح الجماعي
//   • STATUS_CFG مُبسَّط: validated + cancelled فقط
//   • isExpandable: كل المستندات قابلة للتوسع
//
// ✅ محفوظ من v10.3:
//   • useColumnStatePersistence — مفتاح localStorage واحد
//   • smartFilterPatterns={ERP_FILTER_PATTERNS} مُفعَّل
//   • DataTableErrorBoundary يلف الجدول
// ════════════════════════════════════════════════════════════════════════════

import React, {
    Suspense,
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug, useActiveCompany } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import { DataTable, DataTableErrorBoundary } from "@/components/ui/DataTable";
import type {
    Column,
    MultiSortState,
    ConditionalFormat,
    ContextMenuItem,
    ContextMenuContext,
} from "@/components/ui/DataTable";
import { useColumnStatePersistence } from "@/components/ui/DataTable";
import CommercialDocumentModal from "./CommercialDocumentModal";
import QuickSaleModal from "./QuickSaleModal";
import { DeliveryProgressBar } from "./components/DeliveryProgressBar";
import ConvertDocumentModal from "./components/ConvertDocumentModal";
import BatchPrintModal from "./components/BatchPrintModal";
const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import { ApprovalStatusBadge, ApprovalActions } from "./components/ApprovalWorkflow";
import { useApprovalCheckBatch } from "@/lib/api/endpoints/approvals";
import { SendDocumentMailModal } from "./components/SendDocumentMailModal";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SimpleTable from "@/components/ui/SimpleTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useConfirm } from "@/hooks/useConfirm";
import type { DocumentType, CommercialDocument } from "@/lib/api/core/types";

// أنماط SmartFilter الخاصة بالمشروع (مفصولة عن library)
import { ERP_FILTER_PATTERNS } from "@/lib/datatable-patterns";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const SALE_CODES     = new Set(["FV", "BL", "DEV", "BCC", "AV"]);
const PURCHASE_CODES = new Set(["FA", "BR", "DDP", "BCF", "AA"]);

const STATUS_CFG = {
    draft:          { label: "مسودة",    color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
    pending:        { label: "قيد الانتظار", color: "#f59e0b", bg: "#fffbeb", dot: "#fbbf24" },
    validated:      { label: "معتمد",    color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
    partially_paid: { label: "مدفوع جزئياً", color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
    paid:           { label: "مدفوع",    color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
    overdue:        { label: "متأخر",    color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    cancelled:      { label: "ملغي",     color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    returned:       { label: "مرتجع",    color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
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

/** تاريخ + وقت كامل (ساعة:دقيقة:ثانية) — لأعمدة created_at / updated_at / validated_at */
function fmtDateTime(d?: string | null): string {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    const date = dt.toLocaleDateString("ar-DZ", { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = dt.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    return `${date} ${time}`;
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

/** Avatar بسيط + اسم — لعرض المستخدم في أعمدة created_by / validated_by */
function UserChip({ name, color = "var(--primary)" }: { name: string; color?: string }) {
    if (!name) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color, flexShrink: 0,
            }}>
                {name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>{name}</span>
        </div>
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
    const docCode = ((doc as unknown as Record<string, unknown>).documentType as Record<string, unknown> | undefined)?.code as string ?? '';

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

    const TRACKS_DELIVERY = docCode === 'BCC';

    const simpleColumns = [
        { key: '_idx', label: '#' },
        { key: 'product_name', label: 'المنتج', render: (_v: unknown, row: Record<string, unknown>) => {
            const name =
                ((row.product as Record<string, unknown> | undefined)?.name as string) ??
                (row.description as string) ?? "—";
            return <span style={{ fontWeight: 600 }}>{name}</span>;
        }},
        { key: 'quantity', label: 'الكمية', render: (_v: unknown, row: Record<string, unknown>) => String(row.quantity ?? "") },
        ...(TRACKS_DELIVERY ? [{
            key: 'delivery', label: 'التسليم',
            render: (_v: unknown, row: Record<string, unknown>) => {
                const qty = Number(row.quantity ?? 1);
                const delivered = Number(row.delivered_quantity ?? 0);
                const returned = Number(row.returned_quantity ?? 0);
                return <DeliveryProgressBar quantity={qty} deliveredQuantity={delivered} returnedQuantity={returned} />;
            },
        }] : []),
        { key: 'unit_price_ht', label: 'سعر HT', render: (_v: unknown, row: Record<string, unknown>) => (
            <MoneyCell value={row.unit_price_ht as number} />
        )},
        { key: 'discount', label: 'خصم', render: (_v: unknown, row: Record<string, unknown>) => {
            const disc = parseFloat(String(row.discount_percentage ?? 0));
            return disc > 0
                ? <span style={{ color: "var(--red)", fontWeight: 700 }}>-{disc}%</span>
                : <span style={{ color: "var(--t4)" }}>—</span>;
        }},
        { key: 'tva_rate', label: 'TVA%', render: (_v: unknown, row: Record<string, unknown>) => (
            <span style={{ color: "var(--t4)" }}>{String(row.tva_rate ?? "")}%</span>
        )},
        { key: 'total_ttc', label: 'الإجمالي TTC', render: (_v: unknown, row: Record<string, unknown>) => (
            <MoneyCell value={row.total_ttc as number} bold accent="var(--em)" />
        )},
    ];

    const tableData = lines.map((line, idx) => ({ ...line, _idx: idx + 1 }));

    return (
        <SimpleTable
            columns={simpleColumns}
            data={tableData}
            rowKey="_idx"
            emptyText="لا توجد أسطر"
        />
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
// ROW PERMISSIONS HELPER
// ════════════════════════════════════════════════════════════════════════════

function getRowPermissions(row: CommercialDocument, isReadOnly: boolean) {
    const isLocked    = !!row.is_locked;
    const isExported  = !!(row as unknown as Record<string, unknown>).is_exported_to_accounting;
    const status      = getDocStatus(row);
    const isCancelled = status === "cancelled";

    return {
        canEdit:   !isReadOnly && !isLocked && !isExported,
        canLock:   !isReadOnly && !isLocked && !isCancelled,
        canUnlock: !isReadOnly &&  isLocked && !isExported,
        canCancel: !isReadOnly && !isLocked && !isExported && !isCancelled,
        isLocked,
        isCancelled,
    };
}

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
                        {!isReadOnly && d && !(d as Record<string, unknown>).is_locked && (
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
    const navigate                           = useNavigate();
    const qc                                 = useQueryClient();
    const slug                               = useActiveSlug();
    const activeCompany                      = useActiveCompany();
    const companyInfo                        = useMemo(() => mapCompany(activeCompany), [activeCompany]);
    const { data: printTemplates = [] }      = usePrintTemplatesList();
    const { selectedYear, isReadOnly }       = useFiscalYear() as { selectedYear?: { id: number; name: string }; isReadOnly?: boolean };
    const { show: showToast, ToastContainer } = useToast();
    const { confirm, confirmDialogProps } = useConfirm();

    // ── Modal state ───────────────────────────────────────────────────────────
    type ModalMode = "add" | "edit" | "view" | "quick" | null;
    const [modal, setModal]           = useState<ModalMode>(null);
    const [viewDocId, setViewDocId]   = useState<number | null>(null);
    const [convertDocId, setConvertDocId]     = useState<number | null>(null);
    const [convertSourceCode, setConvertSourceCode] = useState('');
    const [convertSourceDate, setConvertSourceDate] = useState('');
    const [editDocFull, setEditDocFull] = useState<CommercialDocument | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // ── Cancel modal state ────────────────────────────────────────────────────
    const [cancelModal, setCancelModal] = useState<{ id: number; reason: string } | null>(null);

    // ── Send email modal state ────────────────────────────────────────────────
    const [mailModal, setMailModal] = useState<{
        id: number;
        documentNumber: string;
        partyName: string;
        partyEmail: string | null;
    } | null>(null);

    // ── Batch print ───────────────────────────────────────────────────────────
    const [batchPrintOpen, setBatchPrintOpen] = useState(false);
    const [batchDocs, setBatchDocs] = useState<CommercialDocument[]>([]);

    // ── Single-doc print preview ────────────────────────────────────────────
    const [printDocId, setPrintDocId] = useState<number | null>(null);
    const { data: printDoc } = useQuery({
        queryKey: ['print-doc', printDocId],
        queryFn: () => apiGet<CommercialDocument>(`/documents/${printDocId}`, {
            include: 'party,documentType,documentStatus,warehouse,lines,lines.product,lines.product_variant,payments,payments.payment_mode,totals',
        }),
        enabled: printDocId !== null,
    });

    // ── Server-side state ─────────────────────────────────────────────────────
    const [page, setPage]               = useState(1);
    const [perPage, setPerPage]         = useState(15);
    const [serverFilters, setServerFilters] = useState<Record<string, string>>({});
    const [multiSort, setMultiSort]     = useState<MultiSortState>([{ key: 'document_number', dir: 'desc' }]);

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
        if (!multiSort.length) return "-document_number";
        return multiSort.map(s => `${s.dir === "desc" ? "-" : ""}${s.key}`).join(",");
    }, [multiSort]);

    // ── Filter change ─────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((filters: Record<string, string>) => {
        const converted: Record<string, string> = {};

        // حقول النطاق (تاريخ / رقم) — DataTable يُرسل "min|max" → Backend يتوقع "min,max"
        const rangeFields = new Set([
            "document_date","due_date","total_ht","total_tva","total_ttc",
            "net_to_pay","total_discount","total_stamp","remaining_amount",
            "validated_at","created_at","updated_at",
        ]);

        // حقول العلاقات (dynamic-multiselect CSV) — Backend يُقسّمها بنفسه
        const csvRelationFields = new Set(["party.name","warehouse.name"]);

        for (const [key, val] of Object.entries(filters)) {
            // تخطى القيم الفارغة
            if (!val || val === "|") continue;

            if (rangeFields.has(key) && val.includes("|")) {
                // "min|max" → "min,max"
                const rangeVal = val.replaceAll("|", ",");
                if (rangeVal !== "," && rangeVal !== "") {
                    converted[key] = rangeVal;
                }
            } else if (csvRelationFields.has(key) && val.includes(",")) {
                // CSV من multiselect — نُرسله كما هو
                converted[key] = val;
            } else {
                converted[key] = val;
            }
        }
        setServerFilters(converted);
        setPage(1);
        const toSave = Object.fromEntries(
            Object.entries(converted).filter(([, v]) => v != null && v !== "")
        );
        saveColState({ activeFilters: toSave });
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
            include: "party,documentStatus,warehouse,validatedBy,user",
            sort: sortParam,
            per_page: perPage,
            page,
        };

        // نُضيف filter[document_type_id] فقط إذا كانت القيمة موجودة
        if (docType?.id != null)       params["filter[document_type_id]"] = docType.id;
        if (selectedYear?.id != null)  params["filter[fiscal_year_id]"]   = selectedYear.id;

        const filterMap: Record<string, string> = {
            search:                   "filter[search]",
            document_number:          "filter[document_number]",
            "party.name":             "filter[party.name]",
            "warehouse.name":         "filter[warehouse.name]",
            "document_status.name":   "filter[document_status.name]",
            document_date:            "filter[document_date]",
            due_date:                 "filter[due_date]",
            total_ht:                 "filter[total_ht]",
            total_tva:                "filter[total_tva]",
            total_ttc:                "filter[total_ttc]",
            net_to_pay:               "filter[net_to_pay]",
            total_discount:           "filter[total_discount]",
            total_stamp:              "filter[total_stamp]",
            remaining_amount:         "filter[remaining_amount]",
            reference:                "filter[reference]",
            notes:                    "filter[notes]",
            payment_terms:            "filter[payment_terms]",
            validated_at:             "filter[validated_at]",
            created_at:               "filter[created_at]",
            updated_at:               "filter[updated_at]",
            // ✅ إضافة: فلتر باسم المستخدم الذي اعتمد / أنشأ المستند
            validated_by:             "filter[validatedBy.name]",
            created_by:               "filter[user.name]",
        };
        for (const [fk, pk] of Object.entries(filterMap)) {
            if (serverFilters[fk]) params[pk] = serverFilters[fk];
        }
        return params;
    }, [docType?.id, selectedYear?.id, serverFilters, sortParam, perPage, page]);

    const { data: docsRaw, isLoading, isFetching } = useQuery({
        queryKey: tenantKeys.documents.byType(slug ?? "", typeCode ?? "", queryParams),
        queryFn: () => {
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

    // ── Approval batch check — single request for all visible rows ────────────
    const docIds = useMemo(() => items.map(d => d.id), [items]);
    const { data: approvalBatch } = useApprovalCheckBatch(docIds);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const lockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/lock`),
        onSuccess: () => { showToast("تم قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل القفل", "error"),
    });
    const unlockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/unlock`),
        onSuccess: () => { showToast("تم فتح قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل فتح القفل", "error"),
    });
    const cancelMut = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            apiPost(`/documents/${id}/cancel`, { cancellation_reason: reason }),
        onSuccess: () => { showToast("تم إلغاء المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل الإلغاء", "error"),
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
            key: "is_locked",
            header: "مقفل",
            exportHeader: "مقفل",
            width: 80,
            sortable: true,
            defaultHidden: false,
            filter: {
                type: "select" as const,
                options: [
                    { value: "1", label: "مقفل" },
                    { value: "0", label: "غير مقفل" },
                ],
            },
            accessor: (r: CommercialDocument) => r.is_locked ? "مقفل" : "—",
            render: (row: CommercialDocument) => {
                const locked     = !!row.is_locked;
                const isExported = !!(row as unknown as Record<string, unknown>).is_exported_to_accounting;
                return (
                    <span
                        title={
                            locked
                                ? isExported
                                    ? "مقفل ومُصدَّر — لا يمكن فتحه"
                                    : "مقفل — انقر مرتين لفتح القفل"
                                : "غير مقفل — انقر مرتين للقفل"
                        }
                        onDoubleClick={async () => {
                            if (isReadOnly) return;
                            if (locked) {
                                if (isExported) { showToast("لا يمكن فتح قفل مستند مُصدَّر للمحاسبة", "error"); return; }
                                if (await confirm("تأكيد فتح قفل هذا المستند؟")) unlockMut.mutate(row.id);
                            } else {
                                const status = getDocStatus(row);
                                if (status === "cancelled") { showToast("لا يمكن قفل مستند ملغى", "error"); return; }
                                if (await confirm("تأكيد قفل هذا المستند؟ لن يمكن تعديله بعد القفل.")) lockMut.mutate(row.id);
                            }
                        }}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            cursor: isReadOnly ? "default" : "pointer",
                            padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            color:      locked ? "var(--orange)" : "var(--t4)",
                            background: locked ? "color-mix(in srgb, var(--orange) 10%, transparent)" : "transparent",
                            border:     locked ? "1px solid color-mix(in srgb, var(--orange) 25%, transparent)" : "none",
                            userSelect: "none",
                        }}
                    >
                        <i className={`ti ${locked ? "ti-lock" : "ti-lock-open"}`} style={{ fontSize: 12 }} aria-hidden="true" />
                        {locked ? "مقفل" : "—"}
                    </span>
                );
            },
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
            filter: {
                type: "dynamic-multiselect" as const,
                fetchOptions: async () => {
                    const res = await apiGet<{ data: { name?: string }[] }>('/parties', { per_page: 9999 });
                    return [...new Set((res?.data ?? []).map(p => p.name).filter(Boolean))] as string[];
                },
            },
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
            filter: {
                type: "dynamic-multiselect" as const,
                fetchOptions: async () => {
                    const res = await apiGet<{ data: { name?: string }[] }>('/warehouses', { per_page: 9999 });
                    return [...new Set((res?.data ?? []).map(w => w.name).filter(Boolean))] as string[];
                },
            },
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
            render: row => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusBadge status={getDocStatus(row)} />
                    <ApprovalStatusBadge documentId={row.id} statusSlug={getDocStatus(row)} approvalCheck={approvalBatch?.[row.id]} />
                </div>
            ),
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
            key: "paid_amount",
            header: "المدفوع",
            exportHeader: "المبلغ المدفوع (دج)",
            width: 130,
            align: "end",
            sortable: true,
            filter: { type: "number" },
            accessor: r => Number((r as unknown as Record<string,unknown>).paid_amount ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const paid = Number((row as unknown as Record<string,unknown>).paid_amount ?? 0);
                return paid > 0
                    ? <MoneyCell value={paid} accent="var(--em)" />
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
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

        // ════════════════════════════════════════════════════════════════════
        // أعمدة إضافية — مخفية افتراضياً (defaultHidden: true)
        // يُظهرها المستخدم حسب الحاجة عبر قائمة الأعمدة
        // ════════════════════════════════════════════════════════════════════

        // ── مالية ────────────────────────────────────────────────────────────

        {
            key: "total_discount",
            header: "الخصم",
            exportHeader: "الخصم الإجمالي (دج)",
            width: 120,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).total_discount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const v = Number((row as unknown as Record<string,unknown>).total_discount ?? 0);
                if (!v) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
                return <MoneyCell value={v} accent="var(--red)" />;
            },
        },
        {
            key: "total_stamp",
            header: "الطابع",
            exportHeader: "الطابع الجبائي (دج)",
            width: 110,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).total_stamp ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => <MoneyCell value={(row as unknown as Record<string,unknown>).total_stamp as number} />,
        },
        {
            key: "remaining_amount",
            header: "المتبقي",
            exportHeader: "المبلغ المتبقي (دج)",
            width: 130,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).remaining_amount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const rem = Number((row as unknown as Record<string,unknown>).remaining_amount ?? 0);
                if (rem <= 0.001) return <span style={{ color: "var(--em)", fontSize: 12, fontWeight: 700 }}>مسدد ✓</span>;
                return <MoneyCell value={rem} accent="var(--red)" bold />;
            },
        },

        // ── مرجعية ───────────────────────────────────────────────────────────

        {
            key: "reference",
            header: "المرجع",
            exportHeader: "رقم المرجع (BL/BC)",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).reference ?? ""),
            render: (row: CommercialDocument) => {
                const ref = String((row as unknown as Record<string,unknown>).reference ?? "");
                return ref
                    ? <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--t3)", background: "var(--bg3)", padding: "2px 6px", borderRadius: 4 }}>{ref}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "notes",
            header: "ملاحظات",
            exportHeader: "الملاحظات",
            width: 200,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).notes ?? ""),
            render: (row: CommercialDocument) => {
                const notes = String((row as unknown as Record<string,unknown>).notes ?? "");
                return notes
                    ? <span style={{ fontSize: 12, color: "var(--t2)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }} title={notes}>{notes}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "payment_terms",
            header: "شروط الدفع",
            exportHeader: "شروط الدفع",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).payment_terms ?? ""),
            render: (row: CommercialDocument) => {
                const pt = String((row as unknown as Record<string,unknown>).payment_terms ?? "");
                return pt
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{pt}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── رقابة وتتبع ───────────────────────────────────────────────────────

        {
            key: "validated_at",
            header: "تاريخ الاعتماد",
            exportHeader: "تاريخ الاعتماد",
            width: 130,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).validated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).validated_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--em)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "validated_by",
            header: "اعتمد بواسطة",
            exportHeader: "اعتمد بواسطة",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: {
                type: "dynamic-multiselect" as const,
                fetchOptions: async () => {
                    const res = await apiGet<{ data: { name?: string }[] }>('/users', { per_page: 9999 });
                    return [...new Set((res?.data ?? []).map(u => u.name).filter(Boolean))] as string[];
                },
            },
            // validated_by في DB = integer FK — الـ Resource يُرسل العلاقة بـ camelCase
            accessor: (r: CommercialDocument) => {
                const vb = (r as unknown as Record<string,unknown>).validatedBy as Record<string,unknown> | null | undefined;
                return String(vb?.name ?? vb?.username ?? "");
            },
            render: (row: CommercialDocument) => {
                const vb = (row as unknown as Record<string,unknown>).validatedBy as Record<string,unknown> | null | undefined;
                const name = String(vb?.name ?? vb?.username ?? "");
                return name ? <UserChip name={name} color="var(--em)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_by",
            header: "أنشأه",
            exportHeader: "أنشأه",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: {
                type: "dynamic-multiselect" as const,
                fetchOptions: async () => {
                    const res = await apiGet<{ data: { name?: string }[] }>('/users', { per_page: 9999 });
                    return [...new Set((res?.data ?? []).map(u => u.name).filter(Boolean))] as string[];
                },
            },
            // المنشئ = user_id في DB → العلاقة هي user() وليس created_by
            accessor: (r: CommercialDocument) => {
                const u = (r as unknown as Record<string,unknown>).user as Record<string,unknown> | null | undefined;
                return String(u?.name ?? u?.username ?? "");
            },
            render: (row: CommercialDocument) => {
                const u = (row as unknown as Record<string,unknown>).user as Record<string,unknown> | null | undefined;
                const name = String(u?.name ?? u?.username ?? "");
                return name ? <UserChip name={name} color="var(--blue)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_at",
            header: "تاريخ الإنشاء",
            exportHeader: "تاريخ الإنشاء",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).created_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).created_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "updated_at",
            header: "آخر تعديل",
            exportHeader: "آخر تعديل",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).updated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).updated_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── التسليم (لأوامر الزبون BCC خاصة) ────────────────────────────────
        {
            key: "delivery_date",
            header: "تاريخ التسليم",
            exportHeader: "تاريخ التسليم",
            width: 120,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).delivery_date ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).delivery_date as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
    ], [isPurch, opColor]);

    // ── إدارة الأعمدة المخفية — مُفوَّضة بالكامل لـ DataTable الداخلي ──────────
    // DataTable يتولى: قائمة الأعمدة + toggle + عرض القائمة
    // هنا نحتفظ فقط بـ state للاستخدام في headerActions و contextMenu

    const initialHiddenKeys = useMemo(
        () => initialSnapshot?.hiddenColumns ?? allColumns.filter(c => c.defaultHidden).map(c => c.key),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [], // يُحسب مرة واحدة عند الـ mount فقط
    );

    const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(initialHiddenKeys);

    // onHiddenColumnsChange الجديدة: تستقبل القائمة الكاملة دائماً (allHidden)
    // سواء كان toggle فردي أو batch (إخفاء الكل / تطبيق view)
    const handleHiddenColumnsChange = useCallback(
        (_key: string, _willBeHidden: boolean, allHidden: string[]) => {
            setHiddenColumnKeys(allHidden);
            saveColState({ hiddenColumns: allHidden });
        },
        [saveColState],
    );

    // Set سريع للبحث في contextMenu
    const hiddenColumnsSet = useMemo(() => new Set(hiddenColumnKeys), [hiddenColumnKeys]);

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
    // CONTEXT MENU ITEMS
    // ════════════════════════════════════════════════════════════════════════

    const contextMenuItems = useCallback((ctx: ContextMenuContext): ContextMenuItem[] => {
        const menuItems: ContextMenuItem[] = [];

        // ─── خلية ───────────────────────────────────────────────────────────
        if (ctx.type === "cell") {
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
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertSourceDate(String(row.document_date ?? ''));
                        setConvertDocId(row.id);
                    },
                },
            );
        }

        // ─── صف ─────────────────────────────────────────────────────────────
        if (ctx.type === "row") {
            const row = ctx.row as CommercialDocument | undefined;
            const { canEdit, canLock, canUnlock, canCancel } = row
                ? getRowPermissions(row, !!isReadOnly)
                : { canEdit: false, canLock: false, canUnlock: false, canCancel: false };

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
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertSourceDate(String(row.document_date ?? ''));
                        setConvertDocId(row.id);
                    },
                },
            );

            const editActions: ContextMenuItem[] = [];

            if (canEdit) {
                editActions.push({
                    label: "تعديل المستند",
                    icon: "pencil",
                    onClick: () => { if (row) navigate(typeCode === 'POS' ? `/pos?edit=${row.id}` : `/documents/${typeCode}/${row.id}/edit`); },
                });
            }
            if (!isReadOnly && row) {
                const party = row.party as Record<string, unknown> | undefined;
                editActions.push({
                    label: "إرسال بالبريد",
                    icon: "mail",
                    onClick: () => {
                        setMailModal({
                            id: row.id,
                            documentNumber: String(row.document_number ?? `#${row.id}`),
                            partyName: String(party?.name ?? ''),
                            partyEmail: (party?.email as string) ?? null,
                        });
                    },
                });
            }
            if (canLock) {
                editActions.push({
                    label: "قفل المستند",
                    icon: "lock",
                    onClick: async () => {
                        if (row && await confirm("تأكيد قفل هذا المستند؟")) lockMut.mutate(row.id);
                    },
                });
            }
            if (canUnlock) {
                editActions.push({
                    label: "فتح قفل المستند",
                    icon: "lock-open",
                    onClick: async () => {
                        if (row && await confirm("تأكيد فتح قفل هذا المستند؟")) unlockMut.mutate(row.id);
                    },
                });
            }
            if (canCancel) {
                editActions.push({
                    label: "إلغاء المستند",
                    icon: "ban",
                    onClick: () => {
                        if (!row) return;
                        setCancelModal({ id: row.id, reason: '' });
                    },
                });
            }

            if (editActions.length > 0) {
                menuItems.push({ label: "", divider: true, onClick: () => {} }, ...editActions);
            }
        }

        // ─── رأس العمود ─────────────────────────────────────────────────────
        if (ctx.type === "header") {
            const colKey   = ctx.colKey;
            const isHidden = colKey ? hiddenColumnsSet.has(colKey) : false;
            menuItems.push({
                label:    isHidden ? "إظهار العمود" : "إخفاء العمود",
                icon:     isHidden ? "eye" : "eye-off",
                disabled: !colKey,
                onClick: () => {
                    if (colKey) {
                        const updated = isHidden
                            ? hiddenColumnKeys.filter(k => k !== colKey)
                            : [...hiddenColumnKeys, colKey];
                        handleHiddenColumnsChange(colKey, !isHidden, updated);
                        showToast(isHidden ? "تم إظهار العمود" : "تم إخفاء العمود", "info");
                    }
                },
            });
        }

        // ─── جدول — قفل/فتح جماعي + إرسال جماعي للموافقة ──────────────────
        if (ctx.type === "table" && !isReadOnly) {
            const lockable   = items.filter(r => getRowPermissions(r, false).canLock);
            const unlockable = items.filter(r => getRowPermissions(r, false).canUnlock);

            if (lockable.length > 0) {
                menuItems.push({
                    label: `قفل الكل (${lockable.length} مستند)`,
                    icon: "lock",
                    onClick: async () => {
                        if (!await confirm(`تأكيد قفل ${lockable.length} مستند في هذه الصفحة؟`)) return;
                        lockable.reduce(
                            (chain, doc) => chain.then(() => lockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => showToast(`تم قفل ${lockable.length} مستند`, "success"));
                    },
                });
            }

            if (unlockable.length > 0) {
                menuItems.push({
                    label: `فتح قفل الكل (${unlockable.length} مستند)`,
                    icon: "lock-open",
                    onClick: async () => {
                        if (!await confirm(`تأكيد فتح قفل ${unlockable.length} مستند في هذه الصفحة؟`)) return;
                        unlockable.reduce(
                            (chain, doc) => chain.then(() => unlockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => showToast(`تم فتح قفل ${unlockable.length} مستند`, "success"));
                    },
                });
            }
        }

        return menuItems;
    }, [hiddenColumnsSet, hiddenColumnKeys, handleHiddenColumnsChange, isReadOnly, lockMut, unlockMut, cancelMut, items, showToast, navigate, typeCode]);

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
        const { canEdit, canLock, canUnlock, canCancel } = getRowPermissions(row, !!isReadOnly);

        const handleCancel = () => {
            setCancelModal({ id: row.id, reason: '' });
        };

        const rowStatus = getDocStatus(row);

        return (
            <div style={{ display: "flex", gap: 3, justifyContent: "center", alignItems: "center" }}>
                {/* عرض — دائماً متاح */}
                <ActionBtn icon="ti-eye" title="عرض" onClick={() => { setViewDocId(row.id); setModal("view"); }} />

                {/* طباعة */}
                <ActionBtn icon="ti-printer" title="طباعة" onClick={() => setPrintDocId(row.id)} />

                {/* تعديل — !is_locked && !is_exported */}
                    {canEdit && (
                    <ActionBtn
                        icon={loadingEdit ? "ti-loader-2" : "ti-pencil"}
                        title="تعديل" color="var(--blue)" disabled={loadingEdit}
                        onClick={() => navigate(typeCode === 'POS' ? `/pos?edit=${row.id}` : `/documents/${typeCode}/${row.id}/edit`)}
                    />
                )}

                {/* إرسال بالبريد */}
                {!isReadOnly && (
                    <ActionBtn
                        icon="ti-mail" title="إرسال بالبريد" color="var(--blue)"
                        onClick={() => {
                            const party = row.party as Record<string, unknown> | undefined;
                            setMailModal({
                                id: row.id,
                                documentNumber: String(row.document_number ?? `#${row.id}`),
                                partyName: String(party?.name ?? ''),
                                partyEmail: (party?.email as string) ?? null,
                            });
                        }}
                    />
                )}

                {/* قفل — غير مقفل + غير ملغى */}
                {canLock && (
                    <ActionBtn
                        icon="ti-lock" title="قفل المستند" color="var(--orange)"
                        disabled={lockMut.isPending}
                        onClick={async () => {
                            if (await confirm("تأكيد قفل هذا المستند؟ لن يمكن تعديله بعد القفل."))
                                lockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* فتح القفل — مقفل + غير مُصدَّر */}
                {canUnlock && (
                    <ActionBtn
                        icon="ti-lock-open" title="فتح القفل" color="var(--blue)"
                        disabled={unlockMut.isPending}
                        onClick={async () => {
                            if (await confirm("تأكيد فتح قفل هذا المستند؟"))
                                unlockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* إلغاء */}
                {canCancel && (
                    <ActionBtn
                        icon="ti-ban" title="إلغاء" color="var(--red)"
                        disabled={cancelMut.isPending}
                        onClick={handleCancel}
                    />
                )}

                {/* موافقة / رفض */}
                <ApprovalActions
                    documentId={row.id}
                    statusSlug={rowStatus}
                    netToPay={Number((row as unknown as Record<string, unknown>).net_to_pay ?? row.total_ttc ?? 0)}
                    approvalCheck={approvalBatch?.[row.id]}
                />
            </div>
        );
    }, [isReadOnly, loadingEdit, lockMut, unlockMut, cancelMut, navigate, typeCode, setPrintDocId]);

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
            {hiddenColumnKeys.length > 0 && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-eye-off" style={{ fontSize: 10 }} aria-hidden="true" />
                    {hiddenColumnKeys.length} مخفي
                </span>
            )}
            {/* زر إعادة ضبط layout — يظهر فقط عند وجود snapshot محفوظ */}
            {initialSnapshot && (
                <button
                    title="إعادة ضبط تخطيط الأعمدة (الترتيب، العرض، المخفي، الفلاتر)"
                    onClick={async () => {
                        if (await confirm("إعادة ضبط تخطيط الجدول للإعدادات الافتراضية؟")) {
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
                <button onClick={() => navigate(`/documents/${typeCode}/new`)} style={{ height: 32, padding: "0 16px", borderRadius: 8, border: "none", background: opColor, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px color-mix(in srgb, ${opColor} 30%, transparent)`, fontFamily: "inherit" }}>
                    <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
                    مستند جديد
                </button>
            )}
        </div>
    ), [isFetching, isLoading, isReadOnly, isSalable, opColor, hiddenColumnKeys.length, initialSnapshot, resetColState, navigate, typeCode]);

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
    const isExpandable  = useCallback((_row: CommercialDocument) => true, []);
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


            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0, flex: 1, direction: "rtl", fontFamily: "Tajawal, sans-serif" }}>

                {/* Summary cards */}
                {items.length > 0 && <SummaryCards items={items} opColor={opColor} />}

                {/* DataTable v10.2 — محاطة بـ ErrorBoundary لمنع أي خطأ من إسقاط الصفحة */}
                <div style={{ background: "var(--bg1)", border: "1px solid var(--b1)", borderRadius: "var(--r3)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)", flex: 1 }}>
                    <DataTableErrorBoundary>
                    <DataTable<CommercialDocument>
                        data={items}
                        columns={allColumns}
                        columnDefs={allColumns}
                        hiddenColumnKeys={hiddenColumnKeys}         // الأعمدة المخفية الأولية
                        onHiddenColumnsChange={handleHiddenColumnsChange}  // callback لحفظ التغييرات
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
                            setServerFilters(prev => { const n = { ...prev }; if (q) n.search = q; else delete n.search; return n; });
                            setPage(1);
                        }}
                        allData={items as unknown as Record<string, unknown>[]}

                        // ── Selection + Batch Print ──────────────────────
                        selectable
                        bulkActions={(selectedRows: CommercialDocument[], _clearSelection: () => void) => (
                            <button
                                onClick={() => { setBatchDocs(selectedRows as CommercialDocument[]); setBatchPrintOpen(true); }}
                                className="dt-bulk-btn"
                                type="button"
                            >
                                <i className="ti ti-printer" />
                                طباعة بالجملة ({selectedRows.length})
                            </button>
                        )}

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
                        fetchAllForExport={async () => {
                            const total = Number(meta.total ?? 0);
                            if (total === 0) return [];
                            const { page: _p, per_page: _pp, ...params } = queryParams;
                            const res = await apiGet<{ data: CommercialDocument[] }>("/documents", {
                                ...params,
                                per_page: Math.min(total, 10000),
                                page: 1,
                            });
                            return Array.isArray(res.data) ? res.data : [];
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
                        if (doc) {
                          if (typeCode === 'POS') { closeModal(); navigate(`/pos?edit=${viewDocId}`); }
                          else { closeModal(); openEditModal(doc); }
                        }
                    }}
                    isReadOnly={!!isReadOnly}
                />
            )}

            {convertDocId != null && (
                <ConvertDocumentModal
                    isOpen
                    onClose={() => setConvertDocId(null)}
                    onDone={() => { invalidateDocs(); showToast('تم تحويل المستند بنجاح', 'success'); }}
                    documentId={convertDocId}
                    sourceCode={convertSourceCode}
                    sourceDate={convertSourceDate}
                />
            )}

            {/* إلغاء المستند — مودال مع textarea */}
            {cancelModal && (
                <Modal
                    open={true}
                    onClose={() => setCancelModal(null)}
                    size="sm"
                    title="إلغاء المستند"
                    footer={
                        <>
                            <Button onClick={() => setCancelModal(null)} disabled={cancelMut.isPending}>
                                إلغاء
                            </Button>
                            <Button
                                variant="danger"
                                icon={<i className="ti ti-ban" />}
                                onClick={() => {
                                    if (!cancelModal.reason.trim()) return;
                                    cancelMut.mutate({ id: cancelModal.id, reason: cancelModal.reason.trim() });
                                    setCancelModal(null);
                                }}
                                disabled={cancelMut.isPending || !cancelModal.reason.trim()}
                            >
                                {cancelMut.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                            </Button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                        <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
                            سيتم إلغاء هذا المستند. لا يمكن التراجع عن هذا الإجراء.
                        </div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
                            سبب الإلغاء <span style={{ color: 'var(--red)' }}>*</span>
                        </label>
                        <textarea
                            autoFocus
                            style={{
                                width: '100%', minHeight: 80, resize: 'vertical',
                                padding: '8px 10px', borderRadius: 'var(--r2)',
                                border: `1px solid ${cancelModal.reason.trim() ? 'var(--b3)' : 'var(--red)'}`,
                                background: 'var(--bg1)', color: 'var(--t1)',
                                fontSize: 13, fontFamily: 'inherit', outline: 'none',
                            }}
                            value={cancelModal.reason}
                            onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                            placeholder="اذكر سبب الإلغاء..."
                        />
                    </div>
                </Modal>
            )}

            <BatchPrintModal
                open={batchPrintOpen}
                onClose={() => setBatchPrintOpen(false)}
                documents={batchDocs}
            />

            {/* Single-doc print preview */}
            {printDocId !== null && companyInfo && (
                <Suspense fallback={null}>
                    <TemplatePrintModal
                        open={!!printDoc}
                        onClose={() => { setPrintDocId(null); }}
                        document={printDoc as any}
                        company={companyInfo as any}
                        templates={printTemplates}
                        docTypeCode={printDoc?.document_type?.code ?? typeCode ?? 'FV'}
                        prevBalance={(printDoc as any)?.balance_data?.previous_balance}
                        newBalance={(printDoc as any)?.balance_data?.new_balance}
                    />
                </Suspense>
            )}

            {/* Send email modal */}
            {mailModal && (
                <SendDocumentMailModal
                    documentId={mailModal.id}
                    documentNumber={mailModal.documentNumber}
                    partyName={mailModal.partyName}
                    partyEmail={mailModal.partyEmail}
                    onClose={() => setMailModal(null)}
                />
            )}

            <ToastContainer />
            <ConfirmDialog {...confirmDialogProps} />
        </>
    );
}
