// C.2 — Field-agent document flow verification (create → edit → pay → sync).
//
// Proves the whole offline commercial-document loop end-to-end through the REAL
// interceptor boot order (client.ts module import → registerOfflineInterceptor()):
//   1. Offline CREATE of a document (POST /documents, lines + payments) queues
//      and returns a synthetic 202 ack with a temp id + OFFLINE-<n> number and
//      server-free totals (queueMath mirrors the line engine).
//   2. Offline EDIT+PAY of that very document (PUT /documents/<tempId>) queues
//      VERBATIM (method stays PUT — never converted to POST on replay) and does
//      NOT mint a second temp id.
//   3. Sync replays FIFO: the create lands first and returns the real server id,
//      then resolveOpUrl rewrites the follow-up PUT url /<tempId> → /<realId>.
//
// Also pins that the queued ack SURVIVES extractData() (the apiPost bridge), so
// component-level `isOfflineQueuedResponse(savedDoc)` branches actually fire.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import client, { extractData } from '@/lib/api/core/client';
import { registerOfflineInterceptor } from '../offlineAwareApi';
import { getPendingOps, clearPendingOps, invalidateCache } from '../db';
import { replayPendingOps } from '../syncEngine';
import {
  isOfflineQueuedResponse,
  isDocumentPayload,
  computeQueuedDocumentTotals,
} from '../queueMath';

// ── Boot-order setup (mirrors app.jsx) ────────────────────────────────────────
beforeAll(() => {
  registerOfflineInterceptor();
});

type AdapterMode =
  | { kind: 'network'; code?: string }
  | { kind: 'ok'; status?: number; data?: unknown };

let mode: AdapterMode = { kind: 'ok' };

function setMode(m: AdapterMode): void {
  mode = m;
}

function rawAxiosError(config: unknown): any {
  const err: any = new Error('probe');
  err.isAxiosError = true;
  err.config = config;
  err.request = {};
  err.response = undefined;
  err.code = 'ERR_NETWORK';
  err.toJSON = () => ({ message: 'probe', code: 'ERR_NETWORK' });
  return err;
}

client.defaults.adapter = async (config: any) => {
  const m = mode;
  if (m.kind === 'network') {
    throw rawAxiosError(config);
  }
  return { data: m.data ?? { status: 'success', data: null }, status: m.status ?? 200, statusText: 'OK', headers: {}, config };
};

beforeEach(async () => {
  mode = { kind: 'ok' };
  await clearPendingOps();
  await invalidateCache('api:');
});

const CREATE_PAYLOAD = {
  document_type_id: 2,
  party_id: 7,
  lines: [
    { product_id: 1, quantity: 5, unit_price_ht: 100, pack_qty: 2, tva_rate: 19, discount_percentage: 10 },
  ],
  payments: [{ payment_mode_id: 1, amount: 900 }],
};

const EDIT_PAYLOAD = {
  document_type_id: 2,
  party_id: 7,
  lines: [
    { id: 9999, product_id: 1, quantity: 6, unit_price_ht: 100, pack_qty: 2, tva_rate: 19, discount_percentage: 0 },
  ],
  payments: [{ payment_mode_id: 1, amount: 1200 }],
};

describe('C.2 field-agent document flow', () => {
  it('create → edit+pay → sync: temp url rewritten to the real id, FIFO order, 2/0/0', async () => {
    setMode({ kind: 'network' });

    // 1. Offline CREATE.
    const created = await client.post('/field/documents', CREATE_PAYLOAD);

    expect(created.status).toBe(202);
    const ack = created.data as any;
    expect(isOfflineQueuedResponse(ack)).toBe(true);
    expect(ack.id).toBeLessThan(0);
    const tempId = ack.id as number;
    expect(ack.document_number).toMatch(/^OFFLINE-/);
    // queueMath mirror of the line engine: gross=5×100×2=1000, disc 10%→900 HT,
    // TVA 171, TTC 1071, paid 900.
    expect(ack.total_ht).toBe(900);
    expect(ack.total_tva).toBe(171);
    expect(ack.total_ttc).toBe(1071);
    expect(ack.net_to_pay).toBe(1071);
    expect(ack.paid_amount).toBe(900);

    // 2. Offline EDIT + PAY of the just-created doc (the cart PUTs the temp id).
    const edited = await client.put(`/field/documents/${tempId}`, EDIT_PAYLOAD);

    expect(edited.status).toBe(202);
    expect(isOfflineQueuedResponse(edited.data)).toBe(true);

    const ops = await getPendingOps();
    expect(ops).toHaveLength(2);
    expect(ops[0].method).toBe('POST');
    expect(ops[0].url).toBe('/field/documents');
    expect(ops[0].tempId).toBe(tempId);
    expect(ops[0].data).toEqual(CREATE_PAYLOAD);
    expect(ops[1].method).toBe('PUT');
    expect(ops[1].url).toBe(`/field/documents/${tempId}`); // verbatim — never POST
    expect(ops[1].tempId).toBeNull(); // an edit does not mint a new temp id
    expect(ops[1].data).toEqual(EDIT_PAYLOAD);

    // 3. Sync: replay FIFO, create lands first, follow-up PUT rewritten.
    const replayed: Array<{ method: string; url: string }> = [];
    const report = await replayPendingOps(async ({ method, url, data }) => {
      replayed.push({ method, url });
      if (method === 'POST') {
        expect(url).toBe('/field/documents');
        expect(data).toEqual(CREATE_PAYLOAD);
        return { id: 42 };
      }
      expect(method).toBe('PUT');
      expect(url).toBe('/field/documents/42');
      expect(data).toEqual(EDIT_PAYLOAD);
      return { id: 42 };
    });

    expect(replayed.map(r => r.method)).toEqual(['POST', 'PUT']);
    expect(replayed[1].url).toBe('/field/documents/42');
    expect(report).toEqual({ replayed: 2, failed: 0, remaining: 0 });
    expect(await getPendingOps()).toHaveLength(0);
  });

  it('the queued ack SURVIVES extractData (the apiPost bridge) so UI branches on it', async () => {
    setMode({ kind: 'network' });

    const res = await client.post('/field/documents', CREATE_PAYLOAD);
    // extractData receives the raw axios response body — the ack has NO 'data'
    // envelope key, so it must pass through untouched with _offline/queued intact.
    const payload = extractData<Record<string, unknown>>(res);
    expect(isOfflineQueuedResponse(payload)).toBe(true);
    expect(String(payload.document_number)).toMatch(/^OFFLINE-/);
    expect(typeof payload.id).toBe('number');
  });

  it('queueMath helpers classify the field payloads as documents', () => {
    expect(isDocumentPayload(CREATE_PAYLOAD)).toBe(true);
    expect(isDocumentPayload(EDIT_PAYLOAD)).toBe(true);
    expect(isDocumentPayload({ name: 'not a doc' })).toBe(false);
    const t = computeQueuedDocumentTotals(CREATE_PAYLOAD);
    expect(t).toEqual({ total_ht: 900, total_tva: 171, total_ttc: 1071, net_to_pay: 1071, paid_amount: 900 });
  });
});
