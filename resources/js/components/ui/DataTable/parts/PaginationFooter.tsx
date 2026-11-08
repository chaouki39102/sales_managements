// DataTable/parts/PaginationFooter.tsx — paged footer (range info + pagination)
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../internal/useDataTableState';

export default function PaginationFooter<T>({ s }: { s: DataTableState<T> }) {
  const { curPage, goToPage, lastPage, loading, pageNumbers, perPage, selectedKeys, total } = s;

  return (
    <div className="dt-footer">
      <div className="dt-footer-info" aria-live="polite">
        {loading ? (
          <i className="ti ti-loader-2 dt-footer-spinner" aria-hidden="true" />
        ) : total > 0 ? (
          <span>
            {((curPage - 1) * perPage + 1).toLocaleString('ar-DZ')}
            {'–'}
            {Math.min(curPage * perPage, total).toLocaleString('ar-DZ')}
            {' من '}
            <strong>{total.toLocaleString('ar-DZ')}</strong>
          </span>
        ) : null}

        {selectedKeys.size > 0 && (
          <span className="bx be">{selectedKeys.size.toLocaleString('ar-DZ')} محدد</span>
        )}
      </div>

      {lastPage > 1 && (
        <nav aria-label="التنقل بين الصفحات" className="dt-pagination">
          {/* زر السابق */}
          <button
            className="dt-pg-arrow"
            disabled={curPage <= 1}
            onClick={() => goToPage(curPage - 1)}
            aria-label="الصفحة السابقة"
            type="button"
            title="السابق"
          >
            <i className="ti ti-chevron-right" />
          </button>

          {/* ✅ أرقام الصفحات الظاهرة — تستخدم pageNumbers المحسوبة أعلاه */}
          {pageNumbers.map((p, i) =>
            p === '…' ? (
              <span key={`ell-${i}`} className="dt-pg-ellipsis" aria-hidden="true">…</span>
            ) : (
              <button
                key={p}
                className={`dt-pg-btn${p === curPage ? ' active' : ''}`}
                onClick={() => goToPage(p as number)}
                type="button"
                aria-label={`الصفحة ${p}`}
                aria-current={p === curPage ? 'page' : undefined}
              >
                {(p as number).toLocaleString('ar-DZ')}
              </button>
            )
          )}

          {/* للجداول ذات صفحات كثيرة: إدخال رقم مباشر */}
          {lastPage > 7 && (
            <div className="dt-pg-select-wrap" title="انتقل إلى صفحة">
              <select
                className="dt-pg-select"
                value={curPage}
                onChange={e => goToPage(Number(e.target.value))}
                aria-label="اختر الصفحة"
              >
                {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                  <option key={p} value={p}>{p.toLocaleString('ar-DZ')}</option>
                ))}
              </select>
              <i className="ti ti-chevron-down dt-pg-select-icon" aria-hidden="true" />
            </div>
          )}

          {/* زر التالي */}
          <button
            className="dt-pg-arrow"
            disabled={curPage >= lastPage}
            onClick={() => goToPage(curPage + 1)}
            aria-label="الصفحة التالية"
            type="button"
            title="التالي"
          >
            <i className="ti ti-chevron-left" />
          </button>
        </nav>
      )}
    </div>
  );
}
