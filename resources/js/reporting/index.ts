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

// ─── Export renderers (Phase 6) ────────────────────────────────────────────────
export { CsvRenderer, csvRenderer } from './renderers/CsvRenderer';
export { ExcelRenderer, excelRenderer } from './renderers/ExcelRenderer';
export { useExportDocument, exportDocumentCsv, exportDocumentXlsx } from './renderers/useExportDocument';

// ─── Engines (Phase 1) ─────────────────────────────────────────────────────────
export type {
  ExpressionValue,
  EvaluationContext,
  ValidationResult,
  ExpressionFunction,
} from './core/engines/FormulaEngine';

export { FormulaEngine, formulaEngine } from './core/engines/FormulaEngine';

export type {
  ReportRule,
  RuleAction,
  RuleEvaluationResult,
} from './core/engines/RulesEngine';

export { RulesEngine, rulesEngine } from './core/engines/RulesEngine';

export type {
  LayoutMode,
  LayoutElement,
  ComputedLayout,
  LayoutResult,
} from './core/engines/LayoutEngine';

export { LayoutEngine, layoutEngine } from './core/engines/LayoutEngine';

// ─── Theme (Phase 1) ──────────────────────────────────────────────────────────
export type {
  ReportTheme,
  ThemeColors,
  ThemeFonts,
  ThemeSpacing,
  ThemeBorders,
  ThemeTable,
} from './core/theme/ThemeSystem';

export { ThemeSystem, themeSystem, PRESETS } from './core/theme/ThemeSystem';

// ─── Field registry (Phase 1) ──────────────────────────────────────────────────
export type {
  FieldDefinition,
  FieldGroup,
} from './data/FieldRegistry';

export { fieldRegistry } from './data/FieldRegistry';

// ─── Calculated fields (Phase 1) ───────────────────────────────────────────────
export type { CalculatedField } from './data/CalculatedFieldService';

export { calculatedFieldService } from './data/CalculatedFieldService';

// ─── Preview components (Phase 2) ─────────────────────────────────────────────
export { default as UniversalPreview } from './components/preview/UniversalPreview';

export type { CompanyData } from './components/preview/shared';

// ─── Shared UI components (Phase 2) ───────────────────────────────────────────
export { default as FormulaEditor } from './components/shared/FormulaEditor';

export { default as TemplatePrintModal } from './components/shared/TemplatePrintModal';

// ─── Rules & Conditions (Phase 3) ─────────────────────────────────────────────
export type { SectionTarget } from './core/domain/PrintTemplate';

export { default as RulesSection } from './components/shared/RulesSection';

// ─── Report / Charts (Phase 5) ────────────────────────────────────────────────
export type {
  ReportSummary,
  ReportPaymentBreakdown,
  ReportProductSummary,
} from './data/UniversalDocumentData';

export { default as ChartSection } from './components/shared/ChartSection';

// ─── Batch Print / Print Queue (Phase 6) ────────────────────────────────────
export { printJobQueue } from './renderers/PrintJobQueue';
export type { PrintJob, PrintJobInput, PrintJobStatus } from './renderers/PrintJobQueue';
export { usePrintJobQueue, statusColor, statusLabel } from './renderers/usePrintJobQueue';
export { default as PrintQueuePanel } from './components/shared/PrintQueuePanel';

// ─── Template Library (Phase 7) ─────────────────────────────────────────────
export {
  TemplateLibraryModal, templateRegistry, registerBuiltinTemplates,
  buildTemplate, createMeta,
  TEMPLATE_CATEGORIES, ALL_TAGS, categoryFromDocType,
  paperConfig, typographyConfig, headerConfig,
  INVOICE_COLUMNS, DELIVERY_COLUMNS, DELIVERY_A5_COLUMNS,
  INVOICE_TOTALS, DELIVERY_TOTALS, DELIVERY_A5_TOTALS,
  INVOICE_FOOTER, DELIVERY_FOOTER, DELIVERY_A5_FOOTER,
} from './templates/library';
export type {
  LibraryTemplateEntry, LibraryTemplateMeta, LibraryApiResponse,
  TemplateVersion, TemplateTags, TemplateCategory,
  PaperConfig, TypographyConfig, HeaderConfig,
  TableConfig, TotalsConfig, FooterConfig,
  LibraryFilterState, FavoriteEntry, InstallHistoryEntry,
} from './templates/library';

// ─── Advanced Formula Functions ──────────────────────────────────────────────
export { registerAdvancedFunctions } from './core/engines/AdvancedFunctions';
