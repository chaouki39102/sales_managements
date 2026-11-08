// DataTable/parts/table/ColumnGroupHeaderRow.tsx — multi-level column group header row
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../../internal/useDataTableState';

export default function ColumnGroupHeaderRow<T>({ s }: { s: DataTableState<T> }) {
  const { expandable, resolvedGroups, rowActions, selectable, showIndex, toggleGroupCollapse } = s;

  return (
    <tr className="dt-group-header-row">
      {expandable && <th />}
      {selectable && <th />}
      {showIndex && <th />}
      {resolvedGroups.map(({ group, collapsed, colspan }) => (
        <th
          key={group.key}
          colSpan={colspan}
          className="dt-th dt-th-group"
          style={{ textAlign: 'center', background: 'var(--bg3)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>{group.header}</span>
            {group.collapsible && (
              <button
                className="dt-tbtn"
                style={{ padding: '0 4px', fontSize: 11 }}
                onClick={() => toggleGroupCollapse(group.key)}
                type="button"
                title={collapsed ? 'توسيع المجموعة' : 'طي المجموعة'}
              >
                <i className={`ti ti-chevron-${collapsed ? 'left' : 'down'}`} />
              </button>
            )}
          </div>
        </th>
      ))}
      {rowActions && <th />}
    </tr>
  );
}
