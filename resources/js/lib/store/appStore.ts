// ════════════════════════════════════════════════════════════════════════════
// lib/store/appStore.ts
//
// Zustand — حالة التطبيق المحلية (لا server state هنا — تلك مهمة React Query)
//
// ✅ هذا الملف هو المصدر الوحيد لـ:
//    - activeCompany (slug, id, name)  ← يقرأه الـ Interceptor
//    - selectedYearId                  ← يتغير مع تبديل الشركة
//    - sidebarCollapsed                ← ❌ لا تُعرِّفه في uiStore أيضاً
//    - theme
//
// ⚠️  sidebarCollapsed مُعرَّف هنا فقط — لا تُضفه لأي store آخر
// ════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ActiveCompany } from '../api/core/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppState {
  activeCompany:    ActiveCompany | null;
  selectedYearId:   number | null;
  sidebarCollapsed: boolean;    // ← المصدر الوحيد لهذه القيمة
  theme:            'light' | 'dark' | 'auto';
}

interface AppActions {
  setActiveCompany:    (company: ActiveCompany | null) => void;
  setSelectedYearId:   (id: number | null) => void;
  toggleSidebar:       () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme:            (theme: AppState['theme']) => void;
  reset:               () => void;
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
          // تغيير الشركة → إعادة تعيين السنة المختارة تلقائياً
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
      // persist فقط الحالة الضرورية بين الصفحات داخل نفس الجلسة
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
export const useCurrentTheme     = () => useAppStore((s) => s.theme);

// ─── Actions (خارج React — للـ Interceptors والـ event handlers) ─────────────

export const appActions = {
  getActiveSlug:     () => useAppStore.getState().activeCompany?.slug ?? null,
  getSelectedYearId: () => useAppStore.getState().selectedYearId,
  setActiveCompany:  (company: ActiveCompany | null) =>
    useAppStore.getState().setActiveCompany(company),
  setSelectedYearId: (id: number | null) =>
    useAppStore.getState().setSelectedYearId(id),
  reset:             () => useAppStore.getState().reset(),
};
