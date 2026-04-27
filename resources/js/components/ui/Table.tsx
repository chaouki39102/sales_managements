// components/ui/Table.tsx
import React, { useState, useMemo } from 'react';

/* ─── Column definition ─── */
export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'right' | 'center' | 'left';
  /** Custom cell renderer */
  render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
  /** Extra td className e.g. "s" | "m" | "e" | "r" | "g" | "b" */
  tdClass?: string;
}

export interface TableAction<T = Record<string, unknown>> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'default' | 'danger';
}

export interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  keyField?: string;           // unique row key (default: "id")
  loading?: boolean;
  emptyIcon?: string;          // tabler icon e.g. "ti-table-off"
  emptyText?: string;
  actions?: TableAction<T>[];
  onRowClick?: (row: T) => void;
  pageSize?: number;           // 0 = no pagination
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  stickyHeader?: boolean;
  striped?: boolean;
}

type SortDir = 'asc' | 'desc' | null;

function SortIcon({ dir }: { dir: SortDir }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 1, marginRight: 4, opacity: dir ? 1 : 0.3, verticalAlign: 'middle' }}>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 0L7.5 4.5H0.5L4 0Z" fill={dir === 'asc' ? 'currentColor' : 'var(--t4)'} />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 5L0.5 0.5H7.5L4 5Z" fill={dir === 'desc' ? 'currentColor' : 'var(--t4)'} />
      </svg>
    </span>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div style={{
            height: 14, borderRadius: 4,
            background: 'var(--bg4)',
            width: i === 0 ? '70%' : i % 2 === 0 ? '50%' : '60%',
            animation: 'skPulse 1.4s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  );
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = 'id',
  loading = false,
  emptyIcon = 'ti-table-off',
  emptyText = 'لا توجد بيانات',
  actions,
  onRowClick,
  pageSize = 15,
  defaultSort,
  stickyHeader = false,
  striped = false,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string>(defaultSort?.key ?? '');
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort?.dir ?? null);
  const [page, setPage] = useState(1);

  /* ── Sorting ── */
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  /* ── Pagination ── */
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const rows = pageSize > 0
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  /* ── Sort toggle ── */
  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); setPage(1); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(''); setSortDir(null);
  }

  /* ── Derived ── */
  const hasActions = actions && actions.length > 0;
  const colCount = columns.length + (hasActions ? 1 : 0);
  const isEmpty = !loading && data.length === 0;

  return (
    <>
      <style>{`
        @keyframes skPulse{0%,100%{opacity:.4}50%{opacity:1}}
        .tbl-wrap table tbody tr.clickable:hover{background:var(--bg3);cursor:pointer;}
        .tbl-wrap table tbody tr.striped-row:nth-child(even){background:var(--bg3);}
        .tbl-action-btn{
          padding:4px 9px;border-radius:var(--r1);border:1px solid var(--b2);
          background:var(--bg3);color:var(--t3);font-size:11.5px;font-weight:700;
          cursor:pointer;font-family:'Tajawal',sans-serif;transition:.13s;
          display:inline-flex;align-items:center;gap:4px;
        }
        .tbl-action-btn:hover{background:var(--bg4);color:var(--t1);}
        .tbl-action-btn.danger:hover{background:var(--redb);border-color:var(--redbo);color:var(--red);}
        .tbl-pg-btn{
          width:30px;height:30px;border-radius:var(--r1);border:1px solid var(--b2);
          background:var(--bg3);color:var(--t3);font-size:12px;font-weight:700;
          cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.13s;
        }
        .tbl-pg-btn:hover:not(:disabled){background:var(--bg4);color:var(--t1);}
        .tbl-pg-btn:disabled{opacity:.35;cursor:not-allowed;}
        .tbl-pg-btn.on{background:var(--em);border-color:var(--em);color:#fff;}
      `}</style>

      <div className="tbl-wrap">
        <div className="tw">
          <table>
            <thead>
              <tr>
                {columns.map(col => {
                  const dir: SortDir = sortKey === col.key ? sortDir : null;
                  return (
                    <th
                      key={col.key}
                      style={{
                        width: col.width,
                        textAlign: col.align ?? 'right',
                        cursor: col.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        position: stickyHeader ? 'sticky' : undefined,
                        top: stickyHeader ? 0 : undefined,
                        zIndex: stickyHeader ? 1 : undefined,
                      }}
                      onClick={() => col.sortable && toggleSort(col.key)}
                    >
                      {col.sortable && <SortIcon dir={dir} />}
                      {col.label}
                    </th>
                  );
                })}
                {hasActions && <th style={{ textAlign: 'center', width: '1%', whiteSpace: 'nowrap' }}>إجراءات</th>}
              </tr>
            </thead>

            <tbody>
              {/* Loading skeleton */}
              {loading && Array.from({ length: pageSize || 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={colCount} />
              ))}

              {/* Empty state */}
              {isEmpty && (
                <tr>
                  <td colSpan={colCount}>
                    <div className="empty" style={{ padding: '40px 20px' }}>
                      <div className="empty-ic"><i className={`ti ${emptyIcon}`} /></div>
                      <div className="empty-tx">{emptyText}</div>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading && rows.map((row, ri) => (
                <tr
                  key={String(row[keyField] ?? ri)}
                  className={[
                    onRowClick ? 'clickable' : '',
                    striped ? 'striped-row' : '',
                  ].join(' ')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => {
                    const val = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={col.tdClass}
                        style={{ textAlign: col.align ?? 'right' }}
                      >
                        {col.render ? col.render(val, row, ri) : (val as React.ReactNode)}
                      </td>
                    );
                  })}
                  {hasActions && (
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                        {actions!.map((act, ai) => (
                          <button
                            key={ai}
                            className={`tbl-action-btn ${act.variant === 'danger' ? 'danger' : ''}`}
                            onClick={e => { e.stopPropagation(); act.onClick(row); }}
                          >
                            {act.icon && <span className="ic ic-xs">{act.icon}</span>}
                            {act.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageSize > 0 && !isEmpty && !loading && totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderTop: '1px solid var(--b1)',
            background: 'var(--bg3)', borderRadius: '0 0 var(--r3) var(--r3)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, sorted.length)} من {sorted.length}
            </span>

            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <button className="tbl-pg-btn" disabled={currentPage === 1} onClick={() => setPage(1)}>«</button>
              <button className="tbl-pg-btn" disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>‹</button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (currentPage <= 3) p = i + 1;
                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                else p = currentPage - 2 + i;
                return (
                  <button
                    key={p}
                    className={`tbl-pg-btn ${p === currentPage ? 'on' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}

              <button className="tbl-pg-btn" disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="tbl-pg-btn" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
