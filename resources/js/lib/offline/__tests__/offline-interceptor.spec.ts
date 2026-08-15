// C.1d — Offline interception regression suite.
//
// The critical proven bug (Phase 70): the offline layer never fired because
// client.ts's response error interceptor (registered at module import) converted
// every network error into a `.config`-less ApiError, so offlineAwareApi's own
// response interceptor (registered later) re-threw it — the write queue and
// cached GETs were dead code.
//
// The fix moves offline interception into a PRE-NORMALIZATION hook inside
// client.ts (registerNetworkFailureHandler): the hook receives the RAW
// AxiosError (`.config`/`.code` intact) BEFORE the ApiError mapping. This suite
// pins the real boot order (client.ts module import → registerOfflineInterceptor())
// and the full contract:
//   - a 4xx/5xx (error.response present) ALWAYS surfaces → 0 queued ops,
//     even when navigator.onLine is false;
//   - ERR_CANCELED / config errors never queue;
//   - a transport failure queues mutations and serves cached/empty GETs,
//     regardless of navigator.onLine (flaky links report online while failing).
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import client from '@/lib/api/core/client';
import { registerOfflineInterceptor, isDataStale } from '../offlineAwareApi';
import { getPendingOps, clearPendingOps, invalidateCache } from '../db';

// ── Boot-order setup (mirrors app.jsx) ────────────────────────────────────────
// client.ts is imported above → its response error interceptor (which invokes
// the network-failure hook) is already registered. Calling
// registerOfflineInterceptor() registers the success interceptor + hook. This
// IS the boot order; the suite must NOT wipe interceptors (that would remove
// client.ts's own interceptor and defeat the architecture under test).
beforeAll(() => {
  registerOfflineInterceptor();
});

type AdapterMode =
  | { kind: 'network'; code?: string }
  | { kind: 'http'; status: number; data?: unknown }
  | { kind: 'ok'; status?: number; data?: unknown };

let mode: AdapterMode = { kind: 'ok' };

function setMode(m: AdapterMode): void {
  mode = m;
}

function rawAxiosError(config: unknown, patch: Partial<any>): any {
  const err: any = new Error('probe');
  err.isAxiosError = true;
  err.config = config;
  err.request = {};
  err.response = undefined;
  err.code = 'ERR_NETWORK';
  err.toJSON = () => ({ message: 'probe', code: err.code });
  Object.assign(err, patch);
  return err;
}

client.defaults.adapter = async (config: any) => {
  const m = mode;
  if (m.kind === 'network') {
    throw rawAxiosError(config, m.code ? { code: m.code } : {});
  }
  if (m.kind === 'http') {
    throw rawAxiosError(config, {
      code: undefined,
      request: undefined,
      response: { status: m.status, statusText: 'probe', data: m.data, headers: {}, config },
    });
  }
  return { data: m.data ?? { status: 'success', data: null }, status: m.status ?? 200, statusText: 'OK', headers: {}, config };
};

/** Drive the browser offline flag (Node's global navigator has no onLine property). */
function setNavigatorOnline(v: boolean): void {
  const nav = (globalThis as any).navigator as { onLine?: boolean } | undefined;
  if (!nav) return;
  Object.defineProperty(nav, 'onLine', { value: v, configurable: true });
}

beforeEach(async () => {
  mode = { kind: 'ok' };
  setNavigatorOnline(true);
  await clearPendingOps();
  await invalidateCache('api:');
});

const DOC_PAYLOAD = {
  document_type_id: 2,
  lines: [
    { product_id: 1, quantity: 2, unit_price_ht: 100, pack_qty: 3, tva_rate: 19, discount_percentage: 10 },
    { product_id: 2, quantity: 1, unit_price_ht: 50, tva_rate: 0 },
  ],
};

async function expectRejected(p: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await p;
  } catch (e) {
    return { status: (e as { status?: number }).status ?? -1, code: (e as { code?: string }).code ?? '' };
  }
  throw new Error('expected the promise to reject');
}

describe('offline interception (client.ts hook boot order)', () => {
  it('offline mutation → queued op + synthetic 202 ack with server-free totals', async () => {
    setNavigatorOnline(false);
    setMode({ kind: 'network' });

    const res = await client.post('/demo/documents', DOC_PAYLOAD);

    expect(res.status).toBe(202);
    expect((res as any)._offline).toBe(true);
    const body = res.data as any;
    expect(body.queued).toBe(true);
    expect(body._offline).toBe(true);
    expect(body.document_number).toMatch(/^OFFLINE-/);
    expect(body.id).toBeLessThan(0); // temp id
    // totals are computed locally (gross=qty×per-unit×pack, disc 10% on line1)
    expect(body.total_ht).toBe(590);
    expect(body.total_tva).toBe(102.6);
    expect(body.total_ttc).toBe(692.6);
    expect(body.net_to_pay).toBe(692.6);

    const ops = await getPendingOps();
    expect(ops).toHaveLength(1);
    expect(ops[0].method).toBe('POST');
    expect(ops[0].url).toBe('/demo/documents');
    expect(ops[0].slug).toBe('demo'); // tenant captured from the url's first segment
    expect(ops[0].tempId).toBeLessThan(0);
    expect(ops[0].data).toEqual(DOC_PAYLOAD);
  });

  it('flaky link (navigator ONLINE, ERR_NETWORK) still queues — predicate not browser flag', async () => {
    setNavigatorOnline(true);
    setMode({ kind: 'network' });

    const res = await client.post('/demo/documents', DOC_PAYLOAD);

    expect((res as any)._offline).toBe(true);
    expect(await getPendingOps()).toHaveLength(1);
  });

  it('422 WITH response surfaces as ApiError even when navigator reports offline → 0 ops', async () => {
    setNavigatorOnline(false); // proves the response branch wins over the browser flag
    setMode({ kind: 'http', status: 422, data: { message: 'البيانات غير صالحة', errors: { quantity: ['مطلوب'] } } });

    const err = await expectRejected(client.post('/demo/documents', DOC_PAYLOAD));

    expect(err.status).toBe(422);
    expect(await getPendingOps()).toHaveLength(0);
  });

  it('500 WITH response surfaces → 0 ops', async () => {
    setMode({ kind: 'http', status: 500, data: { message: 'خطأ في الخادم' } });

    const err = await expectRejected(client.get('/demo/items'));

    expect(err.status).toBe(500);
    expect(await getPendingOps()).toHaveLength(0);
  });

  it('ERR_CANCELED never queues (a canceled op must not hit the replay queue)', async () => {
    setNavigatorOnline(false);
    setMode({ kind: 'network', code: 'ERR_CANCELED' });

    const err = await expectRejected(client.post('/demo/documents', DOC_PAYLOAD));

    expect(err.status).toBe(0);
    expect(await getPendingOps()).toHaveLength(0);
  });

  it('offline GET serves the response cached by an earlier real GET', async () => {
    // seed the cache via a real 200 through the success interceptor
    setNavigatorOnline(true);
    setMode({ kind: 'ok', data: { status: 'success', data: { list: [1, 2, 3] } } });
    await client.get('/demo/items', { params: { a: 1 } });

    setNavigatorOnline(false);
    setMode({ kind: 'network' });
    const res = await client.get('/demo/items', { params: { a: 1 } });

    expect((res as any)._offline).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: 'success', data: { list: [1, 2, 3] } });
  });

  it('offline GET with an empty cache → [] with _offline (never throws)', async () => {
    setNavigatorOnline(false);
    setMode({ kind: 'network' });

    const res = await client.get('/demo/items');

    expect((res as any)._offline).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual([]);
  });

  it('synthetic offline responses do NOT clear the stale badge; a real GET does', async () => {
    setNavigatorOnline(true);
    setMode({ kind: 'ok', data: { status: 'success', data: { ok: 1 } } });
    await client.get('/demo/items'); // real response → stale cleared
    expect(isDataStale()).toBe(false);

    setNavigatorOnline(false);
    setMode({ kind: 'network' });
    await client.get('/demo/items'); // served from cache → stale
    expect(isDataStale()).toBe(true);

    await client.post('/demo/documents', DOC_PAYLOAD); // synthetic 202 flows through success interceptor
    expect(isDataStale()).toBe(true); // must NOT clear it

    setNavigatorOnline(true);
    setMode({ kind: 'ok', data: { status: 'success', data: { ok: 1 } } });
    await client.get('/demo/items'); // real network response clears it
    expect(isDataStale()).toBe(false);
  });

  it('non-document offline mutation still queues with the minimal ack body', async () => {
    setNavigatorOnline(false);
    setMode({ kind: 'network' });

    const res = await client.patch('/demo/parties/9', { name: 'offline edit' });

    expect((res as any)._offline).toBe(true);
    const body = res.data as any;
    expect(body.queued).toBe(true);
    expect(body.document_number).toBeUndefined(); // no document receipt fabricated

    const ops = await getPendingOps();
    expect(ops).toHaveLength(1);
    expect(ops[0].method).toBe('PATCH');
    expect(ops[0].url).toBe('/demo/parties/9');
    expect(ops[0].slug).toBe('demo');
    expect(ops[0].data).toEqual({ name: 'offline edit' });
  });
});
