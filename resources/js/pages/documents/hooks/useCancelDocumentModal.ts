// pages/documents/hooks/useCancelDocumentModal.ts
// حالة مودال إلغاء المستند + جلب كمية المخزون المتأثرة (best-effort)
import { useState, useCallback } from "react";
import { apiGet } from "@/lib/api/core/client";
import type { CommercialDocument } from "@/lib/api/core/types";
import type { CancelModalState } from "../components/list/documentList.types";

export function useCancelDocumentModal() {
    // ── Cancel modal state ────────────────────────────────────────────────────
    const [cancelModal, setCancelModal] = useState<CancelModalState | null>(null);

    // Cancel is a DB write through the reader's PermissionsProvider, so the raw
    // list row (no lines/quantities) cannot answer "will stock be restored?".
    // Fetch the doc fresh and aggregate the affected quantity for the confirm
    // message. Best-effort: any failure keeps the generic warning.
    const openCancelModal = useCallback((docId: number | { id: number }) => {
        const id = typeof docId === 'number' ? docId : docId.id;
        setCancelModal({ id, reason: '', stockInfo: null });
        void (async () => {
            try {
                const full = await apiGet<CommercialDocument>(`/documents/${id}`, {
                    include: 'lines,lines.product,lines.product.unit,documentType',
                });
                if (!full?.document_type) return;
                if (Number(full.document_type.affects_stock_direction ?? 0) === 0) return;
                let quantity = 0;
                let unit: string | null = null;
                for (const l of full.lines ?? []) {
                    const snap = Number(l.packaging_units_snapshot ?? 1) || 1;
                    quantity += (Number(l.quantity) || 0) * snap;
                    if (!unit) unit = l.product?.unit?.abbreviation || l.product?.unit?.name || null;
                }
                setCancelModal(m => (m && m.id === id ? { ...m, stockInfo: { quantity, unit } } : m));
            } catch {
                // keep the generic warning
            }
        })();
    }, []);

    return { cancelModal, setCancelModal, openCancelModal };
}
