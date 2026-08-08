import { useOnlineStatus, usePendingOpsCount, useSync, useOfflineServed } from '@/lib/offline/useOffline';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const pendingCount = usePendingOpsCount();
  const stale = useOfflineServed();
  const { syncing, sync } = useSync();

  if (online && pendingCount === 0 && !stale) return null;

  const clickable = online && pendingCount > 0 && !syncing;

  return (
    <div
      className={`offline-indicator ${online ? 'syncing' : 'offline'}${stale ? ' stale' : ''}`}
      onClick={clickable ? sync : undefined}
      role={clickable ? 'button' : undefined}
      title={
        online
          ? `${pendingCount} عملية بانتظار المزامنة — اضغط للمزامنة`
          : 'أنت في وضع دون اتصال — بعض البيانات من ذاكرة محلية (قديمة)'
      }
    >
      {online ? (
        <>
          <i className={stale ? 'ti ti-history' : 'ti ti-cloud-upload'} />
          <span>
            {syncing
              ? 'مزامنة...'
              : stale
                ? 'بيانات من ذاكرة محلية (قديمة)'
                : `${pendingCount} في الانتظار`}
          </span>
        </>
      ) : (
        <>
          <i className="ti ti-wifi-off" />
          <span>دون اتصال</span>
        </>
      )}
    </div>
  );
}
