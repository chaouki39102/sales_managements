import Badge      from '@/components/ui/Badge';
import { FloatingTooltip } from '@/components/ui/FloatingTooltip';
import { STATUS_VARIANT, STATUS_LABEL } from '@/pos/hooks/usePosSessions';
import { formatDZD } from '@/pos/utils/calculations';
import Sparkline     from './Sparkline';
import type { PosSession } from '@/lib/api/endpoints/posSession';

export default function PosSessionsTable({
  sessions,
  isFetching,
  selectedId,
  maxSale,
  onStats,
  onClose,
}: {
  sessions: PosSession[];
  isFetching: boolean;
  selectedId: number | null;
  maxSale: number;
  onStats: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <div className="pss-table-wrap" style={{ opacity: isFetching ? 0.65 : 1 }}>
      <table className="pss-table">
        <thead>
          <tr>
            <th>الحالة</th>
            <th>الكاشير</th>
            <th>المستودع</th>
            <th>الفتح</th>
            <th>الإغلاق</th>
            <th className="pss-th-num">الفواتير</th>
            <th className="pss-th-num">المبيعات</th>
            <th className="pss-th-num">المدة</th>
            <th className="pss-th-actions" />
          </tr>
        </thead>
        <tbody>
          {sessions.map(sess => (
            <tr
              key={sess.id}
              className={[
                'pss-tr',
                sess.status === 'open'   ? 'pss-tr--live'     : '',
                selectedId  === sess.id  ? 'pss-tr--selected' : '',
              ].join(' ')}
              onClick={() => onStats(sess.id)}
            >
              <td><Badge variant={STATUS_VARIANT[sess.status] ?? 'gray'}>{STATUS_LABEL[sess.status] ?? sess.status}</Badge></td>

              <td>
                <div className="pss-user-cell">
                  <div className="pss-user-av">
                    {(sess.user?.name ?? '?').charAt(0)}
                  </div>
                  <span className="pss-user-name">{sess.user?.name ?? '—'}</span>
                </div>
              </td>

              <td>
                <div className="pss-wh-cell">
                  <i className="ti ti-building-warehouse" />
                  {sess.warehouse?.name ?? '—'}
                </div>
              </td>

              <td className="pss-date-cell">
                {new Date(sess.opened_at).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' })}
                <span className="pss-time">
                  {new Date(sess.opened_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </td>

              <td className="pss-date-cell">
                {sess.closed_at ? (
                  <>
                    {new Date(sess.closed_at).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' })}
                    <span className="pss-time">
                      {new Date(sess.closed_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <span className="pss-live-indicator">
                    <span className="pss-live-dot pss-live-dot--sm" />
                    نشطة
                  </span>
                )}
              </td>

              <td className="pss-num-cell">
                <span className="pss-num">{sess.invoices_count}</span>
              </td>

              <td className="pss-num-cell">
                <div className="pss-sales-cell">
                  <span className="pss-sales-val" style={{ direction: 'ltr' }}>
                    {formatDZD(Number(sess.net_sales))}
                  </span>
                  <Sparkline value={Number(sess.net_sales)} max={maxSale} color="var(--em)" />
                </div>
              </td>

              <td className="pss-num-cell">
                <span className="pss-duration">{sess.duration ?? '—'}</span>
              </td>

              <td onClick={e => e.stopPropagation()}>
                <div className="pss-row-actions">
                  <FloatingTooltip content="عرض التفاصيل">
                    <button className="pss-action-btn" onClick={() => onStats(sess.id)}>
                      <i className="ti ti-chart-bar" />
                    </button>
                  </FloatingTooltip>
                  {sess.status === 'open' && (
                    <FloatingTooltip content="إغلاق الجلسة">
                      <button className="pss-action-btn pss-action-btn--danger" onClick={() => onClose(sess.id)}>
                        <i className="ti ti-door-exit" />
                      </button>
                    </FloatingTooltip>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
