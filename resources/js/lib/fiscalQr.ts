// ════════════════════════════════════════════════════════════════════════════
// lib/fiscalQr.ts — decoding the printed fiscal QR (B.3)
//
// The QR embedded on Algerian sale documents is the JSON v1 payload emitted by
// `FiscalInvoiceQrService::dataString()` (see docs/reports/FISCAL_QR_SPEC.md):
//   { v:1, seller:{...}, buyer:{...}, invoice:{number,date,type}, amounts:{...}, hash }
// This module is the single frontend decoder for that payload — the admin
// documents page uses it to reopen the exact document and the portal uses it
// for "scan to track my order". Pure + dependency-free, unit-tested.
// ════════════════════════════════════════════════════════════════════════════

export interface FiscalQrPayload {
  v?: number;
  invoice?: { number?: string; date?: string; type?: string };
  seller?: { name?: string; nif?: string };
  [key: string]: unknown;
}

/**
 * Extract the document number from a scanned fiscal QR string (JSON v1).
 * Returns `null` when the text is not a fiscal QR payload (invalid JSON or
 * missing `invoice.number`). Tolerant by design: any JSON object carrying a
 * string `invoice.number` is accepted so the decoder survives a future
 * official-spec bump that keeps the document number in the same place.
 */
export function parseFiscalQrNumber(text: string): string | null {
  if (!text) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const invoice = (payload as FiscalQrPayload).invoice;
  if (!invoice || typeof invoice !== 'object') return null;

  const number = typeof invoice.number === 'string' ? invoice.number.trim() : '';
  return number || null;
}
