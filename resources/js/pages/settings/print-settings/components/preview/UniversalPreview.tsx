import React, { useMemo, useEffect } from 'react';
import type { UniversalDocumentData } from '../../types/data';
import type { PrintTemplate, SectionTarget } from '../../types';
import {
  mm, fontFamily, SectionWrap,
} from './shared';
import { renderHeader } from './HeaderSection';
import { renderDocInfo } from './DocInfoSection';
import { renderItems } from './ItemsSection';
import { renderTotals } from './TotalsSection';
import { renderPayments } from './PaymentsSection';
import { renderFooter } from './FooterSection';
import { renderReport } from './ReportSection';
import { rulesEngine } from '../../services/engines/RulesEngine';
import { formulaEngine, type EvaluationContext, type ExpressionValue } from '../../services/engines/FormulaEngine';
import { calculatedFieldService } from '../../services/CalculatedFieldService';
import { PageFrame } from './PageFrame';

export interface UniversalPreviewProps {
  tpl:      PrintTemplate;
  data:     UniversalDocumentData;
}

function buildEvalContext(data: UniversalDocumentData): EvaluationContext {
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

const SECTION_RENDERERS: Record<SectionTarget, (tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean, paperWidth: number) => React.ReactNode> = {
  'header':   (tpl, data, isThermal, pw) => renderHeader(tpl, data, isThermal, pw),
  'doc-info': (tpl, data, isThermal)     => renderDocInfo(tpl, data, isThermal),
  'items':    (tpl, data, isThermal)     => renderItems(tpl, data, isThermal),
  'totals':   (tpl, data, isThermal)     => renderTotals(tpl, data, isThermal),
  'payments': (tpl, data, isThermal)     => renderPayments(tpl, data, isThermal),
  'footer':   (tpl, data, isThermal)     => renderFooter(tpl, data, isThermal),
};

function UniversalPreview({ tpl, data }: UniversalPreviewProps) {
  useEffect(() => { formulaEngine.clearCache(); }, [data]);

  const isThermal   = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
  const isA4        = tpl.paper_size === 'A4';
  const _isA5        = tpl.paper_size === 'A5';
  const isLandscape = !isThermal && tpl.page_orientation === 'landscape';

  const portraitW = isA4 ? 794 : 559;
  const portraitH = isA4 ? 1123 : 794;
  const paperWidth   = isThermal ? tpl.paper_width_mm * 3.78 : (isLandscape ? portraitH : portraitW);
  const minHeight    = isThermal ? 'auto' : (isLandscape ? portraitW : portraitH);

  const ruleResult = useMemo(() => {
    if (!tpl.rules || tpl.rules.length === 0) return null;
    try {
      const ctx = buildEvalContext(data);
      return rulesEngine.evaluate(tpl.rules, ctx, formulaEngine);
    } catch {
      return null;
    }
  }, [tpl.rules, data]);

  const sectionVisible = (section: string): boolean => {
    if (ruleResult && ruleResult.visibility[section] === false) return false;
    return true;
  };

  const sectionHighlight = (section: string): Record<string, string> | null => {
    if (ruleResult && ruleResult.highlights[section]) return ruleResult.highlights[section];
    return null;
  };

  const paddingTop   = mm(tpl.margin_top);
  const paddingSide  = mm(tpl.margin_sides);
  const paddingBottom = mm(tpl.margin_bottom);

  const orderedSections = tpl.sections_order
    ? [...tpl.sections_order].sort((a, b) => a.order - b.order)
    : [];

  const showSection = (key: SectionTarget): boolean => {
    const visibilityKey = `show_${key.replace('-', '_')}_section` as keyof PrintTemplate;
    if (visibilityKey in tpl && !(tpl as any)[visibilityKey]) return false;
    if (!sectionVisible(key)) return false;
    const meta = orderedSections.find(s => s.key === key);
    if (meta && !meta.visible) return false;
    return true;
  };

  const frameConfig = tpl.page_frame;

  return (
    <div style={{
      width: paperWidth,
      direction: 'rtl',
      fontFamily: fontFamily(tpl.font_family),
      fontSize: tpl.base_font_size,
      lineHeight: tpl.line_spacing,
      padding: `${paddingTop}px ${paddingSide}px ${paddingBottom}px`,
      background: '#fff',
      color: '#111',
      margin: '0 auto',
      minHeight,
      boxSizing: 'border-box',
    }}>
      <PageFrame config={frameConfig ?? { enabled: false }} tpl={tpl}>
        {orderedSections.map(meta => {
          if (!showSection(meta.key)) return null;
          const renderer = SECTION_RENDERERS[meta.key];
          if (!renderer) return null;
          return (
            <SectionWrap key={meta.key} highlight={sectionHighlight(meta.key)}>
              {renderer(tpl, data, isThermal, paperWidth)}
            </SectionWrap>
          );
        })}
        {data.report && renderReport(tpl, data, isThermal, paperWidth)}
      </PageFrame>
    </div>
  );
}

export default React.memo(UniversalPreview);
