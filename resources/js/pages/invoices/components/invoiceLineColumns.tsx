// pages/invoices/components/invoiceLineColumns.tsx
// أعمدة بنود الفاتورة في نافذة التفاصيل
import type { SimpleColumn } from "@/components/ui/SimpleTable";
import type { CommercialDocumentLine } from "@/types";

export function buildInvoiceLineColumns(fmt: (n: number) => string): SimpleColumn[] {
    return [
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
}
