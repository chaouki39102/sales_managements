// DataTable/parts/BulkBar.tsx — bulk actions bar for selected rows
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../internal/useDataTableState';

export default function BulkBar<T>({ s }: { s: DataTableState<T> }) {
  const { bulkActions, clearSelection, selectedKeys, selectedRows } = s;

  return (
    <div className="dt-bulk" role="toolbar" aria-label="إجراءات المحددين">
      <span className="dt-bulk-count">
        <i className="ti ti-check" aria-hidden="true" />
        {selectedKeys.size.toLocaleString('ar-DZ')} محدد
      </span>
      {bulkActions!(selectedRows, clearSelection)}
      <button
        className="dt-bulk-clear"
        onClick={clearSelection}
        aria-label="إلغاء التحديد"
        type="button"
      >
        <i className="ti ti-x" />
      </button>
    </div>
  );
}
