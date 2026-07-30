// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/SendDocumentMailModal.tsx
// مودال إرسال المستند بالبريد الإلكتروني
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { apiPost } from '@/lib/api/core/client';
import { useNotification } from '@/hooks/useNotification';

interface SendDocumentMailModalProps {
  documentId:   number;
  documentNumber: string;
  partyName?:   string;
  partyEmail?:  string | null;
  onClose:      () => void;
}

export function SendDocumentMailModal({ documentId, documentNumber, partyName, partyEmail, onClose }: SendDocumentMailModalProps) {
  const notify = useNotification();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await apiPost(`/documents/${documentId}/send-mail`, { message: message || undefined });
      notify.success(`تم إرسال المستند ${documentNumber} للزبون بنجاح`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إرسال البريد';
      notify.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label="إرسال المستند بالبريد"
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        direction: 'rtl',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: 'var(--bg1)',
          borderRadius: 'var(--r3)', padding: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'color-mix(in srgb, var(--blue) 12%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-mail" style={{ fontSize: 18, color: 'var(--blue)' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>إرسال بالبريد الإلكتروني</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>
              المستند: {documentNumber}
            </p>
          </div>
        </div>

        {/* Recipient info */}
        <div style={{
          padding: '10px 14px', borderRadius: 8, background: 'var(--bg2)',
          marginBottom: 16, fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-user" style={{ fontSize: 14, color: 'var(--t3)' }} />
            <span style={{ fontWeight: 600 }}>{partyName || '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <i className="ti ti-mail" style={{ fontSize: 14, color: 'var(--t3)' }} />
            <span style={{ color: partyEmail ? 'var(--t1)' : 'var(--red)' }}>
              {partyEmail || 'الزبون لا يملك بريد إلكتروني'}
            </span>
          </div>
        </div>

        {!partyEmail && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'color-mix(in srgb, var(--red) 8%, transparent)',
            color: 'var(--red)', fontSize: 12, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />
            لا يمكن إرسال البريد — الزبون لا يملك عنوان بريد إلكتروني.
            قم بتحديث بيانات الزبون أولاً.
          </div>
        )}

        {/* Message */}
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', display: 'block', marginBottom: 6 }}>
          رسالة اختيارية
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="مرفق لكم المستند..."
          rows={3}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-start' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !partyEmail}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: 'none', background: 'var(--blue)', color: '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              opacity: sending || !partyEmail ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {sending ? (
              <><i className="ti ti-loader-2" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }} /> جاري الإرسال...</>
            ) : (
              <><i className="ti ti-send" style={{ fontSize: 14 }} /> إرسال</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
