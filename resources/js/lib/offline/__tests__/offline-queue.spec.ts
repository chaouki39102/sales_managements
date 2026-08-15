import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueOp,
  getPendingOps,
  getPendingOpsByStatus,
  removePendingOp,
  clearPendingOps,
  clearFailedOps,
  updatePendingOp,
  getPendingOpsCount,
  getFailedOpsCount,
  extractTargetIdFromUrl,
  slugFromUrl,
  opSlug,
} from '../db';

describe('offline write queue (db.ts)', () => {
  beforeEach(async () => {
    await clearPendingOps();
  });

  it('extracts the trailing numeric id from resource urls', () => {
    expect(extractTargetIdFromUrl('/documents/123')).toBe(123);
    expect(extractTargetIdFromUrl('http://x.test/api/v1/documents/456/')).toBe(456);
    expect(extractTargetIdFromUrl('/documents')).toBeNull();
    expect(extractTargetIdFromUrl('/documents/abc')).toBeNull();
    // action-style suffixes (non-numeric tail) are not resource ids
    expect(extractTargetIdFromUrl('/pos-sessions/7/increment')).toBeNull();
  });

  it('enqueues ops in FIFO insertion order (id === replay order)', async () => {
    await enqueueOp({ method: 'POST', url: '/documents', data: { a: 1 } });
    await enqueueOp({ method: 'POST', url: '/documents', data: { a: 2 } });
    await enqueueOp({ method: 'POST', url: '/documents', data: { a: 3 } });

    const ops = await getPendingOps();
    expect(ops).toHaveLength(3);
    // auto-increment keys are strictly ascending → insertion order = replay order
    const ids = ops.map(o => o.id as number);
    expect(ids).toEqual([...ids].sort((x, y) => x - y));
    // payloads replay in the exact order they were queued
    expect(ops.map(o => (o.data as { a: number }).a)).toEqual([1, 2, 3]);
  });

  it('preserves method + url verbatim so replay PUTs updates and POSTs creates (Phase 46)', async () => {
    await enqueueOp({ method: 'POST', url: '/documents', data: { document_id: null } });
    await enqueueOp({ method: 'PUT', url: '/documents/42', data: { document_id: 42 } });

    const ops = await getPendingOps();
    expect(ops[0].method).toBe('POST');
    expect(ops[0].url).toBe('/documents');
    expect(ops[1].method).toBe('PUT');
    expect(ops[1].url).toBe('/documents/42');
    // a create must NEVER be silently converted to an update, and vice-versa
    expect(ops[0].method).not.toBe('PUT');
    expect(ops[1].method).not.toBe('POST');
  });

  it('captures targetId for updates and keeps tempId for offline creates', async () => {
    await enqueueOp({ method: 'POST', url: '/documents', data: {}, tempId: -1001 });
    await enqueueOp({ method: 'PUT', url: '/documents/42', data: {} });
    await enqueueOp({ method: 'PUT', url: '/documents/99', data: {}, targetId: 99 });

    const ops = await getPendingOps();
    const [create, put42, put99] = ops;
    expect(create.tempId).toBe(-1001);
    expect(create.targetId).toBeNull();
    expect(put42.targetId).toBe(42); // auto-derived from url
    expect(put99.targetId).toBe(99); // explicit wins
    expect(put42.tempId).toBeNull();
  });

  it('marks ops failed (retry + lastError) and can be reset back to pending', async () => {
    const { id } = await enqueueOp({ method: 'POST', url: '/documents', data: {} });

    await updatePendingOp(id as number, { status: 'failed', lastError: 'التزير 422', retries: 1 });
    expect(await getFailedOpsCount()).toBe(1);
    let failed = await getPendingOpsByStatus('failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].lastError).toContain('422');
    expect(failed[0].retries).toBe(1);

    await updatePendingOp(id as number, { status: 'pending', lastError: null });
    expect(await getFailedOpsCount()).toBe(0);
    expect(await getPendingOpsByStatus('pending')).toHaveLength(1);
    expect(await getPendingOpsCount()).toBe(1);
  });

  it('removing an op keeps the relative FIFO order of the survivors', async () => {
    const o1 = await enqueueOp({ method: 'POST', url: '/documents', data: { seq: 1 } });
    const o2 = await enqueueOp({ method: 'POST', url: '/documents', data: { seq: 2 } });
    const o3 = await enqueueOp({ method: 'POST', url: '/documents', data: { seq: 3 } });

    await removePendingOp(o2.id as number);

    const ops = await getPendingOps();
    expect(ops.map(o => o.id as number)).toEqual([o1.id as number, o3.id as number]);
    expect(ops.map(o => (o.data as { seq: number }).seq)).toEqual([1, 3]);
  });

  it('derives the tenant slug from the first url path segment', () => {
    expect(slugFromUrl('/company-a/products/8')).toBe('company-a');
    expect(slugFromUrl('company-a/documents')).toBe('company-a');
    expect(slugFromUrl('/documents/123')).toBe('documents');
    expect(slugFromUrl('/public-route?x=1')).toBe('public-route');
    expect(slugFromUrl('')).toBe('');
    expect(opSlug({ slug: undefined, url: '/company-a/products/8' })).toBe('company-a');
    expect(opSlug({ slug: 'company-b', url: '/company-a/products/8' })).toBe('company-b');
  });

  it('stores the tenant slug at enqueue: explicit wins, else derived from the url', async () => {
    await enqueueOp({ method: 'POST', url: '/company-a/documents', data: {} });
    await enqueueOp({ method: 'POST', url: '/company-b/documents', data: {}, slug: 'company-b' });
    await enqueueOp({ method: 'POST', url: '/company-a/products', data: {}, slug: 'company-a' });

    const ops = await getPendingOps();
    expect(ops.map(o => o.slug)).toEqual(['company-a', 'company-b', 'company-a']);
  });

  it('scopes reads/counts to the active tenant and keeps tenant-less ops for every tenant', async () => {
    await enqueueOp({ method: 'DELETE', url: '/company-a/products/8', data: {} });
    await enqueueOp({ method: 'DELETE', url: '/company-b/products/9', data: {} });
    await enqueueOp({ method: 'DELETE', url: '/company-a/products/10', data: {} });
    // legacy row shape: no `slug` field — must be matched via its url (opSlug)
    await enqueueOp({ method: 'POST', url: '/company-c/documents', data: {}, slug: undefined });

    expect(await getPendingOps('company-a')).toHaveLength(2);
    expect(await getPendingOps('company-b')).toHaveLength(1);
    expect(await getPendingOpsCount('company-a')).toBe(2);
    expect(await getPendingOpsCount('company-b')).toBe(1);

    const statuses = await getPendingOpsByStatus('pending', 'company-a');
    expect(statuses).toHaveLength(2);
    expect(statuses.map(o => o.url)).toEqual([
      '/company-a/products/8',
      '/company-a/products/10',
    ]);

    // no slug → full queue (callers without a tenant context)
    expect(await getPendingOps()).toHaveLength(4);
  });

  it('clearFailedOps removes ONLY the active tenant\'s failed ops', async () => {
    const a = await enqueueOp({ method: 'DELETE', url: '/company-a/products/8', data: {} });
    await enqueueOp({ method: 'DELETE', url: '/company-b/products/9', data: {} });
    await updatePendingOp(a.id as number, { status: 'failed', lastError: '404 المورد غير موجود', retries: 3 });

    expect(await getFailedOpsCount('company-a')).toBe(1);
    expect(await getFailedOpsCount('company-b')).toBe(0);

    const removed = await clearFailedOps('company-a');

    expect(removed).toBe(1);
    expect(await getFailedOpsCount()).toBe(0);
    // the OTHER tenant's op is untouched
    const ops = await getPendingOps();
    expect(ops).toHaveLength(1);
    expect(ops[0].url).toBe('/company-b/products/9');
  });
});
