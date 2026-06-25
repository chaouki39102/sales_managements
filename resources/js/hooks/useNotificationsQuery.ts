import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/endpoints/notifications';
import type { NotificationsFilters } from '@/lib/api/endpoints/notifications';

export const notificationKeys = {
  all:    ['notifications'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  list:   (filters: NotificationsFilters) => [...notificationKeys.all, 'list', filters] as const,
};

export const useUnreadNotificationsQuery = () =>
  useQuery({
    queryKey: notificationKeys.unread(),
    queryFn:  api.getUnreadNotifications,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

export const useNotificationsQuery = (filters: NotificationsFilters = {}) =>
  useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn:  () => api.getNotifications(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

export const useMarkAsReadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
};

export const useMarkAllAsReadMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
};

export const useDeleteNotificationMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
};

export const useDeleteMultipleNotificationsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.deleteMultipleNotifications(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
};
