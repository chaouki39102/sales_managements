// ════════════════════════════════════════════════════════════════════════════
// ملف جديد: resources/js/pages/settings/print-settings/components/preview/HeaderColumns.tsx
//
// يوظّف engines/LayoutEngine.ts (كان كودًا ميتًا — غير مستورد بأي مكان) لبناء
// رأس متعدد الأعمدة مثل صورة A4 المرجعية: صندوق يسار (مرجع/زبون/مبلغ) +
// اسم الشركة وسطًا + معلومات الشركة يمينًا — كل عمود صندوق مستقل قابل
// لإعادة الترتيب/الإخفاء وله حدوده الخاصة، كله قادم من header_layout.columns.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { layoutEngine, type LayoutElement } from '../../engines/LayoutEngine';
import type { PrintTemplate, HeaderLayout, LayoutBlock } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLayoutRows, boxBorderCss, cellStyleCss } from './shared';
import { printFieldResolver } from '../../services';

function spacingCss(p?: LayoutBlock['padding']): string {
  if (!p) return '4px 8px';
  // ترتيب shorthand فيزيائي: top right bottom left — start=يمين، end=يسار في RTL
  return `${p.top}px ${p.start}px ${p.bottom}px ${p.end}px`;
}

function alignCss(a: LayoutBlock['align']): React.CSSProperties['textAlign'] {
  return a === 'start' ? 'right' : a === 'end' ? 'left' : 'center';
}

function renderBlockTitle(col: LayoutBlock, data: UniversalDocumentData, tpl: PrintTemplate) {
  if (!col.titleField) return null;
  const value = printFieldResolver.resolve(col.titleField, data, tpl);
  if (!value) return null;
  return <div style={{ marginBottom: 4, ...cellStyleCss(col.titleStyle) }}>{String(value)}</div>;
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

  const isA4 = tpl.paper_size === 'A4';

  return (
    <div style={{
      display: 'flex', width: paperWidth, alignItems: 'stretch',
      marginBottom: isA4 ? 30 : 16,
      paddingBottom: isA4 ? 16 : 10,
      borderBottom: tpl.header_separator === 'none' ? 'none' : (isA4 ? '2px solid #111' : '1.5px solid #111'),
    }}>
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
              ...boxBorderCss(col.border),
            }}
          >
            {renderBlockTitle(col, data, tpl)}
            {renderLayoutRows(col.rows, data, tpl)}
          </div>
        );
      })}
    </div>
  );
}

// ─── نقطة الدمج في components/preview/HeaderSection.tsx ────────────────────────
//
// في renderHeader(tpl, data, isThermal):
//
//   import { renderHeaderColumns } from './HeaderColumns';
//   ...
//   export function renderHeader(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean, paperWidth: number) {
//     if (!isThermal && tpl.header_layout?.mode === 'columns') {
//       const cols = renderHeaderColumns(tpl.header_layout, data, tpl, paperWidth);
//       if (cols) return cols;
//     }
//     // ...المسار القديم (simple) كما هو دون تغيير
//   }
//
// ملاحظة: renderHeader لا يستقبل paperWidth حاليًا — أضِفه كوسيط رابع،
// ومرّره من UniversalPreview.tsx حيث paperWidth محسوبة أصلًا (السطر الذي يستدعي renderHeader).
