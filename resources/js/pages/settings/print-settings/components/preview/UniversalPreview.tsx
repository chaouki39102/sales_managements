import React, { useMemo, useEffect } from 'react';
import type { UniversalDocumentData } from '../../types/data';
import type { PrintTemplate, SectionTarget, AlignOption } from '../../types';
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
import DeliveryReceiptA5 from './DeliveryReceiptA5';
import { rulesEngine } from '../../services/engines/RulesEngine';
import { formulaEngine, type EvaluationContext, type ExpressionValue } from '../../services/engines/FormulaEngine';
import { calculatedFieldService } from '../../services/CalculatedFieldService';
import { PageFrame } from './PageFrame';
import StickerLabel from './StickerLabel';

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

interface SectionRendererProps {
  tpl: PrintTemplate;
  data: UniversalDocumentData;
  isThermal: boolean;
  paperWidth: number;
  widthPct: number;
  align: AlignOption;
}

const SECTION_RENDERERS: Record<SectionTarget, (props: SectionRendererProps) => React.ReactNode> = {
  'header':   (p) => wrapSection(p, renderHeader(p.tpl, p.data, p.isThermal, p.paperWidth)),
  'doc-info': (p) => wrapSection(p, renderDocInfo(p.tpl, p.data, p.isThermal)),
  'items':    (p) => wrapSection(p, renderItems(p.tpl, p.data, p.isThermal)),
  'totals':   (p) => wrapSection(p, renderTotals(p.tpl, p.data, p.isThermal)),
  'payments': (p) => wrapSection(p, renderPayments(p.tpl, p.data, p.isThermal)),
  'footer':   (p) => wrapSection(p, renderFooter(p.tpl, p.data, p.isThermal)),
};

function wrapSection({ widthPct, align }: SectionRendererProps, content: React.ReactNode) {
  const marginSide = align === 'center' ? 'auto' : align === 'left' ? '0 0 0 auto' : '0 auto 0 0';
  return (
    <div style={{
      width: `${widthPct}%`,
      margin: marginSide,
      overflow: 'hidden',
    }}>
      {content}
    </div>
  );
}

const SECTION_DIM_SETTINGS: Record<SectionTarget, { w: keyof PrintTemplate; a: keyof PrintTemplate }> = {
  'header':   { w: 'section_header_width',   a: 'section_header_align'   },
  'doc-info': { w: 'section_doc_info_width', a: 'section_doc_info_align' },
  'items':    { w: 'section_items_width',    a: 'section_items_align'    },
  'totals':   { w: 'section_totals_width',   a: 'section_totals_align'   },
  'payments': { w: 'section_header_width',   a: 'section_header_align'   },
  'footer':   { w: 'section_footer_width',   a: 'section_footer_align'   },
};

const PRINT_CSS_ID = 'ps-print-styles';

function UniversalPreview({ tpl, data }: UniversalPreviewProps) {
  useEffect(() => { formulaEngine.clearCache(); }, [data]);
  useEffect(() => {
    let el = document.getElementById(PRINT_CSS_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = PRINT_CSS_ID;
      el.setAttribute('media', 'print');
      document.head.appendChild(el);
    }
    const sz = tpl.paper_size;
    const landscape = !['80mm','58mm'].includes(sz) && tpl.page_orientation === 'landscape';
    const w = sz === 'A4' ? (landscape ? '297mm' : '210mm') : sz === 'A5' ? (landscape ? '210mm' : '148mm') : sz === '40x20mm' ? '40mm' : sz === '80mm' ? '80mm' : '58mm';
    const h = sz === 'A4' ? (landscape ? '210mm' : '297mm') : sz === 'A5' ? (landscape ? '148mm' : '210mm') : sz === '40x20mm' ? '20mm' : 'auto';
    el.textContent = `
      @page { size: ${w} ${h}; margin: ${tpl.margin_top ?? 5}mm ${tpl.margin_sides ?? 5}mm ${tpl.margin_bottom ?? 5}mm; }
      body * { visibility: hidden !important; }
      .ps-preview-wrapper { position: absolute !important; left: 0 !important; top: 0 !important; }
      .ps-preview-wrapper, .ps-preview-wrapper * { visibility: visible !important; }
      .ps-preview-inner { width: 100% !important; min-height: auto !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
    `;
    return () => { if (el?.parentNode) el.parentNode.removeChild(el); };
  }, [tpl.paper_size, tpl.page_orientation, tpl.margin_top, tpl.margin_sides, tpl.margin_bottom]);

  const isThermal   = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
  const isA4        = tpl.paper_size === 'A4';
  const _isA5        = tpl.paper_size === 'A5';
  const isLabel     = tpl.paper_size === '40x20mm';
  const isDeliveryA5 = tpl.doc_type_code === 'BL' && tpl.paper_size === 'A5';
  const isSticker = tpl.doc_type_code === 'STK';
  const isLandscape = !isThermal && tpl.page_orientation === 'landscape';

  const portraitW = isA4 ? 794 : isLabel ? 320 : 559;
  const portraitH = isA4 ? 1123 : isLabel ? 160 : 794;
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

  const watermark = tpl.watermark;

  return (
    <div className="ps-preview-wrapper" style={{
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
      position: 'relative',
    }}>
      <PageFrame config={frameConfig ?? { enabled: false }} tpl={tpl}>
        {isDeliveryA5 ? (
          <DeliveryReceiptA5 tpl={tpl} data={data} />
        ) : isSticker ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            {data.lines.map((line, idx) => (
              <div key={idx}
                style={{
                  pageBreakAfter: idx < data.lines.length - 1 ? 'always' as any : undefined,
                  breakAfter: idx < data.lines.length - 1 ? 'page' as any : undefined,
                }}>
                <StickerLabel tpl={tpl} data={{ ...data, lines: [line] }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {orderedSections.map(meta => {
              if (!showSection(meta.key)) return null;
              const renderer = SECTION_RENDERERS[meta.key];
              if (!renderer) return null;
              const dims = SECTION_DIM_SETTINGS[meta.key];
              const widthPct = dims ? Number((tpl as any)[dims.w]) || 100 : 100;
              const align = dims ? ((tpl as any)[dims.a] as AlignOption) || 'right' : 'right';
              return (
                <SectionWrap key={meta.key} highlight={sectionHighlight(meta.key)} style={{ marginTop: meta.marginTop ?? 0, marginBottom: meta.marginBottom ?? 0 }}>
                  {renderer({ tpl, data, isThermal, paperWidth, widthPct, align })}
                </SectionWrap>
              );
            })}
            {data.report && renderReport(tpl, data, isThermal, paperWidth)}
          </>
        )}
      </PageFrame>
      {watermark?.enabled && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${watermark.rotation ?? -30}deg)`,
          fontSize: watermark.fontSize ?? 60,
          color: watermark.color ?? 'rgba(0,0,0,0.06)',
          fontWeight: 900,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
        }}>
          {watermark.text || ''}
        </div>
      )}
    </div>
  );
}

export default React.memo(UniversalPreview);
