// pages/documents/components/list/document-view/documentViewLineColumns.tsx
// أعمدة بنود المستند في نافذة العرض
import type { SimpleColumn } from "@/components/ui/SimpleTable";

export function buildDocumentViewLineColumns(fmt: (n: number) => string): SimpleColumn[] {
    return [
        { key: "idx", label: "#", className: "m", align: "center",
            render: (_v, row) => <span className="text-t4 text-sm">{(row._idx as number)}</span> },
        { key: "product", label: "المنتج",
            render: (_v, row) => {
                const pv = row.productVariant as Record<string, unknown> | undefined;
                const p = row.product as Record<string, unknown> | undefined;
                const raw = (pv?.product as Record<string, unknown> | undefined)?.name ?? p?.name ?? row.description;
                const name = String(raw ?? "—");
                return <span className="truncate block font-bold" title={name}>{name}</span>;
            }},
        { key: "packaging", label: "التعبئة", className: "whitespace-nowrap",
            render: (_v, row) => {
                const pk = row.packaging as Record<string, unknown> | undefined;
                return <span className="text-t4 text-sm">{pk?.label ? String(pk.label) : "—"}</span>;
            }},
        { key: "lot", label: "الحصة", className: "whitespace-nowrap",
            render: (_v, row) => {
                const lot = row.stockLot as Record<string, unknown> | undefined;
                return <span className="text-t4 text-sm">{lot?.label ? String(lot.label) : "—"}</span>;
            }},
        { key: "quantity", label: "الكمية", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => <span className="text-t3">{String(row.quantity ?? "")}</span> },
        { key: "total_qty", label: "الكمية الإجمالية", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const qty = Number(row.quantity ?? 1);
                const pku = Number(row.packaging_units_snapshot ?? 1);
                return <span className="text-t4 text-sm">{qty * pku}</span>;
            }},
        { key: "unit", label: "الوحدة", className: "whitespace-nowrap",
            render: (_v, row) => {
                const p = row.product as Record<string, unknown> | undefined;
                const u = p?.unit as Record<string, unknown> | undefined;
                return <span className="text-t4 text-sm">{u?.abbreviation ? String(u.abbreviation) : "—"}</span>;
            }},
        { key: "unit_price", label: "سعر HT", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => <span className="font-mono text-sm">{fmt(Number(row.unit_price_ht ?? 0))} <span className="text-t4">دج</span></span> },
        { key: "pack_price", label: "سعر التعبئة", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const pp = Number(row.unit_price_ht ?? 0) * Number(row.packaging_units_snapshot ?? 1);
                return <span className="font-mono text-sm">{fmt(pp)} <span className="text-t4">دج</span></span>;
            }},
        { key: "orig_price", label: "السعر الأصلي", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const orig = Number(row.total_ht ?? 0) + Number(row.total_discount_amount ?? 0);
                return <span className="font-mono text-sm">{fmt(orig)} <span className="text-t4">دج</span></span>;
            }},
        { key: "discount", label: "الخصم", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => {
                const dp = Number(row.discount_percentage ?? 0);
                return dp > 0
                    ? <span className="text-red text-sm">{dp}%</span>
                    : <span className="text-t4">—</span>;
            }},
        { key: "price_after", label: "بعد الخصم HT", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => <span className="font-mono text-sm">{fmt(Number(row.total_ht ?? 0))} <span className="text-t4">دج</span></span> },
        { key: "tva", label: "TVA %", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => <span className="text-t4 text-sm">{Number(row.tva_rate ?? 0)}%</span> },
        { key: "total_ht", label: "إجمالي HT", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => <span className="font-mono text-sm">{fmt(Number(row.total_ht ?? 0))} <span className="text-t4">دج</span></span> },
        { key: "total_ttc", label: "إجمالي TTC", align: "end", className: "whitespace-nowrap",
            render: (_v, row) => <span className="font-mono font-extrabold text-em">{fmt(Number(row.total_ttc ?? 0))} <span className="text-t4">دج</span></span> },
    ];
}
