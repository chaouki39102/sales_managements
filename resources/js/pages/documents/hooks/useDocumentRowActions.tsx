// pages/documents/hooks/useDocumentRowActions.tsx
// أزرار الإجراءات لكل صف في جدول المستندات
import type React from "react";
import { useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { CommercialDocument } from "@/lib/api/core/types";
import type { useConfirm } from "@/hooks/useConfirm";
import type { useApprovalCheckBatch } from "@/lib/api/endpoints/approvals";
import { ApprovalActions } from "../components/ApprovalWorkflow";
import ActionBtn from "../components/list/ActionBtn";
import { CONFIRM_LOCK_LONG, CONFIRM_UNLOCK } from "../utils/documentList.constants";
import { getDocStatus, getRowPermissions } from "../utils/documentList.helpers";
import type { ModalMode, MailModalState } from "../components/list/documentList.types";
import type { DocumentListMutations } from "./useDocumentListMutations";

interface UseDocumentRowActionsArgs {
    isReadOnly: boolean | undefined;
    loadingEdit: boolean;
    lockMut: DocumentListMutations["lockMut"];
    unlockMut: DocumentListMutations["unlockMut"];
    cancelMut: DocumentListMutations["cancelMut"];
    navigate: NavigateFunction;
    typeCode: string | undefined;
    confirm: ReturnType<typeof useConfirm>["confirm"];
    approvalBatch: ReturnType<typeof useApprovalCheckBatch>["data"];
    openCancelModal: (docId: number | { id: number }) => void;
    setViewDocId: React.Dispatch<React.SetStateAction<number | null>>;
    setModal: React.Dispatch<React.SetStateAction<ModalMode>>;
    setPrintDocId: React.Dispatch<React.SetStateAction<number | null>>;
    setMailModal: React.Dispatch<React.SetStateAction<MailModalState | null>>;
}

export function useDocumentRowActions({
    isReadOnly, loadingEdit, lockMut, unlockMut, cancelMut, navigate, typeCode,
    confirm, approvalBatch, openCancelModal, setViewDocId, setModal, setPrintDocId, setMailModal,
}: UseDocumentRowActionsArgs) {
    const rowActions = useCallback((row: CommercialDocument) => {
        const { canEdit, canLock, canUnlock, canCancel } = getRowPermissions(row, !!isReadOnly);

        const handleCancel = () => {
            openCancelModal(row.id);
        };

        const rowStatus = getDocStatus(row);

        return (
            <div style={{ display: "flex", gap: 3, justifyContent: "center", alignItems: "center" }}>
                {/* عرض — دائماً متاح */}
                <ActionBtn icon="ti-eye" title="عرض" onClick={() => { setViewDocId(row.id); setModal("view"); }} />

                {/* طباعة */}
                <ActionBtn icon="ti-printer" title="طباعة" onClick={() => setPrintDocId(row.id)} />

                {/* تعديل — !is_locked && !is_exported */}
                    {canEdit && (
                    <ActionBtn
                        icon={loadingEdit ? "ti-loader-2" : "ti-pencil"}
                        title="تعديل" color="var(--blue)" disabled={loadingEdit}
                        onClick={() => navigate(typeCode === 'POS' ? `/pos?edit=${row.id}` : `/documents/${typeCode}/${row.id}/edit`)}
                    />
                )}

                {/* إرسال بالبريد */}
                {!isReadOnly && (
                    <ActionBtn
                        icon="ti-mail" title="إرسال بالبريد" color="var(--blue)"
                        onClick={() => {
                            const party = row.party as Record<string, unknown> | undefined;
                            setMailModal({
                                id: row.id,
                                documentNumber: String(row.document_number ?? `#${row.id}`),
                                partyName: String(party?.name ?? ''),
                                partyEmail: (party?.email as string) ?? null,
                                docTypeCode: typeCode ?? '',
                            });
                        }}
                    />
                )}

                {/* قفل — غير مقفل + غير ملغى */}
                {canLock && (
                    <ActionBtn
                        icon="ti-lock" title="قفل المستند" color="var(--orange)"
                        disabled={lockMut.isPending}
                        onClick={async () => {
                            if (await confirm(CONFIRM_LOCK_LONG))
                                lockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* فتح القفل — مقفل + غير مُصدَّر */}
                {canUnlock && (
                    <ActionBtn
                        icon="ti-lock-open" title="فتح القفل" color="var(--blue)"
                        disabled={unlockMut.isPending}
                        onClick={async () => {
                            if (await confirm(CONFIRM_UNLOCK))
                                unlockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* إلغاء */}
                {canCancel && (
                    <ActionBtn
                        icon="ti-ban" title="إلغاء" color="var(--red)"
                        disabled={cancelMut.isPending}
                        onClick={handleCancel}
                    />
                )}

                {/* موافقة / رفض */}
                <ApprovalActions
                    documentId={row.id}
                    statusSlug={rowStatus}
                    netToPay={Number(row.net_to_pay ?? row.total_ttc ?? 0)}
                    approvalCheck={approvalBatch?.[row.id]}
                />
            </div>
        );
    }, [isReadOnly, loadingEdit, lockMut, unlockMut, cancelMut, navigate, typeCode, setPrintDocId]);

    return rowActions;
}
