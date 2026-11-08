// DataTable/internal/useRenderDataRow.tsx — memoised renderer for one data row
// Extracted verbatim from the DataTable component body (no behaviour change).

import React, { useCallback } from 'react';
import type { Column } from '../types';
import { getRawValue, getTextAlign, applyConditionalFormat } from '../utils';
import { EditInput } from '../Primitives';
import type { ResolvedProps } from './resolveProps';
import type { SelectionAndExpandState } from './useSelectionAndExpand';
import type { RowPipelineState } from './useRowPipeline';
import type { PaginationState } from './usePagination';
import type { VisibleColumnsAndAggregatesState } from './useVisibleColumnsAndAggregates';
import type { CellEditingState } from './useCellEditing';
import type { NavigationAndClipboardState } from './useNavigationAndClipboard';
import type { ColumnArrangementState } from './useColumnArrangement';

type Params<T> =
  Pick<ResolvedProps<T>, 'rowKey' | 'expandable' | 'isExpandable' | 'rowClassName' | 'hoverActions' | 'onRowClick' | 'onRowDoubleClick' | 'selectable' | 'showIndex' | 'onCellEdit' | 'batchEdit' | 'keyboardNav' | 'conditionalFormatting' | 'enableRangeSelection' | 'rowActions' | 'renderExpanded'>
  & Pick<SelectionAndExpandState<T>, 'selectedKeys' | 'expandedKeys' | 'hoveredRowKey' | 'setHoveredRowKey' | 'toggleExpanded' | 'toggleRow'>
  & Pick<RowPipelineState<T>, 'isVirtual' | 'rowHeight'>
  & Pick<PaginationState<T>, 'curPage' | 'perPage'>
  & Pick<VisibleColumnsAndAggregatesState<T>, 'visibleCols' | 'totalColSpan'>
  & Pick<CellEditingState<T>, 'editingCell' | 'setEditingCell' | 'batch' | 'getError' | 'startEdit' | 'commitEdit' | 'cancelEdit'>
  & Pick<NavigationAndClipboardState<T>, 'activeCell' | 'activateCell' | 'isInRange' | 'selectCell'>
  & Pick<ColumnArrangementState<T>, 'getEffectiveSticky'>;

export function useRenderDataRow<T>(p: Params<T>) {
  const {
    rowKey, expandable, isExpandable, rowClassName, hoverActions, onRowClick,
    onRowDoubleClick, selectable, showIndex, onCellEdit, batchEdit, keyboardNav,
    conditionalFormatting, enableRangeSelection, rowActions, renderExpanded, selectedKeys, expandedKeys,
    hoveredRowKey, setHoveredRowKey, toggleExpanded, toggleRow, isVirtual, rowHeight,
    curPage, perPage, visibleCols, totalColSpan, editingCell, setEditingCell,
    batch, getError, startEdit, commitEdit, cancelEdit, activeCell,
    activateCell, isInRange, selectCell, getEffectiveSticky,
  } = p;

  // ─── Render Helper: صف بيانات (useCallback لتجنب إعادة إنشاء الدالة) ──────
  const renderDataRow = useCallback((row: T, absoluteIdx: number) => {
    const rKey = rowKey(row, absoluteIdx);
    const isSelected = selectedKeys.has(rKey);
    const isExpanded = expandedKeys.has(rKey);
    const canExpand = expandable && (!isExpandable || isExpandable(row));
    const extraClass = rowClassName?.(row) ?? '';
    const hasHoverActions = !!hoverActions && hoveredRowKey === rKey;

    return (
      <React.Fragment key={rKey}>
        <tr
          className={[
            'dt-row',
            isSelected ? 'dt-row-sel' : '',
            onRowClick ? 'dt-row-click' : '',
            hasHoverActions ? 'dt-row-hovered' : '',
            extraClass,
          ]
            .filter(Boolean)
            .join(' ')}
          style={isVirtual ? { height: rowHeight } : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
          onMouseEnter={hoverActions ? () => setHoveredRowKey(rKey) : undefined}
          onMouseLeave={hoverActions ? () => setHoveredRowKey(null) : undefined}
          aria-selected={selectable ? isSelected : undefined}
          data-row-index={absoluteIdx}
        >
          {expandable && (
            <td className="dt-td-exp">
              {canExpand && (
                <button
                  className={`dt-exp-btn${isExpanded ? ' on' : ''}`}
                  onClick={e => toggleExpanded(rKey, e)}
                  type="button"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'طي' : 'توسيع'}
                >
                  <i
                    className={`ti ti-chevron-${isExpanded ? 'down' : 'left'}`}
                    aria-hidden="true"
                  />
                </button>
              )}
            </td>
          )}

          {selectable && (
            <td className="dt-td-sel" onClick={e => toggleRow(rKey, e)}>
              <input
                className="dt-cb"
                type="checkbox"
                checked={isSelected}
                onChange={e => {
                  e.stopPropagation();
                  toggleRow(rKey, e);
                }}
                onClick={e => e.stopPropagation()}
                aria-label={`تحديد الصف ${absoluteIdx + 1}`}
              />
            </td>
          )}

          {showIndex && (
            <td className="dt-td dt-td-idx">
              {((curPage - 1) * perPage + absoluteIdx + 1).toLocaleString('ar-DZ')}
            </td>
          )}

          {visibleCols.map((col, colIdx) => {
            const rawVal = getRawValue(row, col as Column<T>);
            const cellId = `${rKey}__${col.key}`;
            const isEditing = editingCell?.rowKey === rKey && editingCell?.colKey === col.key;
            const canEdit = !!col.editable && (!!onCellEdit || batchEdit);
            const isActiveCb =
              keyboardNav &&
              activeCell?.rowIndex === absoluteIdx &&
              activeCell?.colIndex === colIdx;
            const cellError = getError(cellId);

            const pendingVal = batchEdit ? batch.getPendingValue(rKey, col.key) : undefined;
            const hasPending = pendingVal !== undefined;
            const displayVal = pendingVal ?? rawVal;

            const cfResult = conditionalFormatting?.length
              ? applyConditionalFormat(
                  rawVal,
                  row,
                  col.key,
                  conditionalFormatting,
                )
              : { style: {}, className: '' };

            const sticky = getEffectiveSticky(col as Column<T>);

            return (
              <td
                key={col.key}
                className={[
                  'dt-td',
                  sticky === 'start' ? 'dt-sticky-start dt-pinned' : '',
                  sticky === 'end' ? 'dt-sticky-end dt-pinned' : '',
                  canEdit && !isEditing ? 'dt-td-editable' : '',
                  isActiveCb ? 'dt-cell-active' : '',
                  hasPending ? 'dt-cell-pending' : '',
                  enableRangeSelection && isInRange(absoluteIdx, colIdx) ? 'dt-cell-selected' : '',
                  cfResult.className,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  textAlign: getTextAlign(col.align),
                  background: isEditing ? 'var(--emb)' : undefined,
                  whiteSpace: isEditing ? 'normal' : undefined,
                  position: cellError ? 'relative' : undefined,
                  ...cfResult.style,
                }}
                data-row-index={absoluteIdx}
                data-col-key={col.key}
                onClick={e => {
                  if (keyboardNav) activateCell({ rowIndex: absoluteIdx, colIndex: colIdx });
                  if (enableRangeSelection) selectCell(absoluteIdx, colIdx, e.shiftKey);
                  if (canEdit && !isEditing) startEdit(rKey, col.key, rawVal, e);
                }}
                title={
                  isEditing ? undefined
                  : canEdit ? 'انقر للتعديل'
                  : col.tooltip
                    ? typeof col.tooltip === 'function'
                      ? col.tooltip(row, absoluteIdx)
                      : col.tooltip
                    : undefined
                }
                tabIndex={keyboardNav ? 0 : undefined}
              >
                {isEditing && col.editable ? (
                  <>
                    <EditInput
                      def={col.editable}
                      value={editingCell!.value}
                      onChange={v => setEditingCell(p => (p ? { ...p, value: v } : null))}
                      onCommit={commitEdit}
                      onCancel={cancelEdit}
                    />
                    {cellError && <div className="dt-cell-error">{cellError}</div>}
                  </>
                ) : col.render ? (
                  <span className={hasPending ? 'dt-pending-value' : undefined}>
                    {col.render(row, absoluteIdx)}
                  </span>
                ) : (
                  <span className={hasPending ? 'dt-pending-value' : undefined}>
                    {String(displayVal ?? '—')}
                  </span>
                )}
                {!isEditing && (
                  <button
                    className="dt-copy-btn"
                    type="button"
                    title="نسخ"
                    aria-label="نسخ القيمة"
                    tabIndex={-1}
                    onClick={e => {
                      e.stopPropagation();
                      const val = String(displayVal ?? '');
                      navigator.clipboard.writeText(val).then(() => {
                        const btn = e.currentTarget;
                        btn.classList.add('dt-copy-ok');
                        setTimeout(() => btn.classList.remove('dt-copy-ok'), 1000);
                      }).catch(() => {});
                    }}
                  >
                    <i className="ti ti-copy" />
                  </button>
                )}
              </td>
            );
          })}

          {rowActions && (
            <td
              style={{ textAlign: 'center', padding: '0 6px', whiteSpace: 'nowrap' }}
              onClick={e => e.stopPropagation()}
            >
              {rowActions(row)}
            </td>
          )}
        </tr>

        {hasHoverActions && (
          <tr className="dt-hover-row">
            <td colSpan={totalColSpan} className="dt-hover-td">
              <div className="dt-hover-bar">
                {hoverActions!(row)}
              </div>
            </td>
          </tr>
        )}

        {isExpanded && renderExpanded && (
          <tr>
            <td colSpan={totalColSpan} className="dt-exp-td">
              <div className="dt-exp-inner">{renderExpanded(row, absoluteIdx)}</div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rowKey, selectable, expandable, showIndex, rowActions, hoverActions, keyboardNav,
    visibleCols, editingCell, batchEdit, batch, conditionalFormatting,
    getEffectiveSticky, activeCell, getError, startEdit, activateCell,
    commitEdit, cancelEdit, onRowClick, onRowDoubleClick, rowClassName,
    curPage, perPage, isVirtual, rowHeight, totalColSpan,
    renderExpanded, expandedKeys, toggleExpanded, selectedKeys, toggleRow,
    enableRangeSelection, isInRange, selectCell, hoveredRowKey,
  ]);

  return { renderDataRow };
}

export type RenderDataRowState<T> = ReturnType<typeof useRenderDataRow<T>>;
