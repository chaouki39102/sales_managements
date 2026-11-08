// pages/documents/components/list/ExpandedLines.tsx
// أسطر المستند المعروضة عند توسيع الصف
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/core/client";
import { useActiveSlug } from "@/lib/store/appStore";
import SimpleTable from "@/components/ui/SimpleTable";
import type { CommercialDocument } from "@/lib/api/core/types";
import { DeliveryProgressBar } from "../DeliveryProgressBar";
import MoneyCell from "./MoneyCell";

export default function ExpandedLines({ doc }: { doc: CommercialDocument }) {
    const slug = useActiveSlug();
    const docCode = ((doc as unknown as Record<string, unknown>).documentType as Record<string, unknown> | undefined)?.code as string ?? '';

    const { data: full, isLoading } = useQuery({
        queryKey: [slug, "doc-lines", doc.id],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: "lines.product,lines.productVariant",
            }),
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
