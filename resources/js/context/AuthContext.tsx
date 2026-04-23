// ════════════════════════════════════════════════
// context/AuthContext.tsx
// ════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api/client';
import type { User, LoginCredentials } from '@/types';

interface AuthContextValue {
  user:            User | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (creds: LoginCredentials) => Promise<void>;
  logout:          () => Promise<void>;
  updateUser:      (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount ──────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setIsLoading(false); return; }

    apiClient.get<{ data: User }>('/auth/me')
      .then(res => setUser(res.data.data))
      .catch(() => clearAuthToken())
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login ─────────────────────────────────────
  const login = useCallback(async (creds: LoginCredentials) => {
    const res = await apiClient.post<{ data: { user: User; token: string } }>('/auth/login', creds);
    const { user: u, token } = res.data.data;
    setAuthToken(token);
    setUser(u);
  }, []);

  // ── Logout ────────────────────────────────────
  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    clearAuthToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(u => u ? { ...u, ...data } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateUser,
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

// ── Standalone hook alias ─────────────────────────
export const useAuthUser = () => useAuth().user;
