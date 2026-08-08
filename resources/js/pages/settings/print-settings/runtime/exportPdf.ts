import { buildData } from './renderPreviewToHtml';
import type { PipelineSource } from './UniversalPrintPipeline';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import type { Root } from 'react-dom/client';

/**
 * Render the preview for `source` with `template` into an off-screen DOM node,
 * wait for async content (Google fonts, the client-side fiscal QR data URL,
 * company logo), then export it as a PDF via the lazy `dompdf.js` chunk
 * (WASM inlined as base64 — no server-side PDF service required).
 *
 * The preview is the SSOT renderer (same `UniversalPreview` the print popup
 * uses), so the PDF is pixel-consistent with the paper preview, including the
 * fiscal QR `img[alt="QR"]` and `page_orientation`.
 */
export async function exportSourceToPdf(input: {
  template: PrintTemplate;
  company: CompanyData | null;
  source: PipelineSource;
  filename: string;
}): Promise<void> {
  const { template, company, source, filename } = input;

  const isThermal = template.paper_size === '80mm' || template.paper_size === '58mm';
  const isA4 = template.paper_size === 'A4';
  const landscape = !isThermal && template.page_orientation === 'landscape';
  const portraitW = isA4 ? 794 : 559;
  const portraitH = isA4 ? 1123 : 794;
  const paperWidth = isThermal
    ? template.paper_width_mm * 3.78
    : (landscape ? portraitH : portraitW);

  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'top:0',
    `left:${paperWidth * -2}px`,
    `width:${paperWidth}px`,
    'background:#fff',
    'z-index:-1',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(container);

  let root: Root | null = null;
  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const UniversalPreview = (await import('../components/preview/UniversalPreview')).default;

    const data = buildData(source, company);
    root = createRoot(container);
    root.render(
      React.createElement(React.Suspense, { fallback: null },
        React.createElement(UniversalPreview, { tpl: template, data })),
    );

    await waitForContent(container);

    const dompdf = (await import('dompdf.js')).default;
    await dompdf.downloadPDF(container, {
      format: isThermal ? 'a4' : (template.paper_size === 'A5' ? 'a5' : 'a4'),
      orientation: landscape ? 'landscape' : 'portrait',
      pagination: true,
      marginPt: 0,
      useCORS: true,
      compress: true,
      putOnlyUsedFonts: true,
      backgroundColor: '#ffffff',
    }, filename);
  } finally {
    if (root) root.unmount();
    container.remove();
  }
}

/**
 * Wait until fonts are ready and the QR placeholder(s) have materialized into
 * data-URL `<img>`s, and all other images are decoded. The fiscal QR is
 * generated client-side (async `qrcode` import) so it is NEVER present in the
 * initial render — the `[data-qr-content]` placeholder marks a pending QR slot
 * and is replaced by the `<img alt="QR">` once ready.
 */
async function waitForContent(root: HTMLElement): Promise<void> {
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* fonts never resolve — don't block */ }
  }

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const pendingQr = root.querySelectorAll('[data-qr-content]').length;
    const pendingImg = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
      .filter((i) => i.alt === 'QR' ? !i.src.startsWith('data:') : !i.complete)
      .length;
    if (pendingQr === 0 && pendingImg === 0) break;
    await new Promise((r) => setTimeout(r, 120));
  }

  await new Promise((r) => setTimeout(r, 300));
}
