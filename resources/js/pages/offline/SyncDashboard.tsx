// ════════════════════════════════════════════════════════════════════════════
// pages/offline/SyncDashboard.tsx — لوحة المزامنة الميدانية (C.4)
// Pending/failed op list, per-op + retry-all, «مزامنة الآن» + last-synced stamp,
// temp→real id display. Quick-glance live in the OfflineIndicator popover.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import {
  useOfflineOps,
  useSync,
  useOnlineStatus,
  useLastSyncedAt,
  retryFailedOps,
  type SyncResult,
} from '@/lib/offline/useOffline';
import { markOpPending, removePendingOp, clearFailedOps, type PendingOp } from '@/lib/offline/db';
import { useActiveSlug } from '@/lib/store/appStore';

function fmtTime(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ar-DZ', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const METHOD_VARIANT: Record<PendingOp['method'], string> = {
  POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'del',
};

export default function SyncDashboard() {
  const online = useOnlineStatus();
  const slug = useActiveSlug();
  const { ops, refresh } = useOfflineOps();
  const { syncing, lastError, sync } = useSync();
  const lastSyncedAt = useLastSyncedAt();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SyncResult | null>(null);

  const pending = ops.filter(o => o.status !== 'failed');
  const failed = ops.filter(o => o.status === 'failed');

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      const r = await sync();
      setReport(r);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRetryOp = async (op: PendingOp) => {
    if (!op.id) return;
    setBusy(true);
    try {
      await markOpPending(op.id);
      await refresh();
      const r = await sync();
      setReport(r);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDismissOp = async (op: PendingOp) => {
    if (!op.id) return;
    setBusy(true);
    try {
      await removePendingOp(op.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRetryAll = async () => {
    setBusy(true);
    try {
      await retryFailedOps();
      await refresh();
      const r = await sync();
      setReport(r);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleClearFailed = async () => {
    setBusy(true);
    try {
      await clearFailedOps(slug ?? undefined);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="offline-page-card">
      <div className="offline-dash-hd">
        <div>
          <div className="offline-dash-title">
            <i className="ti ti-cloud-upload" />
            لوحة المزامنة
          </div>
          <div className="offline-dash-sub">
            العمليات المحفوظة محلياً أثناء الانقطاع، وأحدث مزامنة ناجحة
          </div>
        </div>
        <div className="offline-dash-actions">
          <button
            type="button"
            className="btn btn-p"
            onClick={() => void handleSyncNow()}
            disabled={busy || syncing || !online}
          >
            <i className={`ti ${syncing ? 'ti-loader' : 'ti-refresh'}`} />
            {syncing ? 'جارٍ المزامنة...' : 'مزامنة الآن'}
          </button>
        </div>
      </div>

      <div className="offline-dash-stats">
        <span className={`offline-dash-stat ${online ? 'ok' : 'no'}`}>
          <i className={`ti ${online ? 'ti-wifi' : 'ti-wifi-off'}`} />
          {online ? 'متصل' : 'غير متصل'}
        </span>
        <span className="offline-dash-stat">
          <i className="ti ti-clock" />
          آخر مزامنة: {fmtTime(lastSyncedAt)}
        </span>
        <span className="offline-dash-stat">
          <i className="ti ti-stack-2" />
          في الانتظار: {pending.length}
        </span>
        {failed.length > 0 && (
          <span className="offline-dash-stat no">
            <i className="ti ti-alert-triangle" />
            فاشلة: {failed.length}
          </span>
        )}
      </div>

      {report && (
        <div className="offline-dash-report">
          <i className="ti ti-circle-check" />
          المزامنة الأخيرة: أعيدت {report.replayed} · فشلت {report.failed} · متبقية {report.remaining}
        </div>
      )}
      {lastError && !syncing && (
        <div className="offline-dash-report err">
          <i className="ti ti-alert-triangle" />
          {lastError}
        </div>
      )}

      <div className="offline-dash-tbl">
        {ops.length === 0 ? (
          <EmptyState
            icon="ti-circle-check"
            text="لا توجد عمليات بانتظار المزامنة"
            sub="كل شيء متزامن. العمليات تُسجَّل هنا فقط عند العمل دون اتصال."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>العملية</th>
                <th>الرابط / الهدف</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ops.map(op => (
                <tr key={op.id}>
                  <td>
                    <span className={`offline-op-method ${METHOD_VARIANT[op.method]}`}>{op.method}</span>
                  </td>
                  <td>
                    <div className="offline-op-url" dir="ltr">{op.url}</div>
                    <div className="offline-op-target">
                      {op.tempId != null ? (
                        <>
                          الرقم المؤقت: <b dir="ltr">#{op.tempId}</b>
                          <span className="offline-op-note">· سيُحوَّل إلى الرقم الحقيقي عند المزامنة</span>
                        </>
                      ) : op.targetId != null ? (
                        <>الهدف: <b dir="ltr">#{op.targetId}</b></>
                      ) : null}
                    </div>
                    {op.lastError && <div className="offline-op-err">{op.lastError}</div>}
                  </td>
                  <td className="offline-op-date">{fmtTime(op.createdAt)}</td>
                  <td>
                    {op.status === 'failed' ? (
                      <span className="offline-op-state failed">فشلت</span>
                    ) : op.retries && op.retries > 0 ? (
                      <span className="offline-op-state retry">محاولة {op.retries}</span>
                    ) : (
                      <span className="offline-op-state">قيد الانتظار</span>
                    )}
                  </td>
                  <td>
                    {op.status === 'failed' && (
                      <div className="offline-op-actions">
                        <button
                          type="button"
                          className="btn btn-xs btn-b"
                          onClick={() => void handleRetryOp(op)}
                          disabled={busy || syncing || !online}
                        >
                          <i className="ti ti-refresh" />
                          إعادة
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-r"
                          onClick={() => void handleDismissOp(op)}
                          disabled={busy}
                          title="حذف العملية — لن تُعاد المحاولة"
                        >
                          <i className="ti ti-trash" />
                          حذف
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {failed.length > 0 && (
        <div className="offline-dash-footer">
          <button
            type="button"
            className="btn btn-r"
            onClick={() => void handleClearFailed()}
            disabled={busy || syncing}
            title="حذف العمليات الفاشلة الحالية — لن تُعاد المحاولة (مفيدة للعمليات التي لن يقبلها الخادم أبداً)"
          >
            <i className="ti ti-trash" />
            مسح الفاشلة ({failed.length})
          </button>
          <button
            type="button"
            className="btn btn-b"
            onClick={() => void handleRetryAll()}
            disabled={busy || syncing || !online}
          >
            <i className="ti ti-refresh" />
            إعادة المحاولة للكل ({failed.length})
          </button>
        </div>
      )}
    </Card>
  );
}
