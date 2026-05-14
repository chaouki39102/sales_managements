// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/auth.ts
// ✅ مصحح: useLogin يُعيد AuthResponse لتمكين redirect بناءً على role
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, tokenStorage } from '../core/client';
import { authKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { clearAllCache } from '../core/queryClient';
import type { User, LoginCredentials, AuthResponse } from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const authApi = {
  me:     ()                        => apiGet<User>('/auth/me'),
  login:  (creds: LoginCredentials) => apiPost<AuthResponse>('/auth/login', creds),
  logout: ()                        => apiPost<void>('/auth/logout'),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey:  authKeys.me,
    queryFn:   authApi.me,
    enabled:   !!tokenStorage.get(),
    staleTime: Infinity,
    retry:     false,
  });
}

/**
 * ✅ يُعيد AuthResponse (user + token) لتمكين redirect بناءً على الدور
 *
 * مثال:
 *   const { mutateAsync: login } = useLogin();
 *   const result = await login(creds);
 *   if (result.user.roles?.some(r => r.name === 'super-admin')) {
 *     navigate('/admin');
 *   } else {
 *     navigate('/dashboard');
 *   }
 */
export function useLogin() {
  const qc = useQueryClient();

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: authApi.login,
    onSuccess: ({ user, token }) => {
      tokenStorage.set(token);
      // ✅ حفظ المستخدم مباشرة في الكاش — لا طلب /auth/me إضافي
      qc.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      tokenStorage.clear();
      appActions.reset();
      clearAllCache();
      window.location.href = '/login';
    },
  });
}
