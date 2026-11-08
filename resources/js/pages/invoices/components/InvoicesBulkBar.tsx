// pages/invoices/components/InvoicesBulkBar.tsx
import Button from "@/components/ui/Button";
import type { CommercialDocument } from "@/types";

interface InvoicesBulkBarProps {
    selected: Set<number>;
    invoices: CommercialDocument[];
    toggleAll: (checked: boolean) => void;
    isFetching: boolean;
}

export default function InvoicesBulkBar({ selected, invoices, toggleAll, isFetching }: InvoicesBulkBarProps) {
    return (
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
    );
}
