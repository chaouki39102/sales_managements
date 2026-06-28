import { renderingPipeline, type PipelineMetrics } from '../pipeline/RenderingPipeline';
import { formulaEngine } from '../engines/FormulaEngine';
import { rulesEngine } from '../engines/RulesEngine';

export interface DiagnosticsReport {
  renderTime: number;
  formulaTime: number;
  ruleTime: number;
  layoutTime: number;
  componentCount: number;
  pipelineMetrics: PipelineMetrics[];
  warnings: string[];
  errors: string[];
  memoryEstimate: number;
}

class DiagnosticsService {
  private _enabled = false;
  private _metrics: DiagnosticsReport[] = [];

  enable(): void { this._enabled = true; }
  disable(): void { this._enabled = false; }
  get enabled(): boolean { return this._enabled; }

  capture(): DiagnosticsReport {
    const pipelineMetrics = renderingPipeline.metrics();
    const renderTime = pipelineMetrics.reduce((s, m) => s + m.elapsedMs, 0);
    const formulaTime = pipelineMetrics.find(m => m.stage === 'compile')?.elapsedMs ?? 0;
    const ruleTime = pipelineMetrics.find(m => m.stage === 'optimize')?.elapsedMs ?? 0;
    const layoutTime = pipelineMetrics.find(m => m.stage === 'layout')?.elapsedMs ?? 0;

    const report: DiagnosticsReport = {
      renderTime,
      formulaTime,
      ruleTime,
      layoutTime,
      componentCount: 0,
      pipelineMetrics,
      warnings: pipelineMetrics.flatMap(m => m.warnings ?? []),
      errors: [],
      memoryEstimate: Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 0,
    };

    this._metrics.push(report);
    if (this._metrics.length > 100) this._metrics.shift();
    return report;
  }

  history(): DiagnosticsReport[] {
    return [...this._metrics];
  }

  clear(): void {
    this._metrics = [];
    renderingPipeline.clearMetrics();
  }
}

export const diagnosticsService = new DiagnosticsService();
