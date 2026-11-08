// pages/documents/utils/documentList.constants.ts
// ثوابت صفحة قائمة المستندات التجارية (CommercialDocumentsPage)
import type React from "react";

export const SALE_CODES     = new Set(["FV", "BL", "DEV", "BCC", "AV"]);
export const PURCHASE_CODES = new Set(["FA", "BR", "DDP", "BCF", "AA"]);

export const STATUS_CFG = {
    draft:          { label: "مسودة",    color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
    pending:        { label: "قيد الانتظار", color: "#f59e0b", bg: "#fffbeb", dot: "#fbbf24" },
    validated:      { label: "معتمد",    color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
    partially_paid: { label: "مدفوع جزئياً", color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
    paid:           { label: "مدفوع",    color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
    overdue:        { label: "متأخر",    color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    cancelled:      { label: "ملغي",     color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    returned:       { label: "مرتجع",    color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
} as const;

export type StatusKey = keyof typeof STATUS_CFG;

export const CONFIRM_LOCK_LONG  = "تأكيد قفل هذا المستند؟ لن يمكن تعديله بعد القفل.";
export const CONFIRM_LOCK_SHORT = "تأكيد قفل هذا المستند؟";
export const CONFIRM_UNLOCK     = "تأكيد فتح قفل هذا المستند؟";

export const ICON_BTN_STYLE: React.CSSProperties = {
    height: 28, width: 28, borderRadius: 7, border: "1px solid var(--b2)",
    background: "var(--bg2)", color: "var(--t4)", fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
};
