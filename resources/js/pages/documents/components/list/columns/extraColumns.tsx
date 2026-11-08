// pages/documents/components/list/columns/extraColumns.tsx
    // ════════════════════════════════════════════════════════════════════
    // أعمدة إضافية — مخفية افتراضياً (defaultHidden: true)
    // يُظهرها المستخدم حسب الحاجة عبر قائمة الأعمدة
    // ════════════════════════════════════════════════════════════════════
import type { Column } from "@/components/ui/DataTable";
import type { CommercialDocument } from "@/lib/api/core/types";
import { fmtDZD as fmtMoney } from '@/lib/format';
import type { useLookupOptions } from "../../../hooks/useLookupOptions";
import { fmtDate, fmtDateTime } from "../../../utils/documentList.helpers";
import MoneyCell from "../MoneyCell";
import UserChip from "../UserChip";

export function buildExtraColumns({ userOptions }: { userOptions: ReturnType<typeof useLookupOptions> }): Column<CommercialDocument>[] {
    return [
        // ── مالية ────────────────────────────────────────────────────────────

        {
            key: "total_discount",
            header: "الخصم",
            exportHeader: "الخصم الإجمالي (دج)",
            width: 120,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number(r.total_discount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const v = Number(row.total_discount ?? 0);
                if (!v) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
                return <MoneyCell value={v} accent="var(--red)" />;
            },
        },
        {
            key: "total_stamp",
            header: "الطابع",
            exportHeader: "الطابع الجبائي (دج)",
            width: 110,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number(r.total_stamp ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => <MoneyCell value={row.total_stamp ?? 0} />,
        },
        {
            key: "remaining_amount",
            header: "المتبقي",
            exportHeader: "المبلغ المتبقي (دج)",
            width: 130,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number(r.remaining_amount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const rem = Number(row.remaining_amount ?? 0);
                if (rem <= 0.001) return <span style={{ color: "var(--em)", fontSize: 12, fontWeight: 700 }}>مسدد ✓</span>;
                return <MoneyCell value={rem} accent="var(--red)" bold />;
            },
        },

        // ── مرجعية ───────────────────────────────────────────────────────────

        {
            key: "reference",
            header: "المرجع",
            exportHeader: "رقم المرجع (BL/BC)",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).reference ?? ""),
            render: (row: CommercialDocument) => {
                const ref = String((row as unknown as Record<string,unknown>).reference ?? "");
                return ref
                    ? <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--t3)", background: "var(--bg3)", padding: "2px 6px", borderRadius: 4 }}>{ref}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "notes",
            header: "ملاحظات",
            exportHeader: "الملاحظات",
            width: 200,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).notes ?? ""),
            render: (row: CommercialDocument) => {
                const notes = String((row as unknown as Record<string,unknown>).notes ?? "");
                return notes
                    ? <span style={{ fontSize: 12, color: "var(--t2)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }} title={notes}>{notes}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "payment_terms",
            header: "شروط الدفع",
            exportHeader: "شروط الدفع",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).payment_terms ?? ""),
            render: (row: CommercialDocument) => {
                const pt = String((row as unknown as Record<string,unknown>).payment_terms ?? "");
                return pt
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{pt}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── رقابة وتتبع ───────────────────────────────────────────────────────

        {
            key: "validated_at",
            header: "تاريخ الاعتماد",
            exportHeader: "تاريخ الاعتماد",
            width: 130,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String(r.validated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = row.validated_at;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--em)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "validated_by",
            header: "اعتمد بواسطة",
            exportHeader: "اعتمد بواسطة",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: {
                type: "dynamic-multiselect" as const,
                fetchOptions: userOptions,
            },
            // validated_by في DB = integer FK — الـ Resource يُرسل العلاقة بـ camelCase
            accessor: (r: CommercialDocument) => {
                return String(r.validatedBy?.name ?? "");
            },
            render: (row: CommercialDocument) => {
                const name = String(row.validatedBy?.name ?? "");
                return name ? <UserChip name={name} color="var(--em)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_by",
            header: "أنشأه",
            exportHeader: "أنشأه",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: {
                type: "dynamic-multiselect" as const,
                fetchOptions: userOptions,
            },
            // المنشئ = user_id في DB → العلاقة هي user() وليس created_by
            accessor: (r: CommercialDocument) => {
                return String(r.user?.name ?? "");
            },
            render: (row: CommercialDocument) => {
                const name = String(row.user?.name ?? "");
                return name ? <UserChip name={name} color="var(--blue)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_at",
            header: "تاريخ الإنشاء",
            exportHeader: "تاريخ الإنشاء",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).created_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).created_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "updated_at",
            header: "آخر تعديل",
            exportHeader: "آخر تعديل",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).updated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).updated_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── التسليم (لأوامر الزبون BCC خاصة) ────────────────────────────────
        {
            key: "delivery_date",
            header: "تاريخ التسليم",
            exportHeader: "تاريخ التسليم",
            width: 120,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).delivery_date ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).delivery_date as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
    ];
}
