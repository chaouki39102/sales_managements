// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/ApprovalWorkflow.tsx
// مكون سير عمل الموافقة على المستندات
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApprovalCheck, useApprovalMutations } from '@/lib/api/endpoints/approvals';
import { useNotification } from '@/hooks/useNotification';
import type { ApprovalCheck } from '@/lib/api/endpoints/approvals';

// ─── Approval Status Badge ────────────────────────────────────────────────────

interface ApprovalStatusBadgeProps {
  documentId: number;
  statusSlug: string;
  approvalCheck?: ApprovalCheck;
}

export function ApprovalStatusBadge({ documentId, statusSlug, approvalCheck }: ApprovalStatusBadgeProps) {
  const { data: hookCheck } = useApprovalCheck(approvalCheck === undefined ? documentId : null);
  const check = approvalCheck ?? hookCheck;

  if (statusSlug === 'pending_approval') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
        color: 'var(--orange)',
      }}>
        <i className="ti ti-clock" style={{ fontSize: 12 }} />
        قيد الموافقة
      </span>
    );
  }

  if (statusSlug === 'rejected') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: 'color-mix(in srgb, var(--red) 12%, transparent)',
        color: 'var(--red)',
      }}>
        <i className="ti ti-x" style={{ fontSize: 12 }} />
        مرفوض
      </span>
    );
  }

  if (check?.requires_approval && statusSlug === 'validated') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: 'color-mix(in srgb, var(--green) 12%, transparent)',
        color: 'var(--green)',
      }}>
        <i className="ti ti-check" style={{ fontSize: 12 }} />
        تمت الموافقة
      </span>
    );
  }

  return null;
}

// ─── Approval Actions (for document row) ──────────────────────────────────────

interface ApprovalActionsProps {
  documentId: number;
  statusSlug: string;
  netToPay?: number;
  approvalCheck?: ApprovalCheck;
}

export function ApprovalActions({ documentId, statusSlug, approvalCheck }: ApprovalActionsProps) {
  const notify = useNotification();
  const { data: hookCheck } = useApprovalCheck(approvalCheck === undefined ? documentId : null);
  const check = approvalCheck ?? hookCheck;
  const { submit, approve, reject } = useApprovalMutations();
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const canSubmit = check?.requires_approval && statusSlug === 'validated';
  const canApprove = statusSlug === 'pending_approval';
  const canReject = statusSlug === 'pending_approval';

  const handleSubmit = () => {
    submit.mutate(documentId, {
      onSuccess: () => notify.success('تم إرسال المستند للموافقة'),
      onError: (e: Error) => notify.error(e.message || 'فشل الإرسال'),
    });
  };

  const handleApprove = () => {
    approve.mutate({ documentId }, {
      onSuccess: () => notify.success('تمت الموافقة على المستند'),
      onError: (e: Error) => notify.error(e.message || 'فشلت الموافقة'),
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    reject.mutate({ documentId, reason: rejectReason }, {
      onSuccess: () => {
        notify.success('تم رفض المستند');
        setRejectModal(false);
        setRejectReason('');
      },
      onError: (e: Error) => notify.error(e.message || 'فشل الرفض'),
    });
  };

  if (!canSubmit && !canApprove && !canReject) return null;

  return (
    <>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {canSubmit && (
          <button
            onClick={handleSubmit}
            disabled={submit.isPending}
            title="إرسال للموافقة"
            style={{
              background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
              color: 'var(--orange)', border: 'none', borderRadius: 6,
              padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <i className="ti ti-send" style={{ fontSize: 12 }} />
            إرسال للموافقة
          </button>
        )}
        {canApprove && (
          <button
            onClick={handleApprove}
            disabled={approve.isPending}
            title="موافقة"
            style={{
              background: 'color-mix(in srgb, var(--green) 12%, transparent)',
              color: 'var(--green)', border: 'none', borderRadius: 6,
              padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <i className="ti ti-check" style={{ fontSize: 12 }} />
            موافقة
          </button>
        )}
        {canReject && (
          <button
            onClick={() => setRejectModal(true)}
            title="رفض"
            style={{
              background: 'color-mix(in srgb, var(--red) 12%, transparent)',
              color: 'var(--red)', border: 'none', borderRadius: 6,
              padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 12 }} />
            رفض
          </button>
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="رفض المستند"
        size="sm"
        resizable={false}
        footer={
          <>
            <button className="btn" onClick={() => setRejectModal(false)}>
              إلغاء
            </button>
            <button
              className="btn btn-r"
              onClick={handleReject}
              disabled={reject.isPending || !rejectReason.trim()}
              style={{ opacity: reject.isPending || !rejectReason.trim() ? 0.5 : 1 }}
            >
              {reject.isPending ? 'جاري الرفض...' : 'تأكيد الرفض'}
            </button>
          </>
        }
      >
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', display: 'block', marginBottom: 6 }}>
          سبب الرفض <span style={{ color: 'var(--red)' }}>*</span>
        </label>
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="اكتب سبب الرفض..."
          rows={3}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
          }}
          autoFocus
        />
      </Modal>
    </>
  );
}
