// ════════════════════════════════════════════════════════════════════════════
// lib/store/uiStore.ts
//
// ✅ حالة واجهة المستخدم العامة — مستخرجة من usePOSStore.ts
//
// التغييرات:
//   - sidebarCollapsed مُحذف من هنا — المصدر الوحيد هو appStore.ts
//     (appStore يُستمر في sessionStorage وهو الأنسب للـ multi-tenant)
//   - notifications, loading, toasts تبقى هنا
// ════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toast {
  id:       string;
  type:     'success' | 'error' | 'warning' | 'info';
  message:  string;
  duration?: number;
}

interface UIState {
  notifications:   number;
  toasts:          Toast[];
  globalLoading:   boolean;
}

interface UIActions {
  setNotifications:  (n: number) => void;
  addToast:          (toast: Omit<Toast, 'id'>) => void;
  removeToast:       (id: string) => void;
  clearToasts:       () => void;
  setGlobalLoading:  (loading: boolean) => void;
}

type UIStore = UIState & UIActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      notifications:  0,
      toasts:         [],
      globalLoading:  false,

      setNotifications: (n) => set({ notifications: n }),

      addToast: (toast) => {
        const id = Math.random().toString(36).slice(2);
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        // إزالة تلقائية بعد المدة المحددة
        const duration = toast.duration ?? 4000;
        if (duration > 0) {
          setTimeout(() => get().removeToast(id), duration);
        }
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      clearToasts: () => set({ toasts: [] }),

      setGlobalLoading: (loading) => set({ globalLoading: loading }),
    }),
    {
      name:    'ui-store',
      storage: createJSONStorage(() => localStorage),
      // نُستمر فقط عدد الإشعارات — الـ toasts مؤقتة
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useNotifications  = () => useUIStore((s) => s.notifications);
export const useToasts         = () => useUIStore((s) => s.toasts);
export const useGlobalLoading  = () => useUIStore((s) => s.globalLoading);

// ─── Actions (خارج React) ─────────────────────────────────────────────────────

export const uiActions = {
  addToast:         (toast: Omit<Toast, 'id'>) =>
    useUIStore.getState().addToast(toast),
  setNotifications: (n: number) =>
    useUIStore.getState().setNotifications(n),
  setGlobalLoading: (loading: boolean) =>
    useUIStore.getState().setGlobalLoading(loading),
};
