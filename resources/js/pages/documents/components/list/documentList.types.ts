// pages/documents/components/list/documentList.types.ts
export type ModalMode = "add" | "edit" | "view" | "quick" | null;

export interface CancelModalState {
    id: number;
    reason: string;
    stockInfo?: { quantity: number; unit: string | null } | null;
}

export interface MailModalState {
    id: number;
    documentNumber: string;
    partyName: string;
    partyEmail: string | null;
    docTypeCode?: string;
}
