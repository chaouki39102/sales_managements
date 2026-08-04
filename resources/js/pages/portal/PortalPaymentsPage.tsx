// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalPaymentsPage.tsx — قائمة دفعات الزبون (مُحسّنة)
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { portalApi, type PortalPaymentFilters } from '@/lib/api/portal/portal';
import { fmtMoney, fmtDate, DirBadge, Pager, PortalLoading, PortalError, PortalEmpty } from './portalUtils';

const DIR_OPTIONS = [
  { value: '', label: 'جميع الاتجاهات' },
  { value: 'in', label: 'وارد' },
  { value: 'out', label: 'صادر' },
];

const MODE_OPTIONS = [
  { value: '', label: 'جميع الوسائل' },
  { value: 'CASH', label: 'نقدي' },
  { value: 'CB', label: 'بطاقة بنكية' },
  { value: 'CHQ', label: 'شيك' },
  { value: 'VIR', label: 'تحويل بنكي' },
  { value: 'COMM', label: 'عمولة' },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'الأحدث أولاً' },
  { value: 'date_asc', label: 'الأقدم أولاً' },
  { value: 'amount_desc', label: 'المبلغ (تنازلي)' },
  { value: 'amount_asc', label: 'المبلغ (تصاعدي)' },
];

type ViewMode = 'table' | 'timeline';

export default function PortalPaymentsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [sort, setSort] = useState<PortalPaymentFilters['sort']>('date_desc');
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('portal-pay-view') as ViewMode) || 'table'; } catch { return 'table'; }
  });

  const debouncedSearch = useDebounce(search, 350);

  const filters: PortalPaymentFilters = {
    page,
    per_page: 15,
    search: debouncedSearch || undefined,
    direction: (direction as 'in' | 'out') || undefined,
    payment_mode: paymentMode || undefined,
    sort,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal', slug, 'payments', filters],
    queryFn: () => portalApi.payments(filters),
    placeholderData: keepPreviousData,
  });

  useEffect(() => { setPage(1); }, [debouncedSearch, direction, paymentMode, sort]);
  useEffect(() => { try { localStorage.setItem('portal-pay-view', view); } catch {} }, [view]);

  const hasFilters = debouncedSearch || direction || paymentMode;

  if (isLoading) return <PortalLoading />;
  if (isError || !data) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل الدفعات'} />;

  const { data: rows, meta } = data;
  const from = meta.per_page * (meta.current_page - 1) + 1;
  const to = Math.min(meta.per_page * meta.current_page, meta.total);

  const totalIn = rows.filter(r => r.direction === 'in').reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter(r => r.direction === 'out').reduce((s, r) => s + r.amount, 0);

  return (
    <section className="portal-card">
      <div className="portal-card-hd">
        <h3><i className="ti ti-wallet" /> الدفعات</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="portal-hd-count">{meta.total} سجل</span>
          <div className="portal-view-toggle">
            <button className={`portal-view-btn ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')} title="عرض جدول">
              <i className="ti ti-list" />
            </button>
            <button className={`portal-view-btn ${view === 'timeline' ? 'on' : ''}`} onClick={() => setView('timeline')} title="خط زمني">
              <i className="ti ti-layout-list" />
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
            placeholder="بحث برقم الدفعة أو المرجع..."
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
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            {DIR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            {MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as PortalPaymentFilters['sort'])}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasFilters && (
            <button className="portal-btn portal-btn--sm portal-btn--ghost" onClick={() => { setSearch(''); setDirection(''); setPaymentMode(''); setSort('date_desc'); }}>
              <i className="ti ti-filter-off" /> مسح الفلتر
            </button>
          )}
        </div>
      </div>

      {/* ─── ملخص سريع ─── */}
      {rows.length > 0 && (
        <div style={{
          display: 'flex', gap: 16, padding: '12px 22px', borderBottom: '1px solid var(--b1)',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
            <i className="ti ti-arrow-down" style={{ marginLeft: 4 }} />
            وارد: {fmtMoney(totalIn)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
            <i className="ti ti-arrow-up" style={{ marginLeft: 4 }} />
            صادر: {fmtMoney(totalOut)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
            صافي: {fmtMoney(totalIn - totalOut)}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <PortalEmpty icon="ti-wallet" text={hasFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد دفعات'} />
      ) : view === 'table' ? (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>الرقم</th><th>التاريخ</th><th>الوسيلة</th><th>المرجع</th><th>الاتجاه</th><th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="num">{p.payment_number}</td>
                  <td style={{ fontSize: 11.5 }}>{fmtDate(p.payment_date)}</td>
                  <td>{p.payment_mode}</td>
                  <td style={{ fontSize: 11.5 }}>{p.reference || '—'}</td>
                  <td><DirBadge direction={p.direction} /></td>
                  <td className="num" style={{ color: p.direction === 'in' ? '#059669' : 'var(--red)' }}>
                    {fmtMoney(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="portal-pay-timeline">
          {rows.map((p) => (
            <div key={p.id} className="portal-pay-item">
              <div className={`portal-pay-icon ${p.direction === 'in' ? 'portal-pay-icon--in' : 'portal-pay-icon--out'}`}>
                <i className={`ti ${p.direction === 'in' ? 'ti-arrow-down' : 'ti-arrow-up'}`} />
              </div>
              <div className="portal-pay-info">
                <div className="portal-pay-num">{p.payment_number}</div>
                <div className="portal-pay-meta">
                  {p.payment_mode}
                  {p.reference && ` • ${p.reference}`}
                  {' • '}{fmtDate(p.payment_date)}
                </div>
              </div>
              <div className={`portal-pay-amt ${p.direction === 'in' ? 'portal-pay-amt--in' : 'portal-pay-amt--out'}`}>
                {p.direction === 'in' ? '+' : '-'} {fmtMoney(p.amount)}
              </div>
            </div>
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
