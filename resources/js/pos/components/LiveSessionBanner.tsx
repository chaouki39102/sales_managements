import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export default function LiveSessionBanner({
  session,
  onStats,
  onClose,
}: {
  session: PosSession;
  onStats: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <div className="pss-live-banner">
      <div className="pss-live-left">
        <div className="pss-live-pulse">
          <i className="ti ti-device-desktop-analytics" />
        </div>
        <div>
          <div className="pss-live-title">
            جلسة نشطة — {session.warehouse?.name}
          </div>
          <div className="pss-live-sub">
            <i className="ti ti-user" /> {session.user?.name}
            <span>·</span>
            <i className="ti ti-clock" /> {session.duration}
            <span>·</span>
            <i className="ti ti-receipt" /> {session.invoices_count} فاتورة
          </div>
        </div>
      </div>
      <div className="pss-live-stats">
        <div className="pss-live-stat">
          <span className="pss-live-stat-val" style={{ direction: 'ltr' }}>
            {formatDZD(Number(session.net_sales))}
          </span>
          <span className="pss-live-stat-lbl">المبيعات الصافية</span>
        </div>
        <div className="pss-live-stat">
          <span className="pss-live-stat-val">{session.invoices_count}</span>
          <span className="pss-live-stat-lbl">الفواتير</span>
        </div>
        <div className="pss-live-stat">
          <span className="pss-live-stat-val" style={{ direction: 'ltr' }}>
            {formatDZD(Number(session.avg_invoice ?? 0))}
          </span>
          <span className="pss-live-stat-lbl">متوسط الفاتورة</span>
        </div>
      </div>
      <div className="pss-live-actions">
        <button
          className="pss-live-btn pss-live-btn--stats"
          onClick={() => onStats(session.id)}
        >
          <i className="ti ti-chart-bar" /> الإحصائيات
        </button>
        <button
          className="pss-live-btn pss-live-btn--close"
          onClick={() => onClose(session.id)}
        >
          <i className="ti ti-door-exit" /> إغلاق
        </button>
      </div>
    </div>
  );
}
