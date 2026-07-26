// pages/invoices/InvoicesPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";

// ✅ استيراد الـ Hooks الصحيحة للمستندات والفواتير
import {
    useDocuments as useInvoices,
    useDocumentMutations,
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
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import KpiCard from "@/components/ui/KpiCard";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import SimpleTable from "@/components/ui/SimpleTable";
import type {
    CommercialDocument,
    CommercialDocumentLine,
    Party,
} from "@/types";

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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewing,  setViewing]  = useState<CommercialDocument | null>(null);

  const detail   = useModal();
  const newInv   = useModal();

  // تزامن السنة المالية المحددة مع الفلاتر
  useEffect(() => {
    setFilters(prev => ({ ...prev, page: 1, fiscal_year_id: selectedYear?.id }));
  }, [selectedYear?.id]);

  // تحويل fiscal_year_id إلى filter[fiscal_year_id] للباكند
  const apiFilters = useMemo(() => {
    const params: Record<string, unknown> = { ...filters };
    if (params.fiscal_year_id) {
      params['filter[fiscal_year_id]'] = params.fiscal_year_id;
      delete params.fiscal_year_id;
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
  const cancelMut   = { mutate: (id: number) => documentMutations.cancel?.mutate(id) };

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
        setViewing(inv);
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
                invoice={viewing}
                onClose={detail.closeModal}
                onValidate={() => viewing && validateMut.mutate(viewing.id)}
                onCancel={() => viewing && cancelMut.mutate(viewing.id)}
            />

            {/* New Invoice Modal */}
            <NewInvoiceModal
                open={newInv.open}
                onClose={newInv.closeModal}
                customers={customers?.data ?? []}
            />
        </div>
    );
}

// ── Invoice Detail Modal ───────────────────────────
function InvoiceDetailModal({
    open,
    invoice,
    onClose,
    onValidate: _onValidate,
    onCancel,
}: {
    open: boolean;
    invoice: CommercialDocument | null;
    onClose: () => void;
    onValidate: () => void;
    onCancel: () => void;
}) {
    if (!invoice) return null;
    const sb = STATUS_BADGE[invoice.status] ?? STATUS_BADGE.draft;

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={invoice.document_number}
            subtitle={`${new Date(invoice.document_date).toLocaleDateString("ar-DZ")} • ${invoice.party?.name ?? "عابر"}`}
            footer={
                <>
                    <div className="m-foot-l">
                        {invoice.status !== "cancelled" && (
                            <Button
                                variant="danger"
                                size="sm"
                                icon={<i className="ti ti-ban" />}
                                onClick={onCancel}
                            >
                                إلغاء
                            </Button>
                        )}
                        <Button
                            size="sm"
                            icon={<i className="ti ti-corner-up-left" />}
                        >
                            مرتجع
                        </Button>
                    </div>
                    <Button
                        size="sm"
                        variant="info"
                        icon={<i className="ti ti-mail" />}
                    >
                        إرسال
                    </Button>
                    <Button
                        size="sm"
                        variant="primary"
                        icon={<i className="ti ti-printer" />}
                    >
                        طباعة
                    </Button>
                </>
            }
        >
            {/* Seller / Buyer */}
            <div className="g2" style={{ marginBottom: 14 }}>
                {[
                    {
                        label: "البائع",
                        name: "مؤسسة النور للتجارة",
                        sub: [
                            "NIF: 001234567890123",
                            "RC: 29/00-0012345B05",
                            "ورقلة — الجزائر",
                        ],
                    },
                    {
                        label: "المشتري",
                        name: invoice.party?.name ?? "عابر",
                        sub: [
                            invoice.party?.phone ?? "",
                            invoice.party?.nif
                                ? `NIF: ${invoice.party.nif}`
                                : "",
                        ].filter(Boolean),
                    },
                ].map(({ label, name, sub }) => (
                    <div
                        key={label}
                        style={{
                            padding: 12,
                            background: "var(--bg3)",
                            borderRadius: "var(--r2)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                color: "var(--t4)",
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                marginBottom: 7,
                            }}
                        >
                            {label}
                        </div>
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 14,
                                marginBottom: 3,
                            }}
                        >
                            {name}
                        </div>
                        {sub.map((s, i) => (
                            <div
                                key={i}
                                style={{
                                    fontSize: "11.5px",
                                    color: "var(--t4)",
                                }}
                            >
                                {s}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Status badge */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                }}
            >
                <Badge variant={sb.variant}>{sb.label}</Badge>
                {invoice.remaining_amount > 0 && (
                    <span
                        style={{
                            fontSize: 12,
                            color: "var(--red)",
                            fontWeight: 700,
                        }}
                    >
                        متبقي:{" "}
                        {invoice.remaining_amount.toLocaleString("fr-DZ")} دج
                    </span>
                )}
            </div>

            {/* Lines table */}
            <SimpleTable
                columns={[
                    {
                        key: "product",
                        label: "المنتج",
                        render: (_v, row) => {
                            const line =
                                row as unknown as CommercialDocumentLine;
                            return (
                                <span style={{ fontWeight: 700 }}>
                                    {line.product_variant?.product?.name ??
                                        line.description ??
                                        "—"}
                                </span>
                            );
                        },
                    },
                    {
                        key: "quantity",
                        label: "الكمية",
                        render: (_v, row) => (
                            <span style={{ color: "var(--t3)" }}>
                                {
                                    (row as unknown as CommercialDocumentLine)
                                        .quantity
                                }
                            </span>
                        ),
                    },
                    {
                        key: "unit_price_ht",
                        label: "سعر HT",
                        render: (_v, row) => (
                            <span style={{ fontFamily: "monospace" }}>
                                {(
                                    row as unknown as CommercialDocumentLine
                                ).unit_price_ht.toFixed(2)}{" "}
                                دج
                            </span>
                        ),
                    },
                    {
                        key: "tva_rate",
                        label: "TVA",
                        render: (_v, row) => (
                            <span
                                style={{
                                    fontSize: 12,
                                    color: "var(--t4)",
                                }}
                            >
                                {(row as unknown as CommercialDocumentLine)
                                    .tva_rate}
                                %
                            </span>
                        ),
                    },
                    {
                        key: "discount_percentage",
                        label: "خصم",
                        render: (_v, row) => {
                            const line =
                                row as unknown as CommercialDocumentLine;
                            return (
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: "var(--red)",
                                    }}
                                >
                                    {line.discount_percentage > 0
                                        ? `${line.discount_percentage}%`
                                        : "—"}
                                </span>
                            );
                        },
                    },
                    {
                        key: "total_ttc",
                        label: "TTC",
                        render: (_v, row) => (
                            <span
                                style={{
                                    color: "var(--em)",
                                    fontWeight: 800,
                                    fontFamily: "monospace",
                                }}
                            >
                                {(
                                    row as unknown as CommercialDocumentLine
                                ).total_ttc.toLocaleString("fr-DZ", {
                                    maximumFractionDigits: 0,
                                })}{" "}
                                دج
                            </span>
                        ),
                    },
                ]}
                data={
                    (invoice.lines ?? []).map((line, i) => ({
                        ...line,
                        _key: `line-${i}`,
                    })) as unknown as Record<string, unknown>[]
                }
                rowKey="_key"
            />

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 280 }}>
                    {[
                        { label: "المجموع HT", val: invoice.total_ht },
                        { label: "TVA", val: invoice.total_tva },
                        { label: "الطابع الجبائي", val: invoice.fiscal_stamp },
                    ].map(
                        ({ label, val }) =>
                            val > 0 && (
                                <div
                                    key={label}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "6px 0",
                                        fontSize: 13,
                                        color: "var(--t4)",
                                    }}
                                >
                                    <span>{label}</span>
                                    <span>
                                        {val.toLocaleString("fr-DZ", {
                                            maximumFractionDigits: 0,
                                        })}{" "}
                                        دج
                                    </span>
                                </div>
                            ),
                    )}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderTop: "1px solid var(--b3)",
                            fontSize: 17,
                            fontWeight: 900,
                        }}
                    >
                        <span>الإجمالي TTC</span>
                        <span style={{ color: "var(--em)" }}>
                            {invoice.total_ttc.toLocaleString("fr-DZ", {
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
