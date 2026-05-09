// ════════════════════════════════════════════════
// context/AuthContext.tsx
// ════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api/client';
import type { User, LoginCredentials } from '@/types';

// ── Storage key للشركة النشطة ──────────────────
const ACTIVE_COMPANY_KEY = 'active_company';

export interface ActiveCompany {
  id:   number;
  name: string;
  slug: string;
}

interface AuthContextValue {
  user:            User | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  activeCompany:   ActiveCompany | null;
  login:           (creds: LoginCredentials) => Promise<User>;   // ✅ يُعيد المستخدم
  logout:          () => Promise<void>;
  updateUser:      (data: Partial<User>) => void;
  setActiveCompany:(company: ActiveCompany) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers ────────────────────────────────────
function loadActiveCompany(): ActiveCompany | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveActiveCompany(company: ActiveCompany | null) {
  try {
    if (company) sessionStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company));
    else sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,          setUser]          = useState<User | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [activeCompany, setActiveCompanyState] = useState<ActiveCompany | null>(loadActiveCompany);

  // ── Restore session on mount ──────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setIsLoading(false); return; }

    apiClient.get<{ data: User }>('/auth/me')
      .then(res => setUser(res.data.data))
      .catch(() => { clearAuthToken(); saveActiveCompany(null); })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login (returns user to allow role‑based redirect) ──
const login = useCallback(async (creds: LoginCredentials): Promise<User> => {
    // 1. تسجيل الدخول
    const res = await apiClient.post<{ data: { user: User; token: string } }>('/auth/login', creds);
    const { token } = res.data.data;
    setAuthToken(token);

    // 2. جلب المستخدم الكامل من /auth/me
    const meRes = await apiClient.get<{ data: User }>('/auth/me');
    const fullUser = meRes.data.data;
    setUser(fullUser);            // ← الآن يحتوي fullUser.roles

    return fullUser;
}, []);

  // ── Logout ────────────────────────────────────
  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    clearAuthToken();
    saveActiveCompany(null);
    setUser(null);
    setActiveCompanyState(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(u => u ? { ...u, ...data } : null);
  }, []);

  const setActiveCompany = useCallback((company: ActiveCompany) => {
    setActiveCompanyState(company);
    saveActiveCompany(company);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      activeCompany,
      login,
      logout,
      updateUser,
      setActiveCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const useAuthUser = () => useAuth().user;