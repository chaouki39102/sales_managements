import React, { createContext, useContext, useEffect } from 'react';
import { useCurrentUser, useLogin, useLogout, useTwoFactorConfirm } from '@/lib/api/endpoints/auth';
import { useActiveCompany, useAppStore } from '@/lib/store/appStore';
import { getRememberPref, setSavedSession } from '@/lib/store/rememberMe';
import type { User, ActiveCompany, LoginCredentials, LoginResult } from '@/lib/api/core/types';

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:             User | null;
  isAuthenticated:  boolean;
  isLoading:        boolean;
  isSuperAdmin:     boolean;
  activeCompany:    ActiveCompany | null;
  login:            (creds: LoginCredentials) => Promise<LoginResult>;
  confirmTwoFactor: (challengeToken: string, code: string) => Promise<User>;
  logout:           () => Promise<void>;
  setActiveCompany: (company: ActiveCompany) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const activeCompany             = useActiveCompany();
  const selectedYearId            = useAppStore(s => s.selectedYearId);
  const setActiveCompanyInStore   = useAppStore(s => s.setActiveCompany);

  // ✅ "تذكرني": عندما يكون مفعّلاً للمستخدم، نُحدّث آخر { شركة + سنة } ناجحة
  //    تلقائياً كلما تغيّر السياق (اختيار شركة في onboarding، تبديل شركة/سنة
  //    من لوحة التحكم...). عند الدخول التالي تُستخدم هذه اللقطة للانتقال
  //    المباشر إلى لوحة التحكم.
  useEffect(() => {
    if (!user) return;
    if (!getRememberPref(user.id)) return;
    if (!activeCompany?.id || !activeCompany.slug || !selectedYearId) return;
    setSavedSession(user.id, { company: activeCompany, yearId: selectedYearId });
  }, [user, activeCompany, selectedYearId]);

  const loginMutation  = useLogin();
  const logoutMutation = useLogout();
  const confirm2FAMutation = useTwoFactorConfirm();

  const login = async (creds: LoginCredentials): Promise<LoginResult> => {
    return loginMutation.mutateAsync(creds);
  };

  const confirmTwoFactor = async (challengeToken: string, code: string): Promise<User> => {
    const result = await confirm2FAMutation.mutateAsync({ challenge_token: challengeToken, code });
    return result.user;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const setActiveCompany = (company: ActiveCompany) => {
    setActiveCompanyInStore(company);
  };

  const isSuperAdmin = user?.roles?.some(r => r.name === 'super-admin') ?? false;

  return (
    <AuthContext.Provider value={{
      user:            user ?? null,
      isAuthenticated: !!user,
      isLoading,
      isSuperAdmin,
      activeCompany,
      login,
      confirmTwoFactor,
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

export const useAuthUser        = () => useAuth().user;
export const useIsAuthenticated = () => useAuth().isAuthenticated;
export const useIsSuperAdmin    = () => useAuth().isSuperAdmin;
