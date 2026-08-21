import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/endpoints/notifications';
import { useActiveSlug } from '@/lib/store/appStore';
import type { NotificationsFilters } from '@/lib/api/endpoints/notifications';

export const notificationKeys = {
  all:    (slug: string) => [slug, 'notifications'] as const,
  unread: (slug: string) => [...notificationKeys.all(slug), 'unread'] as const,
  list:   (slug: string, filters: NotificationsFilters) => [...notificationKeys.all(slug), 'list', filters] as const,
};

export const useUnreadNotificationsQuery = () => {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: notificationKeys.unread(slug ?? ''),
    queryFn:  api.getUnreadNotifications,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: !!slug,
  });
};

export const useNotificationsQuery = (filters: NotificationsFilters = {}) => {
  const slug = useActiveSlug();
  return useQuery({
    queryKey: notificationKeys.list(slug ?? '', filters),
    queryFn:  () => api.getNotifications(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: !!slug,
  });
};

export const useMarkAsReadMutation = () => {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationAsRead(id),
    onSuccess: () => slug && qc.invalidateQueries({ queryKey: notificationKeys.all(slug) }),
  });
};

export const useMarkAllAsReadMutation = () => {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsAsRead,
    onSuccess: () => slug && qc.invalidateQueries({ queryKey: notificationKeys.all(slug) }),
  });
};

export const useDeleteNotificationMutation = () => {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => slug && qc.invalidateQueries({ queryKey: notificationKeys.all(slug) }),
  });
};

export const useDeleteMultipleNotificationsMutation = () => {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.deleteMultipleNotifications(ids),
    onSuccess: () => slug && qc.invalidateQueries({ queryKey: notificationKeys.all(slug) }),
  });
};
