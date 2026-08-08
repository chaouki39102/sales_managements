import client from '@/lib/api/core/client';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { setCache, getCache, enqueueOp, type EnqueueInput } from './db';
import {
  computeQueuedDocumentTotals,
  nextTempId,
  offlineDocNumber,
  isDocumentUrl,
  isDocumentPayload,
} from './queueMath';

const CACHEABLE_METHODS = new Set(['get']);
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function cacheKeyFromUrl(url: string, params?: unknown): string {
  return `api:${url}:${JSON.stringify(params ?? {})}`;
}

let registered = false;

export function registerOfflineInterceptor(): void {
  if (registered) return;
  registered = true;

  client.interceptors.response.use(
    async (response: AxiosResponse) => {
      const cfg = response.config as InternalAxiosRequestConfig;
      const method = cfg.method?.toLowerCase() ?? '';
      if (CACHEABLE_METHODS.has(method) && response.status === 200) {
        const key = cacheKeyFromUrl(cfg.url ?? '', cfg.params);
        await setCache(key, response.data, 5 * 60_000);
      }
      return response;
    },
    async (error) => {
      const cfg = error.config as InternalAxiosRequestConfig;
      if (!cfg) throw error;
      const method = cfg.method?.toLowerCase() ?? '';

      // ── Offline mutation → persist to the write queue (FIFO) + optimistic ack
      if (MUTATING_METHODS.has(method) && !navigator.onLine) {
        const url = cfg.url ?? '';
        const isDoc = isDocumentUrl(url) || isDocumentPayload(cfg.data);

        const enq: EnqueueInput = {
          method: method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          url,
          data: cfg.data,
        };

        // A document CREATE gets a temp id so follow-up ops can reference it
        // and so the UI can show a stable receipt number while offline.
        let queuedBody: Record<string, unknown> = { ok: true, queued: true, _offline: true };
        if (isDoc) {
          const tempId = nextTempId();
          enq.tempId = method === 'post' ? tempId : null;
          const totals = computeQueuedDocumentTotals(cfg.data);
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
        } as AxiosResponse);
      }

      // ── Offline GET → serve cached data (fallback empty) with _offline flag
      if (CACHEABLE_METHODS.has(method) && !navigator.onLine) {
        const key = cacheKeyFromUrl(cfg.url ?? '', cfg.params);
        const cached = await getCache(key);
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

      throw error;
    },
  );
}
