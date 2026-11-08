// DataTable/internal/useVisibleColumnsAndAggregates.ts — visible columns, column span and aggregates
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useState, useMemo, useCallback } from 'react';
import type { AggregateType } from '../types';
import { AGG_CYCLE } from '../types';
import { computeAggregate } from '../utils';
import type { ResolvedProps } from './resolveProps';
import type { ColumnVisibilityState } from './useColumnVisibilityState';
import type { ColumnArrangementState } from './useColumnArrangement';
import type { RowPipelineState } from './useRowPipeline';

type Params<T> =
  Pick<ResolvedProps<T>, 'columns' | 'columnDefs' | 'selectable' | 'expandable' | 'showIndex' | 'rowActions' | 'showAggregates'>
  & { isMobile: boolean }
  & Pick<ColumnVisibilityState<T>, 'hiddenKeys'>
  & Pick<ColumnArrangementState<T>, 'orderedColumns'>
  & Pick<RowPipelineState<T>, 'processedData'>;

export function useVisibleColumnsAndAggregates<T>(p: Params<T>) {
  const {
    columns, columnDefs, selectable, expandable, showIndex, rowActions,
    showAggregates, isMobile, hiddenKeys, orderedColumns, processedData,
  } = p;

  // ── Visible columns ───────────────────────────────────────────────────────
  const visibleCols = useMemo(
    () => orderedColumns.filter(c => !hiddenKeys.has(c.key) && !(isMobile && c.hideOnMobile)),
    [orderedColumns, hiddenKeys, isMobile],
  );

  const totalColSpan =
    visibleCols.length +
    (selectable ? 1 : 0) +
    (expandable ? 1 : 0) +
    (showIndex ? 1 : 0) +
    (rowActions ? 1 : 0);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const [aggTypes, setAggTypes] = useState<Record<string, AggregateType>>(() =>
    Object.fromEntries(
      (columnDefs ?? columns)
        .filter(c => c.aggregate && typeof c.aggregate === 'string')
        .map(c => [c.key, c.aggregate as AggregateType]),
    ),
  );

  // allColDefs: مرجع موحد لكل الأعمدة (بما فيها المخفية) — يُستخدم في aggregates/edit/smartFilter
  const allColDefs = useMemo(() => columnDefs ?? columns, [columnDefs, columns]);

  const aggregates = useMemo(() => {
    if (!showAggregates) return null;
    const r: Record<string, { value: number | null; type: AggregateType }> = {};
    for (const col of allColDefs) {
      if (!col.aggregate) continue;
      if (typeof col.aggregate === 'function') {
        const v = col.aggregate(processedData);
        r[col.key] = { value: v as number | null, type: 'sum' };
      } else {
        const type = aggTypes[col.key] ?? col.aggregate;
        r[col.key] = { value: computeAggregate(processedData, col, type), type };
      }
    }
    return r;
  }, [showAggregates, processedData, allColDefs, aggTypes]);

  const cycleAgg = useCallback(
    (key: string) => {
      setAggTypes(prev => {
        const cur = prev[key] ?? 'sum';
        const idx = AGG_CYCLE.indexOf(cur);
        return { ...prev, [key]: AGG_CYCLE[(idx + 1) % AGG_CYCLE.length] };
      });
    },
    [],
  );

  return { visibleCols, totalColSpan, allColDefs, aggregates, cycleAgg };
}

export type VisibleColumnsAndAggregatesState<T> = ReturnType<typeof useVisibleColumnsAndAggregates<T>>;
