import { describe, it, expect } from 'vitest';
import { parseFiscalQrNumber } from '../fiscalQr';

// B.3 — decoder for the printed fiscal QR (JSON v1, FiscalInvoiceQrService).
describe('parseFiscalQrNumber', () => {
  it('extracts the document number from a full fiscal QR payload', () => {
    const payload = {
      v: 1,
      seller: { name: 'EL-HOUDA EMBALLAGE', nif: '123456789012345', nis: '456789', ai: '789123', rc: '123456', address: 'Alger' },
      buyer: { name: 'Client Cash', nif: '' },
      invoice: { number: 'FV-2026-000001', date: '2026-08-15', type: 'FV' },
      amounts: { ht: 1000.0, tva: 190.0, discount: 0.0, stamp: 11.9, ttc: 1190.0, net: 1201.9 },
      hash: 'ab'.repeat(32),
    };
    expect(parseFiscalQrNumber(JSON.stringify(payload))).toBe('FV-2026-000001');
  });

  it('handles a POS document number and surrounding whitespace', () => {
    const payload = { v: 1, seller: {}, buyer: {}, invoice: { number: '  POS-2026-000297  ', date: '2026-08-15', type: 'POS' }, amounts: {}, hash: '' };
    expect(parseFiscalQrNumber(JSON.stringify(payload))).toBe('POS-2026-000297');
  });

  it('returns null for non-JSON scanner noise (raw barcode, garbage)', () => {
    expect(parseFiscalQrNumber('6130410837123')).toBeNull();
    expect(parseFiscalQrNumber('not json at all')).toBeNull();
    expect(parseFiscalQrNumber('')).toBeNull();
    expect(parseFiscalQrNumber('   ')).toBeNull();
  });

  it('returns null for JSON without an invoice.number (e.g. a product label QR)', () => {
    expect(parseFiscalQrNumber('{"foo":"bar"}')).toBeNull();
    expect(parseFiscalQrNumber('{"invoice":{"date":"2026-08-15"}}')).toBeNull();
    expect(parseFiscalQrNumber('{"invoice":{"number":42}}')).toBeNull();
    expect(parseFiscalQrNumber('[1,2,3]')).toBeNull();
    expect(parseFiscalQrNumber('null')).toBeNull();
  });

  it('tolerates a future spec bump that keeps invoice.number in the same place', () => {
    const payload = { v: 2, unknownNewField: true, invoice: { number: 'FV-2026-000100', date: '2026-08-15', type: 'FV' } };
    expect(parseFiscalQrNumber(JSON.stringify(payload))).toBe('FV-2026-000100');
  });
});
