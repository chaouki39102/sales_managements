// pages/documents/hooks/useDocumentQrScan.ts
import type React from "react";
import { apiGet } from "@/lib/api/core/client";
import { useBarcodeScan } from "@/hooks/useBarcodeScan";
import { parseFiscalQrNumber } from "@/lib/fiscalQr";
import type { useNotification } from '@/hooks/useNotification';
import type { CommercialDocument, PaginatedResponse } from "@/lib/api/core/types";
import type { ModalMode } from "../components/list/documentList.types";

export function useDocumentQrScan({ setViewDocId, setModal, notify }: {
    setViewDocId: React.Dispatch<React.SetStateAction<number | null>>;
    setModal: React.Dispatch<React.SetStateAction<ModalMode>>;
    notify: ReturnType<typeof useNotification>;
}) {
    // ── B.3 — مسح QR الفاتورة المطبوعة → فتح المستند المعني ──────────────────
    // الكاميرا تمسح رمز QR الضريبي (JSON v1: invoice.number)، ثم نبحث في
    // documents عن الرقم المطابق بالضبط ونفتح نافذة العرض الخاصة به.
    const docScan = useBarcodeScan<CommercialDocument>({
        resolve: async (code) => {
            const number = parseFiscalQrNumber(code);
            if (!number) return null;
            try {
                const res = await apiGet<PaginatedResponse<CommercialDocument>>("/documents", {
                    "filter[document_number]": number,
                    per_page: 5,
                });
                const list = Array.isArray(res) ? res : (res?.data ?? []);
                return list.find((d) => d.document_number === number) ?? null;
            } catch {
                return null;
            }
        },
        onFound: (doc) => {
            setViewDocId(doc.id);
            setModal("view");
        },
        onNotFound: () => notify.error("لم يتم العثور على مستند بهذا الرقم"),
    });

    return docScan;
}
