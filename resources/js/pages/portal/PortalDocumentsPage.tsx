// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalDocumentsPage.tsx — قائمة مستندات الزبون (مُحسّنة)
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalDocFilters } from '@/lib/api/portal/portal';
import { fmtMoney, fmtDate, StatusBadge, DocTypeIcon, Pager, PortalLoading, PortalError, PortalEmpty } from './portalUtils';

const TYPE_OPTIONS = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'FV', label: 'فاتورة مبيعات' },
  { value: 'AV', label: 'مرجع مبيعات' },
  { value: 'POS', label: 'بيع نقطي' },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'الأحدث أولاً' },
  { value: 'date_asc', label: 'الأقدم أولاً' },
  { value: 'amount_desc', label: 'المبلغ (تتنازلي)' },
  { value: 'amount_asc', label: 'المبلغ (تصاعدي)' },
];

type ViewMode = 'table' | 'cards';

export default function PortalDocumentsPage() {
  const { slug } = useParams<{ slug: string }>();
  const base = `/portal/${slug}`;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [sort, setSort] = useState<PortalDocFilters['sort']>('date_desc');
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('portal-doc-view') as ViewMode) || 'table'; } catch { return 'table'; }
  });

  const debouncedSearch = useDebounce(search, 350);

  const filters: PortalDocFilters = {
    page,
    per_page: 15,
    search: debouncedSearch || undefined,
    type_code: typeCode || undefined,
    sort,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal', slug, 'documents', filters],
    queryFn: () => portalApi.documents(filters),
    placeholderData: keepPreviousData,
  });

  useEffect(() => { setPage(1); }, [debouncedSearch, typeCode, sort]);
  useEffect(() => { try { localStorage.setItem('portal-doc-view', view); } catch {} }, [view]);

  const hasFilters = debouncedSearch || typeCode;

  if (isLoading) return <PortalLoading />;
  if (isError || !data) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل المستندات'} />;

  const { data: rows, meta } = data;
  const from = meta.per_page * (meta.current_page - 1) + 1;
  const to = Math.min(meta.per_page * meta.current_page, meta.total);

  return (
    <section className="portal-card">
      <div className="portal-card-hd">
        <h3><i className="ti ti-file-text" /> المستندات</h3>
        <div className="portal-inline">
          <span className="portal-hd-count">{meta.total} سجل</span>
          <div className="portal-view-toggle">
            <button className={`portal-view-btn ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')} title="عرض جدول">
              <i className="ti ti-list" />
            </button>
            <button className={`portal-view-btn ${view === 'cards' ? 'on' : ''}`} onClick={() => setView('cards')} title="عرض بطاقات">
              <i className="ti ti-layout-grid" />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="portal-toolbar">
        <div className="portal-search">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="بحث برقم المستند أو اسم النوع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="portal-search-x" onClick={() => setSearch('')} type="button">
              <i className="ti ti-x" />
            </button>
          )}
        </div>
        <div className="portal-filters">
          <select value={typeCode} onChange={(e) => setTypeCode(e.target.value)}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as PortalDocFilters['sort'])}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasFilters && (
            <button className="portal-btn portal-btn--sm portal-btn--ghost" onClick={() => { setSearch(''); setTypeCode(''); setSort('date_desc'); }}>
              <i className="ti ti-filter-off" /> مسح الفلتر
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <PortalEmpty icon="ti-file-text" text={hasFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد مستندات'} />
      ) : view === 'table' ? (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>الرقم</th><th>التاريخ</th><th>النوع</th><th>الاستحقاق</th><th>الحالة</th><th>المبلغ (TTC)</th><th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link className="tbl-link" to={`${base}/documents/${d.id}`}>
                      {d.document_number}
                    </Link>
                  </td>
                  <td className="portal-t-sm">{fmtDate(d.document_date)}</td>
                  <td>{d.type_name}</td>
                  <td className="portal-t-sm">{d.due_date ? fmtDate(d.due_date) : '—'}</td>
                  <td><StatusBadge status={d.status_name} /></td>
                  <td className="num">{fmtMoney(d.net_to_pay)}</td>
                  <td className={`num ${d.remaining_amount > 0 ? 'ow' : 'pos'}`}>{fmtMoney(d.remaining_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="portal-doc-cards">
          {rows.map((d) => (
            <Link key={d.id} to={`${base}/documents/${d.id}`} className="portal-doc-card">
              <div className="portal-doc-card-top">
                <div className="portal-inline">
                  <DocTypeIcon code={d.type_code} />
                  <div>
                    <div className="portal-doc-card-num">{d.document_number}</div>
                    <div className="portal-doc-card-date">{fmtDate(d.document_date)}</div>
                  </div>
                </div>
                <StatusBadge status={d.status_name} />
              </div>
              <div className="portal-doc-card-mid">
                <div className="portal-doc-card-amount">{fmtMoney(d.net_to_pay)}</div>
                {d.remaining_amount > 0 ? (
                  <div className="portal-doc-card-remain portal-doc-card-remain--ow">متبقي: {fmtMoney(d.remaining_amount)}</div>
                ) : (
                  <div className="portal-doc-card-remain portal-doc-card-remain--ok">مدفوع</div>
                )}
              </div>
              <div className="portal-doc-card-footer">
                <span><i className="ti ti-tag" />{d.type_name}</span>
                {d.due_date && <span><i className="ti ti-calendar" />{fmtDate(d.due_date)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <Pager page={meta.current_page} lastPage={meta.last_page} total={meta.total} from={from} to={to} onChange={setPage} />
      )}
    </section>
  );
}

// ─── useDebounce hook ─────────────────────────────────────────────────────
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
