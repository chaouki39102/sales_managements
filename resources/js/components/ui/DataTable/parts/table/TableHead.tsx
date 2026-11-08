// DataTable/parts/table/TableHead.tsx — table header (<thead>)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import ColumnGroupHeaderRow from './ColumnGroupHeaderRow';
import HeaderCell from './HeaderCell';
import type { DataTableState } from '../../internal/useDataTableState';

export default function TableHead<T>({ s }: { s: DataTableState<T> }) {
  const {
    allChecked, expandable, indRef, indexHeader, isGrouped,
    resolvedGroups, rowActions, selectable, showIndex, toggleAll,
    visibleCols,
  } = s;

  return (
    <thead>
      {/* ── صف Column Groups (إذا مفعّل) ──────────────────────────── */}
      {isGrouped && resolvedGroups.length > 0 && (
        <ColumnGroupHeaderRow s={s} />
      )}
      <tr>
        {expandable && <th className="dt-th dt-th-exp" />}
        {selectable && (
          <th className="dt-th dt-th-sel">
            <input
              ref={indRef}
              className="dt-cb"
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              aria-label="تحديد الكل"
            />
          </th>
        )}
        {showIndex && <th className="dt-th dt-th-idx">{indexHeader}</th>}

        {visibleCols.map(col => <HeaderCell key={col.key} s={s} col={col} />)}

        {rowActions && <th className="dt-th dt-th-acts" />}
      </tr>
    </thead>
  );
}
