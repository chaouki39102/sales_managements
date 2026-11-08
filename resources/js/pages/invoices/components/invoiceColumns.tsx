// pages/invoices/components/invoiceColumns.tsx
// أعمدة جدول قائمة الفواتير
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import type { SimpleColumn } from "@/components/ui/SimpleTable";
import type { CommercialDocument } from "@/types";
import { STATUS_BADGE } from "../utils/invoiceStatus";

interface InvoiceColumnsDeps {
    selected: Set<number>;
    toggleSelect: (id: number) => void;
    openDetail: (inv: CommercialDocument) => void;
    validateMut: { mutate: (id: number) => void };
}

export function buildInvoiceColumns({
    selected, toggleSelect, openDetail, validateMut,
}: InvoiceColumnsDeps): SimpleColumn[] {
    return [
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
    ];
}
