// DataTable/parts/toolbar/ToolbarLeft.tsx — toolbar left side (title, search, filter badge, group/tree buttons)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../../internal/useDataTableState';

export default function ToolbarLeft<T>({ s }: { s: DataTableState<T> }) {
  const {
    activeFilterCount, clearAllFilters, collapseAllGroups, collapseAllTree, expandAllGroups,
    expandAllTree, globalQuery, groupBy, groups, handleSearchChange,
    isTreeMode, searchPlaceholder, searchable, title,
  } = s;

  return (
    <div className="dt-toolbar-left">
      {title && <span className="dt-toolbar-title">{title}</span>}

      {searchable && (
        <div className="srch dt-search">
          <span className="srch-ic">
            <i className="ti ti-search" aria-hidden="true" />
          </span>
          <input
            type="text"
            value={globalQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {globalQuery && (
            <button
              className="dt-search-clear"
              onClick={() => handleSearchChange('')}
              aria-label="مسح البحث"
              type="button"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {activeFilterCount > 0 && (
        <span className="dt-filter-badge">
          <i className="ti ti-filter" aria-hidden="true" />
          {activeFilterCount}
          <button onClick={clearAllFilters} aria-label="مسح كل الفلاتر" type="button">
            ×
          </button>
        </span>
      )}

      {groupBy && groups && (
        <div className="dt-toolbar-group-btns">
          <button
            className="dt-tbtn"
            onClick={expandAllGroups}
            type="button"
            title="توسيع كل المجموعات"
          >
            <i className="ti ti-layout-list" />
            توسيع الكل
          </button>
          <button
            className="dt-tbtn"
            onClick={collapseAllGroups}
            type="button"
            title="طي كل المجموعات"
          >
            <i className="ti ti-layout-rows" />
            طي الكل
          </button>
        </div>
      )}

      {isTreeMode && (
        <div className="dt-toolbar-group-btns">
          <button
            className="dt-tbtn"
            onClick={expandAllTree}
            type="button"
            title="توسيع كل العناصر"
          >
            <i className="ti ti-layout-list" />
            توسيع الكل
          </button>
          <button
            className="dt-tbtn"
            onClick={collapseAllTree}
            type="button"
            title="طي كل العناصر"
          >
            <i className="ti ti-layout-rows" />
            طي الكل
          </button>
        </div>
      )}
    </div>
  );
}
