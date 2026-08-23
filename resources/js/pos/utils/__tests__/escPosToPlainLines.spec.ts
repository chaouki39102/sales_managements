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

  it('decodes UTF-8 Arabic text intact', () => {
    const bytes = new Uint8Array([...enc('منتج'), 10, ...enc('120')]);
    expect(escPosToPlainLines(bytes)).toEqual(['منتج', '120']);
  });
});
