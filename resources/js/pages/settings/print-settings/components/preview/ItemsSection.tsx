import type { PrintTemplate, ColumnKey, AlignOption } from '../../types';
import type { UniversalDocumentData, DocumentLine } from '../../types/data';
import { getVisibleCols, colWidth, colAlign, colDefaultHeader, borderStyle, align } from './shared';
import { COLUMN_DEFAULTS } from '../../services/SettingsRegistry';
import { printFieldResolver } from '../../services';

const COL_WIDTH_DEFAULTS: Partial<Record<ColumnKey, number>> = Object.fromEntries(
  (Object.keys(COLUMN_DEFAULTS) as ColumnKey[]).map(k => [k, COLUMN_DEFAULTS[k].width]),
) as Partial<Record<ColumnKey, number>>;

const FIELD_MAP: Record<string, string> = {
  rowNumber: 'item.index',
  name:      'item.name',
  ref:       'item.code',
  barcode:   'item.barcode',
  unit:      'item.unit',
  quantity:  'item.quantity',
  price:     'item.price',
  discount:  'item.discount',
  tva:       'item.tva',
  total:     'item.total',
};

function colValue(col: ColumnKey, line: DocumentLine, _tpl: PrintTemplate, idx: number): string {
  const fieldId = FIELD_MAP[col];
  if (!fieldId) return '';

  const val = printFieldResolver.resolveItemField(fieldId, line, idx);
  if (col === 'discount') {
    const pct = printFieldResolver.resolveItemField('item.discount', line, idx) as number;
    return pct > 0 ? `${pct}%` : '';
  }
  if (col === 'tva') {
    const pct = printFieldResolver.resolveItemField('item.tvaPct', line, idx) as number;
    return `${pct}%`;
  }
  if (col === 'price') {
    const display = _tpl.price_display === 'ttc' ? line.unitPriceTtc : line.unitPriceHt;
    return Number(display).toFixed(2);
  }
  if (col === 'total') {
    const display = _tpl.show_line_total_ttc ? line.totalTtc : line.totalHt;
    return Number(display).toFixed(2);
  }
  return val !== undefined ? String(val) : '';
}

function renderThermalItems(tpl: PrintTemplate, data: UniversalDocumentData) {
  const visibleCols = getVisibleCols(tpl);
  if (visibleCols.length === 0 || data.lines.length === 0) return null;

  const ff = tpl.items_font_family === 'monospace'
    ? "'Courier New', monospace"
    : "'Tajawal', sans-serif";

  const bs = borderStyle(tpl.table_border_style);
  const border = tpl.table_border_style === 'none' ? 'none' : `1px ${bs} #999`;

  return (
    <div style={{ fontSize: tpl.items_font_size, fontFamily: ff, marginBottom: 4 }}>
      {tpl.show_col_header && (
        <div style={{
          display: 'flex', gap: 2,
          fontWeight: tpl.table_header_bold ? 800 : 400,
          color: tpl.table_header_color,
          background: tpl.table_header_bg ? '#f0f0f0' : 'transparent',
          borderBottom: border,
          paddingBottom: 3, marginBottom: 2,
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${colWidth(tpl, col, COL_WIDTH_DEFAULTS)}%`,
              textAlign: align(colAlign(tpl, col)),
            }}>
              {tpl.col_headers[col] ?? colDefaultHeader(col)}
            </div>
          ))}
        </div>
      )}

      {data.lines.map((line, idx) => (
        <div key={idx} style={{
          display: 'flex', gap: 2,
          background: tpl.alternating_rows && idx % 2 === 1 ? tpl.alternating_color : 'transparent',
          padding: '1px 0',
          borderBottom: tpl.table_border_style !== 'none' ? `1px ${bs} #eee` : 'none',
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${colWidth(tpl, col, COL_WIDTH_DEFAULTS)}%`,
              textAlign: align(colAlign(tpl, col)),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col === 'name' ? 'normal' : 'nowrap',
            }}>
              {colValue(col, line, tpl, idx)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderPageItems(tpl: PrintTemplate, data: UniversalDocumentData) {
  const visibleCols = getVisibleCols(tpl);
  if (visibleCols.length === 0 || data.lines.length === 0) return null;

  const isA4 = tpl.paper_size === 'A4';
  const cellPad = isA4 ? '10px' : '5px 6px';
  const totalPct = visibleCols.reduce((s, c) => s + colWidth(tpl, c, COL_WIDTH_DEFAULTS), 0);
  const scale = totalPct > 0 ? 100 / totalPct : 1;

  return (
    <div style={{ marginBottom: isA4 ? 20 : 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.items_font_size }}>
        <thead>
          <tr style={{
            background: tpl.table_header_bg ? (tpl.table_header_color || '#111') : '#f5f5f5',
            borderBottom: isA4 ? '2px solid #111' : '1.5px solid #111',
          }}>
            {visibleCols.map(col => (
              <th key={col} style={{
                width: `${colWidth(tpl, col, COL_WIDTH_DEFAULTS) * scale}%`,
                padding: cellPad,
                textAlign: align(colAlign(tpl, col)),
                fontWeight: tpl.table_header_bold ? 700 : 600,
                color: tpl.table_header_bg ? '#fff' : tpl.table_header_color || '#111',
                fontSize: tpl.items_font_size,
              }}>
                {tpl.col_headers[col] ?? colDefaultHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{
              borderBottom: tpl.table_border_style !== 'none'
                ? `1px ${borderStyle(tpl.table_border_style)} #ddd`
                : 'none',
              background: tpl.alternating_rows && i % 2 === 1 ? (tpl.alternating_color || '#fafafa') : 'transparent',
            }}>
              {visibleCols.map(col => (
                <td key={col} style={{
                  padding: cellPad,
                  textAlign: align(colAlign(tpl, col)),
                  fontWeight: col === 'total' ? 700 : 400,
                  fontSize: tpl.items_font_size,
                }}>
                  {colValue(col, line, tpl, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function renderItems(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalItems(tpl, data);
  return renderPageItems(tpl, data);
}
