// pages/documents/hooks/useDocumentContextMenu.ts
// عناصر قائمة السياق (خلية / صف / رأس عمود / جدول) لجدول المستندات
import type React from "react";
import { useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { ContextMenuItem, ContextMenuContext } from "@/components/ui/DataTable";
import type { CommercialDocument } from "@/lib/api/core/types";
import type { useNotification } from '@/hooks/useNotification';
import type { useConfirm } from "@/hooks/useConfirm";
import { CONFIRM_LOCK_SHORT, CONFIRM_UNLOCK } from "../utils/documentList.constants";
import { getDocStatus, getRowPermissions } from "../utils/documentList.helpers";
import type { ModalMode, MailModalState } from "../components/list/documentList.types";
import type { DocumentListMutations } from "./useDocumentListMutations";

interface UseDocumentContextMenuArgs {
    hiddenColumnsSet: Set<string>;
    hiddenColumnKeys: string[];
    handleHiddenColumnsChange: (key: string, willBeHidden: boolean, allHidden: string[]) => void;
    isReadOnly: boolean | undefined;
    lockMut: DocumentListMutations["lockMut"];
    unlockMut: DocumentListMutations["unlockMut"];
    cancelMut: DocumentListMutations["cancelMut"];
    items: CommercialDocument[];
    navigate: NavigateFunction;
    typeCode: string | undefined;
    notify: ReturnType<typeof useNotification>;
    confirm: ReturnType<typeof useConfirm>["confirm"];
    setServerFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    setViewDocId: React.Dispatch<React.SetStateAction<number | null>>;
    setModal: React.Dispatch<React.SetStateAction<ModalMode>>;
    setConvertSourceCode: React.Dispatch<React.SetStateAction<string>>;
    setConvertDocId: React.Dispatch<React.SetStateAction<number | null>>;
    setMailModal: React.Dispatch<React.SetStateAction<MailModalState | null>>;
    openCancelModal: (docId: number | { id: number }) => void;
}

export function useDocumentContextMenu({
    hiddenColumnsSet, hiddenColumnKeys, handleHiddenColumnsChange, isReadOnly,
    lockMut, unlockMut, cancelMut, items, navigate, typeCode, notify, confirm,
    setServerFilters, setPage, setViewDocId, setModal, setConvertSourceCode,
    setConvertDocId, setMailModal, openCancelModal,
}: UseDocumentContextMenuArgs) {
    const contextMenuItems = useCallback((ctx: ContextMenuContext): ContextMenuItem[] => {
        const menuItems: ContextMenuItem[] = [];

        // ─── خلية ───────────────────────────────────────────────────────────
        if (ctx.type === "cell") {
            const row    = ctx.row as CommercialDocument | undefined;
            const colKey = ctx.colKey;
            const value  = row && colKey ? (row as unknown as Record<string, unknown>)[colKey] : undefined;

            menuItems.push(
                {
                    label: "نسخ القيمة",
                    icon: "copy",
                    onClick: () => {
                        const cellEl = document.querySelector(`[data-row-index="${ctx.rowIndex}"][data-col-key="${colKey}"]`);
                        const text   = cellEl?.textContent?.trim() ?? String(value ?? "");
                        if (text) { navigator.clipboard.writeText(text); notify.info("تم نسخ القيمة"); }
                    },
                },
                { label: "", divider: true, onClick: () => {} },
                {
                    label: "فلتر بنفس القيمة",
                    icon: "filter",
                    disabled: !colKey || value === undefined,
                    onClick: () => {
                        if (colKey && value !== undefined) {
                            setServerFilters(prev => ({ ...prev, [colKey]: String(value) }));
                            setPage(1);
                            notify.info(`تم تطبيق فلتر على: ${colKey}`);
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertDocId(row.id);
                    },
                },
            );
        }

        // ─── صف ─────────────────────────────────────────────────────────────
        if (ctx.type === "row") {
            const row = ctx.row as CommercialDocument | undefined;
            const { canEdit, canLock, canUnlock, canCancel } = row
                ? getRowPermissions(row, !!isReadOnly)
                : { canEdit: false, canLock: false, canUnlock: false, canCancel: false };

            menuItems.push(
                {
                    label: "نسخ رقم المستند",
                    icon: "copy",
                    disabled: !row?.document_number,
                    onClick: () => {
                        if (row?.document_number) {
                            navigator.clipboard.writeText(String(row.document_number));
                            notify.info("تم نسخ رقم المستند");
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertDocId(row.id);
                    },
                },
            );

            const editActions: ContextMenuItem[] = [];

            if (canEdit) {
                editActions.push({
                    label: "تعديل المستند",
                    icon: "pencil",
                    onClick: () => { if (row) navigate(typeCode === 'POS' ? `/pos?edit=${row.id}` : `/documents/${typeCode}/${row.id}/edit`); },
                });
            }
            if (!isReadOnly && row) {
                const party = row.party as Record<string, unknown> | undefined;
                editActions.push({
                    label: "إرسال بالبريد",
                    icon: "mail",
                    onClick: () => {
                        setMailModal({
                            id: row.id,
                            documentNumber: String(row.document_number ?? `#${row.id}`),
                            partyName: String(party?.name ?? ''),
                            partyEmail: (party?.email as string) ?? null,
                            docTypeCode: typeCode ?? '',
                        });
                    },
                });
            }
            if (canLock) {
                editActions.push({
                    label: "قفل المستند",
                    icon: "lock",
                    onClick: async () => {
                        if (row && await confirm(CONFIRM_LOCK_SHORT)) lockMut.mutate(row.id);
                    },
                });
            }
            if (canUnlock) {
                editActions.push({
                    label: "فتح قفل المستند",
                    icon: "lock-open",
                    onClick: async () => {
                        if (row && await confirm(CONFIRM_UNLOCK)) unlockMut.mutate(row.id);
                    },
                });
            }
            if (canCancel) {
                editActions.push({
                    label: "إلغاء المستند",
                    icon: "ban",
                    onClick: () => {
                        if (!row) return;
                        openCancelModal(row.id);
                    },
                });
            }

            if (editActions.length > 0) {
                menuItems.push({ label: "", divider: true, onClick: () => {} }, ...editActions);
            }
        }

        // ─── رأس العمود ─────────────────────────────────────────────────────
        if (ctx.type === "header") {
            const colKey   = ctx.colKey;
            const isHidden = colKey ? hiddenColumnsSet.has(colKey) : false;
            menuItems.push({
                label:    isHidden ? "إظهار العمود" : "إخفاء العمود",
                icon:     isHidden ? "eye" : "eye-off",
                disabled: !colKey,
                onClick: () => {
                    if (colKey) {
                        const updated = isHidden
                            ? hiddenColumnKeys.filter(k => k !== colKey)
                            : [...hiddenColumnKeys, colKey];
                        handleHiddenColumnsChange(colKey, !isHidden, updated);
                        notify.info(isHidden ? "تم إظهار العمود" : "تم إخفاء العمود");
                    }
                },
            });
        }

        // ─── جدول — قفل/فتح جماعي + إرسال جماعي للموافقة ──────────────────
        if ((ctx as any).type === "table" && !isReadOnly) {
            const lockable   = items.filter(r => getRowPermissions(r, false).canLock);
            const unlockable = items.filter(r => getRowPermissions(r, false).canUnlock);

            if (lockable.length > 0) {
                menuItems.push({
                    label: `قفل الكل (${lockable.length} مستند)`,
                    icon: "lock",
                    onClick: async () => {
                        if (!await confirm(`تأكيد قفل ${lockable.length} مستند في هذه الصفحة؟`)) return;
                        lockable.reduce(
                            (chain, doc) => chain.then(() => lockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => notify.success(`تم قفل ${lockable.length} مستند`));
                    },
                });
            }

            if (unlockable.length > 0) {
                menuItems.push({
                    label: `فتح قفل الكل (${unlockable.length} مستند)`,
                    icon: "lock-open",
                    onClick: async () => {
                        if (!await confirm(`تأكيد فتح قفل ${unlockable.length} مستند في هذه الصفحة؟`)) return;
                        unlockable.reduce(
                            (chain, doc) => chain.then(() => unlockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => notify.success(`تم فتح قفل ${unlockable.length} مستند`));
                    },
                });
            }
        }

        return menuItems;
    }, [hiddenColumnsSet, hiddenColumnKeys, handleHiddenColumnsChange, isReadOnly, lockMut, unlockMut, cancelMut, items, navigate, typeCode]);

    return contextMenuItems;
}
