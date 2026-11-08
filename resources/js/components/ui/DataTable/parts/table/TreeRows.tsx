// DataTable/parts/table/TreeRows.tsx — tree-data body rows
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { Column } from '../../types';
import { getRawValue, getTextAlign } from '../../utils';
import type { DataTableState } from '../../internal/useDataTableState';

export default function TreeRows<T>({ s }: { s: DataTableState<T> }) {
  const {
    expandable, onRowClick, onRowDoubleClick, rowActions, selectable,
    showIndex, toggleTreeNode, treeConfig, treeRows, visibleCols,
  } = s;

  return (
    <>
      {treeRows.map(({ row, level, hasChildren, collapsed: nodeCollapsed, id }, treeIdx) => {
        const rKey = id;
        return (
          <tr
            key={String(rKey)}
            className="dt-row"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
            data-row-index={treeIdx}
          >
            {expandable && <td className="dt-td-exp" />}
            {selectable && <td className="dt-td-sel" />}
            {showIndex && <td className="dt-td dt-td-idx">{level + 1}</td>}
            {visibleCols.map((col, colIdx) => {
              const rawVal = getRawValue(row, col as Column<T>);
              const isFirst = colIdx === 0;
              return (
                <td
                  key={col.key}
                  className="dt-td"
                  style={{ textAlign: getTextAlign(col.align) }}
                >
                  {isFirst ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        paddingRight: `${level * (treeConfig?.indentPx ?? 20)}px`,
                      }}
                    >
                      {hasChildren ? (
                        <button
                          className="dt-exp-btn"
                          onClick={e => { e.stopPropagation(); toggleTreeNode(id); }}
                          type="button"
                          aria-expanded={!nodeCollapsed}
                        >
                          <i className={`ti ti-chevron-${nodeCollapsed ? 'left' : 'down'}`} />
                        </button>
                      ) : (
                        <span style={{ width: 20, display: 'inline-block' }} />
                      )}
                      {col.render ? col.render(row, 0) : String(rawVal ?? '—')}
                    </span>
                  ) : (
                    col.render ? col.render(row, 0) : String(rawVal ?? '—')
                  )}
                </td>
              );
            })}
            {rowActions && <td style={{ textAlign: 'center' }}>{rowActions(row)}</td>}
          </tr>
        );
      })}
    </>
  );
}
