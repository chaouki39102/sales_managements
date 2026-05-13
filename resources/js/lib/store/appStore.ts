// ════════════════════════════════════════════════════════════════════════════
// lib/store/appStore.ts
// Zustand — للحالة المحلية فقط (لا server state هنا)
// React Query يتولى كل بيانات الـ API
// ════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ActiveCompany } from '../api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppState {
  // الشركة النشطة
  activeCompany:    ActiveCompany | null;
  // السنة المالية المختارة (id فقط — البيانات من React Query)
  selectedYearId:   number | null;
  // السايدبار
  sidebarCollapsed: boolean;
  // الثيم
  theme:            'light' | 'dark' | 'auto';
}

interface AppActions {
  setActiveCompany:   (company: ActiveCompany | null) => void;
  setSelectedYearId:  (id: number | null) => void;
  toggleSidebar:      () => void;
  setSidebarCollapsed:(collapsed: boolean) => void;
  setTheme:           (theme: AppState['theme']) => void;
  reset:              () => void;
}

type AppStore = AppState & AppActions;

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: AppState = {
  activeCompany:    null,
  selectedYearId:   null,
  sidebarCollapsed: false,
  theme:            'auto',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    immer((set) => ({
      ...initialState,

      setActiveCompany: (company) =>
        set((state) => {
          // تغيير الشركة → إعادة تعيين السنة المختارة
          if (state.activeCompany?.slug !== company?.slug) {
            state.selectedYearId = null;
          }
          state.activeCompany = company;
        }),

      setSelectedYearId: (id) =>
        set((state) => { state.selectedYearId = id; }),

      toggleSidebar: () =>
        set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed; }),

      setSidebarCollapsed: (collapsed) =>
        set((state) => { state.sidebarCollapsed = collapsed; }),

      setTheme: (theme) =>
        set((state) => { state.theme = theme; }),

      reset: () => set(initialState),
    })),

    {
      name:    'app-store',
      storage: createJSONStorage(() => sessionStorage),
      // persist فقط الحالة الضرورية بين الصفحات
      partialize: (state) => ({
        activeCompany:    state.activeCompany,
        selectedYearId:   state.selectedYearId,
        sidebarCollapsed: state.sidebarCollapsed,
        theme:            state.theme,
      }),
    },
  ),
);

// ─── Selectors (محسَّنة — كل selector يقرأ فقط ما يحتاجه) ───────────────────

export const useActiveCompany    = () => useAppStore((s) => s.activeCompany);
export const useActiveSlug       = () => useAppStore((s) => s.activeCompany?.slug ?? null);
export const useSelectedYearId   = () => useAppStore((s) => s.selectedYearId);
export const useSidebarCollapsed = () => useAppStore((s) => s.sidebarCollapsed);
export const useTheme            = () => useAppStore((s) => s.theme);

// ─── Actions (خارج React — للاستخدام في Interceptors وما شابه) ──────────────

export const appActions = {
  getActiveSlug: () => useAppStore.getState().activeCompany?.slug ?? null,
  setActiveCompany: (company: ActiveCompany | null) =>
    useAppStore.getState().setActiveCompany(company),
  reset: () => useAppStore.getState().reset(),
};
