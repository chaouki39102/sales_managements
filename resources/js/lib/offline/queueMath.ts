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

export function isDocumentPayload(data: unknown): boolean {
  return !!(data && typeof data === 'object' && Array.isArray((data as { lines?: unknown }).lines));
}
