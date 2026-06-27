// ════════════════════════════════════════════════════════════════════════════
// reporting/core/engines/RulesEngine.ts
//
// Layer 1 — zero dependencies. Pure TypeScript.
//
// Evaluates declarative conditions to determine show/hide, highlight,
// and disable rules for report elements.
// ════════════════════════════════════════════════════════════════════════════

import type { FormulaEngine, EvaluationContext } from './FormulaEngine';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RuleAction = 'show' | 'hide' | 'highlight' | 'disable';

export interface ReportRule {
  id: string;
  /** Formula expression string evaluated by FormulaEngine */
  condition: string;
  action: RuleAction;
  /** Section or element ID this rule applies to */
  target: string;
  /** Rule ordering — higher priority runs later (default 0) */
  priority?: number;
  /** For highlight action: CSS properties to apply */
  highlightStyle?: Record<string, string>;
}

export interface RuleEvaluationResult {
  /** Per-element visibility: true = visible, false = hidden */
  visibility: Record<string, boolean>;
  /** Per-element highlight styles */
  highlights: Record<string, Record<string, string>>;
  /** Per-element disabled state: true = disabled */
  disabled: Record<string, boolean>;
}

// ─── RulesEngine ───────────────────────────────────────────────────────────────

export class RulesEngine {
  /**
   * Evaluate a set of rules against the given context.
   * Rules are sorted by priority before evaluation.
   * Later rules override earlier ones for the same target.
   * Failed condition evaluations are skipped gracefully.
   */
  evaluate(
    rules: ReportRule[],
    context: EvaluationContext,
    formulaEngine: FormulaEngine,
  ): RuleEvaluationResult {
    const result = this.emptyResult();

    const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const rule of sorted) {
      try {
        const raw = formulaEngine.evaluate(rule.condition, context);
        const truthy = raw !== null && raw !== 0 && raw !== '' && raw !== false;

        if (!truthy) continue;

        this.applyAction(result, rule);
      } catch {
        // Failed condition evaluation — skip rule gracefully
      }
    }

    return result;
  }

  /**
   * Merge multiple results. Later results override earlier ones.
   */
  merge(base: RuleEvaluationResult, overrides: RuleEvaluationResult): RuleEvaluationResult {
    return {
      visibility: { ...base.visibility, ...overrides.visibility },
      highlights: this.mergeHighlights(base.highlights, overrides.highlights),
      disabled: { ...base.disabled, ...overrides.disabled },
    };
  }

  /**
   * Default result: everything visible, nothing highlighted, nothing disabled.
   */
  emptyResult(): RuleEvaluationResult {
    return {
      visibility: {},
      highlights: {},
      disabled: {},
    };
  }

  // ── Public (used by RulesEngineAdvanced) ────────────────────────────────────

  applyAction(result: RuleEvaluationResult, rule: ReportRule): void {
    switch (rule.action) {
      case 'show':
        result.visibility[rule.target] = true;
        break;

      case 'hide':
        result.visibility[rule.target] = false;
        break;

      case 'highlight':
        if (rule.highlightStyle) {
          const existing = result.highlights[rule.target];
          if (existing) {
            Object.assign(existing, rule.highlightStyle);
          } else {
            result.highlights[rule.target] = { ...rule.highlightStyle };
          }
        }
        break;

      case 'disable':
        result.disabled[rule.target] = true;
        break;
    }
  }

  private mergeHighlights(
    base: Record<string, Record<string, string>>,
    overrides: Record<string, Record<string, string>>,
  ): Record<string, Record<string, string>> {
    const merged: Record<string, Record<string, string>> = {};

    for (const [key, styles] of Object.entries(base)) {
      merged[key] = { ...styles };
    }

    for (const [key, styles] of Object.entries(overrides)) {
      if (merged[key]) {
        Object.assign(merged[key], styles);
      } else {
        merged[key] = { ...styles };
      }
    }

    return merged;
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

export const rulesEngine = new RulesEngine();
