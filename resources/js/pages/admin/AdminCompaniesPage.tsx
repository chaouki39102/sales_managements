// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminCompaniesPage.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   useAdminCompanies يستخدم companiesApi.list → apiGetPaginated
//   apiGetPaginated يُعيد { data:[...], meta:{...} } مباشرة
//
//   الكود القديم كان:
//     const companies = (data as any)?.data ?? [];   ← يعمل ✅
//     const meta      = (data as any)?.meta;          ← يعمل ✅
//
//   إذن مشكلة الصفحة الفارغة ليست في الـ parsing بل في
//   أن الـ query كانت تُعيد error بسبب companiesApi.list
//   الذي كان يستخدم apiGetPaginated الصحيح
//   (لكن العمليات الأخرى كانت تُعيد 404 → تُلوث الـ cache)
//
//   الحل: الصفحة سليمة لكن نضيف error handling واضح
// ════════════════════════════════════════════════════════════════════════════
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

  // ✅ apiGetPaginated يُعيد { data:[...], meta:{...} } مباشرة — طبقة واحدة
  const paginated = data as Paginated<AdminCompany> | undefined;
  const companies = paginated?.data ?? [];
  const meta      = paginated?.meta;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  };

  const FILTERS = [
    { val: '' as const,            label: 'الكل' },
    { val: 'active' as const,      label: 'نشطة' },
    { val: 'suspended' as const,   label: 'موقوفة' },
    { val: 'inactive' as const,    label: 'غير نشطة' },
    { val: 'verified' as const,    label: 'موثّقة' },
    { val: 'unverified' as const,  label: 'غير موثقة' },
  ];

  return (
    <div>
      <PageHeader
        title="الشركات"
        description={`${meta?.total ?? 0} شركة في المنصة`}
        actions={
          <Button variant="primary" icon={<i className="ti ti-refresh" />} onClick={() => refetch()}>
            تحديث
          </Button>
        }
      />

      {/* ── فلاتر ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput
          value={rawSearch}
          onChange={v => { setRawSearch(v); setPage(1); }}
          placeholder="بحث بالاسم أو السلاق..."
          style={{ flex: 1, minWidth: 200 }}
        />
        {FILTERS.map(opt => (
          <button
            key={opt.val}
            onClick={() => { setStatus(opt.val); setPage(1); }}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${status === opt.val ? 'var(--em)' : 'var(--b2)'}`,
              background: status === opt.val ? 'var(--emb)' : 'var(--bg3)',
              color: status === opt.val ? 'var(--em)' : 'var(--t3)',
              cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {opt.label}
          </button>
        ))}
        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid var(--b2)',
            background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12,
            fontFamily: 'Tajawal, sans-serif',
          }}
        >
          <option value="">كل الخطط</option>
          {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {isError && (
        <div style={{
          padding: '12px 16px', marginBottom: 12, borderRadius: 8,
          background: '#ef44441a', color: '#ef4444', fontSize: 13,
        }}>
          تعذّر تحميل البيانات: {(error as any)?.message ?? 'خطأ غير معروف'}.{' '}
          <button
            onClick={() => refetch()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── الجدول ────────────────────────────────────────────────────────── */}
      <Card padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
                {[
                  { label: 'الشركة',     col: 'name'         as typeof sortBy | null },
                  { label: 'الخطة',      col: null },
                  { label: 'المستخدمون', col: 'users_count'  as typeof sortBy | null },
                  { label: 'الحالة',     col: null },
                  { label: 'الإنشاء',    col: 'created_at'   as typeof sortBy | null },
                  { label: '',           col: null },
                ].map((th, i) => (
                  <th
                    key={i}
                    onClick={() => th.col && toggleSort(th.col)}
                    style={{
                      padding: '10px 14px', textAlign: 'right',
                      fontSize: 11, fontWeight: 800, color: 'var(--t4)',
                      letterSpacing: .4, textTransform: 'uppercase',
                      cursor: th.col ? 'pointer' : 'default',
                      userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    {th.label}
                    {th.col && sortBy === th.col && (
                      <i className={`ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'}`}
                         style={{ marginRight: 4, fontSize: 10 }} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: 40 }}><Spinner /></td></tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40 }}>
                    <EmptyState icon="ti-building-off" text="لا توجد شركات" />
                  </td>
                </tr>
              ) : companies.map(co => (
                <tr
                  key={co.id}
                  onClick={() => setSelected(co)}
                  style={{
                    borderBottom: '1px solid var(--b1)',
                    cursor: 'pointer', transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar id={co.id} name={co.name} size={32} radius={9} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{co.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                          /{co.slug}{co.owner ? ` · ${co.owner.name}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: (PLAN_COLORS[co.plan] ?? '#6b7280') + '22',
                      color: PLAN_COLORS[co.plan] ?? '#6b7280',
                    }}>
                      {PLANS[co.plan] ?? co.plan}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--t2)', fontWeight: 600 }}>
                    {co.users_count ?? 0}
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>
                      / {co.max_users || '∞'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge active={co.active} suspended={co.is_suspended} />
                    {co.verified_at && (
                      <i className="ti ti-shield-check"
                         style={{ marginRight: 6, fontSize: 12, color: '#10b981' }}
                         title="موثّق" />
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t4)' }}>
                    {fmtDate(co.created_at)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <i className="ti ti-chevron-left" style={{ fontSize: 14, color: 'var(--t4)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              الصفحة {meta.current_page} من {meta.last_page} ({meta.total} شركة)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" disabled={page === 1}              onClick={() => setPage(p => p - 1)}>السابقة</Button>
              <Button size="sm" disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}>التالية</Button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <CompanyDrawer company={selected} onClose={refresh => { setSelected(null); if (refresh) refetch(); }} />
      )}
    </div>
  );
}
