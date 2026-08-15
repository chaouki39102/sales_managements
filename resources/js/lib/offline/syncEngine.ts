import {
  getPendingOps,
  removePendingOp,
  updatePendingOp,
  getPendingOpsCount,
  type PendingOp,
} from './db';

/**
 * HTTP adapter used by the sync engine. Implementations wrap the real axios
 * client (or a mock in tests). The resolved object carries the created entity
 * id so a queued create can feed its temp→real id mapping.
 */
export type HttpReplayFn = (op: {
  method: PendingOp['method'];
  url: string;
  data?: unknown;
}) => Promise<{ id?: number }>;

export interface SyncReport {
  replayed: number;
  failed: number;
  remaining: number;
}

export type SyncResult = SyncReport;

export const MAX_RETRIES = 3;

export function errorMessage(e: unknown): string {
  const r = (e as { response?: { data?: unknown } })?.response?.data as
    | { message?: unknown; errors?: unknown }
    | undefined;
  if (typeof r?.message === 'string' && r.message) return r.message;
  if (r?.errors) {
    if (Array.isArray(r.errors)) return r.errors.join('، ');
    if (typeof r.errors === 'object') {
      const flat: unknown[] = Object.values(r.errors as Record<string, unknown>).flat();
      if (flat.length) return flat.map(String).join('، ');
    }
  }
  return String((e as { message?: unknown })?.message ?? 'فشل إرسال العملية أثناء المزامنة');
}

/** 4xx = permanent (server rejects — surface, never drop); 5xx/network = retryable. */
export function isPermanent(e: unknown): boolean {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Rewrite follow-up URLs that reference a negative temp id to the real id the
 * server returned when the queued create was replayed (Phase 46: an update of
 * an offline-created document must PUT to the REAL id, never POST a new one).
 */
export function resolveOpUrl(url: string, tempMap: Map<number, number>): string {
  if (tempMap.size === 0) return url;
  let out = url;
  for (const [temp, real] of tempMap) {
    out = out.replace(`/${temp}`, `/${real}`);
  }
  return out;
}

/**
 * Replay the FIFO write queue through `replay`, scoped to ONE tenant: only ops
 * whose `slug` matches `slug` (the active company) are replayed, so ops queued
 * under a previous/other company never hit the current company's API (and a
 * stale queue surviving a `migrate:fresh` can never 404 against the new data).
 * Order is insertion order (auto-increment ids). A success removes the op; a
 * permanent (4xx) failure or a retryable failure past MAX_RETRIES marks the op
 * `failed` (surfaced in the UI, never silently dropped); other failures bump
 * `retries` and leave it queued.
 */
export async function replayPendingOps(replay: HttpReplayFn, slug?: string): Promise<SyncReport> {
  let replayed = 0;
  let failed = 0;
  const tempMap = new Map<number, number>();

  const ops = await getPendingOps(slug);
  for (const op of ops) {
    const url = resolveOpUrl(op.url, tempMap);
    try {
      const res = await replay({ method: op.method, url, data: op.data });
      if (op.tempId != null && typeof res?.id === 'number') {
        tempMap.set(op.tempId, res.id);
      }
      await removePendingOp(op.id!);
      replayed += 1;
    } catch (e) {
      const errMsg = errorMessage(e);
      const retries = (op.retries ?? 0) + 1;
      if (isPermanent(e) || retries >= MAX_RETRIES) {
        await updatePendingOp(op.id!, { status: 'failed', retries, lastError: errMsg });
        failed += 1;
      } else {
        await updatePendingOp(op.id!, { retries, lastError: errMsg });
      }
    }
  }

  const remaining = await getPendingOpsCount(slug);
  return { replayed, failed, remaining };
}
