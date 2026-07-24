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
      <div className="cfm-body">
        <div className="cfm-icon-circle" style={{ background: variantBg[variant] }}>
          <i className={`ti ${icon || variantIcon[variant]}`} style={{ color: variantColor[variant] }} />
        </div>

        <p className="cfm-msg">{message}</p>
      </div>

      <div className="cfm-btns">
        <Button onClick={onCancel} disabled={loading}>{cancelText}</Button>
        <Button variant={variant} onClick={onConfirm} disabled={loading}>
          {loading ? 'جارٍ التحميل...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
