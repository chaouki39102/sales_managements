import type { PaperSize } from '../../types';

/** Physical sticker papers → design-space size in px (at 8 px/mm). SSOT for sticker dimensions. */
export const STICKER_PAPERS: Record<string, { w: number; h: number }> = {
  '40x20mm':  { w: 320, h: 160 },
  '30x20mm':  { w: 240, h: 160 },
  '60x40mm':  { w: 480, h: 320 },
  '80x50mm':  { w: 640, h: 400 },
  '100x50mm': { w: 800, h: 400 },
};

export const STICKER_SIZE_OPTIONS: readonly { v: PaperSize; l: string }[] = [
  { v: '40x20mm', l: '40 × 20 مم' },
  { v: '30x20mm', l: '30 × 20 مم' },
  { v: '60x40mm', l: '60 × 40 مم' },
  { v: '80x50mm', l: '80 × 50 مم' },
  { v: '100x50mm', l: '100 × 50 مم' },
];

export function isStickerPaper(size: string): boolean {
  return size in STICKER_PAPERS;
}

export function stickerDims(size: string): { w: number; h: number } {
  return STICKER_PAPERS[size] ?? STICKER_PAPERS['40x20mm'];
}
