import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'sales_management_offline';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Test hook: drop the cached connection (closing it) so a re-open — e.g. after
 * seeding a legacy-version database — actually runs the upgrade migration
 * again instead of reusing the already-open handle.
 */
export function resetOfflineDbForTests(): void {
  void dbPromise?.then(db => db.close()).catch(() => {});
  dbPromise = null;
}

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // v2 migration: browsers that ran a pre-5.1 build have a v1 DB whose
        // `pendingOps` store exists WITHOUT the `status` index (created only
        // later). Because v1 never bumped DB_VERSION, `upgradeneeded` never
        // fired for them, so getPendingOpsByStatus()/getFailedOpsCount() threw
        // NotFoundError. The version bump + per-store index repair below adds
        // any missing index in place without touching existing records.
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt');
        } else if (!transaction.objectStore('cache').indexNames.contains('expiresAt')) {
          transaction.objectStore('cache').createIndex('expiresAt', 'expiresAt');
        }
        if (!db.objectStoreNames.contains('pendingOps')) {
          const opsStore = db.createObjectStore('pendingOps', {
            keyPath: 'id',
            autoIncrement: true,
          });
          opsStore.createIndex('createdAt', 'createdAt');
          opsStore.createIndex('status', 'status');
        } else {
          const opsStore = transaction.objectStore('pendingOps');
          if (!opsStore.indexNames.contains('createdAt')) {
            opsStore.createIndex('createdAt', 'createdAt');
          }
          if (!opsStore.indexNames.contains('status')) {
            opsStore.createIndex('status', 'status');
          }
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
 *
 * `slug` is the TENANT the op belongs to (the company slug the interceptor
 * prepends to the URL). Reads, counts and replay are scoped to the ACTIVE slug
 * so ops queued under one company never replay against — or pollute the badge
 * of — another (e.g. stale ops surviving a `migrate:fresh`). Legacy records
 * written before the field existed fall back to parsing the slug out of `url`
 * (see `opSlug`).
 */
export interface PendingOp {
  id?: number;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  /** Tenant company slug — the first path segment of a tenant URL. */
  slug?: string;
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

/** Leading tenant slug of a URL, e.g. `/company-a/products/8` → `company-a`. */
export function slugFromUrl(url: string): string {
  const m = String(url).replace(/^\/+/, '').match(/^([^/?]+)/);
  return m ? m[1] : '';
}

/** Tenant an op belongs to: explicit `slug` field, else derived from its url (legacy rows). */
export function opSlug(op: Pick<PendingOp, 'slug' | 'url'>): string {
  return op.slug ?? slugFromUrl(op.url);
}

/**
 * Keep only rows belonging to the given tenant. A row with NO tenant (empty
 * derived slug — a public-route mutation, not company-scoped) is kept for every
 * company: it carries no tenant data and is safe to replay regardless.
 */
function scopedBySlug<T extends Pick<PendingOp, 'slug' | 'url'>>(rows: T[], slug?: string): T[] {
  if (!slug) return rows;
  return rows.filter(r => {
    const s = opSlug(r);
    return s === slug || s === '';
  });
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
  const entry = await getCacheEntry<T>(key);
  return entry?.data ?? null;
}

/**
 * Read a cache entry including its expiry. Used by the offline-readiness panel
 * (C.3) to report how FRESH a prefetched dataset is, not just whether it exists.
 * Expired entries are deleted here too, so `getCacheEntry` never lies.
 */
export async function getCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const db = await getDb();
  const entry = await db.get('cache', key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    await db.delete('cache', key);
    return null;
  }
  return entry;
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
  /** Tenant slug — stored verbatim; falls back to `slugFromUrl(url)`. */
  slug?: string;
  data?: unknown;
  tempId?: number | null;
  targetId?: number | null;
}

export async function enqueueOp(op: EnqueueInput): Promise<PendingOp> {
  const db = await getDb();
  const record: PendingOp = {
    method: op.method,
    url: op.url,
    slug: op.slug ?? slugFromUrl(op.url),
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

/**
 * ALL queued ops for `slug` (or every op when no slug — callers without a
 * tenant context). Legacy rows with no `slug` field are matched by `opSlug`.
 */
export async function getPendingOps(slug?: string): Promise<PendingOp[]> {
  const db = await getDb();
  return scopedBySlug(await db.getAll('pendingOps'), slug);
}

export async function getPendingOpsByStatus(status: PendingOpStatus, slug?: string): Promise<PendingOp[]> {
  const db = await getDb();
  return scopedBySlug(await db.getAllFromIndex('pendingOps', 'status', status), slug);
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

/** Remove every FAILED op for `slug` — a user-initiated dismissal of ops the server can never accept (e.g. a 404 on a resource gone after a `migrate:fresh`). */
export async function clearFailedOps(slug?: string): Promise<number> {
  const db = await getDb();
  const failed = await getPendingOpsByStatus('failed', slug);
  if (failed.length === 0) return 0;
  const tx = db.transaction('pendingOps', 'readwrite');
  await Promise.all(failed.map(op => tx.store.delete(op.id as number)));
  await tx.done;
  return failed.length;
}

export async function getPendingOpsCount(slug?: string): Promise<number> {
  return (await getPendingOps(slug)).length;
}

export async function getFailedOpsCount(slug?: string): Promise<number> {
  return (await getPendingOpsByStatus('failed', slug)).length;
}
