// pages/documents/utils/documentList.conditionalFormatting.ts
// التنسيق الشرطي لصفوف جدول المستندات
import type { ConditionalFormat } from "@/components/ui/DataTable";
import type { CommercialDocument } from "@/lib/api/core/types";
import { getDocStatus } from "./documentList.helpers";

export function buildConditionalFormatting(): ConditionalFormat<CommercialDocument>[] {
    return [
        {
            colKey: "*",
            condition: (_value, row) => {
                const status  = getDocStatus(row);
                const dueDate = row.due_date;
                return !!(dueDate && new Date(dueDate) < new Date() && status !== "paid" && status !== "cancelled");
            },
            className: "cdp-row-overdue",
            style: { background: "color-mix(in srgb, var(--red) 6%, var(--bg1))" },
        },
        {
            colKey: "net_to_pay",
            condition: (_value, row) => {
                const rem = Number((row as unknown as Record<string, unknown>).remaining_amount ?? 0);
                return rem > 0 && rem < (row.total_ttc ?? 0);
            },
            style: { fontWeight: 700 },
        },
        {
            // تلوين خفيف للمستندات المسودة
            colKey: "*",
            condition: (_value, row) => getDocStatus(row) === "draft",
            style: { opacity: 0.85 },
        },
    ];
}
