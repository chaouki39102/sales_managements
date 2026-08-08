import { describe, it, expect } from 'vitest';
import {
  computeQueuedDocumentTotals,
  nextTempId,
  offlineDocNumber,
  isOfflineQueuedResponse,
  isDocumentUrl,
  isDocumentPayload,
} from '../queueMath';

describe('offline queue math (queueMath.ts)', () => {
  it('computes totals from a plain line payload (no packaging)', () => {
    const totals = computeQueuedDocumentTotals({
      lines: [{ quantity: 2, unit_price_ht: 100, tva_rate: 19 }],
    });
    expect(totals).toEqual({
      total_ht: 200,
      total_tva: 38,
      total_ttc: 238,
      net_to_pay: 238,
      paid_amount: 0,
    });
  });

  it('applies the pack factor to price AND quantity (packaged line)', () => {
    const totals = computeQueuedDocumentTotals({
      lines: [{ quantity: 5, unit_price_ht: 120, pack_qty: 12, tva_rate: 19 }],
    });
    // gross = 5 × 120 × 12 = 7200 ; tva 19% = 1368
    expect(totals!.total_ht).toBe(7200);
    expect(totals!.total_tva).toBe(1368);
    expect(totals!.total_ttc).toBe(8568);
  });

  it('uses fixed-amount discount per BASE unit, percentage discount on gross', () => {
    const fixed = computeQueuedDocumentTotals({
      lines: [{ quantity: 3, unit_price_ht: 100, pack_qty: 2, discount_amount_per_unit: 10 }],
    });
    // gross = 600, disc = 10 × 6 = 60, ht = 540
    expect(fixed!.total_ht).toBe(540);

    const pct = computeQueuedDocumentTotals({
      lines: [{ quantity: 2, unit_price_ht: 100, discount_percentage: 10, tva_rate: 19 }],
    });
    // gross = 200, disc = 20, ht = 180, tva 34.2, ttc 214.2
    expect(pct!.total_ht).toBe(180);
    expect(pct!.total_tva).toBe(34.2);
    expect(pct!.total_ttc).toBe(214.2);
  });

  it('sums payments into paid_amount and returns null for non-line payloads', () => {
    const totals = computeQueuedDocumentTotals({
      lines: [{ quantity: 1, unit_price_ht: 100, tva_rate: 19 }],
      payments: [{ amount: 50 }, { amount: 25.5 }],
    });
    expect(totals!.paid_amount).toBe(75.5);
    expect(computeQueuedDocumentTotals({ foo: 'bar' })).toBeNull();
  });

  it('generates unique negative temp ids + stable OFFLINE document numbers', () => {
    const a = nextTempId();
    const b = nextTempId();
    expect(a).toBeLessThan(0);
    expect(b).toBeLessThan(0);
    expect(a).not.toBe(b);
    expect(offlineDocNumber(a)).toBe(`OFFLINE-${Math.abs(a)}`);
    expect(offlineDocNumber(a)).toMatch(/^OFFLINE-\d+$/);
  });

  it('detects queued responses and document urls/payloads', () => {
    expect(isOfflineQueuedResponse({ ok: true, queued: true, _offline: true })).toBe(true);
    expect(isOfflineQueuedResponse({ ok: true })).toBe(false);
    expect(isOfflineQueuedResponse(null)).toBe(false);

    expect(isDocumentUrl('/slug/documents')).toBe(true);
    expect(isDocumentUrl('/slug/documents/123')).toBe(true);
    expect(isDocumentUrl('/slug/documents?per_page=2')).toBe(true);
    expect(isDocumentUrl('/slug/document-types')).toBe(false);

    expect(isDocumentPayload({ lines: [] })).toBe(true);
    expect(isDocumentPayload({ name: 'x' })).toBe(false);
  });
});
