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

export interface PendingOp {
  id?: number;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  createdAt: number;
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

export async function enqueueOp(op: Omit<PendingOp, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  await db.add('pendingOps', { ...op, createdAt: Date.now() });
}

export async function getPendingOps(): Promise<PendingOp[]> {
  const db = await getDb();
  return db.getAll('pendingOps');
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
