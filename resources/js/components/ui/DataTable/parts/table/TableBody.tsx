// DataTable/parts/table/TableBody.tsx — table body (<tbody>) — loading / tree / grouped / flat
// Extracted verbatim from DataTable.tsx (no behaviour change).

import { SkeletonRows } from '../../Primitives';
import TreeRows from './TreeRows';
import GroupedRows from './GroupedRows';
import FlatRows from './FlatRows';
import type { DataTableState } from '../../internal/useDataTableState';

export default function TableBody<T>({ s }: { s: DataTableState<T> }) {
  const {
    effectiveDisplayData, effectiveVirtualDisplayData, groups, isTreeMode, isVirtual,
    loading, loadingNode, offsetY, renderEmptyContent, totalColSpan,
    treeRows,
  } = s;

  return (
    <tbody style={isVirtual ? { transform: `translateY(${offsetY}px)` } : undefined}>
      {loading ? (
        loadingNode ? (
          <tr>
            <td colSpan={totalColSpan} className="dt-empty-td">{loadingNode}</td>
          </tr>
        ) : (
          <SkeletonRows rows={8} cols={totalColSpan} />
        )
      ) : isTreeMode ? (
        // ── Tree Data rendering ──────────────────────────────────────
        treeRows.length === 0 ? (
          <tr>
            <td colSpan={totalColSpan} className="dt-empty-td">
              {renderEmptyContent(true)}
            </td>
          </tr>
        ) : (
          <TreeRows s={s} />
        )
      ) : groups ? (
        groups.length === 0 ? (
          <tr>
            <td colSpan={totalColSpan} className="dt-empty-td">
              {renderEmptyContent(true)}
            </td>
          </tr>
        ) : (
          <GroupedRows s={s} />
        )
      ) : (isVirtual ? effectiveVirtualDisplayData : effectiveDisplayData).length === 0 ? (
        <tr>
          <td colSpan={totalColSpan} className="dt-empty-td">
            {renderEmptyContent(true)}
          </td>
        </tr>
      ) : (
        <FlatRows s={s} />
      )}
    </tbody>
  );
}
