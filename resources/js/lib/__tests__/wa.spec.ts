import { describe, it, expect } from 'vitest';
import { normalizeWaPhone, buildWhatsAppLink } from '../wa';

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
