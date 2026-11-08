// pages/documents/components/list/CancelDocumentModal.tsx
// إلغاء المستند — مودال مع textarea
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { CancelModalState } from "./documentList.types";

interface CancelDocumentModalProps {
    cancelModal: CancelModalState;
    setCancelModal: (m: CancelModalState | null) => void;
    cancelMut: { isPending: boolean; mutate: (v: { id: number; reason: string }) => void };
}

export default function CancelDocumentModal({ cancelModal, setCancelModal, cancelMut }: CancelDocumentModalProps) {
    return (
        <Modal
            open={true}
            onClose={() => setCancelModal(null)}
            size="sm"
            title="إلغاء المستند"
            footer={
                <>
                    <Button onClick={() => setCancelModal(null)} disabled={cancelMut.isPending}>
                        إلغاء
                    </Button>
                    <Button
                        variant="danger"
                        icon={<i className="ti ti-ban" />}
                        onClick={() => {
                            if (!cancelModal.reason.trim()) return;
                            cancelMut.mutate({ id: cancelModal.id, reason: cancelModal.reason.trim() });
                            setCancelModal(null);
                        }}
                        disabled={cancelMut.isPending || !cancelModal.reason.trim()}
                    >
                        {cancelMut.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                    </Button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
                    {cancelModal.stockInfo && cancelModal.stockInfo.quantity > 0
                        ? `هل أنت متأكد؟ سيُسترجع المخزون (${cancelModal.stockInfo.quantity.toLocaleString('fr-DZ', { maximumFractionDigits: 3 })} ${cancelModal.stockInfo.unit ?? 'وحدة'})`
                        : 'سيتم إلغاء هذا المستند. لا يمكن التراجع عن هذا الإجراء.'}
                </div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
                    سبب الإلغاء <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                    autoFocus
                    style={{
                        width: '100%', minHeight: 80, resize: 'vertical',
                        padding: '8px 10px', borderRadius: 'var(--r2)',
                        border: `1px solid ${cancelModal.reason.trim() ? 'var(--b3)' : 'var(--red)'}`,
                        background: 'var(--bg1)', color: 'var(--t1)',
                        fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    }}
                    value={cancelModal.reason}
                    onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                    placeholder="اذكر سبب الإلغاء..."
                />
            </div>
        </Modal>
    );
}
