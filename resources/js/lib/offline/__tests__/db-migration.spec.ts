import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { openDB } from 'idb';
import {
  resetOfflineDbForTests,
  enqueueOp,
  markOpFailed,
  getPendingOps,
  getPendingOpsByStatus,
  getFailedOpsCount,
  clearExpiredCache,
} from '../db';

/**
 * Recreate the EXACT schema shipped before upgrade-5 task 5.1 (commit
 * 84383bc): `pendingOps` exists WITHOUT the `status` index. Real browsers that
 * ran that build have this DB at version 1, and 8918c3a (which added the
 * `status` index) never bumped DB_VERSION — so `upgradeneeded` never fired and
 * getPendingOpsByStatus()/getFailedOpsCount() threw NotFoundError.
 *
 * Note: vitest gives every test FILE a fresh fake-indexeddb + module registry,
 * so this file starts from an empty browser database with no wiping needed.
 */
async function createLegacyV1Db(): Promise<void> {
  const db = await openDB('sales_management_offline', 1, {
    upgrade(d) {
      const cacheStore = d.createObjectStore('cache', { keyPath: 'key' });
      cacheStore.createIndex('expiresAt', 'expiresAt');
      const opsStore = d.createObjectStore('pendingOps', {
        keyPath: 'id',
        autoIncrement: true,
      });
      opsStore.createIndex('createdAt', 'createdAt');
      // NOTE: deliberately NO 'status' index (the legacy schema).
    },
  });
  db.close();
}

describe('offline db schema migration (v1 -> v2)', () => {
  it('adds the missing status index to a legacy pendingOps store without losing records', async () => {
    await createLegacyV1Db();

    // Seed a real legacy op BEFORE migrating (no `status` field, old shape).
    const seed = await openDB('sales_management_offline', 1);
    await seed.put('pendingOps', {
      method: 'POST',
      url: '/documents',
      data: { legacy: true },
      createdAt: 1,
    });
    seed.close();

    // Force the module to re-open: the v2 request must run the upgrade in place.
    resetOfflineDbForTests();

    // The two calls that crashed in production must now work.
    const failedBefore = await getFailedOpsCount();
    expect(failedBefore).toBe(0);
    // Legacy record survived the migration.
    const all = await getPendingOps();
    expect(all).toHaveLength(1);
    expect((all[0].data as { legacy: boolean }).legacy).toBe(true);

    // New ops can use the status index end-to-end.
    const { id } = await enqueueOp({ method: 'POST', url: '/documents', data: { a: 1 } });
    await markOpFailed(id as number, 'فشل 422');
    expect(await getFailedOpsCount()).toBe(1);
    const failed = await getPendingOpsByStatus('failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].lastError).toContain('422');

    // expiresAt index path (clearExpiredCache) still healthy.
    await expect(clearExpiredCache()).resolves.toBeUndefined();
  });
});
