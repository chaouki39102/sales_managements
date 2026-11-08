import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLayoutRows, borderStyle, type FieldStyleOverride } from './shared';
import { TotalsGrid } from './TotalsGrid';
import { Pos } from './Pos';

const TOTALS_FIELD_OVERRIDES: (tpl: PrintTemplate) => Record<string, FieldStyleOverride> = (tpl) => ({
  'totals.ttc': {
    fontSize: tpl.total_ttc_font_size,
    bold: tpl.total_ttc_bold,
    color: tpl.total_ttc_color,
  },
});

/**
 * Documents that are not financial events (quote, orders, price request,
 * transfer) have no payments and do not move the party's balance, so «المدفوع /
 * الباقي / الرصيد السابق / الرصيد الجديد» on them was misleading (a quote
 * printed a «new balance» equal to the old one) and wasted space.
 */
const NON_FINANCIAL_DOCS = new Set(['DEV', 'BCC', 'CMD', 'BCF', 'DDP', 'BT']);
const PAYMENT_BALANCE_FIELDS = new Set(['totals.paid', 'totals.change', 'totals.remaining', 'balance.previous', 'balance.current']);

function totalsRowsFor(tpl: PrintTemplate) {
  const rows = tpl.totals_rows ?? [];
  if (!NON_FINANCIAL_DOCS.has(tpl.doc_type_code)) return rows;
  return rows.filter(r => !PAYMENT_BALANCE_FIELDS.has(r.field ?? ''));
}

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
      {renderLayoutRows(totalsRowsFor(tpl), data, tpl, { fieldStyleOverrides: TOTALS_FIELD_OVERRIDES(tpl), sectionAlign: tpl.totals_align })}
    </div>
  );
}

function renderPageTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';

  const bs = tpl.total_border_style;
  const hasBorder = bs && bs !== 'none';

  return (
    <div style={{
      marginBottom: isA4 ? 14 : 10,
      width: '100%',
      breakInside: 'avoid',
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
        {renderLayoutRows(totalsRowsFor(tpl), data, tpl, { fieldStyleOverrides: TOTALS_FIELD_OVERRIDES(tpl), sectionAlign: tpl.totals_align })}
      </div>
    </div>
  );
}

export function renderTotals(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (!isThermal && tpl.totals_grid?.enabled) {
    return (
      <Pos dragKey="totals.block" tpl={tpl}>
        <TotalsGrid config={tpl.totals_grid} tpl={tpl} data={data} />
      </Pos>
    );
  }
  return (
    <Pos dragKey="totals.block" tpl={tpl}>
      {isThermal ? renderThermalTotals(tpl, data) : renderPageTotals(tpl, data)}
    </Pos>
  );
}
