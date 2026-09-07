import { useState, useRef, useEffect } from 'react';
import { useAlerts } from '../hooks/useAlerts';

export function AlertBell() {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead, refresh } = useAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'var(--red)';
      case 'high':     return 'var(--orange)';
      case 'medium':   return 'var(--blue)';
      default:         return 'var(--t4)';
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case 'overdue_invoice': return 'ti-alert-circle';
      case 'upcoming_check':  return 'ti-checks';
      case 'low_stock':       return 'ti-package-off';
      case 'credit_exceeded': return 'ti-credit-card-off';
      default:                return 'ti-bell';
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { setOpen(!open); if (!open) refresh(); }}
        style={{
          position: 'relative', padding: '6px 10px', borderRadius: 'var(--r2)',
          border: '1px solid var(--b2)', background: 'var(--bg2)',
          color: 'var(--t2)', cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <i className="ti ti-bell" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--red)', color: 'white',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          width: 360, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg1)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 24px rgba(0,0,0,.15)',
          zIndex: 1000, padding: 8,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 6px 8px', borderBottom: '1px solid var(--b2)', marginBottom: 4,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
              التنبيهات
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={() => { markAllAsRead(); }}
                  style={{
                    padding: '3px 8px', borderRadius: 'var(--r1)',
                    border: '1px solid var(--b3)', background: 'transparent',
                    color: 'var(--t3)', cursor: 'pointer', fontSize: 10,
                  }}
                >
                  تعيين الكل مقروء
                </button>
              )}
            </div>
          </div>

          {isLoading && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
              جاري التحميل...
            </div>
          )}

          {!isLoading && alerts.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
              لا توجد تنبيهات
            </div>
          )}

          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => { if (!alert.is_read) markAsRead(alert.id); }}
              className={alert.is_read ? 'alert-item' : 'alert-item alert-item--unread'}
              style={{
                padding: '8px 10px', borderRadius: 'var(--r1)',
                cursor: 'pointer', marginBottom: 2,
                borderLeft: `3px solid ${severityColor(alert.severity)}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <i className={`ti ${typeIcon(alert.type)}`} style={{ fontSize: 12, color: severityColor(alert.severity) }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>
                  {alert.title}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.4 }}>
                {alert.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
