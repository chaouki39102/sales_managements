import Badge      from '@/components/ui/Badge';
import { STATUS_VARIANT, STATUS_LABEL } from '@/pos/hooks/usePosSessions';
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export default function PosSessionsCards({
  sessions,
  isFetching,
  onStats,
  onClose,
}: {
  sessions: PosSession[];
  isFetching: boolean;
  selectedId?: number | null;
  onStats: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <div className="pss-cards-grid" style={{ opacity: isFetching ? 0.65 : 1 }}>
      {sessions.map(sess => (
        <div
          key={sess.id}
          className={`pss-card ${sess.status === 'open' ? 'pss-card--live' : ''}`}
          onClick={() => onStats(sess.id)}
        >
          <div className="pss-card-header">
            <div className="pss-card-av">
              {(sess.user?.name ?? '?').charAt(0)}
            </div>
            <div className="pss-card-info">
              <div className="pss-card-name">{sess.user?.name ?? '—'}</div>
              <div className="pss-card-wh">
                <i className="ti ti-building-warehouse" />
                {sess.warehouse?.name ?? '—'}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[sess.status] ?? 'gray'}>{STATUS_LABEL[sess.status] ?? sess.status}</Badge>
          </div>

          <div className="pss-card-sales">
            <div className="pss-card-sales-val" style={{ direction: 'ltr' }}>
              {formatDZD(Number(sess.net_sales))}
            </div>
            <div className="pss-card-sales-lbl">المبيعات الصافية</div>
          </div>

          <div className="pss-card-stats">
            <div className="pss-card-stat">
              <span className="pss-card-stat-val">{sess.invoices_count}</span>
              <span className="pss-card-stat-lbl">فاتورة</span>
            </div>
            <div className="pss-card-stat-sep" />
            <div className="pss-card-stat">
              <span className="pss-card-stat-val">{sess.duration ?? '—'}</span>
              <span className="pss-card-stat-lbl">المدة</span>
            </div>
            <div className="pss-card-stat-sep" />
            <div className="pss-card-stat">
              <span className="pss-card-stat-val" style={{ direction: 'ltr' }}>
                {formatDZD(Number(sess.avg_invoice ?? 0))}
              </span>
              <span className="pss-card-stat-lbl">المتوسط</span>
            </div>
          </div>

          <div className="pss-card-footer">
            <span className="pss-card-date">
              <i className="ti ti-calendar" />
              {new Date(sess.opened_at).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'long' })}
            </span>
            <div className="pss-card-actions" onClick={e => e.stopPropagation()}>
              <button className="pss-action-btn" onClick={() => onStats(sess.id)}>
                <i className="ti ti-chart-bar" />
              </button>
              {sess.status === 'open' && (
                <button
                  className="pss-action-btn pss-action-btn--danger"
                  onClick={() => onClose(sess.id)}
                >
                  <i className="ti ti-door-exit" />
                </button>
              )}
            </div>
          </div>

          {sess.status === 'open' && <div className="pss-card-live-bar" />}
        </div>
      ))}
    </div>
  );
}
