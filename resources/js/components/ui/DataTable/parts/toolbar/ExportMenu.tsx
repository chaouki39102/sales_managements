// DataTable/parts/toolbar/ExportMenu.tsx — export dropdown (CSV / Excel / JSON / print)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { ExportFormat } from '../../types';
import type { DataTableState } from '../../internal/useDataTableState';

export default function ExportMenu<T>({ s }: { s: DataTableState<T> }) {
  const {
    enableExcelExport, exportConfig, exportMenuOpen, exportMenuPos, exportMenuRef,
    exportScope, handleExport, isServerPaged, pagination, processedData,
    selectable, selectedKeys, setExportMenuOpen, setExportScope,
  } = s;

  const formats = exportConfig?.formats ?? (
    enableExcelExport
      ? ['csv', 'excel', 'json', 'print'] as ExportFormat[]
      : ['csv', 'json', 'print'] as ExportFormat[]
  );
  const ITEMS = [
    { fmt: 'csv' as const,   icon: 'ti-file-text',        label: 'CSV',         ext: '.csv' },
    { fmt: 'excel' as const, icon: 'ti-file-spreadsheet', label: 'Excel',       ext: '.xlsx' },
    { fmt: 'json' as const,  icon: 'ti-file-code',        label: 'JSON',        ext: '.json' },
    { fmt: 'print' as const, icon: 'ti-printer',          label: 'طباعة / PDF', ext: '' },
  ].filter(i => formats.includes(i.fmt));

  return (
    <div ref={exportMenuRef} className="dt-export-wrap">
      <button
        className={`dt-tbtn${exportMenuOpen ? ' on' : ''}`}
        onClick={() => setExportMenuOpen(p => !p)}
        aria-expanded={exportMenuOpen}
        aria-haspopup="menu"
        title="تصدير البيانات"
        type="button"
      >
        <i className="ti ti-download" aria-hidden="true" />
        تصدير
        <i className="ti ti-chevron-down dt-export-chevron" aria-hidden="true" />
      </button>

      {exportMenuOpen && (
        <div className="dt-export-menu" role="menu" style={{
          position: 'fixed',
          top:  exportMenuPos?.top  ?? 'calc(100% + 6px)',
          left: exportMenuPos?.left ?? 0,
          zIndex: 300,
        }}>
          <div className="dt-export-menu-title">تصدير البيانات</div>
          <div className="dt-export-menu-count">
            {isServerPaged
              ? `${(pagination?.total ?? processedData.length).toLocaleString('ar-DZ')} سجل (الكل)`
              : `${processedData.length.toLocaleString('ar-DZ')} سجل`}
          </div>
          {/* 🆕 v10.4 — نطاق التصدير: الكل / المحدد فقط */}
          {selectable && selectedKeys.size > 0 && (
            <div className="dt-export-scope" role="group" aria-label="نطاق التصدير">
              <button
                type="button"
                className={exportScope === 'all' ? 'on' : ''}
                onClick={() => setExportScope('all')}
              >
                الكل ({processedData.length.toLocaleString('ar-DZ')})
              </button>
              <button
                type="button"
                className={exportScope === 'selected' ? 'on' : ''}
                onClick={() => setExportScope('selected')}
              >
                المحدد ({selectedKeys.size.toLocaleString('ar-DZ')})
              </button>
            </div>
          )}
          {ITEMS.map(item => (
            <button
              key={item.fmt}
              className="dt-export-item"
              role="menuitem"
              type="button"
              onClick={() => handleExport(item.fmt)}
            >
              <i className={`ti ${item.icon} dt-export-item-icon`} aria-hidden="true" />
              <span className="dt-export-item-label">{item.label}</span>
              {item.ext && (
                <span className="dt-export-item-ext">{item.ext}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
