import client, { registerNetworkFailureHandler } from '@/lib/api/core/client';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { setCache, getCache, enqueueOp, type EnqueueInput } from './db';
import {
  computeQueuedDocumentTotals,
  nextTempId,
  offlineDocNumber,
  isDocumentUrl,
  isDocumentPayload,
  isNetworkFailure,
} from './queueMath';

const CACHEABLE_METHODS = new Set(['get']);
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// ── Stale-data signal ─────────────────────────────────────────────────────────
// Consumers can't see the `_offline` flag (extractData strips the envelope), so we
// keep a tiny reactive flag here: TRUE while the most recent GET was served from
// the local cache (offline/stale), FALSE as soon as a real network response lands.
// Components subscribe via `useOfflineServed()`.
let stale = false;
const staleListeners = new Set<() => void>();
const emitStale = () => staleListeners.forEach(l => l());
export function isDataStale(): boolean { return stale; }
export function subscribeDataStale(cb: () => void): () => void {
  staleListeners.add(cb);
  return () => { staleListeners.delete(cb); };
}

// ── URL-aware cache TTL ────────────────────────────────────────────────────────
// Field-critical reads change slowly and are what a field agent actually needs
// offline (C.3): stock, the product catalogue (list + variants), customers/parties,
// price levels, warehouses and the POS aggregated lookups all get a 30-min TTL so
// they survive short outages AND a full prefetch covers a working day. Everything
// else stays at 5 min. The badge stays honest: any offline GET still marks data
// stale regardless of how long the cached copy is valid.
const FIELD_CRITICAL_TTL = 30 * 60_000;
const DEFAULT_TTL = 5 * 60_000;
// NOTE: the interceptor prepends `/{slug}/`, so urls arrive like `/1/products`.
const FIELD_CRITICAL_PATTERNS: RegExp[] = [
  /\/inventory\/stock-at/,
  /\/products(\/|$)/,
  /\/product-variants(\/|$)/,
  /\/parties(\/|$)/,
  /\/customers(\/|$)/,
  /\/suppliers(\/|$)/,
  /\/price-levels(\/|$)/,
  /\/warehouses(\/|$)/,
  /\/lookups\/pos(\/|$)/,
];
export function cacheTtlForUrl(url: string): number {
  return FIELD_CRITICAL_PATTERNS.some(re => re.test(url)) ? FIELD_CRITICAL_TTL : DEFAULT_TTL;
}

/** Public key builder so prefetch/freshness tooling can address the same cache entries. */
export function cacheKeyForUrl(url: string, params?: unknown): string {
  return `api:${url}:${JSON.stringify(params ?? {})}`;
}

let registered = false;

export function registerOfflineInterceptor(): void {
  if (registered) return;
  registered = true;

  // ── Success interceptor: GET response caching + stale-badge clearing ──────
  // A synthetic offline response (`_offline: true`, e.g. the 202 write-queue
  // ack or a cached GET) is NOT a real network response: it must never be
  // re-cached and must never clear the stale badge.
  client.interceptors.response.use(
    async (response: AxiosResponse) => {
      // A synthetic offline response (202 ack / cached / empty) has NO
      // `config` — axios only injects it on a real dispatch. It must never be
      // re-cached and must never clear the stale badge, so treat a missing
      // config as non-cacheable entirely (the `_offline` guard is defense-in-depth).
      const cfg = response.config as InternalAxiosRequestConfig | undefined;
      const method = cfg?.method?.toLowerCase() ?? '';
      const isOfflineSynthetic = (response as unknown as { _offline?: boolean })._offline === true;
      if (cfg && CACHEABLE_METHODS.has(method) && response.status === 200 && !isOfflineSynthetic) {
        const key = cacheKeyForUrl(cfg.url ?? '', cfg.params);
        await setCache(key, response.data, cacheTtlForUrl(cfg.url ?? ''));
      }
      // a real network response means we're not stale anymore
      if (cfg && CACHEABLE_METHODS.has(method) && !isOfflineSynthetic) {
        if (stale) { stale = false; emitStale(); }
      }
      return response;
    },
  );

  // ── Network-failure hook: offline interception runs FIRST ─────────────────
  // Registered through client.ts's pre-normalization hook so it receives the
  // RAW AxiosError (with `.config` + `.code`) BEFORE the app's ApiError
  // mapping strips it. Without this the offline write queue + cached GETs
  // could never fire (the previous error-interceptor ordering silently killed
  // the whole layer). A returned response claims the request; `undefined`
  // falls through to client.ts's normal error mapping (the ApiError we want
  // for genuine 4xx/5xx and non-network transport errors).
  registerNetworkFailureHandler(async (error: AxiosError): Promise<AxiosResponse | undefined> => {
    const cfg = error.config as InternalAxiosRequestConfig;
    if (!cfg) return undefined;
    const method = cfg.method?.toLowerCase() ?? '';

    // Offline = transport-level failure (server unreachable). `isNetworkFailure`
    // is the single classifier: FALSE when a response arrived (4xx/5xx must
    // surface), FALSE for ERR_CANCELED / client config errors, TRUE for network
    // codes, and TRUE by fallback whenever a request was dispatched but no
    // response came back. We deliberately do NOT add `|| !navigator.onLine`:
    // the browser flag is unreliable (flaky links report online while failing)
    // and as an override it would queue 4xx/5xx — or worse, a canceled op —
    // whenever the browser happens to report offline. The predicate already
    // subsumes the connectivity check via the error itself.
    if (!isNetworkFailure(error)) return undefined;

    // ── Offline mutation → persist to the write queue (FIFO) + optimistic ack
    if (MUTATING_METHODS.has(method)) {
      const url = cfg.url ?? '';

      // axios hands us the POST-transform body: a JSON string by default. Parse
      // it back to an object so `isDocumentPayload`/`computeQueuedDocumentTotals`
      // see real numbers AND the queue stores typed data (replay re-sends it and
      // axios re-stringifies → identical wire bytes).
      const rawData = typeof cfg.data === 'string'
        ? (() => { try { return JSON.parse(cfg.data); } catch { return cfg.data; } })()
        : cfg.data;
      const isDoc = isDocumentUrl(url) || isDocumentPayload(rawData);

      const enq: EnqueueInput = {
        method: method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url,
        data: rawData,
      };

      // A document CREATE gets a temp id so follow-up ops can reference it
      // and so the UI can show a stable receipt number while offline.
      let queuedBody: Record<string, unknown> = { ok: true, queued: true, _offline: true };
      if (isDoc) {
        const tempId = nextTempId();
        enq.tempId = method === 'post' ? tempId : null;
        const totals = computeQueuedDocumentTotals(rawData);
        queuedBody = {
          ok: true,
          queued: true,
          _offline: true,
          id: tempId,
          document_number: offlineDocNumber(tempId),
          total_ht: totals?.total_ht ?? 0,
          total_tva: totals?.total_tva ?? 0,
          total_ttc: totals?.total_ttc ?? 0,
          net_to_pay: totals?.net_to_pay ?? 0,
          paid_amount: totals?.paid_amount ?? 0,
          balance_data: { previous_balance: null, new_balance: null },
        };
      }

      await enqueueOp(enq);
      return Promise.resolve({
        data: queuedBody,
        status: 202,
        statusText: 'Accepted (queued offline)',
        _offline: true,
      } as unknown as AxiosResponse);
    }

    // ── Offline GET → serve cached data (fallback empty) with _offline flag
    if (CACHEABLE_METHODS.has(method)) {
      const key = cacheKeyForUrl(cfg.url ?? '', cfg.params);
      const cached = await getCache(key);
      if (!stale) { stale = true; emitStale(); }
      if (cached) {
        return Promise.resolve({
          data: cached,
          status: 200,
          statusText: 'OK (cached offline)',
          _offline: true,
        } as unknown as AxiosResponse);
      }
      return Promise.resolve({
        data: [],
        status: 200,
        statusText: 'OK (empty offline)',
        _offline: true,
      } as unknown as AxiosResponse);
    }

    return undefined;
  });
}
