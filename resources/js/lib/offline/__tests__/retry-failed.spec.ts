import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueOp,
  getPendingOps,
  getFailedOpsCount,
  markOpFailed,
  clearPendingOps,
} from '../db';
import { retryFailedOps } from '../useOffline';

describe('retry failed ops (task 5.5)', () => {
  beforeEach(async () => {
    await clearPendingOps();
  });

  it('resets every failed op back to pending with clean retry counters', async () => {
    const a = await enqueueOp({ method: 'POST', url: '/documents', data: { n: 1 } });
    const b = await enqueueOp({ method: 'PUT', url: '/documents/7', data: { n: 2 } });
    await markOpFailed(a.id as number, 'سطر غير سليم');
    await markOpFailed(b.id as number, 'conflict');
    expect(await getFailedOpsCount()).toBe(2);

    await retryFailedOps();

    const ops = await getPendingOps();
    expect(ops).toHaveLength(2);
    for (const op of ops) {
      expect(op.status).toBe('pending');
      expect(op.retries).toBe(0);
      expect(op.lastError).toBeNull();
    }
    expect(await getFailedOpsCount()).toBe(0);
  });

  it('is a no-op when there are no failed ops', async () => {
    await enqueueOp({ method: 'POST', url: '/documents', data: {} });
    await retryFailedOps();
    const ops = await getPendingOps();
    expect(ops).toHaveLength(1);
    expect(ops[0].status).toBe('pending');
  });
});
