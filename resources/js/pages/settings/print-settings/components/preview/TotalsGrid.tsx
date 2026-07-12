import React from 'react';
import type { PrintTemplate, TotalsGridConfig, TotalsGridColumn, LayoutRow, AlignOption } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLayoutRows, align, boxBorderCss } from './shared';

interface GridRow {
  rate: number;
  baseExcl: number;
  discountPct: number;
  discountAmount: number;
  tvaAmount: number;
  netExcl: number;
}

function buildGridRows(data: UniversalDocumentData): GridRow[] {
  const groups = new Map<number, GridRow>();

  for (const line of data.lines) {
    const rate = Number(line.tvaPct ?? 0);
    const baseBeforeDiscount = Number(line.unitPriceHt ?? 0) * Number(line.quantity ?? 0);
    const discountAmount = Number(line.discountAmt ?? 0);
    const netExcl = Number(line.totalHt ?? 0);
    const tvaAmount = Number(line.totalTva ?? 0);

    const g = groups.get(rate) ?? { rate, baseExcl: 0, discountPct: 0, discountAmount: 0, tvaAmount: 0, netExcl: 0 };
    g.baseExcl += baseBeforeDiscount;
    g.discountAmount += discountAmount;
    g.netExcl += netExcl;
    g.tvaAmount += tvaAmount;
    groups.set(rate, g);
  }

  return [...groups.values()]
    .map(g => ({ ...g, discountPct: g.baseExcl > 0 ? (g.discountAmount / g.baseExcl) * 100 : 0 }))
    .sort((a, b) => b.rate - a.rate);
}

function gridCellValue(col: TotalsGridColumn, row: GridRow): string {
  switch (col.field) {
    case 'grid.baseExcl':      return row.baseExcl.toFixed(2);
    case 'grid.discountPct':   return row.discountPct > 0 ? `${row.discountPct.toFixed(1)}%` : '—';
    case 'grid.discountAmount': return row.discountAmount.toFixed(2);
    case 'grid.tvaRate':       return row.rate > 0 ? `${row.rate}%` : 'معفى';
    case 'grid.tvaAmount':     return row.tvaAmount.toFixed(2);
    default:                   return '';
  }
}

function TotalsGridFn({
  config, tpl, data,
}: {
  config: TotalsGridConfig;
  tpl: PrintTemplate;
  data: UniversalDocumentData;
}): JSX.Element | null {
  const gridRows = buildGridRows(data);
  if (gridRows.length === 0 && !config.summaryRows?.length) return null;

  const sortedCols = [...config.columns]
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  const borderColor = config.borderColor ?? '#333';

  return (
    <div style={{ marginBottom: 16 }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: tpl.totals_font_size,
        direction: 'rtl',
      }}>
        <thead>
          <tr style={{
            background: config.headerBg ?? '#f5f5f5',
            color: config.headerColor ?? '#111',
            borderBottom: `2px solid ${borderColor}`,
          }}>
            {sortedCols.map(col => (
              <th key={col.id} style={{
                padding: '6px 8px',
                textAlign: align(col.align as AlignOption),
                fontWeight: 700,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridRows.map((row, i) => (
            <tr key={i} style={{
              borderBottom: `1px solid ${borderColor}44`,
            }}>
              {sortedCols.map(col => (
                <td key={col.id} style={{
                  padding: '5px 8px',
                  textAlign: align(col.align as AlignOption),
                  direction: 'ltr',
                }}>
                  {gridCellValue(col, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {config.summaryRows && config.summaryRows.length > 0 && (
        <div style={{
          marginTop: 8,
          fontSize: tpl.totals_font_size,
          fontWeight: tpl.totals_bold ? 700 : 400,
          maxWidth: 320,
        }}>
          {renderLayoutRows(config.summaryRows, data, tpl)}
        </div>
      )}
    </div>
  );
}

export const TotalsGrid = React.memo(TotalsGridFn);
