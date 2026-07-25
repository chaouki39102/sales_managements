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
import { useQuery } from '@tanstack/react-query';
import { useAdminCompanies } from '@/hooks/admin';
import { useDebounce }       from '@/hooks/useDebounce';
import CompanyDrawer         from '@/components/admin/CompanyDrawer';
import { plansApi } from '@/lib/api/admin';
import {
  Avatar, StatusBadge, EmptyState, Spinner, fmtDate,
} from '@/components/admin/shared';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Button      from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import SimpleTable from '@/components/ui/SimpleTable';
import type { AdminCompany, AdminPlan, AdminCompaniesFilter, Paginated } from '@/types/admin';

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

  const { data: plans = [] } = useQuery<AdminPlan[]>({
    queryKey: ['admin', 'plans'],
    queryFn:  () => plansApi.list(),
    staleTime: 60_000,
  });
  const planLabels = Object.fromEntries(plans.map(p => [p.key, p.label]));

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
          {plans.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
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
        <SimpleTable
          isLoading={isLoading}
          className="plt-tbl"
          columns={[
            { key: 'name', label: sortBy === 'name' ? `الشركة ${sortDir === 'asc' ? '▲' : '▼'}` : 'الشركة', render: (_v, row) => {
              const co = row as unknown as AdminCompany;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar id={co.id} name={co.name} size={32} radius={9} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{co.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                      /{co.slug}{co.owner ? ` · ${co.owner.name}` : ''}
                    </div>
                  </div>
                </div>
              );
            }},
            { key: 'plan', label: 'الخطة', render: (v) => (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: (PLAN_COLORS[v as string] ?? '#6b7280') + '22',
                color: PLAN_COLORS[v as string] ?? '#6b7280',
              }}>
                {planLabels[v as string] ?? (v as string)}
              </span>
            )},
            { key: 'users_count', label: 'المستخدمون', render: (v, row) => {
              const co = row as unknown as AdminCompany;
              return (
                <span style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 600 }}>
                  {(v as number) ?? 0}
                  <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 3 }}>
                    / {co.max_users || '∞'}
                  </span>
                </span>
              );
            }},
            { key: 'active', label: 'الحالة', render: (_v, row) => {
              const co = row as unknown as AdminCompany;
              return (
                <>
                  <StatusBadge active={co.active} suspended={co.is_suspended} />
                  {co.verified_at && (
                    <i className="ti ti-shield-check"
                       style={{ marginRight: 6, fontSize: 12, color: '#10b981' }}
                       title="موثّق" />
                  )}
                </>
              );
            }},
            { key: 'created_at', label: sortBy === 'created_at' ? `الإنشاء ${sortDir === 'asc' ? '▲' : '▼'}` : 'الإنشاء', render: (v) => (
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>{fmtDate(v as string)}</span>
            )},
            { key: 'chevron', label: '', render: () => (
              <i className="ti ti-chevron-left" style={{ fontSize: 14, color: 'var(--t4)' }} />
            )},
          ]}
          data={companies}
          rowKey="id"
          emptyText="لا توجد شركات"
          onRowClick={(row) => setSelected(row as unknown as AdminCompany)}
        />

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
