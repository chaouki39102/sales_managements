import type { PrintTemplate } from '../../../../reporting/core/domain/PrintTemplate';
import type { UniversalDocumentData } from '../../../../reporting/data/UniversalDocumentData';
import { compileReport, type CompiledReport } from '../compiler/ReportCompiler';
import { formulaEngine } from '../../../../reporting/core/engines/FormulaEngine';
import { rulesEngine } from '../../../../reporting/core/engines/RulesEngine';
import { layoutEngine } from '../../../../reporting/core/engines/LayoutEngine';
import type { EvaluationContext } from '../../../../reporting/core/engines/FormulaEngine';

// â”€â”€â”€ Pipeline Stages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PipelineStage = 'validate' | 'compile' | 'optimize' | 'layout' | 'paginate' | 'render';

export interface PipelineMetrics {
  stage: PipelineStage;
  elapsedMs: number;
  warnings?: string[];
}

export interface PipelineResult {
  report: CompiledReport;
  metrics: PipelineMetrics[];
  success: boolean;
}

export interface PipelineContext {
  template: PrintTemplate;
  data: UniversalDocumentData;
  options?: {
    locale?: string;
    currencySymbol?: string;
    pageNumber?: number;
    totalPages?: number;
  };
}

// â”€â”€â”€ Pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class RenderingPipelineService {
  private _metrics: PipelineMetrics[] = [];

  async run(ctx: PipelineContext): Promise<PipelineResult> {
    this._metrics = [];

    const validate = this._time('validate', () => this._validate(ctx));
    if (!validate.success) {
      return { report: null as unknown as CompiledReport, metrics: this._metrics, success: false };
    }

    const compile = this._time('compile', () => compileReport(ctx.template));
    if (!compile.validation.valid) {
      return { report: compile, metrics: this._metrics, success: false };
    }

    const optimize = this._time('optimize', () => this._optimize(compile, ctx));

    const layout = this._time('layout', () => this._layout(optimize, ctx));

    const paginate = this._time('paginate', () => this._paginate(layout, ctx));

    return {
      report: paginate,
      metrics: this._metrics,
      success: true,
    };
  }

  metrics(): PipelineMetrics[] {
    return [...this._metrics];
  }

  clearMetrics(): void {
    this._metrics = [];
  }

  private _time(stage: PipelineStage, fn: () => unknown): any {
    const start = performance.now();
    try {
      const result = fn();
      const elapsedMs = performance.now() - start;
      this._metrics.push({ stage, elapsedMs });
      return result;
    } catch (err) {
      const elapsedMs = performance.now() - start;
      this._metrics.push({ stage, elapsedMs, warnings: [String(err)] });
      throw err;
    }
  }

  private _validate(ctx: PipelineContext): { success: boolean } {
    if (!ctx.template) return { success: false };
    if (!ctx.data) return { success: false };
    return { success: true };
  }

  private _optimize(report: CompiledReport, ctx: PipelineContext): CompiledReport {
    const withExpressions = { ...report };
    const evalContext: EvaluationContext = { data: ctx.data, computed: {} };
    withExpressions.rules = [rulesEngine.evaluate(ctx.template.rules ?? [], evalContext, formulaEngine)] as unknown as unknown[];
    return withExpressions;
  }

  private _layout(report: CompiledReport, ctx: PipelineContext): CompiledReport {
    // TODO: Convert PrintTemplate sections to LayoutElement[] for proper layout computation
    // layoutEngine.compute expects (elements: LayoutElement[], paperWidth: number, startY?: number, maxHeight?: number)
    // For now, skip layout computation since template-to-elements conversion is not implemented
    return { ...report, layout: null as any };
  }

  private _paginate(report: CompiledReport, _ctx: PipelineContext): CompiledReport {
    return { ...report, paginated: true as any };
  }
}

export const renderingPipeline = new RenderingPipelineService();

