interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export default function PosSessionsPagination({
  meta,
  page,
  onPageChange,
}: {
  meta: PaginationMeta;
  page: number;
  onPageChange: (p: number) => void;
}) {
  if (meta.last_page <= 1) return null;

  return (
    <div className="pss-pagination">
      <span className="pss-pagination-info">
        {meta.from}–{meta.to} من {meta.total}
      </span>
      <div className="pss-pagination-btns">
        <button
          className="pss-page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <i className="ti ti-chevron-right" />
        </button>

        {Array.from({ length: Math.min(7, meta.last_page) }, (_, i) => {
          const p = Math.max(1, Math.min(meta.last_page - 6, page - 3)) + i;
          return (
            <button
              key={p}
              className={`pss-page-btn ${p === page ? 'on' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          );
        })}

        <button
          className="pss-page-btn"
          disabled={page >= meta.last_page}
          onClick={() => onPageChange(Math.min(meta.last_page, page + 1))}
        >
          <i className="ti ti-chevron-left" />
        </button>
      </div>
    </div>
  );
}
