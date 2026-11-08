// DataTable/parts/table/HeaderCell.tsx — one sortable / filterable / pinnable header cell
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { Column } from '../../types';
import { getTextAlign } from '../../utils';
import PinMenu from './PinMenu';
import FilterPopup from '../../FilterPopup';
import type { DataTableState } from '../../internal/useDataTableState';

export default function HeaderCell<T>({ s, col }: { s: DataTableState<T>; col: Column<T> }) {
  const {
    allData, autoSize, colWidths, columnReorder, data,
    dragHandlers, dragOverKey, filters, getEffectiveSticky, getFilterBtnRef,
    getSortDir, getSortIndex, handleFilterChange, handleSortToggle, isPinned,
    legacySortState, multiSort, openFilterKey, pinColumn, pinMenuKey,
    setOpenFilterKey, setPinMenuKey, startResize, tableWrapRef,
  } = s;

  const canSort = col.sortable !== false;
  const sortIdx = getSortIndex(col.key);
  const sortDir = getSortDir(col.key);
  const isSorted = sortDir !== null;
  const singleSorted = !multiSort && legacySortState.key === col.key;
  const singleDir = !multiSort ? legacySortState.dir : null;

  const canDrag = columnReorder && !col.sticky && !col.disableDrag;
  const isDragOver = dragOverKey === col.key;
  const sticky = getEffectiveSticky(col as Column<T>);
  const pinned = isPinned(col.key);

  return (
    <th
      key={col.key}
      className={[
        'dt-th',
        canSort ? 'dt-th-sort' : '',
        isSorted || singleSorted ? 'dt-th-sorted' : '',
        sticky === 'start' ? 'dt-sticky-start dt-pinned' : '',
        sticky === 'end' ? 'dt-sticky-end dt-pinned' : '',
        isDragOver ? 'dt-th-drag-over' : '',
        canDrag ? 'dt-th-draggable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ textAlign: getTextAlign(col.align), position: 'relative' }}
      aria-sort={
        isSorted || singleSorted
          ? (sortDir ?? singleDir) === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined
      }
      draggable={canDrag}
      title={col.headerTooltip}
      onDragStart={
        canDrag ? e => dragHandlers.onDragStart(col.key, e) : undefined
      }
      onDragOver={
        canDrag ? e => dragHandlers.onDragOver(col.key, e) : undefined
      }
      onDrop={canDrag ? e => dragHandlers.onDrop(col.key, e) : undefined}
      onDragEnd={canDrag ? dragHandlers.onDragEnd : undefined}
      data-col-key={col.key}
    >
      <div className="dt-th-inner">
        {canSort ? (
          <button
            className="dt-sort-btn"
            onClick={e => handleSortToggle(col.key, e)}
            type="button"
            title={
              multiSort
                ? 'Click للفرز • Shift+Click لإضافة عمود فرز'
                : 'Click للفرز'
            }
          >
            {col.header}
            <span className="dt-sort-ic" aria-hidden="true">
              {multiSort && isSorted ? (
                <>
                  <span className="dt-sort-priority">{sortIdx + 1}</span>
                  <i
                    className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`}
                  />
                </>
              ) : singleSorted ? (
                <i
                  className={`ti ti-arrow-${singleDir === 'asc' ? 'up' : 'down'}`}
                />
              ) : (
                <i className="ti ti-arrows-sort" />
              )}
            </span>
          </button>
        ) : (
          <span title={col.exportHeader ?? (typeof col.header === 'string' ? col.header : '')}>{col.exportHeader ?? col.header}</span>
        )}

        {col.filter && (
          <button
            ref={getFilterBtnRef(col.key)}
            className={`dt-flt-btn${filters[col.key] ? ' on' : ''}`}
            onClick={e => {
              e.stopPropagation();
              setOpenFilterKey(p => (p === col.key ? null : col.key));
            }}
            type="button"
            aria-label={`فلتر ${typeof col.header === 'string' ? col.header : ''}`}
            aria-expanded={openFilterKey === col.key}
          >
            <i
              className={`ti ${filters[col.key] ? 'ti-filter-filled' : 'ti-filter'}`}
              aria-hidden="true"
            />
          </button>
        )}

        {!col.disablePin && (
          <button
            className={`dt-th-pin-btn${pinned ? ' active' : ''}`}
            onClick={e => {
              e.stopPropagation();
              setPinMenuKey(p => (p === col.key ? null : col.key));
            }}
            title="تثبيت العمود"
            type="button"
            aria-label="خيارات تثبيت العمود"
          >
            <i className={`ti ${pinned ? 'ti-pinned' : 'ti-pin'}`} />
          </button>
        )}

        <span
          className="dt-rh"
          onMouseDown={e =>
            startResize(
              col.key,
              colWidths[col.key] ?? col.width ?? 120,
              e,
            )
          }
          onDoubleClick={() => autoSize(tableWrapRef.current, col.key)}
          aria-hidden="true"
          title="اسحب لتغيير العرض • دوبل-كليك لإعادة الضبط"
        />
      </div>

      {pinMenuKey === col.key && (
        <PinMenu
          colKey={col.key}
          current={pinned}
          onPin={side => {
            pinColumn(col.key, side);
            setPinMenuKey(null);
          }}
          onClose={() => setPinMenuKey(null)}
        />
      )}

      {openFilterKey === col.key && col.filter && (
        <FilterPopup
          col={col as Column<Record<string, unknown>>}
          value={filters[col.key] ?? ''}
          onChange={v => handleFilterChange(col.key, v)}
          anchorRef={getFilterBtnRef(col.key)}
          onClose={() => setOpenFilterKey(null)}
          allData={allData as Record<string, unknown>[] | undefined}
          data={data as Record<string, unknown>[]}
        />
      )}
    </th>
  );
}
