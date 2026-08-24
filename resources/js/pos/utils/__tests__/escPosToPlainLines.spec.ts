import { describe, it, expect } from 'vitest';
import { escPosToPlainLines } from '../thermalPrint';

const enc = (s: string) => Array.from(new TextEncoder().encode(s));

describe('escPosToPlainLines', () => {
  it('passes plain text through and splits on LF', () => {
    const bytes = new Uint8Array([...enc('HELLO'), 10, ...enc('WORLD')]);
    expect(escPosToPlainLines(bytes)).toEqual(['HELLO', 'WORLD']);
  });

  it('skips simple 3-byte commands (ESC @, ESC a n, GS h n)', () => {
    const bytes = new Uint8Array([
      0x1b, 0x40, // ESC @
      0x1b, 0x61, 0x01, // ESC a 1
      0x1d, 0x68, 0x32, // GS h 50
      ...enc('AB'),
    ]);
    expect(escPosToPlainLines(bytes)).toEqual(['AB']);
  });

  it('skips bracketed commands using their declared length (QR: GS ( k)', () => {
    // GS ( k pL pH cn fn data... — payload contains text-like bytes that must not leak
    const payload = [0x31, 0x80, 0x02]; // cn=49 fn=-128?? keep small: cn fn data
    const count = payload.length;
    const bytes = new Uint8Array([
      0x1d, 0x28, 0x6b, count & 0xff, (count >> 8) & 0xff,
      ...payload,
      ...enc('OK'),
    ]);
    expect(escPosToPlainLines(bytes)).toEqual(['OK']);
  });

  it('skips barcode data until NUL (GS k m ... NUL)', () => {
    const bytes = new Uint8Array([
      0x1d, 0x68, 0x50, // GS h 80
      0x1d, 0x6b, 0x04, ...enc('123456'), 0x00,
      ...enc('TAIL'),
    ]);
    expect(escPosToPlainLines(bytes)).toEqual(['TAIL']);
  });

  it('drops CR and converts HT to spaces', () => {
    const bytes = new Uint8Array([...enc('A\r\nB\tC')]);
    expect(escPosToPlainLines(bytes)).toEqual(['A', 'B  C']);
  });

  // يعكس EscPosBuilder.encodeArabic — البايتات العالية في تدفق ESC/POS هي
  // Windows-1256 وليست UTF-8 (فكّها كـ UTF-8 هو سبب «الرموز غير المقروءة»).
  const w1256 = (s: string): number[] => {
    const map: Record<string, number> = {
      ا: 0xc7, ب: 0xc8, ت: 0xca, ج: 0xcc, ح: 0xcd, د: 0xcf,
      ر: 0xd1, س: 0xd3, ك: 0xdf, ل: 0xe1, م: 0xe3, ن: 0xe4,
      ه: 0xe5, و: 0xe6, ي: 0xed, ع: 0xda, ق: 0xde, ة: 0xc9,
    };
    return Array.from(s).map((ch) => {
      const cp = ch.codePointAt(0)!;
      if (cp < 0x80) return cp;
      if (map[ch] !== undefined) return map[ch]!;
      return 0x3f;
    });
  };

  it('decodes Windows-1256 Arabic text intact', () => {
    const bytes = new Uint8Array([...w1256('منتج'), 10, ...enc('120')]);
    expect(escPosToPlainLines(bytes)).toEqual(['منتج', '120']);
  });

  it('round-trips a receipt line: Arabic name + ASCII price', () => {
    const bytes = new Uint8Array([
      0x1b, 0x40, // ESC @
      ...w1256('سكر'),
      0x20, ...enc('86.60'),
    ]);
    expect(escPosToPlainLines(bytes)).toEqual(['سكر 86.60']);
  });

  it('replaces unknown high bytes with ? instead of mojibake', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 10, ...enc('OK')]);
    expect(escPosToPlainLines(bytes)).toEqual(['??', 'OK']);
  });
});
