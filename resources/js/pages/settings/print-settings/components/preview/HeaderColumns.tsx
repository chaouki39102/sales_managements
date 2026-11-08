import React from 'react';
import type { PrintTemplate, HeaderLayout, LayoutBlock } from '../../types/domain';
import type { UniversalDocumentData } from '../../types/data';
import { renderLayoutRows, boxBorderCss, cellStyleCss } from './shared';
import type { AlignOption, CellStyle } from '../../types/domain';
import { printFieldResolver } from '../../services';

function spacingCss(p?: LayoutBlock['padding']): string {
  if (!p) return '4px 8px';
  return `${p.top}px ${p.start}px ${p.bottom}px ${p.end}px`;
}

function alignCss(a: LayoutBlock['align']): React.CSSProperties['textAlign'] {
  return a === 'start' ? 'right' : a === 'end' ? 'left' : 'center';
}

function renderBlockTitle(col: LayoutBlock, data: UniversalDocumentData, tpl: PrintTemplate) {
  if (!col.titleField) return null;
  const value = printFieldResolver.resolve(col.titleField, data, tpl);
  if (!value) return null;
  return <div style={{ marginBottom: 4, ...cellStyleCss(col.titleStyle as CellStyle) }}>{String(value)}</div>;
}

export function renderHeaderColumns(
  layout: HeaderLayout,
  data: UniversalDocumentData,
  tpl: PrintTemplate,
  paperWidth: number,
): JSX.Element | null {
  if (layout.mode !== 'columns' || layout.columns.length === 0) return null;

  const cols = layout.columns.filter(c => c.visible).sort((a, b) => a.order - b.order);
  if (cols.length === 0) return null;

  // Column widths are percentages of the CONTENT box. The row used to be sized
  // to the full paper width while sitting inside the page margins, so it was
  // 2×margin too wide and the last column (the invoice reference box) ran past
  // the margin and was clipped on paper.
  const evenWidth = 100 / cols.length;
  const rawTotal = cols.reduce((s, c) => s + (c.width ?? evenWidth), 0) || 100;
  const pct = (c: LayoutBlock) => ((c.width ?? evenWidth) / rawTotal) * 100;
  void paperWidth;

  return (
    <div style={{ display: 'flex', width: '100%', marginBottom: 16, alignItems: 'stretch', gap: 0 }}>
      {cols.map(col => {
        return (
          <div
            key={col.id}
            style={{
              width: `${pct(col)}%`,
              flex: `0 0 ${pct(col)}%`,
              boxSizing: 'border-box',
              textAlign: alignCss(col.align),
              padding: spacingCss(col.padding),
              background: col.background,
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              minWidth: 0,
              ...boxBorderCss(col.border),
            }}
          >
            {renderBlockTitle(col, data, tpl)}
            {renderLayoutRows(col.rows, data, tpl, { sectionAlign: (col.align === 'start' ? 'right' : col.align === 'end' ? 'left' : 'center') as AlignOption })}
          </div>
        );
      })}
    </div>
  );
}
