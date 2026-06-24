import type { StatusFilter } from '@/pos/hooks/usePosSessions';

export default function PosSessionsFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  hasFilters, onReset,
  isSyncing,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  hasFilters: boolean;
  onReset: () => void;
  isSyncing: boolean;
}) {
  return (
    <div className="pss-filters">
      <div className="pss-search">
        <i className="ti ti-search pss-search-ic" />
        <input
          className="pss-search-inp"
          type="text"
          placeholder="بحث باسم الكاشير أو المستودع..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        {search && (
          <button className="pss-search-clear" onClick={() => onSearchChange('')}>
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      <div className="pss-filter-pills">
        {(['', 'open', 'closed', 'suspended'] as const).map(s => (
          <button
            key={s || 'all'}
            className={`pss-pill ${statusFilter === s ? 'on' : ''}`}
            onClick={() => onStatusChange(s)}
          >
            {s === ''          && 'الكل'}
            {s === 'open'      && <><i className="ti ti-circle-check" /> مفتوحة</>}
            {s === 'closed'    && <><i className="ti ti-circle-x" /> مغلقة</>}
            {s === 'suspended' && <><i className="ti ti-circle-pause" /> معلقة</>}
          </button>
        ))}
      </div>

      <div className="pss-date-range">
        <div className="pss-date-inp-wrap">
          <i className="ti ti-calendar pss-date-ic" />
          <input
            type="date"
            className="pss-date-inp"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
          />
        </div>
        <span className="pss-date-sep">—</span>
        <div className="pss-date-inp-wrap">
          <i className="ti ti-calendar pss-date-ic" />
          <input
            type="date"
            className="pss-date-inp"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
          />
        </div>
      </div>

      {hasFilters && (
        <button className="pss-reset-btn" onClick={onReset}>
          <i className="ti ti-refresh" /> إعادة ضبط
        </button>
      )}

      <div className="pss-filter-spacer" />

      {isSyncing && (
        <span className="pss-sync-badge">
          <i className="ti ti-loader-2 spin" /> تحديث...
        </span>
      )}
    </div>
  );
}
