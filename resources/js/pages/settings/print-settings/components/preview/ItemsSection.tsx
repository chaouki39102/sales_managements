import type { PrintTemplate, ColumnKey, AlignOption } from '../../types';
import type { UniversalDocumentData, DocumentLine } from '../../types/data';
import { getVisibleCols, colWidth, colAlign, colDefaultHeader, borderStyle, align } from './shared';

const COL_WIDTH_DEFAULTS: Partial<Record<ColumnKey, number>> = {
  rowNumber: 8, barcode: 18, ref: 18, name: 30, unit: 10,
  quantity: 12, price: 15, discount: 10, tva: 10, total: 18,
};

function colValue(col: ColumnKey, line: DocumentLine, tpl: PrintTemplate): string {
  switch (col) {
    case 'rowNumber': return String(line.rowNumber);
    case 'barcode':   return line.barcode ?? '';
    case 'ref':       return line.ref ?? '';
    case 'name':      return line.name;
    case 'unit':      return line.unit ?? '';
    case 'quantity':  return String(line.quantity);
    case 'price':     return tpl.price_display === 'ttc' ? Number(line.unitPriceTtc).toFixed(2) : Number(line.unitPriceHt).toFixed(2);
    case 'discount':  return line.discountPct > 0 ? `${line.discountPct}%` : '';
    case 'tva':       return `${line.tvaPct}%`;
    case 'total':     return tpl.show_line_total_ttc ? Number(line.totalTtc).toFixed(2) : Number(line.totalHt).toFixed(2);
  }
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
              {colValue(col, line, tpl)}
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
                  {colValue(col, line, tpl)}
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
