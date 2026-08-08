import { useState } from 'react';
import {
  useOnlineStatus,
  usePendingOpsCount,
  useFailedOpsCount,
  useFailedOps,
  useSync,
  useOfflineServed,
  retryFailedOps,
  type SyncResult,
} from '@/lib/offline/useOffline';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const pendingCount = usePendingOpsCount();
  const failedCount = useFailedOpsCount();
  const stale = useOfflineServed();
  const { ops, refresh } = useFailedOps();
  const { syncing, sync } = useSync();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasFailed = failedCount > 0;

  const handleClick = async () => {
    if (!online || syncing) return;
    if (hasFailed) {
      await refresh();
      setOpen(v => !v);
      return;
    }
    if (pendingCount > 0) await sync();
  };

  const handleRetryAll = async () => {
    setBusy(true);
    try {
      await retryFailedOps();
      const report: SyncResult = await sync();
      await refresh();
      if (report.failed > 0) setOpen(true);
      else setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const showBase =
    (online && (pendingCount > 0 || hasFailed || stale)) || !online;

  if (!showBase) return null;

  const label = !online
    ? 'دون اتصال'
    : syncing
      ? 'مزامنة...'
      : hasFailed
        ? `${failedCount} معالجة فاشلة`
        : stale
          ? 'بيانات من ذاكرة محلية (قديمة)'
          : `${pendingCount} في الانتظار`;

  const icon = !online
    ? 'ti-wifi-off'
    : syncing
      ? 'ti-refresh'
      : hasFailed
        ? 'ti-alert-triangle'
        : stale
          ? 'ti-history'
          : 'ti-cloud-upload';

  return (
    <div className="offline-widget">
      <div
        className={`offline-indicator ${!online ? 'offline' : 'syncing'}${hasFailed ? ' failed' : ''}${stale ? ' stale' : ''}${open ? ' open' : ''}`}
        onClick={handleClick}
        role="button"
        aria-haspopup="true"
        aria-expanded={open}
        title={
          !online
            ? 'أنت في وضع دون اتصال — بعض البيانات من ذاكرة محلية (قديمة)'
            : hasFailed
              ? 'اضغط لعرض العمليات الفاشلة'
              : `${pendingCount} عملية بانتظار المزامنة — اضغط للمزامنة`
        }
      >
        <i className={`ti ${icon}`} />
        <span>{label}</span>
        {hasFailed && !syncing && (
          <i className="ti ti-chevron-down offline-widget-chevron" />
        )}
      </div>

      {open && !syncing && (
        <div className="offline-pop" role="menu">
          <div className="offline-pop-hd">
            <span>عمليات فشلت مزامنتها</span>
            <button
              type="button"
              className="offline-pop-retry"
              onClick={handleRetryAll}
              disabled={busy}
            >
              <i className="ti ti-refresh" />
              {busy ? 'جارٍ الإعادة...' : 'إعادة المحاولة'}
            </button>
          </div>
          {ops.length === 0 ? (
            <div className="offline-pop-empty">لا توجد عمليات فاشلة</div>
          ) : (
            <ul className="offline-pop-list">
              {ops.map(op => (
                <li key={op.id} className="offline-pop-item">
                  <span className="offline-pop-method">{op.method}</span>
                  <span className="offline-pop-url" dir="ltr">{op.url}</span>
                  {op.lastError && (
                    <span className="offline-pop-err">{op.lastError}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
