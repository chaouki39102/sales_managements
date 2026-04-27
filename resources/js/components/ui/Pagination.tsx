// components/ui/Pagination.tsx
import React from 'react';

interface PaginationProps {
  page: number;
  lastPage: number;
  from?: number;
  to?: number;
  total?: number;
  onPage: (page: number) => void;
  tableStyle?: boolean;
}

export default function Pagination({ page, lastPage, from, to, total, onPage, tableStyle }: PaginationProps) {
  const pages = Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
    if (lastPage <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= lastPage - 2) return lastPage - 4 + i;
    return page - 2 + i;
  });

  const wrapStyle: React.CSSProperties = tableStyle
    ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--b1)', background: 'var(--bg3)', borderRadius: '0 0 var(--r3) var(--r3)', flexWrap: 'wrap', gap: 8 }
    : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--b1)', flexWrap: 'wrap', gap: 8 };

  return (
    <div style={wrapStyle}>
      <span style={{ fontSize: 12, color: 'var(--t4)' }}>{from}–{to} من {total}</span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button className="btn btn-xs" disabled={page <= 1} onClick={() => onPage(1)}>«</button>
        <button className="btn btn-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
        {pages.map(n => (
          <button key={n} className={`btn btn-xs ${page === n ? 'btn-p' : ''}`} onClick={() => onPage(n)}>{n}</button>
        ))}
        <button className="btn btn-xs" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>›</button>
        <button className="btn btn-xs" disabled={page >= lastPage} onClick={() => onPage(lastPage)}>»</button>
      </div>
    </div>
  );
}
