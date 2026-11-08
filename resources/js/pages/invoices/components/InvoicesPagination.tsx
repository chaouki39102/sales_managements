// pages/invoices/components/InvoicesPagination.tsx
import type React from "react";
import Button from "@/components/ui/Button";
import type { PaginationMeta } from "@/lib/api/core/types";

interface InvoicesPaginationProps {
    meta: PaginationMeta;
    filters: Record<string, any>;
    setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export default function InvoicesPagination({ meta, filters, setFilters }: InvoicesPaginationProps) {
    return (
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
                        setFilters((f: any) => ({
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
                            setFilters((f: any) => ({ ...f, page: p }))
                        }
                    >
                        {p}
                    </button>
                ))}
                <Button
                    size="xs"
                    disabled={(filters.page ?? 1) >= meta.last_page}
                    onClick={() =>
                        setFilters((f: any) => ({
                            ...f,
                            page: (f.page ?? 1) + 1,
                        }))
                    }
                >
                    <i className="ti ti-chevron-left" />
                </Button>
            </div>
        </div>
    );
}
