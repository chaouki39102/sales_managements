import type { RemoteNotificationType } from '@/lib/api/endpoints/notifications';

export const NOTIFICATION_TYPE_ICON: Record<RemoteNotificationType, string> = {
  success: 'ti-circle-check',
  error:   'ti-circle-x',
  warning: 'ti-alert-triangle',
  info:    'ti-info-circle',
};

export const NOTIFICATION_TYPE_COLOR: Record<RemoteNotificationType, string> = {
  success: 'var(--em)',
  error:   'var(--red)',
  warning: 'var(--gold)',
  info:    'var(--blue)',
};

export const NOTIFICATION_TYPE_BADGE_VARIANT: Record<
  RemoteNotificationType,
  'success' | 'danger' | 'warning' | 'info'
> = {
  success: 'success',
  error:   'danger',
  warning: 'warning',
  info:    'info',
};

export const NOTIFICATION_TYPE_LABEL: Record<RemoteNotificationType, string> = {
  success: 'نجاح',
  error:   'خطأ',
  warning: 'تحذير',
  info:    'معلومة',
};
