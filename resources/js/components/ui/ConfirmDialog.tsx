import React from 'react';
import Modal  from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantIcon: Record<ConfirmVariant, string> = {
  danger:  'ti-alert-triangle',
  warning: 'ti-alert-circle',
  info:    'ti-question-mark',
};

const variantColor: Record<ConfirmVariant, string> = {
  danger:  'var(--red)',
  warning: 'var(--gold)',
  info:    'var(--blue)',
};

const variantBg: Record<ConfirmVariant, string> = {
  danger:  'var(--red-bg, #fff1f0)',
  warning: 'var(--gold-bg, #fffbe6)',
  info:    'var(--blue-bg, #e6f4ff)',
};

export default function ConfirmDialog({
  open,
  title = 'تأكيد',
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm" title={title}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0 4px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: variantBg[variant],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${icon || variantIcon[variant]}`} style={{
            fontSize: 24, color: variantColor[variant],
          }} />
        </div>

        <p style={{
          margin: 0, fontSize: 15, fontWeight: 600,
          color: 'var(--t1)', lineHeight: 1.5,
        }}>
          {message}
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16,
      }}>
        <Button onClick={onCancel} disabled={loading}>{cancelText}</Button>
        <Button variant={variant} onClick={onConfirm} disabled={loading}>
          {loading ? 'جارٍ التحميل...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
