// DataTable/internal/useRowPipeline.ts — client-side row model, row grouping, virtual scroll and page slice
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useMemo } from 'react';
import { DEFAULT_ROW_HEIGHT, DEFAULT_CONTAINER_HEIGHT } from '../types';
import { useVirtualScroll, useRowGrouping, useRowModel } from '../hooks';
import type { ResolvedProps } from './resolveProps';
import type { ColumnVisibilityState } from './useColumnVisibilityState';
import type { ColumnArrangementState } from './useColumnArrangement';
import type { SearchFilterSortState } from './useSearchFilterSort';

type Params<T> =
  Pick<ResolvedProps<T>, 'data' | 'onFilterChange' | 'onSortChange' | 'onMultiSortChange' | 'searchable' | 'multiSort' | 'groupBy' | 'virtual'>
  & Pick<ColumnVisibilityState<T>, 'hiddenKeys'>
  & Pick<ColumnArrangementState<T>, 'orderedColumns'>
  & Pick<SearchFilterSortState<T>, 'filters' | 'globalQuery' | 'sorts' | 'legacySortState' | 'isServerPaged' | 'localPage' | 'localPerPage'>;

export function useRowPipeline<T>(p: Params<T>) {
  const {
    data, onFilterChange, onSortChange, onMultiSortChange, searchable, multiSort,
    groupBy, virtual, hiddenKeys, orderedColumns, filters, globalQuery,
    sorts, legacySortState, isServerPaged, localPage, localPerPage,
  } = p;

  // ── Client-side data processing (useRowModel — خارج دورة React) ─────────
  const isClientFiltered = !onFilterChange;
  const isClientSorted = !onSortChange && !onMultiSortChange;

  // searchCols: فقط الأعمدة المرئية وغير المخفية للبحث العام
  // فلترة الأعمدة المخفية من البحث تمنع ظهور نتائج مربِكة للمستخدم
  const searchCols = useMemo(
    () => orderedColumns.filter(c => !hiddenKeys.has(c.key)),
    [orderedColumns, hiddenKeys],
  );

  const processedData = useRowModel(
    data,
    filters,
    globalQuery,
    sorts,
    legacySortState,
    orderedColumns,   // كل الأعمدة للفلترة (المخفية تُفلتر أيضاً)
    searchCols,       // فقط المرئية للبحث العام
    {
      clientFiltered: isClientFiltered,
      clientSorted: isClientSorted,
      searchable,
      multiSort,
    },
  );

  // ── Row Grouping (v10) ────────────────────────────────────────────────────
  const {
    groups,
    toggleGroup,
    expandAll: expandAllGroups,
    collapseAll: collapseAllGroups,
    groupSubTotals,
  } = useRowGrouping(processedData, groupBy, orderedColumns);

  // ── Virtual Scrolling (v9) — must come before quick filter & pagination ───
  const isVirtual = !!virtual;
  const {
    scrollContainerRef,
    totalHeight,
    offsetY,
    visibleRange,
    containerHeight: virtualHeight,
    rowHeight,
  } = useVirtualScroll({
    rowCount: isVirtual ? processedData.length : 0,
    rowHeight: virtual?.rowHeight ?? DEFAULT_ROW_HEIGHT,
    containerHeight: virtual?.containerHeight ?? DEFAULT_CONTAINER_HEIGHT,
    overscan: virtual?.overscan,
  });

  const displayData = useMemo(() => {
    if (isVirtual) return processedData;
    if (isServerPaged) return processedData;
    const s = (localPage - 1) * localPerPage;
    return processedData.slice(s, s + localPerPage);
  }, [processedData, isVirtual, isServerPaged, localPage, localPerPage]);

  return {
    processedData, groups, toggleGroup, expandAllGroups, collapseAllGroups, groupSubTotals,
    isVirtual, scrollContainerRef, totalHeight, offsetY, visibleRange, virtualHeight,
    rowHeight, displayData,
  };
}

export type RowPipelineState<T> = ReturnType<typeof useRowPipeline<T>>;
