// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/auth.ts
// ✅ مصحح: useLogin يُعيد AuthResponse لتمكين redirect بناءً على role
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, tokenStorage } from '../core/client';
import { authKeys } from '../core/queryKeys';
import { appActions } from '../../store/appStore';
import { clearAllCache } from '../core/queryClient';
import type {
  User,
  LoginCredentials,
  LoginResult,
  AuthResponse,
  TwoFactorConfirmPayload,
  TwoFactorSetupResponse,
  TwoFactorEnableResponse,
  TwoFactorRecoveryResponse,
} from '../core/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export const authApi = {
  me:     ()                        => apiGet<User>('/auth/me'),
  login:  (creds: LoginCredentials) => apiPost<LoginResult>('/auth/login', creds),
  logout: ()                        => apiPost<void>('/auth/logout'),
} as const;

// ─── 2FA (public confirm + authenticated setup/enable/disable) ────────────────
export const twoFactorApi = {
  confirm:       (payload: TwoFactorConfirmPayload)  => apiPost<AuthResponse>('/auth/two-factor/confirm', payload),
  setup:         ()                                   => apiGet<TwoFactorSetupResponse>('/auth/two-factor/setup'),
  enable:        (code: string)                       => apiPost<TwoFactorEnableResponse>('/auth/two-factor/enable', { code }),
  disable:       (code: string)                       => apiPost<{ enabled: boolean }>('/auth/two-factor/disable', { code }),
  recoveryCodes: ()                                   => apiPost<TwoFactorRecoveryResponse>('/auth/two-factor/recovery-codes'),
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
 * ✅ يُعيد LoginResult (user + token أو تحدّي 2FA)
 *
 * مثال:
 *   const { mutateAsync: login } = useLogin();
 *   const result = await login(creds);
 *   if (result.two_factor_required) {
 *     // أظهر شاشة إدخال رمز 2FA (result.challenge_token)
 *   } else if (result.user.roles?.some(r => r.name === 'super-admin')) {
 *     navigate('/admin');
 *   } else {
 *     navigate('/dashboard');
 *   }
 */
export function useLogin() {
  const qc = useQueryClient();

  return useMutation<LoginResult, Error, LoginCredentials>({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      // تحدّي 2FA لا يحمل توكن — لا نُخزّن شيئاً (التوكن يأتي من confirm)
      if (!result.two_factor_required) {
        tokenStorage.set(result.token);
      }
      if (result.user) {
        // ✅ حفظ المستخدم مباشرة في الكاش — لا طلب /auth/me إضافي
        qc.setQueryData(authKeys.me, result.user);
      }
    },
  });
}

/**
 * الخطوة الثانية من تسجيل الدخول: تحقق 2FA → التوكن.
 */
export function useTwoFactorConfirm() {
  const qc = useQueryClient();

  return useMutation<AuthResponse, Error, TwoFactorConfirmPayload>({
    mutationFn: twoFactorApi.confirm,
    onSuccess: ({ user, token }) => {
      tokenStorage.set(token);
      qc.setQueryData(authKeys.me, user);
    },
  });
}

// ─── 2FA enrollment mutations (Settings → الأمان) ─────────────────────────────
export function useTwoFactorSetup()          { return useMutation({ mutationFn: twoFactorApi.setup }); }
export function useTwoFactorEnable()         { return useMutation({ mutationFn: twoFactorApi.enable }); }
export function useTwoFactorDisable()        { return useMutation({ mutationFn: twoFactorApi.disable }); }
export function useTwoFactorRecoveryCodes()  { return useMutation({ mutationFn: twoFactorApi.recoveryCodes }); }

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
