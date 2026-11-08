// pages/invoices/utils/invoiceStatus.ts
import type Badge from "@/components/ui/Badge";

// ── Status helpers ─────────────────────────────────
export const STATUS_BADGE: Record<
    string,
    { label: string; variant: Parameters<typeof Badge>[0]["variant"] }
> = {
    draft: { label: "مسودة", variant: "gray" },
    validated: { label: "معلقة", variant: "warning" },
    partial: { label: "جزئية", variant: "info" },
    paid: { label: "مدفوعة", variant: "success" },
    cancelled: { label: "ملغاة", variant: "danger" },
    locked: { label: "مقفولة", variant: "purple" },
};
