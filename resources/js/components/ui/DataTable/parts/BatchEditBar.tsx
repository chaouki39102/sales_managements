// DataTable/parts/BatchEditBar.tsx — pending batch edits bar (undo / redo / save)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../internal/useDataTableState';

export default function BatchEditBar<T>({ s }: { s: DataTableState<T> }) {
  const { batch } = s;

  return (
    <div className="dt-batch-bar">
      <div className="dt-batch-info">
        <i className="ti ti-edit" />
        {batch.pendingCount} تعديل معلّق
        <button
          className="dt-tbtn"
          onClick={batch.undo}
          disabled={!batch.canUndo}
          title="تراجع (Ctrl+Z)"
          type="button"
        >
          <i className="ti ti-arrow-back-up" />
        </button>
        <button
          className="dt-tbtn"
          onClick={batch.redo}
          disabled={!batch.canRedo}
          title="إعادة (Ctrl+Y)"
          type="button"
        >
          <i className="ti ti-arrow-forward-up" />
        </button>
      </div>
      <div className="dt-batch-actions">
        <button
          className="dt-tbtn dt-batch-discard"
          onClick={batch.discard}
          type="button"
        >
          <i className="ti ti-x" />
          تجاهل
        </button>
        <button
          className="dt-tbtn dt-batch-save"
          onClick={batch.save}
          type="button"
        >
          <i className="ti ti-device-floppy" />
          حفظ التعديلات ({batch.pendingCount})
        </button>
      </div>
    </div>
  );
}
