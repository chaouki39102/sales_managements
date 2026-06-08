// ─────────────────────────────────────────────────────────────
//  useNotificationsQuery.ts
//  React Query hooks للتنبيهات المخزنة في قاعدة البيانات
// ─────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/endpoints/notifications';

// ── Query Keys ─────────────────────────────────────────────
export const notificationKeys = {
  all:    ['notifications'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
};

// ── Queries ────────────────────────────────────────────────

/** جلب التنبيهات غير المقروءة — تُحدَّث كل 30 ثانية */
export const useUnreadNotificationsQuery = () =>
  useQuery({
    queryKey: notificationKeys.unread(),
    queryFn:  api.getUnreadNotifications,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

// ── Mutations ──────────────────────────────────────────────

/** تعليم تنبيه واحد كمقروء */
export const useMarkAsReadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.unread() }),
  });
};

/** تعليم جميع التنبيهات كمقروءة */
export const useMarkAllAsReadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.unread() }),
  });
};
