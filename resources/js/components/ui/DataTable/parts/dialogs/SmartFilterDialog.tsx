// DataTable/parts/dialogs/SmartFilterDialog.tsx — Arabic smart filter dialog
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../../internal/useDataTableState';

export default function SmartFilterDialog<T>({ s }: { s: DataTableState<T> }) {
  const {
    closeSmartFilter, setSmartFilterInput, smartFilterInput, smartFilterRef, smartInputRef,
    submitSmartFilter,
  } = s;

  return (
    <div className="dt-overlay" role="presentation" aria-hidden="true">
      <div
        ref={smartFilterRef}
        className="dt-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="فلتر ذكي"
      >
        <div className="dt-dialog-header">
          <span className="dt-dialog-title">
            <i className="ti ti-robot" />
            فلتر ذكي بالعربية
          </span>
          <button className="dt-dialog-close" onClick={closeSmartFilter} type="button" aria-label="إغلاق">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="dt-dialog-body">
          <p className="dt-dialog-hint">
            اكتب وصفاً مثل: &quot;فواتير متأخرة أكثر من 30 يوم&quot; أو &quot;الفرز حسب التاريخ تنازلي&quot;
          </p>
          <input
            ref={smartInputRef}
            className="dt-fi dt-dialog-input"
            type="text"
            value={smartFilterInput}
            onChange={e => setSmartFilterInput(e.target.value)}
            placeholder="اكتب استعلامك هنا..."
            onKeyDown={e => {
              if (e.key === 'Enter') submitSmartFilter();
              if (e.key === 'Escape') closeSmartFilter();
            }}
            aria-label="نص الفلتر الذكي"
          />
        </div>
        <div className="dt-dialog-footer">
          <button className="dt-tbtn" onClick={closeSmartFilter} type="button">
            إلغاء
          </button>
          <button
            className="dt-tbtn dt-batch-save"
            onClick={submitSmartFilter}
            disabled={!smartFilterInput.trim()}
            type="button"
          >
            <i className="ti ti-filter" />
            تطبيق الفلتر
          </button>
        </div>
      </div>
    </div>
  );
}
