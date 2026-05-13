// ════════════════════════════════════════════════════════════════════════════
// context/AuthContext.tsx
// Auth Context — الآن يقرأ من React Query + Zustand فقط
// لا state محلية — single source of truth
// ════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useCurrentUser, useLogin, useLogout } from '@/lib/api/endpoints/auth';
import { useActiveCompany, useAppStore } from '@/lib/store/appStore';
import type { User, ActiveCompany, LoginCredentials } from '@/lib/api/core/types';

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:              User | null;
  isAuthenticated:   boolean;
  isLoading:         boolean;
  activeCompany:     ActiveCompany | null;
  login:             (creds: LoginCredentials) => Promise<void>;
  logout:            () => Promise<void>;
  setActiveCompany:  (company: ActiveCompany) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const activeCompany   = useActiveCompany();
  const setActiveCompanyInStore = useAppStore(s => s.setActiveCompany);

  const loginMutation  = useLogin();
  const logoutMutation = useLogout();

  const login = async (creds: LoginCredentials) => {
    await loginMutation.mutateAsync(creds);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const setActiveCompany = (company: ActiveCompany) => {
    setActiveCompanyInStore(company);
  };

  return (
    <AuthContext.Provider value={{
      user:            user ?? null,
      isAuthenticated: !!user,
      isLoading,
      activeCompany,
      login,
      logout,
      setActiveCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const useAuthUser         = () => useAuth().user;
export const useIsAuthenticated  = () => useAuth().isAuthenticated;
