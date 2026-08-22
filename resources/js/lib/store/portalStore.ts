// ════════════════════════════════════════════════════════════════════════════
// lib/store/portalStore.ts — حالة جلسة بوابة الزبائن (zustand)
// ════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { portalTokenStorage } from '@/lib/api/portal/client';
import type { PortalUser } from '@/lib/api/portal/portal';

interface PortalState {
  portalUser: PortalUser | null;
  setPortalUser: (user: PortalUser | ((prev: PortalUser | null) => PortalUser | null)) => void;
  authenticated: () => boolean;
  clearSession: () => void;
}

export const usePortalStore = create<PortalState>((set) => ({
  portalUser: null,
  setPortalUser: (user) => set((s) => ({
    portalUser: typeof user === 'function' ? user(s.portalUser) : user,
  })),
  authenticated: () => !!portalTokenStorage.get(),
  clearSession: () => {
    portalTokenStorage.clear();
    set({ portalUser: null });
  },
}));
