import React from 'react';
import { layoutEngine, type LayoutElement } from '../../engines/LayoutEngine';
import type { PrintTemplate, HeaderLayout, LayoutBlock } from '../../types/domain';
import type { UniversalDocumentData } from '../../types/data';
import { renderLayoutRows, boxBorderCss } from './shared';
import type { AlignOption } from '../../types/domain';

function spacingCss(p?: LayoutBlock['padding']): string {
  if (!p) return '4px 8px';
  return `${p.top}px ${p.start}px ${p.bottom}px ${p.end}px`;
}

function alignCss(a: LayoutBlock['align']): React.CSSProperties['textAlign'] {
  return a === 'start' ? 'right' : a === 'end' ? 'left' : 'center';
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

  const evenWidth = 100 / cols.length;
  const elements: LayoutElement[] = cols.map(col => ({
    id: col.id,
    type: 'text',
    mode: 'flex',
    width: ((col.width ?? evenWidth) / 100) * paperWidth,
    flexBasis: ((col.width ?? evenWidth) / 100) * paperWidth,
    height: 0,
    order: col.order,
  }));

  const computed = layoutEngine.compute(elements, paperWidth);

  return (
    <div style={{ display: 'flex', width: paperWidth, marginBottom: 16, alignItems: 'stretch' }}>
      {cols.map(col => {
        const c = computed.elements.get(col.id);
        return (
          <div
            key={col.id}
            style={{
              width: c?.width ?? `${evenWidth}%`,
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
            {renderLayoutRows(col.rows, data, tpl, { sectionAlign: (col.align === 'start' ? 'right' : col.align === 'end' ? 'left' : 'center') as AlignOption })}
          </div>
        );
      })}
    </div>
  );
}
