import React from 'react';

interface DeleteConfirmModalProps {
  deleteTarget: number | null;
  actionLoading: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  deleteTarget,
  actionLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (deleteTarget === null) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 24, width: 380, maxWidth: '90vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--red)' }}>
          <i className="ti ti-alert-triangle" style={{ marginLeft: 8 }} />
          تأكيد الحذف
        </div>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
          هل تريد حذف هذا القالب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', border: '1px solid var(--b2)', borderRadius: 6,
            background: 'var(--bg2)', color: 'var(--t2)', cursor: 'pointer', fontSize: 13,
          }} type="button">إلغاء</button>
          <button onClick={onConfirm} disabled={actionLoading !== null} style={{
            padding: '8px 16px', border: 'none', borderRadius: 6,
            background: 'var(--red)', color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, opacity: actionLoading ? 0.6 : 1,
          }} type="button">
            {actionLoading ? 'جاري الحذف…' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  );
}
