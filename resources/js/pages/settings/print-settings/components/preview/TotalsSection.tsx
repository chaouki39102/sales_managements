import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLayoutRows, borderStyle, type FieldStyleOverride } from './shared';
import { TotalsGrid } from './TotalsGrid';

const TOTALS_FIELD_OVERRIDES: (tpl: PrintTemplate) => Record<string, FieldStyleOverride> = (tpl) => ({
  'totals.ttc': {
    fontSize: tpl.total_ttc_font_size,
    bold: tpl.total_ttc_bold,
    color: tpl.total_ttc_color,
  },
});

function renderThermalTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const textAlign =
    tpl.totals_align === 'left'  ? 'left' :
    tpl.totals_align === 'center' ? 'center' : 'right';

  const bs = tpl.total_border_style;
  const hasBorder = bs && bs !== 'none';

  return (
    <div style={{
      fontSize: tpl.totals_font_size,
      fontWeight: tpl.totals_bold ? 700 : 400,
      textAlign,
      marginBottom: 4,
    }}>
      {hasBorder && (
        <div style={{
          borderTop: `${bs === 'double' ? '2px' : '1px'} ${borderStyle(bs)} #999`,
          marginBottom: 4,
          paddingTop: 4,
        }} />
      )}
      {renderLayoutRows(tpl.totals_rows, data, tpl, { fieldStyleOverrides: TOTALS_FIELD_OVERRIDES(tpl), sectionAlign: tpl.totals_align })}
    </div>
  );
}

function renderPageTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';

  const bs = tpl.total_border_style;
  const hasBorder = bs && bs !== 'none';

  return (
    <div style={{
      marginBottom: isA4 ? 24 : 12,
      width: '100%',
    }}>
      <div style={{
        fontSize: tpl.totals_font_size,
        fontWeight: tpl.totals_bold ? 700 : 400,
      }}>
        {hasBorder && (
          <div style={{
            borderTop: `${bs === 'double' ? '2px' : '1px'} ${borderStyle(bs)} #999`,
            marginBottom: 4,
            paddingTop: 4,
          }} />
        )}
        {renderLayoutRows(tpl.totals_rows, data, tpl, { fieldStyleOverrides: TOTALS_FIELD_OVERRIDES(tpl), sectionAlign: tpl.totals_align })}
      </div>
    </div>
  );
}

export function renderTotals(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (!isThermal && tpl.totals_grid?.enabled) {
    return <TotalsGrid config={tpl.totals_grid} tpl={tpl} data={data} />;
  }
  return isThermal ? renderThermalTotals(tpl, data) : renderPageTotals(tpl, data);
}
