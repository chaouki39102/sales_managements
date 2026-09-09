// ════════════════════════════════════════════════════════════════════════════
// renderers/raster/RasterThermalRenderer.ts
//
// Full-raster alternative to ESCPOSRenderer: paints the thermal layout via the
// browser text shaper (correct Arabic shaping/bidi) and emits ESC/POS raster
// graphics bytes (GS v 0), followed by an optional native QR + feed/cut.
//
// NOT registered in RendererRegistry. ESCPOSRenderer calls
// `thermalRasterRenderer.render(ctx)` first when `thermal_render_mode` differs
// from 'text' and falls back to the byte-identical text pipeline on null.
// ════════════════════════════════════════════════════════════════════════════

import type { RenderContext, RenderResult } from '../IRenderer';
import { EscPosBuilder } from '../EscPosBuilder';

import type { ThermalRasterPlan } from './ThermalRasterLayout';
import { buildThermalRasterPlan, planHasArabic } from './ThermalRasterLayout';
import type { TextBitmapPainter } from './textToBitmapCanvas';
import { CanvasTextBitmapPainter } from './textToBitmapCanvas';
import { encodeBitmap, rasterWidthDots } from './RasterBitmapEncoder';

// ─── Local utility — RasterBitmapEncoder does not live in this package ───────

function concatU8(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function mapAlignToEscPos(align: unknown): 0 | 1 | 2 {
  if (align === 'left') return 0;
  if (align === 'right') return 2;
  return 1;
}

// ─── Painter injection (tests use a fake painter) ─────────────────────────────

let _painter: TextBitmapPainter | null = new CanvasTextBitmapPainter();

export function setRasterPainter(painter: TextBitmapPainter | null): void {
  _painter = painter;
}

export function getRasterPainter(): TextBitmapPainter | null {
  return _painter;
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export interface RasterThermalRendererLike {
  readonly outputType: 'escpos';
  supports(paperSize: string): boolean;
  render(ctx: RenderContext): Promise<RenderResult<Uint8Array> | null>;
}

class RasterThermalRenderer implements RasterThermalRendererLike {
  readonly outputType = 'escpos' as const;

  supports(paperSize: string): boolean {
    return paperSize === '80mm' || paperSize === '58mm';
  }

  async render(ctx: RenderContext): Promise<RenderResult<Uint8Array> | null> {
    const { template } = ctx;
    const mode = template.thermal_render_mode;
    if (!mode || mode === 'text') return null;
    if (!_painter) return null;

    const widthDots = rasterWidthDots(template?.paper_width_mm ?? 80);
    const plan: ThermalRasterPlan = buildThermalRasterPlan(
      ctx.data,
      template,
      widthDots,
    );

    // 'auto': only take the raster path when the plan actually contains Arabic
    // (no shaping work needed). Latin-only text keeps the tiny ESC/POS text path.
    if (mode === 'auto' && !planHasArabic(plan)) return null;

    const bitmap = await _painter.paint(plan, widthDots, 65535);
    if (!bitmap) return null;

    const raster = encodeBitmap(bitmap.width, bitmap.height, bitmap.getPixel, 'gsv0');

    // ── Tail: optional native QR (printed after the raster bitmap) + cut ──
    const builder = new EscPosBuilder().init();
    const doc = ctx.data?.doc;
    const docNumber: string = typeof doc?.number === 'string' && doc.number ? doc.number : '';
    const qrContent: string = (typeof doc?.qrcodeContent === 'string' && doc.qrcodeContent) || docNumber;

    if (Boolean(template?.show_qr_code || template?.show_qr) && qrContent) {
      const sizeRaw = Number(template?.qr_code_size) || 48;
      const size = Math.max(1, Math.min(8, Math.round(sizeRaw / 12))) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
      builder.lineFeed();
      builder.qrCode(qrContent, size, mapAlignToEscPos(template?.qr_code_align));
    }
    builder.feedAndCut();

    return {
      type: 'escpos',
      payload: concatU8(raster, builder.escposBytes()),
      mimeType: 'application/octet-stream',
      filename: `receipt-${docNumber || 'print'}.bin`,
    };
  }
}

export const thermalRasterRenderer = new RasterThermalRenderer();