// pages/documents/components/list/columns/coreColumns.tsx
// الأعمدة الأساسية (المرئية افتراضياً) لجدول المستندات التجارية
import type { Column } from "@/components/ui/DataTable";
import type { CommercialDocument } from "@/lib/api/core/types";
import { fmtDZD as fmtMoney } from '@/lib/format';
import type { useNotification } from '@/hooks/useNotification';
import type { useConfirm } from "@/hooks/useConfirm";
import type { useApprovalCheckBatch } from "@/lib/api/endpoints/approvals";
import type { useLookupOptions } from "../../../hooks/useLookupOptions";
import { ApprovalStatusBadge } from "../../ApprovalWorkflow";
import { STATUS_CFG, CONFIRM_LOCK_LONG, CONFIRM_UNLOCK } from "../../../utils/documentList.constants";
import { fmtDate, getDocStatus, getPartyName, getWarehouseName } from "../../../utils/documentList.helpers";
import StatusBadge from "../StatusBadge";
import MoneyCell from "../MoneyCell";

export interface CoreColumnsDeps {
    isPurch: boolean;
    opColor: string;
    isReadOnly: boolean | undefined;
    notify: ReturnType<typeof useNotification>;
    confirm: ReturnType<typeof useConfirm>["confirm"];
    lockMut: { mutate: (id: number) => void };
    unlockMut: { mutate: (id: number) => void };
    partyOptions: ReturnType<typeof useLookupOptions>;
    warehouseOptions: ReturnType<typeof useLookupOptions>;
    approvalBatch: ReturnType<typeof useApprovalCheckBatch>["data"];
}

export function buildCoreColumns({
    isPurch, opColor, isReadOnly, notify, confirm, lockMut, unlockMut,
    partyOptions, warehouseOptions, approvalBatch,
}: CoreColumnsDeps): Column<CommercialDocument>[] {
    return [
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
                                if (isExported) { notify.error("لا يمكن فتح قفل مستند مُصدَّر للمحاسبة"); return; }
                                if (await confirm(CONFIRM_UNLOCK)) unlockMut.mutate(row.id);
                            } else {
                                const status = getDocStatus(row);
                                if (status === "cancelled") { notify.error("لا يمكن قفل مستند ملغى"); return; }
                                if (await confirm(CONFIRM_LOCK_LONG)) lockMut.mutate(row.id);
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
                fetchOptions: partyOptions,
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
                fetchOptions: warehouseOptions,
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
            accessor: r => Number(r.net_to_pay ?? r.total_ttc ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const ntp = Number(row.net_to_pay ?? row.total_ttc ?? 0);
                const rem = Number(row.remaining_amount ?? 0);
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
            accessor: r => Number(r.paid_amount ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const paid = Number(row.paid_amount ?? 0);
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
    ];
}
