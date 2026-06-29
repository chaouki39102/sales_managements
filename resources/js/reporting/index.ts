// ════════════════════════════════════════════════════════════════════════════
// reporting/index.ts
//
// Public API for the ERP Report Designer Framework.
//
// Consumer code imports ONLY from here:
//   import { DocumentDataBuilder, UniversalDocumentData } from '@/reporting';
//
// All implementation lives in print-settings/ — this barrel re-exports from
// there as the canonical source of truth.
// ════════════════════════════════════════════════════════════════════════════

// ─── Data contract (canonical source: print-settings/types/data) ───────────
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
  ReportSummary,
  ReportPaymentBreakdown,
  ReportProductSummary,
} from '@/pages/settings/print-settings/types/data';

export {
  fromLegacyLiveData,
  emptyDocumentData,
} from '@/pages/settings/print-settings/types/data';

// ─── Data builder (canonical source: print-settings/types/data) ────────────
export { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data/DocumentDataBuilder';
export type { POSSaleSnapshot } from '@/pages/settings/print-settings/types/data/DocumentDataBuilder';

// ─── Domain types (canonical source: print-settings/types) ─────────────────
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
  SectionTarget,
  ReportRule,
  PrintTemplateApiResponse,
  TemplateLiveData,
  CompanyData,
  DetectedPrinter,
  DocumentPrintConfig,
  ReceiptTemplate80mm,
  CompanyPreviewData,
  ReceiptLiveData,
} from '@/pages/settings/print-settings/types';

export {
  DOC_TYPE_LIST,
  createDefaultTemplate,
  defaultTemplate,
} from '@/pages/settings/print-settings/types';

// ─── Renderer infrastructure ──────────────────────────────────────────────────
export type {
  IRenderer,
  RenderContext,
  RenderResult,
  RendererOutputType,
} from './renderers/IRenderer';

export { RendererRegistry } from './renderers/IRenderer';

// ─── Export renderers ─────────────────────────────────────────────────────────
export { CsvRenderer, csvRenderer } from './renderers/CsvRenderer';
export { ExcelRenderer, excelRenderer } from './renderers/ExcelRenderer';
export { useExportDocument, exportDocumentCsv, exportDocumentXlsx } from './renderers/useExportDocument';

// ─── Engines (canonical source: print-settings/services/engines) ──────────────
export type {
  ExpressionValue,
  EvaluationContext,
  ValidationResult,
  ExpressionFunction,
} from '@/pages/settings/print-settings/services/engines/FormulaEngine';

export { FormulaEngine, formulaEngine } from '@/pages/settings/print-settings/services/engines/FormulaEngine';

export type {
  ReportRule as RulesEngineReportRule,
  RuleAction,
  RuleEvaluationResult,
} from '@/pages/settings/print-settings/services/engines/RulesEngine';

export { RulesEngine, rulesEngine } from '@/pages/settings/print-settings/services/engines/RulesEngine';

// ─── Layout engine ────────────────────────────────────────────────────────────
export type {
  LayoutMode,
  LayoutElement,
  ComputedLayout,
  LayoutResult,
} from './core/engines/LayoutEngine';

export { LayoutEngine, layoutEngine } from './core/engines/LayoutEngine';

// ─── Theme ────────────────────────────────────────────────────────────────────
export type {
  ReportTheme,
  ThemeColors,
  ThemeFonts,
  ThemeSpacing,
  ThemeBorders,
  ThemeTable,
} from './core/theme/ThemeSystem';

export { ThemeSystem, themeSystem, PRESETS } from './core/theme/ThemeSystem';

// ─── Field registry (canonical source: print-settings/services) ───────────────
export type {
  FieldDefinition,
  FieldGroup,
} from '@/pages/settings/print-settings/services/FieldRegistry';

export { fieldRegistry } from '@/pages/settings/print-settings/services/FieldRegistry';

// ─── Calculated fields (canonical source: print-settings/services) ────────────
export type { CalculatedField } from '@/pages/settings/print-settings/services/CalculatedFieldService';

export { calculatedFieldService } from '@/pages/settings/print-settings/services/CalculatedFieldService';

// ─── Preview components (canonical source: print-settings) ────────────────────
export { default as UniversalPreview } from '@/pages/settings/print-settings/components/preview/UniversalPreview';

export { default as PreviewSelector } from '@/pages/settings/print-settings/components/PreviewSelector';

// ─── Shared UI components ─────────────────────────────────────────────────────
export { default as FormulaEditor } from '@/pages/settings/print-settings/components/FormulaEditor';

export { default as TemplatePrintModal } from './components/shared/TemplatePrintModal';

// ─── Rules & Conditions (canonical source: print-settings) ────────────────────
export { default as RulesSection } from '@/pages/settings/print-settings/components/RulesSection';

// ─── Charts (canonical source: print-settings) ────────────────────────────────
export { default as ChartSection } from '@/pages/settings/print-settings/components/ChartSection';

// ─── Batch Print / Print Queue ────────────────────────────────────────────────
export { printJobQueue } from './renderers/PrintJobQueue';
export type { PrintJob, PrintJobInput, PrintJobStatus } from './renderers/PrintJobQueue';
export { usePrintJobQueue, statusColor, statusLabel } from './renderers/usePrintJobQueue';
export { default as PrintQueuePanel } from './components/shared/PrintQueuePanel';

// ─── Template Library (canonical source: print-settings/template-library) ────
export {
  TemplateLibraryModal, templateRegistry, registerBuiltinTemplates,
  buildTemplate, createMeta,
  TEMPLATE_CATEGORIES, ALL_TAGS, categoryFromDocType,
  paperConfig, typographyConfig, headerConfig,
  INVOICE_COLUMNS, DELIVERY_COLUMNS, DELIVERY_A5_COLUMNS,
  INVOICE_TOTALS, DELIVERY_TOTALS, DELIVERY_A5_TOTALS,
  INVOICE_FOOTER, DELIVERY_FOOTER, DELIVERY_A5_FOOTER,
} from '@/pages/settings/print-settings/template-library';
export type {
  LibraryTemplateEntry, LibraryTemplateMeta, LibraryApiResponse,
  TemplateVersion, TemplateTags, TemplateCategory,
  PaperConfig, TypographyConfig, HeaderConfig,
  TableConfig, TotalsConfig, FooterConfig,
  LibraryFilterState, FavoriteEntry, InstallHistoryEntry,
} from '@/pages/settings/print-settings/template-library';

// ─── Template API (canonical source: print-settings/api) ──────────────────────
export {
  usePrintTemplates,
  usePrintTemplate,
  usePrintTemplateMutations,
} from '@/pages/settings/print-settings/api/printTemplatesApi';

// ─── Advanced Formula Functions ──────────────────────────────────────────────
export { registerAdvancedFunctions } from './core/engines/AdvancedFunctions';
