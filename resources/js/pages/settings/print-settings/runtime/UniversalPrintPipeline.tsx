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

import React, { useMemo, Suspense, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createDefaultTemplate } from '@/pages/settings/print-settings/types';
import type { PrintTemplate, DocTypeCode, PaperSize } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData, CompanyInfo } from '@/pages/settings/print-settings/types/data';
import { DocumentDataBuilder, POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';

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

export function openPrintPopup(
  width:       number,
  height:      number,
  extraStyles?: string,
): Window | null {
  const win = window.open('', '_blank', `width=${width},height=${height}`);
  if (!win) return null;

  win.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>Print</title>
  <style>
    body { margin: 0; padding: 0; direction: rtl; font-family: 'Tajawal', sans-serif; }
    @page { margin: 0; }
    @media print { body { padding: 0; } }
    ${extraStyles ?? ''}
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
</head>
<body><div id="print-root"></div>
<script>
  function doPrint() { window.print(); setTimeout(function() { window.close(); }, 500); }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() { setTimeout(doPrint, 200); });
  } else {
    setTimeout(doPrint, 600);
  }
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
): Window | null {
  const isThermal = template.paper_size === '80mm' || template.paper_size === '58mm';
  const w = isThermal ? 320 : template.paper_size === 'A5' ? 500 : 720;
  const win = openPrintPopup(w, 700);
  if (!win) return null;

  const root = win.document.getElementById('print-root');
  if (!root) { win.close(); return null; }

  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(
    <Suspense fallback={null}>
      <UniversalPreview tpl={template} data={buildData(source, company)} />
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
