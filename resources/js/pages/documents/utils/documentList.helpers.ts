// pages/documents/utils/documentList.helpers.ts
// دوال مساعدة نقية لصفحة قائمة المستندات التجارية
import type { CommercialDocument } from "@/lib/api/core/types";

export function fmtDate(d?: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-DZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
    });
}

/** تاريخ + وقت كامل (ساعة:دقيقة:ثانية) — لأعمدة created_at / updated_at / validated_at */
export function fmtDateTime(d?: string | null): string {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    const date = dt.toLocaleDateString("ar-DZ", { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = dt.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    return `${date} ${time}`;
}

export function getDocStatus(doc: CommercialDocument): string {
    return (
        ((doc.document_status as Record<string, unknown> | undefined)?.name as string) ??
        ((doc as unknown as Record<string, unknown>).status as string) ??
        "draft"
    );
}

export function getPartyName(doc: CommercialDocument): string {
    return ((doc.party as Record<string, unknown> | undefined)?.name as string) ?? "";
}

export function getWarehouseName(doc: CommercialDocument): string {
    return ((doc.warehouse as Record<string, unknown> | undefined)?.name as string) ?? "";
}

export function getRowPermissions(row: CommercialDocument, isReadOnly: boolean) {
    const isLocked    = !!row.is_locked;
    const isExported  = !!(row as unknown as Record<string, unknown>).is_exported_to_accounting;
    const status      = getDocStatus(row);
    const isCancelled = status === "cancelled";

    return {
        canEdit:   !isReadOnly && !isLocked && !isExported,
        canLock:   !isReadOnly && !isLocked && !isCancelled,
        canUnlock: !isReadOnly &&  isLocked && !isExported,
        canCancel: !isReadOnly && !isLocked && !isExported && !isCancelled,
        isLocked,
        isCancelled,
    };
}
