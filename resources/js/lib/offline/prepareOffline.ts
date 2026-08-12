// C.3 — Offline data readiness.
//
// Prefetching field-critical datasets so a POS operator can keep working for a
// working day without connectivity. The offline GET path serves whatever the
// response cache holds (offlineAwareApi.ts), so this module simply warms that
// cache with the EXACT urls+params the POS actually queries — a prefetched
// entry is only useful if its cache key matches the later offline request.
import client from '@/lib/api/core/client';
import { cacheKeyForUrl } from './offlineAwareApi';
import { getCacheEntry } from './db';

export interface OfflineDatasetDef {
  id: string;
  label: string;
  desc?: string;
  /** Tenant-relative url (the interceptor prepends `/{slug}/` at request time). */
  url: string;
  /** Static params; dynamic datasets (stock) build theirs per prefetch deps. */
  params?: Record<string, unknown>;
}

/** What a field agent needs to keep selling offline (mirrors real POS queries). */
export const OFFLINE_DATASETS: OfflineDatasetDef[] = [
  {
    id: 'lookups',
    label: 'بيانات نقطة البيع',
    desc: 'الأصناف، المستودعات، مستويات الأسعار، الإعدادات…',
    url: '/lookups/pos',
  },
  {
    id: 'products',
    label: 'المنتجات',
    desc: 'قائمة المنتجات النشطة مع الأسعار والتغليفات',
    url: '/products',
    params: {
      per_page: 2000,
      simple: 1,
      include: 'tva,unit,family,prices,quantityDiscounts,packagings,barcodes',
      filter: { active: 1 },
    },
  },
  {
    id: 'customers',
    label: 'الزبائن',
    desc: 'أحدث الزبائن للبحث عنهم أثناء البيع',
    url: '/customers',
    params: { per_page: 500, sort_by: 'name' },
  },
  {
    id: 'stock',
    label: 'المخزون',
    desc: 'المخزون المتاح للمستودع والسنة المالية الحالية',
    url: '/inventory/stock-at',
  },
  {
    id: 'price-levels',
    label: 'مستويات الأسعار',
    desc: 'قوائم الأسعار الفعلية',
    url: '/price-levels',
    params: { per_page: 50 },
  },
  {
    id: 'warehouses',
    label: 'المستودعات',
    desc: 'قائمة المستودعات',
    url: '/warehouses',
    params: { per_page: 50 },
  },
];

export interface OfflinePrefetchDeps {
  slug: string;
  warehouseId?: number | null;
  fiscalYearId?: number | null;
}

/** Resolve a dataset's params for the given prefetch context (stock is dynamic). */
export function datasetParams(
  ds: OfflineDatasetDef,
  deps: OfflinePrefetchDeps,
): Record<string, unknown> {
  if (ds.id === 'stock') {
    const params: Record<string, unknown> = {};
    if (deps.warehouseId) params.warehouse_id = deps.warehouseId;
    if (deps.fiscalYearId) params.fiscal_year_id = deps.fiscalYearId;
    return params;
  }
  return ds.params ?? {};
}

/**
 * The exact cache key the offline GET path will look up for this dataset. Must
 * match what the success interceptor writes after the request interceptor has
 * prepended the slug: `api:/{slug}{url}:{params}`.
 */
export function datasetCacheKey(ds: OfflineDatasetDef, deps: OfflinePrefetchDeps): string {
  return cacheKeyForUrl(`/${deps.slug}${ds.url}`, datasetParams(ds, deps));
}

export interface DatasetFreshness {
  id: string;
  fresh: boolean;
  expiresAt: number | null;
}

/** Read-only freshness of every dataset from the response cache. */
export async function offlineDatasetsFreshness(deps: OfflinePrefetchDeps): Promise<DatasetFreshness[]> {
  const rows: DatasetFreshness[] = [];
  for (const ds of OFFLINE_DATASETS) {
    const entry = await getCacheEntry<unknown>(datasetCacheKey(ds, deps));
    rows.push({
      id: ds.id,
      fresh: entry !== null,
      expiresAt: entry?.expiresAt ?? null,
    });
  }
  return rows;
}

export interface PrefetchResult {
  id: string;
  ok: boolean;
  error?: string;
}

function extractError(e: unknown): string {
  const ax = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
  return ax.response?.data?.message ?? ax.message ?? 'تعذر التحميل';
}

/**
 * Warm the response cache for every dataset. Runs the REAL client so the
 * success interceptor persists each envelope under the exact key the offline
 * GET path reads. After each fetch we verify the entry actually landed — a
 * synthetic offline `[]` (server unreachable) is NOT cached, so it is reported
 * as a failed dataset rather than a false "prepared".
 */
export async function prefetchOfflineEssentials(deps: OfflinePrefetchDeps): Promise<PrefetchResult[]> {
  const results: PrefetchResult[] = [];
  for (const ds of OFFLINE_DATASETS) {
    try {
      await client.get(ds.url, { params: datasetParams(ds, deps) });
      const entry = await getCacheEntry<unknown>(datasetCacheKey(ds, deps));
      if (entry) {
        results.push({ id: ds.id, ok: true });
      } else {
        results.push({ id: ds.id, ok: false, error: 'لا يوجد اتصال — لم تُخزَّن البيانات محلياً' });
      }
    } catch (e) {
      results.push({ id: ds.id, ok: false, error: extractError(e) });
    }
  }
  return results;
}
