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
