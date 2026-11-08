// DataTable/parts/VirtualFooter.tsx — virtual-scroll footer
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../internal/useDataTableState';

export default function VirtualFooter<T>({ s }: { s: DataTableState<T> }) {
  const { clearSort, loading, selectedKeys, sorts, total, visibleRange } = s;

  return (
    <div className="dt-footer">
      <div className="dt-footer-info" aria-live="polite">
        {loading ? (
          <i className="ti ti-loader-2 dt-footer-spinner" aria-hidden="true" />
        ) : (
          <span>
            <i className="ti ti-eye" style={{ marginLeft: 4 }} />
            يعرض <strong>{visibleRange.end - visibleRange.start + 1}</strong>
            {' صف من '}
            <strong>{total.toLocaleString('ar-DZ')}</strong>
            {' (virtual scroll)'}
          </span>
        )}
        {selectedKeys.size > 0 && (
          <span className="bx be">{selectedKeys.size.toLocaleString('ar-DZ')} محدد</span>
        )}
      </div>
      {sorts.length > 0 && (
        <button className="dt-tbtn" onClick={clearSort} type="button">
          <i className="ti ti-arrows-sort" />
          مسح الفرز ({sorts.length})
        </button>
      )}
    </div>
  );
}
