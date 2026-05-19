// ════════════════════════════════════════════════════════════════════════════
// context/AuthContext.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   Zustand يحتفظ بالـ activeCompany/slug في sessionStorage (persist)
//   → بعد انتهاء الجلسة، عند فتح صفحة Login:
//     slug لا يزال موجوداً → FiscalYearProvider يُشغِّل query → 500
//
//   ملاحظة: useCurrentUser في auth.ts لديه retry:false وهو صحيح
//   المشكلة الوحيدة: auth/me يُعيد 500 (خطأ PHP syntax في الباكاند)
//   وليس 401 → الـ interceptor لا يُشغِّل forcedLogout → المشكلة في الباكاند
//
// الحل الصحيح هنا (frontend):
//   FiscalYearContext الجديد يقرأ isAuthenticated قبل تشغيل أي query
//   (انظر FiscalYearContext.tsx المُصلَح)
//
//   AuthContext: لا حاجة لتغييره — useLogout يستدعي appActions.reset()
//   الذي يمسح الـ slug. المشكلة كانت أن FiscalYearContext لا ينتظر Auth.
// ════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext } from 'react';
import { useCurrentUser, useLogin, useLogout } from '@/lib/api/endpoints/auth';
import { useActiveCompany, useAppStore } from '@/lib/store/appStore';
import type { User, ActiveCompany, LoginCredentials } from '@/lib/api/core/types';

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:             User | null;
  isAuthenticated:  boolean;
  isLoading:        boolean;
  isSuperAdmin:     boolean;
  activeCompany:    ActiveCompany | null;
  login:            (creds: LoginCredentials) => Promise<User>;
  logout:           () => Promise<void>;
  setActiveCompany: (company: ActiveCompany) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const activeCompany             = useActiveCompany();
  const setActiveCompanyInStore   = useAppStore(s => s.setActiveCompany);

  const loginMutation  = useLogin();
  const logoutMutation = useLogout();

  const login = async (creds: LoginCredentials): Promise<User> => {
    const result = await loginMutation.mutateAsync(creds);
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
