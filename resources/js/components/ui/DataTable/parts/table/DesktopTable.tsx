// DataTable/parts/table/DesktopTable.tsx — desktop table (scroll container, colgroup, head/body/foot)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import React from 'react';
import TableHead from './TableHead';
import TableBody from './TableBody';
import AggregatesFooter from './AggregatesFooter';
import type { DataTableState } from '../../internal/useDataTableState';

export default function DesktopTable<T>({ s }: { s: DataTableState<T> }) {
  const {
    aggregates, colWidths, expandable, groupBy, handleDragEnd,
    handleDragMouseDown, handleDragMouseMove, isVirtual, loading, pinBottomRows,
    pinTopRows, pinnedTopOffset, processedData, renderPinnedRow, rowActions,
    scrollContainerRef, selectable, showAggregates, showIndex, tableWrapRef,
    total, totalHeight, virtualHeight, visibleCols,
  } = s;

  return (
    <div
      className="dt-desktop dt-table-outer"
      ref={node => {
        tableWrapRef.current = node;
        scrollContainerRef.current = node;
      }}
      style={
        isVirtual
          ? {
              height: virtualHeight,
              overflowY: 'auto',
              overflowX: 'auto',
              position: 'relative',
            }
          : undefined
      }
      onMouseDown={isVirtual ? undefined : handleDragMouseDown}
      onMouseMove={isVirtual ? undefined : handleDragMouseMove}
      onMouseUp={isVirtual ? undefined : handleDragEnd}
      onMouseLeave={isVirtual ? undefined : handleDragEnd}
    >
      {isVirtual && (
        <div
          style={{
            height: totalHeight,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      <table
        className="dt-table"
        role="grid"
        aria-rowcount={total}
        style={
          isVirtual
            ? {
                position: 'sticky',
                top: 0,
                tableLayout: 'fixed',
                width: '100%',
              }
            : { tableLayout: 'auto', width: 'max-content', minWidth: '100%' }
        }
      >
        <colgroup>
          {expandable && <col style={{ width: 36 }} />}
          {selectable && <col style={{ width: 36 }} />}
          {showIndex && <col style={{ width: 44 }} />}
          {visibleCols.map(col => (
            <col
              key={col.key}
              style={{ width: colWidths[col.key] ?? col.width ?? undefined }}
            />
          ))}
          {rowActions && <col style={{ width: 80 }} />}
        </colgroup>

        {/* ── thead ──────────────────────────────────────────────────────── */}
        <TableHead s={s} />

        {/* ── 🆕 v10.4 — الصفوف المثبَّتة في الأعلى (ثابتة أثناء التمرير) ────── */}
        {!isVirtual && pinTopRows && pinTopRows.length > 0 && (
          <tbody
            className="dt-tbody-pinned dt-tbody-pinned-top"
            style={{ '--dt-pin-top': `${pinnedTopOffset}px` } as React.CSSProperties}
          >
            {pinTopRows.map((row, idx) => renderPinnedRow(row, idx))}
          </tbody>
        )}

        {/* ── tbody ──────────────────────────────────────────────────────── */}
        <TableBody s={s} />

        {/* ── 🆕 v10.4 — الصفوف المثبَّتة في الأسفل (ثابتة أثناء التمرير) ────── */}
        {!isVirtual && pinBottomRows && pinBottomRows.length > 0 && (
          <tbody className="dt-tbody-pinned dt-tbody-pinned-bottom">
            {pinBottomRows.map((row, idx) => renderPinnedRow(row, idx))}
          </tbody>
        )}

        {/* ── Aggregates footer ──────────────────────────────────────────── */}
        {showAggregates && aggregates && !loading && processedData.length > 0 && !groupBy && (
          <AggregatesFooter s={s} />
        )}
      </table>
    </div>
  );
}
