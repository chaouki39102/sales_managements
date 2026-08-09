// Pure offline-queue math + helpers (no axios/client imports — unit-testable).
// Mirrors CommercialDocumentService line math (gross = qty × per-unit × pack;
// fixed-amount discount is per BASE unit, percentage is on gross). This is a
// LOCAL preview so the POS can complete offline; the server recomputes on sync.

export interface OfflineDocumentTotals {
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  net_to_pay: number;
  paid_amount: number;
}

export interface QueuedDocumentResponse {
  ok: true;
  queued: true;
  _offline: true;
  id: number; // temp id (negative) — resolved to the real id on sync
  document_number: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  net_to_pay: number;
  paid_amount: number;
  total_stamp?: number;
  balance_data: { previous_balance: null; new_balance: null };
}

export function isOfflineQueuedResponse(r: unknown): r is QueuedDocumentResponse {
  return !!r && typeof r === 'object' && (r as { _offline?: boolean })._offline === true
    && (r as { queued?: boolean }).queued === true;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeQueuedDocumentTotals(data: unknown): OfflineDocumentTotals | null {
  const body = (data ?? {}) as { lines?: unknown; payments?: unknown };
  if (!Array.isArray(body.lines)) return null;

  let totalHt = 0;
  let totalTva = 0;
  for (const raw of body.lines) {
    const l = (raw ?? {}) as Record<string, unknown>;
    const qty = Number(l.quantity ?? 0);
    const price = Number(l.unit_price_ht ?? 0);
    const pack = Math.max(1, Number(l.pack_qty ?? 1));
    const baseQty = qty * pack;
    const gross = qty * price * pack;
    const fixed = Number(l.discount_amount_per_unit ?? 0);
    const disc = fixed > 0
      ? fixed * baseQty
      : gross * (Number(l.discount_percentage ?? 0) / 100);
    const ht = gross - disc;
    const tva = ht * (Number(l.tva_rate ?? 0) / 100);
    totalHt += ht;
    totalTva += tva;
  }
  const totalTtc = totalHt + totalTva;
  const paid = Array.isArray(body.payments)
    ? body.payments.reduce((s: number, p: unknown) => s + Number((p as { amount?: unknown }).amount ?? 0), 0)
    : 0;

  return {
    total_ht: round2(totalHt),
    total_tva: round2(totalTva),
    total_ttc: round2(totalTtc),
    net_to_pay: round2(totalTtc),
    paid_amount: round2(paid),
  };
}

let tempSeq = 0;

/** Unique negative temp id (negative epoch-sec + session counter) — never collides with server ids. */
export function nextTempId(): number {
  tempSeq += 1;
  return -Math.floor(Date.now() / 1000) * 1_000_000 - (tempSeq % 1_000_000);
}

export function offlineDocNumber(tempId: number): string {
  return `OFFLINE-${Math.abs(tempId)}`;
}

export function isDocumentUrl(url: string): boolean {
  return /(^|\/)documents(\/\d+)?(\?|$)/.test(String(url));
}

// ─── Network-failure classification (C.1) ─────────────────────────────────────
// TRUE  = transport-level failure (no HTTP response): server unreachable, DNS,
//         connection refused/reset, timeout. These are "offline" even when the
//         browser reports navigator.onLine === true (flaky mobile links).
// FALSE = the server answered (4xx/5xx — must surface), a user/signal abort
//         (ERR_CANCELED), or a client config error (ERR_BAD_OPTION*).
const NETWORK_FAILURE_CODES = new Set([
  'ERR_NETWORK', 'ERR_INTERNET_DISCONNECTED', 'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_RESET', 'ERR_CONNECTION_CLOSED', 'ERR_NAME_NOT_RESOLVED',
  'ERR_EMPTY_RESPONSE', 'ERR_ADDRESS_UNREACHABLE', 'ERR_HTTP2_PROTOCOL_ERROR',
  'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH',
  'ETIMEDOUT', 'EAI_AGAIN',
]);

const NON_NETWORK_CODES = new Set([
  'ERR_CANCELED',           // user/signal abort — never queue a canceled op
  'ERR_BAD_OPTION',         // client config errors — never queue
  'ERR_BAD_OPTION_VALUE',
  'ERR_BAD_REQUEST',
]);

export function isNetworkFailure(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { code?: unknown; response?: unknown; request?: unknown };
  if (err.response) return false;                 // server answered → surface it
  const code = typeof err.code === 'string' ? err.code : '';
  if (NON_NETWORK_CODES.has(code)) return false;  // cancel/config → surface
  if (NETWORK_FAILURE_CODES.has(code)) return true;
  // No recognizable code: treat as a network failure only when a request was
  // actually dispatched (err.request set) but produced no response.
  return !!err.request;
}

export function isDocumentPayload(data: unknown): boolean {
  return !!(data && typeof data === 'object' && Array.isArray((data as { lines?: unknown }).lines));
}
