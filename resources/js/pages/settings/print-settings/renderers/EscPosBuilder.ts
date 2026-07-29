import type { AlignOption } from '../types';

const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const ARABIC_WIN1256: Record<number, number> = {
  0x0621: 0xC1, 0x0622: 0xC2, 0x0623: 0xC3, 0x0624: 0xC4,
  0x0625: 0xC5, 0x0626: 0xC6, 0x0627: 0xC7, 0x0628: 0xC8,
  0x0629: 0xC9, 0x062A: 0xCA, 0x062B: 0xCB, 0x062C: 0xCC,
  0x062D: 0xCD, 0x062E: 0xCE, 0x062F: 0xCF, 0x0630: 0xD0,
  0x0631: 0xD1, 0x0632: 0xD2, 0x0633: 0xD3, 0x0634: 0xD4,
  0x0635: 0xD5, 0x0636: 0xD6, 0x0637: 0xD8, 0x0638: 0xD9,
  0x0639: 0xDA, 0x063A: 0xDB, 0x0641: 0xDD, 0x0642: 0xDE,
  0x0643: 0xDF, 0x0644: 0xE1, 0x0645: 0xE3, 0x0646: 0xE4,
  0x0647: 0xE5, 0x0648: 0xE6, 0x0649: 0xEC, 0x064A: 0xED,
  0x064B: 0xF2, 0x064C: 0xF3, 0x064D: 0xF4, 0x064E: 0xF5,
  0x064F: 0xF6, 0x0650: 0xF7, 0x0651: 0xF8, 0x0652: 0xF9,
  0x0660: 0xB0, 0x0661: 0xB1, 0x0662: 0xB2, 0x0663: 0xB3,
  0x0664: 0xB4, 0x0665: 0xB5, 0x0666: 0xB6, 0x0667: 0xB7,
  0x0668: 0xB8, 0x0669: 0xB9, 0x060C: 0xAC, 0x061B: 0xBB,
  0x061F: 0xBF, 0xFEFB: 0xE2, 0xFEFC: 0xE2,
};

function encodeArabic(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0x3F;
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (ARABIC_WIN1256[cp] !== undefined) {
      bytes.push(ARABIC_WIN1256[cp]);
    } else {
      bytes.push(0x3F);
    }
  }
  return bytes;
}

export class EscPosBuilder {
  private buf: number[] = [];

  init(): this {
    this.buf.push(ESC, 0x40);
    this.buf.push(ESC, 0x74, 0x10);
    return this;
  }

  lineFeed(n = 1): this {
    for (let i = 0; i < n; i++) this.buf.push(LF);
    return this;
  }

  setBold(on: boolean): this {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  setAlign(n: 0 | 1 | 2): this {
    this.buf.push(ESC, 0x61, n);
    return this;
  }

  setFontSize(w: number, h: number): this {
    const ww = Math.max(1, Math.min(8, w));
    const hh = Math.max(1, Math.min(8, h));
    this.buf.push(GS, 0x21, (hh - 1) * 16 + (ww - 1));
    return this;
  }

  resetFontSize(): this {
    this.buf.push(GS, 0x21, 0);
    return this;
  }

  text(s: string): this {
    this.buf.push(...encodeArabic(s));
    return this;
  }

  ascii(s: string): this {
    for (const c of s) this.buf.push(c.charCodeAt(0) & 0xFF);
    return this;
  }

  center(s: string): this  { return this.setAlign(1).text(s).lineFeed(); }
  right(s: string): this   { return this.setAlign(2).text(s).lineFeed(); }
  left(s: string): this    { return this.setAlign(0).text(s).lineFeed(); }

  divider(c = '-', len = 42): this {
    return this.setAlign(1).ascii(c.repeat(len)).lineFeed();
  }

  cut(): this { this.buf.push(GS, 0x56, 0x00); return this; }
  feedAndCut(): this { return this.lineFeed(4).cut(); }

  qrCode(data: string, size: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 4): this {
    const bytes = [...new TextEncoder().encode(data)];
    const len   = bytes.length + 3;
    const pL    = len & 0xFF;
    const pH    = (len >> 8) & 0xFF;

    this.setAlign(1);
    this.buf.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x32);
    this.buf.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...bytes);
    this.buf.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.lineFeed(2);
    return this;
  }

  writeRaw(bytes: number[]): this {
    this.buf.push(...bytes);
    return this;
  }

  escposBytes(): Uint8Array { return new Uint8Array(this.buf); }
}

export function fmt(n: number): string {
  return n.toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function lineRow(label: string, value: string, width = 42): string {
  const gap = Math.max(1, width - label.length - value.length);
  return label + ' '.repeat(gap) + value;
}

export function mapFontSizeToEscPos(points: number): [number, number] {
  if (points <= 10) return [1, 1];
  if (points <= 15) return [2, 2];
  if (points <= 22) return [3, 3];
  return [4, 4];
}

export function mapInfoFontSizeToEscPos(points: number): [number, number] {
  if (points <= 10) return [1, 1];
  if (points <= 13) return [2, 1];
  return [2, 2];
}

export function mapAlignToEscPos(align: string | undefined | null): 0 | 1 | 2 {
  if (align === 'left')   return 0;
  if (align === 'center') return 1;
  if (align === 'right')  return 2;
  return 1;
}
