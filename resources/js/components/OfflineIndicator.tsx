import { useOnlineStatus, usePendingOpsCount, useSync } from '@/lib/offline/useOffline';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const pendingCount = usePendingOpsCount();
  const { syncing, sync } = useSync();

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`offline-indicator ${online ? 'syncing' : 'offline'}`}
      onClick={online && pendingCount > 0 && !syncing ? sync : undefined}
      title={
        online
          ? `${pendingCount} عملية بانتظار المزامنة — اضغط للمزامنة`
          : 'أنت في وضع دون اتصال'
      }
    >
      {online ? (
        <>
          <i className="ti ti-cloud-upload" />
          <span>{syncing ? 'مزامنة...' : `${pendingCount} في الانتظار`}</span>
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
