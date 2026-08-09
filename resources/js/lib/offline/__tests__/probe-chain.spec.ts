import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/core/client';
import { registerOfflineInterceptor } from '../offlineAwareApi';
import { getPendingOps } from '../db';

function rawNetworkError(config: unknown): any {
  const err: any = new Error('Network Error');
  err.isAxiosError = true;
  err.config = config;
  err.code = 'ERR_NETWORK';
  err.request = {};
  err.response = undefined;
  err.toJSON = () => ({ message: 'Network Error', code: 'ERR_NETWORK' });
  return err;
}

describe('PROBE: real interceptor chain ordering (client.ts vs offlineAwareApi)', () => {
  beforeEach(() => {
    // Wipe ALL response interceptors so we can reconstruct the exact boot order.
    (client.interceptors.response as any).handlers = [];
    // reset module-level `registered` flag inside offlineAwareApi
    // (it guards registerOfflineInterceptor() to run once)
    (globalThis as any).__offlineRegistered = undefined;
  });

  async function bootLikeApp(): Promise<void> {
    // 1) client.ts response interceptor registers FIRST (at module import)
    client.interceptors.response.use(
      (r) => r,
      async (error: any) => {
        const status = error.response?.status;
        if (!error.response) {
          const ApiError = new Error(error.code === 'ECONNABORTED' ? 'انتهت مهلة الطلب' : 'لا يوجد اتصال');
          (ApiError as any).status = 0;
          (ApiError as any).code = error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR';
          return Promise.reject(ApiError);
        }
        return Promise.reject(new Error(`status ${status}`));
      },
    );
    // 2) offline interceptor registers SECOND (registerOfflineInterceptor())
    registerOfflineInterceptor();
  }

  it('REAL ORDER (client then offline): offline write-queue fires when navigator offline', async () => {
    await bootLikeApp();

    client.defaults.adapter = async (config: any) => {
      throw rawNetworkError(config);
    };

    // force offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    try {
      await client.post('/demo/documents', { lines: [] });
    } catch (e) {
      // swallow
    }

    const ops = await getPendingOps();
    expect(ops.length).toBe(1);
  });
});
