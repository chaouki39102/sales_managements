import React, { useMemo, useEffect, useState, useCallback } from 'react';
import type { UniversalDocumentData } from '../../types/data';
import type { PrintTemplate, SectionTarget, AlignOption } from '../../types';
import {
  mm, fontFamily, SectionWrap,
} from './shared';
import { pageBoxMm } from '../../services/freeformGeometry';
import { PrintPageProvider } from './PrintPageContext';
import { renderHeader } from './HeaderSection';
import { renderDocInfo } from './DocInfoSection';
import { renderItems } from './ItemsSection';
import { renderTotals } from './TotalsSection';
import { renderPayments } from './PaymentsSection';
import { renderFooter } from './FooterSection';
import { renderReport } from './ReportSection';
import DeliveryReceiptA5 from './DeliveryReceiptA5';
import { PageFrame } from './PageFrame';
import StickerLabel from './StickerLabel';
import { isStickerPaper, stickerDims } from './stickerDims';
import { formulaEngine } from '../../services/engines/FormulaEngine';
import {
  computeRuleResult, getOrderedSections, showSection,
  sectionHighlight, sectionWidthPct, sectionAlign,
} from './previewHelpers';

export interface UniversalPreviewProps {
  tpl:      PrintTemplate;
  data:     UniversalDocumentData;
}

export interface SectionRendererProps {
  tpl: PrintTemplate;
  data: UniversalDocumentData;
  isThermal: boolean;
  paperWidth: number;
  widthPct: number;
  align: AlignOption;
}

export const SECTION_RENDERERS: Record<SectionTarget, (props: SectionRendererProps) => React.ReactNode> = {
  'header':   (p) => wrapSection(p, renderHeader(p.tpl, p.data, p.isThermal, p.paperWidth)),
  'doc-info': (p) => wrapSection(p, renderDocInfo(p.tpl, p.data, p.isThermal)),
  'items':    (p) => wrapSection(p, renderItems(p.tpl, p.data, p.isThermal)),
  'totals':   (p) => wrapSection(p, renderTotals(p.tpl, p.data, p.isThermal)),
  'payments': (p) => wrapSection(p, renderPayments(p.tpl, p.data, p.isThermal)),
  'footer':   (p) => wrapSection(p, renderFooter(p.tpl, p.data, p.isThermal)),
};

export function wrapSection({ widthPct, align }: SectionRendererProps, content: React.ReactNode) {
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
    const sd = isStickerPaper(sz) ? stickerDims(sz) : null;
    const w = sz === 'A4' ? (landscape ? '297mm' : '210mm') : sz === 'A5' ? (landscape ? '210mm' : '148mm') : sd ? `${Math.round(sd.w / 8)}mm` : sz === '80mm' ? '80mm' : '58mm';
    const h = sz === 'A4' ? (landscape ? '210mm' : '297mm') : sz === 'A5' ? (landscape ? '148mm' : '210mm') : sd ? `${Math.round(sd.h / 8)}mm` : 'auto';
    el.textContent = `
      @page { size: ${w} ${h}; margin: 0; }
      body * { visibility: hidden !important; }
      .ps-preview-wrapper { position: absolute !important; left: 0 !important; top: 0 !important; }
      .ps-preview-wrapper, .ps-preview-wrapper * { visibility: visible !important; }
      /* The wrapper IS the page (border-box width/min-height already equal the
         sheet), so the sheet margins live in its padding and @page must NOT
         add them again. Printing the wrapper in exact millimetres is what keeps
         screen and paper identical. */
      .ps-preview-wrapper {
        width: ${w} !important;
        min-height: ${h === 'auto' ? 'auto' : h} !important;
        padding: ${tpl.margin_top ?? 5}mm ${tpl.margin_sides ?? 5}mm ${tpl.margin_bottom ?? 5}mm !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
      .ps-freeform-layer { position: absolute !important; inset: 0 !important; }
    `;
    return () => { if (el?.parentNode) el.parentNode.removeChild(el); };
  }, [tpl.paper_size, tpl.page_orientation, tpl.margin_top, tpl.margin_sides, tpl.margin_bottom]);

  const isThermal   = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
  const isA4        = tpl.paper_size === 'A4';
  const _isA5        = tpl.paper_size === 'A5'; void _isA5;
  const isLabel     = isStickerPaper(tpl.paper_size);
  const isDeliveryA5 = tpl.doc_type_code === 'BL' && tpl.paper_size === 'A5';
  const isSticker = tpl.doc_type_code === 'STK';
  const isLandscape = !isThermal && tpl.page_orientation === 'landscape';
  const labelDims   = isSticker && isLabel ? stickerDims(tpl.paper_size) : null;

  // A4 screen size is derived from the SAME 3.78 px/mm the freeform geometry
  // uses, so a millimetre position on screen lands on the same millimetre on
  // paper (210mm is exactly 210 * 3.78px, not a rounded 794px stand-in).
  const portraitW = isA4 ? mm(210) : labelDims ? labelDims.w : 559;
  const portraitH = isA4 ? mm(297) : labelDims ? labelDims.h : 794;
  const paperWidth   = isThermal ? tpl.paper_width_mm * 3.78 : (isLandscape ? portraitH : portraitW);
  const minHeight    = isThermal ? 'auto' : (isLandscape ? portraitW : portraitH);

  const ruleResult = useMemo(() => computeRuleResult(tpl, data), [tpl.rules, data]);

  const paddingTop   = mm(tpl.margin_top);
  const paddingSide  = mm(tpl.margin_sides);
  const paddingBottom = mm(tpl.margin_bottom);

  const orderedSections = getOrderedSections(tpl);

  const frameConfig = tpl.page_frame;

  const watermark = tpl.watermark;

  // Page box (paper + margins) in mm, shared with every `Pos` wrapper so fixed
  // geometry is measured against the SHEET rather than a nested section.
  const box = useMemo(
    () => pageBoxMm(tpl),
    [tpl.paper_size, tpl.page_orientation, tpl.margin_top, tpl.margin_sides, tpl.margin_bottom, tpl.paper_width_mm],
  );

  // The freeform layer is always mounted (even with no geometry yet) so the very
  // first drag has a portal target and does not need a second render pass.
  const [layerEl, setLayerEl] = useState<HTMLElement | null>(null);
  const setLayerRef = useCallback((el: HTMLElement | null) => setLayerEl(el), []);
  const pageValue = useMemo(() => ({ box, layerEl, setLayerEl }), [box, layerEl]);

  return (
    <PrintPageProvider value={pageValue}>
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
              if (!showSection(tpl, meta.key, ruleResult, orderedSections)) return null;
              const renderer = SECTION_RENDERERS[meta.key];
              if (!renderer) return null;
              return (
                <SectionWrap key={meta.key} highlight={sectionHighlight(ruleResult, meta.key)} style={{ marginTop: meta.marginTop ?? 0, marginBottom: meta.marginBottom ?? 0 }}>
                  {renderer({ tpl, data, isThermal, paperWidth, widthPct: sectionWidthPct(tpl, meta.key, isThermal), align: sectionAlign(tpl, meta.key) })}
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
      {/* Freeform layer: sits on the sheet, NOT inside a section, so an
          absolutely positioned element is never offset by an ancestor and never
          clipped by a section's overflow. Pointer-transparent so the flow
          content underneath stays interactive; the fixed boxes opt back in. */}
      <div ref={setLayerRef} className="ps-freeform-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }} />
    </div>
    </PrintPageProvider>
  );
}

export default React.memo(UniversalPreview);
