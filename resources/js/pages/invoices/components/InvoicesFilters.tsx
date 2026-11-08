// pages/invoices/components/InvoicesFilters.tsx
import type React from "react";
import type { Party } from "@/types";

interface InvoicesFiltersProps {
    setFilters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    customers: { data: Party[] } | undefined;
}

export default function InvoicesFilters({ setFilters, customers }: InvoicesFiltersProps) {
    return (
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
                        setFilters((f: any) => ({
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
                    setFilters((f: any) => ({
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
                    setFilters((f: any) => ({
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
                    setFilters((f: any) => ({
                        ...f,
                        date_from: e.target.value || undefined,
                        page: 1,
                    }))
                }
            />
        </div>
    );
}
