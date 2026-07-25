// components/ui/SimpleTable.tsx
// Lightweight table wrapper — replaces raw <table> across all pages.
// Uses global table CSS from components.css (thead th, tbody tr, td, .tw).
import { useMemo } from 'react';

export interface SimpleColumn {
  /** Unique key matching data row property */
  key: string;
  /** Header label */
  label: string;
  /** Extra className for <th> and <td> */
  className?: string;
  /** Right-align numeric columns */
  align?: 'start' | 'center' | 'end';
  /** Custom render function — receives cell value, entire row, and column key */
  render?: (value: unknown, row: Record<string, unknown>, columnKey: string) => React.ReactNode;
}

interface SimpleTableProps {
  columns: SimpleColumn[];
  data: Record<string, unknown>[];
  /** Unique row key — defaults to row.id */
  rowKey?: string | ((row: Record<string, unknown>) => string | number);
  /** Empty state message */
  emptyText?: string;
  /** Extra class on <table> */
  className?: string;
  /** Row click handler */
  onRowClick?: (row: Record<string, unknown>, index: number) => void;
  /** Custom row className */
  rowClassName?: (row: Record<string, unknown>, index: number) => string;
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Number of skeleton rows when loading */
  skeletonRows?: number;
}

export default function SimpleTable({
  columns,
  data,
  rowKey = 'id',
  emptyText = 'لا توجد بيانات',
  className,
  onRowClick,
  rowClassName,
  isLoading = false,
  skeletonRows = 5,
}: SimpleTableProps) {
  const getKey = useMemo(() => {
    if (typeof rowKey === 'function') return rowKey;
    return (row: Record<string, unknown>) => String(row[rowKey] ?? '');
  }, [rowKey]);

  if (isLoading) {
    return (
      <div className="tw">
        <table className={className}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} className={c.className}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`skel-${i}`}>
                {columns.map(c => (
                  <td key={c.key}><span className="skel" style={{ display: 'inline-block', width: '60%', height: 14, borderRadius: 4 }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="tw">
        <div className="tbl-empty">
          <div className="tbl-empty__inner">
            <i className="ti ti-table-off tbl-empty__icon" style={{ fontSize: 28 }} />
            <span>{emptyText}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tw">
      <table className={className}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className={c.className}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={getKey(row)}
              className={rowClassName?.(row, idx)}
              onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
            >
              {columns.map(c => (
                <td key={c.key} className={c.className}>
                  {c.render ? c.render(row[c.key], row, c.key) : (row[c.key] as React.ReactNode) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
