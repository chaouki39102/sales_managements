// pages/admin/AdminCompaniesPage.tsx
import { useState, useMemo } from 'react';
import { useAdminCompanies } from '@/hooks/admin';
import { useDebounce }       from '@/hooks/useDebounce';
import CompanyDrawer         from '@/components/admin/CompanyDrawer';
import {
  Avatar, StatusBadge, EmptyState, Spinner, fmtDate,
} from '@/components/admin/shared';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Button      from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import type { AdminCompany, AdminCompaniesFilter, Paginated } from '@/types/admin';

const PLANS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي',
  enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9',
  enterprise: '#f59e0b', custom: '#8b5cf6',
};

export default function AdminCompaniesPage() {
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 350);
  const [status,  setStatus]  = useState<AdminCompaniesFilter['status']>('');
  const [plan,    setPlan]    = useState('');
  const [sortBy,  setSortBy]  = useState<'name' | 'created_at' | 'users_count'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page,    setPage]    = useState(1);
  const [selected, setSelected] = useState<AdminCompany | null>(null);

  const filter = useMemo<AdminCompaniesFilter>(() => ({
    search:   search || undefined,
    status:   status || undefined,
    plan:     plan   || undefined,
    sort_by:  sortBy,
    sort_dir: sortDir,
    page,
    per_page: 20,
  }), [search, status, plan, sortBy, sortDir, page]);

  const { data, isLoading, isError, error, refetch } = useAdminCompanies(filter);

  const paginated  = data as Paginated<AdminCompany> | undefined;
  const companies  = paginated?.data ?? [];
  const meta       = paginated?.meta;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  };

  const FILTERS: { val: AdminCompaniesFilter['status']; label: string }[] = [
    { val: '',            label: 'الكل' },
    { val: 'active',      label: 'نشطة' },
    { val: 'suspended',   label: 'موقوفة' },
    { val: 'inactive',    label: 'غير نشطة' },
    { val: 'verified',    label: 'موثّقة' },
    { val: 'unverified',  label: 'غير موثقة' },
  ];

  const TH_COLS = [
    { label: 'الشركة',     col: 'name'        as typeof sortBy | null },
    { label: 'الخطة',      col: null },
    { label: 'المستخدمون', col: 'users_count' as typeof sortBy | null },
    { label: 'الحالة',     col: null },
    { label: 'الإنشاء',    col: 'created_at'  as typeof sortBy | null },
    { label: '',           col: null },
  ];

  return (
    <div className="page">
      <PageHeader
        title="الشركات"
        description={`${meta?.total ?? 0} شركة في المنصة`}
        actions={
          <Button variant="default" icon={<i className="ti ti-refresh" />} onClick={() => refetch()}>
            تحديث
          </Button>
        }
      />

      {/* ── Filters ─── */}
      <div className="filters-bar">
        <SearchInput
          value={rawSearch}
          onChange={v => { setRawSearch(v); setPage(1); }}
          placeholder="بحث بالاسم أو السلاق..."
          className="flex-1 min-w-[200px]"
        />
        {FILTERS.map(opt => (
          <button
            key={opt.val}
            onClick={() => { setStatus(opt.val); setPage(1); }}
            className={`filter-pill ${status === opt.val ? 'active' : ''}`}
          >
            {opt.label}
          </button>
        ))}
        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          className="form-select w-auto"
        >
          <option value="">كل الخطط</option>
          {Object.entries(PLANS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* ── Error ─── */}
      {isError && (
        <div className="alert-error">
          تعذّر تحميل البيانات: {(error as any)?.message ?? 'خطأ غير معروف'}.{' '}
          <button
            onClick={() => refetch()}
            className="underline bg-transparent border-none cursor-pointer text-inherit"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── Table ─── */}
      <Card padding={0}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {TH_COLS.map((th, i) => (
                  <th
                    key={i}
                    onClick={() => th.col && toggleSort(th.col)}
                    className={th.col ? 'sortable' : ''}
                  >
                    {th.label}
                    {th.col && sortBy === th.col && (
                      <i className={`ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'} ms-1 text-[10px]`} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10"><Spinner /></td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10">
                    <EmptyState icon="ti-building-off" text="لا توجد شركات" />
                  </td>
                </tr>
              ) : (
                companies.map(co => (
                  <tr key={co.id} onClick={() => setSelected(co)}>
                    <td>
                      <div className="td-name">
                        <Avatar id={co.id} name={co.name} size={32} radius={9} />
                        <div>
                          <div className="td-primary">{co.name}</div>
                          <div className="td-secondary">
                            /{co.slug}{co.owner ? ` · ${co.owner.name}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="plan-badge"
                        style={{
                          background: (PLAN_COLORS[co.plan] ?? '#6b7280') + '22',
                          color: PLAN_COLORS[co.plan] ?? '#6b7280',
                        }}
                      >
                        {PLANS[co.plan] ?? co.plan}
                      </span>
                    </td>
                    <td>
                      <span className="td-primary">{co.users_count ?? 0}</span>
                      <span className="td-secondary ms-1">/ {co.max_users || '∞'}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <StatusBadge active={co.active} suspended={co.is_suspended} />
                        {co.verified_at && (
                          <i className="ti ti-shield-check text-[12px] text-[#10b981] ms-1" title="موثّق" />
                        )}
                      </div>
                    </td>
                    <td className="td-secondary">{fmtDate(co.created_at)}</td>
                    <td>
                      <i className="ti ti-chevron-left text-[14px] text-[var(--t4)]" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              الصفحة {meta.current_page} من {meta.last_page} ({meta.total} شركة)
            </span>
            <div className="pagination-btns">
              <Button size="sm" variant="default" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابقة</Button>
              <Button size="sm" variant="default" disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>التالية</Button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <CompanyDrawer
          company={selected}
          onClose={refresh => { setSelected(null); if (refresh) refetch(); }}
        />
      )}
    </div>
  );
}
