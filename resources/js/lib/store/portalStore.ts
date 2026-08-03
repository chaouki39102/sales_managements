// ════════════════════════════════════════════════════════════════════════════
// lib/store/portalStore.ts — حالة جلسة بوابة الزبائن (zustand)
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { portalTokenStorage } from '@/lib/api/portal/client';

interface PortalState {
  portalUser: unknown | null;
  setPortalUser: (user: unknown) => void;
  authenticated: () => boolean;
  clearSession: () => void;
}

export const usePortalStore = create<PortalState>((set) => ({
  portalUser: null,
  setPortalUser: (user) => set({ portalUser: user }),
  authenticated: () => !!portalTokenStorage.get(),
  clearSession: () => {
    portalTokenStorage.clear();
    set({ portalUser: null });
  },
}));
