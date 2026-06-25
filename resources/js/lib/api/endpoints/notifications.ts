import { apiGet, apiPost, apiDelete } from '@/lib/api/core/client';

export type RemoteNotificationType = 'success' | 'error' | 'warning' | 'info';

export interface RemoteNotification {
  id: string;
  type: RemoteNotificationType;
  title: string;
  message?: string;
  action_url?: string;
  icon?: string;
  is_read: boolean;
  created_at: string;
  created_at_human: string;
}

export interface NotificationsResponse {
  data: RemoteNotification[];
  unread_count: number;
}

export interface NotificationsMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  is_first_page: boolean;
  is_last_page: boolean;
}

export interface PaginatedNotificationsResponse {
  data: RemoteNotification[];
  meta: NotificationsMeta;
}

export interface NotificationsFilters {
  type?: RemoteNotificationType;
  is_read?: boolean;
  page?: number;
  per_page?: number;
}

export const getUnreadNotifications = () =>
  apiGet<NotificationsResponse>('/notifications/unread');

export const markNotificationAsRead = (id: string) =>
  apiPost<{ message: string }>(`/notifications/${id}/read`);

export const markAllNotificationsAsRead = () =>
  apiPost<{ message: string }>('/notifications/read-all');

export const getNotifications = (filters: NotificationsFilters = {}) =>
  apiGet<PaginatedNotificationsResponse>('/notifications', filters);

export const deleteNotification = (id: string) =>
  apiDelete(`/notifications/${id}`);

export const deleteMultipleNotifications = (ids: string[]) =>
  apiPost<{ deleted_count: number }>('/notifications/delete-multiple', { ids });
