// DataTable/parts/toolbar/ToolbarRight.tsx — toolbar right side (actions, per-page, menus)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import { PER_PAGE_OPTIONS } from '../../types';
import SavedViewsMenu from './SavedViewsMenu';
import ExportMenu from './ExportMenu';
import ColumnsMenu from './ColumnsMenu';
import type { DataTableState } from '../../internal/useDataTableState';

export default function ToolbarRight<T>({ s }: { s: DataTableState<T> }) {
  const {
    autoFitAll, changePerPage, clearAllPins, clearSort, enableExcelExport,
    enableSavedViews, enableSmartFilter, exportConfig, exportable, handleSmartFilter,
    headerActions, isVirtual, keyboardNav, multiSort, perPage,
    pinConfig, processedData, sorts, tableWrapRef, visibleCols,
  } = s;

  return (
    <div className="dt-toolbar-right">
      {headerActions}
      {headerActions && <div className="dt-divider" />}

      {/* per page — select أنيق بدلاً من chips */}
      {!isVirtual && (
        <div className="dt-pp-wrap">
          <label className="dt-pp-label" htmlFor="dt-pp-select">
            <i className="ti ti-layout-rows" aria-hidden="true" />
          </label>
          <div className="dt-pp-select-wrap">
            <select
              id="dt-pp-select"
              className="dt-pp-select"
              value={perPage}
              onChange={e => changePerPage(Number(e.target.value))}
              aria-label="عدد الصفوف لكل صفحة"
            >
              {PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} صف</option>
              ))}
            </select>
            <i className="ti ti-chevron-down dt-pp-chevron" aria-hidden="true" />
          </div>
        </div>
      )}

      {isVirtual && (
        <span className="dt-virtual-badge">
          <i className="ti ti-viewport-narrow" />
          Virtual • {processedData.length.toLocaleString('ar-DZ')} صف
        </span>
      )}

      {/* Keyboard nav indicator */}
      {keyboardNav && (
        <span
          className="dt-tbtn"
          style={{ cursor: 'default', opacity: 0.7 }}
          title="التنقل بلوحة المفاتيح مفعّل — Arrows/Tab/F2/Escape"
        >
          <i className="ti ti-keyboard" />
          KB
        </span>
      )}

      {/* Multi-sort clear */}
      {multiSort && sorts.length > 0 && (
        <button className="dt-tbtn" onClick={clearSort} type="button">
          <i className="ti ti-arrows-sort" />
          مسح الفرز ({sorts.length})
        </button>
      )}

      {/* Unpin all */}
      {(pinConfig.start?.length || pinConfig.end?.length) && (
        <button
          className="dt-tbtn"
          onClick={clearAllPins}
          type="button"
          title="إزالة كل التثبيتات"
        >
          <i className="ti ti-pinned-off" />
        </button>
      )}

      {/* 🆕 Smart Filter */}
      {enableSmartFilter && (
        <button
          className="dt-tbtn"
          onClick={handleSmartFilter}
          type="button"
          title="فلتر ذكي بالعربية"
        >
          <i className="ti ti-robot" />
          فلتر ذكي
        </button>
      )}

      {/* 🆕 Saved Views */}
      {enableSavedViews && (
        <SavedViewsMenu s={s} />
      )}

      {/* 🆕 Export Menu — يجمع CSV + Excel + JSON + Print */}
      {(exportable || enableExcelExport || exportConfig) && <ExportMenu s={s} />}

      {/* 🆕 v10.4 — Auto-Fit All Columns */}
      {visibleCols.length > 0 && (
        <button
          className="dt-tbtn"
          onClick={() => autoFitAll(tableWrapRef.current, visibleCols.map(c => c.key))}
          type="button"
          title="توسيط عرض كل الأعمدة حسب محتواها"
        >
          <i className="ti ti-arrows-horizontal" aria-hidden="true" />
          مقاس
        </button>
      )}

      <div className="dt-divider" />

      {/* إدارة الأعمدة */}
      <ColumnsMenu s={s} />

    </div>
  );
}
