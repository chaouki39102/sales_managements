// DataTable/parts/dialogs/SaveViewDialog.tsx — save current view dialog
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../../internal/useDataTableState';

export default function SaveViewDialog<T>({ s }: { s: DataTableState<T> }) {
  const {
    commitSaveView, saveViewInputRef, saveViewName, setSaveViewDialogOpen, setSaveViewName,
  } = s;

  return (
    <div className="dt-overlay" role="presentation" aria-hidden="true">
      <div
        className="dt-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="حفظ العرض"
      >
        <div className="dt-dialog-header">
          <span className="dt-dialog-title">
            <i className="ti ti-bookmark" />
            حفظ العرض الحالي
          </span>
          <button
            className="dt-dialog-close"
            onClick={() => setSaveViewDialogOpen(false)}
            type="button"
            aria-label="إغلاق"
          >
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="dt-dialog-body">
          <p className="dt-dialog-hint">أدخل اسماً للعرض ليتم حفظ الفلاتر والترتيب وإعدادات الأعمدة.</p>
          <input
            ref={saveViewInputRef}
            className="dt-fi dt-dialog-input"
            type="text"
            value={saveViewName}
            onChange={e => setSaveViewName(e.target.value)}
            placeholder="اسم العرض..."
            onKeyDown={e => {
              if (e.key === 'Enter') commitSaveView();
              if (e.key === 'Escape') setSaveViewDialogOpen(false);
            }}
            aria-label="اسم العرض"
            maxLength={50}
          />
        </div>
        <div className="dt-dialog-footer">
          <button
            className="dt-tbtn"
            onClick={() => setSaveViewDialogOpen(false)}
            type="button"
          >
            إلغاء
          </button>
          <button
            className="dt-tbtn dt-batch-save"
            onClick={commitSaveView}
            disabled={!saveViewName.trim()}
            type="button"
          >
            <i className="ti ti-device-floppy" />
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
