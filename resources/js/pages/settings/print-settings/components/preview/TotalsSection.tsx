import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLayoutRows } from './shared';

function renderThermalTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{
      fontSize: tpl.totals_font_size,
      fontWeight: tpl.totals_bold ? 700 : 400,
      marginBottom: 4,
    }}>
      {renderLayoutRows(tpl.totals_rows, data, tpl)}
    </div>
  );
}

function renderPageTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  const blockWidth = isA4 ? 320 : 260;
  const justify =
    tpl.totals_align === 'left'  ? 'flex-start' :
    tpl.totals_align === 'center' ? 'center' : 'flex-end';

  return (
    <div style={{
      display: 'flex', justifyContent: justify,
      marginBottom: isA4 ? 24 : 12,
    }}>
      <div style={{
        width: blockWidth,
        fontSize: tpl.totals_font_size,
        fontWeight: tpl.totals_bold ? 700 : 400,
      }}>
        {renderLayoutRows(tpl.totals_rows, data, tpl)}
      </div>
    </div>
  );
}

export function renderTotals(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  return isThermal ? renderThermalTotals(tpl, data) : renderPageTotals(tpl, data);
}
