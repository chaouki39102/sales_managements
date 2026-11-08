// DataTable/parts/QuickFilterBar.tsx — Ctrl+F quick filter bar
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../internal/useDataTableState';

export default function QuickFilterBar<T>({ s }: { s: DataTableState<T> }) {
  const { qfCloseFn, qfInputRef, qfMatchCount, quickFilterQuery, setQuickFilterQuery } = s;

  return (
    <div className="dt-qf-bar" role="search" aria-label="بحث سريع">
      <span className="dt-qf-icon">
        <i className="ti ti-search" aria-hidden="true" />
      </span>
      <input
        ref={qfInputRef}
        className="dt-qf-input"
        type="text"
        value={quickFilterQuery}
        onChange={e => setQuickFilterQuery(e.target.value)}
        placeholder="بحث سريع في الجدول..."
        aria-label="بحث سريع"
        autoFocus
      />
      {quickFilterQuery && qfMatchCount !== null && (
        <span className="dt-qf-count">
          {qfMatchCount.toLocaleString('ar-DZ')} نتيجة
        </span>
      )}
      {quickFilterQuery && (
        <button
          className="dt-qf-clear"
          onClick={() => setQuickFilterQuery('')}
          type="button"
          title="مسح البحث (Escape)"
          aria-label="مسح البحث"
        >
          <i className="ti ti-x" />
        </button>
      )}
      <button
        className="dt-qf-close"
        onClick={qfCloseFn}
        type="button"
        title="إغلاق (Escape)"
        aria-label="إغلاق البحث"
      >
        <i className="ti ti-x" />
      </button>
    </div>
  );
}
