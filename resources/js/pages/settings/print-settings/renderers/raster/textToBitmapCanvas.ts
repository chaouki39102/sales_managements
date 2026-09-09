// ════════════════════════════════════════════════════════════════════════════
// renderers/raster/textToBitmapCanvas.ts
//
// Rasterizes a `ThermalRasterPlan` into a 1-bit monochrome `TextBitmap` by
// painting the plan to a <canvas> with the browser text shaper (fillText →
// correct Arabic shaping + bidi) and sampling each pixel's luminance.
//
// This is the ONLY DOM-dependent file in the raster pipeline. In vitest/jsdom
// or SSR there is no real canvas 2D context, so `paint()` returns `null` and
// the renderer falls back to the text path. Tests must inject a fake painter
// via `setRasterPainter()` (see RasterThermalRenderer.ts).
// ════════════════════════════════════════════════════════════════════════════

import type { RasterAlign, RasterPlanLine, ThermalRasterPlan } from './ThermalRasterLayout';
import { planHasArabic } from './ThermalRasterLayout';

// ─── Output bitmap ───────────────────────────────────────────────────────────

export interface TextBitmap {
  width: number;
  height: number;
  /** `true` = set (black) dot. Reads the internally packed 1-bit buffer. */
  getPixel(x: number, y: number): boolean;
}

export interface TextBitmapPainter {
  paint(plan: ThermalRasterPlan, widthDots: number, maxHeightDots?: number): Promise<TextBitmap | null>;
}

// ─── Painter ─────────────────────────────────────────────────────────────────

const TEXT_FONT = "'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif";
const PAD_X = 4;

interface LayoutCell {
  x: number;
  width: number;
  align: RasterAlign;
  bold: boolean;
  fontPx: number;
}

interface LayoutSpec {
  kind: 'line' | 'gap';
  cells: LayoutCell[];
  height: number;
}

const fontPxFor = (size?: number): number => Math.max(7, Math.round((size ?? 10) * 1.2));
const rowHeightFor = (fontPx: number): number => Math.max(fontPx + 8, 16);

export class CanvasTextBitmapPainter implements TextBitmapPainter {
  async paint(
    plan: ThermalRasterPlan,
    widthDots: number,
    maxHeightDots?: number,
  ): Promise<TextBitmap | null> {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // ── Layout pass ────────────────────────────────────────────────────────
    const avail = widthDots - PAD_X * 2;
    const specs: LayoutSpec[] = [];

    for (const line of plan.lines) {
      if (line.kind === 'space') {
        const fontPx = 12;
        specs.push({ kind: 'gap', cells: [], height: rowHeightFor(fontPx) * Math.max(1, line.height ?? 1) });
        continue;
      }

      if (line.kind === 'text' || line.kind === 'divider') {
        const fontPx = line.kind === 'text' ? fontPxFor(line.size) : fontPxFor(undefined);
        const cell: LayoutCell = {
          x: PAD_X,
          width: Math.max(10, avail),
          align: line.kind === 'divider' ? 'center' : (line.align ?? 'left'),
          bold: line.kind === 'text' ? Boolean(line.bold) : false,
          fontPx,
        };
        specs.push({
          kind: 'line',
          cells: [cell],
          height: rowHeightFor(fontPx),
        });
        continue;
      }

      // table row
      const fontPx = fontPxFor(line.size);
      const totalFlex = line.cols.reduce((n, c) => n + Math.max(1, c.flex ?? 1), 0);
      let x = PAD_X;
      const cells: LayoutCell[] = line.cols.map((c) => {
        const width = Math.round((avail * Math.max(1, c.flex ?? 1)) / totalFlex);
        const cell: LayoutCell = {
          x,
          width,
          align: c.align ?? 'left',
          bold: Boolean(c.bold),
          fontPx,
        };
        x += width;
        return cell;
      });
      specs.push({ kind: 'line', cells, height: rowHeightFor(fontPx) });
    }

    // ── Fit-to-memory shrink (cap = maxHeightDots ?? widthDots*8) ─────────
    const cap = maxHeightDots ?? widthDots * 8;
    let total = specs.reduce((n, s) => n + s.height, 0);
    if (total > cap) {
      const ratio = cap / total;
      for (const s of specs) {
        for (const c of s.cells) c.fontPx = Math.max(7, Math.round(c.fontPx * ratio));
        s.height = s.kind === 'gap'
          ? Math.max(8, Math.round(s.height * ratio))
          : rowHeightFor(Math.max(7, Math.round((s.cells[0]?.fontPx ?? 12) * ratio)));
      }
      total = specs.reduce((n, s) => n + s.height, 0);
    }

    const width = widthDots;
    const height = Math.min(cap, Math.max(120, Math.round(total)));
    canvas.width = width;
    canvas.height = height;

    // ── Paint ──────────────────────────────────────────────────────────────
    // RTL paragraph direction shapes Arabic correctly in fillText; we still
    // use explicit `left|center|right` alignment (never start/end) so cell
    // coordinates stay absolute.
    if (planHasArabic(plan)) {
      (ctx as unknown as { direction?: string }).direction = 'rtl';
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle';

    let y = 0;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const line = plan.lines[i] as RasterPlanLine;
      if (s.kind === 'line') {
        for (let c = 0; c < s.cells.length; c++) {
          const cell = s.cells[c];
          let text = '';
          if (line.kind === 'text') {
            text = line.text;
          } else if (line.kind === 'divider') {
            text = repeat(line.char, Math.max(8, Math.floor(cell.width / cell.fontPx)));
          } else if (line.kind === 'table') {
            text = line.cols[c]?.text ?? '';
          }
          if (!text) continue;

          ctx.font = `${cell.bold ? 'bold ' : ''}${cell.fontPx}px ${TEXT_FONT}`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = cell.align;
          const textX =
            cell.align === 'center'
              ? cell.x + cell.width / 2
              : cell.align === 'right'
                ? cell.x + cell.width - PAD_X
                : cell.x + PAD_X;
          ctx.fillText(text, textX, y + s.height / 2);
        }
      }
      y += s.height;
    }

    // ── Sample → packed 1-bit buffer ───────────────────────────────────────
    const img = ctx.getImageData(0, 0, width, height).data;
    const bpl = (width + 7) >> 3;
    const bits = new Uint8Array(bpl * height);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const idx = (row * width + col) * 4;
        const luma = 0.299 * img[idx] + 0.587 * img[idx + 1] + 0.114 * img[idx + 2];
        if (luma < 128) bits[row * bpl + (col >> 3)] |= 1 << (7 - (col & 7));
      }
    }

    return {
      width,
      height,
      getPixel(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return false;
        return (bits[y * bpl + (x >> 3)] & (1 << (7 - (x & 7)))) !== 0;
      },
    };
  }
}

function repeat(char: string, n: number): string {
  if (n <= 0) return '';
  const chunk = char.length === 0 ? '-' : char;
  const needed = Math.ceil(n / chunk.length);
  const out = new Array(needed).fill(chunk).join('');
  return out.slice(0, n);
}