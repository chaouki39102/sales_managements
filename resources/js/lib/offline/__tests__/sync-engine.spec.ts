import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueOp,
  getPendingOps,
  getPendingOpsByStatus,
  clearPendingOps,
  updatePendingOp,
} from '../db';
import {
  replayPendingOps,
  resolveOpUrl,
  isPermanent,
  errorMessage,
  MAX_RETRIES,
  type HttpReplayFn,
} from '../syncEngine';

describe('sync engine (syncEngine.ts)', () => {
  beforeEach(async () => {
    await clearPendingOps();
  });

  it('replays the queue in FIFO order and removes successes', async () => {
    const order: string[] = [];
    const replay: HttpReplayFn = async ({ method, url }) => {
      order.push(`${method} ${url}`);
      return {};
    };
    await enqueueOp({ method: 'POST', url: '/documents', data: { n: 1 } });
    await enqueueOp({ method: 'POST', url: '/documents', data: { n: 2 } });

    const report = await replayPendingOps(replay);

    expect(order).toEqual(['POST /documents', 'POST /documents']);
    expect(report).toEqual({ replayed: 2, failed: 0, remaining: 0 });
    expect(await getPendingOps()).toHaveLength(0);
  });

  it('resolves a follow-up op against the temp id of a replayed create (PUT, not POST)', async () => {
    const calls: Array<{ method: string; url: string }> = [];
    const replay: HttpReplayFn = async (op) => {
      calls.push({ method: op.method, url: op.url });
      if (op.url === '/documents') return { id: 999 };
      return {};
    };
    // create offline (temp -777) then a follow-up edit referencing the temp id
    await enqueueOp({ method: 'POST', url: '/documents', data: {}, tempId: -777 });
    await enqueueOp({ method: 'PUT', url: '/documents/-777', data: {} });

    const report = await replayPendingOps(replay);

    expect(calls[0]).toEqual({ method: 'POST', url: '/documents' });
    // the follow-up was PUT to the REAL id — never POSTed as a new document
    expect(calls[1]).toEqual({ method: 'PUT', url: '/documents/999' });
    expect(report.replayed).toBe(2);
    expect(report.failed).toBe(0);
  });

  it('marks a permanent (4xx) failure as failed and continues the queue', async () => {
    const replay: HttpReplayFn = async (op) => {
      if (op.url === '/documents/bad') {
        const e = new Error('خطأ في التحقق');
        (e as { response?: { status: number; data: { message: string } } }).response = {
          status: 422,
          data: { message: 'سطر غير سليم' },
        };
        throw e;
      }
      return {};
    };
    await enqueueOp({ method: 'POST', url: '/documents', data: { ok: 1 } });
    await enqueueOp({ method: 'POST', url: '/documents/bad', data: {} });
    await enqueueOp({ method: 'POST', url: '/documents', data: { ok: 2 } });

    const report = await replayPendingOps(replay);

    expect(report).toEqual({ replayed: 2, failed: 1, remaining: 1 });
    const failed = await getPendingOpsByStatus('failed');
    expect(failed).toHaveLength(1);
    expect(failed[0].url).toBe('/documents/bad');
    expect(failed[0].lastError).toBe('سطر غير سليم');
    // never silently dropped — surfaced for review
    expect(await getPendingOps()).toHaveLength(1);
  });

  it('bumps retries for transient failures and gives up only after MAX_RETRIES', async () => {
    const transient = new Error('network down');
    const replay: HttpReplayFn = async () => { throw transient; };
    await enqueueOp({ method: 'POST', url: '/documents', data: {} });

    // attempt 1 → retries 1 (still pending)
    let report = await replayPendingOps(replay);
    expect(report.failed).toBe(0);
    let pending = await getPendingOpsByStatus('pending');
    expect(pending[0].retries).toBe(1);

    // attempt 2 → retries 2 (still pending)
    report = await replayPendingOps(replay);
    expect(report.failed).toBe(0);
    pending = await getPendingOpsByStatus('pending');
    expect(pending[0].retries).toBe(2);

    // attempt 3 → reaches MAX_RETRIES → failed
    report = await replayPendingOps(replay);
    expect(report.failed).toBe(1);
    expect(await getPendingOpsByStatus('failed')).toHaveLength(1);
    expect(MAX_RETRIES).toBe(3);
  });

  it('classifies errors and extracts arabic messages from the axios envelope', () => {
    const four22 = new Error('x');
    (four22 as { response?: { status: number } }).response = { status: 422 };
    const five00 = new Error('y');
    (five00 as { response?: { status: number } }).response = { status: 500 };
    expect(isPermanent(four22)).toBe(true);
    expect(isPermanent(five00)).toBe(false);
    expect(isPermanent(new Error('net'))).toBe(false);

    const withMessage = new Error('boom');
    (withMessage as { response?: { status: number; data: { message: string } } }).response = {
      status: 422,
      data: { message: 'الكمية غير متوفرة' },
    };
    expect(errorMessage(withMessage)).toBe('الكمية غير متوفرة');

    const withErrors = new Error('boom');
    (withErrors as { response?: { status: number; data: { errors: Record<string, string[]> } } }).response = {
      status: 422,
      data: { errors: { lines: ['أ', 'ب'] } },
    };
    expect(errorMessage(withErrors)).toBe('أ، ب');
  });

  it('rewrites every temp-id occurrence in a url via the temp map', () => {
    const map = new Map<number, number>([[-777, 999], [-778, 1000]]);
    expect(resolveOpUrl('/documents/-777', map)).toBe('/documents/999');
    expect(resolveOpUrl('/documents/-778/payments', map)).toBe('/documents/1000/payments');
    expect(resolveOpUrl('/documents', map)).toBe('/documents');
    expect(resolveOpUrl('/documents/-999', map)).toBe('/documents/-999'); // unknown stays
  });

  it('a failed op reset to pending is replayed on the next run', async () => {
    const { id } = await enqueueOp({ method: 'POST', url: '/documents/x', data: {} });
    await updatePendingOp(id as number, { status: 'failed', retries: 3, lastError: 'x' });

    // user taps "retry" → back to pending
    await updatePendingOp(id as number, { status: 'pending', lastError: null, retries: 0 });
    const report = await replayPendingOps(async () => ({}));
    expect(report.replayed).toBe(1);
    expect(await getPendingOps()).toHaveLength(0);
  });

  it('replay scoped to a slug only touches THAT tenant\'s ops (cross-tenant isolation)', async () => {
    const replayed: string[] = [];
    const replay: HttpReplayFn = async ({ url }) => {
      replayed.push(url);
      return {};
    };
    await enqueueOp({ method: 'DELETE', url: '/company-a/products/8', data: {} });
    await enqueueOp({ method: 'DELETE', url: '/company-b/products/9', data: {} });
    await enqueueOp({ method: 'DELETE', url: '/company-a/products/10', data: {} });

    // syncing while company A is active → B's stale ops stay queued
    const report = await replayPendingOps(replay, 'company-a');

    expect(replayed).toEqual(['/company-a/products/8', '/company-a/products/10']);
    // remaining is scoped to the ACTIVE tenant (A's queue is now empty); B's op
    // is untouched below — isolation is proven by the queue contents, not the count.
    expect(report).toEqual({ replayed: 2, failed: 0, remaining: 0 });
    const left = await getPendingOps();
    expect(left).toHaveLength(1);
    expect(left[0].url).toBe('/company-b/products/9');
  });
});
