// ════════════════════════════════════════════════════════════════════════════
// reporting/index.ts
//
// Public API for the ERP Report Designer Framework.
//
// Consumer code imports ONLY from here:
//   import { DocumentDataBuilder, UniversalDocumentData } from '@/reporting';
//
// Nothing from reporting/core/*, reporting/data/*, reporting/renderers/*
// should be imported directly by application code.
// ════════════════════════════════════════════════════════════════════════════

// ─── Data contract ────────────────────────────────────────────────────────────
//
// ReceiptLiveData / TemplateLiveData are NOT re-exported from here.
// They remain in pages/settings/print-settings/types.ts (unchanged) through Phase 1.
// The fromLegacyLiveData() adapter bridges old → new shapes.

export type {
  UniversalDocumentData,
  DocumentInfo,
  CompanyInfo,
  PartyInfo,
  WarehouseInfo,
  SessionInfo,
  DocumentLine,
  TaxRate,
  DocumentTotals,
  Payment,
  BalanceInfo,
  CurrencyInfo,
} from './data/UniversalDocumentData';

export {
  fromLegacyLiveData,
  emptyDocumentData,
} from './data/UniversalDocumentData';

// ─── Data builder ─────────────────────────────────────────────────────────────
export { DocumentDataBuilder } from './data/DocumentDataBuilder';
export type { POSSaleSnapshot } from './data/DocumentDataBuilder';

// ─── Domain types ─────────────────────────────────────────────────────────────
export type {
  PrintTemplate,
  PaperSize,
  AlignOption,
  BorderStyle,
  PriceMode,
  PageOrientation,
  FontFamily,
  ColumnKey,
  DocTypeCode,
} from './core/domain/PrintTemplate';

export {
  DOC_TYPE_LIST,
  createDefaultTemplate,
} from './core/domain/PrintTemplate';

// ─── Renderer infrastructure ──────────────────────────────────────────────────
export type {
  IRenderer,
  RenderContext,
  RenderResult,
  RendererOutputType,
} from './renderers/IRenderer';

export { RendererRegistry } from './renderers/IRenderer';
