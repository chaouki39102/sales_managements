// resources/js/components/ui/ConfirmDeleteModal.tsx
import React from 'react';
import Modal  from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface Props {
    /** هل المودال مفتوح */
    open: boolean;
    /** دالة الإغلاق */
    onClose: () => void;
    /** دالة تأكيد الحذف */
    onConfirm: () => void;
    /** هل الحذف جارٍ (من useMutation.isPending) */
    loading?: boolean;
    /** اسم العنصر المراد حذفه — يظهر في الرسالة */
    itemName?: string;
    /** رسالة تحذير مخصصة تحت الاسم (اختياري) */
    warning?: string;
}

/**
 * مودال تأكيد الحذف — مكوّن مشترك لكامل المشروع
 *
 * الاستخدام:
 * ```tsx
 * const deleteModal = useModal();
 * const [deletingId, setDeletingId] = useState<number | null>(null);
 *
 * const deleteMutation = useMutation({
 *   mutationFn: (id: number) => apiClient.delete(`/resource/${id}`),
 *   onSuccess: () => { qc.invalidateQueries(...); deleteModal.closeModal(); },
 * });
 *
 * // عند الضغط على أيقونة الحذف:
 * const handleDelete = (id: number) => {
 *   setDeletingId(id);
 *   deleteModal.openModal();
 * };
 *
 * <ConfirmDeleteModal
 *   open={deleteModal.open}
 *   onClose={deleteModal.closeModal}
 *   onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
 *   loading={deleteMutation.isPending}
 *   itemName="الصندوق الرئيسي"
 * />
 * ```
 */
export default function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    loading = false,
    itemName,
    warning,
}: Props) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            title="تأكيد الحذف"
            footer={
                <>
                    <Button onClick={onClose} disabled={loading}>
                        إلغاء
                    </Button>
                    <Button
                        variant="danger"
                        icon={<i className="ti ti-trash" />}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'جاري الحذف...' : 'حذف'}
                    </Button>
                </>
            }
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0 4px',
                textAlign: 'center',
            }}>
                {/* أيقونة التحذير */}
                <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--red-bg, #fff1f0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <i className="ti ti-trash" style={{
                        fontSize: 24,
                        color: 'var(--red, #e03e3e)',
                    }} />
                </div>

                {/* النص الرئيسي */}
                <div>
                    <p style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--t1)',
                        lineHeight: 1.5,
                    }}>
                        {itemName
                            ? <>هل تريد حذف <span style={{ color: 'var(--red, #e03e3e)' }}>«{itemName}»</span>؟</>
                            : 'هل تريد حذف هذا العنصر؟'
                        }
                    </p>

                    <p style={{
                        margin: '6px 0 0',
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--red)',
                        lineHeight: 1.6,
                    }}>
                        {warning ?? 'لا يمكن التراجع عن هذا الإجراء بعد التأكيد.'}
                    </p>
                </div>
            </div>
        </Modal>
    );
}
