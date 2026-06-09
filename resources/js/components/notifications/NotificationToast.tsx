// ─────────────────────────────────────────────────────────────
//  NotificationToast.tsx
//  مكون التنبيه الفوري الفردي — يستخدم CSS tokens المشروع
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { useNotificationStore, type Toast } from '@/lib/store/notificationStore';

interface Props { toast: Toast; }

// خريطة الأيقونات (Tabler Icons)
const ICON: Record<Toast['type'], string> = {
  success: 'ti-circle-check',
  error:   'ti-circle-x',
  warning: 'ti-alert-triangle',
  info:    'ti-info-circle',
};

// خريطة ألوان CSS tokens
const COLOR: Record<Toast['type'], { bar: string; icon: string; bg: string; border: string }> = {
  success: { bar: 'var(--em)',   icon: 'var(--em)',   bg: 'var(--emb)',   border: 'var(--embo)'  },
  error:   { bar: 'var(--red)',  icon: 'var(--red)',  bg: 'var(--redb)',  border: 'var(--redbo)' },
  warning: { bar: 'var(--gold)', icon: 'var(--gold)', bg: 'var(--goldb)', border: 'var(--goldbo)'},
  info:    { bar: 'var(--blue)', icon: 'var(--blue)', bg: 'var(--blueb)', border: 'var(--bluebo)'},
};

const NotificationToast: React.FC<Props> = ({ toast }) => {
  const removeToast = useNotificationStore((s) => s.removeToast);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const c = COLOR[toast.type];

  const close = () => {
    setLeaving(true);
    timerRef.current = setTimeout(() => removeToast(toast.id), 280);
  };

  // مؤقت الشريط التقدمي
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    if (!toast.autoClose || toast.persistent || toast.autoClose === 0) return;
    const step = 100 / (toast.autoClose / 50);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) { clearInterval(interval); return 0; }
        return p - step;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [toast.autoClose, toast.persistent]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div
      className={`ntf-toast ${leaving ? 'ntf-toast--out' : 'ntf-toast--in'}`}
      style={{ '--ntf-bar': c.bar, '--ntf-icon': c.icon, '--ntf-bg': c.bg, '--ntf-border': c.border } as React.CSSProperties}
    >
      {/* الشريط الجانبي الملوّن */}
      <span className="ntf-toast__bar" />

      {/* الأيقونة */}
      <span className="ntf-toast__icon ic ic-sm">
        <i className={`ti ${ICON[toast.type]}`} />
      </span>

      {/* المحتوى */}
      <div className="ntf-toast__body">
        <p className="ntf-toast__title">{toast.title}</p>
        {toast.message && <p className="ntf-toast__msg">{toast.message}</p>}
        {toast.action && (
          <button
            type="button"
            title="اجراء"
            className="ntf-toast__action btn btn-xs"
            onClick={() => { toast.action!.onClick(); close(); }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* زر الإغلاق */}
      <button type="button" title="اغلاق" className="ntf-toast__close m-x" onClick={close}>
        <span className="ic ic-xs"><i className="ti ti-x" /></span>
      </button>

      {/* شريط التقدم */}
      {toast.autoClose && !toast.persistent && (
        <span
          className="ntf-toast__progress"
          style={{ width: `${progress}%`, background: c.bar }}
        />
      )}
    </div>
  );
};

export default NotificationToast;
