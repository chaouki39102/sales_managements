/* Pure ESC/POS raster image encoder — no DOM required (vitest-safe).
 *
 * Emits monochrome 1-bit bitmaps at 203 dpi (~8 dots/mm) using the three
 * image commands in order of preference:
 *   - gsV0 : GS v 0 m xL xH yL yH . . .  (most common, Epson/Ikas spreads)
 *   - gs8L : GS 8 L xL xH yL yH . . .    (16-bit width variant)
 *   - gs8l : GS 8 l xL xH yL yH . . .    (compact variant)
 *
 * Every line is packed MSB-first — the leftmost pixel is the most significant
 * bit of its byte — and each row is padded to a multiple of 8 dots (x8 stride).
 */

export type RasterEncodeMode = 'gsv0' | 'gs8L' | 'gs8l';

export type RasterPixel = (x: number, y: number) => boolean;

/** Device width in dots for a given paper width (mm) at 203 dpi. */
export function rasterWidthDots(paperWidthMm: number): number {
  if (paperWidthMm >= 70) return 576; // 80mm → ~72mm printable
  if (paperWidthMm >= 50) return 384; // 58mm → ~48mm printable
  return Math.max(1, Math.round((paperWidthMm - 8) * 8));
}

/** Bytes per raster line (x8 stride). */
export function bytesPerLine(width: number): number {
  return (width + 7) >> 3;
}

const HEADERS: Record<RasterEncodeMode, readonly number[]> = {
  gsv0: [0x1d, 0x76, 0x30, 0x00],
  gs8L: [0x1d, 0x38, 0x4c],
  gs8l: [0x1d, 0x38, 0x6c],
};

/**
 * Encode a raster bitmap.
 *
 * @param width  logical width in dots (must be <= 32767 for a 16-bit /256)
 * @param height logical height in dots
 * @param pixel  `true` = set (black) dot at (x, y)
 * @param mode   which raster command family to emit
 */
export function encodeBitmap(
  width: number,
  height: number,
  pixel: RasterPixel,
  mode: RasterEncodeMode = 'gsv0',
): Uint8Array {
  const bpl = bytesPerLine(width);
  const header = [
    ...HEADERS[mode],
    width & 0xff,
    (width >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
  ];
  const out = new Uint8Array(header.length + bpl * height);
  out.set(header);

  let offset = header.length;
  for (let y = 0; y < height; y++) {
    for (let bx = 0; bx < bpl; bx++) {
      let byte = 0;
      for (let k = 0; k < 8; k++) {
        const x = bx * 8 + k;
        if (x < width && pixel(x, y)) byte |= 1 << (7 - k);
      }
      out[offset++] = byte;
    }
  }
  return out;
}