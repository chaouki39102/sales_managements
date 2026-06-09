// ─────────────────────────────────────────────────────────────
//  NotificationContainer.tsx
//  حاوية ثابتة تعرض جميع الـ Toasts — توضع مرة واحدة في App.tsx
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { useNotificationStore } from '@/lib/store/notificationStore';
import NotificationToast from '@/components/notifications/NotificationToast';

/**
 * @example
 * // في App.tsx — مرة واحدة فقط
 * <NotificationContainer />
 */
const NotificationContainer: React.FC = () => {
  const toasts = useNotificationStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="ntf-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <NotificationToast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default NotificationContainer;
