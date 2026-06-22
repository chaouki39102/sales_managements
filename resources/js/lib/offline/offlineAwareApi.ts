import client from '@/lib/api/core/client';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { setCache, getCache, enqueueOp } from './db';

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
        await setCache(key, response.data, 2 * 60_000);
      }
      return response;
    },
    async (error) => {
      const cfg = error.config as InternalAxiosRequestConfig;
      if (!cfg) throw error;
      const method = cfg.method?.toLowerCase() ?? '';

      if (MUTATING_METHODS.has(method) && !navigator.onLine) {
        await enqueueOp({
          method: method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          url: cfg.url ?? '',
          data: cfg.data,
        });
        return Promise.resolve({
          data: { ok: true, queued: true, _offline: true },
          status: 202,
          statusText: 'Accepted (queued offline)',
        } as AxiosResponse);
      }

      if (CACHEABLE_METHODS.has(method) && !navigator.onLine) {
        const key = cacheKeyFromUrl(cfg.url ?? '', cfg.params);
        const cached = await getCache(key);
        if (cached) {
          return Promise.resolve({
            data: cached,
            status: 200,
            statusText: 'OK (cached offline)',
            _offline: true,
          } as AxiosResponse);
        }
        return Promise.resolve({
          data: [],
          status: 200,
          statusText: 'OK (empty offline)',
          _offline: true,
        } as AxiosResponse);
      }

      throw error;
    },
  );
}
