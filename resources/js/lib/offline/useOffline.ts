import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPendingOpsCount,
  getFailedOpsCount,
  getPendingOpsByStatus,
  updatePendingOp,
  type PendingOp,
} from './db';
import client from '@/lib/api/core/client';
import { replayPendingOps, type SyncResult } from './syncEngine';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

export function usePendingOpsCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await getPendingOpsCount());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return count;
}

export function useFailedOpsCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await getFailedOpsCount());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return count;
}

export function useFailedOps(): { ops: PendingOp[]; refresh: () => Promise<void> } {
  const [ops, setOps] = useState<PendingOp[]>([]);

  const refresh = useCallback(async () => {
    setOps(await getPendingOpsByStatus('failed'));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ops, refresh };
}

export function useSync(): {
  syncing: boolean;
  lastError: string | null;
  sync: () => Promise<SyncResult>;
} {
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const run = useCallback(async (): Promise<SyncResult> => {
    if (syncingRef.current) {
      return { replayed: 0, failed: 0, remaining: await getPendingOpsCount() };
    }
    syncingRef.current = true;
    setSyncing(true);
    setLastError(null);

    try {
      const report = await replayPendingOps(async ({ method, url, data }) => {
        const res = await client({ method, url, data });
        // raw axios envelope → created entity id lives at response.data.data.id
        const payload = (res as { data?: { data?: unknown } })?.data?.data
          ?? (res as { data?: unknown })?.data;
        return payload as { id?: number };
      });

      if (report.replayed > 0) {
        window.dispatchEvent(new CustomEvent('offline:synced', { detail: { replayed: report.replayed } }));
      }
      return report;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  const sync = useCallback(async (): Promise<SyncResult> => run(), [run]);

  // Auto-sync the moment the connection returns.
  useEffect(() => {
    const goOnline = () => {
      void sync();
    };
    window.addEventListener('online', goOnline);
    return () => window.removeEventListener('online', goOnline);
  }, [sync]);

  return { syncing, lastError, sync };
}

/** Reset every failed op back to pending (user clicked "retry") — then call sync(). */
export async function retryFailedOps(): Promise<void> {
  const failed = await getPendingOpsByStatus('failed');
  for (const op of failed) {
    await updatePendingOp(op.id!, { status: 'pending', lastError: null, retries: 0 });
  }
}
