// Pure, React-free helpers shared by UniversalPreview (flow layout) and
// FreeformSections / A4DesignerStage (freeform block layout). No JSX, no
// component state — everything here is deterministic from (tpl, data).
import type { PrintTemplate, SectionTarget, AlignOption, SectionMeta, SectionPosition } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { rulesEngine, type RuleEvaluationResult } from '../../services/engines/RulesEngine';
import { formulaEngine, type EvaluationContext, type ExpressionValue } from '../../services/engines/FormulaEngine';
import { calculatedFieldService } from '../../services/CalculatedFieldService';

export function buildEvalContext(data: UniversalDocumentData): EvaluationContext {
  const t = data.totals;
  const computed: Record<string, ExpressionValue> = {
    totalHt:      t.totalHt,
    totalTva:     t.totalTva,
    totalTtc:     t.totalTtc,
    totalDiscount: t.totalDiscount,
    fiscalStamp:  t.fiscalStamp,
    paid:         t.paid,
    change:       t.change,
    remaining:    t.remaining,
    lineCount:    data.lines.length,
    itemCount:    data.lines.reduce((s, l) => s + (l.quantity || 0), 0),
    prevBalance:  data.balance?.previous ?? 0,
    newBalance:   data.balance?.current ?? 0,
    docNumber:    data.doc.number,
    docDate:      data.doc.date,
  };
  const calcFields = calculatedFieldService.computeAll(data);
  Object.assign(computed, calcFields);
  return { data, computed };
}

export function computeRuleResult(tpl: PrintTemplate, data: UniversalDocumentData): RuleEvaluationResult | null {
  if (!tpl.rules || tpl.rules.length === 0) return null;
  try {
    const ctx = buildEvalContext(data);
    return rulesEngine.evaluate(tpl.rules, ctx, formulaEngine);
  } catch {
    return null;
  }
}

export function sectionVisible(ruleResult: RuleEvaluationResult | null, section: string): boolean {
  if (ruleResult && ruleResult.visibility[section] === false) return false;
  return true;
}

export function sectionHighlight(ruleResult: RuleEvaluationResult | null, section: string): Record<string, string> | null {
  if (ruleResult && ruleResult.highlights[section]) return ruleResult.highlights[section];
  return null;
}

export function getOrderedSections(tpl: PrintTemplate): SectionMeta[] {
  return tpl.sections_order
    ? [...tpl.sections_order].sort((a, b) => a.order - b.order)
    : [];
}

export function showSection(
  tpl: PrintTemplate,
  key: SectionTarget,
  ruleResult: RuleEvaluationResult | null,
  orderedSections: SectionMeta[],
): boolean {
  const visibilityKey = `show_${key.replace('-', '_')}_section` as keyof PrintTemplate;
  if (visibilityKey in tpl && !(tpl as any)[visibilityKey]) return false;
  if (!sectionVisible(ruleResult, key)) return false;
  const meta = orderedSections.find(s => s.key === key);
  if (meta && !meta.visible) return false;
  return true;
}

/**
 * Registry of per-section width/align setting keys.
 * NOTE: `payments` has no dedicated settings yet — it reuses the header pair
 * (see task (d): add `section_payments_width` / `section_payments_align`).
 */
export const SECTION_DIM_SETTINGS: Record<SectionTarget, { w: keyof PrintTemplate; a: keyof PrintTemplate }> = {
  'header':   { w: 'section_header_width',   a: 'section_header_align'   },
  'doc-info': { w: 'section_doc_info_width', a: 'section_doc_info_align' },
  'items':    { w: 'section_items_width',    a: 'section_items_align'    },
  'totals':   { w: 'section_totals_width',   a: 'section_totals_align'   },
  'payments': { w: 'section_header_width',   a: 'section_header_align'   },
  'footer':   { w: 'section_footer_width',   a: 'section_footer_align'   },
};

export function sectionWidthPct(tpl: PrintTemplate, key: SectionTarget, isThermal: boolean): number {
  if (isThermal) return 100;
  const dims = SECTION_DIM_SETTINGS[key];
  return dims ? Number((tpl as any)[dims.w]) || 100 : 100;
}

export function sectionAlign(tpl: PrintTemplate, key: SectionTarget): AlignOption {
  const dims = SECTION_DIM_SETTINGS[key];
  return dims ? (((tpl as any)[dims.a] as AlignOption) || 'right') : 'right';
}

/**
 * A template uses the freeform block layout when it carries explicit block
 * positions on the A4 page. RPT (report) and STK (sticker) templates and any
 * non-A4 paper are always excluded — those keep their dedicated renderers.
 */
export function isFreeformTpl(tpl: PrintTemplate): boolean {
  if (tpl.doc_type_code === 'RPT' || tpl.doc_type_code === 'STK') return false;
  if (tpl.paper_size !== 'A4') return false;
  const positions = tpl.positions;
  if (!positions || Object.keys(positions).length === 0) return false;
  return true;
}

export function sectionPositionOf(tpl: PrintTemplate, key: SectionTarget): SectionPosition | undefined {
  return tpl.positions?.[key];
}