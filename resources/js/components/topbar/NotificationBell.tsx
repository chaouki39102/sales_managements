// ─────────────────────────────────────────────────────────────
//  NotificationBell.tsx
//  أيقونة الجرس في الـ Topbar مع Dropdown للتنبيهات غير المقروءة
// ─────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import { useUnreadNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } from '@/hooks/useNotificationsQuery';
import { useNotification } from '@/hooks/useNotification';
import { useOnClickOutside } from '@/hooks/useOnClickOutside'; // أو استبدله بالكود المضمّن أدناه

// ── نوع أيقونة النوع ──────────────────────────────────────
const TYPE_ICON: Record<string, string> = {
  success: 'ti-circle-check',
  error:   'ti-circle-x',
  warning: 'ti-alert-triangle',
  info:    'ti-info-circle',
};

const TYPE_COLOR: Record<string, string> = {
  success: 'var(--em)',
  error:   'var(--red)',
  warning: 'var(--gold)',
  info:    'var(--blue)',
};

// ── المكون ───────────────────────────────────────────────
const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notify = useNotification();

  const { data, isLoading } = useUnreadNotificationsQuery();
  const markOneMutation    = useMarkAsReadMutation();
  const markAllMutation    = useMarkAllAsReadMutation();

  const notifications  = data?.data ?? [];
  const unreadCount    = data?.unread_count ?? 0;

  // إغلاق عند الضغط خارج الـ Dropdown
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

      {/* زر الجرس */}
      <button
        title="الإشعارات"
        type="button"
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

      {/* Dropdown */}
      {open && (
        <div className="ntf-bell__dropdown">

          {/* رأس */}
          <div className="ntf-bell__hd">
            <span className="ntf-bell__hd-title">
              الإشعارات
              {unreadCount > 0 && (
                <span className="ntf-bell__hd-count">{unreadCount}</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                title="تحديد الكل"
                className="btn btn-xs btn-p"
                onClick={handleMarkAll}
                disabled={markAllMutation.isPending}
              >
                <span className="ic ic-xs"><i className="ti ti-checks" /></span>
                تحديد الكل
              </button>
            )}
          </div>

          {/* القائمة */}
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
                  {/* أيقونة النوع */}
                  <span
                    className="ntf-bell__item-icon ic ic-sm"
                    style={{ color: TYPE_COLOR[n.type] ?? 'var(--t3)' }}
                  >
                    <i className={`ti ${TYPE_ICON[n.type] ?? 'ti-bell'}`} />
                  </span>

                  {/* النص */}
                  <div className="ntf-bell__item-body">
                    <p className="ntf-bell__item-title">{n.title}</p>
                    {n.message && (
                      <p className="ntf-bell__item-msg">{n.message}</p>
                    )}
                    <time className="ntf-bell__item-time">{n.created_at_human}</time>
                  </div>

                  {/* نقطة "غير مقروء" */}
                  {!n.is_read && <span className="ntf-bell__dot" />}
                </div>
              ))
            )}
          </div>

          {/* ذيل */}
          {notifications.length > 0 && (
            <div className="ntf-bell__ft">
              <a href="/notifications" className="ntf-bell__ft-link">
                عرض جميع الإشعارات
                <span className="ic ic-xs"><i className="ti ti-arrow-left" /></span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
