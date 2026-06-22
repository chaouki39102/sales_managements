import { useState, useEffect, useCallback } from 'react';
import { getPendingOpsCount, clearPendingOps, type PendingOp } from './db';

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

export function useSync(): { syncing: boolean; sync: () => Promise<void> } {
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const { getPendingOps, removePendingOp } = await import('./db');
      const ops = await getPendingOps();
      const { default: client } = await import('@/lib/api/core/client');

      for (const op of ops) {
        try {
          await client({
            method: op.method,
            url: op.url,
            data: op.data,
          });
          await removePendingOp(op.id!);
        } catch {
          // If a single op fails, continue with the rest
        }
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  return { syncing, sync };
}
