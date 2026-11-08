// DataTable/internal/useRenderHelpers.tsx — empty-state renderer + pinned (top/bottom) rows
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useCallback, useEffect } from 'react';
import type { Column } from '../types';
import { getRawValue, getTextAlign, applyConditionalFormat } from '../utils';
import type { ResolvedProps } from './resolveProps';
import type { RowPipelineState } from './useRowPipeline';
import type { NavigationAndClipboardState } from './useNavigationAndClipboard';
import type { VisibleColumnsAndAggregatesState } from './useVisibleColumnsAndAggregates';
import type { ColumnArrangementState } from './useColumnArrangement';

type Params<T> =
  Pick<ResolvedProps<T>, 'emptyNode' | 'emptyText' | 'emptyAction' | 'pinTopRows' | 'pinBottomRows' | 'rowKey' | 'expandable' | 'selectable' | 'showIndex' | 'rowActions' | 'conditionalFormatting'>
  & Pick<RowPipelineState<T>, 'isVirtual'>
  & Pick<NavigationAndClipboardState<T>, 'tableWrapRef'>
  & Pick<VisibleColumnsAndAggregatesState<T>, 'visibleCols'>
  & Pick<ColumnArrangementState<T>, 'getEffectiveSticky'>;

export function useRenderHelpers<T>(p: Params<T>) {
  const {
    emptyNode, emptyText, emptyAction, pinTopRows, pinBottomRows, rowKey,
    expandable, selectable, showIndex, rowActions, conditionalFormatting, isVirtual,
    tableWrapRef, visibleCols, getEffectiveSticky,
  } = p;

  // ─── helper: محتوى الحالة الفارغة (emptyNode مخصص أو الافتراضي) ───────────
  const renderEmptyContent = useCallback((withAction: boolean) =>
    emptyNode ?? (
      <div className="dt-empty" role="status">
        <i className="ti ti-inbox" aria-hidden="true" />
        <span className="dt-empty-text">{emptyText}</span>
        {withAction && emptyAction}
      </div>
    ),
  [emptyNode, emptyText, emptyAction]);

  // ─── helper: صف مثبَّت (أعلى / أسفل) — يعيد نفس خلايا الصف العادي ─────────
  // قياس ارتفاع thead حتى تلتصق الصفوف المثبَّتة أسفله تماماً
  const [pinnedTopOffset, setPinnedTopOffset] = useState(0);
  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el || (!pinTopRows?.length && !pinBottomRows?.length)) return;
    const thead = el.querySelector('thead');
    if (!thead) return;
    const measure = () => setPinnedTopOffset(thead.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(thead);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
  }, [pinTopRows?.length, pinBottomRows?.length, isVirtual]);

  const renderPinnedRow = useCallback((row: T, index: number) => {
    const rKey = rowKey(row, index);
    return (
      <tr key={`pin-${String(rKey)}`} className="dt-row dt-pinned-row" data-pinned-row={index}>
        {expandable && <td className="dt-td-exp" />}
        {selectable && <td className="dt-td-sel" />}
        {showIndex && <td className="dt-td dt-td-idx" />}
        {visibleCols.map(col => {
          const rawVal = getRawValue(row, col as Column<T>);
          const cfResult = conditionalFormatting?.length
            ? applyConditionalFormat(rawVal, row, col.key, conditionalFormatting)
            : { style: {}, className: '' };
          const sticky = getEffectiveSticky(col as Column<T>);
          return (
            <td
              key={col.key}
              className={[
                'dt-td',
                sticky === 'start' ? 'dt-sticky-start dt-pinned' : '',
                sticky === 'end' ? 'dt-sticky-end dt-pinned' : '',
                cfResult.className,
              ].filter(Boolean).join(' ')}
              style={{ textAlign: getTextAlign(col.align), ...cfResult.style }}
              data-col-key={col.key}
            >
              {col.render ? col.render(row, index) : String(rawVal ?? '—')}
            </td>
          );
        })}
        {rowActions && <td style={{ textAlign: 'center', padding: '0 6px' }} />}
      </tr>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowKey, expandable, selectable, showIndex, visibleCols, rowActions, conditionalFormatting, getEffectiveSticky]);

  return { renderEmptyContent, pinnedTopOffset, renderPinnedRow };
}

export type RenderHelpersState<T> = ReturnType<typeof useRenderHelpers<T>>;
