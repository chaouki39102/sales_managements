import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { encodeBitmap, bytesPerLine, rasterWidthDots } from '../RasterBitmapEncoder';
import {
  hasArabicText,
  cleanRasterText,
  planHasArabic,
  buildThermalRasterPlan,
  type ThermalRasterPlan,
} from '../ThermalRasterLayout';
import { thermalRasterRenderer, setRasterPainter } from '../RasterThermalRenderer';
import { CanvasTextBitmapPainter, type TextBitmapPainter, type TextBitmap } from '../textToBitmapCanvas';
import { emptyDocumentData } from '../../../types/data';
import type { UniversalDocumentData } from '../../../types/data';
import type { PrintTemplate } from '../../../types';
import type { RenderResult } from '../../IRenderer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Record<string, unknown> = {}): PrintTemplate {
  return { thermal_render_mode: undefined, paper_width_mm: 80, ...overrides } as unknown as PrintTemplate;
}

function makeData(overrides: Partial<UniversalDocumentData> = {}): UniversalDocumentData {
  return { ...emptyDocumentData(), ...overrides };
}

const GS_V0 = [0x1d, 0x76, 0x30, 0x00];

function containsSeq(payload: Uint8Array, seq: number[]): boolean {
  outer: for (let i = 0; i <= payload.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (payload[i + j] !== seq[j]) continue outer;
    }
    return true;
  }
  return false;
}

function header(w: number, h: number): number[] {
  return [...GS_V0, w & 0xff, (w >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff];
}

class FakePainter implements TextBitmapPainter {
  plan: ThermalRasterPlan | null = null;
  widthDots = 0;
  maxHeightDots = 0;
  calls = 0;

  async paint(plan: ThermalRasterPlan, widthDots: number, maxHeightDots?: number): Promise<TextBitmap | null> {
    this.calls += 1;
    this.plan = plan;
    this.widthDots = widthDots;
    this.maxHeightDots = maxHeightDots ?? 0;
    return { width: widthDots, height: 8, getPixel: () => false };
  }
}

// ─── RasterBitmapEncoder ─────────────────────────────────────────────────────

describe('RasterBitmapEncoder', () => {
  it('encodes a gsv0 bitmap with the correct packed RLE header + MSB-first row bytes', () => {
    const payload = encodeBitmap(8, 1, (x) => x === 0, 'gsv0');
    expect(Array.from(payload)).toEqual([...header(8, 1), 0x80]);
  });

  it('pads rows to a whole byte and MSB-packs pixels', () => {
    expect(Array.from(encodeBitmap(8, 1, () => true))).toEqual([...header(8, 1), 0xff]);
    expect(Array.from(encodeBitmap(9, 1, () => true))).toEqual([...header(9, 1), 0xff, 0x80]);
    expect(Array.from(encodeBitmap(16, 1, () => true))).toEqual([...header(16, 1), 0xff, 0xff]);
  });

  it('supports the gs8L and gs8l header prefixes', () => {
    const gs8L = encodeBitmap(8, 1, () => true, 'gs8L');
    expect(Array.from(gs8L)).toEqual([0x1d, 0x38, 0x4c, 8, 0, 1, 0, 0xff]);

    const gs8l = encodeBitmap(8, 1, () => true, 'gs8l');
    expect(Array.from(gs8l)).toEqual([0x1d, 0x38, 0x6c, 8, 0, 1, 0, 0xff]);
  });

  it('maps thermal paper widths to dot counts', () => {
    expect(rasterWidthDots(80)).toBe(576);
    expect(rasterWidthDots(58)).toBe(384);
    expect(rasterWidthDots(30)).toBe(176);
    // No undefined default by design — the renderer always passes `?? 80`.
    expect(Number.isNaN(rasterWidthDots(undefined as unknown as number))).toBe(true);
  });

  it('computes bytes-per-line by packing 8 pixels per byte', () => {
    expect(bytesPerLine(8)).toBe(1);
    expect(bytesPerLine(9)).toBe(2);
    expect(bytesPerLine(576)).toBe(72);
  });
});

// ─── Arabic helpers ──────────────────────────────────────────────────────────

describe('ThermalRasterLayout helpers', () => {
  it('detects Arabic script', () => {
    expect(hasArabicText('فاتورة')).toBe(true);
    expect(hasArabicText('نظام المبيعات')).toBe(true);
    expect(hasArabicText('Invoice 12')).toBe(false);
    expect(hasArabicText('')).toBe(false);
  });

  it('decodes mojibake and strips control characters', () => {
    expect(cleanRasterText('ظ†ط¸ط§ظ… ط§ظ„ظ…ط¨ظٹط¹ط§طھ')).toBe('نظام المبيعات');
    expect(cleanRasterText('x\u0001y')).toBe('xy');
    expect(cleanRasterText(undefined as unknown as string)).toBe('');
  });

  it('reports whether a plan contains Arabic anywhere', () => {
    const latinOnly: ThermalRasterPlan = {
      widthDots: 384,
      lines: [
        { kind: 'text', text: 'INVOICE', align: 'center' },
        { kind: 'divider', char: '-' },
        { kind: 'table', cols: [{ text: 'Qty' }, { text: 'Total' }] },
      ],
    };
    expect(planHasArabic(latinOnly)).toBe(false);

    const hasArabic: ThermalRasterPlan = {
      widthDots: 384,
      lines: [{ kind: 'text', text: 'فاتورة', align: 'center' }],
    };
    expect(planHasArabic(hasArabic)).toBe(true);
  });

  it('builds a plan with the configured width and always-Arabic footer', () => {
    const plan = buildThermalRasterPlan(makeData(), makeTemplate(), 576);
    expect(plan.widthDots).toBe(576);
    expect(Array.isArray(plan.lines)).toBe(true);
    const serialized = JSON.stringify(plan);
    expect(serialized).toContain('نظام ERP الجزائر');
    expect(planHasArabic(plan)).toBe(true);
  });

  it('tolerates a null template when building a plan', () => {
    expect(() =>
      buildThermalRasterPlan(makeData(), null as unknown as PrintTemplate, 384),
    ).not.toThrow();
  });
});

// ─── Thermal raster renderer routing ─────────────────────────────────────────

describe('thermalRasterRenderer', () => {
  let painter: FakePainter;

  beforeEach(() => {
    painter = new FakePainter();
    setRasterPainter(painter);
  });

  afterEach(() => {
    setRasterPainter(new CanvasTextBitmapPainter());
  });

  it("returns null when thermal_render_mode is 'text' (byte-identical text path stays)", async () => {
    const res = await thermalRasterRenderer.render({
      data: makeData(),
      template: makeTemplate({ thermal_render_mode: 'text' }),
    });
    expect(res).toBeNull();
    expect(painter.calls).toBe(0);
  });

  it('returns null when thermal_render_mode is unset', async () => {
    const res = await thermalRasterRenderer.render({
      data: makeData(),
      template: makeTemplate(),
    });
    expect(res).toBeNull();
    expect(painter.calls).toBe(0);
  });

  it("returns null when no painter is registered (graceful fallback)", async () => {
    setRasterPainter(null);
    const res = await thermalRasterRenderer.render({
      data: makeData(),
      template: makeTemplate({ thermal_render_mode: 'raster' }),
    });
    expect(res).toBeNull();
  });

  it('returns null when the painter produces no bitmap (fallback preserved)', async () => {
    setRasterPainter({
      async paint() {
        return null;
      },
    });
    const res = await thermalRasterRenderer.render({
      data: makeData(),
      template: makeTemplate({ thermal_render_mode: 'raster' }),
    });
    expect(res).toBeNull();
  });

  it("renders a GS v 0 raster payload + feed/cut tail in 'raster' mode", async () => {
    const res = await thermalRasterRenderer.render({
      data: makeData(),
      template: makeTemplate({ thermal_render_mode: 'raster' }),
    });

    expect(res).not.toBeNull();
    const r = res as RenderResult<Uint8Array>;
    expect(r.type).toBe('escpos');
    expect(r.mimeType).toBe('application/octet-stream');
    expect(r.filename).toContain('receipt-');

    expect(painter.calls).toBe(1);
    expect(painter.widthDots).toBe(576);
    expect(painter.maxHeightDots).toBe(65535);

    const payload = r.payload;
    expect(Array.from(payload.slice(0, 4))).toEqual(GS_V0);
    // Tail = builder.init() (`ESC @` `ESC t 0x10` — 0x10 is the code-page byte)
    // followed by feedAndCut() = 4×LF + `GS V NUL`. slice(-8) therefore starts
    // at the trailing 0x10 of the code-page select; there is NO leading LF in
    // the non-QR path.
    const tail = Array.from(payload.slice(-8));
    expect(tail).toEqual([0x10, 0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00]);

    expect(containsSeq(payload, [0x1d, 0x28, 0x6b])).toBe(false);
  });

  // 'auto' resolves to the raster path because the standard footer always
  // carries Arabic (نظام ERP الجزائر…) — matching production reality.
  it("takes the raster path in 'auto' mode when the plan contains Arabic", async () => {
    const res = await thermalRasterRenderer.render({
      data: makeData(),
      template: makeTemplate({ thermal_render_mode: 'auto' }),
    });
    expect(res).not.toBeNull();
    expect(painter.calls).toBe(1);
  });

  it('appends a native QR command block when show_qr_code is enabled', async () => {
    const res = await thermalRasterRenderer.render({
      data: makeData(),
      template: makeTemplate({ thermal_render_mode: 'raster', show_qr_code: true }),
    });
    const r = res as RenderResult<Uint8Array>;
    expect(containsSeq(r.payload, [0x1d, 0x28, 0x6b])).toBe(true);
    // feedAndCut ends with the cut command `GS V NUL`.
    expect(Array.from(r.payload.slice(-3))).toEqual([0x1d, 0x56, 0x00]);
  });
});