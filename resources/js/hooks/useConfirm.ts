import { useState, useCallback, useRef } from 'react';

interface ConfirmState {
  open: boolean;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: string;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false, message: '',
  });
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((message: string, options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    icon?: string;
  }) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, message, ...options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current(true);
    setState(s => ({ ...s, open: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current(false);
    setState(s => ({ ...s, open: false }));
  }, []);

  return {
    confirm,
    confirmDialogProps: {
      open: state.open,
      message: state.message,
      title: state.title,
      confirmText: state.confirmText,
      cancelText: state.cancelText,
      variant: state.variant,
      icon: state.icon,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
