// DataTable/parts/toolbar/ColumnsMenu.tsx — column visibility / pinning dropdown
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../../internal/useDataTableState';

export default function ColumnsMenu<T>({ s }: { s: DataTableState<T> }) {
  const {
    allHidden, colMenuOpen, colMenuPos, colMenuRef, hiddenCount,
    hiddenKeys, isPinned, nonIndexCols, pinColumn, setColMenuOpen,
    toggleColVisibility, toggleCollapseAll,
  } = s;

  return (
    <div ref={colMenuRef} className="dt-col-menu-wrap">
      <button
        className={`dt-tbtn${hiddenCount > 0 ? ' on' : ''}`}
        onClick={() => setColMenuOpen(p => !p)}
        aria-expanded={colMenuOpen}
        aria-label="إظهار / إخفاء الأعمدة"
        title="إدارة الأعمدة"
        type="button"
      >
        <i className="ti ti-layout-columns" aria-hidden="true" />
        {hiddenCount > 0 ? `الأعمدة (${hiddenCount})` : 'الأعمدة'}
      </button>

      {colMenuOpen && (
        <div className="dt-col-menu" role="menu" style={{
          position: 'fixed',
          top:    colMenuPos?.top    ?? 'calc(100% + 6px)',
          left:   colMenuPos?.left   ?? 0,
          zIndex: 300,
        }}>
          <div className="dt-col-menu-header">
            <span>الأعمدة</span>
            <button onClick={toggleCollapseAll} type="button">
              {allHidden ? (
                <>
                  <i className="ti ti-eye" /> إظهار الكل
                </>
              ) : (
                <>
                  <i className="ti ti-eye-off" /> إخفاء الكل
                </>
              )}
            </button>
          </div>
          {nonIndexCols.map(col => (
            <label
              key={col.key}
              className="dt-col-item"
              role="menuitemcheckbox"
              aria-checked={!hiddenKeys.has(col.key)}
            >
              <input
                className="dt-ms-checkbox"
                type="checkbox"
                checked={!hiddenKeys.has(col.key)}
                onChange={() => toggleColVisibility(col.key)}
              />
              <span title={col.exportHeader ?? (typeof col.header === 'string' ? col.header : '')}>{col.exportHeader ?? col.header}</span>
              {!col.disablePin && (
                <div className="dt-col-pin-actions">
                  <button
                    className={`dt-pin-btn${isPinned(col.key) === 'start' ? ' active' : ''}`}
                    onClick={e => {
                      e.preventDefault();
                      pinColumn(
                        col.key,
                        isPinned(col.key) === 'start' ? null : 'start',
                      );
                    }}
                    title="تثبيت يميناً"
                    type="button"
                  >
                    <i className="ti ti-pin" />
                  </button>
                  <button
                    className={`dt-pin-btn${isPinned(col.key) === 'end' ? ' active' : ''}`}
                    onClick={e => {
                      e.preventDefault();
                      pinColumn(
                        col.key,
                        isPinned(col.key) === 'end' ? null : 'end',
                      );
                    }}
                    title="تثبيت يساراً"
                    type="button"
                  >
                    <i className="ti ti-pin-filled" />
                  </button>
                </div>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
