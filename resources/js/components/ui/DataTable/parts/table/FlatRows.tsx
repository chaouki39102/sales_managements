// DataTable/parts/table/FlatRows.tsx — flat (paged / virtual) body rows
// Extracted verbatim from DataTable.tsx (no behaviour change).

import VirtualRow from '../VirtualRow';
import type { DataTableState } from '../../internal/useDataTableState';

export default function FlatRows<T>({ s }: { s: DataTableState<T> }) {
  const {
    activeCell, editingCell, effectiveDisplayData, effectiveVirtualDisplayData, enableRangeSelection,
    expandedKeys, isInRange, isVirtual, renderDataRow, rowKey,
    selectedKeys, visibleRange,
  } = s;

  return (
    <>
      {(isVirtual ? effectiveVirtualDisplayData : effectiveDisplayData).map((row, idx) => {
        const absoluteIdx = isVirtual ? visibleRange.start + idx : idx;
        const rKey = rowKey(row, absoluteIdx);

        // في وضع virtual: نُغلّف كل صف بـ VirtualRow memo
        // حتى تحرك الـ scroll لا يُعيد render الصف ما لم تتغير بياناته
        if (isVirtual) {
          const isRowEditing = editingCell?.rowKey === rKey;
          const isRowActive = !!(activeCell && activeCell.rowIndex === absoluteIdx);
          const rowInRange = enableRangeSelection
            ? isInRange(absoluteIdx, 0) // تحقق أن الصف داخل النطاق
            : false;

          // dataHash: نفضل updated_at لأنه خفيف — fallback إلى JSON.stringify
          const dataHash = String((row as Record<string, unknown>).updated_at ?? JSON.stringify(row));
          return (
            <VirtualRow
              key={rKey}
              rowDataKey={rKey}
              dataHash={dataHash}
              isSelected={selectedKeys.has(rKey)}
              isExpanded={expandedKeys.has(rKey)}
              isEditing={!!isRowEditing}
              isActive={isRowActive}
              inRange={rowInRange}
              rowNode={null}
              renderFn={() => renderDataRow(row, absoluteIdx)}
            />
          );
        }

        return renderDataRow(row, absoluteIdx);
      })}
    </>
  );
}
