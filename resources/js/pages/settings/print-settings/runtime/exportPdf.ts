import { renderPipelineToPopup } from './UniversalPrintPipeline';
import type { PipelineSource } from './UniversalPrintPipeline';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

/**
 * PDF export through the browser's own print engine.
 *
 * The previous implementation rendered the preview off-screen and fed it to
 * the `dompdf.js` WASM writer. That writer has no Arabic shaping or bidi:
 * without an embedded font every Arabic glyph came out as «?», and even with
 * an Arabic font the letters were disconnected and in the wrong order — the
 * exported invoice was unreadable.
 *
 * The print popup is the SSOT renderer (same `UniversalPreview`, same @page
 * size, same fonts as the paper copy), and every browser's print dialog offers
 * «Save as PDF», which produces a vector PDF with correctly shaped Arabic. The
 * popup title is the file name, so the PDF defaults to e.g. `FV-2026-000001.pdf`.
 */
export async function exportSourceToPdf(input: {
  template: PrintTemplate;
  company: CompanyData | null;
  source: PipelineSource;
  filename: string;
}): Promise<void> {
  const { template, company, source, filename } = input;
  const title = filename.replace(/\.pdf$/i, '');
  const win = renderPipelineToPopup(source, template, company as any, 1, { title });
  if (!win) {
    throw new Error('تعذر فتح نافذة PDF — اسمح بالنوافذ المنبثقة لهذا الموقع');
  }
}
