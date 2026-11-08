// DataTable/parts/table/AggregatesFooter.tsx — aggregates footer (<tfoot>)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import { AGG_LABELS } from '../../types';
import { getTextAlign } from '../../utils';
import type { DataTableState } from '../../internal/useDataTableState';

export default function AggregatesFooter<T>({ s }: { s: DataTableState<T> }) {
  const {
    aggregateLabel, aggregates, cycleAgg, expandable, rowActions,
    selectable, showIndex, visibleCols,
  } = s;

  return (
    <tfoot>
      <tr className="dt-agg-row" aria-label="صف الإجماليات">
        {expandable && <td />}
        {selectable && <td />}
        {showIndex && <td />}

        {visibleCols.map((col, ci) => {
          const agg = aggregates![col.key];

          if (ci === 0) {
            return (
              <td key={col.key}>
                <span className="dt-agg-label">
                  <i className="ti ti-math-function" aria-hidden="true" />
                  {aggregateLabel ?? 'Σ'}
                </span>
              </td>
            );
          }

          if (!agg || agg.value == null) return <td key={col.key} />;

          const canCycle = typeof col.aggregate === 'string';
          const formatted = col.aggregateFormat
            ? col.aggregateFormat(agg.value, agg.type)
            : Number(agg.value).toLocaleString('fr-DZ', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });

          return (
            <td
              key={col.key}
              style={{ textAlign: getTextAlign(col.align), direction: 'ltr' }}
            >
              {canCycle ? (
                <span
                  className="dt-agg-cell"
                  onClick={() => cycleAgg(col.key)}
                  title="انقر لتغيير نوع الإجمالي"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && cycleAgg(col.key)}
                >
                  <span className="dt-agg-type">{AGG_LABELS[agg.type]}</span>
                  <span className="dt-agg-value">{formatted}</span>
                </span>
              ) : (
                <span className="dt-agg-value">{formatted}</span>
              )}
            </td>
          );
        })}

        {rowActions && <td />}
      </tr>
    </tfoot>
  );
}
