import { rulesEngine, type ReportRule, type RuleEvaluationResult, type RuleAction } from './RulesEngine';
import { formulaEngine, type EvaluationContext } from './FormulaEngine';

// ظ¤ظ¤ظ¤ Extended Types ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

export type RuleCombiner = 'AND' | 'OR';

export interface RuleGroup {
  id: string;
  label?: string;
  combiner: RuleCombiner;
  rules: ReportRule[];
  priority?: number;
  enabled?: boolean;
}

export interface NestedRule extends ReportRule {
  children?: ReportRule[];
  elseRule?: ReportRule;
  elseIfRules?: Array<{ condition: string; action: RuleAction; target: string; highlightStyle?: Record<string, string> }>;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description?: string;
  condition: string;
  action: RuleAction;
  target: string;
  highlightStyle?: Record<string, string>;
  category?: string;
}

export interface RuleVariable {
  name: string;
  expression: string;
  description?: string;
}

export interface AdvancedRuleConfig {
  groups?: RuleGroup[];
  variables?: RuleVariable[];
  templates?: RuleTemplate[];
}

export interface RuleDebugStep {
  ruleId: string;
  condition: string;
  evaluated: boolean;
  result: boolean | null;
  target: string;
  action: RuleAction;
  elapsedMs: number;
}

export interface RuleDebugResult {
  steps: RuleDebugStep[];
  finalResult: RuleEvaluationResult;
  totalElapsedMs: number;
}

export interface RuleSimulationInput {
  ruleId: string;
  overrides: Record<string, unknown>;
}

// ظ¤ظ¤ظ¤ Advanced RulesEngine ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

class RulesEngineAdvancedService {
  private _templates = new Map<string, RuleTemplate>();
  private _cache = new Map<string, { result: RuleEvaluationResult; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 seconds

  // ظ¤ظ¤ Template Management ظ¤ظ¤

  registerTemplate(template: RuleTemplate): void {
    this._templates.set(template.id, template);
  }

  getTemplate(id: string): RuleTemplate | undefined {
    return this._templates.get(id);
  }

  templates(): RuleTemplate[] {
    return Array.from(this._templates.values());
  }

  createRuleFromTemplate(templateId: string, overrides?: Partial<ReportRule>): ReportRule | null {
    const template = this._templates.get(templateId);
    if (!template) return null;
    return {
      id: overrides?.id ?? `${template.id}_${Date.now()}`,
      condition: overrides?.condition ?? template.condition,
      action: overrides?.action ?? template.action,
      target: overrides?.target ?? template.target,
      priority: overrides?.priority ?? 0,
      highlightStyle: overrides?.highlightStyle ?? template.highlightStyle,
    };
  }

  // ظ¤ظ¤ Variables ظ¤ظ¤

  evaluateVariables(variables: RuleVariable[], context: EvaluationContext): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const v of variables) {
      try {
        result[v.name] = formulaEngine.evaluate(v.expression, context);
      } catch {
        result[v.name] = null;
      }
    }
    return result;
  }

  // ظ¤ظ¤ Groups ظ¤ظ¤

  evaluateGroups(groups: RuleGroup[], context: EvaluationContext): RuleEvaluationResult {
    const sorted = [...groups].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    let finalResult = rulesEngine.emptyResult();

    for (const group of sorted) {
      if (group.enabled === false) continue;
      let groupResult: RuleEvaluationResult;

      if (group.combiner === 'AND') {
        groupResult = this._evaluateAndGroup(group, context);
      } else {
        groupResult = this._evaluateOrGroup(group, context);
      }

      finalResult = rulesEngine.merge(finalResult, groupResult);
    }

    return finalResult;
  }

  // ظ¤ظ¤ Nested Rules ظ¤ظ¤

  evaluateNested(rules: NestedRule[], context: EvaluationContext): RuleEvaluationResult {
    let result = rulesEngine.emptyResult();
    const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const rule of sorted) {
      const evaluated = this._evaluateNestedRule(rule, context);
      result = rulesEngine.merge(result, evaluated);
    }

    return result;
  }

  // ظ¤ظ¤ Debugger ظ¤ظ¤

  debug(rules: ReportRule[], context: EvaluationContext, variables?: RuleVariable[]): RuleDebugResult {
    const steps: RuleDebugStep[] = [];
    let finalResult = rulesEngine.emptyResult();
    const start = performance.now();

    const tempCtx = { ...context };
    if (variables) {
      const varValues = this.evaluateVariables(variables, tempCtx);
      tempCtx.computed = { ...tempCtx.computed, ...varValues };
    }

    const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const rule of sorted) {
      const stepStart = performance.now();
      let evaluated = false;
      let result: boolean | null = null;

      try {
        const raw = formulaEngine.evaluate(rule.condition, tempCtx);
        result = raw !== null && raw !== 0 && raw !== '' && raw !== false;
        evaluated = true;
      } catch {
        evaluated = false;
        result = null;
      }

      if (evaluated && result) {
        rulesEngine.applyAction(finalResult, rule);
      }

      steps.push({
        ruleId: rule.id,
        condition: rule.condition,
        evaluated,
        result,
        target: rule.target,
        action: rule.action,
        elapsedMs: performance.now() - stepStart,
      });
    }

    return {
      steps,
      finalResult,
      totalElapsedMs: performance.now() - start,
    };
  }

  // ظ¤ظ¤ Simulation ظ¤ظ¤

  simulate(simInput: RuleSimulationInput[], originalRules: ReportRule[], context: EvaluationContext): RuleEvaluationResult {
    const modifiedRules = originalRules.map(rule => {
      const sim = simInput.find(s => s.ruleId === rule.id);
      if (!sim) return rule;
      const simContext: EvaluationContext = {
        ...context,
        data: this._deepMerge(context.data, sim.overrides),
      };
      try {
        const raw = formulaEngine.evaluate(rule.condition, simContext);
        const truthy = raw !== null && raw !== 0 && raw !== '' && raw !== false;
        if (truthy) return rule;
        return { ...rule, condition: 'false' };
      } catch {
        return { ...rule, condition: 'false' };
      }
    });

    return rulesEngine.evaluate(modifiedRules, context, formulaEngine);
  }

  // ظ¤ظ¤ Cache ظ¤ظ¤

  clearCache(): void {
    this._cache.clear();
  }

  invalidateCache(ruleId?: string): void {
    if (ruleId) {
      for (const [key] of this._cache) {
        if (key.startsWith(ruleId)) this._cache.delete(key);
      }
    } else {
      this._cache.clear();
    }
  }

  // ظ¤ظ¤ Private ظ¤ظ¤

  private _evaluateAndGroup(group: RuleGroup, context: EvaluationContext): RuleEvaluationResult {
    let result = rulesEngine.emptyResult();
    for (const rule of group.rules) {
      try {
        const raw = formulaEngine.evaluate(rule.condition, context);
        const truthy = raw !== null && raw !== 0 && raw !== '' && raw !== false;
        if (!truthy) return rulesEngine.emptyResult();
        rulesEngine.applyAction(result, rule);
      } catch {
        return rulesEngine.emptyResult();
      }
    }
    return result;
  }

  private _evaluateOrGroup(group: RuleGroup, context: EvaluationContext): RuleEvaluationResult {
    for (const rule of group.rules) {
      try {
        const raw = formulaEngine.evaluate(rule.condition, context);
        const truthy = raw !== null && raw !== 0 && raw !== '' && raw !== false;
        if (truthy) {
          const result = rulesEngine.emptyResult();
          rulesEngine.applyAction(result, rule);
          return result;
        }
      } catch {
        continue;
      }
    }
    return rulesEngine.emptyResult();
  }

  private _evaluateNestedRule(rule: NestedRule, context: EvaluationContext): RuleEvaluationResult {
    let result = rulesEngine.emptyResult();

    try {
      const raw = formulaEngine.evaluate(rule.condition, context);
      const truthy = raw !== null && raw !== 0 && raw !== '' && raw !== false;

      if (truthy) {
        rulesEngine.applyAction(result, rule);

        if (rule.children && rule.children.length > 0) {
          const childResult = this.evaluateNested(
            rule.children.map(c => ({ ...c, priority: (rule.priority ?? 0) + 1 })),
            context,
          );
          result = rulesEngine.merge(result, childResult);
        }
      } else {
        // Else-If chain
        if (rule.elseIfRules && rule.elseIfRules.length > 0) {
          for (const ei of rule.elseIfRules) {
            try {
              const eiRaw = formulaEngine.evaluate(ei.condition, context);
              const eiTruthy = eiRaw !== null && eiRaw !== 0 && eiRaw !== '' && eiRaw !== false;
              if (eiTruthy) {
                rulesEngine.applyAction(result, { ...rule, action: ei.action, target: ei.target, highlightStyle: ei.highlightStyle });
                break;
              }
            } catch { continue; }
          }
        }

        // Else rule
        if (rule.elseRule) {
          rulesEngine.applyAction(result, rule.elseRule);
          if (rule.elseRule.children) {
            const elseChildResult = this.evaluateNested(
              rule.elseRule.children.map(c => ({ ...c, priority: (rule.priority ?? 0) + 1 })),
              context,
            );
            result = rulesEngine.merge(result, elseChildResult);
          }
        }
      }
    } catch {
      // Skip failed rule
    }

    return result;
  }

  private _deepMerge(target: any, source: Record<string, unknown>): any {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this._deepMerge(result[key] ?? {}, value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

export const rulesEngineAdvanced = new RulesEngineAdvancedService();
