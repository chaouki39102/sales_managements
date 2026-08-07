// components/ui/SimpleTable.tsx
// Lightweight table wrapper — replaces raw <table> across all pages.
// Uses global table CSS from components.css (thead th, tbody tr, td, .tw).
import { Fragment, useMemo, useRef, useState } from 'react';

export interface SimpleColumn {
  /** Unique key matching data row property */
  key: string;
  /** Header label */
  label: React.ReactNode;
  /** Extra className for <th> and <td> */
  className?: string;
  /** Right-align numeric columns */
  align?: 'start' | 'center' | 'end';
  /** Custom render function — receives cell value, entire row, and column key */
  render?: (value: unknown, row: any, columnKey: string) => React.ReactNode;
  /** Click handler on the column header */
  onHeaderClick?: () => void;
  /** Make this header clickable for sorting (with onSort + sortBy/sortDir on the table) */
  sortable?: boolean;
  /** Sort key reported to onSort — defaults to this column's key */
  sortKey?: string;
}

interface SimpleTableProps {
  columns: SimpleColumn[];
  data: any[];
  /** Unique row key — defaults to row.id */
  rowKey?: string | ((row: any) => string | number);
  /** Empty state message */
  emptyText?: string;
  /** Extra class on <table> */
  className?: string;
  /** Row click handler */
  onRowClick?: (row: any, index: number) => void;
  /** Custom row className */
  rowClassName?: (row: any, index: number) => string;
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Number of skeleton rows when loading */
  skeletonRows?: number;
  /** If provided, rows where this returns true get an expand/collapse chevron */
  expandable?: (row: any) => boolean;
  /** Renders the expanded detail row content (shown under the expanded row) */
  renderExpanded?: (row: any) => React.ReactNode;
  /** Currently active sort key ('' = default server order) */
  sortBy?: string;
  /** Direction of the active sort */
  sortDir?: 'asc' | 'desc';
  /** Called when a sortable header is clicked — (sortKey, nextDir) */
  onSort?: (sortKey: string, dir: 'asc' | 'desc') => void;
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
  expandable,
  renderExpanded,
  sortBy = '',
  sortDir = 'asc',
  onSort,
}: SimpleTableProps) {
  const getKey = useMemo(() => {
    if (typeof rowKey === 'function') return rowKey;
    return (row: Record<string, unknown>) => String(row[rowKey] ?? '');
  }, [rowKey]);

  const thStyle = (c: SimpleColumn): React.CSSProperties | undefined => {
    const s: React.CSSProperties = {};
    if (c.align) s.textAlign = c.align;
    if (c.onHeaderClick || (c.sortable && onSort)) { s.cursor = 'pointer'; s.userSelect = 'none'; }
    return Object.keys(s).length ? s : undefined;
  };

  const handleHeaderClick = (c: SimpleColumn) => {
    if (!c.sortable || !onSort) { c.onHeaderClick?.(); return; }
    const key = c.sortKey ?? c.key;
    onSort(key, sortBy === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  const renderHeaderLabel = (c: SimpleColumn) => {
    if (!c.sortable || !onSort) return c.label;
    const key = c.sortKey ?? c.key;
    const active = sortBy === key;
    const icon = active
      ? sortDir === 'asc' ? 'ti-sort-ascending' : 'ti-sort-descending'
      : 'ti-chevrons-up-down';
    return (
      <span className="tw-th-sort">
        <span>{c.label}</span>
        <i
          className={`ti ${icon} tw-th-sort-ic${active ? ' on' : ''}`}
          aria-hidden="true"
        />
      </span>
    );
  };

  const hasExpand = !!(expandable && renderExpanded);

  // Expanded-row keys (Set) — re-rendered via a counter bump on toggle.
  const expandedRef = useRef(new Set<string>());
  const [, forceRender] = useState(0);
  const toggleExpanded = (key: string) => {
    const s = expandedRef.current;
    if (s.has(key)) s.delete(key); else s.add(key);
    forceRender(v => v + 1);
  };

  const expandColumn: SimpleColumn | null = hasExpand ? {
    key: '__expand__',
    label: '',
    className: 'tw-exp-cell',
    render: (_v, row) => {
      const key = String(getKey(row));
      if (!expandable(row)) return null;
      const open = expandedRef.current.has(key);
      return (
        <button
          type="button"
          className="tw-exp-btn"
          title={open ? 'إغلاق التفاصيل' : 'عرض تفاصيل الوثيقة'}
          aria-label={open ? 'إغلاق التفاصيل' : 'عرض التفاصيل'}
          aria-expanded={open}
          onClick={(e) => { e.stopPropagation(); toggleExpanded(key); }}
          style={{
            cursor: 'pointer',
            border: 'none',
            background: open ? 'var(--em-bg)' : 'transparent',
            color: 'var(--em)',
            width: 26,
            height: 26,
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
        </button>
      );
    },
  } : null;

  const headColumns = hasExpand ? [expandColumn!, ...columns] : columns;

  const renderHead = () => (
    <thead>
      <tr>
        {headColumns.map(c => (
          <th key={c.key} className={c.className} onClick={() => handleHeaderClick(c)} style={thStyle(c)}>
            {renderHeaderLabel(c)}
          </th>
        ))}
      </tr>
    </thead>
  );

  const renderCell = (c: SimpleColumn, row: any) => (
    <td key={c.key} className={c.className} style={c.align ? { textAlign: c.align } : undefined}>
      {c.render ? c.render(row[c.key], row, c.key) : (row[c.key] as React.ReactNode) ?? '—'}
    </td>
  );

  if (isLoading) {
    return (
      <div className="tw">
        <table className={className}>
          {renderHead()}
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`skel-${i}`}>
                {headColumns.map(c => (
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
        {renderHead()}
        <tbody>
          {data.map((row, idx) => {
            const key = String(getKey(row));
            const isExpanded = hasExpand && expandable(row) && expandedRef.current.has(key);
            return (
              <Fragment key={key}>
                <tr
                  className={rowClassName?.(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                >
                  {hasExpand && <td className="tw-exp-cell">{expandColumn!.render?.(undefined, row, '__expand__')}</td>}
                  {columns.map(c => renderCell(c, row))}
                </tr>
                {isExpanded && (
                  <tr className="tw-exp-row">
                    <td colSpan={columns.length + 1}>
                      <div className="tw-exp-content">{renderExpanded!(row)}</div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
