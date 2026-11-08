// ════════════════════════════════════════════════════════════════════════════
// reporting/runtime/UniversalPrintPipeline.tsx
//
// The single print pipeline for ALL consumers.
//
// Every print path (designer preview, POS receipt, commercial document,
// batch print, session report) goes through this component.
//
// Contract:
//   1. Caller builds UniversalDocumentData via DocumentDataBuilder.*
//   2. Pipeline renders UniversalPreview
//   3. Pipeline provides print-to-popup-window
// ════════════════════════════════════════════════════════════════════════════

import React, { useMemo, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData, CompanyInfo } from '@/pages/settings/print-settings/types/data';
import { DocumentDataBuilder, type POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';

const UniversalPreview = React.lazy(() => import('@/pages/settings/print-settings/components/preview/UniversalPreview'));

const FALLBACK = (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 400, color: '#999', fontSize: 14, fontFamily: 'sans-serif',
    border: '1px dashed #ddd', borderRadius: 8, margin: 16,
  }}>
    Loading preview…
  </div>
);

// ─── Source types ──────────────────────────────────────────────────────────

export type PipelineSource =
  | { type: 'api-document'; doc: Record<string, unknown>; options?: { prevBalance?: number; newBalance?: number } }
  | { type: 'pos-snapshot'; snapshot: POSSaleSnapshot }
  | { type: 'session-report'; session: Record<string, unknown> }
  | { type: 'prebuilt'; data: UniversalDocumentData };

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  source:    PipelineSource;
  template:  PrintTemplate;
  company:   CompanyInfo | null;
  className?: string;
  style?:    React.CSSProperties;
}

// ─── Pipeline component ────────────────────────────────────────────────────

export default function UniversalPrintPipeline({ source, template, company, className, style }: Props) {
  const data: UniversalDocumentData = useMemo(() => {
    switch (source.type) {
      case 'prebuilt':
        return source.data;
      case 'api-document':
        return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
      case 'pos-snapshot':
        return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company ?? {} as CompanyInfo);
      case 'session-report':
        return DocumentDataBuilder.fromSessionReport(source.session, company ?? {} as CompanyInfo);
      default:
        return DocumentDataBuilder.empty();
    }
  }, [source, company]);

  return (
    <Suspense fallback={FALLBACK}>
      <div className={className} style={style}>
        <UniversalPreview tpl={template} data={data} />
      </div>
    </Suspense>
  );
}

// ─── Shared popup window helper ──────────────────────────────────────────

/** Minimal base CSS every print document needs (the app's global reset is not
 *  present in a popup). Without border-box, padded %-width table cells overflow
 *  the sheet and the last column gets clipped on paper. */
export const PRINT_BASE_CSS = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { direction: rtl; font-family: 'Tajawal', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    img, svg { max-width: 100%; }
    table { border-collapse: collapse; }
    .no-print { }
    @media print { .no-print { display: none !important; } }
`;

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Mono:wght@400;500&family=Cairo:wght@300;400;500;600;700;800;900&family=Almarai:wght@300;400;700;800&family=Noto+Kufi+Arabic:wght@400;500;600;700;800&family=El+Messiri:wght@400;500;600;700&family=Amiri:wght@400;700&family=Zain:wght@300;400;700;800;900&display=swap';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export interface PrintPopupOptions {
  /** Window title — browsers use it as the default file name for «Save as PDF». */
  title?: string;
  /** false → the popup stays open as a preview, nothing is sent to the printer. */
  autoPrint?: boolean;
}

export function openPrintPopup(
  width:       number,
  height:      number,
  extraStyles?: string,
  opts:        PrintPopupOptions = {},
): Window | null {
  const win = window.open('', '_blank', `width=${width},height=${height}`);
  if (!win) return null;
  const title = escapeHtml(opts.title || 'Print');
  const autoPrint = opts.autoPrint !== false;

  win.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <link href="${FONTS_HREF}" rel="stylesheet"/>
  <style>
    ${PRINT_BASE_CSS}
    @page { margin: 0; }
    ${extraStyles ?? ''}
  </style>
</head>
<body><div id="print-root"></div>
<script>
  // Print only once the document is really on the page: React has rendered the
  // sheet, the client-side fiscal QR placeholder became an image, every image
  // (logo, barcode) is decoded and the web fonts are loaded. Printing earlier
  // gave blank sheets, missing QR codes and fallback-font layouts.
  var AUTO_PRINT = ${autoPrint ? 'true' : 'false'};
  function isReady() {
    var root = document.getElementById('print-root');
    if (!root || !root.querySelector('.ps-preview-wrapper, [data-print-ready]')) return false;
    if (root.querySelector('[data-qr-content]')) return false;
    var imgs = root.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) { if (!imgs[i].complete) return false; }
    return true;
  }
  function doPrint() { window.focus(); window.print(); setTimeout(function() { window.close(); }, 500); }
  var started = Date.now();
  (function waitReady() {
    if (!AUTO_PRINT) return;
    if (isReady() || Date.now() - started > 10000) {
      var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      var timeout = new Promise(function(r) { setTimeout(r, 4000); });
      Promise.race([fontsReady, timeout]).then(function() { setTimeout(doPrint, 250); });
    } else {
      setTimeout(waitReady, 100);
    }
  })();
</script>
</body>
</html>`);
  win.document.close();
  return win;
}

// ─── Print-to-popup helper ─────────────────────────────────────────────────

export function renderPipelineToPopup(
  source:    PipelineSource,
  template:  PrintTemplate,
  company:   CompanyInfo | null,
  copies?:   number,
  opts:      PrintPopupOptions = {},
): Window | null {
  const isThermal = template.paper_size === '80mm' || template.paper_size === '58mm';
  const w = isThermal ? 360 : template.paper_size === 'A5' ? 620 : 860;
  const data = buildData(source, company);
  const title = opts.title || data.doc?.number || template.name || 'Print';
  const win = openPrintPopup(w, 760, undefined, { ...opts, title });
  if (!win) return null;

  if (copies && copies > 1) {
    const badge = win.document.createElement('div');
    badge.className = 'no-print';
    badge.textContent = `نسخ: ${copies}`;
    badge.setAttribute('style', 'position:fixed;bottom:8px;left:8px;z-index:9999;font-size:10px;color:#999;direction:rtl;');
    win.document.body.appendChild(badge);
  }

  const root = win.document.getElementById('print-root');
  if (!root) { win.close(); return null; }

  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(
    <Suspense fallback={null}>
      <UniversalPreview tpl={template} data={data} />
    </Suspense>
  );

  return win;
}

function buildData(source: PipelineSource, company: CompanyInfo | null): UniversalDocumentData {
  switch (source.type) {
    case 'prebuilt':       return source.data;
    case 'api-document':   return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
    case 'pos-snapshot':   return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company ?? {} as CompanyInfo);
    case 'session-report': return DocumentDataBuilder.fromSessionReport(source.session, company ?? {} as CompanyInfo);
    default:               return DocumentDataBuilder.empty();
  }
}
