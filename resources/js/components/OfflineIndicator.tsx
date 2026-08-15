import { useState } from 'react';
import {
  useOnlineStatus,
  usePendingOpsCount,
  useFailedOpsCount,
  useFailedOps,
  useSync,
  useOfflineServed,
  useOfflineReadiness,
  retryFailedOps,
  type SyncResult,
} from '@/lib/offline/useOffline';
import { removePendingOp, clearFailedOps, type PendingOp } from '@/lib/offline/db';
import { OFFLINE_DATASETS } from '@/lib/offline/prepareOffline';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const pendingCount = usePendingOpsCount();
  const failedCount = useFailedOpsCount();
  const stale = useOfflineServed();
  const { ops, refresh } = useFailedOps();
  const { syncing, sync } = useSync();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const slug = useActiveSlug();
  const { selectedYear } = useFiscalYear();
  const readiness = useOfflineReadiness({ slug: slug ?? '', fiscalYearId: selectedYear?.id });

  const hasFailed = failedCount > 0;
  const freshCount = readiness.datasets.filter(d => d.fresh).length;
  const prepNeeded = online && readiness.datasets.length > 0 && freshCount < readiness.datasets.length;

  const handleClick = async () => {
    if (!online || syncing) return;
    if (hasFailed) {
      await refresh();
      setOpen(v => !v);
      return;
    }
    if (pendingCount > 0) {
      await sync();
      return;
    }
    setOpen(v => !v);
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

  /** Drop a single failed op the server can never accept (e.g. a 404 on a resource gone after `migrate:fresh`). */
  const handleDismissOp = async (op: PendingOp) => {
    if (op.id == null) return;
    setBusy(true);
    try {
      await removePendingOp(op.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  /** Remove EVERY failed op of the CURRENT company (retry can never fix a permanent 4xx). */
  const handleClearFailed = async () => {
    setBusy(true);
    try {
      await clearFailedOps(slug ?? undefined);
      await refresh();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handlePrefetch = async () => {
    setBusy(true);
    try {
      await readiness.prefetch();
    } finally {
      setBusy(false);
    }
  };

  const showBase =
    (online && (pendingCount > 0 || hasFailed || stale || prepNeeded)) || !online;

  if (!showBase) return null;

  const label = !online
    ? 'دون اتصال'
    : syncing
      ? 'مزامنة...'
      : hasFailed
        ? `${failedCount} معالجة فاشلة`
        : stale
          ? 'بيانات من ذاكرة محلية (قديمة)'
          : prepNeeded
            ? `تجهيز دون اتصال (${freshCount}/${readiness.datasets.length})`
            : `${pendingCount} في الانتظار`;

  const icon = !online
    ? 'ti-wifi-off'
    : syncing
      ? 'ti-refresh'
      : hasFailed
        ? 'ti-alert-triangle'
        : stale
          ? 'ti-history'
          : prepNeeded
            ? 'ti-cloud-download'
            : 'ti-cloud-upload';

  return (
    <div className="offline-widget">
      <div
        className={`offline-indicator ${!online ? 'offline' : 'syncing'}${hasFailed ? ' failed' : ''}${stale ? ' stale' : ''}${prepNeeded ? ' prep' : ''}${open ? ' open' : ''}`}
        onClick={handleClick}
        role="button"
        aria-haspopup="true"
        aria-expanded={open}
        title={
          !online
            ? 'أنت في وضع دون اتصال — بعض البيانات من ذاكرة محلية (قديمة)'
            : hasFailed
              ? 'اضغط لعرض العمليات الفاشلة'
              : prepNeeded
                ? `بعض البيانات غير جاهزة للعمل دون اتصال (${freshCount}/${readiness.datasets.length}) — اضغط للتجهيز`
                : `${pendingCount} عملية بانتظار المزامنة — اضغط للمزامنة`
        }
      >
        <i className={`ti ${icon}`} />
        <span>{label}</span>
        {(hasFailed || prepNeeded) && !syncing && (
          <i className="ti ti-chevron-down offline-widget-chevron" />
        )}
      </div>

      {open && !syncing && (
        <div className="offline-pop" role="menu">
          {online && (
            <div className="offline-pop-prep">
              <div className="offline-pop-hd">
                <span>الاستعداد للعمل دون اتصال</span>
                <button
                  type="button"
                  className="offline-pop-retry"
                  onClick={handlePrefetch}
                  disabled={busy}
                  title="تحميل البيانات المهمة الآن لتُستخدم دون اتصال"
                >
                  <i className="ti ti-cloud-download" />
                  {busy ? 'جارٍ التجهيز...' : 'جهّز الآن'}
                </button>
              </div>
              <div className="offline-prep-grid">
                {OFFLINE_DATASETS.map(ds => {
                  const f = readiness.datasets.find(x => x.id === ds.id);
                  return (
                    <span
                      key={ds.id}
                      className={`offline-prep-chip ${f?.fresh ? 'ok' : 'no'}`}
                      title={f?.fresh ? `${ds.label} — محفوظ محلياً` : `${ds.label} — غير محفوظ`}
                    >
                      <i className={`ti ${f?.fresh ? 'ti-circle-check' : 'ti-circle'}`} />
                      {ds.label}
                    </span>
                  );
                })}
              </div>
              <a className="offline-prep-link" href="/offline">
                صفحة تجهيز البيانات دون اتصال
                <i className="ti ti-arrow-left" />
              </a>
            </div>
          )}

          {hasFailed && (
            <>
              <div className="offline-pop-hd">
                <span>عمليات فشلت مزامنتها</span>
                <div className="offline-pop-hd-actions">
                  <button
                    type="button"
                    className="offline-pop-retry"
                    onClick={handleClearFailed}
                    disabled={busy}
                    title="حذف العمليات الفاشلة الحالية — لن تُعاد المحاولة"
                  >
                    <i className="ti ti-trash" />
                    مسح الفاشلة
                  </button>
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
                      <button
                        type="button"
                        className="offline-pop-del"
                        onClick={() => void handleDismissOp(op)}
                        disabled={busy}
                        title="حذف العملية"
                        aria-label="حذف العملية"
                      >
                        <i className="ti ti-x" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
