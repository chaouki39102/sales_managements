// DataTable/parts/toolbar/SavedViewsMenu.tsx — saved views dropdown
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../../internal/useDataTableState';

export default function SavedViewsMenu<T>({ s }: { s: DataTableState<T> }) {
  const {
    deleteView, handleApplyView, handleSaveCurrentView, loadViews, savedViewsList,
    setSavedViewsList, setViewsMenuOpen, viewsMenuOpen, viewsMenuPos, viewsMenuRef,
  } = s;

  return (
    <div ref={viewsMenuRef} className="dt-col-menu-wrap">
      <button
        className="dt-tbtn"
        onClick={() => setViewsMenuOpen(v => !v)}
        type="button"
      >
        <i className="ti ti-bookmark" />
        العروض
      </button>
      {viewsMenuOpen && (
        <div className="dt-col-menu" style={{
          position: 'fixed',
          top:    viewsMenuPos?.top    ?? 'calc(100% + 6px)',
          left:   viewsMenuPos?.left   ?? 0,
          minWidth: '200px',
          zIndex: 300,
        }}>
          <div className="dt-col-menu-header">
            <span>العروض المحفوظة</span>
            <button
              onClick={() => { setViewsMenuOpen(false); handleSaveCurrentView(); }}
              type="button"
              title="حفظ العرض الحالي"
            >
              <i className="ti ti-plus" /> حفظ
            </button>
          </div>
          {savedViewsList.length === 0 && (
            <div style={{ padding: '8px', color: 'var(--t4)' }}>لا توجد عروض</div>
          )}
          {savedViewsList.map(view => (
            <div
              key={view.id}
              className="dt-col-item"
              style={{ justifyContent: 'space-between' }}
            >
              <span onClick={() => handleApplyView(view)}>{view.name}</span>
              <button
                onClick={() => {
                  deleteView(view.id);
                  setSavedViewsList(loadViews());
                }}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
