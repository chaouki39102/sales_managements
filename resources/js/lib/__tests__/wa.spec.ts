import { describe, it, expect } from 'vitest';
import { normalizeWaPhone, buildWhatsAppLink, waDocMessage } from '../wa';

describe('normalizeWaPhone', () => {
  it('converts local 0-prefixed number to 213…', () => {
    expect(normalizeWaPhone('0555123456')).toBe('213555123456');
  });
  it('strips double-zero prefix', () => {
    expect(normalizeWaPhone('00213555123456')).toBe('213555123456');
  });
  it('keeps already-international number', () => {
    expect(normalizeWaPhone('213555123456')).toBe('213555123456');
  });
  it('strips non-digit characters', () => {
    expect(normalizeWaPhone('+213 555 123 456')).toBe('213555123456');
  });
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeWaPhone(null)).toBe('');
    expect(normalizeWaPhone(undefined)).toBe('');
    expect(normalizeWaPhone('')).toBe('');
  });
  it('handles number with dashes and parentheses', () => {
    expect(normalizeWaPhone('(0555) 123-456')).toBe('213555123456');
  });
});

describe('buildWhatsAppLink', () => {
  it('builds a valid wa.me URL with encoded text', () => {
    const link = buildWhatsAppLink('0555123456', 'مرحبا');
    expect(link).toBe('https://wa.me/213555123456?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7');
  });
  it('returns null for empty phone', () => {
    expect(buildWhatsAppLink('', 'test')).toBeNull();
  });
  it('returns null for null phone', () => {
    expect(buildWhatsAppLink(null, 'test')).toBeNull();
  });
  it('encodes special characters in text', () => {
    const link = buildWhatsAppLink('0555123456', 'Hello & Goodbye');
    expect(link).toContain('Hello%20%26%20Goodbye');
  });
});

describe('waDocMessage', () => {
  it('builds a basic invoice message with doc number, date, totals', () => {
    const msg = waDocMessage({
      document_number: 'FV-2026-0001',
      document_date: '2026-08-15',
      document_type_name: 'فاتورة بيع',
      party_name: 'SARL Test',
      total_ht: 1000,
      total_tva: 190,
      total_ttc: 1190,
    });
    expect(msg).toContain('فاتورة بيع');
    expect(msg).toContain('FV-2026-0001');
    expect(msg).toContain('SARL Test');
    // fr-DZ locale: non-breaking space as thousands sep, comma as decimal
    expect(msg).toMatch(/1[\s\u00a0]000[,\.]00/);
    expect(msg).toContain('190');
    expect(msg).toMatch(/1[\s\u00a0]190[,\.]00/);
  });
  it('includes discount and stamp when present', () => {
    const msg = waDocMessage({
      total_ht: 1000,
      total_tva: 190,
      total_ttc: 1200,
      total_discount: 50,
      total_stamp: 10,
    });
    expect(msg).toContain('الخصم');
    expect(msg).toContain('الطابع');
  });
  it('omits discount and stamp when zero', () => {
    const msg = waDocMessage({
      total_ht: 1000,
      total_tva: 190,
      total_ttc: 1190,
      total_discount: 0,
      total_stamp: 0,
    });
    expect(msg).not.toContain('الخصم');
    expect(msg).not.toContain('الطابع');
  });
  it('includes paid and remaining amounts when present', () => {
    const msg = waDocMessage({
      total_ttc: 5000,
      paid_amount: 3000,
      remaining_amount: 2000,
    });
    expect(msg).toContain('المدفوع');
    expect(msg).toMatch(/3[\s\u00a0]000[,\.]00/);
    expect(msg).toContain('المتبقي');
    expect(msg).toMatch(/2[\s\u00a0]000[,\.]00/);
  });
  it('includes notes when present', () => {
    const msg = waDocMessage({
      total_ttc: 100,
      notes: 'livraison urgente',
    });
    expect(msg).toContain('ملاحظات: livraison urgente');
  });
  it('omits notes when null', () => {
    const msg = waDocMessage({
      total_ttc: 100,
      notes: null,
    });
    expect(msg).not.toContain('ملاحظات');
  });
  it('handles completely empty doc', () => {
    const msg = waDocMessage({});
    expect(msg).toContain('السلام عليكم');
    expect(msg).toContain('رقم —');
  });
  it('appends share URL when provided', () => {
    const msg = waDocMessage({ total_ttc: 100 }, 'https://example.com/share/abc123');
    expect(msg).toContain('🔗 رابط الوثيقة: https://example.com/share/abc123');
  });
  it('omits share URL when not provided', () => {
    const msg = waDocMessage({ total_ttc: 100 });
    expect(msg).not.toContain('رابط الوثيقة');
  });
  it('omits share URL when null', () => {
    const msg = waDocMessage({ total_ttc: 100 }, null);
    expect(msg).not.toContain('رابط الوثيقة');
  });
});
