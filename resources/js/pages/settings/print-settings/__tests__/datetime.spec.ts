import { describe, it, expect } from 'vitest';
import { printFieldResolver } from '../services/PrintFieldResolver';
import { formatDate } from '../components/preview/shared';
import type { UniversalDocumentData } from '../types/data';
import { createMockTemplate } from './fixtures/templates';

const baseData = (date: string) => ({
  doc: { number: 'POS-2026-000001', date, time: '14:35' },
}) as unknown as UniversalDocumentData;

const mkTpl = (show_time: boolean) => createMockTemplate({ show_time }, 'POS', '80mm');

describe('datetime composition — document.date carries the time when show_time is on', () => {
  it('composes "date time" for a date-only doc.date', () => {
    expect(printFieldResolver.resolve('document.date', baseData('2026-08-23'), mkTpl(true))).toBe('2026-08-23 14:35');
  });

  it('normalizes a full ISO timestamp (reprint shape) before composing', () => {
    const out = printFieldResolver.resolve('document.date', baseData('2026-08-23T16:45:00.000000Z'), mkTpl(true));
    expect(out).toBe('2026-08-23 14:35');
  });

  it('returns the raw date when show_time is off', () => {
    expect(printFieldResolver.resolve('document.date', baseData('2026-08-23'), mkTpl(false))).toBe('2026-08-23');
    expect(printFieldResolver.resolve('document.date', baseData('2026-08-23T16:45:00.000000Z'), mkTpl(false))).toBe('2026-08-23T16:45:00.000000Z');
  });

  it('returns the raw date when doc.time is missing', () => {
    const data = { doc: { date: '2026-08-23' } } as unknown as UniversalDocumentData;
    expect(printFieldResolver.resolve('document.date', data, mkTpl(true))).toBe('2026-08-23');
  });
});

describe('formatDate keeps composed datetime intact end-to-end', () => {
  it('preserves the time part of a composed value', () => {
    expect(formatDate('2026-08-23 14:35')).toBe('2026-08-23 14:35');
  });

  it('slices plain ISO datetimes to their date part', () => {
    expect(formatDate('2026-08-23T16:45:00.000000Z')).toBe('2026-08-23');
    expect(formatDate('2026-08-23')).toBe('2026-08-23');
    expect(formatDate('')).toBe('');
  });
});
