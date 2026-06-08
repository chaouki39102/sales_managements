// ─────────────────────────────────────────────────────────────
//  useNotification.ts
//  Hook مبسّط لإرسال التنبيهات الفورية من أي مكان في التطبيق
// ─────────────────────────────────────────────────────────────
import { useNotificationStore, type NotificationType, type ToastAction } from '@/lib/store/notificationStore';

export interface NotifyOptions {
  autoClose?: number;
  persistent?: boolean;
  action?: ToastAction;
}

// ── Hook الرئيسي ──────────────────────────────────────────
export const useNotification = () => {
  const { addToast, removeToast, clearAll } = useNotificationStore();

  const send = (
    type: NotificationType,
    title: string,
    message?: string,
    options?: NotifyOptions,
  ) =>
    addToast({ type, title, message, ...options });

  return {
    success: (title: string, message?: string, options?: NotifyOptions) =>
      send('success', title, message, options),

    error: (title: string, message?: string, options?: NotifyOptions) =>
      send('error', title, message, options),

    warning: (title: string, message?: string, options?: NotifyOptions) =>
      send('warning', title, message, options),

    info: (title: string, message?: string, options?: NotifyOptions) =>
      send('info', title, message, options),

    custom: (
      type: NotificationType,
      title: string,
      message?: string,
      options?: NotifyOptions,
    ) => send(type, title, message, options),

    remove:   removeToast,
    clearAll,
  };
};
