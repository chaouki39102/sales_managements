import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUnreadNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } from '@/hooks/useNotificationsQuery';
import { useNotification } from '@/hooks/useNotification';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { NOTIFICATION_TYPE_ICON, NOTIFICATION_TYPE_COLOR } from '@/lib/constants/notification.constants';

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notify = useNotification();

  const { data, isLoading } = useUnreadNotificationsQuery();
  const markOneMutation    = useMarkAsReadMutation();
  const markAllMutation    = useMarkAllAsReadMutation();

  const notifications = data?.data ?? [];
  const unreadCount   = data?.unread_count ?? 0;

  useOnClickOutside(ref, () => setOpen(false));

  const handleMarkAll = async () => {
    try {
      await markAllMutation.mutateAsync();
      notify.success('تم', 'تم تحديد جميع الإشعارات كمقروءة');
    } catch {
      notify.error('خطأ', 'فشل تحديث الإشعارات');
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await markOneMutation.mutateAsync(id);
    } catch {
      notify.error('خطأ', 'فشل تحديث الإشعار');
    }
  };

  return (
    <div className="ntf-bell" ref={ref}>
      <button
        className={`ntf-bell__btn ${open ? 'ntf-bell__btn--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
        aria-expanded={open}
      >
        <span className="ic ic-sm"><i className="ti ti-bell" /></span>
        {unreadCount > 0 && (
          <span className="ntf-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="ntf-bell__dropdown">
          <div className="ntf-bell__hd">
            <span className="ntf-bell__hd-title">
              الإشعارات
              {unreadCount > 0 && (
                <span className="ntf-bell__hd-count">{unreadCount}</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                className="btn btn-xs btn-p"
                onClick={handleMarkAll}
                disabled={markAllMutation.isPending}
              >
                <span className="ic ic-xs"><i className="ti ti-checks" /></span>
                تحديد الكل
              </button>
            )}
          </div>

          <div className="ntf-bell__list">
            {isLoading ? (
              <div className="ntf-bell__empty">
                <span className="ic ic-lg"><i className="ti ti-loader-2 ti-spin" /></span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="ntf-bell__empty">
                <span className="ic ic-xl"><i className="ti ti-bell-off" /></span>
                <p>لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`ntf-bell__item ${!n.is_read ? 'ntf-bell__item--unread' : ''}`}
                  onClick={() => !n.is_read && handleMarkOne(n.id)}
                >
                  <span
                    className="ntf-bell__item-icon ic ic-sm"
                    style={{ color: NOTIFICATION_TYPE_COLOR[n.type] ?? 'var(--t3)' }}
                  >
                    <i className={`ti ${NOTIFICATION_TYPE_ICON[n.type] ?? 'ti-bell'}`} />
                  </span>

                  <div className="ntf-bell__item-body">
                    <p className="ntf-bell__item-title">{n.title}</p>
                    {n.message && (
                      <p className="ntf-bell__item-msg">{n.message}</p>
                    )}
                    <time className="ntf-bell__item-time">{n.created_at_human}</time>
                  </div>

                  {!n.is_read && <span className="ntf-bell__dot" />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="ntf-bell__ft">
              <Link to="/notifications" className="ntf-bell__ft-link" onClick={() => setOpen(false)}>
                عرض جميع الإشعارات
                <span className="ic ic-xs"><i className="ti ti-arrow-left" /></span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
