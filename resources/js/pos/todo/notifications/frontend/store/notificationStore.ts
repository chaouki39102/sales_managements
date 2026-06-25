// ─────────────────────────────────────────────────────────────
//  notificationStore.ts
//  Zustand store لإدارة التنبيهات الفورية (client-side)
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ── Types ──────────────────────────────────────────────────
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  autoClose?: number;   // ms — 0 = لا يختفي تلقائياً
  persistent?: boolean; // لا يُحذف حتى يضغط المستخدم
  action?: ToastAction;
}

interface NotificationStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// ── Helpers ────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_AUTO_CLOSE: Record<NotificationType, number> = {
  success: 4000,
  error:   7000,
  warning: 5500,
  info:    4500,
};

// ── Store ──────────────────────────────────────────────────
export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set) => ({
      toasts: [],

      addToast: (toast) => {
        const id = uid();
        const autoClose = toast.autoClose ?? DEFAULT_AUTO_CLOSE[toast.type];

        set((s) => ({
          toasts: [{ id, autoClose, ...toast }, ...s.toasts],
        }));

        // حذف تلقائي بعد المدة المحددة
        if (!toast.persistent && autoClose > 0) {
          setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
          }, autoClose);
        }

        return id;
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      clearAll: () => set({ toasts: [] }),
    }),
    { name: 'NotificationStore' }
  )
);
