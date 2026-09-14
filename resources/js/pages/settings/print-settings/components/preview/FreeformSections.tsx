import React from 'react';
import type { UniversalDocumentData } from '../../types/data';
import type { PrintTemplate, SectionTarget, SectionPosition } from '../../types';
import { SectionWrap } from './shared';
import { renderHeader } from './HeaderSection';
import { renderDocInfo } from './DocInfoSection';
import { renderItems } from './ItemsSection';
import { renderTotals } from './TotalsSection';
import { renderPayments } from './PaymentsSection';
import { renderFooter } from './FooterSection';
import { renderReport } from './ReportSection';
import {
  computeRuleResult, getOrderedSections, showSection,
  sectionHighlight, sectionPositionOf,
} from './previewHelpers';

export interface FreeformSectionsProps {
  tpl: PrintTemplate;
  data: UniversalDocumentData;
  paperWidth: number;
  /** Hook for the designer stage: attach DOM hooks (data attrs / refs / handlers)
   *  to each freeform block. Merged onto the block wrapper div. */
  blockProps?: (key: SectionTarget, pos: SectionPosition) => Record<string, unknown>;
}

interface FreeRendererProps {
  tpl: PrintTemplate;
  data: UniversalDocumentData;
  paperWidth: number;
}

const FREE_RENDERERS: Record<SectionTarget, (p: FreeRendererProps) => React.ReactNode> = {
  'header':   (p) => renderHeader(p.tpl, p.data, false, p.paperWidth),
  'doc-info': (p) => renderDocInfo(p.tpl, p.data, false),
  'items':    (p) => renderItems(p.tpl, p.data, false),
  'totals':   (p) => renderTotals(p.tpl, p.data, false),
  'payments': (p) => renderPayments(p.tpl, p.data, false),
  'footer':   (p) => renderFooter(p.tpl, p.data, false),
};

/**
 * Freeform A4 block layout: every visible section is absolutely positioned
 * inside the relative stage using its saved SectionPosition (percent of the
 * content box). Ignores the flow layout's width/align settings — positions.width
 * is authoritative. Uses the raw section renderers (isThermal always false) with
 * SectionWrap applying rule highlights directly onto the positioned block.
 */
export default function FreeformSections({ tpl, data, paperWidth, blockProps }: FreeformSectionsProps) {
  const orderedSections = getOrderedSections(tpl);
  const ruleResult = computeRuleResult(tpl, data);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {orderedSections.map(meta => {
        if (!showSection(tpl, meta.key, ruleResult, orderedSections)) return null;
        const pos = sectionPositionOf(tpl, meta.key);
        if (!pos) return null;
        const renderer = FREE_RENDERERS[meta.key];
        if (!renderer) return null;
        const extra = blockProps?.(meta.key, pos) ?? {};
        const { style: extraStyle, ...extraProps } = extra as { style?: React.CSSProperties } & Record<string, unknown>;
        return (
          <div key={meta.key} data-freeform-block={meta.key} {...extraProps}>
            <SectionWrap
              highlight={sectionHighlight(ruleResult, meta.key)}
              style={{
                position: 'absolute',
                right: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.width}%`,
                ...extraStyle,
              }}
            >
              {renderer({ tpl, data, paperWidth })}
            </SectionWrap>
          </div>
        );
      })}
      {data.report && renderReport(tpl, data, false, paperWidth)}
    </div>
  );
}