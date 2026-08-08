import { describe, it, expect } from 'vitest';
import { cacheTtlForUrl } from '../offlineAwareApi';

describe('offline cache TTL (task 5.4)', () => {
  it('gives stock-at a long TTL (30 min) so stock survives short outages', () => {
    expect(cacheTtlForUrl('/1/inventory/stock-at')).toBe(30 * 60_000);
    expect(cacheTtlForUrl('/2/inventory/stock-at?per_page=10')).toBe(30 * 60_000);
  });

  it('keeps other endpoints at the 5-min default', () => {
    expect(cacheTtlForUrl('/1/documents')).toBe(5 * 60_000);
    expect(cacheTtlForUrl('/1/pos/pro/lookups')).toBe(5 * 60_000);
    expect(cacheTtlForUrl('/1/parties')).toBe(5 * 60_000);
    expect(cacheTtlForUrl('')).toBe(5 * 60_000);
  });
});
