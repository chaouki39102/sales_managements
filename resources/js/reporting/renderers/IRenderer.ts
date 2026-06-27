// ════════════════════════════════════════════════════════════════════════════
// reporting/renderers/IRenderer.ts
//
// The renderer interface. All renderers (React, ESC/POS, PDF, …) implement
// this contract so the framework core never touches a specific output format.
//
// Dependency direction:
//   Core → IRenderer ← ReactRenderer
//                    ← ESCPOSRenderer
//                    ← PDFRenderer (future)
// ════════════════════════════════════════════════════════════════════════════

import type { UniversalDocumentData } from '../data/UniversalDocumentData';
import type { PrintTemplate } from '../core/domain/PrintTemplate';

// ─── Render output ────────────────────────────────────────────────────────────

export type RendererOutputType = 'html' | 'escpos' | 'pdf' | 'image' | 'json' | 'csv' | 'xlsx';

export interface RenderResult<T = unknown> {
  /** What format this output is */
  type:     RendererOutputType;
  /** The actual output — HTMLElement, Uint8Array, Blob, string, etc. */
  payload:  T;
  /** MIME type for download/upload use */
  mimeType?: string;
  /** Suggested filename if downloading */
  filename?: string;
}

// ─── Render context ───────────────────────────────────────────────────────────

export interface RenderContext {
  /** The document data to render */
  data:     UniversalDocumentData;
  /** The template controlling layout and visibility */
  template: PrintTemplate;
  /**
   * Optional: override the company info from template's override_* fields.
   * If not provided, renderers use data.company directly.
   */
  companyOverrides?: Partial<{
    name:    string;
    address: string;
    phone:   string;
    nif:     string;
    rc:      string;
    nis:     string;
    ice:     string;
    article: string;
  }>;
  /** Locale for number/date formatting. Defaults to 'ar-DZ'. */
  locale?: string;
  /** Currency symbol override. Defaults to data.currency.symbol. */
  currencySymbol?: string;
}

// ─── IRenderer ───────────────────────────────────────────────────────────────

export interface IRenderer<TOutput = unknown> {
  /**
   * The output format this renderer produces.
   * Used by RendererRegistry to select the right renderer.
   */
  readonly outputType: RendererOutputType;

  /**
   * Render the document and return the output.
   * Must be pure with respect to external state — all inputs are in ctx.
   */
  render(ctx: RenderContext): Promise<RenderResult<TOutput>>;

  /**
   * True if this renderer can handle the given template's paper_size.
   * The registry calls this before render() to select the right adapter.
   */
  supports(paperSize: PrintTemplate['paper_size']): boolean;
}

// ─── Renderer registry ────────────────────────────────────────────────────────

/**
 * Simple registry mapping output type → renderer instance.
 * Call RendererRegistry.register() to add a renderer (including plugins).
 * Call RendererRegistry.get() to retrieve one.
 */
class RendererRegistryClass {
  private readonly _renderers = new Map<RendererOutputType, IRenderer>();

  register(renderer: IRenderer): void {
    this._renderers.set(renderer.outputType, renderer);
  }

  get(type: RendererOutputType): IRenderer | undefined {
    return this._renderers.get(type);
  }

  has(type: RendererOutputType): boolean {
    return this._renderers.has(type);
  }

  /** Returns all registered output types */
  types(): RendererOutputType[] {
    return Array.from(this._renderers.keys());
  }

  /** Clear all registered renderers. Useful in tests. */
  reset(): void {
    this._renderers.clear();
  }
}

export const RendererRegistry = new RendererRegistryClass();

// ─── Built-in renderer registration ─────────────────────────────────────────────
// Import and register the built-in CSV and Excel renderers so they're available
// via RendererRegistry.get('csv') / RendererRegistry.get('xlsx') right away.

import { csvRenderer } from './CsvRenderer';
import { excelRenderer } from './ExcelRenderer';

RendererRegistry.register(csvRenderer);
RendererRegistry.register(excelRenderer);
