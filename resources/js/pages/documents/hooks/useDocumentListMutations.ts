// pages/documents/hooks/useDocumentListMutations.ts
// عمليات القفل / فتح القفل / الإلغاء / الحذف لقائمة المستندات
import { useMutation } from "@tanstack/react-query";
import { apiPost, apiDelete } from "@/lib/api/core/client";
import type { useNotification } from '@/hooks/useNotification';

export function useDocumentListMutations(notify: ReturnType<typeof useNotification>, invalidateDocs: () => void) {
    // ── Mutations ─────────────────────────────────────────────────────────────
    const lockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/lock`),
        onSuccess: () => { notify.success("تم قفل المستند"); invalidateDocs(); },
        onError:   () => notify.error("فشل القفل"),
    });
    const unlockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/unlock`),
        onSuccess: () => { notify.success("تم فتح قفل المستند"); invalidateDocs(); },
        onError:   () => notify.error("فشل فتح القفل"),
    });
    const cancelMut = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            apiPost(`/documents/${id}/cancel`, { cancellation_reason: reason }),
        onSuccess: () => { notify.success("تم إلغاء المستند"); invalidateDocs(); },
        onError:   () => notify.error("فشل الإلغاء"),
    });
    const deleteMut = useMutation({
        mutationFn: (id: number) => apiDelete(`/documents/${id}`),
        onSuccess: () => { notify.success("تم حذف المستند"); invalidateDocs(); },
        onError:   (e: unknown) => notify.error(
            e instanceof Error ? (e.message || "فشل الحذف") : "فشل الحذف",
        ),
    });

    return { lockMut, unlockMut, cancelMut, deleteMut };
}

export type DocumentListMutations = ReturnType<typeof useDocumentListMutations>;
