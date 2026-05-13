// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/auth.ts
// Auth API — endpoints + React Query hooks
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, tokenStorage } from '../core/client';
import { authKeys, companyKeys, tenantKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { clearAllCache } from '../core/queryClient';
import type { User, LoginCredentials, AuthResponse } from '../core/types';

// ─── API functions ────────────────────────────────────────────────────────────

export const authApi = {
  me:     ()                       => apiGet<User>('/auth/me'),
  login:  (creds: LoginCredentials) => apiPost<AuthResponse>('/auth/login', creds),
  logout: ()                       => apiPost<void>('/auth/logout'),
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * جلب المستخدم الحالي — يُشغَّل فقط إذا كان هناك token
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn:  authApi.me,
    enabled:  !!tokenStorage.get(),
    staleTime: Infinity, // لا تُعد الجلب تلقائياً — يُبطَل يدوياً عند logout
    retry: false,
  });
}

/**
 * تسجيل الدخول
 */
export function useLogin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, token }) => {
      tokenStorage.set(token);
      // حفظ المستخدم مباشرة في الكاش بدون طلب إضافي
      qc.setQueryData(authKeys.me, user);
    },
  });
}

/**
 * تسجيل الخروج — يُنظف كل الحالة
 */
export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // نُنظف حتى لو فشل الطلب
      tokenStorage.clear();
      appActions.reset();
      clearAllCache();
      window.location.href = '/login';
    },
  });
}
