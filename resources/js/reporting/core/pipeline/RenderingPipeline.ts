import type { PrintTemplate } from '../domain/PrintTemplate';
import type { UniversalDocumentData } from '../../data/UniversalDocumentData';
import { compileReport, type CompiledReport } from '../compiler/ReportCompiler';
import { formulaEngine } from '../engines/FormulaEngine';
import { rulesEngine } from '../engines/RulesEngine';
import { layoutEngine } from '../engines/LayoutEngine';

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

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

// ─── Pipeline ────────────────────────────────────────────────────────────────

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
    withExpressions.rules = rulesEngine.evaluateAll(ctx.template, ctx.data);
    return withExpressions;
  }

  private _layout(report: CompiledReport, ctx: PipelineContext): CompiledReport {
    const layout = layoutEngine.compute(ctx.template, ctx.data);
    return { ...report, layout: layout as any };
  }

  private _paginate(report: CompiledReport, _ctx: PipelineContext): CompiledReport {
    return { ...report, paginated: true as any };
  }
}

export const renderingPipeline = new RenderingPipelineService();
