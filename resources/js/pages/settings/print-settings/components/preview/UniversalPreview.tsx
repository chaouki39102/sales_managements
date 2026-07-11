import React, { useMemo, useEffect } from 'react';
import type { UniversalDocumentData } from '../../types/data';
import type { PrintTemplate } from '../../types';
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

function UniversalPreview({ tpl, data }: UniversalPreviewProps) {
  useEffect(() => { formulaEngine.clearCache(); }, [data]);

  const isThermal   = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
  const isA4        = tpl.paper_size === 'A4';
  const isA5        = tpl.paper_size === 'A5';
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

  const paddingTop   = isThermal ? mm(tpl.margin_top) : (isA4 ? 40 : 20);
  const paddingSide  = isThermal ? mm(tpl.margin_sides) : (isA4 ? 50 : 24);
  const paddingBottom = isThermal ? mm(tpl.margin_bottom) : (isA4 ? 40 : 20);

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
      {tpl.show_header_section && sectionVisible('header') && (
        <SectionWrap highlight={sectionHighlight('header')}>
          {renderHeader(tpl, data, isThermal, paperWidth)}
        </SectionWrap>
      )}
      {tpl.show_doc_info_section && sectionVisible('doc-info') && (
        <SectionWrap highlight={sectionHighlight('doc-info')}>
          {renderDocInfo(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_items_section && sectionVisible('items') && (
        <SectionWrap highlight={sectionHighlight('items')}>
          {renderItems(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {data.report && renderReport(tpl, data, isThermal, paperWidth)}
      {tpl.show_totals_section && sectionVisible('totals') && (
        <SectionWrap highlight={sectionHighlight('totals')}>
          {renderTotals(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_payments_section && sectionVisible('payments') && (
        <SectionWrap highlight={sectionHighlight('payments')}>
          {renderPayments(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_footer_section && sectionVisible('footer') && (
        <SectionWrap highlight={sectionHighlight('footer')}>
          {renderFooter(tpl, data, isThermal)}
        </SectionWrap>
      )}
    </div>
  );
}

export default React.memo(UniversalPreview);
