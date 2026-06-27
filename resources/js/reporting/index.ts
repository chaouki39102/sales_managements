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

// ═══════════════════════════════════════════════════════════════════════════════
// V2 Infrastructure
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Command History ─────────────────────────────────────────────────────────
export type { Command, HistorySnapshot } from './core/history/CommandHistory';
export { CommandHistory } from './core/history/CommandHistory';

// ─── Report Compiler ─────────────────────────────────────────────────────────
export type {
  CompiledReport,
  CompiledSection,
  CompiledColumn,
  CompilerError,
  CompilerWarning,
} from './core/compiler/ReportCompiler';
export { compileReport, reportCompiler } from './core/compiler/ReportCompiler';

// ─── Rendering Pipeline ──────────────────────────────────────────────────────
export type {
  PipelineStage,
  PipelineMetrics,
  PipelineResult,
  PipelineContext,
} from './core/pipeline/RenderingPipeline';
export { renderingPipeline } from './core/pipeline/RenderingPipeline';

// ─── Plugin Registry ─────────────────────────────────────────────────────────
export type {
  PluginManifest,
  PluginHooks,
  ReportPlugin,
  FormulaFunctionRegistration,
  ExporterRegistration,
  ThemeRegistration,
  BarcodeTypeRegistration,
  ChartTypeRegistration,
  ComponentRegistration,
  PaperSizeRegistration,
} from './core/plugin/PluginRegistry';
export { pluginRegistry } from './core/plugin/PluginRegistry';

// ─── Advanced Formula Functions ──────────────────────────────────────────────
export { registerAdvancedFunctions } from './core/engines/AdvancedFunctions';

// ─── Advanced Rules Engine ───────────────────────────────────────────────────
export type {
  RuleCombiner,
  RuleGroup,
  NestedRule,
  RuleTemplate,
  RuleVariable,
  AdvancedRuleConfig,
  RuleDebugStep,
  RuleDebugResult,
  RuleSimulationInput,
} from './core/engines/RulesEngineAdvanced';
export { rulesEngineAdvanced } from './core/engines/RulesEngineAdvanced';

// ─── Style System ────────────────────────────────────────────────────────────
export type {
  StyleLayer,
  ComponentStyle,
  SectionStyle,
  StylePreset,
} from './core/theme/StyleSystem';
export { styleSystem } from './core/theme/StyleSystem';

// ─── Diagnostics ─────────────────────────────────────────────────────────────
export type { DiagnosticsReport } from './core/diagnostics/DiagnosticsService';
export { diagnosticsService } from './core/diagnostics/DiagnosticsService';
export { DiagnosticsPanel } from './core/diagnostics/DiagnosticsPanel';

// ─── Visual Designer ─────────────────────────────────────────────────────────
export type {
  DesignerElement,
  DesignerState,
  DesignerActions,
} from './components/designer/useDesignerStore';
export { useDesignerStore, useSelectedElements, useElementAtPosition } from './components/designer/useDesignerStore';
export { ReportDesigner } from './components/designer/ReportDesigner';
export type { ReportDesignerProps } from './components/designer/ReportDesigner';
export { DesignerCanvas } from './components/designer/DesignerCanvas';
export { DesignerToolbar } from './components/designer/DesignerToolbar';
export { PropertyInspector } from './components/designer/PropertyInspector';
export { ComponentTree } from './components/designer/ComponentTree';
export { printTemplateToDesignerElements, designerElementsToPrintTemplate, DESIGNER_ELEMENT_TYPES } from './components/designer/DesignerConverter';
