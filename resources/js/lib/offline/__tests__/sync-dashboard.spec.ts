import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => { storage.set(k, String(v)); },
  removeItem: (k: string) => { storage.delete(k); },
};

import {
  enqueueOp,
  getPendingOps,
  getFailedOpsCount,
  markOpFailed,
  markOpPending,
  clearPendingOps,
  type PendingOp,
} from '../db';
import { replayPendingOps } from '../syncEngine';
import { getLastSyncedAt, setLastSyncedAt, retryFailedOps } from '../useOffline';

describe('sync dashboard primitives (task C.4)', () => {
  beforeEach(async () => {
    await clearPendingOps();
    setLastSyncedAt(0);
  });

  it('getPendingOps returns every op (pending + failed) in FIFO order', async () => {
    const a = await enqueueOp({ method: 'POST', url: '/documents', data: { n: 1 } });
    const b = await enqueueOp({ method: 'PUT', url: '/documents/7', data: { n: 2 } });
    await markOpFailed(b.id as number, 'تعارض');

    const ops = await getPendingOps();
    expect(ops).toHaveLength(2);
    expect(ops[0].id).toBe(a.id);
    expect(ops[1].id).toBe(b.id);
    expect(ops[1].status).toBe('failed');
  });

  it('markOpPending flips one failed op back to pending with no lastError', async () => {
    const op = await enqueueOp({ method: 'PATCH', url: '/documents/9', data: {} });
    await markOpFailed(op.id as number, 'سطر غير سليم');
    expect(await getFailedOpsCount()).toBe(1);

    await markOpPending(op.id as number);
    expect(await getFailedOpsCount()).toBe(0);
    const after = await getPendingOps();
    expect(after[0].status).toBe('pending');
    expect(after[0].lastError).toBeNull();
  });

  it('per-op retry flow: a failed op replays and is removed once un-failed', async () => {
    const op = await enqueueOp({ method: 'POST', url: '/documents', data: { doc: 1 } });
    await markOpFailed(op.id as number, 'تعارض');

    await markOpPending(op.id as number);
    const report = await replayPendingOps(async ({ method, url, data }) => {
      expect(method).toBe('POST');
      expect(url).toBe('/documents');
      expect((data as { doc?: number }).doc).toBe(1);
      return { id: 42 };
    });

    expect(report).toEqual({ replayed: 1, failed: 0, remaining: 0 });
    expect(await getPendingOps()).toHaveLength(0);
  });

  it('retry-all resets every failed op, keeping pending ones untouched', async () => {
    const failedA = await enqueueOp({ method: 'POST', url: '/documents', data: {} });
    const pendingB = await enqueueOp({ method: 'DELETE', url: '/documents/5', data: undefined });
    await markOpFailed(failedA.id as number, 'خطأ');

    await retryFailedOps();

    const ops: PendingOp[] = await getPendingOps();
    expect(ops).toHaveLength(2);
    expect(ops.find(o => o.id === failedA.id)?.status).toBe('pending');
    expect(ops.find(o => o.id === pendingB.id)?.status).toBe('pending');
    expect(await getFailedOpsCount()).toBe(0);
  });

  it('last-synced stamp round-trips through localStorage', () => {
    expect(getLastSyncedAt()).toBe(0);
    const ts = 1_700_000_000_000;
    setLastSyncedAt(ts);
    expect(getLastSyncedAt()).toBe(ts);
  });
});
