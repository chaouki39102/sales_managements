import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'start' | 'center' | 'end';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string | number);
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  className?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir?: 'asc' | 'desc' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: active ? 1 : 0.4 }}>
      <path d={dir === 'desc' || !active ? "M3 4.5l3-3 3 3" : "M3 7.5l3 3 3-3"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      {!active && <path d="M3 7.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>}
    </svg>
  );
}

function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="tbl-row">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="tbl-cell">
              <div className="tbl-skel" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Table<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  selectable = false,
  selectedKeys,
  onSelectionChange,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  stickyHeader = false,
  className = '',
}: TableProps<T>) {

  const getKey = (row: T): string | number =>
    typeof rowKey === 'function' ? rowKey(row) : row[rowKey] as string | number;

  const allKeys = data.map(getKey);
  const allSelected = allKeys.length > 0 && allKeys.every(k => selectedKeys?.has(k));
  const someSelected = !allSelected && allKeys.some(k => selectedKeys?.has(k));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(allKeys));
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const effectiveCols = selectable
    ? [{ key: '__select__', header: '', width: 44 } as TableColumn<T>, ...columns]
    : columns;

  return (
    <div className={`tbl-outer ${className}`}>
      <table className="tbl" role="grid">
        <thead className={`tbl-head ${stickyHeader ? 'sticky' : ''}`}>
          <tr>
            {effectiveCols.map(col => {
              if (col.key === '__select__') return (
                <th key="__select__" className="tbl-th tbl-th--select">
                  <input
                    type="checkbox"
                    className="tbl-checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    aria-label="تحديد الكل"
                  />
                </th>
              );
              const isSorted = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  className={`tbl-th ${col.sortable ? 'sortable' : ''} align-${col.align ?? 'start'}`}
                  style={{ width: col.width }}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="tbl-th__inner">
                    {col.header}
                    {col.sortable && <SortIcon active={isSorted} dir={isSorted ? sortDir : undefined} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <TableSkeleton cols={effectiveCols.length} rows={5} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={effectiveCols.length} className="tbl-empty">
                <div className="tbl-empty__inner">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="tbl-empty__icon">
                    <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 14h32" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 22h8M12 27h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const key = getKey(row);
              const isSelected = selectedKeys?.has(key);
              return (
                <tr
                  key={key}
                  className={`tbl-row ${isSelected ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  aria-selected={selectable ? isSelected : undefined}
                >
                  {effectiveCols.map(col => {
                    if (col.key === '__select__') return (
                      <td key="__select__" className="tbl-cell tbl-cell--select" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="tbl-checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          aria-label={`تحديد الصف ${i + 1}`}
                        />
                      </td>
                    );
                    return (
                      <td key={col.key} className={`tbl-cell align-${col.align ?? 'start'}`}>
                        {col.render ? col.render(row, i) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <style>{`
        .tbl-outer { width: 100%; overflow-x: auto; border-radius: 10px; border: 1px solid var(--color-border-tertiary); }
        .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
        .tbl-head { background: var(--color-background-secondary); }
        .tbl-head.sticky { position: sticky; top: 0; z-index: 2; }
        .tbl-th {
          padding: 10px 14px; font-size: 12px; font-weight: 500;
          color: var(--color-text-secondary); text-align: start;
          border-bottom: 1px solid var(--color-border-secondary);
          white-space: nowrap; user-select: none;
        }
        .tbl-th.sortable { cursor: pointer; }
        .tbl-th.sortable:hover { color: var(--color-text-primary); background: var(--color-background-tertiary); }
        .tbl-th.align-center { text-align: center; }
        .tbl-th.align-end    { text-align: end; }
        .tbl-th--select { width: 44px; padding: 10px 12px; }
        .tbl-th__inner { display: inline-flex; align-items: center; gap: 5px; }
        .tbl-row { border-bottom: 1px solid var(--color-border-tertiary); transition: background .1s; }
        .tbl-row:last-child { border-bottom: none; }
        .tbl-row:hover { background: var(--color-background-secondary); }
        .tbl-row.selected { background: color-mix(in srgb, var(--color-text-info, #3b82f6) 6%, transparent); }
        .tbl-row.clickable { cursor: pointer; }
        .tbl-cell { padding: 12px 14px; color: var(--color-text-primary); vertical-align: middle; }
        .tbl-cell.align-center { text-align: center; }
        .tbl-cell.align-end    { text-align: end; }
        .tbl-cell--select { padding: 12px 12px; width: 44px; }
        .tbl-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-text-info, #3b82f6); }
        .tbl-empty { padding: 48px 20px; text-align: center; color: var(--color-text-secondary); }
        .tbl-empty__inner { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .tbl-empty__icon { color: var(--color-text-tertiary); }
        .tbl-skel {
          height: 13px; border-radius: 4px;
          background: linear-gradient(90deg, var(--color-background-secondary) 25%, var(--color-background-tertiary) 50%, var(--color-background-secondary) 75%);
          background-size: 400px 100%;
          animation: tbl-shimmer 1.4s infinite linear;
        }
        @keyframes tbl-shimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
      `}</style>
    </div>
  );
}

export default Table;
