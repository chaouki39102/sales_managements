// ─────────────────────────────────────────────────────────────
//  lib/api/endpoints/notifications.ts
//  طبقة API للتنبيهات المخزنة في قاعدة البيانات
// ─────────────────────────────────────────────────────────────
import { client } from '@/lib/api/core/client';

// ── Types ──────────────────────────────────────────────────
export type RemoteNotificationType = 'success' | 'error' | 'warning' | 'info';

/** البيانات المُستقبَلة من الـ API (تعكس حقل data في النموذج) */
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

/** نفس شكل BackendMeta المتوقَّع من مكوّن Pagination الموحّد */
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

/** فلاتر صفحة /notifications */
export interface NotificationsFilters {
  type?: RemoteNotificationType;
  is_read?: boolean;
  page?: number;
  per_page?: number;
}

// ── Endpoints (موجودة مسبقاً) ─────────────────────────────

/** جلب التنبيهات غير المقروءة */
export const getUnreadNotifications = () =>
  client.get<NotificationsResponse>('/notifications/unread');

/** تعليم تنبيه واحد كمقروء */
export const markNotificationAsRead = (id: string) =>
  client.post<{ message: string }>(`/notifications/${id}/read`);

/** تعليم جميع التنبيهات كمقروءة */
export const markAllNotificationsAsRead = () =>
  client.post<{ message: string }>('/notifications/read-all');

// ── Endpoints 🆕 (لصفحة مركز التنبيهات) ──────────────────

/** جلب التنبيهات مُرقَّمة مع فلاتر اختيارية */
export const getNotifications = (filters: NotificationsFilters = {}) => {
  const params = new URLSearchParams();

  if (filters.type)     params.append('type', filters.type);
  if (filters.is_read !== undefined) params.append('is_read', String(filters.is_read));
  if (filters.page)     params.append('page', String(filters.page));
  if (filters.per_page) params.append('per_page', String(filters.per_page));

  const qs = params.toString();
  return client.get<PaginatedNotificationsResponse>(
    `/notifications${qs ? `?${qs}` : ''}`,
  );
};

/** حذف تنبيه واحد */
export const deleteNotification = (id: string) =>
  client.delete<{ message: string }>(`/notifications/${id}`);

/** حذف عدة تنبيهات دفعة واحدة */
export const deleteMultipleNotifications = (ids: string[]) =>
  client.post<{ deleted_count: number }>('/notifications/delete-multiple', { ids });
