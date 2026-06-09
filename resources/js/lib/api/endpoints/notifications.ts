// ─────────────────────────────────────────────────────────────
//  notifications.ts  (lib/api/endpoints)
//  طبقة API للتنبيهات المخزنة في قاعدة البيانات
// ─────────────────────────────────────────────────────────────
import client from '@/lib/api/core/client';

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
  is_read: boolean;        // = read_at !== null
  created_at: string;
  created_at_human: string;
}

export interface NotificationsResponse {
  data: RemoteNotification[];
  unread_count: number;
}

// ── Endpoints ─────────────────────────────────────────────

/** جلب التنبيهات غير المقروءة */
export const getUnreadNotifications = () =>
  client.get<NotificationsResponse>('/notifications/unread');

/** تعليم تنبيه واحد كمقروء */
export const markNotificationAsRead = (id: string) =>
  client.post<{ message: string }>(`/notifications/${id}/read`);

/** تعليم جميع التنبيهات كمقروءة */
export const markAllNotificationsAsRead = () =>
  client.post<{ message: string }>('/notifications/read-all');
