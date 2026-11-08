// DataTable/parts/MobileCards.tsx — mobile card list
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { Column } from '../types';
import { getRawValue } from '../utils';
import { SkeletonCards } from '../Primitives';
import type { DataTableState } from '../internal/useDataTableState';

export default function MobileCards<T>({ s }: { s: DataTableState<T> }) {
  const {
    effectiveDisplayData, loading, loadingNode, onRowClick, onRowDoubleClick,
    renderEmptyContent, rowActions, rowKey, visibleCols,
  } = s;

  return (
    <div className="dt-mobile dt-mobile-wrap">
      {loading ? (
        loadingNode ? (
          <div className="dt-mobile-loading">{loadingNode}</div>
        ) : (
          <SkeletonCards count={4} />
        )
      ) : effectiveDisplayData.length === 0 ? (
        renderEmptyContent(false)
      ) : (
        effectiveDisplayData.map((row, idx) => {
          const rKey = rowKey(row, idx);
          const cardCols = visibleCols.slice(0, 4);
          return (
            <div key={rKey} className="dt-card-item" onClick={() => onRowClick?.(row)} onDoubleClick={() => onRowDoubleClick?.(row)}>
              <div className="dt-card-grid">
                {cardCols.map(col => (
                  <div key={col.key}>
                    <div className="dt-card-label">{col.header}</div>
                    <div className="dt-card-value">
                      {col.render
                        ? col.render(row, idx)
                        : String(getRawValue(row, col as Column<T>) ?? '—')}
                    </div>
                  </div>
                ))}
              </div>
              {rowActions && (
                <div className="dt-card-actions" onClick={e => e.stopPropagation()}>
                  {rowActions(row)}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
