import React from 'react';
import type { BackendMeta } from '../../hooks/usePagination';

interface PaginationProps {
  meta: BackendMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  className?: string;
}

const PrevIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const NextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function buildPages(current: number, last: number): (number | '...')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) pages.push(i);
  if (current < last - 2) pages.push('...');
  pages.push(last);
  return pages;
}

const Pagination: React.FC<PaginationProps> = ({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50, 100],
  showPageSize = true,
  showTotal = true,
  className = '',
}) => {
  const { current_page, last_page, per_page, total, from, to, is_first_page, is_last_page } = meta;
  const pages = buildPages(current_page, last_page);

  return (
    <div className={`pg-bar ${className}`}>
      {/* Left: total info */}
      {showTotal && (
        <span className="pg-info">
          {from ?? 0}–{to ?? 0} من {total.toLocaleString('ar-DZ')}
        </span>
      )}

      {/* Center: page numbers */}
      <div className="pg-pages">
        <button
          className="pg-btn pg-nav"
          onClick={() => onPageChange(current_page - 1)}
          disabled={is_first_page}
          aria-label="الصفحة السابقة"
        >
          <PrevIcon />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="pg-dots">…</span>
          ) : (
            <button
              key={p}
              className={`pg-btn pg-page ${p === current_page ? 'active' : ''}`}
              onClick={() => onPageChange(p as number)}
              aria-label={`صفحة ${p}`}
              aria-current={p === current_page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pg-btn pg-nav"
          onClick={() => onPageChange(current_page + 1)}
          disabled={is_last_page}
          aria-label="الصفحة التالية"
        >
          <NextIcon />
        </button>
      </div>

      {/* Right: per page */}
      {showPageSize && onPerPageChange && (
        <div className="pg-size">
          <span className="pg-size-label">لكل صفحة:</span>
          <select
            className="pg-size-select"
            value={per_page}
            onChange={e => onPerPageChange(Number(e.target.value))}
            aria-label="عدد العناصر في الصفحة"
          >
            {perPageOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      <style>{`
        .pg-bar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; padding: 12px 0;
        }
        .pg-info { font-size: 13px; color: var(--color-text-secondary); }
        .pg-pages { display: flex; align-items: center; gap: 2px; }
        .pg-btn {
          display: flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 6px;
          border: 1px solid transparent; border-radius: 6px; cursor: pointer;
          font-size: 13px; color: var(--color-text-secondary); background: none;
          transition: background .1s, border-color .1s, color .1s;
        }
        .pg-btn:hover:not(:disabled) { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .pg-btn:disabled { opacity: .35; cursor: not-allowed; }
        .pg-btn.pg-page.active {
          background: var(--color-text-info, #3b82f6);
          border-color: var(--color-text-info, #3b82f6);
          color: #fff; font-weight: 500; cursor: default;
        }
        .pg-nav { color: var(--color-text-secondary); }
        .pg-dots { padding: 0 4px; color: var(--color-text-tertiary); font-size: 14px; }
        .pg-size { display: flex; align-items: center; gap: 6px; }
        .pg-size-label { font-size: 13px; color: var(--color-text-secondary); }
        .pg-size-select {
          padding: 4px 8px; border: 1px solid var(--color-border-secondary);
          border-radius: 6px; font-size: 13px; background: var(--color-background-primary);
          color: var(--color-text-primary); outline: none; cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Pagination;
