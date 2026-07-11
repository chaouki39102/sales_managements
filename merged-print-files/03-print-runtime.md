# 🖨️ Print Settings — Runtime (bridge, pipeline, resolver)


## FILE: ./resources/js/pages/settings/print-settings/runtime/index.ts

```
// ════════════════════════════════════════════════════════════════════════════
// runtime/index.ts — Print Runtime barrel
//
// The runtime layer is a dedicated read-only layer for loading, resolving,
// and printing templates. It depends ONLY on RuntimeContext (minimal),
// NOT on PrintSettingsProvider (designer context with undo/redo, notifier…).
//
// Architectural boundary:
//   Print Designer  ←→  Print Runtime   ←→  Host App (apiGet, slug)
//   (print-settings)       (runtime/)
// ════════════════════════════════════════════════════════════════════════════
export { PrintRuntimeAdapter } from './PrintRuntimeAdapter';
export { RuntimeProvider, useRuntime } from './PrintRuntimeContext';
export type { RuntimeDependencies } from './PrintRuntimeContext';
export { usePrintTemplatesList } from './usePrintTemplatesList';
export {
  resolveTemplate,
  resolveTemplateById,
} from './TemplateResolver';
export { default as UniversalPrintPipeline } from './UniversalPrintPipeline';
export type { PipelineSource } from './UniversalPrintPipeline';
export { renderPreviewToHtml } from './renderPreviewToHtml';
export { openPrintPopup, renderPipelineToPopup } from './UniversalPrintPipeline';
export { mapCompany } from './PrintRuntimeAdapter';

```

## FILE: ./resources/js/pages/settings/print-settings/runtime/PrintRuntimeAdapter.tsx

```
// ════════════════════════════════════════════════════════════════════════════
// PrintRuntimeAdapter — the ONLY bridge between the host app and the runtime
// layer. This is the single place where global API functions and Zustand
// store are imported for the runtime module.
//
// Mount this at the app root (or inside RequireCompany) so that all printing
// consumers have access to the runtime context.
// ════════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '@/lib/api/core/client';
import { createPrintTemplatesApi } from '@/pages/settings/print-settings/api/printTemplatesApi';
import type { ApiClient } from '@/pages/settings/print-settings/contracts/ApiClient';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { RuntimeProvider } from './PrintRuntimeContext';

const __hostApiClient: ApiClient = {
  get:      <T,>(url: string, params?: Record<string, unknown>) => apiGet<T>(url, params),
  post:     <T,>(url: string, data?: unknown)                   => apiPost<T>(url, data),
  put:      <T,>(url: string, data?: unknown)                   => apiPut<T>(url, data),
  patch:    <T,>(url: string, data?: unknown)                   => apiPatch<T>(url, data),
  delete:   (url: string)                                      => apiDelete(url),
  upload:   <T,>(url: string, fd: FormData, onProgress?: (p: number) => void) => apiUpload<T>(url, fd, onProgress),
};

export function mapCompany(ac: ReturnType<typeof useActiveCompany>): CompanyData | null {
  if (!ac) return null;
  return {
    name:    ac.name    ?? '',
    address: ac.address ?? '',
    phone:   ac.phone   ?? '',
    nif:     ac.nif     ?? '',
    rc:      ac.rc      ?? '',
    nis:     ac.nis     ?? '',
    ice:     (ac as any).ice ?? '',
    article: (ac as any).ai ?? '',
    logoUrl: (ac as any).avatar ?? null,
  };
}

export function PrintRuntimeAdapter({ children }: { children: React.ReactNode }) {
  const slug    = useActiveSlug();
  const company = useActiveCompany();
  const deps = useMemo(() => ({
    templateRepository: createPrintTemplatesApi(__hostApiClient),
    slug,
    company: mapCompany(company),
  }), [slug, company]);
  return <RuntimeProvider value={deps}>{children}</RuntimeProvider>;
}

```

## FILE: ./resources/js/pages/settings/print-settings/runtime/PrintRuntimeContext.tsx

```
import { createContext, useContext } from 'react';
import type { PrintTemplatesApi } from '@/pages/settings/print-settings/contracts/TemplateRepository';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

export interface RuntimeDependencies {
  templateRepository: PrintTemplatesApi;
  slug: string | null;
  company: CompanyData | null;
}

const RuntimeContext = createContext<RuntimeDependencies | null>(null);

export function RuntimeProvider({ value, children }: { value: RuntimeDependencies; children: React.ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeDependencies {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error('RuntimeProvider missing — mount <PrintRuntimeAdapter> at app root');
  return ctx;
}

```

## FILE: ./resources/js/pages/settings/print-settings/runtime/renderPreviewToHtml.ts

```
import React from 'react';
import ReactDOMServer from 'react-dom/server.browser';
import UniversalPrintPipeline from './UniversalPrintPipeline';
import type { PipelineSource } from './UniversalPrintPipeline';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

export function renderPreviewToHtml(input: {
  template: PrintTemplate;
  company: CompanyData | null;
  source: PipelineSource;
}): string {
  const { template, company, source } = input;

  const element = React.createElement(UniversalPrintPipeline, {
    source,
    template,
    company,
  });

  return ReactDOMServer.renderToStaticMarkup(element);
}

```

## FILE: ./resources/js/pages/settings/print-settings/runtime/TemplateResolver.ts

```
// ════════════════════════════════════════════════════════════════════════════
// TemplateResolver — pure functions for template resolution
//
// No hooks, no context — just logic.
// ════════════════════════════════════════════════════════════════════════════
import type { PrintTemplate, PaperSize } from '@/pages/settings/print-settings/types';

/**
 * Find the first active template matching docTypeCode and optionally paperSize.
 * Returns undefined if no match.
 */
export function resolveTemplate(
  templates: PrintTemplate[],
  docTypeCode: string,
  paperSize?: PaperSize,
): PrintTemplate | undefined {
  if (!templates || templates.length === 0) return undefined;

  const matching = templates.filter(
    t => t.doc_type_code === docTypeCode && t.is_active,
  );
  if (matching.length === 0) return undefined;

  if (paperSize) {
    return matching.find(t => t.paper_size === paperSize) ?? matching[0];
  }
  return matching.find(t => t.is_default) ?? matching[0];
}

/**
 * Find a template by ID.
 */
export function resolveTemplateById(
  templates: PrintTemplate[],
  id: number | null | undefined,
): PrintTemplate | undefined {
  if (!id || !templates || templates.length === 0) return undefined;
  return templates.find(t => t.id === id);
}

```

## FILE: ./resources/js/pages/settings/print-settings/runtime/UniversalPrintPipeline.tsx

```
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

```

## FILE: ./resources/js/pages/settings/print-settings/runtime/usePrintTemplatesList.ts

```
// ════════════════════════════════════════════════════════════════════════════
// usePrintTemplatesList — runtime hook for loading print templates
//
// Depends ONLY on RuntimeContext (no PrintSettingsProvider needed).
// Reads from the same React Query cache as the designer hooks, so cache
// invalidations from the Print Settings page are reflected here.
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { DocTypeCode } from '@/pages/settings/print-settings/types';
import { useRuntime } from './PrintRuntimeContext';

export function usePrintTemplatesList(docTypeCode?: DocTypeCode) {
  const { templateRepository, slug } = useRuntime();
  return useQuery({
    queryKey:  [slug, 'print-templates', 'list', docTypeCode],
    queryFn:   () => templateRepository.list(docTypeCode),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

```
