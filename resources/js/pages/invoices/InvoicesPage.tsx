// pages/invoices/InvoicesPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";

// ✅ استيراد الـ Hooks الصحيحة للمستندات والفواتير
import {
    useDocuments as useInvoices,
    useDocumentMutations,
    useDocument,
} from "@/lib/api/endpoints/documents";

// ✅ استيراد الـ Hooks الصحيحة للزبائن والزبائن
import { useParties as useCustomers } from "@/lib/api/endpoints/parties";

// ✅ تصحيح الاسم: useDocumentTypes بدلاً من useDocumentTypes
import {
    useWarehouses,
    usePaymentModes,
    useDocumentTypes,
} from "@/lib/api/endpoints/lookups";
import { useFiscalYear } from "@/context/FiscalYearContext";

import { useModal } from "@/hooks/useModal";
import { useConfirm } from "@/hooks/useConfirm";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import KpiCard from "@/components/ui/KpiCard";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import SimpleTable from "@/components/ui/SimpleTable";
import type { SimpleColumn } from "@/components/ui/SimpleTable";
import type {
    CommercialDocument,
    CommercialDocumentLine,
    Party,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/core/client";
import { useActiveSlug, useActiveCompany } from "@/lib/store/appStore";
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));
import { ReturnDocumentModal } from '@/pages/documents/components/ReturnDocumentModal';

// ── Status helpers ─────────────────────────────────
const STATUS_BADGE: Record<
    string,
    { label: string; variant: Parameters<typeof Badge>[0]["variant"] }
> = {
    draft: { label: "مسودة", variant: "gray" },
    validated: { label: "معلقة", variant: "warning" },
    partial: { label: "جزئية", variant: "info" },
    paid: { label: "مدفوعة", variant: "success" },
    cancelled: { label: "ملغاة", variant: "danger" },
    locked: { label: "مقفولة", variant: "purple" },
};

const _PAY_ICON: Record<string, string> = {
    cash: "💵",
    cib: "💳",
    ccp: "📮",
    bank: "🏦",
    credit: "📋",
    mixed: "✂️",
};

export default function InvoicesPage() {
    const { selectedYear } = useFiscalYear();
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, per_page: 20, fiscal_year_id: selectedYear?.id });
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [viewingId, setViewingId] = useState<number | null>(null);

  const detail   = useModal();
  const newInv   = useModal();

  // تزامن السنة المالية المحددة مع الفلاتر
  useEffect(() => {
    setFilters(prev => ({ ...prev, page: 1, fiscal_year_id: selectedYear?.id }));
  }, [selectedYear?.id]);

  const STATUS_MAP: Record<string, string> = {
    paid:      'paid',
    validated: 'validated',
    partial:   'partially_paid',
    cancelled: 'cancelled',
  };

  // تحويل الفلاتر إلى format الباكند
  const apiFilters = useMemo(() => {
    const params: Record<string, unknown> = { ...filters };
    if (params.fiscal_year_id) {
      params['filter[fiscal_year_id]'] = params.fiscal_year_id;
      delete params.fiscal_year_id;
    }
    if (params.status) {
      params['filter[document_status.name]'] = STATUS_MAP[params.status as string] || params.status;
      delete params.status;
    } else {
      // استبعاد المرتجعات من القائمة الافتراضية
      params['filter[document_status.name]'] = 'draft,pending,validated,partially_paid,paid,overdue,cancelled';
    }
    return params;
  }, [filters]);

  const { data, isLoading, isFetching } = useInvoices(apiFilters as any);
  const { data: customers } = useCustomers({ per_page: 200, type: 'client' }); // ✅ تمرير النوع كزبون

  const invoices = data?.data ?? [];
  const meta     = data?.meta;

  // ✅ استخراج ميثود الحفظ والإلغاء والاعتماد من الميوتيشن المركزي للمستندات
  const documentMutations = useDocumentMutations();
  const validateMut = { mutate: (id: number) => documentMutations.validate?.mutate(id) };
  const cancelMut   = { mutate: (id: number) => documentMutations.cancel?.mutate({ id, reason: "حذف من قائمة الفواتير" }) };

    const activeCompany = useActiveCompany();
    const companyInfo = useMemo(() => mapCompany(activeCompany), [activeCompany]);
    const { data: printTemplates = [] } = usePrintTemplatesList();

    // ── Single-doc print preview ──────────────────────────────────
    const [printDocId, setPrintDocId] = useState<number | null>(null);
    const { data: printDoc } = useQuery({
        queryKey: ['print-doc-inv', printDocId],
        queryFn: () => apiGet<CommercialDocument>(`/documents/${printDocId}`, {
            include: 'party,documentType,documentStatus,warehouse,lines,lines.product,lines.product_variant,payments,payments.payment_mode,totals',
        }),
        enabled: printDocId !== null,
    });

    const { confirm, confirmDialogProps } = useConfirm();

    // ── Return (مرتجع) ─────────────────────────────────────────────
    const [showReturnModal, setShowReturnModal] = useState(false);
    const { data: returnDoc } = useQuery({
        queryKey: ['return-doc-inv', viewingId],
        queryFn: () => apiGet<CommercialDocument>(`/documents/${viewingId}`, {
            include: 'party,documentType,documentStatus,warehouse,lines,lines.product,lines.product_variant,payments,payments.payment_mode,totals',
        }),
        enabled: showReturnModal && viewingId !== null,
    });

    // ── Selection ──────────────────────────────────
    const toggleSelect = useCallback((id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(
        (checked: boolean) => {
            setSelected(
                checked ? new Set(invoices.map((i) => i.id)) : new Set(),
            );
        },
        [invoices],
    );

    // ── Open detail ────────────────────────────────
    const openDetail = (inv: CommercialDocument) => {
        setViewingId(inv.id);
        detail.openModal();
    };

    return (
        <div className="page on" id="p-invoices">
            <PageHeader
                title="الفواتير"
                subtitle={`إدارة فواتير البيع — ${meta?.total ?? "..."} فاتورة`}
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-table" />}>
                            Excel
                        </Button>
                        <Button
                            size="sm"
                            icon={<i className="ti ti-printer" />}
                        >
                            طباعة
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={<i className="ti ti-plus" />}
                            onClick={newInv.openModal}
                        >
                            فاتورة جديدة
                        </Button>
                    </>
                }
            />

            {/* KPIs */}
            <div
                className="kpis"
                style={{
                    gridTemplateColumns: "repeat(4,1fr)",
                    marginBottom: 16,
                }}
            >
                <KpiCard
                    variant="green"
                    icon="ti-circle-check"
                    label="مدفوعة"
                    value="1,248,400"
                    unit="دج"
                    sub="318 فاتورة"
                />
                <KpiCard
                    variant="gold"
                    icon="ti-clock"
                    label="معلقة وجزئية"
                    value="384,700"
                    unit="دج"
                    sub="16 فاتورة"
                />
                <KpiCard
                    variant="red"
                    icon="ti-ban"
                    label="ملغاة"
                    value="8"
                    sub="قيمة: 24,500 دج"
                />
                <KpiCard
                    variant="blue"
                    icon="ti-calculator"
                    label="TVA محصّلة"
                    value="237,196"
                    unit="دج"
                    sub="G50 — 20 ماي"
                />
            </div>

            {/* Filters */}
            <div className="filters">
                <div
                    className="srch"
                    style={{ display: "flex", flex: 1, minWidth: 200 }}
                >
                    <span className="srch-ic ic ic-xs">
                        <i className="ti ti-search" />
                    </span>
                    <input
                        type="text"
                        placeholder="ابحث برقم الفاتورة، اسم الزبون..."
                        style={{ width: "100%" }}
                        onChange={(e) =>
                            setFilters((f) => ({
                                ...f,
                                search: e.target.value || undefined,
                                page: 1,
                            }))
                        }
                    />
                </div>
                <select
                    style={{ width: 150 }}
                    onChange={(e) =>
                        setFilters((f) => ({
                            ...f,
                            status: e.target.value || undefined,
                            page: 1,
                        }))
                    }
                >
                    <option value="">كل الحالات</option>
                    <option value="paid">مدفوعة</option>
                    <option value="validated">معلقة</option>
                    <option value="partial">جزئية</option>
                    <option value="cancelled">ملغاة</option>
                </select>
                <select
                    style={{ width: 150 }}
                    onChange={(e) =>
                        setFilters((f) => ({
                            ...f,
                            party_id: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            page: 1,
                        }))
                    }
                >
                    <option value="">كل الزبائن</option>
                    {customers?.data.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    style={{
                        padding: "7px 10px",
                        borderRadius: "var(--r2)",
                        border: "1px solid var(--b3)",
                        background: "var(--bg3)",
                        color: "var(--t1)",
                        fontSize: 12,
                    }}
                    onChange={(e) =>
                        setFilters((f) => ({
                            ...f,
                            date_from: e.target.value || undefined,
                            page: 1,
                        }))
                    }
                />
            </div>

            {/* Table */}
            <Card noHeader style={{ padding: 0 }}>
                {/* Bulk actions bar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--b1)",
                        background: "var(--bg3)",
                        borderRadius: "var(--r3) var(--r3) 0 0",
                    }}
                >
                    <input
                        type="checkbox"
                        style={{ width: "auto", cursor: "pointer" }}
                        checked={
                            selected.size === invoices.length &&
                            invoices.length > 0
                        }
                        onChange={(e) => toggleAll(e.target.checked)}
                    />
                    <span style={{ fontSize: 12, color: "var(--t4)" }}>
                        {selected.size > 0
                            ? `${selected.size} محدد`
                            : "تحديد الكل"}
                    </span>
                    {isFetching && (
                        <span
                            style={{
                                fontSize: 11,
                                color: "var(--t4)",
                                marginRight: 8,
                            }}
                        >
                            <i className="ti ti-loader" /> جاري التحديث...
                        </span>
                    )}
                    <div
                        style={{
                            marginRight: "auto",
                            display: "flex",
                            gap: 6,
                            opacity: selected.size > 0 ? 1 : 0.4,
                            pointerEvents: selected.size > 0 ? "all" : "none",
                        }}
                    >
                        <Button
                            size="xs"
                            icon={<i className="ti ti-printer" />}
                        >
                            طباعة
                        </Button>
                        <Button
                            size="xs"
                            variant="danger"
                            icon={<i className="ti ti-ban" />}
                        >
                            إلغاء
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="tw">
                        <div className="empty">
                            <div className="empty-ic">
                                <i className="ti ti-loader" />
                            </div>
                            <div className="empty-tx">جاري التحميل...</div>
                        </div>
                    </div>
                ) : invoices.length === 0 ? (
                        <EmptyState
                            icon="ti-file-invoice"
                            text="لا توجد فواتير"
                            sub="أنشئ فاتورتك الأولى"
                            action={
                                <Button
                                    variant="primary"
                                    onClick={newInv.openModal}
                                >
                                    فاتورة جديدة
                                </Button>
                            }
                        />
                    ) : (
                        <SimpleTable
                            columns={[
                                {
                                    key: "_select",
                                    label: "",
                                    render: (_v, row) => {
                                        const inv = row as unknown as CommercialDocument;
                                        return (
                                            <input
                                                type="checkbox"
                                                style={{
                                                    width: "auto",
                                                    cursor: "pointer",
                                                }}
                                                checked={selected.has(inv.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelect(inv.id);
                                                }}
                                            />
                                        );
                                    },
                                },
                                {
                                    key: "document_number",
                                    label: "رقم الفاتورة",
                                    className: "m",
                                },
                                {
                                    key: "party",
                                    label: "الزبون",
                                    render: (_v, row) => {
                                        const inv = row as unknown as CommercialDocument;
                                        return (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 7,
                                                }}
                                            >
                                                <Avatar
                                                    initials={
                                                        inv.party
                                                            ?.name?.[0] ??
                                                        "?"
                                                    }
                                                    color={1}
                                                    size={26}
                                                />
                                                <div>
                                                    <div className="s">
                                                        {inv.party?.name ??
                                                            "عابر"}
                                                    </div>
                                                    {(inv.party?.balance ??
                                                        0) > 0 && (
                                                        <div
                                                            style={{
                                                                fontSize: 10,
                                                                color: "var(--red)",
                                                            }}
                                                        >
                                                            ⚠️ دين{" "}
                                                            {inv.party!.balance!.toLocaleString(
                                                                "fr-DZ",
                                                            )}{" "}
                                                            دج
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    },
                                },
                                {
                                    key: "total_ht",
                                    label: "HT",
                                    render: (_v, row) => (
                                        <span style={{ color: "var(--t3)" }}>
                                            {(row as unknown as CommercialDocument).total_ht.toLocaleString(
                                                "fr-DZ",
                                                {
                                                    maximumFractionDigits: 0,
                                                },
                                            )}{" "}
                                            دج
                                        </span>
                                    ),
                                },
                                {
                                    key: "total_tva",
                                    label: "TVA",
                                    className: "m",
                                    render: (_v, row) => (
                                        <span style={{ color: "var(--t4)" }}>
                                            {(row as unknown as CommercialDocument).total_tva.toLocaleString(
                                                "fr-DZ",
                                                {
                                                    maximumFractionDigits: 0,
                                                },
                                            )}{" "}
                                            دج
                                        </span>
                                    ),
                                },
                                {
                                    key: "total_ttc",
                                    label: "TTC",
                                    className: "e",
                                    render: (_v, row) =>
                                        (row as unknown as CommercialDocument).total_ttc.toLocaleString(
                                            "fr-DZ",
                                            {
                                                maximumFractionDigits: 0,
                                            },
                                        ) + " دج",
                                },
                                {
                                    key: "paid_amount",
                                    label: "المدفوع",
                                    className: "e",
                                    render: (_v, row) =>
                                        (row as unknown as CommercialDocument).paid_amount.toLocaleString(
                                            "fr-DZ",
                                            {
                                                maximumFractionDigits: 0,
                                            },
                                        ) + " دج",
                                },
                                {
                                    key: "remaining_amount",
                                    label: "الرصيد",
                                    render: (_v, row) => {
                                        const inv = row as unknown as CommercialDocument;
                                        const hasBalance = inv.remaining_amount > 0;
                                        return (
                                            <span
                                                className={hasBalance ? "r" : ""}
                                                style={{
                                                    color: hasBalance
                                                        ? undefined
                                                        : "var(--t4)",
                                                }}
                                            >
                                                {hasBalance
                                                    ? `${inv.remaining_amount.toLocaleString("fr-DZ", { maximumFractionDigits: 0 })} دج`
                                                    : "—"}
                                            </span>
                                        );
                                    },
                                },
                                {
                                    key: "status",
                                    label: "الحالة",
                                    render: (_v, row) => {
                                        const sb =
                                            STATUS_BADGE[
                                                (row as unknown as CommercialDocument).status
                                            ] ?? STATUS_BADGE.draft;
                                        return (
                                            <Badge variant={sb.variant}>
                                                {sb.label}
                                            </Badge>
                                        );
                                    },
                                },
                                {
                                    key: "document_date",
                                    label: "التاريخ",
                                    render: (_v, row) => (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: "var(--t4)",
                                            }}
                                        >
                                            {new Date(
                                                (row as unknown as CommercialDocument).document_date,
                                            ).toLocaleDateString("fr-DZ")}
                                        </span>
                                    ),
                                },
                                {
                                    key: "_actions",
                                    label: "",
                                    render: (_v, row) => {
                                        const inv = row as unknown as CommercialDocument;
                                        return (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 3,
                                                }}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Button
                                                    size="xs"
                                                    icon={
                                                        <i className="ti ti-eye" />
                                                    }
                                                    onClick={() =>
                                                        openDetail(inv)
                                                    }
                                                />
                                                <Button
                                                    size="xs"
                                                    icon={
                                                        <i className="ti ti-printer" />
                                                    }
                                                />
                                                {inv.status ===
                                                    "validated" && (
                                                    <Button
                                                        size="xs"
                                                        variant="primary"
                                                        icon={
                                                            <i className="ti ti-cash" />
                                                        }
                                                        onClick={() =>
                                                            validateMut.mutate(
                                                                inv.id,
                                                            )
                                                        }
                                                    />
                                                )}
                                            </div>
                                        );
                                    },
                                },
                            ]}
                            data={invoices}
                            rowKey="id"
                            onRowClick={(row) =>
                                openDetail(row as unknown as CommercialDocument)
                            }
                        />
                    )}

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 16px",
                            borderTop: "1px solid var(--b1)",
                        }}
                    >
                        <span style={{ fontSize: 12, color: "var(--t4)" }}>
                            {meta.from}–{meta.to} من {meta.total}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                            <Button
                                size="xs"
                                disabled={(filters.page ?? 1) <= 1}
                                onClick={() =>
                                    setFilters((f) => ({
                                        ...f,
                                        page: (f.page ?? 1) - 1,
                                    }))
                                }
                            >
                                <i className="ti ti-chevron-right" />
                            </Button>
                            {Array.from(
                                { length: Math.min(meta.last_page, 5) },
                                (_, i) => i + 1,
                            ).map((p) => (
                                <button
                                    key={p}
                                    className={`btn btn-xs ${(filters.page ?? 1) === p ? "btn-p" : ""}`}
                                    onClick={() =>
                                        setFilters((f) => ({ ...f, page: p }))
                                    }
                                >
                                    {p}
                                </button>
                            ))}
                            <Button
                                size="xs"
                                disabled={(filters.page ?? 1) >= meta.last_page}
                                onClick={() =>
                                    setFilters((f) => ({
                                        ...f,
                                        page: (f.page ?? 1) + 1,
                                    }))
                                }
                            >
                                <i className="ti ti-chevron-left" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Invoice Detail Modal */}
            <InvoiceDetailModal
                open={detail.open}
                invoiceId={viewingId}
                onClose={() => { detail.closeModal(); setViewingId(null); }}
                onValidate={() => viewingId && validateMut.mutate(viewingId)}
                onDelete={async () => {
                    if (viewingId && await confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
                        documentMutations.remove.mutate(viewingId);
                    }
                }}
                onPrint={() => viewingId && setPrintDocId(viewingId)}
                onReturn={() => setShowReturnModal(true)}
            />{/* end InvoiceDetailModal */}

            {/* Single-doc print preview */}
            {printDocId !== null && companyInfo && (
                <TemplatePrintModal
                    open={!!printDoc}
                    onClose={() => { setPrintDocId(null); }}
                    document={printDoc as any}
                    company={companyInfo as any}
                    templates={printTemplates}
                    docTypeCode={printDoc?.document_type?.code ?? 'FV'}
                    prevBalance={(printDoc as any)?.balance_data?.previous_balance}
                    newBalance={(printDoc as any)?.balance_data?.new_balance}
                />
            )}

            {/* New Invoice Modal */}
            <NewInvoiceModal
                open={newInv.open}
                onClose={newInv.closeModal}
                customers={customers?.data ?? []}
            />

            {showReturnModal && returnDoc && (
                <ReturnDocumentModal
                    document={returnDoc as any}
                    onCreated={() => { setShowReturnModal(false); setViewingId(null); detail.closeModal(); }}
                    onClose={() => setShowReturnModal(false)}
                />
            )}

            <ConfirmDialog {...confirmDialogProps} />
        </div>
    );
}

// ── Invoice Detail Modal ───────────────────────────
function InvoiceDetailModal({
    open,
    invoiceId,
    onClose,
    onValidate,
    onDelete,
    onPrint,
    onReturn,
}: {
    open: boolean;
    invoiceId: number | null;
    onClose: () => void;
    onValidate: () => void;
    onDelete?: () => void;
    onPrint?: () => void;
    onReturn?: () => void;
}) {
    const { data: invoice, isLoading } = useDocument(invoiceId);

    const fmt = (n: number) => n.toLocaleString("fr-DZ", { maximumFractionDigits: 2 });
    const dtf = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString("ar-DZ") : "—";

    if (isLoading || !invoice) {
        return (
            <Modal open={open} onClose={onClose} size="xl" title="تفاصيل الفاتورة">
                {isLoading && <div className="p-20 text-center text-t4">جار التحميل...</div>}
            </Modal>
        );
    }

    const sb = STATUS_BADGE[invoice.status] ?? STATUS_BADGE.draft;
    const lines = invoice.lines ?? [];
    const payments = invoice.payments ?? [];
    const bal = invoice.balance_data;
    const inv = invoice as any;

    const lineColumns: SimpleColumn[] = [
        { key: "idx", label: "#", className: "m", align: "center",
            render: (_v, row) => <span className="text-t4 text-sm">{(row._idx as number) + 1}</span> },
        { key: "product", label: "المنتج",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                const name = l.product_variant?.product?.name ?? l.product?.name ?? l.description ?? "—";
                return <span className="truncate block font-bold" title={typeof name === 'string' ? name : ''}>{name}</span>;
            }},
        { key: "packaging", label: "التعبئة", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return <span className="text-t4 text-sm">{l.packaging?.label ?? "—"}</span>;
            }},
        { key: "lot", label: "الحصة", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as Record<string, unknown>;
                return <span className="text-t4 text-sm">{(l.stockLot as any)?.label ?? "—"}</span>;
            }},
        { key: "quantity", label: "الكمية", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return <span className="text-t3">{l.quantity}</span>;
            }},
        { key: "total_qty", label: "الكمية الإجمالية", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                const tq = l.quantity * (l.packaging_units_snapshot ?? 1);
                return <span className="text-t4 text-sm">{tq}</span>;
            }},
        { key: "unit", label: "الوحدة", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                const u = l.product_variant?.product?.unit?.abbreviation ?? l.product?.unit?.abbreviation;
                return <span className="text-t4 text-sm">{u ?? "—"}</span>;
            }},
        { key: "unit_price", label: "سعر HT", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return <span className="font-mono text-sm">{fmt(l.unit_price_ht)} <span className="text-t4">دج</span></span>;
            }},
        { key: "pack_price", label: "سعر التعبئة", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                const pp = l.unit_price_ht * (l.packaging_units_snapshot ?? 1);
                return <span className="font-mono text-sm">{fmt(pp)} <span className="text-t4">دج</span></span>;
            }},
        { key: "orig_price", label: "السعر الأصلي", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                const orig = l.total_ht + (l.total_discount_amount ?? 0);
                return <span className="font-mono text-sm">{fmt(orig)} <span className="text-t4">دج</span></span>;
            }},
        { key: "discount", label: "الخصم", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return l.discount_percentage > 0
                    ? <span className="text-red text-sm">{l.discount_percentage}%</span>
                    : <span className="text-t4">—</span>;
            }},
        { key: "price_after", label: "بعد الخصم HT", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return <span className="font-mono text-sm">{fmt(l.total_ht)} <span className="text-t4">دج</span></span>;
            }},
        { key: "tva", label: "TVA %", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return <span className="text-t4 text-sm">{l.tva_rate}%</span>;
            }},
        { key: "total_ht", label: "إجمالي HT", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return <span className="font-mono text-sm">{fmt(l.total_ht)} <span className="text-t4">دج</span></span>;
            }},
        { key: "total_ttc", label: "إجمالي TTC", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const l = row as unknown as CommercialDocumentLine;
                return <span className="font-mono font-extrabold text-em">{fmt(l.total_ttc)} <span className="text-t4">دج</span></span>;
            }},
    ];

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="xl"
            title={invoice.document_number}
            subtitle={`${dtf(invoice.document_date)} • ${invoice.party?.name ?? "عابر"}`}
            footer={
                <>
                    <div className="m-foot-l flex gap-6">
                        <Button variant="danger" size="sm" icon={<i className="ti ti-trash" />} onClick={onDelete || onClose}>
                            حذف
                        </Button>
                        <Button size="sm" icon={<i className="ti ti-corner-up-left" />} onClick={onReturn || onClose}>
                            مرتجع
                        </Button>
                    </div>
                    {invoice.status === "draft" && (
                        <Button variant="primary" size="sm" icon={<i className="ti ti-check" />} onClick={onValidate}>
                            اعتماد
                        </Button>
                    )}
                    <Button size="sm" variant="info" icon={<i className="ti ti-mail" />} onClick={onClose}>
                        إرسال
                    </Button>
                    <Button size="sm" variant="primary" icon={<i className="ti ti-printer" />} onClick={onPrint || onClose}>
                        طباعة
                    </Button>
                </>
            }
        >
            {/* ── Colored header icon + status ── */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                    <div className="ic ic-md rounded-lg" style={{ background: 'var(--em)', color: '#fff' }}>
                        <i className="ti ti-receipt" />
                    </div>
                    <div className="flex items-center gap-6">
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                        {invoice.is_locked && <Badge variant="purple">مقفل</Badge>}
                        {invoice.remaining_amount > 0 && (
                            <span className="text-red font-bold text-sm">متبقي: {fmt(invoice.remaining_amount)} دج</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-t4">
                    <span>{invoice.warehouse?.name ?? "—"}</span>
                    <span>•</span>
                    <span>{invoice.fiscal_year?.name ?? "—"}</span>
                </div>
            </div>

            {/* ── Compact 4‑card info grid ── */}
            <div className="g4 mb-12">
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الزبون</div>
                    <div className="font-bold truncate">{invoice.party?.name ?? "عابر"}</div>
                    {invoice.party?.phone && <div className="text-xs text-t4 mt-2 ltr">{invoice.party.phone}</div>}
                    {invoice.party?.nif && <div className="text-xs text-t4">NIF: {invoice.party.nif}</div>}
                    {invoice.party?.rc && <div className="text-xs text-t4">RC: {invoice.party.rc}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">التواريخ</div>
                    <div className="font-bold text-sm">{dtf(invoice.document_date)}</div>
                    {invoice.due_date && <div className="text-xs text-t4 mt-2">استحقاق: {dtf(invoice.due_date)}</div>}
                    {inv.delivery_date && <div className="text-xs text-t4 mt-1">تسليم: {dtf(inv.delivery_date)}</div>}
                    {inv.currency && <div className="text-xs text-t4 mt-2">{inv.currency.name}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الحالة</div>
                    <Badge variant={sb.variant} noDot>{sb.label}</Badge>
                    <div className="text-xs text-t4 mt-2">{invoice.user?.name ?? "—"}</div>
                    {invoice.validatedBy && <div className="text-xs text-t4">اعتمد: {invoice.validatedBy.name}</div>}
                    {invoice.notes && <div className="text-xs text-t4 mt-1 truncate">{invoice.notes}</div>}
                </div>
                <div className="p-8 rounded-lg bg-3">
                    <div className="text-xs text-t4 mb-4">الرصيد</div>
                    {bal ? (
                        <>
                            <div className="text-sm font-bold">
                                {fmt(bal.previous_balance)} <span className="text-xs text-t4 font-normal">→</span> {fmt(bal.new_balance)} <span className="text-xs text-t4">دج</span>
                            </div>
                            {invoice.remaining_amount > 0 && (
                                <div className="text-xs text-red mt-2">متبقي: {fmt(invoice.remaining_amount)} دج</div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm font-bold">{fmt(invoice.total_ttc)} <span className="text-xs text-t4">دج</span></div>
                    )}
                </div>
            </div>

            {/* Lines Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <span className="font-bold text-base">بنود الفاتورة</span>
                        <span className="text-xs text-t4 bg-3 px-8 py-2 rounded-md">{lines.length} بند</span>
                    </div>
                </div>
                <SimpleTable
                    columns={lineColumns}
                    data={lines.map((line, i) => ({ ...line, _key: `l-${i}`, _idx: i })) as unknown as Record<string, unknown>[]}
                    rowKey="_key"
                    className="border border-b1 rounded-lg"
                />
            </div>

            {/* Payments Section */}
            {payments.length > 0 && (
                <div className="mb-12">
                    <div className="flex items-center gap-6 mb-8">
                        <span className="font-bold text-base">المدفوعات</span>
                        <span className="text-xs text-t4 bg-3 px-8 py-2 rounded-md">{payments.length} دفعة</span>
                    </div>
                    {payments.map((p, i) => {
                        const pm = p as any;
                        const iconMap: Record<string, string> = { cash: "ti-cash", bank: "ti-building-bank", ccp: "ti-mail", cib: "ti-credit-card", check: "ti-checks" };
                        const icon = iconMap[pm.payment_mode?.code] ?? "ti-cash";
                        return (
                            <div key={p.id ?? i} className="flex items-center justify-between p-10 mb-4 rounded-md bg-3">
                                <div className="flex items-center gap-8">
                                    <div className="ic ic-sm text-t4">
                                        <i className={`ti ${icon}`} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{pm.payment_mode?.name ?? "—"}</div>
                                        <div className="text-xs text-t4">{p.reference ?? ""} {p.payment_date ? `• ${dtf(p.payment_date)}` : ""}</div>
                                    </div>
                                </div>
                                <div className="font-extrabold font-mono">{fmt(p.amount)} <span className="text-t4">دج</span></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Totals Section — Total on the left, details on the right */}
            <div className="flex items-stretch gap-6 mb-4">
                <div className="flex gap-6 flex-1">
                    {(invoice.total_discount > 0 || (invoice.fiscal_stamp ?? 0) > 0) && (
                        <div className="flex-1 p-10 rounded-lg bg-3">
                            <div className="text-xs text-t4 font-bold mb-6">التخفيضات</div>
                            {invoice.total_discount > 0 && (
                                <div className="sr">
                                    <span className="sr-l">الخصم</span>
                                    <span className="sr-v text-red">-{fmt(invoice.total_discount)} دج</span>
                                </div>
                            )}
                            {(invoice.fiscal_stamp ?? 0) > 0 && (
                                <div className="sr">
                                    <span className="sr-l">الطابع الجبائي</span>
                                    <span className="sr-v">{fmt(invoice.fiscal_stamp ?? 0)} دج</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex-1 p-10 rounded-lg bg-3">
                        <div className="text-xs text-t4 font-bold mb-6">الرصيد</div>
                        <div className="sr">
                            <span className="sr-l">المدفوع</span>
                            <span className="sr-v text-em">{fmt(invoice.paid_amount)} دج</span>
                        </div>
                        <div className="sr">
                            <span className="sr-l">المتبقي</span>
                            <span className="sr-v font-bold" style={invoice.remaining_amount > 0 ? { color: 'var(--red)' } : {}}>
                                {fmt(invoice.remaining_amount)} دج
                            </span>
                        </div>
                        {bal && (
                            <div className="pt-6 mt-6 border-t border-b3">
                                <div className="sr">
                                    <span className="sr-l">الرصيد السابق</span>
                                    <span className="sr-v">{fmt(bal.previous_balance)} دج</span>
                                </div>
                                <div className="sr">
                                    <span className="sr-l">الرصيد الجديد</span>
                                    <span className="sr-v font-bold">{fmt(bal.new_balance)} دج</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-10 rounded-lg bg-3 flex flex-col items-center justify-center" style={{ minWidth: 200 }}>
                    <div className="text-xs text-t4 font-bold mb-6">الإجمالي</div>
                    <div className="text-3xl font-black text-em">{fmt(invoice.total_ttc)}</div>
                    <div className="text-xs text-t4 mt-2">دينار جزائري</div>
                    <div className="w-full mt-6 pt-6 border-t border-b3">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-t4">HT</span>
                            <span className="font-bold">{fmt(invoice.total_ht)} دج</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-t4">TVA</span>
                            <span className="font-bold">{fmt(invoice.total_tva)} دج</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ── New Invoice Modal ──────────────────────────────
function NewInvoiceModal({
    open,
    onClose,
    customers,
}: {
    open: boolean;
    onClose: () => void;
    customers: Party[];
}) {
    const createMut = useDocumentMutations();
    const { data: warehouses } = useWarehouses();
    const { fiscalYear } = useFiscalYear();
    const { data: docTypes } = useDocumentTypes();
    const { data: _payModes } = usePaymentModes();

    const defaultDate = (): string => {
        const d = new Date().toISOString().split("T")[0];
        if (fiscalYear?.start_date && fiscalYear?.end_date) {
            const s = fiscalYear.start_date.substring(0, 10);
            const e = fiscalYear.end_date.substring(0, 10);
            if (d >= s && d <= e) return d;
            return e;
        }
        return d;
    };

    const [clientId, setClientId] = useState("");
    const [docDate, setDocDate] = useState(defaultDate());
    const [lines, setLines] = useState([
        {
            description: "",
            quantity: 1,
            unit_price_ht: 0,
            tva_rate: 19,
            discount_percentage: 0,
        },
    ]);
    const [note, setNote] = useState("");

    useEffect(() => {
        if (open) setDocDate(defaultDate());
    }, [open, fiscalYear?.id]);

    const addLine = () =>
        setLines((l) => [
            ...l,
            {
                description: "",
                quantity: 1,
                unit_price_ht: 0,
                tva_rate: 19,
                discount_percentage: 0,
            },
        ]);
    const removeLine = (i: number) =>
        setLines((l) => l.filter((_, idx) => idx !== i));

    const totals = useMemo(() => {
        let ht = 0,
            tva = 0;
        lines.forEach((l) => {
            const lineHt =
                l.unit_price_ht *
                l.quantity *
                (1 - l.discount_percentage / 100);
            ht += lineHt;
            tva += lineHt * (l.tva_rate / 100);
        });
        return { ht, tva, ttc: ht + tva };
    }, [lines]);

    const handleSave = async (_draft = false) => {
        const invType = docTypes?.find(
            (t) => t.code === "FAC" || t.name_latin?.includes("Invoice"),
        );
        const wh = warehouses?.[0];
        if (!invType || !wh || !fiscalYear) return;

        await createMut.mutateAsync({
            document_type_id: invType.id,
            party_id: clientId ? Number(clientId) : null,
            warehouse_id: wh.id,
            fiscal_year_id: fiscalYear.id,
            document_date: docDate,
            notes: note || null,
            lines: lines.map((l, i) => ({
                ...l,
                line_order: i + 1,
            })) as unknown as CommercialDocumentLine[],
        } as Partial<CommercialDocument>);
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title="فاتورة جديدة"
            footer={
                <>
                    <div className="m-foot-l">
                        <Button onClick={onClose}>إلغاء</Button>
                    </div>
                    <Button
                        icon={<i className="ti ti-file-minus" />}
                        onClick={() => handleSave(true)}
                    >
                        مسودة
                    </Button>
                    <Button
                        variant="primary"
                        icon={<i className="ti ti-circle-check" />}
                        onClick={() => handleSave(false)}
                        disabled={createMut.isPending}
                    >
                        {createMut.isPending ? "جاري الحفظ..." : "حفظ وطباعة"}
                    </Button>
                </>
            }
        >
            {/* Client + Date */}
            <div className="fgrid" style={{ marginBottom: 16 }}>
                <div className="fg">
                    <label>الزبون</label>
                    <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                    >
                        <option value="">👤 زبون الصندوق (Client Cash)</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>التاريخ</label>
                    <input
                        type="date"
                        value={docDate}
                        onChange={e => setDocDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Lines */}
            <div
                style={{
                    border: "1px solid var(--b2)",
                    borderRadius: "var(--r2)",
                    overflow: "hidden",
                    marginBottom: 14,
                }}
            >
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 13,
                        }}
                    >
                        <thead>
                            <tr>
                                {[
                                    "#",
                                    "المنتج / الخدمة",
                                    "الكمية",
                                    "سعر HT",
                                    "TVA",
                                    "خصم %",
                                    "TTC",
                                    "",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "6px 10px",
                                            textAlign: "right",
                                            fontSize: 11,
                                            color: "var(--t4)",
                                            background: "var(--bg3)",
                                            borderBottom: "1px solid var(--b2)",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, i) => {
                                const ttc =
                                    line.unit_price_ht *
                                    line.quantity *
                                    (1 - line.discount_percentage / 100) *
                                    (1 + line.tva_rate / 100);
                                return (
                                    <tr
                                        key={i}
                                        style={{
                                            borderBottom: "1px solid var(--b1)",
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "8px 10px",
                                                color: "var(--t4)",
                                                fontSize: 11,
                                            }}
                                        >
                                            {i + 1}
                                        </td>
                                        <td style={{ padding: "8px 6px" }}>
                                            <input
                                                value={line.description}
                                                onChange={(e) =>
                                                    setLines((l) =>
                                                        l.map((x, idx) =>
                                                            idx === i
                                                                ? {
                                                                      ...x,
                                                                      description:
                                                                          e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : x,
                                                        ),
                                                    )
                                                }
                                                placeholder="اسم المنتج أو الخدمة"
                                                style={{
                                                    width: "100%",
                                                    minWidth: 160,
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: "8px 6px" }}>
                                            <input
                                                type="number"
                                                value={line.quantity}
                                                min={0.001}
                                                style={{
                                                    width: 65,
                                                    textAlign: "center",
                                                }}
                                                onChange={(e) =>
                                                    setLines((l) =>
                                                        l.map((x, idx) =>
                                                            idx === i
                                                                ? {
                                                                      ...x,
                                                                      quantity:
                                                                          +e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : x,
                                                        ),
                                                    )
                                                }
                                            />
                                        </td>
                                        <td style={{ padding: "8px 6px" }}>
                                            <input
                                                type="number"
                                                value={line.unit_price_ht}
                                                min={0}
                                                style={{ width: 90 }}
                                                onChange={(e) =>
                                                    setLines((l) =>
                                                        l.map((x, idx) =>
                                                            idx === i
                                                                ? {
                                                                      ...x,
                                                                      unit_price_ht:
                                                                          +e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : x,
                                                        ),
                                                    )
                                                }
                                            />
                                        </td>
                                        <td style={{ padding: "8px 6px" }}>
                                            <select
                                                style={{ width: 72 }}
                                                value={line.tva_rate}
                                                onChange={(e) =>
                                                    setLines((l) =>
                                                        l.map((x, idx) =>
                                                            idx === i
                                                                ? {
                                                                      ...x,
                                                                      tva_rate:
                                                                          +e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : x,
                                                        ),
                                                    )
                                                }
                                            >
                                                <option value={19}>19%</option>
                                                <option value={9}>9%</option>
                                                <option value={0}>0%</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "8px 6px" }}>
                                            <input
                                                type="number"
                                                value={line.discount_percentage}
                                                min={0}
                                                max={100}
                                                style={{
                                                    width: 65,
                                                    textAlign: "center",
                                                }}
                                                onChange={(e) =>
                                                    setLines((l) =>
                                                        l.map((x, idx) =>
                                                            idx === i
                                                                ? {
                                                                      ...x,
                                                                      discount_percentage:
                                                                          +e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : x,
                                                        ),
                                                    )
                                                }
                                            />
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px 10px",
                                                color: "var(--em)",
                                                fontWeight: 700,
                                                fontFamily: "monospace",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {ttc.toLocaleString("fr-DZ", {
                                                maximumFractionDigits: 0,
                                            })}{" "}
                                            دج
                                        </td>
                                        <td style={{ padding: "8px 6px" }}>
                                            <button
                                                className="btn btn-xs"
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: "var(--red)",
                                                }}
                                                onClick={() => removeLine(i)}
                                            >
                                                <span className="ic ic-xs">
                                                    <i className="ti ti-trash" />
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div
                    style={{
                        padding: "8px 14px",
                        borderTop: "1px solid var(--b1)",
                        background: "var(--bg3)",
                    }}
                >
                    <Button
                        size="xs"
                        icon={<i className="ti ti-plus" />}
                        onClick={addLine}
                    >
                        إضافة سطر
                    </Button>
                </div>
            </div>

            {/* Totals + Notes */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <div className="fg" style={{ flex: 1, minWidth: 200 }}>
                    <label>ملاحظات</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="ملاحظات اختيارية..."
                        style={{ minHeight: 60 }}
                    />
                </div>
                <div
                    style={{
                        width: 270,
                        background: "var(--bg3)",
                        borderRadius: "var(--r2)",
                        padding: 14,
                        border: "1px solid var(--b2)",
                    }}
                >
                    {[
                        { label: "المجموع HT", val: totals.ht },
                        { label: "TVA", val: totals.tva },
                    ].map(({ label, val }) => (
                        <div
                            key={label}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 5,
                                fontSize: 13,
                            }}
                        >
                            <span style={{ color: "var(--t4)" }}>{label}</span>
                            <span>
                                {val.toLocaleString("fr-DZ", {
                                    maximumFractionDigits: 0,
                                })}{" "}
                                دج
                            </span>
                        </div>
                    ))}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            paddingTop: 8,
                            borderTop: "1px solid var(--b3)",
                            fontSize: 16,
                            fontWeight: 900,
                        }}
                    >
                        <span>الإجمالي TTC</span>
                        <span style={{ color: "var(--em)" }}>
                            {totals.ttc.toLocaleString("fr-DZ", {
                                maximumFractionDigits: 0,
                            })}{" "}
                            دج
                        </span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
