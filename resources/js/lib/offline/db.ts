import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'sales_management_offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt');
        }
        if (!db.objectStoreNames.contains('pendingOps')) {
          const opsStore = db.createObjectStore('pendingOps', {
            keyPath: 'id',
            autoIncrement: true,
          });
          opsStore.createIndex('createdAt', 'createdAt');
          opsStore.createIndex('status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  expiresAt: number;
}

export type PendingOpStatus = 'pending' | 'failed';

/**
 * A queued offline mutation.
 *
 * The queue is FIFO: `id` (auto-increment) IS the replay order, so the first
 * enqueued op replays first. `method` + `url` are stored VERBATIM and replayed
 * verbatim — a CREATE stays POST, an UPDATE stays PUT (Phase 46 rule: replay
 * must PUT via `documentId`, never naively convert).
 */
export interface PendingOp {
  id?: number;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  createdAt: number;
  /** Optimistic temp id (negative) assigned when a CREATE is queued offline. */
  tempId?: number | null;
  /** Real server id captured at enqueue time for PUT/PATCH/DELETE (from the URL). */
  targetId?: number | null;
  /** 'failed' = the server rejected it (validation/conflict) — surfaced, never dropped. */
  status?: PendingOpStatus;
  retries?: number;
  lastError?: string | null;
}

/** Extract the trailing numeric id from a resource URL, e.g. `/documents/123` → 123. */
export function extractTargetIdFromUrl(url: string): number | null {
  const m = String(url).replace(/\/+$/, '').match(/(\d+)$/);
  return m ? Number(m[1]) : null;
}

export async function setCache<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): Promise<void> {
  const db = await getDb();
  await db.put('cache', {
    key,
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const entry = await db.get('cache', key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    await db.delete('cache', key);
    return null;
  }
  return entry.data;
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('cache', 'readwrite');
  const index = tx.store.index('expiresAt');
  let cursor = await index.openCursor(IDBKeyRange.upperBound(Date.now()));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function invalidateCache(prefix: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('cache', 'readwrite');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if ((cursor.value as CacheEntry).key.startsWith(prefix)) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

export interface EnqueueInput {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  tempId?: number | null;
  targetId?: number | null;
}

export async function enqueueOp(op: EnqueueInput): Promise<PendingOp> {
  const db = await getDb();
  const record: PendingOp = {
    method: op.method,
    url: op.url,
    data: op.data,
    createdAt: Date.now(),
    tempId: op.tempId ?? null,
    targetId: op.targetId ?? extractTargetIdFromUrl(op.url),
    status: 'pending',
    retries: 0,
    lastError: null,
  };
  const id = (await db.add('pendingOps', record)) as number;
  return { ...record, id };
}

export async function getPendingOps(): Promise<PendingOp[]> {
  const db = await getDb();
  return db.getAll('pendingOps');
}

export async function getPendingOpsByStatus(status: PendingOpStatus): Promise<PendingOp[]> {
  const db = await getDb();
  return db.getAllFromIndex('pendingOps', 'status', status);
}

export async function updatePendingOp(id: number, patch: Partial<PendingOp>): Promise<void> {
  const db = await getDb();
  const existing = await db.get('pendingOps', id);
  if (!existing) return;
  await db.put('pendingOps', { ...existing, ...patch, id });
}

export async function markOpFailed(id: number, error: string): Promise<void> {
  await updatePendingOp(id, { status: 'failed', lastError: error, retries: (await dbGetRetries(id)) + 1 });
}

export async function markOpPending(id: number): Promise<void> {
  await updatePendingOp(id, { status: 'pending', lastError: null });
}

async function dbGetRetries(id: number): Promise<number> {
  const db = await getDb();
  const op = await db.get('pendingOps', id);
  return op?.retries ?? 0;
}

export async function removePendingOp(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('pendingOps', id);
}

export async function clearPendingOps(): Promise<void> {
  const db = await getDb();
  await db.clear('pendingOps');
}

export async function getPendingOpsCount(): Promise<number> {
  const db = await getDb();
  return db.count('pendingOps');
}

export async function getFailedOpsCount(): Promise<number> {
  const db = await getDb();
  return db.countFromIndex('pendingOps', 'status', 'failed');
}
