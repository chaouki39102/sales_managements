import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPendingOpsCount,
  getFailedOpsCount,
  getPendingOps,
  getPendingOpsByStatus,
  updatePendingOp,
  type PendingOp,
} from './db';
import client from '@/lib/api/core/client';
import { replayPendingOps, type SyncResult } from './syncEngine';
import { useActiveSlug, appActions } from '@/lib/store/appStore';
import {
  offlineDatasetsFreshness,
  prefetchOfflineEssentials,
  type OfflinePrefetchDeps,
  type DatasetFreshness,
  type PrefetchResult,
} from './prepareOffline';

export type { SyncResult } from './syncEngine';

import { isDataStale, subscribeDataStale } from './offlineAwareApi';

/** True while the most recent GET was served from the offline cache (stale data). */
export function useOfflineServed(): boolean {
  const [stale, setStale] = useState(() => isDataStale());

  useEffect(() => {
    const update = () => setStale(isDataStale());
    update();
    const unsub = subscribeDataStale(update);
    return unsub;
  }, []);

  return stale;
}

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
  const slug = useActiveSlug();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await getPendingOpsCount(slug ?? undefined));
  }, [slug]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return count;
}

export function useFailedOpsCount(): number {
  const slug = useActiveSlug();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setCount(await getFailedOpsCount(slug ?? undefined));
  }, [slug]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return count;
}

export function useFailedOps(): { ops: PendingOp[]; refresh: () => Promise<void> } {
  const slug = useActiveSlug();
  const [ops, setOps] = useState<PendingOp[]>([]);

  const refresh = useCallback(async () => {
    setOps(await getPendingOpsByStatus('failed', slug ?? undefined));
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ops, refresh };
}

/** ALL queued ops (pending + failed), kept fresh every 10s — sync-dashboard feed. */
export function useOfflineOps(): { ops: PendingOp[]; refresh: () => Promise<void> } {
  const slug = useActiveSlug();
  const [ops, setOps] = useState<PendingOp[]>([]);

  const refresh = useCallback(async () => {
    setOps(await getPendingOps(slug ?? undefined));
  }, [slug]);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { ops, refresh };
}

const LAST_SYNCED_KEY = 'offline_last_synced_at';

/** Persisted "last successful sync" timestamp (survives reloads; best-effort). */
export function getLastSyncedAt(): number | null {
  try {
    const v = localStorage.getItem(LAST_SYNCED_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function setLastSyncedAt(ts: number = Date.now()): void {
  try {
    localStorage.setItem(LAST_SYNCED_KEY, String(ts));
  } catch {
    // storage-denied (private mode) — the stamp is best-effort only
  }
}

/** Reactive last-synced stamp for the dashboard / indicator. */
export function useLastSyncedAt(): number | null {
  const [ts, setTs] = useState<number | null>(() => getLastSyncedAt());

  useEffect(() => {
    const update = () => setTs(getLastSyncedAt());
    window.addEventListener('offline:synced', update);
    return () => window.removeEventListener('offline:synced', update);
  }, []);

  return ts;
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
    // Replay ONLY the active company's ops — a stale queue from a previous
    // company (or surviving a `migrate:fresh`) must never hit this tenant.
    const slug = appActions.getActiveSlug() ?? undefined;
    if (syncingRef.current) {
      return { replayed: 0, failed: 0, remaining: await getPendingOpsCount(slug) };
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
      }, slug);

      // a sync that REACHED the server is "last synced" even with 0 ops
      setLastSyncedAt();
      window.dispatchEvent(new CustomEvent('offline:synced', { detail: { replayed: report.replayed } }));
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
  const slug = appActions.getActiveSlug() ?? undefined;
  const failed = await getPendingOpsByStatus('failed', slug);
  for (const op of failed) {
    await updatePendingOp(op.id!, { status: 'pending', lastError: null, retries: 0 });
  }
}

export interface OfflineReadiness {
  datasets: DatasetFreshness[];
  refreshing: boolean;
  prefetching: boolean;
  lastResults: PrefetchResult[] | null;
  refresh: () => Promise<void>;
  prefetch: () => Promise<PrefetchResult[]>;
}

/**
 * Offline readiness for the CURRENT company context (C.3): how many field-critical
 * datasets are cached + fresh for the selected warehouse/fiscal year, and a
 * prefetch action that warms them. Re-checks freshness on mount and whenever the
 * deps (slug / warehouse / fiscal year) change.
 */
export function useOfflineReadiness(deps: OfflinePrefetchDeps): OfflineReadiness {
  const [datasets, setDatasets] = useState<DatasetFreshness[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [lastResults, setLastResults] = useState<PrefetchResult[] | null>(null);

  const depsKey = JSON.stringify([deps.slug, deps.warehouseId ?? null, deps.fiscalYearId ?? null]);

  const refresh = useCallback(async () => {
    if (!deps.slug) {
      setDatasets([]);
      return;
    }
    setRefreshing(true);
    try {
      setDatasets(await offlineDatasetsFreshness(deps));
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  const prefetch = useCallback(async (): Promise<PrefetchResult[]> => {
    if (!deps.slug) return [];
    setPrefetching(true);
    try {
      const results = await prefetchOfflineEssentials(deps);
      setLastResults(results);
      setDatasets(await offlineDatasetsFreshness(deps));
      return results;
    } finally {
      setPrefetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { datasets, refreshing, prefetching, lastResults, refresh, prefetch };
}
