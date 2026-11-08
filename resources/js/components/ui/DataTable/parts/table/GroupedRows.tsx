// DataTable/parts/table/GroupedRows.tsx — grouped body rows + group sub-totals
// Extracted verbatim from DataTable.tsx (no behaviour change).

import React from 'react';
import type { AggregateType } from '../../types';
import { AGG_LABELS } from '../../types';
import { getTextAlign } from '../../utils';
import type { DataTableState } from '../../internal/useDataTableState';

export default function GroupedRows<T>({ s }: { s: DataTableState<T> }) {
  const {
    aggregateLabel, aggregates, expandable, groupBy, groupSubTotals,
    groups, renderDataRow, rowActions, selectable, showAggregates,
    showIndex, toggleGroup, totalColSpan, visibleCols,
  } = s;

  return (
    <>
      {groups!.map(group => (
        <React.Fragment key={String(group.value)}>
          <tr
            className="dt-group-row"
            onClick={() => toggleGroup(String(group.value))}
            aria-expanded={!group.collapsed}
          >
            <td colSpan={totalColSpan}>
              <div className="dt-group-cell">
                <i
                  className={`ti ti-chevron-${group.collapsed ? 'left' : 'down'} dt-group-chevron`}
                  aria-hidden="true"
                />
                {(() => {
                  const groupCol = visibleCols.find(c => c.key === groupBy!.key);
                  return groupCol?.groupRenderer
                    ? groupCol.groupRenderer(group.value, group.rows as T[])
                    : <span className="dt-group-label">{group.label}</span>;
                })()}
                <span className="dt-group-count">{group.rows.length}</span>
              </div>
            </td>
          </tr>

          {!group.collapsed &&
            (group.rows as T[]).map((row, idx) => renderDataRow(row, idx))}

          {!group.collapsed &&
            groupBy?.showSubTotals &&
            showAggregates &&
            aggregates && (
              <tr className="dt-group-subtotal">
                {expandable && <td />}
                {selectable && <td />}
                {showIndex && <td />}
                {visibleCols.map((col, ci) => {
                  const groupAgg = groupSubTotals?.[String(group.value)]?.[col.key] as { value: unknown; type: string } | undefined;
                  const agg = groupAgg ?? aggregates[col.key];
                  if (ci === 0)
                    return (
                      <td key={col.key}>
                        <span className="dt-agg-label">
                          <i className="ti ti-math-function" aria-hidden="true" />
                          {aggregateLabel ?? 'Σ'}
                        </span>
                      </td>
                    );
                  if (!agg || agg.value == null) return <td key={col.key} />;
                  const fmt = col.aggregateFormat
                    ? col.aggregateFormat(agg.value as number, agg.type as AggregateType)
                    : Number(agg.value).toLocaleString('fr-DZ', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                  return (
                    <td key={col.key} style={{ textAlign: getTextAlign(col.align), direction: 'ltr' }}>
                      <span className="dt-agg-type">{AGG_LABELS[agg.type as AggregateType]}</span>
                      <span className="dt-agg-value">{fmt}</span>
                    </td>
                  );
                })}
                {rowActions && <td />}
              </tr>
            )}
        </React.Fragment>
      ))}
    </>
  );
}
